/**
 * The session runner's cancellation of dropped attempts: every attempt reaches the generate seam
 * with its own abort signal, a cancel-generation output aborts that attempt's signal alone, and
 * whatever an aborted attempt then settles with is neither fed back nor handed to the owner.
 * Generate calls are deferred by hand, so each test decides when, and how, an attempt settles.
 */

import { describe, expect, it } from 'vitest'

import type { GenerationIntent } from '@/domain/generation/generation-intent'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import {
  GenerationCancelledError,
  GenerationWorkerCrashError,
} from '@/generation-worker/generation-worker-client'
import { createSessionRunner, type SessionRunner } from '@/session/session-runner'
import { cutoverAt } from '@/session/session-timing'
import type { SessionOutput } from '@/session/session-types'
import { SETTINGS_MUTATION_OFF } from '@/session/settings-mutation'
import {
  fakeDisplay,
  fakeViewport,
  kinds,
  phraseOneFor,
  queuedProviders,
  sessionSettings,
  successFor,
} from './session-harness'

/** One generate call the test has not answered yet, with the signal it was given. */
interface PendingGeneration {
  readonly intent: GenerationIntent
  readonly signal: AbortSignal
  readonly resolve: (outcome: GenerationOutcome) => void
  readonly reject: (error: unknown) => void
}

/** A runner started at 0 whose generate calls and fit checks the test answers. */
interface CancelRig {
  readonly runner: SessionRunner
  readonly clock: { at: number }
  readonly log: SessionOutput[]
  readonly errors: unknown[]
  readonly generations: PendingGeneration[]
}

/**
 * Intent: a runner at `tempo` (240 BPM by default) whose generate calls wait for the test and
 * whose fit checks always fit.
 */
function cancelRig(tempo = 240): CancelRig {
  const clock = { at: 0 }
  const log: SessionOutput[] = []
  const errors: unknown[] = []
  const generations: PendingGeneration[] = []
  const settings = sessionSettings({ tempo })
  const runner = createSessionRunner(
    {
      generate: (intent, signal) =>
        new Promise<GenerationOutcome>((resolve, reject) => {
          expect(signal, 'every attempt has its own abort signal').toBeInstanceOf(AbortSignal)
          generations.push({ intent, signal: signal!, resolve, reject })
        }),
      checkFit: () => Promise.resolve(true),
      now: () => clock.at,
      providers: queuedProviders(),
      viewport: fakeViewport(false),
      display: fakeDisplay(false),
      onOutput: (output) => log.push(output),
      onError: (error) => errors.push(error),
    },
    {
      at: 0,
      settings,
      phraseOne: phraseOneFor(settings),
      mutation: SETTINGS_MUTATION_OFF,
      adaptiveTempo: false,
      multiPhraseTensionArc: false,
    },
  )
  return { runner, clock, log, errors, generations }
}

/** Intent: let every settled seam promise run its continuation. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Intent: bring the rig to phrase 2 sounding at 5 s with phrase 3's first attempt pending, then
 * supersede that attempt with a settings change at 6 s; returns the superseded and new attempts.
 */
async function superseded(r: CancelRig): Promise<[PendingGeneration, PendingGeneration]> {
  r.clock.at = 0.5
  r.generations[0]!.resolve(successFor(r.generations[0]!.intent))
  await settle()
  r.runner.dispatch({ kind: 'count-in-over', at: 1 })
  r.runner.dispatch({ kind: 'phrase-started-sounding', at: 5, phraseNumber: 2 })
  const old = r.generations.at(-1)!
  const changed = sessionSettings({ tempo: 240, leapiness: 'Shaped' })
  r.runner.dispatch({ kind: 'settings-change', at: 6, settings: changed })
  return [old, r.generations.at(-1)!]
}

// @test-link [[service_session_runner]]
// @test-link [[rule_dropped_attempt_cancelled]]
describe('session runner: cancelling dropped attempts', () => {
  // @test-link [[rule_dropped_attempt_cancelled]]
  it("aborts the signal of the attempt the engine cancels at the deadline, and no other's", async () => {
    // At 120 BPM phrase 2's deadline (2 s) leaves time for a carry-in retry.
    const r = cancelRig(120)
    r.clock.at = 0.2
    r.generations[0]!.reject(new GenerationWorkerCrashError('RangeError', 'boom'))
    await settle()
    expect(r.generations).toHaveLength(2)

    r.runner.dispatch({ kind: 'tick', at: 2 })

    expect(r.log).toContainEqual({ kind: 'cancel-generation', attemptId: 2 })
    expect(r.generations[1]!.signal.aborted).toBe(true)
    expect(r.generations[0]!.signal.aborted).toBe(false)
  })

  // @test-link [[rule_dropped_attempt_cancelled]]
  it('aborts a superseded attempt and leaves the attempt that replaces it running to the end', async () => {
    const r = cancelRig()
    const [old, renewed] = await superseded(r)
    expect(renewed).not.toBe(old)
    expect(old.signal.aborted).toBe(true)
    expect(renewed.signal.aborted).toBe(false)

    r.clock.at = 6.2
    renewed.resolve(successFor(renewed.intent))
    await settle()

    expect(kinds(r.log).slice(-2)).toEqual(['check-fit', 'phrase-ready'])
    expect(r.errors).toEqual([])
  })

  // @test-link [[rule_dropped_attempt_cancelled]]
  // @test-link [[service_session_runner]]
  it.each([
    ['its cancellation', new GenerationCancelledError()],
    ['a worker crash', new GenerationWorkerCrashError('RangeError', 'late')],
    ['any other error', new TypeError('late programming error')],
  ])(
    'feeds nothing back and hands nothing to the owner when an aborted attempt rejects with %s',
    async (_label, error) => {
      const r = cancelRig()
      const [old] = await superseded(r)
      const before = [...r.log]

      r.clock.at = 6.1
      old.reject(error)
      await settle()

      expect(r.log).toEqual(before)
      expect(r.errors).toEqual([])
    },
  )

  // @test-link [[rule_dropped_attempt_cancelled]]
  it('feeds nothing back when an aborted attempt still resolves with an outcome', async () => {
    const r = cancelRig()
    const [old] = await superseded(r)
    const before = [...r.log]

    r.clock.at = 6.1
    old.resolve(successFor(old.intent))
    await settle()

    expect(r.log).toEqual(before)
    expect(r.errors).toEqual([])
  })

  // @test-link [[rule_dropped_attempt_cancelled]]
  // @test-link [[rule_session_generation_failure_ladder]]
  it('aborts a carry-in attempt at its cutover and runs the standalone attempt under a fresh signal', async () => {
    // At 120 BPM phrase 2's deadline is 2 s and its cutover 2 - 1.075 s.
    const r = cancelRig(120)
    const carryIn = r.generations[0]!
    r.runner.dispatch({ kind: 'tick', at: cutoverAt(2) })
    expect(carryIn.signal.aborted).toBe(true)
    expect(r.generations).toHaveLength(2)
    const standalone = r.generations[1]!
    expect(standalone.signal.aborted).toBe(false)
    expect(standalone.intent.carryIn).toBeUndefined()
    expect(kinds(r.log).slice(-2)).toEqual(['cancel-generation', 'request-generation'])

    r.clock.at = 1.2
    carryIn.resolve(successFor(carryIn.intent))
    standalone.resolve(successFor(standalone.intent))
    await settle()
    expect(r.log.at(-1)).toMatchObject({ kind: 'phrase-ready', phrase: { origin: 'standalone' } })
    expect(r.errors).toEqual([])
  })

  // @test-link [[rule_dropped_attempt_cancelled]]
  it('aborts the attempt in flight when the session ends', () => {
    const r = cancelRig()
    r.runner.dispatch({ kind: 'end', at: 0.5, cause: 'stop' })
    expect(r.generations[0]!.signal.aborted).toBe(true)
    expect(kinds(r.log).slice(-2)).toEqual(['cancel-generation', 'ended'])
  })
})
