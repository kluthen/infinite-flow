/**
 * The free appoggiatura and the diatonic enclosure in the candidate domains and in the search's
 * order: where each is offered as a free figure path, gated by its own level, and how a drawn
 * Favored or Strongly favored level moves its first member ahead of the chord tones.
 */

import { describe, expect, it } from 'vitest'
import {
  JAZZ_FIGURE_LEVELS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureLevel,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import { isFigureDrawn } from '@/domain/pitch/figure-draw'
import {
  buildCandidateDomains,
  makeCandidateDomainMemo,
  makeFreeDomainStore,
} from '@/domain/pitch/pitch-candidates'
import { compileAttacks } from '@/domain/pitch/pitch-context'
import { collectionPitchClasses } from '@/domain/pitch/pitch-harmony'
import { orderCandidates } from '@/domain/pitch/pitch-ranking'
import { pitchTieKey } from '@/domain/pitch/pitch-tie-key'
import {
  makeBoundPitchPlannerInput,
  type BoundPitchPlannerInput,
  type ConcreteTensionBinding,
  type PitchAttack,
  type PitchCandidate,
} from '@/domain/pitch/pitch-types'
import { firstSeedWhere, levelsWith, pitchFixtureInput } from './favored-fixtures'
import { everyFigureAt } from './figure-levels-grid'

/** Pitch class of a MIDI value. */
function pc(midi: number): number {
  return ((midi % 12) + 12) % 12
}

/** Neutral's levels with the free appoggiatura and the diatonic enclosure as today. */
const BOTH_AS_TODAY = levelsWith({ appoggiatura: 'asToday', diatonicEnclosure: 'asToday' })

/**
 * The fixture's attacks (quarter notes under one C major tonic; a rest on bar 1's and bar 3's
 * beat 1 and on the last beat): 0 at 0:0, 1 at 0:4, 2 at 0:8, 3 at 0:12, 4 at 1:4, 5 at 1:8,
 * 6 at 1:12, 7 at 2:0 ... 11 at 3:0, 12 at 3:4, 13 at 3:8 (final).
 */
function fixture(
  figureLevels: FigureLevels,
  tensionBinding?: ConcreteTensionBinding,
): {
  readonly input: BoundPitchPlannerInput
  readonly attacks: readonly PitchAttack[]
  readonly collection: readonly number[]
  readonly domains: readonly (readonly PitchCandidate[])[]
} {
  const input = pitchFixtureInput({
    figureLevels,
    ...(tensionBinding === undefined ? {} : { tensionBinding }),
  })
  const attacks = compileAttacks(input)
  const collection = collectionPitchClasses(input.policy)
  return { input, attacks, collection, domains: buildCandidateDomains(input, attacks, collection) }
}

/**
 * The fixture's attacks with a new harmony event from attack 6 on: an F major chord unless
 * `chordPitchClasses` names another.
 */
function withChordChangeAtSix(
  attacks: readonly PitchAttack[],
  chordPitchClasses: readonly number[] = [5, 9, 0],
): readonly PitchAttack[] {
  return attacks.map((attack) =>
    attack.attackIndex < 6
      ? attack
      : {
          ...attack,
          harmonyIndex: 1,
          harmonyIdentity: 'fixture/1',
          chordPitchClasses,
          isFirstUnderHarmonyChange: attack.attackIndex === 6,
        },
  )
}

/** The free path members of `kind` at `memberPosition`, by attack index. */
function freeMembers(
  domains: readonly (readonly PitchCandidate[])[],
  kind: string,
  memberPosition: number,
): ReadonlyMap<number, readonly PitchCandidate[]> {
  const byAttack = new Map<number, PitchCandidate[]>()
  domains.forEach((domain, attackIndex) => {
    const members = domain.filter(
      (candidate) =>
        candidate.reservation?.figureKind === kind &&
        candidate.reservation.bindingIdentity === undefined &&
        candidate.reservation.memberPosition === memberPosition,
    )
    if (members.length > 0) byAttack.set(attackIndex, members)
  })
  return byAttack
}

/** Every role offered across a set of domains. */
function rolesOf(domains: readonly (readonly PitchCandidate[])[]): readonly string[] {
  return [...new Set(domains.flat().map((candidate) => candidate.role))].sort()
}

// @test-link [[rule_embellishment_figures_defined]]
// @test-link [[rule_figures_resolve_onto_chord_tones]]
describe('candidate domains: the free appoggiatura', () => {
  it('is offered on beat 1 or 3, never first or final, resolving onto the next attack under the same chord', () => {
    const { attacks, collection, domains } = fixture(BOTH_AS_TODAY)
    const offered = freeMembers(domains, 'appoggiatura', 0)
    expect([...offered.keys()]).toEqual([2, 5, 7, 9, 11])
    for (const [attackIndex, members] of offered) {
      const attack = attacks[attackIndex]!
      const target = attacks[attackIndex + 1]!
      expect(attack.startTick === 0 || attack.startTick === 8).toBe(true)
      for (const candidate of members) {
        const reservation = candidate.reservation!
        const [tone, goal] = reservation.path as [number, number]
        expect(candidate.role).toBe('appoggiatura')
        expect(reservation.attackIndices).toEqual([attackIndex])
        expect(reservation.targetAttackIndex).toBe(attackIndex + 1)
        expect(tone).toBe(candidate.midi)
        expect(collection).toContain(pc(tone))
        expect(attack.chordPitchClasses).not.toContain(pc(tone))
        expect(target.chordPitchClasses).toContain(pc(goal))
        expect([1, 2]).toContain(Math.abs(tone - goal))
        expect(candidate.figures).toEqual(['appoggiatura'])
      }
    }
  })

  it('is not offered where the chord changes before the next attack', () => {
    const { input, attacks, collection } = fixture(BOTH_AS_TODAY)
    const domains = buildCandidateDomains(input, withChordChangeAtSix(attacks), collection)
    expect([...freeMembers(domains, 'appoggiatura', 0).keys()]).toEqual([2, 7, 9, 11])
  })

  it('is never offered when its level is off', () => {
    const { domains } = fixture(levelsWith({ diatonicEnclosure: 'asToday' }))
    expect(freeMembers(domains, 'appoggiatura', 0).size).toBe(0)
    expect(rolesOf(domains)).not.toContain('appoggiatura')
  })
})

// @test-link [[rule_embellishment_figures_defined]]
// @test-link [[rule_figures_resolve_onto_chord_tones]]
describe('candidate domains: the diatonic enclosure', () => {
  it('is offered only on three back-to-back notes under one chord, in both orders', () => {
    const { attacks, collection, domains } = fixture(BOTH_AS_TODAY)
    const first = freeMembers(domains, 'diatonic_enclosure', 0)
    const second = freeMembers(domains, 'diatonic_enclosure', 1)
    // Attacks 2-4 and 3-5 are split by bar 1's opening rest; 12 and 13 have no target after them.
    expect([...first.keys()]).toEqual([0, 1, 4, 5, 6, 7, 8, 9, 10, 11])
    expect([...second.keys()]).toEqual([1, 2, 5, 6, 7, 8, 9, 10, 11, 12])
    for (const [attackIndex, members] of first) {
      const chord = attacks[attackIndex]!.chordPitchClasses
      const paths = new Set(members.map((candidate) => candidate.reservation!.path.join('.')))
      for (const candidate of members) {
        const reservation = candidate.reservation!
        const [start, end, goal] = reservation.path as [number, number, number]
        expect(reservation.attackIndices).toEqual([attackIndex, attackIndex + 1])
        expect(reservation.targetAttackIndex).toBe(attackIndex + 2)
        expect(Math.sign(start - goal)).toBe(-Math.sign(end - goal))
        for (const member of [start, end]) {
          expect([1, 2]).toContain(Math.abs(member - goal))
          expect(collection).toContain(pc(member))
          expect(chord).not.toContain(pc(member))
        }
        expect(attacks[attackIndex + 2]!.chordPitchClasses).toContain(pc(goal))
        expect(candidate.role).toBe(
          start > goal ? 'diatonic_enclosure_upper' : 'diatonic_enclosure_lower',
        )
        expect(candidate.figures).toEqual(['diatonicEnclosure'])
        expect(paths.has([end, start, goal].join('.'))).toBe(true)
      }
    }
    for (const [attackIndex, members] of second)
      for (const candidate of members) {
        const [start, end, goal] = candidate.reservation!.path as [number, number, number]
        expect(candidate.midi).toBe(end)
        expect(candidate.reservation!.attackIndices).toEqual([attackIndex - 1, attackIndex])
        expect(candidate.role).toBe(
          end > goal ? 'diatonic_enclosure_upper' : 'diatonic_enclosure_lower',
        )
        expect(start).not.toBe(end)
        expect(candidate).not.toHaveProperty('figures')
      }
  })

  it('is not offered across a chord change', () => {
    const { input, attacks, collection } = fixture(BOTH_AS_TODAY)
    const domains = buildCandidateDomains(input, withChordChangeAtSix(attacks), collection)
    expect([...freeMembers(domains, 'diatonic_enclosure', 0).keys()]).toEqual([
      0, 1, 6, 7, 8, 9, 10, 11,
    ])
  })

  it("is not offered on a member of Tension's scheduled figure", () => {
    const binding: ConcreteTensionBinding = {
      identity: 'fixture/appoggiatura/5/6',
      bindingIndex: 0,
      figureKind: 'appoggiatura',
      attackIndices: [5],
      targetAttackIndex: 6,
    }
    const { domains } = fixture(BOTH_AS_TODAY, binding)
    expect([...freeMembers(domains, 'diatonic_enclosure', 0).keys()]).toEqual([
      0, 1, 6, 7, 8, 9, 10, 11,
    ])
    expect([...freeMembers(domains, 'appoggiatura', 0).keys()]).toEqual([2, 7, 9, 11])
    for (const candidate of domains[5]!)
      expect(candidate.reservation?.bindingIdentity).toBe(binding.identity)
  })

  it('is never offered when its level is off', () => {
    const roles = rolesOf(fixture(levelsWith({ appoggiatura: 'asToday' })).domains)
    expect(roles).not.toContain('diatonic_enclosure_upper')
    expect(roles).not.toContain('diatonic_enclosure_lower')
  })
})

// @test-link [[rule_levels_govern_free_figures_only]]
describe("candidate domains: Neutral's and Jazz's levels", () => {
  it('offer no free appoggiatura and no diatonic enclosure, so their roles are unchanged', () => {
    expect(rolesOf(fixture(NEUTRAL_FIGURE_LEVELS).domains)).toEqual([
      'chord_tone',
      'passing_or_neighbor',
    ])
    expect(rolesOf(fixture(JAZZ_FIGURE_LEVELS).domains)).toEqual([
      'chord_tone',
      'chromatic_approach',
      'chromatic_enclosure_lower',
      'chromatic_enclosure_upper',
      'passing_or_neighbor',
    ])
  })
})

describe('candidate domains: shared free domains with the new figures allowed', () => {
  // The last case changes only the harmony event, not the chord, so only the appoggiatura's
  // offer on attack 5 tells the two phrases' free domains apart.
  it.each([
    ['every figure as today', everyFigureAt('asToday'), [5, 9, 0]],
    ["Neutral's levels with both new figures as today", BOTH_AS_TODAY, [5, 9, 0]],
    [
      "Neutral's levels with the appoggiatura as today",
      levelsWith({ appoggiatura: 'asToday' }),
      [0, 4, 7],
    ],
  ] as const)(
    'match fresh domains across tension bindings and across phrases, %s',
    (_, levels, chord) => {
      const { input, attacks, collection } = fixture(levels)
      const store = makeFreeDomainStore(input, collection)
      const memo = makeCandidateDomainMemo(attacks, store)
      const bound = makeBoundPitchPlannerInput({
        request: input.request,
        policy: input.policy,
        harmony: input.harmony,
        rhythm: input.rhythm,
        tensionBinding: {
          identity: 'fixture/appoggiatura/5/6',
          bindingIndex: 0,
          figureKind: 'appoggiatura',
          attackIndices: [5],
          targetAttackIndex: 6,
        },
      })
      const changed = withChordChangeAtSix(attacks, chord)
      for (const [phraseInput, phraseAttacks, phraseMemo] of [
        [input, attacks, memo],
        [bound, attacks, memo],
        [input, changed, makeCandidateDomainMemo(changed, store)],
        [bound, changed, makeCandidateDomainMemo(changed, store)],
      ] as const)
        expect(buildCandidateDomains(phraseInput, phraseAttacks, collection, phraseMemo)).toEqual(
          buildCandidateDomains(phraseInput, phraseAttacks, collection),
        )
    },
  )
})

/** The order of an attack's real domain under the levels and seed. */
function orderAt(
  attack: PitchAttack,
  candidates: readonly PitchCandidate[],
  seed: number,
  figureLevels: FigureLevels,
) {
  return orderCandidates({
    chaos: 'Predictable',
    seed,
    attack,
    candidates,
    priorMidi: 64,
    key: pitchTieKey,
    figureLevels,
  })
}

const FAVORED_LEVELS = ['favored', 'stronglyFavored'] as const satisfies readonly FigureLevel[]

/** The two new figures, each with the attack the test orders and the path kind it starts. */
const NEW_FIGURES = [
  { figure: 'appoggiatura', attackIndex: 2, kind: 'appoggiatura' },
  { figure: 'diatonicEnclosure', attackIndex: 1, kind: 'diatonic_enclosure' },
] as const

// @test-link [[module_favored_figure_draw]]
// @test-link [[rule_figure_level_orders_search]]
describe("favored order: a free appoggiatura's and a diatonic enclosure's first member", () => {
  for (const { figure, attackIndex, kind } of NEW_FIGURES)
    for (const level of FAVORED_LEVELS)
      it(`comes before every chord tone, with no hold, when ${figure} is drawn at ${level}`, () => {
        const figureLevels = levelsWith({ [figure]: level })
        const { attacks, domains } = fixture(figureLevels)
        const attack = attacks[attackIndex]!
        const candidates = domains[attackIndex]!
        const starters = candidates.filter(
          (candidate) =>
            candidate.reservation?.figureKind === kind &&
            candidate.reservation.memberPosition === 0,
        )
        expect(starters.length).toBeGreaterThan(0)
        const seed = firstSeedWhere((value) => isFigureDrawn(value, attack.identity, figure, level))
        const entries = orderAt(attack, candidates, seed, figureLevels)
        const firstChord = entries.findIndex((entry) => entry.candidate.role === 'chord_tone')
        const leading = entries.slice(0, firstChord)
        expect(leading.map((entry) => entry.candidate.identity).sort()).toEqual(
          starters.map((candidate) => candidate.identity).sort(),
        )
        for (const entry of leading) {
          expect(entry.favored).toEqual({ figure, level })
          expect(entry.favored).not.toHaveProperty('hold')
        }
        expect(entries).toHaveLength(candidates.length)
      })

  for (const { figure, attackIndex, kind } of NEW_FIGURES)
    it(`comes after the chord tones, unheld, when ${figure} is as today`, () => {
      const figureLevels = levelsWith({ [figure]: 'asToday' })
      const { attacks, domains } = fixture(figureLevels)
      const entries = orderAt(attacks[attackIndex]!, domains[attackIndex]!, 1, figureLevels)
      const roles = entries.map((entry) => entry.candidate.role)
      const lastChord = roles.lastIndexOf('chord_tone')
      const firstStarter = entries.findIndex(
        (entry) => entry.candidate.reservation?.figureKind === kind,
      )
      expect(firstStarter).toBeGreaterThan(lastChord)
      expect(entries.every((entry) => entry.favored === undefined)).toBe(true)
    })
})
