/**
 * v2.0 chunk 20, no session starts while the last-session Review shows, on the workspace
 * harness's fake audio clock and fake MIDI access: `Start session` is not offered (its slot reads
 * `Close review`), no note starts a session, the starting note included, and no starting note is
 * named. Once the Review is closed the idle rules apply again: the starting note is named, and
 * playing it starts the next session, which discards the Review and leaves focus on the session
 * action. The controller stays usable from the Review: the same controller unplugged and plugged
 * back reattaches by itself, and the connection sheet opens over the Review and closes back to it.
 */
import { expect, test, type Page } from '@playwright/test'

import {
  FORM,
  clickControllerStatus,
  controllerStatus,
  midiState,
  sheet,
  sheetClose,
  statusForm,
  watchPageErrors,
} from '../controller/controller-helpers'
import { gotoSessionHarness, sessionAction, sessionState } from '../session/session-helpers'
import {
  KEYS,
  connectDevice,
  firstAttack,
  plugIn,
  startLine,
  tap,
  unplugNow,
} from '../session/session-midi-helpers'
import {
  expectIdleReady,
  expectReviewShowing,
  reviewLink,
  reviewPanel,
  sessionEndedAfter,
} from './review-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: land with the fake keyboard connected, and end a session once phrase 1 has sounded. */
async function reviewWithController(page: Page): Promise<void> {
  await gotoSessionHarness(page)
  await connectDevice(page, KEYS)
  await sessionEndedAfter(page, 1)
  await expectIdleReady(page)
}

/** Intent: assert no session runs or was asked for: idle, no count-in, the transport stopped. */
async function expectNoSession(page: Page): Promise<void> {
  const state = await sessionState(page)
  expect(state.phase).toBe('idle')
  expect(state.countIn).toBeNull()
  expect(await page.evaluate(() => window.__workspaceHarness.audio.isRunning())).toBe(false)
}

// @test-link [[rule_session_start_conditions]]
// @test-link [[rule_starting_note_named]]
// @test-link [[rule_new_session_discards_review]]
test.describe('while the Review shows', () => {
  // @test-link [[rule_session_start_conditions]]
  // @test-link [[rule_starting_note_named]]
  // @test-link [[rule_new_session_discards_review]]
  test('neither a Start click nor any note starts a session, and no starting note is named', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await reviewWithController(page)
    const would = await firstAttack(page)

    // Start session is not offered: its slot reads Close review.
    await expect(page.getByRole('button', { name: 'Start session' })).toHaveCount(0)
    const showing = await sessionState(page)
    expect(showing.canStart).toBe(false)
    expect(showing.startBlocker).toBe('review_showing')
    expect(showing.startingNote).toBeNull()
    await expect(startLine(page)).toBeHidden()

    // The note that would start a session at Idle, and others, start nothing.
    for (const pitch of [would.pitch, would.pitch + 2, 60]) await tap(page, KEYS, pitch)
    await expectNoSession(page)
    await expectReviewShowing(page, 1)
    expect((await sessionState(page)).startingNote).toBeNull()

    // The click in the session action's slot closes the Review and starts nothing. Closed, the
    // idle rules apply: the starting note is named, and playing it starts a session.
    await sessionAction(page).click()
    await expectNoSession(page)
    await expect(startLine(page)).toBeVisible()
    const named = (await sessionState(page)).startingNote
    expect(named?.concertPitch).toBe(would.pitch)
    await expect(startLine(page).locator('strong')).toHaveText(named?.label ?? '')
    await reviewLink(page).focus()

    await tap(page, KEYS, would.pitch)

    expect((await sessionState(page)).phase).toBe('count-in')
    await expect(reviewLink(page)).toHaveCount(0)
    await expect(sessionAction(page)).toHaveText('Stop')
    await expect(sessionAction(page)).toBeFocused()
    expect((await sessionState(page)).review).toBeNull()
    await sessionAction(page).click()
  })
})

// @test-link [[rule_same_controller_reattaches]]
test.describe('the controller from the Review', () => {
  // @test-link [[rule_same_controller_reattaches]]
  test('the same controller unplugged and plugged back reattaches by itself; nothing starts', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await reviewWithController(page)

    await unplugNow(page, KEYS)
    await expect.poll(() => statusForm(page)).toEqual(FORM.noController)
    expect(await midiState(page)).toEqual({ kind: 'away', device: KEYS })

    await plugIn(page, KEYS)

    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
    expect(await midiState(page)).toEqual({ kind: 'connected', device: KEYS })
    await expect(sheet(page)).toHaveCount(0)
    await expectNoSession(page)
    await expect(reviewPanel(page)).toBeVisible()
    expect((await sessionState(page)).review).toEqual({ showing: true, phraseCount: 1 })
  })

  // @test-link [[rule_same_controller_reattaches]]
  test('the connection sheet opens over the Review and closes back to it', async ({ page }) => {
    test.setTimeout(90_000)
    await reviewWithController(page)

    await clickControllerStatus(page)
    await tap(page, KEYS, (await firstAttack(page)).pitch)
    await expectNoSession(page)
    await sheetClose(page).click()

    await expect(sheet(page)).toHaveCount(0)
    await expect(reviewPanel(page)).toBeVisible()
    await expect(sessionAction(page)).toHaveText('Close review')
    await expect(sessionAction(page)).toBeFocused()
    await expect(controllerStatus(page)).toBeEnabled()
    await expectNoSession(page)
  })
})
