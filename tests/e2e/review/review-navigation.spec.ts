/**
 * v2.0 chunk 20, moving in and out of the last-session Review on the workspace harness's fake
 * audio clock: `Close review` keeps it, scrolls the page to its top and moves focus by the idle
 * state the staff shows; `Review last session` shows it again, scrolled to the top, with focus on
 * its title; the next session's start discards it with no confirmation, and an end of that session
 * during its count-in does not restore it; reloading the page discards everything.
 */
import { expect, test, type Page } from '@playwright/test'

import { controllerStatus, watchPageErrors } from '../controller/controller-helpers'
import { holdGeneration, releaseGeneration } from '../release/harness-helpers'
import {
  cueRow,
  gotoSessionHarness,
  phraseAction,
  sessionAction,
  sessionState,
  startSession,
  toCountInMiddle,
} from '../session/session-helpers'
import {
  expectIdleReady,
  reviewLink,
  reviewPanel,
  reviewTitle,
  sessionEndedAfter,
  staffViewport,
} from './review-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
  // Nothing in these moves asks for a confirmation.
  page.on('dialog', (dialog) => {
    throw new Error(`Unexpected ${dialog.type()} dialog: ${dialog.message()}`)
  })
})

test.afterEach(() => expectNoPageErrors())

/** Intent: scroll the page down by `y` px, instantly, and check it moved. */
async function scrollDown(page: Page, y = 200): Promise<void> {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
}

/** Intent: the page's scroll offset. */
function scrollY(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY)
}

// @test-link [[req_last_session_review]]
test.describe('leaving and reopening the Review', () => {
  // @test-link [[req_last_session_review]]
  test('Close review keeps it behind review-link; Review last session shows it again at the top', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await gotoSessionHarness(page)
    await sessionEndedAfter(page, 2)
    await expectIdleReady(page)

    // Close review from the keyboard, with the page scrolled down.
    await scrollDown(page)
    await page.keyboard.press('Enter')

    await expect(reviewPanel(page)).toHaveCount(0)
    expect(await scrollY(page)).toBe(0)
    await expect(staffViewport(page)).toBeVisible()
    await expect(page.locator('#score-panel-title')).toBeVisible()
    await expect(sessionAction(page)).toHaveText('Start session')
    await expect(sessionAction(page)).toBeEnabled()
    await expect(sessionAction(page)).toBeFocused()
    await expect(reviewLink(page)).toHaveText('Review last session')
    expect((await sessionState(page)).review).toEqual({ showing: false, phraseCount: 2 })

    // Review last session from the keyboard, with the page scrolled down.
    await reviewLink(page).focus()
    await scrollDown(page)
    await page.keyboard.press('Enter')

    await expect(reviewTitle(page)).toBeFocused()
    expect(await scrollY(page)).toBe(0)
    await expect(reviewLink(page)).toHaveCount(0)
    await expect(cueRow(page)).toBeHidden()
    await expect(sessionAction(page)).toHaveText('Close review')
    await expect(reviewPanel(page).locator('li.review-phrase')).toHaveCount(2)
    expect((await sessionState(page)).review).toEqual({ showing: true, phraseCount: 2 })
  })

  // @test-link [[req_last_session_review]]
  test('Close review while the next phrase still loads moves focus to controller-status', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await gotoSessionHarness(page)
    // The phrase the end asks for waits at the generation gate.
    await sessionEndedAfter(page, 1, 7, () => holdGeneration(page))
    expect((await page.evaluate(() => window.__workspaceHarness.snapshot())).operation).toBe(
      'generating',
    )

    await sessionAction(page).click()

    await expect(sessionAction(page)).toHaveText('Start session')
    await expect(sessionAction(page)).toBeDisabled()
    await expect(phraseAction(page)).toBeDisabled()
    await expect(controllerStatus(page)).toBeFocused()
    await expect(reviewLink(page)).toBeVisible()

    await releaseGeneration(page)
    await expectIdleReady(page)
    await expect(sessionAction(page)).toBeEnabled()
  })
})

// @test-link [[rule_new_session_discards_review]]
// @test-link [[rule_ephemeral_session_state]]
test.describe('discarding the Review', () => {
  // @test-link [[rule_new_session_discards_review]]
  test('the next session start discards it with no confirmation; its count-in end does not restore it', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await gotoSessionHarness(page)
    await sessionEndedAfter(page, 1)
    await expectIdleReady(page)
    await sessionAction(page).click()
    await expect(reviewLink(page)).toBeVisible()

    await startSession(page)

    await expect(reviewLink(page)).toHaveCount(0)
    await expect(reviewPanel(page)).toHaveCount(0)
    expect((await sessionState(page)).review).toBeNull()

    await toCountInMiddle(page)
    await sessionAction(page).click()

    await expect(sessionAction(page)).toHaveText('Start session')
    await expect(sessionAction(page)).toBeFocused()
    await expect(reviewPanel(page)).toHaveCount(0)
    await expect(reviewLink(page)).toHaveCount(0)
    const state = await sessionState(page)
    expect(state.lastEnd).toEqual({ cause: 'stop', phase: 'count-in', soundedPhraseCount: 0 })
    expect(state.review).toBeNull()
  })

  for (const kept of ['showing', 'kept'] as const) {
    // @test-link [[rule_ephemeral_session_state]]
    test(`reloading the page discards a Review ${kept === 'showing' ? 'showing' : 'kept behind review-link'}`, async ({
      page,
    }) => {
      test.setTimeout(90_000)
      await gotoSessionHarness(page)
      await sessionEndedAfter(page, 1)
      if (kept === 'kept') {
        await sessionAction(page).click()
        await expect(reviewLink(page)).toBeVisible()
      }

      await page.reload()
      await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)

      await expect(reviewPanel(page)).toHaveCount(0)
      await expect(reviewLink(page)).toHaveCount(0)
      await expect(sessionAction(page)).toHaveText('Start session')
      const state = await sessionState(page)
      expect(state.review).toBeNull()
      expect(state.lastEnd).toBeNull()
      expect(state.lastHistoryPhrases).toBeNull()
      // Nothing of the session was kept anywhere the page could read it back from.
      expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0)
    })
  }
})
