/**
 * End-to-end coverage of the VexFlow engraving adapter against the test-only notation harness:
 * every fixture reaches a single-system, non-overflowing ready state at a normal width; a dense
 * fixture below the legibility floor fails with a typed error and no visible staff; resizing
 * transitions ready/error/ready without ever leaving stale notation on screen; the bundled Bravura
 * font is actually loaded; and no network request escapes the bundled, offline-capable harness.
 */
import { expect, test } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:4174' })

/** Intent: wait until the harness publishes a settled (ready or error) engrave outcome. */
async function waitForHarnessSettled(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => window.__notationHarness && window.__notationHarness.state !== 'pending',
  )
}

/**
 * Each fixture's ready-state width: the three lighter fixtures fit comfortably at a normal desktop
 * width; the dense fixture (a full sixteenth grid with beams, accidentals and a mid-bar chord
 * change on every measure) is deliberately the worst case and only fits a legible system past
 * ~1707px (see the CALIBRATION report), so it is exercised at a wider container here.
 */
const FIXTURES_AT_WIDTH = [
  ['simple', 1200],
  ['sharps6', 1200],
  ['flats5', 1200],
  ['dense', 1800],
] as const

for (const [fixture, width] of FIXTURES_AT_WIDTH) {
  test(`${fixture} fixture engraves one non-overflowing staff system at ${width}px`, async ({
    page,
  }) => {
    await page.goto(`/?fixture=${fixture}&width=${width}`)
    await waitForHarnessSettled(page)

    const harnessState = await page.evaluate(() => window.__notationHarness)
    expect(harnessState.state).toBe('ready')

    await expect(page.locator('svg.staff-svg')).toHaveCount(1)
    await expect(page.locator('g.measure-slot')).toHaveCount(4)

    const bounds = await page.evaluate(() => {
      const containerWidth = document.getElementById('app')!.clientWidth
      const svg = document.querySelector('svg.staff-svg')!
      const svgBox = svg.getBoundingClientRect()
      const groupBoxes = Array.from(document.querySelectorAll('g.measure-slot')).map((group) => {
        const box = group.getBoundingClientRect()
        return { top: box.top, bottom: box.bottom }
      })
      return { containerWidth, svgWidth: svgBox.width, groupBoxes }
    })

    expect(bounds.svgWidth).toBeLessThanOrEqual(bounds.containerWidth + 1)
    // One system, not several stacked lines: every measure's stave-line band overlaps the others'.
    const lowestTop = Math.max(...bounds.groupBoxes.map((box) => box.top))
    const highestBottom = Math.min(...bounds.groupBoxes.map((box) => box.bottom))
    expect(lowestTop).toBeLessThanOrEqual(highestBottom)
  })
}

// @test-link [[module_notation_layout_preflight]]
test('a dense fixture below the legibility floor fails with a typed error, no visible staff and no description', async ({
  page,
}) => {
  await page.goto('/?fixture=dense&width=300')
  await waitForHarnessSettled(page)

  const harnessState = await page.evaluate(() => window.__notationHarness)
  expect(harnessState.state).toBe('error')
  expect(harnessState.errorCode).toBe('notation_below_legibility_floor')
  await expect(page.locator('svg.staff-svg')).toHaveCount(0)
  await expect(page.locator('.score-description')).toHaveCount(0)
})

// @test-link [[module_notation_layout_preflight]]
test('a ready score that becomes a layout failure clears both the staff and its description', async ({
  page,
}) => {
  await page.goto('/?fixture=simple&width=1200')
  await waitForHarnessSettled(page)
  expect((await page.evaluate(() => window.__notationHarness)).state).toBe('ready')
  await expect(page.locator('.score-description')).toHaveCount(1)

  await page.evaluate(() => {
    window.__notationHarness = { state: 'pending' }
    document.getElementById('app')!.style.width = '300px'
  })
  await waitForHarnessSettled(page)

  const harnessState = await page.evaluate(() => window.__notationHarness)
  expect(harnessState.state).toBe('error')
  expect(harnessState.errorCode).toBe('notation_below_legibility_floor')
  await expect(page.locator('svg.staff-svg')).toHaveCount(0)
  await expect(page.locator('.score-description')).toHaveCount(0)
})

test('resizing the container transitions ready to error and back to ready', async ({ page }) => {
  await page.goto('/?fixture=simple&width=1200')
  await waitForHarnessSettled(page)
  expect((await page.evaluate(() => window.__notationHarness)).state).toBe('ready')

  await page.evaluate(() => {
    window.__notationHarness = { state: 'pending' }
    document.getElementById('app')!.style.width = '300px'
  })
  await waitForHarnessSettled(page)
  expect((await page.evaluate(() => window.__notationHarness)).state).toBe('error')
  await expect(page.locator('svg.staff-svg')).toHaveCount(0)

  await page.evaluate(() => {
    window.__notationHarness = { state: 'pending' }
    document.getElementById('app')!.style.width = '1200px'
  })
  await waitForHarnessSettled(page)
  expect((await page.evaluate(() => window.__notationHarness)).state).toBe('ready')
  await expect(page.locator('svg.staff-svg')).toHaveCount(1)
})

test('the bundled Bravura music font is actually loaded before engraving', async ({ page }) => {
  await page.goto('/?fixture=simple&width=1200')
  await waitForHarnessSettled(page)

  const bravuraLoaded = await page.evaluate(() => document.fonts.check('30px Bravura'))
  expect(bravuraLoaded).toBe(true)
})

test('engraves fully offline: no request to a non-local origin is ever attempted', async ({
  page,
}) => {
  const externalRequests: string[] = []
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.hostname !== '127.0.0.1') {
      externalRequests.push(url.href)
      void route.abort('failed')
      return
    }
    void route.continue()
  })

  await page.goto('/?fixture=simple&width=1200')
  await waitForHarnessSettled(page)

  expect((await page.evaluate(() => window.__notationHarness)).state).toBe('ready')
  expect(externalRequests).toEqual([])
})
