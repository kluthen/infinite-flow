/**
 * Jam's Idle note routing: the one place that says what a controller note played at Jam mode's
 * Idle means. Without a kept doodle the starting note is the home note of Jam's written key (its
 * tonic), in the instrument's written pitch, in the octave nearest the middle of its written range,
 * matched at its exact concert pitch; with one, it is the first note of phrase 1 written from the
 * kept doodle, as session mode's starting note is its Idle phrase's (the start marker shows it).
 * It means `start` only while a Jam could start and the page has had its first click, tap or key
 * press; every other note is ignored. Tap-in extends this module rather than a second one: while
 * `tap-tempo` listens (./use-tap-tempo.ts), every note means `tap`, the starting note included,
 * which then starts nothing and is not named; a note that began while it listened taps at its onset
 * when it ends, unless it is very short. Notes alone never tap: without listening, none does. Part
 * of Jam's code (src/jam/), loaded on demand; pure apart from the readings it is given and the
 * notes it is told of, which it remembers only until they end.
 */
import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import {
  PITCH_CLASSES,
  type Collection,
  type PitchClass,
} from '@/domain/controls/generation-controls'
import { makeConcertPitch, type ConcertPitch } from '@/domain/events/concert-pitch'
import type { ConcertEventTimeline } from '@/domain/events/timeline'
import type { PitchClassNumber } from '@/domain/harmony/harmony-types'
import { pitchClassText, spellMidiInKey, spellWrittenKey } from '@/domain/notation/pitch-spelling'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import { isVeryShortNote } from '@/domain/played-notes/stray-notes'
import type { PlayedNoteEvent } from '@/midi/played-note-tracker'
import type { AudioTime } from '@/session/session-types'
import { startingNoteOf } from '@/session/starting-note'
import {
  findBuiltInInstrumentProfile,
  MY_INSTRUMENT_ID,
} from '@/domain/profile/instrument-profiles'
import { jamInstrumentRangeInClef } from './empty-system-engraving'
import type { JamStaffProps } from './jam-view-types'

const SEMITONES_PER_OCTAVE = 12

/** The instrument Jam reads: the selected profile, my instrument when it is the one selected. */
// @spec-link [[module_jam_idle_notes]]
export type JamInstrument = Pick<JamStaffProps, 'instrumentProfileId' | 'myInstrument'>

/**
 * A Jam's starting note: its label (the written spelling, as the key signature spells it, with its
 * octave number, octave 4 starting on middle C, for example `B♭3`), its written MIDI number and the
 * exact concert pitch a played note must equal; for the first note of the kept doodle's phrase 1,
 * also the note on the staff the start marker points at.
 */
// @spec-link [[rule_jam_starting_note_is_home_note]]
export interface JamStartingNote {
  readonly label: string
  readonly writtenMidi: number
  readonly concertPitch: ConcertPitch
  readonly identity?: ExpectedNoteIdentity
}

/** Phrase 1 written from the kept doodle, as Jam mode's Idle shows it: its notes and its staff. */
// @spec-link [[module_jam_idle_notes]]
export interface JamKeptPhraseOne {
  readonly timeline: ConcertEventTimeline
  readonly written: WrittenPhrase
}

/** What a controller note played at Jam mode's Idle means: a start, a tap while tap-in listens. */
// @spec-link [[module_jam_idle_notes]]
// @spec-link [[rule_jam_tap_in_listening]]
export type JamNoteMeaning = 'start' | 'tap' | 'ignored'

/**
 * Intent: how far the instrument writes above concert pitch, in semitones (written = concert +
 * this): my instrument's own transposition when it is selected, else the built-in profile's. A
 * selection naming an instrument that does not exist is a caller defect and throws.
 */
function writtenAboveConcert(instrument: JamInstrument): number {
  const { instrumentProfileId, myInstrument } = instrument
  if (instrumentProfileId === MY_INSTRUMENT_ID && myInstrument !== null) {
    return myInstrument.profile.transposition.chromatic
  }
  const profile = findBuiltInInstrumentProfile(instrumentProfileId)
  if (profile === undefined) {
    throw new Error(`Jam's home note: no instrument profile is named ${instrumentProfileId}.`)
  }
  return profile.transposition.chromatic
}

/**
 * Intent: the written MIDI number of pitch class `pitchClass` nearest `middle`, the lower of the
 * two when both are equally near.
 */
function nearestOfPitchClass(pitchClass: number, middle: number): number {
  const below =
    Math.floor((middle - pitchClass) / SEMITONES_PER_OCTAVE) * SEMITONES_PER_OCTAVE + pitchClass
  const above = below + SEMITONES_PER_OCTAVE
  return middle - below <= above - middle ? below : above
}

/**
 * Intent: the home note of Jam's written key and collection for an instrument: the key's tonic, in
 * the instrument's written pitch, in the octave nearest the middle of its written range (the lower
 * of two equally near), spelled as the key signature spells it, with its octave number, and its
 * exact concert pitch under the instrument's transposition, my instrument's included.
 */
// @spec-link [[rule_jam_starting_note_is_home_note]]
// @spec-link [[module_jam_idle_notes]]
export function jamHomeNote(
  writtenKey: PitchClass,
  collection: Collection,
  instrument: JamInstrument,
): JamStartingNote {
  const writtenTonic = PITCH_CLASSES.indexOf(writtenKey) as PitchClassNumber
  const key = spellWrittenKey(writtenTonic, collection)
  const { writtenRange } = jamInstrumentRangeInClef(
    instrument.instrumentProfileId,
    instrument.myInstrument,
  )
  const middle = (writtenRange.minMidi + writtenRange.maxMidi) / 2
  const writtenMidi = nearestOfPitchClass(writtenTonic, middle)
  const spelled = spellMidiInKey(writtenMidi, key)
  return Object.freeze({
    label: `${pitchClassText(spelled)}${spelled.octave}`,
    writtenMidi,
    concertPitch: makeConcertPitch(writtenMidi - writtenAboveConcert(instrument)),
  })
}

/** What Jam's Idle note routing reads, every reading current when called (reactive in the shell). */
// @spec-link [[module_jam_idle_notes]]
export interface JamIdleNotesDependencies {
  /** Jam's written key: session mode's until Jam's own settings exist (chunk 31). */
  readonly writtenKey: () => PitchClass
  /** Jam's collection: session mode's until Jam's own settings exist (chunk 31). */
  readonly collection: () => Collection
  /** The selected instrument, shared with session mode. */
  readonly instrument: () => JamInstrument
  /**
   * Whether a Jam could start now: a fresh Jam's start conditions hold (rule_jam_start_conditions)
   * or, with a doodle kept, a Jam on it could start (its phrase 1 shown).
   */
  readonly canStart: () => boolean
  /** Whether the page still waits for its first click, tap or key press, the audio still locked. */
  readonly pageAwaitsClick: () => boolean
  /** Whether Jam mode keeps a doodle now. */
  readonly doodleKept: () => boolean
  /** Phrase 1 written from the kept doodle, as shown at Idle; null while none is shown. */
  readonly keptPhraseOne: () => JamKeptPhraseOne | null
  /** Whether `tap-tempo` listens at this instant (rule_jam_tap_in_listening). */
  readonly tapListening: () => boolean
  /** A controller tap, at the note's onset on the audio clock. */
  readonly tap: (at: AudioTime) => void
}

/** Jam's Idle note routing: the starting note it names, what a played note means, and its taps. */
// @spec-link [[module_jam_idle_notes]]
export interface JamIdleNotes {
  /**
   * The note that would start a Jam: while one could start, the home note, or with a doodle kept
   * its phrase 1's first note; else, and while tap-in listens, null.
   */
  readonly startingNote: () => JamStartingNote | null
  /** Whether the named starting note waits for the page's first click, tap or key press. */
  readonly awaitsClick: () => boolean
  /** What a controller note at this exact concert pitch means now. */
  readonly meaningOf: (concertPitch: number) => JamNoteMeaning
  /**
   * A controller note's event, as the played-note tracker reports it: a note played as a tap is
   * remembered, and when it ends, unless it is very short, it taps at its onset while tap-in still
   * listens. Every other event does nothing.
   */
  readonly hear: (event: PlayedNoteEvent) => void
}

/**
 * Intent: the starting note of phrase 1 written from the kept doodle: its first attacked note, at
 * its concert pitch, named as the staff spells it, and the note the start marker points at.
 */
// @spec-link [[module_jam_idle_notes]]
// @spec-link [[rule_starting_note_named]]
function keptPhraseOneStartingNote(phrase: JamKeptPhraseOne): JamStartingNote {
  const starting = startingNoteOf(phrase.timeline, phrase.written)
  return Object.freeze({
    label: starting.label,
    writtenMidi: starting.concertPitch + phrase.written.transposition.chromatic,
    concertPitch: starting.concertPitch,
    identity: starting.identity,
  })
}

/**
 * Intent: Jam's Idle note routing over its readings. While a Jam could start, the starting note
 * is the home note with no doodle kept, and with one its phrase 1's first note (none while that
 * phrase 1 is not shown); else none. A played note means `start` only at that note's exact concert
 * pitch, octave included, while it is named and the page has had its first click, tap or key
 * press; every other note is ignored, and none is ever part of a doodle. The start it means is the
 * one `Start Jam` takes: a fresh Jam, or a Jam on the kept doodle. While tap-in listens, every note
 * means `tap` instead, the starting note included, and no starting note is named; a note played as
 * a tap taps at its onset when it ends, unless it is very short or listening has ended. Nothing
 * here subscribes to the controller's notes: the caller tells it of them.
 */
// @spec-link [[module_jam_idle_notes]]
// @spec-link [[rule_jam_starting_note_is_home_note]]
// @spec-link [[rule_jam_start_conditions]]
// @spec-link [[rule_held_doodle_phrase_one_at_idle]]
// @spec-link [[rule_jam_tap_in_listening]]
export function createJamIdleNotes(deps: JamIdleNotesDependencies): JamIdleNotes {
  /** The notes played as taps that have not ended yet, by pitch and onset. */
  const pendingTaps: { readonly pitch: number; readonly onsetAt: AudioTime }[] = []

  /** Intent: the home note, or the kept doodle's phrase 1's first note, while a Jam could start. */
  function startingNote(): JamStartingNote | null {
    if (deps.tapListening()) return null
    if (!deps.canStart()) return null
    if (deps.doodleKept()) {
      const phrase = deps.keptPhraseOne()
      return phrase === null ? null : keptPhraseOneStartingNote(phrase)
    }
    return jamHomeNote(deps.writtenKey(), deps.collection(), deps.instrument())
  }

  /** Intent: whether a named starting note waits for the page's first click, tap or key press. */
  function awaitsClick(): boolean {
    return deps.pageAwaitsClick() && startingNote() !== null
  }

  /**
   * Intent: `tap` for every note while tap-in listens; else `start` for the named starting note's
   * exact concert pitch, once the page was used.
   */
  function meaningOf(concertPitch: number): JamNoteMeaning {
    if (deps.tapListening()) return 'tap'
    if (deps.pageAwaitsClick()) return 'ignored'
    const starting = startingNote()
    return starting !== null && starting.concertPitch === concertPitch ? 'start' : 'ignored'
  }

  /**
   * Intent: remember a note played as a tap; when it ends, forget it and, unless it is very short
   * or listening has ended, tap at its onset.
   */
  // @spec-link [[rule_jam_tap_in_listening]]
  function hear(event: PlayedNoteEvent): void {
    if (event.kind === 'played') {
      const { pitch, onsetAt } = event.note
      if (meaningOf(pitch) === 'tap') pendingTaps.push({ pitch, onsetAt })
      return
    }
    const ended = event.note
    const index = pendingTaps.findIndex(
      (pending) => pending.pitch === ended.pitch && pending.onsetAt === ended.onsetAt,
    )
    if (index === -1) return
    pendingTaps.splice(index, 1)
    if (!isVeryShortNote(ended) && deps.tapListening()) deps.tap(ended.onsetAt)
  }

  return { startingNote, awaitsClick, meaningOf, hear }
}
