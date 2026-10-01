/**
 * The Idle fit run tells its `onPhraseAccepted` seam the intent of every attempt that ends
 * published, drawn or kept as a retryable notation error, once; a too-wide attempt, an attempt
 * that ends the run (no room, a generation failure) and a superseded run's attempt are never
 * reported. This is what the workspace's phrase replay-key announcement listens to.
 */
import { describe, expect, it } from 'vitest'

import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { NotationError } from '@/notation/notation-error'
import { FIT_NO_ROOM, FITS, TOO_WIDE } from './fake-staff-fit'
import { createDeferred, createFitSession, flushAsync } from './fit-session-harness'

/** A Sixteenth combination blocked from `bp-tablet-landscape` up and allowed below it. */
const SIXTEENTH_ONLY_BLOCKED = {
  noteDensity: 'Sixteenth',
  rhythmicVariety: 'Strict',
  silenceDensity: 'Sparse',
  syncopation: 'Active displacement',
} as const

/** Intent: a staff-layout failure as the engraver raises it while drawing. */
function layoutFailure(code: 'notation_no_room' | 'notation_notes_too_wide'): NotationError {
  return new NotationError(code, `layout failure ${code}`, {})
}

/** Intent: a notation failure that is not about the staff's layout, kept as retryable. */
function fontFailure(): NotationError {
  return new NotationError('notation_font_unavailable', 'font missing', {})
}

// @test-link [[module_phrase_replay_key]]
describe('idle fit run: the accepted-phrase report', () => {
  // @test-link [[module_phrase_replay_key]]
  it('reports a drawn attempt once, with the intent it was generated from', async () => {
    const { session, accepted, generated } = createFitSession()

    await expect(session.actions.generate()).resolves.toBe(true)

    expect(accepted).toEqual([generated[0]])
    expect(accepted[0]).toBe(session.state.latestIntent)
  })

  // @test-link [[module_phrase_replay_key]]
  it('reports a Regenerate as a second, different accepted phrase', async () => {
    const { session, accepted, generated } = createFitSession()

    await session.actions.generate()
    await expect(session.actions.regenerate()).resolves.toBe(true)

    expect(accepted).toEqual([generated[0], generated[1]])
    expect(accepted[1]?.seed).not.toBe(accepted[0]?.seed)
  })

  // @test-link [[module_phrase_replay_key]]
  it('reports an attempt kept as a retryable error when its fit check fails', async () => {
    const { session, accepted, generated } = createFitSession({
      checkFit: () => Promise.reject(fontFailure()),
    })

    await expect(session.actions.generate()).resolves.toBe(true)

    expect(session.state.notationError).not.toBeNull()
    expect(accepted).toEqual([generated[0]])
  })

  // @test-link [[module_phrase_replay_key]]
  it('reports an attempt kept as a retryable error when its draw fails off the layout', async () => {
    const { session, accepted, generated } = createFitSession({
      notate: () => Promise.reject(fontFailure()),
    })

    await expect(session.actions.generate()).resolves.toBe(true)

    expect(session.state.notationError).not.toBeNull()
    expect(accepted).toEqual([generated[0]])
  })

  // @test-link [[module_phrase_replay_key]]
  it('reports only the attempt that fits after two too-wide attempts', async () => {
    const { session, staff, accepted, generated } = createFitSession()
    staff.queueFit(TOO_WIDE, TOO_WIDE, FITS)

    await expect(session.actions.generate()).resolves.toBe(true)

    expect(generated).toHaveLength(3)
    expect(accepted).toEqual([generated[2]])
  })

  // @test-link [[module_phrase_replay_key]]
  it('never reports an attempt whose draw fails too wide, only the retry that is drawn', async () => {
    let draws = 0
    const { session, accepted, generated } = createFitSession({
      notate: () => {
        draws += 1
        return draws === 1 ? Promise.reject(layoutFailure('notation_notes_too_wide')) : undefined
      },
    })

    await expect(session.actions.generate()).resolves.toBe(true)

    expect(accepted).toEqual([generated[1]])
  })

  // @test-link [[module_phrase_replay_key]]
  it('reports nothing when all four attempts are too wide', async () => {
    const { session, staff, accepted, generated } = createFitSession()
    staff.setFallbackFit(TOO_WIDE)

    await expect(session.actions.generate()).resolves.toBe(false)

    expect(generated).toHaveLength(4)
    expect(accepted).toEqual([])
  })

  // @test-link [[module_phrase_replay_key]]
  it('reports nothing when the fit check finds no room', async () => {
    const { session, staff, accepted } = createFitSession()
    staff.queueFit(FIT_NO_ROOM)

    await expect(session.actions.generate()).resolves.toBe(false)

    expect(accepted).toEqual([])
  })

  // @test-link [[module_phrase_replay_key]]
  it('reports nothing when the draw fails with no room', async () => {
    const { session, accepted } = createFitSession({
      notate: () => Promise.reject(layoutFailure('notation_no_room')),
    })

    await expect(session.actions.generate()).resolves.toBe(false)

    expect(accepted).toEqual([])
  })

  // @test-link [[module_phrase_replay_key]]
  it('reports nothing when generation fails', async () => {
    const { session, accepted } = createFitSession({
      generate: () => Promise.reject(new Error('no phrase')),
    })

    await expect(session.actions.generate()).resolves.toBe(false)

    expect(session.state.generationError?.message).toBe('no phrase')
    expect(accepted).toEqual([])
  })

  // @test-link [[module_phrase_replay_key]]
  it('reports nothing for a superseded run whose late response would otherwise fit', async () => {
    const pending = createDeferred<GenerationIntent>()
    const built = createFitSession({
      belowTabletLandscape: true,
      generate: () => pending.promise,
    })
    for (const [key, value] of Object.entries(SIXTEENTH_ONLY_BLOCKED)) {
      built.session.actions.setControl(key as keyof typeof SIXTEENTH_ONLY_BLOCKED, value)
    }
    const running = built.session.actions.generate()

    built.viewport.cross(false)
    pending.resolve(built.generated[0]!)

    await expect(running).resolves.toBe(false)
    await flushAsync()
    expect(built.accepted).toEqual([])
  })
})
