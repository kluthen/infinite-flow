/**
 * End-to-end coverage of the measure anchors the engraver reports (MeasureAnchors), against the
 * notation harness (the real engraver and its real fonts): one entry per drawn measure in phrase
 * order with its system, one event start per written event (notes and rests, tie continuations
 * included) at the drawn notehead or rest glyph, increasing between the measure's box start and
 * its closing barline, in both layouts and for one system part drawn alone. Reading the anchors
 * draws nothing: the idle rendering's pixel identity is held by notation-visual.spec.ts's
 * one-system and split-layout baselines.
 */
import { expect, test, type Page } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:4174' })

const PHONE_VIEWPORT = { width: 740, height: 360 } as const
const ONE_SYSTEM = { layout: 'one-system', heightBudgetPx: null } as const
const SPLIT = { layout: 'split', heightBudgetPx: null } as const
const SPLIT_ON_PHONE = { layout: 'split', heightBudgetPx: 240 } as const
/** The SVG text x precision VexFlow rounds to, in user units, with room for float noise. */
const DRAWN_X_TOLERANCE_UNITS = 0.002

/** An engraving result as the harness reports it, reduced to what the anchors are checked on. */
interface AnchoredEngraving {
  readonly measureBoxes: readonly { readonly x: number; readonly width: number }[]
  readonly measureAnchors: readonly {
    readonly measureIndex: number
    readonly systemIndex: 0 | 1
    readonly eventStartsPx: readonly number[]
    readonly barlinePx: number
  }[]
  readonly measureEventCounts: readonly number[]
}

/** One drawn system SVG as the harness snapshots it, reduced to what the anchors are checked on. */
interface DrawnSvg {
  readonly width: string | null
  readonly viewBox: string | null
  readonly measureIndices: readonly number[]
  readonly noteheadXs: readonly (readonly number[])[]
}

/** Intent: open the harness with no phrase, so only the hook under test engraves. */
async function openHarness(page: Page): Promise<void> {
  await page.setViewportSize(PHONE_VIEWPORT)
  await page.goto('/?source=empty&width=700')
  await page.waitForFunction(() => window.__notationSystems !== undefined)
}

/** Intent: the CSS px per SVG user unit of a drawn system: its width over its viewBox width. */
function svgScale(svg: DrawnSvg): number {
  return Number(svg.width) / Number(svg.viewBox!.split(' ')[2])
}

/**
 * Intent: check every reported anchor entry against the drawn systems: entries name the expected
 * measures and systems in phrase order; each has one start per written event, at its drawn
 * notehead or rest glyph x (scaled into CSS px), strictly increasing, past the box start and
 * before the closing barline, which is the box's right edge.
 */
function expectAnchorsMatchDrawing(
  engraving: AnchoredEngraving,
  svgs: readonly DrawnSvg[],
  expected: readonly { readonly measureIndex: number; readonly systemIndex: 0 | 1 }[],
  label: string,
): void {
  const { measureAnchors, measureBoxes, measureEventCounts } = engraving
  expect(
    measureAnchors.map(({ measureIndex, systemIndex }) => ({ measureIndex, systemIndex })),
    label,
  ).toEqual(expected)
  measureAnchors.forEach((anchors, index) => {
    const where = `${label}, measure ${anchors.measureIndex}`
    const box = measureBoxes[index]!
    const starts = anchors.eventStartsPx
    expect(starts, where).toHaveLength(measureEventCounts[anchors.measureIndex]!)
    expect(anchors.barlinePx, where).toBe(box.x + box.width)
    expect(starts[0]!, where).toBeGreaterThan(box.x)
    expect(starts[starts.length - 1]!, where).toBeLessThan(anchors.barlinePx)
    starts.slice(1).forEach((start, event) => expect(start, where).toBeGreaterThan(starts[event]!))

    const svg = svgs[anchors.systemIndex]!
    const scale = svgScale(svg)
    const drawn = svg.noteheadXs[svg.measureIndices.indexOf(anchors.measureIndex)]!
    expect(drawn, where).toHaveLength(starts.length)
    starts.forEach((start, event) =>
      expect(Math.abs(start / scale - drawn[event]!), `${where}, event ${event}`).toBeLessThan(
        DRAWN_X_TOLERANCE_UNITS,
      ),
    )
  })
}

// @test-link [[module_notation_engraving_anchors]]
test.describe('measure anchors: written events and barlines on the engraved time axis', () => {
  // @test-link [[module_notation_engraving_anchors]]
  test('the one-system layout reports four measures on system 0 at the drawn glyphs', async ({
    page,
  }) => {
    await openHarness(page)
    for (const fixture of ['simple', 'dense', 'denseTie', 'flats5'] as const) {
      const drawn = await page.evaluate(
        async ([name, vp]) => ({
          phrase: await window.__notationSystems.engravePhrase(name, 1, 1200, vp),
          whole: await window.__notationSystems.engravePart(name, 1, 'whole', 1200, vp),
        }),
        [fixture, ONE_SYSTEM] as const,
      )
      const expected = [0, 1, 2, 3].map((measureIndex) => ({
        measureIndex,
        systemIndex: 0 as const,
      }))
      expectAnchorsMatchDrawing(drawn.phrase, drawn.phrase.svgs, expected, fixture)
      expectAnchorsMatchDrawing(drawn.whole, [drawn.whole.svg], expected, `${fixture} whole`)
      expect(drawn.whole.measureAnchors, fixture).toEqual(drawn.phrase.measureAnchors)
    }
  })

  // @test-link [[module_notation_engraving_anchors]]
  test('the split layout reports bars 1-2 on system 0 and bars 3-4 on system 1, each in its own SVG frame', async ({
    page,
  }) => {
    await openHarness(page)
    for (const [fixture, width, viewport] of [
      ['simple', 700, SPLIT_ON_PHONE],
      ['denseTie', 900, SPLIT_ON_PHONE],
      ['sharps6', 650, SPLIT],
    ] as const) {
      const label = `${fixture} at ${width}px, budget ${viewport.heightBudgetPx}`
      const drawn = await page.evaluate(
        async ([name, containerWidthPx, vp]) => ({
          phrase: await window.__notationSystems.engravePhrase(name, 1, containerWidthPx, vp),
          opening: await window.__notationSystems.engravePart(
            name,
            1,
            'opening',
            containerWidthPx,
            vp,
          ),
          closing: await window.__notationSystems.engravePart(
            name,
            1,
            'closing',
            containerWidthPx,
            vp,
          ),
        }),
        [fixture, width, viewport] as const,
      )
      const opening = [0, 1].map((measureIndex) => ({ measureIndex, systemIndex: 0 as const }))
      const closing = [2, 3].map((measureIndex) => ({ measureIndex, systemIndex: 1 as const }))
      expectAnchorsMatchDrawing(drawn.phrase, drawn.phrase.svgs, [...opening, ...closing], label)
      expectAnchorsMatchDrawing(drawn.opening, [drawn.opening.svg], opening, `${label} opening`)
      // A closing part drawn alone is system 1 of its phrase, in its own (single) SVG.
      expectAnchorsMatchDrawing(
        drawn.closing,
        [drawn.closing.svg, drawn.closing.svg],
        closing,
        `${label} closing`,
      )
      expect(drawn.opening.measureAnchors, label).toEqual(drawn.phrase.measureAnchors.slice(0, 2))
      expect(drawn.closing.measureAnchors, label).toEqual(drawn.phrase.measureAnchors.slice(2, 4))
    }
  })
})
