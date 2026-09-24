/**
 * End-to-end coverage of the two-system phone layout: below the phone breakpoint, a phrase that
 * fits one system stays one system; a denser phrase that only fits two systems renders bars 1-2 on
 * a first line and bars 3-4 on a second, aligned column-for-column with bar 3 under bar 1 and bar 4
 * under bar 2, one time signature, two clefs and two key signatures, and a tie crossing the bar
 * 2 -> 3 boundary drawn as two partial StaveTies; the exact same phrase and container width at a
 * desktop viewport (where two systems are never allowed) fails with the typed legibility-floor
 * error, proving the fallback is phone-only; a phrase too dense even for two systems fails typed,
 * with no svg and no description, on the phone viewport too.
 */
import { expect, test } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:4174' })

const PHONE_VIEWPORT = { width: 740, height: 360 } as const
const DESKTOP_VIEWPORT = { width: 1280, height: 800 } as const

/** Intent: wait until the harness publishes a settled (ready or error) engrave outcome. */
async function waitForHarnessSettled(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => window.__notationHarness && window.__notationHarness.state !== 'pending',
  )
}

// @test-link [[module_notation_layout_preflight]]
test('a phrase that fits one system stays one system on a phone viewport', async ({ page }) => {
  await page.setViewportSize(PHONE_VIEWPORT)
  await page.goto('/?fixture=simple&width=700')
  await waitForHarnessSettled(page)

  const harnessState = await page.evaluate(() => window.__notationHarness)
  expect(harnessState.state).toBe('ready')
  expect(harnessState.engraved?.systemCount).toBe(1)
  await expect(page.locator('g.measure-slot[data-system-index="0"]')).toHaveCount(4)
  await expect(page.locator('g.measure-slot[data-system-index="1"]')).toHaveCount(0)
})

// @test-link [[module_notation_layout_preflight]]
test('a denser phrase falls back to two aligned systems on a phone viewport', async ({ page }) => {
  await page.setViewportSize(PHONE_VIEWPORT)
  await page.goto('/?fixture=dense&width=700')
  await waitForHarnessSettled(page)

  const harnessState = await page.evaluate(() => window.__notationHarness)
  expect(harnessState.state).toBe('ready')
  expect(harnessState.engraved?.systemCount).toBe(2)

  await expect(page.locator('svg.staff-svg')).toHaveCount(1)
  await expect(page.locator('g.measure-slot')).toHaveCount(4)
  await expect(page.locator('g.measure-slot[data-system-index="0"]')).toHaveCount(2)
  await expect(page.locator('g.measure-slot[data-system-index="1"]')).toHaveCount(2)

  const counts = await page.evaluate(() => ({
    clef: document.querySelectorAll('svg.staff-svg g.vf-clef').length,
    timesignature: document.querySelectorAll('svg.staff-svg g.vf-timesignature').length,
    keysignature: document.querySelectorAll('svg.staff-svg g.vf-keysignature').length,
  }))
  expect(counts.clef).toBe(2)
  expect(counts.timesignature).toBe(1)
  expect(counts.keysignature).toBe(2)

  const bounds = await page.evaluate(() => {
    const container = document.getElementById('app')!
    const containerBox = container.getBoundingClientRect()
    const svgBox = document.querySelector('svg.staff-svg')!.getBoundingClientRect()
    const groupBoxes = Array.from(document.querySelectorAll('g.measure-slot')).map((group) =>
      group.getBoundingClientRect(),
    )
    return {
      viewportHeight: window.innerHeight,
      scrollWidth: container.scrollWidth,
      clientWidth: container.clientWidth,
      containerBox,
      svgBox,
      groupBoxes,
    }
  })

  // Contained horizontally and vertically, no horizontal scroll, height fits the viewport.
  expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.clientWidth)
  expect(bounds.svgBox.left).toBeGreaterThanOrEqual(bounds.containerBox.left - 1)
  expect(bounds.svgBox.right).toBeLessThanOrEqual(bounds.containerBox.right + 1)
  expect(bounds.svgBox.height).toBeLessThanOrEqual(bounds.viewportHeight)

  const [bar1, bar2, bar3, bar4] = bounds.groupBoxes
  // Bar 3 aligns under bar 1 and bar 4 under bar 2: same left edge and same width, within 1px.
  expect(Math.abs(bar3!.left - bar1!.left)).toBeLessThanOrEqual(1)
  expect(Math.abs(bar4!.left - bar2!.left)).toBeLessThanOrEqual(1)
  // Bar 1 and bar 3 both carry the full leading (clef/key[/time]) so their total slot width
  // matches; bar 2 and bar 4 are content-only tail measures, so theirs matches each other.
  expect(Math.abs(bar3!.width - bar1!.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(bar4!.width - bar2!.width)).toBeLessThanOrEqual(1)
  // Line two sits below line one.
  expect(bar3!.top).toBeGreaterThan(bar1!.top)
})

// @test-link [[module_notation_layout_preflight]]
test('a tie crossing the bar 2 -> 3 line break draws as two partial ties', async ({ page }) => {
  await page.setViewportSize(PHONE_VIEWPORT)
  await page.goto('/?fixture=denseTie&width=700')
  await waitForHarnessSettled(page)

  const harnessState = await page.evaluate(() => window.__notationHarness)
  expect(harnessState.state).toBe('ready')
  expect(harnessState.engraved?.systemCount).toBe(2)

  const tieCount = await page.evaluate(
    () => document.querySelectorAll('svg.staff-svg g.vf-stavetie').length,
  )
  // One logical tie crossing the line break is split into two independent partial StaveTies.
  expect(tieCount).toBe(2)
})

// @test-link [[module_notation_layout_preflight]]
test('the same dense phrase and width fails at a desktop viewport, proving the fallback is phone-only', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP_VIEWPORT)
  await page.goto('/?fixture=dense&width=700')
  await waitForHarnessSettled(page)

  const harnessState = await page.evaluate(() => window.__notationHarness)
  expect(harnessState.state).toBe('error')
  expect(harnessState.errorCode).toBe('notation_below_legibility_floor')
  await expect(page.locator('svg.staff-svg')).toHaveCount(0)
})

// @test-link [[module_notation_layout_preflight]]
test('a phrase too dense even for two systems fails typed, with no svg and no description', async ({
  page,
}) => {
  await page.setViewportSize(PHONE_VIEWPORT)
  await page.goto('/?fixture=dense&width=100')
  await waitForHarnessSettled(page)

  const harnessState = await page.evaluate(() => window.__notationHarness)
  expect(harnessState.state).toBe('error')
  expect(harnessState.errorCode).toBe('notation_below_legibility_floor')
  await expect(page.locator('svg.staff-svg')).toHaveCount(0)
  await expect(page.locator('.score-description')).toHaveCount(0)
})
