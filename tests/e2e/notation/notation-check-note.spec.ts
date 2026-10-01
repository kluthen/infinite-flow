/**
 * End-to-end coverage of `engraveCheckNote`, the controller-connection check's one written note,
 * against the notation harness (the real engraver module, its real fonts and the app's own
 * stylesheet): one whole note on a short treble staff with no key or time signature, spelled in C
 * major, in a `staff-svg` image named in words, sized to fit its `.check-note` box and recoloured
 * like the score. A second call replaces the first; a value that is no MIDI note throws before the
 * host is touched.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:4174' })

/** Engraving units per diatonic step: a line to the next space is half a 10-unit staff space. */
const UNITS_PER_DIATONIC_STEP = 5

/** Intent: open the harness with no phrase, so only the check note is engraved. */
async function openHarness(page: Page, theme: 'light' | 'dark' = 'light'): Promise<void> {
  await page.goto(`/?source=empty&width=700&theme=${theme}`)
  await page.waitForFunction(() => window.__notationCheckNote !== undefined)
}

/** Intent: engrave one written MIDI note into the page's check-note host and snapshot it. */
function engrave(page: Page, writtenMidi: number): Promise<NotationHarnessCheckNoteSnapshot> {
  return page.evaluate((midi) => window.__notationCheckNote.engrave(midi), writtenMidi)
}

// @test-link [[rule_controller_transposition_check]]
test.describe('engraveCheckNote: the connection check written note', () => {
  // @test-link [[rule_controller_transposition_check]]
  test('draws one whole note on a treble staff with no key or time signature, named in words', async ({
    page,
  }) => {
    await openHarness(page)
    const note = await engrave(page, 72)
    expect(note.svgCount).toBe(1)
    expect(note.className).toBe('staff-svg')
    expect(note.role).toBe('img')
    expect(note.ariaLabel).toBe('Written note C 5')
    expect(note.clefCount).toBe(1)
    expect(note.timeSignatureCount).toBe(0)
    expect(note.keySignatureCount).toBe(0)
    expect(note.staveNoteCount).toBe(1)
    expect(note.noteheadGroupTexts).toHaveLength(1)
    expect(note.ledgerLineStrokes).toEqual([])
  })

  // @test-link [[rule_controller_transposition_check]]
  test('places written C4 an octave (seven staff steps) below written C5, on its own ledger line', async ({
    page,
  }) => {
    await openHarness(page)
    const c5 = await engrave(page, 72)
    const c4 = await engrave(page, 60)
    expect(c4.ariaLabel).toBe('Written note C 4')
    expect(c4.noteheadY - c5.noteheadY).toBeCloseTo(7 * UNITS_PER_DIATONIC_STEP, 5)
    // One ledger line, carrying no colour of its own, so it takes the staff colour.
    expect(c4.ledgerLineStrokes).toEqual([null])
  })

  // @test-link [[rule_controller_transposition_check]]
  test('spells a black key as the sharp of the letter below and draws its accidental', async ({
    page,
  }) => {
    await openHarness(page)
    const c4 = await engrave(page, 60)
    const cSharp4 = await engrave(page, 61)
    expect(cSharp4.ariaLabel).toBe('Written note C sharp 4')
    expect(cSharp4.noteheadGroupTexts).toHaveLength(2)
    expect(cSharp4.noteheadGroupTexts[1]).not.toBe(cSharp4.noteheadGroupTexts[0])
    expect(cSharp4.noteheadY).toBeCloseTo(c4.noteheadY, 5)
  })

  // @test-link [[rule_controller_transposition_check]]
  test('replaces the previous note on a second call', async ({ page }) => {
    await openHarness(page)
    await engrave(page, 60)
    const second = await engrave(page, 67)
    expect(second.hostChildCount).toBe(1)
    expect(second.svgCount).toBe(1)
    expect(second.staveNoteCount).toBe(1)
    expect(second.ariaLabel).toBe('Written note G 4')
  })

  // @test-link [[rule_controller_transposition_check]]
  test('throws on a value that is no MIDI note, leaving the host as it was', async ({ page }) => {
    await openHarness(page)
    await engrave(page, 60)
    for (const midi of [128, -1, 60.5]) {
      const outcome = await page.evaluate(
        (value) => window.__notationCheckNote.engraveFailure(value),
        midi,
      )
      expect(outcome.thrown?.name, String(midi)).toBe('RangeError')
      expect(outcome.hostChildCount, String(midi)).toBe(1)
      expect(outcome.previousSvgKept, String(midi)).toBe(true)
    }
    const highest = await page.evaluate(() => window.__notationCheckNote.engraveFailure(127))
    expect(highest.thrown).toBeNull()
  })

  // @test-link [[rule_controller_transposition_check]]
  test('fits its check-note box, growing taller for notes far from the staff', async ({ page }) => {
    await openHarness(page)
    const heights: number[] = []
    for (const midi of [40, 52, 60, 70, 84, 96]) {
      const note = await engrave(page, midi)
      expect(note.fitsHost, String(midi)).toBe(true)
      expect(note.renderedWidthPx, String(midi)).toBeGreaterThan(0)
      heights.push(note.renderedHeightPx)
    }
    const inStaff = heights[3]!
    expect(heights[0]).toBeGreaterThan(inStaff)
    expect(heights[5]).toBeGreaterThan(inStaff)
  })

  // @test-link [[rule_controller_transposition_check]]
  test('takes the staff colour in both themes and passes axe', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await openHarness(page, theme)
      const note = await engrave(page, 61)
      expect(note.noteheadFill, theme).toBe(note.hostColour)
      const results = await new AxeBuilder({ page }).include('#check-note-host').analyze()
      expect(results.violations, theme).toEqual([])
    }
  })
})
