/**
 * The MIDI controller wired to a fake MIDI access and a fake audio clock, recording every change
 * and every played-note event it reports. Shared by the controller's unit test files.
 */

import type { ClockAnchor } from '../../../src/audio/audio-ports'
import { createMidiController } from '../../../src/midi/midi-controller'
import type {
  MidiController,
  MidiControllerChange,
  MidiDevice,
} from '../../../src/midi/midi-controller-state'
import type { PlayedNoteEvent } from '../../../src/midi/played-note-tracker'
import type { AudioTime } from '../../../src/session/session-types'
import { createFakeAudioRig, type FakeAudioRig } from '../audio/fake-audio'
import {
  createFakeMidiAccess,
  type FakeMidiAccess,
  type FakeMidiAccessOptions,
} from './fake-midi-access'

/** Two identical keyboards (same name and maker, distinct ids) and a different one. */
export const KEYS_A: MidiDevice = { id: 'port-a', name: 'Keys 49', manufacturer: 'Acme' }
export const KEYS_A2: MidiDevice = { id: 'port-a2', name: 'Keys 49', manufacturer: 'Acme' }
export const PAD_B: MidiDevice = { id: 'port-b', name: 'Pad 8', manufacturer: 'Beta' }

/** Options: the fake MIDI access's, the devices plugged in first, and a clock override. */
export interface ControllerRigOptions extends FakeMidiAccessOptions {
  readonly devices?: readonly MidiDevice[]
  readonly performanceOffsetMs?: number
  readonly anchor?: () => ClockAnchor
}

/** The wired controller, its fakes and what it reported. */
export interface ControllerRig {
  readonly midi: FakeMidiAccess
  readonly audio: FakeAudioRig
  readonly controller: MidiController
  readonly changes: MidiControllerChange[]
  readonly notes: PlayedNoteEvent[]
  /** The performance.now() stamp of audio time `t`. */
  readonly at: (t: AudioTime) => number
}

/** Intent: plug the given devices into a fake access, then build a controller listening to it. */
// @test-link [[req_midi_controller_input]]
export function createControllerRig(options: ControllerRigOptions = {}): ControllerRig {
  const audio = createFakeAudioRig(
    options.performanceOffsetMs === undefined
      ? {}
      : { performanceOffsetMs: options.performanceOffsetMs },
  )
  const midi = createFakeMidiAccess(options)
  for (const device of options.devices ?? []) midi.plug(device, audio.performanceTimeAt(0))
  const anchor = options.anchor ?? (() => audio.output.anchor())
  const controller = createMidiController({ provider: midi, clock: { anchor } })
  const changes: MidiControllerChange[] = []
  const notes: PlayedNoteEvent[] = []
  controller.subscribe((change) => changes.push(change))
  controller.onPlayedNote((event) => notes.push(event))
  return { midi, audio, controller, changes, notes, at: audio.performanceTimeAt }
}
