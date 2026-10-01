/**
 * The session browser fakes honour their ports' contracts, so a test or the harness that drives
 * them sees what the browser adapters would report: lock outcomes per behaviour, the held state
 * through requests, releases and drops, hidden-only visibility events, and resize notifications.
 */
import { describe, expect, it } from 'vitest'

import {
  createFakeOrientationLock,
  createFakePageVisibility,
  createFakeScreenWakeLock,
  createFakeWindowShape,
} from './fake-session-browser'

// @test-link [[rule_screen_wake_lock_during_session]]
// @test-link [[rule_landscape_lock_during_session]]
describe('fake screen locks', () => {
  // @test-link [[rule_screen_wake_lock_during_session]]
  it('grant by default, hold until released, and log every step', async () => {
    const wakeLock = createFakeScreenWakeLock()

    expect(await wakeLock.request()).toEqual({ kind: 'held' })
    expect(wakeLock.isHeld()).toBe(true)
    expect(() => wakeLock.request()).toThrow(/requested again/)
    wakeLock.release()

    expect(wakeLock.isHeld()).toBe(false)
    expect([wakeLock.requests(), wakeLock.releases()]).toEqual([1, 1])
    expect(wakeLock.log()).toEqual(['request', 'grant', 'release'])
  })

  // @test-link [[rule_landscape_lock_during_session]]
  it('answer refused or unsupported as told, holding nothing', async () => {
    const lock = createFakeOrientationLock()

    lock.setBehaviour('refuse')
    expect(await lock.lock()).toEqual({ kind: 'refused', reason: 'NotAllowedError' })
    expect(lock.isHeld()).toBe(false)
    lock.unlock()
    lock.setBehaviour('unsupported')
    expect(await lock.lock()).toEqual({ kind: 'unsupported' })
    lock.unlock()

    expect(lock.log()).toEqual([
      'request',
      'refuse',
      'release',
      'request',
      'unsupported',
      'release',
    ])
  })

  // @test-link [[rule_screen_wake_lock_during_session]]
  it('let the browser drop a held lock, and refuse to drop one not held', async () => {
    const wakeLock = createFakeScreenWakeLock()
    expect(() => wakeLock.drop()).toThrow(/needs a held lock/)

    await wakeLock.request()
    wakeLock.drop()

    expect(wakeLock.isHeld()).toBe(false)
    expect(wakeLock.requests()).toBe(1)
    expect(wakeLock.log()).toEqual(['request', 'grant', 'drop'])
  })
})

// @test-link [[rule_hidden_tab_ends_session]]
describe('fake page visibility', () => {
  // @test-link [[rule_hidden_tab_ends_session]]
  it('tells listeners only of a change to hidden, until they stop', () => {
    const page = createFakePageVisibility()
    let hidden = 0
    const stop = page.onHidden(() => {
      hidden += 1
    })

    page.setHidden(true)
    page.setHidden(true)
    page.setHidden(false)
    expect(hidden).toBe(1)
    stop()
    page.setHidden(true)

    expect(hidden).toBe(1)
    expect(page.listenerCount()).toBe(0)
  })
})

// @test-link [[rule_session_ends_when_staff_too_small]]
describe('fake window shape', () => {
  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('reads its shape and tells subscribers of each resize', () => {
    const shape = createFakeWindowShape()
    const heights: number[] = []
    shape.subscribe(() => heights.push(shape.read().smallHeightPx))

    shape.resize({ widthPx: 800, smallHeightPx: 360, remPx: 16 })

    expect(shape.read()).toEqual({ widthPx: 800, smallHeightPx: 360, remPx: 16 })
    expect(heights).toEqual([360])
  })
})
