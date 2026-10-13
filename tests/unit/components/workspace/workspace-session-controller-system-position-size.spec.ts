/**
 * A running session judges its window with the shared system-position size the staff reports in
 * its layout inputs: below bp-tablet-landscape, two positions of that size at the 5 px floor must
 * fit the height budget, so a 169 px budget keeps a session running at the built-in 16 staff
 * spaces (160 px needed) and ends it at 17 (170 px needed). On the session controller rig, in a
 * landscape phone window holding the split layout.
 */
import { describe, expect, it } from 'vitest'

import { phoneWindow, sessionIn } from './session-end-samples'

// @test-link [[rule_session_ends_when_staff_too_small]]
// @test-link [[module_notation_layout_preflight]]
describe('session controller: the window judged in the shared system-position size', () => {
  it('ends a session when the reported size no longer fits the height budget', async () => {
    const rig = await sessionIn('running', phoneWindow)
    const viewport = { layout: 'split', heightBudgetPx: 169 } as const

    rig.staff.layoutInputs({ containerWidthPx: 800, viewport, systemPositionUnits: 160 })
    expect(rig.controller.state.phase).toBe('running')

    rig.staff.layoutInputs({ containerWidthPx: 800, viewport, systemPositionUnits: 170 })
    expect(rig.controller.state.phase).toBe('idle')
    expect(rig.controller.state.lastEnd?.cause).toBe('staff-not-shown')
  })
})
