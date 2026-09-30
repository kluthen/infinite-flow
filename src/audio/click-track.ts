/**
 * The metronome click track: one click per quarter note from the session's start, beat 1 of every
 * measure accented, the first measure routed as the count-in. It is pure arithmetic on audio time
 * and reads no clock; the look-ahead scheduler asks it for the clicks of one window at a time.
 */

import { FOUR_FOUR_METER } from '../domain/generation/generation-request'
import { COUNT_IN_MEASURES } from '../session/session-timing'
import type { AudioTime, ScheduledClick } from './audio-ports'

/** One session's click track: when beat 0 falls, the frozen tempo, and the count-in's length. */
// @spec-link [[rule_click_track]]
export interface ClickPlan {
  readonly startAt: AudioTime
  readonly tempo: number
  readonly beatsPerMeasure: number
  readonly countInBeats: number
}

/**
 * Intent: the click track of a session whose beat 0 (the count-in's first click) falls at
 * `startAt`, at `tempo` BPM, in 4/4 with a one-measure count-in. Throws on a start that is not a
 * finite time or a tempo that is not a finite positive number.
 */
// @spec-link [[rule_click_track]]
// @spec-link [[rule_count_in_always_clicks]]
export function createClickPlan(startAt: AudioTime, tempo: number): ClickPlan {
  if (!Number.isFinite(startAt)) throw new Error(`click track: start ${startAt} is not finite`)
  if (!Number.isFinite(tempo) || tempo <= 0) {
    throw new Error(`click track: tempo ${tempo} is not a finite positive number`)
  }
  const beatsPerMeasure = FOUR_FOUR_METER.beatsPerMeasure
  return { startAt, tempo, beatsPerMeasure, countInBeats: COUNT_IN_MEASURES * beatsPerMeasure }
}

/**
 * Intent: when beat `k` falls, computed by one multiplication from the start rather than by
 * adding beat lengths, so a long session never drifts. Everything placed on the beat grid (the
 * clicks and the backing) goes through it, so a sound on beat `k` falls at the very same time.
 */
// @spec-link [[rule_click_track]]
// @spec-link [[rule_playhead_follows_audio_clock]]
export function beatAt(plan: ClickPlan, k: number): AudioTime {
  return plan.startAt + (k * 60) / plan.tempo
}

/**
 * Intent: the first beat at or after `from`. The estimate is corrected with `beatAt` itself, so
 * the half-open rule holds exactly for the times `clicksBetween` compares.
 */
function firstBeatFrom(plan: ClickPlan, from: AudioTime): number {
  let k = Math.max(0, Math.ceil(((from - plan.startAt) * plan.tempo) / 60))
  while (k > 0 && beatAt(plan, k - 1) >= from) k -= 1
  while (beatAt(plan, k) < from) k += 1
  return k
}

/**
 * Intent: the clicks with `from <= at < to`. The window is half-open, so consecutive windows
 * never repeat or drop a beat. Beat 1 of each measure is accented; the count-in's beats take
 * the `count-in` route, which bypasses the click on/off gate. Throws on a backwards window.
 */
// @spec-link [[rule_click_track]]
// @spec-link [[rule_count_in_always_clicks]]
export function clicksBetween(plan: ClickPlan, from: AudioTime, to: AudioTime): ScheduledClick[] {
  if (!(to >= from)) throw new Error(`click track: window [${from}, ${to}) runs backwards`)
  const clicks: ScheduledClick[] = []
  for (let k = firstBeatFrom(plan, from); beatAt(plan, k) < to; k += 1) {
    clicks.push({
      at: beatAt(plan, k),
      accent: k % plan.beatsPerMeasure === 0,
      route: k < plan.countInBeats ? 'count-in' : 'click',
    })
  }
  return clicks
}

/**
 * Intent: the moment the count-in is over and phrase 1 starts sounding, the session engine's
 * `count-in-over`.
 */
// @spec-link [[rule_count_in_always_clicks]]
export function countInEndsAt(plan: ClickPlan): AudioTime {
  return beatAt(plan, plan.countInBeats)
}
