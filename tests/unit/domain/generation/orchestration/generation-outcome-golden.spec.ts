/**
 * Byte-identical proof that Step 9's canonical-rhythm-domain memo never changes `generatePhrase`'s
 * output: replays `GENERATION_OUTCOME_GOLDEN_V3` (recorded against the current orchestrator; see
 * the fixture's version history for what moved and why) against the current orchestrator on a
 * cold (fresh, empty) memo and again on a warm memo (the same memo instance reused for a second
 * call with the same intent), asserting the `fnv1a32(JSON.stringify(outcome))` hash and outcome
 * kind/code match exactly in both cases. Also proves a warm-memo hit produces the exact same
 * result as a fresh-memo cold call for a different seed against the same rhythm setting.
 */

import { describe, expect, it } from 'vitest'

import { makeGenerationControls, PITCH_CLASSES } from '@/domain/controls/generation-controls'
import { createGenerationIntent, getInstrumentProfile } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { createCanonicalRhythmDomainMemo } from '@/domain/generation/orchestration/canonical-rhythm-domain'
import { fnv1a32 } from '@/domain/random/hash32'
import { makeSeed } from '@/domain/random/seed'
import { levelsForProfile } from '@/domain/figures/figure-levels'
import { GENERATION_OUTCOME_GOLDEN_V3, type GoldenCase } from './generation-outcome-golden.v3'

/**
 * Intent: build the real GenerationIntent one golden fixture case describes. `requestId` matches
 * the exact string the baseline-recording script used (`golden-<name>`) so the outcome's embedded
 * request identity — and therefore its hash — is byte-identical when `seed` is the fixture's
 * original seed; a different seed gets a distinguishing suffix since it is never hash-compared
 * against the golden fixture.
 *
 * `goldenCase.controls.tonalCenter` was recorded pre-ISS-003, when `GenerationControls.tonalCenter`
 * was concert pitch (the only pitch the generator ever consumes) with no written/concert split.
 * `createGenerationIntent` now reads its `controls.tonalCenter` input as the player's WRITTEN
 * selection and converts it to concert internally, so this passes the written value whose
 * conversion — through the case's own instrument profile transposition — lands back on exactly the
 * originally-recorded concert tonal center, keeping the generator's actual concert-pitch input (and
 * therefore the golden hash) byte-identical without touching the fixture.
 */
function buildGoldenIntent(goldenCase: GoldenCase, seed: number = goldenCase.seed) {
  const requestId =
    seed === goldenCase.seed ? `golden-${goldenCase.name}` : `golden-${goldenCase.name}-${seed}`
  const instrumentProfile = getInstrumentProfile(goldenCase.controls.instrumentProfileId)
  const concertIndex = PITCH_CLASSES.indexOf(goldenCase.controls.tonalCenter)
  const writtenIndex = (((concertIndex + instrumentProfile.transposition.chromatic) % 12) + 12) % 12
  const writtenTonalCenter = PITCH_CLASSES[writtenIndex]!
  return createGenerationIntent({
    requestId: makeRequestId(requestId),
    seed: makeSeed(seed),
    controls: makeGenerationControls({ ...goldenCase.controls, tonalCenter: writtenTonalCenter }),
    figureLevels: levelsForProfile(goldenCase.musicalProfile.musicalProfile),
  })
}

/**
 * Per-case timeout: the worst-case golden case (Sixteenth/Heavily varied + Active displacement) enumerates the
 * full rhythm domain cold in ~17 s alone and runs past 30 s under full-suite parallel load.
 */
const GOLDEN_CASE_TIMEOUT_MS = 180_000

// @test-link [[service_generation_orchestration]]
// @test-link [[rule_seeded_phrase_reproduction]]
describe('generation outcome golden fixture (Step 9 canonical rhythm domain memo)', () => {
  it.each(GENERATION_OUTCOME_GOLDEN_V3)(
    '$name reproduces the baseline hash on a cold memo',
    (goldenCase) => {
      const memo = createCanonicalRhythmDomainMemo()
      const intent = buildGoldenIntent(goldenCase)
      const outcome = generatePhrase(intent, { rhythmDomainMemo: memo })
      expect(outcome.kind).toBe(goldenCase.expectedKind)
      if (goldenCase.expectedCode !== undefined) {
        expect(outcome.kind === 'generation_failure' ? outcome.code : undefined).toBe(
          goldenCase.expectedCode,
        )
      }
      expect(fnv1a32(JSON.stringify(outcome))).toBe(goldenCase.expectedHash)
    },
    GOLDEN_CASE_TIMEOUT_MS,
  )

  it.each(GENERATION_OUTCOME_GOLDEN_V3)(
    '$name reproduces the baseline hash on a warm memo (second call, same intent)',
    (goldenCase) => {
      const memo = createCanonicalRhythmDomainMemo()
      const intent = buildGoldenIntent(goldenCase)
      generatePhrase(intent, { rhythmDomainMemo: memo }) // cold call, populates the memo
      const warmOutcome = generatePhrase(intent, { rhythmDomainMemo: memo }) // warm (cache hit)
      expect(fnv1a32(JSON.stringify(warmOutcome))).toBe(goldenCase.expectedHash)
    },
    GOLDEN_CASE_TIMEOUT_MS,
  )

  const successCases = GENERATION_OUTCOME_GOLDEN_V3.filter(
    (goldenCase) => goldenCase.expectedKind === 'generation_success',
  )

  it.each(successCases)(
    '$name: a warm-memo different-seed call equals a fresh-memo cold call for that seed',
    (goldenCase) => {
      const differentSeed = goldenCase.seed + 1000
      const warmMemo = createCanonicalRhythmDomainMemo()
      generatePhrase(buildGoldenIntent(goldenCase), { rhythmDomainMemo: warmMemo }) // populate

      const warmIntent = buildGoldenIntent(goldenCase, differentSeed)
      const warmOutcome = generatePhrase(warmIntent, { rhythmDomainMemo: warmMemo })

      const freshMemo = createCanonicalRhythmDomainMemo()
      const freshIntent = buildGoldenIntent(goldenCase, differentSeed)
      const freshOutcome = generatePhrase(freshIntent, { rhythmDomainMemo: freshMemo })

      expect(fnv1a32(JSON.stringify(warmOutcome))).toBe(fnv1a32(JSON.stringify(freshOutcome)))
      expect(warmOutcome).toEqual(freshOutcome)
    },
    GOLDEN_CASE_TIMEOUT_MS,
  )
})
