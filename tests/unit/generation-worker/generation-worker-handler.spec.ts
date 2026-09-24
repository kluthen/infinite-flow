import { describe, expect, it } from 'vitest'

import {
  makeGenerationControls,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { makeSeed } from '@/domain/random/seed'
import { handleGenerationWorkerMessage } from '@/generation-worker/generation-worker-handler'

/** The same deliberately inexpensive control values used across the orchestrator's own fixtures. */
const CHEAP_CONTROLS: GenerationControls = makeGenerationControls({
  tempo: 90,
  tonalCenter: 'C',
  collection: 'Major',
  harmonicMotion: 'Gentle diatonic',
  tension: 'Settled',
  noteDensity: 'Quarter',
  syncopation: 'Straight',
  silenceDensity: 'Sparse',
  contour: 'Arch',
  register: 'Middle',
  leapiness: 'Shaped',
  arpeggioChaos: 'Predictable',
  instrumentProfileId: 'c-keyboard',
})

/** Intent: build one real cheap-to-search GenerationIntent, optionally overriding controls. */
function buildIntent(
  requestId: string,
  seed: number,
  controlOverrides: Partial<GenerationControls> = {},
): GenerationIntent {
  return createGenerationIntent({
    requestId: makeRequestId(requestId),
    seed: makeSeed(seed),
    controls: makeGenerationControls({ ...CHEAP_CONTROLS, ...controlOverrides }),
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
  })
}

// @test-link [[service_generation_orchestration]]
describe('handleGenerationWorkerMessage', () => {
  // @test-link [[rule_seeded_phrase_reproduction]]
  it('returns an outcome response whose outcome equals a direct generatePhrase call, for a success', () => {
    const intent = buildIntent('handler-success', 1)
    const expected = generatePhrase(intent)

    const response = handleGenerationWorkerMessage({ type: 'generate', id: 1, intent })

    expect(response.type).toBe('outcome')
    if (response.type !== 'outcome') return
    expect(response.id).toBe(1)
    expect(JSON.parse(JSON.stringify(response.outcome))).toEqual(
      JSON.parse(JSON.stringify(expected)),
    )
  })

  it('round-trips a no_legal_rhythm_plan failure outcome for Quarter + Sparse + Active displacement', () => {
    const intent = buildIntent('handler-failure', 2, {
      noteDensity: 'Quarter',
      silenceDensity: 'Sparse',
      syncopation: 'Active displacement',
    })
    const expected = generatePhrase(intent)
    expect(expected.kind).toBe('generation_failure')
    if (expected.kind !== 'generation_failure') return
    expect(expected.code).toBe('no_legal_rhythm_plan')

    const response = handleGenerationWorkerMessage({ type: 'generate', id: 2, intent })

    expect(response.type).toBe('outcome')
    if (response.type !== 'outcome') return
    expect(response.outcome).toEqual(expected)
  })

  it('throws on a malformed request instead of inventing a correlation id', () => {
    expect(() => handleGenerationWorkerMessage({ type: 'generate', id: 'not-a-number' })).toThrow()
    expect(() => handleGenerationWorkerMessage(null)).toThrow()
    expect(() => handleGenerationWorkerMessage({})).toThrow()
  })
})
