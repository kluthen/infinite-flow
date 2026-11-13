import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChordFamilyLevel } from '@/domain/chords/chord-families'
import {
  COLLECTIONS,
  HARMONIC_MOTIONS,
  TENSION_ARCS,
  type Collection,
} from '@/domain/controls/generation-controls'
import { rankHarmonyCandidates } from '@/domain/generation/orchestration/candidate-ranking'
import {
  SEVENTHS_IDENTITY_MARK,
  harmonyPlanVariants,
} from '@/domain/generation/orchestration/harmony-variants'
import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import type {
  HarmonyCandidate,
  HarmonyCandidateDomain,
  HarmonyEvent,
} from '@/domain/harmony/harmony-types'
import { isSeventhDrawn } from '@/domain/harmony/seventh-draw'
import { fnv1a32 } from '@/domain/random/hash32'
import { makeSeed, type Seed } from '@/domain/random/seed'
import { seventhOf } from '../../harmony/seventh-chord-fixtures'

// The real hash, wrapped in a spy, so a test can see whether building the list drew anything.
vi.mock('@/domain/random/hash32', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/domain/random/hash32')>()
  return { ...actual, fnv1a32: vi.fn(actual.fnv1a32) }
})

const LEVELS_ABOVE_OFF: readonly ChordFamilyLevel[] = ['sometimes', 'favored', 'stronglyFavored']
const SEEDS = [0, 1, 7, 42, 4294967295].map((seed) => makeSeed(seed))

/** Intent: the harmony domain of one mode, motion and tension, in C. */
function domainOf(
  collection: Collection,
  harmonicMotion: (typeof HARMONIC_MOTIONS)[number],
  tensionArc: (typeof TENSION_ARCS)[number],
): HarmonyCandidateDomain {
  const domain = makeHarmonyCandidateDomain({
    tonalCenter: 'C',
    collection,
    harmonicMotion,
    tensionArc,
  })
  if (domain.kind !== 'harmony_candidate_domain') throw new Error('Fixture: no harmony plan.')
  return domain
}

/** Every domain over the modes, motions and tensions. */
function everyDomain(): readonly HarmonyCandidateDomain[] {
  return COLLECTIONS.flatMap((collection) =>
    HARMONIC_MOTIONS.flatMap((motion) =>
      TENSION_ARCS.map((tension) => domainOf(collection, motion, tension)),
    ),
  )
}

/** Intent: an event as its triad form: the event without its seventh. */
function asTriad(event: HarmonyEvent): HarmonyEvent {
  return Object.fromEntries(
    Object.entries(event).filter(([key]) => key !== 'seventh'),
  ) as unknown as HarmonyEvent
}

/** Intent: the list a plan becomes: its seventh variant then itself, or itself alone. */
function expectedEntries(
  candidate: HarmonyCandidate,
  level: ChordFamilyLevel,
  seed: Seed,
): readonly { readonly drawn: readonly boolean[] | null; readonly candidate: HarmonyCandidate }[] {
  const drawn = candidate.events.map((event) => isSeventhDrawn(level, seed, event))
  return drawn.includes(true)
    ? [
        { drawn, candidate },
        { drawn: null, candidate },
      ]
    : [{ drawn: null, candidate }]
}

beforeEach(() => {
  vi.mocked(fnv1a32).mockClear()
})

// @test-link [[rule_seventh_chords_off_changes_nothing]]
describe('the plan variants at Off', () => {
  it("is today's ranked list, object for object, with no draw", () => {
    for (const domain of everyDomain().slice(0, 12)) {
      const ranked = rankHarmonyCandidates(domain.candidates, SEEDS[2]!)
      vi.mocked(fnv1a32).mockClear()
      expect(harmonyPlanVariants(ranked, domain.collection, 'off', SEEDS[2]!)).toBe(ranked)
      expect(fnv1a32).not.toHaveBeenCalled()
    }
  })
})

// @test-link [[rule_triad_fallback_per_phrase]]
// @test-link [[rule_seventh_chords_level_never_a_quota]]
// @test-link [[rule_seventh_chords_diatonic_only]]
describe('the plan variants above Off', () => {
  it('puts each plan with a drawn seventh as its seventh variant, then itself as triads only', () => {
    for (const domain of everyDomain())
      for (const seed of SEEDS)
        for (const level of LEVELS_ABOVE_OFF) {
          const ranked = rankHarmonyCandidates(domain.candidates, seed)
          const variants = harmonyPlanVariants(ranked, domain.collection, level, seed)
          const expected = ranked.flatMap((candidate) => expectedEntries(candidate, level, seed))
          expect(variants).toHaveLength(expected.length)
          expect(variants.length).toBeLessThanOrEqual(2 * ranked.length)
          expected.forEach(({ drawn, candidate }, index) => {
            const variant = variants[index]!
            if (drawn === null) {
              expect(variant).toBe(candidate)
              return
            }
            const indices = drawn.flatMap((isDrawn, eventIndex) => (isDrawn ? [eventIndex] : []))
            expect(variant.identity).toBe(
              `${candidate.identity}${SEVENTHS_IDENTITY_MARK}${indices.join(',')}`,
            )
            expect(SEVENTHS_IDENTITY_MARK).toBe('|sevenths:')
            expect({ ...variant, identity: '', events: [] }).toEqual({
              ...candidate,
              identity: '',
              events: [],
            })
            expect(variant.events.map(asTriad)).toEqual(candidate.events)
            variant.events.forEach((event, eventIndex) => {
              if (drawn[eventIndex])
                expect(event.seventh).toEqual(seventhOf(event.triad.degree, domain.collection))
              else expect('seventh' in event).toBe(false)
            })
            expect(Object.isFrozen(variant) && Object.isFrozen(variant.events)).toBe(true)
          })
        }
  })

  it('gives every plan a seventh variant at Strongly favored, every event in its seventh form', () => {
    for (const domain of everyDomain()) {
      const ranked = rankHarmonyCandidates(domain.candidates, SEEDS[0]!)
      const variants = harmonyPlanVariants(ranked, domain.collection, 'stronglyFavored', SEEDS[0]!)
      expect(variants).toHaveLength(2 * ranked.length)
      ranked.forEach((candidate, index) => {
        expect(variants[2 * index + 1]).toBe(candidate)
        expect(variants[2 * index]!.events.every((event) => event.seventh !== undefined)).toBe(true)
      })
    }
  })

  it("takes each degree's seventh chord in C major: Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bm7b5", () => {
    const qualities = new Map<number, string>()
    const domains = HARMONIC_MOTIONS.flatMap((motion) =>
      TENSION_ARCS.map((tension) => domainOf('Major', motion, tension)),
    )
    const events = domains.flatMap((domain) =>
      harmonyPlanVariants(
        domain.candidates,
        domain.collection,
        'stronglyFavored',
        SEEDS[1]!,
      ).flatMap((variant) => variant.events),
    )
    for (const { triad, seventh } of events)
      if (seventh !== undefined)
        qualities.set(triad.degree, `${seventh.pitchClass}:${seventh.quality}`)
    const expected: Record<number, string> = {
      1: '11:major-seventh',
      2: '0:minor-seventh',
      3: '2:minor-seventh',
      4: '4:major-seventh',
      5: '5:dominant-seventh',
      6: '7:minor-seventh',
      7: '9:half-diminished-seventh',
    }
    for (const [degree, seventh] of qualities) expect(seventh).toBe(expected[degree])
    expect(qualities.size).toBeGreaterThanOrEqual(3)
  })
})

// @test-link [[rule_seventh_chords_keep_the_chord_plan]]
describe('the plan variants keep the plans', () => {
  it("gives Off's plans in Off's order once the seventh variants are set aside, at every level", () => {
    for (const domain of everyDomain())
      for (const seed of SEEDS) {
        const ranked = rankHarmonyCandidates(domain.candidates, seed)
        for (const level of LEVELS_ABOVE_OFF) {
          const variants = harmonyPlanVariants(ranked, domain.collection, level, seed)
          const triadsOnly = variants.filter(
            (variant) => !variant.identity.includes(SEVENTHS_IDENTITY_MARK),
          )
          expect(triadsOnly).toEqual(ranked)
          triadsOnly.forEach((candidate, index) => expect(candidate).toBe(ranked[index]))
          const plans = variants.map((variant) => ({
            degrees: variant.degreeSequence,
            roles: variant.events.map((event) => event.role),
            templateId: variant.templateId,
            triads: variant.events.map((event) => event.triad),
          }))
          const deduplicated = plans.filter(
            (plan, index) =>
              index === 0 || JSON.stringify(plan) !== JSON.stringify(plans[index - 1]),
          )
          expect(deduplicated).toEqual(
            ranked.map((candidate) => ({
              degrees: candidate.degreeSequence,
              roles: candidate.events.map((event) => event.role),
              templateId: candidate.templateId,
              triads: candidate.events.map((event) => event.triad),
            })),
          )
        }
      }
  })
})
