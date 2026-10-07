/**
 * The time-aware failure ladder in the engine: every carry-in request wakes the engine at its
 * phrase's cutover time (the deadline minus the standalone reserve); from that time a carry-in
 * attempt still generating is cancelled and the standalone attempt requested at once, a failed
 * carry-in attempt is followed by the standalone attempt, and a phrase requested within the
 * reserve starts standalone. However it is reached, the standalone attempt has the request id and
 * seed it would have had after three failed carry-in retries. Mostly at 60 BPM (phrase 2's
 * deadline at 4 s, its cutover at 2.925 s).
 */

import { describe, expect, it } from 'vitest'

import { cutoverAt } from '@/session/session-timing'
import type { SessionOutput } from '@/session/session-types'
import { soundingAt } from './scripted-session'
import {
  SessionDriver,
  kinds,
  phraseOneFor,
  sessionSettings,
  withoutTempo,
  type GenerationRequestOutput,
} from './session-harness'
import { SHAPED, requestIn, settingsWith, threeRequested } from './settings-change-session'

/** Phrase 2's deadline and cutover time in a 60 BPM session started at 0. */
const DEADLINE = 4
const CUTOVER = cutoverAt(DEADLINE)

/** Intent: a driver at a tempo (60 BPM by default) started at 0. */
function driverAt(tempo = 60): SessionDriver {
  const settings = sessionSettings({ tempo })
  return new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
}

/**
 * Intent: phrase 2's standalone request in a 60 BPM reference session whose four carry-in
 * attempts all failed before the cutover, so every carry-in retry ran.
 */
function standaloneAfterThreeRetries(): GenerationRequestOutput {
  const reference = driverAt()
  for (let rung = 0; rung < 4; rung += 1) reference.fail(0.1 * (rung + 1))
  const standalone = reference.lastRequest()
  expect(standalone).toMatchObject({ step: 'standalone', retry: 4, attemptId: 5 })
  return standalone
}

/** Intent: check a request is phrase 2's standalone attempt, built as the reference's is. */
function expectReferenceStandalone(request: GenerationRequestOutput): void {
  const reference = standaloneAfterThreeRetries()
  expect(request).toMatchObject({ phraseNumber: 2, step: 'standalone', retry: 4 })
  expect(request.intent.requestId).toBe(reference.intent.requestId)
  expect(request.intent.seed).toBe(reference.intent.seed)
  expect(withoutTempo(request.intent)).toEqual(withoutTempo(reference.intent))
}

/** Intent: the cutover's outputs for a carry-in attempt: its cancellation, then the standalone request. */
function expectCutover(outputs: readonly SessionOutput[], cancelled: number): void {
  expect(kinds(outputs)).toEqual(['cancel-generation', 'request-generation'])
  expect(outputs[0]).toEqual({ kind: 'cancel-generation', attemptId: cancelled })
  expectReferenceStandalone(requestIn(outputs))
}

// @test-link [[rule_session_generation_failure_ladder]]
// @test-link [[module_session_failure_ladder]]
describe('waking at the cutover', () => {
  // @test-link [[rule_session_generation_failure_ladder]]
  it('wakes at the cutover and at the deadline for the first carry-in request', () => {
    const driver = driverAt()
    expect(driver.startOutputs).toEqual([
      expect.objectContaining({ kind: 'request-generation', step: 'carry-in', retry: 0 }),
      { kind: 'wake-at', at: CUTOVER },
      { kind: 'wake-at', at: DEADLINE },
    ])
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  it('wakes at the cutover again for every carry-in retry, and never for a standalone request', () => {
    const driver = driverAt()
    expect(driver.fail(0.1)).toEqual([
      expect.objectContaining({ kind: 'request-generation', step: 'carry-in', retry: 1 }),
      { kind: 'wake-at', at: CUTOVER },
    ])
    driver.fail(0.2, undefined, 'no_legal_pitch_plan')
    expect(driver.lastRequest()).toMatchObject({ step: 'standalone', retry: 4 })
    expect(driver.all('wake-at').map((wake) => wake.at)).toEqual([CUTOVER, DEADLINE, CUTOVER])
  })
})

// @test-link [[rule_session_generation_failure_ladder]]
// @test-link [[rule_dropped_attempt_cancelled]]
// @test-link [[module_session_failure_ladder]]
describe('cutting a carry-in attempt over to the standalone attempt', () => {
  // @test-link [[rule_session_generation_failure_ladder]]
  // @test-link [[rule_dropped_attempt_cancelled]]
  it('cancels the first carry-in attempt at the cutover and requests the standalone one at once', () => {
    const driver = driverAt()
    expect(driver.tick(CUTOVER - 0.001)).toEqual([])
    expectCutover(driver.tick(CUTOVER), 1)
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  // @test-link [[rule_dropped_attempt_cancelled]]
  it('cancels a later carry-in retry at the cutover, with the same standalone request', () => {
    const driver = driverAt()
    driver.fail(0.1)
    driver.crash(0.2)
    expect(driver.lastRequest()).toMatchObject({ step: 'carry-in', retry: 2, attemptId: 3 })
    expectCutover(driver.tick(CUTOVER + 0.01), 3)
  })

  // @test-link [[rule_dropped_attempt_cancelled]]
  it("drops every late result of the cut-over attempt and keeps the standalone attempt's ladder", () => {
    const driver = driverAt()
    const cancelled = driver.lastRequest()
    driver.tick(CUTOVER)
    const standalone = driver.lastRequest()
    expect(driver.succeed(3, cancelled)).toEqual([])
    expect(driver.crash(3, cancelled.attemptId)).toEqual([])
    expect(driver.fail(3.1, cancelled.attemptId)).toEqual([])
    expect(kinds(driver.accept(3.2))).toEqual(['check-fit', 'phrase-ready'])
    expect(driver.all('phrase-ready')[0]!.phrase).toMatchObject({ origin: 'standalone' })
    expect(driver.all('phrase-ready')[0]!.phrase.intent).toBe(standalone.intent)
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  it('cuts over on any event at or after the cutover, not only on its wake-up', () => {
    const driver = driverAt()
    const outputs = driver.controller(CUTOVER + 0.2, false)
    expectCutover(outputs, 1)
  })
})

// @test-link [[rule_session_generation_failure_ladder]]
// @test-link [[module_session_failure_ladder]]
describe('a failure or a success around the cutover', () => {
  // @test-link [[rule_session_generation_failure_ladder]]
  it('follows a carry-in failure before the cutover with the next carry-in retry', () => {
    const driver = driverAt()
    driver.fail(CUTOVER - 0.01, undefined, 'search_limit_exceeded')
    expect(driver.lastRequest()).toMatchObject({ step: 'carry-in', retry: 1 })
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  it.each([0, 0.3])(
    'follows a carry-in failure %f s after the cutover with the standalone attempt, cancelling nothing',
    (after) => {
      const driver = driverAt()
      const outputs = driver.fail(CUTOVER + after, undefined, 'search_limit_exceeded')
      expect(kinds(outputs)).toEqual(['request-generation'])
      expectReferenceStandalone(requestIn(outputs))
    },
  )

  // @test-link [[rule_session_generation_failure_ladder]]
  it('follows a crash or a phrase that does not fit after the cutover with the standalone attempt', () => {
    const crashed = driverAt()
    expectReferenceStandalone(requestIn(crashed.crash(CUTOVER + 0.1)))
    const unfit = driverAt()
    unfit.succeed(CUTOVER - 0.1)
    expect(unfit.tick(CUTOVER)).toEqual([])
    expectReferenceStandalone(requestIn(unfit.fit(CUTOVER + 0.1, false)))
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  it('keeps a carry-in success that arrives at the cutover, before the cutover has run', () => {
    const driver = driverAt()
    expect(kinds(driver.succeed(CUTOVER))).toEqual(['check-fit'])
    expect(driver.tick(CUTOVER + 0.1)).toEqual([])
    const [ready] = driver.fit(CUTOVER + 0.2, true)
    expect(ready).toMatchObject({ kind: 'phrase-ready', phrase: { origin: 'carry-in' } })
    expect(driver.all('cancel-generation')).toEqual([])
  })
})

// @test-link [[rule_session_generation_failure_ladder]]
// @test-link [[module_session_failure_ladder]]
describe('when the cutover does nothing', () => {
  // @test-link [[module_session_failure_ladder]]
  it('does nothing with the standalone attempt in flight, or with the ladder exhausted', () => {
    const driver = driverAt()
    driver.tick(CUTOVER)
    expect(driver.tick(CUTOVER + 0.5)).toEqual([])
    driver.fail(CUTOVER + 0.6)
    expect(driver.tick(CUTOVER + 0.7)).toEqual([])
    const exhausted = driverAt()
    exhausted.exhaust(0.5)
    expect(exhausted.tick(CUTOVER)).toEqual([])
  })

  // @test-link [[module_session_failure_ladder]]
  it('does nothing once the phrase is decided, or after the end', () => {
    const decided = driverAt()
    decided.accept(1)
    expect(decided.tick(CUTOVER)).toEqual([])
    const ended = driverAt()
    ended.end(1)
    expect(ended.tick(CUTOVER)).toEqual([])
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  it('never cuts over a phrase whose every attempt is standalone', () => {
    const driver = threeRequested(false)
    const deadline = soundingAt(2) + 3
    requestIn(driver.change(soundingAt(2) + 1, settingsWith({ register: 'High' })))
    const request = driver.lastRequest()
    expect(request).toMatchObject({ phraseNumber: 3, step: 'standalone', retry: 0 })
    expect(driver.tick(cutoverAt(deadline))).toEqual([])
    driver.fail(cutoverAt(deadline) + 0.1)
    expect(driver.lastRequest()).toMatchObject({ phraseNumber: 3, step: 'standalone', retry: 1 })
  })
})

// @test-link [[rule_session_generation_failure_ladder]]
// @test-link [[module_session_failure_ladder]]
describe('a phrase requested within the standalone reserve', () => {
  // @test-link [[rule_session_generation_failure_ladder]]
  it("requests phrase 2's standalone attempt first at 240 BPM, as after three failed retries", () => {
    const driver = driverAt(240)
    expect(kinds(driver.startOutputs)).toEqual(['request-generation', 'wake-at'])
    const request = driver.lastRequest()
    expect(request).toMatchObject({ attemptId: 1, deadline: 1 })
    expectReferenceStandalone(request)
    expect(driver.startOutputs[1]).toEqual({ kind: 'wake-at', at: 1 })
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  it('requests a superseded phrase again standalone first after the cutover, as after three failed retries', () => {
    const late = threeRequested(false)
    const deadline = soundingAt(2) + 3
    const old = late.lastRequest()
    const outputs = late.change(deadline - 1, SHAPED)
    expect(kinds(outputs)).toEqual(['cancel-generation', 'settings-changed', 'request-generation'])
    expect(outputs[0]).toEqual({ kind: 'cancel-generation', attemptId: old.attemptId })
    const standalone = requestIn(outputs)
    expect(standalone).toMatchObject({ phraseNumber: 3, step: 'standalone', retry: 4 })

    const reference = threeRequested(false)
    reference.change(soundingAt(2) + 1, SHAPED)
    for (let rung = 0; rung < 4; rung += 1) reference.fail(soundingAt(2) + 1.1 + rung / 10)
    const expected = reference.lastRequest()
    expect(expected).toMatchObject({ phraseNumber: 3, step: 'standalone', retry: 4 })
    expect(standalone.intent).toEqual(expected.intent)
  })
})

// @test-link [[rule_session_generation_failure_ladder]]
describe('determinism of the time-aware ladder', () => {
  /** Intent: run one event list with a cutover, a late result and a failed fit; its outputs. */
  function run(): readonly SessionOutput[] {
    const driver = driverAt()
    driver.fail(0.5)
    const cancelled = driver.lastRequest()
    driver.tick(CUTOVER)
    driver.succeed(3, cancelled)
    driver.succeed(3.1)
    driver.fit(3.2, false)
    driver.tick(DEADLINE)
    return driver.log
  }

  // @test-link [[rule_session_generation_failure_ladder]]
  it('gives the same outputs for the same event list', () => {
    const outputs = run()
    expect(kinds(outputs)).toContain('cancel-generation')
    expect(run()).toEqual(outputs)
  })
})
