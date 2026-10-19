import { describe, expect, it } from 'vitest'
import {
  JAZZ_FIGURE_LEVELS,
  type FigureId,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import { isFigureDrawn } from '@/domain/pitch/figure-draw'
import {
  advance,
  advanceSearchStep,
  indexedDomainMember,
  initialPitchSearchState,
  pitchStateKey,
} from '@/domain/pitch/pitch-advance'
import { compilePitchSearchContext } from '@/domain/pitch/pitch-context'
import { orderCandidates } from '@/domain/pitch/pitch-ranking'
import { pitchTieKey } from '@/domain/pitch/pitch-tie-key'
import type {
  FavoredEntry,
  PitchCandidate,
  PitchSearchContext,
  PitchSearchEntry,
  PitchSearchState,
} from '@/domain/pitch/pitch-types'
import { firstSeedWhere, levelsWith, pitchFixtureInput } from './favored-fixtures'

/** The fixture's compiled context under the levels and seed. */
function contextFor(figureLevels: FigureLevels, seed: number): PitchSearchContext {
  return compilePitchSearchContext(pitchFixtureInput({ seed, figureLevels }))
}

/** The domain member at an attack with the MIDI and role, which must exist. */
function member(
  context: PitchSearchContext,
  attackIndex: number,
  midi: number,
  role: PitchCandidate['role'],
): PitchCandidate {
  const found = context.candidateDomains[attackIndex]!.find(
    (candidate) =>
      candidate.midi === midi && candidate.role === role && candidate.reservation === undefined,
  )
  if (!found) throw new Error(`no ${role} ${midi} at attack ${attackIndex}`)
  return found
}

/** The state after chord tones at the leading attacks, each of which must be accepted. */
function stateAfterChordTones(
  context: PitchSearchContext,
  midis: readonly number[],
): PitchSearchState {
  let state = initialPitchSearchState(context)
  midis.forEach((midi, attackIndex) => {
    const result = advance(context, state, member(context, attackIndex, midi, 'chord_tone'))
    if (result.kind !== 'accepted') throw new Error(`chord tone ${midi} rejected: ${result.reason}`)
    state = result.nextState
  })
  return state
}

/** The search order at the state's next attack, as the search builds it with the levels. */
function entriesAt(context: PitchSearchContext, state: PitchSearchState) {
  const attack = context.attacks[state.nextAttackIndex]!
  return orderCandidates({
    chaos: context.input.policy.arpeggioChaos,
    seed: context.input.request.seed,
    attack,
    candidates: context.candidateDomains[attack.attackIndex]!,
    priorMidi: state.prior?.midi,
    key: pitchTieKey,
    figureLevels: context.input.policy.figureLevels,
  })
}

/** The accepted next state, failing loudly on a rejection. */
function accepted(
  context: PitchSearchContext,
  state: PitchSearchState,
  candidate: PitchCandidate,
  favored?: FavoredEntry,
): PitchSearchState {
  const result = advance(context, state, candidate, favored)
  if (result.kind !== 'accepted') throw new Error(`rejected: ${result.reason}`)
  return result.nextState
}

/** The rejection reason of a step, or 'accepted'. */
function outcome(
  context: PitchSearchContext,
  state: PitchSearchState,
  candidate: PitchCandidate,
  favored?: FavoredEntry,
): string {
  const result = advance(context, state, candidate, favored)
  return result.kind === 'accepted' ? 'accepted' : result.reason
}

/** The held and the unheld entry of the free tone at `midi` in an order. */
function heldAndUnheld(entries: readonly PitchSearchEntry[], midi: number) {
  const tone = entries.filter(
    (entry) => entry.candidate.midi === midi && entry.candidate.role === 'passing_or_neighbor',
  )
  const held = tone.filter((entry) => entry.favored !== undefined)
  const unheld = tone.filter((entry) => entry.favored === undefined)
  expect(held).toHaveLength(1)
  expect(unheld).toHaveLength(1)
  return { held: held[0]!, unheld: unheld[0]! }
}

/**
 * One drawn figure at a free tone F (65) approached from E (64): the passing continuation is G
 * (67) and the neighbor return is E (64).
 */
const DRAWS = [
  {
    name: 'the passing tone on a weak beat (attack 1, 0:4)',
    prefix: [64],
    drawn: 'passingTone',
    undrawn: 'neighborTone',
    continuation: 67,
    other: 64,
  },
  {
    name: 'the neighbor tone on a weak beat (attack 1, 0:4)',
    prefix: [64],
    drawn: 'neighborTone',
    undrawn: 'passingTone',
    continuation: 64,
    other: 67,
  },
  {
    name: 'the accented passing tone on beat 3 (attack 2, 0:8)',
    prefix: [60, 64],
    drawn: 'accentedPassingTone',
    undrawn: 'neighborTone',
    continuation: 67,
    other: 64,
  },
] as const

// @test-link [[module_favored_figure_draw]]
// @test-link [[rule_figure_level_orders_search]]
describe('favored advance: a held free tone is written only as its drawn figure', () => {
  for (const { name, prefix, drawn, undrawn, continuation, other } of DRAWS)
    it(`holds ${name} to its resolution, while the unheld tone keeps both`, () => {
      const figureLevels = levelsWith({ [drawn]: 'stronglyFavored', [undrawn]: 'favored' })
      const identity = contextFor(figureLevels, 1).attacks[prefix.length]!.identity
      const seed = firstSeedWhere(
        (candidate) =>
          isFigureDrawn(candidate, identity, drawn, 'stronglyFavored') &&
          !isFigureDrawn(candidate, identity, undrawn as FigureId, 'favored'),
      )
      const context = contextFor(figureLevels, seed)
      const before = stateAfterChordTones(context, prefix)
      const { held, unheld } = heldAndUnheld(entriesAt(context, before), 65)
      expect(held.favored?.figure).toBe(drawn)
      const heldState = accepted(context, before, held.candidate, held.favored)
      const unheldState = accepted(context, before, unheld.candidate)
      expect(pitchStateKey(heldState)).not.toBe(pitchStateKey(unheldState))
      const next = prefix.length + 1
      const continuationTone = member(context, next, continuation, 'chord_tone')
      const otherTone = member(context, next, other, 'chord_tone')
      expect(outcome(context, heldState, otherTone)).toBe('free_figure_off')
      expect(outcome(context, heldState, continuationTone)).toBe('accepted')
      expect(outcome(context, unheldState, otherTone)).toBe('accepted')
      expect(outcome(context, unheldState, continuationTone)).toBe('accepted')
    })

  it('agrees with the search step on a held entry', () => {
    const figureLevels = levelsWith({ passingTone: 'stronglyFavored' })
    const identity = contextFor(figureLevels, 1).attacks[1]!.identity
    const seed = firstSeedWhere((candidate) =>
      isFigureDrawn(candidate, identity, 'passingTone', 'stronglyFavored'),
    )
    const context = contextFor(figureLevels, seed)
    const before = stateAfterChordTones(context, [64])
    const { held } = heldAndUnheld(entriesAt(context, before), 65)
    const viaAdvance = advance(context, before, held.candidate, held.favored)
    const viaStep = advanceSearchStep(
      context,
      before,
      held.candidate,
      indexedDomainMember(context),
      held.favored,
    )
    expect(viaStep.kind).toBe('accepted')
    expect(viaAdvance.kind).toBe('accepted')
    if (viaAdvance.kind === 'accepted' && viaStep.kind === 'accepted')
      expect(viaStep.nextState).toEqual(viaAdvance.nextState)
  })
})

// @test-link [[module_favored_figure_draw]]
describe('favored advance: a favored entry must match its candidate', () => {
  const context = contextFor(
    levelsWith({ chromaticApproach: 'stronglyFavored' }, JAZZ_FIGURE_LEVELS),
    1,
  )
  const before = stateAfterChordTones(context, [64])

  it('rejects a figure the candidate does not name', () => {
    const chord = member(context, 1, 67, 'chord_tone')
    const favored: FavoredEntry = { figure: 'passingTone', level: 'favored', hold: 'passing' }
    expect(outcome(context, before, chord, favored)).toBe('favored_figure_not_named')
    const free = member(context, 1, 65, 'passing_or_neighbor')
    expect(outcome(context, before, free, { figure: 'chromaticApproach', level: 'favored' })).toBe(
      'favored_figure_not_named',
    )
  })

  it('rejects a free tone without a hold and a path first member with one', () => {
    const free = member(context, 1, 65, 'passing_or_neighbor')
    expect(outcome(context, before, free, { figure: 'passingTone', level: 'favored' })).toBe(
      'favored_hold_mismatch',
    )
    const approach = context.candidateDomains[1]!.find(
      (candidate) => candidate.figures?.includes('chromaticApproach') === true,
    )
    if (!approach) throw new Error('no chromatic approach first member at attack 1')
    expect(
      outcome(context, before, approach, {
        figure: 'chromaticApproach',
        level: 'stronglyFavored',
        hold: 'passing',
      }),
    ).toBe('favored_hold_mismatch')
  })

  it('publishes the ranking facts of a favored entry with its level first', () => {
    const free = member(context, 1, 65, 'passing_or_neighbor')
    for (const [level, first] of [
      ['stronglyFavored', -2],
      ['favored', -1],
    ] as const) {
      const result = advance(context, before, free, {
        figure: 'passingTone',
        level,
        hold: 'passing',
      })
      expect(result.kind).toBe('accepted')
      if (result.kind === 'accepted') expect(result.rankingFacts[0]).toBe(first)
    }
    const unheld = advance(context, before, free)
    expect(unheld.kind === 'accepted' && unheld.rankingFacts[0]).toBe(0)
  })
})
