/**
 * The Idle generation session's `resultEngraved` flag: whether the retained result has actually
 * been engraved since it was last assigned, through successful and failing engraves, redraws and
 * regenerations.
 */
import { describe, expect, it } from 'vitest'

import { createGenerationSession } from '@/composables/use-generation-session'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeSeed } from '@/domain/random/seed'
import { alwaysFitsStaff } from './fake-staff-fit'
import { countingSessionSeeds } from './fake-session-seed'
import { createFakeViewportWidth } from './fake-viewport-width'
import { createDeferred } from './fit-session-harness'

/** Intent: counted request-id and seed providers, with how many of each they handed out. */
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

// @test-link [[service_idle_generation_session]]
// @test-link [[user_story_controlled_phrase_generation]]
describe('createGenerationSession: resultEngraved (D34)', () => {
  it('is false initially, true after a successful engrave, false after a failing one, and true again after a successful redraw', async () => {
    const tracked = trackedProviders()
    let notateAttempts = 0
    const session = createGenerationSession({
      saveSettings: () => undefined,
      ...alwaysFitsStaff(),
      viewport: createFakeViewportWidth(),
      providers: tracked.providers,
      nextSessionSeed: countingSessionSeeds(),
      withSessionSeed: (generated) => generated,
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
    const notateCalled = createDeferred<void>()
    const session = createGenerationSession({
      saveSettings: () => undefined,
      ...alwaysFitsStaff(),
      viewport: createFakeViewportWidth(),
      providers: tracked.providers,
      nextSessionSeed: countingSessionSeeds(),
      withSessionSeed: (generated) => generated,
      generate: () => generation.promise,
      notate: () => {
        notateCalled.resolve()
        return notation.promise
      },
    })

    const pending = session.actions.generate()
    generation.resolve('phrase')
    // The fit check sits between generation and engraving; wait for the engraving step itself.
    await notateCalled.promise

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
      saveSettings: () => undefined,
      ...alwaysFitsStaff(),
      viewport: createFakeViewportWidth(),
      providers: tracked.providers,
      nextSessionSeed: countingSessionSeeds(),
      withSessionSeed: (generated) => generated,
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
      saveSettings: () => undefined,
      ...alwaysFitsStaff(),
      viewport: createFakeViewportWidth(),
      providers: tracked.providers,
      nextSessionSeed: countingSessionSeeds(),
      withSessionSeed: (generated) => generated,
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
