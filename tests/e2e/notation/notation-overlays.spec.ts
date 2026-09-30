/**
 * End-to-end coverage of the score overlays against the notation harness: acknowledging a note
 * only adds `note-ack` to that identity's own tagged parts (nothing else in the markup changes and
 * nothing moves); the playhead band is one rectangle, drawn first in its system so it paints behind
 * every glyph, stepping from measure to measure and system to system; an identity outside the
 * phrase's attacks is rejected with nothing drawn; a re-engrave keeps the overlays; and six
 * baselines show the overlays in both themes. The start marker's placement has its own spec,
 * notation-overlays-marker.spec.ts.
 */
import { expect, test, type Page } from '@playwright/test'

import {
  DESKTOP_VIEWPORT,
  findIdentity,
  keyOf,
  NONE,
  openHarness,
  PHONE_VIEWPORT,
  setOverlays,
  type Identity,
} from './overlay-harness'

test.use({ baseURL: 'http://127.0.0.1:4174' })

/** Intent: every system SVG's markup, in system order. */
async function markup(page: Page): Promise<string[]> {
  return page.$$eval('svg.staff-svg', (svgs) => svgs.map((svg) => svg.outerHTML))
}

/** Intent: every element's on-screen box in the system SVGs, in document order. */
async function boxes(page: Page): Promise<number[][]> {
  return page.$$eval('svg.staff-svg, svg.staff-svg *', (elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect()
      return [box.x, box.y, box.width, box.height]
    }),
  )
}

/** Intent: remove the note-ack class token from every class attribute in a markup string. */
function stripAck(html: string): string {
  return html.replace(/ class="note-ack"/g, '').replace(/ ?\bnote-ack\b/g, '')
}

/** Intent: remove the playhead band rectangle from a markup string. */
function stripBand(html: string): string {
  return html.replace(/<rect class="playhead-band"[^>]*><\/rect>/g, '')
}

/**
 * Intent: read the lit and unlit colours: each colour token resolved to rgb, the computed fill of
 * every part tagged with `key` (and of its glyph text or stroke of its stem path), and the computed
 * colours of the beams, ledger lines, ties and chord symbols, which never light.
 */
async function readColours(page: Page, key: string) {
  return page.evaluate((noteKey) => {
    const resolve = (token: string): string => {
      const probe = document.createElement('div')
      probe.style.color = `var(${token})`
      document.querySelector('.staff-frame')!.appendChild(probe)
      const colour = getComputedStyle(probe).color
      probe.remove()
      return colour
    }
    const all = (selector: string): Element[] =>
      Array.from(document.querySelectorAll(`svg.staff-svg ${selector}`))
    const ink = (element: Element): string => {
      const style = getComputedStyle(element)
      return style.fill === 'none' ? style.stroke : style.fill
    }
    const lit = all(`[data-note-id="${noteKey}"]`).flatMap((part) => [
      getComputedStyle(part).fill,
      ...Array.from(part.querySelectorAll('text, path')).map(ink),
    ])
    return {
      staff: resolve('--color-staff'),
      ack: resolve('--color-note-ack'),
      lit,
      beams: all('.vf-beam > path').map(ink),
      ties: all('.vf-stavetie path').map(ink),
      chords: all('.vf-chordsymbol text').map(ink),
      ledgers: all('.vf-stavenote > path').map(ink),
    }
  }, key)
}

/** Intent: whether an attack is continued by a tie into a later measure. */
function tiedAcrossBarline(harness: NotationHarnessState, identity: Identity): boolean {
  return harness
    .glyphIdentities!.slice(identity.measureIndex + 1)
    .some((measure) => measure.some((other) => other !== null && keyOf(other) === keyOf(identity)))
}

const ACK_CASES = [
  {
    name: 'a beamed note with an accidental',
    viewport: DESKTOP_VIEWPORT,
    query: 'fixture=denseTie&width=1200',
    pick: (h: NotationHarnessState) => findIdentity(h, (f) => f.beamed && f.accidental),
  },
  {
    name: 'an unbeamed flagged note',
    viewport: DESKTOP_VIEWPORT,
    query: 'fixture=simple&width=1200',
    pick: (h: NotationHarnessState) =>
      findIdentity(h, (f) => !f.beamed && (f.value === 'eighth' || f.value === 'sixteenth')),
  },
  {
    name: 'a note tied across a barline',
    viewport: DESKTOP_VIEWPORT,
    query: 'fixture=simple&width=1200',
    pick: (h: NotationHarnessState) => findIdentity(h, (_f, id) => tiedAcrossBarline(h, id)),
  },
  {
    name: 'a note tied across the system break',
    viewport: PHONE_VIEWPORT,
    query: 'fixture=denseTie&width=700',
    pick: (h: NotationHarnessState) =>
      findIdentity(h, (_f, id, m) => m === 1 && tiedAcrossBarline(h, id)),
  },
] as const

// @test-link [[rule_acknowledgement_highlights_expected_note_only]]
// @test-link [[module_notation_note_identity_overlays]]
test.describe('acknowledgement lights only the note’s own parts', () => {
  for (const { name, viewport, query, pick } of ACK_CASES) {
    test(`${name}: only its tagged parts gain note-ack, nothing moves`, async ({ page }) => {
      const harness = await openHarness(page, viewport, query)
      const identity = pick(harness)
      const key = keyOf(identity)
      const before = await markup(page)
      const boxesBefore = await boxes(page)
      const coloursBefore = await readColours(page, key)

      expect(await setOverlays(page, { ...NONE, acknowledged: [identity] })).toBeNull()

      const after = await markup(page)
      expect(after.map(stripAck)).toEqual(before)
      const lit = await page.$$eval('svg.staff-svg .note-ack', (elements) =>
        elements.map((element) => element.getAttribute('data-note-id')),
      )
      const tagged = await page.locator(`svg.staff-svg [data-note-id="${key}"]`).count()
      expect(lit.length).toBe(tagged)
      expect(new Set(lit)).toEqual(new Set([key]))
      expect(await boxes(page)).toEqual(boxesBefore)

      const colours = await readColours(page, key)
      expect(colours.ack).not.toBe(colours.staff)
      for (const colour of colours.lit) expect(colour).toBe(colours.ack)
      for (const colour of [...colours.beams, ...colours.ties, ...colours.chords]) {
        expect(colour).toBe(colours.staff)
      }
      // Ledger lines keep whatever ink they had before (VexFlow draws them with their own stroke).
      expect(colours.ledgers).toEqual(coloursBefore.ledgers)
      for (const colour of colours.ledgers) expect(colour).not.toBe(colours.ack)
      if (viewport === PHONE_VIEWPORT) {
        const systems = await page.$$eval(
          `svg.staff-svg`,
          (svgs, k) =>
            svgs.map((svg) => svg.querySelectorAll(`.note-ack[data-note-id="${k}"]`).length),
          key,
        )
        expect(systems.every((count) => count > 0)).toBe(true)
      }
    })
  }
})

/** Intent: read the one playhead band drawn, with its system and its measure's band attributes. */
async function readBand(page: Page, measureIndex: number) {
  return page.evaluate((index) => {
    const svgs = Array.from(document.querySelectorAll('svg.staff-svg'))
    const bands = Array.from(document.querySelectorAll('svg.staff-svg rect.playhead-band'))
    const slot = document.querySelector(`g.measure-slot[data-measure-index="${index}"]`)!
    const band = bands[0]
    const attrs = (element: Element, names: readonly string[]): number[] =>
      names.map((name) => Number(element.getAttribute(name)))
    return {
      count: bands.length,
      systemOfBand: band === undefined ? -1 : svgs.indexOf(band.closest('svg')!),
      systemOfSlot: svgs.indexOf(slot.closest('svg')!),
      firstInSystem: band !== undefined && band.closest('svg')!.firstElementChild === band,
      rect: band === undefined ? [] : attrs(band, ['x', 'y', 'width', 'height']),
      slotBand: attrs(slot, ['data-band-x', 'data-band-y', 'data-band-width', 'data-band-height']),
      fill: band === undefined ? '' : getComputedStyle(band).fill,
      token: (() => {
        const probe = document.createElement('div')
        probe.style.color = 'var(--color-playhead-band)'
        document.querySelector('.staff-frame')!.appendChild(probe)
        const colour = getComputedStyle(probe).color
        probe.remove()
        return colour
      })(),
    }
  }, measureIndex)
}

// @test-link [[module_notation_note_identity_overlays]]
test('the playhead band is one rectangle behind its system, stepping across both systems', async ({
  page,
}) => {
  const harness = await openHarness(page, PHONE_VIEWPORT, 'fixture=simple&width=700')
  expect(harness.engraved?.systemCount).toBe(2)
  const before = await markup(page)

  for (const measure of [0, 1, 2, 3] as const) {
    expect(await setOverlays(page, { ...NONE, playheadMeasure: measure })).toBeNull()
    const band = await readBand(page, measure)
    expect(band.count).toBe(1)
    expect(band.systemOfBand).toBe(measure < 2 ? 0 : 1)
    expect(band.systemOfBand).toBe(band.systemOfSlot)
    expect(band.firstInSystem).toBe(true)
    expect(band.rect).toEqual(band.slotBand)
    expect(band.fill).toBe(band.token)
    expect((await markup(page)).map(stripBand)).toEqual(before)
  }

  expect(await setOverlays(page, NONE)).toBeNull()
  expect((await readBand(page, 0)).count).toBe(0)
  expect(await markup(page)).toEqual(before)
})

// @test-link [[rule_no_grading_or_mismatch_signal]]
// @test-link [[module_notation_note_identity_overlays]]
test('an identity outside the phrase’s attacks is rejected and draws nothing', async ({ page }) => {
  await openHarness(page, DESKTOP_VIEWPORT, 'fixture=simple&width=1200')
  const noteheads = await page.locator('svg.staff-svg [data-note-part="notehead"]').count()
  const full: NotationHarnessOverlays = {
    startMarker: { phraseNumber: 1, measureIndex: 0, eventIndex: 0 },
    playheadMeasure: 1,
    acknowledged: [
      { phraseNumber: 1, measureIndex: 1, eventIndex: 1 },
      { phraseNumber: 1, measureIndex: 1, eventIndex: 4 },
    ],
  }
  expect(await setOverlays(page, full)).toBeNull()
  const drawn = await markup(page)
  expect(await page.locator('svg.staff-svg [data-note-part="notehead"]').count()).toBe(noteheads)

  const outside: Record<string, Identity> = {
    // Measure 0's half rest, event 1.
    'a rest': { phraseNumber: 1, measureIndex: 0, eventIndex: 1 },
    'a wrong phrase number': { phraseNumber: 2, measureIndex: 0, eventIndex: 0 },
    'an out-of-range event index': { phraseNumber: 1, measureIndex: 0, eventIndex: 99 },
    // Measure 2's first glyph continues measure 1's tied quarter: its own index names no attack.
    'a tie continuation’s own index': { phraseNumber: 1, measureIndex: 2, eventIndex: 0 },
  }
  for (const [name, identity] of Object.entries(outside)) {
    const asAck = await setOverlays(page, { ...full, acknowledged: [identity] })
    expect(asAck, `${name} as an acknowledgement`).toBe('ScoreOverlayError')
    expect(await markup(page), `${name} as an acknowledgement`).toEqual(drawn)
    const asMarker = await setOverlays(page, { ...NONE, startMarker: identity })
    expect(asMarker, `${name} as the start marker`).toBe('ScoreOverlayError')
    expect(await markup(page), `${name} as the start marker`).toEqual(drawn)
  }
  expect(await page.locator('svg.staff-svg [data-note-part="notehead"]').count()).toBe(noteheads)
})

// @test-link [[module_notation_note_identity_overlays]]
test('a re-engrave keeps the band, the acknowledged notes and the start marker', async ({
  page,
}) => {
  await openHarness(page, DESKTOP_VIEWPORT, 'fixture=simple&width=1200')
  const acknowledged = [
    { phraseNumber: 1, measureIndex: 1, eventIndex: 1 },
    { phraseNumber: 1, measureIndex: 1, eventIndex: 4 },
  ] as const
  const overlays: NotationHarnessOverlays = {
    startMarker: { phraseNumber: 1, measureIndex: 0, eventIndex: 0 },
    playheadMeasure: 1,
    acknowledged,
  }
  expect(await setOverlays(page, overlays)).toBeNull()
  const svgBefore = await page.$eval('svg.staff-svg', (svg) => svg.getAttribute('viewBox'))

  await page.evaluate(() => {
    window.__notationHarness = { state: 'pending' }
    document.getElementById('app')!.style.width = '1000px'
  })
  await page.waitForFunction(() => window.__notationHarness.state !== 'pending')
  const harness = await page.evaluate(() => window.__notationHarness)
  expect(harness.state).toBe('ready')
  expect(harness.engraveCount).toBe(2)
  expect(await page.$eval('svg.staff-svg', (svg) => svg.getAttribute('viewBox'))).not.toBe(
    svgBefore,
  )

  const band = await readBand(page, 1)
  expect(band.count).toBe(1)
  expect(band.rect).toEqual(band.slotBand)
  const lit = await page.$$eval('svg.staff-svg .note-ack', (elements) =>
    elements.map((element) => element.getAttribute('data-note-id')),
  )
  const expectedLit = await page
    .locator('svg.staff-svg [data-note-id="1:1:1"], svg.staff-svg [data-note-id="1:1:4"]')
    .count()
  expect(new Set(lit)).toEqual(new Set(acknowledged.map(keyOf)))
  expect(lit.length).toBe(expectedLit)
  expect(await page.locator('svg.staff-svg .start-note-marker').count()).toBe(1)
})

const VISUAL_CASES = [
  {
    name: 'start-marker-desktop',
    viewport: DESKTOP_VIEWPORT,
    query: 'fixture=simple&width=1200',
    target: '.staff-content',
    overlays: { ...NONE, startMarker: { phraseNumber: 1, measureIndex: 0, eventIndex: 0 } },
  },
  {
    name: 'band-and-acks-desktop',
    viewport: DESKTOP_VIEWPORT,
    query: 'fixture=simple&width=1200',
    target: '.staff-content',
    overlays: {
      ...NONE,
      playheadMeasure: 1,
      // A dotted note, the flagged eighth, a beamed eighth and the quarter tied over the barline.
      acknowledged: [0, 1, 2, 4].map((eventIndex) => ({
        phraseNumber: 1,
        measureIndex: 1 as const,
        eventIndex,
      })),
    },
  },
  {
    name: 'band-and-system-break-tie-phone',
    viewport: PHONE_VIEWPORT,
    query: 'fixture=denseTie&width=700',
    target: '.staff-frame',
    overlays: {
      ...NONE,
      playheadMeasure: 2,
      acknowledged: [{ phraseNumber: 1, measureIndex: 1, eventIndex: 15 }],
    },
  },
] as const

// @test-link [[module_notation_note_identity_overlays]]
test.describe('score overlays match their baselines', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const { name, viewport, query, target, overlays } of VISUAL_CASES) {
      test(`${name}, ${theme} theme`, async ({ page }) => {
        await openHarness(page, viewport, `${query}&theme=${theme}`)
        expect(await setOverlays(page, overlays)).toBeNull()
        await expect(page.locator(target)).toHaveScreenshot(`${name}-${theme}.png`)
      })
    }
  }
})
