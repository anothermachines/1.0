// FIX: Removed incorrect import of 'Preset' which was causing a circular dependency.
// The 'Preset' interface is defined in this file.

export interface Envelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';
export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch';

export interface FilterParams {
  type: FilterType;
  cutoff: number;
  resonance: number;
}

export type LFOWaveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

// --- Granular LFO Destinations ---
type GenericLFODestination = 'none' | 'volume' | 'pan' | 'filter.cutoff' | 'filter.resonance';

type KickLFODestination = 'kick.tune' | 'kick.impact' | 'kick.tone' | 'kick.character';
type HatLFODestination = 'hat.tone' | 'hat.character' | 'hat.spread';

// --- NEW ENGINE LFO DESTINATIONS ---

type ArcaneLFODestination =
  | 'arcane.osc2_pitch' | 'arcane.mod_amount' | 'arcane.fold' | 'arcane.spread'
  | 'arcane.osc1_shape' | 'arcane.osc2_shape';

type RuinLFODestination =
  | 'ruin.pitch' | 'ruin.timbre' | 'ruin.drive' | 'ruin.fold' | 'ruin.decay';

type ArtificeLFODestination =
  | 'artifice.osc1_shape' | 'artifice.osc2_shape' | 'artifice.osc2_pitch'
  | 'artifice.fm_amount' | 'artifice.osc_mix' | 'artifice.noise_level'
  | 'artifice.filter_cutoff' | 'artifice.filter_res' | 'artifice.filter_spread'
  | 'artifice.filterEnvAmount';

type ShiftLFODestination =
  | 'shift.pitch' | 'shift.position' | 'shift.bend' | 'shift.twist';

type ResonLFODestination =
  | 'reson.pitch' | 'reson.structure' | 'reson.brightness' | 'reson.decay' | 'reson.material';

type AlloyLFODestination =
  | 'alloy.pitch' | 'alloy.ratio' | 'alloy.feedback' | 'alloy.mod_level' | 'alloy.mod_decay';


export type LFODestination =
  | GenericLFODestination
  | KickLFODestination
  | HatLFODestination
  | ArcaneLFODestination
  | RuinLFODestination
  | ArtificeLFODestination
  | ShiftLFODestination
  | ResonLFODestination
  | AlloyLFODestination;


export interface LFOParams {
    waveform: LFOWaveform;
    rate: number;
    rateSync: boolean;
    rateDivision: number;
    depth: number;
    destination: LFODestination;
    retrigger: boolean;
}


// --- Instrument Parameter Types ---

export interface KickParams {
    tune: number;
    decay: number;
    impact: number;
    tone: number;
    character: number;
    ampEnv: Envelope;
    filter: FilterParams;
    lfo1: LFOParams;
    lfo2: LFOParams;
}

export interface HatParams {
    tone: number;
    decay: number;
    character: number;
    spread: number;
    ampEnv: Envelope;
    filter: FilterParams;
    lfo1: LFOParams;
    lfo2: LFOParams;
}

// --- NEW ENGINES ---

export interface ArcaneParams {
    osc1_shape: number;
    osc2_shape: number;
    osc2_pitch: number;
    osc2_fine: number;
    mode: 'pm' | 'add' | 'ring' | 'hard_sync';
    mod_amount: number;
    fold: number;
    spread: number;
    ampEnv: Envelope;
    filter: FilterParams;
    lfo1: LFOParams;
    lfo2: LFOParams;
}

export interface RuinParams {
    pitch: number;
    algorithm: 'feedback_pm' | 'distort_fold' | 'overload';
    timbre: number;
    drive: number;
    fold: number;
    attack: number;
    decay: number;
    filter: FilterParams;
    lfo1: LFOParams;
    lfo2: LFOParams;
}

export interface ArtificeParams {
    osc1_shape: number;
    osc2_shape: number;
    osc2_pitch: number;
    osc2_fine: number;
    fm_amount: number;
    osc_mix: number;
    noise_level: number;
    ampEnv: Envelope;
    filterEnv: Envelope;
    filterEnvAmount: number;
    filter_mode: 'lp_hp_p' | 'lp_hp_s' | 'bp_bp_p';
    filter_cutoff: number;
    filter_res: number;
    filter_spread: number;
    lfo1: LFOParams;
    lfo2: LFOParams;
}

export interface ShiftParams {
    pitch: number;
    table: number; // index
    position: number;
    bend: number;
    twist: number;
    ampEnv: Envelope;
    filter: FilterParams;
    lfo1: LFOParams;
    lfo2: LFOParams;
}

export interface ResonParams {
    pitch: number;
    structure: number;
    brightness: number;
    decay: number;
    material: number;
    exciter_type: 'noise' | 'impulse';
    ampEnv: Envelope;
    filter: FilterParams;
    lfo1: LFOParams;
    lfo2: LFOParams;
}

export interface AlloyParams {
    pitch: number;
    ratio: number;
    feedback: number;
    mod_level: number;
    mod_attack: number;
    mod_decay: number;
    ampEnv: Envelope;
    filter: FilterParams;
    lfo1: LFOParams;
    lfo2: LFOParams;
}

export interface MidiOutParams {
    deviceId: string | null;
    channel: number; // 1-16
}


export interface FXSends {
  reverb: number;
  delay: number;
  drive: number;
  sidechain: number;
}

export type AllInstrumentParams = KickParams | HatParams | ArcaneParams | RuinParams | ArtificeParams | ShiftParams | ResonParams | AlloyParams | {};

export type PLocks = {
  kickParams?: Partial<KickParams>;
  hatParams?: Partial<HatParams>;
  arcaneParams?: Partial<ArcaneParams>;
  ruinParams?: Partial<RuinParams>;
  artificeParams?: Partial<ArtificeParams>;
  shiftParams?: Partial<ShiftParams>;
  resonParams?: Partial<ResonParams>;
  alloyParams?: Partial<AlloyParams>;
  midiOutParams?: Partial<MidiOutParams>;
  volume?: number;
  pan?: number;
  fxSends?: Partial<FXSends>;
  ccLocks?: { id: string; cc: number; value: number }[];
};

export type TrigConditionType = 
  | 'always'
  | 'probability'
  | 'a:b'
  | 'fill'
  | '!fill'
  | 'pre'
  | '!pre'
  | 'first'
  | '!first';

export interface TrigCondition {
  type: TrigConditionType;
  p?: number; // for probability (0-100)
  a?: number; // for a:b
  b?: number; // for a:b
}

export interface StepState {
  active: boolean;
  pLocks: PLocks | null;
  notes: string[];
  velocity: number; // 0 to 1
  timingOffset?: number; // -0.5 to 0.5 of a step
  duration: number; // In steps
  condition?: TrigCondition;
}

export type TrackType = 'kick' | 'hat' | 'arcane' | 'ruin' | 'artifice' | 'shift' | 'reson' | 'alloy' | 'midi';

export interface AutomationPoint {
    time: number; // Time relative to loop start
    value: number;
}

export type AutomationData = {
    [paramPath: string]: AutomationPoint[];
};

export interface Track {
  id: number;
  name: string;
  type: TrackType;
  params: AllInstrumentParams;
  midiOut?: MidiOutParams;
  fxSends: FXSends;
  volume: number;
  pan: number;
  patternLength: number;
  defaultNote: string;
  patterns: StepState[][];
  activePatternIndex: number;
  automation: AutomationData;
  loadedInstrumentPresetName?: string | null;
}

export interface ReverbParams {
  decay: number;
  mix: number;
  preDelay: number;
  preDelaySync: boolean;
  preDelayDivision: number;
  damping: number; // For reverb tail brightness
}

export interface DelayParams {
  time: number;
  feedback: number;
  mix: number;
  timeSync: boolean;
  timeDivision: number;
  tone: number; // For feedback filter
}

export interface DriveParams {
  amount: number;
  tone: number;
  mix: number;
}

export interface MasterFilterParams {
  type: 'lowpass' | 'highpass';
  cutoff: number;
  resonance: number;
}

export interface CompressorParams {
  enabled: boolean;
  threshold: number;
  ratio: number;
  knee: number;
  attack: number;
  release: number;
  makeup: number;
  sidechainSource: number | null;
}

export interface CharacterParams {
    mode: 'saturate' | 'overdrive' | 'bitcrush' | 'fold';
    amount: number;
    mix: number;
}

export interface GlobalFXParams {
  reverb: ReverbParams;
  delay: DelayParams;
  drive: DriveParams;
  character: CharacterParams;
  masterFilter: MasterFilterParams;
  compressor: CompressorParams;
  masterVolume: number;
}

export interface ArrangementClip {
  id: string;
  trackId: number;
  startTime: number; // in beats
  duration: number; // in beats
  type: 'pattern' | 'audio';
  patternIndex?: number; // for pattern clips
  waveformData?: [number, number][]; // for audio clips
}

export interface Preset {
    name: string;
    bpm: number;
    tracks: Track[];
    globalFxParams: GlobalFXParams;
    arrangementClips?: ArrangementClip[];
    version?: string; // For project versioning
}

export interface InstrumentPreset {
    name: string;
    type: TrackType;
    params: AllInstrumentParams;
}

export interface ExpansionPack {
    id: string;
    name: string;
    description: string;
    artist: string;
    projects: Preset[];
    instruments: InstrumentPreset[];
    coverArt?: string;
    gumroadUrl?: string;
}

// --- MIDI Types ---

export type MidiMessage = {
    type: 'noteon' | 'noteoff' | 'cc';
    channel: number;
    key: number; // Note number or CC number
};

export type MidiMapTarget = {
    path: string;
    label: string;
    type: 'knob' | 'button';
    range?: { min: number; max: number };
    step?: number;
};

export type MidiMapping = {
    message: MidiMessage;
    target: MidiMapTarget;
};
export type MainView = 'pattern' | 'song';

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

export type LatencySetting = 'interactive' | 'balanced' | 'playback';
export type UiPerformanceMode = 'high' | 'performance' | 'off';

export interface FullBackup {
    version: string;
    presets: Preset[];
    instrumentPresets: InstrumentPreset[];
    installedPacks: string[];
    appearanceTheme: string;
    accentTheme: string;
    midiMappings: MidiMapping[];
    midiSyncSource?: string | null;
    midiSyncOutput?: string | null;
}