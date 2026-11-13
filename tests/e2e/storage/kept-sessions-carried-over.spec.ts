/**
 * v3.1 chunk 9, the kept sessions an earlier version kept, carried over at the open, on the
 * workspace harness (port 4175) with its fake audio clock, over the browser's real IndexedDB: a
 * Jazz session played and kept by this version, turned in Node into the shapes v3.0 kept it in
 * (data version 1) and seeded in a fresh browser context through the harness's v3.0 seam while
 * the load is held, is upgraded by the load's open: its session-wide record is rewritten at data
 * version 4 and its body at data version 5 (steps 2 to 5; v3.2 chunk 22, v3.3 chunk 17), no Jam,
 * each phrase's Seventh chords level Off, the session list and its Review's summary show its
 * preset label, and its Review exports the same files.
 *
 * v3.3 chunk 17, v3.2's data carried over at the open: a database at data version 4, seeded
 * through the harness's v3.2 seam with v3.2's settings, a player preset, a pinned Jazz session and
 * a Jam session (each played and kept by this version at Off, turned in Node into v3.2's bytes),
 * opens at data version 5: the player preset and the bodies are rewritten at data version 5 with
 * the level at Off, every other field as before; the session-wide records and the settings are not
 * rewritten; each session opens as before and exports the same files.
 */
import { expect, test, type Browser, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import {
  collectDownloads,
  exportOnce,
  pickFormat,
  reviewPanel,
  reviewTitle,
  type DownloadedFile,
} from '../review/review-helpers'
import { jamReviewed } from '../review/review-jam-helpers'
import { untilKept } from '../review/review-tools-helpers'
import { gotoJamIdle } from '../session/jam-helpers'
import {
  rowOpen,
  sessionDateOf,
  shownRows,
  showListFromCueRow,
} from '../review/session-list-helpers'
import { sessionState } from '../session/session-helpers'
import {
  gotoHeldLoad,
  playJazzSession,
  releaseHeldLoad,
  seedVersionFour,
  seedVersionFourSettingsAndPresets,
  seedVersionOne,
  storedPhrases,
  storedSession,
  v30Session,
  v32Session,
  V30_PRESET_LABEL,
  type StoredSession,
} from './kept-session-v1-helpers'
import {
  databaseRecords,
  gotoStorageHarness,
  harnessReady,
  storedSettings,
} from './storage-helpers'

/** Where the carried-over session's Review screenshot goes: outside the repository. */
const V30_REVIEW_SCREENSHOT =
  '/tmp/claude-1001/-home-bastien-work-infinite-flow/765ca34c-2df3-4b66-b3b9-951e58a40999/scratchpad/c9-v30-review.png'

/** The start of the session v3.0 kept: 10:05 UTC on 2 October 2026. */
const V30_STARTED_AT = Date.UTC(2026, 9, 2, 10, 5)

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/**
 * Intent: from the Review shown, export the generated notes as MusicXML, then as MIDI: the two
 * files, read back whole.
 */
async function exportBoth(page: Page): Promise<{ musicXml: DownloadedFile; midi: DownloadedFile }> {
  const downloads = collectDownloads(page)
  const musicXml = await exportOnce(page, downloads)
  await pickFormat(page, 'MIDI')
  const midi = await exportOnce(page, downloads)
  return { musicXml, midi }
}

// @test-link [[rule_earlier_kept_sessions_carried_over]]
// @test-link [[rule_preset_label_kept_with_session]]
// @test-link [[req_kept_session_review]]
test('a session kept by v3.0 is carried over at the open: the list and the Review show its label, its export unchanged', async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page)
  await playJazzSession(page, V30_STARTED_AT)
  const [played] = await untilKept(page, 1)
  if (played === undefined) throw new Error('the Jazz session was not kept')
  const before = await exportBoth(page)
  const template = v30Session(await storedSession(page, played))
  expect(template.summary).not.toHaveProperty('presetLabel')
  expect(storedPhrases(template.body).every(({ intent }) => !('figureLevels' in intent))).toBe(true)

  // A fresh context: the test's own still holds this version's database.
  const context = await browser.newContext()
  try {
    const fresh = await context.newPage()
    const expectNoFreshErrors = watchPageErrors(fresh)
    await gotoHeldLoad(fresh)
    await seedVersionOne(fresh, template, 1)
    await releaseHeldLoad(fresh)
    await harnessReady(fresh)
    expect(await fresh.evaluate(() => window.__workspaceHarness.storage.loadOutcome())).toBe(
      'saved-data-read',
    )

    const key = `session-${V30_STARTED_AT}-0`
    const upgraded = await storedSession(fresh, key)
    expect(upgraded.summary.dataVersion).toBe(4)
    expect(upgraded.summary.presetLabel).toBe(V30_PRESET_LABEL)
    expect(upgraded.summary.isJam).toBe(false)
    expect(upgraded.summary).not.toHaveProperty('musicalProfile')
    expect(upgraded.body.dataVersion).toBe(5)
    expect(upgraded.body).not.toHaveProperty('doodle')
    const phrases = storedPhrases(upgraded.body)
    expect(phrases).toHaveLength(2)
    for (const { intent } of phrases) {
      expect(intent).toHaveProperty('figureLevels')
      expect(intent).not.toHaveProperty('musicalProfile')
    }

    await showListFromCueRow(fresh)
    const date = await sessionDateOf(fresh, V30_STARTED_AT)
    const [row] = await shownRows(fresh)
    expect(row?.lines[0]).toMatch(new RegExp(` · ${V30_PRESET_LABEL}$`))
    await rowOpen(fresh, date).click()
    await expect(reviewTitle(fresh)).toBeFocused()
    expect((await sessionState(fresh)).review).toEqual({ showing: true, phraseCount: 2 })
    // The Review's length is its row's: the session date (it is titled "Last session"), the
    // row's detail line, then the favorites.
    const detail = row?.lines[0]?.replace(/^session-row-meta: /u, '')
    expect(detail).toMatch(/^(?:Under 1 min|\d+ min) · 2 phrases · /u)
    await expect(reviewPanel(fresh).locator('.review-summary')).toHaveText(
      `${date} · ${detail} · No favorites`,
    )
    await fresh.screenshot({ path: V30_REVIEW_SCREENSHOT })

    const after = await exportBoth(fresh)
    for (const format of ['musicXml', 'midi'] as const) {
      expect(after[format].fileName).toBe(before[format].fileName)
      expect(after[format].bytes.equals(before[format].bytes), `${format} export`).toBe(true)
    }
    expectNoFreshErrors()
  } finally {
    await context.close()
  }
})

/** The start of the Jazz session v3.2 kept: 9:00 UTC on 20 October 2026. */
const V32_JAZZ_STARTED_AT = Date.UTC(2026, 9, 20, 9, 0)

/** The start of the Jam session v3.2 kept: 9:00 UTC on 21 October 2026. */
const V32_JAM_STARTED_AT = Date.UTC(2026, 9, 21, 9, 0)

/** v3.2's settings: a few controls, the theme, a Jam setting and Custom based on its preset. */
const V32_SETTINGS = {
  'controls.tempo': 140,
  'controls.tension': 'Build',
  theme: 'Dark',
  'jam.drift': 'Near',
  presetSelection: { kind: 'custom', baseId: 'player-1' },
} as const

/** v3.2's player preset: Jazz's controls with Tension at Build, Dorian only; no level, as v3.2. */
const V32_PRESET: WorkspaceHarnessPresetInput = {
  id: 'player-1',
  name: 'Late night',
  controls: {
    harmonicMotion: 'Gentle diatonic',
    tension: 'Build',
    noteDensity: 'Eighth',
    rhythmicVariety: 'Slightly varied',
    syncopation: 'Occasional offbeats',
    silenceDensity: 'Conversational',
    contour: 'Wandering',
    register: 'Varying',
    leapiness: 'Shaped',
    arpeggioChaos: 'Varied',
  },
  levels: {
    passingTone: 'asToday',
    accentedPassingTone: 'asToday',
    neighborTone: 'asToday',
    appoggiatura: 'off',
    diatonicEnclosure: 'off',
    chromaticApproach: 'asToday',
    chromaticEnclosure: 'asToday',
  },
  restriction: { keys: 'any', modes: ['Dorian'] },
  kind: 'player',
}

/** A session played and kept by this version: its v3.2 bytes and the files its Review exported. */
interface PlayedSession {
  readonly template: StoredSession
  readonly exported: { musicXml: DownloadedFile; midi: DownloadedFile }
}

/** Intent: from the Review shown, export MusicXML then MIDI, starting from MusicXML. */
async function exportFromMusicXml(page: Page): ReturnType<typeof exportBoth> {
  await pickFormat(page, 'MusicXML')
  return exportBoth(page)
}

/** Intent: the one kept session's stored values, as v3.2's bytes, once it is kept. */
async function keptAsV32(page: Page): Promise<StoredSession> {
  const [key] = await untilKept(page, 1)
  if (key === undefined) throw new Error('the session was not kept')
  return v32Session(await storedSession(page, key))
}

/** Intent: in `page`, a Jazz session played at Off, pinned, kept, and its Review's exports. */
async function playedPinnedJazz(page: Page): Promise<PlayedSession> {
  await gotoStorageHarness(page)
  await playJazzSession(page, V32_JAZZ_STARTED_AT)
  const [key] = await untilKept(page, 1)
  if (key === undefined) throw new Error('the Jazz session was not kept')
  await page.evaluate((kept) => window.__workspaceHarness.storage.pinKeptSession(kept), key)
  const exported = await exportFromMusicXml(page)
  return { template: await keptAsV32(page), exported }
}

/** Intent: in a fresh context, a Jam session played at Off and kept, and its Review's exports. */
async function playedJam(browser: Browser): Promise<PlayedSession> {
  const context = await browser.newContext()
  try {
    const page = await context.newPage()
    const expectNoJamErrors = watchPageErrors(page)
    await gotoJamIdle(page)
    await page.evaluate((at) => window.__workspaceHarness.setWallClock(at), V32_JAM_STARTED_AT)
    await jamReviewed(page, 1)
    const template = await keptAsV32(page)
    const exported = await exportFromMusicXml(page)
    expectNoJamErrors()
    return { template, exported }
  } finally {
    await context.close()
  }
}

/**
 * Intent: open the harness afresh (the load no longer held), then the kept session started at
 * `startedAt` from the list, its Review shown.
 */
async function openFromList(page: Page, startedAt: number, phraseCount: number): Promise<void> {
  await gotoStorageHarness(page)
  await showListFromCueRow(page)
  await rowOpen(page, await sessionDateOf(page, startedAt)).click()
  await expect(reviewTitle(page)).toBeFocused()
  expect((await sessionState(page)).review).toEqual({ showing: true, phraseCount })
}

/** Intent: check the upgrade rewrote the copy under `key` of `played` as step 5 does, no more. */
async function expectCarriedToFive(page: Page, key: string, played: StoredSession): Promise<void> {
  const upgraded = await storedSession(page, key)
  expect(upgraded.summary).toEqual({ ...played.summary, sessionSeed: 0 })
  expect(upgraded.body.dataVersion).toBe(5)
  for (const { intent } of storedPhrases(upgraded.body)) {
    expect(intent.chordFamilies).toEqual({ 'seventh-chords': 'off' })
  }
  expect(v32Session(upgraded).body).toEqual(played.body)
}

// @test-link [[module_presets_and_kept_sessions_upgrade_step]]
// @test-link [[rule_earlier_kept_sessions_read_at_off]]
// @test-link [[rule_earlier_kept_sessions_carried_over]]
test("v3.2's settings, player preset, pinned session and Jam session are carried over to data version 5 at the open, each session opening and exporting as before", async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000)
  const jazz = await playedPinnedJazz(page)
  expect(jazz.template.summary.pinned).toBe(true)
  const jam = await playedJam(browser)
  expect(jam.template.summary.isJam).toBe(true)

  const context = await browser.newContext()
  try {
    const fresh = await context.newPage()
    const expectNoFreshErrors = watchPageErrors(fresh)
    await gotoHeldLoad(fresh)
    await seedVersionFourSettingsAndPresets(fresh, V32_SETTINGS, [V32_PRESET])
    await seedVersionFour(fresh, jazz.template, 1)
    await seedVersionFour(fresh, jam.template, 1)
    await releaseHeldLoad(fresh)
    await harnessReady(fresh)
    expect(
      await fresh.evaluate(() => ({
        outcome: window.__workspaceHarness.storage.loadOutcome(),
        saving: window.__workspaceHarness.storage.savingState(),
      })),
    ).toEqual({ outcome: 'saved-data-read', saving: 'on' })

    const records = await databaseRecords(fresh)
    expect(records.meta).toEqual([expect.objectContaining({ dataVersion: 5 })])
    expect(records.playedNotes ?? []).toEqual([])
    expect(await storedSettings(fresh)).toEqual(V32_SETTINGS)
    for (const setting of records.settings ?? []) {
      expect(setting).toMatchObject({ appVersion: '3.2.0' })
    }
    const presets = await fresh.evaluate(() =>
      window.__workspaceHarness.storage.keyedRecords('presets'),
    )
    expect(presets).toHaveLength(1)
    expect(presets[0]?.value).toMatchObject({
      dataVersion: 5,
      name: 'Late night',
      chordFamilies: { 'seventh-chords': 'off' },
    })
    await expectCarriedToFive(fresh, `session-${V32_JAZZ_STARTED_AT}-0`, jazz.template)
    await expectCarriedToFive(fresh, `session-${V32_JAM_STARTED_AT}-0`, jam.template)

    for (const [startedAt, played] of [
      [V32_JAZZ_STARTED_AT, jazz],
      [V32_JAM_STARTED_AT, jam],
    ] as const) {
      await openFromList(fresh, startedAt, played.template.summary.phraseCount as number)
      const after = await exportFromMusicXml(fresh)
      for (const format of ['musicXml', 'midi'] as const) {
        expect(after[format].fileName).toBe(played.exported[format].fileName)
        expect(after[format].bytes.equals(played.exported[format].bytes), format).toBe(true)
      }
    }
    expectNoFreshErrors()
  } finally {
    await context.close()
  }
})
