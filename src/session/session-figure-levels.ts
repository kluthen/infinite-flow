/**
 * The figure levels a session's settings generate with, and which figures' levels differ between
 * two settings: what a carry-in after a change and the stale phrase 1 prompt read.
 */

import { FIGURE_IDS, type FigureId, type FigureLevels } from '../domain/figures/figure-levels'
import type { SessionSettings } from './session-types'

/**
 * Intent: the figure levels the settings generate with: the settings' own seven levels, never
 * taken from the selection's name, whatever the selection is.
 */
// @spec-link [[module_session_carry_in_after_change]]
// @spec-link [[rule_stale_phrase_prompt_at_start]]
export function sessionFigureLevels(settings: SessionSettings): FigureLevels {
  return settings.figureLevels
}

/**
 * Intent: every figure whose level differs between the two settings' levels, in FIGURE_IDS order;
 * none when the levels are equal, as after a change of the selection alone.
 */
// @spec-link [[module_session_carry_in_after_change]]
// @spec-link [[rule_stale_phrase_prompt_at_start]]
export function figuresWithChangedLevels(
  before: SessionSettings,
  after: SessionSettings,
): readonly FigureId[] {
  const was = sessionFigureLevels(before)
  const is = sessionFigureLevels(after)
  return FIGURE_IDS.filter((figure) => was[figure] !== is[figure])
}
