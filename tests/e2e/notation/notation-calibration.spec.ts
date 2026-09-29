/**
 * A one-off calibration sweep for the staff layout constants in src/notation/notation-layout-policy.ts,
 * driving the harness's generated source. Three reports, printed to stdout and not asserted on:
 *
 * 1. Width: every (density x rhythmic variety x syncopation x seed x profile) combination at a
 *    container wide enough never to hit the legibility floor, recording each phrase's
 *    `requiredUnits` for one system of four measures (a function of the phrase's content only).
 * 2. Height: every (register x leapiness x contour x density x seed x profile) combination, every
 *    register, leap size and contour, which reach the highest and lowest written notes, recording how far each
 *    system's inked content reaches, in engraving units from its system position's top edge, to
 *    compare with the position height (`NOTATION_SYSTEM_POSITION_UNITS`) and the staff's top line
 *    (`NOTATION_STAFF_TOP_LINE_UNITS`). The ink is measured on pixels, not with `getBBox()`: VexFlow draws
 *    every music glyph as SVG `<text>`, whose box is the font's whole line box, far taller than the
 *    glyph. Each system is screenshotted with a transparent background and its first and last rows
 *    holding ink are found in the page's own canvas.
 * 3. Phone: the width grid again, on the two landscape phone windows the app is checked on (740 x
 *    360 and 844 x 390), with the staff frame at the app's width there, counting how many phrases
 *    engrave (and at what staff space), how many are "notes too wide", and how many "no room".
 *
 * Skipped unless `CALIBRATE=1`, so it never runs as part of the normal notation suite.
 */
import { expect, test, type Page } from '@playwright/test'

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
/** The height sweep's seeds: fewer than the width grid's, since it multiplies registers and leaps. */
const HEIGHT_SEEDS = [1, 2, 3] as const
/** The height sweep's frame width: every phrase fits it at the maximum scale. */
const INK_FRAME_WIDTH_PX = 2500

/** The engraved extent of one system's drawn content, in engraving units from its position's top. */
interface SystemExtent {
  readonly top: number
  readonly bottom: number
  /** The SVG's own height, in engraving units: the system position's height. */
  readonly positionUnits: number
}

type ComboResult =
  | {
      readonly ok: true
      readonly requiredUnits: number
      readonly staffSpacePx: number
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
 * Intent: find each system's inked rows, in engraving units from its SVG's top edge (the system
 * position's top), by screenshotting the SVG over a transparent page and scanning the alpha
 * channel of the decoded PNG in the page's own canvas.
 */
async function measureInk(page: Page, staffSpacePx: number): Promise<readonly SystemExtent[]> {
  await page.addStyleTag({
    content: 'html, body, .staff-frame { background: transparent !important; }',
  })
  const scale = staffSpacePx / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
  const systems = page.locator('svg.staff-svg')
  const extents: SystemExtent[] = []
  for (let index = 0; index < (await systems.count()); index += 1) {
    const png = await systems.nth(index).screenshot({ omitBackground: true })
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
      let top = -1
      let bottom = -1
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          if (alpha[(y * canvas.width + x) * 4 + 3]! > 32) {
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
    const extents = withInk ? await measureInk(page, harnessState.engraved.staffSpacePx) : []
    return {
      ok: true,
      requiredUnits: harnessState.engraved.requiredUnits,
      staffSpacePx: harnessState.engraved.staffSpacePx,
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
test('reports how far each system reaches above and below its staff, per profile and register', async ({
  page,
}) => {
  test.setTimeout(20 * 60 * 1000)
  // Wide enough for every phrase at the maximum scale, and narrow enough to screenshot in one go.
  await page.setViewportSize({ width: 2600, height: 900 })
  const extremes = new Map<string, { top: number; bottom: number; n: number; atEdge: number }>()
  const failures: string[] = []

  for (const register of REGISTERS) {
    for (const leapiness of LEAPINESS) {
      for (const contour of CONTOURS) {
        for (const density of DENSITIES) {
          for (const seed of HEIGHT_SEEDS) {
            for (const profile of PROFILES) {
              const controls = {
                register,
                leapiness,
                contour,
                density,
                profile,
                seed: String(seed),
              }
              const result = await runCombo(page, comboUrl(controls, INK_FRAME_WIDTH_PX), true)
              if (!result.ok) {
                failures.push(
                  `${JSON.stringify(controls)}: ${result.code} ${JSON.stringify(result.details ?? {})}`,
                )
                continue
              }
              const key = `${profile}/${register}`
              const entry = extremes.get(key) ?? {
                top: Infinity,
                bottom: -Infinity,
                n: 0,
                atEdge: 0,
              }
              for (const extent of result.extents) {
                entry.top = Math.min(entry.top, extent.top)
                entry.bottom = Math.max(entry.bottom, extent.bottom)
                // Ink on the SVG's first or last row may continue past the position's edge.
                if (extent.top <= 0.5 || extent.bottom >= extent.positionUnits - 0.5)
                  entry.atEdge += 1
              }
              entry.n += 1
              extremes.set(key, entry)
            }
          }
        }
      }
    }
    console.log(`height sweep: register ${register} done, ${failures.length} failures so far`)
  }

  const lines: string[] = [
    '=== Notation height calibration report (inked rows, units from the position top) ===',
  ]
  lines.push(
    'profile/register | n | highest ink top | lowest ink bottom | systems with ink at an edge',
  )
  for (const [key, entry] of extremes) {
    lines.push(
      `${key} | ${entry.n} | ${entry.top.toFixed(1)} | ${entry.bottom.toFixed(1)} | ${entry.atEdge}`,
    )
  }
  lines.push('', `Failures: ${failures.length}`, ...failures.map((failure) => `  - ${failure}`))
  console.log(lines.join('\n'))
  expect(extremes.size).toBeGreaterThan(0)
})

/** The landscape phone windows the app is checked on, with the staff frame's outer width there. */
const PHONE_WINDOWS = [
  { viewport: { width: 740, height: 360 }, frameWidthPx: 708 },
  { viewport: { width: 844, height: 390 }, frameWidthPx: 796 },
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
