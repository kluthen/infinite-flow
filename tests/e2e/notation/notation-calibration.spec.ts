/**
 * A one-off calibration sweep for NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX / NOTATION_MAX_STAFF_SPACE_PX
 * (src/notation/notation-layout-policy.ts): drives the harness's generated source across every
 * (density x rhythmic variety x syncopation x seed x profile) combination at a container width wide
 * enough to never hit the legibility floor, and records each result's `requiredUnits` (independent of
 * container width; a function of the written phrase's content only). A second sweep exercises the
 * two-system phone fallback: the same combination grid at a phone-breakpoint viewport and two
 * realistic phone container widths (667px, 768px), recording how many combinations land as one
 * system, two systems, or a typed legibility-floor error at each width. Skipped unless `CALIBRATE=1`,
 * so it never runs as part of the normal notation suite; its report is printed to stdout, not
 * asserted on.
 */
import { expect, test, type Page } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:4174' })

test.skip(!process.env.CALIBRATE, 'Calibration only runs with CALIBRATE=1 (see report in stdout).')

/** A container width wide enough that no combination in the sweep can hit the legibility floor. */
const WIDE_CONTAINER_PX = 6000

// ISS-004 retires the Mixed note density and its mixed-duration bar-1 forms; the calibration
// sweep now varies rhythmic variety across all three levels (Strict, Slightly varied, Heavily
// varied) so the engraving calibration still exercises mixed durations, since Heavily varied's
// extra beat cells are the closest replacement for what Mixed density used to cover.
const DENSITIES = ['Quarter', 'Eighth', 'Sixteenth'] as const
const RHYTHMIC_VARIETIES = ['Strict', 'Slightly varied', 'Heavily varied'] as const
const SYNCOPATIONS = ['Straight', 'Occasional offbeats'] as const
const SILENCE = 'Conversational'
const SEEDS = [1, 2, 3, 4, 5, 6] as const
const PROFILES = ['c-keyboard', 'bb-tenor', 'eb-alto'] as const

type ComboResult =
  | { readonly ok: true; readonly requiredUnits: number }
  | { readonly ok: false; readonly code: string }

/** Intent: build the harness URL for one calibration combination at an explicit container width. */
function comboUrlAtWidth(
  density: string,
  variety: string,
  syncopation: string,
  seed: number,
  profile: string,
  containerWidthPx: number,
): string {
  const params = new URLSearchParams({
    source: 'generated',
    seed: String(seed),
    width: String(containerWidthPx),
    tonal: 'C',
    collection: 'Major',
    density,
    variety,
    syncopation,
    silence: SILENCE,
    profile,
    register: 'Middle',
  })
  return `/?${params.toString()}`
}

/** Intent: build the harness URL for one calibration combination, every param supplied explicitly. */
function comboUrl(
  density: string,
  variety: string,
  syncopation: string,
  seed: number,
  profile: string,
): string {
  return comboUrlAtWidth(density, variety, syncopation, seed, profile, WIDE_CONTAINER_PX)
}

/**
 * Intent: run one combination and classify its result -- a thrown generation failure surfaces as an
 * uncaught page error (the harness's `runGeneratedSource` throws rather than publishing a code), so
 * both that path and the harness's own published error/ready states are handled.
 */
async function runCombo(page: Page, url: string): Promise<ComboResult> {
  let pageErrorMessage: string | null = null
  const onPageError = (error: Error): void => {
    pageErrorMessage = error.message
  }
  page.on('pageerror', onPageError)

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  try {
    await page.waitForFunction(
      () => window.__notationHarness && window.__notationHarness.state !== 'pending',
      { timeout: 8000 },
    )
  } catch {
    // A thrown generation failure prevents the harness from ever publishing a settled state.
  }
  page.off('pageerror', onPageError)

  if (pageErrorMessage !== null) {
    const match = /code "([^"]+)"/.exec(pageErrorMessage)
    return { ok: false, code: match?.[1] ?? pageErrorMessage }
  }

  const harnessState = await page.evaluate(() => window.__notationHarness)
  if (harnessState.state === 'ready' && harnessState.engraved) {
    return { ok: true, requiredUnits: harnessState.engraved.requiredUnits }
  }
  return { ok: false, code: harnessState.errorCode ?? 'unknown' }
}

/** Intent: the median of a non-empty, already-sorted numeric array. */
function median(sorted: readonly number[]): number {
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

const STAFF_SPACES_PX = [7, 6, 5, 4.5] as const
const TARGET_WIDTHS_PX = [667, 768, 1024, 1440] as const
const NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE = 10

test('sweeps density x rhythmic variety x syncopation x seed x profile and reports requiredUnits calibration', async ({
  page,
}) => {
  test.setTimeout(10 * 60 * 1000)

  const requiredUnitsByCell = new Map<string, number[]>()
  const failures: string[] = []

  for (const density of DENSITIES) {
    for (const variety of RHYTHMIC_VARIETIES) {
      const cellKey = `${density}/${variety}`
      for (const syncopation of SYNCOPATIONS) {
        for (const seed of SEEDS) {
          for (const profile of PROFILES) {
            const url = comboUrl(density, variety, syncopation, seed, profile)
            const result = await runCombo(page, url)
            if (result.ok) {
              const bucket = requiredUnitsByCell.get(cellKey) ?? []
              bucket.push(result.requiredUnits)
              requiredUnitsByCell.set(cellKey, bucket)
            } else {
              failures.push(
                `density=${density} variety=${variety} syncopation=${syncopation} seed=${seed} ` +
                  `profile=${profile}: ${result.code}`,
              )
            }
          }
        }
      }
    }
  }

  const lines: string[] = []
  lines.push('=== Notation calibration report ===')
  lines.push(
    `density/variety | n | min requiredUnits | median | max | ` +
      STAFF_SPACES_PX.map((px) => `min width @${px}px/space`).join(' | '),
  )
  for (const density of DENSITIES) {
    for (const variety of RHYTHMIC_VARIETIES) {
      const cellKey = `${density}/${variety}`
      const values = (requiredUnitsByCell.get(cellKey) ?? []).slice().sort((a, b) => a - b)
      if (values.length === 0) {
        lines.push(`${cellKey} | 0 | -- | -- | -- | (no successful runs)`)
        continue
      }
      const min = values[0]!
      const max = values[values.length - 1]!
      const med = median(values)
      const impliedWidths = STAFF_SPACES_PX.map((staffSpacePx) => {
        const scale = staffSpacePx / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
        return Math.round(max * scale)
      })
      lines.push(
        `${cellKey} | ${values.length} | ${min.toFixed(1)} | ${med.toFixed(1)} | ${max.toFixed(1)} | ` +
          impliedWidths.map((w, i) => `${w}px (target ${TARGET_WIDTHS_PX[i]}px)`).join(' | '),
      )
    }
  }
  lines.push('')
  lines.push(`Failures: ${failures.length}`)
  for (const failure of failures) lines.push(`  - ${failure}`)

  console.log(lines.join('\n'))
  expect(requiredUnitsByCell.size).toBeGreaterThan(0)
})

type PhoneOutcome = 'one' | 'two' | 'error'

/** Intent: run one combination at a phone container width and classify it one/two-system or error. */
async function runComboPhone(page: Page, url: string): Promise<PhoneOutcome> {
  let pageErrorMessage: string | null = null
  const onPageError = (error: Error): void => {
    pageErrorMessage = error.message
  }
  page.on('pageerror', onPageError)

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  try {
    await page.waitForFunction(
      () => window.__notationHarness && window.__notationHarness.state !== 'pending',
      { timeout: 8000 },
    )
  } catch {
    // A thrown generation failure prevents the harness from ever publishing a settled state.
  }
  page.off('pageerror', onPageError)

  if (pageErrorMessage !== null) return 'error'

  const harnessState = await page.evaluate(() => window.__notationHarness)
  if (harnessState.state === 'ready' && harnessState.engraved) {
    return harnessState.engraved.systemCount === 2 ? 'two' : 'one'
  }
  return 'error'
}

const PHONE_VIEWPORT = { width: 1000, height: 500 } as const
const PHONE_CONTAINER_WIDTHS_PX = [667, 768] as const

test('sweeps the same grid at phone container widths and reports one/two-system/error counts', async ({
  page,
}) => {
  test.setTimeout(10 * 60 * 1000)
  await page.setViewportSize(PHONE_VIEWPORT)

  const countsByWidthAndCell = new Map<
    number,
    Map<string, { one: number; two: number; error: number }>
  >()
  for (const width of PHONE_CONTAINER_WIDTHS_PX) countsByWidthAndCell.set(width, new Map())

  for (const width of PHONE_CONTAINER_WIDTHS_PX) {
    const byCell = countsByWidthAndCell.get(width)!
    for (const density of DENSITIES) {
      for (const variety of RHYTHMIC_VARIETIES) {
        const tally = { one: 0, two: 0, error: 0 }
        for (const syncopation of SYNCOPATIONS) {
          for (const seed of SEEDS) {
            for (const profile of PROFILES) {
              const url = comboUrlAtWidth(density, variety, syncopation, seed, profile, width)
              const outcome = await runComboPhone(page, url)
              tally[outcome] += 1
            }
          }
        }
        byCell.set(`${density}/${variety}`, tally)
      }
    }
  }

  const lines: string[] = []
  lines.push('=== Notation two-system phone calibration report ===')
  lines.push('width | density/variety | n | one-system | two-system | error')
  for (const width of PHONE_CONTAINER_WIDTHS_PX) {
    for (const density of DENSITIES) {
      for (const variety of RHYTHMIC_VARIETIES) {
        const cellKey = `${density}/${variety}`
        const tally = countsByWidthAndCell.get(width)!.get(cellKey)!
        const n = tally.one + tally.two + tally.error
        lines.push(`${width}px | ${cellKey} | ${n} | ${tally.one} | ${tally.two} | ${tally.error}`)
      }
    }
  }
  console.log(lines.join('\n'))
  expect(countsByWidthAndCell.size).toBe(PHONE_CONTAINER_WIDTHS_PX.length)
})
