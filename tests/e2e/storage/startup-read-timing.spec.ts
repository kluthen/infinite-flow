/**
 * Measurement M2 (v3.0 build plan, chunk 7): how long the load of the saved data takes before the
 * first draw, so the start-up wait can be set at no more than 2 s and well above the slowest
 * read. On the workspace harness (port 4175), the app's own loader reads the settings, every
 * kept session's summary and the remembered controller from a database seeded with 0, 10, 100
 * and 500 kept sessions, each a summary with the longest comment allowed and a body of about
 * 100 kB (the load never reads bodies; they give the database a realistic size). Each count is
 * timed cold, on the first load after the browser starts on its profile, then warm, over five
 * reloads. The harness times the load from its start to the settings decoded (`loadMs`).
 *
 * Not part of `npm run test:e2e`: run it with `npm run measure:startup-read` on an idle machine,
 * and record the figures, with the machine and the date, in `docs/storage.md`.
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { chromium, expect, test, type Page } from '@playwright/test'

import { WORKSPACE_HARNESS_URL } from '../release/harness-helpers'

/** The kept-session counts measured. */
const SESSION_COUNTS = [0, 10, 100, 500] as const

/** Each kept session's body size, in bytes. */
const BODY_BYTES = 100_000

/** How many warm loads follow the cold one. */
const WARM_LOADS = 5

/** One setting of each kind, so the settings read is a full one. */
const SETTINGS = {
  'controls.tempo': 150,
  'controls.tonalCenter': 'F',
  'controls.collection': 'Dorian',
  'controls.register': 'Low',
  'controls.instrumentProfileId': 'eb-alto',
  profileSelection: { musicalProfile: 'Jazz', isCustom: true },
  theme: 'Dark',
  'mix.clickOn': false,
  'mix.clickVolume': 0.5,
  'sessionOptions.varySettings': true,
  'review.format': 'midi',
} as const

/** One count's figures, in milliseconds. */
interface TimingRow {
  readonly sessions: number
  readonly coldMs: number
  readonly warmMs: readonly number[]
}

/** Intent: open the harness in `page` and wait until the load has ended and the app mounted. */
async function openHarness(page: Page): Promise<void> {
  await page.goto(WORKSPACE_HARNESS_URL)
  await page.waitForFunction(() => typeof window.__workspaceHarness !== 'undefined')
}

/** Intent: the last load's duration, after checking it read the saved data. */
async function lastLoadMs(page: Page, sessions: number): Promise<number> {
  const report = await page.evaluate(async () => ({
    outcome: window.__workspaceHarness.storage.loadOutcome(),
    summaries: (await window.__workspaceHarness.storage.records('sessionSummaries')).length,
    loadMs: window.__workspaceHarness.storage.loadMs(),
  }))
  expect(report.outcome).toBe('saved-data-read')
  expect(report.summaries).toBe(sessions)
  return report.loadMs
}

/** Intent: seed a fresh browser profile with the settings and `sessions` kept sessions. */
async function seedProfile(profile: string, sessions: number): Promise<void> {
  const context = await chromium.launchPersistentContext(profile)
  const page = await context.newPage()
  await openHarness(page)
  await page.evaluate(
    async ([settings, count, bytes]) => {
      await window.__workspaceHarness.storage.seedSettings(settings)
      await window.__workspaceHarness.storage.seedTimingSessions(count, bytes)
    },
    [SETTINGS, sessions, BODY_BYTES] as const,
  )
  await context.close()
}

/** Intent: time the cold load after a browser start on `profile`, then the warm reloads. */
async function timeProfile(profile: string, sessions: number): Promise<TimingRow> {
  const context = await chromium.launchPersistentContext(profile)
  const page = await context.newPage()
  await openHarness(page)
  const coldMs = await lastLoadMs(page, sessions)
  const warmMs: number[] = []
  for (let load = 0; load < WARM_LOADS; load++) {
    await page.reload()
    await page.waitForFunction(() => typeof window.__workspaceHarness !== 'undefined')
    warmMs.push(await lastLoadMs(page, sessions))
  }
  await context.close()
  return { sessions, coldMs, warmMs }
}

/** Intent: one figure, rounded to a tenth of a millisecond. */
function ms(value: number): string {
  return value.toFixed(1)
}

// @test-link [[rule_first_phrase_waits_for_saved_settings]]
test('M2: the start-up read of the saved data, cold and warm, by kept-session count', async () => {
  test.setTimeout(600_000)
  const rows: TimingRow[] = []
  for (const sessions of SESSION_COUNTS) {
    const profile = await mkdtemp(path.join(tmpdir(), 'infinite-flow-m2-'))
    try {
      await seedProfile(profile, sessions)
      rows.push(await timeProfile(profile, sessions))
    } finally {
      await rm(profile, { recursive: true, force: true })
    }
  }
  const lines = rows.map(
    (row) =>
      `| ${row.sessions} | ${ms(row.coldMs)} | ${ms(Math.min(...row.warmMs))} | ${ms(Math.max(...row.warmMs))} |`,
  )
  console.log(['| Kept sessions | Cold | Warm, fastest | Warm, slowest |', ...lines].join('\n'))
})
