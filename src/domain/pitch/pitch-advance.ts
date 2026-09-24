import { deepFreeze } from '../events/deep-freeze'
import {
  advanceContour,
  contourComplete,
  INITIAL_CONTOUR_STATE,
  type ReachFunction,
} from './pitch-contour'
import { advanceFigure, figureSettled, initialFigureState } from './pitch-figures'
import { advanceMotion, INITIAL_MOTION_STATE, motionSettled, reachBound } from './pitch-motion'
import { pitchRank } from './pitch-ranking'
import type {
  PitchAdvanceResult,
  PitchAttack,
  PitchCandidate,
  PitchNoteFacts,
  PitchSearchContext,
  PitchSearchState,
} from './pitch-types'

/** The search state before the first attack. */
// @spec-link [[module_pitch_planner]]
export function initialPitchSearchState(context: PitchSearchContext): PitchSearchState {
  return deepFreeze({
    nextAttackIndex: 0,
    motion: INITIAL_MOTION_STATE,
    figure: initialFigureState(context.input.tensionBinding.figureKind !== undefined),
    contour: INITIAL_CONTOUR_STATE,
  })
}

/** Build a frozen rejection carrying a validator-aligned reason. */
function reject(reason: string): PitchAdvanceResult {
  return deepFreeze({ kind: 'rejected', reason })
}

/** Chord-tone and collection membership of a MIDI value at an attack. */
// @spec-link [[module_pitch_planner]]
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

/** Whole-phrase obligations that must be clear once the final attack is assigned. */
function terminalError(context: PitchSearchContext, state: PitchSearchState): string | undefined {
  if (!figureSettled(state.figure)) return 'terminal_figure_open'
  if (!motionSettled(state.motion)) return 'terminal_recovery_due'
  if (!contourComplete(context.contourPlan, state.contour)) return 'terminal_contour'
  return undefined
}

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
 * The thin transition: compose the figure, motion, and contour reducers for one candidate on the
 * next attack, then apply the open-endpoint and terminal checks. It never rescans the prefix.
 */
// @spec-link [[module_pitch_planner]]
export function advance(
  context: PitchSearchContext,
  state: PitchSearchState,
  proposed: PitchCandidate,
): PitchAdvanceResult {
  const attack = context.attacks[state.nextAttackIndex]
  if (!attack) return reject('no_remaining_attack')
  const candidate = domainMember(context, attack, proposed)
  if (!candidate) return reject('candidate_outside_domain')
  const note = noteFacts(context, attack, candidate.midi)
  if (attack.isFinal && !context.finalMidis.includes(candidate.midi))
    return reject('open_endpoint_violation')
  const figure = advanceFigure(state.figure, {
    attackIndex: attack.attackIndex,
    isFinal: attack.isFinal,
    ...(state.prior ? { prior: state.prior } : {}),
    note,
    candidate,
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
  if (!contour) return reject('contour_infeasible')
  const nextState: PitchSearchState = {
    nextAttackIndex: state.nextAttackIndex + 1,
    prior: note,
    motion: motion.state,
    figure: figure.state,
    contour,
  }
  const terminal = attack.isFinal ? terminalError(context, nextState) : undefined
  if (terminal) return reject(terminal)
  return deepFreeze({
    kind: 'accepted',
    nextState,
    rankingFacts: pitchRank(
      context.input.policy.arpeggioChaos,
      attack,
      candidate,
      state.prior?.midi,
    ),
  })
}

/** Exact memo key: every field that can influence the rest of the search. */
// @spec-link [[module_pitch_planner]]
export function pitchStateKey(state: PitchSearchState): string {
  return JSON.stringify([
    state.nextAttackIndex,
    state.prior,
    state.motion,
    state.figure,
    state.contour,
  ])
}
