import { describe, expect, it } from 'vitest'

import {
  createGenerationSession,
  SessionUsageError,
  type SessionOperation,
  type SessionProfileSwitchDecision,
} from '@/composables/use-generation-session'
import { makeRequestId } from '@/domain/generation/generation-request'
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

/** Intent: a profile-switch policy stub no test in a given file exercises retains by default. */
const RETAIN: SessionProfileSwitchDecision = { kind: 'retain' }

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
        evaluateProfileSwitch: () => RETAIN,
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
        evaluateProfileSwitch: () => RETAIN,
      })

      await expect(session.actions.generate()).resolves.toBe(true)
      expect(session.state.result).toEqual({ id: 7 })
      expect(session.state.notationError?.message).toBe('engrave failed')
      expect(session.state.failedNotationMode).toBe('B-flat tenor')

      await expect(session.actions.retryNotation()).resolves.toBe(true)
      expect(session.state.result).toEqual({ id: 7 })
      expect(session.state.notationError).toBeNull()
      expect(session.state.failedNotationMode).toBeNull()
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
        evaluateProfileSwitch: () => RETAIN,
      })

      await expect(session.actions.generate()).resolves.toBe(true)
      expect(session.state.result).toEqual({ id: 1 })
      expect(session.state.notationError).toBeNull()

      await expect(session.actions.regenerate()).resolves.toBe(false)
      expect(session.state.result).toEqual({ id: 1 })
      expect(session.state.generationError?.message).toBe('generation boom')
      expect(session.state.notationError).toBeNull()
      expect(session.state.failedNotationMode).toBeNull()
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
        evaluateProfileSwitch: () => RETAIN,
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
        evaluateProfileSwitch: () => RETAIN,
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
        evaluateProfileSwitch: () => RETAIN,
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
        evaluateProfileSwitch: () => RETAIN,
      })

      await expect(session.actions.selectInstrumentProfile('eb-alto')).resolves.toBe('applied')
      expect(session.state.controls.instrumentProfileId).toBe('eb-alto')
      expect(session.state.result).toBeNull()
    })

    it('retains the phrase, redraws the current mode, and consumes a seed but no request id', async () => {
      const tracked = trackedProviders()
      const notateCalls: { readonly result: StubResult; readonly mode: string }[] = []
      const session = createGenerationSession<StubResult>({
        providers: tracked.providers,
        generate: async () => ({ id: 1 }),
        notate: async (result, mode) => {
          notateCalls.push({ result, mode })
        },
        evaluateProfileSwitch: () => RETAIN,
      })

      await session.actions.generate()
      const countsAfterGenerate = tracked.counts()
      notateCalls.length = 0

      const outcome = await session.actions.selectInstrumentProfile('eb-alto')

      expect(outcome).toBe('retained')
      expect(session.state.controls.instrumentProfileId).toBe('eb-alto')
      expect(session.state.result).toEqual({ id: 1 })
      expect(notateCalls).toEqual([{ result: { id: 1 }, mode: 'B-flat tenor' }])
      expect(tracked.counts()).toEqual({
        id: countsAfterGenerate.id,
        seed: countsAfterGenerate.seed + 1,
      })
    })

    it('regenerates with the decision seed and the retained (plus switched) controls', async () => {
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
        evaluateProfileSwitch: (_result, _nextControls, freshSeed) => ({
          kind: 'regenerate',
          seed: freshSeed,
        }),
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
        evaluateProfileSwitch: () => ({ kind: 'regenerate', seed: makeSeed(999) }),
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
        evaluateProfileSwitch: () => ({ kind: 'regenerate', seed: makeSeed(999) }),
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
      expect(session.state.failedNotationMode).toBeNull()
      expect(session.state.controls.instrumentProfileId).toBe('eb-alto')
    })

    it('retains the phrase under an unsupported rhythm setting when the policy itself decides to retain', async () => {
      const { providers } = trackedProviders()
      let generateCalls = 0
      const notateCalls: { readonly result: StubResult; readonly mode: string }[] = []
      const session = createGenerationSession<StubResult>({
        providers,
        generate: async () => {
          generateCalls += 1
          return { id: generateCalls }
        },
        notate: async (result, mode) => {
          notateCalls.push({ result, mode })
        },
        evaluateProfileSwitch: () => RETAIN,
      })
      await session.actions.generate()
      expect(generateCalls).toBe(1)
      // Quarter + Sparse + Active displacement is a pinned unsupported rhythm combination,
      // set only after the first generation succeeds so it does not block that call too.
      expect(session.actions.setControl('syncopation', 'Active displacement')).toBe(true)
      notateCalls.length = 0

      const outcome = await session.actions.selectInstrumentProfile('eb-alto')

      expect(outcome).toBe('retained')
      expect(generateCalls).toBe(1)
      expect(session.state.result).toEqual({ id: 1 })
      expect(notateCalls).toEqual([{ result: { id: 1 }, mode: 'B-flat tenor' }])
      expect(session.state.controls.instrumentProfileId).toBe('eb-alto')
    })
  })

  describe('setControl usage contract', () => {
    it('throws a typed SessionUsageError for instrumentProfileId, directing callers to selectInstrumentProfile', () => {
      const { providers } = trackedProviders()
      const session = createGenerationSession<StubResult>({
        providers,
        generate: async () => ({ id: 1 }),
        notate: async () => undefined,
        evaluateProfileSwitch: () => RETAIN,
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
        evaluateProfileSwitch: () => RETAIN,
      })

      expect(
        session.actions.reportNotationFailure(new Error('resize redraw failed'), 'Concert'),
      ).toBe(false)
      expect(session.actions.reportNotationRecovered('Concert')).toBe(false)
    })

    it('refuse while an operation is in progress, even with a result present', async () => {
      const { providers } = trackedProviders()
      const deferred = createDeferred<StubResult>()
      const session = createGenerationSession<StubResult>({
        providers,
        generate: () => deferred.promise,
        notate: async () => undefined,
        evaluateProfileSwitch: () => RETAIN,
      })

      const pending = session.actions.generate()
      expect(
        session.actions.reportNotationFailure(new Error('resize redraw failed'), 'Concert'),
      ).toBe(false)
      deferred.resolve({ id: 1 })
      await pending
    })

    // @test-link [[service_workspace_session_flow]]
    it('records the reported mode (not presentation.notationMode) on failure, and commits it on recovery (D35)', async () => {
      const { providers } = trackedProviders()
      const session = createGenerationSession<StubResult>({
        providers,
        generate: async () => ({ id: 1 }),
        notate: async () => undefined,
        evaluateProfileSwitch: () => RETAIN,
      })

      await session.actions.generate()
      expect(session.state.presentation.notationMode).toBe('B-flat tenor')
      expect(session.state.resultEngraved).toBe(true)

      expect(
        session.actions.reportNotationFailure(new Error('resize redraw failed'), 'Concert'),
      ).toBe(true)
      expect(session.state.notationError?.message).toBe('resize redraw failed')
      expect(session.state.failedNotationMode).toBe('Concert')
      expect(session.state.presentation.notationMode).toBe('B-flat tenor')
      expect(session.state.resultEngraved).toBe(false)

      expect(session.actions.reportNotationRecovered('Concert')).toBe(true)
      expect(session.state.presentation.notationMode).toBe('Concert')
      expect(session.state.notationError).toBeNull()
      expect(session.state.failedNotationMode).toBeNull()
      expect(session.state.resultEngraved).toBe(true)
    })

    // @test-link [[service_workspace_session_flow]]
    it('records the reported mode on each repeated out-of-band failure, never presentation.notationMode (D35)', async () => {
      const { providers } = trackedProviders()
      const session = createGenerationSession<StubResult>({
        providers,
        generate: async () => ({ id: 1 }),
        notate: async () => undefined,
        evaluateProfileSwitch: () => RETAIN,
      })

      await session.actions.generate()

      expect(session.actions.reportNotationFailure(new Error('first'), 'Concert')).toBe(true)
      expect(session.state.notationError?.message).toBe('first')
      expect(session.state.failedNotationMode).toBe('Concert')
      expect(session.state.presentation.notationMode).toBe('B-flat tenor')

      expect(session.actions.reportNotationFailure(new Error('second'), 'E-flat alto')).toBe(true)
      expect(session.state.notationError?.message).toBe('second')
      expect(session.state.failedNotationMode).toBe('E-flat alto')
      expect(session.state.presentation.notationMode).toBe('B-flat tenor')
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
        evaluateProfileSwitch: () => RETAIN,
      })

      const pending = session.actions.generate()
      expect(session.actions.setTheme('Dark')).toBe(true)
      expect(session.state.presentation).toEqual({ theme: 'Dark', notationMode: 'B-flat tenor' })
      expect(session.state.operation).toBe('generating')
      expect(session.state.result).toBeNull()
      expect(session.state.controls.instrumentProfileId).toBe('bb-tenor')

      deferred.resolve({ id: 1 })
      await expect(pending).resolves.toBe(true)
      expect(session.state.presentation.theme).toBe('Dark')
    })
  })
})
