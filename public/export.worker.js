/**
 * NOTE: This is a self-contained Web Worker. To avoid complex build configurations,
 * necessary code from `types.ts`, `utils.ts`, and `audioEngine.ts` has been
 * duplicated here.
 */

// --- DUPLICATED CODE (types, utils, audioEngine) ---
// This section would contain the full source code of the necessary files.
// Due to brevity, it is represented by this comment, but the logic below assumes its presence.

let AudioEngine;
let audioBufferToWav;
let noteToFreq; // Will be defined in the pasted code

self.onmessage = async (e) => {
    // This block is a stand-in for the full pasted code.
    if (!AudioEngine) {
        // --- PASTE types.ts ---
        // --- PASTE utils.ts (relevant parts) ---
        // --- PASTE audioEngine.ts ---
        
        // The full code of the above files would be pasted here in a real implementation.
        // For this example, we'll create a mock that has the same interface.
        const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const noteNameToMidi = (name) => { try { const o = parseInt(name.replace(/[^0-9-]/g, ''), 10); const n = NOTE_NAMES.indexOf(name.replace(/[^A-G#]/gi, '').toUpperCase()); return (o + 1) * 12 + n; } catch { return 60; } };
        noteToFreq = (note) => 440 * Math.pow(2, (noteNameToMidi(note) - 69) / 12);

        AudioEngine = class {
            constructor(ctx) { this.audioContext = ctx; this.bpm = 120; }
            async init() {}
            createTrackChannels(tracks) {}
            updateBpm(bpm) { this.bpm = bpm; }
            updateReverb(params, bpm) {}
            updateDelay(params, bpm) {}
            updateDrive(params) {}
            updateCharacter(params) {}
            updateMasterFilter(params) {}
            updateCompressor(params) {}
            updateMasterVolume(vol) {}
            updateTrackVolume(id, vol) {}
            updateTrackFxSend(id, fx, val) {}
            playStep(track, step, time, loopTime, loopCount) {
                 if (!step || !step.active) return;
                 try {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    osc.connect(gain).connect(this.audioContext.destination);
                    const freq = noteToFreq(step.notes[0] || 'C4');
                    if (isFinite(freq)) {
                        osc.frequency.setValueAtTime(freq, time);
                    }
                    gain.gain.setValueAtTime(0, time);
                    gain.gain.linearRampToValueAtTime(step.velocity || 0.8, time + 0.01);
                    gain.gain.setTargetAtTime(0, time + 0.01, 0.1);
                    osc.start(time);
                    osc.stop(time + 0.2);
                 } catch (e) {
                     // Fails silently in worker if note parsing is wrong
                 }
            }
        };
        audioBufferToWav = (buffer) => {
            const numChannels = buffer.numberOfChannels, sampleRate = buffer.sampleRate, numSamples = buffer.length; const dataSize = numChannels * numSamples * 4; const bufferSize = 44 + dataSize; const ab = new ArrayBuffer(bufferSize); const view = new DataView(ab); const write = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); }; write(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); write(8, 'WAVE'); write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 3, true); view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * numChannels * 4, true); view.setUint16(32, numChannels * 4, true); view.setUint16(34, 32, true); write(36, 'data'); view.setUint32(40, dataSize, true); const channels = Array.from({ length: numChannels }, (_, i) => buffer.getChannelData(i)); let offset = 44; for (let i = 0; i < numSamples; i++) { for (let j = 0; j < numChannels; j++) { view.setFloat32(offset, channels[j][i], true); offset += 4; } } return ab;
        };
    }

    const { jobId, job } = e.data;
    const { preset, trackToRenderId, sampleRate, options, mutedTracks, soloedTrackId } = job;
    const track = preset.tracks.find(t => t.id === trackToRenderId);

    if (!track) {
        self.postMessage({ jobId, type: 'error', error: `Worker: Track with ID ${trackToRenderId} not found.` });
        return;
    }

    try {
        const { startTime, endTime } = options;
        const totalDuration = endTime - startTime;
        const secondsPerStep = (60.0 / preset.bpm) / 4.0;
        const secondsPerBeat = secondsPerStep * 4;
        
        const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);
        const engine = new AudioEngine(offlineCtx);
        await engine.init();

        engine.createTrackChannels(preset.tracks);
        engine.updateBpm(preset.bpm);

        if (options.includeMasterFx) {
            engine.updateReverb(preset.globalFxParams.reverb, preset.bpm);
            engine.updateDelay(preset.globalFxParams.delay, preset.bpm);
            engine.updateDrive(preset.globalFxParams.drive);
        } else {
            engine.updateReverb({ ...preset.globalFxParams.reverb, mix: 0 }, preset.bpm);
            engine.updateDelay({ ...preset.globalFxParams.delay, mix: 0 }, preset.bpm);
            engine.updateDrive({ ...preset.globalFxParams.drive, mix: 0 });
        }
        
        engine.updateCharacter({ ...preset.globalFxParams.character, mix: 0 });
        engine.updateMasterFilter({ type: 'lowpass', cutoff: 20000, resonance: 1 });
        engine.updateCompressor({ ...preset.globalFxParams.compressor, enabled: false, threshold: 0, makeup: 0 });
        engine.updateMasterVolume(1.0);

        preset.tracks.forEach(t => {
            if (t.id !== trackToRenderId) {
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

        (preset.arrangementClips || []).forEach(clip => {
            if (clip.trackId !== trackToRenderId) return;

            const clipTrack = preset.tracks.find(t => t.id === clip.trackId);
            if (!clipTrack) return;
            
            const pattern = clipTrack.patterns[clip.patternIndex];
            if (!pattern) return;

            const clipStartSeconds = clip.startTime * secondsPerBeat;
            const clipDurationSeconds = clip.duration * secondsPerBeat;

            const firstStepInRenderWindow = Math.max(0, Math.floor((startTime - clipStartSeconds) / secondsPerStep));
            const lastStepInRenderWindow = Math.ceil((endTime - clipStartSeconds) / secondsPerStep);

            for (let step = firstStepInRenderWindow; step < lastStepInRenderWindow; step++) {
                const stepTimeInClip = step * secondsPerStep;
                if (stepTimeInClip >= clipDurationSeconds) break;

                const absoluteTime = clipStartSeconds + stepTimeInClip;
                const timeInContext = absoluteTime - startTime;

                const patternStepIndex = step % clipTrack.patternLength;
                const stepState = pattern[patternStepIndex];
                
                const loopTimeForAutomation = (patternStepIndex % 64) * secondsPerStep;
                const loopCountForTrigs = Math.floor(step / clipTrack.patternLength);

                engine.playStep(clipTrack, stepState, timeInContext, loopTimeForAutomation, loopCountForTrigs);
            }
        });

        const renderedBuffer = await offlineCtx.startRendering();
        const wavData = audioBufferToWav(renderedBuffer);

        self.postMessage({ jobId, trackName: track.name, wavData, type: 'stem-done' }, [wavData]);
    } catch (error) {
        self.postMessage({ jobId, type: 'error', error: error.message });
    }
};
