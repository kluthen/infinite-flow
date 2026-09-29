/**
 * The note density a phrase is generated with, as opposed to the one the player chose. Below the
 * tablet-landscape layout's width (`bp-tablet-landscape`, 64rem) `Sixteenth` is the most likely
 * cause of a phrase too dense for a phone's staff, so a chosen `Sixteenth` generates as `Eighth`
 * there; the chosen value itself is never changed. A running session that has generated a phrase
 * with `Eighth` this way keeps generating with `Eighth` until it ends, even if the window widens
 * again, so its density only ever steps down. Everything here is pure: the caller reads the
 * window's width and the session's state and passes them in, so the generation intent built from
 * the result carries a plain density and no browser state.
 */
import {
  makeGenerationControls,
  type GenerationControls,
  type NoteDensity,
} from './generation-controls'

/** What decides the density a phrase is generated with, besides the chosen density. */
// @spec-link [[rule_generated_density_follows_window_width]]
// @spec-link [[rule_session_density_only_steps_down]]
export interface NoteDensityContext {
  /** The window is narrower than `bp-tablet-landscape` at the moment the phrase is generated. */
  readonly belowTabletLandscape: boolean
  /**
   * The running session has already generated a phrase with `Eighth` because a chosen
   * `Sixteenth` fell below that width. Always false at Idle: the chosen value applies again from
   * Idle, and phrase 1 of a session is generated at Idle.
   */
  readonly sessionSteppedDown: boolean
}

/**
 * Intent: the note density a phrase is generated with. A chosen `Sixteenth` generates as `Eighth`
 * while the window is below `bp-tablet-landscape` or once the session has stepped down; every
 * other chosen value, and a `Sixteenth` at or above the width in a session that has not stepped
 * down, generates as chosen. The result is never denser than the chosen value.
 */
// @spec-link [[rule_generated_density_follows_window_width]]
// @spec-link [[rule_session_density_only_steps_down]]
// @spec-link [[module_generation_control_catalog]]
export function resolveGeneratedNoteDensity(
  chosen: NoteDensity,
  context: NoteDensityContext,
): NoteDensity {
  if (chosen !== 'Sixteenth') return chosen
  return context.belowTabletLandscape || context.sessionSteppedDown ? 'Eighth' : 'Sixteenth'
}

/**
 * Intent: the controls a phrase is generated from: the chosen controls with only the note density
 * resolved. Returns the chosen controls object itself when the density is unchanged, and a new
 * immutable one otherwise; the chosen controls are never modified.
 */
// @spec-link [[rule_generated_density_follows_window_width]]
export function resolveGeneratedControls(
  controls: GenerationControls,
  context: NoteDensityContext,
): GenerationControls {
  const noteDensity = resolveGeneratedNoteDensity(controls.noteDensity, context)
  if (noteDensity === controls.noteDensity) return controls
  return makeGenerationControls({ ...controls, noteDensity })
}
