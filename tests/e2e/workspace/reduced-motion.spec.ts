/**
 * Under `prefers-reduced-motion: reduce`, staff-content entrance and button/segment feedback
 * transitions collapse to the reduced-motion duration token rather than their normal durations.
 * Tooling check: no ATD link.
 */
import { expect, test } from '@playwright/test'

import { generateAndAwaitReady, gotoWorkspace } from './helpers'

/** The reduced-motion CSS rule forces every animation/transition to `--duration-reduced` (1ms). */
const REDUCED_MOTION_CEILING_MS = 2

/** Intent: parse a computed CSS duration string (e.g. "0.24s, 0.16s") into milliseconds. */
function parseDurationsMs(value: string): number[] {
  return value.split(',').map((part) => {
    const trimmed = part.trim()
    return trimmed.endsWith('ms') ? parseFloat(trimmed) : parseFloat(trimmed) * 1000
  })
}

test('staff-content entrance and button feedback resolve to about 0 duration', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoWorkspace(page)
  await generateAndAwaitReady(page)

  const staffContentDurations = await page.locator('.staff-content').evaluate((el) => {
    const style = getComputedStyle(el)
    return { animation: style.animationDuration, transition: style.transitionDuration }
  })
  for (const ms of parseDurationsMs(staffContentDurations.animation)) {
    expect(ms).toBeLessThanOrEqual(REDUCED_MOTION_CEILING_MS)
  }

  const buttonDurations = await page.locator('.btn-primary').evaluate((el) => {
    const style = getComputedStyle(el)
    return style.transitionDuration
  })
  for (const ms of parseDurationsMs(buttonDurations)) {
    expect(ms).toBeLessThanOrEqual(REDUCED_MOTION_CEILING_MS)
  }

  const segmentDurations = await page
    .locator('.segment[aria-checked="true"]')
    .first()
    .evaluate((el) => getComputedStyle(el).transitionDuration)
  for (const ms of parseDurationsMs(segmentDurations)) {
    expect(ms).toBeLessThanOrEqual(REDUCED_MOTION_CEILING_MS)
  }
})
