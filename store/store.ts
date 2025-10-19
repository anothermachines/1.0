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
import { deepClone, deepMerge, createTechnoPattern, randomizeKickParams, randomizeHatParams, randomizeArcaneParams, randomizeRuinParams, randomizeArtificeParams, randomizeShiftParams, randomizeResonParams, randomizeAlloyParams, audioBufferToWav, downloadBlob, generateEuclideanPattern, generateWaveformData, setDeep, generateWaveformForPattern, midiToNoteName, getInitialParamsForType } from '../utils';
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
                engine.updateCharacter(preset.globalFxParams.character);
            } else {
                engine.updateReverb({ ...preset.globalFxParams.reverb, mix: 0 }, preset.bpm);
                engine.updateDelay({ ...preset.globalFxParams.delay, mix: 0 }, preset.bpm);
                engine.updateDrive({ ...preset.globalFxParams.drive, mix: 0 });
                engine.updateCharacter({ ...preset.globalFxParams.character, mix: 0 });
            }

            // Master Filter and Compressor are always bypassed for stems.
            engine.updateMasterFilter({ type: 'lowpass', cutoff: 20000, resonance: 1 });
            engine.updateCompressor({ ...preset.globalFxParams.compressor, enabled: false, threshold: 0, makeup: 0 });

            // Apply master volume to stems for level consistency.
            engine.updateMasterVolume(preset.globalFxParams.masterVolume);

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
                engine.updateCharacter(preset.globalFxParams.character);
            } else {
                engine.updateReverb({ ...preset.globalFxParams.reverb, mix: 0 }, preset.bpm);
                engine.updateDelay({ ...preset.globalFxParams.delay, mix: 0 }, preset.bpm);
                engine.updateDrive({ ...preset.globalFxParams.drive, mix: 0 });
                engine.updateCharacter({ ...preset.globalFxParams.character, mix: 0 });
            }
            engine.updateMasterFilter({ type: 'lowpass', cutoff: 20000, resonance: 1 });
            engine.updateCompressor({ ...preset.globalFxParams.compressor, enabled: false });
            engine.updateMasterVolume(preset.globalFxParams.masterVolume);
    
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
                    set({ showWelcomeScreen: false, showQuickStart: shouldShowQuickStart });
                
                    // If the quick start guide is not going to be shown (because it's already finished),
                    // then we check if we should show the fullscreen prompt.
                    if (!shouldShowQuickStart) {
                        const fullscreenPromptDismissed = localStorage.getItem('fm8r-fullscreen-prompt-dismissed');
                        if (!fullscreenPromptDismissed) {
                            set({ showFullscreenPrompt: true });
                        }
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
                
                        // If params are empty, populate with defaults before mutating.
                        if ((!track.params || Object.keys(track.params).length === 0) && track.type !== 'midi') {
                            track.params = getInitialParamsForType(track.type);
                        }
                
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
                
                        if (selectedPLockStep && activeTrackId === selectedPLockStep.trackId) {
                            const step = track.patterns[track.activePatternIndex][selectedPLockStep.stepIndex];
                            const paramKey = `${track.type}Params` as keyof PLocks;
                            if (!step.pLocks) step.pLocks = {};
                            if (!(step.pLocks as any)[paramKey]) (step.pLocks as any)[paramKey] = {};
                            setDeepMutate((step.pLocks as any)[paramKey], path, value);
                        } else {
                            // If not a P-Lock, it's a base parameter change.
                            setDeepMutate(track.params, path, value);
                
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
                handleMidiMessage: (mapping: MidiMapping, value: number, command: number) => {
                    if (get().isSpectator) {
                        get().triggerViewerModeInteraction();
                        return;
                    }

                    const { setParam, setTrackVolume, setTrackPan, setFxSend, selectTrack, toggleMute, toggleSolo, setMainView } = get();
                    const { target } = mapping;
                    const { path, type, range } = target;

                    // Ignore note off for buttons to avoid double triggering
                    if (type === 'button' && command === 8) {
                        return;
                    }

                    let normalizedValue = value / 127;

                    // Handle transport controls
                    if (path.startsWith('transport.')) {
                        const { togglePlay, stop } = usePlaybackStore.getState();
                        if (path === 'transport.play') togglePlay();
                        else if (path === 'transport.stop') stop();
                        else if (path === 'transport.view.pattern') setMainView('pattern');
                        else if (path === 'transport.view.song') setMainView('song');
                        return;
                    }

                    // Handle track mutes/solos/selects
                    const trackMatch = path.match(/^tracks\.(\d+)\.(mute|solo|select)$/);
                    if (trackMatch) {
                        const trackId = parseInt(trackMatch[1], 10);
                        const action = trackMatch[2];
                        if (action === 'mute') toggleMute(trackId);
                        else if (action === 'solo') toggleSolo(trackId);
                        else if (action === 'select') selectTrack(trackId);
                        return;
                    }

                    let finalValue: any = normalizedValue;
                    if (range) {
                        finalValue = range.min + (normalizedValue * (range.max - range.min));
                    }

                    const parts = path.split('.');

                    if (parts[0] === 'tracks') {
                        const trackId = parseInt(parts[1], 10);
                        if (get().isViewerMode && trackId >= 3) {
                            get().triggerViewerModeInteraction();
                            return;
                        }
                        const param = parts[2];
                        if (param === 'volume') setTrackVolume(trackId, finalValue);
                        else if (param === 'pan') setTrackPan(trackId, finalValue);
                        else if (param === 'fxSends') {
                            const send = parts[3] as keyof FXSends;
                            setFxSend(trackId, send, finalValue);
                        } else if (param === 'params') {
                            const paramPath = parts.slice(3).join('.');
                            get().setParamForTrack(trackId, paramPath, finalValue);
                        }
                    } else if (parts[0] === 'globalFx') {
                        const fx = parts[1] as keyof GlobalFXParams;
                        const param = parts[2];
                        get().setGlobalFxParam(fx, param, finalValue);
                    } else if (parts[0] === 'preset' && parts[1] === 'bpm') {
                        get().setBpm(finalValue);
                    }
                },
                setMidiOutParam: (key, value) => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const { selectedTrackId, selectedPLockStep, isViewerMode } = state;
                        const activeTrackId = selectedPLockStep?.trackId ?? selectedTrackId;
                        if (isViewerMode && activeTrackId >= 3) {
                            get().triggerViewerModeInteraction();
                            return;
                        }

                        const track = state.preset.tracks.find(t => t.id === activeTrackId);
                        if (!track || track.type !== 'midi') return;

                        if (selectedPLockStep && activeTrackId === selectedPLockStep.trackId) {
                            const step = track.patterns[track.activePatternIndex][selectedPLockStep.stepIndex];
                            if (!step.pLocks) step.pLocks = {};
                            if (!step.pLocks.midiOutParams) step.pLocks.midiOutParams = {};
                            (step.pLocks.midiOutParams as any)[key] = value;
                        } else {
                            if (!track.midiOut) track.midiOut = { deviceId: null, channel: 1 };
                            (track.midiOut as any)[key] = value;

                            if (state.automationRecording?.trackId === activeTrackId) {
                                state._recordAutomationPoint(state, activeTrackId, `midiOut.${key}`, value);
                            }
                        }
                    });
                },
                setTrackVolume: (trackId, volume) => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    if (get().isViewerMode && trackId >= 3) { get().triggerViewerModeInteraction(); return; }
                    
                    set(state => {
                        if (state.selectedPLockStep?.trackId === trackId) {
                            const track = state.preset.tracks.find(t => t.id === trackId);
                            if (track) {
                                const step = track.patterns[track.activePatternIndex][state.selectedPLockStep.stepIndex];
                                if (!step.pLocks) step.pLocks = {};
                                step.pLocks.volume = volume;
                            }
                        } else {
                            const track = state.preset.tracks.find(t => t.id === trackId);
                            if (track) track.volume = volume;
                            audioEngine?.updateTrackVolume(trackId, volume);
                            if (state.automationRecording?.trackId === trackId) {
                                state._recordAutomationPoint(state, trackId, 'volume', volume);
                            }
                        }
                    });
                },
                setTrackPan: (trackId, pan) => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    if (get().isViewerMode && trackId >= 3) { get().triggerViewerModeInteraction(); return; }
                    
                    set(state => {
                         if (state.selectedPLockStep?.trackId === trackId) {
                            const track = state.preset.tracks.find(t => t.id === trackId);
                            if (track) {
                                const step = track.patterns[track.activePatternIndex][state.selectedPLockStep.stepIndex];
                                if (!step.pLocks) step.pLocks = {};
                                step.pLocks.pan = pan;
                            }
                        } else {
                            const track = state.preset.tracks.find(t => t.id === trackId);
                            if (track) track.pan = pan;
                            audioEngine?.updateTrackPan(trackId, pan);
                             if (state.automationRecording?.trackId === trackId) {
                                state._recordAutomationPoint(state, trackId, 'pan', pan);
                            }
                        }
                    });
                },
                setFxSend: (trackId, fx, value) => {
                     if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                     if (get().isViewerMode && trackId >= 3) { get().triggerViewerModeInteraction(); return; }
                    
                    set(state => {
                        if (state.selectedPLockStep?.trackId === trackId) {
                            const track = state.preset.tracks.find(t => t.id === trackId);
                            if (track) {
                                const step = track.patterns[track.activePatternIndex][state.selectedPLockStep.stepIndex];
                                if (!step.pLocks) step.pLocks = {};
                                if (!step.pLocks.fxSends) step.pLocks.fxSends = {};
                                step.pLocks.fxSends[fx] = value;
                            }
                        } else {
                            const track = state.preset.tracks.find(t => t.id === trackId);
                            if (track) track.fxSends[fx] = value;
                            audioEngine?.updateTrackFxSend(trackId, fx, value);
                            if (state.automationRecording?.trackId === trackId) {
                                state._recordAutomationPoint(state, trackId, `fxSends.${fx}`, value);
                            }
                        }
                    });
                },
                setGlobalFxParam: (fx, param, value) => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const paramPath = `${fx}.${param}`;
                        setDeep(state.preset.globalFxParams, paramPath, value);

                        const currentBpm = state.preset.bpm;
                        if (fx === 'reverb') audioEngine?.updateReverb(state.preset.globalFxParams.reverb, currentBpm);
                        if (fx === 'delay') audioEngine?.updateDelay(state.preset.globalFxParams.delay, currentBpm);
                        if (fx === 'drive') audioEngine?.updateDrive(state.preset.globalFxParams.drive);
                        if (fx === 'character') audioEngine?.updateCharacter(state.preset.globalFxParams.character);
                        if (fx === 'masterFilter') audioEngine?.updateMasterFilter(state.preset.globalFxParams.masterFilter);
                        if (fx === 'compressor') audioEngine?.updateCompressor(state.preset.globalFxParams.compressor);
                    });
                },
                setMasterVolume: (volume) => {
                     if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    set(state => { state.preset.globalFxParams.masterVolume = volume; });
                    audioEngine?.updateMasterVolume(volume);
                },
                setStepProperty: (trackId, stepIndex, prop, value) => {
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (track) {
                            const step = track.patterns[track.activePatternIndex][stepIndex];
                            if (step) {
                                (step as any)[prop] = value;
                            }
                        }
                    });
                },

                // --- AUDIO ACTIONS ---
                auditionNote: (note, velocity = 0.8) => {
                    const { selectedTrackId, isViewerMode } = get();
                     if (isViewerMode && selectedTrackId >= 3) {
                        get().triggerViewerModeInteraction();
                        return;
                    }

                    const track = get().preset.tracks.find(t => t.id === selectedTrackId);
                    if (track && audioEngine) {
                        audioEngine.playNote(track, note, velocity);
                    }
                },
                
                // --- PATTERN & GENERATIVE ACTIONS ---
                setPatternLength: (trackId, length) => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (track) track.patternLength = length;
                    });
                },
                selectPattern: (trackId, patternIndex, currentPlayheadTime) => {
                    if (get().isSpectator) { get().triggerViewerModeInteraction(); return; }
                    const { isArrangementRecording, mainView } = get();
                    if (isArrangementRecording && mainView === 'song') {
                        const secondsPerBeat = 60 / get().preset.bpm;
                        const timeInBeats = currentPlayheadTime / secondsPerBeat;
                        
                        set(state => {
                            const track = state.preset.tracks.find(t => t.id === trackId);
                            if (!track) return;
                    
                            // Find the currently recording clip for this track and end it
                            const existingClipIndex = state.recordingClips.findIndex(c => c.trackId === trackId);
                            if (existingClipIndex !== -1) {
                                const existingClip = state.recordingClips[existingClipIndex];
                                existingClip.duration = timeInBeats - existingClip.startTime;
                                // Move it to the main arrangement
                                if (!state.preset.arrangementClips) state.preset.arrangementClips = [];
                                if(existingClip.duration > 0) state.preset.arrangementClips.push(existingClip);
                                state.recordingClips.splice(existingClipIndex, 1);
                            }
                    
                            // Start a new recording clip
                            const newClip: ArrangementClip = {
                                id: `rec-${trackId}-${Date.now()}`,
                                trackId: trackId,
                                startTime: timeInBeats,
                                duration: Infinity, // Will be calculated on next change or stop
                                type: 'pattern',
                                patternIndex: patternIndex,
                            };
                            state.recordingClips.push(newClip);
                        });
                    }

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
                    get().addNotification({ type: 'info', message: `Recording automation for Track ${trackId + 1} (${mode})` });
                },
                stopAutomationRecording: () => {
                    if (get().automationRecording) {
                        get().addNotification({ type: 'success', message: `Stopped automation recording.` });
                    }
                    set({ automationRecording: null });
                },
                clearAutomation: (trackId) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (track) track.automation = {};
                    });
                    get().addNotification({ type: 'info', message: `Cleared automation for Track ${trackId + 1}` });
                },
                randomizeTrackPattern: (trackId) => {
                    if (get().isViewerMode && trackId >= 3) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (track) {
                            const isHypnotic = Math.random() > 0.5;
                            const { pattern, length } = createTechnoPattern(track.type, isHypnotic);
                            track.patterns[track.activePatternIndex] = pattern;
                            track.patternLength = length;
                        }
                    });
                },
                 randomizeInstrument: (trackId) => {
                    if (get().isViewerMode && trackId >= 3) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (!track) return;

                        let randomizedParams: Partial<AllInstrumentParams> = {};
                        switch (track.type) {
                            case 'kick': randomizedParams = randomizeKickParams(); break;
                            case 'hat': randomizedParams = randomizeHatParams(); break;
                            case 'arcane': randomizedParams = randomizeArcaneParams(); break;
                            case 'ruin': randomizedParams = randomizeRuinParams(); break;
                            case 'artifice': randomizedParams = randomizeArtificeParams(); break;
                            case 'shift': randomizedParams = randomizeShiftParams(); break;
                            case 'reson': randomizedParams = randomizeResonParams(); break;
                            case 'alloy': randomizedParams = randomizeAlloyParams(); break;
                        }
                        track.params = deepMerge(track.params, randomizedParams);
                        track.loadedInstrumentPresetName = null;
                    });
                },
                randomizeAllPatternsForTrack: (trackId) => {
                    if (get().isViewerMode && trackId >= 3) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (track) {
                            track.patterns = track.patterns.map(() => createTechnoPattern(track.type, Math.random() > 0.5).pattern);
                        }
                    });
                },
                randomizeAllPatternsForAllTracks: () => {
                     if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        state.preset.tracks.forEach(track => {
                            if (track.type !== 'midi') {
                                track.patterns = track.patterns.map(() => createTechnoPattern(track.type, Math.random() > 0.5).pattern);
                            }
                        });
                    });
                },
                clearTrackPattern: (trackId) => {
                    if (get().isViewerMode && trackId >= 3) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (track) {
                            track.patterns[track.activePatternIndex] = createEmptyPatterns()[0];
                        }
                    });
                },
                clearAllPatterns: () => {
                     if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        state.preset.tracks.forEach(track => {
                            track.patterns = createEmptyPatterns();
                            track.activePatternIndex = 0;
                        });
                    });
                },
                startEuclideanMode: (trackId) => {
                    if (get().isViewerMode && trackId >= 3) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (track) {
                            const currentPattern = track.patterns[track.activePatternIndex];
                            state.euclideanMode = {
                                trackId,
                                pulses: 8,
                                steps: track.patternLength,
                                rotation: 0,
                                originalPattern: deepClone(currentPattern),
                                originalLength: track.patternLength,
                            };
                            // Apply initial euclidean pattern
                            const euclidean = generateEuclideanPattern(8, track.patternLength);
                            const newPattern = createEmptyPatterns()[0];
                            euclidean.forEach((active, i) => { if (active) newPattern[i].active = true; });
                            track.patterns[track.activePatternIndex] = newPattern;
                        }
                    });
                },
                updateEuclidean: (params) => {
                    set(state => {
                        if (state.euclideanMode) {
                            state.euclideanMode = { ...state.euclideanMode, ...params };
                            const track = state.preset.tracks.find(t => t.id === state.euclideanMode!.trackId);
                            if (track) {
                                const { pulses, steps, rotation } = state.euclideanMode;
                                const euclidean = generateEuclideanPattern(pulses, steps);
                                const rotated = [...euclidean.slice(rotation), ...euclidean.slice(0, rotation)];
                                const newPattern = createEmptyPatterns()[0];
                                rotated.forEach((active, i) => { if (active) newPattern[i].active = true; });
                                track.patterns[track.activePatternIndex] = newPattern;
                                track.patternLength = steps;
                            }
                        }
                    });
                },
                applyEuclidean: () => {
                    set({ euclideanMode: null });
                    get().addNotification({ type: 'success', message: 'Euclidean pattern applied.' });
                },
                cancelEuclidean: () => {
                    set(state => {
                        if (state.euclideanMode) {
                            const track = state.preset.tracks.find(t => t.id === state.euclideanMode!.trackId);
                            if (track) {
                                track.patterns[track.activePatternIndex] = state.euclideanMode.originalPattern;
                                track.patternLength = state.euclideanMode.originalLength;
                            }
                            state.euclideanMode = null;
                        }
                    });
                },
                
                // --- MODALS & UI STATE ---
                toggleQuickStart: (show) => {
                    const shouldShow = show === undefined ? !get().showQuickStart : show;
                    set({ showQuickStart: shouldShow });
                
                    // If we are hiding the quick start guide, it means the user is done with it.
                    if (!shouldShow) {
                        localStorage.setItem('fm8r-quickstart-finished', 'true');
                        
                        // Now check if we should show the fullscreen prompt.
                        const fullscreenPromptDismissed = localStorage.getItem('fm8r-fullscreen-prompt-dismissed');
                        if (!fullscreenPromptDismissed) {
                            set({ showFullscreenPrompt: true });
                        }
                    }
                },
                togglePresetManager: (open) => set({ isPresetManagerOpen: open === undefined ? !get().isPresetManagerOpen : open }),
                toggleExportModal: (open) => set({ isExportModalOpen: open === undefined ? !get().isExportModalOpen : open }),
                toggleStore: (open) => set({ isStoreOpen: open === undefined ? !get().isStoreOpen : open }),
                toggleSettingsModal: (open) => set({ isSettingsModalOpen: open === undefined ? !get().isSettingsModalOpen : open }),
                toggleManual: (open) => set({ isManualOpen: open === undefined ? !get().isManualOpen : open }),
                setMidiOutputs: (outputs) => set({ midiOutputs: outputs.map(o => ({ id: o.id, name: o.name }))}),
                setAppearanceTheme: (theme) => set({ appearanceTheme: theme }),
                setAccentTheme: (theme) => set({ accentTheme: theme }),
                setUiPerformanceMode: (mode) => set({ uiPerformanceMode: mode }),
                
                // --- PRESETS & DATA MANAGEMENT ---
                loadPreset: (preset) => {
                    if (get().isSpectator) {
                        get().addNotification({ type: 'info', message: "Can't change projects in Spectator mode." });
                        return;
                    }

                    const newPreset = deepClone(preset);
                    
                    // --- BACKWARD COMPATIBILITY MIGRATION ---
                    const defaultFxParams = deepClone(LICENSED_DEFAULT_PROJECT.globalFxParams);
                    newPreset.globalFxParams = deepMerge(defaultFxParams, newPreset.globalFxParams || {});
                    
                    // Migrate track params to ensure all properties exist
                    newPreset.tracks.forEach(track => {
                        if (track.type !== 'midi') {
                            const defaultParams = getInitialParamsForType(track.type);
                            track.params = deepMerge(defaultParams, track.params || {});
                        }
                    });

                    set({ preset: newPreset, selectedTrackId: 0, sequencerPage: 0, mutedTracks: [], soloedTrackId: null, selectedPLockStep: null, isPLockModeActive: false });
                    
                    if (audioEngine) {
                        audioEngine.createTrackChannels(newPreset.tracks);
                        audioEngine.updateBpm(newPreset.bpm);
                        audioEngine.updateReverb(newPreset.globalFxParams.reverb, newPreset.bpm);
                        audioEngine.updateDelay(newPreset.globalFxParams.delay, newPreset.bpm);
                        audioEngine.updateDrive(newPreset.globalFxParams.drive);
                        audioEngine.updateCharacter(newPreset.globalFxParams.character);
                        audioEngine.updateMasterFilter(newPreset.globalFxParams.masterFilter);
                        audioEngine.updateCompressor(newPreset.globalFxParams.compressor);
                        audioEngine.updateMasterVolume(newPreset.globalFxParams.masterVolume);
                    }
                },
                savePreset: (name) => {
                     if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const existing = get().presets.find(p => p.name.toLowerCase() === name.toLowerCase());
                    if (existing) {
                        get().addNotification({ type: 'error', message: `A project named "${name}" already exists.` });
                        return;
                    }
                    const newPreset = deepClone(get().preset);
                    newPreset.name = name;
                    set(state => ({ presets: [...state.presets, newPreset], preset: newPreset }));
                    get().addNotification({ type: 'success', message: `Project "${name}" saved.` });
                },
                overwritePreset: (name) => {
                     if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const presetToSave = deepClone(get().preset);
                    presetToSave.name = name;
                    set(state => {
                        const index = state.presets.findIndex(p => p.name === name);
                        if (index !== -1) {
                            state.presets[index] = presetToSave;
                        }
                    });
                     get().addNotification({ type: 'success', message: `Project "${name}" updated.` });
                },
                saveCurrentProjectAndExtractPresets: () => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    // First, save the current project state to the library.
                    get().overwritePreset(get().preset.name);
                
                    // Now, extract instrument presets from the current project in a single, safe state update.
                    set(state => {
                        let extractedCount = 0;
                        const project = state.preset; // Use the current state's preset
                
                        project.tracks.forEach(track => {
                            // Ensure track is not MIDI and has params to save.
                            if (track.type !== 'midi' && track.params && Object.keys(track.params).length > 0) {
                                const presetName = `${project.name} - ${track.name}`;
                                const trackType = track.type;
                                
                                // Check if a preset with the same name and type already exists.
                                const existing = state.instrumentPresets.find(p => p.type === trackType && p.name.toLowerCase() === presetName.toLowerCase());
                                
                                if (!existing) {
                                    const newPreset: InstrumentPreset = {
                                        name: presetName,
                                        type: trackType,
                                        params: deepClone(track.params),
                                    };
                                    state.instrumentPresets.push(newPreset);
                                    extractedCount++;
                                }
                            }
                        });
                
                        if (extractedCount > 0) {
                            state.addNotification({ type: 'success', message: `Project saved and ${extractedCount} new instrument presets extracted.` });
                        } else {
                            state.addNotification({ type: 'success', message: `Project saved. No new presets were extracted (they may already exist).` });
                        }
                    });
                },
                deletePreset: (name) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    if (name === "Blank Project" || name === "New Project") {
                         get().addNotification({ type: 'error', message: `Cannot delete factory default project.` });
                        return;
                    }
                    set(state => ({ presets: state.presets.filter(p => p.name !== name) }));
                     get().addNotification({ type: 'info', message: `Project "${name}" deleted.` });
                },
                renamePreset: (oldName, newName) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    if (oldName === "Blank Project" || oldName === "New Project") {
                         get().addNotification({ type: 'error', message: `Cannot rename factory default project.` });
                        return;
                    }
                    set(state => {
                        const preset = state.presets.find(p => p.name === oldName);
                        if (preset) preset.name = newName;
                        if (state.preset.name === oldName) state.preset.name = newName;
                    });
                },
                 saveCurrentSessionAsNewProject: () => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const newProject = deepClone(get().preset);
                    const now = new Date();
                    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
                    newProject.name = `Session ${timestamp}`;
                    set(state => ({
                        presets: [...state.presets, newProject],
                        preset: newProject, // Load the newly saved project
                    }));
                    get().addNotification({ type: 'success', message: `Saved current session as "${newProject.name}".` });
                },

                // --- IMPORT / EXPORT ---
                exportProject: () => {
                     if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const presetToExport = get().preset;
                    const blob = new Blob([JSON.stringify(presetToExport, null, 2)], { type: 'application/json' });
                    downloadBlob(blob, `${presetToExport.name}.fm8r-project`);
                },
                importProject: (file) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const result = e.target?.result as string;
                            const newPreset = JSON.parse(result);
                            if (newPreset.name && newPreset.tracks) {
                                if (get().presets.some(p => p.name === newPreset.name)) {
                                    get().addNotification({ type: 'error', message: `A project named "${newPreset.name}" already exists. Please rename it before importing.` });
                                } else {
                                    set(state => { state.presets.push(newPreset); });
                                    get().addNotification({ type: 'success', message: `Project "${newPreset.name}" imported.` });
                                }
                            } else {
                                throw new Error("Invalid project file format.");
                            }
                        } catch (error) {
                            console.error("Failed to import project:", error);
                             get().addNotification({ type: 'error', message: 'Failed to import project. Invalid file format.' });
                        }
                    };
                    reader.readAsText(file);
                },
                saveAllProjects: async () => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    await loadJSZip();
                    const zip = new JSZip();
                    get().presets.forEach(preset => {
                        zip.file(`${preset.name}.fm8r-project`, JSON.stringify(preset, null, 2));
                    });
                    const content = await zip.generateAsync({ type: "blob" });
                    downloadBlob(content, "FM8R_Projects_Backup.zip");
                },
                exportAudio: async (options) => {
                    if (get().isSpectator) {
                        get().triggerViewerModeInteraction();
                        get().addNotification({ type: 'info', message: "Export is disabled in Spectator mode." });
                        return Promise.reject("Export disabled");
                    }
                    if (get().isViewerMode) {
                        get().triggerViewerModeInteraction();
                        get().addNotification({ type: 'info', message: "Please unlock the full version to export audio." });
                        return Promise.reject("Export disabled");
                    }
                    
                    const { preset, mutedTracks, soloedTrackId, mainView, arrangementLoop } = get();
                    const sampleRate = 44100;
                    const { type, source = mainView === 'pattern' ? 'pattern' : 'song-loop' } = options;
                    const includeMasterFx = options.includeMasterFx ?? true;
                    
                    const onProgress = (message: string) => set({ exportProgress: message });

                    set({ isExporting: true, exportProgress: 'Starting export...' });
                    try {
                        let result;
                        if (source === 'pattern') {
                            result = await renderPatternAudio(preset, sampleRate, mutedTracks, soloedTrackId, { type, includeMasterFx }, onProgress);
                        } else if (source === 'song-loop' || source === 'song-full') {
                            let startTime = 0;
                            let endTime = 0;
                            const secondsPerBeat = 60 / preset.bpm;

                            if (source === 'song-loop' && arrangementLoop) {
                                startTime = arrangementLoop.start * secondsPerBeat;
                                endTime = arrangementLoop.end * secondsPerBeat;
                            } else { // full song
                                const clips = preset.arrangementClips || [];
                                if (clips.length > 0) {
                                    endTime = Math.max(...clips.map(c => c.startTime + c.duration)) * secondsPerBeat;
                                }
                            }
                            
                            if (endTime <= startTime) {
                                throw new Error("Invalid export range. End time must be after start time.");
                            }
                            
                            result = await renderSongAudio(
                                preset, sampleRate, mutedTracks, soloedTrackId, 
                                { type, includeMasterFx, startTime, endTime }, 
                                onProgress
                            );
                        } else {
                            throw new Error("Invalid export source");
                        }
                        
                        downloadBlob(result.blob, result.name);
                        get().addNotification({ type: 'success', message: `Successfully exported ${result.name}` });
                        return result;
                    } catch (error: any) {
                        console.error("Export failed:", error);
                        get().addNotification({ type: 'error', message: `Export failed: ${error.message}` });
                        return Promise.reject(error.message);
                    } finally {
                        set({ isExporting: false, exportProgress: '' });
                    }
                },
                installPack: (pack) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const projectNames = new Set(state.presets.map(p => p.name));
                        const newProjects = pack.projects.filter(p => !projectNames.has(p.name));
                        state.presets.push(...deepClone(newProjects));
                        
                        const instrumentKeys = new Set(state.instrumentPresets.map(p => `${p.type}::${p.name}`));
                        const newInstruments = pack.instruments.filter(p => !instrumentKeys.has(`${p.type}::${p.name}`));
                        state.instrumentPresets.push(...deepClone(newInstruments));

                        state.installedPacks.push(pack.id);
                        state.addNotification({ type: 'success', message: `Expansion Pack "${pack.name}" installed.` });
                    });
                },
                fetchCustomPacks: async (url) => {
                    if (!url) return;
                    try {
                        const response = await fetch(url);
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        const customPacks: ExpansionPack[] = await response.json();
                        set({ customPacks });
                        get().addNotification({ type: 'info', message: `Loaded ${customPacks.length} custom packs.` });
                    } catch (e) {
                        console.error("Failed to fetch custom packs:", e);
                        get().addNotification({ type: 'error', message: "Failed to load custom packs from URL." });
                    }
                },
                setCustomStoreUrl: (url) => set({ customStoreUrl: url }),

                // --- ARRANGEMENT ---
                moveClip: (clipId, newStartTime) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const clip = state.preset.arrangementClips?.find(c => c.id === clipId);
                        if (clip) clip.startTime = newStartTime;
                    });
                },
                resizeClip: (clipId, newDuration) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const clip = state.preset.arrangementClips?.find(c => c.id === clipId);
                        if (clip) clip.duration = newDuration;
                    });
                },
                deleteClip: (clipId) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        if (state.preset.arrangementClips) {
                            state.preset.arrangementClips = state.preset.arrangementClips.filter(c => c.id !== clipId);
                        }
                    });
                },
                duplicateClip: (clip, newStartTime) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        if (!state.preset.arrangementClips) state.preset.arrangementClips = [];
                        const newClip = {
                            ...deepClone(clip),
                            id: `clip-${Date.now()}-${Math.random()}`,
                            startTime: newStartTime,
                        };
                        state.preset.arrangementClips.push(newClip);
                    });
                },
                addPatternClip: (trackId, startTime, patternIndex) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (!track) return;
                        if (!state.preset.arrangementClips) state.preset.arrangementClips = [];
                        const newClip: ArrangementClip = {
                            id: `clip-${Date.now()}-${Math.random()}`,
                            trackId,
                            startTime,
                            duration: track.patternLength / 4, // duration in beats
                            type: 'pattern',
                            patternIndex: patternIndex,
                        };
                        state.preset.arrangementClips.push(newClip);
                    });
                },
                toggleArrangementRecording: (currentPlayheadTime) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    if (get().isArrangementRecording) {
                        get().finalizeRecording(currentPlayheadTime);
                    } else {
                        set({ isArrangementRecording: true, recordingClips: [] });
                        get().addNotification({ type: 'info', message: 'Arrangement recording started. Change patterns to record.' });
                    }
                },
                finalizeRecording: (currentPlayheadTime) => {
                    if (!get().isArrangementRecording) return;
                    
                    const secondsPerBeat = 60 / get().preset.bpm;
                    const timeInBeats = currentPlayheadTime / secondsPerBeat;
                
                    set(state => {
                        // Finalize any clips that are still "recording"
                        state.recordingClips.forEach(clip => {
                            clip.duration = timeInBeats - clip.startTime;
                            if (!state.preset.arrangementClips) state.preset.arrangementClips = [];
                            if (clip.duration > 0) state.preset.arrangementClips.push(clip);
                        });
                
                        state.isArrangementRecording = false;
                        state.recordingClips = [];
                    });
                    get().addNotification({ type: 'success', message: 'Arrangement recording finished.' });
                },
                initializeArrangementLoop: (defaultDurationInBeats) => {
                    if (get().arrangementLoop) return; // Don't overwrite if it already exists
                    
                    const { preset } = get();
                    const clips = preset.arrangementClips || [];
                    if (clips.length > 0) {
                        const minStart = Math.min(...clips.map(c => c.startTime));
                        const maxEnd = Math.max(...clips.map(c => c.startTime + c.duration));
                        set({ arrangementLoop: { start: minStart, end: maxEnd } });
                    } else {
                        set({ arrangementLoop: { start: 0, end: defaultDurationInBeats } });
                    }
                },
                setArrangementLoop: (start, end) => {
                    if (start < end) {
                        set({ arrangementLoop: { start, end } });
                    }
                },
                
                 // --- NOTIFICATIONS ---
                removeNotification: (id) => set(state => ({ notifications: state.notifications.filter(n => n.id !== id) })),
                addNotification: (notification) => set(state => ({ notifications: [...state.notifications, { ...notification, id: Date.now() + Math.random() }]})),
                
                // --- INSTRUMENT PRESETS ---
                saveInstrumentPreset: (trackType, name) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const existing = state.instrumentPresets.find(p => p.type === trackType && p.name.toLowerCase() === name.toLowerCase());
                        if (existing) {
                            state.addNotification({ type: 'error', message: `An instrument preset named "${name}" already exists for this type.` });
                            return;
                        }

                        const track = state.preset.tracks.find(t => t.id === state.selectedTrackId);
                        if (track && track.type === trackType) {
                            const newPreset: InstrumentPreset = {
                                name,
                                type: trackType,
                                params: deepClone(track.params),
                            };
                            state.instrumentPresets.push(newPreset);
                            state.addNotification({ type: 'success', message: `Instrument preset "${name}" saved.` });
                        }
                    });
                },
                loadInstrumentPreset: (preset) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === state.selectedTrackId);
                        if (track && track.type === preset.type) {
                            // Ensure compatibility by merging with default params
                            const defaultParams = getInitialParamsForType(track.type);
                            track.params = deepMerge(defaultParams, preset.params);
                            track.loadedInstrumentPresetName = preset.name;
                        }
                    });
                },
                deleteInstrumentPreset: (trackType, name) => {
                     if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        state.instrumentPresets = state.instrumentPresets.filter(p => !(p.type === trackType && p.name === name));
                    });
                    get().addNotification({ type: 'info', message: `Instrument preset "${name}" deleted.` });
                },
                 importInstrumentPresets: (file) => {
                     if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const result = e.target?.result as string;
                            const imported = JSON.parse(result) as InstrumentPreset[] | { name: string, type: TrackType, presets: InstrumentPreset[] };
                            
                            let presetsToImport: InstrumentPreset[];
                            if (Array.isArray(imported)) {
                                presetsToImport = imported;
                            } else if (imported.presets && Array.isArray(imported.presets)) {
                                presetsToImport = imported.presets;
                            } else {
                                throw new Error("Invalid format");
                            }

                            set(state => {
                                let added = 0;
                                const existingKeys = new Set(state.instrumentPresets.map(p => `${p.type}::${p.name.toLowerCase()}`));
                                presetsToImport.forEach(p => {
                                    if (p.type && p.name && p.params && !existingKeys.has(`${p.type}::${p.name.toLowerCase()}`)) {
                                        state.instrumentPresets.push(p);
                                        added++;
                                    }
                                });
                                get().addNotification({ type: 'success', message: `Imported ${added} new instrument presets.` });
                            });

                        } catch (error) {
                            get().addNotification({ type: 'error', message: 'Failed to import instrument presets. Invalid file.' });
                        }
                    };
                    reader.readAsText(file);
                },
                exportInstrumentPresets: (trackType) => {
                    if (get().isViewerMode) { get().triggerViewerModeInteraction(); return; }
                    const presetsToExport = get().instrumentPresets.filter(p => p.type === trackType);
                    const exportObj = {
                        name: `${trackType.toUpperCase()} Presets`,
                        type: trackType,
                        presets: presetsToExport,
                    };
                    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
                    downloadBlob(blob, `FM8R_${trackType}_presets.json`);
                },
                copyStep: (trackId, stepIndex) => {
                     if (get().isViewerMode && trackId >= 3) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === trackId);
                        if (track) {
                            const step = track.patterns[track.activePatternIndex][stepIndex];
                            state.copiedStep = { trackId, stepIndex, step: deepClone(step) };
                            get().addNotification({ type: 'info', message: `Copied step ${stepIndex + 1} from ${track.name}` });
                        }
                    });
                },
                pasteStep: (trackId, stepIndex) => {
                    if (get().isViewerMode && trackId >= 3) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        if (state.copiedStep) {
                            const track = state.preset.tracks.find(t => t.id === trackId);
                            if (track) {
                                track.patterns[track.activePatternIndex][stepIndex] = deepClone(state.copiedStep.step);
                            }
                        }
                    });
                },
                copyPattern: () => {
                    const { selectedTrackId } = get();
                    if (get().isViewerMode && selectedTrackId >= 3) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        const track = state.preset.tracks.find(t => t.id === selectedTrackId);
                        if (track) {
                            const pattern = track.patterns[track.activePatternIndex];
                            state.copiedPattern = { trackId: selectedTrackId, pattern: deepClone(pattern) };
                            get().addNotification({ type: 'info', message: `Copied pattern from ${track.name}` });
                        }
                    });
                },
                pastePattern: () => {
                     const { selectedTrackId } = get();
                    if (get().isViewerMode && selectedTrackId >= 3) { get().triggerViewerModeInteraction(); return; }
                    set(state => {
                        if (state.copiedPattern) {
                            const track = state.preset.tracks.find(t => t.id === selectedTrackId);
                            if (track) {
                                track.patterns[track.activePatternIndex] = deepClone(state.copiedPattern.pattern);
                            }
                        }
                    });
                },
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
                    const stateToSave = {
                        version: '1.2.0',
                        presets: get().presets,
                        instrumentPresets: get().instrumentPresets,
                        installedPacks: get().installedPacks,
                        appearanceTheme: get().appearanceTheme,
                        accentTheme: get().accentTheme,
                        midiMappings: midiMappings,
                        midiSyncSource: get().midiSyncSource,
                        midiSyncOutput: get().midiSyncOutput,
                    };
                    const blob = new Blob([JSON.stringify(stateToSave, null, 2)], { type: 'application/json' });
                    downloadBlob(blob, `FM8R_Full_Backup.fm8r-backup`);
                },
                importFullBackup: (file) => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                const result = e.target?.result as string;
                                const backup = JSON.parse(result) as FullBackup;
                                
                                set(state => {
                                    state.presets = backup.presets || state.presets;
                                    state.instrumentPresets = backup.instrumentPresets || state.instrumentPresets;
                                    state.installedPacks = backup.installedPacks || state.installedPacks;
                                    state.appearanceTheme = (backup.appearanceTheme as AppearanceThemeKey) || state.appearanceTheme;
                                    state.accentTheme = (backup.accentTheme as AccentThemeKey) || state.accentTheme;
                                    state.midiSyncSource = backup.midiSyncSource || state.midiSyncSource;
                                    state.midiSyncOutput = backup.midiSyncOutput || state.midiSyncOutput;
                                });
                                
                                get().addNotification({ type: 'success', message: 'Full backup restored successfully.' });
                                resolve(backup.midiMappings || []);
                            } catch (err) {
                                get().addNotification({ type: 'error', message: 'Failed to import backup. Invalid file format.' });
                                reject(err);
                            }
                        };
                        reader.readAsText(file);
                    });
                },
                 setMidiSyncSource: (source) => {
                    set({ midiSyncSource: source });
                    // If switching to internal, stop playback to regain control.
                    if (source === 'internal') {
                        usePlaybackStore.getState().stop();
                    }
                },
                setMidiSyncOutput: (output) => set({ midiSyncOutput: output }),
                setLicenseKey: (key, isSilent = false) => {
                    const isOwnerKey = key === "FM8R-OWNER-PRO-UNLIMITED-ACCESS";
                    
                    // Definitive regex for generated keys: FM8R-GEN- followed by 3 blocks of 4 alphanumeric chars.
                    const isGeneratedKey = (k: string): boolean => {
                        const regex = /^FM8R-GEN-([A-Z0-9]{4}-){2}[A-Z0-9]{4}$/i;
                        return regex.test(k);
                    };

                    const isValid = isOwnerKey || isGeneratedKey(key);
                
                    if (isValid) {
                        const wasOnBlankProject = get().preset.name === "Blank Project";
                
                        set(state => {
                            state.licenseKey = key;
                            state.isViewerMode = false;
                            state.isLicenseModalOpen = false;
                        });
                
                        if (wasOnBlankProject) {
                            const newProject = get().presets.find(p => p.name === "New Project") || deepClone(LICENSED_DEFAULT_PROJECT);
                            get().loadPreset(newProject);
                        }
                
                        if (!isSilent) {
                            get().addNotification({ type: 'success', message: 'Full version unlocked! Thank you for your support.' });
                        }
                        localStorage.setItem('fm8r_license_key', key);
                    } else {
                        if (!isSilent) {
                            get().addNotification({ type: 'error', message: 'Invalid license key.' });
                        }
                    }
                },
                clearLicenseKey: () => {
                    set({ licenseKey: null, isViewerMode: true });
                    localStorage.removeItem('fm8r_license_key');
                    get().addNotification({type: 'info', message: 'License removed.'});
                },
                toggleLicenseModal: (open) => set({ isLicenseModalOpen: open === undefined ? !get().isLicenseModalOpen : open }),
                triggerViewerModeInteraction: () => {
                    const { isLicenseModalOpen, toggleLicenseModal, lastNotificationTime } = get();
                    const now = Date.now();
                    if (!isLicenseModalOpen) {
                        toggleLicenseModal(true);
                        // Prevent notification spam
                        if (now - lastNotificationTime > 5000) {
                            set({lastNotificationTime: now});
                            get().addNotification({
                                type: 'info',
                                message: 'This feature is available in the full version.',
                                duration: 5000,
                            });
                        }
                    }
                },
                toggleShareJamModal: (open) => set({ isShareJamOpen: open === undefined ? !get().isShareJamOpen : open }),
                generateShareableLink: async () => {
                    await loadJSZip();
                    const zip = new JSZip();
                    // Strip down preset for sharing
                    const presetToShare = deepClone(get().preset);
                    presetToShare.tracks.forEach(track => {
                        // Keep only active pattern
                        const activePattern = track.patterns[track.activePatternIndex];
                        track.patterns = [activePattern];
                        track.activePatternIndex = 0;
                        track.patternLength = activePattern.length > 16 ? Math.min(64, Math.ceil(activePattern.length / 16) * 16) : 16;
                    });
                    
                    zip.file("p.json", JSON.stringify(presetToShare));
                    const content = await zip.generateAsync({type:"base64"});
                    const toUrlSafeBase64 = (s: string) => s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    
                    const baseUrl = window.location.origin + window.location.pathname;
                    return `${baseUrl}#jam=${toUrlSafeBase64(content)}`;
                },
                toggleFullscreenPrompt: (show) => set({ showFullscreenPrompt: show === undefined ? !get().showFullscreenPrompt : show }),
                addMidiCcLock: (cc = 74, value = 64) => {
                    set(state => {
                        const { selectedPLockStep } = state;
                        if (!selectedPLockStep) return;
                        const track = state.preset.tracks.find(t => t.id === selectedPLockStep.trackId);
                        if (track && track.type === 'midi') {
                            const step = track.patterns[track.activePatternIndex][selectedPLockStep.stepIndex];
                            if (!step.pLocks) step.pLocks = {};
                            if (!step.pLocks.ccLocks) step.pLocks.ccLocks = [];
                            step.pLocks.ccLocks.push({ id: `cc-${Date.now()}`, cc, value });
                        }
                    });
                },
                updateMidiCcLock: (id, cc, value) => {
                    set(state => {
                        const { selectedPLockStep } = state;
                        if (!selectedPLockStep) return;
                        const track = state.preset.tracks.find(t => t.id === selectedPLockStep.trackId);
                        if (track && track.type === 'midi') {
                            const step = track.patterns[track.activePatternIndex][selectedPLockStep.stepIndex];
                            const lock = step.pLocks?.ccLocks?.find(l => l.id === id);
                            if (lock) {
                                if (cc !== undefined) lock.cc = Math.max(0, Math.min(127, cc));
                                if (value !== undefined) lock.value = Math.max(0, Math.min(127, value));
                            }
                        }
                    });
                },
                removeMidiCcLock: (id) => {
                    set(state => {
                        const { selectedPLockStep } = state;
                        if (!selectedPLockStep) return;
                        const track = state.preset.tracks.find(t => t.id === selectedPLockStep.trackId);
                        if (track && track.type === 'midi') {
                            const step = track.patterns[track.activePatternIndex][selectedPLockStep.stepIndex];
                            if (step.pLocks?.ccLocks) {
                                step.pLocks.ccLocks = step.pLocks.ccLocks.filter(l => l.id !== id);
                            }
                        }
                    });
                },
        }))
    )
);

useStore.subscribe(
    state => state.preset,
    (preset) => {
        // FIX: Replaced `get()` with `useStore.getState()` as `get()` is not in scope here.
        const stateToSave = {
            presets: useStore.getState().presets,
            instrumentPresets: useStore.getState().instrumentPresets,
            appearanceTheme: useStore.getState().appearanceTheme,
            accentTheme: useStore.getState().accentTheme,
            customStoreUrl: useStore.getState().customStoreUrl,
        };
        try {
            localStorage.setItem('fm8r-state', JSON.stringify(stateToSave));
        } catch (e) {
            console.warn("Could not save state to localStorage:", e);
        }
    },
    { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b), fireImmediately: false }
);

useStore.subscribe(state => state.appearanceTheme, (theme) => {
    try {
        const state = JSON.parse(localStorage.getItem('fm8r-state') || '{}');
        state.appearanceTheme = theme;
        localStorage.setItem('fm8r-state', JSON.stringify(state));
    } catch (e) {}
});

useStore.subscribe(state => state.accentTheme, (theme) => {
     try {
        const state = JSON.parse(localStorage.getItem('fm8r-state') || '{}');
        state.accentTheme = theme;
        localStorage.setItem('fm8r-state', JSON.stringify(state));
    } catch (e) {}
});
useStore.subscribe(state => state.customStoreUrl, (url) => {
    try {
        const state = JSON.parse(localStorage.getItem('fm8r-state') || '{}');
        state.customStoreUrl = url;
        localStorage.setItem('fm8r-state', JSON.stringify(state));
    } catch (e) {}
});