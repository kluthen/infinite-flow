/**
 * The look-ahead scheduler: on every wake-up it hands its source the next slice of audio time, up
 * to a fixed window ahead of the audio clock, so sound is always planned before it is due. It
 * reads time only from the injected clock and is driven only by the injected wake-up timer.
 */

import type { AudioClock, AudioTime, WakeTimer } from './audio-ports'

/**
 * How far ahead of the audio clock sound is planned, in seconds: several wake-up intervals, so a
 * late wake-up still plans a click before it is due.
 */
// @spec-link [[rule_playhead_follows_audio_clock]]
export const LOOK_AHEAD_SECONDS = 0.2

/** What the scheduler feeds: schedule every sound with `from <= at < to`. */
// @spec-link [[rule_playhead_follows_audio_clock]]
export type ScheduleSource = (from: AudioTime, to: AudioTime) => void

/** A scheduler that plans one source at a time, from `run` until `halt`. */
// @spec-link [[rule_playhead_follows_audio_clock]]
export interface LookAheadScheduler {
  readonly run: (source: ScheduleSource) => void
  readonly halt: () => void
  readonly isRunning: () => boolean
}

/** The clock the scheduler reads, the timer that wakes it, and its window. */
export interface LookAheadSchedulerDependencies {
  readonly clock: Pick<AudioClock, 'now'>
  readonly timer: WakeTimer
  readonly lookAheadSeconds: number
}

/**
 * Intent: build a look-ahead scheduler. `run` plans the first window at once, then one more slice
 * on every wake-up, each slice starting where the last ended, so no moment is planned twice or
 * skipped. `halt` stops the timer; a wake-up still in flight afterwards does nothing. A second
 * `run`, or a `halt` when not running, throws.
 */
// @spec-link [[rule_playhead_follows_audio_clock]]
export function createLookAheadScheduler(deps: LookAheadSchedulerDependencies): LookAheadScheduler {
  const { clock, timer, lookAheadSeconds } = deps
  if (!Number.isFinite(lookAheadSeconds) || lookAheadSeconds <= 0) {
    throw new Error(`look-ahead scheduler: window ${lookAheadSeconds} is not a positive number`)
  }
  let activeRun = 0
  let runCount = 0

  /** Intent: start one run of `source`, whose wake-ups do nothing once another run replaces it. */
  function run(source: ScheduleSource): void {
    if (activeRun !== 0) throw new Error('look-ahead scheduler: already running')
    runCount += 1
    const thisRun = runCount
    activeRun = thisRun
    let cursor = clock.now()
    const pump = (): void => {
      if (activeRun !== thisRun) return
      const horizon = clock.now() + lookAheadSeconds
      if (horizon <= cursor) return
      source(cursor, horizon)
      cursor = horizon
    }
    try {
      pump()
    } catch (error) {
      // A source that throws on the first slice is a caller bug: surface it, not a half-started run.
      activeRun = 0
      throw error
    }
    timer.start(pump)
  }

  return {
    run,
    halt: () => {
      if (activeRun === 0) throw new Error('look-ahead scheduler: halt while not running')
      activeRun = 0
      timer.stop()
    },
    isRunning: () => activeRun !== 0,
  }
}
