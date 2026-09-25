/**
 * D29: the score-toolbar `inline-alert alert-error` banner's exact generation-failure copy, one
 * calm string per failure kind, never a raw `GenerationFailureCode` and never assembled from a
 * "Generation failed: " prefix concatenated onto the underlying error's own message.
 * `GenerationFailedError`'s own `message` (`workspace-session-result.ts`) keeps that prefix for
 * developer-facing contexts (logs, devtools); this module is the only place the player-facing
 * banner text is produced.
 */

import type { GenerationFailureCode } from '@/domain/generation/orchestration/orchestration-types'
import { GenerationFailedError } from './workspace-session-result'

const GENERIC_GENERATION_FAILURE_ALERT_TEXT = "Generation couldn't complete. Try again."

/**
 * Intent: map one failure to the score-toolbar alert's exact text. A typed `GenerationFailedError`
 * resolves through its `GenerationFailureCode`; every other error (a generation-Worker crash, a
 * Worker transport failure, or any other unrecognized error) shows the shared generic string.
 */
// @spec-link [[rule_generation_failure_alert_copy]]
export function generationFailureAlertText(error: Error): string {
  if (!(error instanceof GenerationFailedError)) return GENERIC_GENERATION_FAILURE_ALERT_TEXT
  return alertTextForFailureCode(error.code)
}

/** Intent: exhaustive per-code copy -- a new `GenerationFailureCode` must be handled here, or the switch's missing return breaks the typecheck. */
function alertTextForFailureCode(code: GenerationFailureCode): string {
  switch (code) {
    case 'no_legal_harmony_plan':
      return "This combination of tonal center, collection, harmonic motion, tension, and musical profile can't produce a phrase. Try a different tonal center, collection, harmonic motion, tension, or profile."
    case 'no_legal_rhythm_plan':
      return "This combination of note density, syncopation, and silence can't form a four-bar phrase. Try a different note density, syncopation, or silence setting."
    case 'no_legal_pitch_plan':
      return "This combination of settings can't produce a phrase. Try a different register, contour, or rhythm setting."
    case 'no_eligible_register_window':
      return "None of this instrument's register windows fit the current settings while register is set to Varying. Try a different contour."
    case 'search_limit_exceeded':
      return "This phrase search hit its work limit before finding a result. That doesn't prove this combination is impossible. Trying again may find a result, or try different settings."
    case 'result_validation_failed':
      return "Something went wrong while building this phrase. This wasn't caused by your settings."
  }
}
