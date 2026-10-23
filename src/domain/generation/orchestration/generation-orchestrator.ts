/**
 * The Step 7 top-level orchestration entry point: turns one outer GenerationIntent into one
 * GenerationOutcome. Expands the finite structural harmony and rhythm domains exactly once, ranks
 * them once for the intent's seed, resolves the intent into its one-or-three core requests, and
 * runs one independent `searchWindow` per request. A fixed register selects its one window's
 * outcome directly; Varying evaluates every window to a determinate result before choosing among
 * the successes with `selectVaryingRegister`, never stopping early and never re-running a window
 * it already validated. See docs/music/pitch-planner-validation.md ("Orchestration, Varying
 * resolution, and failure") for the authoritative precedence and failure semantics this
 * implements.
 */

import { deepFreeze } from '../../events/deep-freeze'
import { makeHarmonyCandidateDomain, isNoLegalHarmonyPlan } from '../../harmony/harmony-planner'
import { candidatesFollowingCarriedHarmony } from '../../harmony/harmony-join'
import type {
  HarmonyCandidate,
  HarmonyCandidateDomain,
  HarmonyPlanResult,
} from '../../harmony/harmony-types'
import { makeRhythmLockOrder, type RhythmLockOrder } from '../../rhythm/rhythm-lock-order'
import { isNoLegalRhythmPlan } from '../../rhythm/rhythm-planner'
import type { RhythmCandidate, RhythmExpansionInput } from '../../rhythm/rhythm-types'
import type { RegisterId } from '../../profile/register-id'
import type { GenerationIntent } from '../generation-intent'
import type { GenerationRequest } from '../generation-request'
import {
  type CanonicalRhythmDomainMemo,
  SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO,
} from './canonical-rhythm-domain'
import {
  rankHarmonyCandidates,
  rankMaterializedRhythmCandidates,
  type RankedRhythmCache,
} from './candidate-ranking'
import type {
  GenerationDiagnostics,
  GenerationOutcome,
  GenerationSearchPolicy,
  WindowDiagnostics,
} from './orchestration-types'
import {
  resolveCoreRequests,
  searchesVaryingWindows,
  selectVaryingRegister,
} from './request-resolution'
import { GENERATION_SEARCH_POLICY_CARRY_IN_V1, GENERATION_SEARCH_POLICY_V1 } from './search-ledger'
import {
  DEFAULT_WINDOW_SEARCH_DEPS,
  searchWindow,
  type WindowSearchDeps,
  type WindowSearchReport,
} from './window-search'

/** Caller-overridable collaborators for one `generatePhrase` call; each defaults to production. */
export interface GenerationOrchestrationOptions {
  readonly searchPolicy?: GenerationSearchPolicy
  readonly deps?: WindowSearchDeps
  readonly rhythmDomainMemo?: CanonicalRhythmDomainMemo
}

/** Intent: build the exact structural harmony domain input the whole-result validator re-derives. */
// @spec-link [[service_generation_orchestration]]
export function buildHarmonyDomain(intent: GenerationIntent): HarmonyPlanResult {
  return makeHarmonyCandidateDomain({
    tonalCenter: intent.controls.tonalCenter,
    collection: intent.controls.collection,
    harmonicMotion: intent.controls.harmonicMotion,
    tensionArc: intent.controls.tension,
  })
}

/**
 * Intent: the rhythm-domain memo input of one intent: its five rhythm-relevant controls, the only
 * part of the intent the seed-independent canonical rhythm domain depends on.
 */
// @spec-link [[service_generation_orchestration]]
export function rhythmDomainInputOf(intent: GenerationIntent): RhythmExpansionInput {
  return {
    noteDensity: intent.controls.noteDensity,
    rhythmicVariety: intent.controls.rhythmicVariety,
    silenceDensity: intent.controls.silenceDensity,
    syncopation: intent.controls.syncopation,
    tensionArc: intent.controls.tension,
  }
}

/**
 * Intent: look up the seed-independent canonical rhythm domain for the intent's rhythm-relevant
 * controls in the given memo, expanding the Step 6 grammar only on a memo miss.
 */
function buildRhythmDomain(
  intent: GenerationIntent,
  memo: CanonicalRhythmDomainMemo,
): ReturnType<CanonicalRhythmDomainMemo['lookup']> {
  return memo.lookup(rhythmDomainInputOf(intent))
}

/**
 * Intent: build the deep-frozen internal diagnostics for one `generatePhrase` call. Built as a
 * separate value once the algorithm has already decided its outcome; nothing above ever reads it
 * back to decide anything.
 */
// @spec-link [[service_generation_orchestration]]
// @spec-link [[entity_generation_diagnostics]]
function buildDiagnostics(
  harmonyDomainSize: number,
  rhythmDomainSize: number,
  windows: readonly WindowDiagnostics[],
  successfulRegisters: readonly RegisterId[],
  selectedRegister?: RegisterId,
): GenerationDiagnostics {
  const base = {
    version: 'generation-diagnostics-v1' as const,
    harmonyDomainSize,
    rhythmDomainSize,
    windows,
    successfulRegisters,
  }
  if (selectedRegister === undefined) return deepFreeze(base)
  return deepFreeze({ ...base, selectedRegister })
}

/**
 * Intent: the rhythm lock's order for an intent holding locked bars, built once for every window
 * of the request (so its forced bend's order is computed at most once); undefined otherwise, the
 * lock off or "on, nothing locked yet", whose windows walk v3.1's order.
 */
// @spec-link [[module_rhythm_lock_order]]
function rhythmLockOrderFor(
  intent: GenerationIntent,
  domain: readonly RhythmCandidate[],
  rankedRhythm: RankedRhythmCache,
): RhythmLockOrder | undefined {
  const state = intent.rhythmLock?.state
  if (state?.kind !== 'locked') return undefined
  return makeRhythmLockOrder({ domain, seeded: rankedRhythm.candidates, lockedBars: state.bars })
}

/** Intent: run one independent, freshly-ledgered `searchWindow` for every resolved core request. */
function runWindows(
  intent: GenerationIntent,
  requests: readonly GenerationRequest[],
  rankedHarmony: readonly HarmonyCandidate[],
  rankedRhythm: RankedRhythmCache,
  rhythmLockOrder: RhythmLockOrder | undefined,
  searchPolicy: GenerationSearchPolicy,
  deps: WindowSearchDeps,
): readonly WindowSearchReport[] {
  const lock = rhythmLockOrder === undefined ? {} : { rhythmLockOrder }
  return requests.map((request) =>
    searchWindow({ intent, request, rankedHarmony, rankedRhythm, searchPolicy, ...lock }, deps),
  )
}

/** Intent: true when any window's outcome is a claimed plan that failed independent validation. */
function anyValidationFailed(reports: readonly WindowSearchReport[]): boolean {
  return reports.some((report) => report.outcome.kind === 'window_result_validation_failed')
}

/** Intent: true when any window's outcome is an incomplete (fuel-cut-off) search. */
function anyLimitExceeded(reports: readonly WindowSearchReport[]): boolean {
  return reports.some((report) => report.outcome.kind === 'window_search_limit_exceeded')
}

/** Intent: the successful window reports, in the same resolution order they were searched in. */
function successfulReports(
  reports: readonly WindowSearchReport[],
): readonly Extract<WindowSearchReport['outcome'], { kind: 'window_success' }>[] {
  return reports
    .map((report) => report.outcome)
    .filter(
      (outcome): outcome is Extract<WindowSearchReport['outcome'], { kind: 'window_success' }> =>
        outcome.kind === 'window_success',
    )
}

/**
 * Intent: choose the outcome to return once no window is validation-failed or limit-exceeded.
 * A fixed intent has exactly one window and returns its success verbatim; a Varying intent
 * selects one register among the successful windows and reuses that window's already-validated
 * request/result/provenance without re-running any search.
 */
function chooseSuccess(
  intent: GenerationIntent,
  successes: readonly Extract<WindowSearchReport['outcome'], { kind: 'window_success' }>[],
): Extract<WindowSearchReport['outcome'], { kind: 'window_success' }> {
  if (!searchesVaryingWindows(intent)) return successes[0]!
  const successfulRegisters = successes.map((success) => success.request.register)
  const selected = selectVaryingRegister(intent, successfulRegisters)
  return successes.find((success) => success.request.register === selected)!
}

/**
 * Intent: the typed no-selection failure code, distinct for one resolved window (a fixed register,
 * or any intent with a carry-in) versus a Varying search over every window.
 */
function noSelectionFailureCode(
  intent: GenerationIntent,
): 'no_legal_pitch_plan' | 'no_eligible_register_window' {
  return searchesVaryingWindows(intent) ? 'no_eligible_register_window' : 'no_legal_pitch_plan'
}

/**
 * Intent: apply the documented outcome precedence to a completed set of window reports: any
 * result-validation failure beats any search-limit cutoff, which beats a non-empty successful
 * set, which beats the typed "no window resolved" failure. Never inspects diagnostics.
 */
function resolveOutcomeKind(
  reports: readonly WindowSearchReport[],
): 'result_validation_failed' | 'search_limit_exceeded' | 'success' | 'no_selection' {
  if (anyValidationFailed(reports)) return 'result_validation_failed'
  if (anyLimitExceeded(reports)) return 'search_limit_exceeded'
  if (successfulReports(reports).length > 0) return 'success'
  return 'no_selection'
}

/**
 * Intent: the harmony candidates the phrase may use, in domain order. Without a carry-in, or with
 * one whose harmony a key or collection change dropped (null), the whole domain is open, exactly
 * as for a phrase with no carried chord; otherwise only the candidates that follow the carried
 * chord.
 */
// @spec-link [[service_generation_orchestration]]
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
function harmonyCandidatesAfterCarryIn(
  harmonyDomain: HarmonyCandidateDomain,
  intent: GenerationIntent,
): readonly HarmonyCandidate[] {
  const carryIn = intent.carryIn
  if (carryIn === undefined || carryIn.finalHarmony === null) return harmonyDomain.candidates
  return candidatesFollowingCarriedHarmony(harmonyDomain, carryIn.finalHarmony)
}

/**
 * Intent: the search policy every window of one generation searches under, picked from the intent
 * alone: the carry-in policy for an intent with a carry-in, and the first release's policy for every
 * intent without one, so that generation stays byte-identical to the first release. Replaying a
 * decoded intent therefore derives the same policy.
 */
// @spec-link [[mechanic_pitch_search_policy]]
// @spec-link [[service_generation_orchestration]]
function searchPolicyFor(intent: GenerationIntent): GenerationSearchPolicy {
  return intent.carryIn === undefined
    ? GENERATION_SEARCH_POLICY_V1
    : GENERATION_SEARCH_POLICY_CARRY_IN_V1
}

/**
 * Intent: generate one four-measure phrase for one outer GenerationIntent: expand and rank the
 * structural harmony and rhythm domains once, resolve the intent's one-or-three core requests,
 * search every window independently, and resolve the documented outcome precedence among them.
 * With a carry-in, the harmony starts from the carried chord (if one was carried) and the one
 * carried window is searched.
 * `options.searchPolicy` defaults to the policy picked from the intent (with or without carry-in)
 * and is its only override; `options.deps` defaults to the production collaborators.
 * Only these injectable collaborators are defaulted, never any domain data derived from `intent`.
 */
// @spec-link [[service_generation_orchestration]]
export function generatePhrase(
  intent: GenerationIntent,
  options: GenerationOrchestrationOptions = {},
): GenerationOutcome {
  const searchPolicy = options.searchPolicy ?? searchPolicyFor(intent)
  const deps = options.deps ?? DEFAULT_WINDOW_SEARCH_DEPS
  const rhythmDomainMemo = options.rhythmDomainMemo ?? SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO

  const harmonyDomain = buildHarmonyDomain(intent)
  if (isNoLegalHarmonyPlan(harmonyDomain)) {
    const outcome: GenerationOutcome = {
      kind: 'generation_failure',
      code: 'no_legal_harmony_plan',
      diagnostics: buildDiagnostics(0, 0, [], []),
    }
    return deepFreeze(outcome)
  }

  const rhythmDomain = buildRhythmDomain(intent, rhythmDomainMemo)
  if (isNoLegalRhythmPlan(rhythmDomain)) {
    const outcome: GenerationOutcome = {
      kind: 'generation_failure',
      code: 'no_legal_rhythm_plan',
      diagnostics: buildDiagnostics(harmonyDomain.candidates.length, 0, [], []),
    }
    return deepFreeze(outcome)
  }

  const harmonyCandidates = harmonyCandidatesAfterCarryIn(harmonyDomain, intent)
  const rankedHarmony = rankHarmonyCandidates(harmonyCandidates, intent.seed)
  const rankedRhythm = rankMaterializedRhythmCandidates(
    rhythmDomain.grammarVersion,
    rhythmDomain.candidates,
    intent.seed,
  )
  const rhythmLockOrder = rhythmLockOrderFor(intent, rhythmDomain.candidates, rankedRhythm)
  const requests = resolveCoreRequests(intent)
  const reports = runWindows(
    intent,
    requests,
    rankedHarmony,
    rankedRhythm,
    rhythmLockOrder,
    searchPolicy,
    deps,
  )
  const windows = reports.map((report) => report.diagnostics)
  const harmonyDomainSize = harmonyDomain.candidates.length
  const rhythmDomainSize = rankedRhythm.domainSize

  const outcomeKind = resolveOutcomeKind(reports)

  if (outcomeKind === 'result_validation_failed' || outcomeKind === 'search_limit_exceeded') {
    const outcome: GenerationOutcome = {
      kind: 'generation_failure',
      code: outcomeKind,
      diagnostics: buildDiagnostics(harmonyDomainSize, rhythmDomainSize, windows, []),
    }
    return deepFreeze(outcome)
  }

  if (outcomeKind === 'no_selection') {
    const outcome: GenerationOutcome = {
      kind: 'generation_failure',
      code: noSelectionFailureCode(intent),
      diagnostics: buildDiagnostics(harmonyDomainSize, rhythmDomainSize, windows, []),
    }
    return deepFreeze(outcome)
  }

  const successes = successfulReports(reports)
  const chosen = chooseSuccess(intent, successes)
  const successfulRegisters = successes.map((success) => success.request.register)

  const outcome: GenerationOutcome = {
    kind: 'generation_success',
    request: chosen.request,
    result: chosen.result,
    provenance: chosen.provenance,
    diagnostics: buildDiagnostics(
      harmonyDomainSize,
      rhythmDomainSize,
      windows,
      successfulRegisters,
      chosen.request.register,
    ),
  }
  return deepFreeze(outcome)
}
