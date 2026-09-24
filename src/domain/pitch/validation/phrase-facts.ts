import { makeHarmonyCollection } from '../../harmony/collection'
import type { HarmonyEvent } from '../../harmony/harmony-types'
import type { PhraseFacts, PitchValidationContext, SoundingFact } from './pitch-validation-types'

const TICKS_PER_BAR = 16
const TICKS_PER_BEAT = 4

interface SoundingSpan {
  readonly barIndex: 0 | 1 | 2 | 3
  readonly startTick: number
  readonly start: number
  end: number
}

/**
 * Rebuild sounding attacks from the rhythm alone: every non-continuation note opens an attack and
 * each tie continuation extends the attack it continues. Rests separate attacks but never merge
 * them. A continuation with nothing to continue is a malformed rhythm and fails loudly.
 */
// @spec-link [[module_pitch_domain_validation]]
export function soundingSpans(context: PitchValidationContext): readonly SoundingSpan[] {
  const spans: SoundingSpan[] = []
  let open: SoundingSpan | undefined
  for (const bar of context.rhythm.bars) {
    for (const event of bar.events) {
      const start = bar.barIndex * TICKS_PER_BAR + event.startTick
      if (event.kind === 'rest') {
        open = undefined
        continue
      }
      if (event.tieContinuation) {
        if (open?.end !== start) throw new Error(`Tie continuation at tick ${start} has no source.`)
        open.end = start + event.durationTicks
        continue
      }
      open = {
        barIndex: bar.barIndex,
        startTick: event.startTick,
        start,
        end: start + event.durationTicks,
      }
      spans.push(open)
    }
  }
  return spans
}

/** Find the harmony sounding at an absolute tick; events may span bar lines, so compare in beats. */
// @spec-link [[module_pitch_domain_validation]]
export function harmonyAtTick(context: PitchValidationContext, tick: number): HarmonyEvent {
  const beat = tick / TICKS_PER_BEAT
  const event = context.harmony.events.find((candidate) => {
    const first = candidate.barIndex * 4 + candidate.startBeat
    return first <= beat && beat < first + candidate.durationBeats
  })
  if (!event)
    throw new Error(`Harmony candidate ${context.harmony.identity} leaves tick ${tick} uncovered.`)
  return event
}

/**
 * Reconstruct every fact the rules consume from the rhythm, harmony, collection, and the submitted
 * MIDI values. Callers must first check that one MIDI value exists per sounding attack.
 */
// @spec-link [[module_pitch_domain_validation]]
export function reconstructPhraseFacts(
  context: PitchValidationContext,
  midis: readonly number[],
): PhraseFacts {
  const collectionPitchClasses = makeHarmonyCollection(
    context.policy.tonalCenter,
    context.policy.collection,
  ).pitchClasses
  const attacks = soundingSpans(context).map((span, index): SoundingFact => {
    const midi = midis[index]!
    const pitchClass = ((midi % 12) + 12) % 12
    const harmony = harmonyAtTick(context, span.start)
    return {
      index,
      barIndex: span.barIndex,
      startTick: span.startTick,
      durationTicks: span.end - span.start,
      start: span.start,
      end: span.end,
      midi,
      pitchClass,
      harmony,
      chordTone: (harmony.triad.pitchClasses as readonly number[]).includes(pitchClass),
      inCollection: (collectionPitchClasses as readonly number[]).includes(pitchClass),
      strongOnset: span.startTick === 0 || span.startTick === 8,
    }
  })
  return { context, attacks, collectionPitchClasses }
}

/** True when two attacks sound back to back with no rest between them. */
// @spec-link [[module_pitch_domain_validation]]
export function contiguous(first: SoundingFact, second: SoundingFact): boolean {
  return first.end === second.start
}

/**
 * True for a step between two collection members. Every supported collection is heptatonic with
 * no adjacent semitones, so a 1-2 semitone move between members never skips a member.
 */
// @spec-link [[module_pitch_domain_validation]]
export function collectionStep(first: SoundingFact, second: SoundingFact): boolean {
  const distance = Math.abs(second.midi - first.midi)
  return first.inCollection && second.inCollection && distance >= 1 && distance <= 2
}
