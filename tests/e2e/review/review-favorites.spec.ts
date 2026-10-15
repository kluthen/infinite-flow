/**
 * v3.0 chunk 12, favorites, pin and Delete session in the Review, on the workspace harness (port
 * 4175) with its fake audio clock, over the browser's real IndexedDB; each test starts from an
 * empty browser context and plays a two-phrase session, then Stop:
 *
 * - marking a favorite pins the session (the keep line and the pin button change in place);
 *   removing the last favorite leaves it pinned; after a new session and a reload, the session
 *   and its favorite are still kept;
 * - unpinning a session with favorites asks first; without favorites it does not;
 * - the first pin or favorite of a visit asks the browser once for persistent storage;
 * - starting a session from a Review with favorites asks nothing;
 * - `Delete session`, after its confirmation, deletes the session's records in one batch and the
 *   session that just ended from memory, `review-link` with it; it is absent while saving is off;
 * - in a session whose save failed, a favorite or a pin retries the session's own save; on
 *   success the keep line takes its pinned wording, a failed retry changes nothing shown;
 * - on a landscape phone, every new control is there, the star without its word.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import {
  expectReviewShowing,
  playUntilPhrase,
  reviewLink,
  reviewPanel,
  reviewTitle,
} from './review-helpers'
import {
  PHONE,
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
} from '../session/session-helpers'
import { gotoStorageHarness, reloadHarness } from '../storage/storage-helpers'

/** One record a store holds, with its key. */
interface KeyedRecord {
  readonly key: string
  readonly value: unknown
}

/** A kept session's stores. */
type KeptStore = 'sessionSummaries' | 'sessionBodies' | 'playedNotes'

const PINNED = 'Pinned: kept until you unpin or delete it.'
const NOT_PINNED = 'Not pinned: deleted when your next session is saved.'
const NOT_SAVED = 'Not saved on this device: export it to keep it.'

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

/** Intent: the session-wide record stored under `key`, as a plain object. */
async function summaryOf(page: Page, key: string): Promise<Record<string, unknown> | undefined> {
  const summaries = await keyedRecords(page, 'sessionSummaries')
  return summaries.find((record) => record.key === key)?.value as Record<string, unknown>
}

/** Intent: the favorite marks of the body stored under `key`, phrase by phrase. */
async function favoriteMarks(page: Page, key: string): Promise<boolean[] | null> {
  const bodies = await keyedRecords(page, 'sessionBodies')
  const body = bodies.find((record) => record.key === key)?.value as
    { readonly phrases: readonly { readonly favorite: boolean }[] } | undefined
  return body === undefined ? null : body.phrases.map((phrase) => phrase.favorite)
}

/** Intent: wait until exactly `count` kept sessions are stored, and give their keys. */
async function untilKept(page: Page, count: number): Promise<string[]> {
  await expect.poll(async () => (await keyedRecords(page, 'sessionSummaries')).length).toBe(count)
  return (await keyedRecords(page, 'sessionSummaries')).map((record) => record.key)
}

/** Intent: from Idle, play a two-phrase session seeded `seed`, then Stop: the Review shows. */
async function playSession(page: Page, seed = 7): Promise<void> {
  await readyToStart(page, seed)
  await startSession(page)
  await playUntilPhrase(page, 2)
  await sessionAction(page).click()
  await expectReviewShowing(page, 2)
}

/** Intent: phrase `n`'s favorite star in the Review. */
function star(page: Page, n: number): Locator {
  return reviewPanel(page).getByRole('button', { name: `Favorite phrase ${n}`, exact: true })
}

/** Intent: the Review's pin button, whichever it reads. */
function pinButton(page: Page): Locator {
  return reviewPanel(page).locator('.review-session-tools > button').first()
}

/** Intent: the Review's `Delete session`. */
function deleteSessionButton(page: Page): Locator {
  return reviewPanel(page).getByRole('button', { name: 'Delete session', exact: true })
}

/** Intent: the Review's keep line. */
function keepLine(page: Page): Locator {
  return reviewPanel(page).locator('.review-keep-line')
}

/** Intent: the open confirmation sheet. */
function sheet(page: Page): Locator {
  return page.getByRole('dialog')
}

/** Intent: the open sheet's action named `name`. */
function sheetAction(page: Page, name: string): Locator {
  return sheet(page).locator('.sheet-actions').getByRole('button', { name, exact: true })
}

/** Intent: before any page script runs, count `navigator.storage.persist()` calls, never granted. */
async function spyOnPersist(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const spied = window as unknown as { __persistCalls: number }
    spied.__persistCalls = 0
    StorageManager.prototype.persisted = () => Promise.resolve(false)
    StorageManager.prototype.persist = () => {
      spied.__persistCalls += 1
      return Promise.resolve(false)
    }
  })
}

/** Intent: the `navigator.storage.persist()` calls since the page loaded. */
function persistCalls(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __persistCalls: number }).__persistCalls)
}

// @test-link [[req_favorite_phrases]]
// @test-link [[rule_favorite_pins_session]]
// @test-link [[rule_pinned_session_kept]]
test.describe('favorites', () => {
  test('marking pins the session; removing the last leaves it pinned; after a new session and a reload it and its favorite are kept', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    await gotoStorageHarness(page)
    await playSession(page)
    const [key] = await untilKept(page, 1)
    await expect(keepLine(page)).toHaveText(NOT_PINNED)
    await expect(pinButton(page)).toHaveText('Pin')
    await expect(reviewPanel(page).locator('.review-summary')).toHaveText(/ · No favorites$/)

    await star(page, 2).click()
    await expect(star(page, 2)).toHaveAttribute('aria-pressed', 'true')
    await expect(star(page, 2)).toBeFocused()
    await expect(keepLine(page)).toHaveText(PINNED)
    await expect(pinButton(page)).toHaveText('Unpin')
    await expect(reviewPanel(page).locator('.review-summary')).toHaveText(/ · 1 favorite$/)
    await expect.poll(() => favoriteMarks(page, key!)).toEqual([false, true])
    expect(await summaryOf(page, key!)).toMatchObject({ pinned: true, favoritesCount: 1 })

    // The last favorite removed: still pinned, here and stored.
    await star(page, 2).click()
    await expect(star(page, 2)).toHaveAttribute('aria-pressed', 'false')
    await expect(keepLine(page)).toHaveText(PINNED)
    await expect.poll(() => favoriteMarks(page, key!)).toEqual([false, false])
    expect(await summaryOf(page, key!)).toMatchObject({ pinned: true, favoritesCount: 0 })

    // Marked again, then a new session: the pinned session stays, with its favorite.
    await star(page, 1).click()
    await expect.poll(() => favoriteMarks(page, key!)).toEqual([true, false])
    await sessionAction(page).click()
    await playSession(page, 8)
    const keys = await untilKept(page, 2)
    expect(keys).toContain(key)

    await reloadHarness(page)
    expect(await favoriteMarks(page, key!)).toEqual([true, false])
    expect(await summaryOf(page, key!)).toMatchObject({ pinned: true, favoritesCount: 1 })
  })

  test('a kept session read back after a reload shows its favorites, pin and count', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await playSession(page)
    const [key] = await untilKept(page, 1)
    await star(page, 1).click()
    await expect.poll(() => favoriteMarks(page, key!)).toEqual([true, false])

    await reloadHarness(page)
    await reviewLink(page).click()
    await expect(reviewTitle(page)).toBeFocused()
    await expect(star(page, 1)).toHaveAttribute('aria-pressed', 'true')
    await expect(star(page, 2)).toHaveAttribute('aria-pressed', 'false')
    await expect(keepLine(page)).toHaveText(PINNED)
    await expect(pinButton(page)).toHaveText('Unpin')
    await expect(reviewPanel(page).locator('.review-summary')).toHaveText(/ · 1 favorite$/)
  })

  // @test-link [[rule_new_session_never_asks_about_favorites]]
  test('starting a session from a Review with favorites asks nothing', async ({ page }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await playSession(page)
    await star(page, 1).click()
    await expect(keepLine(page)).toHaveText(PINNED)

    await sessionAction(page).click()
    await readyToStart(page, 8)
    await startSession(page)

    await expect(sheet(page)).toHaveCount(0)
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    expect((await sessionState(page)).phase).toBe('count-in')
  })
})

// @test-link [[rule_pinned_session_kept]]
// @test-link [[rule_favorite_pins_session]]
test.describe('Pin and Unpin', () => {
  test('pin and unpin at once without favorites, focus staying; with favorites, Unpin asks first', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await playSession(page)
    const [key] = await untilKept(page, 1)

    await pinButton(page).click()
    await expect(pinButton(page)).toHaveText('Unpin')
    await expect(pinButton(page)).toBeFocused()
    await expect(keepLine(page)).toHaveText(PINNED)
    await expect.poll(async () => (await summaryOf(page, key!))?.pinned).toBe(true)
    await pinButton(page).click()
    await expect(pinButton(page)).toHaveText('Pin')
    await expect(sheet(page)).toHaveCount(0)
    await expect(keepLine(page)).toHaveText(NOT_PINNED)
    await expect.poll(async () => (await summaryOf(page, key!))?.pinned).toBe(false)

    // With favorites: Unpin asks; Keep pinned changes nothing, focus back on Unpin.
    await star(page, 1).click()
    await star(page, 2).click()
    await pinButton(page).click()
    await expect(sheet(page)).toHaveAccessibleName('Unpin this session?')
    await expect(sheet(page).locator('.sheet-body > p')).toHaveText(
      'It will be deleted, with its 2 favorites, when your next session is saved.',
    )
    await expect(sheetAction(page, 'Keep pinned')).toBeFocused()
    await sheetAction(page, 'Keep pinned').click()
    await expect(sheet(page)).toHaveCount(0)
    await expect(pinButton(page)).toHaveText('Unpin')
    await expect(pinButton(page)).toBeFocused()

    // Unpin: unpinned, focus on the button, now Pin; the favorites stay.
    await pinButton(page).click()
    await sheetAction(page, 'Unpin').click()
    await expect(sheet(page)).toHaveCount(0)
    await expect(pinButton(page)).toHaveText('Pin')
    await expect(pinButton(page)).toBeFocused()
    await expect(keepLine(page)).toHaveText(NOT_PINNED)
    await expect
      .poll(() => summaryOf(page, key!))
      .toMatchObject({ pinned: false, favoritesCount: 2 })
  })

  // @test-link [[rule_persistent_storage_requested]]
  test('the first pin or favorite of a visit asks for persistent storage once, none after', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await spyOnPersist(page)
    await gotoStorageHarness(page)
    await playSession(page)
    await untilKept(page, 1)
    expect(await persistCalls(page)).toBe(0)

    await star(page, 1).click()
    await expect.poll(() => persistCalls(page)).toBe(1)
    await star(page, 2).click()
    await pinButton(page).click()
    await sheetAction(page, 'Unpin').click()
    await pinButton(page).click()
    await expect(pinButton(page)).toHaveText('Unpin')
    await page.waitForTimeout(300)
    expect(await persistCalls(page)).toBe(1)
  })
})

// @test-link [[req_kept_session_list]]
// @test-link [[req_last_session_review]]
// @test-link [[module_kept_session_changes]]
test.describe('Delete session', () => {
  test('after its confirmation, deletes the session in one batch, and from memory with review-link; Cancel keeps it', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await playSession(page)
    const [key] = await untilKept(page, 1)
    await star(page, 1).click()
    await expect.poll(() => favoriteMarks(page, key!)).toEqual([true, false])

    await deleteSessionButton(page).click()
    await expect(sheet(page)).toHaveAccessibleName('Delete this session?')
    const paragraphs = sheet(page).locator('.sheet-body > p')
    await expect(paragraphs.first()).toHaveText(
      /^This deletes the session from .+, with its favorite phrase\.$/,
    )
    await expect(paragraphs.nth(1)).toHaveText("This can't be undone.")
    await expect(sheetAction(page, 'Cancel')).toBeFocused()
    await sheetAction(page, 'Cancel').click()
    await expect(deleteSessionButton(page)).toBeFocused()
    expect(await keyedRecords(page, 'sessionSummaries')).toHaveLength(1)

    const from = await portChanges(page)
    await deleteSessionButton(page).click()
    await sheetAction(page, 'Delete session').click()
    await expect(sheet(page)).toHaveCount(0)
    await expect(reviewPanel(page)).toHaveCount(0)
    await expect(reviewLink(page)).toHaveCount(0)
    expect(await portChanges(page)).toBe(from + 1)
    for (const store of ['sessionSummaries', 'sessionBodies', 'playedNotes'] as const) {
      expect(await keyedRecords(page, store), store).toEqual([])
    }
    expect((await sessionState(page)).review).toBeNull()
  })

  test('a refused deletion keeps its sheet with its error and the session as it was', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await playSession(page)
    await untilKept(page, 1)
    await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves('other'))

    await deleteSessionButton(page).click()
    await sheetAction(page, 'Delete session').click()
    await expect(sheet(page).locator('.alert-error')).toHaveText(
      "That couldn't be deleted. Try again.",
    )
    expect(await keyedRecords(page, 'sessionSummaries')).toHaveLength(1)
    await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves(null))
    await sheetAction(page, 'Delete session').click()
    await expect(sheet(page)).toHaveCount(0)
    await expect.poll(async () => (await keyedRecords(page, 'sessionSummaries')).length).toBe(0)
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  test('is absent while saving is off; the star and the pin still work, in memory', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page, '?storageRead=fail')
    await playSession(page)
    await expect(keepLine(page)).toHaveText(NOT_SAVED)

    await expect(deleteSessionButton(page)).toHaveCount(0)
    await star(page, 1).click()
    await expect(star(page, 1)).toHaveAttribute('aria-pressed', 'true')
    await expect(pinButton(page)).toHaveText('Unpin')
    await expect(keepLine(page)).toHaveText(NOT_SAVED)
    await page.waitForTimeout(300)
    expect(await portChanges(page)).toBe(0)
  })
})

// @test-link [[rule_failed_save_never_disturbs_session]]
// @test-link [[module_kept_session_save]]
test.describe('a session whose own save failed', () => {
  test('a favorite retries the save; once saved, the keep line takes its pinned wording', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await readyToStart(page, 7)
    await startSession(page)
    await playUntilPhrase(page, 2)
    await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves('other'))
    await sessionAction(page).click()
    await expectReviewShowing(page, 2)
    await expect(keepLine(page)).toHaveText(NOT_SAVED)
    expect(await keyedRecords(page, 'sessionSummaries')).toEqual([])

    // A failed retry changes nothing shown.
    await pinButton(page).click()
    await expect(pinButton(page)).toHaveText('Unpin')
    await page.waitForTimeout(300)
    await expect(keepLine(page)).toHaveText(NOT_SAVED)

    await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves(null))
    await star(page, 2).click()
    await expect(keepLine(page)).toHaveText(PINNED)
    const [key] = await untilKept(page, 1)
    expect(await summaryOf(page, key!)).toMatchObject({ pinned: true, favoritesCount: 1 })
    expect(await favoriteMarks(page, key!)).toEqual([false, true])
  })
})

// @test-link [[req_favorite_phrases]]
// @test-link [[req_last_session_review]]
test.describe('on a landscape phone', () => {
  test('every new control is there, the star without its word', async ({ page }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await page.setViewportSize(PHONE)
    await playSession(page)

    await expect(star(page, 1)).toBeVisible()
    await expect(star(page, 1).locator('span')).toBeHidden()
    await expect(star(page, 1).locator('svg')).toBeVisible()
    await expect(pinButton(page)).toBeVisible()
    await expect(deleteSessionButton(page)).toBeVisible()
    await expect(
      reviewPanel(page).getByRole('button', { name: 'Add a comment', exact: true }),
    ).toBeVisible()
    // Below bp-tablet-landscape the keep line is rendered only in its "Not saved" form.
    await expect(keepLine(page)).toHaveCount(0)
    const box = await star(page, 1).boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
  })
})
