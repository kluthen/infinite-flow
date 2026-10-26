/**
 * v3.1 chunk 9, the kept sessions an earlier version kept, carried over at the open, on the
 * workspace harness (port 4175) with its fake audio clock, over the browser's real IndexedDB: a
 * Jazz session played and kept by this version, turned in Node into the shapes v3.0 kept it in
 * (data version 1) and seeded in a fresh browser context through the harness's v3.0 seam while
 * the load is held, is upgraded by the load's open: its records are rewritten at data version 4
 * (steps 2 to 4; v3.2 chunk 22), no Jam, the session list and its Review's summary show its
 * preset label, and its Review exports the same files.
 */
import { expect, test, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import {
  collectDownloads,
  exportOnce,
  pickFormat,
  reviewPanel,
  reviewTitle,
  type DownloadedFile,
} from '../review/review-helpers'
import { untilKept } from '../review/review-tools-helpers'
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
  seedVersionOne,
  storedPhrases,
  storedSession,
  v30Session,
  V30_PRESET_LABEL,
} from './kept-session-v1-helpers'
import { gotoStorageHarness, harnessReady } from './storage-helpers'

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
    expect(upgraded.body.dataVersion).toBe(4)
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
