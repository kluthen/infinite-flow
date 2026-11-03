import { deepFreeze } from '../events/deep-freeze'
import { pitchSteeringTerm } from '../generation/steering/pitch-steering'
import {
  advanceSearchStep,
  indexedDomainMember,
  initialPitchSearchState,
  pitchStateKey,
  priorSoundingMidi,
} from './pitch-advance'
import { compilePitchSearchContext } from './pitch-context'
import { requiredMidi } from './pitch-figures'
import { orderCandidates } from './pitch-ranking'
import type { PitchTieKeyFactory } from './pitch-tie-key'
import type {
  BoundPitchPlannerInput,
  PitchAssignment,
  PitchPhrase,
  PitchPlanResult,
  PitchSearchEntry,
  PitchSearchState,
} from './pitch-types'

/** Mutable bookkeeping owned by one search run: remaining fuel and proven-dead states. */
interface SearchBudget {
  fuel: number
  limited: boolean
  readonly dead: Set<string>
}

/**
 * Deterministic depth-first search with forward checking. Each attack's search entries are tried
 * in ranked order and each `advance` call costs one unit of fuel. A state whose subtree has been
 * exhausted is recorded by its exact key and never expanded again, which cannot change the first
 * plan found.
 *
 * Where no figure path is in progress, the ordering reads the request's figure levels: at a note
 * where a favored figure is drawn, the candidates that may start it are tried first as that figure
 * (a free diatonic tone held to its resolution, then tried again unheld in its usual place). At a
 * later note of a figure no draw is made. A held entry that leads to a dead end is backed out of
 * like any other; it never prunes the same tone tried unheld, since `pitchStateKey` includes the
 * held resolution through `state.figure.free.only`. Nothing rejects or retries a phrase for
 * lacking a drawn figure, and the assignments always hold the domain member itself.
 *
 * With a steering block in the request, each attack's candidates are also ordered by the block's
 * move for that note (`pitchSteeringTerm`), below every existing rank; the hard rules still decide
 * what the transition accepts, so the block changes only which allowed candidate is tried first.
 *
 * An attack's ordered entries depend only on the attack, its required MIDI, and the prior MIDI
 * (chaos, seed, key, levels and the steering block are fixed for the run, the draw reads only the
 * seed and the attack, and the steering move only the attack's index), so they are ordered once
 * per such triple; the memo is local to one run, so no ordering outlives its block. The prefix is
 * a push/pop stack copied only into the returned phrase.
 */
// @spec-link [[module_pitch_planner]]
// @spec-link [[mechanic_pitch_search_policy]]
// @spec-link [[rule_figure_level_never_a_quota]]
// @spec-link [[rule_jam_melody_follows_doodle_moves]]
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
  const orderings = new Map<string, readonly PitchSearchEntry[]>()
  const { steering, carryIn } = input.request
  const ordered = (state: PitchSearchState): readonly PitchSearchEntry[] => {
    const attack = context.attacks[state.nextAttackIndex]!
    const required = requiredMidi(state.figure)
    const priorMidi = priorSoundingMidi(state)
    const orderingKey = `${attack.attackIndex}|${required ?? ''}|${priorMidi ?? ''}`
    let entries = orderings.get(orderingKey)
    if (!entries) {
      const term = pitchSteeringTerm(steering, attack.attackIndex, carryIn !== undefined)
      entries = orderCandidates({
        chaos: input.policy.arpeggioChaos,
        seed: input.request.seed,
        attack,
        candidates: context.candidateDomains[attack.attackIndex]!.filter(
          (candidate) => required === undefined || candidate.midi === required,
        ),
        priorMidi,
        key,
        ...(required === undefined ? { figureLevels: input.policy.figureLevels } : {}),
        ...(term === undefined ? {} : { steering: term }),
      })
      orderings.set(orderingKey, entries)
    }
    return entries
  }
  const assignments: PitchAssignment[] = []
  const visit = (state: PitchSearchState): PitchPhrase | undefined => {
    if (state.nextAttackIndex === context.attacks.length)
      return deepFreeze({ kind: 'pitch_phrase', assignments: [...assignments] })
    const stateKey = pitchStateKey(state)
    if (budget.dead.has(stateKey)) return undefined
    const attack = context.attacks[state.nextAttackIndex]!
    for (const entry of ordered(state)) {
      if (budget.fuel === 0) {
        budget.limited = true
        return undefined
      }
      budget.fuel -= 1
      const result = advanceSearchStep(context, state, entry.candidate, member, entry.favored)
      if (result.kind === 'rejected') continue
      assignments.push({ attack, candidate: entry.candidate })
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
