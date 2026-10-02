/**
 * The session's MIDI timers as pure arithmetic on the audio clock: the 30-second silence timeout
 * and the 30-second reconnection window with its whole-second countdown.
 */

import { describe, expect, it } from 'vitest'

import {
  countdownSecondsLeft,
  nextCountdownChangeAt,
  RECONNECTION_WINDOW_SECONDS,
  reconnectionExpired,
  SessionMidiTimerError,
  SILENCE_TIMEOUT_SECONDS,
  silenceDeadline,
  silenceExpired,
} from '@/session/session-midi-timers'

// @test-link [[rule_silence_timeout_ends_session]]
describe('silence timeout', () => {
  // @test-link [[rule_silence_timeout_ends_session]]
  it('is 30 seconds', () => {
    expect(SILENCE_TIMEOUT_SECONDS).toBe(30)
    expect(silenceDeadline(12.5)).toBe(42.5)
  })

  // @test-link [[rule_silence_timeout_ends_session]]
  it('expires only after more than 30 seconds without a note', () => {
    expect(silenceExpired(0, 29.999)).toBe(false)
    expect(silenceExpired(0, 30)).toBe(false)
    expect(silenceExpired(0, 30.001)).toBe(true)
    expect(silenceExpired(100, 130)).toBe(false)
    expect(silenceExpired(100, 130.001)).toBe(true)
  })

  // @test-link [[rule_silence_timeout_ends_session]]
  it('agrees with its own deadline', () => {
    const last = 7.3
    expect(silenceExpired(last, silenceDeadline(last))).toBe(false)
  })

  // @test-link [[rule_silence_timeout_ends_session]]
  it('throws on a non-finite time or a now before the last activity', () => {
    expect(() => silenceDeadline(Number.NaN)).toThrow(SessionMidiTimerError)
    expect(() => silenceExpired(0, Infinity)).toThrow(SessionMidiTimerError)
    expect(() => silenceExpired(-Infinity, 0)).toThrow(SessionMidiTimerError)
    expect(() => silenceExpired(10, 9.999)).toThrow(SessionMidiTimerError)
  })
})

// @test-link [[rule_controller_reconnection_window]]
// @test-link [[rule_controller_loss_mid_session]]
describe('reconnection window', () => {
  // @test-link [[rule_controller_reconnection_window]]
  it('is 30 seconds and expires at exactly 30 seconds after the loss', () => {
    expect(RECONNECTION_WINDOW_SECONDS).toBe(30)
    expect(reconnectionExpired(0, 29.999)).toBe(false)
    expect(reconnectionExpired(0, 30)).toBe(true)
    expect(reconnectionExpired(0, 30.001)).toBe(true)
  })

  // @test-link [[rule_controller_loss_mid_session]]
  it('counts down whole seconds from 30 at the unplug to 1 in the last second', () => {
    expect(countdownSecondsLeft(0, 0)).toBe(30)
    expect(countdownSecondsLeft(0, 0.999)).toBe(30)
    expect(countdownSecondsLeft(0, 1)).toBe(29)
    expect(countdownSecondsLeft(0, 1.5)).toBe(29)
    expect(countdownSecondsLeft(0, 29)).toBe(1)
    expect(countdownSecondsLeft(0, 29.999)).toBe(1)
    expect(countdownSecondsLeft(0, 30)).toBe(0)
  })

  // @test-link [[rule_controller_loss_mid_session]]
  it('changes the countdown at every second edge, wherever the loss falls', () => {
    for (const lostAt of [0, 0.1, 3.7, 1234.567, 98765.4321]) {
      for (let second = 0; second < 30; second += 1) {
        const edge = lostAt + second
        expect(countdownSecondsLeft(lostAt, edge)).toBe(30 - second)
        const next = nextCountdownChangeAt(lostAt, edge)
        expect(next).toBe(lostAt + (second + 1))
        expect(countdownSecondsLeft(lostAt, next)).toBe(29 - second)
      }
      expect(reconnectionExpired(lostAt, nextCountdownChangeAt(lostAt, lostAt + 29.5))).toBe(true)
    }
  })

  // @test-link [[rule_controller_loss_mid_session]]
  it('schedules the next change one second after the current edge, not one second after now', () => {
    expect(nextCountdownChangeAt(10, 10)).toBe(11)
    expect(nextCountdownChangeAt(10, 10.4)).toBe(11)
    expect(nextCountdownChangeAt(10, 38.9)).toBe(39)
    expect(nextCountdownChangeAt(10, 39.2)).toBe(40)
  })

  // @test-link [[rule_controller_reconnection_window]]
  it('has no next change once the window has run out', () => {
    expect(() => nextCountdownChangeAt(0, 30)).toThrow(SessionMidiTimerError)
  })

  // @test-link [[rule_controller_loss_mid_session]]
  it('throws on a non-finite time or a now before the loss', () => {
    expect(() => countdownSecondsLeft(Number.NaN, 0)).toThrow(SessionMidiTimerError)
    expect(() => countdownSecondsLeft(0, Infinity)).toThrow(SessionMidiTimerError)
    expect(() => countdownSecondsLeft(5, 4.999)).toThrow(SessionMidiTimerError)
    expect(() => reconnectionExpired(5, 4)).toThrow(SessionMidiTimerError)
    expect(() => nextCountdownChangeAt(5, 4)).toThrow(SessionMidiTimerError)
  })
})
