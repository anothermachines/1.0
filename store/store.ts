import { create } from 'zustand';
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
import { deepClone, deepMerge, createTechnoPattern, randomizeKickParams, randomizeHatParams, randomizeArcaneParams, randomizeRuinParams, randomizeArtificeParams, randomizeShiftParams, randomizeResonParams, randomizeAlloyParams, audioBufferToWav, downloadBlob, generateEuclideanPattern, generateWaveformData, setDeep, generateWaveformForPattern, midiToNoteName } from '../utils';
import { createEmptyPatterns, INITIAL_KICK_PARAMS, INITIAL_HAT_PARAMS, INITIAL_ARCANE_PARAMS, INITIAL_RUIN_PARAMS, INITIAL_ARTIFICE_PARAMS, INITIAL_SHIFT_PARAMS, INITIAL_RESON_PARAMS, INITIAL_ALLOY_PARAMS } from '../constants';
import { useVUMeterStore } from './vuMeterStore';
import { usePlaybackStore } from './playbackStore';

declare let JSZip: any;

let audioEngine: AudioEngine | null = null;

// RENDER HELPERS
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
export type AppearanceThemeKey = 'studio-dark' | 'studio-88' | 'cyber-neon' | 'minimalist-light' | 'blueprint' | 'ableton-grey' | 'nordic-night';
export type AccentThemeKey = 'studio-amber' | 'studio-orange' | 'cyber-magenta' | 'corporate-blue' | 'blueprint-white' | 'nordic-ice' | 'daw-cyan';
export type LatencySetting = 'interactive' | 'balanced' | 'playback';


interface AppState {
    preset: Preset;
    selectedTrackId: number;
    mutedTracks: number[];
    soloedTrackId: number | null;
    isPLockModeActive: boolean;
    selectedPLockStep: { trackId: number; stepIndex: number; } | null;
    automationRecording: { trackId: number; mode: 'overwrite' | 'overdub' } | null;
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
    isViewerMode: boolean; // Start in viewer mode by default
    isLicenseModalOpen: boolean;
    isSpectator: boolean;
    lastNotificationTime: number;
    isShareJamOpen: boolean;
    showFullscreenPrompt: boolean;
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
    startAutomationRecording: (trackId: number, mode: 'overwrite' | 'overdub') => void;
    stopAutomationRecording: () => void;
    clearAutomation: (trackId: number) => void;
    randomizeTrackPattern: (trackId: number) => void;
    randomizeInstrument: (trackId: number) => void;
    randomizeAllPatternsForTrack: (trackId: number) => void;
    randomizeAllPatternsForAllTracks: () => void;
    clearTrackPattern: (trackId: number) => void;
    clearAllPatterns: () => void;
    startEuclideanMode: (trackId: number) => void;
    updateEuclidean: (params: { pulses?: number; steps?: number; rotation?: number }) => void;
    applyEuclidean: () => void;
    cancelEuclidean: () => void;
    toggleQuickStart: (show?: boolean) => void;
    togglePresetManager: (open?: boolean) => void;
    toggleExportModal: (open?: boolean) => void;
    toggleStore: (open?: boolean) => void;
    toggleSettingsModal: (open?: boolean) => void;
    toggleManual: (open?: boolean) => void;
    setMidiOutputs: (outputs: MIDIOutput[]) => void;
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
    _recordAutomationPoint: (state: any, trackId: number, path: string, value: any) => void;
    addMidiCcLock: (cc?: number, value?: number) => void;
    updateMidiCcLock: (id: string, cc?: number, value?: number) => void;
    removeMidiCcLock: (id: string) => void;
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
    isViewerMode: true, // Start in viewer mode by default
    isLicenseModalOpen: false,
    isSpectator: false,
    lastNotificationTime: 0,
    isShareJamOpen: false,
    showFullscreenPrompt: false,
};

async function renderPatternAudio(
    preset: Preset, 
    sampleRate: number, 
    mutedTracks: number[], 
    soloedTrackId: number | null, 
    options: { type: 'master' | 'stems-wet' | 'stems-dry', includeMasterFx: boolean },
    onProgress: (message: string) => void
): Promise<{ blob: Blob, name: string }> {
    const RENDER_STEPS = 64;
    const secondsPerStep = (60.0 / preset.bpm) / 4.0;
    const totalDuration = RENDER_STEPS * secondsPerStep;

    if (options.type === 'master') {
        onProgress('Rendering master track...');
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
        const renderedBuffer = await offlineCtx.startRendering();
        const wavData = audioBufferToWav(renderedBuffer);
        return { blob: new Blob([wavData], { type: 'audio/wav' }), name: `${preset.name}_master.wav` };

    } else { // Stems
        await loadJSZip();
        const zip = new JSZip();
        const audibleTracks = preset.tracks.filter(track => soloedTrackId === null ? !mutedTracks.includes(track.id) : soloedTrackId === track.id);

        for (let i = 0; i < audibleTracks.length; i++) {
            const track = audibleTracks[i];
            onProgress(`Rendering stem (${i + 1}/${audibleTracks.length}): ${track.name}`);
            const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);
            const engine = new AudioEngine(offlineCtx);
            await engine.init();

            engine.createTrackChannels(preset.tracks);
            engine.updateBpm(preset.bpm);

            // Configure master FX bus based on includeMasterFx
            if (options.includeMasterFx) {
                engine.updateReverb(preset.globalFxParams.reverb, preset.bpm);
                engine.updateDelay(preset.globalFxParams.delay, preset.bpm);
                engine.updateDrive(preset.globalFxParams.drive);
            } else {
                engine.updateReverb({ ...preset.globalFxParams.reverb, mix: 0 }, preset.bpm);
                engine.updateDelay({ ...preset.globalFxParams.delay, mix: 0 }, preset.bpm);
                engine.updateDrive({ ...preset.globalFxParams.drive, mix: 0 });
            }
             // Character, Filter, Compressor are generally not part of "wet" stems in this way
            engine.updateCharacter({ ...preset.globalFxParams.character, mix: 0 });
            engine.updateMasterFilter({ type: 'lowpass', cutoff: 20000, resonance: 1 });
            engine.updateCompressor({ ...preset.globalFxParams.compressor, threshold: 0, makeup: 0 }); // Effectively disable compressor
            engine.updateMasterVolume(1.0);


            // Mute all other tracks AND their sends
            preset.tracks.forEach(t => {
                if (t.id !== track.id) {
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

            for (let step = 0; step < RENDER_STEPS; step++) {
                const time = step * secondsPerStep;
                const patternStepIndex = step % track.patternLength;
                const stepState = track.patterns[track.activePatternIndex][patternStepIndex];
                engine.playStep(track, stepState, time, time, 0);
            }
            const renderedBuffer = await offlineCtx.startRendering();
            zip.file(`${track.name}_${options.includeMasterFx ? 'wet' : 'dry'}.wav`, audioBufferToWav(renderedBuffer));
        }

        onProgress('Compressing files...');
        const blob = await zip.generateAsync({ type: 'blob' });
        return { blob, name: `${preset.name}_stems_${options.includeMasterFx ? 'wet' : 'dry'}.zip` };
    }
}

async function renderSongAudio(
    preset: Preset, 
    sampleRate: number, 
    mutedTracks: number[], 
    soloedTrackId: number | null, 
    options: { type: 'master' | 'stems-wet' | 'stems-dry', includeMasterFx: boolean, startTime: number, endTime: number },
    onProgress: (message: string) => void
): Promise<{ blob: Blob, name: string }> {
    const { startTime, endTime } = options;
    const totalDuration = endTime - startTime;
    const secondsPerStep = (60.0 / preset.bpm) / 4.0;
    const secondsPerBeat = secondsPerStep * 4;

    const renderMaster = async () => {
        onProgress('Rendering master track...');
        const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);
        const engine = new AudioEngine(offlineCtx);
        await engine.init();

        engine.createTrackChannels(preset.tracks);
        engine.updateBpm(preset.bpm);
        engine.updateCharacter(preset.globalFxParams.character);
        engine.updateMasterFilter(preset.globalFxParams.masterFilter);
        engine.updateCompressor(preset.globalFxParams.compressor);
        engine.updateMasterVolume(preset.globalFxParams.masterVolume);
        engine.updateReverb(preset.globalFxParams.reverb, preset.bpm);
        engine.updateDelay(preset.globalFxParams.delay, preset.bpm);
        engine.updateDrive(preset.globalFxParams.drive);
        
        (preset.arrangementClips || []).forEach(clip => {
            const track = preset.tracks.find(t => t.id === clip.trackId);
            if (!track) return;
            const isAudible = soloedTrackId === null ? !mutedTracks.includes(track.id) : soloedTrackId === track.id;
            if (!isAudible) return;

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
                const timeInContext = absoluteTime - startTime;
                
                const patternStepIndex = step % track.patternLength;
                const stepState = pattern[patternStepIndex];
                
                const loopTimeForAutomation = (patternStepIndex % 64) * secondsPerStep;
                const loopCountForTrigs = Math.floor(step / track.patternLength);

                engine.playStep(track, stepState, timeInContext, loopTimeForAutomation, loopCountForTrigs);
            }
        });
        
        const buffer = await offlineCtx.startRendering();
        const wavData = audioBufferToWav(buffer);
        return { blob: new Blob([wavData], { type: 'audio/wav' }), name: `${preset.name}_song_master.wav` };
    };

    const renderStems = async (): Promise<{ blob: Blob, name: string }> => {
        await loadJSZip();
        const zip = new JSZip();
        const audibleTracks = preset.tracks.filter(track => soloedTrackId === null ? !mutedTracks.includes(track.id) : soloedTrackId === track.id);
        
        for (let i = 0; i < audibleTracks.length; i++) {
            const track = audibleTracks[i];
            onProgress(`Rendering stem (${i + 1}/${audibleTracks.length}): ${track.name}`);
            const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);
            const engine = new AudioEngine(offlineCtx);
            await engine.init();
    
            engine.createTrackChannels(preset.tracks);
            engine.updateBpm(preset.bpm);
    
            if (options.includeMasterFx) {
                engine.updateReverb(preset.globalFxParams.reverb, preset.bpm);
                engine.updateDelay(preset.globalFxParams.delay, preset.bpm);
                engine.updateDrive(preset.globalFxParams.drive);
            } else {
                engine.updateReverb({ ...preset.globalFxParams.reverb, mix: 0 }, preset.bpm);
                engine.updateDelay({ ...preset.globalFxParams.delay, mix: 0 }, preset.bpm);
                engine.updateDrive({ ...preset.globalFxParams.drive, mix: 0 });
            }
            engine.updateCharacter({ ...preset.globalFxParams.character, mix: 0 });
            engine.updateMasterFilter({ type: 'lowpass', cutoff: 20000, resonance: 1 });
            engine.updateCompressor({ ...preset.globalFxParams.compressor, enabled: false });
            engine.updateMasterVolume(1.0);
    
            preset.tracks.forEach(t => {
                if (t.id !== track.id) {
                    engine.updateTrackVolume(t.id, 0);
                    engine.updateTrackFxSend(t.id, 'reverb', 0);
                    engine.updateTrackFxSend(t.id, 'delay', 0);
                    engine.updateTrackFxSend(t.id, 'drive', 0);
                } else {
                    engine.updateTrackVolume(t.id, t.volume);
                }
            });
    
            (preset.arrangementClips || []).forEach(clip => {
                if (clip.trackId !== track.id) return;
                const clipTrack = preset.tracks.find(t => t.id === clip.trackId);
                if (!clipTrack) return;
                const pattern = clipTrack.patterns[clip.patternIndex!];
                if (!pattern) return;
    
                const clipStartSeconds = clip.startTime * secondsPerBeat;
                const clipDurationSeconds = clip.duration * secondsPerBeat;

                const firstStepInRenderWindow = Math.floor(Math.max(0, startTime - clipStartSeconds) / secondsPerStep);
                const lastStepInRenderWindow = Math.ceil(Math.max(0, endTime - clipStartSeconds) / secondsPerStep);
    
                for (let step = firstStepInRenderWindow; step < lastStepInRenderWindow; step++) {
                    const stepTimeInClip = step * secondsPerStep;
                    if (stepTimeInClip >= clipDurationSeconds) continue;
                    
                    const absoluteTime = clipStartSeconds + stepTimeInClip;
                    const timeInContext = absoluteTime - startTime;
    
                    if (timeInContext < 0 || timeInContext >= totalDuration) continue;
    
                    const patternStepIndex = step % clipTrack.patternLength;
                    const stepState = pattern[patternStepIndex];
                    
                    const loopTimeForAutomation = (patternStepIndex % 64) * secondsPerStep;
                    const loopCountForTrigs = Math.floor(step / track.patternLength);
    
                    engine.playStep(clipTrack, stepState, timeInContext, loopTimeForAutomation, loopCountForTrigs);
                }
            });
    
            const renderedBuffer = await offlineCtx.startRendering();
            zip.file(`${track.name}_${options.includeMasterFx ? 'wet' : 'dry'}.wav`, audioBufferToWav(renderedBuffer));
        }
    
        onProgress('Compressing files...');
        const blob = await zip.generateAsync({ type: 'blob' });
        return { blob, name: `${preset.name}_song_stems_${options.includeMasterFx ? 'wet' : 'dry'}.zip` };
    };

    if (options.type === 'master') {
        return renderMaster();
    } else {
        return renderStems();
    }
}

const getInitialParamsForType = (type: TrackType): AllInstrumentParams => {
    switch (type) {
        case 'kick': return INITIAL_KICK_PARAMS;
        case 'hat': return INITIAL_HAT_PARAMS;
        case 'arcane': return INITIAL_ARCANE_PARAMS;
        case 'ruin': return INITIAL_RUIN_PARAMS;
        case 'artifice': return INITIAL_ARTIFICE_PARAMS;
        case 'shift': return INITIAL_SHIFT_PARAMS;
        case 'reson': return INITIAL_RESON_PARAMS;
        case 'alloy': return INITIAL_ALLOY_PARAMS;
        default: return {};
    }
};

// --- ZUSTAND STORE ---
// Helper for granular subscription updates
const shallow = (objA: any, objB: any) => {
    if (Object.is(objA, objB)) return true;
    if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
      return false;
    }
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;
    for (let i = 0; i < keysA.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(objB, keysA[i]) || !Object.is(objA[keysA[i]], objB[keysA[i]])) {
        return false;
      }
    }
    return true;
  }

export const useStore = create<AppState & AppActions>()(
    subscribeWithSelector(
        immer((set, get) => ({
                ...initialAppState,

                // --- INITIALIZATION ---
                init: () => {
                    try {
                        // --- Defaults ---
                        const factoryProjects = deepClone(INITIAL_PRESET_LIBRARY);
                        const factoryInstrumentPresets = deepClone(Object.values(INITIAL_INSTRUMENT_PRESET_LIBRARY).flat());
                
                        let loadedState: Partial<AppState> = {
                            presets: factoryProjects,
                            instrumentPresets: factoryInstrumentPresets,
                            appearanceTheme: 'studio-dark',
                            accentTheme: 'studio-amber',
                            customStoreUrl: '',
                        };
                
                        // --- Load from localStorage ---
                        const storedStateJSON = localStorage.getItem('fm8r-state');
                        if (storedStateJSON) {
                            const parsed = JSON.parse(storedStateJSON);
                
                            const factoryProjectNames = new Set(factoryProjects.map(p => p.name));
                            const userProjects = (parsed.presets || []).filter((p: Preset) => {
                                return p && p.name && !factoryProjectNames.has(p.name) && Array.isArray(p.tracks);
                            });
                            loadedState.presets = [...factoryProjects, ...userProjects];
                
                            const factoryInstrumentPresetKeys = new Set(factoryInstrumentPresets.map(p => `${p.type}::${p.name}`));
                            const userInstrumentPresets = (parsed.instrumentPresets || []).filter((p: InstrumentPreset) => 
                                p && p.type && p.name && !factoryInstrumentPresetKeys.has(`${p.type}::${p.name}`)
                            );
                            loadedState.instrumentPresets = [...factoryInstrumentPresets, ...userInstrumentPresets];
                            
                            loadedState.appearanceTheme = parsed.appearanceTheme || 'studio-dark';
                            loadedState.accentTheme = parsed.accentTheme || 'studio-amber';
                            loadedState.customStoreUrl = parsed.customStoreUrl || '';
                        }
                
                        // --- Determine Initial Project and Viewer Mode ---
                        let initialPreset = loadedState.presets!.find(p => p.name === "Blank Project") || deepClone(DEMO_DEFAULT_PROJECT);
                        let isViewer = true;
                        const storedKey = localStorage.getItem('fm8r_license_key');
                        if (storedKey) {
                            // A simplified check, setLicenseKey will do the full validation
                            isViewer = false;
                            initialPreset = loadedState.presets!.find(p => p.name === "New Project") || deepClone(LICENSED_DEFAULT_PROJECT);
                        }
                
                        // --- Set base state ---
                        set({
                            ...get(), // Keep some state like modals etc if they were open
                            ...loadedState,
                            preset: initialPreset,
                            isViewerMode: isViewer,
                        });
                
                        // --- Post-set updates ---
                        if (storedKey) {
                            get().setLicenseKey(storedKey, true); // Re-validate silently
                        }
                        
                        // --- Handle Welcome Screen ---
                        const welcomeDismissed = localStorage.getItem('fm8r-welcome-dismissed');
                        set({ showWelcomeScreen: !welcomeDismissed });
                        
                        // --- Handle URL Project Loading (overrides everything) ---
                        const urlParams = new URLSearchParams(window.location.search);
                        let projectZip = urlParams.get('jam');
                        if (!projectZip && window.location.hash && window.location.hash.startsWith('#jam=')) {
                            projectZip = window.location.hash.substring(5);
                        }
                
                        if (projectZip) {
                            set({ isSpectator: true, showWelcomeScreen: false });
                            loadJSZip().then(() => {
                                const zip = new JSZip();
                                const fromUrlSafeBase64 = (s: string) => s.replace(/-/g, '+').replace(/_/g, '/');
                                zip.loadAsync(fromUrlSafeBase64(projectZip!), { base64: true }).then((loadedZip: any) => {
                                    const presetFile = loadedZip.file("p.json");
                                    if (presetFile) return presetFile.async("string");
                                    throw new Error("Project data not found in link.");
                                }).then((presetJson: string) => {
                                    const loadedPreset = JSON.parse(presetJson);
                                    const baseProject = get().isViewerMode ? deepClone(DEMO_DEFAULT_PROJECT) : deepClone(LICENSED_DEFAULT_PROJECT);
                                    if (loadedPreset.tracks) loadedPreset.tracks = loadedPreset.tracks.filter((t: Track) => t);
                                    const mergedPreset = deepMerge(baseProject, loadedPreset);
                                    mergedPreset.name = loadedPreset.name;
                                    get().loadPreset(mergedPreset); // Use loadPreset to ensure audio engine is updated
                                }).catch((err: any) => {
                                    console.error("Failed to load shared jam:", err);
                                    get().addNotification({ type: 'error', message: 'Could not load shared jam link.' });
                                });
                            });
                        }
                        
                        // --- Load custom packs if URL is set ---
                        const storedUrl = get().customStoreUrl;
                        if (storedUrl) {
                            get().fetchCustomPacks(storedUrl);
                        }
                
                    } catch (e) {
                        console.error("Critical error during app initialization:", e);
                        // Fallback to a completely default state
                        set({ 
                            ...initialAppState, 
                            presets: deepClone(INITIAL_PRESET_LIBRARY),
                            instrumentPresets: deepClone(Object.values(INITIAL_INSTRUMENT_PRESET_LIBRARY).flat()),
                            preset: deepClone(DEMO_DEFAULT_PROJECT),
                            isViewerMode: true,
                            showWelcomeScreen: true,
                        });
                        get().addNotification({ type: 'error', message: 'App failed to load. Resetting to default state.' });
                    }
                },
                
                startAudio: async () => {
                    if (!audioEngine) {
                       await get().reinitializeAudio();

                        // Metering loop
                        setInterval(() => {
                            if (audioEngine) {
                                useVUMeterStore.setState({ 
                                    audioLevels: audioEngine.getTrackLevels(),
                                    masterLevel: audioEngine.getMasterLevel(),
                                });
                            }
                        }, 50);
                    }
                },
                
                reinitializeAudio: async () => {
                    set({ isAudioReady: false });
                    usePlaybackStore.getState().stop();
                    if (audioEngine) {
                        await audioEngine.close();
                    }
                
                    const { selectedAudioOutputId, latencySetting, preset } = get();
                
                    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
                        sampleRate: 44100,
                        ...(selectedAudioOutputId !== 'default' && { sinkId: selectedAudioOutputId }),
                        latencyHint: latencySetting,
                    });
                
                    audioEngine = new AudioEngine(audioCtx);
                    usePlaybackStore.getState().setAudioEngine(audioEngine);
                    await audioEngine.init();
                
                    // Reload preset into new engine
                    audioEngine.createTrackChannels(preset.tracks);
                    audioEngine.updateBpm(preset.bpm);
                    audioEngine.updateReverb(preset.globalFxParams.reverb, preset.bpm);
                    audioEngine.updateDelay(preset.globalFxParams.delay, preset.bpm);
                    audioEngine.updateDrive(preset.globalFxParams.drive);
                    audioEngine.updateCharacter(preset.globalFxParams.character);
                    audioEngine.updateMasterFilter(preset.globalFxParams.masterFilter);
                    audioEngine.updateCompressor(preset.globalFxParams.compressor);
                    audioEngine.updateMasterVolume(preset.globalFxParams.masterVolume);

                    set(state => ({ 
                        audioEngineInstanceId: state.audioEngineInstanceId + 1,
                        isAudioReady: true,
                    }));
                },

                hideWelcomeScreen: (dontShowAgain) => {
                    if (dontShowAgain) {
                        localStorage.setItem('fm8r-welcome-dismissed', 'true');
                    }
                    const shouldShowQuickStart = !localStorage.getItem('fm8r-quickstart-finished');
                    const fullscreenPromptDismissed = localStorage.getItem('fm8r-fullscreen-prompt-dismissed');

                    set({ showWelcomeScreen: false, showQuickStart: shouldShowQuickStart });
                    
                    if (!shouldShowQuickStart && !fullscreenPromptDismissed) {
                        set({ showFullscreenPrompt: true });
                    }

                    get().startAudio();
                },
                
                // --- TRANSPORT (now delegates to playbackStore) ---
                panic: () => {
                    audioEngine?.stopAll();
                    setTimeout(async () => {
                        const { isPlaying, currentStep } = usePlaybackStore.getState();
                        if (isPlaying) {
                            usePlaybackStore.setState({ currentStep });
                        }
                    }, 100);
                },

                setBpm: (bpm) => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    set(state => { state.preset.bpm = bpm; });
                    audioEngine?.updateBpm(bpm);
                },
                
                // --- UI & SELECTION ---
                selectTrack: (trackId) => {
                    if (get().isSpectator) { return; } // Silently fail in spectator mode
                    if (get().isViewerMode && trackId >= 3) {
                        get().triggerViewerModeInteraction();
                        return;
                    }
                    set({ selectedTrackId: trackId, centerView: 'mixer', selectedPLockStep: null });
                },
                renameTrack: (trackId, newName) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        const trimmedName = newName.trim();
                        if (track && trimmedName) {
                            track.name = trimmedName;
                        }
                    });
                },
                toggleMute: (trackId) => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const muted = new Set(get().mutedTracks);
                    if (muted.has(trackId)) muted.delete(trackId);
                    else muted.add(trackId);
                    set({ mutedTracks: Array.from(muted) });
                },
                toggleSolo: (trackId) => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set({ soloedTrackId: get().soloedTrackId === trackId ? null : trackId })
                },
                togglePLockMode: () => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set({ isPLockModeActive: !get().isPLockModeActive, selectedPLockStep: null })
                },
                
                handleStepClick: (trackId, stepIndex) => {
                    const { isPLockModeActive, setStepProperty, isSpectator, isViewerMode } = get();
                    if (isSpectator) {
                        get().triggerViewerModeInteraction();
                        return;
                    }
                    if (isViewerMode && trackId >= 3) {
                        get().triggerViewerModeInteraction();
                        return;
                    }

                    if (isPLockModeActive) {
                        set({ selectedPLockStep: { trackId, stepIndex } });
                    } else {
                        const track = get().preset.tracks.find(t => t.id === trackId);
                        if (!track) return;
                        const step = track.patterns[track.activePatternIndex][stepIndex];
                        setStepProperty(trackId, stepIndex, 'active', !step.active);
                    }
                },
                
                _recordAutomationPoint: (state, trackId, path, value) => {
                    const { automationRecording, overwriteTouchedParams } = state;
                    if (!automationRecording || automationRecording.trackId !== trackId) return;
                
                    const track = state.preset.tracks.find(t => t.id === trackId);
                    if (!track) return;
                    
                    if (automationRecording.mode === 'overwrite' && !overwriteTouchedParams.has(path)) {
                        track.automation[path] = [];
                        overwriteTouchedParams.add(path);
                    }
                    
                    if (!track.automation[path]) track.automation[path] = [];
                
                    const { currentPlayheadTime } = usePlaybackStore.getState();
                    const secondsPerBeat = 60 / state.preset.bpm;
                    const timeInBeats = currentPlayheadTime / secondsPerBeat;
                    
                    const points = track.automation[path];
                    if (points.length > 0 && points[points.length - 1].value === value) return;
                
                    points.push({ time: timeInBeats, value });
                },

                // --- PARAMETER & STATE CHANGES ---
                setParam: (path, value) => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const { selectedTrackId, selectedPLockStep, isViewerMode } = state;
                        const activeTrackId = selectedPLockStep?.trackId ?? selectedTrackId;
                        if (isViewerMode && activeTrackId >= 3) {
                            get().triggerViewerModeInteraction();
                            return;
                        }
                
                        const track = state.preset.tracks.find(t => t.id === activeTrackId);
                        if (!track) return;
                
                        // Immer-compatible deep setter
                        const setDeepMutate = (obj: any, p: string, v: any) => {
                            const keys = p.split('.');
                            let current = obj;
                            for (let i = 0; i < keys.length - 1; i++) {
                                if (current[keys[i]] === undefined || typeof current[keys[i]] !== 'object' || current[keys[i]] === null) {
                                    current[keys[i]] = {};
                                }
                                current = current[keys[i]];
                            }
                            current[keys[keys.length - 1]] = v;
                        };
                
                        // Handle P-Lock first if active
                        if (selectedPLockStep && activeTrackId === selectedPLockStep.trackId) {
                            const step = track.patterns[track.activePatternIndex][selectedPLockStep.stepIndex];
                            const paramKey = `${track.type}Params` as keyof PLocks;
                            if (!step.pLocks) step.pLocks = {};
                            if (!(step.pLocks as any)[paramKey]) (step.pLocks as any)[paramKey] = {};
                            setDeepMutate((step.pLocks as any)[paramKey], path, value);
                        } else {
                            // If not a P-Lock, it's a base parameter change.
                            setDeepMutate(track.params, path, value);
                
                            // If recording automation, record this base parameter change.
                            if (state.automationRecording?.trackId === activeTrackId) {
                                state._recordAutomationPoint(state, activeTrackId, `params.${path}`, value);
                            }
                        }
                    });
                },
                setParamForTrack: (trackId, path, value) => {
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (track) {
                            const keys = path.split('.');
                            let current: any = track.params;
                            for (let i = 0; i < keys.length - 1; i++) {
                                if (current[keys[i]] === undefined) current[keys[i]] = {};
                                current = current[keys[i]];
                            }
                            current[keys[keys.length - 1]] = value;
                        }
                    });
                },
                handleMidiMessage: (mapping, value, command) => {
                    if (!mapping || !mapping.target) {
                        console.warn("Received invalid MIDI mapping.", mapping);
                        return;
                    }
                    const { target } = mapping;
                
                    if (target.type === 'button') {
                        // For momentary buttons, we must ignore the "release" message to prevent a double-toggle.
                        // A release is a Note Off (command 8) or a Note On with velocity 0 (command 9, value 0).
                        // It's also a CC message with a value of 0.
                        const isNoteOff = command === 8;
                        const isNoteOnWithZeroVelocity = command === 9 && value === 0;
                        const isCcRelease = mapping.message.type === 'cc' && value === 0;
                
                        if (isNoteOff || isNoteOnWithZeroVelocity || isCcRelease) {
                            return;
                        }
                    }
                
                    let scaledValue: number;
                
                    if (target.type === 'knob' && target.range) {
                        const val = target.range.min + (value / 127) * (target.range.max - target.range.min);
                        scaledValue = target.step ? Math.round(val / target.step) * target.step : val;
                    } else {
                        scaledValue = value;
                    }
                
                    const pathParts = target.path.split('.');
                    const [domain, ...rest] = pathParts;
                    
                    const { 
                        setTrackVolume, setTrackPan, setFxSend, setParamForTrack, 
                        setGlobalFxParam, setBpm, setMasterVolume,
                        toggleMute, toggleSolo, selectTrack, setMainView,
                    } = get();
                    const { togglePlay, stop } = usePlaybackStore.getState();
                    
                    switch(domain) {
                        case 'tracks':
                            const trackId = parseInt(rest[0], 10);
                            const param = rest[1];
                            if (isNaN(trackId)) return;
                            
                            if (param === 'volume') setTrackVolume(trackId, scaledValue);
                            else if (param === 'pan') setTrackPan(trackId, scaledValue);
                            else if (param === 'fxSends') setFxSend(trackId, rest[2] as keyof FXSends, scaledValue);
                            else if (param === 'params') setParamForTrack(trackId, rest.slice(2).join('.'), scaledValue);
                            else if (param === 'mute') toggleMute(trackId);
                            else if (param === 'solo') toggleSolo(trackId);
                            else if (param === 'select') selectTrack(trackId);
                            break;
                        case 'globalFx':
                             const fxName = rest[0] as keyof GlobalFXParams;
                             const fxParam = rest.slice(1).join('.');
                             if (fxName === 'masterVolume') setMasterVolume(scaledValue);
                             else setGlobalFxParam(fxName, fxParam, scaledValue);
                            break;
                        case 'preset':
                            if (rest[0] === 'bpm') setBpm(scaledValue);
                            break;
                        case 'transport':
                             const action = rest[1];
                             if (action === 'play') togglePlay();
                             else if (action === 'stop') stop();
                             else if (action === 'pattern') setMainView('pattern');
                             else if (action === 'song') setMainView('song');
                             break;
                    }
                },
                setMidiOutParam: (key, value) => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const { selectedTrackId, selectedPLockStep } = state;
                        const track = state.preset.tracks.find(t => t.id === selectedTrackId);
                        if (!track || track.type !== 'midi') return;
            
                        if (selectedPLockStep && selectedTrackId === selectedPLockStep.trackId) {
                            const step = track.patterns[track.activePatternIndex][selectedPLockStep.stepIndex];
                            if (!step.pLocks) step.pLocks = {};
                            if (!step.pLocks.midiOutParams) step.pLocks.midiOutParams = {};
                            (step.pLocks.midiOutParams as any)[key] = value;
                        } else {
                            if (!track.midiOut) track.midiOut = { deviceId: null, channel: 1 };
                            (track.midiOut as any)[key] = value;
                        }
                    });
                },
                 setTrackVolume: (trackId, volume) => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    if (get().isViewerMode && trackId >= 3) { get().triggerViewerModeInteraction(); return; }

                    let isPLock = false;
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (!track) return;
                
                        if (state.selectedPLockStep?.trackId === trackId) {
                            const { stepIndex } = state.selectedPLockStep;
                            const step = track.patterns[track.activePatternIndex][stepIndex];
                            if (!step.pLocks) step.pLocks = {};
                            step.pLocks.volume = volume;
                            isPLock = true;
                        } else {
                            track.volume = volume;
                            if (state.automationRecording?.trackId === trackId) {
                                state._recordAutomationPoint(state, trackId, 'volume', volume);
                            }
                        }
                    });
                    if (!isPLock) {
                        audioEngine?.updateTrackVolume(trackId, volume);
                    }
                },
                setTrackPan: (trackId, pan) => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    if (get().isViewerMode && trackId >= 3) { get().triggerViewerModeInteraction(); return; }
                    
                    let isPLock = false;
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (!track) return;
                        
                        if (state.selectedPLockStep?.trackId === trackId) {
                            const { stepIndex } = state.selectedPLockStep;
                            const step = track.patterns[track.activePatternIndex][stepIndex];
                            if (!step.pLocks) step.pLocks = {};
                            step.pLocks.pan = pan;
                            isPLock = true;
                        } else {
                            track.pan = pan;
                            if (state.automationRecording?.trackId === trackId) {
                                state._recordAutomationPoint(state, trackId, 'pan', pan);
                            }
                        }
                    });
                    if (!isPLock) {
                        audioEngine?.updateTrackPan(trackId, pan);
                    }
                },
                setFxSend: (trackId, fx, value) => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    if (get().isViewerMode && trackId >= 3) { get().triggerViewerModeInteraction(); return; }

                    let isPLock = false;
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (!track) return;
                        
                        if (state.selectedPLockStep?.trackId === trackId) {
                            const { stepIndex } = state.selectedPLockStep;
                            const step = track.patterns[track.activePatternIndex][stepIndex];
                            if (!step.pLocks) step.pLocks = {};
                            if (!step.pLocks.fxSends) step.pLocks.fxSends = {};
                            step.pLocks.fxSends[fx] = value;
                            isPLock = true;
                        } else {
                            track.fxSends[fx] = value;
                            if (state.automationRecording?.trackId === trackId) {
                                state._recordAutomationPoint(state, trackId, `fxSends.${fx}`, value);
                            }
                        }
                    });
                     if (!isPLock) {
                        audioEngine?.updateTrackFxSend(trackId, fx, value);
                    }
                },
                setGlobalFxParam: (fx, param, value) => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const fxParams = state.preset.globalFxParams[fx] as any;
                        if (fxParams) {
                            // Handle nested params like masterFilter.cutoff
                            if (param.includes('.')) {
                                const [p1, p2] = param.split('.');
                                if (fxParams[p1]) {
                                    fxParams[p1][p2] = value;
                                }
                            } else {
                                fxParams[param] = value;
                            }
                        }
                    });
                    const { preset } = get();
                    switch (fx) {
                        case 'reverb': audioEngine?.updateReverb(preset.globalFxParams.reverb, preset.bpm); break;
                        case 'delay': audioEngine?.updateDelay(preset.globalFxParams.delay, preset.bpm); break;
                        case 'drive': audioEngine?.updateDrive(preset.globalFxParams.drive); break;
                        case 'character': audioEngine?.updateCharacter(preset.globalFxParams.character); break;
                        case 'masterFilter': audioEngine?.updateMasterFilter(preset.globalFxParams.masterFilter); break;
                        case 'compressor': audioEngine?.updateCompressor(preset.globalFxParams.compressor); break;
                    }
                },
                setMasterVolume: (volume) => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    set(state => { state.preset.globalFxParams.masterVolume = volume; });
                    audioEngine?.updateMasterVolume(volume);
                },
                
                setStepProperty: (trackId, stepIndex, prop, value) => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    if (get().isViewerMode && trackId >= 3) { get().triggerViewerModeInteraction(); return; }
                    
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (track) {
                            const step = track.patterns[track.activePatternIndex][stepIndex];
                            
                            if (prop === 'active') {
                                step.active = value;
                                if (value === true) { // Activating
                                    if (step.notes.length === 0) {
                                        step.notes = [track.defaultNote];
                                    }
                                } else { // De-activating: clear p-locks and related properties
                                    step.pLocks = null;
                                    step.velocity = 1.0;
                                    step.duration = 1;
                                    step.notes = [];
                                }
                            } else {
                                (step as any)[prop] = value;
                            }
                        }
                    });
                },

                auditionNote: (note, velocity = 0.8) => {
                    const track = get().preset.tracks.find(t => t.id === get().selectedTrackId);
                    if (track && audioEngine) {
                        audioEngine.playNote(track, note, velocity);
                    }
                },
                
                setPatternLength: (trackId, length) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => { 
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if(track) track.patternLength = length; 
                    })
                },
                selectPattern: (trackId, patternIndex, currentPlayheadTime) => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }

                    const { isArrangementRecording } = get();
                    const oldPatternIndex = get().preset.tracks.find(t => t.id === trackId)?.activePatternIndex;

                    if (isArrangementRecording && patternIndex !== oldPatternIndex) {
                        // Finalize any existing recording clip for this track
                        set(state => {
                            const existingRecordingClip = state.recordingClips.find(c => c.trackId === trackId);
                            if (existingRecordingClip) {
                                existingRecordingClip.duration = currentPlayheadTime - existingRecordingClip.startTime;
                                if (existingRecordingClip.duration > 0.1) {
                                    state.preset.arrangementClips?.push(existingRecordingClip);
                                }
                                state.recordingClips = state.recordingClips.filter(c => c.trackId !== trackId);
                            }
                        });
    
                        // Start a new recording clip
                        set(state => {
                            const newRecordingClip: ArrangementClip = {
                                id: `rec_${trackId}_${Date.now()}`,
                                trackId,
                                startTime: currentPlayheadTime,
                                duration: 0, 
                                type: 'pattern',
                                patternIndex: patternIndex,
                            };
                            state.recordingClips.push(newRecordingClip);
                        });
                    }
    
                    // Always update the active pattern index
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (track) track.activePatternIndex = patternIndex;
                    });
                },
                
                startAutomationRecording: (trackId, mode) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set({
                        automationRecording: { trackId, mode },
                        overwriteTouchedParams: new Set(),
                    });
                    get().addNotification({ type: 'info', message: `Armado para grabar automatización (${mode}).` });
                },
                stopAutomationRecording: () => {
                    set({ automationRecording: null });
                    get().addNotification({ type: 'info', message: `Grabación de automatización detenida.` });
                },

                clearAutomation: (trackId) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => { 
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if(track) track.automation = {}; 
                    });
                     get().addNotification({ type: 'info', message: 'Automation cleared for track.' });
                },
                
                // --- RANDOMIZATION & CLEARING ---
                randomizeTrackPattern: (trackId) => {
                    if (get().isViewerMode && trackId >= 3) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (track) {
                            const { pattern, length } = createTechnoPattern(track.type, Math.random() < 0.5);
                            track.patterns[track.activePatternIndex] = pattern;
                            track.patternLength = length;
                        }
                    });
                },
                randomizeInstrument: (trackId) => {
                    if (get().isViewerMode && trackId > 2) { 
                        get().triggerViewerModeInteraction(); 
                        return; 
                    }
                     set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (!track) return;
                        let newParams: Partial<AllInstrumentParams>;
                        switch (track.type) {
                            case 'kick': newParams = randomizeKickParams(); break;
                            case 'hat': newParams = randomizeHatParams(); break;
                            case 'arcane': newParams = randomizeArcaneParams(); break;
                            case 'ruin': newParams = randomizeRuinParams(); break;
                            case 'artifice': newParams = randomizeArtificeParams(); break;
                            case 'shift': newParams = randomizeShiftParams(); break;
                            case 'reson': newParams = randomizeResonParams(); break;
                            case 'alloy': newParams = randomizeAlloyParams(); break;
                            default: newParams = {};
                        }
                        track.params = deepMerge(track.params, newParams);
                        track.loadedInstrumentPresetName = null;
                    });
                },
                 randomizeAllPatternsForTrack: (trackId) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (track) {
                            let maxLength = 0;
                            track.patterns = track.patterns.map(() => {
                                const { pattern, length } = createTechnoPattern(track.type, Math.random() < 0.5);
                                if (length > maxLength) {
                                    maxLength = length;
                                }
                                return pattern;
                            });
                            track.patternLength = maxLength > 0 ? maxLength : 16;
                        }
                    });
                },
                randomizeAllPatternsForAllTracks: () => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    if (window.confirm('This will randomize all patterns on all tracks, creating a new polyrhythmic techno groove. Instrument sounds will not be changed. This cannot be undone. Continue?')) {
                        set(state => {
                            state.preset.tracks.forEach(track => {
                                if (track.type !== 'midi') {
                                    let maxLength = 0;
                                    track.patterns = track.patterns.map(() => {
                                        const isHypnotic = Math.random() < 0.7;
                                        const { pattern, length } = createTechnoPattern(track.type, isHypnotic);
                                        if (length > maxLength) {
                                            maxLength = length;
                                        }
                                        return pattern;
                                    });
                                    track.patternLength = maxLength > 0 ? maxLength : 16;
                                }
                            });
                        });
                        get().addNotification({ type: 'info', message: 'The machine is now possessed by a new groove.' });
                    }
                },
                clearTrackPattern: (trackId) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (track) {
                            const emptyPattern = Array(64).fill(null).map(() => ({ active: false, pLocks: null, notes: [], velocity: 1.0, duration: 1, condition: { type: 'always'} }));
                            track.patterns[track.activePatternIndex] = emptyPattern;
                        }
                    });
                },
                clearAllPatterns: () => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    if (window.confirm('Are you sure you want to clear all patterns, automation, and arrangement clips? This cannot be undone.')) {
                        set(state => {
                            state.preset.tracks.forEach(track => {
                                track.patterns = createEmptyPatterns();
                                track.automation = {};
                            });
                            if (state.preset.arrangementClips) {
                                state.preset.arrangementClips = [];
                            }
                        });
                        get().addNotification({ type: 'info', message: 'All patterns, automation, and arrangement clips cleared.' });
                    }
                },

                // --- EUCLIDEAN ---
                startEuclideanMode: (trackId) => {
                    if (get().isViewerMode && trackId >= 3) { get().triggerViewerModeInteraction(); return; }
                    const track = get().preset.tracks.find(t => t.id === trackId);
                    if (track) {
                        set({
                            euclideanMode: {
                                trackId,
                                pulses: 8,
                                steps: 16,
                                rotation: 0,
                                originalPattern: deepClone(track.patterns[track.activePatternIndex]),
                                originalLength: track.patternLength
                            }
                        });
                    }
                },
                updateEuclidean: (params) => {
                    if (!get().euclideanMode) return;
                    const { trackId } = get().euclideanMode!;
                    set(state => {
                        if (state.euclideanMode) {
                            // Merge new params
                            Object.assign(state.euclideanMode, params);
                            // Ensure pulses is not greater than steps
                            if (state.euclideanMode.pulses > state.euclideanMode.steps) {
                                state.euclideanMode.pulses = state.euclideanMode.steps;
                            }
                            if (state.euclideanMode.rotation >= state.euclideanMode.steps) {
                                state.euclideanMode.rotation = state.euclideanMode.steps - 1;
                            }
                            if (state.euclideanMode.rotation < 0) {
                                state.euclideanMode.rotation = 0;
                            }

                            const { pulses, steps, rotation } = state.euclideanMode;

                            const basePattern = generateEuclideanPattern(pulses, steps);

                            // Apply rotation
                            const rotatedPattern = [...basePattern];
                            if (rotation > 0 && rotatedPattern.length > 0) {
                                for (let r = 0; r < rotation; r++) {
                                    rotatedPattern.unshift(rotatedPattern.pop()!);
                                }
                            }
                            
                            const track = state.preset.tracks.find(t => t.id === trackId);
                            if (!track) return;

                            const emptyPattern = Array(64).fill(null).map<StepState>(() => ({ active: false, pLocks: null, notes: [], velocity: 1, duration: 1, condition: { type: 'always' } }));
                            for (let i = 0; i < steps; i++) {
                                if (rotatedPattern[i]) {
                                    emptyPattern[i] = { active: true, pLocks: null, notes: [track.defaultNote], velocity: 0.8, duration: 1, condition: { type: 'always' } };
                                }
                            }
                            track.patterns[track.activePatternIndex] = emptyPattern;
                            track.patternLength = steps;
                        }
                    });
                },
                applyEuclidean: () => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set({ euclideanMode: null })
                },
                cancelEuclidean: () => {
                    const { euclideanMode } = get();
                    if (euclideanMode) {
                        set(state => {
                            const track = state.preset.tracks.find(t => t.id === euclideanMode.trackId);
                            if(track) {
                                track.patterns[track.activePatternIndex] = euclideanMode.originalPattern;
                                track.patternLength = euclideanMode.originalLength;
                            }
                            state.euclideanMode = null;
                        });
                    }
                },
                toggleQuickStart: (show) => {
                    if (show === false) {
                        localStorage.setItem('fm8r-quickstart-finished', 'true');
                        const fullscreenPromptDismissed = localStorage.getItem('fm8r-fullscreen-prompt-dismissed');
                        if (!fullscreenPromptDismissed) {
                            set({ showFullscreenPrompt: true });
                        }
                    }
                    set(state => ({ showQuickStart: show === undefined ? !state.showQuickStart : show }));
                },
                togglePresetManager: (open) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => ({ isPresetManagerOpen: open === undefined ? !state.isPresetManagerOpen : open }));
                },
                toggleExportModal: (open) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => ({ isExportModalOpen: open === undefined ? !state.isExportModalOpen : open }));
                },
                toggleStore: (open) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => ({ isStoreOpen: open === undefined ? !state.isStoreOpen : open }));
                },
                toggleSettingsModal: (open) => {
                    set(state => ({ isSettingsModalOpen: open === undefined ? !state.isSettingsModalOpen : open }));
                },
                toggleManual: (open) => {
                    set(state => ({ isManualOpen: open === undefined ? !state.isManualOpen : open }));
                },
                setMidiOutputs: (outputs) => {
                    set({ midiOutputs: outputs.map(o => ({ id: o.id, name: o.name })) });
                },
                setAppearanceTheme: (theme) => {
                    set({ appearanceTheme: theme });
                },
                setAccentTheme: (theme) => {
                    set({ accentTheme: theme });
                },
                setUiPerformanceMode: (mode) => {
                    set({ uiPerformanceMode: mode });
                },
                setMidiSyncSource: (source) => {
                    set({ midiSyncSource: source });
                },
                setMidiSyncOutput: (output) => {
                    set({ midiSyncOutput: output });
                    // Immediately send MIDI clock if we become master
                    if (output !== 'none' && audioEngine) {
                        const midiOut = audioEngine.getMidiOutputs().find(o => o.id === output);
                        midiOut?.send([0xF8]);
                    }
                },
                
                // --- PRESET MANAGEMENT ---
                loadPreset: (preset) => {
                    usePlaybackStore.getState().stop();

                    const presetToLoad = deepClone(preset);
                    
                    // FIX: Filter out any null or undefined tracks that might exist in old/corrupted project files.
                    if (presetToLoad.tracks) {
                        presetToLoad.tracks = presetToLoad.tracks.filter(t => t);
                    }

                    const baseProject = deepClone(newProjectPreset);
                    const mergedPreset = deepMerge(baseProject, presetToLoad);
                    mergedPreset.name = presetToLoad.name; // Preserve original name

                    set({ preset: mergedPreset, isSpectator: false });
                    get().reinitializeAudio();
                    get().addNotification({ type: 'success', message: `Loaded project: ${preset.name}` });
                },
                savePreset: (name) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const { preset, presets } = get();
                    if (presets.some(p => p.name === name)) {
                        get().addNotification({ type: 'error', message: `Project name "${name}" already exists.` });
                        return;
                    }
                    const newPreset = deepClone(preset);
                    newPreset.name = name;
                    set({ presets: [...presets, newPreset], preset: newPreset });
                     get().addNotification({ type: 'success', message: `Project saved as: ${name}` });
                },
                 overwritePreset: (name) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const { preset, presets } = get();
                    const newPreset = deepClone(preset);
                    newPreset.name = name;
                    set({
                        presets: presets.map(p => p.name === name ? newPreset : p),
                        preset: newPreset
                    });
                     get().addNotification({ type: 'success', message: `Project "${name}" overwritten.` });
                },
                saveCurrentSessionAsNewProject: () => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const newName = window.prompt("Enter a name for the new project:");
                    if (!newName || !newName.trim()) {
                        return; // User cancelled or entered empty name
                    }
                    set(state => {
                        const trimmedName = newName.trim();
                        if (state.presets.some(p => p.name === trimmedName)) {
                            state.addNotification({ type: 'error', message: `Project name "${trimmedName}" already exists.` });
                            return;
                        }

                        const newProject = deepClone(state.preset);
                        newProject.name = trimmedName;
                        
                        // Also update the current live session to reflect the save
                        state.preset.name = trimmedName;

                        state.presets.push(newProject);
                        state.addNotification({ type: 'success', message: `Saved current session as "${trimmedName}".` });
                    });
                },
                saveCurrentProjectAndExtractPresets: () => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const currentProject = state.preset;
                        const projectName = currentProject.name;
                
                        if (projectName === 'Blank Project' || projectName === 'New Project') {
                            state.addNotification({ type: 'error', message: "Cannot overwrite this project. Please 'Save As' with a unique name first." });
                            return;
                        }
                
                        // 1. Iterate through tracks and create instrument presets
                        currentProject.tracks.forEach(track => {
                            if (track.type === 'midi') return; // Skip MIDI tracks
                
                            // 2. Generate a preset name, ensuring it's unique
                            let presetName = `${projectName} - ${track.name}`;
                            let counter = 2;
                            while (state.instrumentPresets.some(p => p.name === presetName && p.type === track.type)) {
                                presetName = `${projectName} - ${track.name} ${counter++}`;
                            }
                
                            // 3. Create and add the new instrument preset
                            const newInstrumentPreset: InstrumentPreset = {
                                name: presetName,
                                type: track.type,
                                params: deepClone(track.params),
                            };
                            state.instrumentPresets.push(newInstrumentPreset);
                
                            // 4. Update the track in the current project to link to the new preset
                            track.loadedInstrumentPresetName = presetName;
                        });
                
                        // 5. Overwrite the project in the main presets array
                        const projectIndex = state.presets.findIndex(p => p.name === projectName);
                        if (projectIndex !== -1) {
                            state.presets[projectIndex] = deepClone(currentProject);
                        } else {
                            // This case shouldn't be hit due to the initial check, but as a fallback:
                            state.presets.push(deepClone(currentProject));
                        }
                
                        state.addNotification({ type: 'success', message: `Project '${projectName}' saved and all instrument presets extracted.` });
                    });
                },
                deletePreset: (name) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    if (get().preset.name === name) {
                        get().addNotification({ type: 'error', message: "Cannot delete the currently active project." });
                        return;
                    }
                    set({ presets: get().presets.filter(p => p.name !== name) });
                    get().addNotification({ type: 'info', message: `Project "${name}" deleted.` });
                },
                renamePreset: (oldName, newName) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    if (get().presets.some(p => p.name === newName)) {
                         get().addNotification({ type: 'error', message: `Project name "${newName}" already exists.` });
                         return;
                    }
                    set(state => {
                        const presetToRename = state.presets.find(p => p.name === oldName);
                        if (presetToRename) presetToRename.name = newName;
                        if (state.preset.name === oldName) state.preset.name = newName;
                    });
                },
                exportProject: () => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                     const presetJson = JSON.stringify(get().preset, null, 2);
                     const blob = new Blob([presetJson], { type: 'application/json' });
                     downloadBlob(blob, `${get().preset.name}.fm8r-project`);
                },
                importProject: (file) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const newPreset = JSON.parse(e.target!.result as string) as Preset;
                            if (get().presets.some(p => p.name === newPreset.name)) {
                                // Handle conflict
                                get().addNotification({ type: 'error', message: `Project "${newPreset.name}" already exists.` });
                            } else {
                                set({ presets: [...get().presets, newPreset] });
                                get().addNotification({ type: 'success', message: `Imported project: ${newPreset.name}` });
                            }
                        } catch (err) {
                            get().addNotification({ type: 'error', message: 'Invalid project file.' });
                        }
                    };
                    reader.readAsText(file);
                },
                saveAllProjects: () => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const allProjectsJson = JSON.stringify(get().presets, null, 2);
                    const blob = new Blob([allProjectsJson], { type: 'application/json' });
                    downloadBlob(blob, 'fm8r_all_projects_backup.json');
                },
                exportAudio: async (options) => {
                    if (get().isViewerMode) {
                        get().triggerViewerModeInteraction();
                        return Promise.reject(new Error('Feature unavailable in trial mode.'));
                    }
                    
                    set({ isExporting: true, exportProgress: 'Starting export...' });
                    const { preset, mutedTracks, soloedTrackId, arrangementLoop } = get();
                    const sampleRate = 44100;
                    
                    try {
                        let result: { blob: Blob; name: string; };
                        const onProgress = (message: string) => set({ exportProgress: message });
                        
                        if (options.source === 'pattern') {
                            result = await renderPatternAudio(preset, sampleRate, mutedTracks, soloedTrackId, options, onProgress);
                        } else {
                            let startTime = 0;
                            let endTime = 0;
                            const secondsPerBeat = 60 / preset.bpm;

                            if (options.source === 'song-loop' && arrangementLoop) {
                                startTime = arrangementLoop.start * secondsPerBeat;
                                endTime = arrangementLoop.end * secondsPerBeat;
                            } else { // 'song-full'
                                const clips = preset.arrangementClips || [];
                                if (clips.length > 0) {
                                    const maxEndTimeInBeats = Math.max(...clips.map(c => c.startTime + c.duration));
                                    endTime = maxEndTimeInBeats * secondsPerBeat;
                                }
                            }
                            
                            if (endTime <= startTime) {
                                throw new Error("Invalid song duration for export.");
                            }
                
                            result = await renderSongAudio(preset, sampleRate, mutedTracks, soloedTrackId, { ...options, startTime, endTime }, onProgress);
                        }
                        
                        downloadBlob(result.blob, result.name);
                        
                        get().addNotification({ type: 'success', message: `Successfully exported ${result.name}` });
                        return result;
                    } catch (e) {
                        console.error("Export failed:", e);
                        get().addNotification({ type: 'error', message: `Export failed: ${e instanceof Error ? e.message : 'Unknown error'}` });
                        return Promise.reject(e);
                    } finally {
                        set({ isExporting: false, exportProgress: '' });
                    }
                },
                installPack: (pack) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        if (!state.installedPacks.includes(pack.id)) {
                            state.installedPacks.push(pack.id);
                            // Add projects from pack to presets, avoiding name collisions
                            pack.projects.forEach(project => {
                                let newName = project.name;
                                let counter = 2;
                                while (state.presets.some(p => p.name === newName)) {
                                    newName = `${project.name} ${counter++}`;
                                }
                                const newProject = deepClone(project);
                                newProject.name = newName;
                                state.presets.push(newProject);
                            });
                            // Add instrument presets, avoiding collisions
                            pack.instruments.forEach(instrument => {
                                let newName = instrument.name;
                                let counter = 2;
                                while (state.instrumentPresets.some(p => p.name === newName && p.type === instrument.type)) {
                                    newName = `${instrument.name} ${counter++}`;
                                }
                                const newInstrument = deepClone(instrument);
                                newInstrument.name = newName;
                                state.instrumentPresets.push(newInstrument);
                            });
                            state.addNotification({ type: 'success', message: `Expansion Pack "${pack.name}" installed!` });
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
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        const customPacks = await response.json();
                        // Basic validation
                        if (Array.isArray(customPacks)) {
                            set({ customPacks });
                            get().addNotification({ type: 'success', message: 'Custom expansion packs loaded.' });
                        } else {
                            throw new Error('Invalid manifest format.');
                        }
                    } catch (error) {
                        console.error("Failed to fetch custom packs:", error);
                        get().addNotification({ type: 'error', message: `Failed to load custom content: ${error instanceof Error ? error.message : 'Unknown error'}` });
                        set({ customPacks: [] });
                    }
                },
                setCustomStoreUrl: (url) => {
                    set({ customStoreUrl: url });
                },
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
                        const newClip: ArrangementClip = {
                            ...deepClone(clip),
                            id: `clip_${Date.now()}_${Math.random()}`,
                            startTime: newStartTime,
                        };
                        state.preset.arrangementClips?.push(newClip);
                    });
                },
                addPatternClip: (trackId, startTime, patternIndex) => {
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (!track) return;
                
                        const durationInBeats = track.patternLength / 4;
                
                        const newClip: ArrangementClip = {
                            id: `clip_${Date.now()}_${Math.random()}`,
                            trackId,
                            startTime,
                            duration: durationInBeats,
                            type: 'pattern',
                            patternIndex,
                        };
                        if (!state.preset.arrangementClips) {
                            state.preset.arrangementClips = [];
                        }
                        state.preset.arrangementClips.push(newClip);
                    });
                },
                toggleArrangementRecording: (currentPlayheadTime) => {
                    set(state => {
                        if (!state.isArrangementRecording) {
                            // Start recording
                            state.isArrangementRecording = true;
                            state.recordingClips = [];
                            state.preset.tracks.forEach(track => {
                                const newClip: ArrangementClip = {
                                    id: `rec_${track.id}_${Date.now()}`,
                                    trackId: track.id,
                                    startTime: currentPlayheadTime,
                                    duration: 0,
                                    type: 'pattern',
                                    patternIndex: track.activePatternIndex,
                                };
                                state.recordingClips.push(newClip);
                            });
                            state.addNotification({ type: 'info', message: 'Arrangement recording started.' });
                        } else {
                            // Stop recording - handled by finalizeRecording
                            get().finalizeRecording(currentPlayheadTime);
                        }
                    });
                },
                finalizeRecording: (currentPlayheadTime) => {
                    set(state => {
                        if (!state.isArrangementRecording) return;
                
                        state.recordingClips.forEach(clip => {
                            clip.duration = currentPlayheadTime - clip.startTime;
                            if (clip.duration > 0.1) { // Only add non-zero clips
                                state.preset.arrangementClips?.push(clip);
                            }
                        });
                
                        state.isArrangementRecording = false;
                        state.recordingClips = [];
                        state.addNotification({ type: 'success', message: 'Arrangement recording finished.' });
                    });
                },
                initializeArrangementLoop: (defaultDurationInBeats) => {
                    if (!get().arrangementLoop) {
                        set({ arrangementLoop: { start: 0, end: defaultDurationInBeats } });
                    }
                },
                setArrangementLoop: (start, end) => {
                    set(state => {
                        if (state.arrangementLoop) {
                            state.arrangementLoop.start = start;
                            state.arrangementLoop.end = end;
                        }
                    });
                },
                removeNotification: (id) => {
                    set(state => {
                        state.notifications = state.notifications.filter(n => n.id !== id);
                    });
                },
                addNotification: (notification) => {
                    set(state => {
                        const newId = Date.now() + Math.random();
                        state.notifications.push({ ...notification, id: newId });
                        if (state.notifications.length > 5) {
                            state.notifications.shift();
                        }
                    });
                },
                saveInstrumentPreset: (trackType, name) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const { preset, selectedTrackId, instrumentPresets, addNotification } = get();
                    const track = preset.tracks.find(t => t.id === selectedTrackId);
                    if (!track || track.type !== trackType) return;
                
                    if (instrumentPresets.some(p => p.name === name && p.type === trackType)) {
                        addNotification({ type: 'error', message: `Preset "${name}" already exists for this instrument type.` });
                        return;
                    }
                
                    const newPreset: InstrumentPreset = {
                        name,
                        type: trackType,
                        params: deepClone(track.params),
                    };
                    set(state => {
                        state.instrumentPresets.push(newPreset);
                        const currentTrack = state.preset.tracks.find(t => t.id === selectedTrackId);
                        if (currentTrack) {
                            currentTrack.loadedInstrumentPresetName = name;
                        }
                    });
                    addNotification({ type: 'success', message: `Saved instrument preset: ${name}` });
                },
                loadInstrumentPreset: (preset) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const { selectedTrackId, addNotification } = get();
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === selectedTrackId);
                        if (track && track.type === preset.type) {
                            // Backward compatibility: merge loaded preset onto a default structure
                            const defaultParams = getInitialParamsForType(track.type);
                            track.params = deepMerge(deepClone(defaultParams), deepClone(preset.params));
                            track.loadedInstrumentPresetName = preset.name;
                        }
                    });
                    addNotification({ type: 'success', message: `Loaded preset: ${preset.name}` });
                },
                deleteInstrumentPreset: (trackType, name) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        state.instrumentPresets = state.instrumentPresets.filter(p => !(p.type === trackType && p.name === name));
                    });
                    get().addNotification({ type: 'info', message: `Deleted preset: ${name}` });
                },
                importInstrumentPresets: (file) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const newPresets = JSON.parse(e.target!.result as string) as InstrumentPreset[];
                            if (!Array.isArray(newPresets)) throw new Error("Invalid format");
                
                            set(state => {
                                let importedCount = 0;
                                newPresets.forEach((p: InstrumentPreset) => {
                                    if (!state.instrumentPresets.some(existing => existing.name === p.name && existing.type === p.type)) {
                                        state.instrumentPresets.push(p);
                                        importedCount++;
                                    }
                                });
                                state.addNotification({ type: 'success', message: `Imported ${importedCount} new instrument presets.` });
                            });
                        } catch (err) {
                            get().addNotification({ type: 'error', message: 'Invalid instrument preset file.' });
                        }
                    };
                    reader.readAsText(file);
                },
                exportInstrumentPresets: (trackType: TrackType) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const presetsToExport = get().instrumentPresets.filter(p => p.type === trackType);
                    const json = JSON.stringify(presetsToExport, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    downloadBlob(blob, `fm8r_${trackType}_presets.json`);
                },

                // --- COPY/PASTE ---
                copyStep: (trackId, stepIndex) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const track = get().preset.tracks.find(t => t.id === trackId);
                    if (track) {
                        const step = track.patterns[track.activePatternIndex][stepIndex];
                        set({ copiedStep: { trackId, stepIndex, step: deepClone(step) } });
                        get().addNotification({ type: 'info', message: `Copied step ${stepIndex + 1}` });
                    }
                },
                pasteStep: (trackId, stepIndex) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const { copiedStep } = get();
                    if (copiedStep) {
                        set(state => {
                            const track = state.preset.tracks.find(t => t.id === trackId);
                            if (track) {
                                track.patterns[track.activePatternIndex][stepIndex] = deepClone(copiedStep.step);
                            }
                        });
                        get().addNotification({ type: 'success', message: `Pasted to step ${stepIndex + 1}` });
                    }
                },
                copyPattern: () => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const { selectedTrackId, preset, addNotification } = get();
                    const track = preset.tracks.find(t => t.id === selectedTrackId);
                    if (!track) return;

                    const patternToCopy = track.patterns[track.activePatternIndex];
                    set({ copiedPattern: { trackId: selectedTrackId, pattern: deepClone(patternToCopy) } });
                    addNotification({ type: 'info', message: `Copied pattern ${track.activePatternIndex + 1} from ${track.name}` });
                },
                pastePattern: () => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const { selectedTrackId, copiedPattern, addNotification } = get();
                    if (!copiedPattern) {
                        addNotification({ type: 'error', message: 'No pattern in clipboard to paste.' });
                        return;
                    }

                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === selectedTrackId);
                        if (track) {
                            track.patterns[track.activePatternIndex] = deepClone(copiedPattern.pattern);
                            addNotification({ type: 'success', message: `Pasted into pattern ${track.activePatternIndex + 1} of ${track.name}` });
                        }
                    });
                },
                
                // --- MISC UI & SYSTEM ---
                toggleCenterView: () => set(state => ({ centerView: state.centerView === 'mixer' ? 'pianoRoll' : 'mixer' })),
                setMainView: (view) => set({ mainView: view }),
                setSequencerPage: (page) => set({ sequencerPage: page }),
                setAudioOutputDevices: (devices) => set({ audioOutputDevices: devices }),
                selectAudioOutput: (deviceId) => {
                    set({ selectedAudioOutputId: deviceId });
                    get().reinitializeAudio();
                },
                setLatency: (latency) => {
                    set({ latencySetting: latency });
                    get().reinitializeAudio();
                },
                exportFullBackup: (midiMappings) => {
                     if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const backup: FullBackup = {
                        version: '1.2',
                        presets: get().presets,
                        instrumentPresets: get().instrumentPresets,
                        installedPacks: get().installedPacks,
                        appearanceTheme: get().appearanceTheme,
                        accentTheme: get().accentTheme,
                        midiMappings: midiMappings,
                        midiSyncSource: get().midiSyncSource,
                        midiSyncOutput: get().midiSyncOutput,
                    };
                    const json = JSON.stringify(backup, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    downloadBlob(blob, 'fm8r_full_backup.json');
                },
                importFullBackup: (file) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                const backup = JSON.parse(e.target!.result as string) as FullBackup;
                                set({
                                    presets: backup.presets,
                                    instrumentPresets: backup.instrumentPresets,
                                    installedPacks: backup.installedPacks || [],
                                    appearanceTheme: backup.appearanceTheme || 'studio-dark',
                                    accentTheme: backup.accentTheme || 'studio-amber',
                                    midiSyncSource: backup.midiSyncSource || 'internal',
                                    midiSyncOutput: backup.midiSyncOutput || 'none',
                                });
                                get().addNotification({ type: 'success', message: 'Full backup restored successfully.' });
                                resolve(backup.midiMappings);
                            } catch (err) {
                                get().addNotification({ type: 'error', message: 'Invalid backup file.' });
                                reject(err);
                            }
                        };
                        reader.onerror = reject;
                        reader.readAsText(file);
                    });
                },
                setLicenseKey: (key, isSilent = false) => {
                    const OWNER_KEY = 'FM8R-OWNER-KEY-2024';
                    const VALIDATION_SECRET = 'ANOTHER_GROOVEBOX_SECRET_SAUCE';

                    if (key === OWNER_KEY) {
                        localStorage.setItem('fm8r_license_key', key);
                        set({ licenseKey: key, isViewerMode: false, isLicenseModalOpen: false });
                        if (!isSilent) get().addNotification({ type: 'success', message: 'Full version unlocked! Enjoy.' });
                        return;
                    }

                    const parts = key.toUpperCase().split('-');
                    if (parts.length !== 5 || parts[0] !== 'FM8R') {
                        if (!isSilent) get().addNotification({ type: 'error', message: 'Invalid license key format.' });
                        return;
                    }

                    const [prefix, p1, p2, p3, signature] = parts;
                    const data = `${p1}${p2}${p3}`;
                    
                    const stringToHash = data + VALIDATION_SECRET;
                    
                    let hash = 0;
                    for (let i = 0; i < stringToHash.length; i++) {
                        const char = stringToHash.charCodeAt(i);
                        hash = ((hash << 5) - hash) + char;
                        hash |= 0; // Convert to 32bit integer
                    }
                    
                    const expectedSignature = Math.abs(hash).toString(16).toUpperCase().slice(0, 4).padStart(4, '0');

                    if (signature === expectedSignature) {
                        localStorage.setItem('fm8r_license_key', key);
                        set({ licenseKey: key, isViewerMode: false, isLicenseModalOpen: false });
                        if (!isSilent) get().addNotification({ type: 'success', message: 'Full version unlocked! Enjoy.' });
                    } else {
                        if (!isSilent) get().addNotification({ type: 'error', message: 'Invalid license key.' });
                    }
                },
                clearLicenseKey: () => {
                     localStorage.removeItem('fm8r_license_key');
                     set({ licenseKey: null, isViewerMode: true });
                     get().addNotification({ type: 'info', message: 'License removed.' });
                },
                toggleLicenseModal: (open) => {
                    set(state => ({ isLicenseModalOpen: open === undefined ? !state.isLicenseModalOpen : open }));
                },
                triggerViewerModeInteraction: () => {
                    const { lastNotificationTime, addNotification, toggleLicenseModal } = get();
                    const now = Date.now();
                    // Throttle notification to avoid spam
                    if (now - lastNotificationTime > 3000) {
                        addNotification({ type: 'info', message: 'This feature requires the full version.' });
                        toggleLicenseModal(true);
                        set({ lastNotificationTime: now });
                    }
                },
                toggleShareJamModal: (open) => {
                    if (get().isViewerMode) {
                        get().triggerViewerModeInteraction();
                        return;
                    }
                    set(state => {
                        state.isShareJamOpen = open === undefined ? !state.isShareJamOpen : open
                    });
                },
                generateShareableLink: async () => {
                    await loadJSZip();
                    const { preset } = get();
                
                    // Create a stripped-down version of the preset for sharing
                    const presetToShare = deepClone(preset);
                    // For example, we could remove automation data to save space if needed
                    // presetToShare.tracks.forEach(t => t.automation = {});
                
                    const zip = new JSZip();
                    zip.file("p.json", JSON.stringify(presetToShare));
                
                    const blob = await zip.generateAsync({
                        type: "blob",
                        compression: "DEFLATE",
                        compressionOptions: { level: 9 }
                    });
                
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64data = reader.result as string;
                            const base64 = base64data.split(',')[1];
                            const urlSafeBase64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
                            const url = `${window.location.origin}${window.location.pathname}#jam=${urlSafeBase64}`;
                            resolve(url);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                },
                toggleFullscreenPrompt: (show) => {
                    set(state => ({ showFullscreenPrompt: show === undefined ? !state.showFullscreenPrompt : show }));
                },
                addMidiCcLock: (cc = 74, value = 64) => {
                    set(state => {
                        if (state.selectedPLockStep) {
                            const { trackId, stepIndex } = state.selectedPLockStep;
                            const track = state.preset.tracks.find(t => t.id === trackId);
                            if (track && track.type === 'midi') {
                                const step = track.patterns[track.activePatternIndex][stepIndex];
                                if (!step.pLocks) step.pLocks = {};
                                if (!step.pLocks.ccLocks) step.pLocks.ccLocks = [];
                                const newLock = { id: `cc_${Date.now()}`, cc, value };
                                step.pLocks.ccLocks.push(newLock);
                            }
                        }
                    });
                },
                updateMidiCcLock: (id, cc, value) => {
                    set(state => {
                         if (state.selectedPLockStep) {
                            const { trackId, stepIndex } = state.selectedPLockStep;
                            const track = state.preset.tracks.find(t => t.id === trackId);
                            if (track && track.type === 'midi') {
                                const step = track.patterns[track.activePatternIndex][stepIndex];
                                const lock = step.pLocks?.ccLocks?.find(l => l.id === id);
                                if (lock) {
                                    if (cc !== undefined) lock.cc = Math.max(0, Math.min(127, cc));
                                    if (value !== undefined) lock.value = Math.max(0, Math.min(127, value));
                                }
                            }
                        }
                    });
                },
                removeMidiCcLock: (id) => {
                     set(state => {
                         if (state.selectedPLockStep) {
                            const { trackId, stepIndex } = state.selectedPLockStep;
                            const track = state.preset.tracks.find(t => t.id === trackId);
                            if (track && track.type === 'midi' && track.patterns[track.activePatternIndex][stepIndex].pLocks?.ccLocks) {
                                const step = track.patterns[track.activePatternIndex][stepIndex];
                                step.pLocks!.ccLocks = step.pLocks!.ccLocks!.filter(l => l.id !== id);
                            }
                        }
                    });
                },
            })
        )
    )
);

// --- Global state persistance ---
useStore.subscribe(
    (state) => ({
        presets: state.presets,
        instrumentPresets: state.instrumentPresets,
        installedPacks: state.installedPacks,
        appearanceTheme: state.appearanceTheme,
        accentTheme: state.accentTheme,
        customStoreUrl: state.customStoreUrl,
        midiSyncSource: state.midiSyncSource,
        midiSyncOutput: state.midiSyncOutput,
        uiPerformanceMode: state.uiPerformanceMode,
    }),
    (currentState) => {
        try {
            localStorage.setItem('fm8r-state', JSON.stringify(currentState));
        } catch (error) {
            console.error("Error saving state to localStorage:", error);
        }
    },
    { fireImmediately: true }
);

// --- Audio engine reaction to state changes (PERFORMANCE OPTIMIZED) ---
useStore.subscribe(
    (state) => state.preset,
    (preset, prevPreset) => {
        if (audioEngine) {
            // BPM is special because it affects synced FX
            if (preset.bpm !== prevPreset.bpm) {
                audioEngine.updateBpm(preset.bpm);
                if (preset.globalFxParams.reverb.preDelaySync) {
                    audioEngine.updateReverb(preset.globalFxParams.reverb, preset.bpm);
                }
                if (preset.globalFxParams.delay.timeSync) {
                    audioEngine.updateDelay(preset.globalFxParams.delay, preset.bpm);
                }
            }

            // Global FX (checked individually for performance)
            if (!shallow(preset.globalFxParams.reverb, prevPreset.globalFxParams.reverb)) {
                audioEngine.updateReverb(preset.globalFxParams.reverb, preset.bpm);
            }
            if (!shallow(preset.globalFxParams.delay, prevPreset.globalFxParams.delay)) {
                audioEngine.updateDelay(preset.globalFxParams.delay, preset.bpm);
            }
            if (!shallow(preset.globalFxParams.drive, prevPreset.globalFxParams.drive)) {
                audioEngine.updateDrive(preset.globalFxParams.drive);
            }
            if (!shallow(preset.globalFxParams.character, prevPreset.globalFxParams.character)) {
                audioEngine.updateCharacter(preset.globalFxParams.character);
            }
            if (!shallow(preset.globalFxParams.masterFilter, prevPreset.globalFxParams.masterFilter)) {
                audioEngine.updateMasterFilter(preset.globalFxParams.masterFilter);
            }
            if (!shallow(preset.globalFxParams.compressor, prevPreset.globalFxParams.compressor)) {
                audioEngine.updateCompressor(preset.globalFxParams.compressor);
            }
            if (preset.globalFxParams.masterVolume !== prevPreset.globalFxParams.masterVolume) {
                audioEngine.updateMasterVolume(preset.globalFxParams.masterVolume);
            }

            // Tracks (checked individually for performance)
            preset.tracks.forEach((track, index) => {
                const prevTrack = prevPreset.tracks[index];
                if (!prevTrack) return; 

                if (track.volume !== prevTrack.volume) {
                    audioEngine.updateTrackVolume(track.id, track.volume);
                }
                if (track.pan !== prevTrack.pan) {
                    audioEngine.updateTrackPan(track.id, track.pan);
                }
                if (!shallow(track.fxSends, prevTrack.fxSends)) {
                    (Object.keys(track.fxSends) as Array<keyof FXSends>).forEach(fx => {
                        if (track.fxSends[fx] !== prevTrack.fxSends[fx]) {
                            audioEngine!.updateTrackFxSend(track.id, fx, track.fxSends[fx]);
                        }
                    });
                }
                // Instrument params are not updated live on playing voices, so no audio engine call is needed here.
            });
        }
    }
);