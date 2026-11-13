/**
 * End-to-end coverage of v3.3's seventh chord symbols on the staff, against the notation harness
 * (PhraseScore inside a real `staff-frame` with the app's stylesheet), on the calibration fixtures
 * and their triad controls (`seventhsSixteenth`, `seventhsEighth`, `seventhsQuarter`,
 * `triadsSixteenth`, `triadsEighth`, `triadsQuarter`: A major runs with no displayed accidental,
 * two chords a bar). Each measure's two seventh symbols stand a staff space apart and inside its
 * closing barline, at or above the legibility floor, in the calibration windows; a phrase whose
 * symbols cannot fit at the floor takes the too-many-notes path, and one step wider is drawn with
 * its symbols still apart and inside; a suffix is drawn on the root's baseline at the one
 * chord-symbol size, m7♭5's flat as the root's flat glyph; and the seventh symbols' ink reaches no
 * higher than the triads' the system position was calibrated with.
 */
import { expect, test, type Page } from '@playwright/test'

import { measureInk, NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE } from './staff-ink'

test.use({ baseURL: 'http://127.0.0.1:4174' })

/** Intent: open a fixture at a viewport and frame width, and return the settled harness state. */
async function engraveFixture(
  page: Page,
  viewport: { readonly width: number; readonly height: number },
  fixture: string,
  frameWidth: number,
): Promise<NotationHarnessState> {
  await page.setViewportSize(viewport)
  await page.goto(`/?fixture=${fixture}&width=${frameWidth}`)
  await page.waitForFunction(
    () => window.__notationHarness && window.__notationHarness.state !== 'pending',
  )
  return page.evaluate(() => window.__notationHarness)
}

/** The seventh chord symbols' calibration cases: a fixture in a window, and the layout it takes. */
const SEVENTH_CALIBRATION_CASES = [
  { fixture: 'seventhsSixteenth', viewport: { width: 1024, height: 800 }, layout: 'one-system' },
  { fixture: 'seventhsSixteenth', viewport: { width: 1440, height: 800 }, layout: 'one-system' },
  { fixture: 'seventhsEighth', viewport: { width: 768, height: 360 }, layout: 'split' },
  { fixture: 'seventhsEighth', viewport: { width: 740, height: 360 }, layout: 'split' },
  { fixture: 'seventhsQuarter', viewport: { width: 1024, height: 800 }, layout: 'one-system' },
  { fixture: 'seventhsQuarter', viewport: { width: 740, height: 360 }, layout: 'split' },
] as const

/** The calibration fixtures' two chord symbols per measure, on beats 1 and 3, as built. */
const SEVENTH_SYMBOLS = [
  ['G♯m7♭5', 'E♭m7♭5'],
  ['Cmaj7', 'Dm7'],
  ['G7', 'Bm7♭5'],
  ['E♭m7♭5', 'G♯m7♭5'],
] as const

/** How much narrower than its window the harness frame is in the calibration cases. */
const WINDOW_TO_FRAME_PX = 40
/** The legibility floor's scale: a 5 px staff space over the engraving's 10-unit one. */
const FLOOR_SCALE = 0.5

/**
 * Intent: a chord symbol's letters and digits only, since its sharp and flat signs may be drawn as
 * music-font glyphs rather than as the text's own ♯ and ♭.
 */
function symbolLetters(text: string): string {
  return text.replace(/[^A-Za-z0-9]/gu, '')
}

/** Intent: the layout inputs PhraseScore reported last, the ones it engraved with. */
function lastLayoutInputs(page: Page): Promise<NotationHarnessLayoutInputs> {
  return page.evaluate(() => window.__notationLayoutInputs.at(-1)!)
}

/** Intent: draw a fixture at the layout inputs PhraseScore engraved with and read its symbols. */
function symbolGeometry(
  page: Page,
  fixture: string,
  inputs: NotationHarnessLayoutInputs,
): Promise<NotationHarnessChordSymbolGeometry> {
  return page.evaluate(
    ({ name, at }) =>
      window.__notationSystems.chordSymbolGeometry(name, at.containerWidthPx, at.viewport),
    { name: fixture, at: inputs },
  )
}

/**
 * Intent: check that every measure of a calibration fixture shows its two seventh symbols as
 * built, a staff space apart, the second on its measure's system and left of its closing barline.
 */
function expectSymbolsApartInsideBarlines(geometry: NotationHarnessChordSymbolGeometry): void {
  SEVENTH_SYMBOLS.forEach((built, measureIndex) => {
    const label = `measure ${measureIndex}`
    const symbols = geometry.symbols.filter((symbol) => symbol.measureIndex === measureIndex)
    expect(
      symbols.map((symbol) => symbolLetters(symbol.text)),
      label,
    ).toEqual(built.map(symbolLetters))
    const [first, second] = symbols
    expect(second!.leftPx - first!.rightPx, label).toBeGreaterThanOrEqual(geometry.staffSpacePx)
    const barline = geometry.barlines.find((anchor) => anchor.measureIndex === measureIndex)!
    expect(second!.systemIndex, label).toBe(barline.systemIndex)
    expect(second!.rightPx, label).toBeLessThanOrEqual(barline.barlinePx)
  })
}

for (const { fixture, viewport, layout } of SEVENTH_CALIBRATION_CASES) {
  // @test-link [[rule_seventh_chord_symbols]]
  test(`${fixture} in a ${viewport.width} px window: every measure's seventh symbols stand a staff space apart, inside its barline, at or above the floor`, async ({
    page,
  }) => {
    const frameWidth = viewport.width - WINDOW_TO_FRAME_PX
    const harnessState = await engraveFixture(page, viewport, fixture, frameWidth)
    expect(harnessState.state).toBe('ready')
    expect(harnessState.engraved!.systemCount).toBe(layout === 'split' ? 2 : 1)
    const inputs = await lastLayoutInputs(page)
    expect(inputs.viewport.layout).toBe(layout)
    const geometry = await symbolGeometry(page, fixture, inputs)
    expect(geometry.requiredUnits).toBe(harnessState.engraved!.requiredUnits)
    expect(geometry.staffSpacePx).toBe(harnessState.engraved!.staffSpacePx)
    expect(geometry.requiredUnits * FLOOR_SCALE).toBeLessThanOrEqual(inputs.containerWidthPx)
    expectSymbolsApartInsideBarlines(geometry)
  })
}

/** The music font's chord-symbol flat and sharp (SMuFL csymAccidentalFlat, csymAccidentalSharp). */
const GLYPH_FLAT = '\u{ED60}'
const GLYPH_SHARP = '\u{ED62}'

/** Each calibration seventh symbol's `<text>` runs, in drawing order: root, root sign, suffix. */
const SEVENTH_RUNS: Readonly<Record<string, readonly string[]>> = {
  'E♭m7♭5': ['E', GLYPH_FLAT, 'm7', GLYPH_FLAT, '5'],
  'G♯m7♭5': ['G', GLYPH_SHARP, 'm7', GLYPH_FLAT, '5'],
  Cmaj7: ['C', 'maj7'],
  Dm7: ['D', 'm7'],
  G7: ['G', '7'],
  'Bm7♭5': ['B', 'm7', GLYPH_FLAT, '5'],
}

/** The desktop window the drawn-symbol and ink checks engrave in, and its frame width. */
const SYMBOL_VIEWPORT = { width: 1440, height: 800 } as const
const SYMBOL_FRAME_PX = SYMBOL_VIEWPORT.width - WINDOW_TO_FRAME_PX

/** Intent: engrave a fixture in the desktop window and read its drawn chord symbols. */
async function drawnSymbols(
  page: Page,
  fixture: string,
): Promise<readonly NotationHarnessChordSymbolBox[]> {
  const harnessState = await engraveFixture(page, SYMBOL_VIEWPORT, fixture, SYMBOL_FRAME_PX)
  expect(harnessState.state).toBe('ready')
  const geometry = await symbolGeometry(page, fixture, await lastLayoutInputs(page))
  return geometry.symbols
}

// @test-link [[rule_seventh_chord_symbols]]
test("a seventh symbol's suffix is drawn on the root's baseline at the one chord-symbol size, m7♭5's flat as the root's flat glyph", async ({
  page,
}) => {
  const sevenths = await drawnSymbols(page, 'seventhsSixteenth')
  expect(sevenths.map((symbol) => symbol.runs.map((run) => run.text))).toEqual(
    SEVENTH_SYMBOLS.flat().map((name) => SEVENTH_RUNS[name]),
  )
  const triads = await drawnSymbols(page, 'triadsSixteenth')
  expect(triads).toHaveLength(sevenths.length)

  const sizes = new Set(
    [...sevenths, ...triads].flatMap((symbol) => symbol.runs.map((run) => run.fontSize)),
  )
  expect([...sizes]).toHaveLength(1)
  expect([...sizes][0]).not.toBeNull()
  for (const symbol of [...sevenths, ...triads]) {
    const baselines = new Set(symbol.runs.map((run) => run.y))
    expect([...baselines], symbol.text).toHaveLength(1)
  }
})

/**
 * How much higher a seventh symbol's ink may reach than its triad control's: one CSS px, the
 * pixel scan's own step, in engraving units at the smaller of the two scales.
 */
const INK_TOLERANCE_PX = 1

/** Intent: engrave a fixture in the desktop window and measure its one system's ink. */
async function oneSystemInk(page: Page, fixture: string) {
  const harnessState = await engraveFixture(page, SYMBOL_VIEWPORT, fixture, SYMBOL_FRAME_PX)
  expect(harnessState.state).toBe('ready')
  const staffSpacePx = harnessState.engraved!.staffSpacePx
  const extents = await measureInk(page, staffSpacePx, harnessState.staffTopLineUnits!)
  expect(extents).toHaveLength(1)
  return { extent: extents[0]!, scale: staffSpacePx / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE }
}

// @test-link [[rule_seventh_chord_symbols]]
test('seventh symbols reach no higher than their triad controls, inside the system position calibrated with triads', async ({
  page,
}) => {
  const sevenths = await oneSystemInk(page, 'seventhsSixteenth')
  const triads = await oneSystemInk(page, 'triadsSixteenth')
  // Compared in engraving units: each phrase is drawn at its own scale, the wider one smaller.
  const toleranceUnits = INK_TOLERANCE_PX / Math.min(sevenths.scale, triads.scale)
  expect(sevenths.extent.top).toBeGreaterThanOrEqual(triads.extent.top - toleranceUnits)
  for (const { extent } of [sevenths, triads]) {
    expect(extent.top).toBeGreaterThan(0)
    expect(extent.bottom).toBeLessThan(extent.positionUnits)
  }
})

/**
 * The phone window of the too-many-notes search, and the widest frame width it starts from. The
 * search runs on the quarter grid, where the symbols, not the notes, set a measure's width: in the
 * sixteenth and eighth grids the seventh symbols cost less width than their triad controls.
 */
const SEARCH_VIEWPORT = { width: 740, height: 360 } as const
const SEARCH_START_FRAME_PX = 728
const SEARCH_STEP_PX = 4

// @test-link [[rule_seventh_chord_symbols]]
test('below bp-tablet-landscape, a phrase whose seventh symbols do not fit at the legibility floor takes the too-many-notes path and is never drawn overlapping', async ({
  page,
}) => {
  // The frame's inline padding and border: what the frame width loses to its content width.
  await engraveFixture(page, SEARCH_VIEWPORT, 'triadsQuarter', SEARCH_START_FRAME_PX)
  const start = await lastLayoutInputs(page)
  expect(start.viewport.layout).toBe('split')
  const frameInsetPx = SEARCH_START_FRAME_PX - start.containerWidthPx

  const found = await page.evaluate(
    async ({ startFrame, step, inset, viewport }) => {
      const checks = window.__notationChecks
      for (let frame = startFrame; frame - inset > 0; frame -= step) {
        const sevenths = await checks.planFit('seventhsQuarter', frame - inset, viewport)
        const triads = await checks.planFit('triadsQuarter', frame - inset, viewport)
        if (triads.kind !== 'fits') return { frame: null, triadsFailAt: frame }
        if (sevenths.kind === 'notes_too_wide') return { frame, triadsFailAt: null }
      }
      return { frame: null, triadsFailAt: null }
    },
    {
      startFrame: SEARCH_START_FRAME_PX,
      step: SEARCH_STEP_PX,
      inset: frameInsetPx,
      viewport: start.viewport,
    },
  )
  expect(
    found.frame,
    `no frame width from ${SEARCH_START_FRAME_PX} px down gives seventhsQuarter "notes too wide" ` +
      `while triadsQuarter fits; triadsQuarter stops fitting at ${found.triadsFailAt} px`,
  ).not.toBeNull()
  const tooNarrowFrame = found.frame!
  expect(tooNarrowFrame).toBeLessThan(SEARCH_START_FRAME_PX)

  const tooNarrow = await engraveFixture(page, SEARCH_VIEWPORT, 'seventhsQuarter', tooNarrowFrame)
  expect((await lastLayoutInputs(page)).containerWidthPx).toBe(tooNarrowFrame - frameInsetPx)
  expect(tooNarrow.state).toBe('error')
  expect(tooNarrow.errorCode).toBe('notation_notes_too_wide')
  await expect(page.locator('svg.staff-svg')).toHaveCount(0)

  // One step wider the phrase fits, and is drawn with its symbols apart and inside each barline.
  const fitFrame = tooNarrowFrame + SEARCH_STEP_PX
  const fitting = await engraveFixture(page, SEARCH_VIEWPORT, 'seventhsQuarter', fitFrame)
  expect(fitting.state).toBe('ready')
  const inputs = await lastLayoutInputs(page)
  expect(inputs.containerWidthPx).toBe(fitFrame - frameInsetPx)
  expect(inputs.viewport.layout).toBe('split')
  await expect(page.locator('svg.staff-svg')).not.toHaveCount(0)
  const geometry = await symbolGeometry(page, 'seventhsQuarter', inputs)
  expect(geometry.requiredUnits).toBe(fitting.engraved!.requiredUnits)
  expectSymbolsApartInsideBarlines(geometry)
})
