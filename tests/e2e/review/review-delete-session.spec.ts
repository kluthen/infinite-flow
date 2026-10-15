/**
 * v3.0 chunk 12, `Delete session` and the retry of a failed save in the Review, on the workspace
 * harness (port 4175) with its fake audio clock, over the browser's real IndexedDB; each test
 * starts from an empty browser context and plays a two-phrase session, then Stop:
 *
 * - `Delete session`, after its confirmation, deletes the session's records in one batch and the
 *   session that just ended from memory, `review-link` with it; it is absent while saving is off;
 * - in a session whose save failed, a favorite or a pin retries the session's own save; on
 *   success the keep line takes its pinned wording, a failed retry changes nothing shown.
 *
 * Favorites, pin and the phone layout are in review-favorites.spec.ts.
 */
import { expect, test } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import { expectReviewShowing, playUntilPhrase, reviewLink, reviewPanel } from './review-helpers'
import {
  deleteSessionButton,
  favoriteMarks,
  keepLine,
  keyedRecords,
  NOT_SAVED,
  PINNED,
  pinButton,
  playSession,
  portChanges,
  sheet,
  sheetAction,
  star,
  summaryOf,
  untilKept,
} from './review-tools-helpers'
import { readyToStart, sessionAction, sessionState, startSession } from '../session/session-helpers'
import { gotoStorageHarness } from '../storage/storage-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

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
