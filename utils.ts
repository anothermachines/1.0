import {
    Track, StepState, PLocks, AutomationData, MidiOutParams, FXSends, KickParams, HatParams,
    ArcaneParams, RuinParams, ArtificeParams, ShiftParams, ResonParams, AlloyParams, TrackType, AllInstrumentParams
} from './types';
import { 
    INITIAL_KICK_PARAMS, INITIAL_HAT_PARAMS, INITIAL_ARCANE_PARAMS, INITIAL_RUIN_PARAMS, 
    INITIAL_ARTIFICE_PARAMS, INITIAL_SHIFT_PARAMS, INITIAL_RESON_PARAMS, INITIAL_ALLOY_PARAMS 
} from './constants';


// --- MIDI & Note Helpers ---
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const noteNameToMidi = (name: string): number => {
    if (!name || name.length < 2) return 60; // Default to C4
    try {
        const octaveStr = name.replace(/[^0-9-]/g, '');
        const noteStr = name.replace(/[^A-G#]/gi, '').toUpperCase();
        if (!octaveStr) return 60;
        const octave = parseInt(octaveStr, 10);
        const noteIndex = NOTE_NAMES.indexOf(noteStr);
        if (noteIndex === -1) return 60; // Default to C4 if note name is invalid
        return (octave + 1) * 12 + noteIndex;
    } catch {
        return 60; // Fallback
    }
};

export const midiToNoteName = (midi: number): string => {
    if (midi < 0 || midi > 127) return 'C4';
    const noteIndex = midi % 12;
    const octave = Math.floor(midi / 12) - 1;
    return `${NOTE_NAMES[noteIndex]}${octave}`;
};

export const noteToFreq = (note: string): number => {
    const midi = noteNameToMidi(note);
    if (isNaN(midi)) return 440;
    return 440 * Math.pow(2, (midi - 69) / 12);
};


// --- Deep Object Manipulation ---

export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime()) as any;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item)) as any;
    }
    if (obj instanceof Object) {
        return Object.keys(obj).reduce((newObj: { [key: string]: any }, key) => {
            newObj[key] = deepClone((obj as { [key: string]: any })[key]);
            return newObj;
        }, {}) as any;
    }
    return obj;
}

const isObject = (item: any): item is object => {
    return (item && typeof item === 'object' && !Array.isArray(item));
};

export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            const sourceKey = key as keyof T;
            if (isObject(source[sourceKey])) {
                if (!(key in target))
                    Object.assign(output, { [key]: source[sourceKey] });
                else
                    output[sourceKey] = deepMerge(target[sourceKey] as object, source[sourceKey] as object) as T[keyof T];
            } else {
                Object.assign(output, { [key]: source[sourceKey] });
            }
        });
    }
    return output;
}

export function setDeep(obj: any, path: string, value: any) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined || typeof current[keys[i]] !== 'object' || current[keys[i]] === null) {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
}


// --- Parameter & P-Lock Helpers ---

const getDeepValue = (obj: any, path: string): any => {
    // This implementation correctly handles paths that might contain numeric 0 or other falsy values as intermediate properties.
    // The original `acc && acc[part]` would fail because (0 && anything) is 0, incorrectly terminating the path traversal.
    return path.split('.').reduce((acc, part) => {
        if (acc === null || acc === undefined) {
            return undefined;
        }
        return acc[part];
    }, obj);
};

export const getParamValue = (track: Track, pLocks: PLocks | null, path: string): any => {
    if (pLocks) {
        const pLockRoot = pLocks[`${track.type}Params` as keyof PLocks];
        if (pLockRoot) {
            const val = getDeepValue(pLockRoot, path);
            if (val !== undefined) return val;
        }
    }
    return getDeepValue(track.params, path);
};

export const isParamLocked = (track: Track, pLocks: PLocks | null, path: string): boolean => {
    if (pLocks) {
        const pLockRoot = pLocks[`${track.type}Params` as keyof PLocks];
        if (pLockRoot) {
            const val = getDeepValue(pLockRoot, path);
            return val !== undefined;
        }
    }
    return false;
};

export const getTrackValue = (track: Track, pLocks: PLocks | null, key: 'volume' | 'pan'): number => {
    if (pLocks && pLocks[key] !== undefined) {
        return pLocks[key]!;
    }
    return track[key];
};

export const isTrackValueLocked = (pLocks: PLocks | null, key: 'volume' | 'pan'): boolean => {
    return !!pLocks && pLocks[key] !== undefined;
};

export const getSendValue = (track: Track, pLocks: PLocks | null, fx: keyof FXSends): number => {
    if (pLocks?.fxSends?.[fx] !== undefined) {
        return pLocks.fxSends[fx]!;
    }
    return track.fxSends[fx];
};

export const isSendLocked = (pLocks: PLocks | null, fx: keyof FXSends): boolean => {
    return pLocks?.fxSends?.[fx] !== undefined;
};

export const getMidiOutParamValue = (track: Track, pLocks: PLocks | null, key: keyof MidiOutParams): any => {
    if (pLocks?.midiOutParams?.[key] !== undefined) {
        return pLocks.midiOutParams[key];
    }
    if (track.midiOut) {
        return track.midiOut[key];
    }
    return key === 'channel' ? 1 : null;
};

export const isMidiOutParamLocked = (pLocks: PLocks | null, key: keyof MidiOutParams): boolean => {
    return pLocks?.midiOutParams?.[key] !== undefined;
};

export const hasParameterLocks = (pLocks: PLocks | null): boolean => {
    if (!pLocks) return false;
    return (
        !!pLocks.kickParams ||
        !!pLocks.hatParams ||
        !!pLocks.arcaneParams ||
        !!pLocks.ruinParams ||
        !!pLocks.artificeParams ||
        !!pLocks.shiftParams ||
        !!pLocks.resonParams ||
        !!pLocks.alloyParams ||
        !!pLocks.midiOutParams ||
        pLocks.volume !== undefined ||
        pLocks.pan !== undefined ||
        !!pLocks.fxSends ||
        !!(pLocks.ccLocks && pLocks.ccLocks.length > 0)
    );
};

export const getInitialParamsForType = (type: TrackType): AllInstrumentParams => {
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


// --- Automation Helper ---
export const getAutomationValue = (automationData: AutomationData, path: string, time: number): any => {
    const points = automationData[path];
    if (!points || points.length === 0) return undefined;

    // Find the two points to interpolate between
    let prevPoint = points[0];
    let nextPoint = points[points.length - 1];

    if (time <= points[0].time) return points[0].value;
    if (time >= points[points.length - 1].time) return points[points.length - 1].value;

    for (let i = 0; i < points.length; i++) {
        if (points[i].time >= time) {
            nextPoint = points[i];
            prevPoint = points[i - 1] || points[0];
            break;
        }
    }

    const timeDiff = nextPoint.time - prevPoint.time;
    if (timeDiff === 0) return prevPoint.value;

    const timeRatio = (time - prevPoint.time) / timeDiff;
    const valueDiff = nextPoint.value - prevPoint.value;

    return prevPoint.value + valueDiff * timeRatio;
};

// --- File & Blob Helpers ---
export const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const numSamples = buffer.length;
    const dataSize = numChannels * numSamples * 4; // 32-bit float
    const bufferSize = 44 + dataSize;

    const ab = new ArrayBuffer(bufferSize);
    const view = new DataView(ab);

    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 3, true); // 3 = floating point
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 4, true);
    view.setUint16(32, numChannels * 4, true);
    view.setUint16(34, 32, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    const channels = Array.from({ length: numChannels }, (_, i) => buffer.getChannelData(i));
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        for (let j = 0; j < numChannels; j++) {
            view.setFloat32(offset, channels[j][i], true);
            offset += 4;
        }
    }

    return ab;
};

// --- Pattern & Generative Helpers ---
export const createPatternFromSequence = (sequence: (number | null)[], note = 'C4', vel = 0.8, len = 1): StepState[] => {
    const pattern: StepState[] = Array(64).fill(null).map(() => ({ active: false, pLocks: null, notes: [], velocity: 1.0, duration: 1, condition: { type: 'always' } }));
    sequence.forEach((s, i) => {
        if (s !== null && i < 64) {
            pattern[i] = { active: true, pLocks: null, notes: [note], velocity: s, duration: len, condition: { type: 'always' } };
        }
    });
    return pattern;
};

export const generateEuclideanPattern = (pulses: number, steps: number): boolean[] => {
    if (pulses > steps || steps === 0 || pulses === 0) {
        return Array(steps).fill(false);
    }
    const pattern: boolean[] = [];
    let remainder = 0;
    for (let i = 0; i < steps; i++) {
        remainder += pulses;
        if (remainder >= steps) {
            remainder -= steps;
            pattern.push(true);
        } else {
            pattern.push(false);
        }
    }
    return pattern;
};


const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

export const createTechnoPattern = (type: TrackType, isHypnotic: boolean): { pattern: StepState[], length: number } => {
    const length = isHypnotic ? [7, 11, 13, 15][randInt(0, 3)] : [8, 16, 32][randInt(0, 2)];
    const pulses = randInt(1, Math.floor(length / (isHypnotic ? 1.5 : 2)));
    const rotation = randInt(0, length - 1);
    const euclidean = generateEuclideanPattern(pulses, length);
    // rotate
    const rotated = [...euclidean.slice(rotation), ...euclidean.slice(0, rotation)];

    const pattern: StepState[] = Array(64).fill(null).map(() => ({ active: false, pLocks: null, notes: [], velocity: 1.0, duration: 1, condition: { type: 'always' } }));

    rotated.forEach((active, i) => {
        if (active) {
            pattern[i].active = true;
            pattern[i].velocity = rand(0.6, 1.0);
        }
    });

    return { pattern, length };
};

export const randomizeKickParams = (): Partial<KickParams> => ({
    tune: rand(35, 55),
    decay: rand(0.2, 0.8),
    impact: rand(80, 100),
    tone: rand(30, 90),
    character: rand(0, 100),
});

export const randomizeHatParams = (): Partial<HatParams> => ({
    tone: rand(7000, 14000),
    decay: rand(0.02, 0.2),
    character: rand(0, 100),
    spread: rand(1.1, 3.0),
});

export const randomizeArcaneParams = (): Partial<ArcaneParams> => ({
    osc1_shape: rand(0, 100),
    osc2_shape: rand(0, 100),
    osc2_pitch: [-12, -7, 0, 7, 12, 19, 24][randInt(0, 6)],
    mode: ['pm', 'add', 'ring', 'hard_sync'][randInt(0, 3)] as ArcaneParams['mode'],
    mod_amount: rand(0, 100),
    fold: rand(0, 100),
    spread: rand(0, 40),
});

export const randomizeRuinParams = (): Partial<RuinParams> => ({
    pitch: randInt(24, 48),
    algorithm: ['feedback_pm', 'distort_fold', 'overload'][randInt(0, 2)] as RuinParams['algorithm'],
    timbre: rand(0, 100),
    drive: rand(0, 100),
    fold: rand(0, 100),
    attack: rand(0.001, 0.01),
    decay: rand(0.1, 0.5),
});

export const randomizeArtificeParams = (): Partial<ArtificeParams> => ({
    osc1_shape: rand(0, 100),
    osc2_shape: rand(0, 100),
    osc2_pitch: [-12, 0, 7, 12][randInt(0, 3)],
    fm_amount: rand(0, 100),
    osc_mix: rand(-100, 100),
    noise_level: rand(0, 40),
    filterEnvAmount: rand(-8000, 8000),
    filter_mode: ['lp_hp_p', 'lp_hp_s', 'bp_bp_p'][randInt(0, 2)] as ArtificeParams['filter_mode'],
    filter_cutoff: rand(500, 10000),
    filter_res: rand(1, 20),
    filter_spread: rand(-36, 36),
});

export const randomizeShiftParams = (): Partial<ShiftParams> => ({
    pitch: randInt(36, 72),
    table: randInt(0, 3),
    position: rand(0, 100),
    bend: rand(0, 100),
    twist: rand(0, 100),
});

export const randomizeResonParams = (): Partial<ResonParams> => ({
    pitch: randInt(48, 84),
    structure: rand(0, 100),
    brightness: rand(2000, 16000),
    decay: rand(0.9, 0.995),
    material: rand(0, 100),
    exciter_type: ['noise', 'impulse'][randInt(0, 1)] as ResonParams['exciter_type'],
});

export const randomizeAlloyParams = (): Partial<AlloyParams> => ({
    pitch: randInt(36, 84),
    ratio: [0.5, 0.75, 1, 1.414, 1.5, 2, 3.5, 4][randInt(0, 7)],
    feedback: rand(0, 90),
    mod_level: rand(0, 100),
    mod_attack: rand(0.001, 0.05),
    mod_decay: rand(0.05, 0.3),
});

export const generateWaveformData = async (blob: Blob, points: number): Promise<[number, number][]> => {
    // Stub implementation
    return Array.from({ length: points }, (_, i) => [i / points, Math.random() * 2 - 1]);
};

export const generateWaveformForPattern = (pattern: StepState[], length: number): [number, number][] => {
    // Stub implementation
    return Array.from({ length: length }, (_, i) => [i / length, pattern[i]?.active ? pattern[i].velocity : 0]);
};