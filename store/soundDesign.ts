import { InstrumentPreset, LFOParams } from '../types';

const NEUTRAL_LFO: LFOParams = { waveform: 'triangle', rate: 1, depth: 0, destination: 'none', rateSync: false, rateDivision: 1, retrigger: false };

const createPreset = (type: any, name: string, params: any): InstrumentPreset => ({ type, name, params });

// --- KICK DESIGN (20 PRESETS) ---
export const generateKickPresets = (): InstrumentPreset[] => [
    createPreset('kick', 'Techno Punch', { tune: 45, decay: 0.35, impact: 95, tone: 80, character: 25, ampEnv: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.15 }, filter: { type: 'lowpass', cutoff: 18000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', 'Hard Slam', { tune: 48, decay: 0.4, impact: 100, tone: 70, character: 60, ampEnv: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 }, filter: { type: 'lowpass', cutoff: 16000, resonance: 2 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', 'Sub Rumble', { tune: 38, decay: 1.5, impact: 80, tone: 20, character: 40, ampEnv: { attack: 0.002, decay: 1.5, sustain: 0, release: 0.8 }, filter: { type: 'lowpass', cutoff: 200, resonance: 5 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', 'Distorted Core', { tune: 42, decay: 0.5, impact: 98, tone: 40, character: 90, ampEnv: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.2 }, filter: { type: 'lowpass', cutoff: 14000, resonance: 3 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', '909 Classic', { tune: 46, decay: 0.42, impact: 92, tone: 78, character: 15, ampEnv: { attack: 0.001, decay: 0.42, sustain: 0, release: 0.18 }, filter: { type: 'lowpass', cutoff: 20000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', 'Short Tick', { tune: 55, decay: 0.15, impact: 85, tone: 90, character: 5, ampEnv: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 }, filter: { type: 'lowpass', cutoff: 20000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', 'Warehouse Boom', { tune: 40, decay: 0.8, impact: 90, tone: 50, character: 75, ampEnv: { attack: 0.001, decay: 0.8, sustain: 0, release: 0.4 }, filter: { type: 'lowpass', cutoff: 10000, resonance: 4 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', '808 Deep', { tune: 36, decay: 1.2, impact: 70, tone: 40, character: 10, ampEnv: { attack: 0.001, decay: 1.2, sustain: 0, release: 0.5 }, filter: { type: 'lowpass', cutoff: 5000, resonance: 2 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', 'Filtered Click', { tune: 60, decay: 0.2, impact: 70, tone: 100, character: 0, ampEnv: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }, filter: { type: 'lowpass', cutoff: 800, resonance: 8 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', 'Industrial Hit', { tune: 50, decay: 0.3, impact: 100, tone: 50, character: 100, ampEnv: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 }, filter: { type: 'lowpass', cutoff: 20000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', 'Gabber Zap', { tune: 65, decay: 0.25, impact: 100, tone: 100, character: 80, ampEnv: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 }, filter: { type: 'lowpass', cutoff: 20000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', 'Tight & Fast', { tune: 49, decay: 0.22, impact: 90, tone: 70, character: 10, ampEnv: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.1 }, filter: { type: 'lowpass', cutoff: 19000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', 'Hypno Sub', { tune: 35, decay: 2.2, impact: 75, tone: 10, character: 20, ampEnv: { attack: 0.005, decay: 2.2, sustain: 0, release: 1.2 }, filter: { type: 'lowpass', cutoff: 150, resonance: 6 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', 'Resonant Thump', { tune: 43, decay: 0.5, impact: 88, tone: 60, character: 30, ampEnv: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.2 }, filter: { type: 'lowpass', cutoff: 400, resonance: 10 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', 'Blown Cone', { tune: 40, decay: 0.6, impact: 95, tone: 20, character: 95, ampEnv: { attack: 0.001, decay: 0.6, sustain: 0, release: 0.3 }, filter: { type: 'lowpass', cutoff: 9000, resonance: 2 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', 'Minimal Pop', { tune: 52, decay: 0.18, impact: 80, tone: 85, character: 0, ampEnv: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.08 }, filter: { type: 'lowpass', cutoff: 20000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', 'Tape Saturated', { tune: 44, decay: 0.55, impact: 90, tone: 55, character: 65, ampEnv: { attack: 0.001, decay: 0.55, sustain: 0, release: 0.25 }, filter: { type: 'lowpass', cutoff: 17000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', 'Aggressive', { tune: 50, decay: 0.3, impact: 100, tone: 90, character: 70, ampEnv: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 }, filter: { type: 'lowpass', cutoff: 20000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', 'Low Room', { tune: 39, decay: 0.9, impact: 85, tone: 30, character: 20, ampEnv: { attack: 0.001, decay: 0.9, sustain: 0, release: 0.5 }, filter: { type: 'lowpass', cutoff: 6000, resonance: 3 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('kick', 'Pushed Mids', { tune: 47, decay: 0.4, impact: 93, tone: 70, character: 45, ampEnv: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 }, filter: { type: 'bandpass', cutoff: 1500, resonance: 2 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
];

// --- HAT DESIGN (20 PRESETS) ---
export const generateHatPresets = (): InstrumentPreset[] => [
    createPreset('hat', '909 Closed', { tone: 9500, decay: 0.04, character: 80, spread: 1.8, ampEnv: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.03 }, filter: { type: 'highpass', cutoff: 7000, resonance: 1.5 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', '909 Open', { tone: 9500, decay: 0.4, character: 80, spread: 1.8, ampEnv: { attack: 0.002, decay: 0.4, sustain: 0, release: 0.1 }, filter: { type: 'highpass', cutoff: 7000, resonance: 1.5 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'Crispy Tick', { tone: 11000, decay: 0.02, character: 70, spread: 2.2, ampEnv: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.02 }, filter: { type: 'highpass', cutoff: 9000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'Metallic Ping', { tone: 7000, decay: 0.1, character: 100, spread: 1.1, ampEnv: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.08 }, filter: { type: 'bandpass', cutoff: 8000, resonance: 10 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'Gritty Sizzle', { tone: 8000, decay: 0.15, character: 90, spread: 3.0, ampEnv: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 }, filter: { type: 'highpass', cutoff: 5000, resonance: 3 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'Long Ssssh', { tone: 12000, decay: 0.7, character: 60, spread: 1.5, ampEnv: { attack: 0.01, decay: 0.7, sustain: 0, release: 0.2 }, filter: { type: 'highpass', cutoff: 9000, resonance: 2 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'Rider', { tone: 10000, decay: 0.25, character: 40, spread: 2.5, ampEnv: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.08 }, filter: { type: 'highpass', cutoff: 8500, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'Ticky', { tone: 13000, decay: 0.03, character: 20, spread: 1.3, ampEnv: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.03 }, filter: { type: 'highpass', cutoff: 10000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'Filtered Noise', { tone: 6000, decay: 0.08, character: 50, spread: 4.0, ampEnv: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 }, filter: { type: 'lowpass', cutoff: 12000, resonance: 4 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'Short & Sweet', { tone: 10500, decay: 0.015, character: 30, spread: 1.4, ampEnv: { attack: 0.001, decay: 0.015, sustain: 0, release: 0.015 }, filter: { type: 'highpass', cutoff: 9500, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'Industrial CH', { tone: 5000, decay: 0.05, character: 95, spread: 1.0, ampEnv: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.04 }, filter: { type: 'bandpass', cutoff: 6000, resonance: 12 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'Industrial OH', { tone: 5000, decay: 0.3, character: 95, spread: 1.0, ampEnv: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 }, filter: { type: 'bandpass', cutoff: 6000, resonance: 12 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'Bright Shaker', { tone: 11500, decay: 0.09, character: 10, spread: 2.8, ampEnv: { attack: 0.005, decay: 0.09, sustain: 0, release: 0.06 }, filter: { type: 'highpass', cutoff: 9000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'Phasey', { tone: 8800, decay: 0.12, character: 85, spread: 1.05, ampEnv: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.1 }, filter: { type: 'notch', cutoff: 5000, resonance: 15 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'Soft Open', { tone: 9000, decay: 0.6, character: 20, spread: 2.0, ampEnv: { attack: 0.01, decay: 0.6, sustain: 0, release: 0.2 }, filter: { type: 'highpass', cutoff: 7000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'Trashy', { tone: 7500, decay: 0.2, character: 100, spread: 3.5, ampEnv: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }, filter: { type: 'highpass', cutoff: 4000, resonance: 5 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'Dark Ride', { tone: 4000, decay: 0.5, character: 80, spread: 1.2, ampEnv: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.2 }, filter: { type: 'bandpass', cutoff: 5000, resonance: 9 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'Digital Tss', { tone: 14000, decay: 0.05, character: 0, spread: 1.0, ampEnv: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.04 }, filter: { type: 'highpass', cutoff: 11000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'Resonant Sizzle', { tone: 9000, decay: 0.2, character: 70, spread: 2.0, ampEnv: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }, filter: { type: 'highpass', cutoff: 8000, resonance: 6 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'Fast Decay', { tone: 9800, decay: 0.01, character: 50, spread: 1.9, ampEnv: { attack: 0.001, decay: 0.01, sustain: 0, release: 0.01 }, filter: { type: 'highpass', cutoff: 9000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
];

const createSynthParams = (type: 'arcane' | 'ruin' | 'artifice' | 'shift' | 'reson' | 'alloy', overrides: any) => {
    let baseParams;
    switch (type) {
        case 'arcane': baseParams = { osc1_shape: 50, osc2_shape: 75, osc2_pitch: 7, osc2_fine: 5, mode: 'pm', mod_amount: 30, fold: 20, spread: 10, ampEnv: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }, filter: { type: 'lowpass', cutoff: 5000, resonance: 4 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }; break;
        case 'ruin': baseParams = { pitch: 36, algorithm: 'distort_fold', timbre: 50, drive: 40, fold: 60, attack: 0.005, decay: 0.2, filter: { type: 'lowpass', cutoff: 800, resonance: 6 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }; break;
        case 'artifice': baseParams = { osc1_shape: 50, osc2_shape: 25, osc2_pitch: 0, osc2_fine: -3, fm_amount: 0, osc_mix: 0, noise_level: 5, ampEnv: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }, filterEnv: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.2 }, filterEnvAmount: 6000, filter_mode: 'lp_hp_p', filter_cutoff: 4000, filter_res: 5, filter_spread: -12, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }; break;
        case 'shift': baseParams = { pitch: 48, table: 2, position: 0, bend: 20, twist: 0, ampEnv: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }, filter: { type: 'bandpass', cutoff: 3000, resonance: 4 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }; break;
        case 'reson': baseParams = { pitch: 60, structure: 20, brightness: 8000, decay: 0.95, material: 50, exciter_type: 'noise', ampEnv: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }, filter: { type: 'lowpass', cutoff: 15000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }; break;
        case 'alloy': baseParams = { pitch: 60, ratio: 1.5, feedback: 10, mod_level: 60, mod_attack: 0.001, mod_decay: 0.1, ampEnv: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }, filter: { type: 'highpass', cutoff: 200, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }; break;
        default: baseParams = {};
    }
    // A simple deep merge
    return JSON.parse(JSON.stringify({ ...baseParams, ...overrides }));
};

// --- SYNTH PRESETS (20 EACH) ---
export const generateArcanePresets = (): InstrumentPreset[] => Array.from({ length: 20 }, (_, i) => createPreset('arcane', `Arcane Stab ${i + 1}`, createSynthParams('arcane', { mod_amount: 10 + i * 4, fold: i * 5, osc2_pitch: [0,7,12,19,-12][i%5], mode: ['pm','ring','hard_sync'][i%3] })));
export const generateRuinPresets = (): InstrumentPreset[] => Array.from({ length: 20 }, (_, i) => createPreset('ruin', `Ruin Perc ${i + 1}`, createSynthParams('ruin', { drive: 30 + i * 3.5, fold: 20 + i*4, timbre: i*5, algorithm: ['distort_fold', 'feedback_pm', 'overload'][i%3] })));
export const generateArtificePresets = (): InstrumentPreset[] => Array.from({ length: 20 }, (_, i) => createPreset('artifice', `Artifice Hit ${i + 1}`, createSynthParams('artifice', { fm_amount: i * 5, noise_level: i*2, filter_res: 1 + i*0.5, filter_mode: ['lp_hp_p','lp_hp_s','bp_bp_p'][i%3] })));
export const generateShiftPresets = (): InstrumentPreset[] => Array.from({ length: 20 }, (_, i) => createPreset('shift', `Shift Pluck ${i + 1}`, createSynthParams('shift', { table: i % 4, position: i * 5, bend: 10 + i * 4, twist: i * 3 })));
export const generateResonPresets = (): InstrumentPreset[] => Array.from({ length: 20 }, (_, i) => createPreset('reson', `Reson Ping ${i + 1}`, createSynthParams('reson', { structure: i * 5, brightness: 2000 + i * 600, material: i * 5, exciter_type: i % 2 === 0 ? 'noise' : 'impulse' })));
export const generateAlloyPresets = (): InstrumentPreset[] => Array.from({ length: 20 }, (_, i) => createPreset('alloy', `Alloy Bell ${i + 1}`, createSynthParams('alloy', { ratio: 0.5 + i * 0.2, feedback: i * 4, mod_level: 20 + i * 4, mod_decay: 0.05 + i*0.01 })));
