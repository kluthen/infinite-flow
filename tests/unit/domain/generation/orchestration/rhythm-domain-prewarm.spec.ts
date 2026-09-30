// @vitest-environment node
/**
 * The rhythm-domain prewarm's build jobs: a memo filled by a job run in yielding slices (after
 * every step, and after every 7 steps) stores the exact canonical candidate list and seeded ranked
 * orders of the checked-in memo-ranking golden for its ten sampled settings; a lookup mid-job
 * finishes the job; a cancelled job writes nothing and refuses to run again; `beginBuild` returns
 * nothing for a memoized setting, the same job for the same setting, and cancels an unfinished job
 * of another setting; a prewarm whose harmony has no plan discards the unfinished job; one job step is one gesture unit of the planner's stepped build (G + 1 steps
 * for a setting with G gestures, 2 (G + 1) for a no-plan one, whose exact re-run is stepped too);
 * and generation on a prewarmed memo reproduces the catalog golden. The golden files are read only,
 * never regenerated.
 */

import { describe, expect, it } from 'vitest'

import {
  createCanonicalRhythmDomainMemo,
  type CanonicalRhythmDomainBuildJob,
  type CanonicalRhythmDomainMemo,
} from '@/domain/generation/orchestration/canonical-rhythm-domain'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { beginRhythmDomainPrewarm } from '@/domain/generation/orchestration/rhythm-domain-prewarm'
import {
  makeRhythmCandidateDomain,
  normalizeRhythmExpansionInput,
} from '@/domain/rhythm/rhythm-planner'
import type { NoLegalHarmonyPlan } from '@/domain/harmony/harmony-types'
import { enumerateGestureDerivations } from '@/domain/rhythm/rhythm-skeleton'
import {
  buildCatalogIntent,
  domainFacts,
  jsonHash,
  MEMO_SETTING_KEYS,
  parseSettingKey,
  rankingFacts,
  readGolden,
  WORST_SETTING_KEYS,
  type CatalogGolden,
  type MemoGolden,
  type RhythmSetting,
} from './cold-generation-golden/cold-generation-golden-fixture'

const MEMO_GOLDEN = readGolden<MemoGolden>('memo-ranking.golden.v1.json')
const CATALOG_GOLDEN = readGolden<CatalogGolden>('catalog.golden.v1.json')

/** Per-setting timeout: the worst settings enumerate thousands of candidates cold. */
const SETTING_TIMEOUT_MS = 180_000

/** A candidate count above which a yielding build certainly takes more than one slice. */
const LARGE_DOMAIN = 100

/** A mid-size setting (hundreds of candidates) for the job lifecycle cases. */
const MID_KEY = 'Eighth|Slightly varied|Conversational|Occasional offbeats|Lift'
/** A second, small setting, distinct from MID_KEY. */
const SMALL_KEY = 'Quarter|Strict|Sparse|Straight|Settled'
/** The memo-ranking golden's no-plan setting. */
const NO_PLAN_KEY = 'Quarter|Strict|Sparse|Active displacement|Settled'

/** Intent: a `shouldYield` that answers true after every `steps` calls, counting from creation. */
function yieldEvery(steps: number): () => boolean {
  let calls = 0
  return () => {
    calls += 1
    return calls % steps === 0
  }
}

/** Intent: run a job's slices with one `shouldYield` until it completes; the slice count. */
function runToCompletion(job: CanonicalRhythmDomainBuildJob, shouldYield: () => boolean): number {
  let slices = 1
  while (!job.runSlice(shouldYield)) slices += 1
  return slices
}

/** Intent: begin the prewarm job of one setting's catalog intent, failing if none is begun. */
function beginPrewarm(setting: RhythmSetting, memo: CanonicalRhythmDomainMemo) {
  const job = beginRhythmDomainPrewarm(buildCatalogIntent(setting, 1), memo)
  if (job === undefined) throw new Error('Expected a prewarm job.')
  return job
}

/** Intent: a harmony-domain seam answering the typed no-plan result for any intent. */
function noHarmonyPlan(intent: GenerationIntent): NoLegalHarmonyPlan {
  const { tonalCenter, collection, harmonicMotion, tension } = intent.controls
  return {
    kind: 'no_legal_harmony_plan',
    input: {
      tonalCenter,
      collection,
      harmonicMotion,
      tensionArc: tension,
      profile: intent.musicalProfile.musicalProfile,
    },
  }
}

/** Intent: the golden memo-list and ranking facts of one sampled setting. */
function goldenFacts(key: string) {
  const { kind, count, candidatesHash, rankings } = MEMO_GOLDEN.settings[key]!
  return { facts: { kind, count, candidatesHash }, rankings }
}

// @test-link [[module_generation_worker_protocol]]
// @test-link [[entity_rhythm_candidate_domain]]
describe('rhythm domain prewarm: sliced builds match the memo-ranking golden', () => {
  it.each(
    MEMO_SETTING_KEYS.flatMap((key) => [
      { key, steps: 1 },
      { key, steps: 7 },
    ]),
  )(
    '$key, yielding after every $steps step(s)',
    ({ key, steps }) => {
      const memo = createCanonicalRhythmDomainMemo()
      const job = beginPrewarm(parseSettingKey(key), memo)
      const slices = runToCompletion(job, yieldEvery(steps))
      const golden = goldenFacts(key)
      if (golden.facts.count >= LARGE_DOMAIN) expect(slices).toBeGreaterThan(1)
      expect(memo.size()).toBe(1)
      const domain = memo.lookup(parseSettingKey(key))
      expect(domainFacts(domain)).toEqual(golden.facts)
      expect(rankingFacts(domain)).toEqual(golden.rankings)
    },
    SETTING_TIMEOUT_MS,
  )
})

// @test-link [[module_generation_worker_protocol]]
// @test-link [[entity_rhythm_candidate_domain]]
describe('rhythm domain prewarm: job lifecycle', () => {
  it('a lookup mid-job finishes the job and stores the golden entry', () => {
    const memo = createCanonicalRhythmDomainMemo()
    const setting = parseSettingKey(MID_KEY)
    const job = beginPrewarm(setting, memo)
    expect(job.runSlice(yieldEvery(50))).toBe(false)
    expect(memo.size()).toBe(0)
    const domain = memo.lookup(setting)
    expect(memo.size()).toBe(1)
    expect(domainFacts(domain)).toEqual(goldenFacts(MID_KEY).facts)
    expect(rankingFacts(domain)).toEqual(goldenFacts(MID_KEY).rankings)
    expect(job.runSlice(() => true)).toBe(true)
    expect(memo.lookup(setting)).toBe(domain)
  })

  it('cancel leaves no entry and runSlice after cancel throws', () => {
    const memo = createCanonicalRhythmDomainMemo()
    const setting = parseSettingKey(MID_KEY)
    const job = beginPrewarm(setting, memo)
    expect(job.runSlice(yieldEvery(50))).toBe(false)
    job.cancel()
    expect(memo.size()).toBe(0)
    expect(() => job.runSlice(() => false)).toThrow(/cancelled/)
    expect(domainFacts(memo.lookup(setting))).toEqual(goldenFacts(MID_KEY).facts)
    expect(memo.size()).toBe(1)
  })

  it('beginBuild returns undefined for a memoized setting', () => {
    const memo = createCanonicalRhythmDomainMemo()
    const setting = parseSettingKey(SMALL_KEY)
    memo.lookup(setting)
    expect(memo.beginBuild(setting)).toBeUndefined()
    expect(beginRhythmDomainPrewarm(buildCatalogIntent(setting, 2), memo)).toBeUndefined()
  })

  it('beginBuild returns the unfinished job of the same setting', () => {
    const memo = createCanonicalRhythmDomainMemo()
    const setting = parseSettingKey(MID_KEY)
    const job = beginPrewarm(setting, memo)
    expect(job.runSlice(yieldEvery(10))).toBe(false)
    expect(memo.beginBuild(setting)).toBe(job)
    expect(runToCompletion(job, () => false)).toBe(1)
    expect(domainFacts(memo.lookup(setting))).toEqual(goldenFacts(MID_KEY).facts)
  })

  it('a second beginBuild for another setting cancels the first', () => {
    const memo = createCanonicalRhythmDomainMemo()
    const first = beginPrewarm(parseSettingKey(MID_KEY), memo)
    expect(first.runSlice(yieldEvery(50))).toBe(false)
    const second = beginPrewarm(parseSettingKey(SMALL_KEY), memo)
    expect(second).not.toBe(first)
    expect(() => first.runSlice(() => false)).toThrow(/cancelled/)
    expect(memo.size()).toBe(0)
    runToCompletion(second, yieldEvery(7))
    expect(memo.size()).toBe(1)
    expect(domainFacts(memo.lookup(parseSettingKey(SMALL_KEY)))).toEqual(
      goldenFacts(SMALL_KEY).facts,
    )
  })

  it('a prewarm whose harmony has no plan discards the unfinished job of another setting', () => {
    const memo = createCanonicalRhythmDomainMemo()
    const first = beginPrewarm(parseSettingKey(MID_KEY), memo)
    expect(first.runSlice(yieldEvery(50))).toBe(false)
    const noPlan = buildCatalogIntent(parseSettingKey(SMALL_KEY), 1)
    expect(beginRhythmDomainPrewarm(noPlan, memo, noHarmonyPlan)).toBeUndefined()
    expect(() => first.runSlice(() => false)).toThrow(/cancelled/)
    expect(memo.size()).toBe(0)
    expect(beginPrewarm(parseSettingKey(MID_KEY), memo)).not.toBe(first)
  })

  it('a prewarm whose harmony has no plan leaves memoized entries in place', () => {
    const memo = createCanonicalRhythmDomainMemo()
    const setting = parseSettingKey(SMALL_KEY)
    const entry = memo.lookup(setting)
    expect(beginRhythmDomainPrewarm(buildCatalogIntent(setting, 1), memo, noHarmonyPlan)).toBe(
      undefined,
    )
    expect(memo.size()).toBe(1)
    expect(memo.lookup(setting)).toBe(entry)
  })
})

/** Intent: the number of gestures a setting's derivation visits, skipped ones included. */
function gestureCount(setting: RhythmSetting): number {
  const input = normalizeRhythmExpansionInput({ grammarVersion: 'rhythm-mvp-v2', ...setting })
  return [...enumerateGestureDerivations(input)].length
}

/** Intent: run a job to completion in one slice; its step count (one more than yield checks). */
function countSteps(job: CanonicalRhythmDomainBuildJob): number {
  let checks = 0
  expect(
    job.runSlice(() => {
      checks += 1
      return false
    }),
  ).toBe(true)
  return checks + 1
}

// @test-link [[module_generation_worker_protocol]]
// @test-link [[entity_rhythm_candidate_domain]]
describe('rhythm domain prewarm: one step is one gesture unit', () => {
  it.each([SMALL_KEY, MID_KEY, 'Eighth|Heavily varied|Sparse|Active displacement|Build'])(
    '%s: a job takes one step per gesture plus the step ending the pass',
    (key) => {
      const setting = parseSettingKey(key)
      const memo = createCanonicalRhythmDomainMemo()
      expect(countSteps(beginPrewarm(setting, memo))).toBe(gestureCount(setting) + 1)
      expect(domainFacts(memo.lookup(setting))).toEqual(goldenFacts(key).facts)
    },
    SETTING_TIMEOUT_MS,
  )

  it('a no-plan setting steps through its fast pass and its exact re-run', () => {
    const setting = parseSettingKey(NO_PLAN_KEY)
    const memo = createCanonicalRhythmDomainMemo()
    expect(countSteps(beginPrewarm(setting, memo))).toBe(2 * (gestureCount(setting) + 1))
  })

  it('a no-plan setting prewarmed step by step stores the identical typed no-plan entry', () => {
    const setting = parseSettingKey(NO_PLAN_KEY)
    const memo = createCanonicalRhythmDomainMemo()
    const slices = runToCompletion(beginPrewarm(setting, memo), yieldEvery(1))
    expect(slices).toBe(2 * (gestureCount(setting) + 1))
    const entry = memo.lookup(setting)
    expect(entry.kind).toBe('no_legal_rhythm_plan')
    expect(entry).toEqual(
      makeRhythmCandidateDomain({ grammarVersion: 'rhythm-mvp-v2', ...setting }),
    )
    expect(Object.isFrozen(entry)).toBe(true)
    expect(domainFacts(entry)).toEqual(goldenFacts(NO_PLAN_KEY).facts)
  })
})

// @test-link [[module_generation_worker_protocol]]
// @test-link [[entity_rhythm_candidate_domain]]
describe('rhythm domain prewarm: generation on a prewarmed memo', () => {
  const worstKey = WORST_SETTING_KEYS[0]!

  /** Intent: the outcome hashes of seeds 1..3 generated in order on one memo. */
  function seedHashes(memo: CanonicalRhythmDomainMemo): readonly string[] {
    return [1, 2, 3].map((seed) =>
      jsonHash(
        generatePhrase(buildCatalogIntent(parseSettingKey(worstKey), seed), {
          rhythmDomainMemo: memo,
        }),
      ),
    )
  }

  it(
    'a completed prewarm reproduces the catalog golden for seeds 1..3 on the worst setting',
    () => {
      const memo = createCanonicalRhythmDomainMemo()
      runToCompletion(beginPrewarm(parseSettingKey(worstKey), memo), yieldEvery(7))
      expect(seedHashes(memo)).toEqual(CATALOG_GOLDEN.settings[worstKey]!.slice(0, 3))
    },
    SETTING_TIMEOUT_MS,
  )

  it(
    'an interrupted prewarm finished by generation reproduces the same catalog golden',
    () => {
      const memo = createCanonicalRhythmDomainMemo()
      const job = beginPrewarm(parseSettingKey(worstKey), memo)
      expect(job.runSlice(yieldEvery(200))).toBe(false)
      expect(seedHashes(memo)).toEqual(CATALOG_GOLDEN.settings[worstKey]!.slice(0, 3))
      expect(job.runSlice(() => true)).toBe(true)
    },
    SETTING_TIMEOUT_MS,
  )
})
