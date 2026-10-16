/**
 * v3.0 chunk 15, Your data's deletions made in place (ui_ux screens/your-data, flows/saved-data
 * Your Data), on the workspace harness (port 4175) over the browser's real IndexedDB, each test
 * from an empty browser context:
 *
 * - Delete every session: every kept session and the one in memory, an unreadable one included, in
 *   one batch (the write spy), settings and my instrument staying, no most recent session left
 *   until the next session ends with a review; and with nothing stored (another tab deleted them),
 *   the same success, writing nothing (spec D332);
 * - Delete all played notes, and the played notes already kept when the switch turns off;
 * - a refused deletion keeps its confirmation with its error line, the confirming action trying
 *   again.
 */
import { expect, test } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import { sessionAction } from '../session/session-helpers'
import { NOT_SAVED, keepLine, playSession, portChanges } from '../review/review-tools-helpers'
import { reviewLink } from '../review/review-helpers'
import { seedCopy, sessionsLink, startAt } from '../review/session-list-helpers'
import {
  gotoStorageHarness,
  reloadHarness,
  seedMyInstrument,
  seedSettings,
  storedSettings,
} from './storage-helpers'
import {
  DELETION_FAILED,
  EMPTY_LIST,
  LOW_TENOR,
  askConfirmation,
  closeWithDone,
  confirmingAction,
  keptKeys,
  mostRecent,
  openYourData,
  sectionLines,
  sheetButton,
  storedKeys,
  summaryKeys,
  yourDataSheet,
} from './your-data-helpers'

test.use({ locale: 'en-US', timezoneId: 'Europe/Paris' })

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

// @test-link [[module_kept_session_changes]]
// @test-link [[module_kept_session_reach]]
// @test-link [[req_your_data]]
// @test-link [[rule_most_recent_session_kept]]
test('Delete every session: every session, the one in memory and an unreadable one, in one batch; the rest stays', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page)
  await seedMyInstrument(page, LOW_TENOR)
  await seedSettings(page, { theme: 'Dark' })
  await playSession(page)
  await expect.poll(() => summaryKeys(page)).toHaveLength(1)
  await page.evaluate(() =>
    window.__workspaceHarness.storage.seedUnreadableKeptSession('session-unreadable'),
  )
  const settings = await storedSettings(page)

  await openYourData(page)
  expect((await sectionLines(page, 'Sessions'))[0]).toBe(
    '1 session kept: none pinned, no favorite phrases.',
  )
  await askConfirmation(page, 'Delete every session', 'Delete every session?')
  await expect(yourDataSheet(page).locator('.sheet-body p')).toHaveText([
    'This deletes the one kept session, with its favorite phrases, comment and played notes. Your settings, your instrument and the remembered controller stay.',
    "This can't be undone.",
  ])
  const before = await portChanges(page)
  await confirmingAction(page).click()

  await expect(yourDataSheet(page)).toHaveAccessibleName('Your data')
  expect((await sectionLines(page, 'Sessions'))[0]).toBe('No sessions kept yet.')
  await expect(sheetButton(page, 'Delete every session')).toHaveCount(0)
  await expect(sheetButton(page, 'Done')).toBeFocused()
  expect(await portChanges(page)).toBe(before + 1)
  expect(await keptKeys(page)).toEqual({ sessionSummaries: [], sessionBodies: [], playedNotes: [] })
  expect(await storedSettings(page)).toEqual(settings)
  expect(
    await page.evaluate(() => window.__workspaceHarness.storage.records('instrument')),
  ).toHaveLength(1)
  expect(await mostRecent(page)).toBeNull()

  // The Review of the deleted session gave way to the list, in its empty state.
  await closeWithDone(page)
  await expect(page.locator('.sessions-empty')).toHaveText(EMPTY_LIST)
  await sessionAction(page).click()
  await expect(reviewLink(page)).toHaveCount(0)
  await expect(sessionsLink(page)).toHaveCount(0)

  // Until the next session ends with a review.
  await playSession(page)
  expect(await mostRecent(page)).toMatchObject({ kind: 'held' })
})

// @test-link [[module_kept_session_reach]]
// @test-link [[module_kept_session_changes]]
test('Delete every session finding nothing stored: no write, the sessions in memory gone, the ordinary success', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page)
  await playSession(page)
  await expect.poll(() => summaryKeys(page)).toHaveLength(1)
  const [kept] = await summaryKeys(page)
  if (kept === undefined) throw new Error('the session was not kept')
  await sessionAction(page).click()
  await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves('other'))
  await playSession(page, 8)
  await expect(keepLine(page)).toHaveText(NOT_SAVED)
  await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves(null))
  // Another tab deletes the kept session.
  await page.evaluate((key) => window.__workspaceHarness.storage.deleteKeptSession(key), kept)

  await openYourData(page)
  expect((await sectionLines(page, 'Sessions'))[0]).toBe(
    '1 session kept: none pinned, no favorite phrases.',
  )
  await askConfirmation(page, 'Delete every session', 'Delete every session?')
  const before = await portChanges(page)
  await confirmingAction(page).click()

  await expect(yourDataSheet(page)).toHaveAccessibleName('Your data')
  expect((await sectionLines(page, 'Sessions'))[0]).toBe('No sessions kept yet.')
  await expect(yourDataSheet(page).locator('.alert-error')).toHaveCount(0)
  expect(await portChanges(page)).toBe(before)
  expect(await mostRecent(page)).toBeNull()
  await closeWithDone(page)
  await expect(page.locator('.sessions-empty')).toHaveText(EMPTY_LIST)
})

// @test-link [[rule_kept_played_notes_deletable]]
// @test-link [[rule_played_notes_kept_only_after_opt_in]]
test('Delete all played notes deletes every played-notes record and nothing else; turning the switch off offers it', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page)
  await playSession(page)
  await expect.poll(() => summaryKeys(page)).toHaveLength(1)
  const [played] = await summaryKeys(page)
  if (played === undefined) throw new Error('the session was not kept')
  await seedCopy(page, played, 'session-copy', { startedAt: startAt(0), newer: false })
  for (const key of [played, 'session-copy'])
    await page.evaluate((k) => window.__workspaceHarness.storage.seedPlayedNotes(k), key)
  await reloadHarness(page)

  await openYourData(page)
  expect((await sectionLines(page, 'Played notes'))[1]).toBe('Kept with 2 sessions.')
  // On, then off: the played notes already kept may be deleted too; Keep them keeps them.
  const keep = sheetButton(page, 'Keep my played notes')
  await keep.click()
  await expect(keep).toHaveAttribute('aria-pressed', 'true')
  await expect(keep).toBeFocused()
  await keep.click()
  await expect(yourDataSheet(page)).toHaveAccessibleName('Delete the played notes already kept?')
  await expect(sheetButton(page, 'Keep them')).toBeFocused()
  await sheetButton(page, 'Keep them').click()
  await expect(keep).toBeFocused()
  await expect(keep).toHaveAttribute('aria-pressed', 'false')
  expect(await storedKeys(page, 'playedNotes')).toHaveLength(2)

  await askConfirmation(page, 'Delete all played notes', 'Delete all played notes?')
  await expect(yourDataSheet(page).locator('.sheet-body p').first()).toHaveText(
    'This deletes the played notes kept with 2 sessions. The sessions stay, with their favorite phrases and comments.',
  )
  const settings = await storedSettings(page)
  await confirmingAction(page).click()

  await expect(yourDataSheet(page)).toHaveAccessibleName('Your data')
  expect((await sectionLines(page, 'Played notes'))[1]).toBe('None kept.')
  await expect(sheetButton(page, 'Done')).toBeFocused()
  const keys = await keptKeys(page)
  expect(keys.playedNotes).toEqual([])
  expect(keys.sessionSummaries).toHaveLength(2)
  expect(keys.sessionBodies).toHaveLength(2)
  expect(await storedSettings(page)).toEqual(settings)
})

// @test-link [[module_kept_session_changes]]
// @test-link [[rule_delete_everything]]
test('a refused deletion keeps its confirmation with its error line; the confirming action tries again', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page)
  await playSession(page)
  await openYourData(page)
  await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves('other'))

  await askConfirmation(page, 'Delete every session', 'Delete every session?')
  await confirmingAction(page).click()
  await expect(yourDataSheet(page).locator('.alert-error')).toHaveText(DELETION_FAILED)
  await expect(yourDataSheet(page)).toHaveAccessibleName('Delete every session?')
  expect(await summaryKeys(page)).toHaveLength(1)
  await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves(null))
  await confirmingAction(page).click()
  await expect(yourDataSheet(page)).toHaveAccessibleName('Your data')
  expect(await summaryKeys(page)).toEqual([])

  await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves('other'))
  await askConfirmation(page, 'Delete everything', 'Delete everything?')
  await confirmingAction(page).click()
  await expect(yourDataSheet(page).locator('.alert-error')).toHaveText(DELETION_FAILED)
  await sheetButton(page, 'Cancel').click()
  await expect(sheetButton(page, 'Delete everything')).toBeFocused()
})
