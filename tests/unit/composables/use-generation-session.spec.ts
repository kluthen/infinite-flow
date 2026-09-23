// @test-link [[service_workspace_session_flow]]
// @test-link [[module_generation_request_construction]]
// @test-link [[module_profile_control_customization]]
// @test-link [[user_story_controlled_phrase_generation]]
// @test-link [[rule_profile_control_customization]]
// @test-link [[rule_seeded_phrase_reproduction]]
// @test-link [[rule_presentation_preference_preserves_phrase]]
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

  it('retries the exact failed immutable generation intent without consuming providers', async () => {
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
      { id: 'request-1', seed: 1 },
    ])
    expect(tracked.counts()).toEqual({ id: 1, seed: 1 })
  })

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
    const notationCalls: { readonly result: string; readonly mode: string }[] = []
    let notationAttempts = 0
    const session = createGenerationSession({
      providers: tracked.providers,
      generate: async () => 'phrase',
      notate: async (result, mode) => {
        notationCalls.push({ result, mode })
        notationAttempts += 1
        if (notationAttempts === 1) throw new Error('notation failure')
      },
    })

    await session.actions.generate()
    const generationCounts = tracked.counts()
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
      { result: 'phrase', mode: 'Concert' },
      { result: 'phrase', mode: 'Concert' },
    ])
    expect(tracked.counts()).toEqual(generationCounts)
  })

  it('locks generation and notation against each other while leaving theme immediate', async () => {
    const generation = createDeferred<string>()
    const notation = createDeferred<void>()
    const tracked = trackedProviders()
    const session = createGenerationSession({
      providers: tracked.providers,
      generate: () => generation.promise,
      notate: () => notation.promise,
    })

    const generating = session.actions.generate()
    await expect(session.actions.setNotationMode('Concert')).resolves.toBe(true)
    expect(session.actions.setTheme('Light')).toBe(true)
    generation.resolve('phrase')
    await generating

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
