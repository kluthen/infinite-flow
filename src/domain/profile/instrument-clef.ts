/**
 * The clef an instrument's written part is drawn in: treble for every built-in profile, treble or
 * bass for my instrument, as the player chooses. The clef is display only: it is never part of the
 * generator-facing profile, the generation controls or the generation intent.
 */

/** The clef an instrument's written part is drawn in; display only. */
// @spec-link [[entity_my_instrument]]
export type InstrumentClef = 'treble' | 'bass'

/** Every clef an instrument's written part may be drawn in. */
// @spec-link [[entity_my_instrument]]
export const INSTRUMENT_CLEFS: readonly InstrumentClef[] = Object.freeze(['treble', 'bass'])

/**
 * Every built-in profile's clef, and the clef a new my instrument starts in from its template.
 */
// @spec-link [[entity_my_instrument]]
// @spec-link [[module_notation_display_convention]]
export const BUILT_IN_INSTRUMENT_CLEF: InstrumentClef = 'treble'

/** Intent: whether a value names one of the clefs an instrument's written part may be drawn in. */
// @spec-link [[entity_my_instrument]]
export function isInstrumentClef(value: unknown): value is InstrumentClef {
  return INSTRUMENT_CLEFS.some((clef) => clef === value)
}
