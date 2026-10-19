/**
 * A real, cheap end-to-end intent/request/ranked-candidate fixture for window-search tests: the
 * same wiring shape as tests/unit/domain/validation/generation-result-validator.spec.ts's
 * buildFixture, but built from deliberately inexpensive control values (Quarter density,
 * Straight syncopation, Sparse silence, Gentle diatonic motion) so the rhythm grammar and harmony
 * domain both stay small and window-search tests run in well under a second.
 */

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import {
  makeGenerationRequest,
  makeRequestId,
  type GenerationRequest,
} from '@/domain/generation/generation-request'
import {
  materializeRankedRhythmCache,
  rankHarmonyCandidates,
  type RankedRhythmCache,
} from '@/domain/generation/orchestration/candidate-ranking'
import { GENERATION_SEARCH_POLICY_V1 } from '@/domain/generation/orchestration/search-ledger'
import type { GenerationSearchPolicy } from '@/domain/generation/orchestration/orchestration-types'
import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import type { HarmonyCandidate } from '@/domain/harmony/harmony-types'
import { makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import { makeSeed, type Seed } from '@/domain/random/seed'

/** The complete, already-ranked inputs one searchWindow call needs, built from a real fixture. */
export interface WindowSearchFixture {
  readonly intent: GenerationIntent
  readonly request: GenerationRequest
  readonly rankedHarmony: readonly HarmonyCandidate[]
  readonly rankedRhythm: RankedRhythmCache
  readonly searchPolicy: GenerationSearchPolicy
}

/**
 * Intent: build a real, cheap-to-search window-search fixture for a given seed: a Middle-register
 * intent/request pair and its fully ranked harmony and rhythm candidate domains. Throws if the
 * deliberately cheap controls stop yielding a harmony or rhythm plan, since that would silently
 * invalidate every test built on this fixture.
 */
export function buildWindowSearchFixture(seed: Seed = makeSeed(7)): WindowSearchFixture {
  const controls = makeGenerationControls({
    tempo: 90,
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Gentle diatonic',
    tension: 'Settled',
    noteDensity: 'Quarter',
    rhythmicVariety: 'Slightly varied',
    syncopation: 'Straight',
    silenceDensity: 'Sparse',
    contour: 'Arch',
    register: 'Middle',
    leapiness: 'Shaped',
    arpeggioChaos: 'Predictable',
    instrumentProfileId: 'c-keyboard',
  })
  const musicalProfile = { musicalProfile: 'Neutral' as const, isCustom: true }

  const intent = createGenerationIntent({
    requestId: makeRequestId('window-search-fixture'),
    seed,
    controls,
    musicalProfile,
  })

  const middleCandidate = intent.registerIntent.candidates.find(
    (candidate) => candidate.id === 'Middle',
  )
  if (!middleCandidate) throw new Error('Fixture setup: no Middle register candidate.')

  const request = makeGenerationRequest({
    requestId: intent.requestId,
    seed: intent.seed,
    measureCount: 4,
    meter: intent.meter,
    activeConcertRange: intent.instrumentProfile.concertRange,
    register: 'Middle',
    registerWindow: middleCandidate.window,
  })

  const harmonyResult = makeHarmonyCandidateDomain({
    tonalCenter: controls.tonalCenter,
    collection: controls.collection,
    harmonicMotion: controls.harmonicMotion,
    tensionArc: controls.tension,
  })
  if (harmonyResult.kind !== 'harmony_candidate_domain')
    throw new Error('Fixture setup: no legal harmony plan.')

  const rhythmResult = makeRhythmCandidateDomain({
    noteDensity: controls.noteDensity,
    rhythmicVariety: controls.rhythmicVariety,
    silenceDensity: controls.silenceDensity,
    syncopation: controls.syncopation,
    tensionArc: controls.tension,
  })
  if (rhythmResult.kind !== 'rhythm_candidate_domain')
    throw new Error('Fixture setup: no legal rhythm plan.')

  const rankedHarmony = rankHarmonyCandidates(harmonyResult.candidates, seed)
  const rankedRhythm = materializeRankedRhythmCache(rhythmResult, seed)

  return {
    intent,
    request,
    rankedHarmony,
    rankedRhythm,
    searchPolicy: GENERATION_SEARCH_POLICY_V1,
  }
}
