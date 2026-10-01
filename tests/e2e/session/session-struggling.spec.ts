/**
 * v2.0 items 1 and 22, the struggling-generator notice on screen, driven by failed generations on
 * the fake audio clock: the failure ladder of a look-ahead phrase is a first carry-in attempt,
 * three carry-in retries and one standalone retry, so five forced failures in a row exhaust it and
 * the phrase before is repeated at the deadline. The notice shows in the cue row from the second
 * repeat in a row (never at the first), stays through a third, clears when a newly generated
 * phrase (carry-in, or standalone after four carry-in failures) starts sounding, and goes with the
 * session's end. It never blocks: Stop and the audio mix stay usable while it shows. And whatever
 * fails during a session, no blocking alert shows: no failure banner, no notation error, and the
 * generation and notation live regions stay silent. Runs against the workspace harness (port
 * 4175), the generated phrases from the real worker.
 */
import { expect, test, type Page } from '@playwright/test'

import {
  expectNoNotationError,
  failNextGeneration,
  generationsSettled,
  observeLiveRegion,
  readLiveRegionLog,
  seedsDrawn,
} from '../release/harness-helpers'
import {
  advanceAudioBy,
  cueRow,
  expectEndedLikeStop,
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
  sessionTimeline,
  startSession,
} from './session-helpers'

/** One measure at the default 90 BPM, in seconds. */
const MEASURE = (4 * 60) / 90
/** A little past (or before) a scheduled time: several 25 ms wake-up steps. */
const NUDGE = 0.1
/** Every rung of one look-ahead phrase's failure ladder: four carry-in attempts, one standalone. */
const LADDER_RUNGS = 5
/** The exact copy of the notice. */
const NOTICE_COPY = 'The generator is struggling with these settings.'

/** Intent: the struggling notice in the cue row. */
function notice(page: Page) {
  return cueRow(page).locator('p.inline-alert.alert-notice.session-alert > span.session-alert-text')
}

/** Intent: move the fake audio clock to audio time `t`, in steps of at most one second. */
async function clockTo(page: Page, t: number): Promise<void> {
  const now = await page.evaluate(() => window.__workspaceHarness.audio.now())
  expect(t).toBeGreaterThan(now)
  await advanceAudioBy(page, t - now)
}

/** Intent: wait until `count` generate calls in all have returned, failed or answered. */
async function awaitSettled(page: Page, count: number): Promise<void> {
  await expect.poll(() => generationsSettled(page), { timeout: 30_000 }).toBe(count)
}

/**
 * Intent: arm `failures` forced failures for the next look-ahead attempts, let `phraseStarts`
 * (the moment the phrase before starts sounding, which requests the next one; null when already
 * requested) pass, and wait until every attempt has returned: the failures, plus one answer when
 * fewer than the whole ladder failed.
 */
async function lookAheadWith(page: Page, failures: number, phraseStarts: number): Promise<void> {
  const settledBefore = await generationsSettled(page)
  const seedsBefore = await seedsDrawn(page)
  if (failures > 0) await failNextGeneration(page, 'search_limit_exceeded', 0, failures)
  await clockTo(page, phraseStarts + NUDGE)
  const attempts = failures >= LADDER_RUNGS ? LADDER_RUNGS : failures + 1
  await awaitSettled(page, settledBefore + attempts)
  expect(await seedsDrawn(page)).toBe(seedsBefore + attempts)
}

/**
 * Intent: assert nothing blocking shows: no failure banner or error alert, no notation error, and
 * neither live region announced anything since it was observed.
 */
// @test-link [[rule_generation_failure_alert_copy]]
async function expectNothingBlocking(page: Page): Promise<void> {
  await expect(page.locator('.inline-alert.alert-error')).toHaveCount(0)
  await expectNoNotationError(page)
  expect(await readLiveRegionLog(page, '.generation-status')).toEqual([])
  expect(await readLiveRegionLog(page, '.notation-status')).toEqual([])
}

/** Intent: assert the notice shows, exactly, in the cue row and in the controller's state. */
async function expectNoticeShown(page: Page): Promise<void> {
  expect((await sessionState(page)).strugglingNotice).toBe(true)
  await expect(notice(page)).toHaveText(NOTICE_COPY)
}

/** Intent: assert the notice does not show. */
async function expectNoNotice(page: Page): Promise<void> {
  expect((await sessionState(page)).strugglingNotice).toBe(false)
  await expect(cueRow(page).locator('.session-alert')).toHaveCount(0)
}

/**
 * Intent: start a session whose phrases 2 and 3 are both repeats (every rung of their ladders
 * fails), so the notice shows at phrase 3's deadline; return phrase 1's start on the audio clock.
 * Phrase N (2 and up) is requested when phrase N-1 starts sounding, with its deadline three
 * measures later; phrase 2 is requested at Start, with the count-in's end as its deadline.
 */
async function startUntilNoticeShows(page: Page): Promise<number> {
  await gotoSessionHarness(page)
  await readyToStart(page)
  await observeLiveRegion(page, '.generation-status')
  await observeLiveRegion(page, '.notation-status')
  const settledBefore = await generationsSettled(page)
  await failNextGeneration(page, 'search_limit_exceeded', 0, LADDER_RUNGS)
  await startSession(page)
  await awaitSettled(page, settledBefore + LADDER_RUNGS)
  const { countInEndsAt: s } = await sessionTimeline(page)

  // Phrase 2's deadline: the first repeat in a row shows nothing.
  await clockTo(page, s + NUDGE)
  await expectNoNotice(page)

  // Phrase 3 is requested as phrase 2 starts sounding; it fails through its whole ladder.
  await lookAheadWith(page, LADDER_RUNGS, s + 4 * MEASURE)
  await clockTo(page, s + 7 * MEASURE - NUDGE)
  await expectNoNotice(page)
  // At its deadline the second repeat in a row shows the notice.
  await clockTo(page, s + 7 * MEASURE + NUDGE)
  await expectNoticeShown(page)
  await expectNothingBlocking(page)
  return s
}

// @test-link [[rule_struggling_generator_notice]]
// @test-link [[rule_generation_failure_alert_copy]]
test.describe('the struggling notice', () => {
  test('shows from the second repeat in a row, stays through a third, and clears when a new carry-in phrase starts sounding', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const s = await startUntilNoticeShows(page)

    // Phrase 4 fails through its ladder too: the third repeat keeps the notice.
    await lookAheadWith(page, LADDER_RUNGS, s + 8 * MEASURE)
    await clockTo(page, s + 11 * MEASURE + NUDGE)
    await expectNoticeShown(page)

    // Phrase 5's first carry-in attempt succeeds, answered well before its deadline.
    await lookAheadWith(page, 0, s + 12 * MEASURE)
    await clockTo(page, s + 16 * MEASURE - NUDGE)
    await expectNoticeShown(page)
    // It clears when phrase 5 starts sounding, not when it was generated.
    await clockTo(page, s + 16 * MEASURE + NUDGE)
    await expectNoNotice(page)
    await expectNothingBlocking(page)

    await sessionAction(page).click()
    await expectEndedLikeStop(page, 'stop', 'running')
  })

  test('clears when a standalone phrase starts sounding, after its four carry-in attempts failed', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const s = await startUntilNoticeShows(page)

    // Phrase 4: the four carry-in rungs fail; the standalone retry succeeds.
    await lookAheadWith(page, LADDER_RUNGS - 1, s + 8 * MEASURE)
    await clockTo(page, s + 12 * MEASURE - NUDGE)
    await expectNoticeShown(page)
    await clockTo(page, s + 12 * MEASURE + NUDGE)
    await expectNoNotice(page)
    await expectNothingBlocking(page)

    await sessionAction(page).click()
    await expectEndedLikeStop(page, 'stop', 'running')
  })

  // @test-link [[rule_stop_ends_session]]
  // @test-link [[req_session_audio_mix]]
  test('never blocks: the mix and Stop stay usable while it shows, and it goes with the end', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await startUntilNoticeShows(page)

    const backing = page.locator('.mix-controls').getByRole('button', { name: 'Backing' })
    await backing.click()
    await expect(backing).toHaveAttribute('aria-pressed', 'false')
    expect((await page.evaluate(() => window.__workspaceHarness.audio.mix())).backingOn).toBe(false)
    const volume = page.locator('.mix-controls').getByRole('button', { name: 'Volume' })
    await volume.click()
    await expect(page.locator('#mix-volume-popover')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(volume).toBeFocused()
    await expectNoticeShown(page)
    await expectNothingBlocking(page)

    await sessionAction(page).click()

    await expectEndedLikeStop(page, 'stop', 'running')
    await expectNoNotice(page)
    await expectNothingBlocking(page)
    // Phrase 1 and phrase 2 (the first repeat) had started sounding.
    const state = await sessionState(page)
    expect(state.lastEnd?.soundedPhraseCount).toBe(2)
    expect(state.lastHistoryPhraseCount).toBe(2)
  })
})
