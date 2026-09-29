/**
 * Manual Step 9 browser latency harness: measures cold (first click) and warm (Regenerate) time
 * from click to "Phrase ready" for the documented worst-case rhythm setting (ISS-004 moves this
 * off Mixed density to Sixteenth / Heavily varied / Sparse silence / Active displacement / Build
 * tension -- the largest candidate domain, 2,932 candidates) and for the default/cheap setting,
 * and checks the main thread stays responsive to a theme click during the worst-case cold run. A
 * second scenario measures the first generation after a change to one setting, as a mid-session
 * settings mutation causes: the page's one generation Worker (and so its one rhythm-domain memo)
 * is warmed on a one-step neighbour of the worst case, one control is changed through the UI to
 * reach the worst case, and that generation is timed; then a tonal-center and a register change,
 * which keep the rhythm setting, are timed the same way. Every cycle is timed both by the runner's
 * wall clock and exactly in the page (see `timePhraseReady`). Not part of `npm run test:e2e`; run
 * explicitly via `npm run measure:latency:browser`. Reports only -- it asserts nothing about the
 * numbers themselves, only that the page never becomes unresponsive. Writes the full JSON reports
 * to `LATENCY_BROWSER_OUT` and `LATENCY_BROWSER_CHANGE_OUT` when those env vars are set.
 */
import { writeFileSync } from 'node:fs'

import { type Page, expect, test } from '@playwright/test'

import { gotoWorkspace, radio, timePhraseReady, type PhraseReadyTiming } from './helpers'

interface ScenarioMeasurement {
  readonly scenario: string
  readonly cold: PhraseReadyTiming
  readonly warm: PhraseReadyTiming
}

interface LatencyReport {
  readonly scenarios: readonly ScenarioMeasurement[]
  readonly themeResponseDuringColdWorstCaseMs: number
}

/** One setting change: the control moved, the value it moved from, and the value it moved to. */
interface SettingChange {
  readonly group: string
  readonly from: string
  readonly to: string
}

interface ChangeMeasurement {
  readonly change: string
  /** The first generation on the starting setting, in a fresh page (a cold rhythm memo). */
  readonly warmUp: PhraseReadyTiming
  /** The first generation after the one-control change. */
  readonly afterChange: PhraseReadyTiming
}

const TEST_TIMEOUT_MS = 120_000
const THEME_RESPONSE_BUDGET_MS = 200

// The scenarios time generations, so they must never overlap each other on the machine.
test.describe.configure({ mode: 'default' })

/**
 * Intent: the documented worst-case rhythm/tension setting, as radiogroup label -> option label
 * (`to`), with the one-step neighbour each setting-change scenario starts from (`from`).
 */
const WORST_CASE_SETTING: readonly SettingChange[] = [
  { group: 'Note density', from: 'Eighth notes', to: 'Sixteenth' },
  { group: 'Rhythmic variety', from: 'Slightly varied', to: 'Heavily varied' },
  { group: 'Silence density', from: 'Conversational space', to: 'Sparse' },
  { group: 'Syncopation', from: 'Occasional offbeats', to: 'Active displacement' },
  { group: 'Tension', from: 'Lift', to: 'Build' },
]

/** Intent: apply the documented worst-case rhythm/tension setting through the real controls. */
async function selectWorstCaseSetting(page: Page): Promise<void> {
  for (const control of WORST_CASE_SETTING) {
    await radio(page, control.group, control.to).click()
  }
}

/** Intent: one timed generation cycle, click to "Phrase ready", within the test timeout. */
function timeGeneration(page: Page): Promise<PhraseReadyTiming> {
  return timePhraseReady(page, TEST_TIMEOUT_MS)
}

/** Intent: the compact console form of one timing, in-page first since it is the exact one. */
function formatTiming(timing: PhraseReadyTiming): string {
  return `${timing.inPageMs.toFixed(1)}ms in page (${timing.wallMs}ms wall)`
}

test('reports cold/warm generation latency for the worst-case and default settings', async ({
  page,
}) => {
  test.setTimeout(TEST_TIMEOUT_MS * 3)

  await gotoWorkspace(page)
  const cheapCold = await timeGeneration(page)
  const cheapWarm = await timeGeneration(page)

  await gotoWorkspace(page)
  await selectWorstCaseSetting(page)

  const worstColdPromise = timeGeneration(page)

  // While the worst-case cold generation runs off the main thread, the theme control must still
  // apply within budget -- the page must never freeze waiting on the worker.
  await page.waitForTimeout(50)
  const themeClickStart = Date.now()
  await radio(page, 'Presentation theme', 'Dark').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark', {
    timeout: THEME_RESPONSE_BUDGET_MS,
  })
  const themeResponseMs = Date.now() - themeClickStart

  const worstCold = await worstColdPromise

  const worstWarm = await timeGeneration(page)

  const report: LatencyReport = {
    scenarios: [
      {
        scenario: 'default/cheap (Quarter/Straight/Sparse/Lift)',
        cold: cheapCold,
        warm: cheapWarm,
      },
      {
        scenario: 'worst case (Sixteenth/Heavily varied/Sparse/Active displacement/Build)',
        cold: worstCold,
        warm: worstWarm,
      },
    ],
    themeResponseDuringColdWorstCaseMs: themeResponseMs,
  }

  console.log('\n=== Step 9 browser generation latency ===')
  for (const scenario of report.scenarios) {
    console.log(
      `${scenario.scenario}: cold=${formatTiming(scenario.cold)} warm=${formatTiming(scenario.warm)}`,
    )
  }
  console.log(`Theme click applied data-theme during worst-case cold run in ${themeResponseMs}ms`)

  test.info().annotations.push({ type: 'latency-report', description: JSON.stringify(report) })

  const outPath = process.env.LATENCY_BROWSER_OUT
  if (outPath !== undefined) {
    writeFileSync(outPath, JSON.stringify(report, null, 2))
  }

  expect(themeResponseMs, 'main thread must stay responsive during cold generation').toBeLessThan(
    THEME_RESPONSE_BUDGET_MS,
  )
})

test('reports the first generation after a one-control change into the worst case', async ({
  page,
}) => {
  test.setTimeout(TEST_TIMEOUT_MS * 8)
  const measurements: ChangeMeasurement[] = []

  // Rhythm controls: each is part of the Worker's rhythm-domain memo key, so the change is cold.
  for (const changed of WORST_CASE_SETTING) {
    await gotoWorkspace(page)
    await selectWorstCaseSetting(page)
    await radio(page, changed.group, changed.from).click()
    const warmUp = await timeGeneration(page)
    await radio(page, changed.group, changed.to).click()
    const afterChange = await timeGeneration(page)
    measurements.push({
      change: `${changed.group}: ${changed.from} -> ${changed.to}`,
      warmUp,
      afterChange,
    })
  }

  // Non-rhythm controls: the rhythm setting, and so the memo key, stays the worst case.
  const nonRhythmChanges: readonly SettingChange[] = [
    { group: 'Register', from: 'Middle', to: 'High' },
    { group: 'Written key', from: 'C', to: 'C-sharp/D-flat' },
  ]
  for (const changed of nonRhythmChanges) {
    await gotoWorkspace(page)
    await selectWorstCaseSetting(page)
    await expect(radio(page, changed.group, changed.from)).toHaveAttribute('aria-checked', 'true')
    const warmUp = await timeGeneration(page)
    await radio(page, changed.group, changed.to).click()
    const afterChange = await timeGeneration(page)
    measurements.push({
      change: `${changed.group}: ${changed.from} -> ${changed.to} (worst-case rhythm kept)`,
      warmUp,
      afterChange,
    })
  }

  console.log('\n=== Browser: first generation after a one-control change ===')
  for (const m of measurements) {
    console.log(
      `${m.change}: warm-up=${formatTiming(m.warmUp)} after change=${formatTiming(m.afterChange)}`,
    )
  }

  test.info().annotations.push({
    type: 'setting-change-latency-report',
    description: JSON.stringify(measurements),
  })

  const outPath = process.env.LATENCY_BROWSER_CHANGE_OUT
  if (outPath !== undefined) {
    writeFileSync(outPath, JSON.stringify(measurements, null, 2))
  }
})
