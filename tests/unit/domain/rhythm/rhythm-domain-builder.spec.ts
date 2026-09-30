// @vitest-environment node
/**
 * The stepped rhythm-domain builder: one step is at most one gesture unit (one gesture with all its
 * answer lists and templates, in canonical order). A setting with G gestures (skipped ones
 * included) completes in G + 1 steps, one per gesture unit plus the step that ends the pass; a
 * no-plan setting completes in 2 (G + 1) steps, its fast pass then its exact re-run, each stepped
 * the same way. Its result is exactly what `makeRhythmCandidateDomain` plus a full drain of its
 * first replay produce: the same candidate list, or the same typed no-plan result.
 */

import { describe, expect, it } from 'vitest'

import {
  createRhythmDomainBuilder,
  isNoLegalRhythmPlan,
  makeRhythmCandidateDomain,
  normalizeRhythmExpansionInput,
  type RhythmDomainBuilder,
} from '@/domain/rhythm/rhythm-planner'
import { enumerateGestureDerivations } from '@/domain/rhythm/rhythm-skeleton'
import type { RhythmExpansionInput } from '@/domain/rhythm/rhythm-types'

/** Settings with a domain: small, mid-size, and the one with the longest single gesture unit. */
const DOMAIN_KEYS: readonly string[] = [
  'Quarter|Strict|Sparse|Straight|Settled',
  'Eighth|Slightly varied|Conversational|Occasional offbeats|Lift',
  'Quarter|Heavily varied|Sparse|Active displacement|Build',
]

/** No-plan settings: the memo-ranking golden's one, and the slowest to build. */
const NO_PLAN_KEYS: readonly string[] = [
  'Quarter|Strict|Sparse|Active displacement|Settled',
  'Sixteenth|Slightly varied|Breath-heavy|Active displacement|Settled',
]

/** The expansion input of a `density|variety|silence|syncopation|tension` key. */
function inputOf(key: string): RhythmExpansionInput {
  const [noteDensity, rhythmicVariety, silenceDensity, syncopation, tensionArc] = key.split('|')
  return {
    noteDensity,
    rhythmicVariety,
    silenceDensity,
    syncopation,
    tensionArc,
  } as RhythmExpansionInput
}

/** Intent: the number of gestures a setting's derivation visits, skipped ones included. */
function gestureCount(input: RhythmExpansionInput): number {
  return [...enumerateGestureDerivations(normalizeRhythmExpansionInput(input))].length
}

/** Intent: step a builder until it completes; the number of steps run. */
function buildToEnd(builder: RhythmDomainBuilder): number {
  let steps = 1
  while (!builder.step()) steps += 1
  return steps
}

/** Intent: run a fresh builder of one setting to completion; its step count and result. */
function buildStepped(input: RhythmExpansionInput) {
  const builder = createRhythmDomainBuilder(input)
  const steps = buildToEnd(builder)
  return { steps, result: builder.result() }
}

// @test-link [[api_rhythm_domain_expansion]]
describe('stepped rhythm domain builder', () => {
  it.each(DOMAIN_KEYS)('%s: one step per gesture unit, same list as a full drain', (key) => {
    const input = inputOf(key)
    const { steps, result } = buildStepped(input)
    expect(steps).toBe(gestureCount(input) + 1)
    const reference = makeRhythmCandidateDomain(input)
    if (isNoLegalRhythmPlan(reference)) throw new Error(`Expected a domain for ${key}.`)
    expect(result.kind).toBe('rhythm_candidate_list')
    if (isNoLegalRhythmPlan(result)) throw new Error(`Expected a candidate list for ${key}.`)
    expect(result.input).toEqual(reference.input)
    expect(result.candidates).toEqual([...reference.candidates()])
    expect(result.candidates.every((candidate) => Object.isFrozen(candidate))).toBe(true)
  })

  it.each(NO_PLAN_KEYS)('%s: fast pass then exact re-run, same typed no-plan result', (key) => {
    const input = inputOf(key)
    const { steps, result } = buildStepped(input)
    expect(steps).toBe(2 * (gestureCount(input) + 1))
    const reference = makeRhythmCandidateDomain(input)
    expect(isNoLegalRhythmPlan(reference)).toBe(true)
    expect(result).toEqual(reference)
    expect(Object.isFrozen(result)).toBe(true)
  })

  it('refuses a result before completion, and does nothing once complete', () => {
    const builder = createRhythmDomainBuilder(inputOf(DOMAIN_KEYS[1]!))
    expect(builder.step()).toBe(false)
    expect(() => builder.result()).toThrow(/not complete/)
    buildToEnd(builder)
    const result = builder.result()
    expect(builder.step()).toBe(true)
    expect(builder.result()).toBe(result)
  })

  it('rejects an invalid input when created', () => {
    expect(() =>
      createRhythmDomainBuilder({
        ...inputOf(DOMAIN_KEYS[0]!),
        noteDensity: 'invalid' as unknown as 'Eighth',
      }),
    ).toThrow('invalid_rhythm_planner_input')
  })
})
