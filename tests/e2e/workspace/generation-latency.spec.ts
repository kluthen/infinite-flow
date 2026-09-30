/**
 * Manual Step 9 browser latency harness: measures cold (first click) and warm (Regenerate) time
 * from click to "Phrase ready" for the documented worst-case rhythm setting (ISS-004 moves this
 * off Mixed density to Sixteenth / Heavily varied / Sparse silence / Active displacement / Build
 * tension -- 1,797 rhythm candidates, the slowest setting to generate; the largest domain, 2,932
 * candidates, is Straight / Build), for Sixteenth / Heavily varied / Sparse silence / Straight /
 * Edge tension (the slowest setting to generate in Node since the cold-generation speed-up) and for
 * the default/cheap setting, and checks the main thread stays responsive to a theme click during
 * the worst-case cold run. A second scenario measures the first generation after a change to one
 * setting, as a mid-session settings mutation causes: the page's one generation Worker (and so its
 * one rhythm-domain memo) is warmed on a one-step neighbour of the worst case, one control is
 * changed through the UI to reach the worst case, and that generation is timed; then a
 * tonal-center and a register change, which keep the rhythm setting, are timed the same way.
 * Every cycle is timed both by the runner's wall clock and exactly in the page (see
 * `timePhraseReady`). Not part of `npm run test:e2e`; run explicitly via
 * `npm run measure:latency:browser`. Reports only -- it asserts nothing about the numbers
 * themselves, only that the page never becomes unresponsive. Writes the full JSON reports to
 * `LATENCY_BROWSER_OUT` and `LATENCY_BROWSER_CHANGE_OUT` when those env vars are set.
 *
 * The page pre-warms the current rhythm setting's domain in its generation Worker when the Worker
 * starts and after every rhythm-setting change, so the env var `LATENCY_PREWARM` picks one of three
 * modes (recorded as `prewarmMode` in both JSON reports; any other value throws):
 * - `off`: every page load uses `?prewarm=off` -- true cold generation, the fair comparison with
 *   the figures measured before pre-warm existed (2026-09-30).
 * - `on` (the default, since it is what the production page does): each generation is clicked
 *   right after the rhythm-control change(s), so pre-warm has only just started.
 * - `settled`: as `on`, but after reaching each setting it waits `PREWARM_SETTLE_MS` before the
 *   click so pre-warm has finished. The production page exposes no completion signal, so this is
 *   a fixed wait sized well above the worst full domain build (under 1 s in Chromium).
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
  readonly prewarmMode: PrewarmMode
  readonly scenarios: readonly ScenarioMeasurement[]
  readonly themeResponseDuringColdWorstCaseMs: number
}

/** One setting change: the control moved, the value it moved from, and the value it moved to. */
interface SettingChange {
  readonly group: string
  readonly from: string
  readonly to: string
}

interface ChangeReport {
  readonly prewarmMode: PrewarmMode
  readonly measurements: readonly ChangeMeasurement[]
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

/** How the page's rhythm-domain pre-warm is set up for a run; see the file header. */
type PrewarmMode = 'off' | 'on' | 'settled'

/**
 * Wait, in `settled` mode, between reaching a setting and clicking, so the pre-warm the page posted
 * for it has finished: a fixed bound, as the page has no completion signal, well above the worst
 * full rhythm-domain build (under 1 s in Chromium).
 */
const PREWARM_SETTLE_MS = 3_000

/** Intent: the pre-warm mode `LATENCY_PREWARM` asks for, `on` when unset; any other value throws. */
function prewarmModeFromEnv(value: string | undefined): PrewarmMode {
  if (value === undefined || value === 'on') return 'on'
  if (value === 'off' || value === 'settled') return value
  throw new Error(`Unknown LATENCY_PREWARM "${value}"; use "off", "on" or "settled".`)
}

const PREWARM_MODE = prewarmModeFromEnv(process.env.LATENCY_PREWARM)

/** Intent: load a fresh workspace page, with pre-warm disabled on the URL in `off` mode. */
function gotoLatencyWorkspace(page: Page): Promise<void> {
  return gotoWorkspace(page, PREWARM_MODE === 'off' ? '?prewarm=off' : '')
}

/** Intent: once a setting is reached, wait for its pre-warm to finish in `settled` mode only. */
async function settlePrewarm(page: Page): Promise<void> {
  if (PREWARM_MODE === 'settled') {
    await page.waitForTimeout(PREWARM_SETTLE_MS)
  }
}

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

/**
 * Intent: the slowest rhythm/tension setting to generate in Node since the cold-generation
 * speed-up, as radiogroup label -> option label (`to`); it differs from the worst case only in
 * syncopation and tension, and each is measured in its own fresh page (so its own Worker).
 */
const STRAIGHT_EDGE_SETTING: readonly Pick<SettingChange, 'group' | 'to'>[] = [
  { group: 'Note density', to: 'Sixteenth' },
  { group: 'Rhythmic variety', to: 'Heavily varied' },
  { group: 'Silence density', to: 'Sparse' },
  { group: 'Syncopation', to: 'Straight' },
  { group: 'Tension', to: 'Edge' },
]

/** Intent: apply a rhythm/tension setting through the real controls, in the order listed. */
async function selectSetting(
  page: Page,
  setting: readonly Pick<SettingChange, 'group' | 'to'>[],
): Promise<void> {
  for (const control of setting) {
    await radio(page, control.group, control.to).click()
  }
}

/** Intent: apply the documented worst-case rhythm/tension setting through the real controls. */
function selectWorstCaseSetting(page: Page): Promise<void> {
  return selectSetting(page, WORST_CASE_SETTING)
}

/** Intent: one timed generation cycle, click to "Phrase ready", within the test timeout. */
function timeGeneration(page: Page): Promise<PhraseReadyTiming> {
  return timePhraseReady(page, TEST_TIMEOUT_MS)
}

/** Intent: the compact console form of one timing, in-page first since it is the exact one. */
function formatTiming(timing: PhraseReadyTiming): string {
  return `${timing.inPageMs.toFixed(1)}ms in page (${timing.wallMs}ms wall)`
}

test('reports cold/warm generation latency for the worst-case, Straight/Edge and default settings', async ({
  page,
}) => {
  test.setTimeout(TEST_TIMEOUT_MS * 5)

  await gotoLatencyWorkspace(page)
  await settlePrewarm(page)
  const cheapCold = await timeGeneration(page)
  const cheapWarm = await timeGeneration(page)

  await gotoLatencyWorkspace(page)
  await selectWorstCaseSetting(page)
  await settlePrewarm(page)

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

  // A fresh page, so a fresh Worker: the Straight/Edge domain is cold (only its own pre-warm, in
  // `on`/`settled` mode, may have built it). The controls are clicked in an order whose
  // intermediate settings all differ from Straight/Edge, so no earlier pre-warm builds it either.
  await gotoLatencyWorkspace(page)
  await selectSetting(page, STRAIGHT_EDGE_SETTING)
  await settlePrewarm(page)
  const straightEdgeCold = await timeGeneration(page)
  const straightEdgeWarm = await timeGeneration(page)

  const report: LatencyReport = {
    prewarmMode: PREWARM_MODE,
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
      {
        scenario: 'Straight/Edge (Sixteenth/Heavily varied/Sparse/Straight/Edge)',
        cold: straightEdgeCold,
        warm: straightEdgeWarm,
      },
    ],
    themeResponseDuringColdWorstCaseMs: themeResponseMs,
  }

  console.log(`\n=== Step 9 browser generation latency (prewarm: ${PREWARM_MODE}) ===`)
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
    await gotoLatencyWorkspace(page)
    await selectWorstCaseSetting(page)
    await radio(page, changed.group, changed.from).click()
    await settlePrewarm(page)
    const warmUp = await timeGeneration(page)
    await radio(page, changed.group, changed.to).click()
    await settlePrewarm(page)
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
    await gotoLatencyWorkspace(page)
    await selectWorstCaseSetting(page)
    await expect(radio(page, changed.group, changed.from)).toHaveAttribute('aria-checked', 'true')
    await settlePrewarm(page)
    const warmUp = await timeGeneration(page)
    await radio(page, changed.group, changed.to).click()
    await settlePrewarm(page)
    const afterChange = await timeGeneration(page)
    measurements.push({
      change: `${changed.group}: ${changed.from} -> ${changed.to} (worst-case rhythm kept)`,
      warmUp,
      afterChange,
    })
  }

  console.log(
    `\n=== Browser: first generation after a one-control change (prewarm: ${PREWARM_MODE}) ===`,
  )
  for (const m of measurements) {
    console.log(
      `${m.change}: warm-up=${formatTiming(m.warmUp)} after change=${formatTiming(m.afterChange)}`,
    )
  }

  const report: ChangeReport = { prewarmMode: PREWARM_MODE, measurements }
  test.info().annotations.push({
    type: 'setting-change-latency-report',
    description: JSON.stringify(report),
  })

  const outPath = process.env.LATENCY_BROWSER_CHANGE_OUT
  if (outPath !== undefined) {
    writeFileSync(outPath, JSON.stringify(report, null, 2))
  }
})
