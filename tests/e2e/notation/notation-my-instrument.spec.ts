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
 * attribute the size times the scale. With `myClef=bass` the player-made instrument's phrase is
 * drawn on a bass staff (an F clef, the middle line D3, the key signature's accidentals on the
 * bass clef's lines) with the same written notes as in treble clef, the check note takes the clef
 * it is given, and the shared size reads the written range in its clef (`savedClef` beside
 * `savedRange` for a saved one). Each drawn note's pitch is read from the score description, whose
 * tokens follow the glyphs' order.
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

/** The SMuFL clef glyphs VexFlow draws as text: the G (treble) clef and the F (bass) clef. */
const SMUFL_G_CLEF = ''
const SMUFL_F_CLEF = ''
/** The SMuFL flat glyph (`accidentalFlat`), as VexFlow draws a key signature's flats. */
const SMUFL_FLAT = ''
/** Engraving units per diatonic step: a line to the next space is half a staff space. */
const UNITS_PER_STEP = UNITS_PER_STAFF_SPACE / 2
/** The letters in diatonic order from C, to count a written pitch's steps from C0. */
const LETTERS = 'CDEFGAB'
/** The bass staff's top line (A3) and middle line (D3), as diatonic steps from C0. */
const BASS_TOP_LINE_STEP = 5 + 7 * 3
const BASS_MIDDLE_LINE_STEP = 1 + 7 * 3
/** Bass clef's staff sits 12 diatonic steps under treble clef's (top line A3 against F5). */
const BASS_UNDER_TREBLE_STEPS = 12
/** A landscape phone window and the staff frame's width there: the split layout, two systems. */
const PHONE_VIEWPORT = { width: 740, height: 360 } as const
const PHONE_FRAME_WIDTH = '700'

/**
 * The bass-clef my instrument's phrase: written C2 to C4 (no transposition) in D major, seed 1,
 * leaping. Its notes sit on both sides of the middle line D3, so it has single notes with their
 * stems up and down, and beam groups of both directions.
 */
const BASS_PHRASE: Readonly<Record<string, string>> = {
  myLow: '36',
  myHigh: '60',
  tonal: 'D',
  seed: '1',
  leapiness: 'Leaping',
}

/** Intent: the bass phrase's harness query in `clef`, with any extra parameters. */
function bassPhraseQuery(
  clef: 'treble' | 'bass',
  extra: Readonly<Record<string, string>> = {},
): string {
  return generatedQuery({ ...BASS_PHRASE, myClef: clef, ...extra })
}

/**
 * Intent: every glyph's written pitch, measure by measure, as diatonic steps from C0 (null for a
 * rest), read from the score description's note and rest tokens, which follow the glyphs' order.
 */
async function describedSteps(page: Page): Promise<(number | null)[][]> {
  const describedBy = await page.locator('svg.staff-svg').first().getAttribute('aria-describedby')
  const measures = await page.locator(`#${describedBy} ol > li`).allTextContents()
  return measures.map((measure) =>
    measure
      .replace(/^Measure \d: /u, '')
      .replace(/\.$/u, '')
      .split('; ')
      .filter((block) => !block.startsWith('chord '))
      .flatMap((block) => block.split(', '))
      .filter((token) => token !== 'tied to next')
      .map((token) => {
        if (token.startsWith('rest ')) return null
        const match = /^([A-G])\b.* (\d) (?:dotted )?\w+$/u.exec(token)
        if (match === null) throw new Error(`Unexpected description token "${token}".`)
        return LETTERS.indexOf(match[1]!) + 7 * Number(match[2])
      }),
  )
}

/** Intent: each note identity's written pitch, as diatonic steps from C0 (a tie's glyphs share one). */
function stepsByIdentity(
  state: NotationHarnessState,
  steps: readonly (readonly (number | null)[])[],
): Map<string, number> {
  const byIdentity = new Map<string, number>()
  state.glyphIdentities!.forEach((measure, measureIndex) => {
    measure.forEach((identity, glyphIndex) => {
      const step = steps[measureIndex]![glyphIndex]
      if (identity === null || step === null || step === undefined) return
      byIdentity.set(
        `${identity.phraseNumber}:${identity.measureIndex}:${identity.eventIndex}`,
        step,
      )
    })
  })
  return byIdentity
}

/** One drawn system's staff and glyph positions, in its SVG's own engraving units. */
interface DrawnSystem {
  /** The drawn staff lines' `y`, top to bottom. */
  readonly staffLineYs: readonly number[]
  readonly clefs: readonly { readonly glyph: string; readonly y: number }[]
  readonly keySignature: readonly { readonly glyph: string; readonly y: number }[]
  /** Each tagged notehead: its note identity and glyph `y`. */
  readonly noteheads: readonly { readonly id: string; readonly y: number }[]
  /** Each tagged stem: its note identity, its direction and its beam group's index, if beamed. */
  readonly stems: readonly {
    readonly id: string
    readonly up: boolean
    readonly beam: number | null
  }[]
}

/** Intent: read every system SVG's staff lines, clef, key signature, noteheads and stems. */
async function drawnSystems(page: Page): Promise<DrawnSystem[]> {
  return page.$$eval('svg.staff-svg', (svgs) =>
    svgs.map((svg) => {
      const numbers = (d: string | null): number[] =>
        (d ?? '').match(/-?\d+(?:\.\d+)?/gu)?.map(Number) ?? []
      const texts = (selector: string) =>
        [...svg.querySelectorAll(selector)].map((text) => ({
          glyph: text.textContent ?? '',
          y: Number(text.getAttribute('y')),
        }))
      const beams = [...svg.querySelectorAll('g.vf-beam')]
      // The first measure's stave: every measure of a system shares its lines.
      const firstStave = svg.querySelector('g.vf-stave')
      return {
        staffLineYs: [...(firstStave?.querySelectorAll(':scope > path') ?? [])].map(
          (path) => numbers(path.getAttribute('d'))[1]!,
        ),
        clefs: texts('g.vf-clef > text'),
        keySignature: texts('g.vf-keysignature > text'),
        noteheads: [...svg.querySelectorAll('[data-note-part="notehead"] > text')].map((text) => ({
          id: text.parentElement!.getAttribute('data-note-id')!,
          y: Number(text.getAttribute('y')),
        })),
        stems: [...svg.querySelectorAll('g.vf-stem[data-note-id]')].map((stem) => {
          const [, startY, , tipY] = numbers(stem.querySelector('path')!.getAttribute('d'))
          const beam = beams.indexOf(stem.parentElement!)
          return {
            id: stem.getAttribute('data-note-id')!,
            up: tipY! < startY!,
            beam: beam < 0 ? null : beam,
          }
        }),
      }
    }),
  )
}

/**
 * Intent: the stem direction the stem rule gives a beam group's notes, as steps from the middle
 * line: the note farthest from it decides (on or above: down), then the side holding more notes,
 * then down.
 */
function beamGroupUp(stepsFromMiddle: readonly number[]): boolean {
  const above = Math.max(0, ...stepsFromMiddle)
  const below = Math.max(0, ...stepsFromMiddle.map((step) => -step))
  if (above !== below) return below > above
  const notesAbove = stepsFromMiddle.filter((step) => step > 0).length
  const notesBelow = stepsFromMiddle.filter((step) => step < 0).length
  return notesBelow > notesAbove
}

// @test-link [[module_notation_display_convention]]
// @test-link [[rule_notation_display_preserves_phrase]]
// @test-link [[req_my_instrument]]
test.describe('my instrument in bass clef: its phrase drawn on the bass staff', () => {
  test('draws an F clef on its fourth line on both systems of the split layout, a G clef in treble', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE_VIEWPORT)
    for (const [clef, glyph, unitsUnderTopLine] of [
      // The F clef's dots sit around F3, the fourth line; the G clef curls round G4, the second.
      ['bass', SMUFL_F_CLEF, UNITS_PER_STAFF_SPACE],
      ['treble', SMUFL_G_CLEF, 3 * UNITS_PER_STAFF_SPACE],
    ] as const) {
      const state = await loadSettled(page, bassPhraseQuery(clef, { width: PHONE_FRAME_WIDTH }))
      expect(state.state).toBe('ready')
      expect(state.clef).toBe(clef)
      expect(state.engraved!.systemCount).toBe(2)
      const systems = await drawnSystems(page)
      expect(systems).toHaveLength(2)
      for (const system of systems) {
        expect(system.clefs.map((drawn) => drawn.glyph)).toEqual([glyph])
        expect(system.clefs[0]!.y - state.staffTopLineUnits!).toBeCloseTo(unitsUnderTopLine, 6)
      }
    }
  })

  test('draws every note on its bass-clef line or space: D3 on the middle line, A3 on the top line', async ({
    page,
  }) => {
    const state = await loadSettled(page, bassPhraseQuery('bass'))
    expect(state.state).toBe('ready')
    const pitches = stepsByIdentity(state, await describedSteps(page))
    const [system] = await drawnSystems(page)
    // The staff's five lines, a staff space apart, top line at the placement the policy gives.
    expect(system!.staffLineYs).toHaveLength(5)
    system!.staffLineYs.forEach((y, line) => {
      expect(y - system!.staffLineYs[0]!).toBeCloseTo(line * UNITS_PER_STAFF_SPACE, 6)
    })
    expect(Math.abs(system!.staffLineYs[0]! - state.staffTopLineUnits!)).toBeLessThanOrEqual(0.5)
    const steps = new Set<number>()
    for (const notehead of system!.noteheads) {
      const step = pitches.get(notehead.id)!
      steps.add(step)
      // A note's step under the top line A3, 5 units each: within a unit of its line or space.
      const expectedY = system!.staffLineYs[0]! + (BASS_TOP_LINE_STEP - step) * UNITS_PER_STEP
      expect(Math.abs(notehead.y - expectedY), `notehead ${notehead.id}`).toBeLessThan(1)
    }
    // The phrase crosses the middle line: notes on it or above, and below it.
    expect([...steps].some((step) => step >= BASS_MIDDLE_LINE_STEP)).toBe(true)
    expect([...steps].some((step) => step < BASS_MIDDLE_LINE_STEP)).toBe(true)
  })

  // @test-link [[module_notation_stem_direction]]
  test('points stems down from D3 up and up below D3; a beam group by its farthest note', async ({
    page,
  }) => {
    const state = await loadSettled(page, bassPhraseQuery('bass'))
    expect(state.state).toBe('ready')
    const pitches = stepsByIdentity(state, await describedSteps(page))
    const [system] = await drawnSystems(page)
    const fromMiddle = (id: string): number => pitches.get(id)! - BASS_MIDDLE_LINE_STEP
    const single = system!.stems.filter((stem) => stem.beam === null)
    for (const stem of single) {
      expect(stem.up, `stem ${stem.id}`).toBe(fromMiddle(stem.id) < 0)
    }
    // The phrase holds single notes stemmed both ways.
    expect(single.some((stem) => stem.up)).toBe(true)
    expect(single.some((stem) => !stem.up)).toBe(true)
    const groups = new Map<number, DrawnSystem['stems'][number][]>()
    for (const stem of system!.stems) {
      if (stem.beam !== null) groups.set(stem.beam, [...(groups.get(stem.beam) ?? []), stem])
    }
    for (const group of groups.values()) {
      const up = beamGroupUp(group.map((stem) => fromMiddle(stem.id)))
      for (const stem of group) expect(stem.up, `beamed stem ${stem.id}`).toBe(up)
    }
    // And beam groups of both directions.
    const groupDirections = [...groups.values()].map((group) => group[0]!.up)
    expect(groupDirections).toContain(true)
    expect(groupDirections).toContain(false)
  })

  test("sets the key signature's accidentals on the bass clef's lines, one line lower than in treble", async ({
    page,
  }) => {
    // Sharps (D major: F♯, C♯) and flats (B♭ major, from the tonal centre A♯: B♭, E♭), as units
    // under each staff's top line: the first sharp on F3, the fourth line; the first flat on B2,
    // the second line; in treble on F5, the top line, and B4, the middle line.
    for (const [tonal, glyph, bass, treble] of [
      ['D', SMUFL_SHARP, [10, 25], [0, 15]],
      ['A#', SMUFL_FLAT, [30, 15], [20, 5]],
    ] as const) {
      for (const [clef, expected] of [
        ['bass', bass],
        ['treble', treble],
      ] as const) {
        const state = await loadSettled(page, bassPhraseQuery(clef, { tonal }))
        expect(state.state).toBe('ready')
        const [system] = await drawnSystems(page)
        expect(system!.keySignature.map((drawn) => drawn.glyph)).toEqual([glyph, glyph])
        const underTopLine = system!.keySignature.map((drawn) => drawn.y - state.staffTopLineUnits!)
        underTopLine.forEach((units, index) => expect(units).toBeCloseTo(expected[index]!, 6))
      }
    }
  })

  test('names the bass clef in the score description', async ({ page }) => {
    await loadSettled(page, bassPhraseQuery('bass'))
    const svg = page.locator('svg.staff-svg')
    await expect(svg).toHaveAttribute(
      'aria-label',
      'Written notation, bass clef, key signature 2 sharps (D Major), 4/4 time, four measures.',
    )
    const describedBy = await svg.getAttribute('aria-describedby')
    await expect(page.locator(`#${describedBy} p`)).toContainText('bass clef')
  })

  test('holds the same written notes as the same phrase in treble clef, each 12 steps lower on its staff', async ({
    page,
  }) => {
    const bass = await loadSettled(page, bassPhraseQuery('bass'))
    const bassSteps = await describedSteps(page)
    const [bassSystem] = await drawnSystems(page)
    const treble = await loadSettled(page, bassPhraseQuery('treble'))
    const trebleSteps = await describedSteps(page)
    const [trebleSystem] = await drawnSystems(page)

    expect(bass.state).toBe('ready')
    expect(treble.state).toBe('ready')
    expect(bassSteps).toEqual(trebleSteps)
    expect(bass.glyphFacts).toEqual(treble.glyphFacts)
    expect(bass.glyphIdentities).toEqual(treble.glyphIdentities)
    // Only where each note sits differs: 12 steps further under the treble staff's top line.
    const trebleIds = trebleSystem!.noteheads.map((notehead) => notehead.id)
    expect(bassSystem!.noteheads.map((notehead) => notehead.id)).toEqual(trebleIds)
    bassSystem!.noteheads.forEach((notehead, index) => {
      const inBass = notehead.y - bass.staffTopLineUnits!
      const inTreble = trebleSystem!.noteheads[index]!.y - treble.staffTopLineUnits!
      expect(inTreble - inBass).toBeCloseTo(BASS_UNDER_TREBLE_STEPS * UNITS_PER_STEP, 6)
    })
  })
})

// @test-link [[rule_controller_transposition_check]]
// @test-link [[rule_notation_display_preserves_phrase]]
test.describe('my instrument in bass clef: the check note drawn in its clef', () => {
  test('draws the check note on a staff with an F clef, written D3 on its middle line', async ({
    page,
  }) => {
    await page.goto('/?source=empty&width=700')
    await page.waitForFunction(() => window.__notationCheckNote !== undefined)
    const d3 = await page.evaluate(() => window.__notationCheckNote.engrave(50, 'bass'))
    expect(d3.ariaLabel).toBe('Written note D 3')
    expect(d3.clefGlyphs).toEqual([SMUFL_F_CLEF])
    expect(d3.staffLineYs).toHaveLength(5)
    expect(Math.abs(d3.noteheadY - d3.staffLineYs[2]!)).toBeLessThan(1)
    expect(d3.ledgerLineStrokes).toEqual([])
    expect(d3.fitsHost).toBe(true)

    // The same note on a treble staff: a G clef, and D3 twelve steps under its middle line B4.
    const trebleD3 = await page.evaluate(() => window.__notationCheckNote.engrave(50))
    expect(trebleD3.ariaLabel).toBe('Written note D 3')
    expect(trebleD3.clefGlyphs).toEqual([SMUFL_G_CLEF])
    const underMiddleLine = trebleD3.noteheadY - trebleD3.staffLineYs[2]!
    expect(Math.abs(underMiddleLine - 12 * UNITS_PER_STEP)).toBeLessThan(1)
  })
})

// @test-link [[module_notation_layout_preflight]]
// @test-link [[req_my_instrument]]
test.describe('my instrument in bass clef: the shared size reads its written range in bass clef', () => {
  test('keeps 16 staff spaces for written C2 to C4 in bass clef, against 19 in treble clef', async ({
    page,
  }) => {
    const bass = await loadSettled(
      page,
      generatedQuery({ myLow: '36', myHigh: '60', myClef: 'bass' }),
    )
    await expectEngravedAtSize(page, bass, 160)
    const treble = await loadSettled(
      page,
      generatedQuery({ myLow: '36', myHigh: '60', myClef: 'treble' }),
    )
    await expectEngravedAtSize(page, treble, 190)
  })

  test('grows to 24 staff spaces for the bass-clef bound, written E0 to E5', async ({ page }) => {
    const state = await loadSettled(
      page,
      generatedQuery({ myLow: '16', myHigh: '76', myClef: 'bass' }),
    )
    // The same staff positions as written C2 to C7 in treble clef: 92 above + 127 below + 16.
    await expectEngravedAtSize(page, state, 240)
  })

  test("engraves a built-in at a saved bass-clef my instrument's size", async ({ page }) => {
    // Written C2 to C4 in bass clef needs no more than the built-ins: the built-in placement.
    const atBuiltIn = await loadSettled(
      page,
      generatedQuery({ profile: 'c-keyboard', savedRange: '36-60', savedClef: 'bass' }),
    )
    await expectEngravedAtSize(page, atBuiltIn, 160)
    expect(atBuiltIn.clef).toBe('treble')
    expect(atBuiltIn.staffTopLineUnits).toBeCloseTo(60, 6)
    // Written E0 to E5 in bass clef: 24 spaces, the keyboard's staff centred 40 lower.
    const grown = await loadSettled(
      page,
      generatedQuery({ profile: 'c-keyboard', savedRange: '16-76', savedClef: 'bass' }),
    )
    await expectEngravedAtSize(page, grown, 240)
    expect(grown.staffTopLineUnits).toBeCloseTo(100, 6)
  })
})
