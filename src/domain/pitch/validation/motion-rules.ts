import type { Leapiness } from '../../controls/generation-controls'
import { recoveryLandsOn } from '../../generation/carry-in/phrase-ending-debt'
import { finalRecoveryMayStayOwed, joinLead, type MotionFact } from './join-rules'
import type { PhraseFacts, PitchValidationFailure } from './pitch-validation-types'

interface LeapinessRule {
  readonly maxInterval: number
  /** Phrase count of intervals of 5+ semitones; large leaps are counted here too. */
  readonly leaps: number
  readonly largeLeaps: number
  readonly phraseRuns: number
  readonly measureRuns: number
  /** Whether a large leap inside a recognized run may recover after the run's final note. */
  readonly deferral: boolean
}

/** Leapiness ceilings restated from the policy so the validator never reads planner tables. */
// @spec-link [[rule_leapiness_arpeggio_run_limits]]
const LEAPINESS_RULES: Readonly<Record<Leapiness, LeapinessRule>> = {
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
}

const WIDE = 3
const LEAP = 5
const LARGE_LEAP = 7

/** A recognized three-note run: `first` is the attack index of its first note. */
interface ArpeggioRun {
  readonly first: number
  readonly direction: -1 | 1
}

/** Signed interval arriving at attack `index + 1`. */
function intervalAfter(attacks: readonly MotionFact[], index: number): number {
  return attacks[index + 1]!.midi - attacks[index]!.midi
}

/** Enforce the adjacent-interval cap and the phrase leap budgets, reporting where each is broken. */
// @spec-link [[rule_leapiness_arpeggio_run_limits]]
function intervalFailures(
  attacks: readonly MotionFact[],
  rule: LeapinessRule,
): PitchValidationFailure[] {
  const failures: PitchValidationFailure[] = []
  let leaps = 0
  let largeLeaps = 0
  for (let index = 0; index + 1 < attacks.length; index += 1) {
    const size = Math.abs(intervalAfter(attacks, index))
    const attackIndex = index + 1
    if (size > rule.maxInterval) failures.push({ code: 'interval_cap_exceeded', attackIndex })
    if (size >= LEAP && ++leaps === rule.leaps + 1)
      failures.push({ code: 'leap_budget_exceeded', attackIndex })
    if (size >= LARGE_LEAP && ++largeLeaps === rule.largeLeaps + 1)
      failures.push({ code: 'large_leap_budget_exceeded', attackIndex })
  }
  return failures
}

/** True when three attacks starting at `first` are chord tones of one unchanged harmony. */
function recognizable(attacks: readonly MotionFact[], first: number): boolean {
  const notes = attacks.slice(first, first + 3)
  return notes.every((note) => note.chordTone && note.harmony === notes[0]!.harmony)
}

/**
 * Split the line into maximal chains of same-direction intervals of at least a skip. A chain of
 * one interval is ordinary motion, two intervals must form a recognized run, and three or more are
 * always invalid. `carriedDirection` is the direction of a chain already open when the line's
 * first note sounds (arriving at a carried pitch): a first chain continuing it counts that earlier
 * interval too, and since it spans the join it can never be a recognized run.
 */
// @spec-link [[rule_leapiness_arpeggio_run_limits]]
function wideChains(
  attacks: readonly MotionFact[],
  carriedDirection: -1 | 0 | 1,
): {
  readonly runs: readonly ArpeggioRun[]
  readonly failures: readonly PitchValidationFailure[]
} {
  const runs: ArpeggioRun[] = []
  const failures: PitchValidationFailure[] = []
  let index = 0
  while (index + 1 < attacks.length) {
    const direction = Math.sign(intervalAfter(attacks, index))
    let length = 0
    while (
      index + length + 1 < attacks.length &&
      Math.abs(intervalAfter(attacks, index + length)) >= WIDE &&
      Math.sign(intervalAfter(attacks, index + length)) === direction
    )
      length += 1
    const carried = index === 0 && length > 0 && direction === carriedDirection ? 1 : 0
    const total = length + carried
    if (total >= 3) failures.push({ code: 'wide_chain_too_long', attackIndex: index + 3 - carried })
    else if (total === 2 && carried === 0 && recognizable(attacks, index))
      runs.push({ first: index, direction: direction as -1 | 1 })
    else if (total === 2)
      failures.push({ code: 'unrecognized_wide_chain', attackIndex: index + 2 - carried })
    index += Math.max(length, 1)
  }
  return { runs, failures }
}

/** Enforce phrase and per-measure recognized-run ceilings; a run belongs to its first note's bar. */
// @spec-link [[rule_leapiness_arpeggio_run_limits]]
function runBudgetFailures(
  attacks: readonly MotionFact[],
  runs: readonly ArpeggioRun[],
  rule: LeapinessRule,
): PitchValidationFailure[] {
  const failures: PitchValidationFailure[] = []
  const perBar = [0, 0, 0, 0]
  runs.forEach((run, position) => {
    const bar = attacks[run.first]!.barIndex
    perBar[bar] = perBar[bar]! + 1
    if (position >= rule.phraseRuns || perBar[bar]! > rule.measureRuns)
      failures.push({ code: 'arpeggio_run_budget_exceeded', attackIndex: run.first })
  })
  return failures
}

/**
 * Every large leap owes an opposite-direction move of 1-4 semitones on the next interval. Where
 * the level permits deferral, a large leap inside a recognized run owes it on the interval after
 * the run's final note instead. A debt still open at the final attack is a failure, unless the
 * phrase may end owing a recovery (`mayStayOwed`) that its next phrase can repay.
 */
// @spec-link [[rule_leap_recovery]]
function recoveryFailures(
  attacks: readonly MotionFact[],
  runs: readonly ArpeggioRun[],
  rule: LeapinessRule,
  mayStayOwed: (finalMidi: number, leapDirection: -1 | 1) => boolean,
): PitchValidationFailure[] {
  const failures: PitchValidationFailure[] = []
  for (let index = 0; index + 1 < attacks.length; index += 1) {
    const leap = intervalAfter(attacks, index)
    if (Math.abs(leap) < LARGE_LEAP) continue
    const run = rule.deferral
      ? runs.find((candidate) => candidate.first <= index && index <= candidate.first + 1)
      : undefined
    const due = run ? run.first + 2 : index + 1
    if (due === attacks.length - 1 && mayStayOwed(attacks[due]!.midi, Math.sign(leap) as -1 | 1))
      continue
    const recovery = due + 1 < attacks.length ? intervalAfter(attacks, due) : 0
    const recovered =
      Math.sign(recovery) === -Math.sign(leap) && Math.abs(recovery) >= 1 && Math.abs(recovery) <= 4
    if (!recovered) failures.push({ code: 'unrecovered_large_leap', attackIndex: index + 1 })
  }
  return failures
}

/** A recovery the carried pitch still owes must be repaid by the line's first interval. */
// @spec-link [[rule_join_inherits_leap_recovery]]
function owedRecoveryFailures(
  line: readonly MotionFact[],
  owedLeapDirection: -1 | 1 | undefined,
): PitchValidationFailure[] {
  if (owedLeapDirection === undefined || line.length < 2) return []
  return recoveryLandsOn(line[0]!.midi, line[1]!.midi, owedLeapDirection)
    ? []
    : [{ code: 'unrecovered_large_leap', attackIndex: 1 }]
}

/**
 * Validate interval caps, leap budgets, recognized runs, and recovery debts for the phrase. With a
 * carry-in the carried pitch leads the line as the note before the first attack, so the join is
 * judged by the same rules as the phrase's inside (its interval counts in the phrase's budgets),
 * a chain arriving at the carried pitch stays open, and a recovery it owes falls due on the first
 * attack. Failures are reported at phrase attack indices; the join interval is attack 0.
 */
// @spec-link [[rule_leap_recovery]]
// @spec-link [[rule_leapiness_arpeggio_run_limits]]
// @spec-link [[rule_join_interval_obeys_phrase_rules]]
export function motionFailures(facts: PhraseFacts): readonly PitchValidationFailure[] {
  const rule = LEAPINESS_RULES[facts.context.policy.leapiness]
  const lead = joinLead(facts)
  const line: readonly MotionFact[] = lead ? [lead.note, ...facts.attacks] : facts.attacks
  const offset = lead ? 1 : 0
  const { runs, failures: chainFailures } = wideChains(line, lead?.chainDirection ?? 0)
  const failures = [
    ...intervalFailures(line, rule),
    ...chainFailures,
    ...runBudgetFailures(line, runs, rule),
    ...recoveryFailures(line, runs, rule, (finalMidi, direction) =>
      finalRecoveryMayStayOwed(facts, finalMidi, direction),
    ),
    ...owedRecoveryFailures(line, lead?.owedLeapDirection),
  ]
  return failures.map((failure) =>
    failure.attackIndex === undefined
      ? failure
      : { ...failure, attackIndex: failure.attackIndex - offset },
  )
}
