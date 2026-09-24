/**
 * Every interactive control (buttons, radios, the tempo spinbutton) meets the 44x44 CSS px minimum
 * target size, in both the landscape-mobile and wide-desktop viewports. Tooling check: no ATD link.
 */
import { expect, test } from '@playwright/test'

import { gotoWorkspace } from './helpers'

const MIN_TARGET_PX = 44
/** Sub-pixel layout rounding tolerance so a 43.98px box is not a false failure. */
const TOLERANCE_PX = 0.5

const VIEWPORTS = [
  { name: 'landscape mobile', width: 800, height: 400 },
  { name: 'wide desktop', width: 1600, height: 900 },
] as const

for (const viewport of VIEWPORTS) {
  test(`${viewport.name}: every interactive control is at least 44x44px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await gotoWorkspace(page)

    const targets = await page.locator('button, [role="radio"], [role="spinbutton"]').all()
    const offenders: string[] = []

    for (const target of targets) {
      const box = await target.boundingBox()
      if (box === null) continue
      if (box.width + TOLERANCE_PX < MIN_TARGET_PX || box.height + TOLERANCE_PX < MIN_TARGET_PX) {
        const label = await target.evaluate(
          (el) => el.getAttribute('aria-label') ?? el.textContent?.trim() ?? el.tagName,
        )
        offenders.push(`"${label}": ${box.width.toFixed(1)}x${box.height.toFixed(1)}px`)
      }
    }

    expect(offenders, `Elements under 44x44px:\n${offenders.join('\n')}`).toEqual([])
  })
}
