/**
 * Per-measure displayed-accidental state for the written-phrase transform. A displayed accidental
 * follows the conventional engraving rule: the key signature sets each letter's implied
 * alteration at the start of a measure; the first note on a letter+octave that departs from its
 * currently implied alteration shows the matching accidental sign and becomes the new implied
 * alteration for the rest of that measure; a tied continuation never shows a sign and never
 * changes the state, since it is not a new attack.
 */
import type {
  Alter,
  DisplayedAccidental,
  Letter,
  SpelledPitch,
  WrittenKey,
} from './written-phrase-types'
import { displayedAccidentalOf } from './pitch-spelling'

/** Mutable per-measure accidental state, keyed by `letter+octave`, reset at every barline. */
export interface AccidentalState {
  readonly entries: Map<string, Alter>
}

/** Intent: create the empty accidental state a measure starts with, before any note is seen. */
// @spec-link [[module_notation_display_convention]]
export function createAccidentalState(): AccidentalState {
  return { entries: new Map() }
}

/** Intent: the alteration the key signature implies for a letter before any measure override. */
function signatureAlterFor(letter: Letter, key: WrittenKey): Alter {
  if (!key.signature.letters.includes(letter)) return 0
  return key.signature.accidental === 'sharp' ? 1 : -1
}

/**
 * Intent: decide the displayed accidental (or none) for one written note glyph and advance the
 * measure's accidental state accordingly. A tied continuation glyph always reports no accidental
 * and leaves the state untouched. Otherwise compares the glyph's alteration against the current
 * implied alteration for its exact letter+octave (falling back to the key signature the first
 * time that letter+octave is seen this measure); a match shows nothing, a departure shows the
 * matching sign and becomes the new implied alteration.
 */
// @spec-link [[module_notation_display_convention]]
export function nextDisplayedAccidental(
  state: AccidentalState,
  pitch: SpelledPitch,
  key: WrittenKey,
  tieFromPrevious: boolean,
): DisplayedAccidental | null {
  if (tieFromPrevious) return null

  const stateKey = `${pitch.letter}${pitch.octave}`
  const implied = state.entries.has(stateKey)
    ? state.entries.get(stateKey)!
    : signatureAlterFor(pitch.letter, key)

  if (pitch.alter === implied) return null

  state.entries.set(stateKey, pitch.alter)
  return displayedAccidentalOf(pitch.alter)
}
