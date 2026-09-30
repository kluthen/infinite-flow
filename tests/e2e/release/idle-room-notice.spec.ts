/**
 * v2.0 definition of done, item 26, at Idle: a window with no room for the staff (below the
 * tablet-landscape width, too short) shows the "staff needs more room" notice with its no-room
 * sentence and no retries, instead of the staff or the notation error. It clears by itself once
 * the staff fits, and a new phrase with a fresh seed is then generated: the phrase shown before
 * the notice is never drawn again. A phrase on screen that stops fitting on a resize is replaced
 * the same way. Runs against the workspace harness (port 4175): queued seeds, real window sizes
 * (740x260 is too short for the split staff), and a forced layout failure on a redraw where a real
 * size cannot give one (no room at desktop width; a phrase on screen left too wide).
 */
import { expect, test, type Page } from '@playwright/test'

import { generateAndAwaitReady, primaryButton, statusRegion } from '../workspace/helpers'
import {
  NO_ROOM_NARROW_SENTENCE,
  NO_ROOM_WIDE_SENTENCE,
  announcedCount,
  awaitIdle,
  expectNoNotationError,
  expectNoScoreAndNoNotationError,
  failNextNotation,
  fitChecks,
  gotoWorkspaceHarness,
  harnessSnapshot,
  observeLiveRegion,
  queueSeeds,
  resizeAndSettle,
  roomNotice,
  roomNoticeSentence,
  seedsDrawn,
} from './harness-helpers'

/** At and above bp-tablet-landscape (64rem = 1024 px). */
const DESKTOP = { width: 1280, height: 800 }
/** A slightly smaller desktop window, still wide: a resize that redraws the staff. */
const SMALLER_DESKTOP = { width: 1200, height: 800 }
/** A landscape phone, below bp-tablet-landscape, with room for the split staff. */
const PHONE = { width: 740, height: 360 }
/** Below bp-tablet-landscape and too short for the split staff at the legibility floor. */
const TOO_SHORT = { width: 740, height: 260 }

/** Intent: wait for the session to show the notice with this cause, then to idle. */
async function awaitNotice(page: Page, cause: 'no_room' | 'notes_too_wide'): Promise<void> {
  await expect
    .poll(async () => (await harnessSnapshot(page)).roomNotice, { timeout: 30_000 })
    .toBe(cause)
  await awaitIdle(page)
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-no-room/)
  await expect(roomNotice(page)).toBeVisible()
}

/** Intent: assert the no-room notice shows the sentence for the current breakpoint only. */
async function expectNoRoomSentence(page: Page, sentence: string): Promise<void> {
  expect(await roomNoticeSentence(page)).toBe(sentence)
  await expect(page.locator('.notation-status')).toHaveText(sentence)
  const [shown, hidden] =
    sentence === NO_ROOM_WIDE_SENTENCE
      ? ['.room-notice-wide', '.room-notice-narrow']
      : ['.room-notice-narrow', '.room-notice-wide']
  await expect(roomNotice(page).locator(shown)).toBeVisible()
  await expect(roomNotice(page).locator(hidden)).toBeHidden()
}

/** Intent: wait for a new phrase with this seed, drawn after the notice cleared by itself. */
async function awaitNewPhrase(page: Page, seed: number): Promise<void> {
  await expect.poll(async () => (await harnessSnapshot(page)).seed, { timeout: 30_000 }).toBe(seed)
  await awaitIdle(page)
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/)
  await expect(roomNotice(page)).toHaveCount(0)
  await expect(statusRegion(page)).toHaveText('Phrase ready')
  expect(await announcedCount(page, '.generation-status', 'Generating phrase')).toBe(1)
  expect(await announcedCount(page, '.generation-status', 'Phrase ready')).toBe(1)
  expect((await harnessSnapshot(page)).roomNotice).toBeNull()
  await expectNoNotationError(page)
}

// @test-link [[rule_staff_needs_room_notice]]
// @test-link [[rule_staff_notice_gives_way_to_new_phrase]]
test.describe('no room for the staff', () => {
  test('a window too short shows the no-room notice with no retries, and room regained generates a new phrase', async ({
    page,
  }) => {
    await page.setViewportSize(TOO_SHORT)
    await gotoWorkspaceHarness(page)
    await queueSeeds(page, [701, 702])
    await observeLiveRegion(page, '.notation-status')

    await primaryButton(page).click()
    await awaitNotice(page, 'no_room')
    // From Empty, the one attempt draws one seed and is fit-checked once: no retries.
    expect(await seedsDrawn(page)).toBe(1)
    expect(await fitChecks(page)).toBe(1)
    const snap = await harnessSnapshot(page)
    expect(snap.retriesRunning).toBe(false)
    expect(snap.roomNoticeAnnouncements).toBe(1)
    expect(snap.seed).toBeNull()
    await expectNoRoomSentence(page, NO_ROOM_NARROW_SENTENCE)
    await expectNoScoreAndNoNotationError(page)
    await expect(primaryButton(page)).toHaveText('Regenerate phrase')

    await observeLiveRegion(page, '.generation-status')
    await page.setViewportSize(PHONE)
    await awaitNewPhrase(page, 702)
    expect(await seedsDrawn(page)).toBe(2)
  })

  test('a phrase on screen when the window loses room gives way to the notice, and is never drawn again', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE)
    await gotoWorkspaceHarness(page)
    await queueSeeds(page, [801, 802])
    await generateAndAwaitReady(page)
    const shown = await harnessSnapshot(page)
    expect(shown.seed).toBe(801)

    await resizeAndSettle(page, TOO_SHORT)
    await awaitNotice(page, 'no_room')
    expect(await seedsDrawn(page)).toBe(1)
    expect((await harnessSnapshot(page)).seed).toBeNull()
    await expectNoRoomSentence(page, NO_ROOM_NARROW_SENTENCE)
    await expectNoScoreAndNoNotationError(page)

    await observeLiveRegion(page, '.generation-status')
    await page.setViewportSize(PHONE)
    await awaitNewPhrase(page, 802)
    expect((await harnessSnapshot(page)).requestId).not.toBe(shown.requestId)
  })

  test('at the tablet-landscape width and up the no-room notice shows its wide sentence, and clears when the staff fits', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP)
    await gotoWorkspaceHarness(page)
    await queueSeeds(page, [901, 902])
    await generateAndAwaitReady(page)
    const shown = await harnessSnapshot(page)

    // A desktop window cannot be made too small for the staff with a real size here, so the
    // redraw this resize causes is forced to report no room.
    await failNextNotation(page, 'notation_no_room')
    await observeLiveRegion(page, '.notation-status')
    await resizeAndSettle(page, SMALLER_DESKTOP)
    await awaitNotice(page, 'no_room')
    expect(await seedsDrawn(page)).toBe(1)
    expect((await harnessSnapshot(page)).roomNoticeAnnouncements).toBe(1)
    await expectNoRoomSentence(page, NO_ROOM_WIDE_SENTENCE)
    await expectNoScoreAndNoNotationError(page)

    // The next resize finds room: the notice clears into a new phrase, never the old one.
    await observeLiveRegion(page, '.generation-status')
    await page.setViewportSize(DESKTOP)
    await awaitNewPhrase(page, 902)
    expect((await harnessSnapshot(page)).requestId).not.toBe(shown.requestId)
  })
})

// @test-link [[rule_idle_phrase_too_dense_is_replaced]]
test('a phrase on screen that stops fitting on a resize is replaced by a new phrase, with no notation error', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP)
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [1001, 1002])
  await generateAndAwaitReady(page)
  const shown = await harnessSnapshot(page)

  // The redraw at the new size finds this phrase's notes too wide for the room.
  await failNextNotation(page, 'notation_notes_too_wide')
  await observeLiveRegion(page, '.generation-status')
  await page.setViewportSize(SMALLER_DESKTOP)
  await awaitNewPhrase(page, 1002)
  expect(await seedsDrawn(page)).toBe(2)
  expect((await harnessSnapshot(page)).requestId).not.toBe(shown.requestId)
  expect((await harnessSnapshot(page)).roomNoticeAnnouncements).toBe(0)
})
