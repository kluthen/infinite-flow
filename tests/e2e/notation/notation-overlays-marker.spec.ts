/**
 * End-to-end coverage of the start marker's placement (D133) against the notation harness, checked
 * on drawn pixels, not SVG boxes: over the first attack of the simple fixture and of generated
 * phrases across every profile and register, the marker is 1.2 x 1 staff spaces, centred on the
 * notehead, inside the top system position, half a space over the note's own ink (ledger lines
 * and beam included) and the staff, and clear of the note's chord symbol, which never moves. Two
 * cases with the drawn chord symbol raised check both sides of the 2-space rule.
 */
import { expect, test, type Page } from '@playwright/test'

import {
  DESKTOP_VIEWPORT,
  findIdentity,
  keyOf,
  NONE,
  openHarness,
  setOverlays,
  type Identity,
} from './overlay-harness'

test.use({ baseURL: 'http://127.0.0.1:4174' })

/** A box in CSS px relative to the top system SVG's top-left corner. */
interface Box {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

/**
 * Intent: show only the elements matched by `selectors` in the top system SVG, over a transparent
 * page, and return the box of their drawn pixels (null when nothing is inked) and how many inked
 * pixels fall inside `probe`. Pixels, not SVG boxes: every music glyph is `<text>`, whose box is the
 * font's whole line box, far taller than the glyph.
 */
async function inkOf(page: Page, selectors: readonly string[], probe: Box) {
  const clip = await page.evaluate((selected) => {
    const transparent = document.createElement('style')
    transparent.textContent = 'html, body, .staff-frame { background: transparent !important; }'
    document.head.appendChild(transparent)
    const svg = document.querySelector<SVGSVGElement>('svg.staff-svg')!
    svg.style.visibility = 'hidden'
    for (const element of svg.querySelectorAll<SVGElement>('*')) element.style.visibility = ''
    for (const selector of selected) {
      for (const element of svg.querySelectorAll<SVGElement>(selector)) {
        element.style.visibility = 'visible'
      }
    }
    const box = svg.getBoundingClientRect()
    return { x: box.x, y: box.y, width: box.width, height: box.height }
  }, selectors)
  // A page region, not the element: Playwright will not screenshot an element hidden this way.
  const png = await page.screenshot({ clip, omitBackground: true })
  return page.evaluate(
    async ({ base64, box, width }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      const alpha = context.getImageData(0, 0, canvas.width, canvas.height).data
      const ratio = image.width / width
      const pixel = 1 / ratio
      let inside = 0
      const ink = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          if (alpha[(y * canvas.width + x) * 4 + 3]! <= 32) continue
          const [px, py] = [x * pixel, y * pixel]
          ink.left = Math.min(ink.left, px)
          ink.top = Math.min(ink.top, py)
          ink.right = Math.max(ink.right, px + pixel)
          ink.bottom = Math.max(ink.bottom, py + pixel)
          const hit =
            px + pixel > box.left && px < box.right && py + pixel > box.top && py < box.bottom
          if (hit) inside += 1
        }
      }
      return { ink: ink.left === Infinity ? null : ink, inside }
    },
    { base64: png.toString('base64'), box: probe, width: clip.width },
  )
}

/** Intent: read the marker's box and shape, the note's notehead and staff top, and the chord box. */
async function readMarker(page: Page, key: string) {
  return page.evaluate((noteKey) => {
    const svg = document.querySelector('svg.staff-svg')!
    const origin = svg.getBoundingClientRect()
    const local = (element: Element) => {
      const box = element.getBoundingClientRect()
      return {
        left: box.left - origin.left,
        top: box.top - origin.top,
        right: box.right - origin.left,
        bottom: box.bottom - origin.top,
      }
    }
    const markers = Array.from(document.querySelectorAll('svg.staff-svg .start-note-marker'))
    const head = svg.querySelector(`[data-note-id="${noteKey}"][data-note-part="notehead"]`)!
    const chord = svg.querySelector(`[data-chord-for="${noteKey}"]`)
    return {
      count: markers.length,
      inTopSystem: markers[0]?.closest('svg') === svg,
      marker: markers[0] === undefined ? null : local(markers[0]),
      svg: { left: 0, top: 0, right: origin.width, bottom: origin.height },
      head: local(head),
      staffTop: local(head.closest('g.measure-slot')!.querySelector(':scope > g.vf-stave')!).top,
      chord: chord === null ? null : { box: local(chord), html: chord.outerHTML },
    }
  }, key)
}

const GENERATED_CONTROLS =
  'source=generated&width=1200&tonal=C&collection=Major&variety=Strict&syncopation=Straight' +
  '&silence=Conversational'
const MARKER_CASES: readonly string[] = [
  'fixture=simple&width=1200',
  ...['c-keyboard', 'bb-tenor', 'eb-alto'].flatMap((profile) =>
    ['Low', 'Middle', 'High'].flatMap((register) =>
      [1, 2].map(
        (seed) =>
          `${GENERATED_CONTROLS}&density=Eighth&profile=${profile}&register=${register}&seed=${seed}`,
      ),
    ),
  ),
  ...[3, 4, 5, 6, 7, 8].map(
    (seed) => `${GENERATED_CONTROLS}&density=Sixteenth&profile=bb-tenor&register=High&seed=${seed}`,
  ),
]

/**
 * Intent: set the start marker on `identity` and check it against D133 on the drawn pixels: one
 * marker, 1.2 x 1 staff spaces, centred on the notehead, inside the top system, clear of the
 * staff, half a space above the note's own ink (its ledger lines and beam included) and clear of
 * its chord symbol, which never moves. Returns where it went relative to the chord symbol.
 */
async function expectMarkerPlaced(
  page: Page,
  identity: Identity,
  space: number,
  label: string,
): Promise<'between' | 'above' | 'noChord'> {
  const key = keyOf(identity)
  const chordBefore = (await readMarker(page, key)).chord
  expect(await setOverlays(page, { ...NONE, startMarker: identity }), label).toBeNull()
  const read = await readMarker(page, key)
  const marker = read.marker!
  expect(read.count, label).toBe(1)
  expect(read.inTopSystem, label).toBe(true)
  expect(read.chord, `${label}: the chord symbol never moves`).toEqual(chordBefore)
  expect(marker.right - marker.left, label).toBeCloseTo(1.2 * space, 0)
  expect(marker.bottom - marker.top, label).toBeCloseTo(space, 0)
  const headCentre = (read.head.left + read.head.right) / 2
  expect(Math.abs((marker.left + marker.right) / 2 - headCentre), label).toBeLessThan(0.2 * space)
  expect(marker.top, `${label}: inside the top system position`).toBeGreaterThanOrEqual(0)
  expect(marker.left, label).toBeGreaterThanOrEqual(read.svg.left)
  expect(marker.right, label).toBeLessThanOrEqual(read.svg.right)

  const noteInk = await inkOf(
    page,
    [
      `[data-note-id="${key}"]`,
      `g.measure-slot > g.vf-stavenote:has([data-note-id="${key}"]) > path`,
      `g.vf-beam:has(> [data-note-id="${key}"])`,
    ],
    marker,
  )
  expect(noteInk.inside, `${label}: the marker overlaps the note's ink or beam`).toBe(0)
  // One pixel of slack: the ink is read off antialiased pixels.
  const reference = Math.min(noteInk.ink!.top, read.staffTop)
  expect(marker.bottom, `${label}: half a space over the note and staff`).toBeLessThanOrEqual(
    reference - 0.5 * space + 1,
  )
  if (read.chord === null) return 'noChord'
  const chordInk = await inkOf(page, [`[data-chord-for="${key}"]`], marker)
  expect(chordInk.inside, `${label}: the marker overlaps the chord symbol`).toBe(0)
  const chord = chordInk.ink!
  if (marker.bottom <= chord.top) {
    expect(marker.bottom, `${label}: half a space over the chord`).toBeLessThanOrEqual(
      chord.top - 0.5 * space + 1,
    )
    return 'above'
  }
  expect(marker.top, `${label}: half a space under the chord`).toBeGreaterThanOrEqual(
    chord.bottom + 0.5 * space - 1,
  )
  return 'between'
}

// @test-link [[module_notation_layout_preflight]]
// @test-link [[rule_starting_note_named]]
// @test-link [[module_notation_note_identity_overlays]]
test.describe('the start marker', () => {
  test('sits clear of its note, beam and chord symbol, inside the top system, for real phrases', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const placements = { between: 0, above: 0, noChord: 0 }
    for (const query of MARKER_CASES) {
      const harness = await openHarness(page, DESKTOP_VIEWPORT, query)
      const identity = findIdentity(harness, () => true)
      const space = harness.engraved!.staffSpacePx
      placements[await expectMarkerPlaced(page, identity, space, query)] += 1
    }
    console.log(`start marker placements: ${JSON.stringify(placements)}`)
    // VexFlow sets a chord symbol about one space over its note's stem tip or the staff, whichever
    // is higher, so real phrases leave no 2-space gap under it: the marker goes over it.
    expect(placements.above).toBeGreaterThan(0)
  })

  for (const { raise, placement } of [
    { raise: 3, placement: 'between' },
    { raise: 0.5, placement: 'above' },
  ] as const) {
    test(`goes ${placement} a chord symbol raised ${raise} spaces over its note`, async ({
      page,
    }) => {
      const harness = await openHarness(page, DESKTOP_VIEWPORT, 'fixture=simple&width=1200')
      const identity = findIdentity(harness, () => true)
      // The overlay step reads the drawn ink only, so moving the drawn chord symbol up stands in
      // for an engraving that leaves more room under it.
      await page.evaluate(
        ({ key, units }) => {
          for (const text of document.querySelectorAll(`[data-chord-for="${key}"] text`)) {
            text.setAttribute('y', String(Number(text.getAttribute('y')) - units))
          }
        },
        { key: keyOf(identity), units: raise * 10 },
      )
      const space = harness.engraved!.staffSpacePx
      expect(await expectMarkerPlaced(page, identity, space, `raised ${raise}`)).toBe(placement)
    })
  }
})
