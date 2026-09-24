import { deepFreeze } from '../events/deep-freeze'
import {
  advanceSearchStep,
  indexedDomainMember,
  initialPitchSearchState,
  pitchStateKey,
} from './pitch-advance'
import { compilePitchSearchContext } from './pitch-context'
import { requiredMidi } from './pitch-figures'
import { orderCandidates } from './pitch-ranking'
import type { PitchTieKeyFactory } from './pitch-tie-key'
import type {
  BoundPitchPlannerInput,
  PitchAssignment,
  PitchCandidate,
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
 *
 * An attack's ordered candidates depend only on the attack, its required MIDI, and the prior MIDI
 * (chaos, seed, and key are fixed for the run), so they are ordered once per such triple. The
 * prefix is a push/pop stack copied only into the returned phrase.
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
  const member = indexedDomainMember(context)
  const orderings = new Map<string, readonly PitchCandidate[]>()
  const ordered = (state: PitchSearchState): readonly PitchCandidate[] => {
    const attack = context.attacks[state.nextAttackIndex]!
    const required = requiredMidi(state.figure)
    const priorMidi = state.prior?.midi
    const orderingKey = `${attack.attackIndex}|${required ?? ''}|${priorMidi ?? ''}`
    let candidates = orderings.get(orderingKey)
    if (!candidates) {
      candidates = orderCandidates({
        chaos: input.policy.arpeggioChaos,
        seed: input.request.seed,
        attack,
        candidates: context.candidateDomains[attack.attackIndex]!.filter(
          (candidate) => required === undefined || candidate.midi === required,
        ),
        priorMidi,
        key,
      })
      orderings.set(orderingKey, candidates)
    }
    return candidates
  }
  const assignments: PitchAssignment[] = []
  const visit = (state: PitchSearchState): PitchPhrase | undefined => {
    if (state.nextAttackIndex === context.attacks.length)
      return deepFreeze({ kind: 'pitch_phrase', assignments: [...assignments] })
    const stateKey = pitchStateKey(state)
    if (budget.dead.has(stateKey)) return undefined
    const attack = context.attacks[state.nextAttackIndex]!
    for (const candidate of ordered(state)) {
      if (budget.fuel === 0) {
        budget.limited = true
        return undefined
      }
      budget.fuel -= 1
      const result = advanceSearchStep(context, state, candidate, member)
      if (result.kind === 'rejected') continue
      assignments.push({ attack, candidate })
      const phrase = visit(result.nextState)
      if (phrase || budget.limited) return phrase
      assignments.pop()
    }
    budget.dead.add(stateKey)
    return undefined
  }
  const phrase = visit(initialPitchSearchState(context))
  const fuelUsed = input.policy.searchFuel - budget.fuel
  if (phrase) return deepFreeze({ kind: 'pitch_plan', phrase, fuelUsed })
  if (budget.limited) return deepFreeze({ kind: 'search_limit_exceeded', fuelUsed })
  return deepFreeze({ kind: 'no_legal_pitch_plan', fuelUsed })
}
