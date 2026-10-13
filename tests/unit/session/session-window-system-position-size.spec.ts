/**
 * The session window rule judges the height room with the shared system-position size the staff
 * is drawn with: below bp-tablet-landscape, two positions of that size at the 5 px floor (scale
 * 0.5) must fit the window's height budget, so a grown size ends the session in a window the
 * built-in 16 staff spaces still fit. Same fixture as session-window.spec.ts: 1 rem is 16 px, a
 * 60-unit leading width and 60-unit padding, an 800 px container.
 */
import { describe, expect, it } from 'vitest'

import { windowEndsSession, type SessionWindowInput } from '@/session/session-window'

/** A landscape phone-sized window holding the split layout, with a 169 px height budget. */
const PHONE: SessionWindowInput = {
  heldLayout: 'split',
  widthPx: 900,
  smallHeightPx: 400,
  remPx: 16,
  containerWidthPx: 800,
  leadingWidth: 60,
  systemPadding: 60,
  heightBudgetPx: 169,
}

// @test-link [[rule_session_ends_when_staff_too_small]]
// @test-link [[module_notation_layout_preflight]]
describe('the session window rule with a grown system-position size', () => {
  it('moves the too-short threshold with the size: 2 x 170 x 0.5 = 170 px for 17 staff spaces', () => {
    expect(windowEndsSession(PHONE)).toBeNull()
    expect(windowEndsSession({ ...PHONE, systemPositionUnits: 160 })).toBeNull()
    expect(windowEndsSession({ ...PHONE, systemPositionUnits: 170 })).toBe('too_short')
    expect(
      windowEndsSession({ ...PHONE, heightBudgetPx: 170, systemPositionUnits: 170 }),
    ).toBeNull()
  })

  it('judges a held one-system layout below the breakpoint in the same grown size', () => {
    const held = { ...PHONE, heldLayout: 'one-system', systemPositionUnits: 200 } as const
    expect(windowEndsSession({ ...held, heightBudgetPx: 199 })).toBe('too_short')
    expect(windowEndsSession({ ...held, heightBudgetPx: 200 })).toBeNull()
  })

  it('needs no height room from bp-tablet-landscape up, whatever the size', () => {
    expect(
      windowEndsSession({
        ...PHONE,
        heldLayout: 'one-system',
        widthPx: 1200,
        smallHeightPx: 800,
        heightBudgetPx: null,
        systemPositionUnits: 240,
      }),
    ).toBeNull()
  })
})
