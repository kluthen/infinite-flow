/**
 * v3.0 chunk 11, `Keep my played notes` and the deletion of kept played notes, on the workspace
 * harness (port 4175) with its fake audio clock and fake MIDI access, over the browser's real
 * IndexedDB; each test starts from an empty browser context and plays one session with the
 * keyboard, two notes in phrase 1 (each held 100 ms, so neither is very short), stopped once
 * phrase 2 sounds:
 *
 * - off (the first visit's), the session is kept without its played notes, and after a reload its
 *   Review has no lane; on, they are kept and come back after a reload, times from the session's
 *   start; switched on in the just-ended session's Review, that session's are kept too;
 * - `Delete played notes` deletes that session's played notes and nothing else, in one batch, after
 *   its confirmation, the lane, `review-view` and the played-notes export leaving at once; a
 *   refused batch keeps the sheet with its error and leaves both records as they were;
 * - a change reads at the change: a session pinned meanwhile stays pinned; one deleted meanwhile
 *   is not recreated;
 * - turned off while played notes are kept, "Delete the played notes already kept?" opens:
 *   `Keep them` keeps them, `Delete them` deletes every one, an unreadable session's included,
 *   and nothing else; with none kept, nothing opens;
 * - with saving off, the switch changes for the visit only; a refused change stays in memory and
 *   the notice row tells it.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import {
  HELD_NOTE_SECONDS,
  deletePlayedNotesButton,
  expectReviewShowing,
  exportPlayedButton,
  keepPlayedNotesToggle,
  playUntilPhrase,
  playedNotesToggle,
  reviewLink,
  reviewPanel,
  reviewTitle,
} from '../review/review-helpers'
import { untilReady } from '../session/rolling-helpers'
import { readyToStart, sessionAction, startSession } from '../session/session-helpers'
import {
  KEYS,
  clockTo,
  connectDevice,
  expectedNotesOf,
  idleTimeline,
  noteOff,
  noteOn,
  phraseStartsAt,
} from '../session/session-midi-helpers'
import { gotoStorageHarness, reloadHarness, seedSettings, storedSettings } from './storage-helpers'

/** One record a store holds, with its key. */
interface KeyedRecord {
  readonly key: string
  readonly value: unknown
}

/** A kept session's stores. */
type KeptStore = 'sessionSummaries' | 'sessionBodies' | 'playedNotes'

/** The key a seeded unreadable kept session is stored under. */
const UNREADABLE_KEY = 'session-1-1'

const SAVE_FAILED =
  "Something couldn't be saved on this device. The app keeps working, but this change may be lost when the page closes."

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: every record of a store with its key, read through the harness's seam. */
function keyedRecords(page: Page, store: KeptStore): Promise<KeyedRecord[]> {
  return page.evaluate((name) => window.__workspaceHarness.storage.keyedRecords(name), store)
}

/** Intent: the changes that reached the storage port since the load (the write spy). */
function portChanges(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.storage.portChanges())
}

/** Intent: what every kept-session store holds now. */
async function keptStores(page: Page): Promise<Record<KeptStore, KeyedRecord[]>> {
  return {
    sessionSummaries: await keyedRecords(page, 'sessionSummaries'),
    sessionBodies: await keyedRecords(page, 'sessionBodies'),
    playedNotes: await keyedRecords(page, 'playedNotes'),
  }
}

/** Intent: wait until one kept session is stored, and give its key. */
async function untilKept(page: Page): Promise<string> {
  await expect.poll(async () => (await keyedRecords(page, 'sessionSummaries')).length).toBe(1)
  const [summary] = await keyedRecords(page, 'sessionSummaries')
  if (summary === undefined) throw new Error('no kept session')
  return summary.key
}

/** Intent: the session-wide record stored under `key`, as a plain object. */
async function summaryOf(page: Page, key: string): Promise<Record<string, unknown> | undefined> {
  const summaries = await keyedRecords(page, 'sessionSummaries')
  return summaries.find((record) => record.key === key)?.value as Record<string, unknown>
}

/** Intent: the played notes stored under `key`, each note's onset in seconds. */
async function storedOnsets(page: Page, key: string): Promise<number[] | null> {
  const records = await keyedRecords(page, 'playedNotes')
  const record = records.find((entry) => entry.key === key)?.value as
    { readonly notes: readonly { readonly onset: number }[] } | undefined
  return record === undefined ? null : record.notes.map((note) => note.onset)
}

/** The first note's onset, from phrase 1's start, which a played session gives. */
interface PlayedSession {
  readonly firstOnset: number
}

/**
 * Intent: on the harness opened with `search`, with the keyboard connected, play a session from
 * phrase 1 seeded 7: two notes in phrase 1, each on a written note's onset, then Stop once phrase
 * 2 sounds; the Review shows. Gives the first note's onset from phrase 1's start.
 */
async function playedSession(page: Page, search = ''): Promise<PlayedSession> {
  await gotoStorageHarness(page, search)
  await connectDevice(page, KEYS)
  await readyToStart(page, 7)
  const phraseOne = await idleTimeline(page)
  await startSession(page)
  await untilReady(page, 2)
  const start = await phraseStartsAt(page, 1)
  const [first, second] = expectedNotesOf(phraseOne, 1, start)
  if (first === undefined || second === undefined) throw new Error('phrase 1 has two notes')
  await clockTo(page, first.onsetAt)
  await noteOn(page, KEYS, first.pitch, { at: first.onsetAt })
  await noteOff(
    page,
    KEYS,
    first.pitch,
    Math.min(first.onsetAt + HELD_NOTE_SECONDS, second.onsetAt),
  )
  await clockTo(page, second.onsetAt)
  await noteOn(page, KEYS, second.pitch, { at: second.onsetAt })
  await noteOff(page, KEYS, second.pitch, second.onsetAt + HELD_NOTE_SECONDS)
  await playUntilPhrase(page, 2)
  await sessionAction(page).click()
  await expectReviewShowing(page, 2)
  return { firstOnset: first.onsetAt - start }
}

/** Intent: the open confirmation sheet. */
function sheet(page: Page): Locator {
  return page.getByRole('dialog')
}

/** Intent: the open sheet's action named `name`. */
function sheetAction(page: Page, name: string): Locator {
  return sheet(page).locator('.sheet-actions').getByRole('button', { name, exact: true })
}

/** Intent: after a reload, open the kept session's Review through `Review last session`. */
async function reopenAfterReload(page: Page): Promise<void> {
  await reloadHarness(page)
  await reviewLink(page).click()
  await expect(reviewTitle(page)).toBeFocused()
}

// @test-link [[rule_played_notes_kept_only_after_opt_in]]
// @test-link [[rule_review_played_notes_toggle]]
test.describe('Keep my played notes', () => {
  test('off: the session is kept without its played notes, and after a reload its Review has no lane', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await playedSession(page)
    await expect(keepPlayedNotesToggle(page)).toHaveAttribute('aria-pressed', 'false')
    await expect(deletePlayedNotesButton(page)).toHaveCount(0)
    const key = await untilKept(page)

    expect(await keyedRecords(page, 'playedNotes')).toEqual([])
    expect(await summaryOf(page, key)).toMatchObject({ playedNotesKept: false })
    await reopenAfterReload(page)
    await expect(reviewPanel(page).locator('.review-view')).toHaveCount(0)
    await expect(exportPlayedButton(page)).toHaveCount(0)
  })

  test('on: the played notes are kept and come back after a reload, times from the session start', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await seedSettings(page, { keepPlayedNotes: true })
    const { firstOnset } = await playedSession(page)
    await expect(keepPlayedNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(deletePlayedNotesButton(page)).toBeVisible()
    const key = await untilKept(page)

    const onsets = await storedOnsets(page, key)
    expect(onsets).toHaveLength(2)
    expect(onsets?.[0]).toBeCloseTo(firstOnset, 6)
    expect(await summaryOf(page, key)).toMatchObject({ playedNotesKept: true })
    await reopenAfterReload(page)
    await playedNotesToggle(page).click()
    await expect(reviewPanel(page).locator('.played-note')).toHaveCount(2)
    await expect(keepPlayedNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(deletePlayedNotesButton(page)).toBeVisible()
  })

  test("switched on in the just-ended session's Review, keeps that session's played notes too", async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await playedSession(page)
    const key = await untilKept(page)

    await keepPlayedNotesToggle(page).click()
    await expect(keepPlayedNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(keepPlayedNotesToggle(page)).toBeFocused()
    await expect(deletePlayedNotesButton(page)).toBeVisible()

    await expect.poll(() => storedOnsets(page, key)).toHaveLength(2)
    expect(await summaryOf(page, key)).toMatchObject({ playedNotesKept: true })
    await expect.poll(() => storedSettings(page)).toMatchObject({ keepPlayedNotes: true })
    await reopenAfterReload(page)
    await expect(playedNotesToggle(page)).toBeVisible()
  })
})

// @test-link [[rule_kept_played_notes_deletable]]
// @test-link [[module_kept_session_changes]]
test.describe("Delete played notes: one session's", () => {
  test('after its confirmation, deletes them and nothing else in one batch; a refused batch changes nothing', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await seedSettings(page, { keepPlayedNotes: true })
    await playedSession(page)
    const key = await untilKept(page)
    await expect.poll(() => storedOnsets(page, key)).toHaveLength(2)
    const before = await keptStores(page)

    await deletePlayedNotesButton(page).click()
    await expect(sheet(page)).toHaveAccessibleName("Delete this session's played notes?")
    await expect(sheetAction(page, 'Cancel')).toBeFocused()

    // Refused: the sheet stays with its error, both records as they were.
    await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves('other'))
    const refusedFrom = await portChanges(page)
    await sheetAction(page, 'Delete played notes').click()
    await expect(sheet(page).locator('.alert-error')).toHaveText(
      "That couldn't be deleted. Try again.",
    )
    expect(await portChanges(page)).toBe(refusedFrom + 1)
    await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves(null))
    expect(await keptStores(page)).toEqual(before)
    await expect(playedNotesToggle(page)).toBeVisible()

    // Tried again: one batch; the lane, review-view and the played-notes export leave at once.
    const from = await portChanges(page)
    await sheetAction(page, 'Delete played notes').click()
    await expect(sheet(page)).toHaveCount(0)
    await expect(reviewPanel(page).locator('.review-view')).toHaveCount(0)
    await expect(exportPlayedButton(page)).toHaveCount(0)
    await expect(reviewTitle(page)).toBeFocused()
    expect(await portChanges(page)).toBe(from + 1)
    const after = await keptStores(page)
    expect(after.playedNotes).toEqual([])
    expect(after.sessionBodies).toEqual(before.sessionBodies)
    expect(after.sessionSummaries).toEqual([
      { key, value: { ...(before.sessionSummaries[0]!.value as object), playedNotesKept: false } },
    ])
  })

  test('reads at the change: a session pinned meanwhile stays pinned', async ({ page }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await seedSettings(page, { keepPlayedNotes: true })
    await playedSession(page)
    const key = await untilKept(page)
    await expect.poll(() => storedOnsets(page, key)).toHaveLength(2)
    await page.evaluate((pinned) => window.__workspaceHarness.storage.pinKeptSession(pinned), key)

    await deletePlayedNotesButton(page).click()
    await sheetAction(page, 'Delete played notes').click()
    await expect(sheet(page)).toHaveCount(0)

    await expect.poll(() => storedOnsets(page, key)).toBeNull()
    expect(await summaryOf(page, key)).toMatchObject({ pinned: true, playedNotesKept: false })
  })

  test('to a session deleted meanwhile, writes nothing and recreates nothing', async ({ page }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await seedSettings(page, { keepPlayedNotes: true })
    await playedSession(page)
    const key = await untilKept(page)
    await expect.poll(() => storedOnsets(page, key)).toHaveLength(2)
    await page.evaluate((gone) => window.__workspaceHarness.storage.deleteKeptSession(gone), key)
    const from = await portChanges(page)

    await deletePlayedNotesButton(page).click()
    await sheetAction(page, 'Delete played notes').click()
    await expect(sheet(page)).toHaveCount(0)

    expect(await portChanges(page)).toBe(from)
    expect(await keptStores(page)).toEqual({
      sessionSummaries: [],
      sessionBodies: [],
      playedNotes: [],
    })
  })
})

// @test-link [[rule_kept_played_notes_deletable]]
// @test-link [[module_kept_session_changes]]
test.describe('Keep my played notes turned off with played notes kept', () => {
  test('asks; Keep them keeps them; Delete them deletes every one, an unreadable session’s included, and nothing else', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await seedSettings(page, { keepPlayedNotes: true })
    await playedSession(page)
    const key = await untilKept(page)
    await expect.poll(() => storedOnsets(page, key)).toHaveLength(2)
    // Stored since the load, as another tab would: a damaged session with its played notes.
    await page.evaluate(async (damaged) => {
      await window.__workspaceHarness.storage.seedUnreadableKeptSession(damaged)
      await window.__workspaceHarness.storage.seedPlayedNotes(damaged)
    }, UNREADABLE_KEY)
    const before = await keptStores(page)
    const settingsBefore = await storedSettings(page)

    // Keep them: the switch is off and saved, the played notes stay.
    await keepPlayedNotesToggle(page).click()
    await expect(sheet(page)).toHaveAccessibleName('Delete the played notes already kept?')
    await expect(sheet(page).locator('.sheet-body > p').first()).toHaveText(
      "Your played notes won't be kept from now on. The ones already kept with 2 sessions can be deleted too; the sessions stay.",
    )
    await expect(sheetAction(page, 'Keep them')).toBeFocused()
    await sheetAction(page, 'Keep them').click()
    await expect(sheet(page)).toHaveCount(0)
    await expect(keepPlayedNotesToggle(page)).toBeFocused()
    await expect(keepPlayedNotesToggle(page)).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(() => storedSettings(page)).toMatchObject({ keepPlayedNotes: false })
    expect(await keptStores(page)).toEqual(before)

    // On again, then off: Delete them.
    await keepPlayedNotesToggle(page).click()
    await expect(keepPlayedNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')
    await keepPlayedNotesToggle(page).click()
    await expect(sheet(page)).toHaveCount(1)
    await expect.poll(() => storedSettings(page)).toMatchObject({ keepPlayedNotes: false })
    const from = await portChanges(page)
    await sheetAction(page, 'Delete them').click()
    await expect(sheet(page)).toHaveCount(0)
    expect(await portChanges(page)).toBe(from + 1)
    await expect(reviewPanel(page).locator('.review-view')).toHaveCount(0)
    await expect(reviewTitle(page)).toBeFocused()

    const after = await keptStores(page)
    expect(after.playedNotes).toEqual([])
    expect(after.sessionBodies).toEqual(before.sessionBodies)
    const unreadable = before.sessionSummaries.find((record) => record.key === UNREADABLE_KEY)
    expect(after.sessionSummaries).toEqual([
      unreadable,
      {
        key,
        value: {
          ...(before.sessionSummaries.find((record) => record.key === key)!.value as object),
          playedNotesKept: false,
        },
      },
    ])
    expect(await storedSettings(page)).toEqual({ ...settingsBefore, keepPlayedNotes: false })
  })

  test('with none kept, as read at the switch (another tab deleted the session), nothing opens', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await seedSettings(page, { keepPlayedNotes: true })
    await playedSession(page)
    const key = await untilKept(page)
    await expect.poll(() => storedOnsets(page, key)).toHaveLength(2)
    await page.evaluate((gone) => window.__workspaceHarness.storage.deleteKeptSession(gone), key)

    await keepPlayedNotesToggle(page).click()
    await expect(keepPlayedNotesToggle(page)).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(() => storedSettings(page)).toMatchObject({ keepPlayedNotes: false })

    await expect(sheet(page)).toHaveCount(0)
    await expect(keepPlayedNotesToggle(page)).toBeFocused()
  })
})

// @test-link [[rule_outdated_tab_stops_saving]]
// @test-link [[module_kept_session_changes]]
test.describe('while saving is off, or a change is refused', () => {
  test('saving off: the switch changes for the visit only, nothing is written, nothing asked, no deletion offered', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await playedSession(page, '?storageRead=fail')
    expect(await page.evaluate(() => window.__workspaceHarness.storage.savingState())).not.toBe(
      'on',
    )
    await expect(deletePlayedNotesButton(page)).toHaveCount(0)

    await keepPlayedNotesToggle(page).click()
    await expect(keepPlayedNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(deletePlayedNotesButton(page)).toHaveCount(0)
    await keepPlayedNotesToggle(page).click()
    await expect(keepPlayedNotesToggle(page)).toHaveAttribute('aria-pressed', 'false')
    await page.waitForTimeout(300)

    await expect(sheet(page)).toHaveCount(0)
    expect(await portChanges(page)).toBe(0)
  })

  test('a refused change stays in memory for the visit, and the notice row tells it', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await playedSession(page)
    const key = await untilKept(page)
    await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves('other'))

    await keepPlayedNotesToggle(page).click()

    await expect(keepPlayedNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(deletePlayedNotesButton(page)).toBeVisible()
    await expect(page.locator('.layout-workspace > .app-notice-row > .app-notice')).toContainText(
      SAVE_FAILED,
    )
    expect(await storedOnsets(page, key)).toBeNull()
  })
})
