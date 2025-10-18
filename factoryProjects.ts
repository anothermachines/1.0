import { Preset } from './types';
import { deepClone } from './utils';
import { INITIAL_TRACKS } from './constants';

/**
 * The default project for users in "viewer" or "demo" mode.
 * The UI will lock tracks with ID >= 3.
 */
export const DEMO_DEFAULT_PROJECT: Preset = {
  name: "Blank Project",
  bpm: 120,
  tracks: deepClone(INITIAL_TRACKS),
  globalFxParams: {
    reverb: { decay: 1.5, mix: 0.2, preDelay: 0.01, preDelaySync: false, preDelayDivision: 1, damping: 6000 },
    delay: { time: 0.5, feedback: 0.45, mix: 0.3, timeSync: true, timeDivision: 0.75, tone: 4000 },
    drive: { amount: 10, tone: 8000, mix: 0.1 },
    character: { mode: 'tape', amount: 20, mix: 0.15 },
    masterFilter: { type: 'lowpass', cutoff: 20000, resonance: 1 },
    compressor: { enabled: true, threshold: -18, ratio: 4, knee: 10, attack: 0.003, release: 0.25, makeup: 4, sidechainSource: null },
    masterVolume: 0.9,
  },
  arrangementClips: [],
};

/**
 * The default project for users with a valid license (full version).
 */
export const LICENSED_DEFAULT_PROJECT: Preset = {
  name: "New Project",
  bpm: 120,
  tracks: deepClone(INITIAL_TRACKS),
  globalFxParams: {
    reverb: { decay: 1.5, mix: 0.2, preDelay: 0.01, preDelaySync: false, preDelayDivision: 1, damping: 6000 },
    delay: { time: 0.5, feedback: 0.45, mix: 0.3, timeSync: true, timeDivision: 0.75, tone: 4000 },
    drive: { amount: 10, tone: 8000, mix: 0.1 },
    character: { mode: 'tape', amount: 20, mix: 0.15 },
    masterFilter: { type: 'lowpass', cutoff: 20000, resonance: 1 },
    compressor: { enabled: true, threshold: -18, ratio: 4, knee: 10, attack: 0.003, release: 0.25, makeup: 4, sidechainSource: null },
    masterVolume: 0.9,
  },
  arrangementClips: [],
};

/**
 * A more feature-rich project to show off capabilities.
 * Included in the initial factory preset library.
 */
export const LEVEL_UP_PROJECT: Preset = {
    name: "Level Up",
    bpm: 128,
    tracks: deepClone(INITIAL_TRACKS).map((track, i) => {
        if (i === 0) { // Kick
            track.patterns[0][0] = { active: true, notes: ['C2'], velocity: 1, duration: 1, pLocks: null, condition: { type: 'always' } };
            track.patterns[0][4] = { active: true, notes: ['C2'], velocity: 1, duration: 1, pLocks: null, condition: { type: 'always' } };
            track.patterns[0][8] = { active: true, notes: ['C2'], velocity: 1, duration: 1, pLocks: null, condition: { type: 'always' } };
            track.patterns[0][12] = { active: true, notes: ['C2'], velocity: 1, duration: 1, pLocks: null, condition: { type: 'always' } };
            track.fxSends.drive = 0.2;
        }
        if (i === 1) { // Hat
            track.patterns[0][2] = { active: true, notes: ['C5'], velocity: 0.8, duration: 1, pLocks: null, condition: { type: 'always' } };
            track.patterns[0][6] = { active: true, notes: ['C5'], velocity: 0.8, duration: 1, pLocks: null, condition: { type: 'always' } };
            track.patterns[0][10] = { active: true, notes: ['C5'], velocity: 0.8, duration: 1, pLocks: null, condition: { type: 'always' } };
            track.patterns[0][14] = { active: true, notes: ['C5'], velocity: 0.8, duration: 1, pLocks: null, condition: { type: 'always' } };
            track.fxSends.reverb = 0.2;
        }
        if (i === 2) { // Ruin (Bass)
            track.patterns[0][0] = { active: true, notes: ['C2'], velocity: 0.9, duration: 1, pLocks: null, condition: { type: 'always' } };
            track.patterns[0][6] = { active: true, notes: ['D#2'], velocity: 0.8, duration: 1, pLocks: null, condition: { type: 'always' } };
            track.patterns[0][8] = { active: true, notes: ['C2'], velocity: 0.9, duration: 1, pLocks: null, condition: { type: 'always' } };
            track.patterns[0][14] = { active: true, notes: ['D#2'], velocity: 0.8, duration: 1, pLocks: null, condition: { type: 'always' } };
            track.fxSends.sidechain = 1.0;
        }
        return track;
    }),
    globalFxParams: {
        reverb: { decay: 2.5, mix: 0.3, preDelay: 0.02, preDelaySync: false, preDelayDivision: 1, damping: 4000 },
        delay: { time: 0.5, feedback: 0.6, mix: 0.35, timeSync: true, timeDivision: 0.75, tone: 3500 },
        drive: { amount: 30, tone: 7000, mix: 0.15 },
        character: { mode: 'saturate', amount: 35, mix: 0.2 },
        masterFilter: { type: 'lowpass', cutoff: 20000, resonance: 1.2 },
        compressor: { enabled: true, threshold: -20, ratio: 5, knee: 8, attack: 0.005, release: 0.18, makeup: 5, sidechainSource: 0 },
        masterVolume: 0.85,
    },
    arrangementClips: [],
};
