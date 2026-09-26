import { isReadonly } from 'vue'
import { describe, expect, it } from 'vitest'

import { createGenerationSession } from '@/composables/use-generation-session'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeSeed } from '@/domain/random/seed'

function createDeferred<T>() {
  let resolve: (value: T) => void = () => undefined
  let reject: (reason?: unknown) => void = () => undefined
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

function trackedProviders() {
  let id = 0
  let seed = 0
  return {
    providers: {
      nextRequestId: () => makeRequestId(`request-${++id}`),
      nextSeed: () => makeSeed(++seed),
    },
    counts: () => ({ id, seed }),
  }
}

// @test-link [[service_workspace_session_flow]]
// @test-link [[user_story_controlled_phrase_generation]]
describe('createGenerationSession', () => {
  it('creates isolated readonly state and does not generate implicitly', () => {
    let calls = 0
    const { providers } = trackedProviders()
    const session = createGenerationSession({
      providers,
      generate: async () => ++calls,
      notate: async () => undefined,
    })

    expect(calls).toBe(0)
    expect(session.state.controls.tempo).toBe(90)
    expect(session.state.presentation).toEqual({ theme: 'System' })
    expect(isReadonly(session.state)).toBe(true)
  })

  it('suppresses configuration and does not consume providers for concurrent generation actions', async () => {
    const deferred = createDeferred<string>()
    const tracked = trackedProviders()
    const session = createGenerationSession({
      providers: tracked.providers,
      generate: () => deferred.promise,
      notate: async () => undefined,
    })
    const pending = session.actions.generate()

    expect(session.state.operation).toBe('generating')
    expect(tracked.counts()).toEqual({ id: 1, seed: 1 })
    expect(session.actions.setControl('tempo', 100)).toBe(false)
    expect(session.actions.selectMusicalProfile('Jazz')).toBe(false)
    expect(session.actions.setTheme('Dark')).toBe(true)
    await expect(session.actions.generate()).resolves.toBe(false)
    await expect(session.actions.regenerate()).resolves.toBe(false)
    expect(tracked.counts()).toEqual({ id: 1, seed: 1 })

    deferred.resolve('first')
    await expect(pending).resolves.toBe(true)
    expect(session.state.result).toBe('first')
    expect(session.state.operation).toBe('idle')
    expect(session.state.presentation).toEqual({ theme: 'Dark' })
  })

  // @test-link [[module_generation_request_construction]]
  it('retries generation with a fresh request id and seed, not the failed intent unchanged (D30)', async () => {
    const tracked = trackedProviders()
    const intents: { readonly id: string; readonly seed: number }[] = []
    let attempts = 0
    const session = createGenerationSession({
      providers: tracked.providers,
      generate: async (intent) => {
        intents.push({ id: intent.requestId, seed: intent.seed })
        attempts += 1
        if (attempts === 1) throw new Error('first failure')
        return 'result'
      },
      notate: async () => undefined,
    })

    await expect(session.actions.generate()).resolves.toBe(false)
    expect(session.state.result).toBeNull()
    expect(session.state.generationError?.message).toBe('first failure')
    expect(tracked.counts()).toEqual({ id: 1, seed: 1 })
    await expect(session.actions.retryGeneration()).resolves.toBe(true)
    expect(intents).toEqual([
      { id: 'request-1', seed: 1 },
      { id: 'request-2', seed: 2 },
    ])
    expect(tracked.counts()).toEqual({ id: 2, seed: 2 })
  })

  // @test-link [[module_generation_request_construction]]
  it('retries generation from the current controls/profile, picking up an edit made after the failure (D30)', async () => {
    const tracked = trackedProviders()
    const intents: { readonly tempo: number }[] = []
    let attempts = 0
    const session = createGenerationSession({
      providers: tracked.providers,
      generate: async (intent) => {
        intents.push({ tempo: intent.controls.tempo })
        attempts += 1
        if (attempts === 1) throw new Error('first failure')
        return 'result'
      },
      notate: async () => undefined,
    })

    await expect(session.actions.generate()).resolves.toBe(false)
    expect(session.state.generationError).not.toBeNull()
    // Controls remain editable while idle after an error.
    expect(session.actions.setControl('tempo', 130)).toBe(true)
    await expect(session.actions.retryGeneration()).resolves.toBe(true)
    expect(intents).toEqual([{ tempo: 90 }, { tempo: 130 }])
  })

  // @test-link [[rule_unsupported_rhythm_settings_block_generation]]
  it('blocks retry generation while the current controls are an unsupported rhythm setting (D30)', async () => {
    const tracked = trackedProviders()
    let attempts = 0
    const session = createGenerationSession({
      providers: tracked.providers,
      generate: async () => {
        attempts += 1
        if (attempts === 1) throw new Error('first failure')
        return 'result'
      },
      notate: async () => undefined,
    })

    await expect(session.actions.generate()).resolves.toBe(false)
    expect(session.state.generationError).not.toBeNull()
    // Default Neutral rhythm is Quarter/Sparse/Straight; Quarter+Sparse+Active displacement has
    // no legal four-bar plan under any tension arc.
    expect(session.actions.setControl('syncopation', 'Active displacement')).toBe(true)

    await expect(session.actions.retryGeneration()).resolves.toBe(false)
    expect(attempts).toBe(1)
    expect(session.state.generationError).not.toBeNull()
    expect(tracked.counts()).toEqual({ id: 1, seed: 1 })
  })

  it('retains the prior valid result after a later generation failure, retry available without it', async () => {
    const tracked = trackedProviders()
    let attempts = 0
    const session = createGenerationSession({
      providers: tracked.providers,
      generate: async () => {
        attempts += 1
        if (attempts === 2) throw new Error('second failure')
        return `result-${attempts}`
      },
      notate: async () => undefined,
    })

    await expect(session.actions.generate()).resolves.toBe(true)
    expect(session.state.result).toBe('result-1')

    await expect(session.actions.regenerate()).resolves.toBe(false)
    expect(session.state.result).toBe('result-1')
    expect(session.state.generationError?.message).toBe('second failure')

    await expect(session.actions.retryGeneration()).resolves.toBe(true)
    expect(session.state.result).toBe('result-3')
    expect(session.state.generationError).toBeNull()
  })

  // @test-link [[module_generation_request_construction]]
  // @test-link [[module_profile_control_customization]]
  // @test-link [[rule_profile_control_customization]]
  // @test-link [[rule_seeded_phrase_reproduction]]
  it('regenerates from current controls/profile with fresh providers and keeps presentation outside generation', async () => {
    const tracked = trackedProviders()
    const intents: {
      readonly seed: number
      readonly requestId: string
      readonly tempo: number
      readonly profile: string
      readonly custom: boolean
    }[] = []
    const session = createGenerationSession({
      providers: tracked.providers,
      generate: async (intent) => {
        intents.push({
          seed: intent.seed,
          requestId: intent.requestId,
          tempo: intent.controls.tempo,
          profile: intent.musicalProfile.musicalProfile,
          custom: intent.musicalProfile.isCustom,
        })
        return intent.requestId
      },
      notate: async () => undefined,
    })

    await session.actions.generate()
    expect(session.actions.setControl('tempo', 100)).toBe(true)
    expect(session.actions.setControl('register', 'High')).toBe(true)
    expect(session.actions.setTheme('Dark')).toBe(true)
    await session.actions.regenerate()

    expect(intents).toEqual([
      { seed: 1, requestId: 'request-1', tempo: 90, profile: 'Neutral', custom: false },
      { seed: 2, requestId: 'request-2', tempo: 100, profile: 'Neutral', custom: true },
    ])
    expect(session.state.presentation.theme).toBe('Dark')
    expect(tracked.counts()).toEqual({ id: 2, seed: 2 })
  })

  it('coordinates notation success, failure, retry, and result retention without generation providers', async () => {
    const tracked = trackedProviders()
    const notationCalls: { readonly result: string }[] = []
    let notationAttempts = 0
    const session = createGenerationSession({
      providers: tracked.providers,
      generate: async () => 'phrase',
      notate: async (result) => {
        notationCalls.push({ result })
        notationAttempts += 1
        // Fails the post-generation automatic engrave (attempt 1); succeeds on the explicit
        // retryNotation below (attempt 2).
        if (notationAttempts === 1) throw new Error('notation failure')
      },
    })

    await expect(session.actions.generate()).resolves.toBe(true)
    const generationCounts = tracked.counts()
    expect(session.state.result).toBe('phrase')
    expect(session.state.notationError?.message).toBe('notation failure')

    await expect(session.actions.retryNotation()).resolves.toBe(true)
    expect(session.state.notationError).toBeNull()
    expect(notationCalls).toEqual([{ result: 'phrase' }, { result: 'phrase' }])
    expect(tracked.counts()).toEqual(generationCounts)
  })

  it('passes notate the exact result instance generate returned, not a reactive proxy', async () => {
    const tracked = trackedProviders()
    const phrase = { phrase: 'x' }
    const notateCalls: { readonly result: unknown }[] = []
    let notationAttempts = 0
    const session = createGenerationSession({
      providers: tracked.providers,
      generate: async () => phrase,
      notate: async (result) => {
        notateCalls.push({ result })
        notationAttempts += 1
        // The post-generation automatic engrave is attempt 1 and fails; retryNotation is attempt 2.
        if (notationAttempts === 1) throw new Error('notation failure')
      },
    })

    await session.actions.generate()
    expect(session.state.notationError?.message).toBe('notation failure')
    await expect(session.actions.retryNotation()).resolves.toBe(true)

    expect(notateCalls).toHaveLength(2)
    expect(notateCalls[0]?.result).toBe(phrase)
    expect(notateCalls[1]?.result).toBe(phrase)
  })

  // @test-link [[rule_presentation_preference_preserves_phrase]]
  it('locks generation and notation against each other while leaving theme immediate', async () => {
    const generation = createDeferred<string>()
    const notation = createDeferred<void>()
    const tracked = trackedProviders()
    let notateCallIndex = 0
    const session = createGenerationSession({
      providers: tracked.providers,
      // The post-generation automatic engrave (call 1) fails immediately; the explicit
      // retryNotation call below (call 2) stays pending on the shared deferred.
      notate: () => {
        notateCallIndex += 1
        return notateCallIndex === 1
          ? Promise.reject(new Error('engrave failed'))
          : notation.promise
      },
      generate: () => generation.promise,
    })

    const generating = session.actions.generate()
    expect(session.state.operation).toBe('generating')
    expect(session.actions.setTheme('Light')).toBe(true)
    generation.resolve('phrase')
    await expect(generating).resolves.toBe(true)
    expect(session.state.operation).toBe('idle')
    expect(session.state.result).toBe('phrase')
    expect(session.state.notationError?.message).toBe('engrave failed')
    expect(session.state.presentation).toEqual({ theme: 'Light' })

    const notating = session.actions.retryNotation()
    expect(session.state.operation).toBe('notating')
    await expect(session.actions.generate()).resolves.toBe(false)
    await expect(session.actions.regenerate()).resolves.toBe(false)
    expect(session.actions.setControl('tempo', 100)).toBe(false)
    expect(session.actions.setTheme('Dark')).toBe(true)
    expect(tracked.counts()).toEqual({ id: 1, seed: 1 })
    notation.resolve()
    await expect(notating).resolves.toBe(true)
    expect(session.state.notationError).toBeNull()
    expect(session.state.presentation).toEqual({ theme: 'Dark' })
  })

  // @test-link [[service_workspace_session_flow]]
  describe('resultEngraved (D34)', () => {
    it('is false initially, true after a successful engrave, false after a failing one, and true again after a successful redraw', async () => {
      const tracked = trackedProviders()
      let notateAttempts = 0
      const session = createGenerationSession({
        providers: tracked.providers,
        generate: async () => 'phrase',
        notate: async () => {
          notateAttempts += 1
          // The fresh result's own engrave (attempt 1) succeeds; regenerate's own engrave
          // (attempt 2) fails; the explicit retryNotation below (attempt 3) succeeds.
          if (notateAttempts === 2) throw new Error('engrave failed')
        },
      })

      expect(session.state.resultEngraved).toBe(false)

      await expect(session.actions.generate()).resolves.toBe(true)
      expect(session.state.resultEngraved).toBe(true)

      await expect(session.actions.regenerate()).resolves.toBe(true)
      expect(session.state.notationError?.message).toBe('engrave failed')
      expect(session.state.resultEngraved).toBe(false)

      await expect(session.actions.retryNotation()).resolves.toBe(true)
      expect(session.state.resultEngraved).toBe(true)
    })

    it("is false during the fresh result's own engraving step, before notate resolves", async () => {
      const tracked = trackedProviders()
      const generation = createDeferred<string>()
      const notation = createDeferred<void>()
      const session = createGenerationSession({
        providers: tracked.providers,
        generate: () => generation.promise,
        notate: () => notation.promise,
      })

      const pending = session.actions.generate()
      generation.resolve('phrase')
      await generation.promise

      expect(session.state.operation).toBe('notating')
      expect(session.state.result).toBe('phrase')
      expect(session.state.resultEngraved).toBe(false)

      notation.resolve()
      await expect(pending).resolves.toBe(true)
      expect(session.state.resultEngraved).toBe(true)
    })

    it('is left untouched by run() merely starting: a regenerate that then fails to generate keeps it true and retains the prior result', async () => {
      const tracked = trackedProviders()
      const generation = createDeferred<string>()
      let call = 0
      const session = createGenerationSession({
        providers: tracked.providers,
        generate: async () => {
          call += 1
          if (call === 1) return 'first'
          return generation.promise
        },
        notate: async () => undefined,
      })

      await expect(session.actions.generate()).resolves.toBe(true)
      expect(session.state.resultEngraved).toBe(true)

      const pending = session.actions.regenerate()
      expect(session.state.operation).toBe('generating')
      expect(session.state.resultEngraved).toBe(true)

      generation.reject(new Error('regeneration boom'))
      await expect(pending).resolves.toBe(false)
      expect(session.state.generationError?.message).toBe('regeneration boom')
      expect(session.state.result).toBe('first')
      expect(session.state.resultEngraved).toBe(true)
    })

    it('D32 exit (c): a notation failure leaves it false, and a subsequent failed regenerate leaves it false with notationError cleared and generationError set', async () => {
      const tracked = trackedProviders()
      let call = 0
      const session = createGenerationSession({
        providers: tracked.providers,
        generate: async () => {
          call += 1
          if (call === 1) return 'first'
          throw new Error('regeneration boom')
        },
        notate: async () => {
          throw new Error('engrave failed')
        },
      })

      await expect(session.actions.generate()).resolves.toBe(true)
      expect(session.state.notationError?.message).toBe('engrave failed')
      expect(session.state.resultEngraved).toBe(false)

      await expect(session.actions.regenerate()).resolves.toBe(false)
      expect(session.state.notationError).toBeNull()
      expect(session.state.generationError?.message).toBe('regeneration boom')
      expect(session.state.result).toBe('first')
      expect(session.state.resultEngraved).toBe(false)
    })
  })
})
