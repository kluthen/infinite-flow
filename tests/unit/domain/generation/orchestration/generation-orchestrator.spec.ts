import { describe, expect, it } from 'vitest'

import { makeGenerationSearchPolicy } from '@/domain/generation/orchestration/search-ledger'
import {
  DEFAULT_WINDOW_SEARCH_DEPS,
  type WindowSearchDeps,
} from '@/domain/generation/orchestration/window-search'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import {
  resolveCoreRequests,
  selectVaryingRegister,
} from '@/domain/generation/orchestration/request-resolution'
import {
  planPitchPhrase,
  type BoundPitchPlannerInput,
  type PitchPlanResult,
} from '@/domain/pitch/pitch-planner'
import {
  validateGenerationResult,
  type GenerationResultValidation,
} from '@/domain/validation/generation-result-validator'
import { CANONICAL_REGISTER_ORDER, type RegisterId } from '@/domain/profile/register-id'
import { makeSeed } from '@/domain/random/seed'

import { buildWindowSearchFixture } from './window-search-fixture'
import {
  buildOrchestratorIntent,
  computeRankedDomains,
  computeWindowOutcome,
} from './generation-orchestrator-fixture'

/** All 8 subsets of {Low, Middle, High}, in a fixed enumeration order. */
const REGISTER_SUBSETS: readonly (readonly RegisterId[])[] = [
  [],
  ['Low'],
  ['Middle'],
  ['High'],
  ['Low', 'Middle'],
  ['Low', 'High'],
  ['Middle', 'High'],
  ['Low', 'Middle', 'High'],
]

/** Intent: a planPitch dep that delegates to the real planner only for registers in `subset`. */
function makeSubsetPlanPitch(subset: readonly RegisterId[]): WindowSearchDeps['planPitch'] {
  return (input: BoundPitchPlannerInput): PitchPlanResult => {
    if (subset.includes(input.request.register)) return planPitchPhrase(input)
    return { kind: 'no_legal_pitch_plan', fuelUsed: 0 }
  }
}

/**
 * The six `Strict`-level unsupported rhythm-grammar control combinations (ISS-004 feasibility
 * review §4), by their exact catalog literal names.
 */
const UNSUPPORTED_RHYTHM_COMBOS = [
  { noteDensity: 'Quarter', silenceDensity: 'Sparse', syncopation: 'Active displacement' },
  { noteDensity: 'Quarter', silenceDensity: 'Breath-heavy', syncopation: 'Active displacement' },
  { noteDensity: 'Sixteenth', silenceDensity: 'Sparse', syncopation: 'Active displacement' },
  {
    noteDensity: 'Sixteenth',
    silenceDensity: 'Conversational',
    syncopation: 'Active displacement',
  },
  { noteDensity: 'Sixteenth', silenceDensity: 'Breath-heavy', syncopation: 'Occasional offbeats' },
  { noteDensity: 'Sixteenth', silenceDensity: 'Breath-heavy', syncopation: 'Active displacement' },
] as const

const TENSION_ARCS = ['Settled', 'Lift', 'Build', 'Edge'] as const

describe('generatePhrase', () => {
  // @test-link [[service_generation_orchestration]]
  describe('fixed register success', () => {
    it('succeeds with real deps, matching the resolved core request and re-validating independently', () => {
      const fixture = buildWindowSearchFixture()
      const outcome = generatePhrase(fixture.intent)

      expect(outcome.kind).toBe('generation_success')
      if (outcome.kind !== 'generation_success') return

      expect(outcome.request.register).toBe('Middle')
      expect(outcome.request).toEqual(resolveCoreRequests(fixture.intent)[0])
      expect(outcome.result.requestId).toBe(outcome.request.requestId)
      expect(outcome.result.seed).toBe(outcome.request.seed)

      const revalidated = validateGenerationResult({
        intent: fixture.intent,
        request: outcome.request,
        result: outcome.result,
        provenance: outcome.provenance,
      })
      expect(revalidated.kind).toBe('valid_generation_result')
    })
  })

  // @test-link [[service_generation_orchestration]]
  describe('determinism', () => {
    it('returns a deep-equal outcome (including diagnostics) for the same intent and seed twice', () => {
      const fixture = buildWindowSearchFixture()
      const first = generatePhrase(fixture.intent)
      const second = generatePhrase(fixture.intent)
      expect(second).toEqual(first)
    })
  })

  // @test-link [[service_generation_orchestration]]
  describe('Varying register selection', () => {
    for (const subset of REGISTER_SUBSETS) {
      const label = subset.length === 0 ? '(none)' : subset.join('+')
      it(`resolves successful subset ${label} to the documented outcome`, () => {
        const intent = buildOrchestratorIntent('Varying')
        const deps: WindowSearchDeps = {
          ...DEFAULT_WINDOW_SEARCH_DEPS,
          planPitch: makeSubsetPlanPitch(subset),
        }
        const outcome = generatePhrase(intent, { deps })

        if (subset.length === 0) {
          expect(outcome.kind).toBe('generation_failure')
          if (outcome.kind !== 'generation_failure') return
          expect(outcome.code).toBe('no_eligible_register_window')
          return
        }

        expect(outcome.kind).toBe('generation_success')
        if (outcome.kind !== 'generation_success') return

        const canonicalSubset = CANONICAL_REGISTER_ORDER.filter((id) => subset.includes(id))
        expect(subset.includes(outcome.request.register)).toBe(true)
        expect(outcome.request.register).toBe(selectVaryingRegister(intent, subset))
        expect(outcome.diagnostics.successfulRegisters).toEqual(canonicalSubset)
        expect(outcome.diagnostics.windows).toHaveLength(3)
        expect(outcome.diagnostics.selectedRegister).toBe(outcome.request.register)

        const expectedWindowOutcome = computeWindowOutcome(intent, outcome.request.register, deps)
        expect(expectedWindowOutcome.kind).toBe('window_success')
        if (expectedWindowOutcome.kind !== 'window_success') return
        expect(outcome.result).toEqual(expectedWindowOutcome.result)
      })
    }
  })

  describe('seed sensitivity', () => {
    it('selects more than one distinct register across a small deterministic seed list', () => {
      const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => makeSeed(value))
      const selected = new Set<RegisterId>()
      for (const seed of seeds) {
        const intent = buildOrchestratorIntent('Varying', seed)
        const outcome = generatePhrase(intent)
        expect(outcome.kind).toBe('generation_success')
        if (outcome.kind !== 'generation_success') continue
        selected.add(outcome.request.register)
      }
      expect(selected.size).toBeGreaterThanOrEqual(2)
    })
  })

  // @test-link [[mechanic_pitch_search_policy]]
  describe('search limit precedence', () => {
    it('reports search_limit_exceeded when one Varying window hits a pitch-search cutoff while others succeed', () => {
      const intent = buildOrchestratorIntent('Varying')
      const planPitch: WindowSearchDeps['planPitch'] = (input) => {
        if (input.request.register === 'Low') return { kind: 'search_limit_exceeded', fuelUsed: 1 }
        return planPitchPhrase(input)
      }
      const outcome = generatePhrase(intent, { deps: { ...DEFAULT_WINDOW_SEARCH_DEPS, planPitch } })
      expect(outcome.kind).toBe('generation_failure')
      if (outcome.kind !== 'generation_failure') return
      expect(outcome.code).toBe('search_limit_exceeded')
      expect(outcome.diagnostics.windows).toHaveLength(3)
      expect(outcome.diagnostics.successfulRegisters).toEqual([])
    })

    it('reports search_limit_exceeded from a real tiny windowFuel policy', () => {
      const intent = buildOrchestratorIntent('Varying')
      const outcome = generatePhrase(intent, { searchPolicy: makeGenerationSearchPolicy(1) })
      expect(outcome.kind).toBe('generation_failure')
      if (outcome.kind !== 'generation_failure') return
      expect(outcome.code).toBe('search_limit_exceeded')
    })
  })

  // @test-link [[service_generation_orchestration]]
  describe('validation failure precedence', () => {
    it('reports result_validation_failed even when another window is limit-exceeded', () => {
      const intent = buildOrchestratorIntent('Varying')
      const planPitch: WindowSearchDeps['planPitch'] = (input) => {
        if (input.request.register === 'High') return { kind: 'search_limit_exceeded', fuelUsed: 1 }
        return planPitchPhrase(input)
      }
      const validateResult: WindowSearchDeps['validateResult'] = (input) => {
        if (input.request.register === 'Low') {
          const verdict: GenerationResultValidation = {
            kind: 'invalid_generation_result',
            failures: [{ code: 'pitch_rule_violation' }],
          }
          return verdict
        }
        return validateGenerationResult(input)
      }
      const outcome = generatePhrase(intent, {
        deps: { ...DEFAULT_WINDOW_SEARCH_DEPS, planPitch, validateResult },
      })
      expect(outcome.kind).toBe('generation_failure')
      if (outcome.kind !== 'generation_failure') return
      expect(outcome.code).toBe('result_validation_failed')
    })
  })

  describe('fixed register no plan', () => {
    it('reports no_legal_pitch_plan when the pitch planner never finds a plan', () => {
      const fixture = buildWindowSearchFixture()
      const planPitch: WindowSearchDeps['planPitch'] = () => ({
        kind: 'no_legal_pitch_plan',
        fuelUsed: 1,
      })
      const outcome = generatePhrase(fixture.intent, {
        deps: { ...DEFAULT_WINDOW_SEARCH_DEPS, planPitch },
      })
      expect(outcome.kind).toBe('generation_failure')
      if (outcome.kind !== 'generation_failure') return
      expect(outcome.code).toBe('no_legal_pitch_plan')
      expect(outcome.diagnostics.harmonyDomainSize).toBeGreaterThan(0)
      expect(outcome.diagnostics.rhythmDomainSize).toBeGreaterThan(0)
    })
  })

  // @test-link [[rule_unsupported_rhythm_settings_block_generation]]
  describe('unsupported rhythm settings block generation', () => {
    it('reports no_legal_rhythm_plan for a fixed intent across all 24 unsupported combinations', () => {
      for (const combo of UNSUPPORTED_RHYTHM_COMBOS) {
        for (const tension of TENSION_ARCS) {
          const intent = buildOrchestratorIntent('Middle', makeSeed(11), {
            noteDensity: combo.noteDensity,
            rhythmicVariety: 'Strict',
            silenceDensity: combo.silenceDensity,
            syncopation: combo.syncopation,
            tension,
          })
          const outcome = generatePhrase(intent)
          expect(outcome.kind).toBe('generation_failure')
          if (outcome.kind !== 'generation_failure') continue
          expect(outcome.code).toBe('no_legal_rhythm_plan')
          expect(outcome.diagnostics.harmonyDomainSize).toBeGreaterThan(0)
          expect(outcome.diagnostics.rhythmDomainSize).toBe(0)
        }
      }
    }, 60_000)

    it('reports no_legal_rhythm_plan for a Varying intent too', () => {
      const combo = UNSUPPORTED_RHYTHM_COMBOS[0]
      const intent = buildOrchestratorIntent('Varying', makeSeed(11), {
        noteDensity: combo.noteDensity,
        rhythmicVariety: 'Strict',
        silenceDensity: combo.silenceDensity,
        syncopation: combo.syncopation,
        tension: 'Settled',
      })
      const outcome = generatePhrase(intent)
      expect(outcome.kind).toBe('generation_failure')
      if (outcome.kind !== 'generation_failure') return
      expect(outcome.code).toBe('no_legal_rhythm_plan')
    })
  })

  // @test-link [[entity_generation_diagnostics]]
  describe('diagnostics', () => {
    it('is deep-frozen and never changes which result/request/provenance is returned', () => {
      const fixture = buildWindowSearchFixture()
      const smallPolicyOutcome = generatePhrase(fixture.intent, {
        searchPolicy: makeGenerationSearchPolicy(100_000),
      })
      const bigPolicyOutcome = generatePhrase(fixture.intent)

      expect(smallPolicyOutcome.kind).toBe('generation_success')
      expect(bigPolicyOutcome.kind).toBe('generation_success')
      if (smallPolicyOutcome.kind !== 'generation_success') return
      if (bigPolicyOutcome.kind !== 'generation_success') return

      expect(Object.isFrozen(smallPolicyOutcome.diagnostics)).toBe(true)
      expect(Object.isFrozen(smallPolicyOutcome.diagnostics.windows)).toBe(true)
      expect(Object.isFrozen(smallPolicyOutcome.diagnostics.windows[0])).toBe(true)
      expect(Object.isFrozen(smallPolicyOutcome)).toBe(true)

      expect(smallPolicyOutcome.result).toEqual(bigPolicyOutcome.result)
      expect(smallPolicyOutcome.request).toEqual(bigPolicyOutcome.request)
      expect(smallPolicyOutcome.provenance).toEqual(bigPolicyOutcome.provenance)
      expect(smallPolicyOutcome.diagnostics.windows[0]!.fuelAllowance).not.toBe(
        bigPolicyOutcome.diagnostics.windows[0]!.fuelAllowance,
      )
    })
  })

  describe('stable fallback order', () => {
    it('walks harmony x rhythm x binding in ranked order and repeats the same sequence on a second run', () => {
      const fixture = buildWindowSearchFixture()
      const { rankedHarmony, rankedRhythm } = computeRankedDomains(fixture.intent)
      const forcedFailureCount = 3

      function runWithCounter(): readonly {
        readonly harmonyIndex: number
        readonly rhythmIndex: number
        readonly bindingIndex: number
      }[] {
        const calls: {
          readonly harmonyIndex: number
          readonly rhythmIndex: number
          readonly bindingIndex: number
        }[] = []
        let callCount = 0
        const planPitch: WindowSearchDeps['planPitch'] = (input: BoundPitchPlannerInput) => {
          callCount += 1
          calls.push({
            harmonyIndex: rankedHarmony.findIndex(
              (candidate) => candidate.identity === input.harmony.identity,
            ),
            rhythmIndex: rankedRhythm.candidates.findIndex(
              (candidate) => candidate.identity === input.rhythm.identity,
            ),
            bindingIndex: input.tensionBinding.bindingIndex,
          })
          if (callCount <= forcedFailureCount) {
            const result: PitchPlanResult = { kind: 'no_legal_pitch_plan', fuelUsed: 1 }
            return result
          }
          return planPitchPhrase(input)
        }
        const outcome = generatePhrase(fixture.intent, {
          deps: { ...DEFAULT_WINDOW_SEARCH_DEPS, planPitch },
        })
        expect(outcome.kind).toBe('generation_success')
        return calls
      }

      const firstRun = runWithCounter()
      const secondRun = runWithCounter()

      expect(firstRun.length).toBeGreaterThan(forcedFailureCount)
      expect(firstRun.slice(0, forcedFailureCount).every((call) => call.harmonyIndex >= 0)).toBe(
        true,
      )
      expect(secondRun).toEqual(firstRun)
    })
  })
})
