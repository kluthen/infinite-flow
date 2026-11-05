/**
 * v3.2 chunk 24, what lets the kept doodle go and the focus moves of `jam-bar`
 * (flows/jam/handoff.md, The Kept Doodle and Routing Rules), on the workspace harness (port 4175:
 * fake audio clock, fake MIDI, real generations, the browser's real IndexedDB). Each test keeps a
 * doodle first: a fresh Jam Stopped once phrase 1 sounds, its Review closed. `New doodle` lets it
 * go, `staff-jam` back and focus on `Start Jam`, or on `controller-status` when `Start Jam` is
 * disabled (a lost controller keeps the doodle); the next Jam captures a new doodle. Leaving Jam
 * mode lets it go, session mode exactly as left. Deleting the session it comes from in the
 * session list lets it go. A reload keeps nothing, and the kept session's Review offers `Jam again
 * on this doodle`, which keeps it again and writes phrase 1 from it. `Keep {key} {mode}` in
 * `jam-bar` moves focus to the bar's sentence.
 */
import { expect, test, type Page } from '@playwright/test'

import {
  controllerStatus,
  gotoControllerHarness,
  watchPageErrors,
} from '../controller/controller-helpers'
import { reviewPanel, reviewTitle } from '../review/review-helpers'
import { sheet, sheetAction, untilKept } from '../review/review-tools-helpers'
import { listTitle, rows, sessionsLink, sessionsPanel } from '../review/session-list-helpers'
import {
  PAST_BARLINE,
  cueShown,
  doodleNote,
  doodleReadings,
  gotoJamIdle,
  jamGrid,
  startJamByClick,
  untilPhraseOneAnswered,
} from '../session/jam-helpers'
import { sessionAction, sessionState } from '../session/session-helpers'
import { KEYS, clockTo, connectDevice, unplugNow } from '../session/session-midi-helpers'
import { reloadHarness } from '../storage/storage-helpers'
import { expectChecked, expectSessionModeShows, jamFrame, modeSegment } from './jam-mode-helpers'
import {
  closeReview,
  freshJamReviewed,
  jamBar,
  jamBarSentence,
  newDoodleButton,
  reviewDoodle,
  untilKeptPhraseOneReady,
} from './kept-doodle-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** A doodle plainly in G major, in concert pitch: G A B C D E F-sharp G. */
const G_MAJOR = [67, 69, 71, 72, 74, 76, 78, 79] as const

/** Intent: from Jam mode's Idle, a fresh Jam reviewed then its Review closed: a doodle kept. */
async function doodleKept(page: Page): Promise<void> {
  await freshJamReviewed(page)
  await closeReview(page)
  await expect(jamBar(page)).toBeVisible()
}

/**
 * Intent: assert Jam mode's Idle with no doodle kept: no `jam-bar`, Jam's empty system in sight,
 * `doodle-readings` empty.
 */
async function expectNothingKept(page: Page): Promise<void> {
  await expectChecked(page, 'Jam')
  await expect(jamBar(page)).toHaveCount(0)
  await expect(jamFrame(page)).toBeVisible()
  await expect(doodleReadings(page)).toHaveCount(0)
}

// @test-link [[rule_held_doodle_dropped_on_change]]
test('New doodle lets the doodle go: staff-jam back, focus on Start Jam, the next Jam captures a new doodle', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoJamIdle(page)
  await doodleKept(page)

  await newDoodleButton(page).click()

  await expectNothingKept(page)
  await expect(sessionAction(page)).toHaveText('Start Jam')
  await expect(sessionAction(page)).toBeFocused()
  await startJamByClick(page)
  const grid = await jamGrid(page)
  await clockTo(page, grid.barline(0) + PAST_BARLINE)
  expect(await cueShown(page)).toBe('jam-capture')
})

// @test-link [[rule_held_doodle_dropped_on_change]]
test('a lost controller keeps the doodle; New doodle then moves focus to controller-status', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoJamIdle(page)
  await doodleKept(page)

  await unplugNow(page, KEYS)
  await expect(sessionAction(page)).toBeDisabled()
  await expect(jamBar(page)).toBeVisible()
  await expect(newDoodleButton(page)).toBeEnabled()

  await newDoodleButton(page).click()

  await expectNothingKept(page)
  await expect(controllerStatus(page)).toBeFocused()
})

// @test-link [[rule_held_doodle_dropped_on_change]]
test('leaving Jam mode lets the doodle go, session mode exactly as left', async ({ page }) => {
  test.setTimeout(180_000)
  await gotoControllerHarness(page, { query: { pregeneration: 'off' } })
  await connectDevice(page, KEYS)
  const left = await page.evaluate(() => window.__workspaceHarness.snapshot())
  await modeSegment(page, 'Jam').click()
  await expect(jamFrame(page)).toBeVisible()
  await expect(sessionAction(page)).toBeEnabled()
  await doodleKept(page)

  await modeSegment(page, 'Session').click()

  await expectSessionModeShows(page)
  expect(await page.evaluate(() => window.__workspaceHarness.snapshot())).toEqual(left)
  await expect(jamBar(page)).toHaveCount(0)
  await modeSegment(page, 'Jam').click()
  await expectNothingKept(page)
})

// @test-link [[rule_held_doodle_dropped_on_change]]
test('deleting the session it comes from in the session list lets the doodle go', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoJamIdle(page)
  await doodleKept(page)
  await untilKept(page, 1)

  await sessionsLink(page).click()
  await expect(listTitle(page)).toBeFocused()
  await expect(rows(page)).toHaveCount(1)
  await rows(page)
    .first()
    .getByRole('button', { name: /^Delete session / })
    .click()
  await expect(sheet(page)).toHaveAccessibleName('Delete this session?')
  await sheetAction(page, 'Delete session').click()
  await expect(sheet(page)).toHaveCount(0)
  await expect(sessionsPanel(page).locator('.sessions-empty')).toBeVisible()
  await sessionAction(page).click()

  await expect(sessionsPanel(page)).toHaveCount(0)
  await expectNothingKept(page)
})

// @test-link [[rule_held_doodle_dropped_on_change]]
// @test-link [[rule_jam_again_on_this_doodle]]
test('a reload keeps nothing; the kept session offers Jam again on this doodle, which keeps it again', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoJamIdle(page)
  await doodleKept(page)
  await untilKept(page, 1)

  await reloadHarness(page)
  await expectChecked(page, 'Session')
  await connectDevice(page, KEYS)
  await modeSegment(page, 'Jam').click()
  await expectNothingKept(page)

  await sessionsLink(page).click()
  await expect(listTitle(page)).toBeFocused()
  await rows(page).first().locator('button.session-row-open').click()
  await expect(reviewTitle(page)).toBeFocused()
  const jamAgain = reviewDoodle(page).getByRole('button', { name: 'Jam again on this doodle' })
  await expect(jamAgain).toBeVisible()
  await jamAgain.click()

  await expect(reviewPanel(page)).toHaveCount(0)
  await expectChecked(page, 'Jam')
  await expect(jamBar(page)).toBeVisible()
  await untilKeptPhraseOneReady(page)
  await expect(doodleReadings(page)).toBeVisible()
  await expect(jamFrame(page)).toBeHidden()
  expect((await sessionState(page)).phase).toBe('idle')
})

// @test-link [[rule_suggestion_keep_mine]]
test("Keep {key} {mode} in jam-bar moves focus to the bar's sentence", async ({ page }) => {
  test.setTimeout(180_000)
  await gotoJamIdle(page)
  await page
    .getByRole('radiogroup', { name: 'Collection', exact: true })
    .getByRole('radio', { name: 'Major', exact: true })
    .click()
  await startJamByClick(page)
  const grid = await jamGrid(page)
  for (const [index, pitch] of G_MAJOR.entries()) {
    await doodleNote(page, pitch, grid.barline(0) + index * grid.beat + 0.01)
  }
  await clockTo(page, grid.barline(2) + PAST_BARLINE)
  await untilPhraseOneAnswered(page)
  await clockTo(page, grid.barline(4) + 1)
  expect((await sessionState(page)).phase).toBe('running')
  await sessionAction(page).click()
  await expect(reviewTitle(page)).toBeVisible()
  await closeReview(page)
  const row = jamBar(page).locator(':scope > .suggestion-row')
  await expect(row.locator(':scope > p')).toHaveText('Your doodle sounds like A Major.')

  await row.getByRole('button', { name: 'Keep C Major', exact: true }).click()

  await expect(row).toHaveCount(0)
  await expect(jamBarSentence(page)).toBeFocused()
  await expect(jamBar(page)).toBeVisible()
})
