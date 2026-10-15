/**
 * v3.0 chunk 12, favorites and pin in the Review, on the workspace harness (port 4175) with its
 * fake audio clock, over the browser's real IndexedDB; each test starts from an empty browser
 * context and plays a two-phrase session, then Stop:
 *
 * - marking a favorite pins the session (the keep line and the pin button change in place);
 *   removing the last favorite leaves it pinned; after a new session and a reload, the session
 *   and its favorite are still kept;
 * - unpinning a session with favorites asks first; without favorites it does not;
 * - the first pin or favorite of a visit asks the browser once for persistent storage;
 * - starting a session from a Review with favorites asks nothing;
 * - on a landscape phone, every new control is there, the star without its word.
 *
 * `Delete session` and the retry of a failed save are in review-delete-session.spec.ts.
 */
import { expect, test, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import { reviewLink, reviewPanel, reviewTitle } from './review-helpers'
import {
  deleteSessionButton,
  favoriteMarks,
  keepLine,
  NOT_PINNED,
  PINNED,
  pinButton,
  playSession,
  sheet,
  sheetAction,
  star,
  summaryOf,
  untilKept,
} from './review-tools-helpers'
import {
  PHONE,
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
} from '../session/session-helpers'
import { gotoStorageHarness, reloadHarness } from '../storage/storage-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

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
