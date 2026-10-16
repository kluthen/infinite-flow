/**
 * v3.0 chunk 28, a damaged kept session deleted, with an apology (master spec §5.1, spec D310), on
 * the workspace harness (port 4175) with its fake audio clock, over the browser's real IndexedDB;
 * each test starts from an empty browser context:
 *
 * - at load, every kept session whose summary is damaged goes, its three records, the apology
 *   says how many, and the list and the links show only the others;
 * - a damaged summary written mid-visit goes with the next session's save, in the same
 *   transaction (the write spy), the apology showing as the review opens;
 * - after a reload, `Review last session` finding its session's body damaged deletes it and lands
 *   on the list without its row, focus on its title, then `review-link` opens the readable kept
 *   session that started last; a row finding its body damaged leaves, focus moving as after its
 *   deletion;
 * - nothing is deleted, and no apology shows, for a refused read at an opening, a session a newer
 *   version saved, an outdated tab or a visit from the defaults;
 * - a refused deletion shows "Damaged session not deleted" instead, at every refusal, even after
 *   `Dismiss`, the session unlisted and not counted by Your data;
 * - a session this version saves is never taken for damaged, for each built-in instrument and my
 *   instrument.
 *
 * Damaged summaries and bodies are seeded through the harness's storage seam
 * (`seedUnreadableKeptSession`, `seedDamagedKeptBody`), pins with `pinKeptSession`, refusals with
 * `?storageRefuse=other` from the load on and `refuseKeptSessionReads`.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import { REVIEW_TITLE, reviewLink, reviewTitle } from '../review/review-helpers'
import {
  FAILED_NOTE,
  keyStartedAt,
  listTitle,
  refuseKeptReads,
  rowOpen,
  rows,
  seedCopy,
  sessionAt,
  sessionDateOf,
  sessionsLink,
  shownRows,
  showListFromCueRow,
  startAt,
} from '../review/session-list-helpers'
import { portChanges, untilKept } from '../review/review-tools-helpers'
import { sessionAction, sessionState } from '../session/session-helpers'
import { radio } from '../workspace/helpers'
import { gotoStorageHarness, reloadHarness, seedMyInstrument } from './storage-helpers'
import {
  keptKeys,
  listYourData,
  LOW_TENOR,
  openYourData,
  savingState,
  sectionLines,
  sheetButton,
  yourDataSheet,
} from './your-data-helpers'

/** The key a seeded damaged summary is stored under. */
const DAMAGED_KEY = 'session-1-1'

const APOLOGY_ONE = "Sorry: a kept session was damaged and couldn't be read, so it was deleted."
const NOT_DELETED_ONE =
  "A kept session was damaged and couldn't be read, and this device refused to delete it. It stays hidden until the page is reloaded."
/** A row's note after its opening failed in an outdated tab. */
const OUTDATED_FAILED_NOTE = "This session couldn't be opened. Try again."

/** Intent: the notice row's notice. */
function notice(page: Page): Locator {
  return page.locator('.layout-workspace > .app-notice-row > .app-notice')
}

/** Intent: whether any of the three kept-session stores holds a record under `key`. */
async function storedUnder(page: Page, key: string): Promise<string[]> {
  const keys = await keptKeys(page)
  return Object.entries(keys).flatMap(([store, held]) => (held.includes(key) ? [store] : []))
}

/** Intent: seed a kept session whose summary the codec reads as unreadable, under `key`. */
function seedDamagedSummary(page: Page, key = DAMAGED_KEY): Promise<void> {
  return page.evaluate((at) => window.__workspaceHarness.storage.seedUnreadableKeptSession(at), key)
}

/** Intent: damage the body of the kept session under `key`. */
function damageBody(page: Page, key: string): Promise<void> {
  return page.evaluate((at) => window.__workspaceHarness.storage.seedDamagedKeptBody(at), key)
}

/** Intent: pin the kept session under `key`, as the review's pin does, through the seam. */
function pin(page: Page, key: string): Promise<void> {
  return page.evaluate((at) => window.__workspaceHarness.storage.pinKeptSession(at), key)
}

/**
 * Intent: play `count` sessions, the `n`th started at `startAt(n)`, each but the last pinned once
 * saved, so all are kept; resolves their keys, oldest first.
 */
async function keptSessions(page: Page, count: number): Promise<string[]> {
  const keys: string[] = []
  for (let n = 1; n <= count; n++) {
    await sessionAt(page, startAt(n))
    const key = await keyStartedAt(page, startAt(n))
    if (n < count) await pin(page, key)
    keys.push(key)
  }
  await untilKept(page, count)
  return keys
}

/** Intent: the titles the list's rows show, in order. */
async function rowTitles(page: Page): Promise<string[]> {
  return (await shownRows(page)).map((row) => row.title)
}

test.beforeEach(({ page }) => {
  watchPageErrors(page)
})

// @test-link [[module_kept_session_save]]
// @test-link [[req_kept_sessions]]
// @test-link [[req_kept_session_list]]
test('at load, a damaged session goes, its three records; the apology says so once; the list and links show the others', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page)
  const [pinned, unpinned] = await keptSessions(page, 2)
  await seedDamagedSummary(page)
  expect(await storedUnder(page, DAMAGED_KEY)).toEqual(['sessionSummaries', 'sessionBodies'])

  await reloadHarness(page)

  await expect.poll(() => storedUnder(page, DAMAGED_KEY)).toEqual([])
  await expect(notice(page)).toHaveCount(1)
  await expect(notice(page).locator('p')).toHaveText(APOLOGY_ONE)
  await expect(notice(page).getByRole('button')).toHaveText(['Dismiss'])
  expect([...((await keptKeys(page)).sessionSummaries ?? [])].sort()).toEqual(
    [pinned, unpinned].sort(),
  )
  await showListFromCueRow(page)
  expect(await rowTitles(page)).toEqual([
    `${await sessionDateOf(page, startAt(2))} · Last session`,
    await sessionDateOf(page, startAt(1)),
  ])
  await sessionAction(page).click()
  await expect(sessionsLink(page)).toBeVisible()
  await reviewLink(page).click()
  await expect(reviewTitle(page)).toHaveText(REVIEW_TITLE)
  expect((await sessionState(page)).mostRecent).toEqual(
    expect.objectContaining({ kind: 'held', keeping: 'not-pinned' }),
  )
})

// @test-link [[module_kept_session_save]]
test("a damaged summary written mid-visit goes with the next session's save, in the same transaction; the apology shows", async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page)
  const [first] = await keptSessions(page, 1)
  await seedDamagedSummary(page)
  await untilKept(page, 2)
  await expect(notice(page)).toHaveCount(0)

  const before = await portChanges(page)
  await sessionAt(page, startAt(2))
  const second = await keyStartedAt(page, startAt(2))

  await expect.poll(() => storedUnder(page, DAMAGED_KEY)).toEqual([])
  expect(await portChanges(page)).toBe(before + 1)
  expect((await keptKeys(page)).sessionSummaries ?? []).toEqual([second])
  expect(second).not.toBe(first)
  await expect(notice(page).locator('p')).toHaveText(APOLOGY_ONE)
  await expect(reviewTitle(page)).toHaveText(REVIEW_TITLE)
})

// @test-link [[module_kept_session_save]]
// @test-link [[req_kept_session_review]]
// @test-link [[rule_most_recent_session_kept]]
test('after a reload, Review last session finding its body damaged lands on the list without it; review-link then opens the one that started last', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page)
  const [pinned, unpinned] = await keptSessions(page, 2)
  await damageBody(page, unpinned ?? '')
  await reloadHarness(page)
  await expect(notice(page)).toHaveCount(0)

  await reviewLink(page).click()

  await expect(listTitle(page)).toBeFocused()
  expect(await rowTitles(page)).toEqual([`${await sessionDateOf(page, startAt(1))} · Last session`])
  await expect(notice(page).locator('p')).toHaveText(APOLOGY_ONE)
  expect(await storedUnder(page, unpinned ?? '')).toEqual([])
  expect((await sessionState(page)).mostRecent).toEqual({ kind: 'kept', key: pinned })

  await sessionAction(page).click()
  await reviewLink(page).click()
  await expect(reviewTitle(page)).toBeFocused()
  await expect(reviewTitle(page)).toHaveText(REVIEW_TITLE)
  expect((await sessionState(page)).mostRecent).toEqual(
    expect.objectContaining({ kind: 'held', keeping: 'pinned' }),
  )
})

// @test-link [[module_kept_session_save]]
// @test-link [[req_kept_session_list]]
test("a row finding its body damaged leaves, focus moving as after that row's deletion; the apology shows", async ({
  page,
}) => {
  test.setTimeout(240_000)
  await gotoStorageHarness(page)
  const [oldest, middle] = await keptSessions(page, 3)
  await damageBody(page, middle ?? '')
  await reloadHarness(page)
  await showListFromCueRow(page)
  const middleDate = await sessionDateOf(page, startAt(2))

  await rowOpen(page, middleDate).click()

  await expect(rows(page)).toHaveCount(2)
  await expect(rowOpen(page, await sessionDateOf(page, startAt(1)))).toBeFocused()
  expect(await rowTitles(page)).toEqual([
    `${await sessionDateOf(page, startAt(3))} · Last session`,
    await sessionDateOf(page, startAt(1)),
  ])
  await expect(notice(page).locator('p')).toHaveText(APOLOGY_ONE)
  expect(await storedUnder(page, middle ?? '')).toEqual([])
  expect(await storedUnder(page, oldest ?? '')).toEqual(['sessionSummaries', 'sessionBodies'])
})

// @test-link [[module_kept_session_save]]
// @test-link [[rule_outdated_tab_reads_what_it_can]]
// @test-link [[rule_failed_read_offers_only_delete_everything]]
test.describe('nothing deleted and no apology', () => {
  test('for a read the device refuses at an opening: the row says it failed', async ({ page }) => {
    test.setTimeout(180_000)
    await gotoStorageHarness(page)
    const [, unpinned] = await keptSessions(page, 2)
    await damageBody(page, unpinned ?? '')
    await reloadHarness(page)
    await refuseKeptReads(page, true)

    await reviewLink(page).click()

    await expect(listTitle(page)).toBeFocused()
    await expect(rows(page).first().locator('p').last()).toHaveText(FAILED_NOTE)
    expect(await storedUnder(page, unpinned ?? '')).toEqual(['sessionSummaries', 'sessionBodies'])
    await expect(notice(page)).toHaveCount(0)
  })

  test('for a session a newer version saved', async ({ page }) => {
    test.setTimeout(180_000)
    await gotoStorageHarness(page)
    const [, unpinned] = await keptSessions(page, 2)
    await seedCopy(page, unpinned ?? '', 'session-9-9', { startedAt: startAt(3), newer: true })
    await reloadHarness(page)

    await showListFromCueRow(page)
    await expect(rows(page)).toHaveCount(3)
    expect(await storedUnder(page, 'session-9-9')).toEqual(['sessionSummaries', 'sessionBodies'])
    await expect(notice(page)).toHaveCount(0)
  })

  test('in an outdated tab: a damaged summary stays, and a damaged body keeps the failed-open row', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await gotoStorageHarness(page)
    const [, unpinned] = await keptSessions(page, 2)
    await seedDamagedSummary(page)
    await damageBody(page, unpinned ?? '')
    await page.evaluate(() => window.__workspaceHarness.storage.openNewerVersion())
    await reloadHarness(page)
    expect(await savingState(page)).toBe('off-outdated')

    await showListFromCueRow(page)
    await rowOpen(page, `${await sessionDateOf(page, startAt(2))} · Last session`).click()

    await expect(rows(page).first().locator('p').last()).toHaveText(OUTDATED_FAILED_NOTE)
    expect(await storedUnder(page, DAMAGED_KEY)).toEqual(['sessionSummaries', 'sessionBodies'])
    expect(await storedUnder(page, unpinned ?? '')).toEqual(['sessionSummaries', 'sessionBodies'])
    await expect(notice(page).locator('p')).not.toHaveText(APOLOGY_ONE)
  })

  test('in a visit from the defaults', async ({ page }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await keptSessions(page, 1)
    await seedDamagedSummary(page)

    await gotoStorageHarness(page, '?storageRead=fail')

    await expect(sessionsLink(page)).toHaveCount(0)
    expect(await storedUnder(page, DAMAGED_KEY)).toEqual(['sessionSummaries', 'sessionBodies'])
    await expect(notice(page).locator('p')).not.toHaveText(APOLOGY_ONE)
  })
})

// @test-link [[module_kept_session_save]]
// @test-link [[req_your_data]]
test('a refused deletion shows Damaged session not deleted, again after Dismiss; the sessions stay unlisted and uncounted', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page)
  const [pinned, unpinned] = await keptSessions(page, 2)
  await seedDamagedSummary(page)
  await damageBody(page, unpinned ?? '')

  await gotoStorageHarness(page, '?storageRefuse=other')

  await expect(notice(page).locator('p')).toHaveText(NOT_DELETED_ONE)
  await expect(notice(page).getByRole('button')).toHaveText(['Dismiss'])
  expect(await storedUnder(page, DAMAGED_KEY)).toEqual(['sessionSummaries', 'sessionBodies'])
  await notice(page).getByRole('button', { name: 'Dismiss' }).click()
  await expect(notice(page)).toHaveCount(0)
  await showListFromCueRow(page)
  expect(await rowTitles(page)).toHaveLength(2)

  await rowOpen(page, `${await sessionDateOf(page, startAt(2))} · Last session`).click()

  await expect(notice(page).locator('p')).toHaveText(NOT_DELETED_ONE)
  await expect(rows(page)).toHaveCount(1)
  expect(await storedUnder(page, unpinned ?? '')).toEqual(['sessionSummaries', 'sessionBodies'])
  await openYourData(page, listYourData(page))
  expect((await sectionLines(page, 'Sessions'))[0]).toMatch(/^1 session kept/)
  await sheetButton(page, 'Done').click()
  await expect(yourDataSheet(page)).toHaveCount(0)
  expect((await keptKeys(page)).sessionSummaries ?? []).toContain(pinned)
  await sessionAction(page).click()
  await expect(sessionsLink(page)).toBeVisible()
})

// @test-link [[module_kept_session_save]]
// @test-link [[module_kept_session_codec]]
test('a session this version saves is never taken for damaged: saved, reloaded and opened, for each instrument', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await gotoStorageHarness(page)
  await seedMyInstrument(page, LOW_TENOR)
  const instruments = [
    'C MIDI keyboard',
    'B-flat tenor saxophone',
    'E-flat alto saxophone',
    LOW_TENOR.name,
  ]
  for (const [index, instrument] of instruments.entries()) {
    await reloadHarness(page)
    await radio(page, 'Instrument profile', instrument).click()
    await sessionAt(page, startAt(index + 1))
    const key = await keyStartedAt(page, startAt(index + 1))

    await reloadHarness(page)
    await reviewLink(page).click()

    await expect(reviewTitle(page)).toBeFocused()
    await expect(reviewTitle(page)).toHaveText(REVIEW_TITLE)
    expect(await storedUnder(page, key)).toEqual(['sessionSummaries', 'sessionBodies'])
    await expect(notice(page)).toHaveCount(0)
  }
})
