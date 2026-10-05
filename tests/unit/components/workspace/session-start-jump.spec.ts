import { describe, expect, it, vi } from 'vitest'

import {
  jumpForSessionStart,
  sessionStartJumpDelta,
  type SessionJumpGeometry,
} from '@/components/workspace/session-start-jump'

/** A desktop page scrolled to its top: the staff's top edge in view. */
const DESKTOP_IN_VIEW: SessionJumpGeometry = {
  viewportBlockSize: 800,
  workspaceTop: 0,
  cueRowTop: 220,
  staffViewportTop: 270,
  staffViewportBottom: 700,
}

// @test-link [[service_session_start]]
// @test-link [[req_landscape_phrase_workspace]]
describe('sessionStartJumpDelta from bp-tablet-landscape up (one-system layout)', () => {
  it('does not jump while the top edge of staff-viewport is in the viewport', () => {
    expect(sessionStartJumpDelta('one-system', DESKTOP_IN_VIEW)).toBe(0)
  })

  it('jumps to the top of the workspace when the staff top edge is above the viewport', () => {
    const scrolled = { ...DESKTOP_IN_VIEW, workspaceTop: -500, staffViewportTop: -230 }
    expect(sessionStartJumpDelta('one-system', scrolled)).toBe(-500)
  })

  it('jumps to the top of the workspace when the staff top edge is below the viewport', () => {
    const short = { ...DESKTOP_IN_VIEW, viewportBlockSize: 260 }
    expect(sessionStartJumpDelta('one-system', short)).toBe(0)
    const below = { ...DESKTOP_IN_VIEW, workspaceTop: 0, staffViewportTop: 900 }
    expect(sessionStartJumpDelta('one-system', below)).toBe(0)
    const belowScrolled = { ...below, workspaceTop: -40, staffViewportTop: 860 }
    expect(sessionStartJumpDelta('one-system', belowScrolled)).toBe(-40)
  })
})

// @test-link [[service_session_start]]
// @test-link [[req_landscape_phrase_workspace]]
describe('sessionStartJumpDelta below bp-tablet-landscape (split layout)', () => {
  const PHONE: SessionJumpGeometry = {
    viewportBlockSize: 360,
    workspaceTop: 0,
    cueRowTop: 150,
    staffViewportTop: 200,
    staffViewportBottom: 480,
  }

  it('scrolls down by the least distance that brings the staff bottom into view', () => {
    expect(sessionStartJumpDelta('split', PHONE)).toBe(120)
  })

  it('scrolls up when the cue row is above the viewport', () => {
    const scrolled = { ...PHONE, cueRowTop: -40, staffViewportTop: 10, staffViewportBottom: 290 }
    expect(sessionStartJumpDelta('split', scrolled)).toBe(-40)
  })

  it('does not jump when the cue row and the staff are already in view', () => {
    const inView = { ...PHONE, cueRowTop: 10, staffViewportTop: 60, staffViewportBottom: 340 }
    expect(sessionStartJumpDelta('split', inView)).toBe(0)
  })

  it('never scrolls the cue row above the viewport, even when the pair is taller than it', () => {
    const tall = { ...PHONE, cueRowTop: 30, staffViewportBottom: 600 }
    expect(sessionStartJumpDelta('split', tall)).toBe(30)
  })
})

// @test-link [[service_session_start]]
describe('jumpForSessionStart', () => {
  /** Intent: an element whose bounding box has this top and bottom. */
  function boxed(top: number, bottom: number): HTMLElement {
    const element = document.createElement('div')
    element.getBoundingClientRect = () => ({ top, bottom }) as DOMRect
    return element
  }

  it('scrolls the window instantly by the delta, once', () => {
    const scrollBy = vi.fn()
    const view = { scrollBy, viewportBlockSize: () => 360 }
    jumpForSessionStart(
      view,
      { workspace: boxed(0, 900), cueRow: boxed(150, 200), staffViewport: boxed(200, 480) },
      'split',
    )
    expect(scrollBy).toHaveBeenCalledExactlyOnceWith({ top: 120, behavior: 'instant' })
  })

  it('does not scroll at all when no jump is needed', () => {
    const scrollBy = vi.fn()
    const view = { scrollBy, viewportBlockSize: () => 800 }
    jumpForSessionStart(
      view,
      { workspace: boxed(0, 900), cueRow: boxed(220, 260), staffViewport: boxed(270, 700) },
      'one-system',
    )
    expect(scrollBy).not.toHaveBeenCalled()
  })
})
