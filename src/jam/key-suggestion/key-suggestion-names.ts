/**
 * Naming the key and mode suggestion (master spec C6.2, C6.5): computed in concert pitch, it is
 * answered as Jam's settings would hold it: its home note in written pitch for the selected
 * instrument (written = concert + the instrument's chromatic transposition, modulo 12), and its
 * mode as the Collection in the player's family: with Major or Minor as Jam's Collection an Ionian
 * answer is Major and an Aeolian one Minor; any other answer is its mode. Jam's written key reads
 * back in concert pitch the other way, and a Collection compares as its mode, Major as Ionian and
 * Minor as Aeolian, since they hold the same notes. Pure; part of Jam's code (src/jam/).
 */
import {
  PITCH_CLASSES,
  type Collection,
  type PitchClass,
} from '@/domain/controls/generation-controls'
import type { PitchClassNumber } from '@/domain/harmony/harmony-types'
import type { InstrumentTransposition } from '@/domain/profile/instrument-profile'

import type { KeyMode } from './key-suggestion-scores'

/** Intent: a whole number of semitones as a pitch class, 0 to 11, for any sign. */
function pitchClassNumberOf(semitones: number): PitchClassNumber {
  return (((semitones % 12) + 12) % 12) as PitchClassNumber
}

/** Intent: a concert home note named in written pitch for an instrument. */
// @spec-link [[rule_suggestion_candidates]]
export function writtenHomeNote(
  concert: PitchClassNumber,
  transposition: InstrumentTransposition,
): PitchClass {
  return PITCH_CLASSES[pitchClassNumberOf(concert + transposition.chromatic)]!
}

/** Intent: a written home note (Jam's Written key) read back in concert pitch for an instrument. */
// @spec-link [[rule_suggestion_withheld]]
export function concertHomeNote(
  written: PitchClass,
  transposition: InstrumentTransposition,
): PitchClassNumber {
  return pitchClassNumberOf(PITCH_CLASSES.indexOf(written) - transposition.chromatic)
}

/** Intent: the mode a Collection is compared as: Major as Ionian, Minor as Aeolian. */
// @spec-link [[rule_suggestion_withheld]]
export function keyModeOf(collection: Collection): KeyMode {
  if (collection === 'Major') return 'Ionian'
  if (collection === 'Minor') return 'Aeolian'
  return collection
}

/**
 * Intent: the Collection a drawn mode reads as, and Use it sets, in the family of Jam's current
 * Collection: Major for Ionian and Minor for Aeolian when Jam's is Major or Minor; else its mode.
 */
// @spec-link [[rule_suggestion_named_in_players_family]]
export function collectionInFamily(mode: KeyMode, jamCollection: Collection): Collection {
  if (jamCollection === 'Major' || jamCollection === 'Minor') {
    if (mode === 'Ionian') return 'Major'
    if (mode === 'Aeolian') return 'Minor'
  }
  return mode
}
