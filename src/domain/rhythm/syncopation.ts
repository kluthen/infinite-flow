import { deepFreeze } from '../events/deep-freeze'
import type { NoteDensity, Syncopation, TensionArc } from '../controls/generation-controls'
import type {
  NominalCellAddress,
  RhythmBar,
  RhythmEvent,
  RhythmTransformDescriptor,
} from './rhythm-types'
import {
  disjoint,
  displacementCandidates,
  eventEnds,
  freezeDescriptor,
  quantum,
  roles,
  sameAddress,
  sourceBoundaryTicks,
} from './transform-descriptors'

export {
  enumerateSyncopationTemplates,
  syncopationTemplateLists,
  type SyncopationSelectorMemo,
} from './syncopation-templates'

export type TransformFailureCode =
  'transform_algebra_violation' | 'transform_overlap_violation' | 'transform_address_mismatch'
export type TransformResult =
  | { readonly ok: true; readonly bar: RhythmBar }
  | { readonly ok: false; readonly code: TransformFailureCode }

const CASE_ORDER = {
  note_to_note: 0,
  interior_rest: 1,
  redistribute_note_pair: 2,
  swap_final_pattern: 3,
  tied_sustain: 4,
} as const

/** Shared frozen role lists of answer-only and dual-role answer descriptors. */
const ANSWER_ROLES = roles(true, false)
const DUAL_ROLES = roles(true, true)

/** Whether any of the event's source cells has this address. */
function hasAddress(event: RhythmEvent, address: NominalCellAddress): boolean {
  return event.sourceCells.some((cell) => sameAddress(cell.address, address))
}

/** Bar 4's single final-pattern swap descriptor, or none; other bars have no swap. */
function swapCandidates(bar: RhythmBar): readonly RhythmTransformDescriptor[] {
  if (bar.barIndex !== 3) return deepFreeze([])
  const cells = bar.events.flatMap((event) =>
    event.sourceCells.length === 1 ? [{ cell: event.sourceCells[0]!, event }] : [],
  )
  // Scan beat-3 candidates from the end of the bar backward so the swap lands on the pattern
  // closest to the bar's true ending rather than the first beat-3 cell encountered, keeping the
  // "final pattern" swap distinct from bar1's own ending instead of shadowing it.
  for (let rightIndex = cells.length - 1; rightIndex >= 0; rightIndex -= 1) {
    const { cell: right } = cells[rightIndex]!
    if (right.address.beatIndex !== 3) continue
    for (let leftIndex = 0; leftIndex < rightIndex; leftIndex += 1) {
      const { cell: left, event: leftEvent } = cells[leftIndex]!
      if (left.durationTicks !== right.durationTicks || left.kind === right.kind) continue
      return deepFreeze([
        freezeDescriptor({
          grammarVersion: 'rhythm-mvp-v2',
          case: 'swap_final_pattern',
          barIndex: bar.barIndex,
          boundaryTick: leftEvent.startTick,
          delta: 0,
          transformedBoundaries: [],
          sourceAddresses: [left.address, right.address],
          affectedAddresses: [left.address, right.address],
          roles: ['answer'],
        }),
      ])
    }
  }
  return deepFreeze([])
}

/**
 * The canonical answer lists without freezing them, for the rhythm planner, which never publishes
 * an answer list (a candidate records a fresh transform list; each descriptor is frozen when
 * built). Same lists in the same order as `enumerateAnswerTransformLists`.
 */
// @spec-link [[mechanic_syncopation_enumeration]]
export function* answerTransformLists(
  bars: readonly [RhythmBar, RhythmBar],
  density: NoteDensity,
  tension: TensionArc,
  syncopation: Syncopation,
): IterableIterator<readonly RhythmTransformDescriptor[]> {
  const candidates: RhythmTransformDescriptor[] = []
  const signed =
    syncopation === 'Active displacement' ? [-2, -1, 1, 2] : [-quantum(density), quantum(density)]
  for (const bar of bars) {
    if (syncopation === 'Straight') {
      candidates.push(
        ...displacementCandidates(bar, density, 'interior_rest', signed, ANSWER_ROLES, true),
      )
      candidates.push(
        ...displacementCandidates(
          bar,
          density,
          'redistribute_note_pair',
          signed,
          ANSWER_ROLES,
          true,
        ),
      )
      candidates.push(...swapCandidates(bar))
    } else {
      const deltas = syncopation === 'Occasional offbeats' ? [2] : signed
      for (const descriptorCase of ['note_to_note', 'interior_rest'] as const)
        candidates.push(
          ...displacementCandidates(bar, density, descriptorCase, deltas, DUAL_ROLES, false),
        )
      candidates.push(
        ...displacementCandidates(
          bar,
          density,
          'redistribute_note_pair',
          [-quantum(density), quantum(density)],
          ANSWER_ROLES,
          true,
        ),
      )
      candidates.push(...swapCandidates(bar))
    }
  }
  candidates.sort(
    (left, right) =>
      left.barIndex - right.barIndex ||
      left.boundaryTick - right.boundaryTick ||
      CASE_ORDER[left.case] - CASE_ORDER[right.case] ||
      left.delta - right.delta,
  )
  for (const descriptor of candidates) yield [descriptor]
  if (tension === 'Build' || tension === 'Edge')
    for (let left = 0; left < candidates.length; left += 1)
      for (let right = left + 1; right < candidates.length; right += 1) {
        const list = [candidates[left]!, candidates[right]!]
        if (disjoint(list)) yield list
      }
}

/** Enumerate answer lists only; no ranking, planner, or final candidate construction occurs here. */
// @spec-link [[mechanic_syncopation_enumeration]]
export function* enumerateAnswerTransformLists(
  bars: readonly [RhythmBar, RhythmBar],
  density: NoteDensity,
  tension: TensionArc,
  syncopation: Syncopation = 'Straight',
): IterableIterator<readonly RhythmTransformDescriptor[]> {
  for (const list of answerTransformLists(bars, density, tension, syncopation))
    yield deepFreeze(list)
}

/** Re-time each event to the given start ticks; each lasts until the next start or the bar end. */
function retime(events: readonly RhythmEvent[], starts: readonly number[]): readonly RhythmEvent[] {
  return events.map((event, index) => ({
    ...event,
    startTick: starts[index]!,
    durationTicks: (starts[index + 1] ?? 16) - starts[index]!,
  }))
}

/** Apply one recorded descriptor exactly; no target selection or repair is permitted. */
// @spec-link [[mechanic_syncopation_translation]]
export function applyTransform(
  bar: RhythmBar,
  descriptor: RhythmTransformDescriptor,
  freeze: <T>(value: T) => T = deepFreeze,
): TransformResult {
  if (bar.barIndex !== descriptor.barIndex) return { ok: false, code: 'transform_address_mismatch' }
  if (descriptor.case === 'swap_final_pattern') {
    const first = bar.events.findIndex((event) =>
      event.sourceCells.some((cell) => sameAddress(cell.address, descriptor.sourceAddresses[0])),
    )
    const second = bar.events.findIndex((event) =>
      event.sourceCells.some((cell) => sameAddress(cell.address, descriptor.sourceAddresses[1])),
    )
    const firstEvent = bar.events[first]
    const secondEvent = bar.events[second]
    const firstCell = firstEvent?.sourceCells[0]
    const secondCell = secondEvent?.sourceCells[0]
    if (
      first < 0 ||
      second < 0 ||
      first === second ||
      firstEvent?.sourceCells.length !== 1 ||
      secondEvent?.sourceCells.length !== 1 ||
      !firstCell ||
      !secondCell ||
      firstCell.durationTicks !== secondCell.durationTicks ||
      firstCell.kind === secondCell.kind
    )
      return { ok: false, code: 'transform_algebra_violation' }
    const events = bar.events.map((event, index) =>
      index === first
        ? { ...event, kind: secondCell.kind }
        : index === second
          ? { ...event, kind: firstCell.kind }
          : event,
    )
    return { ok: true, bar: freeze({ ...bar, events }) }
  }
  if (descriptor.case === 'tied_sustain') {
    const index = bar.events.findIndex(
      (event) =>
        event.kind === 'note' &&
        event.startTick < descriptor.strongTick &&
        eventEnds(event) > descriptor.strongTick &&
        hasAddress(event, descriptor.sourceSpan[0]) &&
        hasAddress(event, descriptor.sourceSpan[1]),
    )
    const event = bar.events[index]
    if (
      !event ||
      event.sourceCells.length < 2 ||
      !sourceBoundaryTicks({ ...bar, events: [event] }).has(descriptor.strongTick)
    )
      return { ok: false, code: 'transform_algebra_violation' }
    const leftDuration = descriptor.strongTick - event.startTick
    const rightDuration = eventEnds(event) - descriptor.strongTick
    let sourceTick = event.startTick
    const splitIndex = event.sourceCells.findIndex((cell) => {
      sourceTick += cell.durationTicks
      return sourceTick === descriptor.strongTick
    })
    if (splitIndex < 0 || splitIndex >= event.sourceCells.length - 1)
      return { ok: false, code: 'transform_algebra_violation' }
    const leftSourceCells = event.sourceCells.slice(0, splitIndex + 1)
    const rightSourceCells = event.sourceCells.slice(splitIndex + 1)
    return {
      ok: true,
      bar: freeze({
        ...bar,
        events: [
          ...bar.events.slice(0, index),
          {
            ...event,
            durationTicks: leftDuration,
            nominalDurationTicks: leftSourceCells.reduce(
              (total, cell) => total + cell.durationTicks,
              0,
            ),
            sourceCells: leftSourceCells,
            tieChainId: descriptor.tieChainId,
          },
          {
            ...event,
            startTick: descriptor.strongTick,
            durationTicks: rightDuration,
            nominalDurationTicks: rightSourceCells.reduce(
              (total, cell) => total + cell.durationTicks,
              0,
            ),
            sourceCells: rightSourceCells,
            tieChainId: descriptor.tieChainId,
            tieContinuation: true,
          },
          ...bar.events.slice(index + 1),
        ],
      }),
    }
  }
  const index = bar.events.findIndex((event) => eventEnds(event) === descriptor.boundaryTick)
  const left = bar.events[index]
  const right = bar.events[index + 1]
  if (
    !left ||
    !right ||
    !hasAddress(left, descriptor.affectedAddresses[0]) ||
    !hasAddress(right, descriptor.affectedAddresses[1])
  )
    return { ok: false, code: 'transform_address_mismatch' }
  if (descriptor.case === 'interior_rest') {
    const next = bar.events[index + 2]
    if (
      !next ||
      left.kind !== 'note' ||
      right.kind !== 'rest' ||
      next.kind !== 'note' ||
      descriptor.transformedBoundaries[0] !== descriptor.boundaryTick + descriptor.delta ||
      descriptor.transformedBoundaries[1] !== eventEnds(right) + descriptor.delta ||
      !hasAddress(next, descriptor.affectedAddresses[2])
    )
      return { ok: false, code: 'transform_algebra_violation' }
    const starts = bar.events.map((event) => event.startTick)
    starts[index + 1] = descriptor.transformedBoundaries[0]!
    starts[index + 2] = descriptor.transformedBoundaries[1]!
    const events = retime(bar.events, starts)
    return events.some((event) => event.durationTicks <= 0)
      ? { ok: false, code: 'transform_algebra_violation' }
      : { ok: true, bar: freeze({ ...bar, events }) }
  }
  if (
    left.kind !== 'note' ||
    right.kind !== 'note' ||
    descriptor.transformedBoundaries[0] !== descriptor.boundaryTick + descriptor.delta
  )
    return { ok: false, code: 'transform_algebra_violation' }
  const starts = bar.events.map((event) => event.startTick)
  starts[index + 1] = descriptor.transformedBoundaries[0]!
  const events = retime(bar.events, starts)
  return events.some((event) => event.durationTicks <= 0)
    ? { ok: false, code: 'transform_algebra_violation' }
    : { ok: true, bar: freeze({ ...bar, events }) }
}

/** Apply a descriptor set in recorded order after rejecting overlapping immutable source coordinates. */
// @spec-link [[mechanic_syncopation_translation]]
export function applyTransformSet(
  bar: RhythmBar,
  descriptors: readonly RhythmTransformDescriptor[],
  freeze: <T>(value: T) => T = deepFreeze,
): TransformResult {
  if (!disjoint(descriptors)) return { ok: false, code: 'transform_overlap_violation' }
  let current = bar
  const ordered = [...descriptors].sort((left, right) => {
    const leftAnswerOnly = left.roles.length === 1 && left.roles[0] === 'answer'
    const rightAnswerOnly = right.roles.length === 1 && right.roles[0] === 'answer'
    if (leftAnswerOnly !== rightAnswerOnly) return leftAnswerOnly ? -1 : 1
    return (
      left.barIndex - right.barIndex ||
      left.boundaryTick - right.boundaryTick ||
      CASE_ORDER[left.case] - CASE_ORDER[right.case] ||
      left.delta - right.delta
    )
  })
  for (const descriptor of ordered) {
    const result = applyTransform(current, descriptor, freeze)
    if (!result.ok) return result
    current = result.bar
  }
  return { ok: true, bar: current }
}
