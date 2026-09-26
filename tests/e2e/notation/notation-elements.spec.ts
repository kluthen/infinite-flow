/**
 * Asserts the actual VexFlow 5 SVG element vocabulary the engraving adapter produces, against the
 * dense harness fixture (a full sixteenth grid: rests-free but exercising beams, accidentals, a
 * mid-bar chord change and a barline every measure). Class names below were verified against
 * VexFlow 5.0.0's real rendered DOM (not guessed): every element category that calls
 * `context.openGroup(...)` gets a `vf-<category>` class (clef, keysignature, timesignature,
 * stavenote, stavebarline, stavetie, beam, chordsymbol); `Accidental` is the one modifier that
 * never opens its own group -- it draws a bare second `<text>` sibling inside the notehead's own
 * `.vf-notehead` group (via `Element.renderText` -> `SVGContext.fillText`, with no `openGroup`
 * call), so accidental presence is asserted via that per-notehead text count, not a `.vf-accidental`
 * class (there is no such class in this VexFlow version).
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
 * The dense fixture's known shape (tests/e2e/notation-harness/fixtures.ts, buildDensePhrase): four
 * measures of 16 sixteenth notes each (no rests), 6 displayed accidentals and one beam group of 4
 * per measure, a chord symbol at tick 0 ('C') and tick 8 ('G7') of every measure.
 */
const EVENTS_PER_MEASURE = 16
const MEASURES = 4
const ACCIDENTALS_PER_MEASURE = 6
const BEAM_GROUPS_PER_MEASURE = 4
const CHORDS_PER_MEASURE = 2

test.beforeEach(async ({ page }) => {
  await page.goto('/?fixture=dense&width=1800')
  await waitForHarnessSettled(page)
  expect((await page.evaluate(() => window.__notationHarness)).state).toBe('ready')
})

test('engraves exactly one svg with four measure-slot groups in one horizontal band', async ({
  page,
}) => {
  await expect(page.locator('svg.staff-svg')).toHaveCount(1)
  await expect(page.locator('g.measure-slot')).toHaveCount(MEASURES)

  const bounds = await page.evaluate(() => {
    const container = document.getElementById('app')!
    const svg = document.querySelector('svg.staff-svg')!.getBoundingClientRect()
    const containerBox = container.getBoundingClientRect()
    const groupBoxes = Array.from(document.querySelectorAll('g.measure-slot')).map((group) =>
      group.getBoundingClientRect(),
    )
    return {
      scrollWidth: container.scrollWidth,
      clientWidth: container.clientWidth,
      svg,
      containerBox,
      groupBoxes,
    }
  })

  expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.clientWidth)
  expect(bounds.svg.left).toBeGreaterThanOrEqual(bounds.containerBox.left - 1)
  expect(bounds.svg.right).toBeLessThanOrEqual(bounds.containerBox.right + 1)
  expect(bounds.svg.top).toBeGreaterThanOrEqual(bounds.containerBox.top - 1)
  expect(bounds.svg.bottom).toBeLessThanOrEqual(bounds.containerBox.bottom + 1)

  const lowestTop = Math.max(...bounds.groupBoxes.map((box) => box.top))
  const highestBottom = Math.min(...bounds.groupBoxes.map((box) => box.bottom))
  expect(lowestTop).toBeLessThanOrEqual(highestBottom)
})

test('draws exactly one clef, one time signature and one (empty, C major) key signature', async ({
  page,
}) => {
  const counts = await page.evaluate(() => ({
    clef: document.querySelectorAll('svg.staff-svg g.vf-clef').length,
    timesignature: document.querySelectorAll('svg.staff-svg g.vf-timesignature').length,
    keysignature: document.querySelectorAll('svg.staff-svg g.vf-keysignature').length,
  }))
  expect(counts.clef).toBe(1)
  expect(counts.timesignature).toBe(1)
  // VexFlow always opens a keysignature group for `addKeySignature('C')`, even with zero
  // accidentals to draw; it carries no glyphs for the no-sharps-or-flats case.
  expect(counts.keysignature).toBe(1)
})

test('draws every stavenote, beam and barline', async ({ page }) => {
  const counts = await page.evaluate(() => ({
    stavenote: document.querySelectorAll('svg.staff-svg g.vf-stavenote').length,
    beam: document.querySelectorAll('svg.staff-svg g.vf-beam').length,
    barline: document.querySelectorAll('svg.staff-svg g.vf-stavebarline').length,
  }))
  expect(counts.stavenote).toBe(EVENTS_PER_MEASURE * MEASURES)
  expect(counts.beam).toBe(BEAM_GROUPS_PER_MEASURE * MEASURES)
  // Each of the four staves draws its own begin and end barline group.
  expect(counts.barline).toBe(MEASURES * 2)
})

test('draws every displayed accidental as a second text glyph inside its notehead group', async ({
  page,
}) => {
  // A direct-child selector: chord symbols also nest inside the notehead group they're attached
  // to (as their own `.vf-chordsymbol` subgroup), so a descendant selector would over-count them.
  const noteheadTextCount = await page.evaluate(
    () => document.querySelectorAll('svg.staff-svg g.vf-notehead > text').length,
  )
  expect(noteheadTextCount).toBe(EVENTS_PER_MEASURE * MEASURES + ACCIDENTALS_PER_MEASURE * MEASURES)
})

test("draws every chord symbol with text equal to the written model's chord text", async ({
  page,
}) => {
  const chordTexts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('svg.staff-svg g.vf-chordsymbol')).map(
      (group) => group.textContent,
    ),
  )
  expect(chordTexts).toHaveLength(CHORDS_PER_MEASURE * MEASURES)
  expect(chordTexts).toEqual(Array(MEASURES).fill(['C', 'G7']).flat())
})

// @test-link [[module_notation_layout_preflight]]
test('publishes an accessible description resolved by aria-describedby, with a summary and four measure entries', async ({
  page,
}) => {
  const svg = page.locator('svg.staff-svg')
  const describedBy = await svg.getAttribute('aria-describedby')
  expect(describedBy).not.toBeNull()
  const ariaLabel = await svg.getAttribute('aria-label')
  expect(ariaLabel).not.toBeNull()

  const description = page.locator(`#${describedBy}`)
  await expect(description).toHaveCount(1)
  await expect(description.locator('ol > li')).toHaveCount(4)

  const summaryText = (await description.locator('p').textContent()) ?? ''
  expect(summaryText).toContain('Written notation')
  expect(summaryText).toContain('no sharps or flats')
})
