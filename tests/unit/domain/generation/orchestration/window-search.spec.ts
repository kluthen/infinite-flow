import { describe, expect, it } from 'vitest'

import { makeGenerationSearchPolicy } from '@/domain/generation/orchestration/search-ledger'
import type { RankedRhythmCache } from '@/domain/generation/orchestration/candidate-ranking'
import {
  DEFAULT_WINDOW_SEARCH_DEPS,
  searchWindow,
  type WindowSearchDeps,
  type WindowSearchInput,
} from '@/domain/generation/orchestration/window-search'
import {
  makeTensionBindingDomain,
  planPitchPhrase,
  type BoundPitchPlannerInput,
  type PitchPlanResult,
} from '@/domain/pitch/pitch-planner'
import type { HarmonyCandidate } from '@/domain/harmony/harmony-types'
import type { RhythmCandidate } from '@/domain/rhythm/rhythm-types'
import {
  validateGenerationResult,
  type GenerationResultValidation,
} from '@/domain/validation/generation-result-validator'

import { buildWindowSearchFixture, type WindowSearchFixture } from './window-search-fixture'

/** One real triple identity, in nested (harmony, then rhythm, then binding) ranked-order. */
interface CallIdentity {
  readonly harmonyIndex: number
  readonly rhythmIndex: number
  readonly bindingIndex: number
}

/** Intent: enumerate the full nested ranked-order (harmony, rhythm, binding) triple sequence a
 * real search would visit, exactly mirroring production's nesting, for order assertions. */
function enumerateNestedOrder(fixture: WindowSearchFixture): readonly CallIdentity[] {
  const triples: CallIdentity[] = []
  fixture.rankedHarmony.forEach((harmony: HarmonyCandidate, harmonyIndex: number) => {
    fixture.rankedRhythm.candidates.forEach((rhythm: RhythmCandidate, rhythmIndex: number) => {
      const bindingResult = makeTensionBindingDomain(harmony, rhythm)
      if (bindingResult.kind !== 'tension_binding_domain') return
      for (const binding of bindingResult.bindings) {
        triples.push({ harmonyIndex, rhythmIndex, bindingIndex: binding.bindingIndex })
      }
    })
  })
  return triples
}

/** Intent: locate a candidate's ranked-array position by its stable identity string. */
function indexByIdentity<T extends { readonly identity: string }>(
  candidates: readonly T[],
  identity: string,
): number {
  return candidates.findIndex((candidate) => candidate.identity === identity)
}

/**
 * Intent: a realistic no-legal-plan stub that mirrors the pitch planner's own fuel contract: it
 * needs exactly `desiredFuel` units to conclusively determine no_legal_pitch_plan, and reports
 * search_limit_exceeded using up its entire grant when handed less than that.
 */
function makeExactFuelPlanPitch(desiredFuel: number): WindowSearchDeps['planPitch'] {
  return (boundInput: BoundPitchPlannerInput) => {
    const granted = boundInput.policy.searchFuel
    if (granted < desiredFuel) return { kind: 'search_limit_exceeded', fuelUsed: granted }
    return { kind: 'no_legal_pitch_plan', fuelUsed: desiredFuel }
  }
}

/** Intent: build a tiny, real (non-fabricated) two-rhythm-candidate domain for exhaustion tests. */
function tinyWindowSearchInput(fixture: WindowSearchFixture): WindowSearchInput {
  const rankedRhythm: RankedRhythmCache = {
    kind: 'ranked_rhythm_cache',
    grammarVersion: fixture.rankedRhythm.grammarVersion,
    domainSize: 2,
    candidates: fixture.rankedRhythm.candidates.slice(0, 2),
  }
  return {
    intent: fixture.intent,
    request: fixture.request,
    rankedHarmony: fixture.rankedHarmony.slice(0, 1),
    rankedRhythm,
    searchPolicy: fixture.searchPolicy,
  }
}

// @test-link [[service_generation_orchestration]]
// @test-link [[mechanic_pitch_search_policy]]
describe('searchWindow', () => {
  describe('real success', () => {
    it('finds a window_success outcome that independently re-validates and matches provenance', () => {
      const fixture = buildWindowSearchFixture()
      const report = searchWindow(fixture)

      expect(report.outcome.kind).toBe('window_success')
      if (report.outcome.kind !== 'window_success') return

      const revalidated = validateGenerationResult({
        intent: fixture.intent,
        request: fixture.request,
        result: report.outcome.result,
        provenance: report.outcome.provenance,
      })
      expect(revalidated.kind).toBe('valid_generation_result')
      expect(fixture.rankedHarmony).toContain(report.outcome.provenance.harmony)
      expect(fixture.rankedRhythm.candidates).toContain(report.outcome.provenance.rhythm)
      expect(report.outcome.request).toBe(fixture.request)

      expect(Object.isFrozen(report.outcome)).toBe(true)
      expect(Object.isFrozen(report.diagnostics)).toBe(true)
      expect(report.diagnostics.outcome).toBe('window_success')
      expect(report.diagnostics.pairsVisited).toBeGreaterThanOrEqual(1)
      expect(report.diagnostics.bindingsAttempted).toBeGreaterThanOrEqual(1)
      expect(report.diagnostics.fuelUsed).toBeGreaterThanOrEqual(1)
      expect(report.diagnostics.harmonyIdentity).toBe(report.outcome.provenance.harmony.identity)
      expect(report.diagnostics.rhythmIdentity).toBe(report.outcome.provenance.rhythm.identity)
      expect(report.diagnostics.bindingIdentity).toBe(
        report.outcome.provenance.tensionBinding.identity,
      )
    })
  })

  describe('determinism', () => {
    it('returns deep-equal outcome and diagnostics for the same input twice', () => {
      const fixture = buildWindowSearchFixture()
      const first = searchWindow(fixture)
      const second = searchWindow(fixture)
      expect(second.outcome).toEqual(first.outcome)
      expect(second.diagnostics).toEqual(first.diagnostics)
    })
  })

  describe('fallback order', () => {
    it('walks pairs and bindings in nested ranked order, falling through forced failures', () => {
      const fixture = buildWindowSearchFixture()
      const expectedOrder = enumerateNestedOrder(fixture)
      const forcedFailureCount = 3
      const calls: CallIdentity[] = []

      const planPitch: WindowSearchDeps['planPitch'] = (input: BoundPitchPlannerInput) => {
        calls.push({
          harmonyIndex: indexByIdentity(fixture.rankedHarmony, input.harmony.identity),
          rhythmIndex: indexByIdentity(fixture.rankedRhythm.candidates, input.rhythm.identity),
          bindingIndex: input.tensionBinding.bindingIndex,
        })
        if (calls.length <= forcedFailureCount) {
          const result: PitchPlanResult = { kind: 'no_legal_pitch_plan', fuelUsed: 1 }
          return result
        }
        return planPitchPhrase(input)
      }

      const report = searchWindow(fixture, { ...DEFAULT_WINDOW_SEARCH_DEPS, planPitch })

      expect(calls.length).toBeGreaterThan(forcedFailureCount)
      expect(calls.slice(0, forcedFailureCount)).toEqual(expectedOrder.slice(0, forcedFailureCount))
      expect(report.outcome.kind).toBe('window_success')
    })
  })

  describe('exhaustion', () => {
    it('reports window_exhausted when every real pair and binding is tried without success', () => {
      const fixture = buildWindowSearchFixture()
      const input = tinyWindowSearchInput(fixture)
      const planPitch = makeExactFuelPlanPitch(3)

      const report = searchWindow(input, { ...DEFAULT_WINDOW_SEARCH_DEPS, planPitch })

      expect(report.outcome).toEqual({ kind: 'window_exhausted', request: input.request })
      expect(report.diagnostics.bindingsAttempted).toBeGreaterThanOrEqual(1)
    })
  })

  describe('fuel boundary', () => {
    it('exhausts exactly at F and reports search_limit_exceeded at F-1', () => {
      const fixture = buildWindowSearchFixture()
      const input = tinyWindowSearchInput(fixture)
      const planPitch = makeExactFuelPlanPitch(3)
      const deps: WindowSearchDeps = { ...DEFAULT_WINDOW_SEARCH_DEPS, planPitch }

      const fullReport = searchWindow(input, deps)
      expect(fullReport.outcome.kind).toBe('window_exhausted')
      const totalFuel = fullReport.diagnostics.fuelUsed
      expect(totalFuel).toBeGreaterThan(0)

      const exactInput: WindowSearchInput = {
        ...input,
        searchPolicy: makeGenerationSearchPolicy(totalFuel),
      }
      const exactReport = searchWindow(exactInput, deps)
      expect(exactReport.outcome.kind).toBe('window_exhausted')

      const shortInput: WindowSearchInput = {
        ...input,
        searchPolicy: makeGenerationSearchPolicy(totalFuel - 1),
      }
      const shortReport = searchWindow(shortInput, deps)
      expect(shortReport.outcome.kind).toBe('window_search_limit_exceeded')
    })
  })

  describe('pitch-search fuel cutoff', () => {
    it('reports window_search_limit_exceeded when the pitch planner reports search_limit_exceeded', () => {
      const fixture = buildWindowSearchFixture()
      const planPitch: WindowSearchDeps['planPitch'] = () => ({
        kind: 'search_limit_exceeded',
        fuelUsed: 5,
      })
      const report = searchWindow(fixture, { ...DEFAULT_WINDOW_SEARCH_DEPS, planPitch })
      expect(report.outcome).toEqual({
        kind: 'window_search_limit_exceeded',
        request: fixture.request,
      })
    })
  })

  describe('pitch policy fuel handoff', () => {
    it('gives the pitch planner a searchFuel equal to the ledger fuel remaining after the pair/binding spend', () => {
      const fixture = buildWindowSearchFixture()
      let observedSearchFuel: number | undefined
      const planPitch: WindowSearchDeps['planPitch'] = (input: BoundPitchPlannerInput) => {
        if (observedSearchFuel === undefined) observedSearchFuel = input.policy.searchFuel
        return { kind: 'no_legal_pitch_plan', fuelUsed: 1 }
      }
      searchWindow(fixture, { ...DEFAULT_WINDOW_SEARCH_DEPS, planPitch })
      // One pair-visit unit and one binding-attempt unit are spent before the policy is built.
      expect(observedSearchFuel).toBe(fixture.searchPolicy.windowFuel - 2)
    })
  })

  describe('result validation failure', () => {
    it('reports window_result_validation_failed with the injected validator failure codes', () => {
      const fixture = buildWindowSearchFixture()
      const codes = ['pitch_rule_violation', 'tie_continuation_invalid'] as const
      const validateResult: WindowSearchDeps['validateResult'] = () => {
        const verdict: GenerationResultValidation = {
          kind: 'invalid_generation_result',
          failures: codes.map((code) => ({ code })),
        }
        return verdict
      }
      const report = searchWindow(fixture, { ...DEFAULT_WINDOW_SEARCH_DEPS, validateResult })

      expect(report.outcome.kind).toBe('window_result_validation_failed')
      if (report.outcome.kind !== 'window_result_validation_failed') return
      expect(report.outcome.failureCodes).toEqual(codes)
      expect(report.outcome.request).toBe(fixture.request)
    })
  })

  describe('diagnostics are not consulted', () => {
    it('keeps diagnostics as a frozen, separate value from the outcome', () => {
      const fixture = buildWindowSearchFixture()
      const report = searchWindow(fixture)
      expect(Object.isFrozen(report.outcome)).toBe(true)
      expect(Object.isFrozen(report.diagnostics)).toBe(true)
      expect(report.diagnostics).not.toBe(report.outcome)
      // Re-running under the same real deps produces the same outcome kind regardless of the
      // separately-tracked diagnostics counters, confirming diagnostics cannot feed back in.
      const again = searchWindow(fixture)
      expect(again.outcome.kind).toBe(report.outcome.kind)
    })
  })
})
