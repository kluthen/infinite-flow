import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  JAZZ_FIGURE_LEVELS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import { isFigureDrawn } from '@/domain/pitch/figure-draw'
import { compilePitchSearchContext } from '@/domain/pitch/pitch-context'
import { orderCandidates } from '@/domain/pitch/pitch-ranking'
import { searchPitchPlan } from '@/domain/pitch/pitch-search'
import { pitchTieKey } from '@/domain/pitch/pitch-tie-key'
import type {
  BoundPitchPlannerInput,
  ConcreteTensionBinding,
  PitchAttack,
  PitchCandidate,
} from '@/domain/pitch/pitch-types'
import { validatePitchPhrase } from '@/domain/pitch/validation/pitch-phrase-validator'
import { levelsWith, pitchFixtureInput, plainCarryIn } from './favored-fixtures'
import { everyFigureAt } from './figure-levels-grid'

/** Whether the wrapped draw may draw at all; off, it draws nothing, as if every level were lower. */
const draws = vi.hoisted(() => ({ enabled: true }))

// The real draw, wrapped in a spy, so a test can see whether any draw was computed, or turn draws off.
vi.mock('@/domain/pitch/figure-draw', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/domain/pitch/figure-draw')>()
  return {
    ...actual,
    isFigureDrawn: vi.fn(
      (...args: Parameters<typeof actual.isFigureDrawn>) =>
        draws.enabled && actual.isFigureDrawn(...args),
    ),
  }
})

// The real ordering, wrapped in a spy, so a test can read what the search asks it.
vi.mock('@/domain/pitch/pitch-ranking', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/domain/pitch/pitch-ranking')>()
  return { ...actual, orderCandidates: vi.fn(actual.orderCandidates) }
})

beforeEach(() => {
  draws.enabled = true
  vi.mocked(isFigureDrawn).mockClear()
  vi.mocked(orderCandidates).mockClear()
})

/** Tension's scheduled appoggiatura on attack 2, resolving on attack 3. */
const BOUND_APPOGGIATURA: ConcreteTensionBinding = {
  identity: 'fixture/appoggiatura/2/3',
  bindingIndex: 0,
  figureKind: 'appoggiatura',
  attackIndices: [2],
  targetAttackIndex: 3,
}

/** Tension's scheduled passing or neighbor tone on attack 5, resolving on attack 6. */
const BOUND_PASSING: ConcreteTensionBinding = {
  identity: 'fixture/diatonic_passing_or_neighbor/5/6',
  bindingIndex: 0,
  figureKind: 'diatonic_passing_or_neighbor',
  attackIndices: [5],
  targetAttackIndex: 6,
}

const ALL_STRONGLY_FAVORED = everyFigureAt('stronglyFavored')

/** Inputs every candidate kind appears in: chromatic paths, Tension's figures, a tense ending. */
function variedInputs(figureLevels: FigureLevels): readonly BoundPitchPlannerInput[] {
  return [
    pitchFixtureInput({ figureLevels }),
    pitchFixtureInput({ figureLevels, tensionBinding: BOUND_APPOGGIATURA }),
    pitchFixtureInput({ figureLevels, tensionBinding: BOUND_PASSING }),
    pitchFixtureInput({ figureLevels, carryIn: plainCarryIn() }),
  ]
}

/** The kinds of candidate no draw may move, by what makes each one immovable. */
function immovableKind(candidate: PitchCandidate, finalAttack: boolean): string | undefined {
  const reservation = candidate.reservation
  if (candidate.role === 'chord_tone') return 'chord tone'
  if (reservation?.bindingIdentity !== undefined) return "Tension's figure"
  if (reservation !== undefined && reservation.memberPosition > 0) return 'later path note'
  if (finalAttack && candidate.role === 'passing_or_neighbor') return 'tense ending'
  return undefined
}

/**
 * Check one attack's order with every level Strongly favored against the order before the levels:
 * the favored entries come first and name their figure, none is of an immovable kind, and the
 * rest is the earlier order without the moved path first members. Records in `seen` the immovable
 * kinds the rest holds; returns how many favored entries there were.
 */
function expectOnlyStartersMoved(
  attack: PitchAttack,
  candidates: readonly PitchCandidate[],
  seed: number,
  seen: Set<string>,
): number {
  const common = { chaos: 'Varied', seed, attack, candidates, key: pitchTieKey } as const
  const before = orderCandidates({ ...common, priorMidi: 64 }).map((entry) => entry.candidate)
  const entries = orderCandidates({ ...common, priorMidi: 64, figureLevels: ALL_STRONGLY_FAVORED })
  const favored = entries.filter((entry) => entry.favored !== undefined)
  expect(entries.slice(0, favored.length)).toEqual(favored)
  for (const entry of favored) {
    expect(entry.candidate.figures).toContain(entry.favored!.figure)
    expect(immovableKind(entry.candidate, attack.isFinal)).toBeUndefined()
  }
  const moved = new Set(
    favored
      .filter((entry) => entry.candidate.reservation !== undefined)
      .map((entry) => entry.candidate.identity),
  )
  const rest = entries.slice(favored.length).map((entry) => entry.candidate)
  expect(rest).toEqual(before.filter((candidate) => !moved.has(candidate.identity)))
  for (const candidate of rest) {
    const kind = immovableKind(candidate, attack.isFinal)
    if (kind !== undefined) seen.add(kind)
  }
  return favored.length
}

// @test-link [[module_favored_figure_draw]]
// @test-link [[rule_figure_level_orders_search]]
describe('favored search: a draw moves only the candidates that may start a figure', () => {
  it('leaves every other candidate in the order before the levels existed', () => {
    const seen = new Set<string>()
    let favoredEntries = 0
    for (const input of variedInputs(ALL_STRONGLY_FAVORED)) {
      const context = compilePitchSearchContext(input)
      for (const attack of context.attacks) {
        const candidates = context.candidateDomains[attack.attackIndex]!
        for (let seed = 1; seed <= 12; seed += 1)
          favoredEntries += expectOnlyStartersMoved(attack, candidates, seed, seen)
      }
    }
    expect(favoredEntries).toBeGreaterThan(0)
    expect([...seen].sort()).toEqual([
      "Tension's figure",
      'chord tone',
      'later path note',
      'tense ending',
    ])
  })

  it('passes no levels to the ordering while a figure path is in progress', () => {
    let inProgress = 0
    let inProgressNamingDrawn = 0
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const input = pitchFixtureInput({ seed, figureLevels: ALL_STRONGLY_FAVORED })
      const context = compilePitchSearchContext(input)
      vi.mocked(orderCandidates).mockClear()
      expect(searchPitchPlan(input, pitchTieKey).kind).toBe('pitch_plan')
      for (const [call] of vi.mocked(orderCandidates).mock.calls) {
        const domain = context.candidateDomains[call.attack.attackIndex]!
        // The search filters an attack's domain to the path's required MIDI exactly while a path
        // is in progress; the full domain is ordered otherwise.
        if (call.candidates.length === domain.length) {
          expect(call.figureLevels).toBe(input.policy.figureLevels)
          continue
        }
        inProgress += 1
        expect(call).not.toHaveProperty('figureLevels')
        const named = call.candidates.flatMap((candidate) => candidate.figures ?? [])
        if (
          named.some((figure) =>
            isFigureDrawn(seed, call.attack.identity, figure, 'stronglyFavored'),
          )
        )
          inProgressNamingDrawn += 1
      }
    }
    expect(inProgress).toBeGreaterThan(0)
    expect(inProgressNamingDrawn).toBeGreaterThan(0)
  })
})

/** Favored levels the search is checked under, over Jazz's levels. */
const FAVORED_LEVELS: readonly FigureLevels[] = [
  ...(['passingTone', 'accentedPassingTone', 'neighborTone'] as const).map((figure) =>
    levelsWith({ [figure]: 'stronglyFavored' }, JAZZ_FIGURE_LEVELS),
  ),
  levelsWith({ chromaticApproach: 'stronglyFavored' }, JAZZ_FIGURE_LEVELS),
  levelsWith({ chromaticEnclosure: 'stronglyFavored' }, JAZZ_FIGURE_LEVELS),
  levelsWith({ passingTone: 'favored', neighborTone: 'stronglyFavored' }, JAZZ_FIGURE_LEVELS),
  ALL_STRONGLY_FAVORED,
]

// @test-link [[rule_figure_level_never_a_quota]]
// @test-link [[module_favored_figure_draw]]
describe('favored search: results under the levels', () => {
  it('finds a valid phrase under favored levels over the pitch fixtures', () => {
    let changed = 0
    for (const figureLevels of FAVORED_LEVELS)
      for (const input of variedInputs(figureLevels)) {
        const result = searchPitchPlan(input, pitchTieKey)
        expect(result.kind).toBe('pitch_plan')
        if (result.kind !== 'pitch_plan') continue
        expect(validatePitchPhrase(input, result.phrase).kind).toBe('valid_pitch_phrase')
        draws.enabled = false
        if (JSON.stringify(searchPitchPlan(input, pitchTieKey)) !== JSON.stringify(result))
          changed += 1
        draws.enabled = true
      }
    expect(changed).toBeGreaterThan(0)
  })

  it("computes no draw under Neutral's and Jazz's levels, so the result is the one without draws", () => {
    for (const figureLevels of [NEUTRAL_FIGURE_LEVELS, JAZZ_FIGURE_LEVELS])
      for (const input of variedInputs(figureLevels)) {
        const result = searchPitchPlan(input, pitchTieKey)
        draws.enabled = false
        expect(searchPitchPlan(input, pitchTieKey)).toEqual(result)
        draws.enabled = true
      }
    expect(isFigureDrawn).not.toHaveBeenCalled()
  })
})
