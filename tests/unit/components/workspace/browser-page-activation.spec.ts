/**
 * The browser adapter of the page-activation port: the page's first click, tap or key press,
 * noted from the activation-triggering input events (`keydown`, `mousedown`, `pointerdown`,
 * `pointerup`, `touchend`) that the browser counted as one (`navigator.userActivation`), so a key
 * the browser does not count (Escape) does not; without that API, any of them counts.
 */
import { describe, expect, it } from 'vitest'

import { createPageActivation } from '@/components/workspace/browser-page-activation'

/** Intent: a stand-in for the browser's sticky user activation, set by the test. */
function stickyActivation(initially = false) {
  return { hasBeenActive: initially }
}

/** Intent: dispatch one input event of `type` on `target`. */
function fire(target: EventTarget, type: string): void {
  target.dispatchEvent(new Event(type))
}

// @test-link [[rule_starting_note_waits_for_first_gesture]]
describe('the page activation', () => {
  it('is not active at a fresh load, and tells its listeners once at the first counted event', () => {
    const target = new EventTarget()
    const activation = stickyActivation()
    const page = createPageActivation(target, activation)
    let told = 0
    page.onFirstActivation(() => (told += 1))
    expect(page.hasBeenActive()).toBe(false)

    activation.hasBeenActive = true
    fire(target, 'pointerdown')
    fire(target, 'keydown')

    expect(page.hasBeenActive()).toBe(true)
    expect(told).toBe(1)
  })

  it.each(['keydown', 'mousedown', 'pointerdown', 'pointerup', 'touchend'])(
    'counts %s when the browser counted it',
    (type) => {
      const target = new EventTarget()
      const activation = stickyActivation()
      const page = createPageActivation(target, activation)
      activation.hasBeenActive = true
      fire(target, type)
      expect(page.hasBeenActive()).toBe(true)
    },
  )

  it('does not count an event the browser did not count (Escape), nor any other event', () => {
    const target = new EventTarget()
    const page = createPageActivation(target, stickyActivation())
    fire(target, 'keydown')
    fire(target, 'scroll')
    expect(page.hasBeenActive()).toBe(false)
  })

  it('counts any listed event when the browser has no user-activation API', () => {
    const target = new EventTarget()
    const page = createPageActivation(target, undefined)
    fire(target, 'scroll')
    expect(page.hasBeenActive()).toBe(false)
    fire(target, 'touchend')
    expect(page.hasBeenActive()).toBe(true)
  })

  it('starts active when the browser already counts the page active, and then tells nobody', () => {
    const page = createPageActivation(new EventTarget(), stickyActivation(true))
    let told = 0
    page.onFirstActivation(() => (told += 1))
    expect(page.hasBeenActive()).toBe(true)
    expect(told).toBe(0)
  })

  it('stops telling a listener once it is removed', () => {
    const target = new EventTarget()
    const page = createPageActivation(target, undefined)
    let told = 0
    const stop = page.onFirstActivation(() => (told += 1))
    stop()
    fire(target, 'mousedown')
    expect(told).toBe(0)
  })
})
