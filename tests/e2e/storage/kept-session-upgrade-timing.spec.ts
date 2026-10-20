/**
 * Measurement M3 (v3.1 build plan, chunks 9 and 16): how long the first open after the update
 * takes when it upgrades v3.0's data to data version 3, so the cost of the upgrade at the
 * start-up is known against the start-up wait (2 s). On the workspace harness (port 4175), the
 * app's own loader opens a database seeded at data version 1, as v3.0 kept it: v3.0's settings (a
 * Jazz musical-profile selection, customized, and a few changed controls, Tension at Build among
 * them) and 10, 100 and 500 kept sessions, each a copy of one real Jazz session played on the
 * harness, turned in Node into v3.0's shapes and lengthened to a body of at least 100 kB (as M2's
 * bodies), pinned, with the longest comment allowed and no played notes. The open runs both
 * steps: step 2 upgrades the kept sessions to data version 2, step 3 creates the presets store
 * and carries the selection over to the preset selection and the seven figure levels. Each count
 * is timed cold, on the first load after the browser starts on its profile, which runs the
 * upgrade, checked to have carried the settings over, then warm, over three reloads, which find
 * the data already at version 3. The harness times the load from its start to the settings
 * decoded, the open, and so the upgrade, included (`loadMs`). A load the start-up wait ended
 * first is marked "wait ended": the visit started from the defaults while the upgrade went on.
 *
 * Not part of `npm run test:e2e`: run it with `npm run measure:kept-session-upgrade` on an idle
 * machine, and record the figures, with the machine and the date, in `docs/storage.md`.
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { chromium, expect, test, type Browser, type Page } from '@playwright/test'

import { WORKSPACE_HARNESS_URL } from '../release/harness-helpers'
import { untilKept } from '../review/review-tools-helpers'
import {
  gotoHeldLoad,
  playJazzSession,
  seedVersionOne,
  storedPhrases,
  storedSession,
  v30Session,
  type StoredSession,
} from './kept-session-v1-helpers'
import { gotoStorageHarness } from './storage-helpers'

/** The kept-session counts measured. */
const SESSION_COUNTS = [10, 100, 500] as const

/** The least size of each kept session's body, in bytes, as M2's bodies. */
const BODY_BYTES = 100_000

/** How many warm loads follow the cold one. */
const WARM_LOADS = 3

/** The length of the session's comment: the longest allowed. */
const COMMENT_LENGTH = 500

/** The start of the template session: 10:05 UTC on 2 October 2026. */
const TEMPLATE_STARTED_AT = Date.UTC(2026, 9, 2, 10, 5)

/** The seven figures whose level records step 3 writes. */
const FIGURES = [
  'passingTone',
  'accentedPassingTone',
  'neighborTone',
  'appoggiatura',
  'diatonicEnclosure',
  'chromaticApproach',
  'chromaticEnclosure',
] as const

/** Intent: a settings record as v3.0 stored it, at data version 1. */
function v30Setting(key: string, value: unknown): WorkspaceHarnessVersionOneSetting {
  return { key, dataVersion: 1, appVersion: '3.0.0', value }
}

/** v3.0's settings: Jazz selected and customized, Tension at Build, a few other controls changed. */
const V30_SETTINGS: readonly WorkspaceHarnessVersionOneSetting[] = [
  v30Setting('profileSelection', { musicalProfile: 'Jazz', isCustom: true }),
  v30Setting('controls.tension', 'Build'),
  v30Setting('controls.tempo', 150),
  v30Setting('controls.tonalCenter', 'F'),
  v30Setting('controls.collection', 'Dorian'),
  v30Setting('controls.noteDensity', 'Eighth'),
  v30Setting('controls.syncopation', 'Occasional offbeats'),
  v30Setting('controls.contour', 'Wandering'),
]

/** One load's figure: its duration in milliseconds, and whether it read the saved data. */
interface LoadTiming {
  readonly ms: number
  readonly read: boolean
}

/** One count's figures. */
interface TimingRow {
  readonly sessions: number
  readonly cold: LoadTiming
  readonly warm: readonly LoadTiming[]
}

/** A v3.0 session template lengthened for the measurement, with its body's figures. */
interface SizedTemplate {
  readonly template: StoredSession
  readonly phrases: number
  readonly bodyBytes: number
}

/** Intent: the size of a stored value as JSON, in bytes. */
function jsonBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value))
}

/**
 * Intent: a v3.0 template lengthened to a body of at least `BODY_BYTES`: its phrases cycled,
 * renumbered 1..N, each starting one phrase length after the one before (the template's own
 * spacing), none a repeat or a favorite; its session-wide record counting N phrases and no
 * favorite, pinned, with the longest comment and no played notes.
 */
function sizedTemplate(template: StoredSession): SizedTemplate {
  const source = storedPhrases(template.body)
  const [first, second] = source
  if (first === undefined || second === undefined) throw new Error('the template has two phrases')
  const phraseLength = (second.startsAt as number) - (first.startsAt as number)
  const phrases: Record<string, unknown>[] = []
  let body: Record<string, unknown> = { ...template.body, phrases }
  while (jsonBytes(body) < BODY_BYTES) {
    const { repeatOf, ...phrase } = structuredClone(source[phrases.length % source.length]!)
    void repeatOf
    phrases.push({
      ...phrase,
      phraseNumber: phrases.length + 1,
      startsAt: phrases.length * phraseLength,
      isRepeat: false,
      favorite: false,
    })
    body = { ...template.body, phrases }
  }
  const summary = {
    ...template.summary,
    phraseCount: phrases.length,
    favoritesCount: 0,
    pinned: true,
    comment: 'x'.repeat(COMMENT_LENGTH),
    playedNotesKept: false,
  }
  return { template: { summary, body }, phrases: phrases.length, bodyBytes: jsonBytes(body) }
}

/** Intent: play one Jazz session in a throwaway context and give it as v3.0 kept it, sized. */
async function measuredTemplate(browser: Browser): Promise<SizedTemplate> {
  const context = await browser.newContext()
  try {
    const page = await context.newPage()
    await gotoStorageHarness(page)
    await playJazzSession(page, TEMPLATE_STARTED_AT)
    const [key] = await untilKept(page, 1)
    if (key === undefined) throw new Error('the Jazz session was not kept')
    return sizedTemplate(v30Session(await storedSession(page, key)))
  } finally {
    await context.close()
  }
}

/** Intent: wait until the harness has loaded the saved data and published its API. */
async function harnessPublished(page: Page): Promise<void> {
  await page.waitForFunction(() => typeof window.__workspaceHarness !== 'undefined')
}

/**
 * Intent: the last load's figure, after checking every kept session is at data version 2, its
 * session-wide record and its body (waiting for the app's port when the wait ended first).
 */
async function lastLoad(page: Page, sessions: number): Promise<LoadTiming> {
  const timing = await page.evaluate(() => ({
    read: window.__workspaceHarness.storage.loadOutcome() === 'saved-data-read',
    ms: window.__workspaceHarness.storage.loadMs(),
  }))
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          /** Intent: how many records of a store are at data version 2; -1 before the port opens. */
          const current = async (store: 'sessionSummaries' | 'sessionBodies') => {
            try {
              const records = await window.__workspaceHarness.storage.records(store)
              return records.filter(
                (record) => (record as { dataVersion?: unknown }).dataVersion === 2,
              ).length
            } catch {
              // The app's port opens late when the start-up wait ended first: none read yet.
              return -1
            }
          }
          return [await current('sessionSummaries'), await current('sessionBodies')]
        }),
      { timeout: 120_000 },
    )
    .toEqual([sessions, sessions])
  return timing
}

/**
 * Intent: after the cold load, check step 3 carried v3.0's settings over: the preset selection,
 * Custom based on Jazz, and the seven level records written at data version 3, v3.0's selection
 * record gone.
 */
async function expectSettingsCarriedOver(page: Page): Promise<void> {
  const settings = await page.evaluate(() => window.__workspaceHarness.storage.records('settings'))
  const byKey = new Map(
    settings.map((record) => [(record as { key: string }).key, record as Record<string, unknown>]),
  )
  expect(byKey.has('profileSelection')).toBe(false)
  expect(byKey.get('presetSelection')).toMatchObject({
    dataVersion: 3,
    value: { kind: 'custom', baseId: 'jazz' },
  })
  for (const figure of FIGURES) {
    expect(byKey.get(`figureLevels.${figure}`), figure).toMatchObject({ dataVersion: 3 })
  }
}

/**
 * Intent: seed a fresh browser profile at data version 1 with v3.0's settings and `sessions`
 * copies of `template`.
 */
async function seedProfile(
  profile: string,
  template: StoredSession,
  sessions: number,
): Promise<void> {
  const context = await chromium.launchPersistentContext(profile)
  try {
    const page = await context.newPage()
    await gotoHeldLoad(page)
    await seedVersionOne(page, template, sessions)
    await page.evaluate((records) => {
      const held = window.__workspaceHarnessHeldLoad
      if (held === undefined) throw new Error('the load is not held')
      return held.seedVersionOneSettings(records)
    }, V30_SETTINGS)
  } finally {
    await context.close()
  }
}

/** Intent: time the cold load (the upgrade) after a browser start on `profile`, then warm ones. */
async function timeProfile(profile: string, sessions: number): Promise<TimingRow> {
  const context = await chromium.launchPersistentContext(profile)
  try {
    const page = await context.newPage()
    await page.goto(WORKSPACE_HARNESS_URL)
    await harnessPublished(page)
    const cold = await lastLoad(page, sessions)
    await expectSettingsCarriedOver(page)
    const warm: LoadTiming[] = []
    for (let load = 0; load < WARM_LOADS; load++) {
      await page.reload()
      await harnessPublished(page)
      warm.push(await lastLoad(page, sessions))
    }
    return { sessions, cold, warm }
  } finally {
    await context.close()
  }
}

/** Intent: one load's figure, rounded to a tenth of a millisecond, marked when the wait ended. */
function figure({ ms, read }: LoadTiming): string {
  return `${ms.toFixed(1)}${read ? '' : ' (wait ended)'}`
}

// @test-link [[module_kept_session_upgrade_step]]
// @test-link [[module_settings_upgrade_step]]
test("M3: the data version 3 upgrade of v3.0's settings and kept sessions at the first open, by kept-session count", async ({
  browser,
}) => {
  test.setTimeout(900_000)
  const { template, phrases, bodyBytes } = await measuredTemplate(browser)
  const rows: TimingRow[] = []
  for (const sessions of SESSION_COUNTS) {
    const profile = await mkdtemp(path.join(tmpdir(), 'infinite-flow-m3-'))
    try {
      await seedProfile(profile, template, sessions)
      rows.push(await timeProfile(profile, sessions))
    } finally {
      await rm(profile, { recursive: true, force: true })
    }
  }
  const lines = rows.map((row) => {
    const slowest = row.warm.reduce((a, b) => (b.ms > a.ms ? b : a))
    return `| ${row.sessions} | ${phrases} | ${bodyBytes} | ${figure(row.cold)} | ${figure(slowest)} |`
  })
  console.log(
    [
      '| Kept sessions | Phrases per body | Body bytes | Upgrade load (cold) | Warm, slowest |',
      '| --- | --- | --- | --- | --- |',
      ...lines,
    ].join('\n'),
  )
})
