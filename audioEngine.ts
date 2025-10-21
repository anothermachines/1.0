import { 
    Track, StepState, PLocks, GlobalFXParams, CompressorParams, FXSends, Envelope, TrackType, MidiOutParams, LFOParams
} from './types';
// FIX: Import 'noteToFreq' and 'deepClone' to resolve 'Cannot find name' errors and implement the crucial fix.
import { getAutomationValue, noteToFreq, deepClone } from '../utils';

// Helper to ensure values are finite numbers
const finite = (value: any, fallback: number): number => {
    const num = Number(value);
    return isFinite(num) ? num : fallback;
};


const MAX_ACTIVE_VOICES = 64; // Hard cap on concurrent voices for stability

// Duplicated from utils.ts to avoid circular dependencies
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteNameToMidi = (name: string): number => {
    if (!name || name.length < 2) return 60;
    try {
        const octaveStr = name.replace(/[^0-9-]/g, '');
        const noteStr = name.replace(/[^A-G#]/gi, '').toUpperCase();
        if (!octaveStr) return 60;
        const octave = parseInt(octaveStr, 10);
        const noteIndex = NOTE_NAMES.indexOf(noteStr);
        if (noteIndex === -1) return 60;
        return (octave + 1) * 12 + noteIndex;
    } catch {
        return 60;
    }
};


export class AudioEngine {
    private audioContext: AudioContext | OfflineAudioContext;
    private masterCompressor: DynamicsCompressorNode;
    private makeupGain: GainNode;
    // FIX: Renamed private property to avoid conflict with public getter.
    private _preCompressorBus: GainNode;
    private masterFilter: BiquadFilterNode;
    private masterLimiter: DynamicsCompressorNode;
    private masterGain: GainNode;
    private masterAnalyser: AnalyserNode;
    private noiseBuffer!: AudioBuffer;
    private kickImpulseBuffer!: AudioBuffer;

    private reverb: ConvolverNode;
    private reverbPreDelay: DelayNode;
    private reverbDampingFilter: BiquadFilterNode;
    private reverbWet: GainNode;
    private reverbBus: GainNode;

    private delay: DelayNode;
    private delayFeedback: GainNode;
    private delayFilter: BiquadFilterNode;
    private delayWet: GainNode;
    private delayBus: GainNode;

    private drive: WaveShaperNode;
    private driveTone: BiquadFilterNode;
    private driveWet: GainNode;
    private driveBus: GainNode;

    private character: WaveShaperNode;
    
    private sidechainDucker: GainNode;
    private sidechainSourceId: number | null = null;
    private sidechainParams: CompressorParams | null = null;

    private trackLimiters: Map<number, DynamicsCompressorNode>;
    private trackOutputs: Map<number, GainNode>;
    private trackPanners: Map<number, StereoPannerNode>;
    private trackSendNodes: Map<number, Record<keyof FXSends, GainNode>>;
    private trackAnalysers: Map<number, AnalyserNode>;
    private activeVoices: Map<string, { nodes: AudioNode[], stopTime: number, gain: number }>;
    
    private trigCounts: Map<number, number> = new Map();
    private hasPlayedFirst: Set<number> = new Set();
    private lastStepPlayed: Map<number, number> = new Map();

    private shapeCache: Map<string, Float32Array>;
    private curveCache: Map<string, Float32Array>;
    private warpTableCache: Map<number, PeriodicWave>;
    public bpm: number;

    private perfTimeAtContextStart: number = 0;
    private contextTimeAtStart: number = 0;
    private midiOutputs: MIDIOutput[] = [];

    public masterStreamDestination: MediaStreamAudioDestinationNode;
    private isConnectedToDestination = true;

    constructor(context?: AudioContext | OfflineAudioContext) {
        this.audioContext = context || new (window.AudioContext || (window as any).webkitAudioContext)();
        this.trackLimiters = new Map();
        this.trackOutputs = new Map();
        this.trackPanners = new Map();
        this.trackSendNodes = new Map();
        this.trackAnalysers = new Map();
        this.activeVoices = new Map();
        this.shapeCache = new Map();
        this.curveCache = new Map();
        this.warpTableCache = new Map();
        this.bpm = 120;

        // FIX: Renamed private property to avoid conflict with public getter.
        this._preCompressorBus = this.audioContext.createGain();
        
        this.driveBus = this.audioContext.createGain(); this.driveBus.gain.value = 0.8;
        this.drive = this.audioContext.createWaveShaper();
        this.driveTone = this.audioContext.createBiquadFilter(); this.driveTone.type = 'lowpass';
        this.driveWet = this.audioContext.createGain();
        // FIX: Renamed private property to avoid conflict with public getter.
        this.driveBus.connect(this.drive).connect(this.driveTone).connect(this.driveWet).connect(this._preCompressorBus);
        
        this.reverbBus = this.audioContext.createGain();
        this.reverbPreDelay = this.audioContext.createDelay(0.5);
        this.reverb = this.audioContext.createConvolver();
        this.reverb.buffer = this.audioContext.createBuffer(2, 1, this.audioContext.sampleRate); // Placeholder
        this.reverbDampingFilter = this.audioContext.createBiquadFilter(); this.reverbDampingFilter.type = 'lowpass';
        this.reverbWet = this.audioContext.createGain();
        // FIX: Renamed private property to avoid conflict with public getter.
        this.reverbBus.connect(this.reverbPreDelay).connect(this.reverb).connect(this.reverbDampingFilter).connect(this.reverbWet).connect(this._preCompressorBus);

        this.delayBus = this.audioContext.createGain();
        this.delay = this.audioContext.createDelay(2.0); this.delayFeedback = this.audioContext.createGain();
        this.delayFilter = this.audioContext.createBiquadFilter(); this.delayFilter.type = 'lowpass';
        this.delayWet = this.audioContext.createGain();
        // FIX: Renamed private property to avoid conflict with public getter.
        this.delayBus.connect(this.delay).connect(this.delayWet).connect(this._preCompressorBus);
        this.delay.connect(this.delayFeedback).connect(this.delayFilter).connect(this.delay);
        
        // --- Master Chain Setup ---
        this.sidechainDucker = this.audioContext.createGain(); this.sidechainDucker.gain.value = 1.0;
        this.masterFilter = this.audioContext.createBiquadFilter();
        
        // Character (Insert FX) - SERIAL PATH to prevent phasing
        this.character = this.audioContext.createWaveShaper();
        
        this.masterCompressor = this.audioContext.createDynamicsCompressor();
        this.makeupGain = this.audioContext.createGain();
        this.masterGain = this.audioContext.createGain();
        this.masterLimiter = this.audioContext.createDynamicsCompressor();
        this.masterLimiter.threshold.value = -0.3; this.masterLimiter.knee.value = 0; this.masterLimiter.ratio.value = 20;
        this.masterLimiter.attack.value = 0.001; this.masterLimiter.release.value = 0.05;
        this.masterAnalyser = this.audioContext.createAnalyser(); this.masterAnalyser.fftSize = 256;

        if (this.audioContext instanceof AudioContext) {
            this.masterStreamDestination = this.audioContext.createMediaStreamDestination();
        }

        // The Master Chain Routing
        // FIX: Renamed private property to avoid conflict with public getter.
        this._preCompressorBus.connect(this.sidechainDucker)
            .connect(this.masterFilter)
            .connect(this.character) // Serial Character FX
            .connect(this.masterCompressor)
            .connect(this.makeupGain)
            .connect(this.masterGain)
            .connect(this.masterLimiter)
            .connect(this.masterAnalyser)
            .connect(this.audioContext.destination);

        if (this.masterStreamDestination) {
            this.masterLimiter.connect(this.masterStreamDestination);
        }
    }
    
    public async init() {
        this.noiseBuffer = await this.createNoiseBufferAsync();
        this.kickImpulseBuffer = this.createImpulseBuffer();
        this.reverb.buffer = await this.generateImpulseResponseAsync(1.0, 2);
        this.syncTime();
    }
    
    public async close(): Promise<void> {
        if (this.audioContext.state !== 'closed' && this.audioContext instanceof AudioContext) {
            return this.audioContext.close();
        }
        return Promise.resolve();
    }
    
    public syncTime() {
        if (!('performance' in window)) return;
        this.contextTimeAtStart = this.audioContext.currentTime;
        this.perfTimeAtContextStart = performance.now();
    }

    public getPerformanceTime(audioContextTime: number): number {
        if (this.perfTimeAtContextStart === 0) this.syncTime();
        return (audioContextTime - this.contextTimeAtStart) * 1000 + this.perfTimeAtContextStart;
    }
    
    public setMidiOutputs(outputs: MIDIOutput[]) {
        this.midiOutputs = outputs;
    }
    
    public getMidiOutputs(): MIDIOutput[] {
        return this.midiOutputs;
    }

    public getMasterAnalyser = () => this.masterAnalyser;

    // FIX: Renamed private property to avoid conflict with public getter.
    public get preCompressorBus() {
        return this._preCompressorBus;
    }

    public disconnectDestination() {
        if (this.isConnectedToDestination && this.audioContext instanceof AudioContext) {
            this.masterAnalyser.disconnect(this.audioContext.destination);
            this.isConnectedToDestination = false;
        }
    }

    public connectDestination() {
        if (!this.isConnectedToDestination && this.audioContext instanceof AudioContext) {
            this.masterAnalyser.connect(this.audioContext.destination);
            this.isConnectedToDestination = true;
        }
    }

    resume() { return this.audioContext.state === 'suspended' ? this.audioContext.resume() : Promise.resolve(); }
    getContext() { return this.audioContext; }

    stopAll() {
        this.activeVoices.forEach(({ nodes }) => {
            nodes.forEach(node => {
                if (node instanceof AudioBufferSourceNode || node instanceof OscillatorNode) { try { node.stop(); } catch (e) {} }
                node.disconnect();
            });
        });
        this.activeVoices.clear();
        this.midiOutputs.forEach(output => {
            for (let i = 0; i < 16; i++) {
                output.send([0xB0 + i, 123, 0]); // All notes off on all channels
            }
        });
    }
    
    cleanupVoices() {
        const now = this.audioContext.currentTime;
        for (const [key, voice] of this.activeVoices.entries()) {
            if (now > voice.stopTime) {
                voice.nodes.forEach(node => node.disconnect());
                this.activeVoices.delete(key);
            }
        }
    }
    
    resetTriggerStates() { this.trigCounts.clear(); this.hasPlayedFirst.clear(); this.lastStepPlayed.clear(); }
    
    getTrackLevels(): Record<number, number> {
        const levels: Record<number, number> = {};
        const bufferLength = 128; const dataArray = new Float32Array(bufferLength);
        this.trackAnalysers.forEach((analyser, trackId) => {
            analyser.getFloatTimeDomainData(dataArray); let sum = 0;
            for (let i = 0; i < bufferLength; i++) { sum += dataArray[i] * dataArray[i]; }
            levels[trackId] = Math.sqrt(sum / bufferLength) * 4;
        });
        return levels;
    }
    
    getMasterLevel(): number {
        const bufferLength = this.masterAnalyser.frequencyBinCount; const dataArray = new Float32Array(bufferLength);
        this.masterAnalyser.getFloatTimeDomainData(dataArray); let sum = 0;
        for (let i = 0; i < bufferLength; i++) { sum += dataArray[i] * dataArray[i]; }
        return Math.sqrt(sum / bufferLength) * 2;
    }

    createTrackChannels(tracks: Track[]) {
        this.trackLimiters.forEach(node => node.disconnect()); this.trackOutputs.forEach(node => node.disconnect()); this.trackPanners.forEach(node => node.disconnect());
        this.trackSendNodes.forEach(sends => Object.values(sends).forEach(node => node.disconnect())); this.trackAnalysers.forEach(node => node.disconnect());
        this.trackLimiters.clear(); this.trackOutputs.clear(); this.trackPanners.clear(); this.trackSendNodes.clear(); this.trackAnalysers.clear();
        
        tracks.forEach(track => {
            const limiter = this.audioContext.createDynamicsCompressor(); limiter.threshold.value = -6; limiter.knee.value = 5; limiter.ratio.value = 12; limiter.attack.value = 0.003; limiter.release.value = 0.1;
            const gain = this.audioContext.createGain();
            
            // Universal de-clicking: Apply a 5ms micro-fade-in to prevent clicks at the start of rendering.
            const startTime = this.audioContext.currentTime;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(track.volume, startTime + 0.005);
            
            const panner = this.audioContext.createStereoPanner(); panner.pan.value = track.pan;
            const analyser = this.audioContext.createAnalyser(); analyser.fftSize = 256;
            const sends = { reverb: this.audioContext.createGain(), delay: this.audioContext.createGain(), drive: this.audioContext.createGain(), sidechain: this.audioContext.createGain() };
            sends.reverb.connect(this.reverbBus); sends.delay.connect(this.delayBus); sends.drive.connect(this.driveBus);
            limiter.connect(gain).connect(panner).connect(analyser);
            if (track.type !== 'midi') { // MIDI tracks produce no audio
                // FIX: Renamed private property to avoid conflict with public getter.
                analyser.connect(this._preCompressorBus); 
                analyser.connect(sends.reverb); 
                analyser.connect(sends.delay); 
                analyser.connect(sends.drive);
            }
            this.trackLimiters.set(track.id, limiter); this.trackOutputs.set(track.id, gain); this.trackPanners.set(track.id, panner); this.trackSendNodes.set(track.id, sends as any); this.trackAnalysers.set(track.id, analyser);
            Object.keys(sends).forEach(key => { this.updateTrackFxSend(track.id, key as keyof FXSends, track.fxSends[key as keyof FXSends]); });
        });
    }

    updateTrackVolume(trackId: number, volume: number) { this.trackOutputs.get(trackId)?.gain.setTargetAtTime(finite(volume, 0.707), this.audioContext.currentTime, 0.01); }
    updateTrackPan(trackId: number, pan: number) { this.trackPanners.get(trackId)?.pan.setTargetAtTime(finite(pan, 0), this.audioContext.currentTime, 0.01); }
    updateTrackFxSend(trackId: number, fx: keyof FXSends, value: number) { this.trackSendNodes.get(trackId)?.[fx].gain.setTargetAtTime(finite(value, 0), this.audioContext.currentTime, 0.01); }
    
    applyEnvelope(param: AudioParam, time: number, env: Envelope, peak: number, baseValue = 0) {
        const { attack, decay, sustain } = env;
        const epsilon = 1e-6;
        param.cancelScheduledValues(time);
        const startValue = baseValue > epsilon ? baseValue : epsilon;
        param.setValueAtTime(startValue, time);
        param.linearRampToValueAtTime(baseValue + peak, time + Math.max(0.002, attack));
        param.setTargetAtTime(Math.max(epsilon, baseValue + (peak * sustain)), time + Math.max(0.002, attack), Math.max(epsilon, decay / 4));
    }
    triggerRelease(param: AudioParam, time: number, env: Envelope, baseValue = 0) {
        const { release } = env;
        const epsilon = 1e-6;
        param.cancelScheduledValues(time);
        const targetValue = baseValue > epsilon ? baseValue : epsilon;
        param.setTargetAtTime(targetValue, time, Math.max(0.005, release / 4));
    }

    private createNoiseBufferAsync(): Promise<AudioBuffer> { return new Promise(resolve => setTimeout(() => { const bufferSize = this.audioContext.sampleRate * 0.5; const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate); const output = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) { output[i] = Math.random() * 2 - 1; } resolve(buffer); }, 0)); }
    private createImpulseBuffer(): AudioBuffer {
        const sampleRate = this.audioContext.sampleRate;
        const duration = 0.02; // A very short duration for a single cycle "thump"
        const bufferSize = Math.ceil(sampleRate * duration);
        const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);
        const freq = 80; // A low frequency to give body
    
        for (let i = 0; i < bufferSize; i++) {
            // A single cycle of a sine wave, faded out
            const angle = 2 * Math.PI * freq * (i / sampleRate);
            if (angle > 2 * Math.PI) {
                 data[i] = 0;
            } else {
                 data[i] = Math.sin(angle) * (1 - i / bufferSize);
            }
        }
        return buffer;
    }
    private generateImpulseResponseAsync(duration: number, decay: number): Promise<AudioBuffer> { return new Promise(resolve => setTimeout(() => { const length = this.audioContext.sampleRate * duration; const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate); const [impulseL, impulseR] = [impulse.getChannelData(0), impulse.getChannelData(1)]; for (let i = 0; i < length; i++) { const p = Math.pow(1 - i / length, decay); impulseL[i] = (Math.random() * 2 - 1) * p; impulseR[i] = (Math.random() * 2 - 1) * p; } resolve(impulse); }, 0)); }
    makeDistortionCurve(amount: number, mix: number) {
        const cacheKey = `dist_${Math.round(amount)}_${mix.toFixed(2)}`;
        if (this.curveCache.has(cacheKey)) return this.curveCache.get(cacheKey)!;
        const k = amount;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2 / n_samples) - 1;
            const shaped_x = (Math.PI + k) * x / (Math.PI + k * Math.abs(x));
            curve[i] = (1 - mix) * x + mix * (isNaN(shaped_x) ? x : shaped_x);
        }
        this.curveCache.set(cacheKey, curve);
        return curve;
    }
    makeBitcrusherCurve(bitDepth: number, mix: number) { 
        const cacheKey = `bcrush_${bitDepth.toFixed(2)}_${mix.toFixed(2)}`; 
        if (this.curveCache.has(cacheKey)) return this.curveCache.get(cacheKey)!; 
        const steps = Math.pow(2, bitDepth); 
        const curve = new Float32Array(257); 
        for (let i = 0; i < 257; i++) { 
            const x = -1 + (2 * i) / 256; 
            const shaped_x = bitDepth < 16 ? Math.round(x * (steps / 2)) / (steps / 2) : x; 
            curve[i] = (1 - mix) * x + mix * shaped_x;
        } 
        this.curveCache.set(cacheKey, curve); 
        return curve; 
    }
    makeFoldCurve(amount: number, mix: number) {
        const cacheKey = `fold_${Math.round(amount)}_${mix.toFixed(2)}`;
        if (this.curveCache.has(cacheKey)) return this.curveCache.get(cacheKey)!;
        const curve = new Float32Array(256);
        const foldAmount = 1 + amount / 10;
        for (let i = 0; i < 256; i++) {
            let x = i * 2 / 255 - 1;
            let folded_x = Math.sin(x * Math.PI * foldAmount);
            curve[i] = (1 - mix) * x + mix * folded_x;
        }
        this.curveCache.set(cacheKey, curve);
        return curve;
    }
    getArcaneShapeCurve(shapeValue: number) { const cacheKey = `arcane_${Math.round(shapeValue)}`; if (this.shapeCache.has(cacheKey)) return this.shapeCache.get(cacheKey)!; const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const p = i / 255, s = 2 * p - 1, w = 0.5 + (shapeValue / 100) * 0.49, u = p < w ? 1 : -1, m = shapeValue / 100; curve[i] = (1 - m) * s + m * u; } this.shapeCache.set(cacheKey, curve); return curve; }
    getArtificeShapeCurve(shapeValue: number) { const cacheKey = `artifice_${Math.round(shapeValue)}`; if (this.shapeCache.has(cacheKey)) return this.shapeCache.get(cacheKey)!; const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const p = i / 255, s = Math.sin(p * 2 * Math.PI), t = 1 - 4 * Math.abs(p - 0.5), m = shapeValue / 100; curve[i] = (1 - m) * s + m * t; } this.shapeCache.set(cacheKey, curve); return curve; }
    getWarpTable(index: number) { if (this.warpTableCache.has(index)) return this.warpTableCache.get(index)!; const size = 2048, real = new Float32Array(size), imag = new Float32Array(size); switch (index) { case 0: for (let i = 1; i < size / 2; i++) { imag[i] = 0.5 / i; } break; case 1: for (let i = 1; i < size / 2; i += 2) { imag[i] = 0.5 / i; } break; case 2: [1, 1.414, 2.3, 3.8, 4.5].forEach(h => { const b = Math.round(h * 2); if(b < size) imag[b] = 0.2; }); break; default: imag[1] = 0.6; imag[2] = 0.2; imag[3] = 0.1; imag[4] = 0.05; break; } const wave = this.audioContext.createPeriodicWave(real, imag, { disableNormalization: true }); this.warpTableCache.set(index, wave); return wave; }
    
    updateBpm(bpm: number) { this.bpm = finite(bpm, 120); }
    updateReverb(params: GlobalFXParams['reverb'], bpm: number) { if (!this.reverb.buffer) return; const safeBpm = finite(bpm, 120) > 0 ? finite(bpm, 120) : 120; const decay = finite(params.decay, 1.0); this.reverb.buffer = this.audioContext.createBuffer(2, 1, this.audioContext.sampleRate); this.generateImpulseResponseAsync(Math.max(decay, 0.1), Math.max(decay, 0.1)).then(b => this.reverb.buffer = b); this.reverbWet.gain.setTargetAtTime(finite(params.mix, 0.25), this.audioContext.currentTime, 0.01); this.reverbDampingFilter.frequency.setTargetAtTime(finite(params.damping, 6000), this.audioContext.currentTime, 0.01); const pd = params.preDelaySync ? (60 / safeBpm) * finite(params.preDelayDivision, 1) : finite(params.preDelay, 0.01); this.reverbPreDelay.delayTime.setTargetAtTime(pd, this.audioContext.currentTime, 0.01); }
    updateDelay(params: GlobalFXParams['delay'], bpm: number) { const { feedback, mix, timeSync, timeDivision, tone } = params; const safeBpm = finite(bpm, 120) > 0 ? finite(bpm, 120) : 120; const time = timeSync ? (60 / safeBpm) * finite(timeDivision, 1) : finite(params.time, 0.5); this.delay.delayTime.setTargetAtTime(time, this.audioContext.currentTime, 0.01); this.delayFeedback.gain.setTargetAtTime(Math.min(0.92, finite(feedback, 0.45)), this.audioContext.currentTime, 0.01); this.delayFilter.frequency.setTargetAtTime(finite(tone, 5000), this.audioContext.currentTime, 0.01); this.delayWet.gain.setTargetAtTime(finite(mix, 0.35), this.audioContext.currentTime, 0.01); }
    updateDrive(params: GlobalFXParams['drive']) { this.drive.curve = this.makeDistortionCurve(finite(params.amount, 0), 1.0); this.driveTone.frequency.setTargetAtTime(finite(params.tone, 7000), this.audioContext.currentTime, 0.01); this.driveWet.gain.setTargetAtTime(finite(params.mix, 0.1), this.audioContext.currentTime, 0.01); }
    updateCharacter(params: GlobalFXParams['character']) {
        const { mode, amount, mix } = params;
        let curve;
        switch(mode) {
            case 'tape': curve = this.makeDistortionCurve(amount / 5, mix); break;
            case 'saturate': curve = this.makeDistortionCurve(amount / 4, mix); break;
            case 'overdrive': curve = this.makeDistortionCurve(amount, mix); break;
            case 'bitcrush': curve = this.makeBitcrusherCurve(16 - (amount / 100) * 14, mix); break;
            case 'fold': curve = this.makeFoldCurve(amount, mix); break;
            default: curve = this.makeDistortionCurve(0, 0); // linear
        }
        this.character.curve = curve;
    }
    updateMasterVolume(volume: number) { this.masterGain.gain.setTargetAtTime(finite(volume, 0.9), this.audioContext.currentTime, 0.01); }
    updateCompressor(params: CompressorParams) {
        const now = this.audioContext.currentTime;
        const { enabled, threshold, ratio, knee, attack, release, makeup, sidechainSource } = params;

        if (enabled) {
            this.masterCompressor.threshold.setTargetAtTime(finite(threshold, -20), now, 0.01);
            this.masterCompressor.ratio.setTargetAtTime(finite(ratio, 4), now, 0.01);
            this.masterCompressor.knee.setTargetAtTime(finite(knee, 10), now, 0.01);
            this.masterCompressor.attack.setTargetAtTime(finite(attack, 0.003), now, 0.01);
            this.masterCompressor.release.setTargetAtTime(finite(release, 0.25), now, 0.01);
            this.makeupGain.gain.setTargetAtTime(Math.pow(10, finite(makeup, 4) / 20), now, 0.01);
        } else {
            // Bypass settings
            this.masterCompressor.threshold.setTargetAtTime(0, now, 0.01);
            this.masterCompressor.ratio.setTargetAtTime(1, now, 0.01);
            this.masterCompressor.knee.setTargetAtTime(0, now, 0.01);
            this.masterCompressor.attack.setTargetAtTime(0.001, now, 0.01);
            this.masterCompressor.release.setTargetAtTime(0.05, now, 0.01);
            this.makeupGain.gain.setTargetAtTime(1.0, now, 0.01); // Unity gain
        }

        this.sidechainSourceId = sidechainSource;
        // FIX: Deep clone the params object to prevent accessing a revoked proxy.
        // This was the root cause of the crash when sidechain was active.
        this.sidechainParams = deepClone(params);
    }
    updateMasterFilter(params: GlobalFXParams['masterFilter']) { const now = this.audioContext.currentTime; this.masterFilter.type = params.type; this.masterFilter.frequency.setTargetAtTime(finite(params.cutoff, 20000), now, 0.01); this.masterFilter.Q.setTargetAtTime(finite(params.resonance, 1), now, 0.01); }
    updateLiveParameter(trackId: number, path: string, value: any) { /* This would require a more complex voice architecture; for now, changes apply to new notes */ }

    private applyLFO(
        lfoParams: LFOParams,
        targetParam: AudioParam | AudioParam[],
        scale: number,
        time: number,
        stopTime: number
    ): AudioNode[] {
        if (!lfoParams || lfoParams.depth === 0 || lfoParams.destination === 'none') {
            return [];
        }
    
        const targets = Array.isArray(targetParam) ? targetParam : [targetParam];
        if (targets.length === 0) return [];
    
        const { waveform, rateSync, rateDivision, rate, depth } = lfoParams;
    
        const lfo = this.audioContext.createOscillator();
        lfo.type = waveform;
    
        if (rateSync) {
            const lfoFrequency = 1 / (rateDivision * (60 / this.bpm));
            if (isFinite(lfoFrequency)) lfo.frequency.setValueAtTime(lfoFrequency, time);
        } else {
            if (isFinite(rate)) lfo.frequency.setValueAtTime(rate, time);
        }
    
        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.setValueAtTime(depth * scale, time);
    
        lfo.connect(lfoGain);
        targets.forEach(target => lfoGain.connect(target));
    
        lfo.start(time);
        lfo.stop(stopTime);
    
        return [lfo, lfoGain];
    }

    private getMidiOutParamValue(track: Track, pLocks: PLocks | null, key: keyof MidiOutParams): any {
        if (pLocks?.midiOutParams?.[key] !== undefined) {
            return pLocks.midiOutParams[key];
        }
        if (track.midiOut) {
            return track.midiOut[key];
        }
        return key === 'channel' ? 1 : null;
    }
    private createParameterResolver(track: Track, pLocks: PLocks | null, loopTime: number) {
        const getDeepValue = (obj: any, path: string): any => {
            return path.split('.').reduce((acc, part) => {
                if (acc === null || acc === undefined) {
                    return undefined;
                }
                return acc[part];
            }, obj);
        };
        return (path: string) => {
            let val;
            const automationPath = `params.${path}`;
            if (track.automation[automationPath]) {
                const secondsPerBeat = 60 / this.bpm;
                const loopTimeInBeats = loopTime / secondsPerBeat;
                val = getAutomationValue(track.automation, automationPath, loopTimeInBeats);
            }
            if (val !== undefined) return val;
            if (pLocks) {
                const pLockRoot = pLocks[`${track.type}Params` as keyof PLocks];
                if (pLockRoot) {
                    val = getDeepValue(pLockRoot, path);
                    if (val !== undefined) return val;
                }
            }
            return getDeepValue(track.params, path);
        };
    }
    private triggerSidechain(time: number, velocity: number) { if (!this.sidechainParams) return; const { attack, release, threshold, ratio } = this.sidechainParams; const duckAmount = (1 - (finite(threshold, -12) / -100)) * (finite(ratio, 4) / 20); const finalDuckAmount = Math.max(0, Math.min(1, duckAmount * finite(velocity, 1))); const duckedGain = 1 - finalDuckAmount; const gain = this.sidechainDucker.gain; gain.cancelScheduledValues(time); gain.setTargetAtTime(duckedGain, time, finite(attack, 0.003)); gain.setTargetAtTime(1.0, time + finite(attack, 0.003), finite(release, 0.25) / 2); }
    
    private shouldTrigger(trackId: number, step: StepState, loopCount: number) {
        const condition = step.condition;
        if (!condition || typeof condition.type === 'undefined' || condition.type === 'always') {
            return true;
        }

        const { type, p, a, b } = condition;
        let count = this.trigCounts.get(trackId) || 0;
        switch (type) {
            case 'probability':
                // Guard against missing 'p' value
                return Math.random() * 100 < (p ?? 100);
            case 'a:b':
                // Guard against missing 'a' or 'b', or b being zero
                if (typeof a !== 'number' || typeof b !== 'number' || b === 0) {
                    return true; // Default to always trigger if condition is malformed
                }
                return (count % b) + 1 === a;
            case 'first': return !this.hasPlayedFirst.has(trackId);
            case '!first': return this.hasPlayedFirst.has(trackId);
            case 'pre': return this.lastStepPlayed.get(trackId) === loopCount - 1;
            case '!pre': return this.lastStepPlayed.get(trackId) !== loopCount - 1;
            default: return true;
        }
    }

    private stealVoice() {
        let oldestVoiceKey: string | null = null;
        let oldestStopTime = Infinity;

        this.activeVoices.forEach((voice, key) => {
            if (voice.stopTime < oldestStopTime) {
                oldestStopTime = voice.stopTime;
                oldestVoiceKey = key;
            }
        });
        
        if (oldestVoiceKey) {
            const voiceToSteal = this.activeVoices.get(oldestVoiceKey)!;
            
            voiceToSteal.nodes.forEach(node => {
                if (node instanceof GainNode && 'gain' in node) {
                    node.gain.cancelScheduledValues(this.audioContext.currentTime);
                    node.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.015);
                }
            });
            
            setTimeout(() => {
                voiceToSteal.nodes.forEach(node => node.disconnect());
                this.activeVoices.delete(oldestVoiceKey!);
            }, 50);
        }
    }
    private playMidiStep(track: Track, stepState: StepState, time: number) {
        const pLocks = stepState.pLocks;
        const deviceId = this.getMidiOutParamValue(track, pLocks, 'deviceId');
        const channel = this.getMidiOutParamValue(track, pLocks, 'channel') - 1; // MIDI channels 0-15
        if (!deviceId || channel < 0 || channel > 15) return;

        const output = this.midiOutputs.find(o => o.id === deviceId);
        if (!output) return;

        const notes = (stepState.notes && stepState.notes.length > 0) ? stepState.notes : [track.defaultNote];
        const velocity = Math.round((stepState.velocity ?? 1.0) * 127);
        const durationInSteps = stepState.duration || 1;
        const durationInSeconds = durationInSteps * (60 / this.bpm / 4);
        
        const noteOnTimeMs = this.getPerformanceTime(time);
        const noteOffTimeMs = this.getPerformanceTime(time + durationInSeconds);

        // Send CC P-Locks
        if (stepState.pLocks?.ccLocks) {
            stepState.pLocks.ccLocks.forEach(lock => {
                output.send([0xB0 + channel, lock.cc, lock.value], noteOnTimeMs);
            });
        }

        notes.forEach(note => {
            const midiNote = noteNameToMidi(note);
            if (midiNote < 0 || midiNote > 127) return;

            output.send([0x90 + channel, midiNote, velocity], noteOnTimeMs);
            output.send([0x80 + channel, midiNote, 0], noteOffTimeMs);
        });
    }


    private playVoice(type: TrackType, track: Track, pLocks: PLocks | null, time: number, note: string, velocity: number, loopTime: number) {
        if (this.activeVoices.size >= MAX_ACTIVE_VOICES) {
            this.stealVoice();
        }
        
        const voiceId = `voice-${track.id}-${time}-${note}-${Math.random()}`;
        let voice;
        switch (type) {
            case 'kick': voice = this.createKickVoice(track, pLocks, time, note, velocity, loopTime); break;
            case 'hat': voice = this.createHatVoice(track, pLocks, time, note, velocity, loopTime); break;
            case 'arcane': voice = this.createArcaneVoice(track, pLocks, time, note, velocity, loopTime); break;
            case 'ruin': voice = this.createRuinVoice(track, pLocks, time, note, velocity, loopTime); break;
            case 'artifice': voice = this.createArtificeVoice(track, pLocks, time, note, velocity, loopTime); break;
            case 'shift': voice = this.createShiftVoice(track, pLocks, time, note, velocity, loopTime); break;
            case 'reson': voice = this.createResonVoice(track, pLocks, time, note, velocity, loopTime); break;
            case 'alloy': voice = this.createAlloyVoice(track, pLocks, time, note, velocity, loopTime); break;
        }
        if (voice) {
             const gainNode = voice.nodes.find(n => n instanceof GainNode && n.gain) as GainNode | undefined;
             this.activeVoices.set(voiceId, { ...voice, gain: gainNode?.gain.value ?? velocity });
        }
    }

    public playNote(track: Track, note: string, velocity: number) {
        if (track.type === 'midi') return;
        this.playVoice(track.type, track, null, this.audioContext.currentTime, note, velocity, 0);
    }
    
    playStep(track: Track, stepState: StepState, time: number, loopTime: number, loopCount: number) {
        if (!stepState || !stepState.active || !this.shouldTrigger(track.id, stepState, loopCount)) return;
        
        if (track.type === 'midi') {
            this.playMidiStep(track, stepState, time);
            return;
        }

        const notes = (stepState.notes && stepState.notes.length > 0) ? stepState.notes : [track.defaultNote];
        if (track.id === this.sidechainSourceId) this.triggerSidechain(time, stepState.velocity);
        notes.forEach(note => {
            this.playVoice(track.type, track, stepState.pLocks, time, note, stepState.velocity, loopTime);
        });
        
        let count = this.trigCounts.get(track.id) || 0;
        this.trigCounts.set(track.id, count + 1);
        this.hasPlayedFirst.add(track.id);
        this.lastStepPlayed.set(track.id, loopCount);
    }
    
    private createKickVoice(t: Track, p: PLocks | null, time: number, note: string, vel: number, lt: number) {
        const limiter = this.trackLimiters.get(t.id);
        if (!limiter) return;
    
        const param = this.createParameterResolver(t, p, lt);
        
        const rawEnv = param('ampEnv');
        const env = { attack: finite(rawEnv?.attack, 0.001), decay: finite(rawEnv?.decay, 0.4), sustain: finite(rawEnv?.sustain, 0), release: finite(rawEnv?.release, 0.2) };
        const stopTime = time + env.attack + env.decay + env.release + 0.5;
    
        const panner = this.audioContext.createStereoPanner();
        const amp = this.audioContext.createGain();
        const f = this.audioContext.createBiquadFilter();
        const body = this.audioContext.createBiquadFilter();
        const impulse = this.audioContext.createBufferSource();
        const click = this.audioContext.createBufferSource();
        const cFilter = this.audioContext.createBiquadFilter();
        const cGain = this.audioContext.createGain();
        const sat = this.audioContext.createWaveShaper();
        
        const nodes: AudioNode[] = [panner, amp, f, body, impulse, click, cFilter, cGain, sat];
    
        // Routing
        impulse.connect(body);
        click.connect(cFilter).connect(cGain);
        body.connect(sat);
        cGain.connect(sat);
        sat.connect(amp);
        amp.connect(f).connect(panner).connect(limiter);
    
        // Base values
        const baseTune = finite(param('tune'), 40);
        this.applyEnvelope(amp.gain, time, env, vel);
        this.triggerRelease(amp.gain, time + env.attack + env.decay, env);
        panner.pan.setValueAtTime(0, time);
        f.type = param('filter.type') || 'lowpass';
        f.frequency.setValueAtTime(finite(param('filter.cutoff'), 20000), time);
        f.Q.setValueAtTime(finite(param('filter.resonance'), 1), time);
        body.type = 'lowpass';
        body.Q.setValueAtTime(20 + (finite(param('character'), 60) / 100) * 30, time);
        body.frequency.setValueAtTime(baseTune * 8, time);
        body.frequency.exponentialRampToValueAtTime(baseTune, time + 0.01 + (finite(param('tone'), 50) / 100) * 0.1);
        impulse.buffer = this.kickImpulseBuffer;
        click.buffer = this.noiseBuffer;
        cFilter.type = 'highpass';
        cFilter.frequency.setValueAtTime(4000, time);
        const cEnv = { attack: 0.002, decay: 0.015, sustain: 0, release: 0.01 };
        this.applyEnvelope(cGain.gain, time, cEnv, (finite(param('impact'), 80) / 100) * 1.5 * vel);
        this.triggerRelease(cGain.gain, time + cEnv.attack + cEnv.decay, cEnv);
        sat.curve = this.makeDistortionCurve(finite(param('character'), 60) / 2, 1.0);
        sat.oversample = '4x';
    
        // LFOs
        const lfo1 = param('lfo1'), lfo2 = param('lfo2');
        const lfoTargets: Record<string, { param: AudioParam | AudioParam[], scale: number }> = {
            'volume': { param: amp.gain, scale: 1 / 1000 },
            'pan': { param: panner.pan, scale: 1 / 1000 },
            'filter.cutoff': { param: f.frequency, scale: 10 },
            'filter.resonance': { param: f.Q, scale: 30 / 1000 },
            'kick.tune': { param: body.frequency, scale: 0.1 },
            'kick.character': { param: body.Q, scale: 30 / 1000 },
            'kick.impact': { param: cGain.gain, scale: 1.5 / 1000 }
        };
        [lfo1, lfo2].forEach(lfo => {
            const target = lfo && lfoTargets[lfo.destination];
            if (target) nodes.push(...this.applyLFO(lfo, target.param, target.scale, time, stopTime));
        });
    
        impulse.start(time); click.start(time);
        
        return { nodes, stopTime };
    }

    private createHatVoice(t: Track, p: PLocks | null, time: number, note: string, vel: number, lt: number) {
        const limiter = this.trackLimiters.get(t.id);
        if (!limiter) return;
    
        const param = this.createParameterResolver(t, p, lt);
    
        const rawEnv = param('ampEnv');
        const env = { attack: finite(rawEnv?.attack, 0.001), decay: finite(rawEnv?.decay, 0.08), sustain: finite(rawEnv?.sustain, 0), release: finite(rawEnv?.release, 0.05) };
        const stopTime = time + env.attack + env.decay + env.release + 0.5;
    
        const panner = this.audioContext.createStereoPanner();
        const amp = this.audioContext.createGain();
        const f = this.audioContext.createBiquadFilter();
        const noise = this.audioContext.createBufferSource();
        const bp1 = this.audioContext.createBiquadFilter();
        const bp2 = this.audioContext.createBiquadFilter();
        const hp = this.audioContext.createBiquadFilter();
        const nodes: AudioNode[] = [panner, amp, f, noise, bp1, bp2, hp];
    
        // Routing
        noise.connect(bp1).connect(hp);
        noise.connect(bp2).connect(hp);
        hp.connect(amp).connect(f).connect(panner).connect(limiter);
    
        // Base values
        this.applyEnvelope(amp.gain, time, env, vel);
        this.triggerRelease(amp.gain, time + env.attack + env.decay, env);
        panner.pan.setValueAtTime(0, time);
        f.type = param('filter.type') || 'highpass';
        f.frequency.setValueAtTime(finite(param('filter.cutoff'), 8000), time);
        f.Q.setValueAtTime(finite(param('filter.resonance'), 1.5), time);
        noise.buffer = this.noiseBuffer; noise.loop = true;
        const tone = finite(param('tone'), 9500);
        const character = finite(param('character'), 80);
        bp1.type = 'bandpass';
        bp1.frequency.setValueAtTime(tone, time);
        bp1.Q.setValueAtTime(5 + (character / 100) * 25, time);
        bp2.type = 'bandpass';
        bp2.frequency.setValueAtTime(tone * finite(param('spread'), 1.8), time);
        bp2.Q.setValueAtTime(5 + (character / 100) * 25, time);
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(7000, time);
    
        // LFOs
        const lfo1 = param('lfo1'), lfo2 = param('lfo2');
        const lfoTargets: Record<string, { param: AudioParam | AudioParam[], scale: number }> = {
            'volume': { param: amp.gain, scale: 1 / 1000 },
            'pan': { param: panner.pan, scale: 1 / 1000 },
            'filter.cutoff': { param: f.frequency, scale: 10 },
            'filter.resonance': { param: f.Q, scale: 30 / 1000 },
            'hat.tone': { param: [bp1.frequency, bp2.frequency], scale: 10 },
            'hat.character': { param: [bp1.Q, bp2.Q], scale: 25 / 1000 }
        };
        [lfo1, lfo2].forEach(lfo => {
            const target = lfo && lfoTargets[lfo.destination];
            if (target) nodes.push(...this.applyLFO(lfo, target.param, target.scale, time, stopTime));
        });
    
        noise.start(time); noise.stop(stopTime);
        return { nodes, stopTime };
    }

    private createArcaneVoice(t: Track, p: PLocks | null, time: number, note: string, vel: number, lt: number) { const limiter = this.trackLimiters.get(t.id); if (!limiter) return; const param = this.createParameterResolver(t, p, lt); const freq = noteToFreq(note); if(!isFinite(freq)) return; const rawEnv = param('ampEnv'); const env = { attack: finite(rawEnv?.attack, 0.01), decay: finite(rawEnv?.decay, 0.4), sustain: finite(rawEnv?.sustain, 0.2), release: finite(rawEnv?.release, 0.3) }; const stopTime = time + env.attack + env.decay + env.release + 0.5; const panner = this.audioContext.createStereoPanner(); const finalGain = this.audioContext.createGain(); const amp = this.audioContext.createGain(); const o1 = this.audioContext.createOscillator(); const o1s = this.audioContext.createWaveShaper(); const o1g = this.audioContext.createGain(); const o2 = this.audioContext.createOscillator(); const o2s = this.audioContext.createWaveShaper(); const o2g = this.audioContext.createGain(); const mod = this.audioContext.createGain(); const fold = this.audioContext.createWaveShaper(); const f = this.audioContext.createBiquadFilter(); let rm: GainNode | null = null; const foldGain = this.audioContext.createGain(); const nodes: AudioNode[] = [panner, finalGain, amp, o1, o1s, o1g, o2, o2s, o2g, mod, fold, f, foldGain]; o1.connect(o1s).connect(o1g); o2.connect(o2s).connect(o2g); o2g.connect(mod); const mode = param('mode'); switch (mode) { case 'pm': mod.connect(o1.frequency); break; case 'add': o1g.connect(amp); o2g.connect(amp); break; case 'ring': rm = this.audioContext.createGain(); nodes.push(rm); o1g.connect(rm.gain); mod.connect(rm); rm.connect(amp); break; case 'hard_sync': mod.connect(o1.frequency); break; } if (mode !== 'add' && mode !== 'ring') o1g.connect(amp); amp.connect(foldGain).connect(fold).connect(f).connect(finalGain).connect(panner).connect(limiter); this.applyEnvelope(amp.gain, time, env, vel); this.triggerRelease(amp.gain, time + env.attack + env.decay, env); panner.pan.setValueAtTime(0, time); finalGain.gain.value = 0.251; o1.frequency.setValueAtTime(freq, time); o1s.curve = this.getArcaneShapeCurve(finite(param('osc1_shape'), 50)); const spread = finite(param('spread'), 10); o1.detune.setValueAtTime(spread / 2, time); o2.frequency.setValueAtTime(freq, time); o2.detune.setValueAtTime(finite(param('osc2_pitch'), 7) * 100 + finite(param('osc2_fine'), 5) - (spread / 2), time); o2s.curve = this.getArcaneShapeCurve(finite(param('osc2_shape'), 75)); mod.gain.setValueAtTime(finite(param('mod_amount'), 30) * (mode === 'pm' ? 50 : 1), time); fold.curve = this.makeFoldCurve(finite(param('fold'), 20), 1.0); f.type = param('filter.type') || 'lowpass'; f.frequency.setValueAtTime(finite(param('filter.cutoff'), 5000), time); f.Q.setValueAtTime(finite(param('filter.resonance'), 4), time); const lfo1 = param('lfo1'), lfo2 = param('lfo2'); const lfoInverter = this.audioContext.createGain(); lfoInverter.gain.setValueAtTime(-1, this.audioContext.currentTime); nodes.push(lfoInverter); const lfoTargets: Record<string, { param: AudioParam | AudioParam[], scale: number, inverter?: GainNode }> = { 'volume': { param: amp.gain, scale: 1 / 1000 }, 'pan': { param: panner.pan, scale: 1 / 1000 }, 'filter.cutoff': { param: f.frequency, scale: 10 }, 'filter.resonance': { param: f.Q, scale: 30 / 1000 }, 'arcane.osc2_pitch': { param: o2.detune, scale: 1 }, 'arcane.mod_amount': { param: mod.gain, scale: mode === 'pm' ? 50 : 1 }, 'arcane.fold': { param: foldGain.gain, scale: 1 / 1000 }, 'arcane.spread': { param: [o1.detune, o2.detune], scale: 0.5, inverter: lfoInverter } }; [lfo1, lfo2].forEach(lfo => { if (!lfo || lfo.depth === 0 || lfo.destination === 'none') return; const targetInfo = lfo && lfoTargets[lfo.destination]; if (targetInfo) { if (lfo.destination === 'arcane.spread') { const lfoNodes = this.applyLFO(lfo, targetInfo.param[0], targetInfo.scale, time, stopTime); if (lfoNodes.length > 0) { const lfoGain = lfoNodes[1]; lfoGain.connect(targetInfo.inverter!).connect(targetInfo.param[1] as AudioParam); nodes.push(...lfoNodes); } } else { nodes.push(...this.applyLFO(lfo, targetInfo.param, targetInfo.scale, time, stopTime)); } } }); o1.start(time); o2.start(time); o1.stop(stopTime); o2.stop(stopTime); return { nodes, stopTime }; }
    private createRuinVoice(t: Track, p: PLocks | null, time: number, note: string, vel: number, lt: number) {
        const limiter = this.trackLimiters.get(t.id);
        if (!limiter) return;
    
        const param = this.createParameterResolver(t, p, lt);
        const freq = noteToFreq(note) * Math.pow(2, (finite(param('pitch'), 36) - 60) / 12);
        if(!isFinite(freq)) return;
    
        const attack = finite(param('attack'), 0.005);
        const decay = finite(param('decay'), 0.35);
        const stopTime = time + attack + decay + 0.5;
    
        const panner = this.audioContext.createStereoPanner();
        const finalGain = this.audioContext.createGain();
        const amp = this.audioContext.createGain();
        const osc = this.audioContext.createOscillator();
        const shaper = this.audioContext.createWaveShaper();
        const driveShaper = this.audioContext.createWaveShaper();
        const foldShaper = this.audioContext.createWaveShaper();
        const f = this.audioContext.createBiquadFilter();
        
        let fb: GainNode | null = null;
        const timbreGain = this.audioContext.createGain();
        const driveGain = this.audioContext.createGain();
        const foldGain = this.audioContext.createGain();
        const nodes: AudioNode[] = [panner, finalGain, amp, osc, shaper, driveShaper, foldShaper, f, timbreGain, driveGain, foldGain];
        
        const timbre = finite(param('timbre'), 50);
        const algorithm = param('algorithm');
    
        // Setup audio graph based on algorithm
        if (algorithm === 'feedback_pm') {
            shaper.curve = this.makeFoldCurve(timbre, 1.0);
            fb = this.audioContext.createGain();
            nodes.push(fb);
            fb.gain.setValueAtTime(timbre / 120, time);
            
            osc.connect(timbreGain).connect(shaper);
            shaper.connect(fb).connect(osc.frequency);
            shaper.connect(driveGain).connect(driveShaper).connect(foldGain).connect(foldShaper).connect(amp);
        } else {
            if (algorithm === 'distort_fold') {
                shaper.curve = this.makeDistortionCurve(timbre, 1.0);
            } else { // 'overload'
                shaper.curve = this.makeBitcrusherCurve(16 - (timbre / 100) * 12, 1.0);
            }
            osc.connect(timbreGain).connect(shaper).connect(driveGain).connect(driveShaper).connect(foldGain).connect(foldShaper).connect(amp);
        }
        amp.connect(f).connect(finalGain).connect(panner).connect(limiter);
    
        // Set initial parameter values
        amp.gain.setValueAtTime(0, time);
        amp.gain.linearRampToValueAtTime(vel, time + attack);
        amp.gain.setTargetAtTime(0, time + attack, decay / 4);
        panner.pan.setValueAtTime(0, time);
        finalGain.gain.value = 0.251;
        osc.frequency.setValueAtTime(freq, time);
        driveShaper.curve = this.makeDistortionCurve(finite(param('drive'), 40), 1.0);
        foldShaper.curve = this.makeFoldCurve(finite(param('fold'), 60), 1.0);
        
        f.type = param('filter.type') || 'lowpass';
        f.frequency.setValueAtTime(finite(param('filter.cutoff'), 800), time);
        f.Q.setValueAtTime(finite(param('filter.resonance'), 6), time);
        
        // LFOs
        const lfo1 = param('lfo1'), lfo2 = param('lfo2');
        const lfoTargets: Record<string, { param: AudioParam | AudioParam[], scale: number }> = {
            'volume': { param: amp.gain, scale: 1 / 1000 },
            'pan': { param: panner.pan, scale: 1 / 1000 },
            'filter.cutoff': { param: f.frequency, scale: 10 },
            'filter.resonance': { param: f.Q, scale: 30 / 1000 },
            'ruin.pitch': { param: osc.frequency, scale: 1 },
            'ruin.timbre': { param: timbreGain.gain, scale: 1 / 1000 },
            'ruin.drive': { param: driveGain.gain, scale: 1 / 1000 },
            'ruin.fold': { param: foldGain.gain, scale: 1 / 1000 },
            'ruin.decay': {param: amp.gain, scale: 1/1000} // Simplified decay modulation
        };
    
        [lfo1, lfo2].forEach(lfo => {
            const destination = lfo?.destination;
            if (destination && lfoTargets[destination] && lfo.depth > 0) {
                nodes.push(...this.applyLFO(lfo, lfoTargets[destination].param, lfoTargets[destination].scale, time, stopTime));
            }
        });
    
        osc.start(time);
        osc.stop(stopTime);
        return { nodes, stopTime };
    }
    private createArtificeVoice(t: Track, p: PLocks | null, time: number, note: string, vel: number, lt: number) { const limiter = this.trackLimiters.get(t.id); if (!limiter) return; const param = this.createParameterResolver(t, p, lt); const freq = noteToFreq(note); if(!isFinite(freq)) return; const rawEnv = param('ampEnv'); const env = { attack: finite(rawEnv?.attack, 0.001), decay: finite(rawEnv?.decay, 0.5), sustain: finite(rawEnv?.sustain, 0), release: finite(rawEnv?.release, 0.3) }; const stopTime = time + env.attack + env.decay + env.release + 0.5; const panner = this.audioContext.createStereoPanner(); const finalGain = this.audioContext.createGain(); const amp = this.audioContext.createGain(); const o1 = this.audioContext.createOscillator(); const o1s = this.audioContext.createWaveShaper(); const o1g = this.audioContext.createGain(); const o2 = this.audioContext.createOscillator(); const o2s = this.audioContext.createWaveShaper(); const o2g = this.audioContext.createGain(); const fm = this.audioContext.createGain(); const noise = this.audioContext.createBufferSource(); const ng = this.audioContext.createGain(); const mixer = this.audioContext.createGain(); const f1 = this.audioContext.createBiquadFilter(); const f2 = this.audioContext.createBiquadFilter(); const nodes: AudioNode[] = [panner, finalGain, amp, o1, o1s, o1g, o2, o2s, o2g, fm, noise, ng, mixer, f1, f2]; o1.connect(o1s).connect(o1g); o2.connect(o2s).connect(o2g); fm.gain.setValueAtTime(finite(param('fm_amount'), 0) * 5, time); o2g.connect(fm).connect(o1.frequency); const mix = finite(param('osc_mix'), 0) / 100; o1g.gain.setValueAtTime(0.5 * (1 - mix), time); o2g.gain.setValueAtTime(0.5 * (1 + mix), time); noise.buffer = this.noiseBuffer; noise.loop = true; ng.gain.setValueAtTime(finite(param('noise_level'), 5) / 200, time); noise.connect(ng); o1g.connect(mixer); o2g.connect(mixer); ng.connect(mixer); switch (param('filter_mode')) { case 'lp_hp_p': f1.type = 'lowpass'; f2.type = 'highpass'; mixer.connect(f1).connect(amp); mixer.connect(f2).connect(amp); break; case 'lp_hp_s': f1.type = 'lowpass'; f2.type = 'highpass'; mixer.connect(f1).connect(f2).connect(amp); break; case 'bp_bp_p': f1.type = 'bandpass'; f2.type = 'bandpass'; mixer.connect(f1).connect(amp); mixer.connect(f2).connect(amp); break; } amp.connect(finalGain).connect(panner).connect(limiter); this.applyEnvelope(amp.gain, time, env, vel); this.triggerRelease(amp.gain, time + env.attack + env.decay, env); panner.pan.setValueAtTime(0, time); finalGain.gain.value = 0.251; o1.frequency.setValueAtTime(freq, time); o1s.curve = this.getArtificeShapeCurve(finite(param('osc1_shape'), 50)); o2.frequency.setValueAtTime(freq, time); o2.detune.setValueAtTime(finite(param('osc2_pitch'), 0) * 100 + finite(param('osc2_fine'), -3), time); o2s.curve = this.getArtificeShapeCurve(finite(param('osc2_shape'), 25)); const rawFenv = param('filterEnv'); const fenv = { attack: finite(rawFenv?.attack, 0.01), decay: finite(rawFenv?.decay, 0.2), sustain: finite(rawFenv?.sustain, 0), release: finite(rawFenv?.release, 0.2) }; const famt = finite(param('filterEnvAmount'), 6000); const fCut = finite(param('filter_cutoff'), 4000); const fRes = finite(param('filter_res'), 5); const fSpread = finite(param('filter_spread'), -12); this.applyEnvelope(f1.frequency, time, fenv, famt, fCut); this.triggerRelease(f1.frequency, time + fenv.attack + fenv.decay, fenv, fCut); f1.Q.setValueAtTime(fRes, time); const f2Cut = fCut * Math.pow(2, fSpread / 12); this.applyEnvelope(f2.frequency, time, fenv, famt, f2Cut); this.triggerRelease(f2.frequency, time + fenv.attack + fenv.decay, fenv, f2Cut); f2.Q.setValueAtTime(fRes, time); const lfo1 = param('lfo1'), lfo2 = param('lfo2'); const lfoTargets: Record<string, { param: AudioParam | AudioParam[], scale: number }> = { 'volume': { param: amp.gain, scale: 1 / 1000 }, 'pan': { param: panner.pan, scale: 1 / 1000 }, 'artifice.filter_cutoff': { param: [f1.frequency, f2.frequency], scale: 10 }, 'artifice.filter_res': { param: [f1.Q, f2.Q], scale: 30 / 1000 }, 'artifice.osc_mix': { param: o2g.gain, scale: 0.5 / 1000 }, 'artifice.fm_amount': { param: fm.gain, scale: 5 / 1000 }, 'artifice.osc2_pitch': { param: o2.detune, scale: 1 }, 'artifice.noise_level': { param: ng.gain, scale: 0.5 / 100 / 1000 }, 'artifice.filter_spread': { param: f2.frequency, scale: 10 } }; [lfo1, lfo2].forEach(lfo => { const target = lfo && lfoTargets[lfo.destination]; if (target) nodes.push(...this.applyLFO(lfo, target.param, target.scale, time, stopTime)); }); o1.start(time); o2.start(time); noise.start(time); o1.stop(stopTime); o2.stop(stopTime); noise.stop(stopTime); return { nodes, stopTime }; }
    private createShiftVoice(t: Track, p: PLocks | null, time: number, note: string, vel: number, lt: number) { const limiter = this.trackLimiters.get(t.id); if (!limiter) return; const param = this.createParameterResolver(t, p, lt); const freq = noteToFreq(note) * Math.pow(2, (finite(param('pitch'), 48) - 60) / 12); if(!isFinite(freq)) return; const rawEnv = param('ampEnv'); const env = { attack: finite(rawEnv?.attack, 0.01), decay: finite(rawEnv?.decay, 0.8), sustain: finite(rawEnv?.sustain, 0.5), release: finite(rawEnv?.release, 0.6) }; const stopTime = time + env.attack + env.decay + env.release + 0.5; const panner = this.audioContext.createStereoPanner(); const finalGain = this.audioContext.createGain(); const amp = this.audioContext.createGain(); const osc = this.audioContext.createOscillator(); const bend = this.audioContext.createWaveShaper(); const twist = this.audioContext.createWaveShaper(); const f = this.audioContext.createBiquadFilter(); const bendGain = this.audioContext.createGain(); const twistGain = this.audioContext.createGain(); const nodes: AudioNode[] = [panner, finalGain, amp, osc, bend, twist, f, bendGain, twistGain]; osc.connect(bendGain).connect(bend).connect(twistGain).connect(twist).connect(amp).connect(f).connect(finalGain).connect(panner).connect(limiter); this.applyEnvelope(amp.gain, time, env, vel); this.triggerRelease(amp.gain, time + env.attack + env.decay, env); panner.pan.setValueAtTime(0, time); finalGain.gain.value = 0.251; osc.frequency.setValueAtTime(freq, time); osc.detune.setValueAtTime(finite(param('position'), 0), time); osc.setPeriodicWave(this.getWarpTable(Math.floor(finite(param('table'), 2)))); bend.curve = this.makeDistortionCurve(finite(param('bend'), 20), 1.0); twist.curve = this.makeFoldCurve(finite(param('twist'), 0), 1.0); f.type = param('filter.type') || 'bandpass'; f.frequency.setValueAtTime(finite(param('filter.cutoff'), 3000), time); f.Q.setValueAtTime(finite(param('filter.resonance'), 4), time); const lfo1 = param('lfo1'), lfo2 = param('lfo2'); const lfoTargets: Record<string, { param: AudioParam | AudioParam[], scale: number }> = { 'volume': { param: amp.gain, scale: 1 / 1000 }, 'pan': { param: panner.pan, scale: 1 / 1000 }, 'filter.cutoff': { param: f.frequency, scale: 10 }, 'filter.resonance': { param: f.Q, scale: 30 / 1000 }, 'shift.pitch': { param: osc.frequency, scale: 1 }, 'shift.position': { param: osc.detune, scale: 1 }, 'shift.bend': { param: bendGain.gain, scale: 1 / 1000 }, 'shift.twist': { param: twistGain.gain, scale: 1 / 1000 } }; [lfo1, lfo2].forEach(lfo => { const target = lfo && lfoTargets[lfo.destination]; if (target) nodes.push(...this.applyLFO(lfo, target.param, target.scale, time, stopTime)); }); osc.start(time); osc.stop(stopTime); return { nodes, stopTime }; }
    private createResonVoice(t: Track, p: PLocks | null, time: number, note: string, vel: number, lt: number) { const limiter = this.trackLimiters.get(t.id); if (!limiter) return; const param = this.createParameterResolver(t, p, lt); const freq = noteToFreq(note) * Math.pow(2, (finite(param('pitch'), 60) - 60) / 12); if(!isFinite(freq)) return; const rawEnv = param('ampEnv'); const env = { attack: finite(rawEnv?.attack, 0.001), decay: finite(rawEnv?.decay, 0.5), sustain: finite(rawEnv?.sustain, 0), release: finite(rawEnv?.release, 0.5) }; const stopTime = time + env.attack + env.decay + env.release + 1.0; const panner = this.audioContext.createStereoPanner(); const finalGain = this.audioContext.createGain(); const amp = this.audioContext.createGain(); const exGain = this.audioContext.createGain(); const bank = this.audioContext.createGain(); const bf = this.audioContext.createBiquadFilter(); const f = this.audioContext.createBiquadFilter(); const nodes: AudioNode[] = [panner, finalGain, amp, exGain, bank, bf, f]; if (param('exciter_type') === 'noise') { const n = this.audioContext.createBufferSource(); n.buffer = this.noiseBuffer; n.connect(exGain); n.start(time); n.stop(time + 0.05); nodes.push(n); } else { const i = this.audioContext.createOscillator(); i.type = 'square'; i.frequency.setValueAtTime(100, time); i.connect(exGain); i.start(time); i.stop(time + 0.005); nodes.push(i); } const structure = finite(param('structure'), 20) / 100; const material = finite(param('material'), 50) / 100; const resonatorFilters: BiquadFilterNode[] = []; for (let i = 1; i <= 6; i++) { const bp = this.audioContext.createBiquadFilter(); bp.type = 'bandpass'; const ratio = i + (i * structure * (Math.random() - 0.5)); bp.frequency.setValueAtTime(freq * ratio, time); bp.Q.setValueAtTime(40 + (1 - material) * 60, time); exGain.connect(bp).connect(bank); nodes.push(bp); resonatorFilters.push(bp); } bank.connect(bf).connect(amp).connect(f).connect(finalGain).connect(panner).connect(limiter); this.applyEnvelope(amp.gain, time, env, vel); this.triggerRelease(amp.gain, time + env.attack + env.decay, env); panner.pan.setValueAtTime(0, time); finalGain.gain.value = 1.0; exGain.gain.setValueAtTime(1, time); exGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02); bf.type = 'lowpass'; bf.frequency.setValueAtTime(finite(param('brightness'), 8000), time); f.type = param('filter.type') || 'lowpass'; f.frequency.setValueAtTime(finite(param('filter.cutoff'), 15000), time); f.Q.setValueAtTime(finite(param('filter.resonance'), 1), time); const lfo1 = param('lfo1'), lfo2 = param('lfo2'); const lfoTargets: Record<string, { param: AudioParam | AudioParam[], scale: number }> = { 'volume': { param: amp.gain, scale: 1 / 1000 }, 'pan': { param: panner.pan, scale: 1 / 1000 }, 'filter.cutoff': { param: f.frequency, scale: 10 }, 'filter.resonance': { param: f.Q, scale: 30 / 1000 }, 'reson.brightness': { param: bf.frequency, scale: 10 }, 'reson.material': { param: resonatorFilters.map(filt => filt.Q), scale: 150/1000 } }; [lfo1, lfo2].forEach(lfo => { const target = lfo && lfoTargets[lfo.destination]; if (target) nodes.push(...this.applyLFO(lfo, target.param, target.scale, time, stopTime)); }); return { nodes, stopTime }; }
    private createAlloyVoice(t: Track, p: PLocks | null, time: number, note: string, vel: number, lt: number) { const limiter = this.trackLimiters.get(t.id); if (!limiter) return; const param = this.createParameterResolver(t, p, lt); const freq = noteToFreq(note) * Math.pow(2, (finite(param('pitch'), 60) - 60) / 12); if(!isFinite(freq)) return; const rawEnv = param('ampEnv'); const env = { attack: finite(rawEnv?.attack, 0.001), decay: finite(rawEnv?.decay, 0.3), sustain: finite(rawEnv?.sustain, 0), release: finite(rawEnv?.release, 0.2) }; const stopTime = time + env.attack + env.decay + env.release + 0.5; const panner = this.audioContext.createStereoPanner(); const finalGain = this.audioContext.createGain(); const amp = this.audioContext.createGain(); const carrier = this.audioContext.createOscillator(); const mod = this.audioContext.createOscillator(); const mGain = this.audioContext.createGain(); const mEnv = this.audioContext.createGain(); const fb = this.audioContext.createGain(); const f = this.audioContext.createBiquadFilter(); const nodes: AudioNode[] = [panner, finalGain, amp, carrier, mod, mGain, mEnv, fb, f]; mod.connect(mEnv).connect(mGain); mGain.connect(carrier.frequency); mGain.connect(fb).connect(mod.frequency); carrier.connect(amp).connect(f).connect(finalGain).connect(panner).connect(limiter); this.applyEnvelope(amp.gain, time, env, vel); this.triggerRelease(amp.gain, time + env.attack + env.decay, env); panner.pan.setValueAtTime(0, time); finalGain.gain.value = 0.251; carrier.frequency.setValueAtTime(freq, time); const ratio = finite(param('ratio'), 1.5); mod.frequency.setValueAtTime(freq * ratio, time); mGain.gain.setValueAtTime(finite(param('mod_level'), 60) * ratio * 5, time); mEnv.gain.setValueAtTime(0, time); mEnv.gain.linearRampToValueAtTime(1, time + finite(param('mod_attack'), 0.001)); mEnv.gain.setTargetAtTime(0, time + finite(param('mod_attack'), 0.001), finite(param('mod_decay'), 0.15) / 4); fb.gain.setValueAtTime((finite(param('feedback'), 10) / 100) * 0.97, time); f.type = param('filter.type') || 'highpass'; f.frequency.setValueAtTime(finite(param('filter.cutoff'), 200), time); f.Q.setValueAtTime(finite(param('filter.resonance'), 1), time); const lfo1 = param('lfo1'), lfo2 = param('lfo2'); const lfoTargets: Record<string, { param: AudioParam | AudioParam[], scale: number }> = { 'volume': { param: amp.gain, scale: 1 / 1000 }, 'pan': { param: panner.pan, scale: 1 / 1000 }, 'filter.cutoff': { param: f.frequency, scale: 10 }, 'filter.resonance': { param: f.Q, scale: 30 / 1000 }, 'alloy.pitch': { param: [carrier.frequency, mod.frequency], scale: 1 }, 'alloy.ratio': { param: mod.frequency, scale: freq / 1000 }, 'alloy.feedback': { param: fb.gain, scale: 1 / 1000 }, 'alloy.mod_level': { param: mGain.gain, scale: ratio * 5 / 1000 } }; [lfo1, lfo2].forEach(lfo => { const target = lfo && lfoTargets[lfo.destination]; if (target) nodes.push(...this.applyLFO(lfo, target.param, target.scale, time, stopTime)); }); carrier.start(time); mod.start(time); carrier.stop(stopTime); mod.stop(stopTime); return { nodes, stopTime }; }
}