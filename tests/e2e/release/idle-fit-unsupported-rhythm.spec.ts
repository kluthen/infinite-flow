/**
 * v2.0 definition of done, item 26, at Idle, under a rhythm combination v1 disallows: when the
 * notice would give way to a new phrase (the no-room notice clearing, or a setting change or a
 * wider window under the too-many-notes notice, before a round or during one), no phrase is
 * generated or shown: the workspace shows Empty with the unsupported-rhythm alert, a round under
 * way stops at once with none of its attempts drawn, and once the combination is allowed again
 * nothing generates until the player asks. A phrase on screen that stops fitting under such a
 * combination gets no retries and no notice, unless the window has no room at all. Runs against
 * the workspace harness (port 4175): queued seeds, forced fit verdicts and real window resizes.
 */
import { expect, test, type Page } from '@playwright/test'

import { generateAndAwaitReady, primaryButton, radio } from '../workspace/helpers'
import {
  announcedCount,
  awaitIdle,
  engravings,
  expectEmptyWithUnsupportedAlert,
  expectNoScoreAndNoNotationError,
  failNextNotation,
  fitChecks,
  gotoWorkspaceHarness,
  harnessSnapshot,
  holdGeneration,
  observeLiveRegion,
  queueSeeds,
  releaseGeneration,
  resizeAndSettle,
  roomNotice,
  seedsDrawn,
  settleFrames,
  showTooManyNotesNotice,
  unsupportedRhythmAlert,
} from './harness-helpers'

/** At and above bp-tablet-landscape (64rem = 1024 px). */
const DESKTOP = { width: 1280, height: 800 }
/** A slightly smaller desktop window, still wide: a resize that redraws the staff. */
const SMALLER_DESKTOP = { width: 1200, height: 800 }
/** A landscape phone, below bp-tablet-landscape, with room for the split staff. */
const PHONE = { width: 740, height: 360 }
/** Below bp-tablet-landscape and too short for the split staff at the legibility floor. */
const TOO_SHORT = { width: 740, height: 260 }

/**
 * Intent: make the default Neutral rhythm settings (Quarter notes, Slightly varied, Sparse)
 * unsupported at any width: with Active displacement they cannot form a four-bar phrase.
 */
async function makeCombinationUnsupported(page: Page): Promise<void> {
  await radio(page, 'Syncopation', 'Active displacement').click()
  await expect(unsupportedRhythmAlert(page)).toBeVisible()
}

/**
 * Intent: store a Sixteenth chosen while wide, then, on a phone, finish a combination (Strict,
 * Sparse, Active displacement) that is allowed there, where it generates as Eighth, but blocked
 * from the tablet-landscape width up; then reach the too-many-notes notice on the phone.
 */
async function storedSixteenthUnderNotice(page: Page, seeds: readonly number[]): Promise<void> {
  await page.setViewportSize(DESKTOP)
  await gotoWorkspaceHarness(page)
  await radio(page, 'Note density', 'Sixteenth').click()
  await radio(page, 'Rhythmic variety', 'Strict').click()
  await resizeAndSettle(page, PHONE)
  await radio(page, 'Syncopation', 'Active displacement').click()
  await expect(unsupportedRhythmAlert(page)).toHaveCount(0)
  await showTooManyNotesNotice(page, seeds)
}

/** Intent: assert nothing more is generated, drawn or fit-checked after the Empty it gave way to. */
async function expectNothingMore(
  page: Page,
  before: { readonly seeds: number; readonly engraved: number },
): Promise<void> {
  await settleFrames(page)
  await awaitIdle(page)
  expect(await seedsDrawn(page)).toBe(before.seeds)
  expect(await engravings(page)).toBe(before.engraved)
}

// @test-link [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
test.describe('the notice gives way to Empty under an unsupported rhythm combination', () => {
  test('a setting change under the too-many-notes notice that makes it unsupported generates nothing, even once allowed again', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP)
    await gotoWorkspaceHarness(page)
    await showTooManyNotesNotice(page, [1101, 1102, 1103, 1104])
    const before = { seeds: await seedsDrawn(page), engraved: await engravings(page) }

    await makeCombinationUnsupported(page)
    await expectEmptyWithUnsupportedAlert(page)
    await expectNothingMore(page, before)

    await radio(page, 'Syncopation', 'Straight').click()
    await expect(unsupportedRhythmAlert(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Generate phrase' })).toBeEnabled()
    await expect(page.locator('.staff-frame')).toHaveClass(/staff-empty/)
    await expectNothingMore(page, before)
  })

  test('a wider window past the tablet-landscape width with a stored Sixteenth, before a round, gives way to Empty', async ({
    page,
  }) => {
    await storedSixteenthUnderNotice(page, [1201, 1202, 1203, 1204])
    const before = { seeds: await seedsDrawn(page), engraved: await engravings(page) }

    await resizeAndSettle(page, DESKTOP)
    await expectEmptyWithUnsupportedAlert(page)
    await expectNothingMore(page, before)
  })

  test('the same widening during a round stops it at once, and none of its attempts is drawn', async ({
    page,
  }) => {
    await storedSixteenthUnderNotice(page, [1301, 1302, 1303, 1304])
    const engravedBefore = await engravings(page)

    await holdGeneration(page)
    await queueSeeds(page, [1305, 1306, 1307, 1308])
    await observeLiveRegion(page, '.generation-status')
    await primaryButton(page).click()
    await expect(page.locator('.staff-frame')).toHaveClass(/staff-loading/)
    await expect.poll(async () => (await harnessSnapshot(page)).operation).toBe('generating')

    await page.setViewportSize(DESKTOP)
    await settleFrames(page)
    await expectEmptyWithUnsupportedAlert(page)
    await releaseGeneration(page)
    await awaitIdle(page)
    await settleFrames(page)
    // Only the held attempt drew a seed; its late result is discarded, never drawn.
    expect(await seedsDrawn(page)).toBe(5)
    expect(await engravings(page)).toBe(engravedBefore)
    await expectEmptyWithUnsupportedAlert(page)
    // A run stopped to Empty shows no phrase, so nothing is ever called ready.
    await expect(page.locator('.generation-status')).toHaveText('')
    expect(await announcedCount(page, '.generation-status', 'Phrase ready')).toBe(0)
  })

  test('the no-room notice clearing under an unsupported combination shows Empty, and nothing generates until Generate is clicked', async ({
    page,
  }) => {
    await page.setViewportSize(TOO_SHORT)
    await gotoWorkspaceHarness(page)
    await queueSeeds(page, [1401, 1402])
    await primaryButton(page).click()
    await expect
      .poll(async () => (await harnessSnapshot(page)).roomNotice, { timeout: 30_000 })
      .toBe('no_room')
    await awaitIdle(page)

    // A setting change under no room only re-checks the room: the notice stays.
    await makeCombinationUnsupported(page)
    await settleFrames(page)
    await awaitIdle(page)
    expect((await harnessSnapshot(page)).roomNotice).toBe('no_room')
    const before = { seeds: await seedsDrawn(page), engraved: await engravings(page) }

    await resizeAndSettle(page, PHONE)
    await expectEmptyWithUnsupportedAlert(page)
    await expectNothingMore(page, before)

    await radio(page, 'Syncopation', 'Straight').click()
    await expect(unsupportedRhythmAlert(page)).toHaveCount(0)
    await expectNothingMore(page, before)
    await expect(page.locator('.staff-frame')).toHaveClass(/staff-empty/)

    await generateAndAwaitReady(page)
    expect((await harnessSnapshot(page)).seed).toBe(before.seeds === 0 ? 1401 : 1402)
  })
})

// @test-link [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
test.describe('a phrase on screen under an unsupported rhythm combination', () => {
  test('stays while it fits; once it stops fitting it gives way to Empty, with no retries and no notice', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP)
    await gotoWorkspaceHarness(page)
    await queueSeeds(page, [1501])
    await generateAndAwaitReady(page)
    const shown = await harnessSnapshot(page)

    await makeCombinationUnsupported(page)
    await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/)
    expect((await harnessSnapshot(page)).seed).toBe(shown.seed)

    const checksBefore = await fitChecks(page)
    await failNextNotation(page, 'notation_notes_too_wide')
    await resizeAndSettle(page, SMALLER_DESKTOP)
    await expectEmptyWithUnsupportedAlert(page)
    expect(await seedsDrawn(page)).toBe(1)
    expect(await fitChecks(page)).toBe(checksBefore)
    const snap = await harnessSnapshot(page)
    expect(snap.roomNoticeAnnouncements).toBe(0)
    expect(snap.retriesRunning).toBe(false)
  })

  test('shows the notice instead when the window has no room for the staff at all', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE)
    await gotoWorkspaceHarness(page)
    await queueSeeds(page, [1601])
    await generateAndAwaitReady(page)
    await makeCombinationUnsupported(page)

    await resizeAndSettle(page, TOO_SHORT)
    await expect
      .poll(async () => (await harnessSnapshot(page)).roomNotice, { timeout: 30_000 })
      .toBe('no_room')
    await expect(roomNotice(page)).toBeVisible()
    await expectNoScoreAndNoNotationError(page)
    expect(await seedsDrawn(page)).toBe(1)
  })
})
