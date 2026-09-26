/**
 * A real, cheap end-to-end GenerationIntent fixture for generation-orchestrator tests, built from
 * the same deliberately inexpensive control values as ./window-search-fixture.ts (Quarter density,
 * Straight syncopation, Sparse silence, Gentle diatonic motion, Settled tension) so the harmony
 * and rhythm domains both stay small and every window search resolves quickly. Adds a parametrized
 * register choice (a fixed register or Varying) and small helpers that independently recompute the
 * same ranked candidate domains and one window's outcome the way generatePhrase itself does, so
 * tests can assert against a known-good expectation without inspecting orchestrator internals.
 */

import {
  makeGenerationControls,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import {
  materializeRankedRhythmCache,
  rankHarmonyCandidates,
  type RankedRhythmCache,
} from '@/domain/generation/orchestration/candidate-ranking'
import type {
  GenerationSearchPolicy,
  WindowOutcome,
} from '@/domain/generation/orchestration/orchestration-types'
import { resolveCoreRequests } from '@/domain/generation/orchestration/request-resolution'
import { GENERATION_SEARCH_POLICY_V1 } from '@/domain/generation/orchestration/search-ledger'
import {
  DEFAULT_WINDOW_SEARCH_DEPS,
  searchWindow,
  type WindowSearchDeps,
} from '@/domain/generation/orchestration/window-search'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import type { HarmonyCandidate } from '@/domain/harmony/harmony-types'
import { makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import { makeSeed, type Seed } from '@/domain/random/seed'
import type { RegisterId } from '@/domain/profile/register-id'
import type { RegisterChoice } from '@/domain/profile/register-intent'

/** The cheap, deliberately-inexpensive rhythm/harmony controls every fixture intent starts from. */
const CHEAP_CONTROLS: GenerationControls = makeGenerationControls({
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

const MUSICAL_PROFILE = { musicalProfile: 'Neutral' as const, isCustom: true }

/**
 * Intent: build a real, cheap-to-search GenerationIntent for one register choice and seed,
 * overriding only the register-affecting control and any explicitly supplied overrides on top of
 * the shared cheap base controls.
 */
export function buildOrchestratorIntent(
  register: RegisterChoice = 'Middle',
  seed: Seed = makeSeed(7),
  controlOverrides: Partial<GenerationControls> = {},
): GenerationIntent {
  const controls = makeGenerationControls({ ...CHEAP_CONTROLS, register, ...controlOverrides })
  return createGenerationIntent({
    requestId: makeRequestId(`orchestrator-fixture-${register}-${seed}`),
    seed,
    controls,
    musicalProfile: MUSICAL_PROFILE,
  })
}

/** The independently recomputed ranked harmony/rhythm domains one intent resolves to. */
export interface RankedDomains {
  readonly rankedHarmony: readonly HarmonyCandidate[]
  readonly rankedRhythm: RankedRhythmCache
}

/**
 * Intent: independently recompute one intent's ranked harmony and rhythm candidate domains the
 * same way generatePhrase does, for tests that assert against the orchestrator's exact search
 * order or exact window outcome without reaching into its internals. Throws if the fixture's
 * cheap controls stop yielding a legal domain, since that would silently invalidate every test
 * built on it.
 */
export function computeRankedDomains(intent: GenerationIntent): RankedDomains {
  const harmonyResult = makeHarmonyCandidateDomain({
    tonalCenter: intent.controls.tonalCenter,
    collection: intent.controls.collection,
    harmonicMotion: intent.controls.harmonicMotion,
    tensionArc: intent.controls.tension,
    profile: intent.musicalProfile.musicalProfile,
  })
  if (harmonyResult.kind !== 'harmony_candidate_domain')
    throw new Error('Fixture setup: no legal harmony plan.')

  const rhythmResult = makeRhythmCandidateDomain({
    noteDensity: intent.controls.noteDensity,
    rhythmicVariety: intent.controls.rhythmicVariety,
    silenceDensity: intent.controls.silenceDensity,
    syncopation: intent.controls.syncopation,
    tensionArc: intent.controls.tension,
  })
  if (rhythmResult.kind !== 'rhythm_candidate_domain')
    throw new Error('Fixture setup: no legal rhythm plan.')

  return {
    rankedHarmony: rankHarmonyCandidates(harmonyResult.candidates, intent.seed),
    rankedRhythm: materializeRankedRhythmCache(rhythmResult, intent.seed),
  }
}

/**
 * Intent: independently recompute the exact WindowOutcome generatePhrase would reuse for one
 * resolved register window of one intent, under the same injectable deps/search policy, so a test
 * can assert the orchestrator's returned result is exactly that window's already-validated result
 * rather than a re-run or a different one.
 */
export function computeWindowOutcome(
  intent: GenerationIntent,
  register: RegisterId,
  deps: WindowSearchDeps = DEFAULT_WINDOW_SEARCH_DEPS,
  searchPolicy: GenerationSearchPolicy = GENERATION_SEARCH_POLICY_V1,
): WindowOutcome {
  const { rankedHarmony, rankedRhythm } = computeRankedDomains(intent)
  const request = resolveCoreRequests(intent).find((entry) => entry.register === register)
  if (!request) throw new Error(`Fixture setup: no resolved core request for register ${register}.`)
  return searchWindow({ intent, request, rankedHarmony, rankedRhythm, searchPolicy }, deps).outcome
}
