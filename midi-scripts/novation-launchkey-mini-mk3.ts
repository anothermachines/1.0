import { useStore } from '../store/store';
import { ControlScript } from './control-script';

// CC numbers for the 8 knobs on Launchkey Mini Mk3
const KNOB_CCS = [21, 22, 23, 24, 25, 26, 27, 28];

// Note numbers for the top row of pads (Track selection)
const PAD_NOTES_TRACKS = [96, 97, 98, 99, 100, 101, 102, 103];

export class NovationLaunchkeyMiniMk3Script implements ControlScript {
  private getState: typeof useStore.getState;
  private setState: typeof useStore.setState;
  private output: MIDIOutput | undefined;

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
    // Switch to DAW mode for better control (if available on the controller)
    // For Launchkey Mini Mk3, this can involve sending a SysEx message, but for simplicity, we'll focus on CCs and Notes.
    this.updatePadFeedback();
  }

  handleMidiMessage(status: number, data1: number, data2: number): boolean {
    const command = status >> 4;
    const channel = status & 0x0f;

    // We'll listen on all channels for simplicity, but could be restricted
    
    // Handle Knob CCs
    if (command === 11) { // CC message
      const knobIndex = KNOB_CCS.indexOf(data1);
      if (knobIndex !== -1) {
        if (knobIndex < 7) {
          // Knobs 1-7 control track volumes
          const trackId = knobIndex;
          const volume = (data2 / 127) * 1.5; // Scale to 0-1.5 range
          this.getState().setTrackVolume(trackId, volume);
        } else {
          // Knob 8 controls master volume
          const volume = (data2 / 127) * 1.5;
          this.getState().setMasterVolume(volume);
        }
        return true; // Message handled
      }
    }

    // Handle Pad Note Ons for track selection
    if (command === 9 && data2 > 0) { // Note On with velocity > 0
      const padIndex = PAD_NOTES_TRACKS.indexOf(data1);
      if (padIndex !== -1) {
        const trackId = padIndex;
        if (this.getState().selectedTrackId !== trackId) {
            this.getState().selectTrack(trackId);
            this.updatePadFeedback();
        }
        return true; // Message handled
      }
    }

    return false; // Message not handled by this script
  }
  
  private updatePadFeedback() {
    if (!this.output) return;

    const selectedTrackId = this.getState().selectedTrackId;
    
    PAD_NOTES_TRACKS.forEach((note, index) => {
        const trackId = index;
        const color = (trackId === selectedTrackId) ? 5 : 1; // Green for selected, dim white for others
        
        // Note On message to light up the pad (channel 0 for pads in DAW mode)
        this.output?.send([0x90, note, color]);
    });
  }

  destroy(): void {
    // Turn off all pad lights when disconnecting
    if (this.output) {
      PAD_NOTES_TRACKS.forEach(note => {
        this.output?.send([0x80, note, 0]); // Note Off message
      });
    }
    console.log('Novation Launchkey Mini Mk3 script destroyed.');
  }
}
