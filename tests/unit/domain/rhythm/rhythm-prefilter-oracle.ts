/**
 * Unpruned raw-candidate oracle for the rhythm enumeration prefilter soundness specs.
 *
 * Mirrors the be9128b `derive` loop (`git show be9128b:src/domain/rhythm/rhythm-planner.ts`) —
 * the version before the enumeration skipped Mixed-coverage-failing gestures and
 * `quickRejectRhythmCandidate` candidates — using only the exported grammar building blocks
 * (`enumerateGestureDerivations`, `enumerateAnswerTransformLists`, `enumerateSyncopationTemplates`,
 * `applyTransformSet`). `copyBar`, `disjoint`, `descriptorOrder`, and `applyByBar` below are the
 * same private helpers that be9128b version defined locally; unlike the current planner, nothing
 * here skips a gesture or a constructed candidate before yielding it, so every candidate the
 * current, pruned `derive` would have skipped is yielded here too, paired with its gesture.
 */
import { enumerateGestureDerivations } from '@/domain/rhythm/rhythm-skeleton'
import {
  applyTransformSet,
  enumerateAnswerTransformLists,
  enumerateSyncopationTemplates,
} from '@/domain/rhythm/syncopation'
import type {
  GestureDerivation,
  NormalizedRhythmExpansionInput,
  RhythmBar,
  RhythmTransformDescriptor,
  UnindexedRhythmCandidate,
} from '@/domain/rhythm/rhythm-types'

function copyBar(bar: RhythmBar, barIndex: 2 | 3): RhythmBar {
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

function disjoint(descriptors: readonly RhythmTransformDescriptor[]): boolean {
  const seen = new Set<string>()
  for (const descriptor of descriptors)
    for (const address of descriptor.affectedAddresses) {
      const key = `${address.barIndex}:${address.beatIndex}:${address.cellIndex}`
      if (seen.has(key)) return false
      seen.add(key)
    }
  return true
}

function descriptorOrder(
  left: RhythmTransformDescriptor,
  right: RhythmTransformDescriptor,
): number {
  return (
    left.barIndex - right.barIndex ||
    left.boundaryTick - right.boundaryTick ||
    (left.case < right.case ? -1 : left.case > right.case ? 1 : 0) ||
    left.delta - right.delta
  )
}

function applyByBar(
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

export interface RawRhythmCandidate {
  readonly gesture: GestureDerivation
  readonly candidate: UnindexedRhythmCandidate
}

/** Every raw candidate be9128b would have constructed and validated, paired with its gesture. */
export function* enumerateRawRhythmCandidates(
  input: NormalizedRhythmExpansionInput,
): IterableIterator<RawRhythmCandidate> {
  for (const gesture of enumerateGestureDerivations(input)) {
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
      if (!afterAnswer) continue
      const phraseBeforeSync = [...gesture.bars, ...afterAnswer]
      for (const syncopationSet of enumerateSyncopationTemplates(
        phraseBeforeSync,
        input.noteDensity,
        input.syncopation,
        answerList.filter((descriptor) => descriptor.roles.includes('syncopation')),
      )) {
        const syncStage = [
          ...answerList.filter((descriptor) => descriptor.roles.includes('syncopation')),
          ...syncopationSet,
        ]
        const transforms = [...answerOnly, ...syncStage.sort(descriptorOrder)]
        if (!disjoint(transforms)) continue
        const bars = applyByBar(phraseBeforeSync, syncStage)
        if (!bars) continue
        yield {
          gesture,
          candidate: {
            grammarVersion: input.grammarVersion,
            input,
            bars,
            recurrence: gesture.recurrence,
            transforms,
          },
        }
      }
    }
  }
}

/** The set of source-cell duration classes present across `bars`' nominal source cells. */
export function sourceCellDurations(bars: readonly RhythmBar[]): ReadonlySet<number> {
  const durations = new Set<number>()
  for (const bar of bars)
    for (const event of bar.events)
      for (const cell of event.sourceCells) durations.add(cell.durationTicks)
  return durations
}

/** Whether two duration-class sets contain exactly the same members. */
export function sameDurationSet(left: ReadonlySet<number>, right: ReadonlySet<number>): boolean {
  return left.size === right.size && [...left].every((duration) => right.has(duration))
}
