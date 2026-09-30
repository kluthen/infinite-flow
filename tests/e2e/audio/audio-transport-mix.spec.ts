/**
 * The audio transport's mix, stop and repeatability on the workspace harness's fake audio clock
 * (the default mode, port 4175): muting and unmuting leaves the audio clock and the click times
 * alone, stop fades the session out over 0.1 s, and the same script gives the same events after
 * a reload.
 */
import { expect, test, type Page } from '@playwright/test'

import {
  BEAT_SECONDS,
  advanceAudio,
  audibleClicks,
  audioEvents,
  audioNow,
  gotoAudioHarness,
  isAudioRunning,
  scheduledClicks,
  setBackingOn,
  setClickOn,
  startAudio,
  stopAudio,
} from './audio-harness-helpers'

/** Two audio times this close are the same time. */
const SAME_TIME = 1e-9

/** Intent: whether every scheduled click falls on beat k of the run, k counting up from 0. */
async function expectClicksOnTheBeat(page: Page, startAt: number): Promise<number> {
  const clicks = await scheduledClicks(page)
  clicks.forEach((click, k) => {
    expect(Math.abs(click.at - (startAt + k * BEAT_SECONDS))).toBeLessThanOrEqual(SAME_TIME)
  })
  return clicks.length
}

/** Intent: advance the fake clock by `seconds` and check it reads exactly `expected` after. */
async function advanceAndExpectNow(page: Page, seconds: number, expected: number): Promise<void> {
  await advanceAudio(page, seconds)
  expect(Math.abs((await audioNow(page)) - expected)).toBeLessThanOrEqual(SAME_TIME)
}

// @test-link [[req_session_audio_mix]]
// @test-link [[rule_playhead_follows_audio_clock]]
test('muting and unmuting never moves the audio clock or the click times', async ({ page }) => {
  await gotoAudioHarness(page)
  const { startAt } = await startAudio(page)
  const mutedFrom = 2.3
  const mutedUntil = 4

  await advanceAndExpectNow(page, mutedFrom, mutedFrom)
  await setClickOn(page, false)
  await setBackingOn(page, false)
  await advanceAndExpectNow(page, mutedUntil - mutedFrom, mutedUntil)
  await setClickOn(page, true)
  await setBackingOn(page, true)
  await advanceAndExpectNow(page, 2.05, 6.05)

  // Planned up to 6.05 + the 0.2 s look-ahead: beats 0 to 12, every one on its beat.
  const scheduled = await expectClicksOnTheBeat(page, startAt)
  expect(scheduled).toBe(13)
  const expectedAudible = (await scheduledClicks(page))
    .map((click) => click.at)
    .filter((at) => at < mutedFrom || at >= mutedUntil)
  expect((await audibleClicks(page)).map((click) => click.at)).toEqual(expectedAudible)
  expect(await isAudioRunning(page)).toBe(true)
})

// @test-link [[rule_stop_ends_session]]
test('stop fades the session out over 0.1 s, and no click sounds from then on', async ({
  page,
}) => {
  await gotoAudioHarness(page)
  await startAudio(page)
  await advanceAudio(page, 3)
  const stopAt = await audioNow(page)

  const { fadeEndsAt } = await stopAudio(page)
  await advanceAudio(page, 2)

  const fades = (await audioEvents(page)).filter((event) => event.kind === 'fade')
  expect(fades).toEqual([{ kind: 'fade', bus: 1, at: stopAt, duration: 0.1, scheduledAt: stopAt }])
  expect(Math.abs(fadeEndsAt - (stopAt + 0.1))).toBeLessThanOrEqual(SAME_TIME)
  expect((await audibleClicks(page)).filter((click) => click.at >= stopAt)).toEqual([])
  expect((await scheduledClicks(page)).some((click) => click.at >= stopAt)).toBe(true)
  expect(await isAudioRunning(page)).toBe(false)
})

/** Intent: one fixed script: start, mute during the count-in, unmute, advance, stop, advance. */
async function scriptedRun(page: Page): Promise<readonly WorkspaceHarnessAudioEvent[]> {
  await gotoAudioHarness(page)
  await startAudio(page)
  await advanceAudio(page, 1.2)
  await setClickOn(page, false)
  await advanceAudio(page, 2)
  await setClickOn(page, true)
  await advanceAudio(page, 4)
  await stopAudio(page)
  await advanceAudio(page, 1)
  return audioEvents(page)
}

// @test-link [[rule_playhead_follows_audio_clock]]
test('the same script gives the same events after a reload', async ({ page }) => {
  const first = await scriptedRun(page)
  await page.reload()
  const second = await scriptedRun(page)

  expect(first.length).toBeGreaterThan(0)
  expect(second).toEqual(first)
})
