/**
 * Depth-first search of one resolved window's harmony, rhythm, tension-binding, and pitch
 * candidate space, ledger-metered and wall-clock independent. Walks the already-ranked harmony
 * and rhythm candidates pair by pair, harmony-major (each harmony with every rhythm) as v3.1
 * does, or rhythm-major in the rhythm lock's order (each rhythm with every harmony) for a request
 * holding locked bars, then each pair's concrete tension binding domain in stable order, planning a pitch phrase for each binding and independently validating
 * the first plan found. Every unit of search work (a visited harmony/rhythm pair, an attempted
 * concrete tension binding, and every pitch-search `advance` call folded into a plan's
 * `fuelUsed`) is metered against one FuelLedger opened under the caller's GenerationSearchPolicy;
 * the ledger distinguishes natural exhaustion of the whole candidate space from a fuel cutoff.
 * Diagnostics are collected only as a side observation and are never consulted by the algorithm.
 */

import { deepFreeze } from '../../events/deep-freeze'
import type { HarmonyCandidate } from '../../harmony/harmony-types'
import {
  makeBoundPitchPlannerInput,
  makePitchPolicy,
  makeTensionBindingDomain,
  planPitchPhrase,
  type BoundPitchPlannerInput,
  type ConcreteTensionBinding,
  type PitchPlanResult,
} from '../../pitch/pitch-planner'
import {
  walkRhythmLockOrder,
  type RhythmLockOrder,
  type RhythmLockStep,
} from '../../rhythm/rhythm-lock-order'
import type { RhythmCandidate } from '../../rhythm/rhythm-types'
import {
  validateGenerationResult,
  type GenerationResultValidationInput,
} from '../../validation/generation-result-validator'
import type { GenerationIntent } from '../generation-intent'
import type { GenerationRequest } from '../generation-request'
import type { RankedRhythmCache } from './candidate-ranking'
import type {
  GenerationProvenance,
  GenerationSearchPolicy,
  WindowDiagnostics,
  WindowOutcome,
} from './orchestration-types'
import { openFuelLedger, remainingFuel, spendFuel, type FuelLedger } from './search-ledger'
import { assemblePhraseResult } from './timeline-assembly'

/**
 * The already-resolved, already-ranked inputs one window search consumes. `rhythmLockOrder` is
 * present exactly when the request holds the rhythm lock's locked bars: the order the
 * orchestrator built once for the request, shared by its windows.
 */
export interface WindowSearchInput {
  readonly intent: GenerationIntent
  readonly request: GenerationRequest
  readonly rankedHarmony: readonly HarmonyCandidate[]
  readonly rankedRhythm: RankedRhythmCache
  readonly searchPolicy: GenerationSearchPolicy
  readonly rhythmLockOrder?: RhythmLockOrder
}

/** Injectable collaborators, defaulted to the real pitch planner and result validator. */
export interface WindowSearchDeps {
  readonly planPitch: (input: BoundPitchPlannerInput) => PitchPlanResult
  readonly validateResult: typeof validateGenerationResult
}

/** The production collaborators: the real pitch planner and the real result validator. */
export const DEFAULT_WINDOW_SEARCH_DEPS: WindowSearchDeps = deepFreeze({
  planPitch: planPitchPhrase,
  validateResult: validateGenerationResult,
})

/** One window search's public outcome beside its never-read-back internal diagnostics. */
export interface WindowSearchReport {
  readonly outcome: WindowOutcome
  readonly diagnostics: WindowDiagnostics
}

/** Mutable per-search bookkeeping local to one `searchWindow` call; never exposed or reused. */
interface SearchAccumulator {
  ledger: FuelLedger
  pairsVisited: number
  bindingsAttempted: number
}

/** The resolved candidate identity behind a search step that reached a final answer. */
interface ResolvedIdentity {
  readonly harmony: HarmonyCandidate
  readonly rhythm: RhythmCandidate
  readonly binding: ConcreteTensionBinding
}

/** The outcome of one search step: keep going, stop on a fuel cutoff, or a final answer. */
type StepResult =
  | { readonly kind: 'continue' }
  | { readonly kind: 'limit_exceeded' }
  | {
      readonly kind: 'resolved'
      readonly outcome: WindowOutcome
      readonly identity: ResolvedIdentity
    }

/**
 * Intent: build the pitch policy for one binding attempt from the request's outer controls and
 * figure levels.
 */
function bindingPitchPolicy(input: WindowSearchInput, searchFuel: number) {
  const controls = input.intent.controls
  return makePitchPolicy({
    figureLevels: input.intent.figureLevels,
    collection: controls.collection,
    tonalCenter: controls.tonalCenter,
    contour: controls.contour,
    leapiness: controls.leapiness,
    arpeggioChaos: controls.arpeggioChaos,
    searchFuel,
  })
}

/**
 * Intent: what the rhythm lock did to the phrase, for its provenance: nothing without a lock step
 * (v3.1's walk); otherwise the step's tier, and, when the phrase drew a rhythm change, the kind of
 * the change it took, or `no_change_available` when it kept the lock's order (the walk sets the
 * kind exactly on the change's tier).
 */
// @spec-link [[module_rhythm_change_draw]]
// @spec-link [[module_rhythm_lock_order]]
function rhythmLockProvenance(
  input: WindowSearchInput,
  lockStep: RhythmLockStep | undefined,
): Pick<GenerationProvenance, 'rhythmLockOutcome' | 'rhythmChange'> {
  if (lockStep === undefined) return {}
  if (input.rhythmLockOrder?.change?.changes !== true) return { rhythmLockOutcome: lockStep.tier }
  return {
    rhythmLockOutcome: lockStep.tier,
    rhythmChange: lockStep.changeKind ?? 'no_change_available',
  }
}

/**
 * Intent: assemble and independently validate the phrase for one accepted pitch plan, producing
 * the final `resolved` step: window_success on a valid result, window_result_validation_failed
 * with its failure codes otherwise. Never retried; the caller stops the whole search either way.
 */
function resolvePlannedPhrase(
  input: WindowSearchInput,
  deps: WindowSearchDeps,
  harmony: HarmonyCandidate,
  rhythm: RhythmCandidate,
  binding: ConcreteTensionBinding,
  planResult: Extract<PitchPlanResult, { kind: 'pitch_plan' }>,
  lockStep: RhythmLockStep | undefined,
): StepResult {
  const attackMidis = planResult.phrase.assignments.map((assignment) => assignment.candidate.midi)
  const result = assemblePhraseResult(input.request, rhythm, attackMidis)
  const provenance: GenerationProvenance = {
    harmony,
    rhythm,
    tensionBinding: binding,
    ...rhythmLockProvenance(input, lockStep),
  }
  const validationInput: GenerationResultValidationInput = {
    intent: input.intent,
    request: input.request,
    result,
    provenance,
  }
  const identity: ResolvedIdentity = { harmony, rhythm, binding }
  const verdict = deps.validateResult(validationInput)
  if (verdict.kind === 'invalid_generation_result') {
    return {
      kind: 'resolved',
      identity,
      outcome: {
        kind: 'window_result_validation_failed',
        request: input.request,
        failureCodes: verdict.failures.map((failure) => failure.code),
      },
    }
  }
  return {
    kind: 'resolved',
    identity,
    outcome: { kind: 'window_success', request: input.request, result, provenance },
  }
}

/**
 * Intent: attempt one concrete tension binding of one harmony/rhythm pair: spend its ledger unit,
 * plan a pitch phrase under the remaining fuel, and either continue to the next binding
 * (no_legal_pitch_plan), stop the whole search on a fuel cutoff, or resolve the search on the
 * first accepted plan (validated success or failure).
 */
function tryBinding(
  input: WindowSearchInput,
  deps: WindowSearchDeps,
  acc: SearchAccumulator,
  harmony: HarmonyCandidate,
  rhythm: RhythmCandidate,
  binding: ConcreteTensionBinding,
  lockStep: RhythmLockStep | undefined,
): StepResult {
  if (remainingFuel(acc.ledger) < 1) return { kind: 'limit_exceeded' }
  acc.ledger = spendFuel(acc.ledger, 1)
  acc.bindingsAttempted += 1
  if (remainingFuel(acc.ledger) === 0) return { kind: 'limit_exceeded' }

  const policy = bindingPitchPolicy(input, remainingFuel(acc.ledger))
  const boundInput = makeBoundPitchPlannerInput({
    request: input.request,
    policy,
    harmony,
    rhythm,
    tensionBinding: binding,
  })
  const planResult = deps.planPitch(boundInput)
  acc.ledger = spendFuel(acc.ledger, planResult.fuelUsed)

  if (planResult.kind === 'search_limit_exceeded') return { kind: 'limit_exceeded' }
  if (planResult.kind === 'no_legal_pitch_plan') return { kind: 'continue' }
  return resolvePlannedPhrase(input, deps, harmony, rhythm, binding, planResult, lockStep)
}

/**
 * Intent: attempt one harmony/rhythm pair: spend its ledger unit, derive the concrete tension
 * binding domain, and try each binding in stable order until one resolves the search, a fuel
 * cutoff stops it, or the domain is exhausted (no legal binding domain counts as immediately
 * exhausted).
 */
function tryPair(
  input: WindowSearchInput,
  deps: WindowSearchDeps,
  acc: SearchAccumulator,
  harmony: HarmonyCandidate,
  rhythm: RhythmCandidate,
  lockStep: RhythmLockStep | undefined,
): StepResult {
  if (remainingFuel(acc.ledger) < 1) return { kind: 'limit_exceeded' }
  acc.ledger = spendFuel(acc.ledger, 1)
  acc.pairsVisited += 1

  const bindingDomain = makeTensionBindingDomain(harmony, rhythm)
  if (bindingDomain.kind === 'no_legal_tension_binding') return { kind: 'continue' }

  for (const binding of bindingDomain.bindings) {
    const step = tryBinding(input, deps, acc, harmony, rhythm, binding, lockStep)
    if (step.kind !== 'continue') return step
  }
  return { kind: 'continue' }
}

/** Intent: build the frozen diagnostics for one finished window search from its accumulator. */
function buildDiagnostics(
  input: WindowSearchInput,
  acc: SearchAccumulator,
  outcomeKind: WindowOutcome['kind'],
  identity: ResolvedIdentity | undefined,
): WindowDiagnostics {
  const base = {
    register: input.request.register,
    outcome: outcomeKind,
    ledgerVersion: acc.ledger.version,
    fuelAllowance: acc.ledger.allowance,
    fuelUsed: acc.ledger.used,
    pairsVisited: acc.pairsVisited,
    bindingsAttempted: acc.bindingsAttempted,
  }
  if (!identity) return deepFreeze(base)
  return deepFreeze({
    ...base,
    harmonyCandidateIndex: identity.harmony.candidateIndex,
    harmonyIdentity: identity.harmony.identity,
    rhythmCandidateIndex: identity.rhythm.candidateIndex,
    rhythmIdentity: identity.rhythm.identity,
    bindingIndex: identity.binding.bindingIndex,
    bindingIdentity: identity.binding.identity,
  })
}

/**
 * Intent: the rhythm lock order the search walks, present exactly when the request holds locked
 * bars. Throws when the request and the input disagree, so a locked request is never searched in
 * v3.1's order, nor an unlocked one in the lock's.
 */
function rhythmLockOrderOf(input: WindowSearchInput): RhythmLockOrder | undefined {
  const locked = input.request.rhythmLock?.state.kind === 'locked'
  if (locked && input.rhythmLockOrder === undefined)
    throw new Error('A request holding locked bars is searched only with its rhythm lock order.')
  if (!locked && input.rhythmLockOrder !== undefined)
    throw new Error('A rhythm lock order is searched only for a request holding locked bars.')
  return input.rhythmLockOrder
}

/**
 * Intent: v3.1's walk, harmony-major: each harmony candidate with every rhythm candidate, in
 * ranked order, before the next harmony candidate. Returns the first step that is not
 * `continue`, or `continue` once every pair is exhausted.
 */
function walkHarmonyMajor(
  input: WindowSearchInput,
  deps: WindowSearchDeps,
  acc: SearchAccumulator,
): StepResult {
  for (const harmony of input.rankedHarmony) {
    for (const rhythm of input.rankedRhythm.candidates) {
      const step = tryPair(input, deps, acc, harmony, rhythm, undefined)
      if (step.kind !== 'continue') return step
    }
  }
  return { kind: 'continue' }
}

/**
 * Intent: the rhythm lock's walk, rhythm-major: each rhythm in the lock's order (the drawn rhythm
 * change's candidates, the locked bars, then the forced bend's order) with every harmony
 * candidate, in ranked order, before the next rhythm, so the locked rhythm gives way only when no
 * chord plan makes a phrase with it. Same pairs, same ledger, same fuel as the harmony-major walk.
 */
// @spec-link [[module_rhythm_lock_order]]
// @spec-link [[rule_rhythm_lock_strict]]
function walkRhythmMajor(
  input: WindowSearchInput,
  deps: WindowSearchDeps,
  acc: SearchAccumulator,
  order: RhythmLockOrder,
): StepResult {
  for (const lockStep of walkRhythmLockOrder(order)) {
    for (const harmony of input.rankedHarmony) {
      const step = tryPair(input, deps, acc, harmony, lockStep.rhythm, lockStep)
      if (step.kind !== 'continue') return step
    }
  }
  return { kind: 'continue' }
}

/**
 * Intent: search one resolved window's full harmony/rhythm/tension-binding/pitch candidate space
 * depth-first, without replacement, in already-ranked order, under one wall-clock-independent
 * FuelLedger. Returns the first independently validated plan found as window_success, a claimed
 * plan that fails independent validation as window_result_validation_failed (search stops either
 * way), window_search_limit_exceeded on a fuel cutoff, or window_exhausted once every pair and
 * binding has been tried without a resolving plan. The pairs are walked harmony-major, or
 * rhythm-major in the rhythm lock's order when the request holds locked bars.
 */
// @spec-link [[service_generation_window_search]]
// @spec-link [[mechanic_pitch_search_policy]]
export function searchWindow(
  input: WindowSearchInput,
  deps: WindowSearchDeps = DEFAULT_WINDOW_SEARCH_DEPS,
): WindowSearchReport {
  const rhythmLockOrder = rhythmLockOrderOf(input)
  const acc: SearchAccumulator = {
    ledger: openFuelLedger(input.searchPolicy),
    pairsVisited: 0,
    bindingsAttempted: 0,
  }

  const step =
    rhythmLockOrder === undefined
      ? walkHarmonyMajor(input, deps, acc)
      : walkRhythmMajor(input, deps, acc, rhythmLockOrder)
  if (step.kind === 'limit_exceeded') {
    return {
      outcome: deepFreeze({ kind: 'window_search_limit_exceeded', request: input.request }),
      diagnostics: buildDiagnostics(input, acc, 'window_search_limit_exceeded', undefined),
    }
  }
  if (step.kind === 'resolved') {
    return {
      outcome: deepFreeze(step.outcome),
      diagnostics: buildDiagnostics(input, acc, step.outcome.kind, step.identity),
    }
  }

  return {
    outcome: deepFreeze({ kind: 'window_exhausted', request: input.request }),
    diagnostics: buildDiagnostics(input, acc, 'window_exhausted', undefined),
  }
}
