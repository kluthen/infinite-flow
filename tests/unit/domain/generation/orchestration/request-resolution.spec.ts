import { describe, expect, it } from 'vitest'

import {
  RequestResolutionError,
  resolveCoreRequests,
  selectVaryingRegister,
} from '@/domain/generation/orchestration/request-resolution'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import type { RegisterId } from '@/domain/profile/register-id'
import { makeSeed, type Seed } from '@/domain/random/seed'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'

const PROFILE_WINDOWS = {
  'c-keyboard': { Low: [48, 60], Middle: [54, 66], High: [60, 72] },
  'bb-tenor': { Low: [46, 58], Middle: [52, 64], High: [58, 70] },
  'eb-alto': { Low: [51, 63], Middle: [57, 69], High: [63, 75] },
} as const

function controlsFor(
  instrumentProfileId: GenerationControls['instrumentProfileId'],
  register: GenerationControls['register'],
): GenerationControls {
  return { ...DEFAULT_GENERATION_CONTROLS, instrumentProfileId, register }
}

describe('request-resolution', () => {
  // @test-link [[rule_instrument_profile_range]]
  describe('resolveCoreRequests: fixed register', () => {
    const profiles = ['c-keyboard', 'bb-tenor', 'eb-alto'] as const
    const registers = ['Low', 'Middle', 'High'] as const

    for (const profileId of profiles) {
      for (const register of registers) {
        it(`resolves exactly one request for ${profileId}/${register} with the profile window`, () => {
          const intent = createGenerationIntent({
            requestId: makeRequestId(`request-${profileId}-${register}`),
            seed: makeSeed(1),
            controls: controlsFor(profileId, register),
            figureLevels: NEUTRAL_FIGURE_LEVELS,
          })
          const requests = resolveCoreRequests(intent)
          expect(requests).toHaveLength(1)
          const [minMidi, maxMidi] = PROFILE_WINDOWS[profileId][register]
          expect(requests[0]).toMatchObject({
            register,
            registerWindow: { minMidi, maxMidi },
          })
        })
      }
    }
  })

  // @test-link [[service_generation_request_resolution]]
  describe('resolveCoreRequests: Varying register', () => {
    it('resolves 3 requests in Low, Middle, High order, none unresolved', () => {
      const intent = createGenerationIntent({
        requestId: makeRequestId('request-varying'),
        seed: makeSeed(1),
        controls: controlsFor('bb-tenor', 'Varying'),
        figureLevels: NEUTRAL_FIGURE_LEVELS,
      })
      const requests = resolveCoreRequests(intent)
      expect(requests).toHaveLength(3)
      expect(requests.map((request) => request.register)).toEqual(['Low', 'Middle', 'High'])
      for (const request of requests) {
        expect(['Low', 'Middle', 'High']).toContain(request.register)
      }
    })
  })

  // @test-link [[rule_instrument_profile_range]]
  describe('selectVaryingRegister', () => {
    const intent = createGenerationIntent({
      requestId: makeRequestId('request-select'),
      seed: makeSeed(7),
      controls: controlsFor('bb-tenor', 'Varying'),
      figureLevels: NEUTRAL_FIGURE_LEVELS,
    })

    const ALL: readonly RegisterId[] = ['Low', 'Middle', 'High']
    const nonEmptySubsets: readonly (readonly RegisterId[])[] = [
      ['Low'],
      ['Middle'],
      ['High'],
      ['Low', 'Middle'],
      ['Low', 'High'],
      ['Middle', 'High'],
      ['Low', 'Middle', 'High'],
    ]

    it.each(nonEmptySubsets.map((subset) => [subset] as const))(
      'chooses a member of the subset %j',
      (subset) => {
        const chosen = selectVaryingRegister(intent, subset)
        expect(subset).toContain(chosen)
      },
    )

    it('is deterministic for a given seed', () => {
      const first = selectVaryingRegister(intent, ALL)
      const second = selectVaryingRegister(intent, ALL)
      expect(second).toBe(first)
    })

    it('is seed sensitive: some seed changes the pick for the full subset', () => {
      const seeds: readonly Seed[] = [
        makeSeed(1),
        makeSeed(2),
        makeSeed(3),
        makeSeed(4),
        makeSeed(5),
        makeSeed(6),
      ]
      const picks = seeds.map((seed) => {
        const seededIntent = createGenerationIntent({
          requestId: makeRequestId('request-seed-sweep'),
          seed,
          controls: controlsFor('bb-tenor', 'Varying'),
          figureLevels: NEUTRAL_FIGURE_LEVELS,
        })
        return selectVaryingRegister(seededIntent, ALL)
      })
      expect(new Set(picks).size).toBeGreaterThan(1)
    })

    it('falls back to the lowest canonical index on a key collision with an injected constant key', () => {
      const constantKey = () => 42
      const chosen = selectVaryingRegister(intent, ['High', 'Low', 'Middle'], constantKey)
      expect(chosen).toBe('Low')
    })

    it('throws on an empty successful set', () => {
      expect(() => selectVaryingRegister(intent, [])).toThrow(RequestResolutionError)
    })

    it('throws on a register not in the intent candidates', () => {
      expect(() =>
        selectVaryingRegister(intent, ['Low', 'Unknown' as unknown as RegisterId]),
      ).toThrow(RequestResolutionError)
    })

    it('throws on a duplicated register', () => {
      expect(() => selectVaryingRegister(intent, ['Low', 'Low'])).toThrow(RequestResolutionError)
    })
  })
})
