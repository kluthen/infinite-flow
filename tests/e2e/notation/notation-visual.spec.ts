/**
 * Visual regression coverage for the engraved staff, chromium-only (font antialiasing and subpixel
 * layout differ across browser engines, so cross-browser screenshot comparison is not meaningful
 * here): three fixed generated seeds, one per instrument profile (each engraving in that
 * instrument's own written pitch), at a normal desktop width, plus one fixed phone-viewport case
 * that exercises the two-system fallback layout. Baselines are generated with `--update-snapshots`
 * and must then re-run stable.
 */
import { expect, test } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:4174' })

/** Intent: wait until the harness publishes a settled (ready or error) engrave outcome. */
async function waitForHarnessSettled(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => window.__notationHarness && window.__notationHarness.state !== 'pending',
  )
}

const CASES = [
  { name: 'concert', profile: 'c-keyboard', seed: 21 },
  { name: 'bflat-tenor', profile: 'bb-tenor', seed: 22 },
  { name: 'eflat-alto', profile: 'eb-alto', seed: 23 },
] as const

for (const { name, profile, seed } of CASES) {
  test(`staff-content matches its baseline for a generated ${name} phrase`, async ({ page }) => {
    const url =
      `/?source=generated&seed=${seed}&width=1200` +
      '&tonal=C&collection=Major&density=Eighth&variety=Strict&syncopation=Straight&silence=Conversational' +
      `&profile=${profile}&register=Middle`
    await page.goto(url)
    await waitForHarnessSettled(page)
    expect((await page.evaluate(() => window.__notationHarness)).state).toBe('ready')

    await expect(page.locator('.staff-content')).toHaveScreenshot(`${name}-staff-content.png`)
  })
}

// @test-link [[module_notation_layout_preflight]]
test('two-system phone layout matches its baseline', async ({ page }) => {
  await page.setViewportSize({ width: 740, height: 360 })
  await page.goto('/?fixture=dense&width=700')
  await waitForHarnessSettled(page)
  expect((await page.evaluate(() => window.__notationHarness)).state).toBe('ready')

  await expect(page.locator('.staff-content')).toHaveScreenshot(
    'two-system-phone-staff-content.png',
  )
})
