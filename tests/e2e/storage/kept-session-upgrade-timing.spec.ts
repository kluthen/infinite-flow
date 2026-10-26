/**
 * Measurement M3 (v3.2 build plan, chunk 22): how long the first open after the update takes when
 * it upgrades v3.1's kept sessions to data version 4, so the cost of the upgrade at the start-up
 * is known against the start-up wait (2 s). On the workspace harness (port 4175), the app's own
 * loader opens a database seeded at data version 3, as v3.1 kept it, with 10, 100 and 500 kept
 * sessions, each a copy of one real Jazz session played on the harness, turned in Node into
 * v3.1's shapes (data version 2: no Jam mark, no doodle, no played-notes clock, no v3.2 request
 * input) and lengthened to a body of at least 100 kB (as M2's bodies), pinned, with the longest
 * comment allowed and no played notes. The open runs step 4 only, which rewrites every
 * session-wide record and body at data version 4.
 *
 * For comparison, the same is timed from v3.0's data (v3.1 build plan, chunks 9 and 16), the worst
 * case: a database seeded at data version 1, with v3.0's settings (a Jazz musical-profile
 * selection, customized, and a few changed controls, Tension at Build among them) and the same
 * sessions in v3.0's shapes. The open runs steps 2 to 4, each after the work of the one before:
 * step 2 upgrades the kept sessions to data version 2, step 3 creates the presets store and
 * carries the selection over to the preset selection and the seven figure levels, step 4 carries
 * the kept sessions on to data version 4.
 *
 * Each count is timed cold, on the first load after the browser starts on its profile, which runs
 * the upgrade, checked to have carried the first session (and, from v3.0, the settings) over, then
 * warm, over three reloads, which find the data already at version 4. The harness times the load
 * from its start to the settings decoded, the open, and so the upgrade, included (`loadMs`). A
 * load the start-up wait ended first is marked "wait ended": the visit started from the defaults
 * while the upgrade went on. Each path prints its own table.
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
  seedVersionThree,
  storedPhrases,
  storedSession,
  v30Session,
  v31Session,
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

/** The key the seeds give the first copy of the template. */
const FIRST_COPY_KEY = `session-${TEMPLATE_STARTED_AT}-0`

/** The data version the open upgrades the kept sessions to. */
const UPGRADED_DATA_VERSION = 4

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

/** A template in an earlier version's shapes, lengthened for the measurement, and its figures. */
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
 * Intent: a template in an earlier version's shapes lengthened to a body of at least
 * `BODY_BYTES`: its phrases cycled, renumbered 1..N, each starting one phrase length after the one
 * before (the template's own spacing), none a repeat or a favorite; its session-wide record
 * counting N phrases and no favorite, pinned, with the longest comment and no played notes.
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

/** Intent: play one Jazz session in a throwaway context and give its stored values as kept. */
async function playedTemplate(browser: Browser): Promise<StoredSession> {
  const context = await browser.newContext()
  try {
    const page = await context.newPage()
    await gotoStorageHarness(page)
    await playJazzSession(page, TEMPLATE_STARTED_AT)
    const [key] = await untilKept(page, 1)
    if (key === undefined) throw new Error('the Jazz session was not kept')
    return await storedSession(page, key)
  } finally {
    await context.close()
  }
}

/** Intent: wait until the harness has loaded the saved data and published its API. */
async function harnessPublished(page: Page): Promise<void> {
  await page.waitForFunction(() => typeof window.__workspaceHarness !== 'undefined')
}

/**
 * Intent: the last load's figure, after checking every kept session is at data version 4, its
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
        page.evaluate(async (version) => {
          /** Intent: how many records of a store are at `version`; -1 before the port opens. */
          const current = async (store: 'sessionSummaries' | 'sessionBodies') => {
            try {
              const records = await window.__workspaceHarness.storage.records(store)
              return records.filter(
                (record) => (record as { dataVersion?: unknown }).dataVersion === version,
              ).length
            } catch {
              // The app's port opens late when the start-up wait ended first: none read yet.
              return -1
            }
          }
          return [await current('sessionSummaries'), await current('sessionBodies')]
        }, UPGRADED_DATA_VERSION),
      { timeout: 120_000 },
    )
    .toEqual([sessions, sessions])
  return timing
}

/**
 * Intent: after the cold load, check step 4 carried the first copy of `template` over: its
 * session-wide record at data version 4, no Jam, with no declined suggestion, its preset label and
 * phrase count as seeded; its body at data version 4 with no doodle and no played-notes clock,
 * its phrases as seeded.
 */
async function expectFirstSessionCarriedOver(page: Page, template: StoredSession): Promise<void> {
  const upgraded = await storedSession(page, FIRST_COPY_KEY)
  expect(upgraded.summary).toMatchObject({
    dataVersion: UPGRADED_DATA_VERSION,
    isJam: false,
    phraseCount: template.summary.phraseCount,
  })
  expect(upgraded.summary).not.toHaveProperty('suggestionDeclined')
  expect(typeof upgraded.summary.presetLabel).toBe('string')
  expect(upgraded.body.dataVersion).toBe(UPGRADED_DATA_VERSION)
  expect(upgraded.body).not.toHaveProperty('doodle')
  expect(upgraded.body).not.toHaveProperty('playedNotesClock')
  expect(storedPhrases(upgraded.body)).toHaveLength(storedPhrases(template.body).length)
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

/** One upgrade path: an earlier version's data, how it is seeded, what the open carries over. */
interface UpgradePath {
  /** The path's table title. */
  readonly title: string
  /** Intent: this version's stored session in the earlier version's shapes. */
  readonly shaped: (stored: StoredSession) => StoredSession
  /** Intent: while the load is held, seed `sessions` copies of `template` and any other data. */
  readonly seed: (page: Page, template: StoredSession, sessions: number) => Promise<void>
  /** Intent: after the cold load, check what the path's steps carried over beside the sessions. */
  readonly carriedOver: (page: Page) => Promise<void>
}

/** v3.1's data: data version 3, kept sessions only; the open runs step 4. */
const FROM_V31: UpgradePath = {
  title: "M3, from v3.1's data (data version 3; step 4)",
  shaped: v31Session,
  seed: seedVersionThree,
  carriedOver: async () => {},
}

/** v3.0's data: data version 1, settings and kept sessions; the open runs steps 2 to 4. */
const FROM_V30: UpgradePath = {
  title: "M3, from v3.0's data (data version 1; steps 2 to 4), for comparison",
  shaped: v30Session,
  seed: async (page, template, sessions) => {
    await seedVersionOne(page, template, sessions)
    await page.evaluate((records) => {
      const held = window.__workspaceHarnessHeldLoad
      if (held === undefined) throw new Error('the load is not held')
      return held.seedVersionOneSettings(records)
    }, V30_SETTINGS)
  },
  carriedOver: expectSettingsCarriedOver,
}

/** Intent: seed a fresh browser profile with `upgrade`'s data, `sessions` copies of `template`. */
async function seedProfile(
  profile: string,
  upgrade: UpgradePath,
  template: StoredSession,
  sessions: number,
): Promise<void> {
  const context = await chromium.launchPersistentContext(profile)
  try {
    const page = await context.newPage()
    await gotoHeldLoad(page)
    await upgrade.seed(page, template, sessions)
  } finally {
    await context.close()
  }
}

/** Intent: time the cold load (the upgrade) after a browser start on `profile`, then warm ones. */
async function timeProfile(
  profile: string,
  upgrade: UpgradePath,
  template: StoredSession,
  sessions: number,
): Promise<TimingRow> {
  const context = await chromium.launchPersistentContext(profile)
  try {
    const page = await context.newPage()
    await page.goto(WORKSPACE_HARNESS_URL)
    await harnessPublished(page)
    const cold = await lastLoad(page, sessions)
    await expectFirstSessionCarriedOver(page, template)
    await upgrade.carriedOver(page)
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

/**
 * Intent: measure `upgrade` on each count, each on a fresh profile, and print its table under its
 * title: the counts, the template's figures, the cold load and the slowest warm one.
 */
async function measurePath(upgrade: UpgradePath, played: StoredSession): Promise<void> {
  const { template, phrases, bodyBytes } = sizedTemplate(upgrade.shaped(played))
  const rows: TimingRow[] = []
  for (const sessions of SESSION_COUNTS) {
    const profile = await mkdtemp(path.join(tmpdir(), 'infinite-flow-m3-'))
    try {
      await seedProfile(profile, upgrade, template, sessions)
      rows.push(await timeProfile(profile, upgrade, template, sessions))
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
      upgrade.title,
      '',
      '| Kept sessions | Phrases per body | Body bytes | Upgrade load (cold) | Warm, slowest |',
      '| --- | --- | --- | --- | --- |',
      ...lines,
    ].join('\n'),
  )
}

// The Jazz session both paths copy, played once.
let played: StoredSession

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000)
  played = await playedTemplate(browser)
})

// @test-link [[module_kept_session_jam_upgrade_step]]
test("M3: the data version 4 upgrade of v3.1's kept sessions at the first open, by kept-session count", async () => {
  test.setTimeout(900_000)
  await measurePath(FROM_V31, played)
})

// @test-link [[module_kept_session_upgrade_step]]
// @test-link [[module_settings_upgrade_step]]
// @test-link [[module_kept_session_jam_upgrade_step]]
test("M3, for comparison: the upgrade of v3.0's settings and kept sessions to data version 4 at the first open, by kept-session count", async () => {
  test.setTimeout(900_000)
  await measurePath(FROM_V30, played)
})
