/**
 * Jam's Idle note routing: the one place that says what a controller note played at Jam mode's
 * Idle means. Without a kept doodle the starting note is the home note of Jam's written key (its
 * tonic), in the instrument's written pitch, in the octave nearest the middle of its written range,
 * matched at its exact concert pitch; it means `start` only while a fresh Jam could start and the
 * page has had its first click, tap or key press; every other note is ignored. The kept doodle's
 * starting note (chunk 24) and tap-in (chunk 32) extend this module rather than a second one.
 * Part of Jam's code (src/jam/), loaded on demand; pure apart from the readings it is given.
 */
import {
  PITCH_CLASSES,
  type Collection,
  type PitchClass,
} from '@/domain/controls/generation-controls'
import { makeConcertPitch, type ConcertPitch } from '@/domain/events/concert-pitch'
import type { PitchClassNumber } from '@/domain/harmony/harmony-types'
import { pitchClassText, spellMidiInKey, spellWrittenKey } from '@/domain/notation/pitch-spelling'
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
 * exact concert pitch a played note must equal.
 */
// @spec-link [[rule_jam_starting_note_is_home_note]]
export interface JamStartingNote {
  readonly label: string
  readonly writtenMidi: number
  readonly concertPitch: ConcertPitch
}

/** What a controller note played at Jam mode's Idle means. */
// @spec-link [[module_jam_idle_notes]]
export type JamNoteMeaning = 'start' | 'ignored'

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
  /** Whether a fresh Jam could start now: its start conditions hold (rule_jam_start_conditions). */
  readonly canStart: () => boolean
  /** Whether the page still waits for its first click, tap or key press, the audio still locked. */
  readonly pageAwaitsClick: () => boolean
}

/** Jam's Idle note routing: the starting note it names, and what a played note means. */
// @spec-link [[module_jam_idle_notes]]
export interface JamIdleNotes {
  /** The note that would start a fresh Jam: the home note while a Jam could start, else null. */
  readonly startingNote: () => JamStartingNote | null
  /** Whether the named starting note waits for the page's first click, tap or key press. */
  readonly awaitsClick: () => boolean
  /** What a controller note at this exact concert pitch means now. */
  readonly meaningOf: (concertPitch: number) => JamNoteMeaning
}

/**
 * Intent: Jam's Idle note routing over its readings. The starting note is the home note while a
 * fresh Jam could start, else none. A played note means `start` only at that note's exact concert
 * pitch, octave included, while it is named and the page has had its first click, tap or key
 * press; every other note is ignored, and none is ever part of a doodle. Nothing acts on `start`
 * yet: chunk 21 wires it to the count-in, the path the `Start Jam` click takes. Nothing here
 * subscribes to the controller's notes.
 */
// @spec-link [[module_jam_idle_notes]]
// @spec-link [[rule_jam_starting_note_is_home_note]]
// @spec-link [[rule_jam_start_conditions]]
export function createJamIdleNotes(deps: JamIdleNotesDependencies): JamIdleNotes {
  /** Intent: the home note while a fresh Jam could start; null otherwise. */
  function startingNote(): JamStartingNote | null {
    if (!deps.canStart()) return null
    return jamHomeNote(deps.writtenKey(), deps.collection(), deps.instrument())
  }

  /** Intent: whether a named starting note waits for the page's first click, tap or key press. */
  function awaitsClick(): boolean {
    return deps.pageAwaitsClick() && startingNote() !== null
  }

  /** Intent: `start` for the named starting note's exact concert pitch, once the page was used. */
  function meaningOf(concertPitch: number): JamNoteMeaning {
    if (deps.pageAwaitsClick()) return 'ignored'
    const starting = startingNote()
    return starting !== null && starting.concertPitch === concertPitch ? 'start' : 'ignored'
  }

  return { startingNote, awaitsClick, meaningOf }
}
