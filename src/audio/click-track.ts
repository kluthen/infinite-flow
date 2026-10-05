/**
 * The metronome click track: one click per quarter note from the session's start, beat 1 of every
 * measure accented, the first measure routed as the count-in. Its tempo is a piecewise map: the
 * starting tempo, then any tempo changes, each from a given beat on. It is pure arithmetic on
 * audio time and reads no clock; the look-ahead scheduler asks it for one window's clicks at a time.
 */

import { FOUR_FOUR_METER } from '../domain/generation/generation-request'
import { COUNT_IN_MEASURES } from '../session/session-timing'
import type { AudioTime, ScheduledClick } from './audio-ports'

/** The slowest and fastest tempo a tempo change may set, in whole BPM. */
const MIN_CHANGE_TEMPO = 60
const MAX_CHANGE_TEMPO = 240

/**
 * One tempo change of a click plan: from session beat `beat` on, the click runs at `tempo` BPM.
 * `at` is when that beat falls, derived once when the change is added, from the previous segment's
 * own start by one multiplication, so every later beat time is drift-free.
 */
// @spec-link [[rule_click_track]]
// @spec-link [[module_session_transport_tempo_map]]
export interface TempoChange {
  readonly beat: number
  readonly tempo: number
  readonly at: AudioTime
}

/**
 * One session's click track: when beat 0 falls, the starting tempo (the count-in's), the
 * count-in's length, and the tempo changes after it, in strictly rising beat order.
 */
// @spec-link [[rule_click_track]]
// @spec-link [[module_session_transport_tempo_map]]
export interface ClickPlan {
  readonly startAt: AudioTime
  readonly tempo: number
  readonly beatsPerMeasure: number
  readonly countInBeats: number
  readonly tempoChanges: readonly TempoChange[]
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
  return {
    startAt,
    tempo,
    beatsPerMeasure,
    countInBeats: COUNT_IN_MEASURES * beatsPerMeasure,
    tempoChanges: [],
  }
}

/**
 * Intent: the segment of the tempo map beat `k` falls in: the last change at or before it, or
 * the starting tempo from beat 0 (also for a beat before 0).
 */
function segmentAtBeat(plan: ClickPlan, k: number): TempoChange {
  for (let i = plan.tempoChanges.length - 1; i >= 0; i -= 1) {
    const change = plan.tempoChanges[i]!
    if (change.beat <= k) return change
  }
  return { beat: 0, tempo: plan.tempo, at: plan.startAt }
}

/**
 * Intent: the segment of the tempo map time `time` falls in: the last change whose beat falls at
 * or before it, or the starting tempo (also for a time before beat 0).
 */
function segmentAtTime(plan: ClickPlan, time: AudioTime): TempoChange {
  for (let i = plan.tempoChanges.length - 1; i >= 0; i -= 1) {
    const change = plan.tempoChanges[i]!
    if (change.at <= time) return change
  }
  return { beat: 0, tempo: plan.tempo, at: plan.startAt }
}

/**
 * Intent: `plan` with the click running at `tempo` BPM from session beat `beat` on. The change's
 * start is the previous segment's start plus that whole segment's length, one multiplication, so
 * the change beat and every beat before it keep the very time they had. A change to the tempo
 * already in effect returns `plan` itself. Throws on a beat that is not a whole number, falls in
 * the count-in or is not after the last change, and on a tempo that is not a whole 60..240 BPM.
 */
// @spec-link [[rule_click_track]]
// @spec-link [[module_session_transport_tempo_map]]
export function withTempoFrom(plan: ClickPlan, beat: number, tempo: number): ClickPlan {
  if (!Number.isInteger(beat)) throw new Error(`click track: beat ${beat} is not a whole number`)
  if (beat < plan.countInBeats) {
    throw new Error(`click track: a tempo change at beat ${beat} falls in the count-in`)
  }
  if (!Number.isInteger(tempo) || tempo < MIN_CHANGE_TEMPO || tempo > MAX_CHANGE_TEMPO) {
    throw new Error(
      `click track: tempo ${tempo} is not a whole number from ${MIN_CHANGE_TEMPO} to ${MAX_CHANGE_TEMPO} BPM`,
    )
  }
  const last = plan.tempoChanges.at(-1)
  if (last !== undefined && beat <= last.beat) {
    throw new Error(`click track: a tempo change at beat ${beat} is not after beat ${last.beat}`)
  }
  const previous = segmentAtBeat(plan, beat)
  if (previous.tempo === tempo) return plan
  const at = previous.at + ((beat - previous.beat) * 60) / previous.tempo
  return { ...plan, tempoChanges: [...plan.tempoChanges, { beat, tempo, at }] }
}

/** Intent: the tempo in effect on session beat `k`, in BPM: the one its beat length follows. */
// @spec-link [[rule_click_track]]
// @spec-link [[module_session_transport_tempo_map]]
export function tempoAtBeat(plan: ClickPlan, k: number): number {
  return segmentAtBeat(plan, k).tempo
}

/**
 * Intent: when beat `k` falls, computed by one multiplication from the start of its tempo segment
 * rather than by adding beat lengths, so a long session never drifts; with no tempo change that
 * start is the session's. Everything placed on the beat grid (the clicks and the backing) goes
 * through it, so a sound on beat `k` falls at the very same time.
 */
// @spec-link [[rule_click_track]]
// @spec-link [[rule_playhead_follows_audio_clock]]
// @spec-link [[module_session_transport_tempo_map]]
export function beatAt(plan: ClickPlan, k: number): AudioTime {
  const segment = segmentAtBeat(plan, k)
  return segment.at + ((k - segment.beat) * 60) / segment.tempo
}

/**
 * Intent: the first beat at or after `from`. The estimate, from the tempo segment `from` falls
 * in, is corrected with `beatAt` itself, so the half-open rule holds exactly for the times
 * `clicksBetween` compares, across a tempo change too.
 */
// @spec-link [[module_session_transport_tempo_map]]
function firstBeatFrom(plan: ClickPlan, from: AudioTime): number {
  const segment = segmentAtTime(plan, from)
  let k = Math.max(0, segment.beat + Math.ceil(((from - segment.at) * segment.tempo) / 60))
  while (k > 0 && beatAt(plan, k - 1) >= from) k -= 1
  while (beatAt(plan, k) < from) k += 1
  return k
}

/**
 * Intent: the clicks with `from <= at < to`, through the tempo map. The window is half-open, so
 * consecutive windows never repeat or drop a beat. Beat 1 of each measure is accented; the count-in's beats take
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
 * `count-in-over`. No tempo change falls in the count-in, so it ends at the starting tempo.
 */
// @spec-link [[rule_count_in_always_clicks]]
export function countInEndsAt(plan: ClickPlan): AudioTime {
  return beatAt(plan, plan.countInBeats)
}
