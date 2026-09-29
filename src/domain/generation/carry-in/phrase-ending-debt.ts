/**
 * What a phrase may leave owing at its end, and how the phrase after a join settles it.
 *
 * Owner's decision for sessions: a phrase generated with carry-in may end owing the recovery of a
 * large leap or the resolution of a tense note, and the next phrase generated with that carry-in
 * settles it on its first note. A phrase generated without carry-in (the Idle phrase that becomes
 * phrase 1, the standalone fallback phrase) ends as the first release requires, owing nothing.
 * `phraseEndingDebtAllowance` is the single place that decision is written; the pitch planner and
 * the independent validator both read it.
 *
 * A phrase only ends owing something the next phrase can actually settle. Every harmony template
 * opens on the collection's tonic triad (degree 1), so the next phrase's first note sounds over
 * that triad: an owed recovery must be able to land on one of its tones 1-4 semitones back against
 * the leap, and a tense note must be able to step (1-2 semitones, both notes in the collection)
 * onto one of its tones, inside the register window the next phrase inherits.
 *
 * This module holds only pure pitch arithmetic, so the planner and the validator can share it
 * without the validator ever reading planner code.
 */

import { deepFreeze } from '../../events/deep-freeze'

/** Which debts a phrase may still owe after its final sounding note. */
// @spec-link [[rule_leap_recovery]]
// @spec-link [[rule_open_phrase_ending]]
export interface PhraseEndingDebtAllowance {
  /** The final note may still owe a large leap's recovery. */
  readonly leapRecovery: boolean
  /** The final note may be a tense note whose resolution is still owed. */
  readonly tenseNote: boolean
}

/** Every phrase generated without carry-in: first-release endings, owing nothing. */
const STANDALONE_PHRASE_ENDING: PhraseEndingDebtAllowance = deepFreeze({
  leapRecovery: false,
  tenseNote: false,
})

/** Every session phrase generated with carry-in: may end owing either debt. */
const CARRY_IN_PHRASE_ENDING: PhraseEndingDebtAllowance = deepFreeze({
  leapRecovery: true,
  tenseNote: true,
})

/** Intent: the debts a phrase may end owing, decided only by whether it has a carry-in. */
// @spec-link [[rule_no_carry_in_output_matches_v1]]
// @spec-link [[rule_leap_recovery]]
// @spec-link [[rule_open_phrase_ending]]
// @spec-link [[req_rolling_practice_session]]
export function phraseEndingDebtAllowance(
  generatedWithCarryIn: boolean,
): PhraseEndingDebtAllowance {
  return generatedWithCarryIn ? CARRY_IN_PHRASE_ENDING : STANDALONE_PHRASE_ENDING
}

/** Inclusive MIDI bounds a settling note must stay inside: the inherited register window. */
export interface PitchBounds {
  readonly minMidi: number
  readonly maxMidi: number
}

/** Intent: the pitch class of a MIDI value. */
function pitchClassOf(midi: number): number {
  return ((midi % 12) + 12) % 12
}

/** Intent: the tonic triad's pitch classes (collection degrees 1, 3 and 5) of a collection. */
// @spec-link [[rule_join_tense_note_resolution]]
export function tonicTriadPitchClasses(collection: readonly number[]): readonly number[] {
  return [collection[0]!, collection[2]!, collection[4]!]
}

/** Intent: true when `to` repays a large leap in `leapDirection` that arrived at `from`. */
// @spec-link [[rule_join_inherits_leap_recovery]]
export function recoveryLandsOn(from: number, to: number, leapDirection: -1 | 1): boolean {
  const interval = to - from
  return (
    Math.sign(interval) === -leapDirection && Math.abs(interval) >= 1 && Math.abs(interval) <= 4
  )
}

/**
 * Intent: true when `to` resolves the tense note `from`: a step of 1-2 semitones between two
 * collection members, landing on a tone of the chord sounding under `to`.
 */
// @spec-link [[rule_join_tense_note_resolution]]
export function resolvesOnto(
  from: number,
  to: number,
  chordPitchClasses: readonly number[],
  collection: readonly number[],
): boolean {
  const distance = Math.abs(to - from)
  return (
    distance >= 1 &&
    distance <= 2 &&
    collection.includes(pitchClassOf(from)) &&
    collection.includes(pitchClassOf(to)) &&
    chordPitchClasses.includes(pitchClassOf(to))
  )
}

/** Intent: every MIDI value inside the bounds that sounds a tone of the collection's tonic triad. */
function tonicTriadMidis(collection: readonly number[], bounds: PitchBounds): readonly number[] {
  const triad = tonicTriadPitchClasses(collection)
  const midis: number[] = []
  for (let midi = bounds.minMidi; midi <= bounds.maxMidi; midi += 1)
    if (triad.includes(pitchClassOf(midi))) midis.push(midi)
  return midis
}

/**
 * Intent: true when a recovery owed at `midi` for a large leap in `leapDirection` can be repaid
 * by the next phrase's first note on a tonic-triad tone inside the bounds.
 */
// @spec-link [[rule_join_inherits_leap_recovery]]
export function owedRecoveryCanSettle(
  midi: number,
  leapDirection: -1 | 1,
  collection: readonly number[],
  bounds: PitchBounds,
): boolean {
  return tonicTriadMidis(collection, bounds).some((to) => recoveryLandsOn(midi, to, leapDirection))
}

/**
 * Intent: true when the tense note `midi` can be resolved by the next phrase's first note onto a
 * tonic-triad tone inside the bounds.
 */
// @spec-link [[rule_join_tense_note_resolution]]
export function tenseNoteCanSettle(
  midi: number,
  collection: readonly number[],
  bounds: PitchBounds,
): boolean {
  const triad = tonicTriadPitchClasses(collection)
  return tonicTriadMidis(collection, bounds).some((to) => resolvesOnto(midi, to, triad, collection))
}
