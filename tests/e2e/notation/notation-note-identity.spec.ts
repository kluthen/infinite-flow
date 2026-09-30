/**
 * End-to-end coverage of the engraved score's note identity tags and playhead band rectangles,
 * against the notation harness: every note glyph's own parts (notehead, stem, flag, accidental,
 * augmentation dot) are `<g>` groups carrying `data-note-id` (the key of the attack the glyph
 * sounds as) and `data-note-part`; rests, ledger lines, beams, ties and chord symbols carry no
 * identity; a chord symbol on an attack names it in `data-chord-for`; and every `g.measure-slot`
 * records its band rectangle in the SVG's own user units, one height per system. Exercised on the
 * `simple` fixture in the one-system and split layouts, and on `denseTie`, whose tie crosses the
 * split layout's system line.
 */
import { expect, test, type Page } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:4174' })

const DESKTOP_VIEWPORT = { width: 1280, height: 800 } as const
const PHONE_VIEWPORT = { width: 740, height: 360 } as const
const PART_NAMES = ['notehead', 'stem', 'flag', 'accidental', 'dot'] as const
type PartName = (typeof PART_NAMES)[number]

/** What the page reads off one engraved stavenote, in written-event order within its measure. */
interface GlyphDom {
  readonly systemIndex: number
  /** `data-note-id` of each part of that kind drawn inside the stavenote's own group. */
  readonly noteheads: readonly string[]
  readonly accidentals: readonly string[]
  readonly dots: readonly string[]
  readonly flags: readonly string[]
  readonly ownStems: readonly string[]
  /** Every tagged element inside the stavenote, any kind: none for a rest. */
  readonly taggedCount: number
  /** `data-chord-for` of each chord symbol attached to the glyph, null where absent. */
  readonly chordFor: readonly (string | null)[]
}

/** Everything one engraving exposes to the checks below. */
interface EngravedTags {
  /** Measure by measure (phrase order), glyph by glyph. */
  readonly glyphs: readonly (readonly GlyphDom[])[]
  /** Per key, per part name: how many tagged parts carry it, across every system's SVG. */
  readonly partCounts: Readonly<Record<string, Readonly<Record<string, number>>>>
  /** Per key: the indices of the system SVGs its parts appear in. */
  readonly keySystems: Readonly<Record<string, readonly number[]>>
  /** Descriptions of tagged elements that break the contract (not a group, bad part, wrong host). */
  readonly violations: readonly string[]
  /** Each measure-slot's band attributes, the SVG viewBox size, and its system. */
  readonly bands: readonly {
    readonly measureIndex: number
    readonly systemIndex: number
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
    readonly svgWidth: number
    readonly svgHeight: number
  }[]
}

/** Intent: open the harness on a fixture at a viewport and frame width, and wait until it is ready. */
async function engraveFixture(
  page: Page,
  viewport: { width: number; height: number },
  query: string,
): Promise<NotationHarnessState> {
  await page.setViewportSize(viewport)
  await page.goto(`/?${query}`)
  await page.waitForFunction(
    () => window.__notationHarness && window.__notationHarness.state !== 'pending',
  )
  const harness = await page.evaluate(() => window.__notationHarness)
  expect(harness.state).toBe('ready')
  return harness
}

/** Intent: read every tag, chord-symbol mark and band rectangle off the engraved SVGs. */
async function readEngravedTags(page: Page): Promise<EngravedTags> {
  return page.evaluate((partNames) => {
    const violations: string[] = []
    const partCounts: Record<string, Record<string, number>> = {}
    const keySystems: Record<string, number[]> = {}
    const svgs = Array.from(document.querySelectorAll<SVGSVGElement>('svg.staff-svg'))

    svgs.forEach((svg, systemIndex) => {
      for (const element of Array.from(svg.querySelectorAll('[data-note-id]'))) {
        const key = element.getAttribute('data-note-id')!
        const part = element.getAttribute('data-note-part') ?? ''
        const where = `${element.tagName}[${key} ${part}]`
        if (element.tagName !== 'g') violations.push(`${where} is not a group`)
        if (!(partNames as readonly string[]).includes(part)) violations.push(`${where} bad part`)
        if (element.closest('.vf-stavenote, .vf-beam') === null) {
          violations.push(`${where} lies outside every stavenote and beam`)
        }
        if (element.matches('.vf-stavenote, .vf-beam, .vf-chordsymbol, .vf-stavetie')) {
          violations.push(`${where} tags a whole ${element.getAttribute('class')} group`)
        }
        if (element.closest('.vf-chordsymbol, .vf-stavetie') !== null) {
          violations.push(`${where} lies inside a chord symbol or tie`)
        }
        if (element.hasAttribute('transform')) violations.push(`${where} has a transform`)
        const wrapsText = ['notehead', 'accidental', 'dot'].includes(part)
        if (
          wrapsText &&
          (element.children.length !== 1 || element.children[0]!.tagName !== 'text')
        ) {
          violations.push(`${where} does not wrap exactly one glyph text`)
        }
        const counts = (partCounts[key] ??= {})
        counts[part] = (counts[part] ?? 0) + 1
        const systems = (keySystems[key] ??= [])
        if (!systems.includes(systemIndex)) systems.push(systemIndex)
      }
    })
    // Beams, ledger lines and ties are paths; the only path a tagged part may hold is its stem's.
    for (const path of Array.from(document.querySelectorAll('svg.staff-svg path'))) {
      const tagged = path.closest('[data-note-id]')
      if (tagged !== null && tagged.getAttribute('data-note-part') !== 'stem') {
        violations.push(`a path sits inside a ${tagged.getAttribute('data-note-part')} part`)
      }
    }

    const slots = Array.from(document.querySelectorAll('g.measure-slot')).sort(
      (a, b) =>
        Number(a.getAttribute('data-measure-index')) - Number(b.getAttribute('data-measure-index')),
    )
    const keysIn = (root: Element, selector: string): string[] =>
      Array.from(root.querySelectorAll(selector)).map((el) => el.getAttribute('data-note-id')!)
    const glyphs = slots.map((slot) =>
      Array.from(slot.querySelectorAll(':scope > .vf-stavenote')).map((note) => ({
        systemIndex: Number(slot.getAttribute('data-system-index')),
        noteheads: keysIn(note, '[data-note-part="notehead"]'),
        accidentals: keysIn(note, '[data-note-part="accidental"]'),
        dots: keysIn(note, '[data-note-part="dot"]'),
        flags: keysIn(note, ':scope > g.vf-flag[data-note-part="flag"]'),
        ownStems: keysIn(note, ':scope > g.vf-stem[data-note-part="stem"]'),
        taggedCount: note.querySelectorAll('[data-note-id]').length,
        chordFor: Array.from(note.querySelectorAll('g.vf-chordsymbol')).map((chord) =>
          chord.getAttribute('data-chord-for'),
        ),
      })),
    )
    const bands = slots.map((slot) => {
      const svg = slot.closest('svg')!
      // The attribute itself, not viewBox.baseVal, whose single-precision floats round the size.
      const [, , viewBoxWidth, viewBoxHeight] = svg.getAttribute('viewBox')!.split(' ').map(Number)
      return {
        measureIndex: Number(slot.getAttribute('data-measure-index')),
        systemIndex: Number(slot.getAttribute('data-system-index')),
        x: Number(slot.getAttribute('data-band-x')),
        y: Number(slot.getAttribute('data-band-y')),
        width: Number(slot.getAttribute('data-band-width')),
        height: Number(slot.getAttribute('data-band-height')),
        svgWidth: viewBoxWidth!,
        svgHeight: viewBoxHeight!,
      }
    })
    return { glyphs, partCounts, keySystems, violations, bands }
  }, PART_NAMES)
}

/** Intent: the attribute value an identity is written as. */
function keyOf(identity: NotationHarnessNoteIdentity): string {
  return `${identity.phraseNumber}:${identity.measureIndex}:${identity.eventIndex}`
}

/** Intent: whether a written glyph draws a stem (every note value but the whole note). */
function hasStem(fact: NotationHarnessGlyphFact): boolean {
  return fact.kind === 'note' && fact.value !== 'whole'
}

/** Intent: whether a written glyph draws its own flag (an unbeamed eighth or sixteenth). */
function hasFlag(fact: NotationHarnessGlyphFact): boolean {
  return (
    fact.kind === 'note' && !fact.beamed && (fact.value === 'eighth' || fact.value === 'sixteenth')
  )
}

/**
 * Intent: check every glyph's tags against the harness's identities and written facts: each note
 * glyph's own parts carry its attack's key, rests carry nothing, each key's part totals (beamed
 * stems included) match its glyphs, chord symbols name only attacks, and nothing else is tagged.
 */
function expectGlyphTags(harness: NotationHarnessState, tags: EngravedTags): void {
  const identities = harness.glyphIdentities!
  const facts = harness.glyphFacts!
  expect(tags.violations).toEqual([])
  expect(tags.glyphs.map((measure) => measure.length)).toEqual(identities.map((m) => m.length))

  const expectedCounts: Record<string, Record<PartName, number>> = {}
  identities.forEach((measure, measureIndex) =>
    measure.forEach((identity, glyphIndex) => {
      const fact = facts[measureIndex]![glyphIndex]!
      const dom = tags.glyphs[measureIndex]![glyphIndex]!
      const where = `measure ${measureIndex} glyph ${glyphIndex}`
      if (identity === null) {
        expect(fact.kind, where).toBe('rest')
        expect(dom.taggedCount, `${where}: a rest carries no identity`).toBe(0)
        return
      }
      const key = keyOf(identity)
      expect(dom.noteheads, where).toEqual([key])
      expect(dom.accidentals, where).toEqual(fact.accidental ? [key] : [])
      expect(dom.dots, where).toEqual(fact.dots === 1 ? [key] : [])
      expect(dom.flags, where).toEqual(hasFlag(fact) ? [key] : [])
      expect(dom.ownStems, where).toEqual(hasStem(fact) && !fact.beamed ? [key] : [])
      for (const chordFor of dom.chordFor) {
        expect(chordFor, `${where} chord symbol`).toBe(fact.tieFromPrevious ? null : key)
      }
      const counts = (expectedCounts[key] ??= {
        notehead: 0,
        stem: 0,
        flag: 0,
        accidental: 0,
        dot: 0,
      })
      counts.notehead += 1
      counts.stem += hasStem(fact) ? 1 : 0
      counts.flag += hasFlag(fact) ? 1 : 0
      counts.accidental += fact.accidental ? 1 : 0
      counts.dot += fact.dots
    }),
  )
  const actualCounts = Object.fromEntries(
    Object.entries(expectedCounts).map(([key]) => [
      key,
      Object.fromEntries(PART_NAMES.map((part) => [part, tags.partCounts[key]?.[part] ?? 0])),
    ]),
  )
  expect(actualCounts).toEqual(expectedCounts)
  expect(Object.keys(tags.partCounts).sort()).toEqual(Object.keys(expectedCounts).sort())
}

/**
 * Intent: check every measure-slot's band rectangle: numeric, inside its SVG, contiguous from one
 * measure to the next along a system (barline to barline), and one height per system.
 */
function expectBands(tags: EngravedTags): void {
  expect(tags.bands.map((band) => band.measureIndex)).toEqual([0, 1, 2, 3])
  for (const band of tags.bands) {
    const where = `measure ${band.measureIndex} band`
    for (const value of [band.x, band.y, band.width, band.height]) {
      expect(Number.isFinite(value), where).toBe(true)
    }
    expect(band.width, where).toBeGreaterThan(0)
    expect(band.height, where).toBeGreaterThan(0)
    expect(band.x, where).toBeGreaterThanOrEqual(0)
    expect(band.y, where).toBeGreaterThanOrEqual(0)
    expect(band.x + band.width, where).toBeLessThanOrEqual(band.svgWidth)
    expect(band.y + band.height, where).toBeLessThanOrEqual(band.svgHeight)
  }
  for (let index = 1; index < tags.bands.length; index += 1) {
    const previous = tags.bands[index - 1]!
    const band = tags.bands[index]!
    if (band.systemIndex !== previous.systemIndex) continue
    expect(band.x, `measure ${index} starts at the previous closing barline`).toBeCloseTo(
      previous.x + previous.width,
      6,
    )
    expect(band.y, `measure ${index} band top`).toBe(previous.y)
    expect(band.height, `measure ${index} band height`).toBe(previous.height)
  }
}

// @test-link [[module_notation_note_identity_overlays]]
test.describe('engraved note identity tags and playhead bands', () => {
  test('simple fixture, one system: every note part is tagged with its attack, ties included', async ({
    page,
  }) => {
    const harness = await engraveFixture(page, DESKTOP_VIEWPORT, 'fixture=simple&width=1200')
    expect(harness.engraved?.systemCount).toBe(1)
    const tags = await readEngravedTags(page)

    expectGlyphTags(harness, tags)
    expectBands(tags)
    // Measure 1's tied quarter continues into measure 2, and measure 2's half into measure 3's
    // whole note: each continuation carries its attack's key across the barline.
    expect(tags.glyphs[2]![0]!.noteheads).toEqual(['1:1:4'])
    expect(tags.glyphs[3]![0]!.noteheads).toEqual(['1:2:2'])
    expect(tags.glyphs[3]![0]!.ownStems).toEqual([])
    expect(tags.glyphs[1]![0]!.dots).toEqual(['1:1:0'])
    // The chord symbols on measure 2 and 3's downbeats sit on tie continuations: no attack named.
    expect(tags.glyphs[2]![0]!.chordFor).toEqual([null])
    expect(tags.glyphs[0]![0]!.chordFor).toEqual(['1:0:0'])
  })

  test('simple fixture, split layout: both systems are tagged and banded', async ({ page }) => {
    const harness = await engraveFixture(page, PHONE_VIEWPORT, 'fixture=simple&width=700')
    expect(harness.engraved?.systemCount).toBe(2)
    const tags = await readEngravedTags(page)

    expectGlyphTags(harness, tags)
    expectBands(tags)
    expect(tags.bands.map((band) => band.systemIndex)).toEqual([0, 0, 1, 1])
    expect(tags.keySystems['1:1:4']).toEqual([0, 1])
  })

  test('denseTie, split layout: the tie across the system line carries its attack into the other SVG', async ({
    page,
  }) => {
    const harness = await engraveFixture(page, PHONE_VIEWPORT, 'fixture=denseTie&width=700')
    expect(harness.engraved?.systemCount).toBe(2)
    const tags = await readEngravedTags(page)

    expectGlyphTags(harness, tags)
    expectBands(tags)
    expect(tags.glyphs[2]![0]!.systemIndex).toBe(1)
    expect(tags.glyphs[2]![0]!.noteheads).toEqual(['1:1:15'])
    expect(tags.keySystems['1:1:15']).toEqual([0, 1])
  })

  test('the phrase number given to the score is the one its keys carry', async ({ page }) => {
    const harness = await engraveFixture(
      page,
      DESKTOP_VIEWPORT,
      'fixture=denseTie&width=1200&phrase=3',
    )
    const tags = await readEngravedTags(page)

    expectGlyphTags(harness, tags)
    expect(tags.glyphs[0]![0]!.noteheads).toEqual(['3:0:0'])
  })
})
