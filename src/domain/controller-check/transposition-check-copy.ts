/**
 * The player-facing wording of a transposition check result, exactly as the controller-connection
 * handoff ("Check result copy") fixes it: the result line, the suggestion line, and the optional
 * line naming another instrument profile that would match without any controller change.
 */

import type { InstrumentProfile } from '../profile/instrument-profile'
import { MY_INSTRUMENT_ID } from '../profile/instrument-profiles'
import type { TranspositionCheckReport } from './transposition-check'

const OCTAVE = 12

/** The three lines of copy one check result shows; `profileSuggestion` is null when none applies. */
// @spec-link [[rule_controller_transposition_check]]
export interface TranspositionCheckCopy {
  readonly result: string
  readonly suggestion: string
  readonly profileSuggestion: string | null
}

/** Intent: "1 {unit}" in the singular, "{n} {unit}s" otherwise. */
function count(amount: number, unit: string): string {
  return amount === 1 ? `1 ${unit}` : `${amount} ${unit}s`
}

/**
 * Intent: word a non-zero semitone distance — semitones below an octave, whole octaves for a
 * multiple of 12, otherwise semitones with the octave-and-remainder breakdown in parentheses.
 */
function distanceWording(offset: number): string {
  const semitones = Math.abs(offset)
  if (semitones < OCTAVE) return count(semitones, 'semitone')
  const octaves = Math.floor(semitones / OCTAVE)
  const remainder = semitones % OCTAVE
  if (remainder === 0) return count(octaves, 'octave')
  return `${semitones} semitones (${count(octaves, 'octave')} and ${count(remainder, 'semitone')})`
}

/**
 * Intent: how the result names the instrument checked: "the {profile} profile" for a built-in,
 * "your instrument, {name}," for my instrument, its name being the profile's display name.
 */
// @spec-link [[rule_transposition_check_sets_my_instrument]]
function checkedName(profile: InstrumentProfile, beforeVerb: boolean): string {
  if (profile.id !== MY_INSTRUMENT_ID) return `the ${profile.displayName} profile`
  return `your instrument, ${profile.displayName}${beforeVerb ? ',' : ''}`
}

/** Intent: the result and suggestion lines for a controller that is `offset` semitones off. */
function mismatchLines(
  offset: number,
  setting: 'octave' | 'transpose',
  profile: InstrumentProfile,
): { readonly result: string; readonly suggestion: string } {
  const distance = distanceWording(offset)
  const direction = offset > 0 ? 'higher' : 'lower'
  const opposite = offset > 0 ? 'lower' : 'higher'
  return {
    result: `Your controller sounds ${distance} ${direction} than ${checkedName(profile, true)} expects.`,
    suggestion: `Change your controller's ${setting} setting so it plays ${distance} ${opposite}, then run the check again.`,
  }
}

/**
 * Intent: turn a check report into the exact handoff copy for the current profile, adding the
 * other-profile line only when the report names a profile that would match as is. With my
 * instrument selected, the copy names it as "your instrument, {name},".
 */
// @spec-link [[rule_controller_transposition_check]]
export function transpositionCheckCopy(
  report: TranspositionCheckReport,
  profile: InstrumentProfile,
): TranspositionCheckCopy {
  switch (report.kind) {
    case 'match':
      return {
        result: `Your controller matches ${checkedName(profile, false)}.`,
        suggestion: "Nothing to change — you're ready to play.",
        profileSuggestion: null,
      }
    case 'octaves':
      return { ...mismatchLines(report.offset, 'octave', profile), profileSuggestion: null }
    case 'semitones': {
      const other = report.suggestedProfile?.displayName
      return {
        ...mismatchLines(report.offset, 'transpose', profile),
        profileSuggestion:
          other === undefined
            ? null
            : `If you actually play the ${other}, choose the ${other} instrument profile instead — no controller change needed.`,
      }
    }
  }
}
