import type { Leapiness } from '../controls/generation-controls'
import { deepFreeze } from '../events/deep-freeze'

/** Interval ceilings, leap budgets, run budgets, and deferral permission for one leapiness level. */
// @spec-link [[rule_leapiness_interval_budget]]
export interface MotionLimits {
  readonly maxInterval: number
  /** Phrase count of intervals of 5+ semitones; large leaps are counted here too. */
  readonly leaps: number
  readonly largeLeaps: number
  readonly phraseRuns: number
  readonly measureRuns: number
  /** Whether a large leap inside a recognized run may recover after the run's final note. */
  readonly deferral: boolean
}

/** The settled leapiness budgets; runs count in the bar of their first note. */
// @spec-link [[rule_leapiness_interval_budget]]
// @spec-link [[rule_leapiness_arpeggio_run_limits]]
export const LEAPINESS_LIMITS: Readonly<Record<Leapiness, MotionLimits>> = deepFreeze({
  Smooth: {
    maxInterval: 4,
    leaps: 0,
    largeLeaps: 0,
    phraseRuns: 1,
    measureRuns: 1,
    deferral: false,
  },
  Shaped: {
    maxInterval: 7,
    leaps: 2,
    largeLeaps: 1,
    phraseRuns: 1,
    measureRuns: 1,
    deferral: false,
  },
  Leaping: {
    maxInterval: 10,
    leaps: 4,
    largeLeaps: 2,
    phraseRuns: 1,
    measureRuns: 1,
    deferral: true,
  },
  Angular: {
    maxInterval: 12,
    leaps: 6,
    largeLeaps: 3,
    phraseRuns: 2,
    measureRuns: 1,
    deferral: true,
  },
})

const WIDE = 3
const LEAP = 5
const LARGE_LEAP = 7

/** The facts of one sounding note that motion rules read; chord-ness comes from the chosen MIDI. */
// @spec-link [[rule_leapiness_arpeggio_run_limits]]
export interface MotionNote {
  readonly midi: number
  readonly chordTone: boolean
  readonly harmonyIndex: number
  readonly barIndex: number
}

/**
 * A pending large-leap debt. `deferrable` debts may still move behind a run that the next interval
 * completes; `due_next` debts must be repaid by the next interval.
 */
// @spec-link [[rule_leap_recovery]]
export interface RecoveryDebt {
  readonly direction: -1 | 1
  readonly mode: 'deferrable' | 'due_next'
}

/** Immutable motion facts after the latest sounding note. */
// @spec-link [[rule_leapiness_arpeggio_run_limits]]
export interface MotionState {
  readonly prior?: MotionNote
  /** Direction of the open same-direction wide chain; 0 when no chain is open. */
  readonly chainDirection: -1 | 0 | 1
  /** Notes of the open chain, oldest first; a chain of n intervals holds n + 1 notes. */
  readonly chainNotes: readonly MotionNote[]
  readonly leaps: number
  readonly largeLeaps: number
  readonly runs: number
  readonly runsPerBar: readonly number[]
  readonly debt?: RecoveryDebt
}

// @spec-link [[rule_leapiness_arpeggio_run_limits]]
export type MotionResult =
  | { readonly kind: 'rejected'; readonly reason: string }
  | { readonly kind: 'accepted'; readonly state: MotionState }

// @spec-link [[rule_leapiness_arpeggio_run_limits]]
export const INITIAL_MOTION_STATE: MotionState = deepFreeze({
  chainDirection: 0,
  chainNotes: [],
  leaps: 0,
  largeLeaps: 0,
  runs: 0,
  runsPerBar: [0, 0, 0, 0],
})

/** Build a frozen rejection carrying a validator-aligned reason. */
function reject(reason: string): MotionResult {
  return deepFreeze({ kind: 'rejected', reason })
}

/** True when an interval repays a debt: opposite direction by 1-4 semitones. */
// @spec-link [[rule_leap_recovery]]
export function recovers(interval: number, debtDirection: -1 | 1): boolean {
  const size = Math.abs(interval)
  return Math.sign(interval) === -debtDirection && size >= 1 && size <= 4
}

/** Extend or restart the same-direction wide chain with the interval arriving at `note`. */
function nextChain(
  state: MotionState,
  prior: MotionNote,
  note: MotionNote,
  interval: number,
): Pick<MotionState, 'chainDirection' | 'chainNotes'> {
  const direction = Math.sign(interval) as -1 | 0 | 1
  if (Math.abs(interval) < WIDE) return { chainDirection: 0, chainNotes: [] }
  if (direction === state.chainDirection && state.chainNotes.length >= 2)
    return { chainDirection: direction, chainNotes: [...state.chainNotes, note] }
  return { chainDirection: direction, chainNotes: [prior, note] }
}

/** True when three chain notes are chord tones of one unchanged harmony. */
function recognizable(notes: readonly MotionNote[]): boolean {
  return notes.every((note) => note.chordTone && note.harmonyIndex === notes[0]!.harmonyIndex)
}

/** Enforce the interval cap and phrase leap budgets for one interval. */
// @spec-link [[rule_leapiness_interval_budget]]
function budgetError(limits: MotionLimits, state: MotionState, size: number): string | undefined {
  if (size > limits.maxInterval) return 'interval_cap_exceeded'
  if (size >= LEAP && state.leaps + 1 > limits.leaps) return 'leap_budget_exceeded'
  if (size >= LARGE_LEAP && state.largeLeaps + 1 > limits.largeLeaps)
    return 'large_leap_budget_exceeded'
  return undefined
}

/** Carry, repay, or defer the existing debt, then open a debt for a new large leap. */
function nextDebt(
  limits: MotionLimits,
  debt: RecoveryDebt | undefined,
  interval: number,
  chainIntervals: number,
  completesRun: boolean,
): RecoveryDebt | undefined | 'unrecovered' {
  let next = debt
  if (debt && recovers(interval, debt.direction)) next = undefined
  else if (debt?.mode === 'deferrable' && completesRun)
    next = { direction: debt.direction, mode: 'due_next' }
  else if (debt) return 'unrecovered'
  if (Math.abs(interval) < LARGE_LEAP) return next
  const deferrable = limits.deferral && !completesRun && chainIntervals === 1
  return { direction: Math.sign(interval) as -1 | 1, mode: deferrable ? 'deferrable' : 'due_next' }
}

/**
 * The motion reducer: apply one sounding note to the interval, leap, run, and recovery state.
 * It mirrors the whole-phrase rules incrementally so every accepted prefix stays legal.
 */
// @spec-link [[rule_leapiness_interval_budget]]
// @spec-link [[rule_leap_recovery]]
// @spec-link [[rule_leapiness_arpeggio_run_limits]]
export function advanceMotion(
  limits: MotionLimits,
  state: MotionState,
  note: MotionNote,
): MotionResult {
  const prior = state.prior
  if (!prior) return deepFreeze({ kind: 'accepted', state: { ...state, prior: note } })
  const interval = note.midi - prior.midi
  const size = Math.abs(interval)
  const budget = budgetError(limits, state, size)
  if (budget) return reject(budget)
  const chain = nextChain(state, prior, note, interval)
  const chainIntervals = Math.max(chain.chainNotes.length - 1, 0)
  if (chainIntervals >= 3) return reject('wide_chain_too_long')
  const completesRun = chainIntervals === 2
  if (completesRun && !recognizable(chain.chainNotes)) return reject('unrecognized_wide_chain')
  const runBar = chain.chainNotes[0]?.barIndex ?? 0
  const runsPerBar = [...state.runsPerBar]
  if (completesRun) {
    runsPerBar[runBar] = runsPerBar[runBar]! + 1
    if (state.runs + 1 > limits.phraseRuns || runsPerBar[runBar]! > limits.measureRuns)
      return reject('arpeggio_run_budget_exceeded')
  }
  const debt = nextDebt(limits, state.debt, interval, chainIntervals, completesRun)
  if (debt === 'unrecovered') return reject('unrecovered_large_leap')
  return deepFreeze({
    kind: 'accepted',
    state: {
      prior: note,
      ...chain,
      leaps: state.leaps + (size >= LEAP ? 1 : 0),
      largeLeaps: state.largeLeaps + (size >= LARGE_LEAP ? 1 : 0),
      runs: state.runs + (completesRun ? 1 : 0),
      runsPerBar,
      ...(debt ? { debt } : {}),
    },
  })
}

/** True when no recovery debt is pending, so the phrase may end on the latest note. */
// @spec-link [[rule_leap_recovery]]
export function motionSettled(state: MotionState): boolean {
  return state.debt === undefined
}

/**
 * Upper bound on how far `intervals` more notes can move in one direction. Consecutive wide moves
 * in one direction need a run, every other move contributes at most a step, and only the remaining
 * leap budget may use the full cap. Over-estimating keeps pruning sound.
 */
// @spec-link [[rule_leapiness_interval_budget]]
export function reachBound(
  limits: MotionLimits,
  intervals: number,
  leapsLeft: number,
  runsLeft: number,
): number {
  if (intervals <= 0) return 0
  const wide = Math.min(intervals, Math.ceil(intervals / 2) + Math.max(runsLeft, 0))
  const leaping = Math.min(wide, Math.max(leapsLeft, 0))
  const skip = Math.min(4, limits.maxInterval)
  return leaping * limits.maxInterval + (wide - leaping) * skip + (intervals - wide) * 2
}
