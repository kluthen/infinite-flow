/**
 * Transform-descriptor primitives shared by the answer-list and syncopation-template enumerators
 * and by transform application: address identity, the bar's source-cell boundaries, and the pure
 * target selectors that build one frozen descriptor for a (case, delta) or tie request.
 */
import { deepFreeze } from '../events/deep-freeze'
import type { NoteDensity } from '../controls/generation-controls'
import type {
  NominalCellAddress,
  RhythmBar,
  RhythmEvent,
  RhythmRole,
  RhythmTransformDescriptor,
  TiedSustainDescriptor,
} from './rhythm-types'

/** Whether two source-cell addresses are the same grammar-versioned bar, beat, and cell. */
// @spec-link [[mechanic_syncopation_enumeration]]
export function sameAddress(left: NominalCellAddress, right: NominalCellAddress): boolean {
  return (
    left.grammarVersion === right.grammarVersion &&
    left.barIndex === right.barIndex &&
    left.beatIndex === right.beatIndex &&
    left.cellIndex === right.cellIndex
  )
}

/** The tick at which an event stops sounding (its start plus its duration). */
export function eventEnds(event: RhythmEvent): number {
  return event.startTick + event.durationTicks
}

/** The selected note density's grid step in ticks: 4 (Quarter), 2 (Eighth), or 1 (Sixteenth). */
export function quantum(density: NoteDensity): number {
  return density === 'Quarter' ? 4 : density === 'Eighth' ? 2 : 1
}

/** Every tick at which a source cell ends within the bar, plus the bar edges 0 and 16. */
export function sourceBoundaryTicks(bar: RhythmBar): ReadonlySet<number> {
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

/** Freeze a freshly built descriptor before it leaves its selector. */
export function freezeDescriptor<T extends RhythmTransformDescriptor>(descriptor: T): T {
  return deepFreeze(descriptor)
}

/** The frozen role list of a descriptor that serves the answer, the syncopation, or both. */
export function roles(answer: boolean, syncopation: boolean): readonly RhythmRole[] {
  return deepFreeze(
    answer && syncopation ? ['answer', 'syncopation'] : answer ? ['answer'] : ['syncopation'],
  )
}

/** The descriptor for one event boundary under a displacement case, or none when illegal there. */
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
      grammarVersion: 'rhythm-mvp-v2',
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
    grammarVersion: 'rhythm-mvp-v2',
    case: descriptorCase,
    barIndex: bar.barIndex,
    boundaryTick,
    delta,
    transformedBoundaries: [boundaryTick + delta],
    affectedAddresses: [left.sourceCells[0]!.address, right.sourceCells[0]!.address],
    roles: descriptorRoles,
  })
}

/** The earliest legal target per delta for one displacement case, in delta order. */
// @spec-link [[mechanic_syncopation_enumeration]]
export function displacementCandidates(
  bar: RhythmBar,
  density: NoteDensity,
  descriptorCase: 'note_to_note' | 'interior_rest' | 'redistribute_note_pair',
  deltas: readonly number[],
  descriptorRoles: readonly RhythmRole[],
  requireGrid: boolean,
): readonly RhythmTransformDescriptor[] {
  const result: RhythmTransformDescriptor[] = []
  for (const delta of deltas) {
    for (let index = 0; index < bar.events.length; index += 1) {
      const candidate = boundaryDescriptor(bar, index, descriptorCase, delta, descriptorRoles)
      if (!candidate) continue
      if (requireGrid && candidate.transformedBoundaries[0]! % quantum(density) !== 0) continue
      result.push(candidate)
      break // v1 retains the earliest target for a (case, delta) selector.
    }
  }
  return deepFreeze(result)
}

/** The first tied-sustain descriptor across the permitted strong ticks, in tick order. */
// @spec-link [[mechanic_syncopation_enumeration]]
export function tieCandidate(
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
      grammarVersion: 'rhythm-mvp-v2',
      case: 'tied_sustain',
      barIndex: bar.barIndex,
      boundaryTick: strongTick,
      delta: 0,
      transformedBoundaries: [strongTick],
      sourceSpan,
      affectedAddresses: sourceSpan,
      strongTick,
      tieChainId: `rhythm-mvp-v2/${bar.barIndex}/${event.startTick}/${strongTick}/${eventEnds(event)}`,
      roles: ['syncopation'],
    })
  }
  return undefined
}

/** Whether no two descriptors touch the same grammar-versioned source-cell address. */
export function disjoint(descriptors: readonly RhythmTransformDescriptor[]): boolean {
  const addresses: NominalCellAddress[] = []
  for (const descriptor of descriptors) {
    for (const address of descriptor.affectedAddresses) {
      if (addresses.some((used) => sameAddress(used, address))) return false
      addresses.push(address)
    }
  }
  return true
}
