/**
 * v2.0 chunk 13, the connection sheet's layout (screens/controller-connection/handoff.md,
 * Responsive Behavior), on the workspace harness with the fake MIDI access: on a landscape phone
 * (bp-mobile-landscape, 740 × 360) the centered sheet fits the viewport, stacks its actions
 * full-width with the primary on top, never scrolls horizontally and scrolls vertically inside
 * itself; from bp-tablet-landscape up its actions sit in a row, aligned to the end, primary first
 * (up to three on one row; Connected's four wrap onto two end-aligned rows in markup order, D147).
 */
import { expect, test, type Page } from '@playwright/test'

import { DESKTOP, PHONE } from '../session/session-helpers'
import {
  CHECK,
  KEYS,
  PAD,
  connectThroughSheet,
  deviceOption,
  gotoControllerHarness,
  play,
  plug,
  sheet,
  sheetAction,
  watchPageErrors,
} from './controller-helpers'

/** The backdrop's padding (--spacing-4) and the sheet's cap (--sheet-max-inline-size), in px. */
const BACKDROP_PADDING = 16
const SHEET_MAX = 28 * 16

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: open the sheet at Connected with two inputs seen, so all four actions show. */
async function openConnectedWithFourActions(page: Page): Promise<void> {
  await connectThroughSheet(page, [KEYS, PAD])
  await deviceOption(page, KEYS.name).click()
  await play(page, KEYS, CHECK.tenor.concert)
  await sheetAction(page, 'Continue').click()
  await expect(sheet(page).locator('.sheet-actions > button')).toHaveCount(4)
}

/** Intent: the action buttons' boxes, in markup order, and the actions row's box. */
async function actionBoxes(page: Page) {
  const row = await sheet(page).locator('.sheet-actions').boundingBox()
  const buttons = await sheet(page)
    .locator('.sheet-actions > button')
    .evaluateAll((all) =>
      all.map((b) => {
        const r = b.getBoundingClientRect()
        return {
          x: r.x,
          y: r.y,
          width: r.width,
          right: r.right,
          primary: b.matches('.btn-primary'),
        }
      }),
    )
  if (row === null) throw new Error('the actions row is not rendered')
  return { row, buttons }
}

/**
 * Intent: assert the wide-screen actions sit on `rowCount` rows, each aligned to the end of the
 * actions row, in markup order (top row first, left to right within a row), primary first.
 */
function expectEndAlignedRows(
  { row, buttons }: Awaited<ReturnType<typeof actionBoxes>>,
  rowCount: number,
): void {
  expect(buttons[0]?.primary).toBe(true)
  const rows: (typeof buttons)[] = []
  buttons.forEach((button, k) => {
    const previous = buttons[k - 1]
    const current = rows.at(-1)
    if (previous === undefined || current === undefined) rows.push([button])
    else if (Math.abs(button.y - previous.y) < 0.5) {
      expect(button.x).toBeGreaterThan(previous.x)
      current.push(button)
    } else {
      expect(button.y).toBeGreaterThan(previous.y)
      rows.push([button])
    }
  })
  expect(rows).toHaveLength(rowCount)
  for (const line of rows) expect(line.at(-1)!.right).toBeCloseTo(row.x + row.width, 0)
}

/** Intent: the sheet's and the page's scroll extents. */
function scrollExtents(page: Page) {
  return sheet(page).evaluate((panel) => ({
    sheetScrollWidth: panel.scrollWidth,
    sheetClientWidth: panel.clientWidth,
    sheetScrollHeight: panel.scrollHeight,
    sheetClientHeight: panel.clientHeight,
    overflowY: getComputedStyle(panel).overflowY,
    pageScrollWidth: document.documentElement.scrollWidth,
  }))
}

// @test-link [[rule_controller_connects_between_sessions]]
test('on a landscape phone the sheet fits, stacks its actions and scrolls only vertically', async ({
  page,
}) => {
  await gotoControllerHarness(page, { size: PHONE })
  await openConnectedWithFourActions(page)

  const box = await sheet(page).boundingBox()
  if (box === null) throw new Error('the sheet is not rendered')
  expect(box.width).toBeCloseTo(Math.min(PHONE.width - 2 * BACKDROP_PADDING, SHEET_MAX), 0)
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(PHONE.width)
  expect(box.y + box.height).toBeLessThanOrEqual(PHONE.height)

  // Full-width, stacked, primary on top, in markup order.
  const { row, buttons } = await actionBoxes(page)
  expect(buttons[0]?.primary).toBe(true)
  buttons.forEach((button, k) => {
    expect(button.x).toBeCloseTo(row.x, 0)
    expect(button.width).toBeCloseTo(row.width, 0)
    if (k > 0) expect(button.y).toBeGreaterThan(buttons[k - 1]!.y)
  })

  // Taller than the viewport: it scrolls inside itself, never sideways, and the page never does.
  const extents = await scrollExtents(page)
  expect(extents.sheetScrollWidth).toBeLessThanOrEqual(extents.sheetClientWidth)
  expect(extents.pageScrollWidth).toBeLessThanOrEqual(PHONE.width)
  expect(extents.overflowY).toBe('auto')
  expect(extents.sheetScrollHeight).toBeGreaterThan(extents.sheetClientHeight)
  await sheetAction(page, 'Disconnect').scrollIntoViewIfNeeded()
  expect(await sheet(page).evaluate((panel) => panel.scrollTop)).toBeGreaterThan(0)
  await expect(sheetAction(page, 'Disconnect')).toBeInViewport()
})

// @test-link [[rule_controller_connects_between_sessions]]
test('on a landscape phone the check result with its note fits the sheet width', async ({
  page,
}) => {
  await gotoControllerHarness(page, { size: PHONE })
  await connectThroughSheet(page, [KEYS])
  await play(page, KEYS, CHECK.tenor.written)
  await expect(sheetAction(page, 'Continue')).toBeFocused()

  const extents = await scrollExtents(page)
  expect(extents.sheetScrollWidth).toBeLessThanOrEqual(extents.sheetClientWidth)
  expect(extents.pageScrollWidth).toBeLessThanOrEqual(PHONE.width)
  const note = await sheet(page).locator('.check-note svg').boundingBox()
  const panel = await sheet(page).boundingBox()
  if (note === null || panel === null) throw new Error('the check note is not rendered')
  expect(note.x).toBeGreaterThanOrEqual(panel.x)
  expect(note.x + note.width).toBeLessThanOrEqual(panel.x + panel.width)
})

// @test-link [[rule_controller_connects_between_sessions]]
test('from bp-tablet-landscape up the actions sit in a row, aligned to the end, primary first', async ({
  page,
}) => {
  await gotoControllerHarness(page, { size: DESKTOP })
  await connectThroughSheet(page, [KEYS])
  await play(page, KEYS, CHECK.tenor.concert)
  await expect(sheetAction(page, 'Continue')).toBeFocused()

  // A check result's two actions: one row.
  const result = await actionBoxes(page)
  expect(result.buttons.map((b) => b.primary)).toEqual([true, false])
  expectEndAlignedRows(result, 1)

  // Connected with one input seen: three actions, still one row.
  await sheetAction(page, 'Continue').click()
  await expect(sheet(page).locator('#sheet-title')).toHaveText('Controller connected')
  await expect(sheet(page).locator('.sheet-actions > button')).toHaveCount(3)
  expectEndAlignedRows(await actionBoxes(page), 1)

  // D147: a second input adds a fourth action; they wrap onto two rows within the capped
  // sheet, each aligned to the end, in markup order.
  await plug(page, PAD)
  await expect(sheet(page).locator('.sheet-actions > button')).toHaveCount(4)
  expectEndAlignedRows(await actionBoxes(page), 2)
})
