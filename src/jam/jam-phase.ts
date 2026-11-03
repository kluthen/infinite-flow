/**
 * A fresh Jam's phase before phrase 1: the capture's state with the beat it is on, which the row
 * above the staff reads (chunk 21), and the beat grid the capture runs on. The grid is the click
 * plan's (createClickPlan, beatAt): four beats to a measure at Jam's tempo, which does not change
 * before phrase 1, measure 0 the first after the count-in. Pure arithmetic on audio time. Part of
 * Jam's code (src/jam/), loaded on demand.
 */
import { beatAt, countInEndsAt, type ClickPlan } from '@/audio/click-track'
import type { DoodleMeasureCount } from '@/domain/doodle/quantized-doodle'
import type { AudioTime } from '@/session/session-types'

/** A beat of a measure, counted from 1 on its barline. */
// @spec-link [[module_jam_capture]]
export type JamBeat = 1 | 2 | 3 | 4

/**
 * The capture's states, in order: the count-in; the capture, from the count-in's end until the
 * doodle ends; the tentative generation measure, after a silent barline, which a doodle note voids;
 * the generation measure, after an end by length; the extended wait, by whole measures until
 * phrase 1 is ready; the read-in measure, phrase 1 on screen before it sounds.
 */
// @spec-link [[module_jam_capture]]
export type JamCaptureState =
  | 'count-in'
  | 'capture'
  | 'tentative-generation-measure'
  | 'generation-measure'
  | 'extended-wait'
  | 'read-in'

/**
 * The Jam's phase, published by the capture: its state and the beat it is on; in the capture, the
 * doodle's measure (1 to 4, null before its first note); in a tentative generation measure, the
 * measures the doodle holds so far. `phrase-one` once phrase 1 sounds (the session runs), `ended`
 * once the Jam ended before it. The phase never holds the doodle's notes.
 */
// @spec-link [[module_jam_capture]]
// @spec-link [[rule_jam_live_view_never_shows_doodle]]
export type JamPhase =
  | { readonly state: 'count-in'; readonly beat: JamBeat }
  | {
      readonly state: 'capture'
      readonly beat: JamBeat
      readonly doodleMeasure: DoodleMeasureCount | null
    }
  | {
      readonly state: 'tentative-generation-measure'
      readonly beat: JamBeat
      readonly doodleMeasures: DoodleMeasureCount
    }
  | {
      readonly state: 'generation-measure' | 'extended-wait' | 'read-in'
      readonly beat: JamBeat
    }
  | { readonly state: 'phrase-one' }
  | { readonly state: 'ended' }

/** Intent: when barline `measure` falls (measure 0 starts at the count-in's end, -1 is the count-in). */
// @spec-link [[module_jam_capture]]
export function barlineAt(plan: ClickPlan, measure: number): AudioTime {
  return beatAt(plan, plan.countInBeats + measure * plan.beatsPerMeasure)
}

/**
 * Intent: the session beat sounding at `at`: the last beat at or before it (0 is the count-in's
 * first, and a time before it gives 0). The estimate is corrected with beatAt itself, so a time on
 * a beat gives that beat exactly.
 */
function beatIndexAt(plan: ClickPlan, at: AudioTime): number {
  let k = Math.max(0, Math.floor(((at - plan.startAt) * plan.tempo) / 60))
  while (k > 0 && beatAt(plan, k) > at) k -= 1
  while (beatAt(plan, k + 1) <= at) k += 1
  return k
}

/** Intent: the measure sounding at `at`, measure 0 the first after the count-in (-1 in it). */
// @spec-link [[module_jam_capture]]
export function measureAt(plan: ClickPlan, at: AudioTime): number {
  return Math.floor(beatIndexAt(plan, at) / plan.beatsPerMeasure) - 1
}

/** Intent: the first barline at or after `at`, as a measure number (never before measure 0). */
// @spec-link [[module_jam_capture]]
export function firstBarlineFrom(plan: ClickPlan, at: AudioTime): number {
  if (at <= countInEndsAt(plan)) return 0
  const measure = measureAt(plan, at)
  return barlineAt(plan, measure) >= at ? measure : measure + 1
}

/** The beats of a measure, in order. */
const BEATS: readonly JamBeat[] = [1, 2, 3, 4]

/** Intent: the beat of its measure sounding at `at`, 1 on the barline. */
// @spec-link [[module_jam_capture]]
export function beatOfMeasureAt(plan: ClickPlan, at: AudioTime): JamBeat {
  return BEATS[beatIndexAt(plan, at) % plan.beatsPerMeasure]!
}
