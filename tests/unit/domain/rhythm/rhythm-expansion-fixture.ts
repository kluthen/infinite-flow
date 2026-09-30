/**
 * Real pre-syncopation phrases for the enumeration-equivalence specs: every (gesture, answer list)
 * of a setting over a sample of its gestures, with the answer stage applied through the unmemoized
 * `applyTransformSet`, exactly as the planner's derivation order visits them.
 */
import { normalizeRhythmExpansionInput } from '@/domain/rhythm/rhythm-planner'
import { enumerateGestureDerivations } from '@/domain/rhythm/rhythm-skeleton'
import { applyTransformSet, enumerateAnswerTransformLists } from '@/domain/rhythm/syncopation'
import type {
  GestureDerivation,
  NormalizedRhythmExpansionInput,
  RhythmBar,
  RhythmExpansionInput,
  RhythmTransformDescriptor,
} from '@/domain/rhythm/rhythm-types'

export interface ListPhrase {
  readonly input: NormalizedRhythmExpansionInput
  readonly gesture: GestureDerivation
  readonly answerBase: readonly RhythmBar[]
  readonly answerOnly: readonly RhythmTransformDescriptor[]
  readonly duals: readonly RhythmTransformDescriptor[]
  /** Undefined when the answer stage fails to apply. */
  readonly phraseBeforeSync: readonly RhythmBar[] | undefined
}

/** The planner's answer-bar copy of a gesture bar, re-addressed to bar 3 or 4. */
export function copyBar(bar: RhythmBar, barIndex: 2 | 3): RhythmBar {
  return {
    barIndex,
    events: bar.events.map((event) => ({
      ...event,
      sourceCells: event.sourceCells.map((cell) => ({
        ...cell,
        address: { ...cell.address, barIndex },
      })),
    })),
  }
}

/** Apply each bar's own descriptors (in the given order) unmemoized; undefined when one fails. */
export function applyByBar(
  bars: readonly RhythmBar[],
  descriptors: readonly RhythmTransformDescriptor[],
): readonly RhythmBar[] | undefined {
  const next: RhythmBar[] = []
  for (const bar of bars) {
    const result = applyTransformSet(
      bar,
      descriptors.filter((descriptor) => descriptor.barIndex === bar.barIndex),
    )
    if (!result.ok) return undefined
    next.push(result.bar)
  }
  return next
}

/** Every (gesture, answer list) phrase of the setting, over every `gestureStride`-th gesture. */
export function* listPhrases(
  raw: RhythmExpansionInput,
  gestureStride: number,
): IterableIterator<ListPhrase> {
  const input = normalizeRhythmExpansionInput(raw)
  let gestureIndex = -1
  for (const gesture of enumerateGestureDerivations(input)) {
    gestureIndex += 1
    if (gestureIndex % gestureStride !== 0) continue
    const answerBase = [copyBar(gesture.bars[0], 2), copyBar(gesture.bars[1], 3)] as const
    for (const answerList of enumerateAnswerTransformLists(
      answerBase,
      input.noteDensity,
      input.tensionArc,
      input.syncopation,
    )) {
      const answerOnly = answerList.filter(
        (descriptor) => descriptor.roles.length === 1 && descriptor.roles[0] === 'answer',
      )
      const afterAnswer = applyByBar(answerBase, answerOnly)
      yield {
        input,
        gesture,
        answerBase,
        answerOnly,
        duals: answerList.filter((descriptor) => descriptor.roles.includes('syncopation')),
        phraseBeforeSync: afterAnswer && [...gesture.bars, ...afterAnswer],
      }
    }
  }
}
