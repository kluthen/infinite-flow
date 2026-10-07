/**
 * The session's failure ladder: a first carry-in attempt, up to three carry-in retries with fresh
 * seeds, one standalone retry without carry-in whose register stays the session's resolved one,
 * a repeat of the phrase before decided at the deadline, dropped stale results, and a session that
 * never ends because of any of it.
 */

import { describe, expect, it } from 'vitest'

import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import type { GenerationFailureCode } from '@/domain/generation/orchestration/orchestration-types'
import {
  LADDER,
  rungAfterFailure,
  rungsSkipped,
  type AttemptFailure,
} from '@/session/failure-ladder'
import type { SessionPhrase } from '@/session/session-types'
import { soundingAt } from './scripted-session'
import {
  SessionDriver,
  kinds,
  phraseOneFor,
  sessionSettings,
  successFor,
  type GenerationRequestOutput,
} from './session-harness'
import { requestIn, settingsWith, threeRequested } from './settings-change-session'

/** Intent: a driver at 60 BPM (a 4 s measure, phrase 2's deadline at 4) with a Varying register. */
function varyingDriver(): SessionDriver {
  const settings = sessionSettings({ tempo: 60, register: 'Varying' })
  return new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
}

// @test-link [[rule_session_generation_failure_ladder]]
// @test-link [[rule_look_ahead_phrase_must_fit_staff]]
// @test-link [[rule_varying_register_once_per_session]]
// @test-link [[module_session_failure_ladder]]
describe('failure ladder before the deadline', () => {
  // @test-link [[rule_session_generation_failure_ladder]]
  // @test-link [[rule_varying_register_once_per_session]]
  it('climbs three carry-in retries through mixed failures, then one standalone retry', () => {
    const driver = varyingDriver()
    driver.fail(0.1)
    driver.crash(0.2)
    expect(kinds(driver.succeed(0.3))).toEqual(['check-fit'])
    expect(kinds(driver.fit(0.3, false))).toEqual(['request-generation'])
    driver.fail(0.4)

    const requests = driver.requests(2)
    expect(requests.map(({ step, retry }) => ({ step, retry }))).toEqual([
      { step: 'carry-in', retry: 0 },
      { step: 'carry-in', retry: 1 },
      { step: 'carry-in', retry: 2 },
      { step: 'carry-in', retry: 3 },
      { step: 'standalone', retry: 4 },
    ])
    expect(requests.map((request) => request.attemptId)).toEqual([1, 2, 3, 4, 5])
    expect(new Set(requests.map((request) => request.intent.seed)).size).toBe(5)
    const carryIn = requests[0]!.intent.carryIn
    for (const request of requests.slice(0, 4)) expect(request.intent.carryIn).toEqual(carryIn)

    const standalone = requests[4]!.intent
    expect(standalone.carryIn).toBeUndefined()
    const resolved = driver.phraseOne.outcome.request
    expect(resolved.registerWindow).toEqual(carryIn!.registerWindow)
    expect(standalone.controls.register).toBe(resolved.register)
    expect(driver.all('ended')).toEqual([])
  })

  // @test-link [[rule_look_ahead_phrase_must_fit_staff]]
  it('shows a successful phrase only once its fit check passes', () => {
    const driver = varyingDriver()
    const request = driver.lastRequest()
    const outcome = successFor(request.intent)
    expect(driver.succeed(0.1)).toEqual([
      {
        kind: 'check-fit',
        attemptId: request.attemptId,
        phraseNumber: 2,
        outcome,
        intent: request.intent,
      },
    ])
    expect(driver.fit(0.2, true)).toEqual([
      {
        kind: 'phrase-ready',
        phrase: { phraseNumber: 2, origin: 'carry-in', intent: request.intent, outcome },
      },
    ])
    expect(driver.tick(4)).toEqual([{ kind: 'phrase-tempo', phraseNumber: 2, tempo: 60 }])
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  it('keeps the standalone phrase and carries in from it with its own phrase number', () => {
    const driver = varyingDriver()
    for (let rung = 0; rung < 4; rung += 1) driver.fail(0.1 * (rung + 1))
    const standalone = driver.lastRequest()
    const ready = driver.accept(0.6)
    const phrase = ready.find((output) => output.kind === 'phrase-ready')
    expect(phrase).toMatchObject({ phrase: { phraseNumber: 2, origin: 'standalone' } })
    driver.countInOver(4)
    driver.sounding(20, 2)
    expect(driver.lastRequest().intent.carryIn).toEqual(
      deriveCarryIn({
        intent: standalone.intent,
        outcome: successFor(standalone.intent),
        phraseNumber: 2,
      }),
    )
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  it('requests nothing after the standalone retry fails', () => {
    const driver = varyingDriver()
    driver.exhaust(0.5)
    expect(driver.requests(2)).toHaveLength(5)
    expect(driver.tick(3.9)).toEqual([])
  })
})

/** Intent: the step and retry of each request, for compact ladder assertions. */
function rungsOf(requests: readonly GenerationRequestOutput[]): readonly object[] {
  return requests.map(({ step, retry }) => ({ step, retry }))
}

/**
 * Intent: the standalone request of phrase 2 on a driver like `varyingDriver`'s whose four carry-in
 * attempts were all stopped by their search allowance, so every carry-in retry ran.
 */
function standaloneAfterThreeRetries(): GenerationRequestOutput {
  const reference = varyingDriver()
  for (let rung = 0; rung < 4; rung += 1)
    reference.fail(0.1 * (rung + 1), undefined, 'search_limit_exceeded')
  const standalone = reference.lastRequest()
  expect(standalone).toMatchObject({ step: 'standalone', retry: 4, attemptId: 5 })
  return standalone
}

/** Intent: one way to fail the latest attempt of a driver. */
type FailAttempt = (driver: SessionDriver, at: number) => void

/** The failures that keep their carry-in retries, by name. */
const RETRIED_FAILURES: readonly (readonly [string, FailAttempt])[] = [
  [
    'a search allowance cutoff',
    (driver, at) => driver.fail(at, undefined, 'search_limit_exceeded'),
  ],
  ['a validation failure', (driver, at) => driver.fail(at, undefined, 'result_validation_failed')],
  ['a rejected request', (driver, at) => driver.crash(at)],
  [
    'a phrase that does not fit',
    (driver, at) => {
      driver.succeed(at)
      driver.fit(at, false)
    },
  ],
]

// @test-link [[rule_session_generation_failure_ladder]]
// @test-link [[module_session_failure_ladder]]
describe('skipping carry-in retries after an exhausted carry-in search', () => {
  // @test-link [[rule_session_generation_failure_ladder]]
  // @test-link [[module_session_failure_ladder]]
  it('follows an exhausted carry-in search directly with the standalone retry', () => {
    const driver = varyingDriver()
    const outputs = driver.fail(0.1, undefined, 'no_legal_pitch_plan')
    expect(kinds(outputs)).toEqual(['request-generation'])
    const requests = driver.requests(2)
    expect(rungsOf(requests)).toEqual([
      { step: 'carry-in', retry: 0 },
      { step: 'standalone', retry: 4 },
    ])
    expect(requests.map((request) => request.attemptId)).toEqual([1, 2])
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  // @test-link [[module_session_failure_ladder]]
  it('generates the same standalone intent as after three failed carry-in retries', () => {
    const driver = varyingDriver()
    driver.fail(0.1, undefined, 'no_legal_pitch_plan')
    const skipped = driver.lastRequest()
    const reference = standaloneAfterThreeRetries()
    expect(skipped.intent).toEqual(reference.intent)
    expect(skipped.intent.seed).toBe(reference.intent.seed)
    expect(skipped.intent.requestId).toBe(reference.intent.requestId)
    expect(skipped.intent.controls).toEqual(reference.intent.controls)
    expect(skipped.intent.carryIn).toBeUndefined()
    expect(skipped.intent.controls.register).toBe(driver.phraseOne.outcome.request.register)
    expect(skipped.deadline).toBe(reference.deadline)
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  it.each(RETRIED_FAILURES)('climbs every carry-in retry after %s', (_name, failAttempt) => {
    const driver = varyingDriver()
    for (let rung = 0; rung < 4; rung += 1) failAttempt(driver, 0.1 * (rung + 1))
    expect(rungsOf(driver.requests(2))).toEqual(LADDER)
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  // @test-link [[module_session_failure_ladder]]
  it('skips the remaining carry-in retries when a later retry exhausts its search', () => {
    const driver = varyingDriver()
    driver.fail(0.1, undefined, 'search_limit_exceeded')
    driver.fail(0.2, undefined, 'no_legal_pitch_plan')
    const requests = driver.requests(2)
    expect(rungsOf(requests)).toEqual([
      { step: 'carry-in', retry: 0 },
      { step: 'carry-in', retry: 1 },
      { step: 'standalone', retry: 4 },
    ])
    expect(requests.map((request) => request.attemptId)).toEqual([1, 2, 3])
    expect(requests[2]!.intent).toEqual(standaloneAfterThreeRetries().intent)
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  // @test-link [[module_session_failure_ladder]]
  it('never skips a rung of a phrase whose every attempt is standalone', () => {
    const driver = threeRequested(false)
    requestIn(driver.change(soundingAt(2) + 1, settingsWith({ register: 'Low' })))
    for (let retry = 0; retry < 5; retry += 1) {
      expect(driver.lastRequest()).toMatchObject({ phraseNumber: 3, step: 'standalone', retry })
      driver.fail(soundingAt(2) + 1.1 + retry / 10, undefined, 'no_legal_pitch_plan')
    }
    expect(
      driver
        .requests(3)
        .slice(-5)
        .map((request) => request.retry),
    ).toEqual([0, 1, 2, 3, 4])
  })
})

/** Intent: a generation failure with the given code. */
function generationFailure(code: GenerationFailureCode): AttemptFailure {
  return { kind: 'generation-failure', code }
}

// @test-link [[rule_session_generation_failure_ladder]]
// @test-link [[module_session_failure_ladder]]
describe('the rung after a failed attempt', () => {
  const [first, second, third, fourth, standalone] = LADDER

  // @test-link [[rule_session_generation_failure_ladder]]
  // @test-link [[module_session_failure_ladder]]
  it('goes straight to the standalone rung after any carry-in attempt that exhausted its search', () => {
    for (const rung of [first!, second!, third!, fourth!]) {
      const next = rungAfterFailure(
        { rung, step: 'carry-in' },
        generationFailure('no_legal_pitch_plan'),
      )
      expect(next).toBe(standalone)
    }
    expect(rungsSkipped(first!, standalone!)).toBe(3)
    expect(rungsSkipped(second!, standalone!)).toBe(2)
    expect(rungsSkipped(fourth!, standalone!)).toBe(0)
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  // @test-link [[module_session_failure_ladder]]
  it('goes to the next rung after every other failure of a carry-in attempt', () => {
    const failures: readonly AttemptFailure[] = [
      generationFailure('search_limit_exceeded'),
      generationFailure('result_validation_failed'),
      generationFailure('no_legal_harmony_plan'),
      generationFailure('no_legal_rhythm_plan'),
      { kind: 'crash' },
      { kind: 'not-fitting' },
    ]
    for (const failure of failures) {
      expect(rungAfterFailure({ rung: first!, step: 'carry-in' }, failure)).toBe(second)
      expect(rungAfterFailure({ rung: fourth!, step: 'carry-in' }, failure)).toBe(standalone)
    }
    expect(rungsSkipped(first!, second!)).toBe(0)
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  // @test-link [[module_session_failure_ladder]]
  it('never skips a rung of a standalone attempt, and ends after the standalone rung', () => {
    const exhausted = generationFailure('no_legal_pitch_plan')
    expect(rungAfterFailure({ rung: first!, step: 'standalone' }, exhausted)).toBe(second)
    expect(rungAfterFailure({ rung: third!, step: 'standalone' }, exhausted)).toBe(fourth)
    expect(rungAfterFailure({ rung: standalone!, step: 'standalone' }, exhausted)).toBeUndefined()
    expect(
      rungAfterFailure({ rung: standalone!, step: 'standalone' }, { kind: 'crash' }),
    ).toBeUndefined()
  })
})

// @test-link [[rule_session_generation_failure_ladder]]
// @test-link [[rule_repeat_phrase_marked_internally_only]]
// @test-link [[rule_session_never_pauses]]
// @test-link [[module_session_failure_ladder]]
describe('repeat at the deadline', () => {
  // @test-link [[rule_session_generation_failure_ladder]]
  // @test-link [[rule_repeat_phrase_marked_internally_only]]
  it('repeats the phrase before at the deadline, not earlier, when the ladder is exhausted', () => {
    const driver = varyingDriver()
    driver.exhaust(0.5)
    expect(driver.tick(3.99)).toEqual([])
    const repeat: SessionPhrase = {
      phraseNumber: 2,
      origin: 'repeat',
      intent: driver.phraseOne.intent,
      outcome: driver.phraseOne.outcome,
      repeatOf: 1,
    }
    expect(driver.tick(4)).toEqual([
      { kind: 'phrase-ready', phrase: repeat },
      { kind: 'phrase-tempo', phraseNumber: 2, tempo: 60 },
    ])
    driver.countInOver(4)
    const atTwo = driver.sounding(20, 2)
    expect(atTwo[0]).toEqual({ kind: 'phrase-sounding', at: 20, phrase: repeat, tempo: 60 })
    expect(driver.lastRequest()).toMatchObject({ phraseNumber: 3, step: 'carry-in', retry: 0 })
    expect(driver.lastRequest().intent.carryIn).toEqual(
      deriveCarryIn({ ...driver.phraseOne, phraseNumber: 2 }),
    )
    expect(driver.all('ended')).toEqual([])
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  it('drops an attempt still in flight at the deadline, and its later result', () => {
    const driver = varyingDriver()
    driver.fail(0.1)
    expect(kinds(driver.tick(4))).toEqual(['phrase-ready', 'phrase-tempo'])
    expect(driver.succeed(4.5)).toEqual([])
    expect(driver.requests(2)).toHaveLength(2)
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  it('treats a result at the deadline as too late and repeats instead', () => {
    const driver = varyingDriver()
    const outputs = driver.succeed(4)
    expect(outputs).toEqual([
      expect.objectContaining({
        kind: 'phrase-ready',
        phrase: expect.objectContaining({ origin: 'repeat', repeatOf: 1 }),
      }),
      { kind: 'phrase-tempo', phraseNumber: 2, tempo: 60 },
    ])
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  it('retries no more once the deadline has passed with a fit check pending', () => {
    const driver = varyingDriver()
    driver.succeed(3.9)
    expect(kinds(driver.fit(4.2, false))).toEqual(['phrase-ready', 'phrase-tempo'])
    expect(driver.requests(2)).toHaveLength(1)
  })

  // @test-link [[rule_repeat_phrase_marked_internally_only]]
  it('names the repeated phrase when a repeat is repeated', () => {
    const driver = varyingDriver()
    driver.tick(4)
    driver.countInOver(4)
    driver.sounding(20, 2)
    const repeated = driver.tick(32)
    expect(repeated).toEqual([
      expect.objectContaining({
        kind: 'phrase-ready',
        phrase: expect.objectContaining({ phraseNumber: 3, origin: 'repeat', repeatOf: 2 }),
      }),
      { kind: 'struggling-notice', visible: true },
      { kind: 'phrase-tempo', phraseNumber: 3, tempo: 60 },
    ])
  })
})

// @test-link [[rule_session_generation_failure_ladder]]
// @test-link [[module_session_failure_ladder]]
describe('stale results', () => {
  // @test-link [[rule_session_generation_failure_ladder]]
  it('drops results and fit checks for superseded or unknown attempts', () => {
    const driver = varyingDriver()
    driver.fail(0.1)
    expect(driver.fail(0.2, 1)).toEqual([])
    expect(driver.fit(0.2, true, 1)).toEqual([])
    expect(driver.crash(0.2, 99)).toEqual([])
    expect(driver.requests(2)).toHaveLength(2)
    expect(kinds(driver.accept(0.3))).toEqual(['check-fit', 'phrase-ready'])
    expect(driver.succeed(0.4, driver.requests(2)[0]!)).toEqual([])
  })
})
