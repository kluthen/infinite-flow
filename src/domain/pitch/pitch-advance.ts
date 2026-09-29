import { deepFreeze } from '../events/deep-freeze'
import {
  advanceContour,
  contourComplete,
  INITIAL_CONTOUR_STATE,
  type ReachFunction,
} from './pitch-contour'
import { owedRecoveryCanSettle, resolvesOnto } from '../generation/carry-in/phrase-ending-debt'
import { carriedMotionState } from './pitch-carry-in'
import {
  advanceFigure,
  figureOwesOnlyFinalResolution,
  figureSettled,
  initialFigureState,
} from './pitch-figures'
import { advanceMotion, motionSettled, reachBound } from './pitch-motion'
import { pitchRank } from './pitch-ranking'
import type {
  PitchAdvanceResult,
  PitchAttack,
  PitchCandidate,
  PitchNoteFacts,
  PitchSearchContext,
  PitchSearchState,
} from './pitch-types'

/**
 * The search state before the first attack: with a carry-in, the carried pitch is the motion
 * reducer's prior note, with its open chain and any recovery it still owes.
 */
// @spec-link [[module_pitch_search_transition]]
// @spec-link [[rule_join_inherits_leap_recovery]]
export function initialPitchSearchState(context: PitchSearchContext): PitchSearchState {
  return deepFreeze({
    nextAttackIndex: 0,
    motion: carriedMotionState(context.input.request.carryIn),
    figure: initialFigureState(context.input.tensionBinding.figureKind !== undefined),
    contour: INITIAL_CONTOUR_STATE,
  })
}

/** Chord-tone and collection membership of a MIDI value at an attack. */
// @spec-link [[module_pitch_search_transition]]
export function noteFacts(
  context: PitchSearchContext,
  attack: PitchAttack,
  midi: number,
): PitchNoteFacts {
  const pitchClass = ((midi % 12) + 12) % 12
  return {
    midi,
    chordTone: attack.chordPitchClasses.includes(pitchClass),
    inCollection: context.collectionPitchClasses.includes(pitchClass),
  }
}

/** Remaining-budget reach used for contour forward checks after this note. */
function remainingReach(
  context: PitchSearchContext,
  motion: PitchSearchState['motion'],
): ReachFunction {
  const limits = context.limits
  return (intervals) =>
    reachBound(limits, intervals, limits.leaps - motion.leaps, limits.phraseRuns - motion.runs)
}

/**
 * Whole-phrase obligations that must be clear once the final attack is assigned. A phrase that
 * may end owing (one generated with carry-in) may leave a tense final note unresolved, or a large
 * leap unrecovered, when the next phrase's first note can settle it inside the window.
 */
// @spec-link [[rule_leap_recovery]]
// @spec-link [[rule_open_phrase_ending]]
function terminalError(
  context: PitchSearchContext,
  state: PitchSearchState,
  finalMidi: number,
): string | undefined {
  const owes = context.endingDebt
  if (
    !figureSettled(state.figure) &&
    !(owes.tenseNote && figureOwesOnlyFinalResolution(state.figure, finalMidi))
  )
    return 'terminal_figure_open'
  const debt = state.motion.debt
  if (
    !motionSettled(state.motion) &&
    !(
      owes.leapRecovery &&
      debt !== undefined &&
      owedRecoveryCanSettle(
        finalMidi,
        debt.direction,
        context.collectionPitchClasses,
        context.input.request.registerWindow,
      )
    )
  )
    return 'terminal_recovery_due'
  if (!contourComplete(context.contourPlan, state.contour)) return 'terminal_contour'
  return undefined
}

/** The pitch sounding before the next attack: the phrase's latest note, or the carried pitch. */
// @spec-link [[rule_join_interval_obeys_phrase_rules]]
export function priorSoundingMidi(state: PitchSearchState): number | undefined {
  return state.motion.prior?.midi
}

/** True when the first attack fails to resolve a tense carried note by step onto a chord tone. */
// @spec-link [[rule_join_tense_note_resolution]]
function leavesCarriedTensionUnresolved(
  context: PitchSearchContext,
  attack: PitchAttack,
  midi: number,
): boolean {
  const tense = context.carriedTenseMidi
  return (
    tense !== undefined &&
    attack.attackIndex === 0 &&
    !resolvesOnto(tense, midi, attack.chordPitchClasses, context.collectionPitchClasses)
  )
}

/** Resolves a proposed candidate to its canonical domain member at an attack, if any. */
export type DomainMemberLookup = (
  attack: PitchAttack,
  candidate: PitchCandidate,
) => PitchCandidate | undefined

/**
 * The canonical domain member matching a candidate by stable identity and MIDI. Candidates from
 * an equal but separately compiled context are accepted; anything else is outside the domain.
 */
function domainMember(
  context: PitchSearchContext,
  attack: PitchAttack,
  candidate: PitchCandidate,
): PitchCandidate | undefined {
  const member = context.candidateDomains[attack.attackIndex]!.find(
    (entry) => entry.identity === candidate.identity,
  )
  return member?.midi === candidate.midi ? member : undefined
}

/**
 * `domainMember` over per-attack identity indexes built lazily for one search run. Each index
 * keeps the first entry for an identity, which is the entry `domainMember`'s `find` returns.
 */
// @spec-link [[module_pitch_search_transition]]
export function indexedDomainMember(context: PitchSearchContext): DomainMemberLookup {
  const indexes = new Map<number, Map<string, PitchCandidate>>()
  return (attack, candidate) => {
    let index = indexes.get(attack.attackIndex)
    if (!index) {
      index = new Map()
      for (const entry of context.candidateDomains[attack.attackIndex]!)
        if (!index.has(entry.identity)) index.set(entry.identity, entry)
      indexes.set(attack.attackIndex, index)
    }
    const member = index.get(candidate.identity)
    return member?.midi === candidate.midi ? member : undefined
  }
}

/** Placeholder ranking facts for internal search steps, whose caller never reads them. */
const UNREAD_RANKING_FACTS: readonly number[] = deepFreeze([])

/**
 * The thin transition shared by `advance` and `advanceSearchStep`. `published` results carry
 * their ranking facts and are deep-frozen; internal search steps skip both because the search only
 * reads `kind` and `nextState`, and never exposes or mutates either.
 */
function transition(
  context: PitchSearchContext,
  state: PitchSearchState,
  proposed: PitchCandidate,
  member: DomainMemberLookup,
  published: boolean,
): PitchAdvanceResult {
  const finish = (result: PitchAdvanceResult): PitchAdvanceResult =>
    published ? deepFreeze(result) : result
  const attack = context.attacks[state.nextAttackIndex]
  if (!attack) return finish({ kind: 'rejected', reason: 'no_remaining_attack' })
  const candidate = member(attack, proposed)
  if (!candidate) return finish({ kind: 'rejected', reason: 'candidate_outside_domain' })
  const note = noteFacts(context, attack, candidate.midi)
  if (attack.isFinal && !context.finalMidis.includes(candidate.midi))
    return finish({ kind: 'rejected', reason: 'open_endpoint_violation' })
  if (leavesCarriedTensionUnresolved(context, attack, candidate.midi))
    return finish({ kind: 'rejected', reason: 'carried_tension_unresolved' })
  const figure = advanceFigure(state.figure, {
    attackIndex: attack.attackIndex,
    isFinal: attack.isFinal,
    ...(state.prior ? { prior: state.prior } : {}),
    note,
    candidate,
    ...(attack.isFinal && context.endingDebt.tenseNote ? { mayOweResolution: true } : {}),
  })
  if (figure.kind === 'rejected') return figure
  const motion = advanceMotion(context.limits, state.motion, {
    midi: candidate.midi,
    chordTone: note.chordTone,
    harmonyIndex: attack.harmonyIndex,
    barIndex: attack.barIndex,
  })
  if (motion.kind === 'rejected') return motion
  const contour = advanceContour(
    context.contourPlan,
    state.contour,
    attack.attackIndex,
    candidate.midi,
    remainingReach(context, motion.state),
  )
  if (!contour) return finish({ kind: 'rejected', reason: 'contour_infeasible' })
  const nextState: PitchSearchState = {
    nextAttackIndex: state.nextAttackIndex + 1,
    prior: note,
    motion: motion.state,
    figure: figure.state,
    contour,
  }
  const terminal = attack.isFinal ? terminalError(context, nextState, candidate.midi) : undefined
  if (terminal) return finish({ kind: 'rejected', reason: terminal })
  const rankingFacts = published
    ? pitchRank(context.input.policy.arpeggioChaos, attack, candidate, priorSoundingMidi(state))
    : UNREAD_RANKING_FACTS
  return finish({ kind: 'accepted', nextState, rankingFacts })
}

/**
 * The thin transition: compose the figure, motion, and contour reducers for one candidate on the
 * next attack, then apply the open-endpoint and terminal checks. It never rescans the prefix.
 */
// @spec-link [[module_pitch_search_transition]]
export function advance(
  context: PitchSearchContext,
  state: PitchSearchState,
  proposed: PitchCandidate,
): PitchAdvanceResult {
  return transition(
    context,
    state,
    proposed,
    (attack, candidate) => domainMember(context, attack, candidate),
    true,
  )
}

/**
 * `advance` as `searchPitchPlan`'s inner step: the same acceptance, rejection reason, and
 * `nextState`, resolved through the search run's `indexedDomainMember` lookup, without the unread
 * ranking facts or the defensive freeze. It is charged one unit of fuel exactly like `advance`.
 */
// @spec-link [[module_pitch_search_transition]]
export function advanceSearchStep(
  context: PitchSearchContext,
  state: PitchSearchState,
  proposed: PitchCandidate,
  member: DomainMemberLookup,
): PitchAdvanceResult {
  return transition(context, state, proposed, member, false)
}

/** Exact memo key: every field that can influence the rest of the search. */
// @spec-link [[module_pitch_search_transition]]
export function pitchStateKey(state: PitchSearchState): string {
  return JSON.stringify([
    state.nextAttackIndex,
    state.prior,
    state.motion,
    state.figure,
    state.contour,
  ])
}
