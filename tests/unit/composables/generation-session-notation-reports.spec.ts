/**
 * The Idle generation session's notation reports: a notation failure or recovery reported from
 * outside a notate call is refused before a result exists or during an operation, and otherwise
 * sets or clears the notation error on the result kept.
 */
import { describe, expect, it } from 'vitest'

import { createGenerationSession } from '@/composables/use-generation-session'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeSeed } from '@/domain/random/seed'
import { alwaysFitsStaff } from './fake-staff-fit'
import { countingSessionSeeds } from './fake-session-seed'
import { createFakeViewportWidth } from './fake-viewport-width'
import { createDeferred } from './fit-session-harness'

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

// @test-link [[service_idle_generation_session]]
// @test-link [[user_story_controlled_phrase_generation]]
// @test-link [[module_notation_layout_preflight]]
describe('generation session workspace flow: reportNotationFailure / reportNotationRecovered', () => {
  it('refuse when idle with no result yet', () => {
    const { providers } = trackedProviders()
    const session = createGenerationSession<StubResult>({
      saveSettings: () => undefined,
      ...alwaysFitsStaff(),
      viewport: createFakeViewportWidth(),
      providers,
      nextSessionSeed: countingSessionSeeds(),
      withSessionSeed: (generated) => generated,
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
      saveSettings: () => undefined,
      ...alwaysFitsStaff(),
      viewport: createFakeViewportWidth(),
      providers,
      nextSessionSeed: countingSessionSeeds(),
      withSessionSeed: (generated) => generated,
      generate: () => deferred.promise,
      notate: async () => undefined,
    })

    const pending = session.actions.generate()
    expect(session.actions.reportNotationFailure(new Error('resize redraw failed'))).toBe(false)
    deferred.resolve({ id: 1 })
    await pending
  })

  // @test-link [[service_idle_generation_session]]
  it('sets notationError and clears resultEngraved on failure, then clears notationError and restores resultEngraved on recovery (D34)', async () => {
    const { providers } = trackedProviders()
    const session = createGenerationSession<StubResult>({
      saveSettings: () => undefined,
      ...alwaysFitsStaff(),
      viewport: createFakeViewportWidth(),
      providers,
      nextSessionSeed: countingSessionSeeds(),
      withSessionSeed: (generated) => generated,
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
      saveSettings: () => undefined,
      ...alwaysFitsStaff(),
      viewport: createFakeViewportWidth(),
      providers,
      nextSessionSeed: countingSessionSeeds(),
      withSessionSeed: (generated) => generated,
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
