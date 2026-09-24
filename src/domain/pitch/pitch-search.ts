import { deepFreeze } from '../events/deep-freeze'
import { advance, initialPitchSearchState, pitchStateKey } from './pitch-advance'
import { compilePitchSearchContext } from './pitch-context'
import { requiredMidi } from './pitch-figures'
import { orderCandidates } from './pitch-ranking'
import type { PitchTieKeyFactory } from './pitch-tie-key'
import type {
  BoundPitchPlannerInput,
  PitchAssignment,
  PitchPhrase,
  PitchPlanResult,
  PitchSearchState,
} from './pitch-types'

/** Mutable bookkeeping owned by one search run: remaining fuel and proven-dead states. */
interface SearchBudget {
  fuel: number
  limited: boolean
  readonly dead: Set<string>
}

/**
 * Deterministic depth-first search with forward checking. Candidates are tried in ranked order
 * and each `advance` call costs one unit of fuel. A state whose subtree has been exhausted is
 * recorded by its exact key and never expanded again, which cannot change the first plan found.
 */
// @spec-link [[module_pitch_planner]]
// @spec-link [[mechanic_pitch_search_policy]]
export function searchPitchPlan(
  input: BoundPitchPlannerInput,
  key: PitchTieKeyFactory,
): PitchPlanResult {
  const context = compilePitchSearchContext(input)
  // A phrase whose context is missing a contour checkpoint for some bar (including the
  // zero-attack, all-rest case) can never satisfy the terminal contour check, so it is infeasible
  // before search starts rather than trivially "solved" by having nothing left to assign.
  if (context.contourPlan.impossible)
    return deepFreeze({ kind: 'no_legal_pitch_plan', fuelUsed: 0 })
  const budget: SearchBudget = { fuel: input.policy.searchFuel, limited: false, dead: new Set() }
  const visit = (
    state: PitchSearchState,
    assignments: readonly PitchAssignment[],
  ): PitchPhrase | undefined => {
    if (state.nextAttackIndex === context.attacks.length)
      return deepFreeze({ kind: 'pitch_phrase', assignments: [...assignments] })
    const stateKey = pitchStateKey(state)
    if (budget.dead.has(stateKey)) return undefined
    const attack = context.attacks[state.nextAttackIndex]!
    const required = requiredMidi(state.figure)
    const domain = context.candidateDomains[attack.attackIndex]!.filter(
      (candidate) => required === undefined || candidate.midi === required,
    )
    const ordered = orderCandidates({
      chaos: input.policy.arpeggioChaos,
      seed: input.request.seed,
      attack,
      candidates: domain,
      priorMidi: state.prior?.midi,
      key,
    })
    for (const candidate of ordered) {
      if (budget.fuel === 0) {
        budget.limited = true
        return undefined
      }
      budget.fuel -= 1
      const result = advance(context, state, candidate)
      if (result.kind === 'rejected') continue
      const phrase = visit(result.nextState, [...assignments, { attack, candidate }])
      if (phrase || budget.limited) return phrase
    }
    budget.dead.add(stateKey)
    return undefined
  }
  const phrase = visit(initialPitchSearchState(context), [])
  const fuelUsed = input.policy.searchFuel - budget.fuel
  if (phrase) return deepFreeze({ kind: 'pitch_plan', phrase, fuelUsed })
  if (budget.limited) return deepFreeze({ kind: 'search_limit_exceeded', fuelUsed })
  return deepFreeze({ kind: 'no_legal_pitch_plan', fuelUsed })
}
