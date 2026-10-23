/**
 * Shared immutable values of Step 7 generation orchestration: the versioned search policy, the
 * provenance of one generated phrase, per-window outcomes, internal diagnostics, and the public
 * orchestration outcome that carries the resolved core request beside the unchanged
 * GenerationResult.
 */

import type { HarmonyCandidate } from '../../harmony/harmony-types'
import type { ConcreteTensionBinding } from '../../pitch/pitch-planner'
import type { RegisterId } from '../../profile/register-id'
import type { RhythmLockTier } from '../../rhythm/rhythm-lock-order'
import type { RhythmCandidate } from '../../rhythm/rhythm-types'
import type { GenerationRequest } from '../generation-request'
import type { GenerationResult } from '../generation-result'

/**
 * The versioned identity of the whole-window search ledger policy: the first release's, used by
 * every generation without carry-in, or the carry-in one, used by every generation with carry-in.
 */
// @spec-link [[mechanic_pitch_search_policy]]
export type GenerationSearchPolicyVersion = 'generation-search-v1' | 'generation-search-carry-in-v1'

/**
 * Versioned, wall-clock-independent search allowance for one resolved window. `windowFuel` is the
 * total ledger units one window may spend: one unit per visited harmony/rhythm pair, one unit per
 * attempted concrete tension binding, plus every pitch-search `advance` call (`fuelUsed`).
 */
// @spec-link [[mechanic_pitch_search_policy]]
export interface GenerationSearchPolicy {
  readonly version: GenerationSearchPolicyVersion
  readonly windowFuel: number
}

/**
 * What the rhythm lock did to one phrase: it kept the locked bars, or it took a forced bend. Kept
 * by the session history; never part of the timeline.
 */
// @spec-link [[module_rhythm_lock_order]]
// @spec-link [[rule_forced_bend]]
export type RhythmLockOutcome = RhythmLockTier

/**
 * The selected upstream candidates and binding that one phrase was planned from, and, only for a
 * request holding the rhythm lock's locked bars, what the lock did.
 */
// @spec-link [[service_generation_window_search]]
export interface GenerationProvenance {
  readonly harmony: HarmonyCandidate
  readonly rhythm: RhythmCandidate
  readonly tensionBinding: ConcreteTensionBinding
  readonly rhythmLockOutcome?: RhythmLockOutcome
}

/** Typed generation failure codes, as defined by the pitch planner and validation policy. */
// @spec-link [[service_generation_orchestration]]
export type GenerationFailureCode =
  | 'no_legal_harmony_plan'
  | 'no_legal_rhythm_plan'
  | 'no_legal_pitch_plan'
  | 'no_eligible_register_window'
  | 'search_limit_exceeded'
  | 'result_validation_failed'

/** The determinate or indeterminate outcome of searching one resolved window. */
// @spec-link [[service_generation_window_search]]
export type WindowOutcome =
  | {
      readonly kind: 'window_success'
      readonly request: GenerationRequest
      readonly result: GenerationResult
      readonly provenance: GenerationProvenance
    }
  | { readonly kind: 'window_exhausted'; readonly request: GenerationRequest }
  | { readonly kind: 'window_search_limit_exceeded'; readonly request: GenerationRequest }
  | {
      readonly kind: 'window_result_validation_failed'
      readonly request: GenerationRequest
      readonly failureCodes: readonly string[]
    }

/** Versioned observations about one window search; never read back by generation. */
// @spec-link [[entity_generation_diagnostics]]
export interface WindowDiagnostics {
  readonly register: RegisterId
  readonly outcome: WindowOutcome['kind']
  readonly ledgerVersion: GenerationSearchPolicyVersion
  readonly fuelAllowance: number
  readonly fuelUsed: number
  readonly pairsVisited: number
  readonly bindingsAttempted: number
  readonly harmonyCandidateIndex?: number
  readonly harmonyIdentity?: string
  readonly rhythmCandidateIndex?: number
  readonly rhythmIdentity?: string
  readonly bindingIndex?: number
  readonly bindingIdentity?: string
}

/** Immutable internal diagnostics of one operation, kept apart from GenerationResult. */
// @spec-link [[entity_generation_diagnostics]]
export interface GenerationDiagnostics {
  readonly version: 'generation-diagnostics-v1'
  readonly harmonyDomainSize: number
  readonly rhythmDomainSize: number
  readonly windows: readonly WindowDiagnostics[]
  readonly successfulRegisters: readonly RegisterId[]
  readonly selectedRegister?: RegisterId
}

/** One orchestration operation's outcome: resolved request beside the unchanged result, or a failure. */
// @spec-link [[service_generation_orchestration]]
export type GenerationOutcome =
  | {
      readonly kind: 'generation_success'
      readonly request: GenerationRequest
      readonly result: GenerationResult
      readonly provenance: GenerationProvenance
      readonly diagnostics: GenerationDiagnostics
    }
  | {
      readonly kind: 'generation_failure'
      readonly code: GenerationFailureCode
      readonly diagnostics: GenerationDiagnostics
    }
