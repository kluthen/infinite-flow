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
      evaluateProfileSwitch: () => ({ kind: 'retain' }),
    })

    expect(calls).toBe(0)
    expect(session.state.controls.tempo).toBe(90)
    expect(session.state.presentation).toEqual({ theme: 'System', notationMode: 'B-flat tenor' })
    expect(isReadonly(session.state)).toBe(true)
  })

  it('suppresses configuration and does not consume providers for concurrent generation actions', async () => {
    const deferred = createDeferred<string>()
    const tracked = trackedProviders()
    const session = createGenerationSession({
      providers: tracked.providers,
      generate: () => deferred.promise,
      notate: async () => undefined,
      evaluateProfileSwitch: () => ({ kind: 'retain' }),
    })
    const pending = session.actions.generate()

    expect(session.state.operation).toBe('generating')
    expect(tracked.counts()).toEqual({ id: 1, seed: 1 })
    expect(session.actions.setControl('tempo', 100)).toBe(false)
    expect(session.actions.selectMusicalProfile('Jazz')).toBe(false)
    expect(session.actions.setTheme('Dark')).toBe(true)
    await expect(session.actions.setNotationMode('Concert')).resolves.toBe(true)
    await expect(session.actions.generate()).resolves.toBe(false)
    await expect(session.actions.regenerate()).resolves.toBe(false)
    expect(tracked.counts()).toEqual({ id: 1, seed: 1 })

    deferred.resolve('first')
    await expect(pending).resolves.toBe(true)
    expect(session.state.result).toBe('first')
    expect(session.state.operation).toBe('idle')
    expect(session.state.presentation).toEqual({ theme: 'Dark', notationMode: 'Concert' })
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
      evaluateProfileSwitch: () => ({ kind: 'retain' }),
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
      evaluateProfileSwitch: () => ({ kind: 'retain' }),
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
      evaluateProfileSwitch: () => ({ kind: 'retain' }),
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
      evaluateProfileSwitch: () => ({ kind: 'retain' }),
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
      evaluateProfileSwitch: () => ({ kind: 'retain' }),
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
    const notationCalls: { readonly result: string; readonly mode: string }[] = []
    let notationAttempts = 0
    const session = createGenerationSession({
      providers: tracked.providers,
      generate: async () => 'phrase',
      notate: async (result, mode) => {
        notationCalls.push({ result, mode })
        notationAttempts += 1
        // Fails the post-generation automatic engrave (attempt 1) and the explicit retry below
        // (attempt 2); succeeds only on the subsequent retryNotation (attempt 3).
        if (notationAttempts <= 2) throw new Error('notation failure')
      },
      evaluateProfileSwitch: () => ({ kind: 'retain' }),
    })

    await expect(session.actions.generate()).resolves.toBe(true)
    const generationCounts = tracked.counts()
    expect(session.state.result).toBe('phrase')
    expect(session.state.presentation.notationMode).toBe('B-flat tenor')
    expect(session.state.notationError?.message).toBe('notation failure')
    expect(session.state.failedNotationMode).toBe('B-flat tenor')

    await expect(session.actions.setNotationMode('Concert')).resolves.toBe(false)
    expect(session.state.result).toBe('phrase')
    expect(session.state.presentation.notationMode).toBe('B-flat tenor')
    expect(session.state.notationError?.message).toBe('notation failure')
    expect(session.state.failedNotationMode).toBe('Concert')

    await expect(session.actions.retryNotation()).resolves.toBe(true)
    expect(session.state.presentation.notationMode).toBe('Concert')
    expect(session.state.notationError).toBeNull()
    expect(session.state.failedNotationMode).toBeNull()
    expect(notationCalls).toEqual([
      { result: 'phrase', mode: 'B-flat tenor' },
      { result: 'phrase', mode: 'Concert' },
      { result: 'phrase', mode: 'Concert' },
    ])
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
      evaluateProfileSwitch: () => ({ kind: 'retain' }),
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
      generate: () => generation.promise,
      // The post-generation automatic engrave (call 1) resolves immediately; the explicit
      // setNotationMode call below (call 2) stays pending on the shared deferred.
      notate: () => {
        notateCallIndex += 1
        return notateCallIndex === 1 ? Promise.resolve() : notation.promise
      },
      evaluateProfileSwitch: () => ({ kind: 'retain' }),
    })

    const generating = session.actions.generate()
    expect(session.state.operation).toBe('generating')
    await expect(session.actions.setNotationMode('Concert')).resolves.toBe(true)
    expect(session.actions.setTheme('Light')).toBe(true)
    generation.resolve('phrase')
    await expect(generating).resolves.toBe(true)
    expect(session.state.operation).toBe('idle')
    expect(session.state.result).toBe('phrase')
    expect(session.state.presentation).toEqual({ theme: 'Light', notationMode: 'Concert' })

    const notating = session.actions.setNotationMode('E-flat alto')
    expect(session.state.operation).toBe('notating')
    await expect(session.actions.generate()).resolves.toBe(false)
    await expect(session.actions.regenerate()).resolves.toBe(false)
    expect(session.actions.setControl('tempo', 100)).toBe(false)
    expect(session.actions.setTheme('Dark')).toBe(true)
    expect(tracked.counts()).toEqual({ id: 1, seed: 1 })
    notation.resolve()
    await expect(notating).resolves.toBe(true)
    expect(session.state.presentation).toEqual({ theme: 'Dark', notationMode: 'E-flat alto' })
  })
})
