import { describe, expect, it } from 'vitest'

import {
  GenerationFailedError,
  createWorkspaceGenerate,
  evaluateWorkspaceProfileSwitch,
  type WorkspaceSessionResult,
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
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
  })
}

// @test-link [[service_workspace_session_flow]]
describe('createWorkspaceGenerate', () => {
  it('resolves the outcome and intent together on generation_success', async () => {
    const intent = cheapIntent()
    const outcome = generatePhrase(intent)
    expect(outcome.kind).toBe('generation_success')
    const workspaceGenerate = createWorkspaceGenerate(async () => outcome)

    const result = await workspaceGenerate(intent)

    expect(result.outcome).toBe(outcome)
    expect(result.intent).toBe(intent)
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
    const workspaceGenerate = createWorkspaceGenerate(async () => failure)

    await expect(workspaceGenerate(intent)).rejects.toMatchObject({
      code: 'no_legal_pitch_plan',
    })
    await expect(workspaceGenerate(intent)).rejects.toBeInstanceOf(GenerationFailedError)
  })
})

// @test-link [[rule_profile_switch_validates_phrase]]
describe('evaluateWorkspaceProfileSwitch', () => {
  it('retains the phrase when the next controls keep the same profile and register', () => {
    const intent = cheapIntent()
    const outcome = generatePhrase(intent)
    if (outcome.kind !== 'generation_success') {
      throw new Error('Fixture setup: expected generation_success.')
    }
    const result: WorkspaceSessionResult = { outcome, intent }

    const decision = evaluateWorkspaceProfileSwitch(result, intent.controls, makeSeed(123))

    expect(decision).toEqual({ kind: 'retain' })
  })

  it('regenerates with the fresh seed when a bb-tenor Low-register phrase does not fit eb-alto (its low notes fall below the active range)', () => {
    // Pinned seed 9 with these cheap Low-register bb-tenor controls deterministically produces a
    // phrase reaching MIDI 48, which is below E-flat alto's active range floor of 51.
    const intent = cheapIntent()
    const outcome = generatePhrase(intent)
    if (outcome.kind !== 'generation_success') {
      throw new Error('Fixture setup: expected generation_success.')
    }
    const lowestPitch = Math.min(
      ...outcome.result.timeline.measures.flatMap((measure) =>
        measure.events.filter((event) => event.kind === 'note').map((event) => event.pitch),
      ),
    )
    expect(lowestPitch).toBeLessThan(51)
    const result: WorkspaceSessionResult = { outcome, intent }
    const nextControls = { ...intent.controls, instrumentProfileId: 'eb-alto' as const }
    const freshSeed = makeSeed(4242)

    const decision = evaluateWorkspaceProfileSwitch(result, nextControls, freshSeed)

    expect(decision).toEqual({ kind: 'regenerate', seed: freshSeed })
  })
})
