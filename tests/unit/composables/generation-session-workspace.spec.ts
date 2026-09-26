import { describe, expect, it } from 'vitest'

import {
  createGenerationSession,
  SessionUsageError,
  type SessionOperation,
} from '@/composables/use-generation-session'
import { PITCH_CLASSES } from '@/domain/controls/generation-controls'
import { makeRequestId } from '@/domain/generation/generation-request'
import { ADOPTED_INSTRUMENT_PROFILES } from '@/domain/profile/instrument-profiles'
import { makeSeed } from '@/domain/random/seed'

interface StubResult {
  readonly id: number
}

/** Intent: build fresh, call-counted request-id/seed providers so a test can prove provider consumption. */
function trackedProviders() {
  let id = 0
  let seed = 0
  return {
    providers: {
      nextRequestId: () => makeRequestId(`workspace-session-${++id}`),
      nextSeed: () => makeSeed(++seed),
    },
    counts: () => ({ id, seed }),
  }
}

function createDeferred<T>() {
  let resolve: (value: T) => void = () => undefined
  let reject: (reason?: unknown) => void = () => undefined
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

// @test-link [[service_workspace_session_flow]]
// @test-link [[user_story_controlled_phrase_generation]]
describe('generation session workspace flow', () => {
  describe('post-generation notation', () => {
    it('observes generating -> notating -> idle across one successful generate-then-engrave operation', async () => {
      const { providers } = trackedProviders()
      const operations: SessionOperation[] = []
      const session = createGenerationSession<StubResult>({
        providers,
        generate: async () => {
          operations.push(session.state.operation)
          return { id: 1 }
        },
        notate: async () => {
          operations.push(session.state.operation)
        },
      })

      expect(session.state.operation).toBe('idle')
      const pending = session.actions.generate()
      expect(session.state.operation).toBe('generating')
      await expect(pending).resolves.toBe(true)

      expect(operations).toEqual(['generating', 'notating'])
      expect(session.state.operation).toBe('idle')
      expect(session.state.result).toEqual({ id: 1 })
    })

    it('keeps the freshly generated result when the post-generation engrave fails, and retryNotation recovers it', async () => {
      const { providers } = trackedProviders()
      let notateAttempts = 0
      const session = createGenerationSession<StubResult>({
        providers,
        generate: async () => ({ id: 7 }),
        notate: async () => {
          notateAttempts += 1
          if (notateAttempts === 1) throw new Error('engrave failed')
        },
      })

      await expect(session.actions.generate()).resolves.toBe(true)
      expect(session.state.result).toEqual({ id: 7 })
      expect(session.state.notationError?.message).toBe('engrave failed')

      await expect(session.actions.retryNotation()).resolves.toBe(true)
      expect(session.state.result).toEqual({ id: 7 })
      expect(session.state.notationError).toBeNull()
    })

    it('keeps the prior result and prior notation state untouched when a later generation attempt fails', async () => {
      const { providers } = trackedProviders()
      let call = 0
      const session = createGenerationSession<StubResult>({
        providers,
        generate: async () => {
          call += 1
          if (call === 1) return { id: 1 }
          throw new Error('generation boom')
        },
        notate: async () => undefined,
      })

      await expect(session.actions.generate()).resolves.toBe(true)
      expect(session.state.result).toEqual({ id: 1 })
      expect(session.state.notationError).toBeNull()

      await expect(session.actions.regenerate()).resolves.toBe(false)
      expect(session.state.result).toEqual({ id: 1 })
      expect(session.state.generationError?.message).toBe('generation boom')
      expect(session.state.notationError).toBeNull()
    })
  })

  // @test-link [[rule_unsupported_rhythm_settings_block_generation]]
  describe('unsupported rhythm settings block generation', () => {
    it('refuses generate/regenerate without consuming providers, leaves controls freely settable, and recovers once a supported value is selected', async () => {
      const tracked = trackedProviders()
      let generateCalls = 0
      const session = createGenerationSession<StubResult>({
        providers: tracked.providers,
        generate: async () => {
          generateCalls += 1
          return { id: generateCalls }
        },
        notate: async () => undefined,
      })

      // Quarter + Sparse + Active displacement is a pinned unsupported rhythm combination; the
      // default controls are already Quarter/Sparse, so only syncopation needs to change.
      expect(session.actions.setControl('syncopation', 'Active displacement')).toBe(true)

      await expect(session.actions.generate()).resolves.toBe(false)
      await expect(session.actions.regenerate()).resolves.toBe(false)
      expect(generateCalls).toBe(0)
      expect(tracked.counts()).toEqual({ id: 0, seed: 0 })
      expect(session.state.controls.syncopation).toBe('Active displacement')
      expect(session.state.operation).toBe('idle')

      expect(session.actions.setControl('syncopation', 'Occasional offbeats')).toBe(true)
      await expect(session.actions.generate()).resolves.toBe(true)
      expect(generateCalls).toBe(1)
      expect(tracked.counts()).toEqual({ id: 1, seed: 1 })
    })
  })

  // @test-link [[rule_profile_switch_validates_phrase]]
  describe('selectInstrumentProfile outcomes', () => {
    it('rejects while another operation is in progress', async () => {
      const { providers } = trackedProviders()
      const deferred = createDeferred<StubResult>()
      const session = createGenerationSession<StubResult>({
        providers,
        generate: () => deferred.promise,
        notate: async () => undefined,
      })

      const pending = session.actions.generate()
      await expect(session.actions.selectInstrumentProfile('eb-alto')).resolves.toBe('rejected')
      expect(session.state.controls.instrumentProfileId).toBe('bb-tenor')

      deferred.resolve({ id: 1 })
      await pending
    })

    it('resolves unchanged and touches nothing for a reselection of the current profile', async () => {
      const { providers } = trackedProviders()
      const session = createGenerationSession<StubResult>({
        providers,
        generate: async () => ({ id: 1 }),
        notate: async () => undefined,
      })

      await expect(session.actions.selectInstrumentProfile('bb-tenor')).resolves.toBe('unchanged')
      expect(session.state.controls.instrumentProfileId).toBe('bb-tenor')
      expect(session.state.result).toBeNull()
    })

    it('applies the control alone when there is no prior result', async () => {
      const { providers } = trackedProviders()
      const session = createGenerationSession<StubResult>({
        providers,
        generate: async () => ({ id: 1 }),
        notate: async () => undefined,
      })

      await expect(session.actions.selectInstrumentProfile('eb-alto')).resolves.toBe('applied')
      expect(session.state.controls.instrumentProfileId).toBe('eb-alto')
      expect(session.state.result).toBeNull()
    })

    // @test-link [[module_phrase_generation_profile_policy]]
    it('regenerates with a fresh request id and seed, and the switched (plus retained) controls, when there is a prior result', async () => {
      const tracked = trackedProviders()
      const intents: {
        readonly seed: number
        readonly instrumentProfileId: string
        readonly tempo: number
      }[] = []
      const session = createGenerationSession<StubResult>({
        providers: tracked.providers,
        generate: async (intent) => {
          intents.push({
            seed: intent.seed,
            instrumentProfileId: intent.controls.instrumentProfileId,
            tempo: intent.controls.tempo,
          })
          return { id: intent.seed }
        },
        notate: async () => undefined,
      })
      expect(session.actions.setControl('tempo', 120)).toBe(true)

      await session.actions.generate()
      const countsAfterGenerate = tracked.counts()
      const outcome = await session.actions.selectInstrumentProfile('eb-alto')

      expect(outcome).toBe('regenerated')
      expect(session.state.controls.instrumentProfileId).toBe('eb-alto')
      expect(session.state.controls.tempo).toBe(120)
      expect(tracked.counts()).toEqual({
        id: countsAfterGenerate.id + 1,
        seed: countsAfterGenerate.seed + 1,
      })
      const regenerationIntent = intents[intents.length - 1]
      expect(regenerationIntent?.instrumentProfileId).toBe('eb-alto')
      expect(regenerationIntent?.tempo).toBe(120)
      expect(regenerationIntent?.seed).toBe(countsAfterGenerate.seed + 1)
    })

    it('keeps the prior result when the regeneration itself fails', async () => {
      const { providers } = trackedProviders()
      let call = 0
      const session = createGenerationSession<StubResult>({
        providers,
        generate: async () => {
          call += 1
          if (call === 1) return { id: 1 }
          throw new Error('regeneration boom')
        },
        notate: async () => undefined,
      })

      await session.actions.generate()
      const outcome = await session.actions.selectInstrumentProfile('eb-alto')

      expect(outcome).toBe('regeneration_failed')
      expect(session.state.result).toEqual({ id: 1 })
      expect(session.state.controls.instrumentProfileId).toBe('eb-alto')
      expect(session.state.generationError?.message).toBe('regeneration boom')
    })

    it('applies the switch and clears the prior phrase without starting generation when the switched controls are an unsupported rhythm setting', async () => {
      const { providers } = trackedProviders()
      let generateCalls = 0
      const session = createGenerationSession<StubResult>({
        providers,
        generate: async () => {
          generateCalls += 1
          return { id: generateCalls }
        },
        notate: async () => undefined,
      })
      await session.actions.generate()
      expect(generateCalls).toBe(1)
      // Quarter + Sparse + Active displacement is a pinned unsupported rhythm combination,
      // set only after the first generation succeeds so it does not block that call too.
      expect(session.actions.setControl('syncopation', 'Active displacement')).toBe(true)

      const outcome = await session.actions.selectInstrumentProfile('eb-alto')

      expect(outcome).toBe('cleared_unsupported_rhythm')
      expect(generateCalls).toBe(1)
      expect(session.state.result).toBeNull()
      expect(session.state.latestIntent).toBeNull()
      expect(session.state.generationError).toBeNull()
      expect(session.state.notationError).toBeNull()
      expect(session.state.controls.instrumentProfileId).toBe('eb-alto')
    })
  })

  /**
   * Every ordered pair of the three first-release profiles (6 switches): a profile switch with a
   * shown phrase always regenerates, unconditionally, regardless of any transposition relationship
   * between the two profiles -- this table drives every switch through `writtenToConcertTonalCenter`
   * itself (chromatic transposition read straight off `ADOPTED_INSTRUMENT_PROFILES`) rather than a
   * pinned literal, so it also proves the switch policy never compares transpositions: it always
   * regenerates.
   */
  // @test-link [[rule_profile_switch_validates_phrase]]
  describe('selectInstrumentProfile: every ordered profile-pair switch', () => {
    function chromaticOf(id: string): number {
      const profile = ADOPTED_INSTRUMENT_PROFILES.find((candidate) => candidate.id === id)
      if (profile === undefined) throw new Error(`no adopted profile for ${id}`)
      return profile.transposition.chromatic
    }

    function expectedConcertTonalCenter(written: string, instrumentProfileId: string): string {
      const writtenIndex = PITCH_CLASSES.indexOf(written as (typeof PITCH_CLASSES)[number])
      const concertIndex = (((writtenIndex - chromaticOf(instrumentProfileId)) % 12) + 12) % 12
      return PITCH_CLASSES[concertIndex]!
    }

    const PROFILE_IDS = ADOPTED_INSTRUMENT_PROFILES.map((profile) => profile.id)
    const ORDERED_PAIRS = PROFILE_IDS.flatMap((from) =>
      PROFILE_IDS.filter((to) => to !== from).map((to) => ({ from, to })),
    )

    it.each(ORDERED_PAIRS)(
      'switching from $from to $to with a shown phrase keeps the written tonal center, recomputes the concert tonal center, and regenerates with a fresh seed',
      async ({ from, to }) => {
        const tracked = trackedProviders()
        const intents: { readonly seed: number; readonly tonalCenter: string }[] = []
        const session = createGenerationSession<StubResult>({
          providers: tracked.providers,
          generate: async (intent) => {
            intents.push({ seed: intent.seed, tonalCenter: intent.controls.tonalCenter })
            return { id: intent.seed }
          },
          notate: async () => undefined,
        })

        // Establish the starting profile (a no-op result if it's already the default 'bb-tenor').
        await session.actions.selectInstrumentProfile(from as never)
        expect(session.state.controls.instrumentProfileId).toBe(from)

        await session.actions.generate()
        const writtenBefore = session.state.controls.tonalCenter
        const seedBefore = intents[intents.length - 1]?.seed

        const outcome = await session.actions.selectInstrumentProfile(to as never)

        expect(outcome).toBe('regenerated')
        expect(session.state.controls.instrumentProfileId).toBe(to)
        // The written tonal center (what the player selected) never changes across a profile switch.
        expect(session.state.controls.tonalCenter).toBe(writtenBefore)

        const regenerationIntent = intents[intents.length - 1]
        expect(regenerationIntent).toBeDefined()
        expect(regenerationIntent?.seed).not.toBe(seedBefore)
        expect(regenerationIntent?.tonalCenter).toBe(expectedConcertTonalCenter(writtenBefore, to))
      },
    )
  })

  describe('setControl usage contract', () => {
    it('throws a typed SessionUsageError for instrumentProfileId, directing callers to selectInstrumentProfile', () => {
      const { providers } = trackedProviders()
      const session = createGenerationSession<StubResult>({
        providers,
        generate: async () => ({ id: 1 }),
        notate: async () => undefined,
      })

      expect(() => session.actions.setControl('instrumentProfileId', 'eb-alto')).toThrow(
        SessionUsageError,
      )
      expect(session.state.controls.instrumentProfileId).toBe('bb-tenor')
    })
  })

  // @test-link [[module_notation_layout_preflight]]
  describe('reportNotationFailure / reportNotationRecovered', () => {
    it('refuse when idle with no result yet', () => {
      const { providers } = trackedProviders()
      const session = createGenerationSession<StubResult>({
        providers,
        generate: async () => ({ id: 1 }),
        notate: async () => undefined,
      })

      expect(session.actions.reportNotationFailure(new Error('resize redraw failed'))).toBe(false)
      expect(session.actions.reportNotationRecovered()).toBe(false)
    })

    it('refuse while an operation is in progress, even with a result present', async () => {
      const { providers } = trackedProviders()
      const deferred = createDeferred<StubResult>()
      const session = createGenerationSession<StubResult>({
        providers,
        generate: () => deferred.promise,
        notate: async () => undefined,
      })

      const pending = session.actions.generate()
      expect(session.actions.reportNotationFailure(new Error('resize redraw failed'))).toBe(false)
      deferred.resolve({ id: 1 })
      await pending
    })

    // @test-link [[service_workspace_session_flow]]
    it('sets notationError and clears resultEngraved on failure, then clears notationError and restores resultEngraved on recovery (D34)', async () => {
      const { providers } = trackedProviders()
      const session = createGenerationSession<StubResult>({
        providers,
        generate: async () => ({ id: 1 }),
        notate: async () => undefined,
      })

      await session.actions.generate()
      expect(session.state.resultEngraved).toBe(true)

      expect(session.actions.reportNotationFailure(new Error('resize redraw failed'))).toBe(true)
      expect(session.state.notationError?.message).toBe('resize redraw failed')
      expect(session.state.resultEngraved).toBe(false)

      expect(session.actions.reportNotationRecovered()).toBe(true)
      expect(session.state.notationError).toBeNull()
      expect(session.state.resultEngraved).toBe(true)
    })

    it('replaces the notation error message on each repeated out-of-band failure', async () => {
      const { providers } = trackedProviders()
      const session = createGenerationSession<StubResult>({
        providers,
        generate: async () => ({ id: 1 }),
        notate: async () => undefined,
      })

      await session.actions.generate()

      expect(session.actions.reportNotationFailure(new Error('first'))).toBe(true)
      expect(session.state.notationError?.message).toBe('first')

      expect(session.actions.reportNotationFailure(new Error('second'))).toBe(true)
      expect(session.state.notationError?.message).toBe('second')
    })
  })

  // @test-link [[rule_presentation_preference_preserves_phrase]]
  describe('theme during an operation', () => {
    it('changes only presentation.theme while a generation operation is in progress', async () => {
      const { providers } = trackedProviders()
      const deferred = createDeferred<StubResult>()
      const session = createGenerationSession<StubResult>({
        providers,
        generate: () => deferred.promise,
        notate: async () => undefined,
      })

      const pending = session.actions.generate()
      expect(session.actions.setTheme('Dark')).toBe(true)
      expect(session.state.presentation).toEqual({ theme: 'Dark' })
      expect(session.state.operation).toBe('generating')
      expect(session.state.result).toBeNull()
      expect(session.state.controls.instrumentProfileId).toBe('bb-tenor')

      deferred.resolve({ id: 1 })
      await expect(pending).resolves.toBe(true)
      expect(session.state.presentation.theme).toBe('Dark')
    })
  })
})
