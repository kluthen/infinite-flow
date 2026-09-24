/**
 * The three supported landscape breakpoints (mobile, tablet, desktop): no horizontal overflow, the
 * engraved score visible after generation, and a representative control reachable and operable.
 */
import { expect, test } from '@playwright/test'

import { generateAndAwaitReady, gotoWorkspace, radio } from './helpers'

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

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(overflow.scrollWidth, 'document must not overflow horizontally').toBeLessThanOrEqual(
      overflow.clientWidth + 1,
    )

    await generateAndAwaitReady(page)
    await expect(page.locator('svg.staff-svg')).toBeVisible()

    const overflowAfterGeneration = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(overflowAfterGeneration.scrollWidth).toBeLessThanOrEqual(
      overflowAfterGeneration.clientWidth + 1,
    )

    const tonalCenter = radio(page, 'Tonal center', 'C')
    await tonalCenter.scrollIntoViewIfNeeded()
    await expect(tonalCenter).toBeVisible()
    await expect(tonalCenter).toBeEnabled()
  })
}
