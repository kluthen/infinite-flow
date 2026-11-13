/**
 * The result validator's harmony provenance at each Seventh chords level: it rebuilds the list the
 * search walked from the intent's level and seed, so it accepts a phrase whose plan is a variant
 * that level and seed give, and refuses one claiming a variant they do not.
 */

import { describe, expect, it } from 'vitest'

import { parseChordFamilies, type ChordFamilyLevel } from '@/domain/chords/chord-families'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import {
  buildHarmonyDomain,
  generatePhrase,
} from '@/domain/generation/orchestration/generation-orchestrator'
import {
  SEVENTHS_IDENTITY_MARK,
  harmonyPlanVariants,
} from '@/domain/generation/orchestration/harmony-variants'
import type { GenerationProvenance } from '@/domain/generation/orchestration/orchestration-types'
import type { HarmonyCandidate, HarmonyEvent } from '@/domain/harmony/harmony-types'
import { validateGenerationResult } from '@/domain/validation/generation-result-validator'
import { harmonyProvenanceFailures } from '@/domain/validation/generation-result-validator-checks'
import {
  buildIntent,
  carryInAfter,
  generateSuccess,
  type SuccessOutcome,
} from '../generation/carry-in/carry-in-fixture'
import { withSeventh } from '../harmony/seventh-chord-fixtures'

const LEVELS_ABOVE_OFF: readonly ChordFamilyLevel[] = ['sometimes', 'favored', 'stronglyFavored']

/** Intent: the same intent at another Seventh chords level. */
function atLevel(intent: GenerationIntent, level: ChordFamilyLevel): GenerationIntent {
  return { ...intent, chordFamilies: parseChordFamilies({ 'seventh-chords': level }) }
}

/** Intent: the intent's phrase, which must be generated. */
function phraseOf(intent: GenerationIntent): SuccessOutcome {
  const outcome = generatePhrase(intent)
  if (outcome.kind !== 'generation_success') throw new Error(`Expected a phrase: ${outcome.code}.`)
  return outcome
}

/** Intent: the provenance with another harmony plan. */
function claiming(provenance: GenerationProvenance, harmony: HarmonyCandidate) {
  return { ...provenance, harmony }
}

/** The seed-5 intent at Off, and its phrase's provenance, which the claims below replace. */
const OFF = buildIntent({ seed: 5, label: 'validator-sevenths' })
const OFF_PROVENANCE = phraseOf(OFF).provenance

/** Intent: the harmony provenance failure codes and details for an intent and a claimed plan. */
function provenanceDetails(intent: GenerationIntent, harmony: HarmonyCandidate): readonly string[] {
  return harmonyProvenanceFailures(intent, claiming(OFF_PROVENANCE, harmony)).map(
    (failure) => `${failure.code}:${failure.detail?.split(':')[0]}`,
  )
}

/** Intent: the plan variants the intent's level and seed give its domain's plans. */
function variantsOf(intent: GenerationIntent): readonly HarmonyCandidate[] {
  const domain = buildHarmonyDomain(intent)
  if (domain.kind !== 'harmony_candidate_domain') throw new Error('Fixture: no harmony plan.')
  const level = intent.chordFamilies['seventh-chords']
  return harmonyPlanVariants(domain.candidates, domain.collection, level, intent.seed)
}

/** Intent: the plan with one event's form changed: its seventh dropped, or one added. */
function withEventToggled(harmony: HarmonyCandidate, index: number): HarmonyCandidate {
  const events = harmony.events.map((event, at): HarmonyEvent => {
    if (at !== index) return event
    if (event.seventh === undefined) return withSeventh(event)
    return Object.fromEntries(
      Object.entries(event).filter(([key]) => key !== 'seventh'),
    ) as unknown as HarmonyEvent
  })
  return { ...harmony, events }
}

// @test-link [[service_generation_result_validation]]
// @test-link [[rule_seventh_chord_draws_reproducible]]
describe('the result validator above Off', () => {
  it('accepts every phrase generated at each level, with and without a carry-in', () => {
    for (const level of LEVELS_ABOVE_OFF)
      for (const seed of [4, 5, 9]) {
        const alone = atLevel(buildIntent({ seed, label: 'validator-sevenths' }), level)
        const first = phraseOf(alone)
        const joined = buildIntent({
          seed: seed + 500,
          carryIn: carryInAfter(alone, first, 1),
          label: 'validator-sevenths',
          chordFamilies: alone.chordFamilies,
        })
        for (const [intent, phrase] of [
          [alone, first],
          [joined, generateSuccess(joined)],
        ] as const)
          expect(
            validateGenerationResult({
              intent,
              request: phrase.request,
              result: phrase.result,
              provenance: phrase.provenance,
            }),
            `${level} seed ${seed}`,
          ).toEqual({ kind: 'valid_generation_result' })
      }
  })

  it('refuses a phrase claiming a seventh variant its level and seed do not give', () => {
    const strongly = atLevel(OFF, 'stronglyFavored')
    const claimed = variantsOf(strongly)[0]!
    expect(claimed.identity).toContain(SEVENTHS_IDENTITY_MARK)
    expect(provenanceDetails(strongly, claimed)).toEqual([])
    expect(provenanceDetails(OFF, claimed)).toEqual([
      'harmony_provenance_mismatch:identity_not_found',
    ])
    const sometimes = atLevel(OFF, 'sometimes')
    expect(variantsOf(sometimes).some((candidate) => candidate.identity === claimed.identity)).toBe(
      false,
    )
    expect(provenanceDetails(sometimes, claimed)).toEqual([
      'harmony_provenance_mismatch:identity_not_found',
    ])
  })

  it('refuses a variant whose events do not hold exactly the sevenths its identity names', () => {
    const strongly = atLevel(OFF, 'stronglyFavored')
    const claimed = variantsOf(strongly)[0]!
    expect(provenanceDetails(strongly, withEventToggled(claimed, 0))).toEqual([
      'harmony_provenance_mismatch:content_mismatch',
    ])
    const triads = OFF_PROVENANCE.harmony
    for (const level of ['off', ...LEVELS_ABOVE_OFF] as const)
      expect(provenanceDetails(atLevel(OFF, level), withEventToggled(triads, 0)), level).toEqual([
        'harmony_provenance_mismatch:content_mismatch',
      ])
  })

  it("accepts a plan's triads-only form at every level", () => {
    for (const level of ['off', ...LEVELS_ABOVE_OFF] as const)
      expect(provenanceDetails(atLevel(OFF, level), OFF_PROVENANCE.harmony), level).toEqual([])
  })
})
