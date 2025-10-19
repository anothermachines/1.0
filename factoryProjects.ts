import { Preset, StepState } from './types';
import { deepClone } from './utils';
import {
    INITIAL_TRACKS,
    INITIAL_KICK_PARAMS,
    INITIAL_HAT_PARAMS,
    INITIAL_RUIN_PARAMS,
    INITIAL_ALLOY_PARAMS,
    INITIAL_ARCANE_PARAMS,
    INITIAL_SHIFT_PARAMS,
    INITIAL_ARTIFICE_PARAMS,
    INITIAL_RESON_PARAMS,
    createEmptyPatterns,
    NEUTRAL_LFO,
} from './constants';

const createEmptySteps = (length = 64): StepState[] => Array(length).fill(null).map(() => ({ 
    active: false, 
    pLocks: null,
    notes: [],
    velocity: 1.0,
    duration: 1,
    condition: { type: 'always' }
}));

const createPatternFromSequence = (sequence: (number|null)[], note = 'C4', vel = 0.8, len = 1): StepState[] => {
    const pattern = createEmptySteps(64);
    sequence.forEach((s, i) => {
        if (s !== null && i < 64) {
            pattern[i] = { active: true, pLocks: null, notes: [note], velocity: s, duration: len, condition: { type: 'always' } };
        }
    });
    return pattern;
};

// Create a truly blank version for the demo/blank project
const blankProjectTracks = deepClone(INITIAL_TRACKS).map((track, i) => i < 3 ? track : { ...track, params: {} });
const kickTrackInBlank = blankProjectTracks.find(track => track.id === 0);
if (kickTrackInBlank) {
    kickTrackInBlank.patterns = createEmptyPatterns();
}


export const DEMO_DEFAULT_PROJECT: Preset = {
    name: "Blank Project",
    bpm: 120,
    tracks: blankProjectTracks,
    globalFxParams: {
        reverb: { decay: 1.5, mix: 0.2, preDelay: 0.01, preDelaySync: false, preDelayDivision: 1, damping: 6000 },
        delay: { time: 0.5, feedback: 0.45, mix: 0.3, timeSync: true, timeDivision: 0.5, tone: 4000 },
        drive: { amount: 10, tone: 8000, mix: 0.1 },
        character: { mode: 'tape', amount: 20, mix: 0.2 },
        masterFilter: { type: 'lowpass', cutoff: 20000, resonance: 1 },
        compressor: { enabled: true, threshold: -18, ratio: 4, knee: 10, attack: 0.005, release: 0.2, makeup: 4, sidechainSource: null },
        masterVolume: 0.9
    },
    arrangementClips: [],
    version: '1.2'
};

export const LICENSED_DEFAULT_PROJECT: Preset = {
    name: "New Project",
    bpm: 128,
    tracks: deepClone(INITIAL_TRACKS),
    globalFxParams: {
        reverb: { decay: 1.5, mix: 0.2, preDelay: 0.01, preDelaySync: false, preDelayDivision: 1, damping: 6000 },
        delay: { time: 0.5, feedback: 0.45, mix: 0.3, timeSync: true, timeDivision: 0.5, tone: 4000 },
        drive: { amount: 10, tone: 8000, mix: 0.1 },
        character: { mode: 'tape', amount: 20, mix: 0.2 },
        masterFilter: { type: 'lowpass', cutoff: 20000, resonance: 1 },
        compressor: { enabled: true, threshold: -18, ratio: 4, knee: 10, attack: 0.005, release: 0.2, makeup: 4, sidechainSource: null },
        masterVolume: 0.9
    },
    arrangementClips: [],
    version: '1.2'
};

export const stygianPath: Preset = {
  name: "Stygian Path",
  bpm: 124,
  globalFxParams: {
    reverb: { decay: 8, mix: 0.5, preDelay: 0.02, preDelaySync: false, preDelayDivision: 1, damping: 1500 },
    delay: { time: 0.5, feedback: 0.75, mix: 0.4, timeSync: true, timeDivision: 0.75, tone: 2000 },
    drive: { amount: 20, tone: 5000, mix: 0.1 },
    character: { mode: 'tape', amount: 35, mix: 0.25 },
    masterFilter: { type: 'lowpass', cutoff: 20000, resonance: 1 },
    compressor: { enabled: true, threshold: -24, ratio: 6, knee: 15, attack: 0.01, release: 0.6, makeup: 5, sidechainSource: 0 },
    masterVolume: 0.9,
  },
  tracks: [
    { ...deepClone(INITIAL_TRACKS[0]), name: 'Deep Kick', params: { ...INITIAL_KICK_PARAMS, tune: 38, decay: 0.9, impact: 80, tone: 20, character: 30 }, patterns: [createPatternFromSequence([1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null], 'C2')], volume: 0.45 },
    { ...deepClone(INITIAL_TRACKS[1]), name: 'Ghost Hat', params: { ...INITIAL_HAT_PARAMS, tone: 11000, decay: 0.3, character: 20, spread: 2.5 }, patterns: [createPatternFromSequence([null,null,0.7,null,null,null,0.7,null,null,null,0.7,null,null,null,0.7,null], 'C5')], fxSends: { delay: 0.8, reverb: 0.7, drive: 0, sidechain: 0 } },
    { ...deepClone(INITIAL_TRACKS[2]), name: 'Sub Drone', params: { ...INITIAL_RUIN_PARAMS, pitch: 36, algorithm: 'feedback_pm', timbre: 30, drive: 10, fold: 0, attack: 0.1, decay: 0.8 }, patterns: [createPatternFromSequence([0.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null], 'A1', 0.8, 16)], fxSends: { drive: 0, reverb: 0.5, delay: 0.3, sidechain: 1.0 }, volume: 0.35 },
    { ...deepClone(INITIAL_TRACKS[3]), name: 'Atmo Pad', params: { ...INITIAL_ARTIFICE_PARAMS, osc1_shape: 10, osc2_shape: 90, osc2_pitch: 7, fm_amount: 5, noise_level: 15, filter_cutoff: 800, filter_res: 9, ampEnv: { attack: 2.0, decay: 2.0, sustain: 1.0, release: 3.0 } }, patterns: [createPatternFromSequence([0.7], 'C3', 0.7, 16)], fxSends: { reverb: 1.0, delay: 0.8, drive: 0, sidechain: 0.5 }, volume: 0.2 },
    { ...deepClone(INITIAL_TRACKS[4]), name: 'Sonar', params: { ...INITIAL_ALLOY_PARAMS, pitch: 72, ratio: 3.5, feedback: 10, mod_level: 30, mod_decay: 0.2, ampEnv: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.3 } }, patternLength: 15, patterns: [createPatternFromSequence(Array(15).fill(null).map((_, i) => i === 0 ? 0.8 : null), 'C6')], fxSends: { delay: 0.9, reverb: 0.8, drive: 0, sidechain: 0 } },
    { ...deepClone(INITIAL_TRACKS[5]), volume: 0 },
    { ...deepClone(INITIAL_TRACKS[6]), volume: 0 },
    { ...deepClone(INITIAL_TRACKS[7]), volume: 0 },
  ]
};

export const systemCollapse: Preset = {
  name: "System Collapse",
  bpm: 142,
  globalFxParams: {
    reverb: { decay: 1.2, mix: 0.2, preDelay: 0.01, preDelaySync: false, preDelayDivision: 1, damping: 4000 },
    delay: { time: 0.5, feedback: 0.6, mix: 0.3, timeSync: true, timeDivision: 0.375, tone: 5000 },
    drive: { amount: 55, tone: 4500, mix: 0.25 },
    character: { mode: 'overdrive', amount: 50, mix: 0.4 },
    masterFilter: { type: 'lowpass', cutoff: 20000, resonance: 1 },
    compressor: { enabled: true, threshold: -20, ratio: 8, knee: 5, attack: 0.001, release: 0.1, makeup: 7, sidechainSource: 0 },
    masterVolume: 0.9,
  },
  tracks: [
    { ...deepClone(INITIAL_TRACKS[0]), name: 'Hard Kick', params: { ...INITIAL_KICK_PARAMS, decay: 0.35, impact: 100, character: 85 }, patterns: [createPatternFromSequence([1,null,0.8,null,1,null,0.8,null,1,null,0.8,null,1,null,0.8,null], 'C2')], volume: 0.4, fxSends: { drive: 0.3, reverb: 0, delay: 0, sidechain: 0 } },
    { ...deepClone(INITIAL_TRACKS[1]), name: 'Noise Clap', params: { ...INITIAL_ARTIFICE_PARAMS, noise_level: 100, filter_mode: 'bp_bp_p', filter_cutoff: 2200, filter_res: 15, filter_spread: 24, ampEnv: { attack: 0.002, decay: 0.12, sustain: 0, release: 0.1 }, filterEnvAmount: 6000 }, type: 'artifice', patterns: [createPatternFromSequence([null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,null], 'C4')], fxSends: { reverb: 0.4, delay: 0.2, drive: 0.1, sidechain: 0 } },
    { ...deepClone(INITIAL_TRACKS[2]), name: 'Screech', params: { ...INITIAL_RUIN_PARAMS, pitch: 48, algorithm: 'distort_fold', timbre: 95, drive: 90, fold: 80, decay: 0.15, filter: { type: 'bandpass', cutoff: 1800, resonance: 9 } }, patterns: [createPatternFromSequence(Array(16).fill(null).map((_, i) => i % 4 === 3 ? 0.8 : null), 'F#3')], fxSends: { drive: 0.2, reverb: 0.3, delay: 0.5, sidechain: 0.5 } },
    { ...deepClone(INITIAL_TRACKS[3]), name: 'Scrap Metal', params: { ...INITIAL_HAT_PARAMS, tone: 6500, decay: 0.15, character: 100, spread: 3.5, filter: { type: 'bandpass', cutoff: 7000, resonance: 12 } }, type: 'hat', patterns: [createPatternFromSequence(Array(16).fill(null).map((_, i) => i % 2 !== 0 ? 0.7 : null), 'C5')], fxSends: { reverb: 0.2, delay: 0.4, drive: 0.1, sidechain: 0 } },
    { ...deepClone(INITIAL_TRACKS[4]), name: 'Sync Stab', params: { ...INITIAL_ARCANE_PARAMS, mode: 'hard_sync', osc1_shape: 90, osc2_pitch: 7, mod_amount: 70, fold: 15, ampEnv: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.1 } }, patternLength: 11, patterns: [createPatternFromSequence(Array(11).fill(null).map((_, i) => i % 3 === 0 ? 0.9 : null), 'A3')], fxSends: { delay: 0.6, reverb: 0.4, drive: 0, sidechain: 0.2 } },
    { ...deepClone(INITIAL_TRACKS[5]), volume: 0 },
    { ...deepClone(INITIAL_TRACKS[6]), volume: 0 },
    { ...deepClone(INITIAL_TRACKS[7]), volume: 0 },
  ]
};

export const polyrhythmicRitual: Preset = {
  name: "Polyrhythmic Ritual",
  bpm: 130,
  globalFxParams: {
    reverb: { decay: 4.5, mix: 0.4, preDelay: 0.015, preDelaySync: false, preDelayDivision: 1, damping: 2000 },
    delay: { time: 0.5, feedback: 0.68, mix: 0.5, timeSync: true, timeDivision: 0.375, tone: 3500 },
    drive: { amount: 15, tone: 6000, mix: 0.1 },
    character: { mode: 'saturate', amount: 30, mix: 0.2 },
    masterFilter: { type: 'lowpass', cutoff: 20000, resonance: 1 },
    compressor: { enabled: true, threshold: -22, ratio: 4, knee: 8, attack: 0.02, release: 0.35, makeup: 4, sidechainSource: 0 },
    masterVolume: 0.9,
  },
  tracks: [
    { ...deepClone(INITIAL_TRACKS[0]), name: 'Pounding Kick', params: { ...INITIAL_KICK_PARAMS, tune: 40, decay: 0.7, impact: 90 }, patterns: [createPatternFromSequence([1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null], 'C2')], volume: 0.5 },
    { ...deepClone(INITIAL_TRACKS[1]), name: 'Wood Block', params: { ...INITIAL_RESON_PARAMS, pitch: 72, structure: 80, brightness: 12000, decay: 0.9, material: 80, exciter_type: 'impulse', ampEnv: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.04 } }, type: 'reson', patternLength: 5, patterns: [createPatternFromSequence([0.8,null,0.7,null,null], 'C6')], fxSends: { delay: 0.8, reverb: 0.6, drive: 0, sidechain: 0 } },
    { ...deepClone(INITIAL_TRACKS[2]), name: 'Metal Pipe', params: { ...INITIAL_RESON_PARAMS, pitch: 65, structure: 20, brightness: 10000, decay: 0.98, material: 10, exciter_type: 'impulse', ampEnv: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.2 } }, type: 'reson', patternLength: 7, patterns: [createPatternFromSequence([null,null,0.9,null,null,null,0.8], 'A5')], fxSends: { delay: 0.7, reverb: 0.5, drive: 0.1, sidechain: 0 } },
    { ...deepClone(INITIAL_TRACKS[3]), name: 'Scanning Drone', params: { ...INITIAL_SHIFT_PARAMS, pitch: 36, table: 1, ampEnv: { attack: 1.0, decay: 2.0, sustain: 1.0, release: 2.0 }, filter: { type: 'lowpass', cutoff: 1200, resonance: 6 }, lfo1: { waveform: 'sine', rate: 0.05, rateSync: false, rateDivision: 1, depth: 1000, destination: 'shift.position', retrigger: false } }, type: 'shift', patterns: [createPatternFromSequence([0.7], 'C2', 0.7, 16)], fxSends: { reverb: 1.0, delay: 0.5, drive: 0, sidechain: 0.8 }, volume: 0.25 },
    { ...deepClone(INITIAL_TRACKS[4]), name: 'Sub Pulse', params: { ...INITIAL_RUIN_PARAMS, decay: 0.15, filter: { type: 'lowpass', cutoff: 250, resonance: 10 } }, patternLength: 16, patterns: [createPatternFromSequence([0.9,null,0.8,null,null,0.9,null,null,0.9,null,0.8,null,null,0.9,null,null], 'C1')], fxSends: { drive: 0, reverb: 0.1, delay: 0.2, sidechain: 0.9 }, volume: 0.4 },
    { ...deepClone(INITIAL_TRACKS[5]), volume: 0 },
    { ...deepClone(INITIAL_TRACKS[6]), volume: 0 },
    { ...deepClone(INITIAL_TRACKS[7]), volume: 0 },
  ]
};

export const ethericDub: Preset = {
    name: "Etheric Dub",
    bpm: 126,
    globalFxParams: {
        reverb: { decay: 9.0, mix: 0.6, preDelay: 0.03, preDelaySync: false, preDelayDivision: 1, damping: 1200 },
        delay: { time: 0.5, feedback: 0.92, mix: 0.45, timeSync: true, timeDivision: 0.75, tone: 3800 },
        drive: { amount: 10, tone: 7000, mix: 0.05 },
        character: { mode: 'tape', amount: 40, mix: 0.3 },
        masterFilter: { type: 'lowpass', cutoff: 20000, resonance: 1 },
        compressor: { enabled: true, threshold: -26, ratio: 5, knee: 20, attack: 0.05, release: 0.8, makeup: 6, sidechainSource: 0 },
        masterVolume: 0.9,
    },
    tracks: [
        { ...deepClone(INITIAL_TRACKS[0]), name: 'Dub Thump', params: { ...INITIAL_KICK_PARAMS, tune: 36, decay: 1.1, impact: 70, tone: 10, character: 15 }, patterns: [createPatternFromSequence([1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null], 'A1')], volume: 0.5 },
        { ...deepClone(INITIAL_TRACKS[1]), name: 'Rim Echo', params: { ...INITIAL_RESON_PARAMS, pitch: 70, structure: 90, brightness: 9000, decay: 0.95, material: 5, exciter_type: 'impulse', ampEnv: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.05 } }, type: 'reson', patterns: [createPatternFromSequence([null,null,null,null,0.8,null,null,null,null,null,null,null,0.8,null,null,null], 'A5')], fxSends: { delay: 0.9, reverb: 0.6, drive: 0, sidechain: 0 } },
        { ...deepClone(INITIAL_TRACKS[2]), name: 'Sub Roller', params: { ...INITIAL_RUIN_PARAMS, pitch: 34, algorithm: 'feedback_pm', timbre: 25, drive: 5, fold: 0, attack: 0.01, decay: 0.3 }, patternLength: 32, patterns: [createPatternFromSequence([0.9,null,0.8,null,null,null,null,null,0.9,null,null,0.8,null,null,null,null,0.9,null,0.8,null,null,null,null,null,0.9,null,0.8,null,null,null,null,null], 'F#1')], fxSends: { sidechain: 1.0, reverb: 0.2, drive: 0.1, delay: 0.3 }, volume: 0.4 },
        { ...deepClone(INITIAL_TRACKS[3]), name: 'Washed Chord', params: { ...INITIAL_ARTIFICE_PARAMS, osc1_shape: 20, osc2_shape: 80, osc2_pitch: 3, osc_mix: -15, filter_cutoff: 900, filter_res: 11, ampEnv: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.3 }, filterEnvAmount: 1500, filterEnv: { attack: 0.02, decay: 0.3, sustain: 0, release: 0.2} }, type: 'artifice', patterns: [(() => {
            const pattern = createPatternFromSequence(Array(16).fill(null).map((_, i) => [2, 10].includes(i) ? 0.7 : null), 'F#3');
            pattern[2].pLocks = { artificeParams: { filter_cutoff: 4000 } };
            pattern[10].pLocks = { artificeParams: { filter_cutoff: 600, filter_res: 15 } };
            return pattern;
        })()], fxSends: { delay: 0.8, reverb: 0.9, drive: 0, sidechain: 0.2 } },
        { ...deepClone(INITIAL_TRACKS[4]), name: 'Offbeat Hat', params: { ...INITIAL_HAT_PARAMS, decay: 0.15, character: 10 }, patterns: [createPatternFromSequence([null,null,0.7,null,null,null,0.7,null,null,null,0.7,null,null,null,0.7,null], 'C5')], fxSends: { delay: 0.7, reverb: 0.5, drive: 0, sidechain: 0 } },
        { ...deepClone(INITIAL_TRACKS[5]), name: 'Air Pad', params: { ...INITIAL_SHIFT_PARAMS, pitch: 48, table: 1, position: 20, ampEnv: { attack: 3.0, decay: 2.0, sustain: 1.0, release: 4.0 }, filter: { type: 'lowpass', cutoff: 500, resonance: 5 } }, type: 'shift', patterns: [createPatternFromSequence([0.6], 'F#2', 0.6, 16)], fxSends: { reverb: 1.0, delay: 0.8, drive: 0, sidechain: 0.1 }, volume: 0.15 },
        { ...deepClone(INITIAL_TRACKS[6]), volume: 0 },
        { ...deepClone(INITIAL_TRACKS[7]), volume: 0 },
    ]
};

export const machineCult: Preset = {
    name: "Machine Cult",
    bpm: 138,
    globalFxParams: {
        reverb: { decay: 2.5, mix: 0.25, preDelay: 0.01, preDelaySync: false, preDelayDivision: 1, damping: 2500 },
        delay: { time: 0.5, feedback: 0.68, mix: 0.35, timeSync: true, timeDivision: 0.375, tone: 4000 },
        drive: { amount: 65, tone: 3500, mix: 0.3 },
        character: { mode: 'overdrive', amount: 60, mix: 0.5 },
        masterFilter: { type: 'lowpass', cutoff: 20000, resonance: 1 },
        compressor: { enabled: true, threshold: -18, ratio: 12, knee: 10, attack: 0.001, release: 0.08, makeup: 8, sidechainSource: 0 },
        masterVolume: 0.9,
    },
    tracks: (() => {
        const tracks = deepClone(INITIAL_TRACKS);

        const kickPattern = createPatternFromSequence([1,null,null,0.7,0.95,null,1,null,1,null,null,0.6,0.9,null,1,0.5], 'C2');
        const ridePattern = createPatternFromSequence([null,null,0.8,0.5,null,null,0.8,0.6,null,null,0.8,0.5,null,null,0.8,0.7], 'C5');
        const grinderPattern = createPatternFromSequence([0.9,0.7,null,0.8,0.9,0.7,null,0.8,0.9,0.7,null,0.8,0.9,0.7,null,1.0], 'G#2');
        // FIX: Completed FilterParams object in pLocks to satisfy TypeScript
        grinderPattern[15].pLocks = { ruinParams: { filter: { type: 'lowpass', cutoff: 3500, resonance: 8 } } };
        const clangPattern = createPatternFromSequence(Array(13).fill(null).map((_, i) => { if (i === 2) return 0.9; if (i === 6) return 0.7; if (i === 10) return 1.0; return null; }), 'D#5');
        const stabPattern = createPatternFromSequence(Array(16).fill(null), 'C4');
        stabPattern[3].active = true; stabPattern[3].notes = ['A#3']; stabPattern[3].velocity = 0.8;
        stabPattern[7].active = true; stabPattern[7].notes = ['C4']; stabPattern[7].velocity = 1.0;
        stabPattern[13].active = true; stabPattern[13].notes = ['G3']; stabPattern[13].velocity = 0.9;
        const metalPattern = createPatternFromSequence(Array(16).fill(null).map((_,i) => i === 9 ? 0.8 : null), 'C6');

        tracks[0] = {
            ...tracks[0], name: 'MC - Slam Kick', loadedInstrumentPresetName: 'MC - Slam Kick',
            params: { tune: 44, decay: 0.25, impact: 100, character: 95, tone: 60, ampEnv: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 }, filter: { type: 'lowpass', cutoff: 16000, resonance: 2 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO },
            patterns: [kickPattern, ...createEmptyPatterns().slice(1)], volume: 0.45,
            fxSends: { drive: 0.4, reverb: 0.1, delay: 0, sidechain: 0 }
        };
        tracks[1] = {
            ...tracks[1], name: 'MC - 909 Ride', loadedInstrumentPresetName: 'MC - 909 Ride', type: 'hat',
            params: { tone: 6000, decay: 0.7, character: 100, spread: 1.2, ampEnv: { attack: 0.001, decay: 0.7, sustain: 0, release: 0.4 }, filter: { type: 'bandpass', cutoff: 7500, resonance: 15 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO },
            patterns: [ridePattern, ...createEmptyPatterns().slice(1)], fxSends: { reverb: 0.3, delay: 0.5, drive: 0.1, sidechain: 0 }
        };
        tracks[2] = {
            ...tracks[2], name: 'MC - Grinder Bass', loadedInstrumentPresetName: 'MC - Grinder Bass', type: 'ruin',
            params: { pitch: 48, algorithm: 'overload', timbre: 80, drive: 100, fold: 75, attack: 0.002, decay: 0.1, filter: { type: 'lowpass', cutoff: 1500, resonance: 8 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO },
            patterns: [grinderPattern, ...createEmptyPatterns().slice(1)], fxSends: { drive: 0.2, reverb: 0.2, delay: 0.3, sidechain: 0.8 }
        };
        tracks[3] = {
            ...tracks[3], name: 'MC - FM Clang', loadedInstrumentPresetName: 'MC - FM Clang', type: 'alloy',
            params: { pitch: 62, ratio: 2.8, feedback: 80, mod_level: 80, mod_attack: 0.001, mod_decay: 0.07, ampEnv: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.08 }, filter: { type: 'bandpass', cutoff: 2000, resonance: 6 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO },
            patternLength: 13, patterns: [clangPattern, ...createEmptyPatterns().slice(1)],
            fxSends: { delay: 0.7, reverb: 0.5, drive: 0.1, sidechain: 0.1 }
        };
        tracks[4] = {
            ...tracks[4], name: 'MC - Noise Sweep', loadedInstrumentPresetName: 'MC - Noise Sweep', type: 'artifice',
            params: { ...INITIAL_ARTIFICE_PARAMS, noise_level: 100, filter_mode: 'bp_bp_p', filter_cutoff: 1000, filter_res: 20, ampEnv: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.3 }, filterEnvAmount: 0, lfo1: { waveform: 'sawtooth', rate: 0.1, rateSync: false, rateDivision: 1, depth: 1000, destination: 'artifice.filter_cutoff', retrigger: false } },
            patterns: [createPatternFromSequence([0.8], 'C4', 0.8, 16), ...createEmptyPatterns().slice(1)],
            fxSends: { reverb: 0.4, delay: 0.5, drive: 0, sidechain: 0.5 }, volume: 0.22
        };
        tracks[5] = {
            ...tracks[5], name: 'MC - Acidic Stab', loadedInstrumentPresetName: 'MC - Acidic Stab', type: 'arcane',
            params: { osc1_shape: 85, osc2_shape: 15, osc2_pitch: 12, osc2_fine: 5, mode: 'hard_sync', mod_amount: 55, fold: 0, spread: 10, ampEnv: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.1 }, filter: { type: 'lowpass', cutoff: 1800, resonance: 14 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO },
            patterns: [stabPattern, ...createEmptyPatterns().slice(1)],
            fxSends: { reverb: 0.3, delay: 0.6, drive: 0, sidechain: 0.3 }, volume: 0.35
        };
        tracks[6] = {
            ...tracks[6], name: 'MC - Metal Hit', loadedInstrumentPresetName: 'MC - Metal Hit', type: 'reson',
            params: { pitch: 69, structure: 15, brightness: 14000, decay: 0.985, material: 5, exciter_type: 'impulse', ampEnv: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.15 }, filter: { type: 'lowpass', cutoff: 18000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO },
            patterns: [metalPattern, ...createEmptyPatterns().slice(1)],
            fxSends: { reverb: 0.5, delay: 0.4, drive: 0.1, sidechain: 0.1 }, volume: 0.3
        };
        tracks[7].volume = 0;

        return tracks;
    })(),
};

export const fractalGateway: Preset = {
  name: "Fractal Gateway",
  bpm: 135,
  globalFxParams: {
    reverb: { decay: 6, mix: 0.4, preDelay: 0.02, preDelaySync: false, preDelayDivision: 1, damping: 3000 },
    delay: { time: 0.5, feedback: 0.72, mix: 0.45, timeSync: true, timeDivision: 0.375, tone: 3800 },
    drive: { amount: 25, tone: 6000, mix: 0.15 },
    character: { mode: 'saturate', amount: 30, mix: 0.2 },
    masterFilter: { type: 'lowpass', cutoff: 20000, resonance: 1 },
    compressor: { enabled: true, threshold: -21, ratio: 5, knee: 12, attack: 0.015, release: 0.4, makeup: 5, sidechainSource: 0 },
    masterVolume: 0.9,
  },
  tracks: [
    { ...deepClone(INITIAL_TRACKS[0]), name: 'Psy Kick', params: { ...INITIAL_KICK_PARAMS, tune: 42, decay: 0.3, impact: 95, tone: 85, character: 20 }, patterns: [createPatternFromSequence([1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null], 'C2')], volume: 0.48 },
    { ...deepClone(INITIAL_TRACKS[1]), name: 'Psy Bass', params: { ...INITIAL_RUIN_PARAMS, pitch: 30, algorithm: 'distort_fold', timbre: 65, drive: 75, fold: 40, decay: 0.08, filter: { type: 'lowpass', cutoff: 600, resonance: 7 } }, patterns: [createPatternFromSequence([null,0.9,0.8,0.9,null,0.9,0.8,0.9,null,0.9,0.8,0.9,null,0.9,0.8,0.9], 'F#1')], fxSends: { sidechain: 1.0, drive: 0.1, reverb: 0.2, delay: 0.3 }, volume: 0.38 },
    { ...deepClone(INITIAL_TRACKS[2]), name: 'Warp Stab', params: { ...INITIAL_SHIFT_PARAMS, pitch: 54, table: 3, position: 20, bend: 80, twist: 75, ampEnv: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.15 }, filter: { type: 'bandpass', cutoff: 2500, resonance: 9 } }, type: 'shift', patterns: [createPatternFromSequence(Array(16).fill(null).map((_, i) => i % 4 === 2 ? 0.8 : null), 'F#3')], fxSends: { delay: 0.8, reverb: 0.6, drive: 0, sidechain: 0.1 } },
    { ...deepClone(INITIAL_TRACKS[3]), name: 'FM Sequence', params: { ...INITIAL_ALLOY_PARAMS, pitch: 66, ratio: 1.5, mod_decay: 0.06 }, type: 'alloy', patterns: [(() => {
        const pattern = createPatternFromSequence(Array(16).fill(null).map((_, i) => i % 2 !== 0 ? 0.7 : null), 'F#4');
        pattern[3].notes = ['G#4'];
        pattern[7].notes = ['A#4'];
        pattern[11].notes = ['G#4'];
        pattern[15].notes = ['C#5'];
        return pattern;
    })()], fxSends: { delay: 0.7, reverb: 0.5, drive: 0, sidechain: 0.1 } },
    { ...deepClone(INITIAL_TRACKS[4]), name: 'Alien Chat', params: { ...INITIAL_RESON_PARAMS, pitch: 78, structure: 5, brightness: 16000, decay: 0.85, material: 15, exciter_type: 'impulse', ampEnv: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.03 } }, type: 'reson', patterns: [createPatternFromSequence(Array(16).fill(null).map((_, i) => [6,13].includes(i) ? 0.8 : null), 'F#6')], fxSends: { delay: 0.9, reverb: 0.8, drive: 0, sidechain: 0 } },
    { ...deepClone(INITIAL_TRACKS[5]), volume: 0 },
    { ...deepClone(INITIAL_TRACKS[6]), volume: 0 },
    { ...deepClone(INITIAL_TRACKS[7]), volume: 0 },
  ]
};

export const quantumEntanglement: Preset = {
  name: "Quantum Entanglement",
  bpm: 136,
  globalFxParams: {
    reverb: { decay: 7, mix: 0.45, preDelay: 0.025, preDelaySync: false, preDelayDivision: 1, damping: 2200 },
    delay: { time: 0.5, feedback: 0.7, mix: 0.35, timeSync: true, timeDivision: 0.75, tone: 3000 },
    drive: { amount: 10, tone: 8000, mix: 0.1 },
    character: { mode: 'tape', amount: 25, mix: 0.2 },
    masterFilter: { type: 'lowpass', cutoff: 20000, resonance: 1 },
    compressor: { enabled: true, threshold: -23, ratio: 4.5, knee: 10, attack: 0.02, release: 0.5, makeup: 4, sidechainSource: 0 },
    masterVolume: 0.9,
  },
  tracks: [
    { ...deepClone(INITIAL_TRACKS[0]), name: 'Quantum Kick', params: { ...INITIAL_KICK_PARAMS, tune: 41, decay: 0.4, impact: 92 }, patterns: [createPatternFromSequence([1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null], 'C2')], volume: 0.45 },
    { ...deepClone(INITIAL_TRACKS[1]), name: 'Phase Hat', params: { ...INITIAL_HAT_PARAMS, character: 85, filter: { type: 'notch', cutoff: 5000, resonance: 15 } }, patterns: [createPatternFromSequence(Array(16).fill(null).map((_, i) => i % 2 !== 0 ? 0.7 : null), 'C5')], fxSends: { delay: 0.6, reverb: 0.4, drive: 0, sidechain: 0 } },
    { ...deepClone(INITIAL_TRACKS[2]), name: 'Arp Sequence', params: { ...INITIAL_ARCANE_PARAMS, mode: 'pm', fold: 0, ampEnv: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.08 }, filter: { type: 'lowpass', cutoff: 2500, resonance: 8 } }, patterns: [(() => {
        const pattern = createPatternFromSequence(Array(16).fill(0.8), 'G3');
        const notes = ['G3', 'A#3', 'D4', 'G3', 'D4', 'F4', 'A#3', 'G3'];
        pattern.forEach((step, i) => { if(step.active) step.notes = [notes[i % notes.length]]; });
        return pattern;
    })()], fxSends: { delay: 0.7, reverb: 0.5, drive: 0, sidechain: 0.3 }, volume: 0.3 },
    { ...deepClone(INITIAL_TRACKS[3]), name: 'Atmo Drone', params: { ...INITIAL_SHIFT_PARAMS, pitch: 31, ampEnv: { attack: 4.0, decay: 2.0, sustain: 1.0, release: 4.0 }, filter: { type: 'lowpass', cutoff: 400, resonance: 7 }, lfo1: { waveform: 'sine', rate: 0.03, rateSync: false, rateDivision: 1, depth: 1000, destination: 'shift.position', retrigger: false } }, type: 'shift', patterns: [createPatternFromSequence([0.6], 'G1', 0.6, 16)], fxSends: { reverb: 1.0, delay: 0.7, drive: 0, sidechain: 0.9 }, volume: 0.2 },
    { ...deepClone(INITIAL_TRACKS[4]), name: 'Bleep', params: { ...INITIAL_ALLOY_PARAMS, pitch: 79, ratio: 1.5, mod_decay: 0.05 }, type: 'alloy', patterns: [createPatternFromSequence(Array(16).fill(null).map((_, i) => i === 11 ? 0.9 : null), 'G6')], fxSends: { delay: 0.8, reverb: 0.7, drive: 0, sidechain: 0 } },
    { ...deepClone(INITIAL_TRACKS[5]), volume: 0 },
    { ...deepClone(INITIAL_TRACKS[6]), volume: 0 },
    { ...deepClone(INITIAL_TRACKS[7]), volume: 0 },
  ]
};