/**
 * v2.0 item 22, the session start conditions on screen: `Start session` is enabled in Ready, and
 * disabled -- or, under the rotate-device notice, not reachable at all -- whenever one condition
 * does not hold, one scenario per condition. Runs against the workspace harness (port 4175).
 */
import { expect, test, type Page } from '@playwright/test'

import { primaryButton, radio } from '../workspace/helpers'
import {
  awaitIdle,
  failNextGeneration,
  failNextNotation,
  harnessSnapshot,
  holdGeneration,
  queueFitVerdicts,
  queueSeeds,
  releaseGeneration,
  roomNotice,
} from '../release/harness-helpers'
import {
  DESKTOP,
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
} from './session-helpers'

/**
 * Intent: assert `Start session` is shown and disabled, and the controller refuses a start. The
 * controller names the first condition that fails, in its own order: a notation error or the room
 * notice also leaves no engraved phrase, which it names first.
 */
async function expectStartBlocked(page: Page, ...blockers: readonly string[]): Promise<void> {
  await expect(sessionAction(page)).toHaveText('Start session')
  await expect(sessionAction(page)).toBeDisabled()
  const state = await sessionState(page)
  expect(state.canStart).toBe(false)
  expect(blockers).toContain(state.startBlocker)
}

// @test-link [[rule_session_start_conditions]]
test.describe('Start session is enabled only when every start condition holds', () => {
  test('Ready: enabled, and the primary action', async ({ page }) => {
    await gotoSessionHarness(page)
    await readyToStart(page)

    await expect(sessionAction(page)).toHaveClass(/btn-primary/)
    await expect(primaryButton(page)).not.toHaveClass(/btn-primary/)
    expect((await sessionState(page)).canStart).toBe(true)
  })

  test('no phrase yet: disabled', async ({ page }) => {
    await gotoSessionHarness(page)

    await expectStartBlocked(page, 'no_phrase')
    await expect(sessionAction(page)).not.toHaveClass(/btn-primary/)
  })

  test('a generation running: disabled until the new phrase lands', async ({ page }) => {
    await gotoSessionHarness(page)
    await readyToStart(page)
    await holdGeneration(page)
    await queueSeeds(page, [8])

    await primaryButton(page).click()
    await expect.poll(async () => (await harnessSnapshot(page)).operation).toBe('generating')
    await expectStartBlocked(page, 'generation_running')

    await releaseGeneration(page)
    await awaitIdle(page)
    await expect(sessionAction(page)).toBeEnabled()
  })

  test('fit retries running: disabled', async ({ page }) => {
    await gotoSessionHarness(page)
    await readyToStart(page)
    await queueSeeds(page, [8, 9])
    await queueFitVerdicts(page, ['notes_too_wide'])
    await holdGeneration(page)
    await primaryButton(page).click()
    await expect.poll(async () => (await harnessSnapshot(page)).operation).toBe('generating')

    // Let the first attempt through and hold the retry it leads to, in one synchronous step.
    await page.evaluate(() => {
      window.__workspaceHarness.releaseGeneration()
      window.__workspaceHarness.holdGeneration()
    })
    await expect
      .poll(async () => (await harnessSnapshot(page)).retriesRunning, { timeout: 30_000 })
      .toBe(true)
    await expectStartBlocked(page, 'generation_running')

    await releaseGeneration(page)
    await awaitIdle(page)
    await expect(sessionAction(page)).toBeEnabled()
  })

  test('a notation error: disabled, Retry notation primary', async ({ page }) => {
    await gotoSessionHarness(page)
    await readyToStart(page)

    await failNextNotation(page)
    await page.setViewportSize({ width: 1100, height: 720 })
    await expect(page.locator('.staff-frame')).toHaveClass(/staff-error/)

    await expectStartBlocked(page, 'no_phrase', 'notation_error')
    await expect(sessionAction(page)).not.toHaveClass(/btn-primary/)
    await expect(primaryButton(page)).toHaveText('Retry notation')
    await expect(primaryButton(page)).toHaveClass(/btn-primary/)
  })

  test('a generation-failure banner over the retained phrase: disabled', async ({ page }) => {
    await gotoSessionHarness(page)
    await readyToStart(page)

    await failNextGeneration(page, 'search_limit_exceeded')
    await primaryButton(page).click()
    await expect(page.locator('.score-panel > .inline-alert.alert-error')).toBeVisible()
    await awaitIdle(page)

    await expectStartBlocked(page, 'generation_failure')
    await expect(primaryButton(page)).toHaveText('Retry generation')
    await expect(primaryButton(page)).toHaveClass(/btn-primary/)
  })

  test('an unsupported rhythm combination: disabled', async ({ page }) => {
    await gotoSessionHarness(page)
    await readyToStart(page)

    await radio(page, 'Note density', 'Sixteenth').click()
    await radio(page, 'Silence density', 'Breath-heavy').click()
    await radio(page, 'Syncopation', 'Active displacement').click()

    await expectStartBlocked(page, 'rhythm_unsupported')
    await expect(primaryButton(page)).toBeDisabled()
  })

  test('the rotate-device notice: Start session is not reachable', async ({ page }) => {
    await gotoSessionHarness(page)
    await readyToStart(page)

    await page.setViewportSize({ width: 1000, height: 1300 })
    await expect(page.locator('.orientation-notice')).toBeVisible()

    await expect(sessionAction(page)).toBeHidden()
    // The workspace hidden under the notice leaves the staff no room at Idle, so the controller
    // may name the missing phrase before the notice; either way no start is possible.
    await expect.poll(async () => (await sessionState(page)).canStart).toBe(false)
    expect(['orientation_notice', 'no_phrase']).toContain((await sessionState(page)).startBlocker)

    await page.setViewportSize(DESKTOP)
    await expect(sessionAction(page)).toBeEnabled({ timeout: 30_000 })
  })

  test('the staff needs more room: disabled, keeping its primary emphasis', async ({ page }) => {
    await gotoSessionHarness(page)
    await readyToStart(page)

    await failNextNotation(page, 'notation_no_room')
    await page.setViewportSize({ width: 1200, height: 800 })
    await expect(roomNotice(page)).toBeVisible()
    await awaitIdle(page)

    await expectStartBlocked(page, 'no_phrase', 'room_notice')
    await expect(sessionAction(page)).toHaveClass(/btn-primary/)
  })
})
