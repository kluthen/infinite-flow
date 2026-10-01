/**
 * The on-screen count-in as pure arithmetic on audio time: which of the count-in's beats is
 * muted, current (clicking now) or past, whether the count-in is over, and when the display next
 * changes, so a caller schedules one update per beat instead of polling every frame. The beat
 * times come from the click track itself, so the display and the click always agree.
 */
import { beatAt, countInEndsAt, createClickPlan } from '../audio/click-track'
import type { AudioTime } from './session-types'

/** How one count-in beat shows: not reached yet, clicking now, or already clicked. */
// @spec-link [[rule_count_in_shown_on_screen]]
export type CountInBeatState = 'muted' | 'current' | 'past'

/**
 * What the count-in row shows at one audio time: while the count-in runs, one state per beat and
 * the audio time it next changes at; once it is over (from `countInEndsAt`), an empty row.
 */
// @spec-link [[rule_count_in_shown_on_screen]]
export type CountInDisplay =
  | {
      readonly over: false
      readonly beats: readonly CountInBeatState[]
      readonly nextChangeAt: AudioTime
    }
  | { readonly over: true }

/**
 * Intent: the count-in display at audio time `now` for a session whose count-in starts at
 * `startAt` (from `audio.start`) at `tempo` BPM. A beat is current from its own click up to the
 * next beat's; before the first click every beat is muted. Throws, as the click track does, on a
 * start that is not finite or a tempo that is not a finite positive number, and on a time that is
 * not finite.
 */
// @spec-link [[rule_count_in_shown_on_screen]]
export function countInDisplayAt(
  startAt: AudioTime,
  tempo: number,
  now: AudioTime,
): CountInDisplay {
  const plan = createClickPlan(startAt, tempo)
  if (!Number.isFinite(now)) throw new Error(`count-in display: time ${now} is not finite`)
  if (now >= countInEndsAt(plan)) return { over: true }
  let current = -1
  while (current + 1 < plan.countInBeats && beatAt(plan, current + 1) <= now) current += 1
  const beats = Array.from({ length: plan.countInBeats }, (_, k): CountInBeatState => {
    if (k < current) return 'past'
    return k === current ? 'current' : 'muted'
  })
  return { over: false, beats, nextChangeAt: beatAt(plan, current + 1) }
}
