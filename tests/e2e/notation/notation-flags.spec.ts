/**
 * Regression coverage for beamed notes drawing an individual flag as well as their beam: VexFlow
 * only suppresses a note's flag (`StaveNote.shouldDrawFlag`, checked at draw time) if that note's
 * `beam` is already attached when it draws, so the engravers must build every measure's `Beam`
 * before any voice in the phrase is formatted or drawn, not after. Exercised against the harness's
 * `simple` fixture measure 1 (index 1): a dotted-quarter, an unbeamed eighth, two beamed eighths
 * (`beamGroups: [[2, 3]]`), then a quarter -- so both the beamed and unbeamed cases sit side by side
 * in the same measure. It also checks every drawn stem's direction against the written phrase's
 * stem-direction rule, on the `stemDirections` fixture (notes on both sides of the middle line,
 * single and beamed) and the `simple` one (every note above the middle line).
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

type DrawnStem = 'up' | 'down' | null

/**
 * Intent: the drawn direction of each stavenote's stem in every measure-slot, in written-event
 * order: 'up' when the stem's box centre lies above its notehead's centre, 'down' when below, null
 * for a glyph with no stem (a rest or whole note). A note's stem is the part tagged
 * `data-note-part="stem"` with its notehead's `data-note-id` in the same measure-slot, wherever it
 * is drawn there (inside its own stavenote, or inside the beam for a beamed note); tied glyphs
 * share one id, so the stem horizontally nearest the notehead is its own.
 */
async function drawnStems(page: import('@playwright/test').Page): Promise<DrawnStem[][]> {
  return page.evaluate(() => {
    const centre = (element: Element): { x: number; y: number } => {
      const box = element.getBoundingClientRect()
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
    }
    const slots = Array.from(document.querySelectorAll('g.measure-slot')).sort(
      (a, b) =>
        Number(a.getAttribute('data-measure-index')) - Number(b.getAttribute('data-measure-index')),
    )
    return slots.map((slot) =>
      Array.from(slot.querySelectorAll(':scope > .vf-stavenote')).map((note) => {
        const head = note.querySelector('[data-note-part="notehead"]')
        if (head === null) return null
        const key = head.getAttribute('data-note-id')!
        const headCentre = centre(head)
        const stemCentres = Array.from(
          slot.querySelectorAll(`[data-note-id="${key}"][data-note-part="stem"]`),
        ).map(centre)
        if (stemCentres.length === 0) return null
        const own = stemCentres.reduce((nearest, stem) =>
          Math.abs(stem.x - headCentre.x) < Math.abs(nearest.x - headCentre.x) ? stem : nearest,
        )
        return own.y < headCentre.y ? 'up' : 'down'
      }),
    )
  })
}

// @test-link [[module_notation_stem_direction]]
test('stems a note below the middle line up, one on or above it down, and a beam group together', async ({
  page,
}) => {
  await page.goto('/?fixture=stemDirections&width=1600')
  await waitForHarnessSettled(page)
  expect((await page.evaluate(() => window.__notationHarness)).state).toBe('ready')

  expect(await drawnStems(page)).toEqual([
    // quarter D4, quarter D5, beamed eighths E5 F5, beamed eighths E4 F4
    ['up', 'down', 'down', 'down', 'up', 'up'],
    // beamed sixteenths A5 G4 F4 E4 (far A5 above), beamed D5 E5 F5 C4 (far C4 below), half C4
    ['down', 'down', 'down', 'down', 'up', 'up', 'up', 'up', 'up'],
    [null],
    [null],
  ])
})

// @test-link [[module_notation_stem_direction]]
test('stems every note of the simple fixture down, all of them above the middle line', async ({
  page,
}) => {
  await page.goto('/?fixture=simple&width=1200')
  await waitForHarnessSettled(page)
  expect((await page.evaluate(() => window.__notationHarness)).state).toBe('ready')

  expect(await drawnStems(page)).toEqual([
    ['down', null],
    ['down', 'down', 'down', 'down', 'down'],
    ['down', null, 'down'],
    [null],
  ])
})
