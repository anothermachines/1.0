import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { AudioEngine } from '../audioEngine';
import { Preset, Track, ArrangementClip } from '../types';
import { useStore } from './store';

// CHANGE: Use setInterval for a more stable clock. The variable now holds the interval ID.
let sequencerTimerId: number | null = null;
let playStartTime = 0;
let playStartOffset = 0;
let audioEngine: AudioEngine | null = null;

const PULSES_PER_STEP = 6; // 24 PPQN / 4 (for 16th notes)

// Helper function to play a single pattern step, used for external MIDI clock sync
function playOnePatternStep(stepToPlay: number) {
    if (!audioEngine) return;
    const { preset, mutedTracks, soloedTrackId } = useStore.getState();
    if (!preset) return; // GUARD
    const time = audioEngine.getContext().currentTime + 0.01; // Schedule with a small offset
    const secondsPerStep = (60.0 / preset.bpm) / 4.0;
    const loopTime = (stepToPlay % 64) * secondsPerStep;
    const loopCount = Math.floor(stepToPlay / 64);

    if (stepToPlay > 0 && stepToPlay % 64 === 0) audioEngine.resetTriggerStates();

    preset.tracks.forEach(track => {
        const isAudible = soloedTrackId === null ? !mutedTracks.includes(track.id) : soloedTrackId === track.id;
        if (isAudible) {
            const patternStepIndex = stepToPlay % track.patternLength;
            const stepState = track.patterns[track.activePatternIndex][patternStepIndex];
            audioEngine.playStep(track, stepState, time, loopTime, loopCount);
        }
    });
}


interface PlaybackState {
    audioEngine: AudioEngine | null;
    isPlaying: boolean;
    currentStep: number;
    totalStepsElapsed: number;
    lastScheduledStepTime: number;
    lastScheduledSongTime: number;
    currentPlayheadTime: number;
    midiClockPulseCount: number;
}

interface PlaybackActions {
    setAudioEngine: (engine: AudioEngine) => void;
    togglePlay: () => void;
    stop: () => void;
    setPlayheadPosition: (time: number) => void;
    handleMidiSyncMessage: (status: number) => void;
}

const initialPlaybackState: PlaybackState = {
    audioEngine: null,
    isPlaying: false,
    currentStep: -1,
    totalStepsElapsed: 0,
    lastScheduledStepTime: 0,
    lastScheduledSongTime: 0,
    currentPlayheadTime: 0,
    midiClockPulseCount: 0,
};

export const usePlaybackStore = create<PlaybackState & PlaybackActions>()(
    subscribeWithSelector(
        immer((set, get) => ({
            ...initialPlaybackState,
            setAudioEngine: (engine) => {
                audioEngine = engine;
                set({ audioEngine: engine });
            },
            togglePlay: () => {
                if (!useStore.getState().isAudioReady) {
                    console.warn("Audio engine not ready, play ignored.");
                    return;
                }
                if (useStore.getState().midiSyncSource !== 'internal') return; // Do nothing if externally synced
                
                const wasPlaying = get().isPlaying;
                if (!wasPlaying) {
                    audioEngine?.resume();
                    audioEngine?.resetTriggerStates();
                    const currentPlayhead = get().currentPlayheadTime;
                    playStartTime = audioEngine!.getContext().currentTime;
                    playStartOffset = currentPlayhead;
            
                    set({
                        isPlaying: true,
                        // RHYTHM FIX: By setting schedule time to 0, we force the scheduler
                        // to re-evaluate its start time based on the current audio context time,
                        // preventing notes from being scheduled in the past on playback start.
                        lastScheduledStepTime: 0, 
                        lastScheduledSongTime: currentPlayhead,
                    });
                } else {
                    set({ isPlaying: false });
                }
            },
            stop: () => {
                // Setting isPlaying to false will trigger the subscriber logic to stop everything.
                // We also reset the state here for a hard stop.
                set({ isPlaying: false, currentStep: -1, totalStepsElapsed: 0, currentPlayheadTime: 0, midiClockPulseCount: 0, lastScheduledSongTime: 0 });
                playStartOffset = 0;
                audioEngine?.stopAll();
                audioEngine?.resetTriggerStates();
            },
            setPlayheadPosition: (time) => {
                set(state => {
                    if (audioEngine) {
                        // If playing, we need to stop all sounds and reset scheduling to "jump"
                        if (state.isPlaying) {
                            audioEngine.stopAll();
                            audioEngine.resetTriggerStates();
                        }
                        playStartTime = audioEngine.getContext().currentTime;
                        playStartOffset = time;
                        state.currentPlayheadTime = time;
                        state.lastScheduledSongTime = time; // Resets the scheduler to start from the new position
                        state.currentStep = -1; // Reset pattern step
                    } else {
                        // If stopped, just update the visual position. `playStartOffset` is used when play is next toggled.
                        playStartOffset = time;
                        state.currentPlayheadTime = time;
                    }
                });
            },
            handleMidiSyncMessage: (status) => {
                const { mainView, addNotification } = useStore.getState();
                switch (status) {
                    case 0xFA: // Start
                        get().stop();
                        set({ isPlaying: true, midiClockPulseCount: 0 });
                        break;
                    case 0xFC: // Stop
                        get().stop();
                        break;
                    case 0xF8: // Clock
                        if (get().isPlaying) {
                            if (mainView !== 'pattern') {
                                if (get().midiClockPulseCount === 0) { // Show notification only once
                                    addNotification({type: 'info', message: 'External MIDI sync is only supported in Pattern mode for now.'});
                                }
                                set(state => { state.midiClockPulseCount++; });
                                return;
                            }

                            set(state => { state.midiClockPulseCount++; });
                            if (get().midiClockPulseCount % PULSES_PER_STEP === 0) {
                                const { preset, selectedTrackId } = useStore.getState();
                                if (!preset) return; // GUARD
                                const track = preset.tracks.find(t => t.id === selectedTrackId);
                                const patternLength = track ? track.patternLength : 64;

                                const stepToPlay = get().totalStepsElapsed;
                                playOnePatternStep(stepToPlay);
                                set({
                                    totalStepsElapsed: stepToPlay + 1,
                                    currentStep: stepToPlay % patternLength
                                });
                            }
                        }
                        break;
                }
            },
        }))
    )
);


// --- SEQUENCER/PLAYBACK LOGIC ---

function scheduler() {
    if (!audioEngine) return;
    
    const { isPlaying } = usePlaybackStore.getState();
    const { preset, mainView, mutedTracks, soloedTrackId, arrangementLoop, recordingClips, selectedTrackId } = useStore.getState();

    if (!isPlaying || !preset) return;
    
    const { tracks, arrangementClips } = preset;
    
    audioEngine.cleanupVoices();
    const audioCtxTime = audioEngine.getContext().currentTime;
    
    if (mainView === 'pattern') {
        let { lastScheduledStepTime, totalStepsElapsed } = usePlaybackStore.getState();
        
        // RHYTHM FIX: Ensure we never schedule in the past when starting or after a lag.
        if (lastScheduledStepTime < audioCtxTime) {
            lastScheduledStepTime = audioCtxTime;
        }

        const selectedTrack = tracks.find(t => t.id === selectedTrackId);
        const patternLength = selectedTrack ? selectedTrack.patternLength : 64;

        while (lastScheduledStepTime < audioCtxTime + scheduleAheadTime) {
            const stepToPlay = totalStepsElapsed;
            if (stepToPlay > 0 && stepToPlay % 64 === 0) audioEngine.resetTriggerStates();
            
            const secondsPerStep = (60.0 / preset.bpm) / 4.0;
            const loopTime = (stepToPlay % 64) * secondsPerStep;
            const loopCount = Math.floor(stepToPlay / 64);

            preset.tracks.forEach(track => {
                const isAudible = soloedTrackId === null ? !mutedTracks.includes(track.id) : soloedTrackId === track.id;

                if (isAudible) {
                    const patternStepIndex = stepToPlay % track.patternLength;
                    const stepState = track.patterns[track.activePatternIndex][patternStepIndex];
                    audioEngine.playStep(track, stepState, lastScheduledStepTime, loopTime, loopCount);
                }
            });
            
            totalStepsElapsed++;
            lastScheduledStepTime += secondsPerStep;
            usePlaybackStore.setState({ 
                currentStep: stepToPlay % patternLength,
                totalStepsElapsed,
                lastScheduledStepTime
            });
        }
    } else { // Song Mode
        const scheduleWindowStart = usePlaybackStore.getState().lastScheduledSongTime;
        const freshPlayheadTime = playStartOffset + (audioEngine.getContext().currentTime - playStartTime);
        let scheduleWindowEnd = freshPlayheadTime + scheduleAheadTime;
        
        const secondsPerBeat = 60 / preset.bpm;

        if (scheduleWindowStart >= scheduleWindowEnd) return;

        const secondsPerStep = (60.0 / preset.bpm) / 4.0;
        
        const liveRecordingTrackIds = new Set(recordingClips.map(c => c.trackId));

        const clipsToPlay = (arrangementClips || []).filter(clip => !liveRecordingTrackIds.has(clip.trackId));
        const livePatternsToPlay = tracks.filter(track => liveRecordingTrackIds.has(track.id));
        
        const scheduleClips = (clips: (ArrangementClip | Track)[], isLivePattern: boolean) => {
            clips.forEach(clipOrTrack => {
                let clip: ArrangementClip;
                let track: Track | undefined;
                if (isLivePattern) {
                    track = clipOrTrack as Track;
                    const recClip = recordingClips.find(c => c.trackId === track!.id);
                    if (!recClip) return;
                    clip = recClip;
                } else {
                    clip = clipOrTrack as ArrangementClip;
                    track = tracks.find(t => t.id === clip.trackId);
                }

                const isAudible = soloedTrackId === null ? !mutedTracks.includes(clip.trackId) : soloedTrackId === clip.trackId;

                if (track && isAudible) {
                    const clipStartSeconds = clip.startTime * secondsPerBeat;
                    const clipDurationSeconds = clip.duration * secondsPerBeat;

                    const firstStepInWindow = Math.floor(Math.max(0, scheduleWindowStart - clipStartSeconds) / secondsPerStep);
                    // FIX: Replaced undefined `endTime` with `scheduleWindowEnd`.
                    const lastStepInWindow = Math.ceil(Math.max(0, scheduleWindowEnd - clipStartSeconds) / secondsPerStep);

                    for (let step = firstStepInWindow; step < lastStepInWindow; step++) {
                        const stepTimeInClip = step * secondsPerStep;
                        if (stepTimeInClip >= clipDurationSeconds && !isLivePattern) continue;

                        const absoluteStepTime = clipStartSeconds + stepTimeInClip;

                        if (absoluteStepTime >= scheduleWindowStart && absoluteStepTime < scheduleWindowEnd) {
                            let contextTimeForStep = playStartTime + (absoluteStepTime - playStartOffset);

                            // RHYTHM FIX: This logic ensures tight loop timing. If we lag, schedule in the past.
                            // The Web Audio API will play notes scheduled in the immediate past instantly.
                            // We only jump the time forward to the current time if the lag is significant (>50ms).
                            if (contextTimeForStep < audioCtxTime) {
                                const timeDiff = audioCtxTime - contextTimeForStep;
                                if (timeDiff > 0.05) { 
                                    contextTimeForStep = audioCtxTime;
                                }
                            }

                            const patternIndex = clip.patternIndex ?? 0;
                            const pattern = track.patterns[patternIndex];
                            if (!pattern) continue;

                            const patternStepIndex = step % track.patternLength;
                            const stepState = pattern[patternStepIndex];

                            const loopTimeForAutomation = (patternStepIndex % 64) * secondsPerStep;
                            const loopCountForTrigs = Math.floor(step / track.patternLength);
                            
                            audioEngine!.playStep(track, stepState, contextTimeForStep, loopTimeForAutomation, loopCountForTrigs);
                        }
                    }
                }
            });
        };

        scheduleClips(clipsToPlay, false);
        scheduleClips(livePatternsToPlay, true);
        usePlaybackStore.setState({ lastScheduledSongTime: scheduleWindowEnd });
    }
}


const scheduleAheadTime = 0.1; // How far ahead to schedule audio (in seconds)
const schedulerInterval = 25; // ms. How often we wake up to schedule. More robust than rAF.

// NEW: The combined loop function driven by setInterval, replacing runScheduler and arrangementUpdateLoop
function mainLoop() {
    if (!usePlaybackStore.getState().isPlaying || !audioEngine) return;
    
    // Update visual playhead for song mode
    const audioCtxTime = audioEngine.getContext().currentTime;
    let currentPlayheadTime = playStartOffset + (audioCtxTime - playStartTime);
    usePlaybackStore.setState({ currentPlayheadTime });

    // Schedule audio
    scheduler();
}


usePlaybackStore.subscribe(
    (state) => state.isPlaying,
    (isPlaying, prevIsPlaying) => {
        const { midiSyncSource, isArrangementRecording, finalizeRecording, midiSyncOutput } = useStore.getState();

        if (isPlaying && !prevIsPlaying) {
            // START LOGIC
            if (midiSyncSource === 'internal') {
                if (sequencerTimerId) clearInterval(sequencerTimerId);
                // Call it once immediately to avoid initial delay and ensure responsiveness.
                mainLoop(); 
                sequencerTimerId = setInterval(mainLoop, schedulerInterval);
            }
        } else if (!isPlaying && prevIsPlaying) {
            // STOP LOGIC
            if (sequencerTimerId) clearInterval(sequencerTimerId);
            sequencerTimerId = null;

            // Finalize recording if it was active
            if (isArrangementRecording) {
                const { currentPlayheadTime } = usePlaybackStore.getState();
                finalizeRecording(currentPlayheadTime);
            }
            
            // Send MIDI Stop if we are master
            if (midiSyncOutput !== 'none' && audioEngine) {
                const output = audioEngine.getMidiOutputs().find(o => o.id === midiSyncOutput);
                output?.send([0xFC]);
            }
        }
    }
);