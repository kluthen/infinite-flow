// @vitest-environment node
/**
 * The Worker runtime's message handling and slice scheduling against a scripted memo and build
 * job, a fake clock and a manual scheduler: one response per generate and none per prewarm, at
 * most one outstanding slice, slices bounded by the budget, a prewarm of a memoized setting
 * scheduling nothing, a failing slice cancelling its job and rethrowing, and malformed messages
 * throwing before anything runs.
 */

import { describe, expect, it } from 'vitest'

import type {
  CanonicalRhythmDomainBuildJob,
  CanonicalRhythmDomainMemo,
} from '@/domain/generation/orchestration/canonical-rhythm-domain'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { GenerationWorkerProtocolError } from '@/generation-worker/generation-worker-protocol'
import {
  createGenerationWorkerRuntime,
  DEFAULT_PREWARM_SLICE_BUDGET_MS,
  type GenerationWorkerRuntime,
} from '@/generation-worker/generation-worker-runtime'
import {
  buildCatalogIntent,
  parseSettingKey,
} from '../domain/generation/orchestration/cold-generation-golden/cold-generation-golden-fixture'

/** A small setting whose harmony plan exists, so a prewarm reaches the memo. */
const SMALL_INTENT = buildCatalogIntent(
  parseSettingKey('Quarter|Strict|Sparse|Straight|Settled'),
  1,
)
/** The real outcome the scripted generator answers with. */
const SMALL_OUTCOME = generatePhrase(SMALL_INTENT)

/** A scripted build job: `steps` steps, each advancing the fake clock by `stepMs`. */
interface ScriptedJob extends CanonicalRhythmDomainBuildJob {
  readonly stepsRun: () => number
  readonly yieldAnswers: boolean[]
  readonly cancelled: () => boolean
}

/** The scripted world's mutable state: jobs handed out, intents served and the switches. */
interface RigState {
  readonly jobs: ScriptedJob[]
  readonly generated: string[]
  memoized: boolean
  failAtStep: number | undefined
}

/** The test's controllable world: fake clock, manual scheduler, scripted memo and the runtime. */
interface Rig extends RigState {
  readonly runtime: GenerationWorkerRuntime
  readonly slices: (() => void)[]
}

/**
 * Intent: a job doing `steps` steps of `stepMs` fake milliseconds each, recording every
 * shouldYield answer, optionally throwing at step `rig.failAtStep`.
 */
function scriptedJob(
  rig: RigState,
  clock: { t: number },
  steps: number,
  stepMs: number,
): ScriptedJob {
  let done = 0
  let cancelled = false
  const yieldAnswers: boolean[] = []
  return {
    key: `scripted-${rig.jobs.length}`,
    runSlice(shouldYield) {
      if (cancelled) throw new Error('cancelled job ran')
      if (done >= steps) return true
      for (;;) {
        done += 1
        clock.t += stepMs
        if (done === rig.failAtStep) throw new Error('slice step failed')
        if (done >= steps) return true
        const answer = shouldYield()
        yieldAnswers.push(answer)
        if (answer) return false
      }
    },
    cancel() {
      if (done < steps) cancelled = true
    },
    stepsRun: () => done,
    yieldAnswers,
    cancelled: () => cancelled,
  }
}

/**
 * Intent: a rig whose memo hands out scripted jobs (or nothing when `memoized`), whose scheduler
 * throws on a second outstanding slice, and whose generator records the intents it serves.
 */
function createRig(steps = 20, stepMs = 3): Rig {
  const clock = { t: 0 }
  const slices: (() => void)[] = []
  const rig: RigState = { jobs: [], generated: [], memoized: false, failAtStep: undefined }
  const memo: CanonicalRhythmDomainMemo = {
    lookup: () => {
      throw new Error('scripted memo lookup is not used')
    },
    beginBuild: () => {
      if (rig.memoized) return undefined
      const job = scriptedJob(rig, clock, steps, stepMs)
      rig.jobs.push(job)
      return job
    },
    discardPendingBuild: () => {
      throw new Error('scripted memo discardPendingBuild is not used')
    },
    size: () => 0,
  }
  const runtime = createGenerationWorkerRuntime({
    now: () => clock.t,
    scheduleSlice: (run) => {
      if (slices.length > 0) throw new Error('a second slice was scheduled')
      slices.push(run)
    },
    memo,
    generate: (intent) => {
      rig.generated.push(intent.requestId)
      return SMALL_OUTCOME
    },
  })
  return Object.assign(rig, { runtime, slices })
}

/** Intent: run the one scheduled slice, failing when none is scheduled. */
function runSlice(rig: Rig): void {
  const run = rig.slices.shift()
  if (run === undefined) throw new Error('no slice scheduled')
  run()
}

const generateMessage = (id: number) => ({ type: 'generate', id, intent: SMALL_INTENT })
const prewarmMessage = { type: 'prewarm', intent: SMALL_INTENT }

// @test-link [[module_generation_worker_protocol]]
describe('generation worker runtime: messages and slice scheduling', () => {
  it('answers each generate with exactly one response and a prewarm with none', () => {
    const rig = createRig()
    expect(rig.runtime.handleMessage(structuredClone(prewarmMessage))).toBeUndefined()
    const first = rig.runtime.handleMessage(structuredClone(generateMessage(1)))
    const second = rig.runtime.handleMessage(structuredClone(generateMessage(2)))
    expect(first).toEqual({ type: 'outcome', id: 1, outcome: SMALL_OUTCOME })
    expect(second).toEqual({ type: 'outcome', id: 2, outcome: SMALL_OUTCOME })
    expect(rig.generated).toHaveLength(2)
  })

  it('answers a throwing generator with a typed crash response', () => {
    const runtime = createGenerationWorkerRuntime({
      now: () => 0,
      scheduleSlice: () => undefined,
      generate: () => {
        throw new RangeError('boom')
      },
    })
    expect(runtime.handleMessage(structuredClone(generateMessage(3)))).toEqual({
      type: 'crash',
      id: 3,
      name: 'RangeError',
      message: 'boom',
    })
  })

  it('never schedules more than one outstanding slice, however many prewarms arrive', () => {
    const rig = createRig()
    rig.runtime.handleMessage(structuredClone(prewarmMessage))
    rig.runtime.handleMessage(structuredClone(prewarmMessage))
    rig.runtime.handleMessage(structuredClone(generateMessage(1)))
    rig.runtime.handleMessage(structuredClone(prewarmMessage))
    expect(rig.slices).toHaveLength(1)
  })

  it('bounds each slice by the budget: shouldYield turns true once now() reaches the deadline', () => {
    const rig = createRig(20, 3)
    rig.runtime.handleMessage(structuredClone(prewarmMessage))
    runSlice(rig)
    const job = rig.jobs[0]!
    expect(DEFAULT_PREWARM_SLICE_BUDGET_MS).toBe(8)
    // Steps end at 3 and 6 ms (under the 8 ms deadline), then at 9 ms (past it): yield.
    expect(job.yieldAnswers).toEqual([false, false, true])
    expect(job.stepsRun()).toBe(3)
    expect(rig.slices).toHaveLength(1)
  })

  it('reschedules slices until the job completes, then schedules nothing more', () => {
    const rig = createRig(20, 3)
    rig.runtime.handleMessage(structuredClone(prewarmMessage))
    let slicesRun = 0
    while (rig.slices.length > 0) {
      runSlice(rig)
      slicesRun += 1
    }
    expect(rig.jobs[0]!.stepsRun()).toBe(20)
    expect(slicesRun).toBe(7)
  })

  it('serves a generate between two slices of an unfinished prewarm', () => {
    const rig = createRig(20, 3)
    rig.runtime.handleMessage(structuredClone(prewarmMessage))
    runSlice(rig)
    expect(rig.runtime.handleMessage(structuredClone(generateMessage(9)))?.id).toBe(9)
    expect(rig.jobs[0]!.stepsRun()).toBe(3)
    runSlice(rig)
    expect(rig.jobs[0]!.stepsRun()).toBe(6)
  })

  it('schedules nothing for a prewarm of an already-memoized setting', () => {
    const rig = createRig()
    rig.memoized = true
    expect(rig.runtime.handleMessage(structuredClone(prewarmMessage))).toBeUndefined()
    expect(rig.slices).toHaveLength(0)
  })

  it('drops the current job when a later prewarm finds its setting memoized', () => {
    const rig = createRig(20, 3)
    rig.runtime.handleMessage(structuredClone(prewarmMessage))
    rig.memoized = true
    rig.runtime.handleMessage(structuredClone(prewarmMessage))
    runSlice(rig)
    expect(rig.jobs[0]!.stepsRun()).toBe(0)
    expect(rig.slices).toHaveLength(0)
  })

  it('cancels the job and rethrows when a slice throws, and later prewarms still run', () => {
    const rig = createRig(20, 3)
    rig.failAtStep = 2
    rig.runtime.handleMessage(structuredClone(prewarmMessage))
    expect(() => runSlice(rig)).toThrow('slice step failed')
    expect(rig.jobs[0]!.cancelled()).toBe(true)
    expect(rig.slices).toHaveLength(0)

    rig.failAtStep = undefined
    rig.runtime.handleMessage(structuredClone(prewarmMessage))
    runSlice(rig)
    expect(rig.jobs[1]!.stepsRun()).toBe(3)
  })

  it.each([
    ['a prewarm without an intent', { type: 'prewarm' }],
    ['a prewarm carrying an id', { type: 'prewarm', id: 1, intent: SMALL_INTENT }],
    ['a prewarm with an unknown field', { type: 'prewarm', intent: SMALL_INTENT, extra: true }],
    ['a prewarm with a malformed intent', { type: 'prewarm', intent: { seed: 1 } }],
    ['an unknown message type', { type: 'warm', intent: SMALL_INTENT }],
    ['a non-object message', 'prewarm'],
  ])('throws on %s and schedules nothing', (_label, message) => {
    const rig = createRig()
    expect(() => rig.runtime.handleMessage(structuredClone(message))).toThrow(
      GenerationWorkerProtocolError,
    )
    expect(rig.slices).toHaveLength(0)
    expect(rig.jobs).toHaveLength(0)
  })
})
