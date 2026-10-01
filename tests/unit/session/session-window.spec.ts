/**
 * The session window rule: the layout a session holds is chosen at Start by the window's width
 * alone, and a window change ends the session when the view turns portrait-shaped below bp-desktop
 * or when the held layout has no room for the staff at the legibility floor at the new size (too
 * narrow; or, below bp-tablet-landscape, too short). Room is judged with the planner's own
 * phrase-independent check, for the held layout even across a breakpoint crossing.
 *
 * Fixture arithmetic, at the 5 px floor (scale 0.5) with a 60-unit leading width and 60-unit
 * padding: one system of four minimum measures needs (60 + 4 x 40 + 60) x 0.5 = 140 px of
 * container width, a split system of two needs (60 + 2 x 40 + 60) x 0.5 = 100 px, and the split
 * layout's two positions need 2 x 160 x 0.5 = 160 px of height budget. 1 rem is 16 px, so
 * bp-tablet-landscape is 1024 px and bp-desktop 1440 px.
 */

import { describe, expect, it } from 'vitest'

import {
  isPortraitBelowDesktop,
  sessionLayoutAtStart,
  windowEndsSession,
  type SessionWindowInput,
} from '@/session/session-window'

const REM_PX = 16

/** A landscape tablet-or-larger window with ample room, holding the one-system layout. */
const WIDE: SessionWindowInput = {
  heldLayout: 'one-system',
  widthPx: 1200,
  smallHeightPx: 800,
  remPx: REM_PX,
  containerWidthPx: 1100,
  leadingWidth: 60,
  systemPadding: 60,
  heightBudgetPx: null,
}

/** A landscape phone-sized window with ample room, holding the split layout. */
const PHONE: SessionWindowInput = {
  heldLayout: 'split',
  widthPx: 900,
  smallHeightPx: 400,
  remPx: REM_PX,
  containerWidthPx: 800,
  leadingWidth: 60,
  systemPadding: 60,
  heightBudgetPx: 250,
}

// @test-link [[rule_session_layout_fixed_at_start]]
describe('the layout a session holds', () => {
  // @test-link [[rule_session_layout_fixed_at_start]]
  it('is split below bp-tablet-landscape and one system from it up, by width alone', () => {
    expect(sessionLayoutAtStart(1023.5, REM_PX)).toBe('split')
    expect(sessionLayoutAtStart(1024, REM_PX)).toBe('one-system')
    expect(sessionLayoutAtStart(1920, REM_PX)).toBe('one-system')
  })

  // @test-link [[rule_session_layout_fixed_at_start]]
  it('measures the breakpoint in the rem the media queries use', () => {
    expect(sessionLayoutAtStart(1279, 20)).toBe('split')
    expect(sessionLayoutAtStart(1280, 20)).toBe('one-system')
  })

  // @test-link [[rule_session_layout_fixed_at_start]]
  it('rejects a width or rem size that is not a finite positive number', () => {
    expect(() => sessionLayoutAtStart(Number.NaN, REM_PX)).toThrow(/width/u)
    expect(() => sessionLayoutAtStart(1024, 0)).toThrow(/rem/u)
  })
})

// @test-link [[rule_session_ends_on_portrait_view]]
describe('a portrait-shaped view ends the session', () => {
  // @test-link [[rule_session_ends_on_portrait_view]]
  it('ends below bp-desktop when the view is taller than wide', () => {
    expect(windowEndsSession({ ...PHONE, widthPx: 800, smallHeightPx: 1000 })).toBe('portrait_view')
    expect(windowEndsSession({ ...WIDE, widthPx: 1439, smallHeightPx: 1600 })).toBe('portrait_view')
  })

  // @test-link [[rule_session_ends_on_portrait_view]]
  it('treats a square view as portrait-shaped, as the CSS orientation guard does', () => {
    expect(windowEndsSession({ ...PHONE, widthPx: 800, smallHeightPx: 800 })).toBe('portrait_view')
  })

  // @test-link [[rule_session_ends_on_portrait_view]]
  it('keeps the session at or above bp-desktop, where a portrait view still shows the staff', () => {
    expect(windowEndsSession({ ...WIDE, widthPx: 1440, smallHeightPx: 2000 })).toBeNull()
  })

  // @test-link [[rule_session_ends_on_portrait_view]]
  // @test-link [[rule_session_start_conditions]]
  it('is the same portrait test the start conditions read for the rotate-device notice', () => {
    expect(isPortraitBelowDesktop({ widthPx: 800, smallHeightPx: 800, remPx: REM_PX })).toBe(true)
    expect(isPortraitBelowDesktop({ widthPx: 1439, smallHeightPx: 1600, remPx: REM_PX })).toBe(true)
    expect(isPortraitBelowDesktop({ widthPx: 1440, smallHeightPx: 2000, remPx: REM_PX })).toBe(
      false,
    )
    expect(isPortraitBelowDesktop({ widthPx: 900, smallHeightPx: 400, remPx: REM_PX })).toBe(false)
  })
})

// @test-link [[rule_session_ends_when_staff_too_small]]
describe('a window too small for the held layout ends the session', () => {
  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('keeps a session with room for the staff', () => {
    expect(windowEndsSession(WIDE)).toBeNull()
    expect(windowEndsSession(PHONE)).toBeNull()
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('ends when the container gets too narrow for the held layout at the floor', () => {
    expect(windowEndsSession({ ...WIDE, containerWidthPx: 139 })).toBe('too_narrow')
    expect(windowEndsSession({ ...WIDE, containerWidthPx: 140 })).toBeNull()
    expect(windowEndsSession({ ...PHONE, containerWidthPx: 99 })).toBe('too_narrow')
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('ends below bp-tablet-landscape when the height budget gets too short at the floor', () => {
    expect(windowEndsSession({ ...PHONE, smallHeightPx: 300, heightBudgetPx: 159 })).toBe(
      'too_short',
    )
    expect(windowEndsSession({ ...PHONE, smallHeightPx: 300, heightBudgetPx: 160 })).toBeNull()
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('ignores the same short height at or above bp-tablet-landscape, where only width counts', () => {
    expect(
      windowEndsSession({ ...PHONE, widthPx: 1024, smallHeightPx: 300, heightBudgetPx: null }),
    ).toBeNull()
    expect(windowEndsSession({ ...WIDE, widthPx: 1024, smallHeightPx: 300 })).toBeNull()
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('ends nothing on a browser toolbar change: the caller passes the small viewport height', () => {
    // A toolbar hiding grows the dynamic viewport height only. The small viewport height (100svh)
    // and the height budget derived from it stay the same, so the inputs are unchanged and so is
    // the verdict; no input of the rule carries the dynamic height.
    const toolbarShowing = { ...PHONE, smallHeightPx: 330, heightBudgetPx: 170 }
    expect(windowEndsSession(toolbarShowing)).toBeNull()
    const toolbarHidden = { ...toolbarShowing }
    expect(windowEndsSession(toolbarHidden)).toBeNull()
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  // @test-link [[rule_session_layout_fixed_at_start]]
  it('judges a split layout held across a crossing above bp-tablet-landscape as split', () => {
    // 120 px holds two minimum measures (100 px) but not four (140 px).
    const crossed = { ...PHONE, widthPx: 1100, heightBudgetPx: null, containerWidthPx: 120 }
    expect(windowEndsSession(crossed)).toBeNull()
    expect(windowEndsSession({ ...crossed, containerWidthPx: 99 })).toBe('too_narrow')
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  // @test-link [[rule_session_layout_fixed_at_start]]
  it('judges a one-system layout held across a crossing below bp-tablet-landscape as one system', () => {
    const crossed = { ...WIDE, widthPx: 900, heightBudgetPx: 250, containerWidthPx: 120 }
    expect(windowEndsSession(crossed)).toBe('too_narrow')
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('rejects a window below bp-tablet-landscape given no height budget', () => {
    expect(() => windowEndsSession({ ...PHONE, heightBudgetPx: null })).toThrow(/height budget/u)
  })
})
