import { Preset, Track, StepState } from './types';
import { INITIAL_TRACKS, createEmptyPatterns, NEUTRAL_LFO } from './constants';
import { deepClone, createPatternFromSequence } from './utils';
import { TECHNO_PRESET_LIBRARY } from './store/technoPresetLibrary';

const BLANK_FX_PARAMS = {
    reverb: { decay: 1.5, mix: 0, preDelay: 0.01, preDelaySync: false, preDelayDivision: 1, damping: 8000 },
    delay: { time: 0.5, feedback: 0.45, mix: 0, timeSync: true, timeDivision: 0.75, tone: 5000 },
    drive: { amount: 0, tone: 8000, mix: 0 },
    character: { mode: 'saturate' as const, amount: 0, mix: 0 },
    masterFilter: { type: 'lowpass' as const, cutoff: 20000, resonance: 1 },
    compressor: { enabled: false, threshold: -20, ratio: 4, knee: 10, attack: 0.003, release: 0.25, makeup: 0, sidechainSource: null },
    masterVolume: 0.707,
};

export const DEMO_DEFAULT_PROJECT: Preset = {
    name: "Blank Project",
    bpm: 120,
    tracks: deepClone(INITIAL_TRACKS),
    globalFxParams: deepClone(BLANK_FX_PARAMS),
    arrangementClips: [],
};

export const LICENSED_DEFAULT_PROJECT: Preset = {
    name: "New Project",
    bpm: 138,
    tracks: deepClone(INITIAL_TRACKS),
    globalFxParams: {
        reverb: { decay: 2.5, mix: 0.15, preDelay: 0.02, preDelaySync: false, preDelayDivision: 1, damping: 4000 },
        delay: { time: 0.5, feedback: 0.5, mix: 0.2, timeSync: true, timeDivision: 0.75, tone: 4000 },
        drive: { amount: 20, tone: 6000, mix: 0.1 },
        character: { mode: 'saturate' as const, amount: 10, mix: 0.2 },
        masterFilter: { type: 'lowpass' as const, cutoff: 20000, resonance: 1 },
        compressor: { enabled: true, threshold: -18, ratio: 4, knee: 5, attack: 0.01, release: 0.15, makeup: 2, sidechainSource: 0 },
        masterVolume: 0.891, // -1dB
    },
    arrangementClips: [],
};


// --- LEVEL UP PROJECT (REWORKED) ---
const concreteKick = TECHNO_PRESET_LIBRARY.kick.find(p => p.name === 'DHT - Concrete Kick')!.params;
const tight909 = TECHNO_PRESET_LIBRARY.hat.find(p => p.name === 'DHT - Tight 909')!.params;
const subStab = TECHNO_PRESET_LIBRARY.ruin.find(p => p.name === 'DHT - Sub Stab')!.params;
const warehouseStab = TECHNO_PRESET_LIBRARY.arcane.find(p => p.name === 'DHT - Warehouse Stab')!.params;
const rustedHat = TECHNO_PRESET_LIBRARY.hat.find(p => p.name === 'DHT - Rusted Hat')!.params;
const hollowDrone = TECHNO_PRESET_LIBRARY.arcane.find(p => p.name === 'DHT - Hollow Drone')!.params;

// --- PATTERNS for REWORKED LEVEL UP ---

const levelUpKickPattern = createEmptyPatterns()[0];
[0, 4, 8, 12].forEach(i => levelUpKickPattern[i] = { active: true, pLocks: null, notes: ['C2'], velocity: 1.0, duration: 1, condition: { type: 'always' } });
levelUpKickPattern[14] = { active: true, pLocks: { kickParams: { decay: 0.2, impact: 80 } }, notes: ['C2'], velocity: 0.6, duration: 1, condition: { type: 'always' } };

const levelUpHatPattern = createEmptyPatterns()[0];
[2, 4, 6].forEach((i, idx) => levelUpHatPattern[i] = { active: true, pLocks: null, notes: ['C5'], velocity: [0.8, 0.7, 0.6][idx], duration: 1, condition: { type: 'always' } });

const levelUpBassPattern = createEmptyPatterns()[0];
[3, 7, 11, 15].forEach((i, idx) => {
    levelUpBassPattern[i] = { active: true, pLocks: null, notes: ['F1'], velocity: [0.9, 0.8, 0.9, 0.75][idx], duration: 1, condition: { type: 'always' } };
});
levelUpBassPattern[7].pLocks = { ruinParams: { filter: { type: 'lowpass', cutoff: 650, resonance: 12 } } };
levelUpBassPattern[15].pLocks = { ruinParams: { filter: { type: 'lowpass', cutoff: 450, resonance: 15 } } };


const levelUpStabPattern = createEmptyPatterns()[0];
[6, 14].forEach((i, idx) => {
    levelUpStabPattern[i] = { active: true, pLocks: null, notes: ['A#3'], velocity: [0.8, 0.7][idx], duration: 1, condition: { type: 'always' } };
});
levelUpStabPattern[14].pLocks = { fxSends: { delay: 1.0 } };


const levelUpPercPattern = createEmptyPatterns()[0];
[1, 3, 5, 7, 9].forEach((i, idx) => levelUpPercPattern[i] = { active: true, pLocks: null, notes: ['A#5'], velocity: [0.7,0.6,0.7,0.5,0.65][idx], duration: 1, condition: { type: 'always' } });
levelUpPercPattern[5].pLocks = { pan: -0.5 };
levelUpPercPattern[9].pLocks = { pan: 0.5 };


const levelUpArpPattern = createEmptyPatterns()[0];
[0, 3, 7, 10].forEach((i, idx) => {
    levelUpArpPattern[i] = { active: true, pLocks: { arcaneParams: { osc2_pitch: [12, 19, 24, 31][idx] } }, notes: ['A2'], velocity: 0.75, duration: 1, condition: { type: 'always' } };
});

export const LEVEL_UP_PROJECT: Preset = {
    name: "Level Up",
    bpm: 135,
    tracks: [
        { 
            ...deepClone(INITIAL_TRACKS[0]),
            id: 0, name: 'Kick', type: 'kick',
            params: concreteKick, loadedInstrumentPresetName: 'DHT - Concrete Kick',
            patterns: [ levelUpKickPattern ],
            volume: 0.891, fxSends: { drive: 0.1, reverb: 0.1, delay: 0, sidechain: 0 },
        },
        {
            ...deepClone(INITIAL_TRACKS[1]),
            id: 1, name: 'Hat', type: 'hat',
            params: {...tight909, ampEnv: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.04 }}, loadedInstrumentPresetName: 'DHT - Tight 909',
            patternLength: 7,
            patterns: [ levelUpHatPattern ],
            volume: 0.447, pan: 0.1, fxSends: { reverb: 0.3, delay: 0.5, drive: 0, sidechain: 0 },
        },
        {
            ...deepClone(INITIAL_TRACKS[2]),
            id: 2, name: 'Bass', type: 'ruin',
            params: {...subStab, decay: 0.14}, loadedInstrumentPresetName: 'DHT - Sub Stab',
            patterns: [ levelUpBassPattern ],
            volume: 0.562, fxSends: { drive: 0.2, sidechain: 0.8, reverb: 0.1, delay: 0.2 },
        },
        {
            ...deepClone(INITIAL_TRACKS[4]),
            id: 3, name: 'Stab', type: 'arcane',
            params: {...warehouseStab, ampEnv: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 }}, loadedInstrumentPresetName: 'DHT - Warehouse Stab',
            patternLength: 15,
            patterns: [ levelUpStabPattern ],
            volume: 0.398, fxSends: { delay: 0.8, reverb: 0.6, drive: 0, sidechain: 0.3 },
        },
        {
            ...deepClone(INITIAL_TRACKS[1]),
            id: 4, name: 'Perc', type: 'hat',
            params: {...rustedHat, ampEnv: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.03 }}, loadedInstrumentPresetName: 'DHT - Rusted Hat',
            patternLength: 11,
            patterns: [ levelUpPercPattern ],
            volume: 0.355, pan: -0.2, fxSends: { delay: 0.6, reverb: 0.4, drive: 0.1, sidechain: 0.1 },
        },
        {
            ...deepClone(INITIAL_TRACKS[4]),
            id: 5, name: 'Arp', type: 'arcane',
            params: {...hollowDrone, ampEnv: { attack: 0.002, decay: 0.1, sustain: 0, release: 0.08 }}, loadedInstrumentPresetName: 'DHT - Hollow Drone',
            patternLength: 13,
            patterns: [ levelUpArpPattern ],
            volume: 0.316, fxSends: { delay: 0.7, reverb: 0.7, drive: 0, sidechain: 0.7 },
        },
        { ...deepClone(INITIAL_TRACKS[6]), id: 6, volume: 0 },
        { ...deepClone(INITIAL_TRACKS[7]), id: 7, volume: 0 },
    ],
    globalFxParams: {
        reverb: { decay: 4.5, mix: 0.35, preDelay: 0.01, preDelaySync: false, preDelayDivision: 1, damping: 3200 },
        delay: { time: 0.5, feedback: 0.6, mix: 0.45, timeSync: true, timeDivision: 0.75, tone: 4500 }, // 1/8D
        drive: { amount: 30, tone: 5000, mix: 0.1 },
        character: { mode: 'saturate', amount: 20, mix: 0.25 },
        masterFilter: { type: 'lowpass', cutoff: 20000, resonance: 1 },
        compressor: { enabled: true, threshold: -19, ratio: 4, knee: 8, attack: 0.008, release: 0.2, makeup: 5, sidechainSource: 0 },
        masterVolume: 0.794, // -2dB
    },
    arrangementClips: [],
};
