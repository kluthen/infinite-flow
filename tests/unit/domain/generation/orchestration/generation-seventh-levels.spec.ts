/**
 * The orchestrator at each Seventh chords level: the harmony list it searches (the ranked plans,
 * then, above Off, each plan with a drawn seventh as its seventh variant then itself), the plans
 * kept at every level, a plan whose seventh form leads nowhere still found as triads with no
 * phrase rejected or retried, and the search allowance unchanged.
 */

import { describe, expect, it } from 'vitest'

import {
  parseChordFamilies,
  type ChordFamilies,
  type ChordFamilyLevel,
} from '@/domain/chords/chord-families'
import { COLLECTIONS, HARMONIC_MOTIONS, TENSION_ARCS } from '@/domain/controls/generation-controls'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { rankHarmonyCandidates } from '@/domain/generation/orchestration/candidate-ranking'
import {
  buildHarmonyDomain,
  generatePhrase,
  searchedHarmonyOrder,
} from '@/domain/generation/orchestration/generation-orchestrator'
import {
  SEVENTHS_IDENTITY_MARK,
  harmonyPlanVariants,
} from '@/domain/generation/orchestration/harmony-variants'
import type { WindowSearchDeps } from '@/domain/generation/orchestration/window-search'
import { candidatesFollowingCarriedHarmony } from '@/domain/harmony/harmony-join'
import type { HarmonyCandidateDomain } from '@/domain/harmony/harmony-types'
import { planPitchPhrase, type PitchPlanResult } from '@/domain/pitch/pitch-planner'
import { validateGenerationResult } from '@/domain/validation/generation-result-validator'
import {
  buildIntent,
  carryInAfter,
  generateSuccess,
  type SuccessOutcome,
} from '../carry-in/carry-in-fixture'

const LEVELS_ABOVE_OFF: readonly ChordFamilyLevel[] = ['sometimes', 'favored', 'stronglyFavored']

/** Intent: the chord families with the seventh chords at `level`. */
function familiesAt(level: ChordFamilyLevel): ChordFamilies {
  return parseChordFamilies({ 'seventh-chords': level })
}

/** Intent: the same intent at another Seventh chords level. */
function atLevel(intent: GenerationIntent, level: ChordFamilyLevel): GenerationIntent {
  return { ...intent, chordFamilies: familiesAt(level) }
}

/** Intent: the intent's harmony domain, which must have plans. */
function domainOf(intent: GenerationIntent): HarmonyCandidateDomain {
  const domain = buildHarmonyDomain(intent)
  if (domain.kind !== 'harmony_candidate_domain') throw new Error('Fixture: no harmony plan.')
  return domain
}

/** Intent: a phrase 2 intent receiving phrase 1's carry-in, at Off. */
function carryInIntent(seed: number): GenerationIntent {
  const first = buildIntent({ seed, label: 'seventh-levels' })
  const carryIn = carryInAfter(first, generateSuccess(first), 1)
  return buildIntent({ seed: seed + 1000, carryIn, label: 'seventh-levels' })
}

// @test-link [[rule_seventh_chords_off_changes_nothing]]
describe('the searched harmony list at Off', () => {
  it('is the ranked list, object for object, with and without a carry-in', () => {
    for (const seed of [1, 7, 42]) {
      const intent = buildIntent({ seed, label: 'seventh-levels' })
      const domain = domainOf(intent)
      const ranked = rankHarmonyCandidates(domain.candidates, intent.seed)
      const searched = searchedHarmonyOrder(intent, domain)
      expect(searched).toHaveLength(ranked.length)
      searched.forEach((candidate, index) => expect(candidate).toBe(ranked[index]))

      const joined = carryInIntent(seed)
      const joinedDomain = domainOf(joined)
      const following = candidatesFollowingCarriedHarmony(
        joinedDomain,
        joined.carryIn!.finalHarmony!,
      )
      const joinedRanked = rankHarmonyCandidates(following, joined.seed)
      const joinedSearched = searchedHarmonyOrder(joined, joinedDomain)
      expect(joinedSearched).toHaveLength(joinedRanked.length)
      joinedSearched.forEach((candidate, index) => expect(candidate).toBe(joinedRanked[index]))
    }
  })
})

// @test-link [[rule_triad_fallback_per_phrase]]
// @test-link [[rule_seventh_chords_keep_the_chord_plan]]
describe('the searched harmony list above Off', () => {
  it("is the ranked list's plan variants, after the carry-in's filter, at the intent's level and seed", () => {
    for (const level of LEVELS_ABOVE_OFF)
      for (const seed of [1, 7]) {
        for (const intent of [
          buildIntent({ seed, label: 'seventh-levels' }),
          carryInIntent(seed),
        ]) {
          const leveled = atLevel(intent, level)
          const domain = domainOf(leveled)
          const ranked = searchedHarmonyOrder(intent, domain)
          expect(searchedHarmonyOrder(leveled, domain)).toEqual(
            harmonyPlanVariants(ranked, domain.collection, level, leveled.seed),
          )
        }
      }
  })

  it("keeps Off's plans in Off's order at every level: degrees, roles, templates, colour chords", () => {
    for (const collection of COLLECTIONS)
      for (const harmonicMotion of HARMONIC_MOTIONS)
        for (const tension of TENSION_ARCS) {
          const off = buildIntent({
            seed: 11,
            controls: { collection, harmonicMotion, tension },
            label: 'seventh-plans',
          })
          const domain = domainOf(off)
          const offList = searchedHarmonyOrder(off, domain)
          for (const level of LEVELS_ABOVE_OFF) {
            const searched = searchedHarmonyOrder(atLevel(off, level), domain)
            const triadsOnly = searched.filter(
              (candidate) => !candidate.identity.includes(SEVENTHS_IDENTITY_MARK),
            )
            expect(triadsOnly).toHaveLength(offList.length)
            triadsOnly.forEach((candidate, index) => expect(candidate).toBe(offList[index]))
            searched.forEach((candidate, index) => {
              if (!candidate.identity.includes(SEVENTHS_IDENTITY_MARK)) return
              const plan = searched[index + 1]!
              expect(
                candidate.identity.startsWith(`${plan.identity}${SEVENTHS_IDENTITY_MARK}`),
              ).toBe(true)
              expect(candidate.degreeSequence).toEqual(plan.degreeSequence)
              expect(candidate.templateId).toBe(plan.templateId)
              expect(candidate.endpoint).toEqual(plan.endpoint)
              expect(
                candidate.events.map((event) => [event.triad, event.role, event.barRoles]),
              ).toEqual(plan.events.map((event) => [event.triad, event.role, event.barRoles]))
            })
          }
        }
  })
})

/** What the instrumented search saw: seventh plans tried, phrases validated, phrases refused. */
interface Instruments {
  seventhPlansTried: number
  validated: number
  refused: number
}

const NO_PLAN: PitchPlanResult = { kind: 'no_legal_pitch_plan', fuelUsed: 0 }

/** Intent: search collaborators under which no seventh form has a solution, counting the run. */
function deadSevenths(): { readonly deps: WindowSearchDeps; readonly seen: Instruments } {
  const seen: Instruments = { seventhPlansTried: 0, validated: 0, refused: 0 }
  return {
    seen,
    deps: {
      planPitch: (input) => {
        if (input.harmony.events.every((event) => event.seventh === undefined))
          return planPitchPhrase(input)
        seen.seventhPlansTried += 1
        return NO_PLAN
      },
      validateResult: (input) => {
        seen.validated += 1
        const verdict = validateGenerationResult(input)
        if (verdict.kind === 'invalid_generation_result') seen.refused += 1
        return verdict
      },
    },
  }
}

/** Intent: the outcome, which must be a phrase. */
function success(outcome: ReturnType<typeof generatePhrase>): SuccessOutcome {
  if (outcome.kind !== 'generation_success') throw new Error(`Expected a phrase: ${outcome.code}.`)
  return outcome
}

// @test-link [[rule_seventh_chords_level_never_a_quota]]
// @test-link [[rule_triad_fallback_per_phrase]]
describe('a plan whose seventh form has no solution', () => {
  it("is still found as triads: Off's phrase, none rejected or retried", () => {
    for (const seed of [3, 8]) {
      const off = buildIntent({ seed, label: 'dead-sevenths' })
      const offPhrase = success(generatePhrase(off))
      for (const level of LEVELS_ABOVE_OFF) {
        const { deps, seen } = deadSevenths()
        const phrase = success(generatePhrase(atLevel(off, level), { deps }))
        expect(phrase.provenance.harmony).toEqual(offPhrase.provenance.harmony)
        expect(phrase.provenance.rhythm).toEqual(offPhrase.provenance.rhythm)
        expect(phrase.result.timeline).toEqual(offPhrase.result.timeline)
        expect(phrase.provenance.harmony.events.some((event) => event.seventh !== undefined)).toBe(
          false,
        )
        expect([seen.validated, seen.refused], `${level} seed ${seed}`).toEqual([1, 0])
        if (level === 'stronglyFavored') expect(seen.seventhPlansTried).toBeGreaterThan(0)
      }
    }
  })
})

// @test-link [[rule_triad_fallback_per_phrase]]
describe('a phrase generated above Off', () => {
  it('takes its seventh variant when it has a solution, validated, and reproduces itself', () => {
    const intent = buildIntent({ seed: 5, label: 'seventh-levels' })
    const strongly = atLevel(intent, 'stronglyFavored')
    const phrase = success(generatePhrase(strongly))
    expect(phrase.provenance.harmony.identity).toContain(SEVENTHS_IDENTITY_MARK)
    expect(phrase.provenance.harmony.events.every((event) => event.seventh !== undefined)).toBe(
      true,
    )
    expect(phrase.diagnostics.windows[0]!.harmonyIdentity).toBe(phrase.provenance.harmony.identity)
    expect(generatePhrase(strongly)).toEqual(phrase)
  })
})

// @test-link [[mechanic_pitch_search_policy]]
describe('the search allowance above Off', () => {
  it('is unchanged at every level, with and without a carry-in', () => {
    for (const level of ['off', ...LEVELS_ABOVE_OFF] as const) {
      const alone = success(generatePhrase(atLevel(buildIntent({ seed: 2 }), level)))
      expect(alone.diagnostics.windows.map((window) => window.fuelAllowance)).toEqual([250_000])
      const joined = success(generatePhrase(atLevel(carryInIntent(2), level)))
      expect(joined.diagnostics.windows.map((window) => window.fuelAllowance)).toEqual([160_000])
    }
  })
})
