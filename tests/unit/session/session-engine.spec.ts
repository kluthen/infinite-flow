/**
 * The engine's session lifecycle: how a session ends during the count-in or while running, what it
 * accepts after its end, the events it refuses as caller bugs, and the immutability of everything
 * it returns.
 */

import { describe, expect, it } from 'vitest'

import { SessionEngineError, type SessionEndCause } from '@/session/session-types'
import { SessionDriver, kinds, phraseOneFor, sessionSettings } from './session-harness'

const CAUSES: readonly SessionEndCause[] = ['stop', 'hidden-tab', 'staff-not-shown']

/** Intent: a driver at 240 BPM (a 1 s measure) started at 0, so phrase 2's deadline is 1. */
function fastDriver(): SessionDriver {
  const settings = sessionSettings({ tempo: 240 })
  return new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
}

// @test-link [[rule_count_in_ending_returns_to_idle]]
// @test-link [[rule_stop_ends_session]]
// @test-link [[rule_hidden_tab_ends_session]]
describe('ending a session', () => {
  // @test-link [[rule_count_in_ending_returns_to_idle]]
  it.each(CAUSES)('ends during the count-in with no phrase sounded (%s)', (cause) => {
    const driver = fastDriver()
    expect(driver.end(0.5, cause)).toEqual([
      { kind: 'ended', at: 0.5, cause, phase: 'count-in', soundedPhraseCount: 0 },
    ])
  })

  // @test-link [[rule_stop_ends_session]]
  // @test-link [[rule_hidden_tab_ends_session]]
  it.each(CAUSES)('ends while running with the phrases that sounded (%s)', (cause) => {
    const driver = fastDriver()
    driver.accept(0.5)
    driver.countInOver(1)
    driver.sounding(5, 2)
    expect(driver.end(6, cause)).toEqual([
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

  // @test-link [[service_session_engine]]
  // @test-link [[rule_stop_ends_session]]
  it('decides no repeat when the end arrives after a passed deadline with nothing ready', () => {
    const driver = fastDriver()
    expect(driver.end(1.5)).toEqual([
      { kind: 'ended', at: 1.5, cause: 'stop', phase: 'count-in', soundedPhraseCount: 0 },
    ])
    expect(driver.all('phrase-ready')).toEqual([])
  })

  // @test-link [[service_session_engine]]
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
      expect(kinds(driver.sounding(at, phraseNumber))).toEqual([
        'phrase-sounding',
        'request-generation',
        'wake-at',
      ])
      driver.accept(at + 0.5)
    }
    expect(driver.requests().map((request) => request.phraseNumber)).toEqual([2, 3, 4, 5, 6])
    expect(driver.requests().map((request) => request.attemptId)).toEqual([1, 2, 3, 4, 5])
    expect(driver.all('phrase-ready').map((ready) => ready.phrase.origin)).toEqual([
      'carry-in',
      'carry-in',
      'carry-in',
      'carry-in',
      'carry-in',
    ])
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
