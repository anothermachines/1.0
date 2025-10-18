import { ExpansionPack, Preset, InstrumentPreset, StepState, Track } from './types';
import { deepClone } from './utils';
import { INITIAL_TRACKS, createEmptyPatterns, NEUTRAL_LFO } from './constants';
import { LICENSED_DEFAULT_PROJECT } from './factoryProjects';
import { TECHNO_PRESET_LIBRARY } from './store/technoPresetLibrary';

// --- HELPERS ---
const createPreset = (type: InstrumentPreset['type'], name: string, params: any): InstrumentPreset => ({ type, name, params });
const createEmptySteps = (length = 64) => Array(length).fill(null).map(() => ({ active: false, pLocks: null, notes: [], velocity: 1.0, duration: 1, condition: { type: 'always'} as const }));
const createPatternFromSequence = (sequence: (number|null)[], note = 'C4', vel = 0.8, len = 1): StepState[] => {
    const pattern = createEmptySteps(64);
    sequence.forEach((s, i) => {
        if (s !== null && i < 64) {
            pattern[i] = { active: true, pLocks: null, notes: [note], velocity: s, duration: len, condition: { type: 'always' } };
        }
    });
    return pattern;
};

// --- ====================================================================== ---
// ---                            COVER ART (SVGs)                            ---
// --- ====================================================================== ---

const TESNArt = `
<svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="tesn-bg" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#1a1a1a" />
            <stop offset="100%" stop-color="#000000" />
        </linearGradient>
        <filter id="tesn-glow-filter">
            <feGaussianBlur stdDeviation="4" result="blur"/>
        </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#tesn-bg)"/>
    
    <g transform="translate(200 200)" fill="none" stroke="#E53935">
        <g style="animation: tesn-rotate 20s linear infinite; transform-origin: center;">
            <path d="M 0 -150 L 130 75 L -130 75 Z" opacity="0.2" stroke-width="1" />
            <path d="M 0 -130 L 112.5 65 L -112.5 65 Z" stroke-width="3" style="filter: url(#tesn-glow-filter); stroke-linecap: round;"/>
        </g>
        <g style="animation: tesn-rotate 25s linear infinite reverse; transform-origin: center;">
             <path d="M 0 120 L -103.9 -60 L 103.9 -60 Z" opacity="0.15" stroke-width="0.5"/>
             <path d="M 0 100 L -86.6 -50 L 86.6 -50 Z" stroke-width="1.5" />
        </g>
    </g>
    
    <g transform="translate(200 215)" text-anchor="middle" font-family="Roboto Mono, monospace" fill="#ECEFF4" style="filter: url(#tesn-glow-filter);">
      <text font-size="80" font-weight="bold" letter-spacing="-0.1em" stroke="#000" stroke-width="4" stroke-opacity="0.5">TESN</text>
      <text font-size="80" font-weight="bold" letter-spacing="-0.1em">TESN</text>
    </g>

    <filter id='tesn-grain'>
        <feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/>
        <feComponentTransfer>
            <feFuncA type="linear" slope="0.08" />
        </feComponentTransfer>
    </filter>
    <rect width='100%' height='100%' filter='url(#tesn-grain)' style="pointer-events: none" />
    
    <style>
      @keyframes tesn-rotate { 
        from { transform: rotate(0deg); } 
        to { transform: rotate(360deg); } 
      }
    </style>
</svg>
`;

const MainframePulseArt = `
<svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="mp-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#02040f" />
            <stop offset="100%" stop-color="#0a1942" />
        </linearGradient>
        <filter id="mp-glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
        <mask id="mp-scan-mask">
            <rect width="400" height="400" fill="white"/>
            <rect id="mp-scan-bar" width="400" height="80" fill="black"/>
        </mask>
    </defs>
    <style>
      @keyframes mp-pulse { 0%, 100% { transform: scale(1); stroke-opacity: 1; } 50% { transform: scale(1.03); stroke-opacity: 0.7; } }
      @keyframes mp-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes mp-scan-anim { 0% { y: -80px; } 50% { y: 400px; } 100% { y: -80px; } }
      #mp-scan-bar { animation: mp-scan-anim 5s ease-in-out infinite; }
    </style>
    <rect width="100%" height="100%" fill="url(#mp-bg)"/>
    <g mask="url(#mp-scan-mask)" opacity="0.3">
        <g transform="translate(200 200)" stroke="#00d8ff" fill="none">
            <circle cx="0" cy="0" r="180" stroke-width="0.5"/>
            <circle cx="0" cy="0" r="100" stroke-width="0.5"/>
            <path d="M-180,0 H180 M0,-180 V180" stroke-width="0.25"/>
            <path d="M-127,-127 L127,127 M-127,127 L127,-127" stroke-width="0.25"/>
        </g>
    </g>
    <g transform="translate(200 200)" stroke="#00d8ff" fill="none" filter="url(#mp-glow)">
        <path d="M-100,-100 H100 V100 H-100Z" stroke-width="1.5"/>
        <g style="animation: mp-rotate 20s linear infinite;">
            <path d="M-120,-120 H-80 V-80 H-120Z M80,80 H120 V120 H80Z" stroke-width="1"/>
        </g>
        <circle cx="0" cy="0" r="40" stroke-width="2" style="transform-origin: center; animation: mp-pulse 3s ease-in-out infinite;"/>
    </g>
    <g transform="translate(200 320)" text-anchor="middle" font-family="Roboto Mono, monospace" fill="#fff">
        <text font-size="28" letter-spacing="0.1em" style="text-shadow: 0 0 10px #00d8ff;">MAINFRAME PULSE</text>
    </g>
</svg>
`;

const RubbleAndRustArt = `
<svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <filter id="rr-noise" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch"/>
            <feDiffuseLighting in="turbulence" lighting-color="#4d3b34" surfaceScale="2">
                <feDistantLight azimuth="45" elevation="30"/>
            </feDiffuseLighting>
            <feComposite in="SourceGraphic" in2="diffuseLighting" operator="in"/>
        </filter>
        <linearGradient id="rr-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#3d2b24" />
            <stop offset="100%" stop-color="#1c110d" />
        </linearGradient>
    </defs>
    <style>
      @keyframes rr-flicker {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 1; }
      }
    </style>
    <rect width="100%" height="100%" fill="url(#rr-bg)"/>
    <rect width="100%" height="100%" filter="url(#rr-noise)" opacity="0.6"/>
    <g transform="translate(200 210)" text-anchor="middle" font-family="Roboto Mono, monospace" fill="#d8dee9">
        <text font-size="44" font-weight="bold" letter-spacing="-0.05em" style="text-shadow: 2px 2px 8px #000; animation: rr-flicker 5s infinite;">RUBBLE & RUST</text>
        <path d="M-120 40 L120 40 M-100 55 L100 55" stroke="#bf616a" stroke-width="2" stroke-linecap="round" opacity="0.7" />
    </g>
</svg>
`;

const HypnoticStateArt = `
<svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <radialGradient id="hs-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#3d1d4f" />
            <stop offset="100%" stop-color="#11071a" />
        </radialGradient>
        <filter id="hs-glow">
            <feGaussianBlur stdDeviation="6" result="blur"/>
        </filter>
        <filter id="hs-turbulence">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.5" numOctaves="2" seed="5">
             <animate attributeName="baseFrequency" dur="20s" values="0.02 0.5;0.02 0.55;0.02 0.5" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="5" />
        </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#hs-bg)"/>
    <g transform="translate(200 200)" stroke-width="1.5" fill="none" opacity="0.6" filter="url(#hs-turbulence)">
        <circle cx="0" cy="0" r="140" stroke="#f91880" stroke-dasharray="1 15" style="animation: spin 60s linear infinite; transform-origin: center;"/>
        <circle cx="0" cy="0" r="120" stroke="#c037ff" stroke-dasharray="30 5" style="animation: spin 45s linear infinite reverse; transform-origin: center;"/>
        <circle cx="0" cy="0" r="100" stroke="#f91880" style="animation: spin 30s linear infinite;"/>
        <circle cx="0" cy="0" r="80" stroke="#c037ff" stroke-dasharray="8 8" style="animation: spin 20s linear infinite reverse;"/>
    </g>
    <g transform="translate(200 200)" text-anchor="middle" font-family="Roboto Mono, monospace" fill="#fff" filter="url(#hs-glow)">
      <text font-size="28" letter-spacing="0.1em" y="-10">HYPNOTIC</text>
      <text font-size="28" letter-spacing="0.1em" y="20">STATE</text>
    </g>
    <style>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }</style>
</svg>
`;

// --- ====================================================================== ---
// ---                           EXPANSION 0: TESN                            ---
// --- ====================================================================== ---
const TESN_INSTRUMENTS: InstrumentPreset[] = [
    createPreset('kick', 'TESN - Pressure Kick', { tune: 42, decay: 0.6, impact: 100, tone: 35, character: 88, ampEnv: { attack: 0.001, decay: 0.6, sustain: 0, release: 0.2 }, filter: { type: 'lowpass', cutoff: 15000, resonance: 2.5 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'TESN - Ticking Hat', { tone: 10000, decay: 0.025, character: 90, spread: 1.1, ampEnv: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.02 }, filter: { type: 'bandpass', cutoff: 9000, resonance: 11 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('ruin', 'TESN - Tension Bass', { pitch: 36, algorithm: 'overload', timbre: 75, drive: 92, fold: 65, attack: 0.001, decay: 0.2, filter: { type: 'lowpass', cutoff: 850, resonance: 7 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('artifice', 'TESN - Noise Clap', { osc1_shape: 0, osc2_shape: 0, osc2_pitch: 0, osc2_fine: 0, fm_amount: 0, osc_mix: 0, noise_level: 100, ampEnv: { attack: 0.002, decay: 0.1, sustain: 0, release: 0.08 }, filterEnv: { attack: 0.001, decay: 0.09, sustain: 0, release: 0.1 }, filterEnvAmount: 7000, filter_mode: 'bp_bp_p', filter_cutoff: 2000, filter_res: 18, filter_spread: 30, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('alloy', 'TESN - Warning Bell', { pitch: 70, ratio: 1.77, feedback: 88, mod_level: 95, mod_attack: 0.001, mod_decay: 0.09, ampEnv: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.1 }, filter: { type: 'notch', cutoff: 3500, resonance: 9 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('reson', 'TESN - Rebar Hit', { pitch: 58, structure: 98, brightness: 11000, decay: 0.97, material: 2, exciter_type: 'impulse', ampEnv: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.1 }, filter: { type: 'bandpass', cutoff: 5500, resonance: 8 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('shift', 'TESN - Gliding Saw', { pitch: 48, table: 0, position: 0, bend: 30, twist: 10, ampEnv: { attack: 0.08, decay: 0.5, sustain: 0.8, release: 0.4 }, filter: { type: 'lowpass', cutoff: 4200, resonance: 5 }, lfo1: { waveform: 'sine', rate: 5, rateSync: false, rateDivision: 1, depth: 80, destination: 'shift.pitch', retrigger: false }, lfo2: NEUTRAL_LFO }),
    createPreset('artifice', 'TESN - Industrial Drone', { osc1_shape: 50, osc2_shape: 50, osc2_pitch: 12, osc2_fine: 0, fm_amount: 20, osc_mix: 0, noise_level: 70, ampEnv: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }, filterEnv: { attack: 0.4, decay: 0.8, sustain: 0, release: 0.5 }, filterEnvAmount: 4000, filter_mode: 'lp_hp_p', filter_cutoff: 1000, filter_res: 12, filter_spread: 48, lfo1: { waveform: 'triangle', rate: 0.1, rateSync: false, rateDivision: 1, depth: 1200, destination: 'artifice.filter_spread', retrigger: false }, lfo2: NEUTRAL_LFO }),
];

const TESN_PROJECTS: Preset[] = [
    {
        name: "TESN - Containment Breach", bpm: 145, tracks: ([
            { ...deepClone(INITIAL_TRACKS[0]), loadedInstrumentPresetName: 'TESN - Pressure Kick', params: TESN_INSTRUMENTS.find(p=>p.name==='TESN - Pressure Kick')!.params, patterns: [createPatternFromSequence([1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null], 'C2')], volume: 0.48, fxSends: { drive: 0.2, reverb: 0, delay: 0, sidechain: 0 } },
            { ...deepClone(INITIAL_TRACKS[1]), loadedInstrumentPresetName: 'TESN - Ticking Hat', params: TESN_INSTRUMENTS.find(p=>p.name==='TESN - Ticking Hat')!.params, patterns: [createPatternFromSequence([null,null,0.8,null,null,null,0.8,null,null,null,0.8,null,null,null,0.8,null], 'C5')], fxSends: { drive: 0.1, reverb: 0, delay: 0.5, sidechain: 0 }},
            { ...deepClone(INITIAL_TRACKS[2]), loadedInstrumentPresetName: 'TESN - Rebar Hit', params: TESN_INSTRUMENTS.find(p=>p.name==='TESN - Rebar Hit')!.params, patternLength: 7, patterns: [createPatternFromSequence([null,0.8,null,null,0.8,null,null], 'C4')], fxSends: { drive: 0.3, sidechain: 0, reverb: 0.2, delay: 0.3 }, volume: 0.3 },
            { ...deepClone(INITIAL_TRACKS[3]), loadedInstrumentPresetName: 'TESN - Warning Bell', params: TESN_INSTRUMENTS.find(p=>p.name==='TESN - Warning Bell')!.params, patternLength: 13, patterns: [createPatternFromSequence([null,null,null,null,0.9,null,null,null,null,null,null,null,null], 'F#5')], fxSends: { drive: 0.2, reverb: 0.4, delay: 0.6, sidechain: 0.1 }},
        ] as Track[]).concat(Array(4).fill(null).map((_,i) => ({ ...deepClone(INITIAL_TRACKS[i+4]), volume: 0 })) as Track[]),
        globalFxParams: { ...deepClone(LICENSED_DEFAULT_PROJECT.globalFxParams), drive: { amount: 70, tone: 3500, mix: 0.4 }, character: { mode: 'overdrive', amount: 60, mix: 0.5 }, compressor: { enabled: true, threshold: -16, ratio: 10, knee: 10, attack: 0.001, release: 0.12, makeup: 6, sidechainSource: 0 } }
    },
    {
        name: "TESN - Red Alert", bpm: 138, tracks: ([
            { ...deepClone(INITIAL_TRACKS[0]), loadedInstrumentPresetName: 'TESN - Pressure Kick', params: TESN_INSTRUMENTS.find(p=>p.name==='TESN - Pressure Kick')!.params, patterns: [createPatternFromSequence([1,null,null,null,1,null,null,0.8,1,null,null,null,1,null,null,null], 'C2')], volume: 0.45, fxSends: { drive: 0.1, reverb: 0, delay: 0, sidechain: 0 } },
            { ...deepClone(INITIAL_TRACKS[1]), loadedInstrumentPresetName: 'TESN - Noise Clap', params: TESN_INSTRUMENTS.find(p=>p.name==='TESN - Noise Clap')!.params, patterns: [createPatternFromSequence([null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,null], 'C4')], fxSends: { drive: 0.1, reverb: 0.3, delay: 0.1, sidechain: 0 }},
            { ...deepClone(INITIAL_TRACKS[2]), loadedInstrumentPresetName: 'TESN - Tension Bass', params: TESN_INSTRUMENTS.find(p=>p.name==='TESN - Tension Bass')!.params, patterns: [createPatternFromSequence([0.9,null,0.8,null,0.9,null,0.8,null,0.9,null,0.8,null,0.9,null,0.8,null], 'G1')], fxSends: { drive: 0.2, sidechain: 0.9, reverb: 0, delay: 0 }, volume: 0.4 },
            { ...deepClone(INITIAL_TRACKS[3]), loadedInstrumentPresetName: 'TESN - Gliding Saw', params: TESN_INSTRUMENTS.find(p=>p.name==='TESN - Gliding Saw')!.params, patternLength: 32, patterns: [createPatternFromSequence([0.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.8,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null], 'A#3', 0.8, 8)], fxSends: { drive: 0.1, reverb: 0.5, delay: 0.6, sidechain: 0.5 }},
        ] as Track[]).concat(Array(4).fill(null).map((_,i) => ({ ...deepClone(INITIAL_TRACKS[i+4]), volume: 0 })) as Track[]),
        globalFxParams: { ...deepClone(LICENSED_DEFAULT_PROJECT.globalFxParams), reverb: { decay: 3.5, mix: 0.25, preDelay: 0.01, preDelaySync: false, preDelayDivision: 1, damping: 3000 } }
    },
];

// --- ====================================================================== ---
// ---                       EXPANSION 1: MAINFRAME PULSE                       ---
// --- ====================================================================== ---

const MAINFRAME_PULSE_INSTRUMENTS: InstrumentPreset[] = [
    createPreset('kick', 'MP - Precision Kick', { tune: 48, decay: 0.22, impact: 98, tone: 88, character: 10, ampEnv: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.1 }, filter: { type: 'lowpass', cutoff: 20000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'MP - Digital Hat', { tone: 11200, decay: 0.03, character: 20, spread: 2.1, ampEnv: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.02 }, filter: { type: 'highpass', cutoff: 9500, resonance: 1.2 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('ruin', 'MP - Subroutine Bass', { pitch: 36, algorithm: 'feedback_pm', timbre: 60, drive: 25, fold: 0, attack: 0.001, decay: 0.16, filter: { type: 'lowpass', cutoff: 600, resonance: 9 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('alloy', 'MP - System Ping', { pitch: 72, ratio: 4.0, feedback: 15, mod_level: 50, mod_attack: 0.001, mod_decay: 0.06, ampEnv: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.08 }, filter: { type: 'highpass', cutoff: 1500, resonance: 2 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('artifice', 'MP - Glitch Perc', { osc1_shape: 10, osc2_shape: 90, osc2_pitch: 19, osc2_fine: 25, fm_amount: 70, osc_mix: 0, noise_level: 20, ampEnv: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.05 }, filterEnv: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 }, filterEnvAmount: 6000, filter_mode: 'bp_bp_p', filter_cutoff: 4500, filter_res: 14, filter_spread: 36, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('shift', 'MP - Data Stab', { pitch: 60, table: 3, position: 75, bend: 10, twist: 25, ampEnv: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.12 }, filter: { type: 'lowpass', cutoff: 5500, resonance: 5 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('reson', 'MP - Logic Perc', { pitch: 80, structure: 5, brightness: 16000, decay: 0.85, material: 15, exciter_type: 'impulse', ampEnv: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.03 }, filter: { type: 'highpass', cutoff: 2000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
];

const MAINFRAME_PULSE_PROJECTS: Preset[] = [
    {
        name: "MP - System Corridor", bpm: 138, tracks: [
            { ...deepClone(INITIAL_TRACKS[0]), loadedInstrumentPresetName: 'DHT - Concrete Kick', params: TECHNO_PRESET_LIBRARY.kick.find(p=>p.name==='DHT - Concrete Kick')!.params, patterns: [createPatternFromSequence([1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null], 'C2')], volume: 0.45, fxSends: { drive: 0.1, reverb: 0, delay: 0, sidechain: 0 } },
            { ...deepClone(INITIAL_TRACKS[1]), loadedInstrumentPresetName: 'DHT - Tight 909', params: TECHNO_PRESET_LIBRARY.hat.find(p=>p.name==='DHT - Tight 909')!.params, patterns: [createPatternFromSequence([null,null,0.8,null,null,null,0.8,null,null,null,0.8,null,null,null,0.8,null], 'C5')], fxSends: { delay: 0.6, reverb: 0.3, drive: 0, sidechain: 0 }},
            { ...deepClone(INITIAL_TRACKS[2]), loadedInstrumentPresetName: 'DHT - Sub Stab', params: TECHNO_PRESET_LIBRARY.ruin.find(p=>p.name==='DHT - Sub Stab')!.params, patternLength: 16, patterns: [createPatternFromSequence([null,null,null,0.9,null,null,0.8,null,null,0.9,null,null,null,null,0.8,null], 'F1')], fxSends: { drive: 0.1, sidechain: 0.9, reverb: 0.2, delay: 0.2 }, volume: 0.38 },
            { ...deepClone(INITIAL_TRACKS[3]), loadedInstrumentPresetName: 'DHT - Warehouse Stab', params: TECHNO_PRESET_LIBRARY.arcane.find(p=>p.name==='DHT - Warehouse Stab')!.params, patternLength: 32, patterns: [createPatternFromSequence(Array(32).fill(null).map((_,i)=>[7, 15, 23].includes(i) ? 0.8 : null), 'A#3')], fxSends: { delay: 0.7, reverb: 0.5, drive: 0, sidechain: 0.3 }},
            { ...deepClone(INITIAL_TRACKS[4]), loadedInstrumentPresetName: 'DHT - Rusted Hat', params: TECHNO_PRESET_LIBRARY.hat.find(p=>p.name==='DHT - Rusted Hat')!.params, patterns: [createPatternFromSequence(Array(16).fill(null).map((_,i)=>i % 2 === 0 ? 0.6 : null), 'C5')], fxSends: { delay: 0.5, reverb: 0.1, drive: 0, sidechain: 0 }, volume: 0.3 },
            ...Array(3).fill(null).map((_,i) => ({ ...deepClone(INITIAL_TRACKS[i+5]), volume: 0 }))
        ],
        globalFxParams: { ...deepClone(LICENSED_DEFAULT_PROJECT.globalFxParams), compressor: { enabled: true, threshold: -20, ratio: 4, knee: 8, attack: 0.01, release: 0.15, makeup: 4, sidechainSource: 0 }, delay: { time: 0.5, feedback: 0.6, mix: 0.4, timeSync: true, timeDivision: 0.375, tone: 4500 }, reverb: { decay: 1.8, mix: 0.2, preDelay: 0.01, preDelaySync: false, preDelayDivision: 1, damping: 5000 } }
    },
    {
        name: "MP - Logic Gate", bpm: 140, tracks: [
            { ...deepClone(INITIAL_TRACKS[0]), loadedInstrumentPresetName: 'DHT - Hardtek', params: TECHNO_PRESET_LIBRARY.kick.find(p=>p.name==='DHT - Hardtek')!.params, patterns: [createPatternFromSequence([1,null,null,0.7,1,null,null,null,1,null,null,0.7,1,null,null,null], 'C#2')], volume: 0.42, fxSends: { drive: 0.2, reverb: 0, delay: 0, sidechain: 0 } },
            { ...deepClone(INITIAL_TRACKS[1]), loadedInstrumentPresetName: 'DHT - Rusted Hat', params: TECHNO_PRESET_LIBRARY.hat.find(p=>p.name==='DHT - Rusted Hat')!.params, patternLength: 7, patterns: [createPatternFromSequence([null,0.8,null,0.7,null,0.8,null], 'C6')], fxSends: { delay: 0.7, reverb: 0.4, drive: 0, sidechain: 0 }},
            { ...deepClone(INITIAL_TRACKS[2]), loadedInstrumentPresetName: 'DHT - FM Drone Hit', params: TECHNO_PRESET_LIBRARY.ruin.find(p=>p.name==='DHT - FM Drone Hit')!.params, patternLength: 32, patterns: [createPatternFromSequence(Array(32).fill(null).map((_,i)=>i === 0 ? 0.9 : null), 'A#2', 0.9, 16)], fxSends: { delay: 0.8, reverb: 0.7, drive: 0.1, sidechain: 0.5 }, volume: 0.33 },
            { ...deepClone(INITIAL_TRACKS[3]), loadedInstrumentPresetName: 'DHT - Gritty Stab', params: TECHNO_PRESET_LIBRARY.artifice.find(p=>p.name==='DHT - Gritty Stab')!.params, patterns: [createPatternFromSequence([null,null,null,null,0.9,null,null,null,null,null,null,null,null,null,0.8,null], 'C4')], fxSends: { delay: 0.6, reverb: 0.3, drive: 0.1, sidechain: 0.2 }},
            { ...deepClone(INITIAL_TRACKS[4]), loadedInstrumentPresetName: 'DHT - Dark Shaker', params: TECHNO_PRESET_LIBRARY.hat.find(p=>p.name==='DHT - Dark Shaker')!.params, patterns: [createPatternFromSequence(Array(16).fill(null).map((_,i)=>[3,7,11,15].includes(i) ? 0.7 : null), 'D5')], fxSends: { delay: 0.4, reverb: 0.1, drive: 0, sidechain: 0 }, volume: 0.35 },
            ...Array(3).fill(null).map((_,i) => ({ ...deepClone(INITIAL_TRACKS[i+5]), volume: 0 }))
        ],
        globalFxParams: { ...deepClone(LICENSED_DEFAULT_PROJECT.globalFxParams), drive: { amount: 25, tone: 7000, mix: 0.15 }, compressor: { enabled: true, threshold: -22, ratio: 4.5, knee: 8, attack: 0.005, release: 0.18, makeup: 5, sidechainSource: 0 }, delay: { time: 0.5, feedback: 0.65, mix: 0.3, timeSync: true, timeDivision: 0.75, tone: 5000 }, reverb: { decay: 2.2, mix: 0.25, preDelay: 0, preDelaySync: false, preDelayDivision: 1, damping: 4000 } }
    },
    {
        name: "MP - Polarity", bpm: 136, tracks: [
            { ...deepClone(INITIAL_TRACKS[0]), loadedInstrumentPresetName: 'DHT - Muted Thump', params: TECHNO_PRESET_LIBRARY.kick.find(p=>p.name==='DHT - Muted Thump')!.params, patterns: [createPatternFromSequence([1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null], 'D2')], volume: 0.5 },
            { ...deepClone(INITIAL_TRACKS[1]), loadedInstrumentPresetName: 'DHT - Panning Tick', params: TECHNO_PRESET_LIBRARY.hat.find(p=>p.name==='DHT - Panning Tick')!.params, patterns: [createPatternFromSequence(Array(16).fill(0.7), 'C5')], fxSends: { delay: 0.1, reverb: 0.3, drive: 0, sidechain: 0 }, volume: 0.3 },
            { ...deepClone(INITIAL_TRACKS[2]), loadedInstrumentPresetName: 'DHT - Sub Stab', params: TECHNO_PRESET_LIBRARY.ruin.find(p=>p.name==='DHT - Sub Stab')!.params, patterns: [createPatternFromSequence([0.9,null,0.8,null,null,0.9,null,null,0.9,null,0.8,null,null,0.9,null,null], 'G1')], fxSends: { drive: 0, sidechain: 1.0, reverb: 0, delay: 0 }, volume: 0.4 },
            { ...deepClone(INITIAL_TRACKS[3]), loadedInstrumentPresetName: 'DHT - Warehouse Stab', params: TECHNO_PRESET_LIBRARY.arcane.find(p=>p.name==='DHT - Warehouse Stab')!.params, patternLength: 16, patterns: [createPatternFromSequence([null,null,null,0.9,null,null,null,null,null,null,null,0.8,null,null,null,null], 'D3')], fxSends: { delay: 0.7, reverb: 0.5, drive: 0, sidechain: 0.5 }},
            { ...deepClone(INITIAL_TRACKS[4]), loadedInstrumentPresetName: 'DHT - Resonant Drone', params: TECHNO_PRESET_LIBRARY.ruin.find(p=>p.name==='DHT - Resonant Drone')!.params, patterns: [createPatternFromSequence([0.8, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null], 'C2', 0.8, 16)], fxSends: { delay: 0.9, reverb: 0.9, drive: 0.1, sidechain: 0.8 }, volume: 0.25 },
            ...Array(3).fill(null).map((_,i) => ({ ...deepClone(INITIAL_TRACKS[i+5]), volume: 0 }))
        ],
        globalFxParams: { ...deepClone(LICENSED_DEFAULT_PROJECT.globalFxParams), compressor: { enabled: true, threshold: -20, ratio: 5, knee: 10, attack: 0.005, release: 0.3, makeup: 4, sidechainSource: 0 }, reverb: { decay: 4.5, mix: 0.3, preDelay: 0.02, preDelaySync: false, preDelayDivision: 1, damping: 2500 } }
    },
     {
        name: "MP - Null Pointer", bpm: 139, tracks: [
            { ...deepClone(INITIAL_TRACKS[0]), loadedInstrumentPresetName: 'DHT - Distorted Slam', params: TECHNO_PRESET_LIBRARY.kick.find(p=>p.name==='DHT - Distorted Slam')!.params, patterns: [createPatternFromSequence([1,null,0.7,null,1,null,1,null,1,null,0.7,null,1,null,1,null], 'C2')], volume: 0.4 },
            { ...deepClone(INITIAL_TRACKS[1]), loadedInstrumentPresetName: 'DHT - Metallic Ride', params: TECHNO_PRESET_LIBRARY.hat.find(p=>p.name==='DHT - Metallic Ride')!.params, patternLength: 15, patterns: [createPatternFromSequence(Array(15).fill(null).map((_,i)=>i % 4 === 2 ? 0.7 : null), 'A#5')], fxSends: { delay: 0.6, reverb: 0.4, drive: 0.1, sidechain: 0 }},
            { ...deepClone(INITIAL_TRACKS[2]), loadedInstrumentPresetName: 'DHT - Alien Tom', params: TECHNO_PRESET_LIBRARY.reson.find(p=>p.name==='DHT - Alien Tom')!.params, patternLength: 9, patterns: [createPatternFromSequence([null,null,null,0.8,null,null,null,0.8,null], 'C6')], fxSends: { delay: 0.8, reverb: 0.6, drive: 0, sidechain: 0 }, volume: 0.33 },
            { ...deepClone(INITIAL_TRACKS[3]), loadedInstrumentPresetName: 'DHT - Industrial Impact', params: TECHNO_PRESET_LIBRARY.ruin.find(p=>p.name==='DHT - Industrial Impact')!.params, patternLength: 13, patterns: [createPatternFromSequence([null,null,0.9,null,null,null,0.9,null,null,0.9,null,null,null], 'A1')], fxSends: { delay: 0.5, reverb: 0.3, drive: 0.2, sidechain: 0.2 }},
            { ...deepClone(INITIAL_TRACKS[4]), loadedInstrumentPresetName: 'DHT - Scanning Drone', params: TECHNO_PRESET_LIBRARY.shift.find(p=>p.name==='DHT - Scanning Drone')!.params, patterns: [createPatternFromSequence([0.7, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null], 'C2', 0.7, 16)], fxSends: { delay: 0.7, reverb: 0.8, drive: 0, sidechain: 0.6 }, volume: 0.28 },
            ...Array(3).fill(null).map((_,i) => ({ ...deepClone(INITIAL_TRACKS[i+5]), volume: 0 }))
        ],
        globalFxParams: { ...deepClone(LICENSED_DEFAULT_PROJECT.globalFxParams), compressor: { enabled: true, threshold: -19, ratio: 5, knee: 10, attack: 0.01, release: 0.2, makeup: 5, sidechainSource: 0 }, character: { mode: 'overdrive', amount: 40, mix: 0.3 }, drive: { amount: 30, tone: 8000, mix: 0.2 }, delay: { time: 0.5, feedback: 0.55, mix: 0.35, timeSync: true, timeDivision: 0.25, tone: 5500 } }
    },
];

// --- ====================================================================== ---
// ---                        EXPANSION 2: RUBBLE & RUST                        ---
// --- ====================================================================== ---

const RUBBLE_RUST_INSTRUMENTS: InstrumentPreset[] = [
    createPreset('kick', 'RR - Scorched Kick', { tune: 50, decay: 0.3, impact: 100, tone: 40, character: 95, ampEnv: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 }, filter: { type: 'lowpass', cutoff: 12000, resonance: 4 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'RR - Scrap Metal', { tone: 6200, decay: 0.12, character: 100, spread: 3.5, ampEnv: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.08 }, filter: { type: 'bandpass', cutoff: 7000, resonance: 12 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('ruin', 'RR - Grinder Bass', { pitch: 36, algorithm: 'overload', timbre: 85, drive: 95, fold: 60, attack: 0.001, decay: 0.2, filter: { type: 'lowpass', cutoff: 700, resonance: 7 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('alloy', 'RR - Dissonant Stab', { pitch: 60, ratio: 1.337, feedback: 85, mod_level: 90, mod_attack: 0.001, mod_decay: 0.1, ampEnv: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 }, filter: { type: 'notch', cutoff: 2500, resonance: 8 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('artifice', 'RR - Industrial Clap', { osc1_shape: 0, osc2_shape: 0, osc2_pitch: 0, osc2_fine: 0, fm_amount: 0, osc_mix: 0, noise_level: 100, ampEnv: { attack: 0.002, decay: 0.1, sustain: 0, release: 0.08 }, filterEnv: { attack: 0.001, decay: 0.09, sustain: 0, release: 0.1 }, filterEnvAmount: 7000, filter_mode: 'bp_bp_p', filter_cutoff: 2000, filter_res: 18, filter_spread: 30, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('reson', 'RR - Impact Wrench', { pitch: 55, structure: 95, brightness: 9000, decay: 0.97, material: 8, exciter_type: 'noise', ampEnv: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.1 }, filter: { type: 'bandpass', cutoff: 5000, resonance: 9 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('shift', 'RR - Corroded Saw', { pitch: 48, table: 0, position: 0, bend: 30, twist: 80, ampEnv: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.15 }, filter: { type: 'lowpass', cutoff: 3800, resonance: 6.5 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
];

const RUBBLE_RUST_PROJECTS: Preset[] = [
    {
        name: "RR - Demolition", bpm: 136, tracks: [
            { ...deepClone(INITIAL_TRACKS[0]), loadedInstrumentPresetName: 'RR - Scorched Kick', params: RUBBLE_RUST_INSTRUMENTS.find(p=>p.name==='RR - Scorched Kick')!.params, patterns: [createPatternFromSequence([1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null], 'C2')], volume: 0.45, fxSends: { drive: 0.15, reverb: 0, delay: 0, sidechain: 0 } },
            { ...deepClone(INITIAL_TRACKS[1]), loadedInstrumentPresetName: 'RR - Scrap Metal', params: RUBBLE_RUST_INSTRUMENTS.find(p=>p.name==='RR - Scrap Metal')!.params, patterns: [createPatternFromSequence([null,null,0.8,null,null,null,0.8,null,null,null,0.8,null,null,null,0.8,null], 'C5')], fxSends: { drive: 0.1, reverb: 0.4, delay: 0.3, sidechain: 0 }, volume: 0.35 },
            { ...deepClone(INITIAL_TRACKS[2]), loadedInstrumentPresetName: 'RR - Grinder Bass', params: RUBBLE_RUST_INSTRUMENTS.find(p=>p.name==='RR - Grinder Bass')!.params, patterns: [createPatternFromSequence([0.9,null,null,null,null,null,null,0.8,0.9,null,null,null,null,null,null,null], 'F#1')], fxSends: { drive: 0.2, sidechain: 1.0, reverb: 0.1, delay: 0 }, volume: 0.38 },
            { ...deepClone(INITIAL_TRACKS[3]), loadedInstrumentPresetName: 'RR - Impact Wrench', params: RUBBLE_RUST_INSTRUMENTS.find(p=>p.name==='RR - Impact Wrench')!.params, patternLength: 16, patterns: [createPatternFromSequence([null,null,null,null,0.8,null,null,null,null,null,null,null,0.7,null,null,null], 'C4')], fxSends: { drive: 0.1, reverb: 0.5, delay: 0.6, sidechain: 0.2 }},
            { ...deepClone(INITIAL_TRACKS[4]), loadedInstrumentPresetName: 'DHT - Industrial Clap', params: TECHNO_PRESET_LIBRARY.artifice.find(p=>p.name==='DHT - Industrial Clap')!.params, patterns: [createPatternFromSequence([null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,null], 'C4')], fxSends: { drive: 0, reverb: 0.6, delay: 0.4, sidechain: 0 }},
            ...Array(3).fill(null).map((_,i) => ({ ...deepClone(INITIAL_TRACKS[i+5]), volume: 0 }))
        ],
        globalFxParams: { ...deepClone(LICENSED_DEFAULT_PROJECT.globalFxParams), drive: { amount: 35, tone: 3500, mix: 0.15 }, character: { mode: 'overdrive', amount: 30, mix: 0.2 }, compressor: { enabled: true, threshold: -18, ratio: 6, knee: 15, attack: 0.001, release: 0.15, makeup: 6, sidechainSource: 0 } }
    },
    {
        name: "RR - Factory Floor", bpm: 132, tracks: [
            { ...deepClone(INITIAL_TRACKS[0]), loadedInstrumentPresetName: 'RR - Scorched Kick', params: RUBBLE_RUST_INSTRUMENTS.find(p=>p.name==='RR - Scorched Kick')!.params, patterns: [createPatternFromSequence([1,null,null,null,1,null,0.7,null,1,null,null,null,1,null,null,null], 'C2')], volume: 0.48, fxSends: { drive: 0.2, reverb: 0, delay: 0, sidechain: 0 } },
            { ...deepClone(INITIAL_TRACKS[1]), loadedInstrumentPresetName: 'RR - Industrial Clap', params: RUBBLE_RUST_INSTRUMENTS.find(p=>p.name==='RR - Industrial Clap')!.params, patterns: [createPatternFromSequence([null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,null], 'C4')], fxSends: { drive: 0.1, reverb: 0.6, delay: 0, sidechain: 0 }},
            { ...deepClone(INITIAL_TRACKS[2]), loadedInstrumentPresetName: 'RR - Dissonant Stab', params: RUBBLE_RUST_INSTRUMENTS.find(p=>p.name==='RR - Dissonant Stab')!.params, patternLength: 13, patterns: [createPatternFromSequence([null,null,0.8,null,null,null,0.8,null,null,null,0.7,null,null], 'G#3')], fxSends: { drive: 0.1, reverb: 0.5, delay: 0.7, sidechain: 0.3 }, volume: 0.35 },
            { ...deepClone(INITIAL_TRACKS[3]), loadedInstrumentPresetName: 'RR - Corroded Saw', params: RUBBLE_RUST_INSTRUMENTS.find(p=>p.name==='RR - Corroded Saw')!.params, patternLength: 16, patterns: [createPatternFromSequence([0.9,null,null,null,null,null,null,null,0.9,null,null,null,null,null,null,null], 'A#2')], fxSends: { drive: 0.2, sidechain: 0.8, reverb: 0.4, delay: 0.5 }, volume: 0.3 },
            { ...deepClone(INITIAL_TRACKS[4]), loadedInstrumentPresetName: 'DHT - Broken Speaker', params: TECHNO_PRESET_LIBRARY.ruin.find(p=>p.name==='DHT - Broken Speaker')!.params, patterns: [createPatternFromSequence([null,null,null,null,null,null,null,0.8,null,null,null,null,null,null,null,null], 'C1', 0.8, 4)], fxSends: { drive: 0.3, reverb: 0.5, delay: 0.3, sidechain: 0.9 }, volume: 0.28 },
            ...Array(3).fill(null).map((_,i) => ({ ...deepClone(INITIAL_TRACKS[i+5]), volume: 0 }))
        ],
        globalFxParams: { ...deepClone(LICENSED_DEFAULT_PROJECT.globalFxParams), drive: { amount: 40, tone: 3000, mix: 0.2 }, character: { mode: 'saturate', amount: 40, mix: 0.3 }, compressor: { enabled: true, threshold: -20, ratio: 5, knee: 8, attack: 0.01, release: 0.15, makeup: 5, sidechainSource: 0 }, reverb: { decay: 1.2, mix: 0.25, preDelay: 0.01, preDelaySync: false, preDelayDivision: 1, damping: 2500 } }
    },
    {
        name: "RR - Broken Signal", bpm: 139, tracks: [
            { ...deepClone(INITIAL_TRACKS[0]), loadedInstrumentPresetName: 'RR - Scorched Kick', params: RUBBLE_RUST_INSTRUMENTS.find(p=>p.name==='RR - Scorched Kick')!.params, patterns: [createPatternFromSequence([1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null], 'D2')], volume: 0.45, fxSends: { drive: 0.2, reverb: 0, delay: 0, sidechain: 0 } },
            { ...deepClone(INITIAL_TRACKS[1]), loadedInstrumentPresetName: 'RR - Scrap Metal', params: RUBBLE_RUST_INSTRUMENTS.find(p=>p.name==='RR - Scrap Metal')!.params, patterns: [createPatternFromSequence(Array(16).fill(null).map((_,i)=>i%2!==0 ? 0.7 : null), 'C5')], fxSends: { drive: 0.1, reverb: 0.3, delay: 0.5, sidechain: 0 }},
            { ...deepClone(INITIAL_TRACKS[2]), loadedInstrumentPresetName: 'RR - Grinder Bass', params: RUBBLE_RUST_INSTRUMENTS.find(p=>p.name==='RR - Grinder Bass')!.params, patterns: [createPatternFromSequence([null,null,0.9,null,null,null,null,null,null,null,0.9,null,null,null,null,null], 'G1')], fxSends: { drive: 0.1, sidechain: 0.9, reverb: 0.1, delay: 0 }, volume: 0.4 },
            { ...deepClone(INITIAL_TRACKS[3]), loadedInstrumentPresetName: 'DHT - Industrial Impact', params: TECHNO_PRESET_LIBRARY.ruin.find(p=>p.name==='DHT - Industrial Impact')!.params, patternLength: 11, patterns: [createPatternFromSequence(Array(11).fill(null).map((_,i)=>[2,6,9].includes(i) ? 0.8 : null), 'D3')], fxSends: { drive: 0.1, reverb: 0.6, delay: 0.7, sidechain: 0.1 }, volume: 0.3 },
            ...Array(4).fill(null).map((_,i) => ({ ...deepClone(INITIAL_TRACKS[i+4]), volume: 0 }))
        ],
        globalFxParams: { ...deepClone(LICENSED_DEFAULT_PROJECT.globalFxParams), character: { mode: 'overdrive', amount: 40, mix: 0.2 }, compressor: { enabled: true, threshold: -18, ratio: 7, knee: 20, attack: 0.001, release: 0.1, makeup: 7, sidechainSource: 0 } }
    },
     {
        name: "RR - Tetanus", bpm: 142, tracks: [
            { ...deepClone(INITIAL_TRACKS[0]), loadedInstrumentPresetName: 'RR - Scorched Kick', params: RUBBLE_RUST_INSTRUMENTS.find(p=>p.name==='RR - Scorched Kick')!.params, patterns: [createPatternFromSequence([1,null,0.7,null,1,null,0.7,null,1,null,0.7,null,1,null,0.7,null], 'C2')], volume: 0.45, fxSends: { drive: 0.25, reverb: 0, delay: 0, sidechain: 0 } },
            { ...deepClone(INITIAL_TRACKS[1]), loadedInstrumentPresetName: 'RR - Industrial Clap', params: RUBBLE_RUST_INSTRUMENTS.find(p=>p.name==='RR - Industrial Clap')!.params, patterns: [createPatternFromSequence([null,null,null,null,1,null,null,null,null,null,null,null,1,null,null,null], 'C4')], fxSends: { drive: 0.1, reverb: 0.5, delay: 0.4, sidechain: 0 }},
            { ...deepClone(INITIAL_TRACKS[2]), loadedInstrumentPresetName: 'RR - Impact Wrench', params: RUBBLE_RUST_INSTRUMENTS.find(p=>p.name==='RR - Impact Wrench')!.params, patternLength: 16, patterns: [createPatternFromSequence([null,null,0.8,null,null,null,null,null,null,0.8,null,null,null,null,null,null], 'F#4')], fxSends: { drive: 0.2, reverb: 0.6, delay: 0.7, sidechain: 0 }},
            { ...deepClone(INITIAL_TRACKS[3]), loadedInstrumentPresetName: 'RR - Dissonant Stab', params: RUBBLE_RUST_INSTRUMENTS.find(p=>p.name==='RR - Dissonant Stab')!.params, patternLength: 32, patterns: [createPatternFromSequence([0.9], 'D4', 0.9, 1)], fxSends: { drive: 0.1, reverb: 0.7, delay: 0.8, sidechain: 0.1 }},
            { ...deepClone(INITIAL_TRACKS[4]), loadedInstrumentPresetName: 'DHT - Tunnel Rumble', params: TECHNO_PRESET_LIBRARY.kick.find(p=>p.name==='DHT - Tunnel Rumble')!.params, patterns: [createPatternFromSequence([null,0.8,null,null,null,0.8,null,null,null,0.8,null,null,null,0.8,null,null], 'C1')], fxSends: { drive: 0.1, reverb: 0.7, delay: 0, sidechain: 0 }, volume: 0.35 },
            ...Array(3).fill(null).map((_,i) => ({ ...deepClone(INITIAL_TRACKS[i+5]), volume: 0 }))
        ],
        globalFxParams: { ...deepClone(LICENSED_DEFAULT_PROJECT.globalFxParams), drive: { amount: 50, tone: 2500, mix: 0.1 }, character: { mode: 'overdrive', amount: 40, mix: 0.2 }, compressor: { enabled: true, threshold: -21, ratio: 7, knee: 10, attack: 0.008, release: 0.16, makeup: 5, sidechainSource: 0 }, reverb: { decay: 1.6, mix: 0.15, preDelay: 0.01, preDelaySync: false, preDelayDivision: 1, damping: 1800 } }
    },
];


// --- ====================================================================== ---
// ---                       EXPANSION 3: HYPNOTIC STATE                        ---
// --- ====================================================================== ---

const HYPNOTIC_STATE_INSTRUMENTS: InstrumentPreset[] = [
    createPreset('kick', 'HS - Deep Thud', { tune: 38, decay: 0.9, impact: 88, tone: 25, character: 20, ampEnv: { attack: 0.002, decay: 0.9, sustain: 0, release: 0.5 }, filter: { type: 'lowpass', cutoff: 8000, resonance: 3 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('hat', 'HS - Shifting Hat', { tone: 10500, decay: 0.2, character: 30, spread: 2.3, ampEnv: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }, filter: { type: 'highpass', cutoff: 8500, resonance: 2.5 }, lfo1: { ...NEUTRAL_LFO, destination: 'pan', rate: 0.15, depth: 700 }, lfo2: NEUTRAL_LFO }),
    createPreset('ruin', 'HS - Rolling Sub', { pitch: 36, algorithm: 'feedback_pm', timbre: 40, drive: 15, fold: 0, attack: 0.005, decay: 0.18, filter: { type: 'lowpass', cutoff: 350, resonance: 10 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('artifice', 'HS - Dub Chord', { osc1_shape: 15, osc2_shape: 85, osc2_pitch: 4, osc2_fine: 0, fm_amount: 0, osc_mix: -10, noise_level: 5, ampEnv: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.1 }, filterEnv: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }, filterEnvAmount: 2500, filter_mode: 'lp_hp_s', filter_cutoff: 1800, filter_res: 8, filter_spread: -24, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('reson', 'HS - Tribe Perc', { pitch: 57, structure: 85, brightness: 6000, decay: 0.94, material: 85, exciter_type: 'impulse', ampEnv: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.06 }, filter: { type: 'lowpass', cutoff: 16000, resonance: 1 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('alloy', 'HS - Poly Bleep', { pitch: 72, ratio: 1.5, feedback: 5, mod_level: 60, mod_attack: 0.001, mod_decay: 0.04, ampEnv: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.05 }, filter: { type: 'lowpass', cutoff: 9000, resonance: 3 }, lfo1: NEUTRAL_LFO, lfo2: NEUTRAL_LFO }),
    createPreset('shift', 'HS - Filtered Scan', { pitch: 48, table: 2, position: 0, bend: 0, twist: 0, ampEnv: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.08 }, filter: { type: 'bandpass', cutoff: 2000, resonance: 12 }, lfo1: { ...NEUTRAL_LFO, destination: 'filter.cutoff', rate: 0.1, depth: 3000 }, lfo2: NEUTRAL_LFO }),
];

const HYPNOTIC_STATE_PROJECTS: Preset[] = [
    {
        name: "HS - The Loop", bpm: 133, tracks: [
            { ...deepClone(INITIAL_TRACKS[0]), loadedInstrumentPresetName: 'HS - Deep Thud', params: HYPNOTIC_STATE_INSTRUMENTS.find(p=>p.name==='HS - Deep Thud')!.params, patterns: [createPatternFromSequence([1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null], 'C2')], volume: 0.48 },
            { ...deepClone(INITIAL_TRACKS[1]), loadedInstrumentPresetName: 'HS - Shifting Hat', params: HYPNOTIC_STATE_INSTRUMENTS.find(p=>p.name==='HS - Shifting Hat')!.params, patterns: [createPatternFromSequence([null,null,0.8,null,null,null,0.8,null,null,null,0.8,null,null,null,0.8,null], 'C5')], fxSends: { delay: 0.7, reverb: 0.5, drive: 0, sidechain: 0 }},
            { ...deepClone(INITIAL_TRACKS[2]), loadedInstrumentPresetName: 'HS - Rolling Sub', params: HYPNOTIC_STATE_INSTRUMENTS.find(p=>p.name==='HS - Rolling Sub')!.params, patternLength: 16, patterns: [createPatternFromSequence([0.9,null,0.8,null,0.9,null,0.8,null,0.9,null,0.8,null,0.9,null,0.8,null], 'F1')], fxSends: { sidechain: 0.9, reverb: 0.1, delay: 0, drive: 0 }, volume: 0.42 },
            { ...deepClone(INITIAL_TRACKS[3]), loadedInstrumentPresetName: 'HS - Dub Chord', params: HYPNOTIC_STATE_INSTRUMENTS.find(p=>p.name==='HS - Dub Chord')!.params, patternLength: 32, patterns: [createPatternFromSequence(Array(32).fill(null).map((_,i)=>[4, 20].includes(i) ? 0.8 : null), 'A#3')], fxSends: { delay: 0.9, reverb: 0.8, drive: 0, sidechain: 0.4 }, volume: 0.35 },
            { ...deepClone(INITIAL_TRACKS[4]), loadedInstrumentPresetName: 'DHT - Space Alarm', params: TECHNO_PRESET_LIBRARY.arcane.find(p=>p.name==='DHT - Space Alarm')!.params, patternLength: 15, patterns: [createPatternFromSequence(Array(15).fill(null).map((_,i)=>i === 11 ? 0.7 : null), 'C6')], fxSends: { delay: 0.8, reverb: 0.7, drive: 0, sidechain: 0.1 }, volume: 0.3 },
            ...Array(3).fill(null).map((_,i) => ({ ...deepClone(INITIAL_TRACKS[i+5]), volume: 0 }))
        ],
        globalFxParams: { ...deepClone(LICENSED_DEFAULT_PROJECT.globalFxParams), delay: { time: 0.5, feedback: 0.7, mix: 0.5, timeSync: true, timeDivision: 0.75, tone: 3500 }, reverb: { decay: 3.5, mix: 0.3, preDelay: 0.02, preDelaySync: false, preDelayDivision: 1, damping: 4000 }, compressor: { enabled: true, threshold: -22, ratio: 4, knee: 12, attack: 0.005, release: 0.4, makeup: 4, sidechainSource: 0 } }
    },
    {
        name: "HS - Polyrhythm", bpm: 130, tracks: [
            { ...deepClone(INITIAL_TRACKS[0]), loadedInstrumentPresetName: 'HS - Deep Thud', params: HYPNOTIC_STATE_INSTRUMENTS.find(p=>p.name==='HS - Deep Thud')!.params, patterns: [createPatternFromSequence([1,null,null,null,1,null,null,null,1,null,null,null,1,null,null,null], 'C2')], volume: 0.5 },
            { ...deepClone(INITIAL_TRACKS[1]), loadedInstrumentPresetName: 'HS - Tribe Perc', params: HYPNOTIC_STATE_INSTRUMENTS.find(p=>p.name==='HS - Tribe Perc')!.params, patternLength: 9, patterns: [createPatternFromSequence([null,null,0.8,null,null,0.8,null,null,0.7], 'C5')], fxSends: { delay: 0.7, reverb: 0.5, drive: 0, sidechain: 0 }},
            { ...deepClone(INITIAL_TRACKS[2]), loadedInstrumentPresetName: 'HS - Filtered Scan', params: HYPNOTIC_STATE_INSTRUMENTS.find(p=>p.name==='HS - Filtered Scan')!.params, patternLength: 11, patterns: [createPatternFromSequence([null,null,null,null,0.9,null,null,null,null,null,null], 'F3')], fxSends: { delay: 0.8, reverb: 0.6, drive: 0, sidechain: 0.2 }},
            { ...deepClone(INITIAL_TRACKS[3]), loadedInstrumentPresetName: 'HS - Poly Bleep', params: HYPNOTIC_STATE_INSTRUMENTS.find(p=>p.name==='HS - Poly Bleep')!.params, patternLength: 7, patterns: [createPatternFromSequence([null,0.8,null,null,0.7,null,null], 'G5')], fxSends: { delay: 0.9, reverb: 0.8, drive: 0, sidechain: 0 }},
            { ...deepClone(INITIAL_TRACKS[4]), loadedInstrumentPresetName: 'DHT - Tunnel Rumble', params: TECHNO_PRESET_LIBRARY.kick.find(p=>p.name==='DHT - Tunnel Rumble')!.params, patternLength: 32, patterns: [createPatternFromSequence(Array(32).fill(0.7), 'A0')], fxSends: { delay: 0, reverb: 0.9, drive: 0.2, sidechain: 0 }, volume: 0.2 },
            ...Array(3).fill(null).map((_,i) => ({ ...deepClone(INITIAL_TRACKS[i+5]), volume: 0 }))
        ],
        globalFxParams: { ...deepClone(LICENSED_DEFAULT_PROJECT.globalFxParams), compressor: { enabled: true, threshold: -24, ratio: 3.5, knee: 8, attack: 0.02, release: 0.3, makeup: 4, sidechainSource: 0 }, delay: { time: 0.5, feedback: 0.75, mix: 0.6, timeSync: true, timeDivision: 0.375, tone: 3000 }, reverb: { decay: 6.0, mix: 0.4, preDelay: 0.01, preDelaySync: false, preDelayDivision: 1, damping: 2500 } }
    },
    {
        name: "HS - Ritual", bpm: 128, tracks: [
            { ...deepClone(INITIAL_TRACKS[0]), loadedInstrumentPresetName: 'HS - Deep Thud', params: HYPNOTIC_STATE_INSTRUMENTS.find(p=>p.name==='HS - Deep Thud')!.params, patterns: [createPatternFromSequence([1,null,null,null,null,null,null,null,1,null,null,null,null,null,null,null], 'A1')], volume: 0.5 },
            { ...deepClone(INITIAL_TRACKS[1]), loadedInstrumentPresetName: 'HS - Tribe Perc', params: HYPNOTIC_STATE_INSTRUMENTS.find(p=>p.name==='HS - Tribe Perc')!.params, patternLength: 16, patterns: [createPatternFromSequence([null,0.8,0.7,0.8,null,0.8,0.7,0.8,null,0.8,0.7,0.8,null,0.8,0.7,0.8], 'A4')], fxSends: { delay: 0.6, reverb: 0.4, drive: 0, sidechain: 0 }},
            { ...deepClone(INITIAL_TRACKS[2]), loadedInstrumentPresetName: 'HS - Rolling Sub', params: HYPNOTIC_STATE_INSTRUMENTS.find(p=>p.name==='HS - Rolling Sub')!.params, patterns: [createPatternFromSequence([0.9,null,0.8,null,0.9,null,0.8,null,0.9,null,0.8,null,0.9,null,0.8,null], 'A1')], fxSends: { sidechain: 0.8, reverb: 0.2, delay: 0, drive: 0 }, volume: 0.42 },
            { ...deepClone(INITIAL_TRACKS[3]), loadedInstrumentPresetName: 'HS - Shifting Hat', params: HYPNOTIC_STATE_INSTRUMENTS.find(p=>p.name==='HS - Shifting Hat')!.params, patterns: [createPatternFromSequence([null,null,0.8,null,null,null,0.8,null,null,null,0.8,null,null,null,0.8,null], 'C5')], fxSends: { delay: 0.7, reverb: 0.6, drive: 0, sidechain: 0.1 }},
            { ...deepClone(INITIAL_TRACKS[4]), loadedInstrumentPresetName: 'DHT - Hollow Drone', params: TECHNO_PRESET_LIBRARY.arcane.find(p=>p.name==='DHT - Hollow Drone')!.params, patterns: [createPatternFromSequence([0.8], 'A2', 0.8, 16)], fxSends: { delay: 0.5, reverb: 1.0, drive: 0, sidechain: 0.5 }, volume: 0.2 },
            ...Array(3).fill(null).map((_,i) => ({ ...deepClone(INITIAL_TRACKS[i+5]), volume: 0 }))
        ],
        globalFxParams: { ...deepClone(LICENSED_DEFAULT_PROJECT.globalFxParams), compressor: { enabled: true, threshold: -24, ratio: 5, knee: 8, attack: 0.005, release: 0.3, makeup: 5, sidechainSource: 0 } }
    },
    {
        name: "HS - Afterhours", bpm: 126, tracks: [
            { ...deepClone(INITIAL_TRACKS[0]), loadedInstrumentPresetName: 'HS - Deep Thud', params: HYPNOTIC_STATE_INSTRUMENTS.find(p=>p.name==='HS - Deep Thud')!.params, patterns: [createPatternFromSequence([1,null,null,null,null,null,null,null,1,null,null,null,null,null,null,null], 'G1')], volume: 0.5 },
            { ...deepClone(INITIAL_TRACKS[1]), loadedInstrumentPresetName: 'HS - Poly Bleep', params: HYPNOTIC_STATE_INSTRUMENTS.find(p=>p.name==='HS - Poly Bleep')!.params, patternLength: 32, patterns: [createPatternFromSequence([null,null,null,0.8,null,null,null,null,null,null,0.7,null,null,null,null,null,null,null,null,null,null,null,null,0.8,null,null,null,null,null,null,0.7,null], 'G5')], fxSends: { delay: 0.9, reverb: 0.8, drive: 0, sidechain: 0 }},
            { ...deepClone(INITIAL_TRACKS[2]), loadedInstrumentPresetName: 'HS - Filtered Scan', params: HYPNOTIC_STATE_INSTRUMENTS.find(p=>p.name==='HS - Filtered Scan')!.params, patternLength: 64, patterns: [createPatternFromSequence([0.9], 'G3', 0.9, 64)], fxSends: { delay: 0.7, reverb: 0.7, drive: 0, sidechain: 0.6 }, volume: 0.25 },
            { ...deepClone(INITIAL_TRACKS[3]), loadedInstrumentPresetName: 'DHT - Noise Hit', params: TECHNO_PRESET_LIBRARY.artifice.find(p=>p.name==='DHT - Noise Hit')!.params, patternLength: 16, patterns: [createPatternFromSequence(Array(16).fill(null).map((_,i)=>i % 4 === 2 ? 0.6 : null), 'C5')], fxSends: { delay: 0.1, reverb: 0.9, drive: 0.1, sidechain: 0 }, volume: 0.28 },
            { ...deepClone(INITIAL_TRACKS[4]), loadedInstrumentPresetName: 'DHT - Deep Pulse', params: TECHNO_PRESET_LIBRARY.kick.find(p=>p.name==='DHT - Deep Pulse')!.params, patternLength: 64, patterns: [createPatternFromSequence([null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0.8], 'G0')], fxSends: { delay: 0, reverb: 0.8, drive: 0, sidechain: 0 }, volume: 0.35 },
            ...Array(3).fill(null).map((_,i) => ({ ...deepClone(INITIAL_TRACKS[i+5]), volume: 0 }))
        ],
        globalFxParams: { ...deepClone(LICENSED_DEFAULT_PROJECT.globalFxParams), compressor: { enabled: true, threshold: -26, ratio: 3, knee: 8, attack: 0.03, release: 0.5, makeup: 3, sidechainSource: 0 }, delay: { time: 0.5, feedback: 0.8, mix: 0.7, timeSync: true, timeDivision: 0.75, tone: 2800 }, reverb: { decay: 8.0, mix: 0.5, preDelay: 0.03, preDelaySync: false, preDelayDivision: 1, damping: 1500 } }
    },
];

// --- ====================================================================== ---
// ---                           MAIN EXPORT                                  ---
// --- ====================================================================== ---

export const EXPANSION_PACKS: ExpansionPack[] = [
    {
        id: 'tesn-v1', name: 'TESN',
        description: 'Tension-building, dark, and driving techno. Focused on hypnotic rhythms, industrial textures, and powerful, evolving sequences designed for peak-time moments.',
        artist: 'ANOTHER MACHINES', coverArt: TESNArt, gumroadUrl: 'https://anothermachines.gumroad.com/l/hevvjz',
        projects: TESN_PROJECTS, instruments: TESN_INSTRUMENTS,
    },
    {
        id: 'mainframe-pulse-v1', name: 'Mainframe Pulse',
        description: 'Precision digital techno. Clean, sharp, and powerful sounds for modern, minimal, and cerebral grooves. Features a collection of finely-tuned percussion, deep subroutine basses, and glitchy synth textures.',
        artist: 'FM8/R', coverArt: MainframePulseArt,
        projects: MAINFRAME_PULSE_PROJECTS,
        instruments: [
            ...MAINFRAME_PULSE_INSTRUMENTS,
            ...TECHNO_PRESET_LIBRARY.kick,
            ...TECHNO_PRESET_LIBRARY.hat,
            ...TECHNO_PRESET_LIBRARY.ruin,
            ...TECHNO_PRESET_LIBRARY.arcane,
            ...TECHNO_PRESET_LIBRARY.artifice,
            ...TECHNO_PRESET_LIBRARY.shift,
            ...TECHNO_PRESET_LIBRARY.reson,
            ...TECHNO_PRESET_LIBRARY.alloy,
        ],
    },
    {
        id: 'rubble-rust-v1', name: 'Rubble & Rust',
        description: 'Raw, distorted, and industrial techno. A palette of scorched kicks, scrap metal percussion, and grinding bass sounds for creating relentless, warehouse-ready tracks.',
        artist: 'FM8/R', coverArt: RubbleAndRustArt,
        projects: RUBBLE_RUST_PROJECTS,
        instruments: [
            ...RUBBLE_RUST_INSTRUMENTS,
            ...TECHNO_PRESET_LIBRARY.kick,
            ...TECHNO_PRESET_LIBRARY.hat,
            ...TECHNO_PRESET_LIBRARY.ruin,
            ...TECHNO_PRESET_LIBRARY.arcane,
            ...TECHNO_PRESET_LIBRARY.artifice,
            ...TECHNO_PRESET_LIBRARY.shift,
            ...TECHNO_PRESET_LIBRARY.reson,
            ...TECHNO_PRESET_LIBRARY.alloy,
        ],
    },
    {
        id: 'hypnotic-state-v1', name: 'Hypnotic State',
        description: 'Deep, atmospheric, and dub-influenced techno. Explore evolving soundscapes, polyrhythmic percussion, and spacious chords perfect for creating immersive, mind-bending grooves.',
        artist: 'FM8/R', coverArt: HypnoticStateArt,
        projects: HYPNOTIC_STATE_PROJECTS,
        instruments: [
            ...HYPNOTIC_STATE_INSTRUMENTS,
            ...TECHNO_PRESET_LIBRARY.kick,
            ...TECHNO_PRESET_LIBRARY.hat,
            ...TECHNO_PRESET_LIBRARY.ruin,
            ...TECHNO_PRESET_LIBRARY.arcane,
            ...TECHNO_PRESET_LIBRARY.artifice,
            ...TECHNO_PRESET_LIBRARY.shift,
            ...TECHNO_PRESET_LIBRARY.reson,
            ...TECHNO_PRESET_LIBRARY.alloy,
        ],
    },
];