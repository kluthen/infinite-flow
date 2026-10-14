/**
 * The session controller holds the player's saves while a session runs: an accepted start holds
 * them before the transport starts, and every end releases them once, the session back to Idle,
 * whether Stop, another end or a start undone part-way. A refused start neither holds nor
 * releases. On the fake audio clock at 240 BPM from 5 s: phrase 1 starts sounding at 6.1 s.
 */
import { describe, expect, it, vi } from 'vitest'

import { controllerRig, playTo } from './session-controller-rig'
import { COUNT_IN_ENDS_AT } from './session-controller-timeline'

const HELD_AT_START = { call: 'hold', phase: 'idle', audioRunning: false } as const
const RELEASED_AT_IDLE = { call: 'release', phase: 'idle', audioRunning: false } as const

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
