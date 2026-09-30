/**
 * The audio transport on the workspace harness's fake audio clock (the default mode, port 4175):
 * the player's click is the only thing that unlocks audio, and a scripted run at 120 BPM checks
 * the count-in and click track click by click, with the click on, off, turned off during the
 * count-in and at its lowest volume. The clock moves only when the spec advances it, so every
 * time is exact.
 */
import { expect, test, type Page } from '@playwright/test'

import {
  BEAT_SECONDS,
  advanceAudio,
  advanceAudioTo,
  audibleClicks,
  gotoAudioHarness,
  installAudioSpy,
  isAudioUnlocked,
  mixDesign,
  readAudioSpy,
  scheduledClicks,
  setClickOn,
  setClickVolume,
  startAudio,
} from './audio-harness-helpers'

/** Two audio times this close are the same time. */
const SAME_TIME = 1e-9

/** The count-in's four beats plus eight measures of four. */
const COUNT_IN_BEATS = 4
const RUN_BEATS = COUNT_IN_BEATS + 8 * 4

/**
 * Intent: advance the fake clock until the run's last click (beat `RUN_BEATS - 1`) is past, with
 * the look-ahead window (0.2 s) still short of the next beat, so exactly `RUN_BEATS` clicks are
 * scheduled.
 */
async function playRun(page: Page, startAt: number): Promise<void> {
  const lastClickAt = startAt + (RUN_BEATS - 1) * BEAT_SECONDS
  await advanceAudioTo(page, lastClickAt + 0.1)
}

// @test-link [[rule_audio_unlocked_by_player_click]]
test.describe('audio unlock', () => {
  // @test-link [[rule_audio_unlocked_by_player_click]]
  test('the fake mode constructs no AudioContext, before or after the Start click', async ({
    page,
  }) => {
    await installAudioSpy(page)
    await gotoAudioHarness(page)

    expect(await isAudioUnlocked(page)).toBe(false)
    expect(await readAudioSpy(page)).toMatchObject({ installed: true, constructions: 0 })

    await startAudio(page)

    expect(await isAudioUnlocked(page)).toBe(true)
    expect(await readAudioSpy(page)).toMatchObject({ installed: true, constructions: 0 })
  })
})

// @test-link [[rule_click_track]]
// @test-link [[rule_count_in_always_clicks]]
test.describe('count-in and click track at 120 BPM', () => {
  // @test-link [[rule_click_track]]
  // @test-link [[rule_count_in_always_clicks]]
  test('a count-in plus eight bars clicks every beat, beat 1 accented', async ({ page }) => {
    await gotoAudioHarness(page)
    const { startAt, countInEndsAt } = await startAudio(page)
    await playRun(page, startAt)

    const audible = await audibleClicks(page)
    expect(audible).toHaveLength(RUN_BEATS)
    audible.forEach((click, k) => {
      expect(Math.abs(click.at - (startAt + k * BEAT_SECONDS))).toBeLessThanOrEqual(SAME_TIME)
      expect(click.accent).toBe(k % 4 === 0)
      expect(click.route).toBe(k < COUNT_IN_BEATS ? 'count-in' : 'click')
      expect(click.scheduledAt).toBeLessThan(click.at)
    })
    expect(Math.abs(countInEndsAt - (startAt + COUNT_IN_BEATS * BEAT_SECONDS))).toBeLessThanOrEqual(
      SAME_TIME,
    )
  })

  // @test-link [[rule_count_in_always_clicks]]
  test('with the click off, the count-in still clicks and nothing after it', async ({ page }) => {
    await gotoAudioHarness(page)
    await setClickOn(page, false)
    const { startAt, countInEndsAt } = await startAudio(page)
    await playRun(page, startAt)

    const audible = await audibleClicks(page)
    expect(audible.map((click) => click.route)).toEqual(Array(COUNT_IN_BEATS).fill('count-in'))
    expect(audible.every((click) => click.at < countInEndsAt)).toBe(true)
    expect(await scheduledClicks(page)).toHaveLength(RUN_BEATS)
  })

  // @test-link [[rule_count_in_always_clicks]]
  test('turned off during the count-in, the whole count-in still clicks', async ({ page }) => {
    await gotoAudioHarness(page)
    const { startAt, countInEndsAt } = await startAudio(page)
    await advanceAudio(page, 1.2)
    await setClickOn(page, false)
    await playRun(page, startAt)

    const audible = await audibleClicks(page)
    expect(audible).toHaveLength(COUNT_IN_BEATS)
    audible.forEach((click, k) => {
      expect(click.route).toBe('count-in')
      expect(Math.abs(click.at - (startAt + k * BEAT_SECONDS))).toBeLessThanOrEqual(SAME_TIME)
    })
    expect(audible.every((click) => click.at < countInEndsAt)).toBe(true)
  })
})

// @test-link [[rule_click_volume_never_silent]]
// @test-link [[rule_count_in_always_clicks]]
test('at the lowest click volume the count-in is still audible', async ({ page }) => {
  await gotoAudioHarness(page)
  const { range } = await mixDesign(page)
  expect(range.clickVolumeMin).toBeGreaterThan(0)
  await setClickVolume(page, range.clickVolumeMin)
  const { startAt } = await startAudio(page)
  await advanceAudioTo(page, startAt + COUNT_IN_BEATS * BEAT_SECONDS)

  const countIn = (await audibleClicks(page)).filter((click) => click.route === 'count-in')
  expect(countIn).toHaveLength(COUNT_IN_BEATS)
  for (const click of countIn) {
    expect(click.gain).toBe(range.clickVolumeMin)
    expect(click.gain).toBeGreaterThan(0)
  }
})
