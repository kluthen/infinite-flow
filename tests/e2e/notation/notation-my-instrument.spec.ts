/**
 * My instrument on the staff: a player-made instrument engraved through the real VexFlow adapter.
 * The `myInstrumentTritoneHigher` fixture (tests/e2e/notation-harness/fixtures.ts) runs the real
 * `transformToWrittenPhrase` for an instrument built with `makeMyInstrument` that sounds 6
 * semitones higher than written, from the written tonal centre F♯ in Major; its key signature,
 * chord symbols and accessible description show the F♯ major spelling (six sharps, E♯ for written
 * F). The generated source's player-made instrument parameters (`myLow`, `myHigh`, ...) and
 * `savedRange` check the shared system-position size: 16 staff spaces (160 units) for a written
 * range inside the built-ins' reach, the grown `planSystemPositionUnits` size for one reaching
 * further or wider than two octaves, and the same grown size for a built-in while a saved my
 * instrument needs it. The SVG's `viewBox` height is the size in engraving units; its `height`
 * attribute the size times the scale.
 */
import { expect, test, type Page } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:4174' })

/** VexFlow engraving units per staff space (NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE). */
const UNITS_PER_STAFF_SPACE = 10
/** The SMuFL sharp glyph (`accidentalSharp`), as VexFlow draws a key signature's sharps. */
const SMUFL_SHARP = '\uE262'
/** The SMuFL chord-symbol sharp glyph (`csymAccidentalSharp`), drawn after a chord root's letter. */
const SMUFL_CHORD_SYMBOL_SHARP = '\uED62'

/** Intent: load a harness URL and wait until it publishes a settled (ready or error) state. */
async function loadSettled(page: Page, query: string): Promise<NotationHarnessState> {
  await page.goto(`/?${query}`)
  await page.waitForFunction(
    () => window.__notationHarness && window.__notationHarness.state !== 'pending',
  )
  return page.evaluate(() => window.__notationHarness)
}

/** Intent: the harness query for one generated phrase with every required control set. */
function generatedQuery(extra: Readonly<Record<string, string>>): string {
  return new URLSearchParams({
    source: 'generated',
    width: '1200',
    seed: '7',
    tonal: 'C',
    collection: 'Major',
    density: 'Eighth',
    variety: 'Strict',
    syncopation: 'Straight',
    silence: 'Conversational',
    register: 'Middle',
    ...extra,
  }).toString()
}

/** Intent: the first system SVG's `viewBox` height and `height` attribute. */
async function svgSize(page: Page): Promise<{ viewBoxHeight: number; heightPx: number }> {
  return page.$eval('svg.staff-svg', (svg) => ({
    // The attribute itself, not viewBox.baseVal, whose single-precision floats round the size.
    viewBoxHeight: Number(svg.getAttribute('viewBox')!.split(' ')[3]),
    heightPx: Number(svg.getAttribute('height')),
  }))
}

/**
 * Intent: check that a ready engraving was drawn at the shared system-position size `units`: the
 * published size, the SVG's viewBox height, and its height in px at the engraving's scale.
 */
async function expectEngravedAtSize(
  page: Page,
  state: NotationHarnessState,
  units: number,
): Promise<void> {
  expect(state.state).toBe('ready')
  expect(state.systemPositionUnits).toBe(units)
  const scale = state.engraved!.staffSpacePx / UNITS_PER_STAFF_SPACE
  expect(state.engraved!.heightPx).toBeCloseTo(units * scale, 6)
  const size = await svgSize(page)
  expect(size.viewBoxHeight).toBe(units)
  expect(size.heightPx).toBeCloseTo(units * scale, 3)
}

// @test-link [[module_notation_display_convention]]
// @test-link [[req_my_instrument]]
test.describe('my instrument: a player-made transposition in its written pitch', () => {
  test.beforeEach(async ({ page }) => {
    const state = await loadSettled(page, 'fixture=myInstrumentTritoneHigher&width=1200')
    expect(state.state).toBe('ready')
  })

  test('engraves 6 semitones higher, written in F♯, with a key signature of six sharps', async ({
    page,
  }) => {
    const glyphs = await page.$$eval('svg.staff-svg g.vf-keysignature text', (texts) =>
      texts.map((text) => text.textContent),
    )
    expect(glyphs).toEqual(Array(6).fill(SMUFL_SHARP))
  })

  test('spells its chord symbols from F♯ major: F♯, B, C♯7, F♯', async ({ page }) => {
    const chordTexts = await page.$$eval('svg.staff-svg g.vf-chordsymbol', (groups) =>
      groups.map((group) => group.textContent),
    )
    // Each sharp root's letter is followed by VexFlow's chord-symbol sharp glyph, never a flat.
    const sharp = SMUFL_CHORD_SYMBOL_SHARP
    expect(chordTexts).toEqual([`F${sharp}`, 'B', `C${sharp}7`, `F${sharp}`])
  })

  test('describes the written notes with sharps, written F as E sharp', async ({ page }) => {
    const describedBy = await page.locator('svg.staff-svg').getAttribute('aria-describedby')
    const description = page.locator(`#${describedBy}`)
    await expect(description.locator('p')).toContainText('6 sharps (F sharp Major)')
    const measures = await description.locator('ol > li').allTextContents()
    expect(measures).toHaveLength(4)
    expect(measures[0]).toContain(
      'chord F sharp; F sharp 3 eighth, A sharp 3 eighth, C sharp 4 eighth, E sharp 4 eighth, ' +
        'F sharp 4 eighth, E sharp 4 eighth, C sharp 4 eighth, A sharp 3 eighth',
    )
    expect(measures[1]).toContain('chord B; B 3 quarter, D sharp 4 quarter, F sharp 4 quarter')
    expect(measures[2]).toContain('chord C sharp 7; C sharp 4 half, E sharp 4 half')
    expect(measures[3]).toContain('chord F sharp; F sharp 3 whole')
    // No written note is spelled with a flat, or as a plain F.
    for (const measure of measures) {
      expect(measure).not.toContain('flat')
      expect(measure).not.toMatch(/\bF [0-9]/u)
    }
  })

  test('publishes a glyph identity and written facts for every note, with no displayed accidental', async ({
    page,
  }) => {
    const state = await page.evaluate(() => window.__notationHarness)
    expect(state.glyphIdentities!.map((measure) => measure.length)).toEqual([8, 4, 2, 1])
    for (const measure of state.glyphFacts!) {
      for (const fact of measure) {
        expect(fact.kind).toBe('note')
        // The key signature holds every sharp, E♯ included: no note shows its own accidental.
        expect(fact.accidental).toBe(false)
      }
    }
  })
})

// @test-link [[module_notation_layout_preflight]]
// @test-link [[req_my_instrument]]
test.describe('my instrument: the shared system-position size follows its written range', () => {
  test("keeps 16 staff spaces for a written range inside the built-ins' reach (D4 to D6)", async ({
    page,
  }) => {
    const state = await loadSettled(page, generatedQuery({ myLow: '62', myHigh: '86' }))
    await expectEngravedAtSize(page, state, 160)
  })

  test('grows to 18 staff spaces for a range wider than two octaves (E3 to D6)', async ({
    page,
  }) => {
    const state = await loadSettled(page, generatedQuery({ myLow: '52', myHigh: '86' }))
    // Its register windows span 17 semitones, so a beam group can hold an up-stemmed G5.
    await expectEngravedAtSize(page, state, 180)
  })

  test('grows to 19 staff spaces for a written range reaching low (C2 to C4)', async ({ page }) => {
    const state = await loadSettled(page, generatedQuery({ myLow: '36', myHigh: '60' }))
    // planSystemPositionUnits({ 36, 60 }): ink 47 above the top line + 127 below, plus 2 × 8.
    await expectEngravedAtSize(page, state, 190)
  })

  test('engraves a transposing player-made instrument at the size of its written range', async ({
    page,
  }) => {
    // Written C2 to C4, sounding an octave and a major second lower: concert B♭0 to B♭2.
    const state = await loadSettled(
      page,
      generatedQuery({
        myLow: '36',
        myHigh: '60',
        myOctaves: '1',
        mySemitones: '2',
        myDirection: 'lower',
      }),
    )
    await expectEngravedAtSize(page, state, 190)
  })

  test("engraves a built-in at a saved my instrument's grown size, its staff centred lower", async ({
    page,
  }) => {
    const state = await loadSettled(
      page,
      generatedQuery({ profile: 'c-keyboard', savedRange: '36-60' }),
    )
    await expectEngravedAtSize(page, state, 190)
    // The C MIDI keyboard's staff top line sits at 60 in 160 units: 15 lower in 190.
    expect(state.staffTopLineUnits).toBeCloseTo(75, 6)
  })

  test('engraves a built-in at the built-in size with no saved my instrument', async ({ page }) => {
    const state = await loadSettled(page, generatedQuery({ profile: 'c-keyboard' }))
    await expectEngravedAtSize(page, state, 160)
    expect(state.staffTopLineUnits).toBeCloseTo(60, 6)
  })
})
