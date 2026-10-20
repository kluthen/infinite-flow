import { describe, expect, it } from 'vitest'
import {
  JAZZ_FIGURE_LEVELS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import {
  FOUR_FOUR_METER,
  makeGenerationRequest,
  makeRequestId,
} from '@/domain/generation/generation-request'
import { makeCarryIn, type CarryIn } from '@/domain/generation/carry-in/carry-in'
import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import { makeActiveConcertRange } from '@/domain/profile/active-concert-range'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeSeed } from '@/domain/random/seed'
import { makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import { buildCandidateDomains } from '@/domain/pitch/pitch-candidates'
import { compileAttacks } from '@/domain/pitch/pitch-context'
import { collectionPitchClasses } from '@/domain/pitch/pitch-harmony'
import { bindTensionRequirement, makePitchPolicy } from '@/domain/pitch/pitch-policy'
import { makeBoundPitchPlannerInput } from '@/domain/pitch/pitch-types'
import type { BoundPitchPlannerInput, ConcreteTensionBinding } from '@/domain/pitch/pitch-types'

/** Plain UTF-16 code-unit order of two strings, independent of the runtime's locale. */
function codeUnitOrder(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Build a realistic bound pitch-planner input over a static C-major tonic phrase. */
function fixtureInput(
  input: {
    readonly figureLevels?: FigureLevels
    readonly tensionBinding?: ConcreteTensionBinding
    readonly window?: readonly [number, number]
    readonly carryIn?: CarryIn
  } = {},
): BoundPitchPlannerInput {
  const harmony = makeHarmonyCandidateDomain({
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Static',
    tensionArc: 'Settled',
  })
  if (harmony.kind !== 'harmony_candidate_domain') throw new Error('fixture harmony missing')
  const tonic = harmony.candidates[0]
  if (!tonic) throw new Error('fixture harmony candidate missing')
  const rhythms = makeRhythmCandidateDomain({
    noteDensity: 'Quarter',
    rhythmicVariety: 'Slightly varied',
    silenceDensity: 'Sparse',
    syncopation: 'Straight',
    tensionArc: 'Settled',
  })
  if (rhythms.kind !== 'rhythm_candidate_domain') throw new Error('fixture rhythm missing')
  const rhythm = rhythms.candidates().next().value
  if (!rhythm) throw new Error('fixture rhythm missing')
  const binding = input.tensionBinding ?? bindTensionRequirement(tonic, rhythm)
  if (!binding) throw new Error('fixture binding missing')
  const [minMidi, maxMidi] = input.window ?? [48, 72]
  return makeBoundPitchPlannerInput({
    request: makeGenerationRequest({
      requestId: makeRequestId('pitch-candidates-test'),
      seed: makeSeed(1),
      measureCount: 4,
      meter: FOUR_FOUR_METER,
      activeConcertRange: makeActiveConcertRange(40, 84),
      register: 'Middle',
      registerWindow: makeRegisterWindow(minMidi, maxMidi),
      ...(input.carryIn === undefined ? {} : { carryIn: input.carryIn }),
    }),
    policy: makePitchPolicy({
      figureLevels: input.figureLevels ?? NEUTRAL_FIGURE_LEVELS,
      collection: 'Major',
      tonalCenter: 'C',
      contour: 'Wandering',
      leapiness: 'Angular',
      arpeggioChaos: 'Predictable',
      searchFuel: 20_000,
    }),
    harmony: tonic,
    rhythm,
    tensionBinding: binding,
  })
}

/** The compiled attacks and canonical candidate domains for one fixture input. */
function domainsFor(input: BoundPitchPlannerInput) {
  const attacks = compileAttacks(input)
  const collection = collectionPitchClasses(input.policy)
  return { attacks, collection, domains: buildCandidateDomains(input, attacks, collection) }
}

// @test-link [[entity_pitch_candidate_domain]]
describe('pitch-candidates: buildCandidateDomains', () => {
  it('keeps every candidate MIDI inside both the active range and the register window', () => {
    const input = fixtureInput({ window: [55, 65] })
    const { attacks, domains } = domainsFor(input)
    const low = Math.max(
      input.request.activeConcertRange.minMidi,
      input.request.registerWindow.minMidi,
    )
    const high = Math.min(
      input.request.activeConcertRange.maxMidi,
      input.request.registerWindow.maxMidi,
    )
    expect(domains).toHaveLength(attacks.length)
    // Every domain must actually carry candidates, so the range/window checks below cannot pass
    // vacuously against an empty enumeration.
    for (const domain of domains) expect(domain.length).toBeGreaterThan(0)
    for (const domain of domains)
      for (const candidate of domain) {
        expect(candidate.midi).toBeGreaterThanOrEqual(low)
        expect(candidate.midi).toBeLessThanOrEqual(high)
      }
  })

  // @test-link [[rule_neutral_profile_diatonic_pitches]]
  it('never yields an out-of-collection pitch under the Neutral profile', () => {
    const input = fixtureInput({ figureLevels: NEUTRAL_FIGURE_LEVELS })
    const { domains, collection } = domainsFor(input)
    expect(collection).toEqual([0, 2, 4, 5, 7, 9, 11])
    for (const domain of domains) expect(domain.length).toBeGreaterThan(0)
    for (const domain of domains)
      for (const candidate of domain) expect(collection).toContain(candidate.pitchClass)
  })

  // @test-link [[rule_jazz_chromatic_resolution]]
  it('admits out-of-collection Jazz chromatic candidates that a Neutral profile never produces', () => {
    const neutral = domainsFor(fixtureInput({ figureLevels: NEUTRAL_FIGURE_LEVELS })).domains
    const jazz = domainsFor(fixtureInput({ figureLevels: JAZZ_FIGURE_LEVELS })).domains
    const { collection } = domainsFor(fixtureInput({ figureLevels: JAZZ_FIGURE_LEVELS }))
    const neutralOutOfCollection = neutral
      .flat()
      .some((candidate) => !collection.includes(candidate.pitchClass))
    const jazzOutOfCollection = jazz
      .flat()
      .some((candidate) => !collection.includes(candidate.pitchClass))
    expect(neutralOutOfCollection).toBe(false)
    expect(jazzOutOfCollection).toBe(true)
  })

  // @test-link [[module_musical_profile_capabilities]]
  // @test-link [[rule_jazz_chromatic_resolution]]
  it('gates chromatic candidates on the figure levels, not the profile name', () => {
    const { collection: neutralCollection } = domainsFor(
      fixtureInput({ figureLevels: NEUTRAL_FIGURE_LEVELS }),
    )
    const neutralWithCapability = domainsFor(
      fixtureInput({
        figureLevels: { ...NEUTRAL_FIGURE_LEVELS, chromaticApproach: 'asToday' },
      }),
    ).domains
    const jazzWithoutCapability = domainsFor(
      fixtureInput({
        figureLevels: {
          ...JAZZ_FIGURE_LEVELS,
          chromaticApproach: 'off',
          chromaticEnclosure: 'off',
        },
      }),
    ).domains
    expect(
      neutralWithCapability
        .flat()
        .some((candidate) => !neutralCollection.includes(candidate.pitchClass)),
    ).toBe(true)
    expect(
      jazzWithoutCapability
        .flat()
        .some((candidate) => !neutralCollection.includes(candidate.pitchClass)),
    ).toBe(false)
  })

  // @test-link [[entity_pitch_candidate_domain]]
  it('never offers a free non-chord candidate on the first or the final attack', () => {
    const { attacks, domains } = domainsFor(fixtureInput())
    const first = domains[attacks[0]!.attackIndex]!
    const final = domains[attacks.at(-1)!.attackIndex]!
    expect(first.length).toBeGreaterThan(0)
    expect(final.length).toBeGreaterThan(0)
    expect(first.every((candidate) => candidate.role === 'chord_tone')).toBe(true)
    expect(final.every((candidate) => candidate.role === 'chord_tone')).toBe(true)
    // Positive control: an interior attack of the same phrase does offer a free non-chord
    // candidate, so the restriction above is a real boundary effect, not a domain that is always
    // chord-tones-only.
    const interior = domains[attacks[1]!.attackIndex]!
    expect(interior.some((candidate) => candidate.role === 'passing_or_neighbor')).toBe(true)
  })

  // @test-link [[entity_pitch_candidate_domain]]
  it('restricts a bound member attack to only concrete bound-path candidates', () => {
    const bound: ConcreteTensionBinding = {
      identity: 'fixture/appoggiatura/2/3',
      bindingIndex: 0,
      figureKind: 'appoggiatura',
      attackIndices: [2],
      targetAttackIndex: 3,
    }
    const { domains } = domainsFor(fixtureInput({ tensionBinding: bound }))
    const memberDomain = domains[2]!
    expect(memberDomain.length).toBeGreaterThan(0)
    for (const candidate of memberDomain) {
      expect(candidate.role).toBe('appoggiatura')
      expect(candidate.reservation).toBeDefined()
      expect(candidate.reservation?.memberPosition).toBe(0)
    }
  })

  // @test-link [[entity_pitch_candidate_domain]]
  it('keeps candidate identities unique within every attack domain', () => {
    const { domains } = domainsFor(fixtureInput({ figureLevels: JAZZ_FIGURE_LEVELS }))
    for (const domain of domains) {
      const identities = domain.map((candidate) => candidate.identity)
      expect(new Set(identities).size).toBe(identities.length)
    }
  })

  // @test-link [[entity_pitch_candidate_domain]]
  it('freezes each domain in canonical order (role, obligation, pitch class, octave) with enumerationIndex = position', () => {
    const { domains } = domainsFor(fixtureInput({ figureLevels: JAZZ_FIGURE_LEVELS }))
    for (const domain of domains) {
      expect(Object.isFrozen(domain)).toBe(true)
      expect(domain.map((candidate) => candidate.enumerationIndex)).toEqual(
        domain.map((_, index) => index),
      )
      const sorted = [...domain].sort(
        (left, right) =>
          codeUnitOrder(left.role, right.role) ||
          codeUnitOrder(left.obligationIdentity, right.obligationIdentity) ||
          left.pitchClass - right.pitchClass ||
          left.octaveIndex - right.octaveIndex,
      )
      expect(domain).toEqual(sorted)
    }
  })

  // @test-link [[entity_pitch_candidate_domain]]
  it('offers exactly the C-major triad pitch classes as chord tones at every attack for a static tonic harmony', () => {
    const { domains } = domainsFor(fixtureInput())
    for (const domain of domains) {
      const chordPitchClasses = domain
        .filter((candidate) => candidate.role === 'chord_tone')
        .map((candidate) => candidate.pitchClass)
      expect(new Set(chordPitchClasses)).toEqual(new Set([0, 4, 7]))
    }
  })
})

/** Every role offered across a fixture's domains. */
function rolesOf(figureLevels: FigureLevels): ReadonlySet<string> {
  const { domains } = domainsFor(fixtureInput({ figureLevels }))
  return new Set(domains.flat().map((candidate) => candidate.role))
}

/** The free diatonic tones (no reservation) of every interior attack, with their attack. */
function freeTonesOf(figureLevels: FigureLevels) {
  const { attacks, domains } = domainsFor(fixtureInput({ figureLevels }))
  return attacks
    .filter((attack) => attack.attackIndex !== 0 && !attack.isFinal)
    .flatMap((attack) =>
      domains[attack.attackIndex]!.filter(
        (candidate) =>
          candidate.role === 'passing_or_neighbor' && candidate.reservation === undefined,
      ).map((candidate) => ({ attack, candidate })),
    )
}

/** True for an attack on beat 1 or beat 3 of its bar. */
function onStrongBeat(attack: { readonly startTick: number }): boolean {
  return attack.startTick === 0 || attack.startTick === 8
}

// @test-link [[rule_figure_level_orders_search]]
// @test-link [[rule_chromatic_notes_need_a_chromatic_figure]]
describe('pitch-candidates: each chromatic figure gated by its own level', () => {
  it('offers the enclosure but no chromatic approach when only the approach is off', () => {
    const roles = rolesOf({ ...JAZZ_FIGURE_LEVELS, chromaticApproach: 'off' })
    expect(roles.has('chromatic_enclosure_upper')).toBe(true)
    expect(roles.has('chromatic_enclosure_lower')).toBe(true)
    expect(roles.has('chromatic_approach')).toBe(false)
  })

  it('offers the chromatic approach but no enclosure when only the enclosure is off', () => {
    const roles = rolesOf({ ...JAZZ_FIGURE_LEVELS, chromaticEnclosure: 'off' })
    expect(roles.has('chromatic_approach')).toBe(true)
    expect(roles.has('chromatic_enclosure_upper')).toBe(false)
    expect(roles.has('chromatic_enclosure_lower')).toBe(false)
  })
})

// @test-link [[rule_figure_level_orders_search]]
// @test-link [[rule_levels_govern_free_figures_only]]
describe('pitch-candidates: free diatonic tones tagged by the resolutions their levels allow', () => {
  it("tags no candidate under Neutral's or Jazz's levels", () => {
    for (const figureLevels of [NEUTRAL_FIGURE_LEVELS, JAZZ_FIGURE_LEVELS]) {
      const { domains } = domainsFor(fixtureInput({ figureLevels }))
      expect(domains.flat().some((candidate) => candidate.freeResolution !== undefined)).toBe(false)
    }
    expect(freeTonesOf(NEUTRAL_FIGURE_LEVELS).length).toBeGreaterThan(0)
  })

  it('offers no free diatonic tone when passing, accented passing and neighbor tones are off', () => {
    const levels: FigureLevels = {
      ...NEUTRAL_FIGURE_LEVELS,
      passingTone: 'off',
      accentedPassingTone: 'off',
      neighborTone: 'off',
    }
    expect(freeTonesOf(levels)).toEqual([])
  })

  it('tags every free tone as a passing tone when the neighbor tone is off', () => {
    const tones = freeTonesOf({ ...NEUTRAL_FIGURE_LEVELS, neighborTone: 'off' })
    expect(tones.length).toBeGreaterThan(0)
    for (const { candidate } of tones) expect(candidate.freeResolution).toBe('passing')
  })

  it('tags only off-beat free tones as neighbors when only the passing tone is off', () => {
    const tones = freeTonesOf({ ...NEUTRAL_FIGURE_LEVELS, passingTone: 'off' })
    const strong = tones.filter(({ attack }) => onStrongBeat(attack))
    const weak = tones.filter(({ attack }) => !onStrongBeat(attack))
    expect(strong.length).toBeGreaterThan(0)
    expect(weak.length).toBeGreaterThan(0)
    for (const { candidate } of strong) expect(candidate.freeResolution).toBeUndefined()
    for (const { candidate } of weak) expect(candidate.freeResolution).toBe('neighbor')
  })
})

/** A carry-in over the fixture's default window, with no carried chord, so nothing is owed. */
function plainCarryIn(): CarryIn {
  return makeCarryIn({
    lastPitch: {
      midi: makeConcertPitch(60),
      arrivingInterval: null,
      recovery: { kind: 'settled' },
    },
    registerWindow: makeRegisterWindow(48, 72),
    finalHarmony: null,
    phraseNumber: 1,
  })
}

/** The free tones of a fixture split by beat: on beat 1 or 3, and off them. */
function freeTonesByBeat(figureLevels: FigureLevels) {
  const tones = freeTonesOf(figureLevels)
  const strong = tones.filter(({ attack }) => onStrongBeat(attack))
  const weak = tones.filter(({ attack }) => !onStrongBeat(attack))
  expect(strong.length).toBeGreaterThan(0)
  expect(weak.length).toBeGreaterThan(0)
  return { strong, weak }
}

/** Every reserved candidate of a fixture's domains whose path is of `kind`, at `memberPosition`. */
function pathMembers(input: BoundPitchPlannerInput, kind: string, memberPosition: number) {
  const members = domainsFor(input)
    .domains.flat()
    .filter(
      (candidate) =>
        candidate.reservation?.figureKind === kind &&
        candidate.reservation.memberPosition === memberPosition,
    )
  expect(members.length).toBeGreaterThan(0)
  return members
}

// @test-link [[module_favored_figure_draw]]
describe('pitch-candidates: each candidate names the free figures it may start', () => {
  it("names the passing figure for its beat, then the neighbor tone, under Neutral's levels", () => {
    const { strong, weak } = freeTonesByBeat(NEUTRAL_FIGURE_LEVELS)
    for (const { candidate } of weak)
      expect(candidate.figures).toEqual(['passingTone', 'neighborTone'])
    for (const { candidate } of strong)
      expect(candidate.figures).toEqual(['accentedPassingTone', 'neighborTone'])
  })

  it('names only the neighbor tone off beats 1 and 3 when the passing tone is off', () => {
    const { strong, weak } = freeTonesByBeat({ ...NEUTRAL_FIGURE_LEVELS, passingTone: 'off' })
    for (const { candidate } of weak) expect(candidate.figures).toEqual(['neighborTone'])
    for (const { candidate } of strong)
      expect(candidate.figures).toEqual(['accentedPassingTone', 'neighborTone'])
  })

  it('names only the passing figure for its beat when the neighbor tone is off', () => {
    const { strong, weak } = freeTonesByBeat({ ...NEUTRAL_FIGURE_LEVELS, neighborTone: 'off' })
    for (const { candidate } of weak) expect(candidate.figures).toEqual(['passingTone'])
    for (const { candidate } of strong) expect(candidate.figures).toEqual(['accentedPassingTone'])
  })

  it('names no figure on a chord tone', () => {
    for (const figureLevels of [NEUTRAL_FIGURE_LEVELS, JAZZ_FIGURE_LEVELS]) {
      const chordTones = domainsFor(fixtureInput({ figureLevels }))
        .domains.flat()
        .filter((candidate) => candidate.role === 'chord_tone')
      expect(chordTones.length).toBeGreaterThan(0)
      for (const candidate of chordTones) expect(candidate).not.toHaveProperty('figures')
    }
  })

  it("names its figure on a chromatic approach's and enclosure's first member under Jazz's levels", () => {
    const input = fixtureInput({ figureLevels: JAZZ_FIGURE_LEVELS })
    for (const candidate of pathMembers(input, 'chromatic_approach', 0))
      expect(candidate.figures).toEqual(['chromaticApproach'])
    for (const candidate of pathMembers(input, 'chromatic_enclosure', 0))
      expect(candidate.figures).toEqual(['chromaticEnclosure'])
  })

  it("names no figure on a chromatic enclosure's second member", () => {
    const input = fixtureInput({ figureLevels: JAZZ_FIGURE_LEVELS })
    for (const candidate of pathMembers(input, 'chromatic_enclosure', 1))
      expect(candidate).not.toHaveProperty('figures')
  })

  it("names no figure on a member of Tension's scheduled figure", () => {
    const kinds = ['appoggiatura', 'diatonic_passing_or_neighbor'] as const
    for (const figureKind of kinds) {
      const binding: ConcreteTensionBinding = {
        identity: `fixture/${figureKind}/2/3`,
        bindingIndex: 0,
        figureKind,
        attackIndices: [2],
        targetAttackIndex: 3,
      }
      const input = fixtureInput({ figureLevels: JAZZ_FIGURE_LEVELS, tensionBinding: binding })
      const members = pathMembers(input, figureKind, 0)
      for (const candidate of members) {
        expect(candidate.reservation?.bindingIdentity).toBe(binding.identity)
        expect(candidate).not.toHaveProperty('figures')
      }
    }
  })

  it('names no figure on a tense note a joined phrase may end on', () => {
    const input = fixtureInput({ carryIn: plainCarryIn() })
    const { attacks, domains } = domainsFor(input)
    const tense = domains[attacks.at(-1)!.attackIndex]!.filter(
      (candidate) => candidate.role === 'passing_or_neighbor',
    )
    expect(tense.length).toBeGreaterThan(0)
    for (const candidate of tense) expect(candidate).not.toHaveProperty('figures')
  })
})
