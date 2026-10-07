/**
 * The engine's session lifecycle: how a session ends during the count-in or while running, what it
 * accepts after its end, the events it refuses as caller bugs, and the immutability of everything
 * it returns.
 */

import { describe, expect, it } from 'vitest'

import { SessionEngineError, type SessionEndCause } from '@/session/session-types'
import { SessionDriver, kinds, phraseOneFor, sessionSettings, successFor } from './session-harness'

const CAUSES: readonly SessionEndCause[] = [
  'stop',
  'hidden-tab',
  'staff-not-shown',
  'silence-timeout',
  'controller-lost',
]

/** Intent: a driver at a tempo started at 0, so phrase 2's deadline is one measure later. */
function driverAt(tempo: number): SessionDriver {
  const settings = sessionSettings({ tempo })
  return new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
}

/** Intent: a driver at 240 BPM (a 1 s measure) started at 0, so phrase 2's deadline is 1. */
function fastDriver(): SessionDriver {
  return driverAt(240)
}

// @test-link [[rule_count_in_ending_returns_to_idle]]
// @test-link [[rule_stop_ends_session]]
// @test-link [[rule_hidden_tab_ends_session]]
// @test-link [[rule_silence_timeout_ends_session]]
// @test-link [[rule_controller_reconnection_window]]
describe('ending a session', () => {
  // @test-link [[rule_count_in_ending_returns_to_idle]]
  // @test-link [[rule_silence_timeout_ends_session]]
  // @test-link [[rule_controller_reconnection_window]]
  it.each(CAUSES)('ends during the count-in with no phrase sounded (%s)', (cause) => {
    const driver = fastDriver()
    const { attemptId } = driver.lastRequest()
    expect(driver.end(0.5, cause)).toEqual([
      { kind: 'cancel-generation', attemptId },
      { kind: 'ended', at: 0.5, cause, phase: 'count-in', soundedPhraseCount: 0 },
    ])
  })

  // @test-link [[rule_stop_ends_session]]
  // @test-link [[rule_hidden_tab_ends_session]]
  // @test-link [[rule_silence_timeout_ends_session]]
  // @test-link [[rule_controller_reconnection_window]]
  it.each(CAUSES)('ends while running with the phrases that sounded (%s)', (cause) => {
    const driver = fastDriver()
    driver.accept(0.5)
    driver.countInOver(1)
    driver.sounding(5, 2)
    const { attemptId } = driver.lastRequest()
    expect(driver.end(6, cause)).toEqual([
      { kind: 'cancel-generation', attemptId },
      { kind: 'ended', at: 6, cause, phase: 'running', soundedPhraseCount: 2 },
    ])
  })

  // @test-link [[rule_stop_ends_session]]
  it('drops results and ticks after the end, and refuses every other event', () => {
    const driver = fastDriver()
    driver.countInOver(1)
    driver.end(2)
    expect(driver.succeed(2.1)).toEqual([])
    expect(driver.fail(2.1)).toEqual([])
    expect(driver.crash(2.1)).toEqual([])
    expect(driver.fit(2.1, true)).toEqual([])
    expect(driver.tick(9)).toEqual([])
    expect(() => driver.sounding(9, 2)).toThrow(SessionEngineError)
    expect(() => driver.countInOver(9)).toThrow(SessionEngineError)
    expect(() => driver.end(9)).toThrow(SessionEngineError)
  })

  // @test-link [[module_session_look_ahead_timing]]
  // @test-link [[rule_stop_ends_session]]
  it('decides no repeat when the end arrives after a passed deadline with nothing ready', () => {
    const driver = fastDriver()
    expect(driver.end(1.5)).toEqual([
      { kind: 'cancel-generation', attemptId: driver.lastRequest().attemptId },
      { kind: 'ended', at: 1.5, cause: 'stop', phase: 'count-in', soundedPhraseCount: 0 },
    ])
    expect(driver.all('phrase-ready')).toEqual([])
  })

  // @test-link [[module_session_struggling_notice]]
  // @test-link [[rule_stop_ends_session]]
  it('only clears a shown notice when the end arrives after a passed deadline with nothing ready', () => {
    const driver = fastDriver()
    driver.tick(1)
    driver.countInOver(1)
    driver.sounding(5, 2)
    driver.tick(8)
    driver.sounding(9, 3)
    expect(driver.all('struggling-notice')).toEqual([{ kind: 'struggling-notice', visible: true }])
    const readyBefore = driver.all('phrase-ready').length
    expect(driver.end(12.5)).toEqual([
      { kind: 'cancel-generation', attemptId: driver.lastRequest().attemptId },
      { kind: 'struggling-notice', visible: false },
      { kind: 'ended', at: 12.5, cause: 'stop', phase: 'running', soundedPhraseCount: 3 },
    ])
    expect(driver.all('phrase-ready')).toHaveLength(readyBefore)
  })
})

// @test-link [[service_session_engine]]
// @test-link [[req_rolling_practice_session]]
describe('events the engine refuses', () => {
  // @test-link [[service_session_engine]]
  it('throws when a phrase other than the next ready one starts sounding', () => {
    const driver = fastDriver()
    driver.accept(0.5)
    expect(() => driver.sounding(1, 2)).toThrow(SessionEngineError)
    driver.countInOver(1)
    expect(() => driver.sounding(5, 3)).toThrow(SessionEngineError)
    expect(() => driver.sounding(5, 1)).toThrow(SessionEngineError)
    driver.sounding(5, 2)
    expect(() => driver.sounding(6, 3)).toThrow(SessionEngineError)
  })

  // @test-link [[service_session_engine]]
  it('throws on a second count-in end and on time running backwards', () => {
    const driver = fastDriver()
    driver.countInOver(1)
    expect(() => driver.countInOver(1)).toThrow(SessionEngineError)
    expect(() => driver.tick(0.5)).toThrow(SessionEngineError)
  })

  // @test-link [[service_session_engine]]
  it('throws on a second result for the attempt whose fit check is pending', () => {
    const driver = fastDriver()
    driver.succeed(0.2)
    expect(() => driver.succeed(0.3)).toThrow(SessionEngineError)
  })

  // @test-link [[service_session_engine]]
  it('throws on a fit result for an attempt still generating', () => {
    const driver = fastDriver()
    expect(() => driver.fit(0.2, true)).toThrow(SessionEngineError)
  })
})

// @test-link [[req_rolling_practice_session]]
// @test-link [[service_session_engine]]
describe('a rolling session', () => {
  // @test-link [[req_rolling_practice_session]]
  it('keeps one phrase ahead, phrase after phrase, with increasing attempt ids', () => {
    const driver = fastDriver()
    driver.accept(0.5)
    driver.countInOver(1)
    for (let phraseNumber = 2; phraseNumber <= 5; phraseNumber += 1) {
      const at = 1 + 4 * (phraseNumber - 1)
      // Phrase 2's tempo was fixed at the count-in's end; each later one when it starts sounding.
      // Each carry-in request asks to be woken at its cutover time, then at its deadline.
      expect(kinds(driver.sounding(at, phraseNumber))).toEqual([
        ...(phraseNumber > 2 ? ['phrase-tempo'] : []),
        'phrase-sounding',
        'request-generation',
        'wake-at',
        'wake-at',
      ])
      driver.accept(at + 0.5)
    }
    expect(driver.requests().map((request) => request.phraseNumber)).toEqual([2, 3, 4, 5, 6])
    expect(driver.requests().map((request) => request.attemptId)).toEqual([1, 2, 3, 4, 5])
    // Phrase 2's one-measure deadline at 240 BPM is within the standalone reserve.
    expect(driver.all('phrase-ready').map((ready) => ready.phrase.origin)).toEqual([
      'standalone',
      'carry-in',
      'carry-in',
      'carry-in',
      'carry-in',
    ])
  })

  // @test-link [[service_session_engine]]
  it("asks to fit-check each attempt with that attempt's own intent, the standalone retry's included", () => {
    const driver = driverAt(60)
    const first = driver.lastRequest()
    expect(driver.succeed(0.1)).toEqual([
      {
        kind: 'check-fit',
        attemptId: first.attemptId,
        phraseNumber: 2,
        outcome: successFor(first.intent),
        intent: first.intent,
      },
    ])
    driver.fit(0.1, false)
    for (const at of [0.2, 0.3, 0.4]) driver.fail(at)
    const standalone = driver.lastRequest()
    expect(standalone.step).toBe('standalone')
    expect(standalone.intent).not.toEqual(first.intent)
    const [check] = driver.succeed(0.5)
    expect(check).toEqual({
      kind: 'check-fit',
      attemptId: standalone.attemptId,
      phraseNumber: 2,
      outcome: successFor(standalone.intent),
      intent: standalone.intent,
    })
    expect(check?.kind === 'check-fit' && check.intent).toBe(standalone.intent)
  })

  // @test-link [[service_session_engine]]
  it('returns deeply frozen outputs', () => {
    const driver = fastDriver()
    const outputs = driver.accept(0.5)
    expect(Object.isFrozen(driver.startOutputs)).toBe(true)
    expect(Object.isFrozen(outputs[0])).toBe(true)
    const ready = outputs[1]!
    expect(Object.isFrozen(ready.kind === 'phrase-ready' && ready.phrase)).toBe(true)
    expect(Object.isFrozen(driver.lastRequest().intent)).toBe(true)
  })
})
