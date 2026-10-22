/**
 * The five kinds of rhythm change, read from written bars. One change is one edit of a kind in one
 * measure, or the identical edit in a gesture measure (1 or 2) and its answer measure (3 or 4).
 * Measures are compared through their start lists (note starts and rest starts; ties are not
 * starts), and an entry sounds from its start to the next start or the end of the measure.
 */

import type { RhythmChangeKind } from '../generation/request-rhythm-lock'
import { TICKS_PER_BAR } from '../time/ticks'
import { measureBarKey, measureStarts, type MeasureStarts, type RhythmStart } from './rhythm-bars'
import type { BarIndex, RhythmBar } from './rhythm-types'

/** The five kinds, named once beside the request's rhythm lock and re-exported for this module. */
export type { RhythmChangeKind }

/**
 * How one candidate measure differs from the locked one: not at all, by ties only, by exactly one
 * edit of a kind (at the locked start's tick, with the move's signed shift or 0), or otherwise.
 */
// @spec-link [[rule_rhythm_change_kinds]]
export type MeasureChange =
  | { readonly type: 'same' }
  | { readonly type: 'tie' }
  | { readonly type: 'other' }
  | {
      readonly type: 'edit'
      readonly kind: RhythmChangeKind
      readonly tick: number
      readonly delta: number
    }

/** One change between two four-measure rhythms, with the measures it touches. */
// @spec-link [[rule_rhythm_change_kinds]]
export interface RhythmChange {
  readonly kind: RhythmChangeKind
  readonly form: 'one_measure' | 'repeated'
  readonly measures: readonly BarIndex[]
  readonly tick: number
  readonly delta: number
}

/** The measures of a phrase this module compares. */
const MEASURE_COUNT = 4

/** The furthest a move reaches in one change: an eighth, in sixteenth ticks. */
const MAX_MOVE = 2

/** An edit found between two start lists, with the tick span it touches: [from, to). */
interface FoundEdit {
  readonly kind: RhythmChangeKind
  readonly tick: number
  readonly delta: number
  readonly from: number
  readonly to: number
}

/** Intent: where entry `index` of a start list stops sounding: the next start, or the barline. */
function soundingEnd(starts: MeasureStarts, index: number): number {
  return starts[index + 1]?.tick ?? TICKS_PER_BAR
}

/** Intent: whether two starts are the same start: same tick, same kind. */
function sameStart(left: RhythmStart, right: RhythmStart): boolean {
  return left.tick === right.tick && left.kind === right.kind
}

/** Intent: the indices at which two start lists of equal length differ. */
function differingIndices(a: MeasureStarts, b: MeasureStarts): readonly number[] {
  const indices: number[] = []
  a.forEach((start, index) => {
    if (!sameStart(start, b[index]!)) indices.push(index)
  })
  return indices
}

/**
 * Intent: the index of the one entry of `longer` whose removal leaves `shorter`, when the lists
 * differ by exactly that one entry; otherwise undefined.
 */
function extraIndex(longer: MeasureStarts, shorter: MeasureStarts): number | undefined {
  if (longer.length !== shorter.length + 1) return undefined
  let index = 0
  while (index < shorter.length && sameStart(longer[index]!, shorter[index]!)) index += 1
  for (let rest = index; rest < shorter.length; rest += 1)
    if (!sameStart(longer[rest + 1]!, shorter[rest]!)) return undefined
  return index
}

/** Intent: whether a signed shift is a move by a sixteenth or an eighth. */
function isSmallMove(delta: number): boolean {
  return delta !== 0 && Math.abs(delta) <= MAX_MOVE
}

/** Intent: a split (B adds a note start inside an A note) or a merge (A loses one), if either. */
function splitOrMerge(a: MeasureStarts, b: MeasureStarts): FoundEdit | undefined {
  const added = extraIndex(b, a)
  if (added !== undefined && added >= 1) {
    const host = a[added - 1]!
    if (b[added]!.kind === 'note' && host.kind === 'note') {
      const tick = b[added]!.tick
      return { kind: 'split_note', tick, delta: 0, from: host.tick, to: soundingEnd(a, added - 1) }
    }
  }
  const removed = extraIndex(a, b)
  if (removed !== undefined && removed >= 1) {
    const before = a[removed - 1]!
    if (a[removed]!.kind === 'note' && before.kind === 'note') {
      const tick = a[removed]!.tick
      return {
        kind: 'merge_notes',
        tick,
        delta: 0,
        from: before.tick,
        to: soundingEnd(b, removed - 1),
      }
    }
  }
  return undefined
}

/**
 * Intent: a note turned into a rest or back, or one note start moved between two notes, when
 * exactly one entry of two equal-length lists differs.
 */
function singleEntryEdit(a: MeasureStarts, b: MeasureStarts, index: number): FoundEdit | undefined {
  const from = a[index]!
  const to = b[index]!
  const end = Math.max(soundingEnd(a, index), soundingEnd(b, index))
  if (from.tick === to.tick)
    return { kind: 'note_rest', tick: from.tick, delta: 0, from: from.tick, to: end }
  const delta = to.tick - from.tick
  if (from.kind !== 'note' || to.kind !== 'note' || !isSmallMove(delta) || index < 1)
    return undefined
  const before = a[index - 1]!
  if (before.kind !== 'note') return undefined
  return { kind: 'move_note_start', tick: from.tick, delta, from: before.tick, to: end }
}

/**
 * Intent: a rest moved between two notes, keeping its length, when exactly entries `index` and
 * `index + 1` of two equal-length lists differ, both shifted alike.
 */
function restMove(a: MeasureStarts, b: MeasureStarts, index: number): FoundEdit | undefined {
  const delta = b[index]!.tick - a[index]!.tick
  if (!isSmallMove(delta) || index < 1) return undefined
  if (b[index + 1]!.tick - a[index + 1]!.tick !== delta) return undefined
  const rests = a[index]!.kind === 'rest' && b[index]!.kind === 'rest'
  const notes = a[index + 1]!.kind === 'note' && b[index + 1]!.kind === 'note'
  if (!rests || !notes || a[index - 1]!.kind !== 'note') return undefined
  const end = Math.max(soundingEnd(a, index + 1), soundingEnd(b, index + 1))
  return { kind: 'move_rest', tick: a[index]!.tick, delta, from: a[index - 1]!.tick, to: end }
}

/** Intent: the one edit of a kind that turns start list A into B, if there is one. */
function findEdit(a: MeasureStarts, b: MeasureStarts): FoundEdit | undefined {
  if (a.length !== b.length) return splitOrMerge(a, b)
  const differing = differingIndices(a, b)
  if (differing.length === 1) return singleEntryEdit(a, b, differing[0]!)
  if (differing.length === 2 && differing[1] === differing[0]! + 1)
    return restMove(a, b, differing[0]!)
  return undefined
}

/** Intent: the ticks at which a measure's written events continue a tie, outside a span. */
function tieTicksOutside(bar: RhythmBar, from: number, to: number): string {
  return bar.events
    .filter((event) => event.tieContinuation === true)
    .map((event) => event.startTick)
    .filter((tick) => tick < from || tick >= to)
    .join(',')
}

/**
 * Intent: how a candidate measure differs from the locked one. Equal written keys are `same`;
 * equal start lists written with other ties are `tie`. Otherwise the measure is one `edit` when
 * its starts differ by exactly one edit of a kind and its ties match the locked ones outside the
 * span the edit touches (a tie added or removed elsewhere is not exactly one change); anything
 * else is `other`.
 */
// @spec-link [[rule_rhythm_change_kinds]]
export function classifyMeasureChange(locked: RhythmBar, candidate: RhythmBar): MeasureChange {
  if (measureBarKey(locked) === measureBarKey(candidate)) return { type: 'same' }
  const a = measureStarts(locked)
  const b = measureStarts(candidate)
  if (a.length === b.length && differingIndices(a, b).length === 0) return { type: 'tie' }
  const edit = findEdit(a, b)
  if (!edit) return { type: 'other' }
  if (
    tieTicksOutside(locked, edit.from, edit.to) !== tieTicksOutside(candidate, edit.from, edit.to)
  )
    return { type: 'other' }
  return { type: 'edit', kind: edit.kind, tick: edit.tick, delta: edit.delta }
}

/**
 * Intent: the one change that turns the locked rhythm into the candidate, or undefined when they
 * are equal as written or differ by anything but one change: an edit in one measure, or the
 * identical edit (kind, tick, shift) in measures k and k + 2 with k = 0 or 1. A measure differing
 * by ties only, or by more than one edit, rules the pair out. Throws unless both rhythms have four
 * measures.
 */
// @spec-link [[rule_rhythm_change_kinds]]
export function rhythmChangeBetween(
  locked: readonly RhythmBar[],
  candidate: readonly RhythmBar[],
): RhythmChange | undefined {
  if (locked.length !== MEASURE_COUNT || candidate.length !== MEASURE_COUNT)
    throw new Error(
      `A rhythm change compares four measures, not ${locked.length} and ${candidate.length}.`,
    )
  const changes = locked.map((bar, index) => classifyMeasureChange(bar, candidate[index]!))
  const differing = ([0, 1, 2, 3] as const).filter((index) => changes[index]!.type !== 'same')
  const edits = differing.map((index) => changes[index]!)
  const first = edits[0]
  if (!first || first.type !== 'edit' || edits.some((change) => change.type !== 'edit'))
    return undefined
  const change = { kind: first.kind, tick: first.tick, delta: first.delta }
  if (differing.length === 1)
    return Object.freeze({ ...change, form: 'one_measure', measures: Object.freeze(differing) })
  const [gesture, answer] = differing
  const second = edits[1]
  if (differing.length !== 2 || gesture! > 1 || answer !== gesture! + 2) return undefined
  if (second?.type !== 'edit') return undefined
  if (second.kind !== first.kind || second.tick !== first.tick || second.delta !== first.delta)
    return undefined
  return Object.freeze({ ...change, form: 'repeated', measures: Object.freeze(differing) })
}
