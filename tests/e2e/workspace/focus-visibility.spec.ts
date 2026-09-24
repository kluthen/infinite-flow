/**
 * Keyboard focus stays visible through the first several tab stops, and the roving-tabindex
 * radiogroups each take exactly one tab stop rather than one per option. Tooling check: no ATD link.
 */
import { expect, test } from '@playwright/test'

import { gotoWorkspace } from './helpers'

const TAB_STOPS_TO_CHECK = 8

/** Intent: read the focused element's computed focus-indicator styles and its own identity. */
async function readFocusIndicator(
  page: import('@playwright/test').Page,
): Promise<{ boxShadow: string; outlineStyle: string; identity: string }> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    if (!el) throw new Error('No element has focus.')
    const style = getComputedStyle(el)
    return {
      boxShadow: style.boxShadow,
      outlineStyle: style.outlineStyle,
      identity: `${el.tagName}#${el.id}.${el.className}:${el.textContent?.trim().slice(0, 20)}`,
    }
  })
}

test('the first several tab stops each show a visible focus indicator', async ({ page }) => {
  await gotoWorkspace(page)

  const seenIdentities = new Set<string>()

  for (let stop = 0; stop < TAB_STOPS_TO_CHECK; stop += 1) {
    await page.keyboard.press('Tab')
    const focused = await readFocusIndicator(page)

    const hasIndicator = focused.boxShadow !== 'none' || focused.outlineStyle !== 'none'
    expect(
      hasIndicator,
      `Tab stop ${stop} (${focused.identity}) has no visible focus indicator`,
    ).toBe(true)

    // A roving-tabindex radiogroup must surface as exactly one tab stop, not one per option.
    expect(
      seenIdentities.has(focused.identity),
      `Tab stop ${stop} revisited ${focused.identity}: a group is taking more than one tab stop`,
    ).toBe(false)
    seenIdentities.add(focused.identity)
  }
})

test('an element loses its focus indicator once focus moves elsewhere', async ({ page }) => {
  await gotoWorkspace(page)

  await page.keyboard.press('Tab')
  const firstStopBoxShadow = await page.evaluate(
    () => getComputedStyle(document.activeElement as HTMLElement).boxShadow,
  )
  const firstStopHandle = await page.evaluateHandle(() => document.activeElement)

  await page.keyboard.press('Tab')
  const previousBoxShadow = await firstStopHandle.evaluate(
    (el) => getComputedStyle(el as HTMLElement).boxShadow,
  )

  expect(previousBoxShadow).not.toBe(firstStopBoxShadow)
  expect(previousBoxShadow).toBe('none')
})
