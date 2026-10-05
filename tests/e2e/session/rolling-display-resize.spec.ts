/**
 * v2.0 chunk 16, a window change the held layout still fits: both systems re-engrave in place at
 * the new size, in the layout held since the start, with the same slots, the same units and the
 * same notes in each, no refill fade, and the playhead band on the same measure; across
 * bp-tablet-landscape too, a one-system session keeps one system per phrase and a split session
 * keeps its split. Runs against the workspace harness (port 4175) on its fake audio clock.
 */
import { expect, test, type Page } from '@playwright/test'

import { settleFrames } from '../release/harness-helpers'
import {
  DESKTOP,
  PHONE,
  gotoSessionHarness,
  readyToStart,
  startSession,
  toCountInMiddle,
} from './session-helpers'
import {
  drawnKeys,
  markSystems,
  readStaff,
  rollingLog,
  sessionNotationErrors,
  settledStaff,
  startRollingLog,
  toBarline,
  untilReady,
  type Layout,
  type Position,
  type StaffReading,
} from './rolling-helpers'

/** A window size. */
interface Size {
  readonly width: number
  readonly height: number
}

/** Intent: start a session at `size` and move to phrase 1's second measure, phrase 2 readied. */
async function runningAtBarTwo(page: Page, size: Size, layout: Layout): Promise<StaffReading> {
  await gotoSessionHarness(page, size)
  await readyToStart(page)
  await startSession(page)
  await toCountInMiddle(page)
  await untilReady(page, 2)
  await toBarline(page, 1, 1)
  const reading = await settledStaff(page)
  expect(reading.state.heldLayout).toBe(layout)
  return reading
}

/**
 * Intent: resize to `size` and wait until both systems are re-engraved there (each SVG's width
 * changed); return the settled reading.
 */
async function resizeAndReengrave(
  page: Page,
  size: Size,
  before: StaffReading,
): Promise<StaffReading> {
  await page.setViewportSize(size)
  await settleFrames(page)
  await expect
    .poll(async () => {
      const now = await readStaff(page)
      return (['top', 'bottom'] as const).every(
        (position) => now[position]?.svgWidth !== before[position]?.svgWidth,
      )
    })
    .toBe(true)
  return settledStaff(page)
}

/**
 * Intent: assert a resize re-engraved the staff in place: still running in the held layout, the
 * same slot in each position, the same unit holding a new SVG, the same notes, no unit faded out
 * or entered, and the one band on the same measure of the same system.
 */
async function expectReengravedInPlace(
  page: Page,
  before: StaffReading,
  after: StaffReading,
  band: Position,
): Promise<void> {
  expect(after.state.phase).toBe('running')
  expect(after.state.heldLayout).toBe(before.state.heldLayout)
  expect(after.state.playhead).toEqual(before.state.playhead)
  expect(drawnKeys(after)).toEqual(drawnKeys(before))
  for (const position of ['top', 'bottom'] as const) {
    const was = before[position]
    const now = after[position]
    if (was === null || now === null) throw new Error(`the ${position} position is blank`)
    expect(now.unitMark, position).toBe('before-resize')
    expect(now.svgMark, position).toBeNull()
    expect(now.noteIds, position).toEqual(was.noteIds)
    expect(now.measures, position).toEqual(was.measures)
  }
  expect(after.bands).toBe(1)
  expect(after[band]?.bandMeasure).toBe(before[band]?.bandMeasure)
  const log = await rollingLog(page)
  expect(log.filter((entry) => entry.kind === 'fade-out' || entry.kind === 'enter')).toEqual([])
  expect(await sessionNotationErrors(page)).toEqual([])
}

/** The resizes the held layout still fits: one within the layout, two across the breakpoint. */
const RESIZES = [
  {
    name: 'one-system, narrowed within bp-tablet-landscape and up',
    from: DESKTOP,
    to: { width: 1100, height: 800 },
    layout: 'one-system',
    keys: { top: '1:whole', bottom: '2:whole' },
  },
  {
    name: 'one-system, narrowed below bp-tablet-landscape',
    from: DESKTOP,
    to: { width: 1000, height: 700 },
    layout: 'one-system',
    keys: { top: '1:whole', bottom: '2:whole' },
  },
  {
    name: 'split, widened to bp-tablet-landscape and up',
    from: PHONE,
    to: { width: 1100, height: 700 },
    layout: 'split',
    keys: { top: '1:opening', bottom: '1:closing' },
  },
] as const

for (const { name, from, to, layout, keys } of RESIZES) {
  // @test-link [[module_session_staff_refill]]
  // @test-link [[rule_session_layout_fixed_at_start]]
  test(`${name}: both systems re-engrave in place, in the held layout`, async ({ page }) => {
    test.setTimeout(120_000)
    const before = await runningAtBarTwo(page, from, layout)
    expect(drawnKeys(before)).toEqual(keys)
    expect(before.top?.bandMeasure).toBe(1)
    await markSystems(page, 'before-resize')
    const marked = await readStaff(page)
    await startRollingLog(page)

    const after = await resizeAndReengrave(page, to, marked)

    await expectReengravedInPlace(page, marked, after, 'top')
    // The session rolls on in the held layout at the new size.
    await toBarline(page, 1, 2)
    const rolled = await settledStaff(page)
    expect(rolled.state.phase).toBe('running')
    expect(rolled.bands).toBe(1)
    if (layout === 'one-system') {
      expect(drawnKeys(rolled)).toEqual({ top: '1:whole', bottom: '2:whole' })
      expect(rolled.top?.bandMeasure).toBe(2)
    } else {
      expect(drawnKeys(rolled)).toEqual({ top: '2:opening', bottom: '1:closing' })
      expect(rolled.bottom?.bandMeasure).toBe(2)
    }
  })
}
