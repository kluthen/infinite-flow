// @vitest-environment node
/**
 * The Worker runtime over a real memo, a ticking fake clock and a manual scheduler, checked
 * against the checked-in cold-generation goldens (read only, never regenerated): a generate
 * served before, during or after a prewarm reproduces the catalog golden; a completed prewarm
 * leaves the memo-ranking golden's entry; a newer prewarm replaces an unfinished one; and a
 * generate for another setting leaves the unfinished job to resume and complete identically.
 */

import { describe, expect, it } from 'vitest'

import {
  createCanonicalRhythmDomainMemo,
  type CanonicalRhythmDomainBuildJob,
  type CanonicalRhythmDomainMemo,
} from '@/domain/generation/orchestration/canonical-rhythm-domain'
import {
  createGenerationWorkerRuntime,
  type GenerationWorkerRuntime,
} from '@/generation-worker/generation-worker-runtime'
import {
  buildCatalogIntent,
  domainFacts,
  jsonHash,
  parseSettingKey,
  readGolden,
  WORST_SETTING_KEYS,
  type CatalogGolden,
  type MemoGolden,
} from '../domain/generation/orchestration/cold-generation-golden/cold-generation-golden-fixture'

const CATALOG_GOLDEN = readGolden<CatalogGolden>('catalog.golden.v1.json')
const MEMO_GOLDEN = readGolden<MemoGolden>('memo-ranking.golden.v1.json')

/** Per-test timeout: the worst setting enumerates about 1,800 candidates cold. */
const TIMEOUT_MS = 180_000

/** The worst setting of the latency measurements. */
const WORST_KEY = WORST_SETTING_KEYS[0]!
/** A mid-size setting (108 candidates), many slices long on the ticking clock. */
const MID_KEY = 'Eighth|Slightly varied|Conversational|Occasional offbeats|Lift'
/** A small setting (1 candidate). */
const SMALL_KEY = 'Quarter|Strict|Sparse|Straight|Settled'

/** The runtime over a real memo, a clock ticking 1 ms per read and a one-slot manual scheduler. */
interface GoldenRig {
  readonly runtime: GenerationWorkerRuntime
  readonly memo: CanonicalRhythmDomainMemo
  readonly slices: (() => void)[]
  readonly jobs: CanonicalRhythmDomainBuildJob[]
}

/**
 * Intent: a rig whose memo is a fresh real memo, observed so the test can hold the jobs it
 * begins, and whose scheduler throws on a second outstanding slice.
 */
function createGoldenRig(): GoldenRig {
  const real = createCanonicalRhythmDomainMemo()
  const jobs: CanonicalRhythmDomainBuildJob[] = []
  const memo: CanonicalRhythmDomainMemo = {
    lookup: real.lookup,
    size: real.size,
    discardPendingBuild: real.discardPendingBuild,
    beginBuild: (input) => {
      const job = real.beginBuild(input)
      if (job !== undefined) jobs.push(job)
      return job
    },
  }
  const slices: (() => void)[] = []
  let t = 0
  const runtime = createGenerationWorkerRuntime({
    now: () => (t += 1),
    scheduleSlice: (run) => {
      if (slices.length > 0) throw new Error('a second slice was scheduled')
      slices.push(run)
    },
    memo,
  })
  return { runtime, memo, slices, jobs }
}

/** Intent: run the one scheduled slice, failing when none is scheduled. */
function runSlice(rig: GoldenRig): void {
  const run = rig.slices.shift()
  if (run === undefined) throw new Error('no slice scheduled')
  run()
}

/** Intent: run slices until none is scheduled; the number run. */
function drainSlices(rig: GoldenRig): number {
  let count = 0
  while (rig.slices.length > 0) {
    runSlice(rig)
    count += 1
  }
  return count
}

/** Intent: post a prewarm for one setting's seed-1 catalog intent across a cloning boundary. */
function prewarm(rig: GoldenRig, key: string): void {
  const intent = buildCatalogIntent(parseSettingKey(key), 1)
  expect(rig.runtime.handleMessage(structuredClone({ type: 'prewarm', intent }))).toBeUndefined()
}

/** Intent: generate one setting's catalog intent for `seed`; the outcome's strong hash. */
function generateHash(rig: GoldenRig, key: string, seed: number, id: number): string {
  const intent = buildCatalogIntent(parseSettingKey(key), seed)
  const response = rig.runtime.handleMessage(structuredClone({ type: 'generate', id, intent }))
  if (response?.type !== 'outcome' || response.id !== id) throw new Error('expected an outcome')
  return jsonHash(response.outcome)
}

/** Intent: the catalog golden hash of one setting and seed. */
function goldenHash(key: string, seed: number): string {
  return CATALOG_GOLDEN.settings[key]![CATALOG_GOLDEN.seeds.indexOf(seed)]!
}

/** Intent: the memo-ranking golden's list facts of one setting. */
function goldenListFacts(key: string) {
  const { kind, count, candidatesHash } = MEMO_GOLDEN.settings[key]!
  return { kind, count, candidatesHash }
}

// @test-link [[module_generation_worker_protocol]]
describe('generation worker runtime: prewarm keeps generation byte-identical', () => {
  it.each([WORST_KEY, SMALL_KEY])(
    '%s: prewarm then generate before any slice matches the catalog golden',
    (key) => {
      const rig = createGoldenRig()
      prewarm(rig, key)
      expect(generateHash(rig, key, 1, 1)).toBe(goldenHash(key, 1))
      expect(rig.memo.size()).toBe(1)
      drainSlices(rig)
      expect(generateHash(rig, key, 2, 2)).toBe(goldenHash(key, 2))
    },
    TIMEOUT_MS,
  )

  it.each([WORST_KEY, MID_KEY])(
    '%s: prewarm, a few slices, then generate matches the catalog golden',
    (key) => {
      const rig = createGoldenRig()
      prewarm(rig, key)
      for (let slice = 0; slice < 5; slice += 1) runSlice(rig)
      expect(rig.memo.size()).toBe(0)
      expect(generateHash(rig, key, 1, 1)).toBe(goldenHash(key, 1))
      drainSlices(rig)
      expect(rig.memo.size()).toBe(1)
    },
    TIMEOUT_MS,
  )

  it.each([WORST_KEY, MID_KEY, SMALL_KEY])(
    '%s: a prewarm run to completion leaves the on-demand memo entry and stops scheduling',
    (key) => {
      const rig = createGoldenRig()
      prewarm(rig, key)
      const slices = drainSlices(rig)
      if (key !== SMALL_KEY) expect(slices).toBeGreaterThan(1)
      expect(rig.slices).toHaveLength(0)
      expect(rig.memo.size()).toBe(1)
      expect(domainFacts(rig.memo.lookup(parseSettingKey(key)))).toEqual(goldenListFacts(key))
      expect(generateHash(rig, key, 3, 1)).toBe(goldenHash(key, 3))
    },
    TIMEOUT_MS,
  )

  it('a newer prewarm for another setting replaces the unfinished one', () => {
    const rig = createGoldenRig()
    prewarm(rig, MID_KEY)
    runSlice(rig)
    prewarm(rig, SMALL_KEY)
    const [replaced] = rig.jobs
    expect(() => replaced!.runSlice(() => true)).toThrow()
    drainSlices(rig)
    expect(rig.memo.size()).toBe(1)
    expect(domainFacts(rig.memo.lookup(parseSettingKey(SMALL_KEY)))).toEqual(
      goldenListFacts(SMALL_KEY),
    )
    expect(generateHash(rig, MID_KEY, 1, 1)).toBe(goldenHash(MID_KEY, 1))
  })

  it('a prewarm of an already-memoized setting schedules nothing', () => {
    const rig = createGoldenRig()
    expect(generateHash(rig, SMALL_KEY, 1, 1)).toBe(goldenHash(SMALL_KEY, 1))
    prewarm(rig, SMALL_KEY)
    expect(rig.slices).toHaveLength(0)
    expect(rig.jobs).toHaveLength(0)
  })

  it('a generate for another setting is served mid-prewarm and the job then completes identically', () => {
    const rig = createGoldenRig()
    prewarm(rig, MID_KEY)
    runSlice(rig)
    expect(generateHash(rig, SMALL_KEY, 1, 1)).toBe(goldenHash(SMALL_KEY, 1))
    expect(rig.memo.size()).toBe(1)
    expect(rig.slices).toHaveLength(1)
    drainSlices(rig)
    expect(rig.memo.size()).toBe(2)
    expect(domainFacts(rig.memo.lookup(parseSettingKey(MID_KEY)))).toEqual(goldenListFacts(MID_KEY))
    expect(generateHash(rig, MID_KEY, 1, 2)).toBe(goldenHash(MID_KEY, 1))
  })
})
