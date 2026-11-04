/**
 * v3.2 chunk 30, a kept Jam session, on the workspace harness (port 4175: fake audio clock, fake
 * MIDI, real generations) over the browser's real IndexedDB; each test from an empty browser
 * context. A fresh Jam with a one-measure doodle and nothing played in its phrases, ended with
 * Stop once phrase 1 has sounded:
 *
 * - saved as any session: the Jam mark with no decline, the quantized doodle with its capture
 *   tempo and the played-notes clock in the body, after a reload too; with `Keep my played notes`
 *   off, no raw doodle note in storage; with it on, the raw doodle notes kept as played notes (only
 *   the doodle was played), told apart by their times: before phrase 1's start on the clock;
 * - `Delete played notes` shows for it, its confirmation in the Jam copy, and deletes the raw doodle
 *   notes only, the body and its doodle kept; `Delete session` removes both forms;
 * - in an outdated tab and a visit whose saved data could not be read, the Jam runs and is reviewed
 *   in memory, and nothing is written.
 */
import { expect, test, type Page } from '@playwright/test'

import { KEYS, gotoControllerHarness, watchPageErrors } from '../controller/controller-helpers'
import { deletePlayedNotesButton, reviewPanel } from '../review/review-helpers'
import {
  NOT_PINNED,
  NOT_SAVED,
  deleteSessionButton,
  keepLine,
  keyedRecords,
  portChanges,
  sheet,
  sheetAction,
  untilKept,
} from '../review/review-tools-helpers'
import { gotoJamIdle, jamToRunning, startJamByClick } from '../session/jam-helpers'
import { connectDevice } from '../session/session-midi-helpers'
import { sessionAction } from '../session/session-helpers'
import { expectChecked, jamFrame, modeSegment } from '../workspace/jam-mode-helpers'
import { reloadHarness, seedSettings } from './storage-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** How long a save takes at most to land on this harness. */
const SETTLE_MS = 300

/** What a kept Jam session's body holds of its Jam part. */
interface StoredJamBody {
  readonly doodle?: {
    readonly quantized: { readonly measureCount: number; readonly notes: readonly unknown[] }
    readonly captureTempo: number
  }
  readonly playedNotesClock?: {
    readonly doodleFirstBarline: number
    readonly phraseOneStart: number
  }
}

/** Intent: the value stored under `key` in `store`, read through the harness's seam. */
async function storedValue(
  page: Page,
  store: 'sessionSummaries' | 'sessionBodies' | 'playedNotes',
  key: string,
): Promise<unknown> {
  return (await keyedRecords(page, store)).find((record) => record.key === key)?.value
}

/** Intent: the stored played notes' onsets under `key`, in seconds on the record's clock. */
async function storedOnsets(page: Page, key: string): Promise<readonly number[]> {
  const record = (await storedValue(page, 'playedNotes', key)) as
    { readonly notes: readonly { readonly onset: number }[] } | undefined
  return record === undefined ? [] : record.notes.map((note) => note.onset)
}

/** Intent: from Jam mode's Idle, a fresh Jam with a one-measure doodle, Stopped once running. */
async function jamThenStop(page: Page): Promise<void> {
  await startJamByClick(page)
  await jamToRunning(page)
  await sessionAction(page).click()
  await expect(reviewPanel(page)).toBeVisible()
}

/** Intent: land in Jam mode's Idle with `query` on the harness URL, the keyboard connected. */
async function gotoJamIdleWith(page: Page, query: Readonly<Record<string, string>>): Promise<void> {
  await gotoControllerHarness(page, { query: { pregeneration: 'off', ...query } })
  await connectDevice(page, KEYS)
  await modeSegment(page, 'Jam').click()
  await expectChecked(page, 'Jam')
  await expect(jamFrame(page)).toBeVisible()
  await expect(sessionAction(page)).toBeEnabled()
}

// @test-link [[module_kept_jam_session]]
// @test-link [[rule_quantized_doodle_is_generation_input]]
// @test-link [[rule_raw_doodle_notes_are_played_notes]]
test.describe('a Jam session kept on the device', () => {
  test('with Keep my played notes off: the doodle and its tempo are back after a reload, and no raw doodle note is stored', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoJamIdle(page)
    await jamThenStop(page)
    const [key] = await untilKept(page, 1)
    await expect(keepLine(page)).toHaveText(NOT_PINNED)

    await reloadHarness(page)

    expect(await storedValue(page, 'sessionSummaries', key!)).toEqual(
      expect.objectContaining({ isJam: true, suggestionDeclined: false, playedNotesKept: false }),
    )
    const body = (await storedValue(page, 'sessionBodies', key!)) as StoredJamBody
    expect(body.doodle?.quantized.measureCount).toBe(1)
    expect(body.doodle?.quantized.notes).toHaveLength(1)
    expect(body.doodle?.captureTempo).toBeGreaterThan(0)
    expect(body.playedNotesClock?.phraseOneStart).toBeGreaterThan(
      body.playedNotesClock?.doodleFirstBarline ?? Infinity,
    )
    expect(await keyedRecords(page, 'playedNotes')).toEqual([])
  })

  // @test-link [[rule_played_notes_kept_only_after_opt_in]]
  // @test-link [[rule_deleting_played_notes_keeps_quantized_doodle]]
  test('with it on, a Jam in which only the doodle was played keeps its raw doodle notes; Delete played notes, in the Jam copy, deletes only them', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoJamIdle(page)
    await seedSettings(page, { keepPlayedNotes: true })
    await gotoJamIdle(page)
    await jamThenStop(page)
    const [key] = await untilKept(page, 1)
    await expect.poll(() => storedOnsets(page, key!)).toHaveLength(1)
    const body = (await storedValue(page, 'sessionBodies', key!)) as StoredJamBody
    const [onset] = await storedOnsets(page, key!)
    expect(onset).toBeLessThan(body.playedNotesClock!.phraseOneStart)
    expect(onset).toBeGreaterThanOrEqual(body.playedNotesClock!.doodleFirstBarline)

    await reloadHarness(page)
    expect(await storedOnsets(page, key!)).toEqual([onset])

    await gotoJamIdle(page)
    await jamThenStop(page)
    const [second] = (await untilKept(page, 1)).filter((each) => each !== key)
    await expect.poll(() => storedOnsets(page, second!)).toHaveLength(1)
    await expect(deletePlayedNotesButton(page)).toBeVisible()
    await deletePlayedNotesButton(page).click()
    await expect(sheet(page)).toHaveAccessibleName("Delete this session's played notes?")
    const paragraphs = sheet(page).locator('.sheet-body > p')
    await expect(paragraphs.first()).toHaveText(
      'This deletes the notes you played in this session. The session stays, with its doodle as the app wrote it, its favorite phrases and comment.',
    )
    await expect(paragraphs.nth(1)).toHaveText("This can't be undone.")
    const before = await storedValue(page, 'sessionBodies', second!)

    await sheetAction(page, 'Delete played notes').click()

    await expect(sheet(page)).toHaveCount(0)
    await expect.poll(() => keyedRecords(page, 'playedNotes')).toEqual([])
    expect(await storedValue(page, 'sessionBodies', second!)).toEqual(before)
    expect(await storedValue(page, 'sessionSummaries', second!)).toEqual(
      expect.objectContaining({ isJam: true, playedNotesKept: false }),
    )
  })

  // @test-link [[req_kept_session_list]]
  test('Delete session removes the session-wide record, the body with its doodle, and the played notes', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoJamIdle(page)
    await seedSettings(page, { keepPlayedNotes: true })
    await gotoJamIdle(page)
    await jamThenStop(page)
    const [key] = await untilKept(page, 1)
    await expect.poll(() => storedOnsets(page, key!)).toHaveLength(1)

    await deleteSessionButton(page).click()
    await sheetAction(page, 'Delete session').click()

    await expect(sheet(page)).toHaveCount(0)
    await expect.poll(() => keyedRecords(page, 'sessionSummaries')).toEqual([])
    expect(await keyedRecords(page, 'sessionBodies')).toEqual([])
    expect(await keyedRecords(page, 'playedNotes')).toEqual([])
  })
})

// @test-link [[rule_jam_in_visits_that_save_nothing]]
// @test-link [[rule_outdated_tab_stops_saving]]
// @test-link [[rule_failed_read_offers_only_delete_everything]]
test.describe('a Jam in a visit that saves nothing', () => {
  for (const cause of ['an outdated tab', 'a failed read'] as const) {
    test(`in ${cause}: the Jam runs and is reviewed, and nothing is written`, async ({ page }) => {
      test.setTimeout(120_000)
      if (cause === 'an outdated tab') {
        await gotoJamIdle(page)
        await page.evaluate(() => window.__workspaceHarness.storage.openNewerVersion())
      } else {
        await gotoJamIdleWith(page, { storageRead: 'fail' })
      }
      expect(await page.evaluate(() => window.__workspaceHarness.storage.savingState())).not.toBe(
        'on',
      )
      const from = await portChanges(page)

      await jamThenStop(page)
      await expect(keepLine(page)).toHaveText(NOT_SAVED)
      await page.waitForTimeout(SETTLE_MS)

      expect(await portChanges(page)).toBe(from)
      expect(await keyedRecords(page, 'sessionSummaries')).toEqual([])
    })
  }
})
