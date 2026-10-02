/**
 * The session's MIDI timers as pure arithmetic on the audio clock, for the wiring to schedule: the
 * silence timeout (a session with a controller ends after more than 30 s without a played note)
 * and the reconnection window (a controller lost mid-session has 30 s to come back, shown as a
 * whole-second countdown). Every time is in audio-clock seconds. No clock is read here.
 */

import type { AudioTime } from './session-types'

/**
 * How long a session with a controller may go without a played note: more than this ends it. The
 * value the product rule sets; the hardware-tuning notes point here.
 */
// @spec-link [[rule_silence_timeout_ends_session]]
export const SILENCE_TIMEOUT_SECONDS = 30

/**
 * How long a controller lost mid-session has to come back before the session ends, counted from
 * the loss. The value the product rule sets; the hardware-tuning notes point here.
 */
// @spec-link [[rule_controller_reconnection_window]]
export const RECONNECTION_WINDOW_SECONDS = 30

/** Typed failure for a timer asked about a time that is not finite or runs backwards. */
// @spec-link [[rule_silence_timeout_ends_session]]
// @spec-link [[rule_controller_reconnection_window]]
export class SessionMidiTimerError extends Error {
  readonly kind = 'SessionMidiTimerError' as const

  constructor(message: string) {
    super(message)
    this.name = 'SessionMidiTimerError'
  }
}

/**
 * Intent: the silence deadline after the latest activity (the latest played note, or the
 * reconnection): the session ends once the audio clock is strictly past it.
 */
// @spec-link [[rule_silence_timeout_ends_session]]
export function silenceDeadline(lastActivityAt: AudioTime): AudioTime {
  assertFinite('last activity', lastActivityAt)
  return lastActivityAt + SILENCE_TIMEOUT_SECONDS
}

/**
 * Intent: whether more than 30 s have passed without a note since the latest activity, judged
 * against silenceDeadline itself so a timer scheduled on the deadline and this check agree.
 */
// @spec-link [[rule_silence_timeout_ends_session]]
export function silenceExpired(lastActivityAt: AudioTime, now: AudioTime): boolean {
  assertOrdered('last activity', lastActivityAt, now)
  return now > silenceDeadline(lastActivityAt)
}

/**
 * Intent: the whole seconds the disconnect banner shows: 30 at the loss, one less at each second
 * edge (`lostAt + 1`, `lostAt + 2`, …), 1 in the last second, and 0 once the window has run out.
 */
// @spec-link [[rule_controller_loss_mid_session]]
// @spec-link [[rule_controller_reconnection_window]]
export function countdownSecondsLeft(lostAt: AudioTime, now: AudioTime): number {
  assertOrdered('controller loss', lostAt, now)
  return RECONNECTION_WINDOW_SECONDS - secondEdgesPassed(lostAt, now)
}

/** Intent: whether the reconnection window has run out: 30 s or more since the loss. */
// @spec-link [[rule_controller_reconnection_window]]
export function reconnectionExpired(lostAt: AudioTime, now: AudioTime): boolean {
  assertOrdered('controller loss', lostAt, now)
  return secondEdgesPassed(lostAt, now) === RECONNECTION_WINDOW_SECONDS
}

/**
 * Intent: when the countdown next changes: the next second edge after `now`, the last one being
 * the end of the window. Throws once the window has run out, since nothing changes after it.
 */
// @spec-link [[rule_controller_loss_mid_session]]
export function nextCountdownChangeAt(lostAt: AudioTime, now: AudioTime): AudioTime {
  assertOrdered('controller loss', lostAt, now)
  const passed = secondEdgesPassed(lostAt, now)
  if (passed === RECONNECTION_WINDOW_SECONDS) {
    throw new SessionMidiTimerError(
      `The reconnection window opened at ${lostAt} ran out at ${secondEdge(lostAt, passed)}; ` +
        `the countdown has no next change at ${now}.`,
    )
  }
  return secondEdge(lostAt, passed + 1)
}

/** Intent: the audio-clock time of the k-th second edge after a loss, always computed alike. */
function secondEdge(lostAt: AudioTime, k: number): AudioTime {
  return lostAt + k
}

/**
 * Intent: how many of the 30 second edges `now` has reached, comparing against secondEdge itself
 * (not a rounded difference) so that at a time nextCountdownChangeAt returned, the count has
 * moved on, whatever floating-point rounding the subtraction would bring.
 */
function secondEdgesPassed(lostAt: AudioTime, now: AudioTime): number {
  let passed = Math.min(Math.max(Math.floor(now - lostAt), 0), RECONNECTION_WINDOW_SECONDS)
  while (passed < RECONNECTION_WINDOW_SECONDS && now >= secondEdge(lostAt, passed + 1)) passed += 1
  while (passed > 0 && now < secondEdge(lostAt, passed)) passed -= 1
  return passed
}

/** Intent: reject a time that is not a finite number of audio-clock seconds. */
function assertFinite(name: string, at: AudioTime): void {
  if (!Number.isFinite(at)) {
    throw new SessionMidiTimerError(`The ${name} time must be a finite number, got ${at}.`)
  }
}

/** Intent: reject non-finite times and a `now` earlier than the reference it is measured from. */
function assertOrdered(name: string, reference: AudioTime, now: AudioTime): void {
  assertFinite(name, reference)
  assertFinite('current', now)
  if (now < reference) {
    throw new SessionMidiTimerError(
      `The current time ${now} is before the ${name} at ${reference}.`,
    )
  }
}
