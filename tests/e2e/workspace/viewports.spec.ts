/**
 * The three supported landscape breakpoints (mobile, tablet, desktop): no horizontal overflow, the
 * engraved score visible after generation, a representative control reachable and operable, and (as
 * the narrowest, most overflow-prone breakpoint is where a squeezed controls sidebar would first
 * break) that regenerating and switching notation display both stay reachable and overflow-free too.
 */
import { expect, test } from '@playwright/test'

import { generateAndAwaitReady, gotoWorkspace, primaryButton, radio } from './helpers'

/** Intent: the current document has no horizontal scroll (within a 1px rounding tolerance). */
async function expectNoHorizontalOverflow(page: import('@playwright/test').Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(overflow.scrollWidth, 'document must not overflow horizontally').toBeLessThanOrEqual(
    overflow.clientWidth + 1,
  )
}

const VIEWPORTS = [
  { name: 'landscape mobile', width: 800, height: 400 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'wide desktop', width: 1600, height: 900 },
] as const

for (const viewport of VIEWPORTS) {
  // @test-link [[req_landscape_phrase_workspace]]
  test(`${viewport.name} (${viewport.width}x${viewport.height}): no overflow, score visible, controls reachable`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await gotoWorkspace(page)
    await expectNoHorizontalOverflow(page)

    await generateAndAwaitReady(page)
    await expect(page.locator('svg.staff-svg')).toBeVisible()
    await expectNoHorizontalOverflow(page)

    const tonalCenter = radio(page, 'Tonal center', 'C')
    await tonalCenter.scrollIntoViewIfNeeded()
    await expect(tonalCenter).toBeVisible()
    await expect(tonalCenter).toBeEnabled()

    const regenerateButton = primaryButton(page)
    await regenerateButton.scrollIntoViewIfNeeded()
    await expect(regenerateButton).toBeVisible()
    await expect(regenerateButton).toBeEnabled()
    await generateAndAwaitReady(page)
    await expectNoHorizontalOverflow(page)

    for (const mode of ['Concert', 'E-flat', 'B-flat'] as const) {
      const modeRadio = radio(page, 'Display notation', mode)
      await modeRadio.scrollIntoViewIfNeeded()
      await expect(modeRadio).toBeVisible()
      await modeRadio.click()
      await expect(modeRadio).toHaveAttribute('aria-checked', 'true')
      await expect(page.locator('svg.staff-svg')).toBeVisible()
      await expectNoHorizontalOverflow(page)
    }
  })
}
