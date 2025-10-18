import { useStore } from '../store/store';
import { usePlaybackStore } from '../store/playbackStore';
import { ControlScript } from './control-script';

// --- AKAI APC40 MK2 MIDI CONSTANTS (Corrected) ---

// Track Control Buttons (Notes)
const TRACK_SELECT_NOTES = [82, 83, 84, 85, 86, 87, 88, 89];
const TRACK_SOLO_NOTES = [64, 65, 66, 67, 68, 69, 70, 71];
const TRACK_ACTIVATOR_NOTES = [52, 53, 54, 55, 56, 57, 58, 59]; // These are effectively mutes
const TRACK_REC_ARM_NOTES = [48, 49, 50, 51, 52, 53, 54, 55];

// Knobs (CCs)
const TRACK_CONTROL_KNOB_CCS = [48, 49, 50, 51, 52, 53, 54, 55]; // The 8 knobs above the faders
const DEVICE_CONTROL_KNOB_CCS = [16, 17, 18, 19, 20, 21, 22, 23]; // The 8 knobs on the top right

// Faders (CCs)
const TRACK_FADER_CCS = [0, 1, 2, 3, 4, 5, 6, 7];
const MASTER_FADER_CC = 14;

// Transport & Mode Buttons (Notes)
const PLAY_NOTE = 91;
const STOP_NOTE = 92;
const PAN_MODE_NOTE = 98;
const SEND_A_MODE_NOTE = 100;
const SEND_B_MODE_NOTE = 101;

// Scene Launch / Page Select (Notes)
const PAGE_SELECT_NOTES = [81, 80, 79, 78, 77]; // Corresponds to Scenes 1-5

// Clip Grid (Using a simplified but functional mapping for now)
const LOGICAL_CLIP_GRID_NOTES: number[][] = [
    [39, 38, 37, 36, 43, 42, 41, 40], // Mapped to Pattern 1
    [35, 34, 33, 32, 27, 26, 25, 24], // Mapped to Pattern 2
    [31, 30, 29, 28, 19, 18, 17, 16], // Mapped to Pattern 3
    [15, 14, 13, 12, 11, 10, 9, 8],   // Mapped to Pattern 4
    [7, 6, 5, 4, 3, 2, 1, 0],       // Mapped to Pattern 5 (these are lower bank notes)
];

type KnobMode = 'pan' | 'send-a' | 'send-b';

// Static flag to ensure init message is sent only once per session
let hasInitialized = false;

export class AkaiApc40Mk2 implements ControlScript {
  private getState: typeof useStore.getState;
  private setState: typeof useStore.setState;
  private output: MIDIOutput | undefined;
  private knobMode: KnobMode = 'pan';

  constructor(
    getState: typeof useStore.getState,
    setState: typeof useStore.setState,
    output: MIDIOutput | undefined
  ) {
    this.getState = getState;
    this.setState = setState;
    this.output = output;
    this.initController();
  }

  private initController() {
    // Send SysEx to enter Ableton Live Mode, but only once per session
    if (!hasInitialized && this.output) {
      this.output.send([0xF0, 0x47, 0x7F, 0x29, 0x60, 0x00, 0x04, 0x42, 0x08, 0x02, 0x01, 0xF7]);
      hasInitialized = true;
    }
    
    // Initial feedback update
    setTimeout(() => this.updateAllFeedback(), 150);
  }

  handleMidiMessage(status: number, data1: number, data2: number): boolean {
    const command = status >> 4;

    // CC Messages (Faders, Knobs)
    if (command === 11) {
      return this.handleCC(data1, data2);
    }
    
    // Note On (Buttons, Pads)
    if (command === 9 && data2 > 0) {
      return this.handleNoteOn(data1);
    }

    return false;
  }
  
  private handleCC(cc: number, value: number): boolean {
      // Faders
      const faderIndex = TRACK_FADER_CCS.indexOf(cc);
      if (faderIndex !== -1) {
        this.getState().setTrackVolume(faderIndex, (value / 127) * 1.5);
        return true;
      }
      if (cc === MASTER_FADER_CC) {
        this.getState().setMasterVolume((value / 127) * 1.5);
        return true;
      }

      // Track Control Knobs (above faders)
      const knobIndex = TRACK_CONTROL_KNOB_CCS.indexOf(cc);
      if (knobIndex !== -1) {
          switch (this.knobMode) {
              case 'pan':
                  this.getState().setTrackPan(knobIndex, (value - 64) / 63);
                  return true;
              case 'send-a':
                  // Mapped to Reverb
                  this.getState().setFxSend(knobIndex, 'reverb', value / 127);
                  return true;
              case 'send-b':
                  // Mapped to Delay
                  this.getState().setFxSend(knobIndex, 'delay', value / 127);
                  return true;
          }
      }

      // Device Control Knobs (top right) - Mapped to selected track's params
      const deviceKnobIndex = DEVICE_CONTROL_KNOB_CCS.indexOf(cc);
      if (deviceKnobIndex !== -1) {
          const { setParam } = this.getState();
          // For now, map first two knobs for demonstration: decay and cutoff
          if(deviceKnobIndex === 0) { 
             setParam('ampEnv.decay', (value / 127) * 4);
          } else if (deviceKnobIndex === 1) {
             setParam('filter.cutoff', 20 + (value / 127) * 19980);
          }
          return true;
      }

      return false;
  }
  
  private handleNoteOn(note: number): boolean {
      // Track Select
      const selectIndex = TRACK_SELECT_NOTES.indexOf(note);
      if (selectIndex !== -1) {
          this.getState().selectTrack(selectIndex);
          this.updateAllFeedback();
          return true;
      }
      
      // FIX: Reordered REC ARM before activator to resolve MIDI note conflict.
      // Notes 52-55 are used for both REC ARM (tracks 4-7) and Activator/Mute (tracks 0-3).
      // Prioritizing REC ARM allows all tracks to be armed for recording.
      // As a trade-off, mute for tracks 0-3 via the Clip Stop buttons will not work.
      // Rec Arm
      const recIndex = TRACK_REC_ARM_NOTES.indexOf(note);
      if (recIndex !== -1) {
          const { automationRecording, startAutomationRecording, stopAutomationRecording } = this.getState();
          if (automationRecording?.trackId === recIndex) {
            stopAutomationRecording();
          } else {
            startAutomationRecording(recIndex, 'overdub');
          }
          this.updateButtonFeedback();
          return true;
      }

      // Mute/Solo/Activator
      const activatorIndex = TRACK_ACTIVATOR_NOTES.indexOf(note);
      if (activatorIndex !== -1) {
          this.getState().toggleMute(activatorIndex);
          this.updateButtonFeedback();
          return true;
      }
      const soloIndex = TRACK_SOLO_NOTES.indexOf(note);
      if (soloIndex !== -1) {
          this.getState().toggleSolo(soloIndex);
          this.updateButtonFeedback();
          return true;
      }

      // Knob Mode
      if (note === PAN_MODE_NOTE) { this.knobMode = 'pan'; this.updateKnobModeFeedback(); return true; }
      if (note === SEND_A_MODE_NOTE) { this.knobMode = 'send-a'; this.updateKnobModeFeedback(); return true; }
      if (note === SEND_B_MODE_NOTE) { this.knobMode = 'send-b'; this.updateKnobModeFeedback(); return true; }

      // Transport
      if (note === PLAY_NOTE) { 
          if(useStore.getState().isAudioReady && useStore.getState().midiSyncSource === 'internal') {
              usePlaybackStore.getState().togglePlay(); 
              this.updateTransportFeedback();
          }
          return true; 
      }
      if (note === STOP_NOTE) { 
          if(useStore.getState().midiSyncSource === 'internal') {
              usePlaybackStore.getState().stop();
              this.updateTransportFeedback();
          }
          return true; 
      }

      // Page Select
      const pageIndex = PAGE_SELECT_NOTES.indexOf(note);
      if (pageIndex !== -1) {
          this.getState().setSequencerPage(pageIndex);
          this.updateAllFeedback();
          return true;
      }

      // Clip Grid
      for(let row=0; row < LOGICAL_CLIP_GRID_NOTES.length; row++) {
          const col = LOGICAL_CLIP_GRID_NOTES[row].indexOf(note);
          if (col !== -1) {
              const trackId = col;
              const patternIndex = row; // 0-4
              this.getState().selectPattern(trackId, patternIndex, usePlaybackStore.getState().currentPlayheadTime);
              this.updatePadFeedback();
              return true;
          }
      }

      return false;
  }

  private updateAllFeedback() {
    this.updatePadFeedback();
    this.updateButtonFeedback();
    this.updateKnobModeFeedback();
    this.updateTransportFeedback();
    this.updatePageSelectFeedback();
  }
  
  private updatePadFeedback() {
      if (!this.output) return;
      const { tracks } = this.getState().preset;
      
      LOGICAL_CLIP_GRID_NOTES.forEach((rowNotes, patternIndex) => {
          rowNotes.forEach((note, trackId) => {
              const track = tracks[trackId];
              if (!track) {
                  this.output?.send([0x90, note, 0]); // Turn off if no track
                  return;
              };

              const pattern = track.patterns[patternIndex];
              const isActive = track.activePatternIndex === patternIndex;
              const hasData = pattern && pattern.some(step => step.active);

              let color = 0; // Off
              if (hasData) color = 1; // Amber
              if (isActive) color = 2; // Green
              
              this.output?.send([0x90, note, color]);
          });
      });
  }

  private updateButtonFeedback() {
      if (!this.output) return;
      const { selectedTrackId, mutedTracks, soloedTrackId, automationRecording } = this.getState();

      TRACK_SELECT_NOTES.forEach((note, i) => this.output?.send([0x90, note, i === selectedTrackId ? 1 : 0]));
      TRACK_ACTIVATOR_NOTES.forEach((note, i) => this.output?.send([0x90, note, !mutedTracks.includes(i) ? 1 : 0])); // On if NOT muted
      TRACK_SOLO_NOTES.forEach((note, i) => this.output?.send([0x90, note, i === soloedTrackId ? 1 : 0]));
      TRACK_REC_ARM_NOTES.forEach((note, i) => this.output?.send([0x90, note, automationRecording?.trackId === i ? 1 : 0]));
  }
  
  private updateKnobModeFeedback() {
      if (!this.output) return;
      this.output.send([0x90, PAN_MODE_NOTE, this.knobMode === 'pan' ? 1 : 0]);
      this.output.send([0x90, SEND_A_MODE_NOTE, this.knobMode === 'send-a' ? 1 : 0]);
      this.output.send([0x90, SEND_B_MODE_NOTE, this.knobMode === 'send-b' ? 1 : 0]);
  }
  
  private updateTransportFeedback() {
      if (!this.output) return;
      const isPlaying = usePlaybackStore.getState().isPlaying;
      this.output.send([0x90, PLAY_NOTE, isPlaying ? 1 : 0]);
      this.output.send([0x90, STOP_NOTE, isPlaying ? 0 : 1]);
  }

  private updatePageSelectFeedback() {
      if (!this.output) return;
      const currentPage = this.getState().sequencerPage;
      PAGE_SELECT_NOTES.forEach((note, i) => this.output?.send([0x90, note, i === currentPage ? 2 : 0]));
  }

  destroy(): void {
    // Send SysEx to exit Ableton mode and reset controller
    // this.output?.send([0xF0, 0x47, 0x7F, 0x29, 0x60, 0x00, 0x04, 0x40, 0x08, 0x02, 0x01, 0xF7]);
    console.log('Akai APC40 Mk2 script destroyed.');
  }
}