import { describe, expect, it } from 'vitest'

import {
  GenerationFailedError,
  createWorkspaceGenerate,
  withSessionSeed,
  type IdlePhraseSettings,
} from '@/composables/workspace-session-result'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { makeSeed } from '@/domain/random/seed'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'

/** Intent: build a real generation intent from cheap, deliberately-inexpensive controls so tests stay fast. */
function cheapIntent(
  overrides: Partial<typeof DEFAULT_GENERATION_CONTROLS> = {},
): GenerationIntent {
  return createGenerationIntent({
    requestId: makeRequestId('workspace-session-result'),
    seed: makeSeed(9),
    controls: {
      ...DEFAULT_GENERATION_CONTROLS,
      noteDensity: 'Quarter',
      syncopation: 'Straight',
      silenceDensity: 'Sparse',
      harmonicMotion: 'Gentle diatonic',
      tension: 'Settled',
      register: 'Low',
      instrumentProfileId: 'bb-tenor',
      ...overrides,
    },
    figureLevels: NEUTRAL_FIGURE_LEVELS,
  })
}

/**
 * The settings a test's fit run is built from: the chosen controls, the figure levels and the
 * preset selection.
 */
const CHOSEN: IdlePhraseSettings = {
  controls: { ...DEFAULT_GENERATION_CONTROLS, noteDensity: 'Sixteenth' },
  figureLevels: NEUTRAL_FIGURE_LEVELS,
  selection: { kind: 'custom', baseId: 'neutral' },
}

// @test-link [[service_idle_generation_session]]
describe('createWorkspaceGenerate', () => {
  it('resolves the outcome and intent together on generation_success', async () => {
    const intent = cheapIntent()
    const outcome = generatePhrase(intent)
    expect(outcome.kind).toBe('generation_success')
    const workspaceGenerate = createWorkspaceGenerate(
      async () => outcome,
      () => CHOSEN,
    )

    const result = await workspaceGenerate(intent)

    expect(result.outcome).toBe(outcome)
    expect(result.intent).toBe(intent)
  })

  // @test-link [[service_idle_generation_session]]
  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it('records the chosen settings its request was built from, read as the request is posted', async () => {
    const intent = cheapIntent({ noteDensity: 'Eighth' })
    const outcome = generatePhrase(intent)
    let chosen = CHOSEN
    const workspaceGenerate = createWorkspaceGenerate(
      () => Promise.resolve(outcome),
      () => chosen,
    )

    const pending = workspaceGenerate(intent)
    chosen = { ...CHOSEN, controls: { ...CHOSEN.controls, tonalCenter: 'G' } }
    const result = await pending

    expect(result.settings).toBe(CHOSEN)
    expect(result.settings.controls.noteDensity).toBe('Sixteenth')
    expect(result.intent.controls.noteDensity).toBe('Eighth')
  })

  it('throws a typed GenerationFailedError carrying the failure code on generation_failure, rather than defaulting a result', async () => {
    const intent = cheapIntent()
    const failure: GenerationOutcome = {
      kind: 'generation_failure',
      code: 'no_legal_pitch_plan',
      diagnostics: {
        version: 'generation-diagnostics-v1',
        harmonyDomainSize: 0,
        rhythmDomainSize: 0,
        windows: [],
        successfulRegisters: [],
      },
    }
    const workspaceGenerate = createWorkspaceGenerate(
      async () => failure,
      () => CHOSEN,
    )

    await expect(workspaceGenerate(intent)).rejects.toMatchObject({
      code: 'no_legal_pitch_plan',
    })
    await expect(workspaceGenerate(intent)).rejects.toBeInstanceOf(GenerationFailedError)
  })
})

// @test-link [[module_session_seed_plan]]
describe('withSessionSeed', () => {
  // @test-link [[module_session_seed_plan]]
  it('publishes a generated phrase unchanged with the session seed drawn for it', () => {
    const intent = cheapIntent()
    const outcome = generatePhrase(intent)
    if (outcome.kind !== 'generation_success') throw new Error('Fixture setup: no phrase.')
    const generated = { outcome, intent, settings: CHOSEN }

    const published = withSessionSeed(generated, makeSeed(4242))

    expect(published).toEqual({ outcome, intent, settings: CHOSEN, sessionSeed: 4242 })
    expect(published.outcome).toBe(outcome)
    expect(published.intent).toBe(intent)
    expect(published.settings).toBe(CHOSEN)
    expect(generated).toEqual({ outcome, intent, settings: CHOSEN })
  })
})
