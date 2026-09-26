/**
 * Manual Step 9 browser latency harness: measures cold (first click) and warm (Regenerate) wall
 * time from click to "Phrase ready" for the documented worst-case rhythm setting (ISS-004 moves
 * this off Mixed density to Sixteenth / Heavily varied / Sparse silence / Active displacement /
 * Build tension -- the largest candidate domain, 2,932 candidates) and for the default/cheap
 * setting, and checks the main thread stays responsive to a theme click during the worst-case cold
 * run. Not part of `npm run test:e2e`; run explicitly via `npm run measure:latency:browser`.
 * Reports only -- it asserts nothing about the numbers themselves, only that the page never
 * becomes unresponsive. Writes the full JSON report to `LATENCY_BROWSER_OUT` when that env var is
 * set.
 */
import { writeFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import { gotoWorkspace, primaryButton, radio } from './helpers'

interface ScenarioMeasurement {
  readonly scenario: string
  readonly coldMs: number
  readonly warmMs: number
}

interface LatencyReport {
  readonly scenarios: readonly ScenarioMeasurement[]
  readonly themeResponseDuringColdWorstCaseMs: number
}

const TEST_TIMEOUT_MS = 120_000
const THEME_RESPONSE_BUDGET_MS = 200

/** Intent: click the primary action and time the wall-clock interval until "Phrase ready". */
async function timeGeneration(page: import('@playwright/test').Page): Promise<number> {
  const start = Date.now()
  await primaryButton(page).click()
  await expect(page.locator('.generation-status')).toHaveText('Phrase ready', {
    timeout: TEST_TIMEOUT_MS,
  })
  return Date.now() - start
}

/** Intent: apply the documented worst-case rhythm/tension setting through the real controls. */
async function selectWorstCaseSetting(page: import('@playwright/test').Page): Promise<void> {
  await radio(page, 'Note density', 'Sixteenth').click()
  await radio(page, 'Rhythmic variety', 'Heavily varied').click()
  await radio(page, 'Silence density', 'Sparse').click()
  await radio(page, 'Syncopation', 'Active displacement').click()
  await radio(page, 'Tension', 'Build').click()
}

test('reports cold/warm generation latency for the worst-case and default settings', async ({
  page,
}) => {
  test.setTimeout(TEST_TIMEOUT_MS * 3)

  await gotoWorkspace(page)
  const cheapColdMs = await timeGeneration(page)
  const cheapWarmMs = await timeGeneration(page)

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

  const worstColdMs = await worstColdPromise

  const worstWarmMs = await timeGeneration(page)

  const report: LatencyReport = {
    scenarios: [
      {
        scenario: 'default/cheap (Quarter/Straight/Sparse/Lift)',
        coldMs: cheapColdMs,
        warmMs: cheapWarmMs,
      },
      {
        scenario: 'worst case (Sixteenth/Heavily varied/Sparse/Active displacement/Build)',
        coldMs: worstColdMs,
        warmMs: worstWarmMs,
      },
    ],
    themeResponseDuringColdWorstCaseMs: themeResponseMs,
  }

  console.log('\n=== Step 9 browser generation latency ===')
  for (const scenario of report.scenarios) {
    console.log(`${scenario.scenario}: cold=${scenario.coldMs}ms warm=${scenario.warmMs}ms`)
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
