import { create, StoreApi } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
    Track, StepState, PLocks, GlobalFXParams, Preset, AllInstrumentParams, 
    TrackType, InstrumentPreset, ExpansionPack, FXSends, Notification, MainView, 
    ArrangementClip, MidiOutParams, FullBackup, MidiMapping, UiPerformanceMode
} from '../types';
import { AudioEngine } from '../audioEngine';
import { DEMO_DEFAULT_PROJECT, LICENSED_DEFAULT_PROJECT } from '../factoryProjects';
import { INITIAL_PRESET_LIBRARY, newProjectPreset } from '../presetLibrary';
import { INITIAL_INSTRUMENT_PRESET_LIBRARY } from '../instrumentPresetLibrary';
import { getAutomationValue, deepClone, deepMerge, createTechnoPattern, randomizeKickParams, randomizeHatParams, randomizeArcaneParams, randomizeRuinParams, randomizeArtificeParams, randomizeShiftParams, randomizeResonParams, randomizeAlloyParams, audioBufferToWav, downloadBlob, generateEuclideanPattern, generateWaveformData, setDeep, generateWaveformForPattern, midiToNoteName, getInitialParamsForType } from '../utils';
import { createEmptyPatterns, INITIAL_KICK_PARAMS, INITIAL_HAT_PARAMS, INITIAL_ARCANE_PARAMS, INITIAL_RUIN_PARAMS, INITIAL_ARTIFICE_PARAMS, INITIAL_SHIFT_PARAMS, INITIAL_RESON_PARAMS, INITIAL_ALLOY_PARAMS } from '../constants';
import { useVUMeterStore } from './vuMeterStore';
import { shallow } from 'zustand/shallow';

declare let JSZip: any;

// --- Playback Logic & State (Merged from playbackStore.ts) ---

let audioEngine: AudioEngine | null = null;
let sequencerTimerId: number | null = null;
let playStartTime = 0;
let playStartOffset = 0;
let levelMonitorId: number | null = null;

const PULSES_PER_STEP = 6; // 24 PPQN / 4 (for 16th notes)

function startLevelMonitoring() {
    if (levelMonitorId) {
        cancelAnimationFrame(levelMonitorId);
    }
    const monitor = () => {
        if (audioEngine) {
            if (useStore.getState().uiPerformanceMode !== 'off') {
                const trackLevels = audioEngine.getTrackLevels();
                const masterLevel = audioEngine.getMasterLevel();
                useVUMeterStore.setState({ audioLevels: trackLevels, masterLevel });
            }
        }
        levelMonitorId = requestAnimationFrame(monitor);
    };
    levelMonitorId = requestAnimationFrame(monitor);
}

function playOnePatternStep(stepToPlay: number) {
    if (!audioEngine) return;
    const { preset, mutedTracks, soloedTrackId } = useStore.getState();
    if (!preset) return;
    const time = audioEngine.getContext().currentTime + 0.01;
    const secondsPerStep = (60.0 / preset.bpm) / 4.0;
    const loopTime = (stepToPlay % 64) * secondsPerStep;
    const loopCount = Math.floor(stepToPlay / 64);

    if (stepToPlay > 0 && stepToPlay % 64 === 0) audioEngine.resetTriggerStates();

    preset.tracks.forEach(track => {
        const isAudible = soloedTrackId === null ? !mutedTracks.includes(track.id) : soloedTrackId === track.id;
        if (isAudible) {
            const patternStepIndex = stepToPlay % track.patternLength;
            const stepState = track.patterns[track.activePatternIndex][patternStepIndex];
            audioEngine.playStep(track, stepState, time, loopTime, loopCount);
        }
    });
}

const scheduleAheadTime = 0.1; 
const schedulerInterval = 25;

function scheduler() {
    if (!audioEngine) return;
    
    const { isPlaying } = useStore.getState();
    const { preset, mainView, mutedTracks, soloedTrackId, arrangementLoop, recordingClips, selectedTrackId } = useStore.getState();

    if (!isPlaying || !preset) return;
    
    const { tracks, arrangementClips } = preset;
    
    audioEngine.cleanupVoices();
    const audioCtxTime = audioEngine.getContext().currentTime;
    
    if (mainView === 'pattern') {
        let { lastScheduledStepTime, totalStepsElapsed } = useStore.getState();
        
        if (lastScheduledStepTime < audioCtxTime) {
            lastScheduledStepTime = audioCtxTime;
        }

        const selectedTrack = tracks.find(t => t.id === selectedTrackId);
        const patternLength = selectedTrack ? selectedTrack.patternLength : 64;

        while (lastScheduledStepTime < audioCtxTime + scheduleAheadTime) {
            const stepToPlay = totalStepsElapsed;
            if (stepToPlay > 0 && stepToPlay % 64 === 0) audioEngine.resetTriggerStates();
            
            const secondsPerStep = (60.0 / preset.bpm) / 4.0;
            const loopTime = (stepToPlay % 64) * secondsPerStep;
            const loopCount = Math.floor(stepToPlay / 64);

            preset.tracks.forEach(track => {
                const isAudible = soloedTrackId === null ? !mutedTracks.includes(track.id) : soloedTrackId === track.id;

                if (isAudible) {
                    const patternStepIndex = stepToPlay % track.patternLength;
                    const stepState = track.patterns[track.activePatternIndex][patternStepIndex];
                    audioEngine.playStep(track, stepState, lastScheduledStepTime, loopTime, loopCount);
                }
            });
            
            totalStepsElapsed++;
            lastScheduledStepTime += secondsPerStep;
            useStore.setState({ 
                currentStep: stepToPlay % patternLength,
                totalStepsElapsed,
                lastScheduledStepTime
            });
        }
    } else { // Song Mode
        const scheduleWindowStart = useStore.getState().lastScheduledSongTime;
        const freshPlayheadTime = playStartOffset + (audioEngine.getContext().currentTime - playStartTime);
        let scheduleWindowEnd = freshPlayheadTime + scheduleAheadTime;
        
        const secondsPerBeat = 60 / preset.bpm;

        if (scheduleWindowStart >= scheduleWindowEnd) return;

        const secondsPerStep = (60.0 / preset.bpm) / 4.0;
        
        const liveRecordingTrackIds = new Set(recordingClips.map(c => c.trackId));

        const clipsToPlay = (arrangementClips || []).filter(clip => !liveRecordingTrackIds.has(clip.trackId));
        const livePatternsToPlay = tracks.filter(track => liveRecordingTrackIds.has(track.id));
        
        const scheduleClips = (clips: (ArrangementClip | Track)[], isLivePattern: boolean) => {
            clips.forEach(clipOrTrack => {
                let clip: ArrangementClip;
                let track: Track | undefined;
                if (isLivePattern) {
                    track = clipOrTrack as Track;
                    const recClip = recordingClips.find(c => c.trackId === track!.id);
                    if (!recClip) return;
                    clip = recClip;
                } else {
                    clip = clipOrTrack as ArrangementClip;
                    track = tracks.find(t => t.id === clip.trackId);
                }

                const isAudible = soloedTrackId === null ? !mutedTracks.includes(clip.trackId) : soloedTrackId === clip.trackId;

                if (track && isAudible) {
                    const clipStartSeconds = clip.startTime * secondsPerBeat;
                    const clipDurationSeconds = clip.duration * secondsPerBeat;

                    const firstStepInWindow = Math.floor(Math.max(0, scheduleWindowStart - clipStartSeconds) / secondsPerStep);
                    const lastStepInWindow = Math.ceil(Math.max(0, scheduleWindowEnd - clipStartSeconds) / secondsPerStep);

                    for (let step = firstStepInWindow; step < lastStepInWindow; step++) {
                        const stepTimeInClip = step * secondsPerStep;
                        if (stepTimeInClip >= clipDurationSeconds && !isLivePattern) continue;

                        const absoluteStepTime = clipStartSeconds + stepTimeInClip;

                        if (absoluteStepTime >= scheduleWindowStart && absoluteStepTime < scheduleWindowEnd) {
                            let contextTimeForStep = playStartTime + (absoluteStepTime - playStartOffset);

                            if (contextTimeForStep < audioCtxTime) {
                                const timeDiff = audioCtxTime - contextTimeForStep;
                                if (timeDiff > 0.05) { 
                                    contextTimeForStep = audioCtxTime;
                                }
                            }

                            const patternIndex = clip.patternIndex ?? 0;
                            const pattern = track.patterns[patternIndex];
                            if (!pattern) continue;

                            const patternStepIndex = step % track.patternLength;
                            const stepState = pattern[patternStepIndex];

                            const loopTimeForAutomation = (patternStepIndex % 64) * secondsPerStep;
                            const loopCountForTrigs = Math.floor(step / track.patternLength);
                            
                            audioEngine!.playStep(track, stepState, contextTimeForStep, loopTimeForAutomation, loopCountForTrigs);
                        }
                    }
                }
            });
        };

        scheduleClips(clipsToPlay, false);
        scheduleClips(livePatternsToPlay, true);
        useStore.setState({ lastScheduledSongTime: scheduleWindowEnd });
    }
}

function mainLoop() {
    if (!useStore.getState().isPlaying || !audioEngine) return;

    const audioCtxTime = audioEngine.getContext().currentTime;
    let currentPlayheadTime = playStartOffset + (audioCtxTime - playStartTime);
    useStore.setState({ currentPlayheadTime });

    // --- NEW: Automation Playback Logic ---
    const { preset, mainView } = useStore.getState();
    const secondsPerBeat = 60 / preset.bpm;
    let automationTimeInBeats = currentPlayheadTime / secondsPerBeat;

    if (mainView === 'pattern') {
        const patternDurationInBeats = 64 / 4; // 16 beats for 64 steps
        automationTimeInBeats = automationTimeInBeats % patternDurationInBeats;
    }
    
    preset.tracks.forEach(track => {
        if (track.automation && track.type !== 'midi') { // No audio automation for MIDI tracks
            // Volume
            const volValue = getAutomationValue(track.automation, 'volume', automationTimeInBeats);
            if (volValue !== undefined) {
                audioEngine.updateTrackVolume(track.id, volValue);
            }
            // Pan
            const panValue = getAutomationValue(track.automation, 'pan', automationTimeInBeats);
            if (panValue !== undefined) {
                audioEngine.updateTrackPan(track.id, panValue);
            }
            // FX Sends
            for (const fx of ['reverb', 'delay', 'drive', 'sidechain'] as const) {
                const sendValue = getAutomationValue(track.automation, `fxSends.${fx}`, automationTimeInBeats);
                if (sendValue !== undefined) {
                    audioEngine.updateTrackFxSend(track.id, fx, sendValue);
                }
            }
        }
    });
    // --- END of Automation Playback Logic ---

    scheduler();
}

// --- End of Merged Playback Logic ---

const loadJSZip = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (typeof JSZip !== 'undefined') {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load JSZip library.'));
        document.head.appendChild(script);
    });
};

// --- STATE AND ACTIONS INTERFACES ---

export type CenterView = 'mixer' | 'pianoRoll';
export type AppearanceThemeKey = 'studio-dark' | 'studio-88' | 'cyber-neon' | 'minimalist-light' | 'blueprint' | 'ableton-grey' | 'nordic-night' | 'ghost';
export type AccentThemeKey = 'studio-amber' | 'studio-orange' | 'cyber-magenta' | 'corporate-blue' | 'blueprint-white' | 'nordic-ice' | 'daw-cyan';
export type LatencySetting = 'interactive' | 'balanced' | 'playback';

interface AppState {
    preset: Preset;
    selectedTrackId: number;
    mutedTracks: number[];
    soloedTrackId: number | null;
    isPLockModeActive: boolean;
    selectedPLockStep: { trackId: number; stepIndex: number; } | null;
    automationRecording: { trackId: number; } | null;
    overwriteTouchedParams: Set<string>;
    centerView: CenterView;
    mainView: MainView;
    sequencerPage: number;
    isDesktop: boolean;
    isArrangementRecording: boolean;
    recordingClips: ArrangementClip[];
    arrangementLoop: { start: number; end: number; } | null;
    isPresetManagerOpen: boolean;
    isExportModalOpen: boolean;
    isStoreOpen: boolean;
    isSettingsModalOpen: boolean;
    isManualOpen: boolean;
    showQuickStart: boolean;
    showWelcomeScreen: boolean;
    isExporting: boolean;
    exportProgress: string;
    exportProgressValue: number;
    presets: Preset[];
    instrumentPresets: InstrumentPreset[];
    installedPacks: string[];
    customPacks: ExpansionPack[];
    customStoreUrl: string;
    euclideanMode: { trackId: number; pulses: number; steps: number; rotation: number; originalPattern: StepState[]; originalLength: number; } | null;
    appearanceTheme: AppearanceThemeKey;
    accentTheme: AccentThemeKey;
    uiPerformanceMode: UiPerformanceMode;
    importConflict: { newPreset: Preset } | null;
    notifications: Notification[];
    midiOutputs: { id: string; name: string | undefined; }[];
    copiedStep: { trackId: number; stepIndex: number; step: StepState } | null;
    copiedPattern: { trackId: number; pattern: StepState[] } | null;
    audioOutputDevices: { deviceId: string; label: string }[];
    selectedAudioOutputId: string;
    latencySetting: LatencySetting;
    midiSyncSource: 'internal' | string;
    midiSyncOutput: 'none' | string;
    audioEngineInstanceId: number;
    isAudioReady: boolean;
    licenseKey: string | null;
    isViewerMode: boolean;
    isLicenseModalOpen: boolean;
    isSpectator: boolean;
    lastNotificationTime: number;
    isShareJamOpen: boolean;
    showFullscreenPrompt: boolean;
    // Merged from playbackStore
    audioEngine: AudioEngine | null;
    isPlaying: boolean;
    currentStep: number;
    totalStepsElapsed: number;
    lastScheduledStepTime: number;
    lastScheduledSongTime: number;
    currentPlayheadTime: number;
    midiClockPulseCount: number;
}

interface AppActions {
    init: () => void;
    startAudio: () => Promise<void>;
    reinitializeAudio: () => Promise<void>;
    hideWelcomeScreen: (dontShowAgain: boolean) => void;
    panic: () => void;
    setBpm: (bpm: number) => void;
    selectTrack: (trackId: number) => void;
    renameTrack: (trackId: number, newName: string) => void;
    toggleMute: (trackId: number) => void;
    toggleSolo: (trackId: number) => void;
    togglePLockMode: () => void;
    handleStepClick: (trackId: number, stepIndex: number) => void;
    setParam: (path: string, value: any) => void;
    setParamForTrack: (trackId: number, path: string, value: any) => void;
    handleMidiMessage: (mapping: MidiMapping, value: number, command: number) => void;
    setMidiOutParam: (key: keyof MidiOutParams, value: any) => void;
    setTrackVolume: (trackId: number, volume: number) => void;
    setTrackPan: (trackId: number, pan: number) => void;
    setFxSend: (trackId: number, fx: keyof FXSends, value: any) => void;
    setGlobalFxParam: (fx: keyof GlobalFXParams, param: string, value: any) => void;
    setMasterVolume: (volume: number) => void;
    setStepProperty: (trackId: number, stepIndex: number, prop: keyof StepState, value: any) => void;
    auditionNote: (note: string, velocity?: number) => void;
    setPatternLength: (trackId: number, length: number) => void;
    selectPattern: (trackId: number, patternIndex: number, currentPlayheadTime: number) => void;
    startAutomationRecording: (trackId: number) => void;
    stopAutomationRecording: () => void;
    clearAutomation: (trackId: number) => void;
    randomizeTrackPattern: (trackId: number) => void;
    randomizeInstrument: (trackId: number) => void;
    randomizeAllPatternsForTrack: (trackId: number) => void;
    randomizeAllPatternsForAllTracks: () => void;
    clearTrackPattern: (trackId: number) => void;
    clearAllPatterns: () => void;
    startEuclideanMode: (trackId: number) => void;
    updateEuclidean: (params: { pulses?: number; steps?: number; rotation?: number; }) => void;
    applyEuclidean: () => void;
    cancelEuclidean: () => void;
    toggleQuickStart: (show?: boolean) => void;
    togglePresetManager: (open?: boolean) => void;
    toggleExportModal: (open?: boolean) => void;
    toggleStore: (open?: boolean) => void;
    toggleSettingsModal: (open?: boolean) => void;
    toggleManual: (open?: boolean) => void;
    setMidiOutputs: (outputs: { id: string; name: string | undefined; }[]) => void;
    setAppearanceTheme: (theme: AppearanceThemeKey) => void;
    setAccentTheme: (theme: AccentThemeKey) => void;
    setUiPerformanceMode: (mode: UiPerformanceMode) => void;
    setMidiSyncSource: (source: 'internal' | string) => void;
    setMidiSyncOutput: (output: 'none' | string) => void;
    loadPreset: (preset: Preset) => void;
    savePreset: (name: string) => void;
    overwritePreset: (name: string) => void;
    saveCurrentProjectAndExtractPresets: () => void;
    deletePreset: (name: string) => void;
    renamePreset: (oldName: string, newName: string) => void;
    exportProject: () => void;
    importProject: (file: File) => void;
    saveAllProjects: () => void;
    saveCurrentSessionAsNewProject: () => void;
    exportAudio: (options: { type: 'master' | 'stems-wet' | 'stems-dry'; source?: 'pattern' | 'song-loop' | 'song-full'; includeMasterFx?: boolean; }) => Promise<{ blob: Blob; name: string; }>;
    renderJamVideoAudio: () => Promise<AudioBuffer>;
    installPack: (pack: ExpansionPack) => void;
    fetchCustomPacks: (url: string) => void;
    setCustomStoreUrl: (url: string) => void;
    moveClip: (clipId: string, newStartTime: number) => void;
    resizeClip: (clipId: string, newDuration: number) => void;
    deleteClip: (clipId: string) => void;
    duplicateClip: (clip: ArrangementClip, newStartTime: number) => void;
    addPatternClip: (trackId: number, startTime: number, patternIndex: number) => void;
    toggleArrangementRecording: (currentPlayheadTime: number) => void;
    finalizeRecording: (currentPlayheadTime: number) => void;
    initializeArrangementLoop: (defaultDurationInBeats: number) => void;
    setArrangementLoop: (start: number, end: number) => void;
    removeNotification: (id: number) => void;
    addNotification: (notification: Omit<Notification, 'id'>) => void;
    saveInstrumentPreset: (trackType: TrackType, name: string) => void;
    loadInstrumentPreset: (preset: InstrumentPreset) => void;
    deleteInstrumentPreset: (trackType: TrackType, name: string) => void;
    importInstrumentPresets: (file: File) => void;
    exportInstrumentPresets: (trackType: TrackType) => void;
    copyStep: (trackId: number, stepIndex: number) => void;
    pasteStep: (trackId: number, stepIndex: number) => void;
    copyPattern: () => void;
    pastePattern: () => void;
    toggleCenterView: () => void;
    setMainView: (view: MainView) => void;
    setSequencerPage: (page: number) => void;
    setAudioOutputDevices: (devices: { deviceId: string; label: string }[]) => void;
    selectAudioOutput: (deviceId: string) => void;
    setLatency: (latency: LatencySetting) => void;
    exportFullBackup: (midiMappings: MidiMapping[]) => void;
    importFullBackup: (file: File) => Promise<MidiMapping[] | undefined>;
    setLicenseKey: (key: string, isSilent?: boolean) => void;
    clearLicenseKey: () => void;
    toggleLicenseModal: (open?: boolean) => void;
    triggerViewerModeInteraction: () => void;
    toggleShareJamModal: (open?: boolean) => void;
    generateShareableLink: () => Promise<string>;
    toggleFullscreenPrompt: (show?: boolean) => void;
    addMidiCcLock: (cc?: number, value?: number) => void;
    updateMidiCcLock: (id: string, cc?: number, value?: number) => void;
    removeMidiCcLock: (id: string) => void;
    // Merged from playbackStore
    setAudioEngine: (engine: AudioEngine) => void;
    togglePlay: () => void;
    stop: () => void;
    setPlayheadPosition: (time: number) => void;
    handleMidiSyncMessage: (status: number) => void;
}

// --- INITIAL STATE ---

const initialAppState: AppState = {
    preset: deepClone(LICENSED_DEFAULT_PROJECT),
    selectedTrackId: 0,
    mutedTracks: [],
    soloedTrackId: null,
    isPLockModeActive: false,
    selectedPLockStep: null,
    automationRecording: null,
    overwriteTouchedParams: new Set(),
    centerView: 'mixer',
    mainView: 'pattern',
    sequencerPage: 0,
    isDesktop: window.innerWidth > 768,
    isArrangementRecording: false,
    recordingClips: [],
    arrangementLoop: null,
    isPresetManagerOpen: false,
    isExportModalOpen: false,
    isStoreOpen: false,
    isSettingsModalOpen: false,
    isManualOpen: false,
    showQuickStart: false,
    showWelcomeScreen: true,
    isExporting: false,
    exportProgress: '',
    exportProgressValue: 0,
    presets: [],
    instrumentPresets: [],
    installedPacks: [],
    customPacks: [],
    customStoreUrl: '',
    euclideanMode: null,
    appearanceTheme: 'studio-dark',
    accentTheme: 'studio-amber',
    uiPerformanceMode: 'high',
    importConflict: null,
    notifications: [],
    midiOutputs: [],
    copiedStep: null,
    copiedPattern: null,
    audioOutputDevices: [],
    selectedAudioOutputId: 'default',
    latencySetting: 'interactive',
    midiSyncSource: 'internal',
    midiSyncOutput: 'none',
    audioEngineInstanceId: 0,
    isAudioReady: false,
    licenseKey: null,
    isViewerMode: true,
    isLicenseModalOpen: false,
    isSpectator: false,
    lastNotificationTime: 0,
    isShareJamOpen: false,
    showFullscreenPrompt: false,
    // Merged from playbackStore
    audioEngine: null,
    isPlaying: false,
    currentStep: -1,
    totalStepsElapsed: 0,
    lastScheduledStepTime: 0,
    lastScheduledSongTime: 0,
    currentPlayheadTime: 0,
    midiClockPulseCount: 0,
};

// --- OFFLINE RENDER LOGIC ---
async function renderAudioOffline(
    job: any,
    onProgress: (message: string, value: number) => void
): Promise<{ trackName?: string; wavData: ArrayBuffer; type: 'master-done' | 'stem-done' }> {
    const { preset, trackToRenderId, sampleRate, options, mutedTracks, soloedTrackId } = job;
    const { startTime, endTime } = options;
    const totalDuration = endTime - startTime;
    const secondsPerStep = (60.0 / preset.bpm) / 4.0;
    const secondsPerBeat = secondsPerStep * 4;

    onProgress('Initializing offline render...', 0.05);
    await new Promise(resolve => setTimeout(resolve, 50));

    const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);
    const engine = new AudioEngine(offlineCtx);
    await engine.init();

    onProgress('Setting up audio engine...', 0.1);
    engine.createTrackChannels(preset.tracks);
    engine.updateBpm(preset.bpm);

    if (options.type === 'master' || (options.type === 'stems-wet' && options.includeMasterFx)) {
        engine.updateReverb(preset.globalFxParams.reverb, preset.bpm);
        engine.updateDelay(preset.globalFxParams.delay, preset.bpm);
        engine.updateDrive(preset.globalFxParams.drive);
    } else {
        engine.updateReverb({ ...preset.globalFxParams.reverb, mix: 0 }, preset.bpm);
        engine.updateDelay({ ...preset.globalFxParams.delay, mix: 0 }, preset.bpm);
        engine.updateDrive({ ...preset.globalFxParams.drive, mix: 0 });
    }

    if (options.type === 'master') {
        engine.updateCharacter(preset.globalFxParams.character);
        engine.updateMasterFilter(preset.globalFxParams.masterFilter);
        engine.updateCompressor(preset.globalFxParams.compressor);
        engine.updateMasterVolume(preset.globalFxParams.masterVolume);
    } else {
        engine.updateCharacter({ ...preset.globalFxParams.character, mix: 0 });
        engine.updateMasterFilter({ type: 'lowpass', cutoff: 20000, resonance: 1 });
        engine.updateCompressor({ ...preset.globalFxParams.compressor, enabled: false, threshold: 0, makeup: 0 });
        engine.updateMasterVolume(2.5);
    }
    
    const tracksToProcess = options.type === 'master' 
        ? preset.tracks 
        : [preset.tracks.find(t => t.id === trackToRenderId)];

    if (options.type !== 'master') {
         preset.tracks.forEach(t => {
            if (t.id !== trackToRenderId) {
                engine.updateTrackVolume(t.id, 0);
                 if (options.includeMasterFx) {
                    engine.updateTrackFxSend(t.id, 'reverb', 0);
                    engine.updateTrackFxSend(t.id, 'delay', 0);
                    engine.updateTrackFxSend(t.id, 'drive', 0);
                }
            } else {
                engine.updateTrackVolume(t.id, t.volume);
            }
        });
    }

    onProgress('Scheduling audio events...', 0.2);
    const playClipsForTrack = (track: Track) => {
        const isAudible = soloedTrackId === null ? !mutedTracks.includes(track.id) : soloedTrackId === track.id;
        if (!isAudible && options.type === 'master') return;

        (preset.arrangementClips || []).forEach(clip => {
            if (clip.trackId !== track.id) return;
            
            const pattern = track.patterns[clip.patternIndex!];
            if (!pattern) return;
            
            const clipStartSeconds = clip.startTime * secondsPerBeat;
            const clipDurationSeconds = clip.duration * secondsPerBeat;
            
            const firstStepInRenderWindow = Math.floor(Math.max(0, startTime - clipStartSeconds) / secondsPerStep);
            const lastStepInRenderWindow = Math.ceil(Math.max(0, endTime - clipStartSeconds) / secondsPerStep);

            for (let step = firstStepInRenderWindow; step < lastStepInRenderWindow; step++) {
                const stepTimeInClip = step * secondsPerStep;
                if (stepTimeInClip >= clipDurationSeconds) break;
                
                const absoluteTime = clipStartSeconds + stepTimeInClip;
                if (absoluteTime < startTime || absoluteTime >= endTime) continue;

                const timeInContext = absoluteTime - startTime;
                const patternStepIndex = step % track.patternLength;
                const stepState = pattern[patternStepIndex];
                const loopTimeForAutomation = (patternStepIndex % 64) * secondsPerStep;
                const loopCountForTrigs = Math.floor(step / track.patternLength);
                engine.playStep(track, stepState, timeInContext, loopTimeForAutomation, loopCountForTrigs);
            }
        });
    };
    
    const playPatternForTrack = (track: Track, RENDER_STEPS: number) => {
         const isAudible = soloedTrackId === null ? !mutedTracks.includes(track.id) : soloedTrackId === track.id;
         if (isAudible || options.type !== 'master') {
            for (let i = 0; i < RENDER_STEPS; i++) {
                const time = i * secondsPerStep;
                const patternStepIndex = i % track.patternLength;
                const stepState = track.patterns[track.activePatternIndex][patternStepIndex];
                engine.playStep(track, stepState, time, time, 0);
            }
         }
    };

    if (options.source === 'pattern') {
        tracksToProcess.forEach(track => track && playPatternForTrack(track, 64));
    } else {
        tracksToProcess.forEach(track => track && playClipsForTrack(track));
    }
    
    onProgress('Rendering audio... This may take a moment.', 0.4);
    let renderedBuffer = await offlineCtx.startRendering();
    
    onProgress('Post-processing audio...', 0.8);
    const trimThreshold = 0.0001;
    let firstSample = -1;
    for (let i = 0; i < renderedBuffer.numberOfChannels; i++) { const data = renderedBuffer.getChannelData(i); for (let j = 0; j < data.length; j++) { if (Math.abs(data[j]) > trimThreshold) { if (firstSample === -1 || j < firstSample) { firstSample = j; } break; } } }
    if (firstSample > 0 && firstSample < renderedBuffer.length) { const trimmedLength = renderedBuffer.length - firstSample; const tempCtx = new OfflineAudioContext(renderedBuffer.numberOfChannels, trimmedLength, renderedBuffer.sampleRate); const trimmedBuffer = tempCtx.createBuffer(renderedBuffer.numberOfChannels, trimmedLength, renderedBuffer.sampleRate); for (let i = 0; i < renderedBuffer.numberOfChannels; i++) { const channelData = renderedBuffer.getChannelData(i).slice(firstSample); trimmedBuffer.copyToChannel(channelData, i); } renderedBuffer = trimmedBuffer; }
    
    let peak = 0;
    for (let i = 0; i < renderedBuffer.numberOfChannels; i++) { const data = renderedBuffer.getChannelData(i); for (let j = 0; j < data.length; j++) { const absValue = Math.abs(data[j]); if (absValue > peak) { peak = absValue; } } }
    if (peak > 0) { const gain = 0.98 / peak; const normalizeCtx = new OfflineAudioContext(renderedBuffer.numberOfChannels, renderedBuffer.length, renderedBuffer.sampleRate); const source = normalizeCtx.createBufferSource(); source.buffer = renderedBuffer; const gainNode = normalizeCtx.createGain(); gainNode.gain.value = gain; source.connect(gainNode).connect(normalizeCtx.destination); source.start(); renderedBuffer = await normalizeCtx.startRendering(); }

    onProgress('Encoding WAV file...', 0.95);
    const wavData = audioBufferToWav(renderedBuffer);

    return {
        trackName: tracksToProcess[0]?.name,
        wavData,
        type: options.type === 'master' ? 'master-done' : 'stem-done'
    };
}


export const useStore = create<AppState & AppActions>()(
    subscribeWithSelector(
        immer((set, get) => ({
            ...initialAppState,
            init: () => {
                 try {
                    const savedState = localStorage.getItem('fm8r-state');
                    if (savedState) {
                        const parsed = JSON.parse(savedState);
                        set(state => {
                            state.presets = parsed.presets || INITIAL_PRESET_LIBRARY;
                            
                            let instrumentPresets = parsed.instrumentPresets || INITIAL_INSTRUMENT_PRESET_LIBRARY;
                            if (instrumentPresets && !Array.isArray(instrumentPresets) && typeof instrumentPresets === 'object') {
                                console.warn("Migrating old instrument preset format from localStorage.");
                                instrumentPresets = Object.values(instrumentPresets).flat();
                            }
                            state.instrumentPresets = instrumentPresets;

                            state.installedPacks = parsed.installedPacks || [];
                            state.customStoreUrl = parsed.customStoreUrl || '';
                            state.appearanceTheme = parsed.appearanceTheme || 'studio-dark';
                            state.accentTheme = parsed.accentTheme || 'studio-amber';
                            state.uiPerformanceMode = parsed.uiPerformanceMode || 'high';
                            state.latencySetting = parsed.latencySetting || 'interactive';
                            state.midiSyncSource = parsed.midiSyncSource || 'internal';
                            state.midiSyncOutput = parsed.midiSyncOutput || 'none';
                        });
                    } else {
                        set(state => {
                            state.presets = INITIAL_PRESET_LIBRARY;
                            state.instrumentPresets = INITIAL_INSTRUMENT_PRESET_LIBRARY;
                        });
                    }
                    
                    const licenseKey = localStorage.getItem('fm8r-license-key');
                    if (licenseKey) {
                        get().setLicenseKey(licenseKey, true);
                    } else {
                        set(state => {
                            state.preset = deepClone(DEMO_DEFAULT_PROJECT);
                            state.isViewerMode = true;
                            // In viewer mode, ensure "Blank Project" is always available.
                            const hasBlankProject = state.presets.some(p => p.name === DEMO_DEFAULT_PROJECT.name);
                            if (!hasBlankProject) {
                                state.presets.unshift(deepClone(DEMO_DEFAULT_PROJECT));
                            }
                        });
                    }
                    
                    const dontShowWelcome = localStorage.getItem('fm8r-hide-welcome') === 'true';
                    const fullscreenPromptDismissed = localStorage.getItem('fm8r-fullscreen-prompt-dismissed') === 'true';

                    set({ showWelcomeScreen: !dontShowWelcome });
                    if (dontShowWelcome && !fullscreenPromptDismissed) {
                        setTimeout(() => set({ showFullscreenPrompt: true }), 1500);
                    }

                    const params = new URLSearchParams(window.location.search);
                    if (params.get('spectator_mode') === 'true') {
                        set({ isSpectator: true, isViewerMode: true });
                    }
                    
                    if (params.has('jam')) {
                         set({ showWelcomeScreen: true });
                    }

                } catch (error) {
                    console.error("Failed to load saved state:", error);
                    set({ presets: INITIAL_PRESET_LIBRARY, instrumentPresets: INITIAL_INSTRUMENT_PRESET_LIBRARY });
                }

                const handleResize = () => set({ isDesktop: window.innerWidth > 768 });
                window.addEventListener('resize', handleResize);
                handleResize();
            },
            hideWelcomeScreen: (dontShowAgain) => {
                if (dontShowAgain) {
                    localStorage.setItem('fm8r-hide-welcome', 'true');
                }
                set({ showWelcomeScreen: false });
                if (!localStorage.getItem('fm8r-fullscreen-prompt-dismissed')) {
                    setTimeout(() => set({ showFullscreenPrompt: true }), 1500);
                }
            },
            toggleFullscreenPrompt: (show) => {
                set({ showFullscreenPrompt: show ?? !get().showFullscreenPrompt });
            },
            panic: () => {
                get().stop();
                get().startAudio();
            },
            startAudio: async () => {
                if (audioEngine) {
                    await audioEngine.close();
                }
                try {
                    const latencyHint = get().latencySetting;
                    const context = new (window.AudioContext || (window as any).webkitAudioContext)({
                        latencyHint,
                        sampleRate: 44100
                    });
                    const newEngine = new AudioEngine(context);
                    await newEngine.init();
                    
                    get().setAudioEngine(newEngine);

                    const { preset, selectedAudioOutputId } = get();
                    audioEngine.createTrackChannels(preset.tracks);
                    audioEngine.updateBpm(preset.bpm);
                    audioEngine.updateReverb(preset.globalFxParams.reverb, preset.bpm);
                    audioEngine.updateDelay(preset.globalFxParams.delay, preset.bpm);
                    audioEngine.updateDrive(preset.globalFxParams.drive);
                    audioEngine.updateCharacter(preset.globalFxParams.character);
                    audioEngine.updateMasterFilter(preset.globalFxParams.masterFilter);
                    audioEngine.updateCompressor(preset.globalFxParams.compressor);
                    audioEngine.updateMasterVolume(preset.globalFxParams.masterVolume);
                    
                    if (context instanceof AudioContext && 'setSinkId' in context && selectedAudioOutputId !== 'default') {
                        try {
                            await (context as any).setSinkId(selectedAudioOutputId);
                        } catch (err) {
                            console.error(`Failed to set audio output device to ${selectedAudioOutputId}:`, err);
                            set({ selectedAudioOutputId: 'default' });
                            get().addNotification({ type: 'error', message: 'Could not switch audio device. Reverting to default.' });
                        }
                    }
                    
                    set(state => { 
                        state.isAudioReady = true;
                        state.audioEngineInstanceId = state.audioEngineInstanceId + 1;
                    });
                    
                    const params = new URLSearchParams(window.location.search);
                    if (params.has('jam')) {
                        try {
                            const compressedData = params.get('jam');
                            if (compressedData) {
                                await loadJSZip();
                                const zip = new JSZip();
                                const decodedData = atob(compressedData.replace(/-/g, '+').replace(/_/g, '/'));
                                const arrayBuffer = Uint8Array.from(decodedData, c => c.charCodeAt(0));
                                const unzipped = await zip.loadAsync(arrayBuffer);
                                const projectFile = unzipped.file('jam.fm8r-project');
                                if (projectFile) {
                                    const projectJson = await projectFile.async('string');
                                    const newPreset = JSON.parse(projectJson);
                                    get().loadPreset(newPreset);
                                    get().addNotification({ type: 'success', message: `Jam by ${newPreset.artist || 'Anonymous'} loaded!` });
                                }
                            }
                        } catch (e) {
                            console.error("Failed to load shared jam:", e);
                            get().addNotification({ type: 'error', message: 'Could not load shared jam data.' });
                        } finally {
                            window.history.replaceState({}, document.title, window.location.pathname);
                        }
                    }

                } catch (error) {
                    console.error("Failed to initialize AudioEngine:", error);
                    set({ isAudioReady: false });
                }
            },
            reinitializeAudio: async () => {
                const wasPlaying = get().isPlaying;
                if (wasPlaying) get().stop();
                await get().startAudio();
                if (wasPlaying) get().togglePlay();
            },
            setBpm: (bpm) => {
                set(state => { state.preset.bpm = bpm; });
                if (audioEngine) audioEngine.updateBpm(bpm);
            },
            selectTrack: (trackId) => {
                set(state => {
                    if (state.selectedTrackId === trackId) return;
                    state.selectedTrackId = trackId;
                    state.selectedPLockStep = null;
                });
            },
            renameTrack: (trackId, newName) => {
                set(state => {
                    const track = state.preset.tracks.find(t => t.id === trackId);
                    if (track) track.name = newName;
                });
            },
            toggleMute: (trackId) => {
                set(state => {
                    const index = state.mutedTracks.indexOf(trackId);
                    if (index > -1) {
                        state.mutedTracks.splice(index, 1);
                    } else {
                        state.mutedTracks.push(trackId);
                    }
                    state.soloedTrackId = null;
                });
            },
            toggleSolo: (trackId) => {
                set(state => {
                    if (state.soloedTrackId === trackId) {
                        state.soloedTrackId = null;
                    } else {
                        state.soloedTrackId = trackId;
                        state.mutedTracks = [];
                    }
                });
            },
            togglePLockMode: () => {
                set(state => { 
                    state.isPLockModeActive = !state.isPLockModeActive;
                    if (!state.isPLockModeActive) {
                        state.selectedPLockStep = null;
                    }
                });
            },
            handleStepClick: (trackId, stepIndex) => {
                set(state => {
                    if (state.isPLockModeActive) {
                        if (state.selectedPLockStep?.trackId === trackId && state.selectedPLockStep?.stepIndex === stepIndex) {
                            state.selectedPLockStep = null;
                        } else {
                            state.selectedPLockStep = { trackId, stepIndex };
                        }
                    } else {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (track) {
                            const step = track.patterns[track.activePatternIndex][stepIndex];
                            if(step) {
                                step.active = !step.active;
                            }
                        }
                    }
                });
            },
            setParam: (path, value) => {
                const { selectedTrackId, selectedPLockStep } = get();
                if (selectedPLockStep) {
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === selectedPLockStep.trackId);
                        const step = track?.patterns[track.activePatternIndex][selectedPLockStep.stepIndex];
                        if (step) {
                            if (!step.pLocks) step.pLocks = {};
                            const pLockPath = `${track!.type}Params.${path}`;
                            setDeep(step.pLocks, pLockPath, value);
                        }
                    });
                } else {
                    get().setParamForTrack(selectedTrackId, path, value);
                }
            },
            setParamForTrack: (trackId, path, value) => {
                set(state => {
                    const track = state.preset.tracks.find(t => t.id === trackId);
                    if (track) {
                        setDeep(track.params, path, value);
                        if (state.automationRecording?.trackId === trackId) {
                            const fullPath = `params.${path}`;
                            // If this is the first move for this param in this session, clear previous automation.
                            if (!state.overwriteTouchedParams.has(fullPath)) {
                                track.automation[fullPath] = [];
                                state.overwriteTouchedParams.add(fullPath);
                            }
                            const { currentPlayheadTime, mainView, preset } = state;
                            const secondsPerBeat = 60 / preset.bpm;
                            let timeInBeats = currentPlayheadTime / secondsPerBeat;
                            if (mainView === 'pattern') timeInBeats %= (64 / 4);
                            // Ensure the array exists before pushing
                            if (!track.automation[fullPath]) {
                                track.automation[fullPath] = [];
                            }
                            track.automation[fullPath].push({ time: timeInBeats, value });
                        }
                    }
                });
            },
            handleMidiMessage: (mapping, value, command) => {
                const { target } = mapping;
                const { 
                    setTrackVolume, setTrackPan, setFxSend, setParamForTrack, 
                    setGlobalFxParam, setBpm, toggleMute, toggleSolo, selectTrack,
                    togglePlay, stop, setMainView, handleStepClick 
                } = get();
                
                if (target.type === 'knob') {
                    const { min, max } = target.range || { min: 0, max: 127 };
                    const normalizedValue = min + (value / 127) * (max - min);
                    
                    if(target.path.startsWith('tracks.')) {
                        const parts = target.path.split('.');
                        const trackId = parseInt(parts[1]);
                        const param = parts[2];
                        if(param === 'volume') setTrackVolume(trackId, normalizedValue);
                        else if(param === 'pan') setTrackPan(trackId, normalizedValue);
                        else if(param === 'fxSends') setFxSend(trackId, parts[3] as keyof FXSends, normalizedValue);
                        else if (parts.length > 3) {
                             setParamForTrack(trackId, parts.slice(3).join('.'), normalizedValue);
                        }
                    } else if (target.path.startsWith('globalFx.')) {
                        const parts = target.path.split('.');
                        const fx = parts[1] as keyof GlobalFXParams;
                        const param = parts[2];
                        setGlobalFxParam(fx, param, normalizedValue);
                    } else if (target.path === 'preset.bpm') {
                        setBpm(Math.round(normalizedValue));
                    }
                } else if (target.type === 'button') {
                    if (command === 8 || value === 0) return;

                    if(target.path.startsWith('tracks.')) {
                        const parts = target.path.split('.');
                        const trackId = parseInt(parts[1]);
                        const action = parts[2];
                        if (action === 'mute') toggleMute(trackId);
                        else if (action === 'solo') toggleSolo(trackId);
                        else if (action === 'select') selectTrack(trackId);
                    } else if (target.path.startsWith('transport.')) {
                         const action = target.path.split('.')[1];
                         if (action === 'play') togglePlay();
                         else if (action === 'stop') stop();
                         else if (action === 'view') setMainView(target.path.split('.')[2] as MainView);
                    } else if (target.path.startsWith('sequencer.step.')) {
                        const parts = target.path.split('.');
                        const trackId = parseInt(parts[2]);
                        const stepIndex = parseInt(parts[3]);
                        handleStepClick(trackId, stepIndex);
                    }
                }
            },
            setMidiOutParam: (key, value) => {
                const { selectedTrackId, selectedPLockStep } = get();
                set(state => {
                    const trackId = selectedPLockStep ? selectedPLockStep.trackId : selectedTrackId;
                    const track = state.preset.tracks.find(t => t.id === trackId);
                    if (!track || track.type !== 'midi') return;
                    
                    if (selectedPLockStep) {
                        const step = track.patterns[track.activePatternIndex][selectedPLockStep.stepIndex];
                        if (step) {
                            if (!step.pLocks) step.pLocks = {};
                            if (!step.pLocks.midiOutParams) step.pLocks.midiOutParams = {};
                            step.pLocks.midiOutParams[key] = value;
                        }
                    } else {
                        if (!track.midiOut) track.midiOut = { deviceId: null, channel: 1 };
                        track.midiOut[key] = value;
                    }
                });
            },
            setTrackVolume: (trackId, volume) => {
                set(state => {
                    const track = state.preset.tracks.find(t => t.id === trackId);
                    if (track) {
                        const { selectedPLockStep } = state;
                        if (selectedPLockStep?.trackId === trackId) {
                            const step = track.patterns[track.activePatternIndex][selectedPLockStep.stepIndex];
                            if (!step.pLocks) step.pLocks = {};
                            step.pLocks.volume = volume;
                        } else {
                            track.volume = volume;
                            if (state.automationRecording?.trackId === trackId) {
                                const fullPath = 'volume';
                                if (!state.overwriteTouchedParams.has(fullPath)) {
                                    track.automation[fullPath] = [];
                                    state.overwriteTouchedParams.add(fullPath);
                                }
                                const { currentPlayheadTime, mainView, preset } = state;
                                const secondsPerBeat = 60 / preset.bpm;
                                let timeInBeats = currentPlayheadTime / secondsPerBeat;
                                if (mainView === 'pattern') timeInBeats %= (64 / 4);
                                if (!track.automation[fullPath]) track.automation[fullPath] = [];
                                track.automation[fullPath].push({ time: timeInBeats, value: volume });
                            }
                        }
                    }
                });
            },
            setTrackPan: (trackId, pan) => {
                 set(state => {
                    const track = state.preset.tracks.find(t => t.id === trackId);
                    if (track) {
                        const { selectedPLockStep } = state;
                        if (selectedPLockStep?.trackId === trackId) {
                            const step = track.patterns[track.activePatternIndex][selectedPLockStep.stepIndex];
                            if (!step.pLocks) step.pLocks = {};
                            step.pLocks.pan = pan;
                        } else {
                            track.pan = pan;
                            if (state.automationRecording?.trackId === trackId) {
                                const fullPath = 'pan';
                                if (!state.overwriteTouchedParams.has(fullPath)) {
                                    track.automation[fullPath] = [];
                                    state.overwriteTouchedParams.add(fullPath);
                                }
                                const { currentPlayheadTime, mainView, preset } = state;
                                const secondsPerBeat = 60 / preset.bpm;
                                let timeInBeats = currentPlayheadTime / secondsPerBeat;
                                if (mainView === 'pattern') timeInBeats %= (64 / 4);
                                if (!track.automation[fullPath]) track.automation[fullPath] = [];
                                track.automation[fullPath].push({ time: timeInBeats, value: pan });
                            }
                        }
                    }
                });
            },
            setFxSend: (trackId, fx, value) => {
                set(state => {
                    const track = state.preset.tracks.find(t => t.id === trackId);
                    if (track) {
                        const { selectedPLockStep } = state;
                        if (selectedPLockStep?.trackId === trackId) {
                            const step = track.patterns[track.activePatternIndex][selectedPLockStep.stepIndex];
                            if (!step.pLocks) step.pLocks = {};
                            if (!step.pLocks.fxSends) step.pLocks.fxSends = {};
                            step.pLocks.fxSends[fx] = value;
                        } else {
                            track.fxSends[fx] = value;
                            if (state.automationRecording?.trackId === trackId) {
                                const fullPath = `fxSends.${fx}`;
                                if (!state.overwriteTouchedParams.has(fullPath)) {
                                    track.automation[fullPath] = [];
                                    state.overwriteTouchedParams.add(fullPath);
                                }
                                const { currentPlayheadTime, mainView, preset } = state;
                                const secondsPerBeat = 60 / preset.bpm;
                                let timeInBeats = currentPlayheadTime / secondsPerBeat;
                                if (mainView === 'pattern') timeInBeats %= (64 / 4);
                                if (!track.automation[fullPath]) track.automation[fullPath] = [];
                                track.automation[fullPath].push({ time: timeInBeats, value });
                            }
                        }
                    }
                });
            },
            setGlobalFxParam: (fx, param, value) => {
                set(state => {
                    setDeep(state.preset.globalFxParams, `${fx}.${param}`, value);
                });
            },
            setMasterVolume: (volume) => set(state => { state.preset.globalFxParams.masterVolume = volume; }),
            auditionNote: (note, velocity = 0.8) => {
                const { selectedTrackId, preset } = get();
                const track = preset.tracks.find(t => t.id === selectedTrackId);
                if (track && audioEngine) {
                    audioEngine.playNote(track, note, velocity);
                }
            },
            setStepProperty: (trackId, stepIndex, prop, value) => {
                set(state => {
                    const track = state.preset.tracks.find(t => t.id === trackId);
                    if (track) {
                        const step = track.patterns[track.activePatternIndex][stepIndex];
                        if(step) (step as any)[prop] = value;
                    }
                });
            },
            setPatternLength: (trackId, length) => {
                set(state => {
                    const track = state.preset.tracks.find(t => t.id === trackId);
                    if (track) track.patternLength = length;
                });
            },
            selectPattern: (trackId, patternIndex, currentPlayheadTime) => {
                set(state => {
                    const track = state.preset.tracks.find(t => t.id === trackId);
                    if (track) {
                        track.activePatternIndex = patternIndex;
                         if (state.isArrangementRecording) {
                            const secondsPerBeat = 60 / state.preset.bpm;
                            const timeInBeats = Math.floor(currentPlayheadTime / secondsPerBeat);
                            const lastClip = state.recordingClips.find(c => c.trackId === trackId);
                            if (lastClip) {
                                lastClip.duration = timeInBeats - lastClip.startTime;
                                state.recordingClips = state.recordingClips.filter(c => c.duration > 0);
                            }
                            state.recordingClips.push({
                                id: `rec-${trackId}-${Date.now()}`,
                                trackId: trackId,
                                startTime: timeInBeats,
                                duration: 9999,
                                type: 'pattern',
                                patternIndex: patternIndex,
                            });
                        }
                    }
                });
            },
             startAutomationRecording: (trackId) => {
                const trackName = get().preset.tracks.find(t => t.id === trackId)?.name || 'Unknown Track';
                set(state => {
                    state.automationRecording = { trackId };
                    state.overwriteTouchedParams.clear();
                });
                get().addNotification({ type: 'info', message: `Recording automation for ${trackName}` });
            },
            stopAutomationRecording: () => {
                const automationRecording = get().automationRecording;
                if (automationRecording) {
                    const trackName = get().preset.tracks.find(t => t.id === automationRecording.trackId)?.name || 'Unknown Track';
                    set({ automationRecording: null });
                    get().addNotification({ type: 'success', message: `Stopped recording automation for ${trackName}` });
                }
            },
            clearAutomation: (trackId) => {
                let trackName: string | undefined;
                set(state => {
                    const track = state.preset.tracks.find(t => t.id === trackId);
                    if (track) {
                        trackName = track.name;
                        track.automation = {};
                    }
                });
                if (trackName) {
                    get().addNotification({ type: 'success', message: `Cleared automation for ${trackName}` });
                }
            },
            randomizeTrackPattern: (trackId) => {
                set(state => {
                    const track = state.preset.tracks.find(t => t.id === trackId);
                    if (track) {
                        const { pattern, length } = createTechnoPattern(track.type, track.defaultNote);
                        track.patterns[track.activePatternIndex] = pattern;
                        track.patternLength = length;
                    }
                });
            },
            randomizeInstrument: (trackId) => {
                set(state => {
                    const track = state.preset.tracks.find(t => t.id === trackId);
                    if (track) {
                        let newParams: Partial<AllInstrumentParams> = {};
                        switch (track.type) {
                            case 'kick': newParams = randomizeKickParams(); break;
                            case 'hat': newParams = randomizeHatParams(); break;
                            case 'arcane': newParams = randomizeArcaneParams(); break;
                            case 'ruin': newParams = randomizeRuinParams(); break;
                            case 'artifice': newParams = randomizeArtificeParams(); break;
                            case 'shift': newParams = randomizeShiftParams(); break;
                            case 'reson': newParams = randomizeResonParams(); break;
                            case 'alloy': newParams = randomizeAlloyParams(); break;
                        }
                        track.params = { ...track.params, ...newParams };
                        track.loadedInstrumentPresetName = null;
                    }
                });
            },
             clearTrackPattern: (trackId) => {
                set(state => {
                    const track = state.preset.tracks.find(t => t.id === trackId);
                    if (track) {
                        track.patterns[track.activePatternIndex] = createEmptyPatterns()[0];
                    }
                });
            },
            randomizeAllPatternsForTrack: () => {},
            randomizeAllPatternsForAllTracks: () => {},
            clearAllPatterns: () => {},
            startEuclideanMode: (trackId) => {
                set(state => {
                    const track = state.preset.tracks.find(t => t.id === trackId);
                    if (track) {
                        const originalPattern = deepClone(track.patterns[track.activePatternIndex]);
                        state.euclideanMode = {
                            trackId,
                            pulses: Math.min(8, track.patternLength),
                            steps: track.patternLength,
                            rotation: 0,
                            originalPattern,
                            originalLength: track.patternLength,
                        };
                        get().updateEuclidean({});
                    }
                });
            },
            updateEuclidean: (params) => {
                set(state => {
                    if (!state.euclideanMode) return;
                    state.euclideanMode = { ...state.euclideanMode, ...params };
                    const { trackId, pulses, steps, rotation } = state.euclideanMode;
                    const track = state.preset.tracks.find(t => t.id === trackId);
                    if (track) {
                        const sequence = generateEuclideanPattern(pulses, steps);
                        const rotated = [...sequence.slice(-rotation), ...sequence.slice(0, -rotation)];
                        const newPattern = createEmptyPatterns()[0];
                        for (let i = 0; i < steps; i++) {
                            if (rotated[i]) {
                                newPattern[i].active = true;
                            }
                        }
                        track.patterns[track.activePatternIndex] = newPattern;
                        track.patternLength = steps;
                    }
                });
            },
            applyEuclidean: () => set({ euclideanMode: null }),
            cancelEuclidean: () => {
                set(state => {
                    if (state.euclideanMode) {
                        const { trackId, originalPattern, originalLength } = state.euclideanMode;
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (track) {
                            track.patterns[track.activePatternIndex] = originalPattern;
                            track.patternLength = originalLength;
                        }
                        state.euclideanMode = null;
                    }
                });
            },
            toggleQuickStart: (show) => set({ showQuickStart: show ?? !get().showQuickStart }),
            togglePresetManager: (open) => set({ isPresetManagerOpen: open ?? !get().isPresetManagerOpen }),
            toggleExportModal: (open) => set({ isExportModalOpen: open ?? !get().isExportModalOpen }),
            toggleStore: (open) => set({ isStoreOpen: open ?? !get().isStoreOpen }),
            toggleSettingsModal: (open) => set({ isSettingsModalOpen: open ?? !get().isSettingsModalOpen }),
            toggleManual: (open) => set({ isManualOpen: open ?? !get().isManualOpen }),
            setMidiOutputs: (outputs) => set({ midiOutputs: outputs.map(o => ({ id: o.id, name: o.name })) }),
            setAppearanceTheme: (theme) => set({ appearanceTheme: theme }),
            setAccentTheme: (theme) => set({ accentTheme: theme }),
            setUiPerformanceMode: (mode) => set({ uiPerformanceMode: mode }),
            setMidiSyncSource: (source) => {
                set({ midiSyncSource: source });
                if (source !== 'internal') get().stop();
            },
            setMidiSyncOutput: (output) => set({ midiSyncOutput: output }),
            loadPreset: (preset) => {
                const mergedPreset = deepMerge(deepClone(LICENSED_DEFAULT_PROJECT), preset);
                set({
                    preset: mergedPreset,
                    selectedTrackId: 0,
                    mutedTracks: [],
                    soloedTrackId: null,
                    mainView: 'pattern',
                    sequencerPage: 0,
                });
                get().reinitializeAudio();
            },
            savePreset: (name) => {
                set(state => {
                    const newPreset = deepClone(state.preset);
                    newPreset.name = name;
                    state.preset.name = name;
                    state.presets.push(newPreset);
                });
                get().addNotification({ type: 'success', message: `Project "${name}" saved.` });
            },
            overwritePreset: (name) => {
                set(state => {
                    const index = state.presets.findIndex(p => p.name === name);
                    if (index > -1) {
                        state.presets[index] = deepClone(state.preset);
                        get().addNotification({ type: 'success', message: `Project "${name}" overwritten.` });
                    }
                });
            },
            saveCurrentProjectAndExtractPresets: () => {
                const { preset } = get();
                get().overwritePreset(preset.name);
                set(state => {
                    preset.tracks.forEach(track => {
                        const newPresetName = `${preset.name} - ${track.name}`;
                        if (!state.instrumentPresets.some(p => p.type === track.type && p.name === newPresetName)) {
                            state.instrumentPresets.push({
                                type: track.type,
                                name: newPresetName,
                                params: deepClone(track.params),
                            });
                        }
                    });
                });
                get().addNotification({ type: 'success', message: `Project saved and ${preset.tracks.length} instrument presets extracted.` });
            },
            deletePreset: (name) => set(state => { state.presets = state.presets.filter(p => p.name !== name); }),
            renamePreset: (oldName, newName) => {
                set(state => {
                    const preset = state.presets.find(p => p.name === oldName);
                    if (preset) preset.name = newName;
                    if (state.preset.name === oldName) state.preset.name = newName;
                });
            },
            exportProject: () => {
                const preset = get().preset;
                const data = JSON.stringify(preset, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                downloadBlob(blob, `${preset.name}.fm8r-project`);
            },
            importProject: (file) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const result = e.target?.result as string;
                        const newPreset = JSON.parse(result);
                        if (newPreset.bpm && newPreset.tracks) {
                            set(state => {
                                const existingIndex = state.presets.findIndex(p => p.name === newPreset.name);
                                if (existingIndex > -1) {
                                    state.presets[existingIndex] = newPreset;
                                } else {
                                    state.presets.push(newPreset);
                                }
                            });
                            get().loadPreset(newPreset);
                            get().addNotification({ type: 'success', message: `Project "${newPreset.name}" imported.` });
                        } else {
                            get().addNotification({ type: 'error', message: 'Invalid project file format.' });
                        }
                    } catch (error) {
                        get().addNotification({ type: 'error', message: 'Failed to read project file.' });
                    }
                };
                reader.readAsText(file);
            },
            saveAllProjects: () => {
                const data = JSON.stringify({
                    presets: get().presets,
                    instrumentPresets: get().instrumentPresets,
                }, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                downloadBlob(blob, `fm8r_all_projects_backup.json`);
            },
            saveCurrentSessionAsNewProject: () => {
                const name = window.prompt("Enter name for the new project:");
                if (name && name.trim()) {
                    get().savePreset(name.trim());
                }
            },
            exportAudio: async (options) => {
                set({ isExporting: true, exportProgress: 'Starting export...', exportProgressValue: 0 });
                const { preset, mainView, arrangementLoop, mutedTracks, soloedTrackId } = get();
                const sampleRate = 44100;
                
                try {
                    let result;
                    if (options.type === 'master') {
                        let startTime = 0, endTime = 0;
                        if (mainView === 'song') {
                            if (options.source === 'song-full') {
                                endTime = (preset.arrangementClips || []).reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
                            } else {
                                if (!arrangementLoop) throw new Error("Arrangement loop is not set.");
                                startTime = arrangementLoop.start;
                                endTime = arrangementLoop.end;
                            }
                            const secondsPerBeat = 60 / preset.bpm;
                            startTime *= secondsPerBeat;
                            endTime *= secondsPerBeat;
                        } else {
                            const secondsPerStep = (60.0 / preset.bpm) / 4.0;
                            endTime = 64 * secondsPerStep;
                        }
                        
                        const job = { preset: deepClone(preset), sampleRate, options: { ...options, startTime, endTime }, mutedTracks, soloedTrackId };
                        const renderResult = await renderAudioOffline(job, (message, value) => {
                            set({ exportProgress: message, exportProgressValue: value });
                        });
                        
                        result = { blob: new Blob([renderResult.wavData], { type: 'audio/wav' }), name: `${preset.name}_master.wav` };

                    } else {
                         await loadJSZip();
                        const zip = new JSZip();
                        const audibleTracks = preset.tracks.filter(track =>
                            track.type !== 'midi' &&
                            (soloedTrackId === null ? !mutedTracks.includes(track.id) : soloedTrackId === track.id)
                        );
                        
                        for (let i = 0; i < audibleTracks.length; i++) {
                            const track = audibleTracks[i];
                             set({ 
                                exportProgress: `Rendering stem (${i + 1}/${audibleTracks.length}): ${track.name}...`,
                                exportProgressValue: i / audibleTracks.length,
                             });
                             await new Promise(resolve => setTimeout(resolve, 50)); // Allow UI to update

                            let startTime = 0, endTime = 0;
                            if (mainView === 'song') {
                                if (options.source === 'song-full') {
                                    endTime = (preset.arrangementClips || []).reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
                                } else {
                                    if (!arrangementLoop) throw new Error("Arrangement loop is not set.");
                                    startTime = arrangementLoop.start;
                                    endTime = arrangementLoop.end;
                                }
                                const secondsPerBeat = 60 / preset.bpm;
                                startTime *= secondsPerBeat;
                                endTime *= secondsPerBeat;
                            } else {
                                const secondsPerStep = (60.0 / preset.bpm) / 4.0;
                                endTime = 64 * secondsPerStep;
                            }

                            const job = { preset: deepClone(preset), trackToRenderId: track.id, sampleRate, options: { ...options, startTime, endTime }, mutedTracks, soloedTrackId };
                            const renderResult = await renderAudioOffline(job, () => {}); // No-op for internal progress
                            
                            zip.file(`${renderResult.trackName}_${options.includeMasterFx ? 'wet' : 'dry'}.wav`, renderResult.wavData);
                        }
                        
                        set({ exportProgress: 'Compressing files...', exportProgressValue: 1 });
                        const blob = await zip.generateAsync({ type: 'blob' });
                        result = { blob, name: `${preset.name}_stems_${options.includeMasterFx ? 'wet' : 'dry'}.zip` };
                    }

                    downloadBlob(result.blob, result.name);
                    get().addNotification({ type: 'success', message: 'Audio export finished!' });
                    return result;
                } catch (error) {
                    console.error("Export failed:", error);
                    let message = `Export failed: ${error instanceof Error ? error.message : String(error)}`;
                    if (error instanceof DOMException && error.name === 'SecurityError') {
                        message = "Export failed due to browser security restrictions. Please run this app from a local web server.";
                    }
                    get().addNotification({ type: 'error', message });
                    throw error;
                } finally {
                    set({ isExporting: false, exportProgress: '', exportProgressValue: 0 });
                }
            },
            renderJamVideoAudio: async () => {
                const { preset, mainView, arrangementLoop, mutedTracks, soloedTrackId } = get();
                const sampleRate = 44100;

                if (mainView === 'song') {
                    if (!arrangementLoop) {
                        throw new Error("Arrangement loop is not set.");
                    }
                    const secondsPerBeat = 60 / preset.bpm;
                    const options = {
                        startTime: arrangementLoop.start * secondsPerBeat,
                        endTime: arrangementLoop.end * secondsPerBeat,
                    };
                    const totalDuration = options.endTime - options.startTime;
                    if (totalDuration <= 0) throw new Error("Loop duration is zero or negative.");

                    const secondsPerStep = (60.0 / preset.bpm) / 4.0;
                    
                    const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);
                    const engine = new AudioEngine(offlineCtx);
                    await engine.init();
                    
                    engine.createTrackChannels(preset.tracks);
                    engine.updateBpm(preset.bpm);
                    engine.updateReverb(preset.globalFxParams.reverb, preset.bpm);
                    engine.updateDelay(preset.globalFxParams.delay, preset.bpm);
                    engine.updateDrive(preset.globalFxParams.drive);
                    engine.updateCharacter(preset.globalFxParams.character);
                    engine.updateMasterFilter(preset.globalFxParams.masterFilter);
                    engine.updateCompressor(preset.globalFxParams.compressor);
                    engine.updateMasterVolume(preset.globalFxParams.masterVolume);

                    (preset.arrangementClips || []).forEach(clip => {
                        const track = preset.tracks.find(t => t.id === clip.trackId);
                        if (!track) return;
                        const isAudible = soloedTrackId === null ? !mutedTracks.includes(track.id) : soloedTrackId === track.id;
                        if (!isAudible) return;

                        const pattern = track.patterns[clip.patternIndex!];
                        if (!pattern) return;

                        const clipStartSeconds = clip.startTime * secondsPerBeat;
                        const clipDurationSeconds = clip.duration * secondsPerBeat;

                        const firstStepInRenderWindow = Math.floor(Math.max(0, options.startTime - clipStartSeconds) / secondsPerStep);
                        const lastStepInRenderWindow = Math.ceil(Math.max(0, options.endTime - clipStartSeconds) / secondsPerStep);

                        for (let step = firstStepInRenderWindow; step < lastStepInRenderWindow; step++) {
                            const stepTimeInClip = step * secondsPerStep;
                            if (stepTimeInClip >= clipDurationSeconds) break;

                            const absoluteTime = clipStartSeconds + stepTimeInClip;
                            const timeInContext = absoluteTime - options.startTime;
                            
                            if (timeInContext >= 0 && timeInContext < totalDuration) {
                                const patternStepIndex = step % track.patternLength;
                                const stepState = pattern[patternStepIndex];
                                const loopTimeForAutomation = (patternStepIndex % 64) * secondsPerStep;
                                const loopCountForTrigs = Math.floor(step / track.patternLength);
                                engine.playStep(track, stepState, timeInContext, loopTimeForAutomation, loopCountForTrigs);
                            }
                        }
                    });

                    return offlineCtx.startRendering();
                } else {
                    const RENDER_STEPS = 64;
                    const secondsPerStep = (60.0 / preset.bpm) / 4.0;
                    const totalDuration = RENDER_STEPS * secondsPerStep;
                    
                    const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);
                    const engine = new AudioEngine(offlineCtx);
                    await engine.init();

                    engine.createTrackChannels(preset.tracks);
                    engine.updateBpm(preset.bpm);
                    engine.updateReverb(preset.globalFxParams.reverb, preset.bpm);
                    engine.updateDelay(preset.globalFxParams.delay, preset.bpm);
                    engine.updateDrive(preset.globalFxParams.drive);
                    engine.updateCharacter(preset.globalFxParams.character);
                    engine.updateMasterFilter(preset.globalFxParams.masterFilter);
                    engine.updateCompressor(preset.globalFxParams.compressor);
                    engine.updateMasterVolume(preset.globalFxParams.masterVolume);

                    for (let i = 0; i < RENDER_STEPS; i++) {
                        const time = i * secondsPerStep;
                        preset.tracks.forEach(track => {
                            const isAudible = soloedTrackId === null ? !mutedTracks.includes(track.id) : soloedTrackId === track.id;
                            if (isAudible) {
                                const patternStepIndex = i % track.patternLength;
                                const stepState = track.patterns[track.activePatternIndex][patternStepIndex];
                                engine.playStep(track, stepState, time, time, 0);
                            }
                        });
                    }
                    return offlineCtx.startRendering();
                }
            },
            setLicenseKey: (key, isSilent = false) => {
                const isValid = key.startsWith("FM8R-");
                if (isValid) {
                    localStorage.setItem('fm8r-license-key', key);
                    set(state => {
                        state.licenseKey = key;
                        state.isViewerMode = false;
                        state.isLicenseModalOpen = false;
                        state.preset = deepMerge(deepClone(LICENSED_DEFAULT_PROJECT), state.preset);
                    });
                    if (!isSilent) {
                        get().addNotification({ type: 'success', message: 'Full version unlocked! Enjoy all features.' });
                    }
                    get().reinitializeAudio();
                } else if (!isSilent) {
                    get().addNotification({ type: 'error', message: 'Invalid license key.' });
                }
            },
            clearLicenseKey: () => {
                localStorage.removeItem('fm8r-license-key');
                set(state => {
                    state.licenseKey = null;
                    state.isViewerMode = true;
                });
            },
            triggerViewerModeInteraction: () => {
                const { lastNotificationTime } = get();
                const now = Date.now();
                if (now - lastNotificationTime > 3000) {
                    get().addNotification({ type: 'info', message: 'This feature requires the full version.' });
                    get().toggleLicenseModal(true);
                    set({ lastNotificationTime: now });
                }
            },
            toggleLicenseModal: (open) => set({ isLicenseModalOpen: open ?? !get().isLicenseModalOpen }),
            toggleShareJamModal: (open) => set({ isShareJamOpen: open ?? !get().isShareJamOpen }),
            generateShareableLink: async () => {
                const { preset, addNotification } = get();
                try {
                    await loadJSZip();
                    const zip = new JSZip();
                    const projectData = deepClone(preset);
                    projectData.artist = 'Shared';
                    zip.file("jam.fm8r-project", JSON.stringify(projectData));
                    const blob = await zip.generateAsync({
                        type: "blob",
                        compression: "DEFLATE",
                        compressionOptions: { level: 9 }
                    });

                    const reader = new FileReader();
                    return new Promise((resolve, reject) => {
                        reader.onloadend = () => {
                            const base64data = reader.result as string;
                            const compressedData = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(base64data.split(',')[1] ? atob(base64data.split(',')[1]).split('').map(c => c.charCodeAt(0)) : []))));
                            const safeUrl = compressedData.replace(/\+/g, '-').replace(/\//g, '_');
                            const url = `${window.location.origin}${window.location.pathname}?jam=${safeUrl}`;
                            
                            if (url.length > 2000) {
                                reject(new Error("Project is too large to share via URL."));
                            } else {
                                resolve(url);
                            }
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.error("Link generation failed:", e);
                    addNotification({ type: 'error', message: e instanceof Error ? e.message : "Failed to generate link." });
                    throw e;
                }
            },
            installPack: (pack: ExpansionPack) => {
                set(state => {
                    if (!state.installedPacks.includes(pack.id)) {
                        state.installedPacks.push(pack.id);
                        pack.projects.forEach(p => {
                            if (!state.presets.some(existing => existing.name === p.name)) {
                                state.presets.push(deepClone(p));
                            }
                        });
                        pack.instruments.forEach(p => {
                             if (!state.instrumentPresets.some(existing => existing.name === p.name && existing.type === p.type)) {
                                state.instrumentPresets.push(deepClone(p));
                            }
                        });
                        get().addNotification({ type: 'success', message: `Expansion Pack "${pack.name}" installed!` });
                    }
                });
            },
            fetchCustomPacks: async (url) => {
                 if (!url) {
                    set({ customPacks: [] });
                    return;
                }
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const customPacks = await response.json();
                    set({ customPacks });
                    get().addNotification({ type: 'info', message: 'Custom packs loaded from URL.' });
                } catch (error) {
                    console.error("Failed to fetch custom packs:", error);
                    get().addNotification({ type: 'error', message: 'Could not load custom packs from URL.' });
                }
            },
            setCustomStoreUrl: (url) => set({ customStoreUrl: url }),
            moveClip: (clipId, newStartTime) => {
                set(state => {
                    const clip = state.preset.arrangementClips?.find(c => c.id === clipId);
                    if (clip) {
                        clip.startTime = newStartTime;
                    }
                });
            },
            resizeClip: (clipId, newDuration) => {
                set(state => {
                    const clip = state.preset.arrangementClips?.find(c => c.id === clipId);
                    if (clip) {
                        clip.duration = newDuration;
                    }
                });
            },
            deleteClip: (clipId) => {
                set(state => {
                    if (state.preset.arrangementClips) {
                        state.preset.arrangementClips = state.preset.arrangementClips.filter(c => c.id !== clipId);
                    }
                });
            },
            duplicateClip: (clip, newStartTime) => {
                set(state => {
                    const newClip = {
                        ...deepClone(clip),
                        id: `clip-${Date.now()}`,
                        startTime: newStartTime,
                    };
                    if (!state.preset.arrangementClips) {
                        state.preset.arrangementClips = [];
                    }
                    state.preset.arrangementClips.push(newClip);
                });
            },
            addPatternClip: (trackId, startTime, patternIndex) => {
                set(state => {
                    const track = state.preset.tracks.find(t => t.id === trackId);
                    if (track) {
                        const duration = track.patternLength / 4;
                        const newClip: ArrangementClip = {
                            id: `clip-${Date.now()}`,
                            trackId,
                            startTime,
                            duration,
                            type: 'pattern',
                            patternIndex,
                        };
                        if (!state.preset.arrangementClips) {
                            state.preset.arrangementClips = [];
                        }
                        state.preset.arrangementClips.push(newClip);
                    }
                });
            },
            toggleArrangementRecording: (currentPlayheadTime) => {
                set(state => {
                    if (state.isArrangementRecording) {
                        // Stop recording
                        state.recordingClips.forEach(clip => {
                            if (clip.duration === 9999) {
                                clip.duration = currentPlayheadTime / (60 / state.preset.bpm) - clip.startTime;
                            }
                        });
                        state.recordingClips = state.recordingClips.filter(c => c.duration > 0.01);
                        state.preset.arrangementClips = [...(state.preset.arrangementClips || []), ...state.recordingClips];
                        state.isArrangementRecording = false;
                        state.recordingClips = [];
                    } else {
                        // Start recording
                        state.isArrangementRecording = true;
                        state.recordingClips = [];
                        state.preset.tracks.forEach(track => {
                            if (!state.mutedTracks.includes(track.id)) {
                                state.recordingClips.push({
                                    id: `rec-${track.id}-${Date.now()}`,
                                    trackId: track.id,
                                    startTime: Math.floor(currentPlayheadTime / (60 / state.preset.bpm)),
                                    duration: 9999, // placeholder for ongoing
                                    type: 'pattern',
                                    patternIndex: track.activePatternIndex,
                                });
                            }
                        });
                    }
                });
            },
            finalizeRecording: (currentPlayheadTime) => {
                set(state => {
                    if (state.isArrangementRecording) {
                        state.recordingClips.forEach(clip => {
                            if (clip.duration === 9999) {
                                clip.duration = currentPlayheadTime / (60 / state.preset.bpm) - clip.startTime;
                            }
                        });
                        state.recordingClips = state.recordingClips.filter(c => c.duration > 0.01);
                        state.preset.arrangementClips = [...(state.preset.arrangementClips || []), ...state.recordingClips];
                        state.isArrangementRecording = false;
                        state.recordingClips = [];
                    }
                });
            },
            initializeArrangementLoop: (defaultDurationInBeats) => {
                set(state => {
                    if (!state.arrangementLoop) {
                        const clips = state.preset.arrangementClips || [];
                        const maxTime = clips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
                        if (maxTime > 0) {
                            state.arrangementLoop = { start: 0, end: Math.ceil(maxTime / 4) * 4 };
                        } else {
                            state.arrangementLoop = { start: 0, end: defaultDurationInBeats };
                        }
                    }
                });
            },
            setArrangementLoop: (start, end) => {
                set({ arrangementLoop: { start, end } });
            },
            removeNotification: (id) => {
                set(state => {
                    state.notifications = state.notifications.filter(n => n.id !== id);
                });
            },
            addNotification: (notification) => {
                set(state => {
                    const newNotification = { ...notification, id: Date.now() };
                    state.notifications.push(newNotification);
                    if (state.notifications.length > 5) {
                        state.notifications.shift();
                    }
                });
            },
            saveInstrumentPreset: (trackType, name) => {
                set(state => {
                    const track = state.preset.tracks.find(t => t.type === trackType);
                    if (track) {
                        const newPreset = { type: trackType, name, params: deepClone(track.params) };
                        state.instrumentPresets.push(newPreset);
                        const currentTrack = state.preset.tracks.find(t => t.id === state.selectedTrackId);
                        if (currentTrack) currentTrack.loadedInstrumentPresetName = name;
                        get().addNotification({ type: 'success', message: `Instrument preset "${name}" saved.` });
                    }
                });
            },
            loadInstrumentPreset: (preset) => {
                set(state => {
                    const track = state.preset.tracks.find(t => t.id === state.selectedTrackId);
                    if (track && track.type === preset.type) {
                        track.params = deepClone(preset.params);
                        track.loadedInstrumentPresetName = preset.name;
                    } else {
                        const matchingTrack = state.preset.tracks.find(t => t.type === preset.type);
                        if (matchingTrack) {
                            matchingTrack.params = deepClone(preset.params);
                            matchingTrack.loadedInstrumentPresetName = preset.name;
                            state.selectedTrackId = matchingTrack.id;
                        } else {
                             get().addNotification({ type: 'error', message: `No track with type "${preset.type}" found.` });
                        }
                    }
                });
            },
            deleteInstrumentPreset: (trackType, name) => {
                set(state => {
                    state.instrumentPresets = state.instrumentPresets.filter(p => !(p.type === trackType && p.name === name));
                });
            },
            importInstrumentPresets: (file) => {
                 const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const result = e.target?.result as string;
                        const imported = JSON.parse(result);
                        
                        let presetsToImport: InstrumentPreset[] = [];
                        if (Array.isArray(imported)) {
                            presetsToImport = imported;
                        } else if (imported.instrumentPresets && Array.isArray(imported.instrumentPresets)) {
                            presetsToImport = imported.instrumentPresets;
                        }

                        if (presetsToImport.length > 0) {
                            set(state => {
                                presetsToImport.forEach(p => {
                                    if (p.type && p.name && p.params && !state.instrumentPresets.some(existing => existing.name === p.name && existing.type === p.type)) {
                                        state.instrumentPresets.push(p);
                                    }
                                });
                            });
                             get().addNotification({ type: 'success', message: `${presetsToImport.length} instrument presets imported.` });
                        } else {
                            get().addNotification({ type: 'error', message: 'No valid instrument presets found in file.' });
                        }
                    } catch (error) {
                        get().addNotification({ type: 'error', message: 'Failed to read instrument preset file.' });
                    }
                };
                reader.readAsText(file);
            },
            exportInstrumentPresets: (trackType) => {
                 const presets = get().instrumentPresets.filter(p => p.type === trackType);
                if (presets.length > 0) {
                    const data = JSON.stringify(presets, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    downloadBlob(blob, `fm8r_${trackType}_presets.json`);
                } else {
                    get().addNotification({ type: 'info', message: `No presets to export for ${trackType}.` });
                }
            },
            copyStep: (trackId, stepIndex) => {
                set(state => {
                    const track = state.preset.tracks.find(t => t.id === trackId);
                    if (track) {
                        const step = track.patterns[track.activePatternIndex][stepIndex];
                        state.copiedStep = { trackId, stepIndex, step: deepClone(step) };
                         get().addNotification({ type: 'info', message: 'Step copied' });
                    }
                });
            },
            pasteStep: (trackId, stepIndex) => {
                set(state => {
                    if (state.copiedStep) {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (track) {
                            track.patterns[track.activePatternIndex][stepIndex] = deepClone(state.copiedStep.step);
                            get().addNotification({ type: 'info', message: 'Step pasted' });
                        }
                    }
                });
            },
            copyPattern: () => {
                const { selectedTrackId, preset } = get();
                const track = preset.tracks.find(t => t.id === selectedTrackId);
                if (track) {
                    const pattern = track.patterns[track.activePatternIndex];
                    set({ copiedPattern: { trackId: selectedTrackId, pattern: deepClone(pattern) }});
                    get().addNotification({ type: 'info', message: `Pattern for ${track.name} copied.` });
                }
            },
            pastePattern: () => {
                 set(state => {
                    if (state.copiedPattern) {
                        const track = state.preset.tracks.find(t => t.id === state.selectedTrackId);
                        if (track) {
                            track.patterns[track.activePatternIndex] = deepClone(state.copiedPattern.pattern);
                            get().addNotification({ type: 'info', message: `Pasted to ${track.name}.` });
                        }
                    }
                 });
            },
            toggleCenterView: () => {
                set(state => {
                    state.centerView = state.centerView === 'mixer' ? 'pianoRoll' : 'mixer';
                });
            },
            setMainView: (view: MainView) => {
                set({ mainView: view });
            },
            setSequencerPage: (page: number) => {
                set({ sequencerPage: page });
            },
            setAudioOutputDevices: (devices) => {
                set({ audioOutputDevices: devices });
            },
            selectAudioOutput: (deviceId) => {
                set({ selectedAudioOutputId: deviceId });
                get().reinitializeAudio();
            },
            setLatency: (latency) => {
                set({ latencySetting: latency });
                get().reinitializeAudio();
            },
            exportFullBackup: (midiMappings) => {
                const { presets, instrumentPresets, installedPacks, appearanceTheme, accentTheme, latencySetting, midiSyncSource, midiSyncOutput } = get();
                const backup: FullBackup = {
                    version: '1.0',
                    presets,
                    instrumentPresets,
                    installedPacks,
                    appearanceTheme,
                    accentTheme,
                    midiMappings,
                    midiSyncSource,
                    midiSyncOutput,
                };
                const data = JSON.stringify(backup, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                downloadBlob(blob, 'fm8r-full-backup.json');
            },
            importFullBackup: async (file) => {
                const reader = new FileReader();
                return new Promise((resolve, reject) => {
                    reader.onload = (e) => {
                        try {
                            const result = e.target?.result as string;
                            const backup: FullBackup = JSON.parse(result);
                            set({
                                presets: backup.presets,
                                instrumentPresets: backup.instrumentPresets,
                                installedPacks: backup.installedPacks,
                                appearanceTheme: backup.appearanceTheme,
                                accentTheme: backup.accentTheme,
                                midiSyncSource: backup.midiSyncSource,
                                midiSyncOutput: backup.midiSyncOutput,
                            });
                            get().addNotification({ type: 'success', message: 'Full backup restored successfully.' });
                            resolve(backup.midiMappings);
                        } catch (error) {
                            get().addNotification({ type: 'error', message: 'Failed to read backup file.' });
                            reject(error);
                        }
                    };
                    reader.readAsText(file);
                });
            },
            addMidiCcLock: (cc = 0, value = 0) => {
                const { selectedPLockStep } = get();
                if (!selectedPLockStep) return;
                set(state => {
                    const track = state.preset.tracks.find(t => t.id === selectedPLockStep.trackId);
                    if (!track || track.type !== 'midi') return;
                    const step = track.patterns[track.activePatternIndex][selectedPLockStep.stepIndex];
                    if (!step.pLocks) step.pLocks = {};
                    if (!step.pLocks.ccLocks) step.pLocks.ccLocks = [];
                    step.pLocks.ccLocks.push({ id: `cc-${Date.now()}`, cc, value });
                });
            },
            updateMidiCcLock: (id, cc, value) => {
                const { selectedPLockStep } = get();
                if (!selectedPLockStep) return;
                 set(state => {
                    const track = state.preset.tracks.find(t => t.id === selectedPLockStep.trackId);
                    if (!track || track.type !== 'midi') return;
                    const step = track.patterns[track.activePatternIndex][selectedPLockStep.stepIndex];
                    const lock = step.pLocks?.ccLocks?.find(l => l.id === id);
                    if (lock) {
                        if (cc !== undefined) lock.cc = cc;
                        if (value !== undefined) lock.value = value;
                    }
                });
            },
            removeMidiCcLock: (id) => {
                 const { selectedPLockStep } = get();
                if (!selectedPLockStep) return;
                set(state => {
                    const track = state.preset.tracks.find(t => t.id === selectedPLockStep.trackId);
                    if (!track || track.type !== 'midi') return;
                    const step = track.patterns[track.activePatternIndex][selectedPLockStep.stepIndex];
                    if (step.pLocks?.ccLocks) {
                        step.pLocks.ccLocks = step.pLocks.ccLocks.filter(l => l.id !== id);
                    }
                });
            },
            // Merged actions from playbackStore
            setAudioEngine: (engine) => {
                audioEngine = engine;
                set({ audioEngine: engine });
                startLevelMonitoring();
            },
            togglePlay: () => {
                if (!get().isAudioReady) {
                    console.warn("Audio engine not ready, play ignored.");
                    return;
                }
                if (get().midiSyncSource !== 'internal') return;
                
                const wasPlaying = get().isPlaying;
                if (!wasPlaying) {
                    audioEngine?.resume();
                    audioEngine?.resetTriggerStates();
                    const currentPlayhead = get().currentPlayheadTime;
                    playStartTime = audioEngine!.getContext().currentTime;
                    playStartOffset = currentPlayhead;
            
                    set({
                        isPlaying: true,
                        lastScheduledStepTime: 0, 
                        lastScheduledSongTime: currentPlayhead,
                    });
                } else {
                    set({ isPlaying: false });
                }
            },
            stop: () => {
                set({ isPlaying: false, currentStep: -1, totalStepsElapsed: 0, currentPlayheadTime: 0, midiClockPulseCount: 0, lastScheduledSongTime: 0 });
                playStartOffset = 0;
                audioEngine?.stopAll();
                audioEngine?.resetTriggerStates();
            },
            setPlayheadPosition: (time) => {
                set(state => {
                    if (audioEngine) {
                        if (state.isPlaying) {
                            audioEngine.stopAll();
                            audioEngine.resetTriggerStates();
                        }
                        playStartTime = audioEngine.getContext().currentTime;
                        playStartOffset = time;
                        state.currentPlayheadTime = time;
                        state.lastScheduledSongTime = time;
                        state.currentStep = -1;
                    } else {
                        playStartOffset = time;
                        state.currentPlayheadTime = time;
                    }
                });
            },
            handleMidiSyncMessage: (status) => {
                const { mainView, addNotification } = get();
                switch (status) {
                    case 0xFA: // Start
                        get().stop();
                        set({ isPlaying: true, midiClockPulseCount: 0 });
                        break;
                    case 0xFC: // Stop
                        get().stop();
                        break;
                    case 0xF8: // Clock
                        if (get().isPlaying) {
                            if (mainView !== 'pattern') {
                                if (get().midiClockPulseCount === 0) {
                                    addNotification({type: 'info', message: 'External MIDI sync is only supported in Pattern mode for now.'});
                                }
                                set(state => { state.midiClockPulseCount++; });
                                return;
                            }

                            set(state => { state.midiClockPulseCount++; });
                            if (get().midiClockPulseCount % PULSES_PER_STEP === 0) {
                                const { preset, selectedTrackId } = get();
                                if (!preset) return;
                                const track = preset.tracks.find(t => t.id === selectedTrackId);
                                const patternLength = track ? track.patternLength : 64;

                                const stepToPlay = get().totalStepsElapsed;
                                playOnePatternStep(stepToPlay);
                                set({
                                    totalStepsElapsed: stepToPlay + 1,
                                    currentStep: stepToPlay % patternLength
                                });
                            }
                        }
                        break;
                }
            },
        }))
    )
);

// Subscribe to state changes to save to localStorage
useStore.subscribe(
    (state) => ({ 
        presets: state.presets, 
        instrumentPresets: state.instrumentPresets,
        installedPacks: state.installedPacks,
        customStoreUrl: state.customStoreUrl,
        appearanceTheme: state.appearanceTheme,
        accentTheme: state.accentTheme,
        uiPerformanceMode: state.uiPerformanceMode,
        latencySetting: state.latencySetting,
        midiSyncSource: state.midiSyncSource,
        midiSyncOutput: state.midiSyncOutput,
    }),
    (currentState) => {
        try {
            localStorage.setItem('fm8r-state', JSON.stringify(currentState));
        } catch (error) {
            console.error("Failed to save state to localStorage:", error);
        }
    },
    { equalityFn: shallow }
);

// Subscribe to audio engine parameter changes
const unsubscribers: (() => void)[] = [];

const setupAudioSubscriptions = () => {
    unsubscribers.forEach(unsub => unsub());
    unsubscribers.length = 0;

    const sub = (selector: (state: AppState) => any, callback: (value: any) => void) => {
        unsubscribers.push(useStore.subscribe(selector, callback, { equalityFn: shallow }));
    };

    if (audioEngine) {
        sub(s => s.preset.globalFxParams.reverb, p => audioEngine.updateReverb(p, useStore.getState().preset.bpm));
        sub(s => s.preset.globalFxParams.delay, p => audioEngine.updateDelay(p, useStore.getState().preset.bpm));
        sub(s => s.preset.globalFxParams.drive, p => audioEngine.updateDrive(p));
        sub(s => s.preset.globalFxParams.character, p => audioEngine.updateCharacter(p));
        sub(s => s.preset.globalFxParams.compressor, p => audioEngine.updateCompressor(p));
        sub(s => s.preset.globalFxParams.masterFilter, p => audioEngine.updateMasterFilter(p));
        sub(s => s.preset.globalFxParams.masterVolume, v => audioEngine.updateMasterVolume(v));

        useStore.getState().preset.tracks.forEach(track => {
            sub(s => s.preset.tracks.find(t=>t.id===track.id)?.volume, v => audioEngine.updateTrackVolume(track.id, v));
            sub(s => s.preset.tracks.find(t=>t.id===track.id)?.pan, p => audioEngine.updateTrackPan(track.id, p));
            sub(s => s.preset.tracks.find(t=>t.id===track.id)?.fxSends, s => {
                Object.keys(s).forEach(fx => audioEngine.updateTrackFxSend(track.id, fx as keyof FXSends, s[fx as keyof FXSends]))
            });
        });
    }
};

useStore.subscribe(state => state.audioEngineInstanceId, setupAudioSubscriptions);
useStore.subscribe(state => state.preset.tracks.length, setupAudioSubscriptions);

// Merged subscription from playbackStore
useStore.subscribe(
    (state) => state.isPlaying,
    (isPlaying, prevIsPlaying) => {
        const { midiSyncSource, isArrangementRecording, finalizeRecording, midiSyncOutput } = useStore.getState();

        if (isPlaying && !prevIsPlaying) {
            if (midiSyncSource === 'internal') {
                if (sequencerTimerId) clearInterval(sequencerTimerId);
                mainLoop(); 
                sequencerTimerId = setInterval(mainLoop, schedulerInterval);
            }
        } else if (!isPlaying && prevIsPlaying) {
            if (sequencerTimerId) clearInterval(sequencerTimerId);
            sequencerTimerId = null;

            if (isArrangementRecording) {
                const { currentPlayheadTime } = useStore.getState();
                finalizeRecording(currentPlayheadTime);
            }
            
            if (midiSyncOutput !== 'none' && audioEngine) {
                const output = audioEngine.getMidiOutputs().find(o => o.id === midiSyncOutput);
                output?.send([0xFC]);
            }
        }
    }
);