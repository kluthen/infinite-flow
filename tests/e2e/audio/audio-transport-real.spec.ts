/**
 * The audio transport on the real Web Audio output in Chromium (the workspace harness with
 * `?audio=real`, port 4175): one `AudioContext`, created only by the player's click; a count-in
 * planned ahead on the audio clock; and muting that leaves the clock running, with no suspend or
 * close call. It waits on real audio time.
 */
import { expect, test } from '@playwright/test'

import {
  BEAT_SECONDS,
  audioNow,
  gotoAudioHarness,
  installAudioSpy,
  isAudioUnlocked,
  readAudioSpy,
  scheduledClicks,
  setBackingOn,
  setClickOn,
  startAudio,
  stopAudio,
} from './audio-harness-helpers'

/** How far ahead of the audio clock the transport plans sound, in seconds. */
const LOOK_AHEAD_SECONDS = 0.2

/** How close a scheduled click must fall to its beat, in seconds. */
const ON_THE_BEAT = 1e-6

/** How long to wait on the real audio clock, in milliseconds. */
const CLOCK_TIMEOUT_MS = 15_000

// @test-link [[rule_audio_unlocked_by_player_click]]
// @test-link [[rule_count_in_always_clicks]]
// @test-link [[rule_playhead_follows_audio_clock]]
// @test-link [[req_session_audio_mix]]
// @test-link [[rule_session_never_pauses]]
test('the Start click creates the one AudioContext, whose clock plans the count-in and never stops', async ({
  page,
}) => {
  await installAudioSpy(page)
  await gotoAudioHarness(page, 'real')

  expect(await isAudioUnlocked(page)).toBe(false)
  expect(await readAudioSpy(page)).toEqual({
    installed: true,
    constructions: 0,
    suspends: 0,
    closes: 0,
  })

  const { startAt, countInEndsAt } = await startAudio(page)
  expect(await readAudioSpy(page)).toMatchObject({ constructions: 1 })
  await expect
    .poll(() => audioNow(page), { timeout: CLOCK_TIMEOUT_MS })
    .toBeGreaterThan(countInEndsAt + 0.3)

  const countIn = (await scheduledClicks(page)).slice(0, 4)
  expect(countIn.map((click) => click.accent)).toEqual([true, false, false, false])
  countIn.forEach((click, k) => {
    expect(Math.abs(click.at - (startAt + k * BEAT_SECONDS))).toBeLessThanOrEqual(ON_THE_BEAT)
    expect(click.route).toBe('count-in')
    expect(click.scheduledAt).toBeLessThan(click.at)
    expect(click.at - click.scheduledAt).toBeLessThanOrEqual(LOOK_AHEAD_SECONDS + 1e-9)
  })

  await setClickOn(page, false)
  await setBackingOn(page, false)
  const mutedAt = await audioNow(page)
  await expect
    .poll(() => audioNow(page), { timeout: CLOCK_TIMEOUT_MS })
    .toBeGreaterThan(mutedAt + 0.3)
  await setClickOn(page, true)
  await setBackingOn(page, true)
  const unmutedAt = await audioNow(page)
  await expect
    .poll(() => audioNow(page), { timeout: CLOCK_TIMEOUT_MS })
    .toBeGreaterThan(unmutedAt + 0.1)

  expect(await readAudioSpy(page)).toEqual({
    installed: true,
    constructions: 1,
    suspends: 0,
    closes: 0,
  })

  await stopAudio(page)
  await startAudio(page)
  expect(await readAudioSpy(page)).toMatchObject({ constructions: 1, suspends: 0, closes: 0 })
})
