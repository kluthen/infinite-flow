/**
 * The browser adapter of the window-shape port: the width is the window's (the width media queries
 * read), the small viewport height and the rem size come from a probe element sized `100svh` at the
 * browser's initial font size, and every window `resize` reaches subscribers until they stop.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createViewportProbe,
  createWindowShape,
  type ViewportProbe,
  type WindowShapeWindowLike,
} from '@/components/workspace/browser-window-shape'

/** A stand-in window whose width the test sets, firing `resize`. */
interface StandInWindow extends WindowShapeWindowLike {
  readonly resizeTo: (widthPx: number) => void
  readonly listenerCount: () => number
}

/** Intent: a stand-in window `widthPx` wide that fires `resize` on every resize. */
function standInWindow(widthPx: number): StandInWindow {
  let width = widthPx
  const listeners = new Set<() => void>()
  return {
    get innerWidth() {
      return width
    },
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    resizeTo: (next) => {
      width = next
      for (const listener of [...listeners]) listener()
    },
    listenerCount: () => listeners.size,
  }
}

/** Intent: a stand-in probe reading the given small viewport height and rem size. */
function standInProbe(reading: { smallHeightPx: number; remPx: number }): ViewportProbe {
  return { smallHeightPx: () => reading.smallHeightPx, remPx: () => reading.remPx }
}

// @test-link [[rule_session_ends_on_portrait_view]]
// @test-link [[rule_session_ends_when_staff_too_small]]
describe('createWindowShape', () => {
  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('reads the window width with the probe’s small viewport height and rem size', () => {
    const reading = { smallHeightPx: 360, remPx: 16 }
    const win = standInWindow(800)
    const shape = createWindowShape(win, standInProbe(reading))

    expect(shape.read()).toEqual({ widthPx: 800, smallHeightPx: 360, remPx: 16 })
    win.resizeTo(1280)
    reading.smallHeightPx = 720
    expect(shape.read()).toEqual({ widthPx: 1280, smallHeightPx: 720, remPx: 16 })
  })

  // @test-link [[rule_session_ends_on_portrait_view]]
  it('tells subscribers of every resize until they stop listening', () => {
    const win = standInWindow(800)
    const shape = createWindowShape(win, standInProbe({ smallHeightPx: 360, remPx: 16 }))
    const widths: number[] = []
    const stop = shape.subscribe(() => widths.push(shape.read().widthPx))

    win.resizeTo(600)
    win.resizeTo(1024)
    expect(widths).toEqual([600, 1024])

    stop()
    win.resizeTo(700)
    expect(widths).toEqual([600, 1024])
    expect(win.listenerCount()).toBe(0)
  })
})

// @test-link [[rule_session_ends_when_staff_too_small]]
describe('createViewportProbe', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.replaceChildren()
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('adds one hidden probe, sized 100svh at the initial font size, on its first read', () => {
    const probe = createViewportProbe(document)
    expect(document.body.children).toHaveLength(0)

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ width: 0, height: 412 }),
    )
    expect(probe.smallHeightPx()).toBe(412)
    expect(probe.remPx()).toBe(16)

    expect(document.body.children).toHaveLength(1)
    const element = document.body.children[0] as HTMLElement
    expect(element.getAttribute('aria-hidden')).toBe('true')
    expect(element.style.getPropertyValue('position')).toBe('fixed')
    expect(element.style.getPropertyValue('block-size')).toBe('100svh')
    expect(element.style.getPropertyValue('inline-size')).toBe('0px')
    expect(element.style.getPropertyValue('font-size')).toBe('medium')
    expect(element.style.getPropertyValue('visibility')).toBe('hidden')
    expect(element.style.getPropertyValue('pointer-events')).toBe('none')
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('throws on a probe the browser has not laid out, rather than reading zero', () => {
    const probe = createViewportProbe(document)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ width: 0, height: 0 }),
    )

    expect(() => probe.smallHeightPx()).toThrow(/small viewport height/)
  })
})
