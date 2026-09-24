import { deepFreeze } from '../events/deep-freeze'
import type { NoteDensity, Syncopation, TensionArc } from '../controls/generation-controls'
import type {
  NominalCellAddress,
  RhythmBar,
  RhythmEvent,
  RhythmRole,
  RhythmTransformDescriptor,
  TiedSustainDescriptor,
} from './rhythm-types'

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

function sameAddress(left: NominalCellAddress, right: NominalCellAddress): boolean {
  return (
    left.grammarVersion === right.grammarVersion &&
    left.barIndex === right.barIndex &&
    left.beatIndex === right.beatIndex &&
    left.cellIndex === right.cellIndex
  )
}

function eventEnds(event: RhythmEvent): number {
  return event.startTick + event.durationTicks
}

function hasAddress(event: RhythmEvent, address: NominalCellAddress): boolean {
  return event.sourceCells.some((cell) => sameAddress(cell.address, address))
}

function quantum(density: NoteDensity): number {
  return density === 'Quarter' ? 4 : density === 'Eighth' ? 2 : 1
}

function sourceBoundaryTicks(bar: RhythmBar): ReadonlySet<number> {
  const ticks = new Set<number>([0, 16])
  for (const event of bar.events) {
    let tick = event.startTick
    for (const cell of event.sourceCells) {
      tick += cell.durationTicks
      ticks.add(tick)
    }
  }
  return ticks
}

function freezeDescriptor<T extends RhythmTransformDescriptor>(descriptor: T): T {
  return deepFreeze(descriptor)
}

function roles(answer: boolean, syncopation: boolean): readonly RhythmRole[] {
  return deepFreeze(
    answer && syncopation ? ['answer', 'syncopation'] : answer ? ['answer'] : ['syncopation'],
  )
}

function boundaryDescriptor(
  bar: RhythmBar,
  index: number,
  descriptorCase: 'note_to_note' | 'interior_rest' | 'redistribute_note_pair',
  delta: number,
  descriptorRoles: readonly RhythmRole[],
): RhythmTransformDescriptor | undefined {
  const left = bar.events[index]
  const right = bar.events[index + 1]
  if (!left || !right || left.sourceCells.length !== 1 || right.sourceCells.length !== 1)
    return undefined
  const boundaryTick = eventEnds(left)
  if (descriptorCase === 'interior_rest') {
    const next = bar.events[index + 2]
    if (!next || left.kind !== 'note' || right.kind !== 'rest' || next.kind !== 'note')
      return undefined
    if (left.durationTicks + delta <= 0 || next.durationTicks - delta <= 0) return undefined
    return freezeDescriptor({
      grammarVersion: 'rhythm-mvp-v1',
      case: 'interior_rest',
      barIndex: bar.barIndex,
      boundaryTick,
      delta,
      transformedBoundaries: [boundaryTick + delta, eventEnds(right) + delta],
      affectedAddresses: [
        left.sourceCells[0]!.address,
        right.sourceCells[0]!.address,
        next.sourceCells[0]!.address,
      ],
      roles: descriptorRoles,
    })
  }
  if (
    left.kind !== 'note' ||
    right.kind !== 'note' ||
    left.durationTicks + delta <= 0 ||
    right.durationTicks - delta <= 0
  )
    return undefined
  return freezeDescriptor({
    grammarVersion: 'rhythm-mvp-v1',
    case: descriptorCase,
    barIndex: bar.barIndex,
    boundaryTick,
    delta,
    transformedBoundaries: [boundaryTick + delta],
    affectedAddresses: [left.sourceCells[0]!.address, right.sourceCells[0]!.address],
    roles: descriptorRoles,
  })
}

function displacementCandidates(
  bar: RhythmBar,
  density: NoteDensity,
  descriptorCase: 'note_to_note' | 'interior_rest' | 'redistribute_note_pair',
  deltas: readonly number[],
  descriptorRoles: readonly RhythmRole[],
  requireGrid: boolean,
): readonly RhythmTransformDescriptor[] {
  const boundaries = sourceBoundaryTicks(bar)
  const result: RhythmTransformDescriptor[] = []
  for (const delta of deltas) {
    for (let index = 0; index < bar.events.length; index += 1) {
      const candidate = boundaryDescriptor(bar, index, descriptorCase, delta, descriptorRoles)
      if (!candidate) continue
      if (requireGrid && candidate.transformedBoundaries[0]! % quantum(density) !== 0) continue
      if (
        density === 'Mixed' &&
        descriptorCase === 'redistribute_note_pair' &&
        !boundaries.has(candidate.transformedBoundaries[0]!)
      )
        continue
      result.push(candidate)
      break // v1 retains the earliest target for a (case, delta) selector.
    }
  }
  return deepFreeze(result)
}

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
          grammarVersion: 'rhythm-mvp-v1',
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

function tieCandidate(
  bar: RhythmBar,
  permittedTicks: readonly (4 | 8 | 12)[],
): TiedSustainDescriptor | undefined {
  for (const strongTick of permittedTicks) {
    const event = bar.events.find(
      (candidate) =>
        candidate.kind === 'note' &&
        candidate.startTick < strongTick &&
        eventEnds(candidate) > strongTick,
    )
    if (
      !event ||
      event.sourceCells.length < 2 ||
      !sourceBoundaryTicks({ ...bar, events: [event] }).has(strongTick)
    )
      continue
    const sourceSpan = [event.sourceCells[0]!.address, event.sourceCells.at(-1)!.address] as const
    return freezeDescriptor({
      grammarVersion: 'rhythm-mvp-v1',
      case: 'tied_sustain',
      barIndex: bar.barIndex,
      boundaryTick: strongTick,
      delta: 0,
      transformedBoundaries: [strongTick],
      sourceSpan,
      affectedAddresses: sourceSpan,
      strongTick,
      tieChainId: `rhythm-mvp-v1/${bar.barIndex}/${event.startTick}/${strongTick}/${eventEnds(event)}`,
      roles: ['syncopation'],
    })
  }
  return undefined
}

function disjoint(descriptors: readonly RhythmTransformDescriptor[]): boolean {
  const addresses: NominalCellAddress[] = []
  for (const descriptor of descriptors) {
    for (const address of descriptor.affectedAddresses) {
      if (addresses.some((used) => sameAddress(used, address))) return false
      addresses.push(address)
    }
  }
  return true
}

/** Enumerate answer lists only; no ranking, planner, or final candidate construction occurs here. */
// @spec-link [[mechanic_syncopation_translation]]
export function* enumerateAnswerTransformLists(
  bars: readonly [RhythmBar, RhythmBar],
  density: NoteDensity,
  tension: TensionArc,
  syncopation: Syncopation = 'Straight',
): IterableIterator<readonly RhythmTransformDescriptor[]> {
  const candidates: RhythmTransformDescriptor[] = []
  const signed =
    syncopation === 'Active displacement' ? [-2, -1, 1, 2] : [-quantum(density), quantum(density)]
  for (const bar of bars) {
    if (syncopation === 'Straight') {
      candidates.push(
        ...displacementCandidates(bar, density, 'interior_rest', signed, roles(true, false), true),
      )
      candidates.push(
        ...displacementCandidates(
          bar,
          density,
          'redistribute_note_pair',
          signed,
          roles(true, false),
          true,
        ),
      )
      candidates.push(...swapCandidates(bar))
    } else {
      const deltas = syncopation === 'Occasional offbeats' ? [2] : signed
      for (const descriptorCase of ['note_to_note', 'interior_rest'] as const)
        candidates.push(
          ...displacementCandidates(bar, density, descriptorCase, deltas, roles(true, true), false),
        )
      candidates.push(
        ...displacementCandidates(
          bar,
          density,
          'redistribute_note_pair',
          [-quantum(density), quantum(density)],
          roles(true, false),
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
  for (const descriptor of candidates) yield deepFreeze([descriptor])
  if (tension === 'Build' || tension === 'Edge')
    for (let left = 0; left < candidates.length; left += 1)
      for (let right = left + 1; right < candidates.length; right += 1) {
        const list = [candidates[left]!, candidates[right]!]
        if (disjoint(list)) yield deepFreeze(list)
      }
}

/**
 * Per-bar memo of the pure syncopation selectors for one rhythm expansion, keyed by the immutable
 * bar object and the selector arguments. A gesture's bars, and every answer bar an answer list
 * leaves untouched, are the same objects across that gesture's answer lists, so each selector runs
 * once per bar instead of once per template. Weakly keyed, so a bar no candidate retains is freed.
 */
// @spec-link [[mechanic_syncopation_translation]]
export type SyncopationSelectorMemo = WeakMap<
  RhythmBar,
  Map<string, RhythmTransformDescriptor | undefined>
>

function memoSelector(
  memo: SyncopationSelectorMemo,
  bar: RhythmBar,
  key: string,
  compute: () => RhythmTransformDescriptor | undefined,
): RhythmTransformDescriptor | undefined {
  let byKey = memo.get(bar)
  if (!byKey) {
    byKey = new Map()
    memo.set(bar, byKey)
  }
  if (byKey.has(key)) return byKey.get(key)
  const value = compute()
  byKey.set(key, value)
  return value
}

function syncSelector(
  bar: RhythmBar,
  density: NoteDensity,
  selector: 'note_to_note' | 'interior_rest' | 'tied_sustain',
  active: boolean,
): RhythmTransformDescriptor | undefined {
  if (selector === 'tied_sustain') return tieCandidate(bar, active ? [4, 8, 12] : [8])
  const deltas = active ? [-2, -1, 1, 2] : [2]
  return displacementCandidates(bar, density, selector, deltas, roles(false, true), false)[0]
}

/**
 * Enumerate the finite, canonical v1 syncopation template catalog. Pass one `memo` across the
 * calls of a single expansion to share selector results between answer lists.
 */
// @spec-link [[mechanic_syncopation_translation]]
export function* enumerateSyncopationTemplates(
  bars: readonly RhythmBar[],
  density: NoteDensity,
  syncopation: Syncopation,
  coalesced: readonly RhythmTransformDescriptor[] = [],
  memo: SyncopationSelectorMemo = new WeakMap(),
): IterableIterator<readonly RhythmTransformDescriptor[]> {
  if (syncopation === 'Straight') {
    yield deepFreeze([])
    return
  }
  if (syncopation === 'Occasional offbeats') {
    const selectors = ['note_to_note', 'interior_rest', 'tied_sustain'] as const
    const dualByBar = new Map(
      coalesced
        .filter(
          (descriptor) =>
            descriptor.roles.length === 2 &&
            descriptor.roles[0] === 'answer' &&
            descriptor.roles[1] === 'syncopation',
        )
        .map((descriptor) => [descriptor.barIndex, descriptor] as const),
    )
    if (dualByBar.size !== coalesced.length) return
    const selectOccasional = (index: number, selector: (typeof selectors)[number]) =>
      memoSelector(memo, bars[index]!, `occ|${density}|${selector}`, () =>
        syncSelector(bars[index]!, density, selector, false),
      )
    // Canonical nesting is cardinality, lexicographic bar set, then shared selector.
    for (const barSet of [
      ...bars.map((_, index) => [index]),
      ...bars.flatMap((_, left) =>
        bars.slice(left + 1).map((__, offset) => [left, left + offset + 1]),
      ),
    ])
      for (const selector of selectors) {
        const selectedBars = new Set(barSet)
        if ([...dualByBar.keys()].some((barIndex) => !selectedBars.has(barIndex))) continue
        const template = barSet.map((index) => {
          const dual = dualByBar.get(index as 0 | 1 | 2 | 3)
          if (dual)
            return dual.case === selector && (selector === 'tied_sustain' || dual.delta === 2)
              ? undefined
              : null
          return selectOccasional(index, selector)
        })
        if (
          template.every(
            (descriptor, index) =>
              descriptor !== null &&
              (descriptor !== undefined || dualByBar.has(barSet[index]! as 0 | 1 | 2 | 3)),
          )
        )
          yield deepFreeze(
            template.filter(
              (descriptor): descriptor is RhythmTransformDescriptor => descriptor !== undefined,
            ),
          )
      }
    return
  }
  if (bars.length !== 4) return
  const activeTie = (bar: RhythmBar) =>
    memoSelector(memo, bar, 'tie|active', () => syncSelector(bar, density, 'tied_sustain', true))
  const activeDisplacement = (
    bar: RhythmBar,
    displacement: 'note_to_note' | 'interior_rest',
    delta: number,
  ) =>
    memoSelector(
      memo,
      bar,
      `act|${density}|${displacement}|${delta}`,
      () =>
        displacementCandidates(bar, density, displacement, [delta], roles(false, true), false)[0],
    )
  for (const pattern of [
    ['tied_sustain', 'displacement', 'tied_sustain', 'displacement'],
    ['displacement', 'tied_sustain', 'displacement', 'tied_sustain'],
  ] as const) {
    for (const displacement of ['note_to_note', 'interior_rest'] as const)
      for (const delta of [-2, -1, 1, 2]) {
        const template = bars.map((bar, index) =>
          pattern[index] === 'tied_sustain'
            ? activeTie(bar)
            : activeDisplacement(bar, displacement, delta),
        )
        if (
          template.every((descriptor) => descriptor !== undefined) &&
          disjoint(template as RhythmTransformDescriptor[])
        )
          yield deepFreeze(template as RhythmTransformDescriptor[])
      }
  }
}

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
