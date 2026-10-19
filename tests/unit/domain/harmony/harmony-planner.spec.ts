import { describe, expect, it } from 'vitest'

import {
  COLLECTIONS,
  HARMONIC_MOTIONS,
  PITCH_CLASSES,
  TENSION_ARCS,
} from '@/domain/controls/generation-controls'
import {
  HarmonyPlannerInputError,
  isNoLegalHarmonyPlan,
  makeHarmonyCandidateDomain,
  type HarmonyCandidateDomain,
  type HarmonyPlannerInput,
} from '@/domain/harmony/harmony-planner'

const baseInput: HarmonyPlannerInput = {
  tonalCenter: 'C',
  collection: 'Major',
  harmonicMotion: 'Static',
  tensionArc: 'Settled',
}

function domainFor(input: Partial<HarmonyPlannerInput>): HarmonyCandidateDomain {
  const result = makeHarmonyCandidateDomain({ ...baseInput, ...input })
  if (isNoLegalHarmonyPlan(result)) throw new Error('Expected a nonempty harmony domain.')
  return result
}

/**
 * Intent: one swept harmony setting gives the same domain each time it is built (the planner reads
 * no musical profile, so Neutral and Jazz share it), with candidates
 * indexed in order, serializable and frozen, events starting in the first measure with whole
 * half-measure durations, and at most one bar role per outer bar and two per inner bar.
 */
function expectStructurallySound(
  setting: Pick<
    HarmonyPlannerInput,
    'tonalCenter' | 'collection' | 'harmonicMotion' | 'tensionArc'
  >,
): void {
  const { tonalCenter, collection, harmonicMotion, tensionArc } = setting
  const neutral = domainFor({ tonalCenter, collection, harmonicMotion, tensionArc })
  const jazz = makeHarmonyCandidateDomain({
    tonalCenter,
    collection,
    harmonicMotion,
    tensionArc,
  })

  expect(jazz).toEqual(neutral)
  expect(neutral.candidates.map((candidate) => candidate.candidateIndex)).toEqual(
    neutral.candidates.map((_, index) => index),
  )
  expect(JSON.parse(JSON.stringify(neutral))).toEqual(neutral)
  expect(Object.isFrozen(neutral)).toBe(true)
  for (const candidate of neutral.candidates) {
    expect(Object.isFrozen(candidate.events)).toBe(true)
    expect(candidate.events.every((event) => event.startBeat >= 0 && event.startBeat < 4)).toBe(
      true,
    )
    expect(
      candidate.events.every((event) => event.durationBeats > 0 && event.durationBeats % 2 === 0),
    ).toBe(true)
    for (const barIndex of [0, 1, 2, 3]) {
      const roles = candidate.events
        .flatMap((event) => event.barRoles)
        .filter((role) => role.barIndex === barIndex)
      expect(roles.length).toBeLessThanOrEqual(barIndex === 1 || barIndex === 2 ? 2 : 1)
    }
  }
}

// @test-link [[module_harmony_candidate_domain]]
describe('harmony candidate domain: policy expansion', () => {
  // @test-link [[rule_neutral_profile_diatonic_harmony]]
  it('expands tonal templates in policy order, alternatives by ascending degree, and unsplit before split', () => {
    expect(domainFor({ harmonicMotion: 'Static' }).candidates).toHaveLength(1)
    expect(
      domainFor({ harmonicMotion: 'Gentle diatonic' }).candidates.map(
        (candidate) => candidate.degreeSequence,
      ),
    ).toEqual([
      [1, 1, 2, 5],
      [1, 1, 4, 5],
      [1, 3, 1, 5],
      [1, 6, 1, 5],
      [1, 3, 2, 5],
      [1, 3, 4, 5],
      [1, 6, 2, 5],
      [1, 6, 4, 5],
    ])

    const active = domainFor({ harmonicMotion: 'Active diatonic' }).candidates
    expect(active.slice(0, 6).map((candidate) => candidate.degreeSequence)).toEqual([
      [1, 3, 2, 5],
      [1, 3, 4, 5],
      [1, 6, 2, 5],
      [1, 6, 4, 5],
      [1, 2, 5, 5],
      [1, 4, 5, 5],
    ])
    expect(
      active.filter((candidate) =>
        candidate.events
          .flatMap((event) => event.barRoles)
          .some(
            (role, _, roles) =>
              roles.filter((other) => other.barIndex === role.barIndex).length === 2,
          ),
      ),
    ).toHaveLength(8)
    expect(
      active.findIndex((candidate) =>
        candidate.events
          .flatMap((event) => event.barRoles)
          .some(
            (role, _, roles) =>
              roles.filter((other) => other.barIndex === role.barIndex).length === 2,
          ),
      ),
    ).toBe(7)
  })

  it.each(['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'] as const)(
    '%s uses modal templates, including a modal-tonic endpoint',
    (collection) => {
      const staticDomain = domainFor({ collection, harmonicMotion: 'Static' })
      const gentleDomain = domainFor({ collection, harmonicMotion: 'Gentle diatonic' })
      const activeDomain = domainFor({ collection, harmonicMotion: 'Active diatonic' })

      expect(staticDomain.candidates).toHaveLength(1)
      expect(gentleDomain.candidates.length).toBeGreaterThan(0)
      expect(activeDomain.candidates.length).toBeGreaterThan(gentleDomain.candidates.length)
      for (const candidate of activeDomain.candidates) {
        expect(candidate.events.at(-1)?.triad.degree).toBe(1)
        expect(candidate.endpoint).toMatchObject({ kind: 'modal_non_tonic_chord_tone', degree: 5 })
      }
    },
  )

  it('enumerates every Dorian Active color-degree pair and split variant in policy order', () => {
    const active = domainFor({ collection: 'Dorian', harmonicMotion: 'Active diatonic' })
    // Dorian offsets are 0, 2, 3, 5, 7, 9, 10 and its color degree is 6. Stacking
    // collection thirds independently yields these non-tonic color-chord degrees.
    const colorDegrees = [2, 4, 6] as const
    const pairs = colorDegrees.flatMap((first) =>
      colorDegrees.filter((second) => second !== first).map((second) => [first, second] as const),
    )
    const expected = [
      ...pairs.map(([first, second]) => ({
        templateId: 'modal-active-1',
        degreeSequence: [1, first, second, 1],
      })),
      ...pairs.flatMap(([first, second]) => [
        { templateId: 'modal-active-2-unsplit', degreeSequence: [1, first, second, 1] },
        { templateId: 'modal-active-2-split', degreeSequence: [1, first, second, first, 1] },
      ]),
      ...pairs.flatMap(([first, second]) => [
        { templateId: 'modal-active-3-unsplit', degreeSequence: [1, first, second, 1] },
        { templateId: 'modal-active-3-split', degreeSequence: [1, first, second, first, 1] },
      ]),
    ]

    expect(pairs).toHaveLength(6)
    expect(active.candidates).toHaveLength(30)
    expect(
      active.candidates.map(({ templateId, degreeSequence }) => ({ templateId, degreeSequence })),
    ).toEqual(expected)
  })

  // @test-link [[rule_open_phrase_ending]]
  it('keeps Major/Minor tonal while separately named Ionian/Aeolian stay modal', () => {
    expect(
      domainFor({ collection: 'Major', harmonicMotion: 'Static' }).candidates[0]?.endpoint,
    ).toEqual({
      kind: 'tonal_static_degree_five',
      degree: 5,
    })
    expect(
      domainFor({ collection: 'Minor', harmonicMotion: 'Gentle diatonic' }).candidates[0]?.endpoint,
    ).toEqual({
      kind: 'tonal_degree_five_chord_tone',
      degree: 5,
    })
    expect(
      domainFor({ collection: 'Ionian', harmonicMotion: 'Gentle diatonic' }).candidates[0]
        ?.endpoint,
    ).toEqual({
      kind: 'modal_non_tonic_chord_tone',
      degree: 5,
    })
  })
})

// @test-link [[module_harmony_candidate_domain]]
describe('harmony candidate domain: structural invariants', () => {
  it('sweeps all harmony controls and both profiles with complete immutable, serializable output', () => {
    for (const tonalCenter of PITCH_CLASSES) {
      for (const collection of COLLECTIONS) {
        for (const harmonicMotion of HARMONIC_MOTIONS) {
          for (const tensionArc of TENSION_ARCS) {
            expectStructurallySound({ tonalCenter, collection, harmonicMotion, tensionArc })
          }
        }
      }
    }
  }, 30_000)

  // @test-link [[rule_tension_arc_level_policy]]
  // @test-link [[rule_tension_arc_settled]]
  // @test-link [[rule_tension_arc_lift]]
  // @test-link [[rule_tension_arc_build]]
  // @test-link [[rule_tension_arc_edge]]
  it('records tension abstractly, with the exact four arc requirements and no onset data', () => {
    const expected = {
      Settled: { requiredFigureCount: 0, maximumFigureCount: 1, allowedBars: [0, 1, 2] },
      Lift: { requiredFigureCount: 0, maximumFigureCount: 1, allowedBars: [1, 2] },
      Build: { requiredFigureCount: 1, maximumFigureCount: 1, allowedBars: [1, 2] },
      Edge: { requiredFigureCount: 1, maximumFigureCount: 1, allowedBars: [2] },
    }
    for (const tensionArc of TENSION_ARCS) {
      const requirement = domainFor({ tensionArc }).candidates[0]!.tensionRequirement
      expect(requirement).toMatchObject(expected[tensionArc])
      expect(Object.keys(requirement)).not.toEqual(
        expect.arrayContaining(['onset', 'rhythm', 'tick']),
      )
      expect(requirement.mustResolveBeforeFinalSoundingEvent).toBe(true)
    }
  })

  it('does not use a seed and repeats byte-equivalently for the same normalized projection', () => {
    const first = domainFor({
      collection: 'Dorian',
      harmonicMotion: 'Active diatonic',
      tensionArc: 'Edge',
    })
    const second = domainFor({
      collection: 'Dorian',
      harmonicMotion: 'Active diatonic',
      tensionArc: 'Edge',
    })

    expect(JSON.stringify(second)).toBe(JSON.stringify(first))
    expect(JSON.stringify(first)).not.toMatch(/seed|rhythm|register|instrument|contour/i)
  })

  it('rejects invalid normalized projection instead of falling back, and exposes typed empty-domain outcomes', () => {
    expect(() =>
      makeHarmonyCandidateDomain({
        ...baseInput,
        collection: 'Chromatic' as typeof baseInput.collection,
      }),
    ).toThrow(HarmonyPlannerInputError)
    expect(isNoLegalHarmonyPlan({ kind: 'no_legal_harmony_plan', input: baseInput })).toBe(true)
  })
})
