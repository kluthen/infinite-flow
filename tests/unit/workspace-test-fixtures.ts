/**
 * Shared test-only fixtures for Step 9 workspace tests: a cheap, real `WorkspaceSessionResult`
 * (built from an actual orchestration run, not a hand-rolled stand-in, with a fixed session seed
 * unless a test gives one) and the default controls a
 * fresh session starts with. Every workspace/coordinator spec that needs a real generated phrase
 * without paying for an expensive control combination should build it from here.
 */
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import type { WorkspaceSessionResult } from '../../src/composables/workspace-session-result'
import type { GenerationControls } from '../../src/domain/controls/generation-controls'
import { createGenerationIntent } from '../../src/domain/generation/generation-intent'
import { makeRequestId } from '../../src/domain/generation/generation-request'
import { generatePhrase } from '../../src/domain/generation/orchestration/generation-orchestrator'
import { DEFAULT_GENERATION_CONTROLS } from '../../src/domain/controls/profile-selection'
import { makeSeed } from '../../src/domain/random/seed'

/** The same deliberately inexpensive rhythm/harmony controls the notation session fixtures use. */
export const CHEAP_CONTROLS: GenerationControls = {
  ...DEFAULT_GENERATION_CONTROLS,
  noteDensity: 'Quarter',
  syncopation: 'Straight',
  silenceDensity: 'Sparse',
  harmonicMotion: 'Gentle diatonic',
  tension: 'Settled',
}

/** The preset selection the fixture's phrases are generated under. */
const SELECTION = { kind: 'preset', presetId: 'neutral' } as const

/** Intent: run one real, cheap generation and return its successful WorkspaceSessionResult. */
export function buildWorkspaceSessionResult(
  requestId = 'workspace-fixture-1',
  seed = 1,
  sessionSeed = 1,
): WorkspaceSessionResult {
  const intent = createGenerationIntent({
    requestId: makeRequestId(requestId),
    seed: makeSeed(seed),
    controls: CHEAP_CONTROLS,
    figureLevels: NEUTRAL_FIGURE_LEVELS,
  })
  const outcome = generatePhrase(intent)
  if (outcome.kind !== 'generation_success') {
    throw new Error(`Fixture setup: expected generation_success, got "${outcome.kind}".`)
  }
  const settings = {
    controls: CHEAP_CONTROLS,
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    selection: SELECTION,
  }
  return { outcome, intent, settings, sessionSeed: makeSeed(sessionSeed) }
}
