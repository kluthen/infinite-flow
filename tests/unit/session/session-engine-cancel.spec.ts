/**
 * The engine's cancel-generation output: an attempt it drops while still generating, at its
 * phrase's deadline, when a settings change supersedes it or when the session ends, is named for
 * cancellation before any request of the same event; an attempt waiting for its fit check never
 * is, and every late result of a dropped attempt is ignored.
 */

import { describe, expect, it } from 'vitest'

import type { SessionOutput } from '@/session/session-types'
import { fastDriver, soundingAt } from './scripted-session'
import { SessionDriver, kinds, phraseOneFor, sessionSettings } from './session-harness'
import { SHAPED, threeDecided, threeRequested } from './settings-change-session'

/** Phrase 3's deadline in a fast session: 3 s after phrase 2 starts sounding. */
const PHRASE_THREE_DEADLINE = soundingAt(2) + 3

/** Intent: the cancel-generation outputs among `outputs`, in order. */
function cancels(outputs: readonly SessionOutput[]): readonly SessionOutput[] {
  return outputs.filter((output) => output.kind === 'cancel-generation')
}

/** Intent: fail every attempt of the latest phrase at `at` until no further rung is requested. */
function failUntilExhausted(driver: SessionDriver, at: number): void {
  let retried = true
  while (retried) retried = driver.fail(at).some((output) => output.kind === 'request-generation')
}

// @test-link [[rule_dropped_attempt_cancelled]]
// @test-link [[service_session_engine]]
describe('cancelling a dropped attempt at the deadline', () => {
  // @test-link [[rule_dropped_attempt_cancelled]]
  it('cancels the attempt still generating when the deadline decides a repeat', () => {
    const driver = fastDriver()
    const { attemptId } = driver.lastRequest()
    expect(driver.tick(1)).toEqual([
      { kind: 'cancel-generation', attemptId },
      expect.objectContaining({
        kind: 'phrase-ready',
        phrase: expect.objectContaining({ origin: 'repeat' }),
      }),
      expect.objectContaining({ kind: 'phrase-tempo' }),
    ])
  })

  // @test-link [[rule_dropped_attempt_cancelled]]
  it('cancels the retry in flight, not the attempt that already failed', () => {
    const driver = threeRequested()
    const failed = driver.lastRequest()
    driver.fail(soundingAt(2) + 0.2)
    const retry = driver.lastRequest()
    expect(retry.attemptId).not.toBe(failed.attemptId)
    expect(cancels(driver.tick(PHRASE_THREE_DEADLINE))).toEqual([
      { kind: 'cancel-generation', attemptId: retry.attemptId },
    ])
  })

  // @test-link [[rule_dropped_attempt_cancelled]]
  it('never cancels an attempt waiting for its fit check, whose late fit result is ignored', () => {
    const driver = fastDriver()
    driver.succeed(0.5)
    expect(kinds(driver.tick(1))).toEqual(['phrase-ready', 'phrase-tempo'])
    expect(driver.fit(1.1, true)).toEqual([])
  })

  // @test-link [[rule_dropped_attempt_cancelled]]
  it('cancels nothing at the deadline once the ladder is exhausted', () => {
    const driver = fastDriver()
    failUntilExhausted(driver, 0.2)
    expect(kinds(driver.tick(1))).toEqual(['phrase-ready', 'phrase-tempo'])
  })

  // @test-link [[rule_dropped_attempt_cancelled]]
  it('ignores every late result of the cancelled attempt', () => {
    const driver = fastDriver()
    const cancelled = driver.lastRequest()
    driver.tick(1)
    expect(driver.succeed(1.2, cancelled)).toEqual([])
    expect(driver.crash(1.2, cancelled.attemptId)).toEqual([])
  })

  // @test-link [[rule_dropped_attempt_cancelled]]
  it('puts the cancellation before the next request when the deadline passes with the phrase sounding', () => {
    const driver = threeRequested()
    const { attemptId } = driver.lastRequest()
    const outputs = driver.sounding(soundingAt(3), 3)
    expect(kinds(outputs)).toEqual([
      'cancel-generation',
      'phrase-ready',
      'phrase-tempo',
      'phrase-sounding',
      'request-generation',
      'wake-at',
      'wake-at',
    ])
    expect(outputs[0]).toEqual({ kind: 'cancel-generation', attemptId })
  })
})

// @test-link [[rule_dropped_attempt_cancelled]]
// @test-link [[service_session_engine]]
describe('cancelling an attempt a settings change supersedes', () => {
  // @test-link [[rule_dropped_attempt_cancelled]]
  it('cancels the superseded attempt before requesting the phrase again, and ignores its results', () => {
    const driver = threeRequested()
    const old = driver.lastRequest()
    const outputs = driver.change(soundingAt(2) + 1, SHAPED)
    const cancelAt = outputs.findIndex((output) => output.kind === 'cancel-generation')
    const requestAt = outputs.findIndex((output) => output.kind === 'request-generation')
    expect(outputs[cancelAt]).toEqual({ kind: 'cancel-generation', attemptId: old.attemptId })
    expect(cancelAt).toBeLessThan(requestAt)
    expect(driver.succeed(soundingAt(2) + 1.1, old)).toEqual([])
    expect(driver.crash(soundingAt(2) + 1.1, old.attemptId)).toEqual([])
  })

  // @test-link [[rule_dropped_attempt_cancelled]]
  it('never cancels a superseded attempt waiting for its fit check', () => {
    const driver = threeRequested()
    driver.succeed(soundingAt(2) + 0.5)
    const outputs = driver.change(soundingAt(2) + 1, SHAPED)
    expect(kinds(outputs)).toEqual(['settings-changed', 'request-generation', 'wake-at'])
  })

  // @test-link [[rule_dropped_attempt_cancelled]]
  it('cancels nothing when it discards an already decided phrase', () => {
    const driver = threeDecided()
    const outputs = driver.change(soundingAt(2) + 1, SHAPED)
    expect(kinds(outputs)).toEqual([
      'phrase-discarded',
      'settings-changed',
      'request-generation',
      'wake-at',
    ])
  })

  // @test-link [[rule_dropped_attempt_cancelled]]
  it('cancels nothing when the change keeps the pending phrase', () => {
    // At 60 BPM (a 4 s measure), less than a measure before phrase 2's deadline (4 s) is still
    // before the standalone reserve, so no cutover cancels anything either.
    const settings = sessionSettings({ tempo: 60 })
    const driver = new SessionDriver({ settings, phraseOne: phraseOneFor(settings) })
    expect(kinds(driver.change(0.5, sessionSettings({ tempo: 60, leapiness: 'Shaped' })))).toEqual([
      'settings-changed',
    ])
  })
})

// @test-link [[rule_dropped_attempt_cancelled]]
// @test-link [[service_session_engine]]
describe('cancelling the attempt in flight at the end', () => {
  // @test-link [[rule_dropped_attempt_cancelled]]
  it('cancels the attempt still generating first, then ends, and ignores its late result', () => {
    const driver = threeRequested()
    const inFlight = driver.lastRequest()
    const outputs = driver.end(soundingAt(2) + 1)
    expect(outputs[0]).toEqual({ kind: 'cancel-generation', attemptId: inFlight.attemptId })
    expect(kinds(outputs).at(-1)).toBe('ended')
    expect(driver.succeed(soundingAt(2) + 1.2, inFlight)).toEqual([])
  })

  // @test-link [[rule_dropped_attempt_cancelled]]
  it('never cancels an attempt waiting for its fit check at the end', () => {
    const driver = threeRequested()
    driver.succeed(soundingAt(2) + 0.5)
    expect(kinds(driver.end(soundingAt(2) + 1))).toEqual(['ended'])
  })
})
