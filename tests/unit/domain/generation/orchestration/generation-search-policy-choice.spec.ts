/**
 * The search policy generation orchestration picks from the intent alone: every generation with
 * carry-in searches under the carry-in policy and its smaller allowance, every generation without
 * carry-in under the first release's policy, and only an explicit policy overrides that choice.
 */

import { describe, expect, it } from 'vitest'

import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type {
  GenerationOutcome,
  GenerationSearchPolicy,
  WindowDiagnostics,
} from '@/domain/generation/orchestration/orchestration-types'
import {
  GENERATION_SEARCH_POLICY_CARRY_IN_V1,
  GENERATION_SEARCH_POLICY_V1,
  makeGenerationSearchPolicy,
} from '@/domain/generation/orchestration/search-ledger'
import {
  buildIntent,
  carryInAfter,
  generateSuccess,
  type SuccessOutcome,
} from '../carry-in/carry-in-fixture'

/** Intent: a real phrase 2 intent carrying in from a real phrase 1, both on the base controls. */
function carryInIntent(): GenerationIntent {
  const first = buildIntent({ seed: 11, label: 'policy-choice' })
  const carryIn = carryInAfter(first, generateSuccess(first), 1)
  return buildIntent({ seed: 12, carryIn, label: 'policy-choice' })
}

/** Intent: each window's policy version and allowance, as its diagnostics record them. */
function windowPolicies(outcome: GenerationOutcome): readonly object[] {
  return outcome.diagnostics.windows.map(({ ledgerVersion, fuelAllowance }) => ({
    ledgerVersion,
    fuelAllowance,
  }))
}

/** Intent: a successful outcome, failing the test's assertion on any other kind. */
function success(outcome: GenerationOutcome): SuccessOutcome {
  expect(outcome.kind).toBe('generation_success')
  return outcome as SuccessOutcome
}

/** Intent: a carry-in search policy with the given allowance. */
function carryInPolicy(windowFuel: number): GenerationSearchPolicy {
  return makeGenerationSearchPolicy(windowFuel, 'generation-search-carry-in-v1')
}

/** Intent: the one window of a single-window outcome. */
function onlyWindow(outcome: GenerationOutcome): WindowDiagnostics {
  expect(outcome.diagnostics.windows).toHaveLength(1)
  return outcome.diagnostics.windows[0]!
}

// @test-link [[mechanic_pitch_search_policy]]
// @test-link [[service_generation_orchestration]]
describe('the search policy picked from the intent', () => {
  // @test-link [[mechanic_pitch_search_policy]]
  // @test-link [[service_generation_orchestration]]
  it('searches a carry-in intent under generation-search-carry-in-v1 with 160,000 units', () => {
    expect(GENERATION_SEARCH_POLICY_CARRY_IN_V1).toEqual({
      version: 'generation-search-carry-in-v1',
      windowFuel: 160_000,
    })
    const outcome = generatePhrase(carryInIntent())
    expect(windowPolicies(outcome)).toEqual([
      { ledgerVersion: 'generation-search-carry-in-v1', fuelAllowance: 160_000 },
    ])
  })

  // @test-link [[mechanic_pitch_search_policy]]
  // @test-link [[rule_no_carry_in_output_matches_v1]]
  it.each(['Middle', 'Varying'] as const)(
    'searches a %s intent without carry-in under generation-search-v1 with 250,000 units',
    (register) => {
      const intent = buildIntent({ controls: { register }, seed: 11, label: 'policy-choice' })
      const outcome = generatePhrase(intent)
      const v1 = { ledgerVersion: 'generation-search-v1', fuelAllowance: 250_000 }
      expect(windowPolicies(outcome)).toEqual(outcome.diagnostics.windows.map(() => v1))
      expect(outcome).toEqual(generatePhrase(intent, { searchPolicy: GENERATION_SEARCH_POLICY_V1 }))
    },
  )

  // @test-link [[mechanic_pitch_search_policy]]
  // @test-link [[service_generation_orchestration]]
  it('lets an explicit search policy override the choice, changing only the recorded policy', () => {
    const intent = carryInIntent()
    const picked = success(generatePhrase(intent))
    const explicit = success(generatePhrase(intent, { searchPolicy: GENERATION_SEARCH_POLICY_V1 }))
    expect(windowPolicies(explicit)).toEqual([
      { ledgerVersion: 'generation-search-v1', fuelAllowance: 250_000 },
    ])
    expect(explicit.request).toEqual(picked.request)
    expect(explicit.result).toEqual(picked.result)
    expect(explicit.provenance).toEqual(picked.provenance)
    expect(onlyWindow(explicit).fuelUsed).toBe(onlyWindow(picked).fuelUsed)
  })

  // @test-link [[mechanic_pitch_search_policy]]
  // @test-link [[rule_session_generation_failure_ladder]]
  it('stops a carry-in search that needs more than its allowance with search_limit_exceeded', () => {
    const intent = carryInIntent()
    const needed = onlyWindow(generatePhrase(intent)).fuelUsed
    expect(generatePhrase(intent, { searchPolicy: carryInPolicy(needed) }).kind).toBe(
      'generation_success',
    )
    const cut = generatePhrase(intent, { searchPolicy: carryInPolicy(needed - 1) })
    expect(cut).toMatchObject({ kind: 'generation_failure', code: 'search_limit_exceeded' })
    expect(onlyWindow(cut)).toMatchObject({
      outcome: 'window_search_limit_exceeded',
      ledgerVersion: 'generation-search-carry-in-v1',
      fuelAllowance: needed - 1,
    })
  })
})
