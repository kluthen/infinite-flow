/**
 * Measurement M2 (v3.0 build plan, chunk 7), extended by M3 (v3.1 build plan, chunk 16): how long
 * the load of the saved data takes before the first draw, so the start-up wait can be set at no
 * more than 2 s and well above the slowest read, and stays so once the player presets are read
 * with the settings. On the workspace harness (port 4175), the app's own loader reads the
 * settings, the player presets, every kept session's summary and the remembered controller from a
 * database seeded with 0, 50 and 60 player presets (60 is above the limit of 50, as two tabs
 * saving at once can leave it), each crossed with 0, 10, 100 and 500 kept sessions, each a
 * summary with the longest comment allowed and a body of about 100 kB (the load never reads
 * bodies; they give the database a realistic size). The player presets are realistic ones: names
 * of up to 40 characters, varied controls and levels, a key and mode restriction on some. Each
 * pair of counts is timed cold, on the first load after the browser starts on its profile, then
 * warm, over five reloads. The harness times the load from its start to the settings decoded
 * (`loadMs`).
 *
 * v3.2 chunk 30 times the same read again with every other kept session a Jam session, its
 * summary holding the Jam mark and its body a four-measure doodle of 64 notes and a played-notes
 * clock.
 *
 * v3.3 chunk 17 times it once more on the same databases with the Seventh chords level loaded
 * with them: its settings record saved (Often), and each player preset holding a level, cycled
 * through the four; every other kept session a Jam session. Each load is checked to have read
 * every settings record back as stored, the level's included.
 *
 * Not part of `npm run test:e2e`: run it with `npm run measure:startup-read` on an idle machine,
 * and record the figures, with the machine and the date, in `docs/storage.md`. To check it runs
 * without taking the figures, narrow the counts (`MEASURE_PRESET_COUNTS=50
 * MEASURE_SESSION_COUNTS=10`) and pick one test with `--grep`.
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { chromium, expect, test, type Page } from '@playwright/test'

import { WORKSPACE_HARNESS_URL } from '../release/harness-helpers'
import { measuredCounts, timingPlayerPreset } from './timing-player-presets'

/** The player-preset counts measured: none, the limit, and above it (two tabs saving at once). */
const PRESET_COUNTS = measuredCounts('MEASURE_PRESET_COUNTS', [0, 50, 60])

/** The kept-session counts measured. */
const SESSION_COUNTS = measuredCounts('MEASURE_SESSION_COUNTS', [0, 10, 100, 500])

/** How many built-in presets the session lists before the player presets. */
const BUILT_IN_COUNT = 8

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
  'figureLevels.chromaticApproach': 'asToday',
  presetSelection: { kind: 'custom', baseId: 'jazz' },
  theme: 'Dark',
  'mix.clickOn': false,
  'mix.clickVolume': 0.5,
  'sessionOptions.varySettings': true,
  'review.format': 'midi',
} as const

/** v3.3's settings: the same, with the Seventh chords level saved at Often. */
const SETTINGS_WITH_LEVEL = { ...SETTINGS, 'chordFamilies.seventh-chords': 'favored' } as const

/** How many player presets one tab lets the player save. */
const PLAYER_PRESET_LIMIT = 50

/** What one measured read is seeded with. */
interface ReadData {
  /** Every other kept session a Jam session. */
  readonly halfJam: boolean
  /** The Seventh chords level saved, and held by each player preset. */
  readonly withLevels: boolean
}

/** One pair of counts' figures, in milliseconds. */
interface TimingRow {
  readonly presets: number
  readonly sessions: number
  readonly coldMs: number
  readonly warmMs: readonly number[]
}

/** Intent: open the harness in `page` and wait until the load has ended and the app mounted. */
async function openHarness(page: Page): Promise<void> {
  await page.goto(WORKSPACE_HARNESS_URL)
  await page.waitForFunction(() => typeof window.__workspaceHarness !== 'undefined')
}

/**
 * Intent: the last load's duration, after checking it read the saved data, listed it all and read
 * every settings record back as stored.
 */
async function lastLoadMs(page: Page, presets: number, sessions: number): Promise<number> {
  const report = await page.evaluate(async () => ({
    outcome: window.__workspaceHarness.storage.loadOutcome(),
    listed: window.__workspaceHarness.snapshot().presetNames.length,
    summaries: (await window.__workspaceHarness.storage.records('sessionSummaries')).length,
    notReadBack: await window.__workspaceHarness.storage.settingsNotReadBack(),
    loadMs: window.__workspaceHarness.storage.loadMs(),
  }))
  expect(report.outcome).toBe('saved-data-read')
  expect(report.listed).toBe(BUILT_IN_COUNT + presets)
  expect(report.summaries).toBe(sessions)
  expect(report.notReadBack).toEqual([])
  return report.loadMs
}

/** Intent: seed `presets` through the harness on `page`; nothing when there are none. */
async function seedPlayerPresets(
  page: Page,
  presets: readonly WorkspaceHarnessPresetInput[],
): Promise<void> {
  if (presets.length === 0) return
  await page.evaluate((players) => window.__workspaceHarness.storage.seedPresets(players), presets)
}

/**
 * Intent: seed a fresh browser profile with the settings, `presets` player presets and
 * `sessions` kept sessions. Up to the limit the presets are written from one tab; those above it
 * from a second tab, as two tabs saving at once can leave more than the limit.
 */
async function seedProfile(
  profile: string,
  presets: number,
  sessions: number,
  data: ReadData,
): Promise<void> {
  const context = await chromium.launchPersistentContext(profile)
  const page = await context.newPage()
  await openHarness(page)
  const seeded = Array.from({ length: presets }, (_, index) =>
    timingPlayerPreset(index, data.withLevels),
  )
  const settings = data.withLevels ? SETTINGS_WITH_LEVEL : SETTINGS
  await page.evaluate(
    async ([values, count, bytes, jam]) => {
      await window.__workspaceHarness.storage.seedSettings(values)
      await window.__workspaceHarness.storage.seedTimingSessions(count, bytes, jam)
    },
    [settings, sessions, BODY_BYTES, data.halfJam] as const,
  )
  await seedPlayerPresets(page, seeded.slice(0, PLAYER_PRESET_LIMIT))
  const secondTab = await context.newPage()
  await openHarness(secondTab)
  await seedPlayerPresets(secondTab, seeded.slice(PLAYER_PRESET_LIMIT))
  await context.close()
}

/** Intent: time the cold load after a browser start on `profile`, then the warm reloads. */
async function timeProfile(profile: string, presets: number, sessions: number): Promise<TimingRow> {
  const context = await chromium.launchPersistentContext(profile)
  const page = await context.newPage()
  await openHarness(page)
  const coldMs = await lastLoadMs(page, presets, sessions)
  const warmMs: number[] = []
  for (let load = 0; load < WARM_LOADS; load++) {
    await page.reload()
    await page.waitForFunction(() => typeof window.__workspaceHarness !== 'undefined')
    warmMs.push(await lastLoadMs(page, presets, sessions))
  }
  await context.close()
  return { presets, sessions, coldMs, warmMs }
}

/** Intent: one figure, rounded to a tenth of a millisecond. */
function ms(value: number): string {
  return value.toFixed(1)
}

/** Intent: the title of the table of a read seeded with `data`. */
function tableTitle(data: ReadData): string {
  if (data.withLevels) {
    return 'Half of the kept sessions Jam sessions, the Seventh chords level saved and held by each player preset:'
  }
  return data.halfJam ? 'Half of the kept sessions Jam sessions:' : 'No Jam session:'
}

/** Intent: time every pair of counts on a fresh profile each, seeded with `data`; print the table. */
async function timeEveryPair(data: ReadData): Promise<void> {
  const rows: TimingRow[] = []
  for (const presets of PRESET_COUNTS) {
    for (const sessions of SESSION_COUNTS) {
      const profile = await mkdtemp(path.join(tmpdir(), 'infinite-flow-m2-'))
      try {
        await seedProfile(profile, presets, sessions, data)
        rows.push(await timeProfile(profile, presets, sessions))
      } finally {
        await rm(profile, { recursive: true, force: true })
      }
    }
  }
  const lines = rows.map(
    (row) =>
      `| ${row.presets} | ${row.sessions} | ${ms(row.coldMs)} | ${ms(Math.min(...row.warmMs))} | ${ms(Math.max(...row.warmMs))} |`,
  )
  console.log(
    [
      tableTitle(data),
      '| Player presets | Kept sessions | Cold | Warm, fastest | Warm, slowest |',
      '| --- | --- | --- | --- | --- |',
      ...lines,
    ].join('\n'),
  )
}

// @test-link [[rule_first_phrase_waits_for_saved_settings]]
test('M2 and M3: the start-up read of the saved data, cold and warm, by player-preset and kept-session count', async () => {
  test.setTimeout(1_800_000)
  await timeEveryPair({ halfJam: false, withLevels: false })
})

// v3.2 chunk 30: the same read with every other kept session a Jam session, its body holding a
// four-measure doodle (the load reads the session-wide records only).
// @test-link [[rule_first_phrase_waits_for_saved_settings]]
test('M3 (v3.2): the start-up read with half of the kept sessions Jam sessions with four-measure doodles', async () => {
  test.setTimeout(1_800_000)
  await timeEveryPair({ halfJam: true, withLevels: false })
})

// v3.3 chunk 17: the same read with the Seventh chords level loaded with the settings and the
// player presets.
// @test-link [[rule_first_phrase_waits_for_saved_settings]]
// @test-link [[req_seventh_chords_level]]
test('M3 (v3.3): the start-up read with the Seventh chords level saved and held by the player presets, half of the kept sessions Jam sessions', async () => {
  test.setTimeout(1_800_000)
  await timeEveryPair({ halfJam: true, withLevels: true })
})
