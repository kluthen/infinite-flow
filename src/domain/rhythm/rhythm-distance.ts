/**
 * How far one rhythm is from another, measure by measure, in edits between two start lists (note
 * starts and rest starts in ticks; ties are not starts). An edit adds one start, removes one,
 * moves one by a sixteenth or an eighth keeping its kind, or turns a note start into a rest start
 * at the same tick or back. An edit touches a strong beat when any tick it involves is beat 1 or
 * beat 3 (tick 0 or 8). Integers only.
 */

import { TICKS_PER_BAR } from '../time/ticks'
import type { MeasureStarts } from './rhythm-bars'

/** How close two measures are: no edit, one Close edit, one strong or two Close edits, or more. */
// @spec-link [[rule_rhythm_distance]]
export type RhythmBand = 'Same' | 'Close' | 'Near' | 'beyond'

/** The fewest edits between two measures and, among those, the fewest touching a strong beat. */
// @spec-link [[rule_rhythm_distance]]
export interface MeasureEdits {
  readonly edits: number
  readonly strongEdits: number
}

/** The furthest one start may move in one edit: an eighth, in sixteenth ticks. */
const MAX_MOVE = 2

/**
 * One edit's weight in the combined cost `edits * EDIT_WEIGHT + strongEdits`, which orders costs
 * lexicographically because a measure holds at most 2 * 16 edits, each touching a strong beat
 * at most once.
 */
const EDIT_WEIGHT = 64

/** Start kinds by tick, as small codes: no start, a note start, a rest start. */
const NO_START = 0
const NOTE_START = 1
const REST_START = 2

/**
 * Bits of the search state at a tick t: which starts of ticks t-1 and t-2 are still unmatched and
 * may yet be matched by a move. A start left open longer than MAX_MOVE ticks is an add or remove.
 */
const A_OPEN_1 = 1
const A_OPEN_2 = 2
const B_OPEN_1 = 4
const B_OPEN_2 = 8
const STATE_COUNT = 16

/**
 * The ways of settling one list's start at a tick: absent, left open (to be matched by a later
 * move, or else added or removed), matched by the other list's start at the same tick, or matched
 * by the other list's open start one or two ticks back (a move of one or two ticks).
 */
const ABSENT = 0
const OPEN = 1
const SAME_TICK = 2
const BACK_1 = 3
const BACK_2 = 4
const CHOICE_COUNT = 5

/** 1 at beat 1 and beat 3 (ticks 0 and 8), the strong beats an edit may touch; else 0. */
const STRONG = Uint8Array.from({ length: TICKS_PER_BAR }, (_, tick) =>
  tick === 0 || tick === TICKS_PER_BAR / 2 ? 1 : 0,
)

/**
 * Working tables reused by every search, so a search allocates nothing. The search is synchronous
 * and calls nothing that could start another one, so one set is enough.
 */
const scratch = {
  aKinds: new Uint8Array(TICKS_PER_BAR),
  bKinds: new Uint8Array(TICKS_PER_BAR),
  current: new Float64Array(STATE_COUNT),
  next: new Float64Array(STATE_COUNT),
}

/** Intent: the combined cost of one edit involving one tick, or two ticks for a move. */
function editCost(tick: number, other: number = tick): number {
  return EDIT_WEIGHT + (STRONG[tick]! | STRONG[other]!)
}

/**
 * Intent: write the start kind code at each tick of the measure into `kinds`. Throws unless the
 * starts are integer ticks of the measure in strictly increasing order.
 */
function kindsByTick(starts: MeasureStarts, kinds: Uint8Array): Uint8Array {
  kinds.fill(NO_START)
  let previous = -1
  for (const start of starts) {
    if (!Number.isInteger(start.tick) || start.tick <= previous || start.tick >= TICKS_PER_BAR)
      throw new Error(
        `Start list ticks must increase strictly within [0, ${TICKS_PER_BAR}); got ${start.tick} ` +
          `after ${previous}.`,
      )
    previous = start.tick
    kinds[start.tick] = start.kind === 'note' ? NOTE_START : REST_START
  }
  return kinds
}

/**
 * Intent: drop the starts the two lists share exactly (same tick, same kind) from both tick
 * tables, and tell whether any start is left. Matching a shared start to itself is always part of
 * some best solution: any solution that uses it otherwise can be rewritten with it matched to
 * itself without more edits or more strong edits, so only the differing starts need the search.
 */
function dropSharedStarts(a: Uint8Array, b: Uint8Array): boolean {
  let left = false
  for (let tick = 0; tick < TICKS_PER_BAR; tick += 1) {
    if (a[tick] === b[tick]) {
      a[tick] = NO_START
      b[tick] = NO_START
    } else left = true
  }
  return left
}

/** Intent: whether some search state other than "nothing open" is still reachable. */
function anyOpen(costs: Float64Array): boolean {
  for (let state = 1; state < STATE_COUNT; state += 1) if (costs[state] !== Infinity) return true
  return false
}

/**
 * Intent: whether a choice can settle a list's start of kind `own` at `tick`, given the other
 * list's kinds and which of its starts one and two ticks back are still open.
 */
function allowed(
  choice: number,
  own: number,
  other: Uint8Array,
  tick: number,
  otherOpen1: boolean,
  otherOpen2: boolean,
): boolean {
  if (choice === ABSENT) return own === NO_START
  if (own === NO_START) return false
  if (choice === OPEN) return true
  if (choice === SAME_TICK) return other[tick] !== NO_START
  if (choice === BACK_1) return otherOpen1 && other[tick - 1] === own
  return otherOpen2 && other[tick - MAX_MOVE] === own
}

/** Intent: the cost of a move choice (one or two ticks back) for a start at `tick`; else 0. */
function moveCost(choice: number, tick: number): number {
  if (choice === BACK_1) return editCost(tick, tick - 1)
  if (choice === BACK_2) return editCost(tick, tick - MAX_MOVE)
  return 0
}

/**
 * Intent: advance the search by one tick from one state: settle this tick's starts of both lists
 * every consistent way, charge the open starts two ticks back that can no longer be matched, and
 * relax the next tick's states.
 */
function relaxState(
  tick: number,
  state: number,
  cost: number,
  a: Uint8Array,
  b: Uint8Array,
  next: Float64Array,
): void {
  const aOpen1 = (state & A_OPEN_1) !== 0
  const aOpen2 = (state & A_OPEN_2) !== 0
  const bOpen1 = (state & B_OPEN_1) !== 0
  const bOpen2 = (state & B_OPEN_2) !== 0
  for (let aChoice = 0; aChoice < CHOICE_COUNT; aChoice += 1) {
    if (!allowed(aChoice, a[tick]!, b, tick, bOpen1, bOpen2)) continue
    for (let bChoice = 0; bChoice < CHOICE_COUNT; bChoice += 1) {
      if ((aChoice === SAME_TICK) !== (bChoice === SAME_TICK)) continue
      if (!allowed(bChoice, b[tick]!, a, tick, aOpen1, aOpen2)) continue
      let total = cost + moveCost(aChoice, tick) + moveCost(bChoice, tick)
      if (aChoice === SAME_TICK && a[tick] !== b[tick]) total += editCost(tick)
      const aKeep1 = aOpen1 && bChoice !== BACK_1
      const bKeep1 = bOpen1 && aChoice !== BACK_1
      if (aOpen2 && bChoice !== BACK_2) total += editCost(tick - MAX_MOVE)
      if (bOpen2 && aChoice !== BACK_2) total += editCost(tick - MAX_MOVE)
      const nextState =
        (aChoice === OPEN ? A_OPEN_1 : 0) |
        (aKeep1 ? A_OPEN_2 : 0) |
        (bChoice === OPEN ? B_OPEN_1 : 0) |
        (bKeep1 ? B_OPEN_2 : 0)
      if (total < next[nextState]!) next[nextState] = total
    }
  }
}

/** Intent: the cost of the starts still open after the last tick, which become adds or removes. */
function closingCost(state: number): number {
  const last = TICKS_PER_BAR - 1
  return (
    ((state & A_OPEN_1) !== 0 ? editCost(last) : 0) +
    ((state & A_OPEN_2) !== 0 ? editCost(last - 1) : 0) +
    ((state & B_OPEN_1) !== 0 ? editCost(last) : 0) +
    ((state & B_OPEN_2) !== 0 ? editCost(last - 1) : 0)
  )
}

/**
 * Intent: the fewest edits between two measures, and among the fewest the fewest touching a
 * strong beat. Exact over every matching of the two lists' starts, crossing pairs included (a
 * note and the rest beside it can each move past the other's place, which an order-preserving
 * alignment would miss): shared starts are matched to themselves, then a search over the ticks in
 * order, whose state is which starts of the last two ticks are still waiting for a move, settles
 * the rest. Throws on a start list that is not strictly increasing within the measure.
 */
// @spec-link [[rule_rhythm_distance]]
export function measureEdits(a: MeasureStarts, b: MeasureStarts): MeasureEdits {
  const aKinds = kindsByTick(a, scratch.aKinds)
  const bKinds = kindsByTick(b, scratch.bKinds)
  if (!dropSharedStarts(aKinds, bKinds)) return { edits: 0, strongEdits: 0 }
  let current = scratch.current.fill(Infinity)
  let next = scratch.next
  current[0] = 0
  for (let tick = 0; tick < TICKS_PER_BAR; tick += 1) {
    // With nothing open and no start here, the tick changes nothing.
    if (aKinds[tick] === NO_START && bKinds[tick] === NO_START && !anyOpen(current)) continue
    next.fill(Infinity)
    for (let state = 0; state < STATE_COUNT; state += 1) {
      const cost = current[state]!
      if (cost !== Infinity) relaxState(tick, state, cost, aKinds, bKinds, next)
    }
    ;[current, next] = [next, current]
  }
  let best = Infinity
  for (let state = 0; state < STATE_COUNT; state += 1)
    best = Math.min(best, current[state]! + closingCost(state))
  return { edits: Math.floor(best / EDIT_WEIGHT), strongEdits: best % EDIT_WEIGHT }
}

/**
 * Intent: the band of two measures: no edit is Same; one edit away from ticks 0 and 8 is Close;
 * one edit touching tick 0 or 8, or two edits neither touching them, is Near; anything else is
 * beyond.
 */
// @spec-link [[rule_rhythm_distance]]
export function measureBand(a: MeasureStarts, b: MeasureStarts): RhythmBand {
  const { edits, strongEdits } = measureEdits(a, b)
  if (edits === 0) return 'Same'
  if (edits === 1) return strongEdits === 0 ? 'Close' : 'Near'
  if (edits === 2 && strongEdits === 0) return 'Near'
  return 'beyond'
}

/** Intent: reject two rhythms that do not have the same number of measures. */
function requireSameMeasureCount(a: readonly MeasureStarts[], b: readonly MeasureStarts[]): void {
  if (a.length !== b.length)
    throw new Error(`Cannot compare rhythms of ${a.length} and ${b.length} measures.`)
}

/** Intent: the band of each measure of two rhythms, measure by measure. */
// @spec-link [[rule_rhythm_distance]]
export function measureBands(
  a: readonly MeasureStarts[],
  b: readonly MeasureStarts[],
): readonly RhythmBand[] {
  requireSameMeasureCount(a, b)
  return Object.freeze(a.map((measure, index) => measureBand(measure, b[index]!)))
}

/** Intent: the total number of edits between two rhythms over all their measures. */
// @spec-link [[rule_rhythm_distance]]
export function rhythmDistance(a: readonly MeasureStarts[], b: readonly MeasureStarts[]): number {
  requireSameMeasureCount(a, b)
  return a.reduce((total, measure, index) => total + measureEdits(measure, b[index]!).edits, 0)
}
