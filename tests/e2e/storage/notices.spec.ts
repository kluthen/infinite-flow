/**
 * v3.0 chunk 8, the notice row, on the workspace harness (port 4175) with its fake audio clock,
 * over the browser's real IndexedDB; each test starts from an empty browser context. The harness's
 * storage seams make the outdated tab (`openNewerVersion`, or the database deleted from a second
 * page), the failed or slow start-up read (`?storageRead=`) and the refused saves (`refuseSaves`),
 * and its write spy (`portChanges`) counts every change that reaches the storage port:
 *
 * - an outdated tab tells which visit it is (saved data read, or the defaults), saves nothing for
 *   the rest of the visit, a session's end included, and keeps its notice still during a session;
 * - an unusable-data notice switches in place to the outdated wording for a visit started from the
 *   defaults;
 * - the save-problem notice: one at a time, its wording switched in place to the latest cause,
 *   gone after `Dismiss` for the rest of the run of refusals, back after a success then a refusal;
 * - an outdated condition arising during a session shows only once it has ended, and the session's
 *   timing is unchanged;
 * - no notice moves focus or is a live region, and the row fits a landscape phone.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { WORKSPACE_HARNESS_URL } from '../release/harness-helpers'
import {
  PHONE,
  phraseAction,
  readyToStart,
  sessionAction,
  sessionTimeline,
  startSession,
  toRunning,
} from '../session/session-helpers'
import { clockTo, phraseStartsAt } from '../session/session-midi-helpers'
import { radio } from '../workspace/helpers'
import { gotoStorageHarness, harnessReady, reloadHarness, seedSettings } from './storage-helpers'

const OUTDATED_SAVED_DATA =
  'A newer version of Infinite Flow has saved data on this device. Reload this page to use it; until then, nothing here is saved.'
const OUTDATED_DEFAULTS =
  "Your saved data couldn't be read, and a newer version of Infinite Flow has saved data on this device. This visit started from the defaults and saves nothing. Reload this page to use the newer version."
const UNUSABLE_DATA =
  "Your saved data couldn't be read, so this visit started from the defaults and saves nothing. Reloading may fix it."
const STORAGE_FULL =
  "This device has no room left for the app's data, so something couldn't be saved. Deleting sessions you no longer need frees space."
const SAVE_FAILED =
  "Something couldn't be saved on this device. The app keeps working, but this change may be lost when the page closes."

/** How long a save, or a notice it raises, takes at most to land on this harness. */
const SETTLE_MS = 300

/** Intent: the notice row's notices. */
function notices(page: Page): Locator {
  return page.locator('.layout-workspace > .app-notice-row > .app-notice')
}

/** Intent: one of the notice's buttons, by its text. */
function noticeButton(page: Page, name: string): Locator {
  return notices(page).getByRole('button', { name, exact: true })
}

/** Intent: expect the one notice showing, with `text` and exactly the buttons `buttons`. */
async function expectNotice(page: Page, text: string, buttons: readonly string[]): Promise<void> {
  await expect(notices(page)).toHaveCount(1)
  await expect(notices(page).locator('p')).toHaveText(text)
  await expect(notices(page).getByRole('button')).toHaveText([...buttons])
}

/** Intent: expect no notice row at all, after giving a late save time to raise one. */
async function expectNoNotice(page: Page): Promise<void> {
  await page.waitForTimeout(SETTLE_MS)
  await expect(page.locator('.app-notice-row')).toHaveCount(0)
}

/** Intent: the changes that reached the storage port since the load (the write spy). */
function portChanges(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.storage.portChanges())
}

/** Intent: the save policy's saving state. */
function savingState(page: Page): Promise<string | null> {
  return page.evaluate(() => window.__workspaceHarness.storage.savingState())
}

/** Intent: open the database as a newer version of the app would, from this page. */
function openNewerVersion(page: Page): Promise<void> {
  return page.evaluate(() => window.__workspaceHarness.storage.openNewerVersion())
}

/** Intent: refuse the app's saves as `kind` from now on; null to let them through. */
function refuseSaves(page: Page, kind: 'quota' | 'other' | null): Promise<void> {
  return page.evaluate((refusal) => window.__workspaceHarness.storage.refuseSaves(refusal), kind)
}

/** Intent: open the harness at `search` (an injected read, say), the load ended and mounted. */
async function gotoWith(page: Page, search: string): Promise<void> {
  await page.goto(`${WORKSPACE_HARNESS_URL}${search}`)
  await harnessReady(page)
}

/** Intent: change the theme to `option`, a player's change that saves. */
async function pickTheme(page: Page, option: 'System' | 'Light' | 'Dark'): Promise<void> {
  await radio(page, 'Presentation theme', option).click()
  await expect(radio(page, 'Presentation theme', option)).toHaveAttribute('aria-checked', 'true')
}

/**
 * Intent: change the theme to whichever of Light and Dark it is not, and wait until the save's
 * outcome has landed (refused or not).
 */
async function changeTheme(page: Page): Promise<void> {
  const dark = await radio(page, 'Presentation theme', 'Dark').getAttribute('aria-checked')
  const before = await portChanges(page)
  await pickTheme(page, dark === 'true' ? 'Light' : 'Dark')
  await expect.poll(() => portChanges(page)).toBe(before + 1)
  await page.waitForTimeout(SETTLE_MS)
}

/** Intent: mark the notice's element, to tell later whether it changed in place. */
async function markNotice(page: Page): Promise<void> {
  await notices(page).evaluate((element) => element.setAttribute('data-test-mark', 'same'))
}

/** Intent: expect the marked notice element still to be the one showing. */
async function expectSameNotice(page: Page): Promise<void> {
  await expect(notices(page)).toHaveAttribute('data-test-mark', 'same')
}

// @test-link [[rule_outdated_tab_stops_saving]]
test('data written by a newer version: the outdated notice in its saved-data wording, held still during a session, and no write for the rest of the visit', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoStorageHarness(page)
  await openNewerVersion(page)
  await reloadHarness(page)

  await expectNotice(page, OUTDATED_SAVED_DATA, ['Reload'])
  expect(await page.evaluate(() => window.__workspaceHarness.storage.loadOutcome())).toBe(
    'saved-data-read',
  )
  expect(await savingState(page)).toBe('off-outdated')

  await pickTheme(page, 'Dark')
  await readyToStart(page)
  await startSession(page)
  await expectNotice(page, OUTDATED_SAVED_DATA, ['Reload'])
  await expect(noticeButton(page, 'Reload')).toBeDisabled()
  await pickTheme(page, 'Light')
  await sessionAction(page).click()
  await expect(sessionAction(page)).toHaveText('Start session')
  await expect(noticeButton(page, 'Reload')).toBeEnabled()

  await page.waitForTimeout(SETTLE_MS)
  expect(await portChanges(page)).toBe(0)
})

for (const read of ['fail', 'slow'] as const) {
  // @test-link [[rule_outdated_tab_stops_saving]]
  // @test-link [[rule_failed_read_told_to_player]]
  test(`an outdated tab whose start-up read does not succeed (${read}): the outdated notice in its defaults wording`, async ({
    page,
  }) => {
    await gotoStorageHarness(page)
    await openNewerVersion(page)
    await gotoWith(page, `?storageRead=${read}`)

    await expectNotice(page, OUTDATED_DEFAULTS, ['Reload'])
    expect(await page.evaluate(() => window.__workspaceHarness.storage.loadOutcome())).toBe(
      'started-from-defaults',
    )
  })
}

// @test-link [[rule_failed_read_told_to_player]]
// @test-link [[rule_outdated_tab_stops_saving]]
test('an unusable-data notice switches in place to the defaults wording when the tab becomes outdated', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await gotoWith(page, '?storageRead=fail')
  await expectNotice(page, UNUSABLE_DATA, ['Reload'])
  await markNotice(page)

  await openNewerVersion(page)

  await expectNotice(page, OUTDATED_DEFAULTS, ['Reload'])
  await expectSameNotice(page)
  expect(await savingState(page)).toBe('off-outdated')
})

// @test-link [[rule_outdated_tab_stops_saving]]
test('the database deleted from a second page: the outdated notice in the newer version wording, saving off-outdated, and no write', async ({
  page,
  context,
}) => {
  await gotoStorageHarness(page)
  await expectNoNotice(page)

  // Another tab's Delete everything, as the browser sees it: the database deleted.
  const other = await context.newPage()
  await other.goto(`${WORKSPACE_HARNESS_URL}?storageLoad=held`)
  await other.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase('infinite-flow')
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error ?? new Error('delete failed'))
      }),
  )

  await expectNotice(page, OUTDATED_SAVED_DATA, ['Reload'])
  expect(await savingState(page)).toBe('off-outdated')
  await pickTheme(page, 'Dark')
  await page.waitForTimeout(SETTLE_MS)
  expect(await portChanges(page)).toBe(0)
})

for (const read of ['fail', 'slow'] as const) {
  // @test-link [[rule_failed_read_told_to_player]]
  test(`an injected ${read} read: the unusable-data notice, the defaults on screen, and no write`, async ({
    page,
  }) => {
    await gotoStorageHarness(page)
    await seedSettings(page, { theme: 'Dark' })
    await gotoWith(page, `?storageRead=${read}`)

    await expectNotice(page, UNUSABLE_DATA, ['Reload'])
    await expect(radio(page, 'Presentation theme', 'System')).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(await savingState(page)).toBe('off-unreadable')

    await pickTheme(page, 'Light')
    await page.waitForTimeout(SETTLE_MS)
    expect(await portChanges(page)).toBe(0)
  })
}

// @test-link [[rule_failed_save_never_disturbs_session]]
test('a quota refusal: the storage-full notice, one notice for another refusal, and back after Dismiss only once a save has succeeded', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await refuseSaves(page, 'quota')

  await changeTheme(page)
  await expectNotice(page, STORAGE_FULL, ['Your data', 'Dismiss'])
  await expect(noticeButton(page, 'Your data')).toBeDisabled()
  // No focus move and no live region: focus stays on the theme the player chose.
  await expect(radio(page, 'Presentation theme', 'Dark')).toBeFocused()
  expect(
    await page
      .locator('.app-notice-row')
      .evaluate(
        (row) =>
          row.closest('[aria-live], [role="alert"], [role="status"], [role="log"]') !== null ||
          row.querySelector('[aria-live], [role="alert"], [role="status"], [role="log"]') !== null,
      ),
  ).toBe(false)

  await changeTheme(page)
  await expectNotice(page, STORAGE_FULL, ['Your data', 'Dismiss'])

  await noticeButton(page, 'Dismiss').click()
  await expect(page.locator('.app-notice-row')).toHaveCount(0)
  await expect(phraseAction(page)).toBeFocused()
  await changeTheme(page)
  await expectNoNotice(page)

  await refuseSaves(page, null)
  await changeTheme(page)
  await refuseSaves(page, 'quota')
  await changeTheme(page)
  await expectNotice(page, STORAGE_FULL, ['Your data', 'Dismiss'])
})

for (const [first, second] of [
  ['quota', 'other'],
  ['other', 'quota'],
] as const) {
  // @test-link [[rule_failed_save_never_disturbs_session]]
  test(`a refusal as ${first} then one as ${second}: one notice, switched in place; after Dismiss neither brings it back until a save has succeeded`, async ({
    page,
  }) => {
    const wording = { quota: STORAGE_FULL, other: SAVE_FAILED }
    const buttons = { quota: ['Your data', 'Dismiss'], other: ['Dismiss'] }
    await gotoStorageHarness(page)

    await refuseSaves(page, first)
    await changeTheme(page)
    await expectNotice(page, wording[first], buttons[first])
    await markNotice(page)
    await refuseSaves(page, second)
    await changeTheme(page)
    await expectNotice(page, wording[second], buttons[second])
    await expectSameNotice(page)

    await noticeButton(page, 'Dismiss').click()
    await refuseSaves(page, first)
    await changeTheme(page)
    await refuseSaves(page, second)
    await changeTheme(page)
    await expectNoNotice(page)

    await refuseSaves(page, null)
    await changeTheme(page)
    await refuseSaves(page, second)
    await changeTheme(page)
    await expectNotice(page, wording[second], buttons[second])
  })
}

// @test-link [[rule_outdated_tab_stops_saving]]
// @test-link [[rule_failed_save_never_disturbs_session]]
test('an outdated condition raised during a session shows only once it has ended, and the session keeps its timing', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoStorageHarness(page)
  await readyToStart(page)
  await startSession(page)
  await toRunning(page)
  const timeline = await sessionTimeline(page)
  const phraseTwoAt = await phraseStartsAt(page, 2)

  await openNewerVersion(page)
  await expect.poll(() => savingState(page)).toBe('off-outdated')
  await expectNoNotice(page)

  await clockTo(page, phraseTwoAt + 0.5)
  await expectNoNotice(page)
  expect(await sessionTimeline(page)).toEqual(timeline)
  expect(await phraseStartsAt(page, 2)).toBe(phraseTwoAt)

  await sessionAction(page).click()
  await expect(sessionAction(page)).toHaveText('Close review')
  await expectNotice(page, OUTDATED_SAVED_DATA, ['Reload'])
})

// @test-link [[rule_failed_read_told_to_player]]
test('on a landscape phone the notice spans the workspace and fits its width', async ({ page }) => {
  await page.setViewportSize(PHONE)
  await gotoWith(page, '?storageRead=fail')

  await expectNotice(page, UNUSABLE_DATA, ['Reload'])
  const fit = await page.locator('.app-notice-row').evaluate((row) => {
    const workspace = row.parentElement
    if (workspace === null) throw new Error('the notice row has no parent')
    return {
      rowWidth: row.getBoundingClientRect().width,
      workspaceWidth: workspace.clientWidth,
      overflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      firstInWorkspace: workspace.firstElementChild === row,
    }
  })
  expect(fit.overflows).toBe(false)
  expect(fit.firstInWorkspace).toBe(true)
  expect(fit.rowWidth).toBeGreaterThan(fit.workspaceWidth * 0.9)
  await expect(noticeButton(page, 'Reload')).toBeInViewport()
})
