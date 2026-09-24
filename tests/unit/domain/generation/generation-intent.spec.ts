// @test-link [[module_generation_request_construction]]
// @test-link [[module_generation_control_catalog]]
// @test-link [[module_generative_profile_selection]]
// @test-link [[rule_seeded_phrase_reproduction]]
// @test-link [[rule_presentation_preference_preserves_phrase]]
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '@/domain/controls/profile-selection'
import {
  createGenerationIntent,
  regenerateGenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { BB_TENOR_PROFILE } from '@/domain/profile/instrument-profiles'
import { makeSeed } from '@/domain/random/seed'

describe('GenerationIntent', () => {
  const first = createGenerationIntent({
    requestId: makeRequestId('request-1'),
    seed: makeSeed(1),
    controls: DEFAULT_GENERATION_CONTROLS,
    musicalProfile: DEFAULT_PROFILE_SELECTION,
  })

  it('is complete, serializable, immutable, and reuses the selected Step 3 profile policy', () => {
    expect(first).toMatchObject({
      requestId: 'request-1',
      seed: 1,
      measureCount: 4,
      meter: { beatsPerMeasure: 4, beatUnit: 4 },
      instrumentProfile: BB_TENOR_PROFILE,
      registerIntent: { requestedRegister: 'Middle' },
    })
    expect(JSON.parse(JSON.stringify(first)).controls).toEqual(DEFAULT_GENERATION_CONTROLS)
    expect(() => {
      // @ts-expect-error generation intent is readonly
      first.seed = makeSeed(2)
    }).toThrow(TypeError)
  })

  it('retains unresolved Varying only in its outer register intent', () => {
    const varying = createGenerationIntent({
      requestId: makeRequestId('request-varying'),
      seed: makeSeed(2),
      controls: { ...DEFAULT_GENERATION_CONTROLS, register: 'Varying' },
      musicalProfile: DEFAULT_PROFILE_SELECTION,
    })
    expect(varying.registerIntent.requestedRegister).toBe('Varying')
    expect(varying.registerIntent.candidates.map((candidate) => candidate.id)).toEqual([
      'Low',
      'Middle',
      'High',
    ])
  })

  it('structurally excludes presentation, browser, and session fields', () => {
    const attempt = (): typeof first => ({
      ...first,
      // @ts-expect-error presentation state cannot be part of GenerationIntent
      theme: 'Dark',
    })
    expect(typeof attempt).toBe('function')
    expect(Object.keys(first)).not.toContain('notationMode')
    expect(Object.keys(first)).not.toContain('browserState')
  })

  it('regenerates with fresh injected identity and seed while preserving controls/profile', () => {
    const regenerated = regenerateGenerationIntent(first, {
      nextRequestId: () => makeRequestId('request-2'),
      nextSeed: () => makeSeed(2),
    })
    expect(regenerated.requestId).toBe('request-2')
    expect(regenerated.seed).toBe(2)
    expect(regenerated.controls).toEqual(first.controls)
    expect(regenerated.musicalProfile).toEqual(first.musicalProfile)
  })
})
