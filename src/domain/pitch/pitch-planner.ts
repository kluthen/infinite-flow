import { deepFreeze } from '../events/deep-freeze'
import { advance, initialPitchSearchState } from './pitch-advance'
import { compilePitchSearchContext, isOpenEndpointMidi } from './pitch-context'
import { contourAssignable } from './pitch-contour'
import { searchPitchPlan } from './pitch-search'
import { pitchTieKey, type PitchTieKeyFactory } from './pitch-tie-key'
import type {
  BoundPitchPlannerInput,
  PitchAssignment,
  PitchAttack,
  PitchCandidate,
  PitchPlanResult,
  PitchSearchState,
} from './pitch-types'

export type {
  BoundPitchPlannerInput,
  ConcreteTensionBinding,
  NoLegalTensionBinding,
  PitchCandidate,
  PitchPhrase,
  PitchPlanResult,
  PitchSearchContext,
  PitchSearchState,
  TensionBindingDomain,
  TensionBindingResult,
} from './pitch-types'
export { makeBoundPitchPlannerInput } from './pitch-types'
export { bindTensionRequirement, makePitchPolicy, makeTensionBindingDomain } from './pitch-policy'
export { advance } from './pitch-advance'
export { compilePitchSearchContext } from './pitch-context'

/** Chronological sounding attacks with tie-inclusive spans and absolute-beat harmony. */
// @spec-link [[module_pitch_planner]]
export function pitchAttacks(input: BoundPitchPlannerInput): readonly PitchAttack[] {
  return compilePitchSearchContext(input).attacks
}

/** The canonical candidate domain of one attack; empty for an index outside the phrase. */
// @spec-link [[entity_pitch_candidate_domain]]
export function enumeratePitchCandidates(
  input: BoundPitchPlannerInput,
  attackIndex: number,
): readonly PitchCandidate[] {
  return compilePitchSearchContext(input).candidateDomains[attackIndex] ?? deepFreeze([])
}

/**
 * True when the selected contour can still hold given the checkpoint values already assigned,
 * with every unassigned checkpoint free over its candidate MIDI values.
 */
// @spec-link [[module_pitch_planner]]
export function contourCanComplete(
  input: BoundPitchPlannerInput,
  assignments: readonly PitchAssignment[],
): boolean {
  const context = compilePitchSearchContext(input)
  const choices = context.checkpointAttackIndices.map((attackIndex, checkpoint) => {
    const assigned = assignments.find((entry) => entry.attack.attackIndex === attackIndex)
    return assigned ? [assigned.candidate.midi] : context.checkpointDomains[checkpoint]!
  })
  return contourAssignable(input.policy.contour, choices)
}

/** Replay a chronological prefix through `advance`; undefined when any step is rejected. */
// @spec-link [[module_pitch_planner]]
export function inspectPitchSearchState(
  input: BoundPitchPlannerInput,
  assignments: readonly PitchAssignment[],
): PitchSearchState | undefined {
  const context = compilePitchSearchContext(input)
  let state = initialPitchSearchState(context)
  for (const assignment of assignments) {
    if (assignment.attack.attackIndex !== state.nextAttackIndex) return undefined
    const result = advance(context, state, assignment.candidate)
    if (result.kind === 'rejected') return undefined
    state = result.nextState
  }
  return state
}

/** True when the last assignment is the final attack and leaves the phrase open. */
// @spec-link [[module_pitch_planner]]
export function isOpenPitchEndpoint(
  input: BoundPitchPlannerInput,
  assignments: readonly PitchAssignment[],
): boolean {
  const last = assignments.at(-1)
  if (!last) return false
  const context = compilePitchSearchContext(input)
  const attack = context.attacks[last.attack.attackIndex]
  return (
    attack !== undefined &&
    isOpenEndpointMidi(input, attack, last.candidate.midi, context.collectionPitchClasses)
  )
}

/** Plan one bound input with the production tie key. */
// @spec-link [[module_pitch_planner]]
export function planPitchPhrase(input: BoundPitchPlannerInput): PitchPlanResult {
  return searchPitchPlan(input, pitchTieKey)
}

/** Plan one bound input with an injected tie-key factory, e.g. to force tie-key collisions. */
// @spec-link [[module_pitch_planner]]
export function planPitchPhraseWithTieKeyFactory(
  input: BoundPitchPlannerInput,
  key: PitchTieKeyFactory,
): PitchPlanResult {
  return searchPitchPlan(input, key)
}
