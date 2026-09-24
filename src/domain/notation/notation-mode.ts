/**
 * The independently selected written-notation display conventions and their concert-to-written
 * transposition intervals. A display convention is presentation state only: it never enters a
 * generation request, never changes the concert timeline, and never changes profile policy.
 */
import { deepFreeze } from '../events/deep-freeze'

/** The closed set of written-notation display conventions. */
// @spec-link [[module_notation_display_convention]]
export type NotationMode = 'Concert' | 'B-flat tenor' | 'E-flat alto'

/** Every display convention, in the order the workspace presents them. */
// @spec-link [[module_notation_display_convention]]
export const NOTATION_MODES: readonly NotationMode[] = deepFreeze([
  'Concert',
  'B-flat tenor',
  'E-flat alto',
] as const)

/**
 * A concert-to-written transposition: `chromatic` semitones added to every concert MIDI pitch and
 * the nominal `diatonic` letter-step interval (a major ninth is 14 semitones over 8 letter steps).
 * Written letters come from the fewest-accidental spelling of the written tonal center, so the
 * diatonic value is the nominal interval and equals the letter shift whenever both spellings are
 * the natural-letter ones.
 */
// @spec-link [[module_notation_display_convention]]
export interface DisplayTransposition {
  readonly chromatic: 0 | 9 | 14
  readonly diatonic: 0 | 5 | 8
}

/** Concert +0/+0, B-flat tenor +14/+8 (major ninth), E-flat alto +9/+5 (major sixth). */
// @spec-link [[rule_notation_display_preserves_phrase]]
export const DISPLAY_TRANSPOSITIONS: Readonly<Record<NotationMode, DisplayTransposition>> =
  deepFreeze({
    Concert: { chromatic: 0, diatonic: 0 },
    'B-flat tenor': { chromatic: 14, diatonic: 8 },
    'E-flat alto': { chromatic: 9, diatonic: 5 },
  })
