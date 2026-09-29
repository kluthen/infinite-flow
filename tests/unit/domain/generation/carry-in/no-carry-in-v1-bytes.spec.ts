/**
 * Generation without carry-in is the first release's generation, byte for byte: the recorded v3
 * golden outcomes (the faster cases; the golden spec itself runs all of them) reproduce their
 * hashes, with no `carryIn` field anywhere in the intent or the outcome, and still do right after
 * phrases generated with carry-in on the same shared rhythm memo, so nothing a join does leaks into
 * a later phrase generated without one (the Idle phrase, or the failure ladder's standalone phrase).
 */

import { describe, expect, it } from 'vitest'

import { makeGenerationControls, PITCH_CLASSES } from '@/domain/controls/generation-controls'
import { createGenerationIntent, getInstrumentProfile } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { fnv1a32 } from '@/domain/random/hash32'
import { makeSeed } from '@/domain/random/seed'
import {
  GENERATION_OUTCOME_GOLDEN_V3,
  type GoldenCase,
} from '../orchestration/generation-outcome-golden.v3'
import { buildIntent, carryInAfter, generateSuccess } from './carry-in-fixture'

/**
 * Intent: the golden case's intent exactly as the golden spec builds it: the recorded concert
 * tonal center is passed as the written center that converts back onto it.
 */
function goldenIntent(goldenCase: GoldenCase) {
  const profile = getInstrumentProfile(goldenCase.controls.instrumentProfileId)
  const concertIndex = PITCH_CLASSES.indexOf(goldenCase.controls.tonalCenter)
  const written =
    PITCH_CLASSES[(((concertIndex + profile.transposition.chromatic) % 12) + 12) % 12]!
  return createGenerationIntent({
    requestId: makeRequestId(`golden-${goldenCase.name}`),
    seed: makeSeed(goldenCase.seed),
    controls: makeGenerationControls({ ...goldenCase.controls, tonalCenter: written }),
    musicalProfile: goldenCase.musicalProfile,
  })
}

const FAST_CASES = GENERATION_OUTCOME_GOLDEN_V3.filter(
  (goldenCase) => goldenCase.controls.rhythmicVariety !== 'Heavily varied',
)

/** Intent: generate a three-phrase chain with carry-in, touching the shared memo and caches. */
function generateSessionWithCarryIn(): void {
  let intent = buildIntent({ seed: 5, label: 'leak' })
  let outcome = generateSuccess(intent)
  for (const phraseNumber of [2, 3]) {
    const carryIn = carryInAfter(intent, outcome, phraseNumber - 1)
    intent = buildIntent({ seed: 5 + phraseNumber, carryIn, label: 'leak' })
    outcome = generateSuccess(intent)
  }
}

// @test-link [[rule_no_carry_in_output_matches_v1]]
// @test-link [[rule_seeded_phrase_reproduction]]
describe('generation without carry-in', () => {
  it.each(FAST_CASES)('$name reproduces its first-release golden hash', (goldenCase) => {
    const intent = goldenIntent(goldenCase)
    expect('carryIn' in intent).toBe(false)
    const outcome = generatePhrase(intent)
    expect(JSON.stringify(outcome)).not.toContain('carryIn')
    expect(fnv1a32(JSON.stringify(outcome))).toBe(goldenCase.expectedHash)
  })

  it.each(FAST_CASES)('$name still reproduces it after phrases with carry-in', (goldenCase) => {
    generateSessionWithCarryIn()
    expect(fnv1a32(JSON.stringify(generatePhrase(goldenIntent(goldenCase))))).toBe(
      goldenCase.expectedHash,
    )
  })
})
