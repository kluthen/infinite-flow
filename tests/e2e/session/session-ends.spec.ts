/**
 * v2.0 item 22, the ends of a session that leave the window as it is, each in the count-in and
 * once phrase 1 has sounded: the header's Stop, the phone's compact Stop, and the page hidden. Each
 * ends like Stop: the transport fades out, both screen locks are released and the controller is
 * back at idle. A count-in end returns to Ready with phrase 1 still on screen and focus on
 * `Start session`, generating nothing; a sounded end opens the last-session Review with focus on
 * `Close review`, while a fresh phrase is generated at Idle under it, so `Close review` leaves
 * `Start session` enabled on a phrase the session never played. A browser toolbar showing or hiding,
 * and a resize that keeps the staff's room, end nothing. Runs against the workspace harness (port
 * 4175) on its fake audio clock.
 */
import { expect, test, type Page } from '@playwright/test'

import {
  expectNoNotationError,
  harnessSnapshot,
  seedsDrawn,
  settleFrames,
} from '../release/harness-helpers'
import {
  DESKTOP,
  PHONE,
  advanceAudioBy,
  cueRow,
  expectEndedLikeStop,
  gotoSessionHarness,
  phraseAction,
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
  toCountInMiddle,
  toRunning,
} from './session-helpers'

/** What identifies the phrase on screen: its request, seed and concert timeline. */
async function shownPhrase(page: Page) {
  const { requestId, seed, timeline } = await harnessSnapshot(page)
  return { requestId, seed, timeline }
}

/**
 * Intent: assert a count-in end landed in Ready: phrase 1 still on screen with the same notes,
 * `Start session` enabled and focused, the cue row empty, no Review, no notation error.
 */
async function expectBackToReady(
  page: Page,
  before: Awaited<ReturnType<typeof shownPhrase>>,
): Promise<void> {
  await expect(sessionAction(page)).toHaveText('Start session')
  await expect(sessionAction(page)).toBeEnabled()
  await expect(sessionAction(page)).toBeFocused()
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/)
  expect(await shownPhrase(page)).toEqual(before)
  await expect(cueRow(page)).toHaveText('')
  await expect(page.locator('.review-panel')).toHaveCount(0)
  await expectNoNotationError(page)
  const state = await sessionState(page)
  expect(state.lastEnd?.soundedPhraseCount).toBe(0)
}

/**
 * Intent: assert a sounded end: the engine's history closed with every phrase that sounded and
 * the Review opened over it, `Close review` focused and the phrase action disabled; under it a
 * fresh phrase, never the played one, is generated (one more seed drawn at least, from
 * `seedsBefore`, read before the end). `Close review` then leaves `Start session` enabled and
 * focused on that phrase.
 */
// @test-link [[rule_session_end_generates_next_phrase_one]]
// @test-link [[req_last_session_review]]
async function expectSoundedEnd(
  page: Page,
  before: Awaited<ReturnType<typeof shownPhrase>>,
  seedsBefore: number,
): Promise<void> {
  const state = await sessionState(page)
  expect(state.lastEnd?.soundedPhraseCount).toBeGreaterThanOrEqual(1)
  expect(state.lastHistoryPhraseCount).toBe(state.lastEnd?.soundedPhraseCount)
  expect(state.review).toEqual({ showing: true, phraseCount: state.lastHistoryPhraseCount })
  expect(state.startBlocker).toBe('review_showing')
  await expect(page.locator('.review-panel h2.review-title')).toHaveText('Last session')
  await expect(sessionAction(page)).toHaveText('Close review')
  await expect(sessionAction(page)).toBeFocused()
  await expect(phraseAction(page)).toBeDisabled()

  await expect
    .poll(async () => (await harnessSnapshot(page)).operation, { timeout: 30_000 })
    .toBe('idle')
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/, { timeout: 30_000 })
  expect(await seedsDrawn(page)).toBeGreaterThan(seedsBefore)
  const fresh = await shownPhrase(page)
  expect(fresh.requestId).not.toBe(before.requestId)
  expect(fresh.seed).not.toBe(before.seed)

  await sessionAction(page).click()
  await expect(page.locator('.review-panel')).toHaveCount(0)
  await expect(sessionAction(page)).toHaveText('Start session')
  await expect(sessionAction(page)).toBeEnabled()
  await expect(sessionAction(page)).toBeFocused()
  await expect(phraseAction(page)).toBeEnabled()
  expect(await shownPhrase(page)).toEqual(fresh)
}

/** Intent: land at `size`, make a phrase ready, start, and return the phrase shown. */
async function startFromReady(
  page: Page,
  size: { readonly width: number; readonly height: number } = DESKTOP,
) {
  await gotoSessionHarness(page, size)
  await readyToStart(page)
  const before = await shownPhrase(page)
  await startSession(page)
  return before
}

/**
 * Intent: assert a count-in Stop started no Idle generation: once the audio clock has moved on a
 * little and the screen has settled, no seed was drawn since `seedsBefore` (read before the Stop;
 * every Idle generation draws one) and the Idle state runs no operation.
 */
// @test-link [[rule_stop_ends_session]]
async function expectNoIdleGeneration(page: Page, seedsBefore: number): Promise<void> {
  await advanceAudioBy(page, 0.5)
  await settleFrames(page)
  expect(await seedsDrawn(page)).toBe(seedsBefore)
  expect((await harnessSnapshot(page)).operation).toBe('idle')
}

// @test-link [[rule_stop_ends_session]]
// @test-link [[rule_count_in_ending_returns_to_idle]]
// @test-link [[service_session_end]]
test.describe('Stop', () => {
  test('in the count-in: back to Ready with phrase 1 and focus on Start session', async ({
    page,
  }) => {
    const before = await startFromReady(page)
    await toCountInMiddle(page)
    const seedsBefore = await seedsDrawn(page)

    await sessionAction(page).click()

    await expectEndedLikeStop(page, 'stop', 'count-in')
    await expectNoIdleGeneration(page, seedsBefore)
    await expectBackToReady(page, before)
  })

  // @test-link [[rule_session_end_generates_next_phrase_one]]
  // @test-link [[req_last_session_review]]
  test('once phrase 1 has sounded: the history closes into the Review, a fresh phrase under it', async ({
    page,
  }) => {
    const before = await startFromReady(page)
    await toRunning(page)
    const seedsBefore = await seedsDrawn(page)

    await sessionAction(page).click()

    await expectEndedLikeStop(page, 'stop', 'running')
    await expectSoundedEnd(page, before, seedsBefore)
  })

  // @test-link [[rule_session_end_generates_next_phrase_one]]
  // @test-link [[req_last_session_review]]
  test('the compact Stop at 740x360, once phrase 1 has sounded, ends it the same way', async ({
    page,
  }) => {
    const before = await startFromReady(page, PHONE)
    await toRunning(page)

    const seedsBefore = await seedsDrawn(page)

    await cueRow(page).locator('.session-cue-actions').getByRole('button', { name: 'Stop' }).click()

    await expectEndedLikeStop(page, 'stop', 'running')
    await expect(cueRow(page).locator('.session-cue-actions')).toHaveCount(0)
    await expectSoundedEnd(page, before, seedsBefore)
  })
})

/** Intent: hide the (fake) page the session listens to, as a tab switch does. */
async function hidePage(page: Page): Promise<void> {
  await page.evaluate(() => window.__workspaceHarness.page.setHidden(true))
}

/** Intent: show the (fake) page again, as coming back to the tab does. */
async function showPage(page: Page): Promise<void> {
  await page.evaluate(() => window.__workspaceHarness.page.setHidden(false))
}

// @test-link [[rule_hidden_tab_ends_session]]
// @test-link [[rule_count_in_ending_returns_to_idle]]
// @test-link [[service_session_end]]
test.describe('the page hidden', () => {
  test('in the count-in: ends like Stop, back to Ready with phrase 1', async ({ page }) => {
    const before = await startFromReady(page)
    await toCountInMiddle(page)

    await hidePage(page)

    await expectEndedLikeStop(page, 'hidden-tab', 'count-in')
    await showPage(page)
    await expectBackToReady(page, before)
  })

  // @test-link [[rule_session_end_generates_next_phrase_one]]
  // @test-link [[req_last_session_review]]
  test('once phrase 1 has sounded: ends like Stop into the Review, a fresh phrase under it', async ({
    page,
  }) => {
    const before = await startFromReady(page)
    await toRunning(page)
    const seedsBefore = await seedsDrawn(page)

    await hidePage(page)

    await expectEndedLikeStop(page, 'hidden-tab', 'running')
    await showPage(page)
    await expectSoundedEnd(page, before, seedsBefore)
  })
})

/**
 * Intent: what a browser toolbar showing or hiding sends a page: a window `resize` and a visual
 * viewport `resize`, with the small viewport height unchanged. Headless Chromium has no dynamic
 * toolbar, so only the events are sent; the moving dynamic height is covered at unit level.
 */
async function toolbarToggle(page: Page): Promise<void> {
  const heightBefore = (await page.evaluate(() => window.__workspaceHarness.windowShape()))
    .smallHeightPx
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'))
    window.visualViewport?.dispatchEvent(new Event('resize'))
  })
  await settleFrames(page)
  const heightAfter = (await page.evaluate(() => window.__workspaceHarness.windowShape()))
    .smallHeightPx
  expect(heightAfter).toBe(heightBefore)
}

// @test-link [[rule_session_ends_when_staff_too_small]]
// @test-link [[rule_session_layout_fixed_at_start]]
test.describe('window changes that leave the staff shown end nothing', () => {
  for (const phase of ['count-in', 'running'] as const) {
    test(`a toolbar showing or hiding, in the ${phase}`, async ({ page }) => {
      await startFromReady(page, PHONE)
      if (phase === 'count-in') await toCountInMiddle(page)
      else await toRunning(page)

      await toolbarToggle(page)
      await toolbarToggle(page)

      const state = await sessionState(page)
      expect(state.phase).toBe(phase)
      expect(state.lastEnd).toBeNull()
      await expect(sessionAction(page)).toHaveText('Stop')
      await sessionAction(page).click()
    })

    test(`a resize that keeps room (1280x800 to 1200x800), in the ${phase}`, async ({ page }) => {
      await startFromReady(page)
      if (phase === 'count-in') await toCountInMiddle(page)
      else await toRunning(page)

      await page.setViewportSize({ width: 1200, height: 800 })
      await settleFrames(page)
      await settleFrames(page)

      const state = await sessionState(page)
      expect(state.phase).toBe(phase)
      expect(state.lastEnd).toBeNull()
      expect(state.heldLayout).toBe('one-system')
      await expect(sessionAction(page)).toHaveText('Stop')
      await expectNoNotationError(page)
      await sessionAction(page).click()
      expect((await sessionState(page)).lastEnd?.cause).toBe('stop')
    })
  }
})
