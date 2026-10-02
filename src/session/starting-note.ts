/**
 * The starting note: the one note that starts a session from a MIDI controller at Idle. It is
 * phrase 1's first attacked note, matched at its exact concert pitch (octave included), and named
 * on the start line in the instrument profile's written pitch, spelled as the staff shows it.
 * Pure: no clock, no browser, no MIDI.
 */

import type { ExpectedNoteIdentity } from '../domain/acknowledgement/expected-note'
import type { ConcertPitch } from '../domain/events/concert-pitch'
import { deepFreeze } from '../domain/events/deep-freeze'
import type { ConcertEventTimeline } from '../domain/events/timeline'
import { naturalPitchClassOf, pitchClassText } from '../domain/notation/pitch-spelling'
import type {
  SpelledPitch,
  WrittenNote,
  WrittenPhrase,
} from '../domain/notation/written-phrase-types'

/** The Idle phrase is always the session's phrase 1. */
const IDLE_PHRASE_NUMBER = 1
const SEMITONES_PER_OCTAVE = 12

/** Typed failure for a phrase that cannot yield a starting note, or a staff that disagrees with it. */
// @spec-link [[rule_midi_starting_note]]
export class StartingNoteError extends Error {
  readonly kind = 'StartingNoteError' as const

  constructor(message: string) {
    super(message)
    this.name = 'StartingNoteError'
  }
}

/**
 * The note that starts a session: its identity (the note the start marker points at), its concert
 * pitch (what a played note must equal) and its label (the written spelling with ♭/♯ and the octave
 * number, octave 4 starting on middle C, for example `B♭4`).
 */
// @spec-link [[rule_midi_starting_note]]
// @spec-link [[rule_starting_note_named]]
export interface StartingNote {
  readonly identity: ExpectedNoteIdentity
  readonly concertPitch: ConcertPitch
  readonly label: string
}

/**
 * Intent: the starting note of the Idle phrase, from its concert timeline and the written phrase
 * the staff shows for it. The identity is phrase 1's first fresh attack, the pitch is that
 * attack's concert pitch, and the label is the staff's own spelling of its glyph. Throws a
 * StartingNoteError on a phrase with no attacked note, or when the written phrase does not show
 * that attack at its concert pitch under its own transposition.
 */
// @spec-link [[rule_midi_starting_note]]
// @spec-link [[rule_starting_note_named]]
export function startingNoteOf(
  timeline: ConcertEventTimeline,
  written: WrittenPhrase,
): StartingNote {
  const attack = firstAttackOf(timeline)
  const glyph = attackGlyph(written, attack.identity)
  const expectedWrittenMidi = attack.pitch + written.transposition.chromatic
  const shownMidi = midiOf(glyph.pitch)
  if (shownMidi !== expectedWrittenMidi) {
    throw new StartingNoteError(
      `The staff shows the starting note as written MIDI ${shownMidi}, but concert pitch ` +
        `${attack.pitch} transposes to written MIDI ${expectedWrittenMidi}.`,
    )
  }
  return deepFreeze({
    identity: attack.identity,
    concertPitch: attack.pitch,
    label: `${pitchClassText(glyph.pitch)}${glyph.pitch.octave}`,
  })
}

/**
 * Intent: whether a played note is the starting note: exactly its concert pitch, octave included.
 */
// @spec-link [[rule_midi_starting_note]]
export function isStartingNote(
  note: { readonly pitch: ConcertPitch },
  starting: StartingNote,
): boolean {
  return note.pitch === starting.concertPitch
}

/**
 * Intent: phrase 1's first fresh attack, in timeline order: its identity and concert pitch. A
 * valid phrase never opens on a tie continuation, so the first note event is a fresh attack;
 * one that is not, or a phrase with no note, is a caller bug and throws.
 */
function firstAttackOf(timeline: ConcertEventTimeline): {
  identity: ExpectedNoteIdentity
  pitch: ConcertPitch
} {
  for (const measure of timeline.measures) {
    const eventIndex = measure.events.findIndex((event) => event.kind === 'note')
    const event = measure.events[eventIndex]
    if (event === undefined || event.kind !== 'note') continue
    if (event.tieContinuation) {
      throw new StartingNoteError(
        `The phrase's first note, measure ${measure.measureIndex} event ${eventIndex}, is a tie ` +
          'continuation with no attack before it.',
      )
    }
    return {
      identity: {
        phraseNumber: IDLE_PHRASE_NUMBER,
        measureIndex: measure.measureIndex,
        eventIndex,
      },
      pitch: event.pitch,
    }
  }
  throw new StartingNoteError('The phrase has no attacked note, so it has no starting note.')
}

/**
 * Intent: the glyph the staff draws for an attack: the note glyph of the attack's measure whose
 * source event is the attack and which is not tied from a previous glyph. Throws when the written
 * phrase has no such glyph.
 */
function attackGlyph(written: WrittenPhrase, identity: ExpectedNoteIdentity): WrittenNote {
  const measure = written.measures[identity.measureIndex]
  const glyph = measure.events.find(
    (event): event is WrittenNote =>
      event.kind === 'note' && event.sourceEventIndex === identity.eventIndex,
  )
  if (glyph === undefined || glyph.tieFromPrevious) {
    throw new StartingNoteError(
      `The written phrase shows no attack for measure ${identity.measureIndex}, event ` +
        `${identity.eventIndex}.`,
    )
  }
  return glyph
}

/** Intent: the MIDI number a spelled written pitch sounds as on a C instrument (C4 is 60). */
function midiOf(pitch: SpelledPitch): number {
  return (pitch.octave + 1) * SEMITONES_PER_OCTAVE + naturalPitchClassOf(pitch.letter) + pitch.alter
}
