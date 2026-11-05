// @vitest-environment node
/**
 * Chunk 18's real ladder in the Jam sweep (measurement tooling, run by `npm run test:sweep`): on a
 * scripted generator (no wall time), at 120 and 240 BPM, `JAM_REAL_LADDER` and the double of
 * Jam's ladder make the same attempts (rung, index, seed, start, charged time, cancellation,
 * failure) from the same intents apart from their request ids, and give the same phrase 1 (rung,
 * readiness, the attempt that made it): rung 1 at once; rung 2 first with no join; the retries
 * skipped after a search that covered every candidate; the retries; an attempt crossing the
 * cutover, or ending on it, cut and rung 3 asked for after the restart; rung 3 failing, ending at
 * or after the deadline: no phrase 1.
 */

import { describe, expect, it } from 'vitest'

import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationFailureCode } from '@/domain/generation/orchestration/orchestration-types'
import { RHYTHM_CHANGE_KINDS } from '@/domain/generation/request-rhythm-lock'
import { STANDALONE_RESERVE_SECONDS, WORKER_RESPAWN_SECONDS } from '@/session/session-timing'
import { caseSettings, phraseOneIntent, sweepCases } from '../unit/session/deadline-sweep'
import { loadDoodleSet } from '../unit/jam/doodle-set'
import { failureOutcome } from '../unit/session/session-harness'
import {
  JAM_DOUBLE_LADDER,
  doodlePhraseOne,
  jamPhraseOneIntent,
  phraseOneDeadlineSeconds,
  type GeneratedAttempt,
  type JamLock,
  type LadderInput,
  type LadderResult,
  type PhraseOneLadder,
} from './jam-sweep-ladder'
import { JAM_REAL_LADDER } from './jam-sweep-real-ladder'

/** The sweep's first case, the doodle set, and phrase 1's real success on the case. */
const FIRST_CASE = sweepCases()[0]!
const DOODLES = loadDoodleSet()
const REAL_SUCCESS = generatePhrase(phraseOneIntent(caseSettings(FIRST_CASE, 120), FIRST_CASE.seed))

/** Intent: whether a doodle of the set gives the first case's instrument a join. */
function hasJoin(name: string): boolean {
  const doodle = DOODLES.find((each) => each.name === name)!
  return doodlePhraseOne(caseSettings(FIRST_CASE, 120), doodle.quantized, 'Near', { on: false })
    .hasJoin
}

/** A doodle whose last note gives a join, and one whose last note gives none. */
const JOINED = DOODLES.find((each) => hasJoin(each.name))!.name
const UNJOINED = DOODLES.find((each) => !hasJoin(each.name))!.name

/**
 * A scripted generator's plan: what attempt `call` (by the order asked, from 1) is charged, given
 * the deadline and the cutover, and whether it generates a phrase or fails with a code.
 */
interface Script {
  readonly charged: (call: number, deadline: number, cutover: number) => number
  readonly outcome: (call: number) => 'phrase' | GenerationFailureCode
}

/** One ladder's run on a script, with the intents the generator was asked for, in order. */
interface ScriptedRun {
  readonly result: LadderResult
  readonly intents: readonly GenerationIntent[]
}

/**
 * Intent: run a ladder on a doodle at a tempo over a scripted generator, its input built as the
 * sweep's Jam builds it (the case's settings at the tempo, what the doodle gives phrase 1).
 */
function runScripted(
  ladder: PhraseOneLadder,
  tempo: number,
  doodleName: string,
  script: Script,
  lock: JamLock = { on: false },
): ScriptedRun {
  const settings = caseSettings(FIRST_CASE, tempo)
  const quantized = DOODLES.find((each) => each.name === doodleName)!.quantized
  const doodle = doodlePhraseOne(settings, quantized, 'Near', lock)
  const deadline = phraseOneDeadlineSeconds(tempo)
  const cutover = deadline - STANDALONE_RESERVE_SECONDS
  const intents: GenerationIntent[] = []
  const input: LadderInput = {
    baseIntent: phraseOneIntent(settings, FIRST_CASE.seed),
    intentAt: (seed, extras) => jamPhraseOneIntent(settings, seed, extras),
    firstSeed: FIRST_CASE.seed,
    steering: doodle.steering,
    lock,
    deadlineSeconds: deadline,
    reserveSeconds: STANDALONE_RESERVE_SECONDS,
    sessionSeed: FIRST_CASE.firstSessionSeed,
    doodle,
    generate: (intent): GeneratedAttempt => {
      intents.push(intent)
      const call = intents.length
      const planned = script.outcome(call)
      const outcome = planned === 'phrase' ? REAL_SUCCESS : failureOutcome(planned)
      const cost = script.charged(call, deadline, cutover)
      return { outcome, seconds: cost - 0.1, chargedSeconds: cost, orderingSeconds: 0, cold: false }
    },
  }
  return { result: ladder.run(input), intents }
}

/** Intent: an intent with its request id set aside, the one part the two ladders name apart. */
function withoutRequestId(intent: GenerationIntent): object {
  return { ...intent, requestId: 'set aside' }
}

/** Intent: what the two ladders must agree on in a run: its attempts and its phrase 1. */
function agreed({ result }: ScriptedRun): object {
  return {
    attempts: result.attempts.map((each) => ({
      rung: each.rung,
      attempt: each.attempt,
      seed: each.seed,
      startedAt: each.startedAt,
      chargedSeconds: each.chargedSeconds,
      cancelledAt: each.cancelledAt,
      failureCode: each.failureCode,
    })),
    ready:
      result.ready === undefined
        ? undefined
        : {
            rung: result.ready.rung,
            readyAt: result.ready.readyAt,
            made: result.ready.made?.attempt,
          },
  }
}

/**
 * A scenario: its doodle, its script, its lock, and the attempts, those cut and phrase 1's rung
 * it must give.
 */
interface Scenario {
  readonly name: string
  readonly doodle: string
  readonly script: Script
  readonly lock?: JamLock
  readonly attempts: readonly number[]
  /** The attempts cut at the cutover, by index. */
  readonly cut?: readonly number[]
  readonly rung: string | null
}

/** Intent: a script charging `seconds` for every attempt, a phrase from attempt `succeedAt` on. */
function steady(
  seconds: number,
  succeedAt: number,
  code: GenerationFailureCode = 'search_limit_exceeded',
): Script {
  return { charged: () => seconds, outcome: (call) => (call >= succeedAt ? 'phrase' : code) }
}

/** Every scenario, each played at 120 and 240 BPM. */
const SCENARIOS: readonly Scenario[] = [
  {
    name: 'rung 1 succeeds at once',
    doodle: JOINED,
    script: steady(0.3, 1),
    attempts: [0],
    rung: 'join-and-block',
  },
  {
    name: 'rung 1 succeeds at once with the lock on',
    doodle: JOINED,
    script: steady(0.3, 1),
    lock: { on: true, allowedChanges: RHYTHM_CHANGE_KINDS },
    attempts: [0],
    rung: 'join-and-block',
  },
  {
    name: 'no join: rung 2 first',
    doodle: UNJOINED,
    script: steady(0.3, 1),
    attempts: [4],
    rung: 'block',
  },
  {
    name: 'rung 1 fails no_legal_pitch_plan: rung 2, the retries skipped',
    doodle: JOINED,
    script: steady(0.2, 2, 'no_legal_pitch_plan'),
    attempts: [0, 4],
    rung: 'block',
  },
  {
    name: 'rung 1 fails another code twice, then a retry succeeds',
    doodle: JOINED,
    script: steady(0.2, 3),
    attempts: [0, 1, 2],
    rung: 'join-and-block',
  },
  {
    name: 'every attempt fails: rung 1 and its retries, rung 2, rung 3',
    doodle: JOINED,
    script: steady(0.2, Number.POSITIVE_INFINITY),
    attempts: [0, 1, 2, 3, 4, 5],
    rung: null,
  },
  {
    name: 'a rung 1 retry crossing the cutover: cut, the worker restarts, rung 3 succeeds',
    doodle: JOINED,
    script: {
      charged: (call, _deadline, cutover) => (call === 2 ? cutover : 0.3),
      outcome: (call) => (call === 3 ? 'phrase' : 'search_limit_exceeded'),
    },
    attempts: [0, 1, 5],
    cut: [1],
    rung: 'standalone',
  },
  {
    name: 'an attempt ending exactly at the cutover: cut',
    doodle: JOINED,
    script: {
      charged: (call, _deadline, cutover) => (call === 1 ? cutover : 0.3),
      outcome: () => 'phrase',
    },
    attempts: [0, 5],
    cut: [0],
    rung: 'standalone',
  },
  {
    name: 'rung 3 fails: no phrase 1',
    doodle: JOINED,
    script: {
      charged: (call, _deadline, cutover) => (call === 1 ? cutover : 0.2),
      outcome: () => 'search_limit_exceeded',
    },
    attempts: [0, 5],
    cut: [0],
    rung: null,
  },
  {
    name: 'rung 3 ending exactly at the deadline: no phrase 1',
    doodle: JOINED,
    script: {
      charged: (call, deadline, cutover) =>
        call === 1 ? cutover : deadline - (cutover + WORKER_RESPAWN_SECONDS),
      outcome: () => 'phrase',
    },
    attempts: [0, 5],
    cut: [0],
    rung: null,
  },
  {
    name: 'rung 3 ending after the deadline: no phrase 1',
    doodle: JOINED,
    script: {
      charged: (call, deadline, cutover) => (call === 1 ? cutover : deadline),
      outcome: () => 'phrase',
    },
    attempts: [0, 5],
    cut: [0],
    rung: null,
  },
]

describe("Jam phrase 1: chunk 18's real ladder agrees with the double (C5.7, C11)", () => {
  it('finds a doodle with a join and one without', () => {
    expect(hasJoin(JOINED)).toBe(true)
    expect(hasJoin(UNJOINED)).toBe(false)
  })

  for (const tempo of [120, 240])
    for (const scenario of SCENARIOS)
      it(`${scenario.name}, at ${tempo} BPM`, () => {
        const { doodle, script, lock } = scenario
        const real = runScripted(JAM_REAL_LADDER, tempo, doodle, script, lock)
        const double = runScripted(JAM_DOUBLE_LADDER, tempo, doodle, script, lock)
        expect(agreed(real)).toEqual(agreed(double))
        expect(real.intents.map(withoutRequestId)).toEqual(double.intents.map(withoutRequestId))
        const readyIntent = real.result.ready?.phraseOne.intent
        expect(readyIntent && withoutRequestId(readyIntent)).toEqual(
          double.result.ready && withoutRequestId(double.result.ready.phraseOne.intent),
        )
        expect(real.result.attempts.map((each) => each.attempt)).toEqual(scenario.attempts)
        const cutover = phraseOneDeadlineSeconds(tempo) - STANDALONE_RESERVE_SECONDS
        expect(
          real.result.attempts.flatMap((each) => (each.cancelledAt === undefined ? [] : [each])),
        ).toEqual(
          (scenario.cut ?? []).map((index) =>
            expect.objectContaining({ attempt: index, cancelledAt: cutover }),
          ),
        )
        expect(real.result.ready?.rung ?? null).toBe(scenario.rung)
      })
})
