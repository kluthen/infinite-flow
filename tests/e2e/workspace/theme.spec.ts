/**
 * Theme is presentation-only: switching Light/Dark/System sets or clears `html[data-theme]`
 * without redrawing or regenerating the phrase. Since v3.0 (chunk 7b) the choice is saved in the
 * app's IndexedDB database as the player makes it and comes back after a reload; nothing is
 * written to localStorage or sessionStorage.
 */
import { expect, test } from '@playwright/test'

import { databaseSettings } from '../storage/storage-helpers'
import { generateAndAwaitReady, gotoWorkspace, radio } from './helpers'

// @test-link [[rule_presentation_preference_preserves_phrase]]
test('Light/Dark set data-theme and never redraw or regenerate the score', async ({ page }) => {
  await gotoWorkspace(page)
  await generateAndAwaitReady(page)

  const svgBefore = await page.locator('svg.staff-svg').innerHTML()

  await radio(page, 'Presentation theme', 'Dark').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.locator('svg.staff-svg').innerHTML()).toBe(svgBefore)

  await radio(page, 'Presentation theme', 'Light').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await page.locator('svg.staff-svg').innerHTML()).toBe(svgBefore)
})

// @test-link [[rule_presentation_preference_preserves_phrase]]
test('System removes the data-theme override', async ({ page }) => {
  await gotoWorkspace(page)

  await radio(page, 'Presentation theme', 'Dark').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await radio(page, 'Presentation theme', 'System').click()
  await expect(page.locator('html')).not.toHaveAttribute('data-theme')
})

/**
 * Intent: the `--color-staff` custom property's computed value as an actual `rgb()` string, so it
 * compares directly against `getComputedStyle(...).fill` / `.stroke` on the real SVG (a raw
 * `--color-staff` read would still be the unresolved hex/`var()` source text).
 */
async function computedStaffColor(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => {
    const probe = document.createElement('div')
    probe.style.color = 'var(--color-staff)'
    document.body.appendChild(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    return color
  })
}

/**
 * Intent: every element under `svg.staff-svg` whose computed fill or stroke paints (is not `none`)
 * but does not equal `expectedColor`, described as `<tag> fill=... stroke=...` for a readable
 * failure message.
 */
async function unrecoloredStaffElements(
  page: import('@playwright/test').Page,
  expectedColor: string,
): Promise<string[]> {
  return page.evaluate((expected) => {
    const svg = document.querySelector('svg.staff-svg')
    if (!svg) throw new Error('svg.staff-svg not found')
    const offenders: string[] = []
    svg.querySelectorAll('*').forEach((el) => {
      const style = getComputedStyle(el)
      const fillOffends = style.fill !== 'none' && style.fill !== expected
      const strokeOffends = style.stroke !== 'none' && style.stroke !== expected
      if (fillOffends || strokeOffends) {
        offenders.push(`${el.tagName} fill=${style.fill} stroke=${style.stroke}`)
      }
    })
    return offenders
  }, expectedColor)
}

// @test-link [[rule_presentation_preference_preserves_phrase]]
test('every painted staff element matches --color-staff in both Light and Dark', async ({
  page,
}) => {
  await gotoWorkspace(page)
  await generateAndAwaitReady(page)

  await radio(page, 'Presentation theme', 'Dark').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const darkColor = await computedStaffColor(page)
  expect(await unrecoloredStaffElements(page, darkColor)).toEqual([])

  await radio(page, 'Presentation theme', 'Light').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  const lightColor = await computedStaffColor(page)
  expect(lightColor).not.toBe(darkColor)
  expect(await unrecoloredStaffElements(page, lightColor)).toEqual([])
})

// @test-link [[rule_settings_saved_on_change]]
test('the theme choice comes back after a reload, and Web Storage stays empty', async ({
  page,
  context,
}) => {
  await gotoWorkspace(page)

  await radio(page, 'Presentation theme', 'Dark').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  // The save is asynchronous: the reload must read it, not race it.
  await expect.poll(() => databaseSettings(page)).toMatchObject({ theme: 'Dark' })

  await page.reload()

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(radio(page, 'Presentation theme', 'Dark')).toHaveAttribute('aria-checked', 'true')

  const storageState = await context.storageState()
  const origin = storageState.origins.find(
    (entry) => entry.origin === page.url().replace(/\/$/, ''),
  )
  expect(origin?.localStorage ?? []).toEqual([])

  // Reading this browser-persistence global from within the page context proves nothing is ever
  // written to it; it is not a use of it. The production no-restricted-globals ban only scopes to
  // src/**, so no suppression is needed here.
  const sessionStorageLength = await page.evaluate(() => sessionStorage.length)
  expect(sessionStorageLength).toBe(0)
})
