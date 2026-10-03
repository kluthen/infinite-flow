/**
 * The MIDI side of the session controller rig: one keyboard on the rig's fake MIDI access, played
 * on the rig's fake audio clock (a note played "now" has its onset exactly at the clock's time),
 * the starting note of the rig's phrase 1, and the expected notes of a phrase where the transport
 * places it.
 */
import { expect } from 'vitest'

import { deriveExpectedNotes, type ExpectedNote } from '@/domain/acknowledgement/expected-note'
import type { ConcertEventTimeline } from '@/domain/events/timeline'
import type { MidiDevice } from '@/midi/midi-controller-state'
import type { AudioTime } from '@/session/session-types'
import { startingNoteOf, type StartingNote } from '@/session/starting-note'
import { RIG_TEMPO, type ControllerRig } from './session-controller-rig'

/** The one keyboard the specs plug in. */
export const KEYS: MidiDevice = { id: 'keys', name: 'Keys 49', manufacturer: 'Acme' }

/** The velocity every played note has. */
export const VELOCITY = 80

/**
 * Intent: attach KEYS as the player would: the Connect-controller click unlocks the audio, then
 * MIDI access is granted and the only device present is selected and opened.
 */
export async function connectKeys(rig: ControllerRig): Promise<void> {
  rig.transport.unlock()
  rig.midiAccess.plug(KEYS, rig.audioRig.performanceTimeAt(rig.audioRig.now()))
  await rig.midi.connect()
  expect(rig.midi.state()).toEqual({ kind: 'connected', device: KEYS })
}

/** Intent: the performance.now() stamp of the clock's current time. */
function stampNow(rig: ControllerRig): number {
  return rig.audioRig.performanceTimeAt(rig.audioRig.now())
}

/** Intent: press `pitch` on KEYS now; returns the onset the note gets on the audio clock. */
export function press(rig: ControllerRig, pitch: number): AudioTime {
  rig.midiAccess.noteOn(KEYS.id, pitch, VELOCITY, stampNow(rig))
  return rig.audioRig.now()
}

/** Intent: release `pitch` on KEYS now; returns the release time on the audio clock. */
export function lift(rig: ControllerRig, pitch: number): AudioTime {
  rig.midiAccess.noteOff(KEYS.id, pitch, stampNow(rig))
  return rig.audioRig.now()
}

/** Intent: unplug KEYS now. */
export function unplugKeys(rig: ControllerRig): void {
  rig.midiAccess.unplug(KEYS.id, stampNow(rig))
}

/** Intent: plug KEYS back in now, as the very same port. */
export function replugKeys(rig: ControllerRig): void {
  rig.midiAccess.plug(KEYS, stampNow(rig))
}

/** Intent: the starting note of the rig's phrase 1, from the pure rule itself. */
export function rigStartingNote(rig: ControllerRig): StartingNote {
  return startingNoteOf(rig.phraseOne.outcome.result.timeline, rig.idleWritten)
}

/**
 * Intent: phrase `phraseNumber`'s expected notes at `tempo` (the rig's tempo unless given), from
 * where the transport starts it.
 */
export function expectedNotesOf(
  rig: ControllerRig,
  phraseNumber: number,
  timeline: ConcertEventTimeline,
  tempo = RIG_TEMPO,
): readonly ExpectedNote[] {
  return deriveExpectedNotes(timeline, {
    phraseNumber,
    startSeconds: rig.transport.phraseStartsAt(phraseNumber),
    tempoBpm: tempo,
  })
}
