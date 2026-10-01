/**
 * The session's failure ladder: a first carry-in attempt, up to three carry-in retries with fresh
 * seeds, one standalone retry without carry-in whose register stays the session's resolved one,
 * a repeat of the phrase before decided at the deadline, dropped stale results, and a session that
 * never ends because of any of it.
 */

import { describe, expect, it } from 'vitest'

import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import type { SessionPhrase } from '@/session/session-types'
import { SessionDriver, kinds, phraseOneFor, sessionSettings, successFor } from './session-harness'

/** Intent: a driver at 60 BPM (a 4 s measure, phrase 2's deadline at 4) with a Varying register. */
function varyingDriver(): SessionDriver {
  const settings = sessionSettings({ tempo: 60, register: 'Varying' })
  return new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
}

// @test-link [[rule_session_generation_failure_ladder]]
// @test-link [[rule_look_ahead_phrase_must_fit_staff]]
// @test-link [[rule_varying_register_once_per_session]]
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
    expect(driver.tick(4)).toEqual([])
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

// @test-link [[rule_session_generation_failure_ladder]]
// @test-link [[rule_repeat_phrase_marked_internally_only]]
// @test-link [[rule_session_never_pauses]]
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
    expect(driver.tick(4)).toEqual([{ kind: 'phrase-ready', phrase: repeat }])
    driver.countInOver(4)
    const atTwo = driver.sounding(20, 2)
    expect(atTwo[0]).toEqual({ kind: 'phrase-sounding', at: 20, phrase: repeat })
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
    expect(kinds(driver.tick(4))).toEqual(['phrase-ready'])
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
    ])
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  it('retries no more once the deadline has passed with a fit check pending', () => {
    const driver = varyingDriver()
    driver.succeed(3.9)
    expect(kinds(driver.fit(4.2, false))).toEqual(['phrase-ready'])
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
    ])
  })
})

// @test-link [[rule_session_generation_failure_ladder]]
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
