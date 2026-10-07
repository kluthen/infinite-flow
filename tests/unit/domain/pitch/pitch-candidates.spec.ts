import { describe, expect, it } from 'vitest'
import {
  FOUR_FOUR_METER,
  makeGenerationRequest,
  makeRequestId,
} from '@/domain/generation/generation-request'
import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import { makeActiveConcertRange } from '@/domain/profile/active-concert-range'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { makeSeed } from '@/domain/random/seed'
import { makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import { buildCandidateDomains } from '@/domain/pitch/pitch-candidates'
import { compileAttacks } from '@/domain/pitch/pitch-context'
import { collectionPitchClasses } from '@/domain/pitch/pitch-harmony'
import { bindTensionRequirement, makePitchPolicy } from '@/domain/pitch/pitch-policy'
import { makeBoundPitchPlannerInput } from '@/domain/pitch/pitch-types'
import type { BoundPitchPlannerInput, ConcreteTensionBinding } from '@/domain/pitch/pitch-types'
import type { MusicalProfile } from '@/domain/controls/generation-controls'

/** Plain UTF-16 code-unit order of two strings, independent of the runtime's locale. */
function codeUnitOrder(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Build a realistic bound pitch-planner input over a static C-major tonic phrase. */
function fixtureInput(
  input: {
    readonly profile?: MusicalProfile
    readonly tensionBinding?: ConcreteTensionBinding
    readonly window?: readonly [number, number]
    readonly capabilities?: { readonly allowsChromaticApproach: boolean }
  } = {},
): BoundPitchPlannerInput {
  const harmony = makeHarmonyCandidateDomain({
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Static',
    tensionArc: 'Settled',
    profile: 'Neutral',
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
    }),
    policy: makePitchPolicy({
      profile: input.profile ?? 'Neutral',
      collection: 'Major',
      tonalCenter: 'C',
      contour: 'Wandering',
      leapiness: 'Angular',
      arpeggioChaos: 'Predictable',
      searchFuel: 20_000,
      ...(input.capabilities ? { capabilities: input.capabilities } : {}),
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
    const input = fixtureInput({ profile: 'Neutral' })
    const { domains, collection } = domainsFor(input)
    expect(collection).toEqual([0, 2, 4, 5, 7, 9, 11])
    for (const domain of domains) expect(domain.length).toBeGreaterThan(0)
    for (const domain of domains)
      for (const candidate of domain) expect(collection).toContain(candidate.pitchClass)
  })

  // @test-link [[rule_jazz_chromatic_resolution]]
  it('admits out-of-collection Jazz chromatic candidates that a Neutral profile never produces', () => {
    const neutral = domainsFor(fixtureInput({ profile: 'Neutral' })).domains
    const jazz = domainsFor(fixtureInput({ profile: 'Jazz' })).domains
    const { collection } = domainsFor(fixtureInput({ profile: 'Jazz' }))
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
  it('gates chromatic candidates on the declared capability, not the profile name', () => {
    const { collection: neutralCollection } = domainsFor(fixtureInput({ profile: 'Neutral' }))
    const neutralWithCapability = domainsFor(
      fixtureInput({ profile: 'Neutral', capabilities: { allowsChromaticApproach: true } }),
    ).domains
    const jazzWithoutCapability = domainsFor(
      fixtureInput({ profile: 'Jazz', capabilities: { allowsChromaticApproach: false } }),
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
    const { domains } = domainsFor(fixtureInput({ profile: 'Jazz' }))
    for (const domain of domains) {
      const identities = domain.map((candidate) => candidate.identity)
      expect(new Set(identities).size).toBe(identities.length)
    }
  })

  // @test-link [[entity_pitch_candidate_domain]]
  it('freezes each domain in canonical order (role, obligation, pitch class, octave) with enumerationIndex = position', () => {
    const { domains } = domainsFor(fixtureInput({ profile: 'Jazz' }))
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
