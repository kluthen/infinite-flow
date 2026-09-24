import { makeHarmonyCollection } from '../harmony/collection'
import type { HarmonyCandidate } from '../harmony/harmony-types'
import type { RhythmCandidate } from '../rhythm/rhythm-types'
import { PitchPlannerInputError, type PitchPolicy } from './pitch-types'

// @spec-link [[module_pitch_planner]]
export const TICKS_PER_BAR = 16
// @spec-link [[module_pitch_planner]]
export const TICKS_PER_BEAT = 4

/** One sounding attack rebuilt from the rhythm; `end` includes every tie continuation. */
// @spec-link [[module_pitch_planner]]
export interface SoundingSpan {
  readonly barIndex: 0 | 1 | 2 | 3
  readonly startTick: number
  readonly durationTicks: number
  readonly start: number
  readonly end: number
}

/**
 * Rebuild chronological sounding attacks from the rhythm alone. A tie continuation extends the
 * attack it continues, a rest closes it, and a continuation with no source fails loudly.
 */
// @spec-link [[module_pitch_planner]]
export function soundingSpans(rhythm: Pick<RhythmCandidate, 'bars'>): readonly SoundingSpan[] {
  const spans: SoundingSpan[] = []
  let open: { -readonly [K in keyof SoundingSpan]: SoundingSpan[K] } | undefined
  for (const bar of rhythm.bars)
    for (const event of bar.events) {
      const start = bar.barIndex * TICKS_PER_BAR + event.startTick
      if (event.kind === 'rest') open = undefined
      else if (event.tieContinuation) {
        if (open?.end !== start)
          throw new PitchPlannerInputError(`Tie continuation at tick ${start} has no source.`)
        open.end = start + event.durationTicks
      } else {
        open = {
          barIndex: bar.barIndex,
          startTick: event.startTick,
          durationTicks: event.durationTicks,
          start,
          end: start + event.durationTicks,
        }
        spans.push(open)
      }
    }
  return spans
}

/**
 * Locate the harmony event sounding at an absolute phrase tick. Events may span bar lines, so the
 * comparison is in absolute beats; an uncovered tick is an upstream defect and throws.
 */
// @spec-link [[module_pitch_planner]]
export function harmonyEventIndexAt(
  harmony: Pick<HarmonyCandidate, 'identity' | 'events'>,
  absoluteTick: number,
): number {
  const beat = absoluteTick / TICKS_PER_BEAT
  const index = harmony.events.findIndex((event) => {
    const first = event.barIndex * 4 + event.startBeat
    return first <= beat && beat < first + event.durationBeats
  })
  if (index < 0)
    throw new PitchPlannerInputError(
      `Harmony candidate ${harmony.identity} leaves tick ${absoluteTick} uncovered.`,
    )
  return index
}

/** Stable identity of the harmony event at an absolute tick, used to compare harmonies. */
// @spec-link [[module_pitch_planner]]
export function harmonyIdentityAtTick(
  harmony: Pick<HarmonyCandidate, 'identity' | 'events'>,
  absoluteTick: number,
): string {
  const event = harmony.events[harmonyEventIndexAt(harmony, absoluteTick)]!
  return `${event.templateId}/${event.barIndex}/${event.startBeat}`
}

/** The selected seven-note collection as pitch classes, tonic first. */
// @spec-link [[rule_neutral_profile_diatonic_pitches]]
export function collectionPitchClasses(
  policy: Pick<PitchPolicy, 'tonalCenter' | 'collection'>,
): readonly number[] {
  return makeHarmonyCollection(policy.tonalCenter, policy.collection).pitchClasses
}
