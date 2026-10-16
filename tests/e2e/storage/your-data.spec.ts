/**
 * v3.0 chunk 15, Your data (ui_ux screens/your-data, flows/saved-data Your Data), on the workspace
 * harness (port 4175) over the browser's real IndexedDB, each test from an empty browser context:
 *
 * - its counts, the space line and the protection line from a stubbed storage manager, and the
 *   empty overview of a first visit; its three openers, focus returning to each;
 * - Delete everything: the page reloads into a first visit, a remembered controller not reattached;
 * - its openers are disabled during a session, and no MIDI note starts one while it is open;
 * - a failed read offers Delete everything only; data a newer version wrote, known at load or
 *   later, offers nothing and closes an open confirmation;
 * - two tabs: after Delete everything in one, the other saves nothing, offers no deletion and
 *   shows the outdated notice in the newer version's wording (spec D300, D331).
 *
 * The deletions made in place (every session, every played note) are in ./your-data-deletions.spec.ts.
 */
import { expect, test } from '@playwright/test'

import {
  KEYS,
  clickControllerStatus,
  gotoControllerHarness,
  midiState,
  play,
  plug,
  requestCount,
  sheet as controllerSheet,
  sheetClose,
  watchPageErrors,
} from '../controller/controller-helpers'
import { readyToStart, sessionAction, sessionState } from '../session/session-helpers'
import { playSession, portChanges, star, summaryOf } from '../review/review-tools-helpers'
import { listTitle, seedCopy, sessionsLink, startAt } from '../review/session-list-helpers'
import { radio } from '../workspace/helpers'
import {
  databaseRecords,
  gotoStorageHarness,
  reloadHarness,
  seedMyInstrument,
  seedSettings,
  storedSettings,
} from './storage-helpers'
import {
  INTRO,
  LOW_TENOR,
  NOT_PROTECTED,
  OUTDATED_DEFAULTS_NOTICE,
  OUTDATED_NOTICE,
  OUTDATED_ROW_NOTICE,
  PROTECTED,
  UNREADABLE_NOTICE,
  askConfirmation,
  closeWithDone,
  confirmingAction,
  footerYourData,
  listYourData,
  openYourData,
  savingState,
  sectionHeadings,
  sectionLines,
  setStorageStub,
  sheetButton,
  sheetButtons,
  stubStorageManager,
  summaryKeys,
  yourDataSheet,
} from './your-data-helpers'

test.use({ locale: 'en-US', timezoneId: 'Europe/Paris' })

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

// @test-link [[req_your_data]]
// @test-link [[rule_persistent_storage_requested]]
// @test-link [[req_kept_session_list]]
test('the counts, the space and the protection as designed; the empty overview of a first visit', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await stubStorageManager(page, { databaseBytes: 2_621_440, persisted: true })
  await gotoStorageHarness(page)

  await openYourData(page)
  expect(await sectionHeadings(page)).toEqual([
    'Settings',
    'My instrument',
    'Controller',
    'Sessions',
    'Played notes',
    'Space used',
    'Protection',
  ])
  await expect(yourDataSheet(page).locator('.sheet-body > p').first()).toHaveText(INTRO)
  expect(await sectionLines(page, 'My instrument')).toEqual([
    'None.',
    'Make one with Create my instrument, in the controls.',
  ])
  expect(await sectionLines(page, 'Controller')).toEqual(['None remembered.'])
  expect((await sectionLines(page, 'Sessions'))[0]).toBe('No sessions kept yet.')
  expect((await sectionLines(page, 'Played notes'))[1]).toBe('None kept.')
  expect(await sectionLines(page, 'Space used')).toEqual(['About 2.5 MB'])
  expect(await sectionLines(page, 'Protection')).toEqual([PROTECTED])
  expect(await sheetButtons(page)).toEqual([
    'Close',
    'Keep my played notes off',
    'Delete everything',
    'Done',
  ])
  await closeWithDone(page)

  // Two kept sessions, one pinned with a favorite, the other with its played notes kept.
  await playSession(page)
  await expect.poll(() => summaryKeys(page)).toHaveLength(1)
  const [played] = await summaryKeys(page)
  if (played === undefined) throw new Error('the session was not kept')
  await seedCopy(page, played, 'session-copy', { startedAt: startAt(0), newer: false })
  await star(page, 1).click()
  await expect.poll(async () => (await summaryOf(page, played))?.pinned).toBe(true)
  await page.evaluate(() => window.__workspaceHarness.storage.seedPlayedNotes('session-copy'))
  await seedMyInstrument(page, LOW_TENOR)
  await reloadHarness(page)
  // The init script set the first stub again at the reload; the sheet reads at each opening.
  await setStorageStub(page, { databaseBytes: 12_400_000, persisted: false })

  await sessionsLink(page).click()
  await expect(listTitle(page)).toBeFocused()
  await openYourData(page, listYourData(page))
  expect(await sectionLines(page, 'My instrument')).toEqual([
    'Low tenor, made from the B-flat tenor saxophone.',
    'Change or delete it with Edit my instrument, in the controls.',
  ])
  expect((await sectionLines(page, 'Sessions'))[0]).toBe(
    '2 sessions kept: 1 pinned, 1 favorite phrase.',
  )
  expect((await sectionLines(page, 'Played notes'))[1]).toBe('Kept with 1 session.')
  expect(await sectionLines(page, 'Space used')).toEqual(['About 12 MB'])
  expect(await sectionLines(page, 'Protection')).toEqual([NOT_PROTECTED])
  await closeWithDone(page, listYourData(page))
})

// @test-link [[rule_delete_everything]]
// @test-link [[rule_last_controller_remembered]]
// @test-link [[rule_saved_data_belongs_to_browser_profile]]
test('Delete everything: the page reloads into a first visit, the database empty, the remembered controller gone', async ({
  page,
}) => {
  test.setTimeout(180_000)
  const allowed = { atLoad: { permission: 'granted' as const, devices: [KEYS] } }
  await gotoControllerHarness(page, allowed)
  await clickControllerStatus(page)
  await sheetClose(page).click()
  await expect(controllerSheet(page)).toBeHidden()
  await expect
    .poll(() => page.evaluate(() => window.__workspaceHarness.storage.records('controller')))
    .toHaveLength(1)
  await seedMyInstrument(page, LOW_TENOR)
  await seedSettings(page, { theme: 'Dark' })
  await page.reload()
  await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)
  await expect.poll(() => midiState(page)).toEqual({ kind: 'connected', device: KEYS })

  await openYourData(page)
  expect(await sectionLines(page, 'Controller')).toEqual([
    "Keys 49. It reconnects by itself when it's plugged in.",
    'To forget it, choose Disconnect in the controller connection.',
  ])
  await askConfirmation(page, 'Delete everything', 'Delete everything?')
  await Promise.all([page.waitForEvent('load'), confirmingAction(page).click()])
  await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)

  const records = await databaseRecords(page)
  const stores = ['settings', 'instrument', 'controller', 'sessionSummaries', 'sessionBodies']
  for (const store of [...stores, 'playedNotes']) expect(records[store] ?? []).toEqual([])
  expect(await requestCount(page)).toBe(0)
  expect(await midiState(page)).toEqual({ kind: 'not-requested' })
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark')
  await expect(radio(page, 'Presentation theme', 'System')).toHaveAttribute('aria-checked', 'true')
  await openYourData(page)
  expect(await sectionLines(page, 'My instrument')).toEqual([
    'None.',
    'Make one with Create my instrument, in the controls.',
  ])
  expect(await sectionLines(page, 'Controller')).toEqual(['None remembered.'])
  expect((await sectionLines(page, 'Sessions'))[0]).toBe('No sessions kept yet.')
})

// @test-link [[req_your_data]]
test("the storage-full notice's Your data opens the sheet; the notice stays and focus returns to it", async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves('quota'))
  await radio(page, 'Presentation theme', 'Dark').click()
  const noticeYourData = page
    .locator('.app-notice')
    .getByRole('button', { name: 'Your data', exact: true })
  await expect(noticeYourData).toBeEnabled()

  await openYourData(page, noticeYourData)
  await page.keyboard.press('Escape')
  await expect(yourDataSheet(page)).toHaveCount(0)
  await expect(noticeYourData).toBeFocused()
})

// @test-link [[req_your_data]]
// @test-link [[rule_midi_starting_note]]
test('its openers are disabled during a session; no MIDI note starts one while it is open', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoControllerHarness(page)
  await readyToStart(page)
  await plug(page, KEYS)
  await clickControllerStatus(page)
  await sheetClose(page).click()
  await expect(controllerSheet(page)).toBeHidden()
  const startingNote = (await sessionState(page)).startingNote?.concertPitch
  if (startingNote === undefined) throw new Error('no starting note is named')

  await openYourData(page)
  await play(page, KEYS, startingNote)
  expect((await sessionState(page)).phase).toBe('idle')
  await closeWithDone(page)

  await play(page, KEYS, startingNote)
  await expect(sessionAction(page)).toHaveText('Stop')
  await expect(footerYourData(page)).toBeDisabled()
  await sessionAction(page).click()
  await expect(footerYourData(page)).toBeEnabled()
})

// @test-link [[rule_failed_read_offers_only_delete_everything]]
// @test-link [[rule_outdated_tab_stops_saving]]
test('a failed read offers Delete everything only; data a newer version wrote then closes it, deleting nothing', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page, '?storageRead=fail')
  await openYourData(page)
  await expect(yourDataSheet(page).locator('.alert-notice')).toHaveText(UNREADABLE_NOTICE)
  expect(await sectionHeadings(page)).toEqual(['Space used', 'Protection'])
  expect(await sheetButtons(page)).toEqual(['Close', 'Delete everything', 'Done'])

  await askConfirmation(page, 'Delete everything', 'Delete everything?')
  const before = await portChanges(page)
  await page.evaluate(() => window.__workspaceHarness.storage.openNewerVersion())
  await expect(yourDataSheet(page)).toHaveAccessibleName('Your data')
  await expect(sheetButton(page, 'Done')).toBeFocused()
  await expect(yourDataSheet(page).locator('.alert-notice')).toHaveText(OUTDATED_DEFAULTS_NOTICE)
  expect(await sheetButtons(page)).toEqual(['Close', 'Done'])
  expect(await portChanges(page)).toBe(before)

  // Known at load: nothing is offered from the start.
  await reloadHarness(page)
  expect(await savingState(page)).toBe('off-outdated')
  await openYourData(page)
  await expect(yourDataSheet(page).locator('.alert-notice')).toHaveText(OUTDATED_DEFAULTS_NOTICE)
  expect(await sheetButtons(page)).toEqual(['Close', 'Done'])
})

// @test-link [[rule_outdated_tab_stops_saving]]
// @test-link [[rule_delete_everything]]
test('two tabs, saving on: after Delete everything in one, the other saves nothing and offers no deletion', async ({
  context,
}) => {
  test.setTimeout(180_000)
  const first = await context.newPage()
  const second = await context.newPage()
  const pageErrors = [watchPageErrors(first), watchPageErrors(second)]
  await gotoStorageHarness(first)
  await gotoStorageHarness(second)
  await openYourData(second)

  await openYourData(first)
  await askConfirmation(first, 'Delete everything', 'Delete everything?')
  await Promise.all([first.waitForEvent('load'), confirmingAction(first).click()])
  await first.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)

  // The second tab, its sheet open, takes the outdated form at once.
  await expect(yourDataSheet(second).locator('.alert-notice')).toHaveText(OUTDATED_NOTICE)
  expect(await sheetButtons(second)).toEqual(['Close', 'Done'])
  expect(await savingState(second)).toBe('off-outdated')
  await sheetButton(second, 'Done').click()
  await expect(second.locator('.app-notice p')).toHaveText(OUTDATED_ROW_NOTICE)

  // A setting changed there is not saved: the first tab's database holds none after its reload.
  await radio(second, 'Presentation theme', 'Dark').click()
  await expect(radio(second, 'Presentation theme', 'Dark')).toHaveAttribute('aria-checked', 'true')
  await first.reload()
  await first.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)
  expect(await storedSettings(first)).toEqual({})
  for (const expectNone of pageErrors) expectNone()
})
