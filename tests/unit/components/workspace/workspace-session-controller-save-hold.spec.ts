/**
 * The session controller holds the player's saves while a session runs: an accepted start holds
 * them before the transport starts, and every end releases them once, the session back to Idle,
 * whether Stop, another end or a start undone part-way. A refused start neither holds nor
 * releases. An end with a review then asks for the session's own save; one in the count-in and a
 * start undone part-way do not. On the fake audio clock at 240 BPM from 5 s: phrase 1 starts sounding at 6.1 s.
 */
import { describe, expect, it, vi } from 'vitest'

import { keptSessionKey } from '@/components/workspace/workspace-session-save'

import { controllerRig, flush, playTo } from './session-controller-rig'
import { COUNT_IN_ENDS_AT } from './session-controller-timeline'

const HELD_AT_START = { call: 'hold', phase: 'idle', audioRunning: false } as const
const RELEASED_AT_IDLE = { call: 'release', phase: 'idle', audioRunning: false } as const
const SAVED_AT_IDLE = { call: 'saveSession', phase: 'idle', audioRunning: false } as const

// @test-link [[rule_no_save_during_session]]
describe('session controller: holding the saves while a session runs', () => {
  it('holds at an accepted start, before the transport starts, and releases once at Stop', async () => {
    const rig = controllerRig()

    rig.controller.start()
    expect(rig.saveHolds).toEqual([HELD_AT_START])
    await playTo(rig, COUNT_IN_ENDS_AT + 0.1)
    expect(rig.saveHolds).toEqual([HELD_AT_START])

    rig.controller.stop()
    expect(rig.saveHolds).toEqual([HELD_AT_START, RELEASED_AT_IDLE])
  })

  it('releases once when the session ends on its own, as when the page is hidden', async () => {
    const rig = controllerRig()
    rig.controller.start()
    await playTo(rig, COUNT_IN_ENDS_AT + 0.1)

    rig.browser.pageVisibility.setHidden(true)
    rig.audioRig.interrupt()

    expect(rig.saveHolds).toEqual([HELD_AT_START, RELEASED_AT_IDLE])
  })

  it('releases once when a start is undone part-way', () => {
    const rig = controllerRig()
    const failure = new Error('queueBacking exploded')
    vi.spyOn(rig.transport, 'queueBacking').mockImplementationOnce(() => {
      throw failure
    })

    expect(() => rig.controller.start()).toThrow(failure)

    expect(rig.saveHolds).toEqual([HELD_AT_START, RELEASED_AT_IDLE])
  })

  it('neither holds nor releases for a refused start', () => {
    const rig = controllerRig()
    rig.idle.result = null

    expect(() => rig.controller.start()).toThrow(/cannot start/)

    expect(rig.saveHolds).toEqual([])
  })
})

// @test-link [[module_kept_session_save]]
// @test-link [[rule_most_recent_session_kept]]
describe("session controller: the session's own save", () => {
  it('asks for it after the release at an end with a review, the Review already open', async () => {
    const rig = controllerRig()
    rig.controller.start()
    await playTo(rig, COUNT_IN_ENDS_AT + 0.1)

    rig.controller.stop()
    expect(rig.controller.state.review?.showing).toBe(true)
    expect(rig.saveHolds).toEqual([HELD_AT_START, RELEASED_AT_IDLE])

    // The codec loads on demand, so the save is asked for a little later.
    await vi.waitFor(() => {
      expect(rig.saveHolds).toEqual([HELD_AT_START, RELEASED_AT_IDLE, SAVED_AT_IDLE])
    })
    const history = rig.controller.state.lastHistory
    if (history === null) throw new Error('the session left no history')
    const changes = rig.sessionSaves[0]?.([]) ?? []
    expect(changes.filter((change) => change.kind === 'write').map((change) => change.key)).toEqual(
      [keptSessionKey(history), keptSessionKey(history)],
    )
  })

  it('does not ask for it at an end during the count-in, nor for a start undone part-way', async () => {
    const rig = controllerRig()
    rig.controller.start()
    rig.controller.stop()
    vi.spyOn(rig.transport, 'queueBacking').mockImplementationOnce(() => {
      throw new Error('queueBacking exploded')
    })
    expect(() => rig.controller.start()).toThrow('queueBacking exploded')
    // Long enough for the codec to load, had a save been asked for.
    await import('@/storage/records/kept-session-record')
    await flush()

    expect(rig.saveHolds).toEqual([
      HELD_AT_START,
      RELEASED_AT_IDLE,
      HELD_AT_START,
      RELEASED_AT_IDLE,
    ])
    expect(rig.sessionSaves).toEqual([])
  })
})
