/**
 * A one-off calibration sweep for the staff layout constants in src/notation/notation-layout-policy.ts,
 * driving the harness's generated source. Three reports, printed to stdout; only the height
 * report is also asserted on:
 *
 * 1. Width: every (density x rhythmic variety x syncopation x seed x profile) combination at a
 *    container wide enough never to hit the legibility floor, recording each phrase's
 *    `requiredUnits` for one system of four measures (a function of the phrase's content only).
 * 2. Height: every (register x leapiness x contour x arpeggio chaos x density x seed x profile)
 *    combination, every register, leap size, contour and the two outer chaos levels, which reach
 *    the highest and lowest written notes and the widest beam groups, recording how far each
 *    system's inked content reaches, in engraving units from its system position's top edge, to
 *    compare with the position height (`NOTATION_SYSTEM_POSITION_UNITS`) and the staff's top line,
 *    which `planStaffPlacement` places for each profile's written range. The ink is measured on
 *    pixels, not with `getBBox()`: VexFlow draws every music glyph as SVG `<text>`, whose box is
 *    the font's whole line box, far taller than the glyph. The real start marker, the small
 *    triangle the overlay step draws over phrase 1's first attacked note, is drawn first, through
 *    the harness's `setOverlays`; then each system is screenshotted with a transparent background
 *    and its first and last rows holding ink, marker included, are found in the page's own canvas.
 *    The report asserts that every profile's ink, marker included, stays about one staff space
 *    inside the position at both ends.
 * 3. Phone: the width grid again, on landscape phone windows at the heights that matter (740 x 286,
 *    the smallest small-viewport height that holds two systems at the legibility floor; 740 x 300
 *    and 844 x 330, landscape phones with their browser toolbar showing), with the staff frame at
 *    the app's width there, counting how many phrases engrave (and at what staff space), how many
 *    are "notes too wide", and how many "no room".
 *
 * 4. My instrument (M3, the staff half): the height sweep's machinery on player-made written ranges
 *    (the harness's `myLow`/`myHigh` parameters), in treble clef and in bass clef (`myClef`), each
 *    engraved at the shared system-position size `planSystemPositionUnits` gives it in its clef,
 *    and on the three built-in profiles at a saved my instrument's grown size (`savedRange`),
 *    asserting that every ink keeps about one staff space from both edges and that each predicted
 *    size is the size engraved.
 *
 * Skipped unless `CALIBRATE=1`, so it never runs as part of the normal notation suite.
 */
import { expect, test, type Page } from '@playwright/test'

import { findIdentity, NONE, setOverlays } from './overlay-harness'

test.use({ baseURL: 'http://127.0.0.1:4174' })

test.skip(!process.env.CALIBRATE, 'Calibration only runs with CALIBRATE=1 (see report in stdout).')

/** VexFlow engraving units per staff space (NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE in the layout policy). */
const NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE = 10

/** A container width wide enough that no combination in the sweep can hit the legibility floor. */
const WIDE_CONTAINER_PX = 6000

const DENSITIES = ['Quarter', 'Eighth', 'Sixteenth'] as const
const RHYTHMIC_VARIETIES = ['Strict', 'Slightly varied', 'Heavily varied'] as const
const SYNCOPATIONS = ['Straight', 'Occasional offbeats'] as const
const SILENCE = 'Conversational'
const SEEDS = [1, 2, 3, 4, 5, 6] as const
const PROFILES = ['c-keyboard', 'bb-tenor', 'eb-alto'] as const
const REGISTERS = ['Low', 'Middle', 'High'] as const
const LEAPINESS = ['Smooth', 'Shaped', 'Leaping', 'Angular'] as const
const CONTOURS = ['Rising', 'Falling', 'Arch', 'Wandering'] as const
/**
 * The height sweep's arpeggio chaos levels: the two outer ones, which keep the run under half an
 * hour (the middle level, Varied, mixes their choices).
 */
const ARPEGGIO_CHAOS = ['Predictable', 'Chaotic'] as const
/** The height sweep's seeds: fewer than the width grid's, since it multiplies registers and leaps. */
const HEIGHT_SEEDS = [1, 2, 3] as const
/** The height sweep's frame width: every phrase fits it at the maximum scale. */
const INK_FRAME_WIDTH_PX = 2500

/**
 * The least room, in engraving units, every profile's ink (marker included) must leave at each end
 * of its system position: "about one staff space", the 0.8 space the staff placement keeps for
 * its estimated ink, less a pixel of rounding at the maximum scale.
 */
const MIN_POSITION_MARGIN_UNITS = 7.5

/** The engraved extent of one system's drawn content, in engraving units from its position's top. */
interface SystemExtent {
  readonly top: number
  readonly bottom: number
  /** The SVG's own height, in engraving units: the system position's height. */
  readonly positionUnits: number
  /** The staff's top line, in engraving units from the position's top. */
  readonly topLine: number
  /** The drawn start marker's top edge, for the system holding phrase 1's first attack. */
  readonly markerTop: number | null
}

type ComboResult =
  | {
      readonly ok: true
      readonly requiredUnits: number
      readonly staffSpacePx: number
      /** The shared system-position size the harness engraved with, in engraving units. */
      readonly systemPositionUnits: number
      readonly extents: readonly SystemExtent[]
    }
  | {
      readonly ok: false
      readonly code: string
      readonly details?: Readonly<Record<string, number>> | undefined
    }

/** Intent: build the harness URL for one combination; every generation control is explicit. */
function comboUrl(controls: Readonly<Record<string, string>>, frameWidthPx: number): string {
  const params = new URLSearchParams({
    source: 'generated',
    width: String(frameWidthPx),
    tonal: 'C',
    collection: 'Major',
    silence: SILENCE,
    syncopation: 'Straight',
    variety: 'Strict',
    register: 'Middle',
    ...controls,
  })
  return `/?${params.toString()}`
}

/**
 * Intent: find each system's inked rows, start marker included, in engraving units from its SVG's
 * top edge (the system position's top), by screenshotting the SVG over a transparent page and
 * scanning the alpha channel of the decoded PNG in the page's own canvas; and the drawn start
 * marker's own top edge, in the system that holds it.
 */
async function measureInk(
  page: Page,
  staffSpacePx: number,
  staffTopLineUnits: number,
): Promise<readonly SystemExtent[]> {
  await page.addStyleTag({
    content: 'html, body, .staff-frame { background: transparent !important; }',
  })
  const scale = staffSpacePx / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
  const systems = page.locator('svg.staff-svg')
  const extents: SystemExtent[] = []
  for (let index = 0; index < (await systems.count()); index += 1) {
    const svg = systems.nth(index)
    const markerTopPx = await svg.evaluate((element) => {
      const marker = element.querySelector('.start-note-marker')
      if (marker === null) return null
      return marker.getBoundingClientRect().top - element.getBoundingClientRect().top
    })
    const png = await svg.screenshot({ omitBackground: true })
    const rows = await page.evaluate(async (base64) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      const alpha = context.getImageData(0, 0, canvas.width, canvas.height).data
      const inked = (x: number, y: number): boolean => alpha[(y * canvas.width + x) * 4 + 3]! > 32
      let top = -1
      let bottom = -1
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          if (inked(x, y)) {
            if (top < 0) top = y
            bottom = y + 1
            break
          }
        }
      }
      return { top, bottom, height: canvas.height }
    }, png.toString('base64'))
    extents.push({
      top: rows.top / scale,
      bottom: rows.bottom / scale,
      positionUnits: rows.height / scale,
      topLine: staffTopLineUnits,
      markerTop: markerTopPx === null ? null : markerTopPx / scale,
    })
  }
  return extents
}

/**
 * Intent: run one combination and classify its result -- a thrown generation failure surfaces as an
 * uncaught page error (the harness's `runGeneratedSource` throws rather than publishing a code), so
 * both that path and the harness's own published error/ready states are handled. A ready result
 * also reports each system SVG's drawn extent in its own viewBox units.
 */
async function runCombo(page: Page, url: string, withInk = false): Promise<ComboResult> {
  let pageErrorMessage: string | null = null
  let rejectOnPageError: (error: Error) => void = () => {}
  const pageError = new Promise<never>((_, reject) => {
    rejectOnPageError = reject
  })
  pageError.catch(() => {})
  const onPageError = (error: Error): void => {
    pageErrorMessage = error.message
    rejectOnPageError(error)
  }
  page.on('pageerror', onPageError)

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  try {
    // A thrown generation failure never publishes a settled state: stop at the page error.
    await Promise.race([
      page.waitForFunction(
        () => window.__notationHarness && window.__notationHarness.state !== 'pending',
        { timeout: 8000 },
      ),
      pageError,
    ])
  } catch {
    // Either the page error above, or no settled state within the timeout (reported below).
  }
  page.off('pageerror', onPageError)

  if (pageErrorMessage !== null) {
    const match = /code "([^"]+)"/.exec(pageErrorMessage)
    return { ok: false, code: match?.[1] ?? pageErrorMessage }
  }

  const harnessState = await page.evaluate(() => window.__notationHarness)
  if (harnessState.state === 'ready' && harnessState.engraved) {
    if (withInk) {
      // The start marker over phrase 1's first attacked note, drawn by the real overlay step.
      const startMarker = findIdentity(harnessState, () => true)
      const overlayError = await setOverlays(page, { ...NONE, startMarker })
      if (overlayError !== null) return { ok: false, code: overlayError }
    }
    const extents = withInk
      ? await measureInk(page, harnessState.engraved.staffSpacePx, harnessState.staffTopLineUnits!)
      : []
    return {
      ok: true,
      requiredUnits: harnessState.engraved.requiredUnits,
      staffSpacePx: harnessState.engraved.staffSpacePx,
      systemPositionUnits: harnessState.systemPositionUnits!,
      extents,
    }
  }
  return {
    ok: false,
    code: harnessState.errorCode ?? 'unknown',
    details: harnessState.errorDetails,
  }
}

/** Intent: the median of a non-empty, already-sorted numeric array. */
function median(sorted: readonly number[]): number {
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

/** Intent: every (density, variety, syncopation, seed, profile) combination of the width grid. */
function widthGrid(): readonly Readonly<Record<string, string>>[] {
  return DENSITIES.flatMap((density) =>
    RHYTHMIC_VARIETIES.flatMap((variety) =>
      SYNCOPATIONS.flatMap((syncopation) =>
        SEEDS.flatMap((seed) =>
          PROFILES.map((profile) => ({
            density,
            variety,
            syncopation,
            seed: String(seed),
            profile,
          })),
        ),
      ),
    ),
  )
}

/**
 * Intent: every (leapiness, contour, arpeggio chaos, density, seed, profile) combination of the
 * height sweep for one register, as harness controls.
 */
function heightGrid(register: (typeof REGISTERS)[number]) {
  return LEAPINESS.flatMap((leapiness) =>
    CONTOURS.flatMap((contour) =>
      ARPEGGIO_CHAOS.flatMap((chaos) =>
        DENSITIES.flatMap((density) =>
          HEIGHT_SEEDS.flatMap((seed) =>
            PROFILES.map((profile) => ({
              register,
              leapiness,
              contour,
              chaos,
              density,
              profile,
              seed: String(seed),
            })),
          ),
        ),
      ),
    ),
  )
}

/** The height sweep's running extremes for one profile and register, in engraving units. */
interface Extremes {
  top: number
  bottom: number
  markerTop: number
  topLine: number
  positionUnits: number
  n: number
  atEdge: number
}

/**
 * Intent: widen one profile and register's extremes by one ready combination's system extents,
 * counting the systems whose ink touches the SVG's first or last row.
 */
function recordExtents(entry: Extremes, extents: readonly SystemExtent[]): void {
  for (const extent of extents) {
    entry.top = Math.min(entry.top, extent.top)
    entry.bottom = Math.max(entry.bottom, extent.bottom)
    if (extent.markerTop !== null) entry.markerTop = Math.min(entry.markerTop, extent.markerTop)
    entry.topLine = extent.topLine
    entry.positionUnits = extent.positionUnits
    // Ink on the SVG's first or last row may continue past the position's edge.
    if (extent.top <= 0.5 || extent.bottom >= extent.positionUnits - 0.5) entry.atEdge += 1
  }
}

const STAFF_SPACES_PX = [7, 6, 5, 4.5] as const

// @test-link [[module_notation_layout_preflight]]
test('reports requiredUnits for one system of four measures across the width grid', async ({
  page,
}) => {
  test.setTimeout(15 * 60 * 1000)
  const requiredUnitsByCell = new Map<string, number[]>()
  const failures: string[] = []

  for (const controls of widthGrid()) {
    const result = await runCombo(page, comboUrl(controls, WIDE_CONTAINER_PX))
    const cellKey = `${controls.density}/${controls.variety}`
    if (result.ok) {
      const bucket = requiredUnitsByCell.get(cellKey) ?? []
      bucket.push(result.requiredUnits)
      requiredUnitsByCell.set(cellKey, bucket)
    } else {
      failures.push(`${JSON.stringify(controls)}: ${result.code}`)
    }
  }

  const lines: string[] = ['=== Notation width calibration report (one system) ===']
  lines.push(
    'density/variety | n | min requiredUnits | median | max | ' +
      STAFF_SPACES_PX.map((px) => `widest at ${px}px/space`).join(' | '),
  )
  for (const density of DENSITIES) {
    for (const variety of RHYTHMIC_VARIETIES) {
      const cellKey = `${density}/${variety}`
      const values = (requiredUnitsByCell.get(cellKey) ?? []).slice().sort((a, b) => a - b)
      if (values.length === 0) {
        lines.push(`${cellKey} | 0 | (no successful runs)`)
        continue
      }
      const max = values[values.length - 1]!
      const widths = STAFF_SPACES_PX.map(
        (px) => `${Math.round((max * px) / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE)}px`,
      )
      lines.push(
        `${cellKey} | ${values.length} | ${values[0]!.toFixed(1)} | ${median(values).toFixed(1)} | ` +
          `${max.toFixed(1)} | ${widths.join(' | ')}`,
      )
    }
  }
  lines.push('', `Failures: ${failures.length}`, ...failures.map((failure) => `  - ${failure}`))
  console.log(lines.join('\n'))
  expect(requiredUnitsByCell.size).toBeGreaterThan(0)
})

// @test-link [[module_notation_layout_preflight]]
test('reports how far each system reaches above and below its staff, per profile and register, and keeps it inside the position', async ({
  page,
}) => {
  test.setTimeout(40 * 60 * 1000)
  // Wide enough for every phrase at the maximum scale, and narrow enough to screenshot in one go.
  await page.setViewportSize({ width: 2600, height: 900 })
  const extremes = new Map<string, Extremes>()
  const failures: string[] = []

  for (const register of REGISTERS) {
    for (const controls of heightGrid(register)) {
      const result = await runCombo(page, comboUrl(controls, INK_FRAME_WIDTH_PX), true)
      if (!result.ok) {
        failures.push(
          `${JSON.stringify(controls)}: ${result.code} ${JSON.stringify(result.details ?? {})}`,
        )
        continue
      }
      const key = `${controls.profile}/${register}`
      const entry = extremes.get(key) ?? {
        top: Infinity,
        bottom: -Infinity,
        markerTop: Infinity,
        topLine: 0,
        positionUnits: 0,
        n: 0,
        atEdge: 0,
      }
      recordExtents(entry, result.extents)
      entry.n += 1
      extremes.set(key, entry)
    }
    console.log(`height sweep: register ${register} done, ${failures.length} failures so far`)
  }

  const lines: string[] = [
    '=== Notation height calibration report (inked rows, units from the position top) ===',
  ]
  lines.push(
    'profile/register | n | top line | highest ink | start marker top | lowest ink | ' +
      'room above (marker included) | room below | systems with ink at an edge',
  )
  const tooTight: string[] = []
  let smallestRoom = Infinity
  for (const [key, entry] of extremes) {
    const roomAbove = Math.min(entry.top, entry.markerTop)
    const roomBelow = entry.positionUnits - entry.bottom
    smallestRoom = Math.min(smallestRoom, roomAbove, roomBelow)
    lines.push(
      `${key} | ${entry.n} | ${entry.topLine.toFixed(1)} | ${entry.top.toFixed(1)} | ` +
        `${entry.markerTop.toFixed(1)} | ${entry.bottom.toFixed(1)} | ${roomAbove.toFixed(1)} | ` +
        `${roomBelow.toFixed(1)} | ${entry.atEdge}`,
    )
    if (roomAbove < MIN_POSITION_MARGIN_UNITS || roomBelow < MIN_POSITION_MARGIN_UNITS) {
      tooTight.push(`${key}: ${roomAbove.toFixed(1)} above, ${roomBelow.toFixed(1)} below`)
    }
  }
  lines.push(
    '',
    `Smallest room at a position edge: ${smallestRoom.toFixed(1)}`,
    `Failures: ${failures.length}`,
    ...failures.map((failure) => `  - ${failure}`),
  )
  console.log(lines.join('\n'))
  expect(extremes.size).toBeGreaterThan(0)
  expect(tooTight, 'ink closer than about one staff space to a position edge').toEqual([])
})

/**
 * The landscape phone windows the sweep runs on, with the staff frame's outer width there: the
 * smallest height that holds two systems at the floor, then two phones with their toolbar showing.
 */
const PHONE_WINDOWS = [
  { viewport: { width: 740, height: 286 }, frameWidthPx: 708 },
  { viewport: { width: 740, height: 300 }, frameWidthPx: 708 },
  { viewport: { width: 844, height: 330 }, frameWidthPx: 796 },
] as const

// @test-link [[module_notation_layout_preflight]]
test('reports the split layout outcomes on landscape phone windows', async ({ page }) => {
  test.setTimeout(20 * 60 * 1000)
  const lines: string[] = ['=== Notation phone calibration report (split layout) ===']
  lines.push(
    'window | density/variety | n | engraved | notes too wide | no room | other | staff space min/median px',
  )

  for (const { viewport, frameWidthPx } of PHONE_WINDOWS) {
    await page.setViewportSize(viewport)
    const byCell = new Map<
      string,
      { ok: number[]; tooWide: number; noRoom: number; other: number }
    >()
    for (const controls of widthGrid()) {
      const result = await runCombo(page, comboUrl(controls, frameWidthPx))
      const cellKey = `${controls.density}/${controls.variety}`
      const tally = byCell.get(cellKey) ?? { ok: [], tooWide: 0, noRoom: 0, other: 0 }
      if (result.ok) tally.ok.push(result.staffSpacePx)
      else if (result.code === 'notation_notes_too_wide') tally.tooWide += 1
      else if (result.code === 'notation_no_room') tally.noRoom += 1
      else tally.other += 1
      byCell.set(cellKey, tally)
    }
    for (const [cellKey, tally] of byCell) {
      const sorted = tally.ok.slice().sort((a, b) => a - b)
      const spaces =
        sorted.length === 0 ? '--' : `${sorted[0]!.toFixed(2)}/${median(sorted).toFixed(2)}`
      const n = tally.ok.length + tally.tooWide + tally.noRoom + tally.other
      lines.push(
        `${viewport.width}x${viewport.height} | ${cellKey} | ${n} | ${tally.ok.length} | ` +
          `${tally.tooWide} | ${tally.noRoom} | ${tally.other} | ${spaces}`,
      )
    }
  }
  console.log(lines.join('\n'))
  expect(lines.length).toBeGreaterThan(2)
})

/**
 * One written range the my-instrument sweep engraves, with what the layout policy predicts for it
 * (`planStaffInk` and `planSystemPositionUnits`, in engraving units): the ink above and below the
 * staff's top line, start marker included, and the shared system-position size.
 */
interface MyInstrumentCase {
  readonly name: string
  /**
   * The harness parameters naming the instrument (and, for `lowF`, the written tonal centre); a
   * player-made instrument is in treble clef unless they name `myClef`.
   */
  readonly params: Readonly<Record<string, string>>
  readonly inkAbove: number
  readonly inkBelow: number
  readonly size: number
  /** The registers, leapiness levels and seeds it is swept over. */
  readonly grid: MyInstrumentGrid
}

/** The axes of one case's sweep; contours, the two outer chaos levels and densities are all swept. */
interface MyInstrumentGrid {
  readonly leapiness: readonly (typeof LEAPINESS)[number][]
  readonly seeds: readonly number[]
}

/** The player-made ranges' grid: every leapiness level, seeds 1 and 2. */
const MY_INSTRUMENT_GRID: MyInstrumentGrid = { leapiness: LEAPINESS, seeds: [1, 2] }
/** The built-ins' grid inside a grown size: the outer leapiness levels, seed 1. */
const BUILT_IN_IN_GROWN_GRID: MyInstrumentGrid = { leapiness: ['Smooth', 'Angular'], seeds: [1] }

/** The `wide` range (written C2 to C6), whose grown size the built-ins are swept in. */
const WIDE_SAVED_RANGE = '36-84'

/**
 * The my-instrument sweep's cases: six player-made written ranges with no transposition in treble
 * clef, then the three built-in profiles at the `wide` range's grown size, then four player-made
 * ranges in bass clef. The predictions are the layout policy's own figures
 * (tests/unit/notation/system-position-size.spec.ts checks them).
 */
const MY_INSTRUMENT_CASES: readonly MyInstrumentCase[] = [
  // Written E4 to E6: the highest two-octave range keeping 16 spaces.
  {
    name: 'E4-E6 64-88',
    params: { myLow: '64', myHigh: '88' },
    inkAbove: 67,
    inkBelow: 75,
    size: 160,
    grid: MY_INSTRUMENT_GRID,
  },
  // Written E3 to D6, 34 semitones: register windows of 17 semitones, so wider beam groups.
  {
    name: 'E3-D6 52-86',
    params: { myLow: '52', myHigh: '86' },
    inkAbove: 72,
    inkBelow: 85,
    size: 180,
    grid: MY_INSTRUMENT_GRID,
  },
  // Written C2 to C4.
  {
    name: 'low 36-60',
    params: { myLow: '36', myHigh: '60' },
    inkAbove: 47,
    inkBelow: 127,
    size: 190,
    grid: MY_INSTRUMENT_GRID,
  },
  // Written C6 to C8.
  {
    name: 'high 84-108',
    params: { myLow: '84', myHigh: '108' },
    inkAbove: 127,
    inkBelow: 60,
    size: 210,
    grid: MY_INSTRUMENT_GRID,
  },
  // Written C2 to C6, four octaves: register windows of two octaves, beam groups up to 14 steps.
  {
    name: 'wide 36-84',
    params: { myLow: '36', myHigh: '84' },
    inkAbove: 82,
    inkBelow: 127,
    size: 230,
    grid: MY_INSTRUMENT_GRID,
  },
  // Written F3 to F5 in F♯ major: its lowest note is spelled E♯3, one step under F3.
  {
    name: 'lowF 53-77 in F#',
    params: { myLow: '53', myHigh: '77', tonal: 'F#' },
    inkAbove: 62,
    inkBelow: 82,
    size: 160,
    grid: MY_INSTRUMENT_GRID,
  },
  // The built-ins (written C3 to C5, and C4 to C6) at the wide range's grown size.
  {
    name: 'c-keyboard in 230',
    params: { profile: 'c-keyboard', savedRange: WIDE_SAVED_RANGE },
    inkAbove: 52,
    inkBelow: 92,
    size: 230,
    grid: BUILT_IN_IN_GROWN_GRID,
  },
  {
    name: 'bb-tenor in 230',
    params: { profile: 'bb-tenor', savedRange: WIDE_SAVED_RANGE },
    inkAbove: 62,
    inkBelow: 75,
    size: 230,
    grid: BUILT_IN_IN_GROWN_GRID,
  },
  {
    name: 'eb-alto in 230',
    params: { profile: 'eb-alto', savedRange: WIDE_SAVED_RANGE },
    inkAbove: 62,
    inkBelow: 75,
    size: 230,
    grid: BUILT_IN_IN_GROWN_GRID,
  },
  // Bass clef, whose staff sits 12 letter steps under treble's (top line A3, middle line D3).
  // Written E0 to E5, the bass-clef bound (spec D294): the staff positions of C2 to C7 in treble.
  {
    name: 'bass bound E0-E5 16-76',
    params: { myLow: '16', myHigh: '76', myClef: 'bass' },
    inkAbove: 92,
    inkBelow: 127,
    size: 240,
    grid: MY_INSTRUMENT_GRID,
  },
  // Written C2 to C4: 16 spaces in bass clef, against 19 in treble (`low` above).
  {
    name: 'bass low C2-C4 36-60',
    params: { myLow: '36', myHigh: '60', myClef: 'bass' },
    inkAbove: 62,
    inkBelow: 75,
    size: 160,
    grid: MY_INSTRUMENT_GRID,
  },
  // Written E3 to E5: the bound's top two octaves.
  {
    name: 'bass high E3-E5 52-76',
    params: { myLow: '52', myHigh: '76', myClef: 'bass' },
    inkAbove: 92,
    inkBelow: 60,
    size: 170,
    grid: MY_INSTRUMENT_GRID,
  },
  // Written E0 to E4, four octaves: the mirror of the treble `wide` C2 to C6.
  {
    name: 'bass wide E0-E4 16-64',
    params: { myLow: '16', myHigh: '64', myClef: 'bass' },
    inkAbove: 82,
    inkBelow: 127,
    size: 230,
    grid: MY_INSTRUMENT_GRID,
  },
]

/** Intent: every (register, leapiness, contour, chaos, density, seed) combination of one case. */
function myInstrumentGrid(grid: MyInstrumentGrid) {
  return REGISTERS.flatMap((register) =>
    grid.leapiness.flatMap((leapiness) =>
      CONTOURS.flatMap((contour) =>
        ARPEGGIO_CHAOS.flatMap((chaos) =>
          DENSITIES.flatMap((density) =>
            grid.seeds.map((seed) => ({
              register,
              leapiness,
              contour,
              chaos,
              density,
              seed: String(seed),
            })),
          ),
        ),
      ),
    ),
  )
}

// @test-link [[module_notation_layout_preflight]]
test("reports how far my instrument's ink reaches in its shared system-position size, and keeps it inside", async ({
  page,
}) => {
  test.setTimeout(60 * 60 * 1000)
  await page.setViewportSize({ width: 2600, height: 900 })
  const lines: string[] = [
    '=== My instrument height calibration report (inked rows, units from the position top) ===',
    'case | clef | n | failures | predicted ink above/below/total (spaces) | predicted size (spaces) | ' +
      'engraved size | measured size | top line | highest ink | start marker top | lowest ink | ' +
      'room above (marker included) | room below | systems with ink at an edge',
  ]
  const tooTight: string[] = []
  const wrongSize: string[] = []
  const failures: string[] = []
  let smallestRoom = Infinity

  for (const testCase of MY_INSTRUMENT_CASES) {
    const entry: Extremes = {
      top: Infinity,
      bottom: -Infinity,
      markerTop: Infinity,
      topLine: 0,
      positionUnits: 0,
      n: 0,
      atEdge: 0,
    }
    const engravedSizes = new Set<number>()
    let caseFailures = 0
    for (const controls of myInstrumentGrid(testCase.grid)) {
      const all = { ...controls, ...testCase.params }
      const result = await runCombo(page, comboUrl(all, INK_FRAME_WIDTH_PX), true)
      if (!result.ok) {
        caseFailures += 1
        failures.push(
          `${testCase.name} ${JSON.stringify(controls)}: ${result.code} ${JSON.stringify(result.details ?? {})}`,
        )
        continue
      }
      engravedSizes.add(result.systemPositionUnits)
      for (const extent of result.extents) {
        if (Math.abs(extent.positionUnits - testCase.size) > 1) {
          wrongSize.push(`${testCase.name}: measured ${extent.positionUnits.toFixed(1)}`)
        }
      }
      recordExtents(entry, result.extents)
      entry.n += 1
    }
    const roomAbove = Math.min(entry.top, entry.markerTop)
    const roomBelow = entry.positionUnits - entry.bottom
    smallestRoom = Math.min(smallestRoom, roomAbove, roomBelow)
    const inkTotal = testCase.inkAbove + testCase.inkBelow
    const engraved = [...engravedSizes].join('/')
    if (engraved !== String(testCase.size)) {
      wrongSize.push(`${testCase.name}: engraved at ${engraved}, predicted ${testCase.size}`)
    }
    // A built-in's clef, and a player-made instrument's unless it names one, is treble.
    const clef = testCase.params.myClef ?? 'treble'
    lines.push(
      `${testCase.name} | ${clef} | ${entry.n} | ${caseFailures} | ` +
        `${testCase.inkAbove}/${testCase.inkBelow}/${inkTotal} (${(inkTotal / 10).toFixed(1)}) | ` +
        `${testCase.size} (${testCase.size / 10}) | ${engraved} | ${entry.positionUnits.toFixed(1)} | ` +
        `${entry.topLine.toFixed(1)} | ${entry.top.toFixed(1)} | ${entry.markerTop.toFixed(1)} | ` +
        `${entry.bottom.toFixed(1)} | ${roomAbove.toFixed(1)} | ${roomBelow.toFixed(1)} | ${entry.atEdge}`,
    )
    if (
      entry.n === 0 ||
      roomAbove < MIN_POSITION_MARGIN_UNITS ||
      roomBelow < MIN_POSITION_MARGIN_UNITS
    ) {
      tooTight.push(
        `${testCase.name}: ${roomAbove.toFixed(1)} above, ${roomBelow.toFixed(1)} below`,
      )
    }
    console.log(`my instrument sweep: ${testCase.name} done, ${caseFailures} failures`)
  }

  lines.push(
    '',
    `Smallest room at a position edge: ${smallestRoom.toFixed(1)}`,
    `Failures: ${failures.length}`,
    ...failures.map((failure) => `  - ${failure}`),
  )
  console.log(lines.join('\n'))
  expect(wrongSize, 'a predicted size that is not the engraved size').toEqual([])
  expect(tooTight, 'ink closer than about one staff space to a position edge').toEqual([])
})
