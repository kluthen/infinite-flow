/**
 * Regression coverage for beamed notes drawing an individual flag as well as their beam: VexFlow
 * only suppresses a note's flag (`StaveNote.shouldDrawFlag`, checked at draw time) if that note's
 * `beam` is already attached when it draws, so the engravers must build every measure's `Beam`
 * before any voice in the phrase is formatted or drawn, not after. Exercised against the harness's
 * `simple` fixture measure 1 (index 1): a dotted-quarter, an unbeamed eighth, two beamed eighths
 * (`beamGroups: [[2, 3]]`), then a quarter -- so both the beamed and unbeamed cases sit side by side
 * in the same measure.
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
 * Intent: whether each stavenote in measure-slot `measureIndex`, in written-event order, drew a
 * flag glyph. VexFlow only opens a `g.vf-flag` group (nested inside the stavenote's own
 * `g.vf-stavenote`) when `StemmableNote.drawFlag`'s `shouldDrawFlag()` check passes, which is false
 * for a beamed note -- see node_modules/vexflow build/esm/src/stavenote.js.
 */
async function flagPresence(
  page: import('@playwright/test').Page,
  measureIndex: number,
): Promise<boolean[]> {
  return page.evaluate((index) => {
    const measure = document.querySelector(`g.measure-slot[data-measure-index="${index}"]`)
    if (!measure) throw new Error(`measure-slot ${index} not found`)
    return Array.from(measure.querySelectorAll('g.vf-stavenote')).map(
      (note) => note.querySelector('g.vf-flag') !== null,
    )
  }, measureIndex)
}

// @test-link [[module_notation_layout_preflight]]
test('a beamed eighth draws no flag while an unbeamed eighth in the same measure still does', async ({
  page,
}) => {
  await page.goto('/?fixture=simple&width=1200')
  await waitForHarnessSettled(page)
  expect((await page.evaluate(() => window.__notationHarness)).state).toBe('ready')

  const flags = await flagPresence(page, 1)
  // [dotted quarter, unbeamed eighth, beamed eighth, beamed eighth, quarter]
  expect(flags).toEqual([false, true, false, false, false])

  await expect(page.locator('g.measure-slot[data-measure-index="1"] g.vf-beam')).toHaveCount(1)
})
