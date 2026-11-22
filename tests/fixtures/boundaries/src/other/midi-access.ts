/** Request Web MIDI access. */
export function requestMidi(): Promise<MIDIAccess> {
  return navigator.requestMIDIAccess()
}
