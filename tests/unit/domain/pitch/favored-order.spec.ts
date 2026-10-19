import { describe, expect, it } from 'vitest'
import { FIGURE_IDS, type FigureId, type FigureLevels } from '@/domain/figures/figure-levels'
import { isFigureDrawn } from '@/domain/pitch/figure-draw'
import { orderCandidates } from '@/domain/pitch/pitch-ranking'
import { pitchTieKey, type PitchTieKeyFactory } from '@/domain/pitch/pitch-tie-key'
import type { PitchAttack, PitchCandidate, PitchSearchEntry } from '@/domain/pitch/pitch-types'
import { firstSeedWhere, handAttack, handCandidate, levelsWith } from './favored-fixtures'

/** Chord tones C E G and two free diatonic tones D and F naming a passing figure and the neighbor. */
function weakBeatCandidates(passing: FigureId): readonly PitchCandidate[] {
  return [
    handCandidate({ role: 'chord_tone', midi: 60, enumerationIndex: 0 }),
    handCandidate({ role: 'chord_tone', midi: 64, enumerationIndex: 1 }),
    handCandidate({ role: 'chord_tone', midi: 67, enumerationIndex: 2 }),
    handCandidate({
      role: 'passing_or_neighbor',
      midi: 62,
      enumerationIndex: 3,
      figures: [passing, 'neighborTone'],
    }),
    handCandidate({
      role: 'passing_or_neighbor',
      midi: 65,
      enumerationIndex: 4,
      figures: [passing, 'neighborTone'],
    }),
  ]
}

/** The order of the candidates at an attack under the levels and seed. */
function order(
  attack: PitchAttack,
  candidates: readonly PitchCandidate[],
  seed: number,
  figureLevels?: FigureLevels,
  key: PitchTieKeyFactory = pitchTieKey,
): readonly PitchSearchEntry[] {
  return orderCandidates({
    chaos: 'Predictable',
    seed,
    attack,
    candidates,
    priorMidi: 64,
    key,
    ...(figureLevels === undefined ? {} : { figureLevels }),
  })
}

/** The entries before the first chord tone. */
function leading(entries: readonly PitchSearchEntry[]): readonly PitchSearchEntry[] {
  const firstChord = entries.findIndex((entry) => entry.candidate.role === 'chord_tone')
  return entries.slice(0, firstChord)
}

/** An entry as a short readable label: the candidate's identity and, when held, its figure. */
function label(entry: PitchSearchEntry): string {
  return entry.favored === undefined
    ? entry.candidate.identity
    : `${entry.candidate.identity}|${entry.favored.figure}`
}

// @test-link [[module_favored_figure_draw]]
// @test-link [[rule_figure_level_orders_search]]
describe('favored order: one drawn figure at a free diatonic tone', () => {
  const cases = [
    {
      name: 'a passing tone on a weak beat',
      attack: handAttack(),
      drawn: 'passingTone',
      undrawn: 'neighborTone',
      hold: 'passing',
    },
    {
      name: 'a neighbor tone on a weak beat',
      attack: handAttack(),
      drawn: 'neighborTone',
      undrawn: 'passingTone',
      hold: 'neighbor',
    },
    {
      name: 'an accented passing tone on beat 1',
      attack: handAttack({ identity: '1:0', startTick: 0, isBeatOne: true, barIndex: 1 }),
      drawn: 'accentedPassingTone',
      undrawn: 'neighborTone',
      hold: 'passing',
    },
    {
      name: 'an accented passing tone on beat 3',
      attack: handAttack({ identity: '0:8', startTick: 8, start: 8, end: 12 }),
      drawn: 'accentedPassingTone',
      undrawn: 'neighborTone',
      hold: 'passing',
    },
  ] as const

  for (const { name, attack, drawn, undrawn, hold } of cases)
    it(`tries the free tones first, held, as ${name}, and again unheld after the chord tones`, () => {
      const passing = drawn === 'neighborTone' ? undrawn : drawn
      const candidates = weakBeatCandidates(passing)
      const figureLevels = levelsWith({ [drawn]: 'stronglyFavored', [undrawn]: 'favored' })
      // The first seed drawing the one figure at this note and not the other.
      const seed = firstSeedWhere(
        (candidate) =>
          isFigureDrawn(candidate, attack.identity, drawn, 'stronglyFavored') &&
          !isFigureDrawn(candidate, attack.identity, undrawn, 'favored'),
      )
      const entries = order(attack, candidates, seed, figureLevels)
      const first = leading(entries)
      expect(first.map((entry) => entry.candidate.midi).sort()).toEqual([62, 65])
      for (const entry of first)
        expect(entry.favored).toEqual({ figure: drawn, level: 'stronglyFavored', hold })
      const rest = entries.slice(first.length)
      expect(rest.every((entry) => entry.favored === undefined)).toBe(true)
      expect(rest.map((entry) => entry.candidate)).toEqual(
        order(attack, candidates, seed).map((entry) => entry.candidate),
      )
      expect(rest.map((entry) => entry.candidate.role).slice(0, 3)).toEqual([
        'chord_tone',
        'chord_tone',
        'chord_tone',
      ])
    })
})

// @test-link [[module_favored_figure_draw]]
// @test-link [[rule_figure_level_orders_search]]
describe('favored order: both figures drawn at one free diatonic tone', () => {
  const attack = handAttack()
  const candidates = weakBeatCandidates('passingTone')

  it('gives each free tone one held entry per figure, the higher level first', () => {
    const figureLevels = levelsWith({ passingTone: 'favored', neighborTone: 'stronglyFavored' })
    const seed = firstSeedWhere(
      (candidate) =>
        isFigureDrawn(candidate, attack.identity, 'passingTone', 'favored') &&
        isFigureDrawn(candidate, attack.identity, 'neighborTone', 'stronglyFavored'),
    )
    const first = leading(order(attack, candidates, seed, figureLevels))
    expect(first.map((entry) => entry.favored)).toEqual([
      { figure: 'neighborTone', level: 'stronglyFavored', hold: 'neighbor' },
      { figure: 'neighborTone', level: 'stronglyFavored', hold: 'neighbor' },
      { figure: 'passingTone', level: 'favored', hold: 'passing' },
      { figure: 'passingTone', level: 'favored', hold: 'passing' },
    ])
    expect(first.map((entry) => entry.candidate.midi).sort()).toEqual([62, 62, 65, 65])
  })

  it('orders equal levels by the seeded tie key over the candidate and the figure', () => {
    const figureLevels = levelsWith({ passingTone: 'stronglyFavored', neighborTone: 'favored' })
    const equal = { ...figureLevels, neighborTone: 'stronglyFavored' } as const
    const seed = firstSeedWhere(
      (candidate) =>
        isFigureDrawn(candidate, attack.identity, 'passingTone', 'stronglyFavored') &&
        isFigureDrawn(candidate, attack.identity, 'neighborTone', 'stronglyFavored'),
    )
    // A tie key that reads only the subject's candidate|figure identity, in a chosen order.
    const chosen = [
      'passing_or_neighbor/65|neighborTone',
      'passing_or_neighbor/62|passingTone',
      'passing_or_neighbor/65|passingTone',
      'passing_or_neighbor/62|neighborTone',
    ]
    /** Ranks each chosen identity at its position in `chosen`. */
    const key: PitchTieKeyFactory = (subject) => {
      const index = chosen.indexOf(subject.candidateStableIdentity)
      return index === -1 ? 0xffff : index
    }
    expect(leading(order(attack, candidates, seed, equal, key)).map(label)).toEqual(chosen)
    /** Ranks each chosen identity in the reverse of `chosen`. */
    const reversed: PitchTieKeyFactory = (subject) => {
      const index = chosen.indexOf(subject.candidateStableIdentity)
      return index === -1 ? 0xffff : chosen.length - index
    }
    expect(leading(order(attack, candidates, seed, equal, reversed)).map(label)).toEqual(
      [...chosen].reverse(),
    )
    // With the real tie key the order is the one its hashes give.
    const hashed = [...chosen].sort(
      (left, right) =>
        pitchTieKey({ seed, decisionIdentity: attack.identity, candidateStableIdentity: left }) -
        pitchTieKey({ seed, decisionIdentity: attack.identity, candidateStableIdentity: right }),
    )
    expect(leading(order(attack, candidates, seed, equal)).map(label)).toEqual(hashed)
  })
})

/** A free chromatic approach's first member onto E (D# at 63), naming its figure. */
function approachFirstMember(): PitchCandidate {
  return handCandidate({
    role: 'chromatic_approach',
    midi: 63,
    enumerationIndex: 5,
    figures: ['chromaticApproach'],
    reservation: {
      identity: 'chromatic_approach/1/2/63',
      figureKind: 'chromatic_approach',
      attackIndices: [1],
      targetAttackIndex: 2,
      targetPitchClass: 4,
      memberPosition: 0,
      path: [63, 64],
    },
  })
}

// @test-link [[module_favored_figure_draw]]
// @test-link [[rule_figure_level_orders_search]]
describe("favored order: a free chromatic path's first member", () => {
  const attack = handAttack()
  const candidates = [...weakBeatCandidates('passingTone'), approachFirstMember()]

  it('moves ahead of the chord tones once, as its figure, with no hold', () => {
    const figureLevels = levelsWith({ chromaticApproach: 'stronglyFavored' })
    const seed = firstSeedWhere((candidate) =>
      isFigureDrawn(candidate, attack.identity, 'chromaticApproach', 'stronglyFavored'),
    )
    const entries = order(attack, candidates, seed, figureLevels)
    expect(entries.map(label)).toEqual([
      'chromatic_approach/63|chromaticApproach',
      ...order(attack, candidates, seed)
        .map((entry) => entry.candidate.identity)
        .filter((identity) => identity !== 'chromatic_approach/63'),
    ])
    expect(entries[0]!.favored).toEqual({ figure: 'chromaticApproach', level: 'stronglyFavored' })
    expect(entries[0]!.favored).not.toHaveProperty('hold')
    expect(entries).toHaveLength(candidates.length)
  })

  it('keeps the order before the levels existed when no named figure is drawn', () => {
    const figureLevels = levelsWith({
      passingTone: 'favored',
      neighborTone: 'favored',
      chromaticApproach: 'favored',
    })
    const seed = firstSeedWhere((candidate) =>
      (['passingTone', 'neighborTone', 'chromaticApproach'] as const).every(
        (figure) => !isFigureDrawn(candidate, attack.identity, figure, 'favored'),
      ),
    )
    const entries = order(attack, candidates, seed, figureLevels)
    expect(entries).toEqual(order(attack, candidates, seed))
    expect(entries.every((entry) => !('favored' in entry))).toBe(true)
  })
})

// @test-link [[module_favored_figure_draw]]
describe('favored order: the order stays total', () => {
  it("breaks a full tie between one tone's held entries by the figure's index", () => {
    const attack = handAttack()
    const tone = handCandidate({
      role: 'passing_or_neighbor',
      midi: 62,
      enumerationIndex: 0,
      figures: ['passingTone', 'neighborTone'],
    })
    const seed = firstSeedWhere(
      (candidate) =>
        isFigureDrawn(candidate, attack.identity, 'passingTone', 'stronglyFavored') &&
        isFigureDrawn(candidate, attack.identity, 'neighborTone', 'stronglyFavored'),
    )
    /** One tie key for every entry, so only MIDI, enumeration and figure index can decide. */
    const constant: PitchTieKeyFactory = () => 7
    const entries = order(
      attack,
      [tone],
      seed,
      levelsWith({ passingTone: 'stronglyFavored', neighborTone: 'stronglyFavored' }),
      constant,
    )
    expect(entries.map(label)).toEqual([
      `${tone.identity}|passingTone`,
      `${tone.identity}|neighborTone`,
      tone.identity,
    ])
    expect(FIGURE_IDS.indexOf('passingTone')).toBeLessThan(FIGURE_IDS.indexOf('neighborTone'))
  })
})
