/**
 * The domain half of the rhythm-domain prewarm: starts a resumable, cancellable build of the
 * canonical rhythm domain an intent's generation would look up, so the generation Worker can fill
 * the memo in slices between requests before the player presses Generate.
 */

import { isNoLegalHarmonyPlan } from '../../harmony/harmony-planner'
import type { HarmonyPlanResult } from '../../harmony/harmony-types'
import type { GenerationIntent } from '../generation-intent'
import {
  type CanonicalRhythmDomainBuildJob,
  type CanonicalRhythmDomainMemo,
  SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO,
} from './canonical-rhythm-domain'
import { buildHarmonyDomain, rhythmDomainInputOf } from './generation-orchestrator'

/**
 * Intent: begin (or resume) the memo build of the canonical rhythm domain `generatePhrase` would
 * look up for this intent, keyed by the same rhythm input. Returns undefined when that entry is
 * already memoized, or when `generatePhrase` never reaches the rhythm domain for this intent (its
 * harmony domain, from `harmonyDomainOf`, is the typed no-plan result). Every prewarm replaces the
 * memo's unfinished build of any other setting, whatever its outcome: beginning a build cancels
 * it, and a no-plan prewarm discards it.
 */
// @spec-link [[module_generation_worker_protocol]]
export function beginRhythmDomainPrewarm(
  intent: GenerationIntent,
  memo: CanonicalRhythmDomainMemo = SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO,
  harmonyDomainOf: (intent: GenerationIntent) => HarmonyPlanResult = buildHarmonyDomain,
): CanonicalRhythmDomainBuildJob | undefined {
  if (isNoLegalHarmonyPlan(harmonyDomainOf(intent))) {
    memo.discardPendingBuild()
    return undefined
  }
  return memo.beginBuild(rhythmDomainInputOf(intent))
}
