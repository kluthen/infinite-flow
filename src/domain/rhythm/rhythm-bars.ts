/**
 * Rhythms compared as written. A candidate's identity keeps its provenance, so two candidates that
 * write the same rhythm can carry different identities; the bar key built here is what compares
 * them instead. From the same bars come each measure's start list (note starts and rest starts,
 * ties ignored), which the rhythm distance and the change kinds read.
 */

import { TICKS_PER_BAR } from '../time/ticks'
import type { RhythmCandidate, RhythmEvent, RhythmEventKind } from './rhythm-types'

/**
 * A measure as written: the only parts of a measure the bar key and the start list read (each
 * event's kind, start, length and tie mark, and the measure's index for error messages). A
 * candidate's `RhythmBar` is one; so is a locked measure of the request's rhythm lock.
 */
// @spec-link [[entity_rhythm_candidate_domain]]
export interface WrittenMeasure {
  readonly barIndex: number
  readonly events: readonly Pick<
    RhythmEvent,
    'kind' | 'startTick' | 'durationTicks' | 'tieContinuation'
  >[]
}

/** One note start or rest start of a measure, at its measure-relative tick. */
// @spec-link [[entity_rhythm_candidate_domain]]
export interface RhythmStart {
  readonly tick: number
  readonly kind: RhythmEventKind
}

/** A measure's starts in strictly increasing tick order; tie continuations are not starts. */
// @spec-link [[entity_rhythm_candidate_domain]]
export type MeasureStarts = readonly RhythmStart[]

/**
 * A domain keyed by bars: each candidate's bar key and start lists by candidate index, and the
 * candidates sharing each bar key, in domain order. Derived from the candidates; it changes
 * neither their identity, nor their index, nor the domain's order.
 */
// @spec-link [[entity_rhythm_candidate_domain]]
export interface BarsKeyedRhythmDomain {
  /** Index = candidateIndex. */
  readonly keys: readonly string[]
  /** Index = candidateIndex: the candidate's four measure start lists. */
  readonly starts: readonly (readonly MeasureStarts[])[]
  /** Every candidate of the domain under its bar key, each list in domain order. */
  readonly byKey: ReadonlyMap<string, readonly RhythmCandidate[]>
}

/** One shared frozen start per tick and kind, so start lists allocate no start objects. */
const INTERNED_STARTS: Readonly<Record<RhythmEventKind, readonly RhythmStart[]>> = Object.freeze({
  note: Object.freeze(
    Array.from({ length: TICKS_PER_BAR }, (_, tick) =>
      Object.freeze({ tick, kind: 'note' as const }),
    ),
  ),
  rest: Object.freeze(
    Array.from({ length: TICKS_PER_BAR }, (_, tick) =>
      Object.freeze({ tick, kind: 'rest' as const }),
    ),
  ),
})

/**
 * Intent: the compact key of one measure as written: per event, in order, its kind letter (n or
 * r), start tick and length, with `~` before a tie continuation, e.g. `n0.2,~n2.2,r4.4`. Tie chain
 * names are left out, so two measures have equal keys exactly when they are written alike.
 */
// @spec-link [[entity_rhythm_candidate_domain]]
export function measureBarKey(bar: Pick<WrittenMeasure, 'events'>): string {
  return bar.events
    .map(
      (event) =>
        `${event.tieContinuation === true ? '~' : ''}${event.kind === 'note' ? 'n' : 'r'}` +
        `${event.startTick}.${event.durationTicks}`,
    )
    .join(',')
}

/** Intent: the bar key of a whole rhythm: its measure keys joined with `|`. */
// @spec-link [[entity_rhythm_candidate_domain]]
export function rhythmBarKey(bars: readonly Pick<WrittenMeasure, 'events'>[]): string {
  return bars.map(measureBarKey).join('|')
}

/**
 * Intent: one measure's start list: one entry per event that is not a tie continuation, in tick
 * order. Throws when the events do not start in strictly increasing order inside the measure,
 * which only a malformed bar can do.
 */
// @spec-link [[entity_rhythm_candidate_domain]]
export function measureStarts(bar: WrittenMeasure): MeasureStarts {
  let previous = -1
  const list: RhythmStart[] = []
  for (const event of bar.events) {
    if (
      !Number.isInteger(event.startTick) ||
      event.startTick <= previous ||
      event.startTick >= TICKS_PER_BAR
    )
      throw new Error(
        `Measure ${bar.barIndex}: event start ${event.startTick} breaks the strictly increasing ` +
          `order of starts in [0, ${TICKS_PER_BAR}).`,
      )
    previous = event.startTick
    if (event.tieContinuation !== true) list.push(INTERNED_STARTS[event.kind][event.startTick]!)
  }
  return Object.freeze(list)
}

/** Intent: the start list of every measure of a rhythm, in measure order. */
// @spec-link [[entity_rhythm_candidate_domain]]
export function rhythmStarts(bars: readonly WrittenMeasure[]): readonly MeasureStarts[] {
  return Object.freeze(bars.map(measureStarts))
}

/**
 * Intent: key a domain's candidates by bars. The list must be a whole domain in order (each
 * candidate's index is its position); it is read, never changed. Measures written alike share one
 * start list. Every returned list is frozen; the map is exposed read-only.
 */
// @spec-link [[entity_rhythm_candidate_domain]]
export function keyRhythmCandidates(candidates: readonly RhythmCandidate[]): BarsKeyedRhythmDomain {
  const keys: string[] = []
  const starts: (readonly MeasureStarts[])[] = []
  const groups = new Map<string, RhythmCandidate[]>()
  const startsByMeasureKey = new Map<string, MeasureStarts>()
  candidates.forEach((candidate, position) => {
    if (candidate.candidateIndex !== position)
      throw new Error(
        `Candidate at position ${position} has candidateIndex ${candidate.candidateIndex}; ` +
          'a keyed domain needs the whole domain in order.',
      )
    const measureKeys = candidate.bars.map(measureBarKey)
    const key = measureKeys.join('|')
    keys.push(key)
    starts.push(
      Object.freeze(
        candidate.bars.map((bar, index) => {
          const measureKey = measureKeys[index]!
          const known = startsByMeasureKey.get(measureKey)
          if (known) return known
          const list = measureStarts(bar)
          startsByMeasureKey.set(measureKey, list)
          return list
        }),
      ),
    )
    const group = groups.get(key)
    if (group) group.push(candidate)
    else groups.set(key, [candidate])
  })
  const byKey = new Map<string, readonly RhythmCandidate[]>()
  for (const [key, group] of groups) byKey.set(key, Object.freeze(group))
  return Object.freeze({ keys: Object.freeze(keys), starts: Object.freeze(starts), byKey })
}

/** Keyed domains by the candidate list they were built from; a list is keyed at most once. */
const keyedDomains = new WeakMap<readonly RhythmCandidate[], BarsKeyedRhythmDomain>()

/**
 * Intent: the domain keyed by bars for this exact candidate list, built on first use and then
 * shared, so a lookup by bars beside the canonical domain memo costs one map access. The list
 * must be frozen (as the memo's lists are): a list that could change would leave its keyed
 * domain stale.
 */
// @spec-link [[entity_rhythm_candidate_domain]]
export function barsKeyedDomainOf(candidates: readonly RhythmCandidate[]): BarsKeyedRhythmDomain {
  const cached = keyedDomains.get(candidates)
  if (cached) return cached
  if (!Object.isFrozen(candidates))
    throw new Error('Only a frozen candidate list can be keyed once and shared.')
  const keyed = keyRhythmCandidates(candidates)
  keyedDomains.set(candidates, keyed)
  return keyed
}
