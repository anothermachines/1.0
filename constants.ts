import { Track, StepState, FilterType, KickParams, HatParams, ArcaneParams, RuinParams, ArtificeParams, ShiftParams, ResonParams, AlloyParams, LFOParams, Envelope, FXSends, MidiOutParams } from './types';

const PATTERNS_PER_TRACK = 8;
const STEPS = 64; // Max steps increased

const createEmptySteps = (): StepState[] => Array(STEPS).fill(null).map(() => ({ 
    active: false, 
    pLocks: null,
    notes: [],
    velocity: 1.0,
    duration: 1, // Default note duration of 1 step
    condition: { type: 'always' }
}));

export const createEmptyPatterns = (): StepState[][] => {
    return Array(PATTERNS_PER_TRACK).fill(null).map(() => createEmptySteps());
};

export const NEUTRAL_LFO: LFOParams = {
    waveform: 'triangle',
    rate: 1,
    rateSync: false,
    rateDivision: 1,
    depth: 0,
    destination: 'none',
    retrigger: false,
};

const NEUTRAL_FILTER: FilterType = 'lowpass';

// --- Initial Instrument Parameters (Tuned for Techno) ---

export const INITIAL_KICK_PARAMS: KickParams = {
    tune: 40,
    decay: 0.4,
    impact: 80,
    tone: 50,
    character: 60,
    ampEnv: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 },
    filter: { type: NEUTRAL_FILTER, cutoff: 20000, resonance: 1 },
    lfo1: NEUTRAL_LFO,
    lfo2: NEUTRAL_LFO,
};

export const INITIAL_HAT_PARAMS: HatParams = {
    tone: 9000,
    decay: 0.08,
    character: 40,
    spread: 1.5,
    ampEnv: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
    filter: { type: 'highpass', cutoff: 8000, resonance: 1 },
    lfo1: NEUTRAL_LFO,
    lfo2: NEUTRAL_LFO,
};

export const INITIAL_ARCANE_PARAMS: ArcaneParams = {
    osc1_shape: 50,
    osc2_shape: 75,
    osc2_pitch: 7,
    osc2_fine: 5,
    mode: 'pm',
    mod_amount: 30,
    fold: 20,
    spread: 10,
    ampEnv: { attack: 0.01, decay: 0.4, sustain: 0.2, release: 0.3 },
    filter: { type: 'lowpass', cutoff: 5000, resonance: 4 },
    lfo1: NEUTRAL_LFO,
    lfo2: NEUTRAL_LFO,
};

export const INITIAL_RUIN_PARAMS: RuinParams = {
    pitch: 36,
    algorithm: 'distort_fold',
    timbre: 50,
    drive: 40,
    fold: 60,
    attack: 0.005,
    decay: 0.35,
    filter: { type: 'lowpass', cutoff: 800, resonance: 6 },
    lfo1: NEUTRAL_LFO,
    lfo2: NEUTRAL_LFO,
};

export const INITIAL_ARTIFICE_PARAMS: ArtificeParams = {
    osc1_shape: 50,
    osc2_shape: 25,
    osc2_pitch: 0,
    osc2_fine: -3,
    fm_amount: 0,
    osc_mix: 0,
    noise_level: 5,
    ampEnv: { attack: 0.005, decay: 0.5, sustain: 0, release: 0.3 },
    filterEnv: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.2 },
    filterEnvAmount: 6000,
    filter_mode: 'lp_hp_p',
    filter_cutoff: 4000,
    filter_res: 5,
    filter_spread: -12,
    lfo1: NEUTRAL_LFO,
    lfo2: NEUTRAL_LFO,
};

export const INITIAL_SHIFT_PARAMS: ShiftParams = {
    pitch: 48,
    table: 2,
    position: 0,
    bend: 20,
    twist: 0,
    ampEnv: { attack: 0.01, decay: 0.8, sustain: 0.5, release: 0.6 },
    filter: { type: 'bandpass', cutoff: 3000, resonance: 4 },
    lfo1: NEUTRAL_LFO,
    lfo2: NEUTRAL_LFO,
};

export const INITIAL_RESON_PARAMS: ResonParams = {
    pitch: 60,
    structure: 20,
    brightness: 8000,
    decay: 0.98,
    material: 50,
    exciter_type: 'noise',
    ampEnv: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.5 },
    filter: { type: 'lowpass', cutoff: 15000, resonance: 1 },
    lfo1: NEUTRAL_LFO,
    lfo2: NEUTRAL_LFO,
};

export const INITIAL_ALLOY_PARAMS: AlloyParams = {
    pitch: 60,
    ratio: 1.5,
    feedback: 10,
    mod_level: 60,
    mod_attack: 0.001,
    mod_decay: 0.15,
    ampEnv: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.2 },
    filter: { type: 'highpass', cutoff: 200, resonance: 1 },
    lfo1: NEUTRAL_LFO,
    lfo2: NEUTRAL_LFO,
};

export const INITIAL_MIDI_OUT_PARAMS: MidiOutParams = {
    deviceId: null,
    channel: 1,
};

const INITIAL_FX_SENDS: FXSends = { 
    reverb: 0, delay: 0, drive: 0,
    sidechain: 0
};


export const INITIAL_TRACKS: Track[] = [
  {
    id: 0,
    name: 'Kick',
    type: 'kick',
    params: INITIAL_KICK_PARAMS,
    fxSends: { ...INITIAL_FX_SENDS, reverb: 0.1, drive: 0.2 },
    volume: 0.201, // -14dB
    pan: 0,
    patternLength: 16,
    defaultNote: 'C2',
    patterns: createEmptyPatterns(),
    activePatternIndex: 0,
    automation: {},
    loadedInstrumentPresetName: null,
  },
  {
    id: 1,
    name: 'Hat',
    type: 'hat',
    params: INITIAL_HAT_PARAMS,
    fxSends: { ...INITIAL_FX_SENDS, reverb: 0.1, delay: 0.3 },
    volume: 0.250, // -12dB
    pan: 0,
    patternLength: 16,
    defaultNote: 'C5',
    patterns: createEmptyPatterns(),
    activePatternIndex: 0,
    automation: {},
    loadedInstrumentPresetName: null,
  },
  {
    id: 2,
    name: 'Ruin',
    type: 'ruin',
    params: INITIAL_RUIN_PARAMS,
    fxSends: { ...INITIAL_FX_SENDS, drive: 0.1, sidechain: 0.8 },
    volume: 0.176, // -15.1dB
    pan: 0,
    patternLength: 16,
    defaultNote: 'C2',
    patterns: createEmptyPatterns(),
    activePatternIndex: 0,
    automation: {},
    loadedInstrumentPresetName: null,
  },
  {
    id: 3,
    name: 'Alloy',
    type: 'alloy',
    params: INITIAL_ALLOY_PARAMS,
    fxSends: { ...INITIAL_FX_SENDS, reverb: 0.4, delay: 0.5 },
    volume: 0.126, // -18dB
    pan: 0,
    patternLength: 16,
    defaultNote: 'C5',
    patterns: createEmptyPatterns(),
    activePatternIndex: 0,
    automation: {},
    loadedInstrumentPresetName: null,
  },
  {
    id: 4,
    name: 'Arcane',
    type: 'arcane',
    params: INITIAL_ARCANE_PARAMS,
    fxSends: { ...INITIAL_FX_SENDS, reverb: 0.3, delay: 0.4 },
    volume: 0.151, // -16.4dB
    pan: 0,
    patternLength: 16,
    defaultNote: 'C3',
    patterns: createEmptyPatterns(),
    activePatternIndex: 0,
    automation: {},
    loadedInstrumentPresetName: null,
  },
  {
    id: 5,
    name: 'Shift',
    type: 'shift',
    params: INITIAL_SHIFT_PARAMS,
    fxSends: { ...INITIAL_FX_SENDS, reverb: 0.2, delay: 0.4, drive: 0.3 },
    volume: 0.140, // -17.1dB
    pan: 0,
    patternLength: 16,
    defaultNote: 'C4',
    patterns: createEmptyPatterns(),
    activePatternIndex: 0,
    automation: {},
    loadedInstrumentPresetName: null,
  },
  {
    id: 6,
    name: 'Artifice',
    type: 'artifice',
    params: INITIAL_ARTIFICE_PARAMS,
    fxSends: { ...INITIAL_FX_SENDS, reverb: 0.5, delay: 0.5, sidechain: 0.5 },
    volume: 0.140, // -17.1dB
    pan: 0,
    patternLength: 16,
    defaultNote: 'C4',
    patterns: createEmptyPatterns(),
    activePatternIndex: 0,
    automation: {},
    loadedInstrumentPresetName: null,
  },
  {
    id: 7,
    name: 'MIDI Out',
    type: 'midi',
    params: {},
    midiOut: INITIAL_MIDI_OUT_PARAMS,
    fxSends: { ...INITIAL_FX_SENDS },
    volume: 0.707, // Unity gain
    pan: 0,
    patternLength: 16,
    defaultNote: 'C4',
    patterns: createEmptyPatterns(),
    activePatternIndex: 0,
    automation: {},
    loadedInstrumentPresetName: null,
  },
];

export const TIME_DIVISIONS = [
    { name: '1/64', value: 0.0625 },
    { name: '1/32', value: 0.125 },
    { name: '1/16', value: 0.25 },
    { name: '1/8', value: 0.5 },
    { name: '1/4', value: 1 },
    { name: '1/2', value: 2 },
    { name: '1 bar', value: 4 },
    { name: '1/16T', value: 0.25 * (2/3) },
    { name: '1/8T', value: 0.5 * (2/3) },
    { name: '1/4T', value: 1 * (2/3) },
    { name: '1/16D', value: 0.25 * 1.5 },
    { name: '1/8D', value: 0.75 },
    { name: '1/4D', value: 1.5 },
];