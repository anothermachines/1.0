export interface ControlScript {
  /**
   * Handles an incoming MIDI message.
   * @param status The MIDI status byte.
   * @param data1 The first data byte (e.g., note number, CC number).
   * @param data2 The second data byte (e.g., velocity, CC value).
   * @returns `true` if the message was handled by the script, `false` otherwise.
   */
  handleMidiMessage(status: number, data1: number, data2: number): boolean;

  /**
   * Cleans up any resources, timers, or sends a final "goodbye" message
   * to the controller when the script is unloaded.
   */
  destroy(): void;
}
