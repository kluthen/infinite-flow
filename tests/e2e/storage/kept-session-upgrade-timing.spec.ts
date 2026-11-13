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
 * Since v3.3 (chunk 17a) both of those opens also run step 5, the bodies ending at data version
 * 5. v3.3's own path (chunk 17) times step 5 alone, the first open of v3.2's data: a database
 * seeded at data version 4 through the harness's v3.2 seam, with v3.2's settings, 50 player
 * presets at data version 3 (no Seventh chords level) and 10, 100 or 500 kept sessions, half
 * copies of the Jazz session and half copies of a Jam session played on the harness (a fresh Jam
 * with a one-measure doodle, run into phrase 2), each turned in Node into v3.2's bytes (data
 * version 4, no level in an intent) and lengthened as above. The open rewrites every player preset
 * and body at data version 5 with the level at Off, and nothing else.
 *
 * Each count is timed cold, on the first load after the browser starts on its profile, which runs
 * the upgrade, checked to have carried the first session (and, from v3.0, the settings; from v3.2,
 * the player presets and a Jam session) over, then warm, over three reloads, which find the data
 * already upgraded: the start-up read of the same database. The harness times the load from its
 * start to the settings decoded, the open, and so the upgrade, included (`loadMs`). A load the
 * start-up wait ended first is marked "wait ended": the visit started from the defaults while the
 * upgrade went on. Each path prints its own table.
 *
 * Not part of `npm run test:e2e`: run it with `npm run measure:kept-session-upgrade` on an idle
 * machine, and record the figures, with the machine and the date, in `docs/storage.md`. To check a
 * path runs without taking the figures, narrow the counts (`MEASURE_SESSION_COUNTS=10`) and pick
 * its test with `--grep`.
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { chromium, expect, test, type Browser, type Page } from '@playwright/test'

import { WORKSPACE_HARNESS_URL } from '../release/harness-helpers'
import { reviewTitle } from '../review/review-helpers'
import { untilKept } from '../review/review-tools-helpers'
import { gotoJamIdle, jamToRunning, startJamByClick } from '../session/jam-helpers'
import { sessionAction, sessionState } from '../session/session-helpers'
import { clockTo, phraseStartsAt } from '../session/session-midi-helpers'
import {
  gotoHeldLoad,
  playJazzSession,
  seedVersionFour,
  seedVersionFourSettingsAndPresets,
  seedVersionOne,
  seedVersionThree,
  storedPhrases,
  storedSession,
  v30Session,
  v31Session,
  v32Session,
  type StoredSession,
} from './kept-session-v1-helpers'
import { gotoStorageHarness } from './storage-helpers'
import { measuredCounts, timingPlayerPreset } from './timing-player-presets'

/** The kept-session counts measured. */
const SESSION_COUNTS = measuredCounts('MEASURE_SESSION_COUNTS', [10, 100, 500])

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

/** The start of the Jam template session: 10:05 UTC on 3 October 2026, a day after the other. */
const JAM_TEMPLATE_STARTED_AT = Date.UTC(2026, 9, 3, 10, 5)

/** The key the seeds give the first copy of the Jam template. */
const FIRST_JAM_COPY_KEY = `session-${JAM_TEMPLATE_STARTED_AT}-0`

/** How many player presets v3.2's data holds: one tab's limit. */
const V32_PLAYER_PRESETS = 50

/** v3.2's settings: Custom based on its first player preset, a few controls and the theme. */
const V32_SETTINGS = {
  presetSelection: { kind: 'custom', baseId: 'player-1' },
  'controls.tension': 'Build',
  'controls.tempo': 150,
  'controls.tonalCenter': 'F',
  'controls.collection': 'Dorian',
  theme: 'Dark',
} as const

/** The data versions the open upgrades the kept sessions' session-wide records and bodies to. */
const UPGRADED_DATA_VERSIONS = { sessionSummaries: 4, sessionBodies: 5 } as const

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
 * `BODY_BYTES`: its phrase 1 first, then its later phrases cycled (phrase 1 may hold a carry-in
 * from no phrase, which only phrase 1 may hold), renumbered 1..N, each starting one phrase length
 * after the one before (the template's own spacing), none a repeat or a favorite; its
 * session-wide record counting N phrases and no favorite, pinned, with the longest comment and no
 * played notes.
 */
function sizedTemplate(template: StoredSession): SizedTemplate {
  const source = storedPhrases(template.body)
  const [first, second] = source
  if (first === undefined || second === undefined) throw new Error('the template has two phrases')
  const firstStart = first.startsAt as number
  const phraseLength = (second.startsAt as number) - firstStart
  const phrases: Record<string, unknown>[] = []
  let body: Record<string, unknown> = { ...template.body, phrases }
  while (jsonBytes(body) < BODY_BYTES) {
    const at = phrases.length === 0 ? 0 : 1 + ((phrases.length - 1) % (source.length - 1))
    const { repeatOf, ...phrase } = structuredClone(source[at]!)
    void repeatOf
    phrases.push({
      ...phrase,
      phraseNumber: phrases.length + 1,
      startsAt: firstStart + phrases.length * phraseLength,
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

/**
 * Intent: play one fresh Jam in a throwaway context (a one-measure doodle, run until phrase 2 has
 * started sounding, then Stopped) and give its stored values as kept.
 */
async function playedJamTemplate(browser: Browser): Promise<StoredSession> {
  const context = await browser.newContext()
  try {
    const page = await context.newPage()
    await gotoJamIdle(page)
    await page.evaluate((at) => window.__workspaceHarness.setWallClock(at), JAM_TEMPLATE_STARTED_AT)
    await startJamByClick(page)
    await jamToRunning(page)
    await expect
      .poll(async () => (await sessionState(page)).latestReady, { timeout: 30_000 })
      .toBeGreaterThanOrEqual(2)
    await clockTo(page, (await phraseStartsAt(page, 2)) + 1)
    await expect
      .poll(async () => (await sessionState(page)).latestReady, { timeout: 30_000 })
      .toBeGreaterThanOrEqual(3)
    await sessionAction(page).click()
    await expect(reviewTitle(page)).toBeVisible()
    const [key] = await untilKept(page, 1)
    if (key === undefined) throw new Error('the Jam session was not kept')
    const stored = await storedSession(page, key)
    if (stored.summary.isJam !== true) throw new Error('the Jam template is no Jam session')
    return stored
  } finally {
    await context.close()
  }
}

/** Intent: wait until the harness has loaded the saved data and published its API. */
async function harnessPublished(page: Page): Promise<void> {
  await page.waitForFunction(() => typeof window.__workspaceHarness !== 'undefined')
}

/**
 * Intent: the last load's figure, after checking every kept session is upgraded, its session-wide
 * record at data version 4 and its body at 5 (waiting for the app's port when the wait ended
 * first).
 */
async function lastLoad(page: Page, sessions: number): Promise<LoadTiming> {
  const timing = await page.evaluate(() => ({
    read: window.__workspaceHarness.storage.loadOutcome() === 'saved-data-read',
    ms: window.__workspaceHarness.storage.loadMs(),
  }))
  await expect
    .poll(
      () =>
        page.evaluate(async (versions) => {
          /** Intent: how many records of a store are at its upgraded version; -1 before the port opens. */
          const current = async (store: 'sessionSummaries' | 'sessionBodies') => {
            try {
              const records = await window.__workspaceHarness.storage.records(store)
              return records.filter(
                (record) => (record as { dataVersion?: unknown }).dataVersion === versions[store],
              ).length
            } catch {
              // The app's port opens late when the start-up wait ended first: none read yet.
              return -1
            }
          }
          return [await current('sessionSummaries'), await current('sessionBodies')]
        }, UPGRADED_DATA_VERSIONS),
      { timeout: 120_000 },
    )
    .toEqual([sessions, sessions])
  return timing
}

/**
 * Intent: after the cold load, check steps 4 and 5 carried the first copy of `template` over: its
 * session-wide record at data version 4, no Jam, with no declined suggestion, its preset label and
 * phrase count as seeded; its body at data version 5 with no doodle and no played-notes clock,
 * its phrases as seeded.
 */
async function expectFirstSessionCarriedOver(page: Page, template: StoredSession): Promise<void> {
  const upgraded = await storedSession(page, FIRST_COPY_KEY)
  expect(upgraded.summary).toMatchObject({
    dataVersion: UPGRADED_DATA_VERSIONS.sessionSummaries,
    isJam: false,
    phraseCount: template.summary.phraseCount,
  })
  expect(upgraded.summary).not.toHaveProperty('suggestionDeclined')
  expect(typeof upgraded.summary.presetLabel).toBe('string')
  expect(upgraded.body.dataVersion).toBe(UPGRADED_DATA_VERSIONS.sessionBodies)
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

/**
 * Intent: after the cold load, check step 5 carried v3.2's player presets over (each at data
 * version 5 with the level at Off), left the settings as v3.2 wrote them (no level record), and
 * carried the first Jam copy over (its Jam mark kept, its body at data version 5 with its doodle,
 * each intent at Off).
 */
async function expectVersionFourCarriedOver(page: Page): Promise<void> {
  const [presets, settings] = await page.evaluate(() =>
    Promise.all([
      window.__workspaceHarness.storage.records('presets'),
      window.__workspaceHarness.storage.records('settings'),
    ]),
  )
  expect(presets).toHaveLength(V32_PLAYER_PRESETS)
  for (const preset of presets) {
    expect(preset).toMatchObject({ dataVersion: 5, chordFamilies: { 'seventh-chords': 'off' } })
  }
  expect(settings).toHaveLength(Object.keys(V32_SETTINGS).length)
  for (const setting of settings) expect(setting).toMatchObject({ appVersion: '3.2.0' })
  const jam = await storedSession(page, FIRST_JAM_COPY_KEY)
  expect(jam.summary).toMatchObject({ dataVersion: 4, isJam: true })
  expect(jam.body).toMatchObject({ dataVersion: 5 })
  expect(jam.body).toHaveProperty('doodle')
  for (const { intent } of storedPhrases(jam.body)) {
    expect(intent.chordFamilies).toEqual({ 'seventh-chords': 'off' })
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

/**
 * Intent: v3.2's data: data version 4, its settings, 50 player presets and kept sessions, half of
 * them copies of `jam` (lengthened as the other template), in v3.2's bytes; the open runs step 5.
 */
function fromV32(jam: StoredSession): UpgradePath {
  const jamTemplate = sizedTemplate(v32Session(jam)).template
  const presets = Array.from({ length: V32_PLAYER_PRESETS }, (_, index) =>
    timingPlayerPreset(index, false),
  )
  return {
    title:
      "M3 (v3.3), from v3.2's data (data version 4; step 5): half the kept sessions Jam sessions, 50 player presets",
    shaped: v32Session,
    seed: async (page, template, sessions) => {
      const jams = Math.floor(sessions / 2)
      await seedVersionFour(page, template, sessions - jams)
      await seedVersionFour(page, jamTemplate, jams)
      await seedVersionFourSettingsAndPresets(page, V32_SETTINGS, presets)
    },
    carriedOver: expectVersionFourCarriedOver,
  }
}

/** v3.1's data: data version 3, kept sessions only; the open runs steps 4 and 5. */
const FROM_V31: UpgradePath = {
  title: "M3, from v3.1's data (data version 3; steps 4 and 5)",
  shaped: v31Session,
  seed: seedVersionThree,
  carriedOver: async () => {},
}

/** v3.0's data: data version 1, settings and kept sessions; the open runs steps 2 to 5. */
const FROM_V30: UpgradePath = {
  title: "M3, from v3.0's data (data version 1; steps 2 to 5), for comparison",
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

// The Jazz session every path copies, played once.
let played: StoredSession

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000)
  played = await playedTemplate(browser)
})

// @test-link [[module_presets_and_kept_sessions_upgrade_step]]
test("M3 (v3.3): the data version 5 upgrade of v3.2's kept sessions and player presets at the first open, by kept-session count", async ({
  browser,
}) => {
  test.setTimeout(900_000)
  await measurePath(fromV32(await playedJamTemplate(browser)), played)
})

// @test-link [[module_kept_session_jam_upgrade_step]]
test("M3: the upgrade of v3.1's kept sessions at the first open, by kept-session count", async () => {
  test.setTimeout(900_000)
  await measurePath(FROM_V31, played)
})

// @test-link [[module_kept_session_upgrade_step]]
// @test-link [[module_settings_upgrade_step]]
// @test-link [[module_kept_session_jam_upgrade_step]]
test("M3, for comparison: the upgrade of v3.0's settings and kept sessions to data version 5 at the first open, by kept-session count", async () => {
  test.setTimeout(900_000)
  await measurePath(FROM_V30, played)
})
