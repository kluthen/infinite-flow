/**
 * Unit coverage for the Step 9 canonical-rhythm-domain memo in isolation: cache-hit vs cache-miss
 * outcome equality, identity of the returned frozen instance on a hit, distinct memo keys for
 * distinct tension arcs, memoization of the typed no-plan result, `size()` growing only on a miss,
 * and that the memo's materialized candidate order matches `materializeRankedRhythmCache(
 * makeRhythmCandidateDomain(...), seed)`'s ranked order for a seed; a build step that throws (in a
 * prewarm slice, or in a lookup finishing the pending job) stores nothing, fails the job for good
 * and frees the pending slot; and `discardPendingBuild` cancels the unfinished job.
 */

import { describe, expect, it } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import {
  createCanonicalRhythmDomainMemo,
  type CanonicalRhythmDomain,
  type CanonicalRhythmDomainBuildJob,
  type RhythmDomainBuilderFactory,
} from '@/domain/generation/orchestration/canonical-rhythm-domain'
import {
  materializeRankedRhythmCache,
  rankMaterializedRhythmCandidates,
} from '@/domain/generation/orchestration/candidate-ranking'
import { fnv1a32 } from '@/domain/random/hash32'
import { makeSeed } from '@/domain/random/seed'
import {
  createRhythmDomainBuilder,
  makeRhythmCandidateDomain,
} from '@/domain/rhythm/rhythm-planner'
import type { RhythmExpansionInput } from '@/domain/rhythm/rhythm-types'

const CHEAP_RHYTHM_INPUT: RhythmExpansionInput = {
  noteDensity: 'Quarter',
  rhythmicVariety: 'Slightly varied',
  silenceDensity: 'Sparse',
  syncopation: 'Straight',
  tensionArc: 'Settled',
}

const CHEAP_CONTROLS = {
  tempo: 90,
  tonalCenter: 'C' as const,
  collection: 'Major' as const,
  harmonicMotion: 'Gentle diatonic' as const,
  tension: 'Settled' as const,
  noteDensity: 'Quarter' as const,
  rhythmicVariety: 'Slightly varied' as const,
  syncopation: 'Straight' as const,
  silenceDensity: 'Sparse' as const,
  contour: 'Arch' as const,
  register: 'Middle' as const,
  leapiness: 'Shaped' as const,
  arpeggioChaos: 'Predictable' as const,
  instrumentProfileId: 'c-keyboard' as const,
}

/** Intent: build a real, cheap-to-search GenerationIntent for one seed against CHEAP_CONTROLS. */
function buildCheapIntent(seed: number) {
  return createGenerationIntent({
    requestId: makeRequestId(`canonical-rhythm-domain-fixture-${seed}`),
    seed: makeSeed(seed),
    controls: makeGenerationControls(CHEAP_CONTROLS),
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
  })
}

/** Intent: assert a value is the materialized-domain branch, not the no-plan branch. */
function expectDomain(
  domain: CanonicalRhythmDomain,
): Extract<CanonicalRhythmDomain, { kind: 'canonical_rhythm_domain' }> {
  if (domain.kind !== 'canonical_rhythm_domain') throw new Error('Expected a materialized domain.')
  return domain
}

// @test-link [[api_rhythm_domain_expansion]]
describe('canonical rhythm domain memo', () => {
  it('returns the exact same frozen instance on a memo hit', () => {
    const memo = createCanonicalRhythmDomainMemo()
    const first = memo.lookup(CHEAP_RHYTHM_INPUT)
    const second = memo.lookup(CHEAP_RHYTHM_INPUT)
    expect(second).toBe(first)
  })

  it('grows size() only on a miss, not on a repeated hit', () => {
    const memo = createCanonicalRhythmDomainMemo()
    expect(memo.size()).toBe(0)
    memo.lookup(CHEAP_RHYTHM_INPUT)
    expect(memo.size()).toBe(1)
    memo.lookup(CHEAP_RHYTHM_INPUT)
    expect(memo.size()).toBe(1)
    memo.lookup({ ...CHEAP_RHYTHM_INPUT, tensionArc: 'Build' })
    expect(memo.size()).toBe(2)
  })

  it('keys different tension arcs as different memo entries', () => {
    const memo = createCanonicalRhythmDomainMemo()
    const settled = expectDomain(memo.lookup(CHEAP_RHYTHM_INPUT))
    const build = expectDomain(memo.lookup({ ...CHEAP_RHYTHM_INPUT, tensionArc: 'Build' }))
    expect(build).not.toBe(settled)
    expect(build.input.tensionArc).toBe('Build')
    expect(settled.input.tensionArc).toBe('Settled')
  })

  it('memoizes a no_legal_rhythm_plan result too, returning the same frozen instance on a hit', () => {
    const unsupported: RhythmExpansionInput = {
      noteDensity: 'Quarter',
      rhythmicVariety: 'Strict',
      silenceDensity: 'Sparse',
      syncopation: 'Active displacement',
      tensionArc: 'Settled',
    }
    const memo = createCanonicalRhythmDomainMemo()
    const first = memo.lookup(unsupported)
    expect(first.kind).toBe('no_legal_rhythm_plan')
    const second = memo.lookup(unsupported)
    expect(second).toBe(first)
    expect(memo.size()).toBe(1)
  })

  it('materializes candidates in the same canonical order makeRhythmCandidateDomain iterates', () => {
    const memo = createCanonicalRhythmDomainMemo()
    const domain = expectDomain(memo.lookup(CHEAP_RHYTHM_INPUT))

    const freshDomainResult = makeRhythmCandidateDomain(CHEAP_RHYTHM_INPUT)
    if (freshDomainResult.kind !== 'rhythm_candidate_domain')
      throw new Error('Fixture setup: no legal rhythm plan.')
    const expectedIdentities = [...freshDomainResult.candidates()].map(
      (candidate) => candidate.identity,
    )
    expect(domain.candidates.map((candidate) => candidate.identity)).toEqual(expectedIdentities)
  })

  it('ranks a memoized domain for a seed identically to materializeRankedRhythmCache', () => {
    const seed = makeSeed(42)
    const memo = createCanonicalRhythmDomainMemo()
    const domain = expectDomain(memo.lookup(CHEAP_RHYTHM_INPUT))

    const freshDomainResult = makeRhythmCandidateDomain(CHEAP_RHYTHM_INPUT)
    if (freshDomainResult.kind !== 'rhythm_candidate_domain')
      throw new Error('Fixture setup: no legal rhythm plan.')
    const expected = materializeRankedRhythmCache(freshDomainResult, seed)

    const actual = rankMaterializedRhythmCandidates(domain.grammarVersion, domain.candidates, seed)

    expect(actual.candidates.map((candidate) => candidate.identity)).toEqual(
      expected.candidates.map((candidate) => candidate.identity),
    )
  })

  it('produces the exact same generatePhrase outcome on a cache miss vs a cache hit', () => {
    const seed = 11
    const missMemo = createCanonicalRhythmDomainMemo()
    const missOutcome = generatePhrase(buildCheapIntent(seed), { rhythmDomainMemo: missMemo })

    const hitMemo = createCanonicalRhythmDomainMemo()
    hitMemo.lookup(CHEAP_RHYTHM_INPUT) // pre-populate so the real call is a cache hit
    const hitOutcome = generatePhrase(buildCheapIntent(seed), { rhythmDomainMemo: hitMemo })

    expect(fnv1a32(JSON.stringify(hitOutcome))).toBe(fnv1a32(JSON.stringify(missOutcome)))
    expect(hitOutcome).toEqual(missOutcome)
  })
})

/**
 * Intent: a builder factory whose first builder is the real one but throws on its `failAtStep`-th
 * step, like a grammar failing partway; every later builder is the untouched real one.
 */
function failingFirstBuilder(failAtStep: number): RhythmDomainBuilderFactory {
  let builds = 0
  return (input) => {
    builds += 1
    const real = createRhythmDomainBuilder(input)
    if (builds > 1) return real
    let steps = 0
    return {
      step: () => {
        steps += 1
        if (steps === failAtStep) throw new Error('grammar failed partway')
        return real.step()
      },
      result: real.result,
    }
  }
}

/** Intent: the job a memo began, failing when it began none. */
function begun(job: CanonicalRhythmDomainBuildJob | undefined): CanonicalRhythmDomainBuildJob {
  if (job === undefined) throw new Error('Expected a build job.')
  return job
}

// @test-link [[api_rhythm_domain_expansion]]
// @test-link [[entity_rhythm_candidate_domain]]
describe('canonical rhythm domain memo: failing builds and discarded jobs', () => {
  const expected = createCanonicalRhythmDomainMemo().lookup(CHEAP_RHYTHM_INPUT)

  it('a prewarm slice whose step throws rethrows, stores nothing and frees the pending slot', () => {
    const memo = createCanonicalRhythmDomainMemo(failingFirstBuilder(2))
    const job = begun(memo.beginBuild(CHEAP_RHYTHM_INPUT))
    expect(() => job.runSlice(() => false)).toThrow('grammar failed partway')
    expect(memo.size()).toBe(0)
    expect(() => job.runSlice(() => false)).toThrow(/failed; it cannot resume/)
    job.cancel()
    expect(() => job.runSlice(() => false)).toThrow(/failed; it cannot resume/)
    const retry = begun(memo.beginBuild(CHEAP_RHYTHM_INPUT))
    expect(retry).not.toBe(job)
    expect(retry.runSlice(() => false)).toBe(true)
    expect(memo.lookup(CHEAP_RHYTHM_INPUT)).toEqual(expected)
    expect(memo.size()).toBe(1)
  })

  it('a lookup finishing a pending job whose step throws rethrows and stores nothing', () => {
    const memo = createCanonicalRhythmDomainMemo(failingFirstBuilder(2))
    const job = begun(memo.beginBuild(CHEAP_RHYTHM_INPUT))
    expect(job.runSlice(() => true)).toBe(false)
    expect(() => memo.lookup(CHEAP_RHYTHM_INPUT)).toThrow('grammar failed partway')
    expect(memo.size()).toBe(0)
    expect(() => job.runSlice(() => false)).toThrow(/failed; it cannot resume/)
    expect(memo.lookup(CHEAP_RHYTHM_INPUT)).toEqual(expected)
    expect(memo.size()).toBe(1)
  })

  it('discardPendingBuild cancels the unfinished job and is a no-op without one', () => {
    const memo = createCanonicalRhythmDomainMemo()
    memo.discardPendingBuild()
    const job = begun(memo.beginBuild(CHEAP_RHYTHM_INPUT))
    expect(job.runSlice(() => true)).toBe(false)
    memo.discardPendingBuild()
    expect(() => job.runSlice(() => false)).toThrow(/cancelled/)
    expect(memo.size()).toBe(0)
    expect(memo.beginBuild(CHEAP_RHYTHM_INPUT)).not.toBe(job)
  })

  it('discardPendingBuild leaves a completed entry memoized', () => {
    const memo = createCanonicalRhythmDomainMemo()
    const job = begun(memo.beginBuild(CHEAP_RHYTHM_INPUT))
    expect(job.runSlice(() => false)).toBe(true)
    memo.discardPendingBuild()
    expect(memo.size()).toBe(1)
    expect(memo.beginBuild(CHEAP_RHYTHM_INPUT)).toBeUndefined()
  })
})
