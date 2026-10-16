/**
 * v3.0 chunk 14b, the session list, on the workspace harness (port 4175) with its fake audio clock,
 * over the browser's real IndexedDB; each test starts from an empty browser context, plays its
 * sessions on a fixed wall clock (US English, Paris time) and reloads where the list must come from
 * the saved data:
 *
 * - five kept sessions (two pinned, one with played notes, one with a comment, one saved by a newer
 *   version) give one row each, newest first, with exactly the design's lines and buttons; the
 *   newer one cannot be opened and has no pin; the list shows no number but the date, the time, the
 *   length, the phrase count and the favorite count, and no wording of how the player played;
 * - each row opens its Review, whose `All sessions` comes back to that row; pin, unpin and delete
 *   from a row, for sessions held in memory or not (an unpin with favorites asks first); deleting
 *   the last row shows the empty state; a Review's `Delete session` lands on the list;
 * - a refused body read leaves the row with its note (focus kept), and turns `Review last session`
 *   into the list with that row's note;
 * - an unreadable summary has no row (alone, neither cue-row link shows); a session whose save was
 *   refused or made with saving off has no row after a reload;
 * - on a landscape phone, every row keeps every line and both buttons.
 *
 * A newer version's session, and a current copy of a session, are seeded through the harness's
 * storage seam (`seedKeptSessionCopy`); a refused read through `refuseKeptSessionReads`.
 */
import { expect, test, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import { PHONE, sessionAction, sessionState } from '../session/session-helpers'
import { gotoStorageHarness, reloadHarness } from '../storage/storage-helpers'
import { REVIEW_TITLE, reviewLink, reviewPanel, reviewTitle } from './review-helpers'
import {
  EMPTY,
  FAILED_NOTE,
  NEWER_NOTE,
  allSessions,
  expectedActions,
  expectedLines,
  keyStartedAt,
  listTitle,
  refuseKeptReads,
  rowAction,
  rowOf,
  rowOpen,
  rows,
  seedCopy,
  sessionAt,
  sessionDateOf,
  sessionsLink,
  sessionsPanel,
  showListFromCueRow,
  shownRows,
  startAt,
  storedSummary,
} from './session-list-helpers'
import {
  deleteSessionButton,
  keyedRecords,
  pinButton,
  sheet,
  sheetAction,
  star,
  summaryOf,
  untilKept,
} from './review-tools-helpers'

test.use({ locale: 'en-US', timezoneId: 'Europe/Paris' })

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: add `text` as the shown Review's comment, through its editor, and wait until stored. */
async function addComment(page: Page, key: string, text: string): Promise<void> {
  const comment = reviewPanel(page).locator('.review-comment')
  await comment.getByRole('button', { name: 'Add a comment', exact: true }).click()
  await page.keyboard.insertText(text)
  await comment.getByRole('button', { name: 'Done', exact: true }).click()
  await expect.poll(async () => (await storedSummary(page, key)).comment).toBe(text)
}

/** Intent: play two sessions (the first starred, so pinned with a favorite), then reload. */
async function twoKeptSessions(page: Page): Promise<[string, string]> {
  await gotoStorageHarness(page)
  await sessionAt(page, startAt(1))
  const first = await keyStartedAt(page, startAt(1))
  await star(page, 1).click()
  await expect.poll(async () => (await summaryOf(page, first))?.pinned).toBe(true)
  await sessionAt(page, startAt(2))
  await untilKept(page, 2)
  await reloadHarness(page)
  return [first, await keyStartedAt(page, startAt(2))]
}

/** Intent: confirm the open sheet titled `title` with its action `action`. */
async function confirmSheet(page: Page, title: string, action: string): Promise<void> {
  await expect(sheet(page)).toHaveAccessibleName(title)
  await sheetAction(page, action).click()
  await expect(sheet(page)).toHaveCount(0)
}

// @test-link [[req_kept_session_list]]
// @test-link [[rule_pinned_session_kept]]
// @test-link [[rule_favorite_pins_session]]
// @test-link [[rule_session_comment]]
// @test-link [[rule_outdated_tab_reads_what_it_can]]
// @test-link [[rule_most_recent_session_kept]]
test('five kept sessions: one row each, newest first, exactly as designed, no performance figure', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await gotoStorageHarness(page)
  await sessionAt(page, startAt(1))
  const commented = await keyStartedAt(page, startAt(1))
  await addComment(page, commented, 'Warm-up,\nthen scales')
  await pinButton(page).click()
  await expect.poll(async () => (await storedSummary(page, commented)).pinned).toBe(true)
  await sessionAt(page, startAt(2))
  const starred = await keyStartedAt(page, startAt(2))
  await star(page, 1).click()
  await expect.poll(async () => (await storedSummary(page, starred)).favoritesCount).toBe(1)
  await sessionAt(page, startAt(3))
  const last = await keyStartedAt(page, startAt(3))
  await untilKept(page, 3)
  await seedCopy(page, last, 'session-copy-older', { startedAt: startAt(0), newer: false })
  await seedCopy(page, last, 'session-copy-newer', { startedAt: startAt(4), newer: true })
  await page.evaluate((key) => window.__workspaceHarness.storage.seedPlayedNotes(key), last)

  await reloadHarness(page)
  await showListFromCueRow(page)

  /** Intent: the session date of the `n`th start. */
  const date = (n: number) => sessionDateOf(page, startAt(n))
  /** Intent: the detail and status lines of the session stored under `key`. */
  const lines = async (key: string) => expectedLines(await storedSummary(page, key))
  const copied = await storedSummary(page, 'session-copy-older')
  expect(await shownRows(page)).toEqual([
    {
      title: await date(4),
      openDisabled: true,
      lines: [...expectedLines(copied), `session-row-note: ${NEWER_NOTE}`],
      actions: [],
    },
    {
      title: `${await date(3)} · Last session`,
      openDisabled: false,
      lines: await lines(last),
      actions: expectedActions(await date(3), false),
    },
    {
      title: await date(2),
      openDisabled: false,
      lines: await lines(starred),
      actions: expectedActions(await date(2), true),
    },
    {
      title: await date(1),
      openDisabled: false,
      lines: [...(await lines(commented)), 'session-row-comment: Warm-up, then scales'],
      actions: expectedActions(await date(1), true),
    },
    {
      title: await date(0),
      openDisabled: false,
      lines: expectedLines(copied),
      actions: expectedActions(await date(0), false),
    },
  ])
  expect((await storedSummary(page, last)).playedNotesKept).toBe(true)
  expect((await storedSummary(page, starred)).pinned).toBe(true)
  await expect(rowOf(page, await date(4)).locator('.session-row-actions')).toHaveCount(0)

  // The text scan: only the dates (with their times), lengths, phrase and favorite counts count.
  const labels = await sessionsPanel(page)
    .locator('[aria-label]')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-label')))
  let scanned = [await sessionsPanel(page).innerText(), ...labels].join('\n')
  for (const n of [0, 1, 2, 3, 4]) scanned = scanned.replaceAll(await date(n), '')
  scanned = scanned.replace(/Under 1 min|\b\d+ (min|phrases?|favorites?)\b/g, '')
  expect(scanned).not.toMatch(/\d/)
  expect(scanned).not.toMatch(
    /\b(hits?|miss(es|ed)?|scored?|scores|accura(cy|te)|correct|wrong|mistakes?|percent)\b|%/i,
  )
})

// @test-link [[req_kept_session_list]]
// @test-link [[req_kept_session_review]]
// @test-link [[module_kept_session_reach]]
// @test-link [[rule_pinned_session_kept]]
// @test-link [[req_favorite_phrases]]
test('each row opens its Review and All sessions returns to it; pin, unpin, delete from the rows', async ({
  page,
}) => {
  test.setTimeout(180_000)
  const [first, second] = await twoKeptSessions(page)
  const [date1, date2] = [
    await sessionDateOf(page, startAt(1)),
    await sessionDateOf(page, startAt(2)),
  ]
  await showListFromCueRow(page)

  await rowOpen(page, date1).click()
  await expect(reviewTitle(page)).toBeFocused()
  await expect(reviewTitle(page)).toHaveText(date1)
  await allSessions(page).click()
  await expect(rowOpen(page, date1)).toBeFocused()
  await rowOpen(page, date2).click()
  await expect(reviewTitle(page)).toBeFocused()
  await expect(reviewTitle(page)).toHaveText(REVIEW_TITLE)
  await allSessions(page).click()
  await expect(rowOpen(page, date2)).toBeFocused()

  // Pin the session held in memory (its Review was the last shown): at once.
  await rowAction(page, date2, 'Pin').click()
  await expect(rowAction(page, date2, 'Unpin')).toBeFocused()
  await expect.poll(async () => (await summaryOf(page, second))?.pinned).toBe(true)
  await expect(rowOf(page, date2).locator('.session-row-meta').nth(1)).toHaveText(
    'No favorites · Pinned',
  )
  // Unpin one not held, with a favorite: it asks first.
  await rowAction(page, date1, 'Unpin').click()
  await expect(sheet(page)).toHaveAccessibleName('Unpin this session?')
  await sheetAction(page, 'Keep pinned').click()
  await expect(sheet(page)).toHaveCount(0)
  await expect(rowAction(page, date1, 'Unpin')).toBeFocused()
  expect((await summaryOf(page, first))?.pinned).toBe(true)
  await rowAction(page, date1, 'Unpin').click()
  await confirmSheet(page, 'Unpin this session?', 'Unpin')
  await expect(rowAction(page, date1, 'Pin')).toBeFocused()
  await expect.poll(async () => (await summaryOf(page, first))?.pinned).toBe(false)
  await expect(rowOf(page, date1).locator('.session-row-meta').nth(1)).toHaveText(
    '1 favorite · Not pinned: deleted when your next session is saved.',
  )
  // Without favorites, Unpin unpins at once.
  await rowAction(page, date2, 'Unpin').click()
  await expect(sheet(page)).toHaveCount(0)
  await expect(rowAction(page, date2, 'Pin')).toBeFocused()
  await expect.poll(async () => (await summaryOf(page, second))?.pinned).toBe(false)

  // Delete the first row (held): focus to the next row; then the last one (not held).
  await rowAction(page, date2, 'Delete').click()
  await confirmSheet(page, 'Delete this session?', 'Delete session')
  await expect(rowOpen(page, date1)).toBeFocused()
  await expect(rows(page)).toHaveCount(1)
  await rowAction(page, date1, 'Delete').click()
  await confirmSheet(page, 'Delete this session?', 'Delete session')
  await expect(sessionsPanel(page).locator('.sessions-empty')).toHaveText(EMPTY)
  await expect(listTitle(page)).toBeFocused()
  for (const store of ['sessionSummaries', 'sessionBodies', 'playedNotes'] as const) {
    expect(await keyedRecords(page, store), store).toEqual([])
  }
  await sessionAction(page).click()
  await expect(reviewLink(page)).toHaveCount(0)
  await expect(sessionsLink(page)).toHaveCount(0)
})

// @test-link [[req_kept_session_list]]
// @test-link [[req_kept_session_review]]
test("a Review's Delete session lands on the list, its empty state included, focus on its title", async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page)
  await sessionAt(page, startAt(1))
  const first = await keyStartedAt(page, startAt(1))
  await pinButton(page).click()
  await expect.poll(async () => (await summaryOf(page, first))?.pinned).toBe(true)
  await sessionAt(page, startAt(2))
  await untilKept(page, 2)
  const date1 = await sessionDateOf(page, startAt(1))

  await deleteSessionButton(page).click()
  await confirmSheet(page, 'Delete this session?', 'Delete session')
  await expect(listTitle(page)).toBeFocused()
  expect((await shownRows(page)).map((row) => row.title)).toEqual([date1])

  await rowOpen(page, date1).click()
  await expect(reviewTitle(page)).toBeFocused()
  await deleteSessionButton(page).click()
  await confirmSheet(page, 'Delete this session?', 'Delete session')
  await expect(listTitle(page)).toBeFocused()
  await expect(rows(page)).toHaveCount(0)
  await expect(sessionsPanel(page).locator('.sessions-empty')).toHaveText(EMPTY)
})

// @test-link [[req_kept_session_list]]
// @test-link [[module_kept_session_reach]]
test('a row whose body read the device refuses shows its note and keeps focus; it opens later', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await twoKeptSessions(page)
  const date1 = await sessionDateOf(page, startAt(1))
  await showListFromCueRow(page)
  await refuseKeptReads(page, true)

  await rowOpen(page, date1).click()
  await expect(rowOf(page, date1).locator('.session-row-note')).toHaveText(FAILED_NOTE)
  await expect(rowOpen(page, date1)).toBeFocused()
  await expect(rowOpen(page, date1)).toBeEnabled()
  await expect(reviewPanel(page)).toHaveCount(0)

  await refuseKeptReads(page, false)
  await rowOpen(page, date1).click()
  await expect(reviewTitle(page)).toBeFocused()
  await allSessions(page).click()
  await expect(rowOf(page, date1).locator('.session-row-note')).toHaveCount(0)
})

// @test-link [[req_kept_session_review]]
// @test-link [[module_kept_session_reach]]
// @test-link [[rule_most_recent_session_kept]]
test('after a reload, a refused read of Review last session shows the list, its row failed', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await gotoStorageHarness(page)
  await sessionAt(page, startAt(1))
  await untilKept(page, 1)
  await reloadHarness(page)
  await refuseKeptReads(page, true)

  await reviewLink(page).click()
  await expect(listTitle(page)).toBeFocused()
  await expect(reviewPanel(page)).toHaveCount(0)
  expect(await shownRows(page)).toMatchObject([
    { title: `${await sessionDateOf(page, startAt(1))} · Last session` },
  ])
  await expect(rows(page).locator('.session-row-note')).toHaveText(FAILED_NOTE)
})

// @test-link [[req_kept_session_list]]
// @test-link [[module_kept_session_reach]]
test('a kept session whose summary cannot be read has no row; alone, neither link shows', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await gotoStorageHarness(page)
  await page.evaluate(() =>
    window.__workspaceHarness.storage.seedUnreadableKeptSession('session-1-1'),
  )
  await reloadHarness(page)
  await expect(sessionAction(page)).toHaveText('Start session')
  await expect(reviewLink(page)).toHaveCount(0)
  await expect(sessionsLink(page)).toHaveCount(0)

  // The load deleted the damaged session (spec D310): only the new one is kept.
  await sessionAt(page, startAt(1))
  await untilKept(page, 1)
  await reloadHarness(page)
  await showListFromCueRow(page)
  expect((await shownRows(page)).map((row) => row.title)).toEqual([
    `${await sessionDateOf(page, startAt(1))} · Last session`,
  ])
})

// @test-link [[req_kept_session_list]]
// @test-link [[rule_most_recent_session_kept]]
// @test-link [[rule_outdated_tab_reads_what_it_can]]
test.describe('after a reload, no row for a session that was not saved', () => {
  const causes = [
    'an other refusal',
    'a quota refusal',
    'an outdated tab',
    'a visit from the defaults',
  ] as const
  for (const cause of causes) {
    test(`after ${cause}; review-link opens the earlier kept session`, async ({ page }) => {
      test.setTimeout(180_000)
      await gotoStorageHarness(page)
      await sessionAt(page, startAt(1))
      const earlier = (await untilKept(page, 1))[0]
      if (cause === 'an outdated tab') {
        await reloadHarness(page)
        await page.evaluate(() => window.__workspaceHarness.storage.openNewerVersion())
      } else if (cause === 'a visit from the defaults') {
        await gotoStorageHarness(page, '?storageRead=fail')
      } else {
        const kind: 'quota' | 'other' = cause === 'a quota refusal' ? 'quota' : 'other'
        await page.evaluate(
          (refusal) => window.__workspaceHarness.storage.refuseSaves(refusal),
          kind,
        )
      }
      await sessionAt(page, startAt(2))

      await gotoStorageHarness(page)
      expect((await sessionState(page)).mostRecent).toEqual({ kind: 'kept', key: earlier })
      await showListFromCueRow(page)
      expect((await shownRows(page)).map((row) => row.title)).toEqual([
        `${await sessionDateOf(page, startAt(1))} · Last session`,
      ])
      await sessionAction(page).click()
      await reviewLink(page).click()
      await expect(reviewTitle(page)).toBeFocused()
      await expect(reviewTitle(page)).toHaveText(REVIEW_TITLE)
    })
  }

  test('after a refused first save, neither link shows', async ({ page }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves('other'))
    await sessionAt(page, startAt(1))
    await reloadHarness(page)
    await expect(sessionAction(page)).toHaveText('Start session')
    await expect(reviewLink(page)).toHaveCount(0)
    await expect(sessionsLink(page)).toHaveCount(0)
  })
})

// @test-link [[req_kept_session_list]]
test('on a landscape phone, every row keeps every line and both buttons', async ({ page }) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page)
  await sessionAt(page, startAt(1))
  const first = await keyStartedAt(page, startAt(1))
  await addComment(page, first, 'A long comment that the row cuts to one line on a narrow screen.')
  await star(page, 1).click()
  await expect.poll(async () => (await summaryOf(page, first))?.pinned).toBe(true)
  await sessionAt(page, startAt(2))
  const second = await keyStartedAt(page, startAt(2))
  await page.evaluate((key) => window.__workspaceHarness.storage.seedPlayedNotes(key), second)
  await untilKept(page, 2)

  await page.setViewportSize(PHONE)
  await reloadHarness(page)
  await showListFromCueRow(page)
  const counts = [
    { lines: 2, comment: 0 },
    { lines: 2, comment: 1 },
  ]
  await expect(rows(page)).toHaveCount(counts.length)
  for (const [index, { lines, comment }] of counts.entries()) {
    const row = rows(page).nth(index)
    await row.scrollIntoViewIfNeeded()
    await expect(row.locator('.session-row-meta')).toHaveCount(lines)
    await expect(row.locator('.session-row-comment')).toHaveCount(comment)
    const parts = row.locator('button.session-row-open, p, .session-row-actions > button')
    await expect(row.locator('.session-row-actions > button')).toHaveCount(2)
    for (const part of await parts.all()) {
      await expect(part).toBeVisible()
      const box = await part.boundingBox()
      expect(box, 'a part of the row has no box').not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(PHONE.width + 1)
    }
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'the document must not overflow horizontally').toBeLessThanOrEqual(1)
})
