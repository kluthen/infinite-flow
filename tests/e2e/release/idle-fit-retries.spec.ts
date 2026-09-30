/**
 * v2.0 definition of done, item 26, at Idle: a phrase whose notes are too wide for the room is
 * never drawn; the app generates a new one with up to three fresh-seed retries, inside one Loading,
 * and shows the first that fits. When all four attempts are too wide, the too-many-notes notice
 * shows instead of the staff, and a wider window, a changed setting or `Regenerate phrase` starts
 * a new round under it; a narrower window never does, and a wider window during a round starts
 * nothing more. Runs against the workspace harness (port 4175): queued seeds, forced fit verdicts
 * (what the real planner answers for a dense phrase in a small window) and real window resizes.
 */
import { expect, test, type Page } from '@playwright/test'

import { primaryButton, radio, statusRegion } from '../workspace/helpers'
import {
  TOO_MANY_NOTES_SENTENCE,
  announcedCount,
  awaitIdle,
  engravings,
  expectNoNotationError,
  expectNoScoreAndNoNotationError,
  failNextGeneration,
  fitChecks,
  gotoWorkspaceHarness,
  harnessSnapshot,
  holdGeneration,
  observeLiveRegion,
  queueFitVerdicts,
  queueSeeds,
  releaseGeneration,
  resizeAndSettle,
  roomChecks,
  roomNotice,
  roomNoticeSentence,
  seedsDrawn,
  settleFrames,
  showTooManyNotesNotice,
} from './harness-helpers'

/** At and above bp-tablet-landscape (64rem = 1024 px). */
const DESKTOP = { width: 1280, height: 800 }
/** A landscape phone, below bp-tablet-landscape, with room for the split staff. */
const PHONE = { width: 740, height: 360 }
/** A narrower landscape phone that still has room for the staff. */
const NARROWER_PHONE = { width: 700, height: 360 }
/** A wider landscape phone, still below bp-tablet-landscape. */
const WIDER_PHONE = { width: 800, height: 360 }

/** Intent: wait for the drawn phrase to be the one with this seed, then for the session to idle. */
async function awaitDrawnSeed(page: Page, seed: number): Promise<void> {
  await expect.poll(async () => (await harnessSnapshot(page)).seed, { timeout: 30_000 }).toBe(seed)
  await awaitIdle(page)
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/)
}

/** Intent: assert one run announced "Generating phrase" once and "Phrase ready" once. */
async function expectOneLoadingThenReady(page: Page): Promise<void> {
  await expect(statusRegion(page)).toHaveText('Phrase ready')
  expect(await announcedCount(page, '.generation-status', 'Generating phrase')).toBe(1)
  expect(await announcedCount(page, '.generation-status', 'Phrase ready')).toBe(1)
}

// @test-link [[rule_idle_phrase_too_dense_is_replaced]]
test.describe('a too-wide phrase is replaced by a fresh-seed retry', () => {
  test('the first attempt that fits is drawn with its own seed, inside one Loading, and nothing else is drawn', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP)
    await gotoWorkspaceHarness(page)

    // From Empty: the first attempt is too wide, the first retry fits.
    await queueSeeds(page, [101, 102])
    await queueFitVerdicts(page, ['notes_too_wide'])
    const engravedBefore = await engravings(page)
    await observeLiveRegion(page, '.generation-status')
    await primaryButton(page).click()
    await awaitDrawnSeed(page, 102)
    await expectOneLoadingThenReady(page)
    expect(await seedsDrawn(page)).toBe(2)
    expect(await engravings(page)).toBe(engravedBefore + 1)
    const first = await harnessSnapshot(page)
    expect(first.roomNotice).toBeNull()
    expect(first.retriesRunning).toBe(false)
    await expectNoNotationError(page)

    // From Ready: two attempts too wide, the second retry fits; the phrase on screen is never
    // drawn again, and only the fitting attempt is engraved.
    await queueSeeds(page, [103, 104, 105])
    await queueFitVerdicts(page, ['notes_too_wide', 'notes_too_wide'])
    const engravedAtReady = await engravings(page)
    await observeLiveRegion(page, '.generation-status')
    await primaryButton(page).click()
    await awaitDrawnSeed(page, 105)
    await expectOneLoadingThenReady(page)
    expect(await seedsDrawn(page)).toBe(5)
    expect(await engravings(page)).toBe(engravedAtReady + 1)
    expect((await harnessSnapshot(page)).requestId).not.toBe(first.requestId)
    await expectNoNotationError(page)
  })

  test('a generation failure mid-run shows the generation-failure banner, never the notation error', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP)
    await gotoWorkspaceHarness(page)
    await queueSeeds(page, [601, 602])
    await queueFitVerdicts(page, ['notes_too_wide'])
    // The first attempt generates for real (and is too wide); the retry finds no phrase.
    await failNextGeneration(page, 'no_legal_rhythm_plan', 1)

    await primaryButton(page).click()
    await expect(statusRegion(page)).toHaveText('Generation failed. Try again.', {
      timeout: 30_000,
    })
    await awaitIdle(page)
    await expect(page.locator('.inline-alert.alert-error')).toBeVisible()
    await expect(page.locator('.staff-frame')).toHaveClass(/staff-empty/)
    await expect(primaryButton(page)).toHaveText('Retry generation')
    await expect(roomNotice(page)).toHaveCount(0)
    await expectNoScoreAndNoNotationError(page)
    expect(await seedsDrawn(page)).toBe(2)
    const snap = await harnessSnapshot(page)
    expect(snap.roomNotice).toBeNull()
    expect(snap.seed).toBeNull()
  })
})

// @test-link [[rule_staff_needs_room_notice]]
// @test-link [[rule_idle_phrase_too_dense_is_replaced]]
test('when all four attempts are too wide, the too-many-notes notice shows instead of the staff', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP)
  await gotoWorkspaceHarness(page)
  await observeLiveRegion(page, '.notation-status')
  await observeLiveRegion(page, '.generation-status')
  const checksBefore = await fitChecks(page)

  await showTooManyNotesNotice(page, [201, 202, 203, 204])

  expect(await seedsDrawn(page)).toBe(4)
  expect(await fitChecks(page)).toBe(checksBefore + 4)
  const snap = await harnessSnapshot(page)
  expect(snap.latestSeed).toBe(204)
  expect(snap.seed).toBeNull()
  expect(snap.retriesRunning).toBe(false)
  expect(snap.roomNoticeAnnouncements).toBe(1)
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-no-room/)
  await expect(page.locator('.staff-frame')).not.toHaveClass(/staff-loading/)
  await expect(roomNotice(page)).toBeVisible()
  expect(await roomNoticeSentence(page)).toBe(TOO_MANY_NOTES_SENTENCE)
  await expect(page.locator('.notation-status')).toHaveText(TOO_MANY_NOTES_SENTENCE)
  expect(await announcedCount(page, '.notation-status', TOO_MANY_NOTES_SENTENCE)).toBe(1)
  await expectNoScoreAndNoNotationError(page)
  await expect(primaryButton(page)).toHaveText('Regenerate phrase')
  await expect(primaryButton(page)).toBeEnabled()
  expect(await announcedCount(page, '.generation-status', 'Generating phrase')).toBe(1)
  expect(await announcedCount(page, '.generation-status', 'Phrase ready')).toBe(0)
})

// @test-link [[rule_too_dense_notice_retry_rounds]]
// @test-link [[rule_retry_round_window_changes]]
test.describe('rounds under the too-many-notes notice', () => {
  test('a narrower window starts none; a wider one starts a round that keeps the notice; a wider window during it starts nothing more; its failure re-announces the notice', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE)
    await gotoWorkspaceHarness(page)
    await showTooManyNotesNotice(page, [301, 302, 303, 304])
    const announcedAtNotice = (await harnessSnapshot(page)).roomNoticeAnnouncements

    // Narrower: the room check runs, no round starts, the notice stays.
    const roomChecksBefore = await roomChecks(page)
    await resizeAndSettle(page, NARROWER_PHONE)
    await expect.poll(() => roomChecks(page)).toBeGreaterThan(roomChecksBefore)
    await settleFrames(page)
    await awaitIdle(page)
    expect(await seedsDrawn(page)).toBe(4)
    expect((await harnessSnapshot(page)).roomNotice).toBe('notes_too_wide')
    expect(await roomNoticeSentence(page)).toBe(TOO_MANY_NOTES_SENTENCE)

    // Wider: a round starts, held at its first attempt; the notice stays, dimmed by Loading.
    await holdGeneration(page)
    await queueSeeds(page, [305, 306, 307, 308])
    await queueFitVerdicts(page, [
      'notes_too_wide',
      'notes_too_wide',
      'notes_too_wide',
      'notes_too_wide',
    ])
    await observeLiveRegion(page, '.notation-status')
    await page.setViewportSize(PHONE)
    await expect(page.locator('.staff-frame')).toHaveClass(/staff-no-room/)
    await expect(page.locator('.staff-frame')).toHaveClass(/staff-loading/)
    await expect(roomNotice(page)).toBeVisible()
    await expect(statusRegion(page)).toHaveText('Generating phrase')
    await expect.poll(async () => (await harnessSnapshot(page)).retriesRunning).toBe(true)

    // Wider again during the round: it carries on, and nothing more starts after it.
    await page.setViewportSize(WIDER_PHONE)
    await settleFrames(page)
    await releaseGeneration(page)
    await expect
      .poll(async () => (await harnessSnapshot(page)).roomNoticeAnnouncements, { timeout: 30_000 })
      .toBe(announcedAtNotice + 1)
    await awaitIdle(page)
    await settleFrames(page)
    await awaitIdle(page)
    expect(await seedsDrawn(page)).toBe(8)
    const snap = await harnessSnapshot(page)
    expect(snap.roomNotice).toBe('notes_too_wide')
    expect(snap.retriesRunning).toBe(false)
    expect(snap.seed).toBeNull()
    await expect(page.locator('.staff-frame')).not.toHaveClass(/staff-loading/)
    expect(await roomNoticeSentence(page)).toBe(TOO_MANY_NOTES_SENTENCE)
    expect(await announcedCount(page, '.notation-status', TOO_MANY_NOTES_SENTENCE)).toBe(1)
    await expectNoScoreAndNoNotationError(page)
  })

  test('a changed setting starts a round, and the first phrase that fits clears the notice', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE)
    await gotoWorkspaceHarness(page)
    await showTooManyNotesNotice(page, [401, 402, 403, 404])

    await queueSeeds(page, [405, 406])
    await queueFitVerdicts(page, ['notes_too_wide'])
    await observeLiveRegion(page, '.generation-status')
    await radio(page, 'Contour', 'Rising').click()
    await awaitDrawnSeed(page, 406)
    await expectOneLoadingThenReady(page)
    expect(await seedsDrawn(page)).toBe(6)
    const snap = await harnessSnapshot(page)
    expect(snap.roomNotice).toBeNull()
    expect(snap.retriesRunning).toBe(false)
    await expect(roomNotice(page)).toHaveCount(0)
    await expectNoNotationError(page)
  })

  test('Regenerate phrase starts a round; a round that finds no phrase leaves the banner over the notice', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP)
    await gotoWorkspaceHarness(page)
    await showTooManyNotesNotice(page, [501, 502, 503, 504])

    // A round whose first attempt finds no phrase: the banner shows over the notice.
    await queueSeeds(page, [505])
    await failNextGeneration(page, 'no_legal_rhythm_plan')
    await primaryButton(page).click()
    await expect(statusRegion(page)).toHaveText('Generation failed. Try again.', {
      timeout: 30_000,
    })
    await awaitIdle(page)
    await expect(page.locator('.inline-alert.alert-error')).toBeVisible()
    await expect(roomNotice(page)).toBeVisible()
    expect((await harnessSnapshot(page)).roomNotice).toBe('notes_too_wide')
    await expectNoScoreAndNoNotationError(page)

    // The phrase action starts another round, whose first attempt fits: the notice clears.
    await queueSeeds(page, [506])
    await observeLiveRegion(page, '.generation-status')
    await primaryButton(page).click()
    await awaitDrawnSeed(page, 506)
    await expectOneLoadingThenReady(page)
    await expect(roomNotice(page)).toHaveCount(0)
    await expect(page.locator('.inline-alert.alert-error')).toHaveCount(0)
    expect((await harnessSnapshot(page)).roomNotice).toBeNull()
    await expectNoNotationError(page)
    expect(await seedsDrawn(page)).toBe(6)
  })
})
