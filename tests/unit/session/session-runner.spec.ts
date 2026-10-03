/**
 * The session runner: it carries out the engine's generation requests and fit checks through its
 * injected seams, feeds every result back stamped with the injected clock's time, turns a worker
 * crash or a dead worker into a failed attempt, hands every other rejection to its owner, and
 * forwards every engine output in order. Generation and fit checks are deferred by hand, so each
 * test decides when (on the hand-advanced clock) a result comes back.
 */

import { describe, expect, it, vi } from 'vitest'

import type { GenerationIntent } from '@/domain/generation/generation-intent'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import {
  GenerationWorkerCrashError,
  GenerationWorkerTransportError,
} from '@/generation-worker/generation-worker-client'
import {
  createSessionRunner,
  type FitCandidate,
  type SessionRunner,
} from '@/session/session-runner'
import { SessionEngineError, type SessionOutput, type SessionStart } from '@/session/session-types'
import { SETTINGS_MUTATION_OFF } from '@/session/settings-mutation'
import {
  SessionDriver,
  UNREAD_DISPLAY,
  failureOutcome,
  fakeViewport,
  kinds,
  phraseOneFor,
  queuedProviders,
  sessionSettings,
  successFor,
  type GenerationRequestOutput,
} from './session-harness'

/** One generate call the test has not answered yet. */
interface PendingGeneration {
  readonly intent: GenerationIntent
  readonly resolve: (outcome: GenerationOutcome) => void
  readonly reject: (error: unknown) => void
}

/** One fit check the test has not answered yet. */
interface PendingFit {
  readonly candidate: FitCandidate
  readonly phraseNumber: number
  readonly resolve: (fits: boolean) => void
  readonly reject: (error: unknown) => void
}

/** A runner at 240 BPM started at 0 (phrase 2 is due at 1 s), with every seam in the test's hand. */
interface Rig {
  readonly runner: SessionRunner
  readonly clock: { at: number }
  readonly log: SessionOutput[]
  readonly errors: unknown[]
  readonly generations: PendingGeneration[]
  readonly fits: PendingFit[]
  readonly generate: ReturnType<typeof vi.fn>
  readonly checkFit: ReturnType<typeof vi.fn>
  readonly start: SessionStart
}

/** Intent: the start every rig and every reference driver shares: 240 BPM, at 0, a real phrase 1. */
function fastStart(): SessionStart {
  const settings = sessionSettings({ tempo: 240 })
  return {
    at: 0,
    settings,
    phraseOne: phraseOneFor(settings),
    mutation: SETTINGS_MUTATION_OFF,
    adaptiveTempo: false,
  }
}

/** Intent: build a runner whose generate and fit-check calls wait until the test answers them. */
function rig(): Rig {
  const clock = { at: 0 }
  const log: SessionOutput[] = []
  const errors: unknown[] = []
  const generations: PendingGeneration[] = []
  const fits: PendingFit[] = []
  const generate = vi.fn(
    (intent: GenerationIntent) =>
      new Promise<GenerationOutcome>((resolve, reject) => {
        generations.push({ intent, resolve, reject })
      }),
  )
  const checkFit = vi.fn(
    (candidate: FitCandidate, phraseNumber: number) =>
      new Promise<boolean>((resolve, reject) => {
        fits.push({ candidate, phraseNumber, resolve, reject })
      }),
  )
  const start = fastStart()
  const runner = createSessionRunner(
    {
      generate,
      checkFit,
      now: () => clock.at,
      providers: queuedProviders(),
      viewport: fakeViewport(false),
      display: UNREAD_DISPLAY,
      onOutput: (output) => log.push(output),
      onError: (error) => errors.push(error),
    },
    start,
  )
  return { runner, clock, log, errors, generations, fits, generate, checkFit, start }
}

/** Intent: let every settled seam promise run its continuation. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/** Intent: the latest generate call, failing the test's assertion when there is none. */
function lastGeneration(r: Rig): PendingGeneration {
  const pending = r.generations.at(-1)
  expect(pending, 'the runner has called generate').toBeDefined()
  return pending!
}

/** Intent: the latest fit check, failing the test's assertion when there is none. */
function lastFit(r: Rig): PendingFit {
  const pending = r.fits.at(-1)
  expect(pending, 'the runner has called checkFit').toBeDefined()
  return pending!
}

/** Intent: every request-generation output the runner forwarded. */
function requests(r: Rig): readonly GenerationRequestOutput[] {
  return r.log.filter(
    (output): output is GenerationRequestOutput => output.kind === 'request-generation',
  )
}

/** Intent: at the clock's time `at`, answer the latest generate call with its real success. */
async function succeedAt(r: Rig, at: number): Promise<void> {
  r.clock.at = at
  const pending = lastGeneration(r)
  pending.resolve(successFor(pending.intent))
  await settle()
}

/** Intent: at the clock's time `at`, answer the latest fit check. */
async function fitAt(r: Rig, at: number, fits: boolean): Promise<void> {
  r.clock.at = at
  lastFit(r).resolve(fits)
  await settle()
}

/** Intent: at the clock's time `at`, reject the latest generate call with `error`. */
async function rejectAt(r: Rig, at: number, error: unknown): Promise<void> {
  r.clock.at = at
  lastGeneration(r).reject(error)
  await settle()
}

// @test-link [[service_session_runner]]
describe('session runner', () => {
  // @test-link [[service_session_runner]]
  it('forwards the start outputs and runs the phrase 2 request through generate', () => {
    const r = rig()
    expect(kinds(r.log)).toEqual(['request-generation', 'wake-at'])
    const request = requests(r)[0]!
    expect(request.phraseNumber).toBe(2)
    expect(r.generate).toHaveBeenCalledTimes(1)
    expect(r.generate).toHaveBeenCalledWith(request.intent)
  })

  // @test-link [[service_session_runner]]
  it('generates and fit-checks phrase 2, then forwards it as the phrase ready to show', async () => {
    const r = rig()
    await succeedAt(r, 0.3)
    const fit = lastFit(r)
    expect(r.checkFit).toHaveBeenCalledTimes(1)
    expect(fit.phraseNumber).toBe(2)
    expect(fit.candidate.outcome).toBe(successFor(requests(r)[0]!.intent))
    await fitAt(r, 0.5, true)
    const ready = r.log.at(-1)
    expect(ready?.kind).toBe('phrase-ready')
    expect(ready).toMatchObject({ phrase: { phraseNumber: 2, origin: 'carry-in' } })
    expect(r.errors).toEqual([])
  })

  // @test-link [[service_session_runner]]
  it("hands the fit-check seam the attempt's outcome with that attempt's own intent", async () => {
    const r = rig()
    r.clock.at = 0.2
    r.generations[0]!.resolve(failureOutcome())
    await settle()
    const retry = requests(r)[1]!
    await succeedAt(r, 0.3)
    const { candidate } = lastFit(r)
    expect(candidate.outcome).toBe(successFor(retry.intent))
    expect(candidate.intent).toBe(retry.intent)
    expect(r.checkFit).toHaveBeenCalledWith({ outcome: candidate.outcome, intent: retry.intent }, 2)
  })

  // @test-link [[service_session_runner]]
  it('forwards every output, fed-back ones included, in the order the engine gave them', async () => {
    const r = rig()
    const reference = new SessionDriver({ ...fastStart(), providers: queuedProviders() })
    await succeedAt(r, 0.3)
    reference.succeed(0.3)
    await fitAt(r, 0.5, true)
    reference.fit(0.5, true)
    r.runner.dispatch({ kind: 'count-in-over', at: 1 })
    reference.countInOver(1)
    r.runner.dispatch({ kind: 'phrase-started-sounding', at: 5, phraseNumber: 2 })
    reference.sounding(5, 2)
    await rejectAt(r, 5.2, new GenerationWorkerCrashError('RangeError', 'boom'))
    reference.crash(5.2)
    r.runner.dispatch({ kind: 'end', at: 6, cause: 'stop' })
    reference.end(6)
    expect(r.log).toEqual(reference.log)
    expect(r.generate).toHaveBeenCalledTimes(3)
  })

  // @test-link [[rule_look_ahead_deadline]]
  it('stamps a result with the clock time it arrives at, so one past the deadline is too late', async () => {
    const r = rig()
    await succeedAt(r, 1.2)
    expect(r.checkFit).not.toHaveBeenCalled()
    expect(r.log.slice(-2)).toMatchObject([
      { kind: 'phrase-ready', phrase: { phraseNumber: 2, origin: 'repeat', repeatOf: 1 } },
      { kind: 'phrase-tempo', phraseNumber: 2, tempo: 240 },
    ])
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  it('requests the next rung after a generation failure, and accepts its success', async () => {
    const r = rig()
    r.clock.at = 0.2
    r.generations[0]!.resolve(failureOutcome())
    await settle()
    expect(r.generate).toHaveBeenCalledTimes(2)
    expect(requests(r).map((request) => request.retry)).toEqual([0, 1])
    await succeedAt(r, 0.3)
    await fitAt(r, 0.4, true)
    expect(r.log.at(-1)).toMatchObject({ kind: 'phrase-ready', phrase: { origin: 'carry-in' } })
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  it.each([
    ['a worker crash on the request', new GenerationWorkerCrashError('RangeError', 'boom')],
    ['a dead worker', new GenerationWorkerTransportError('The worker is gone.')],
  ])('turns %s into a failed attempt; the session keeps going', async (_label, error) => {
    const r = rig()
    await rejectAt(r, 0.2, error)
    expect(r.errors).toEqual([])
    expect(r.generate).toHaveBeenCalledTimes(2)
    expect(requests(r).map((request) => request.retry)).toEqual([0, 1])
    expect(kinds(r.log)).not.toContain('ended')
  })

  // @test-link [[service_session_runner]]
  it('hands any other generate rejection to its owner and feeds nothing back', async () => {
    const r = rig()
    const bug = new TypeError('a programming error')
    const before = [...r.log]
    await rejectAt(r, 0.2, bug)
    expect(r.errors).toEqual([bug])
    expect(r.log).toEqual(before)
    expect(r.generate).toHaveBeenCalledTimes(1)
  })

  // @test-link [[service_session_runner]]
  it('hands a fit-check rejection to its owner and feeds nothing back', async () => {
    const r = rig()
    await succeedAt(r, 0.3)
    const before = [...r.log]
    const bug = new Error('the fit check broke')
    r.clock.at = 0.4
    lastFit(r).reject(bug)
    await settle()
    expect(r.errors).toEqual([bug])
    expect(r.log).toEqual(before)
  })

  // @test-link [[service_session_runner]]
  it('keeps feeding a result that arrives after the end, which the engine drops', async () => {
    const r = rig()
    r.runner.dispatch({ kind: 'end', at: 0.1, cause: 'stop' })
    const before = [...r.log]
    await succeedAt(r, 0.2)
    expect(r.errors).toEqual([])
    expect(r.log).toEqual(before)
    expect(kinds(r.log).at(-1)).toBe('ended')
  })

  // @test-link [[service_session_runner]]
  it('hands an engine error while handling a fed-back result to its owner and forwards nothing more', async () => {
    const r = rig()
    r.runner.dispatch({ kind: 'tick', at: 0.5 })
    const before = [...r.log]
    await succeedAt(r, 0.3)
    expect(r.errors).toHaveLength(1)
    expect(r.errors[0]).toBeInstanceOf(SessionEngineError)
    expect((r.errors[0] as Error).message).toMatch(/Time ran backwards/)
    expect(r.log).toEqual(before)
    expect(r.checkFit).not.toHaveBeenCalled()
    expect(r.generate).toHaveBeenCalledTimes(1)
  })

  // @test-link [[service_session_runner]]
  it('throws synchronously from dispatch on a transport event the engine refuses', () => {
    const r = rig()
    r.runner.dispatch({ kind: 'count-in-over', at: 1 })
    const before = [...r.log]
    expect(() => r.runner.dispatch({ kind: 'count-in-over', at: 1.5 })).toThrow(SessionEngineError)
    expect(() =>
      r.runner.dispatch({ kind: 'phrase-started-sounding', at: 5, phraseNumber: 3 }),
    ).toThrow(SessionEngineError)
    expect(r.log).toEqual(before)
    expect(r.errors).toEqual([])
  })

  // @test-link [[service_session_runner]]
  it('dispatches the controller event to the engine, which refuses one that changes nothing', () => {
    const r = rig()
    const before = [...r.log]
    r.runner.dispatch({ kind: 'controller', at: 0.1, attached: false })
    expect(r.log).toEqual(before)
    expect(() => r.runner.dispatch({ kind: 'controller', at: 0.2, attached: false })).toThrow(
      SessionEngineError,
    )
    r.runner.dispatch({ kind: 'controller', at: 0.3, attached: true })
    expect(r.log).toEqual(before)
    expect(r.errors).toEqual([])
  })
})
