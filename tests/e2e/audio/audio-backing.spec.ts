/**
 * The session backing on the workspace harness (port 4175): the harness generates a phrase, then
 * queues the shown phrase's harmony as the backing of the session's phrases. On the fake audio
 * clock (the default mode, where time moves only when the spec advances it, so every time is
 * exact) a count-in plus eight bars at 120 BPM checks where the backing falls, what muting it
 * changes, and that stop ends it; in real Chromium (`?audio=real`) a short run at 240 BPM checks
 * the backing lands on the real audio clock's beats.
 */
import { expect, test, type Page } from '@playwright/test'

import {
  BEAT_SECONDS,
  advanceAudio,
  advanceAudioTo,
  audibleBacking,
  audioEvents,
  audioNow,
  backingNotes,
  generateShownPhrase,
  gotoAudioHarness,
  installAudioSpy,
  mixDesign,
  queueBacking,
  readAudioSpy,
  scheduledClicks,
  setBackingOn,
  setBackingVolume,
  startAudio,
  stopAudio,
} from './audio-harness-helpers'

/** Two audio times this close are the same time. */
const SAME_TIME = 1e-9

/** The seed of the phrase every run generates, so the backing is the same run to run. */
const PHRASE_SEED = 42

/** The count-in's four beats, and a phrase's four measures of four beats. */
const COUNT_IN_BEATS = 4
const PHRASE_BEATS = 16

/** The count-in plus two phrases: eight measures. */
const RUN_BEATS = COUNT_IN_BEATS + 2 * PHRASE_BEATS

/**
 * Intent: generate the phrase, start a session at 120 BPM from the Start click and queue the
 * shown phrase as the backing of phrases 1 and 2; return the timeline and the queued harmony.
 */
async function startWithTwoPhrases(page: Page): Promise<{
  readonly startAt: number
  readonly countInEndsAt: number
  readonly harmony: readonly WorkspaceHarnessQueuedHarmonyEvent[]
}> {
  await gotoAudioHarness(page)
  await generateShownPhrase(page, PHRASE_SEED)
  const { startAt, countInEndsAt } = await startAudio(page)
  const harmony = await queueBacking(page, 1)
  expect(await queueBacking(page, 2)).toEqual(harmony)
  return { startAt, countInEndsAt, harmony }
}

/**
 * Intent: advance the fake clock until the run's last beat is past, with the look-ahead window
 * still short of the next beat, so exactly the run's clicks and backing are scheduled.
 */
async function playRun(page: Page, startAt: number): Promise<void> {
  await advanceAudioTo(page, startAt + (RUN_BEATS - 1) * BEAT_SECONDS + 0.1)
}

/** Intent: the triad's pitch classes of the harmony event sounding on beat `beat` of a phrase. */
function triadOnBeat(
  harmony: readonly WorkspaceHarnessQueuedHarmonyEvent[],
  beat: number,
): readonly number[] {
  const event = harmony.find((e) => {
    const from = e.barIndex * 4 + e.startBeat
    return from <= beat && beat < from + e.durationBeats
  })
  if (event === undefined) throw new Error(`no harmony event sounds on phrase beat ${beat}`)
  return event.pitchClasses
}

/** Intent: the voice, pitch and times of each scheduled note, for comparing runs. */
function noteTimes(notes: readonly WorkspaceHarnessBackingNote[]) {
  return notes.map(({ voice, pitch, at, until }) => ({ voice, pitch, at, until }))
}

// @test-link [[req_session_backing_track]]
test.describe('the backing of two phrases at 120 BPM', () => {
  // @test-link [[req_session_backing_track]]
  test('it starts exactly when the count-in ends, falls on the clicks and follows the shown harmony', async ({
    page,
  }) => {
    const { startAt, countInEndsAt, harmony } = await startWithTwoPhrases(page)
    await playRun(page, startAt)

    const notes = await backingNotes(page)
    const clickTimes = (await scheduledClicks(page)).map((click) => click.at)
    expect(clickTimes).toHaveLength(RUN_BEATS)
    expect(notes.every((note) => note.at >= countInEndsAt - SAME_TIME)).toBe(true)
    for (const voice of ['bass', 'chord'] as const) {
      const first = notes.find((note) => note.voice === voice)
      expect(Math.abs(first!.at - countInEndsAt)).toBeLessThanOrEqual(SAME_TIME)
    }
    for (const note of notes) {
      expect(clickTimes.some((at) => Math.abs(at - note.at) <= SAME_TIME)).toBe(true)
      expect(note.scheduledAt).toBeLessThanOrEqual(note.at)
    }

    const beatOf = (at: number) => Math.round((at - startAt) / BEAT_SECONDS)
    const bar8Starts = COUNT_IN_BEATS + 7 * 4
    const lastBeat = Math.max(...notes.map((note) => beatOf(note.at)))
    expect(lastBeat).toBeGreaterThanOrEqual(bar8Starts)
    expect(lastBeat).toBeLessThan(RUN_BEATS)
    for (const voice of ['bass', 'chord'] as const) {
      expect(notes.some((n) => n.voice === voice && beatOf(n.at) >= bar8Starts)).toBe(true)
    }
    for (const note of notes) {
      const phraseBeat = (beatOf(note.at) - COUNT_IN_BEATS) % PHRASE_BEATS
      expect(triadOnBeat(harmony, phraseBeat)).toContain(note.pitch % 12)
    }
  })

  // @test-link [[req_session_backing_track]]
  // @test-link [[req_session_audio_mix]]
  // @test-link [[rule_playhead_follows_audio_clock]]
  test('muting the backing changes what sounds, never when it is scheduled', async ({ page }) => {
    const { startAt } = await startWithTwoPhrases(page)
    await playRun(page, startAt)
    const unmuted = await backingNotes(page)
    const unmutedClicks = (await scheduledClicks(page)).map((click) => click.at)

    const { defaults } = await mixDesign(page)
    const { startAt: mutedRunStartAt } = await startWithTwoPhrases(page)
    const mutedFrom = 5.3
    const mutedUntil = 8.3
    await advanceAudioTo(page, mutedFrom)
    await setBackingOn(page, false)
    await advanceAudioTo(page, 6.3)
    await setBackingVolume(page, 0)
    await advanceAudioTo(page, 7.3)
    await setBackingOn(page, true)
    await advanceAudioTo(page, mutedUntil)
    await setBackingVolume(page, defaults.backingVolume)
    await playRun(page, mutedRunStartAt)

    expect(mutedRunStartAt).toBe(startAt)
    const muted = await backingNotes(page)
    expect(noteTimes(muted)).toEqual(noteTimes(unmuted))
    expect((await scheduledClicks(page)).map((click) => click.at)).toEqual(unmutedClicks)
    const expectedAudible = noteTimes(muted).filter(
      (note) => note.at < mutedFrom || note.at >= mutedUntil,
    )
    expect(expectedAudible.length).toBeGreaterThan(0)
    expect(expectedAudible.length).toBeLessThan(muted.length)
    expect(noteTimes(await audibleBacking(page))).toEqual(expectedAudible)
  })

  // @test-link [[req_session_backing_track]]
  // @test-link [[rule_stop_ends_session]]
  test('after stop no backing is scheduled, and none sounds from the fade on', async ({ page }) => {
    await startWithTwoPhrases(page)
    await advanceAudio(page, 4.3)
    const stopAt = await audioNow(page)
    const heardBeforeStop = (await audibleBacking(page)).length
    const scheduledBeforeStop = (await backingNotes(page)).length
    expect(heardBeforeStop).toBeGreaterThan(0)

    const { fadeEndsAt } = await stopAudio(page)
    await advanceAudio(page, 3)

    const fades = (await audioEvents(page)).filter((event) => event.kind === 'fade')
    expect(fades).toEqual([
      { kind: 'fade', bus: 1, at: stopAt, duration: 0.1, scheduledAt: stopAt },
    ])
    expect(Math.abs(fadeEndsAt - (stopAt + 0.1))).toBeLessThanOrEqual(SAME_TIME)
    const notes = await backingNotes(page)
    expect(notes).toHaveLength(scheduledBeforeStop)
    expect(notes.every((note) => note.scheduledAt <= stopAt)).toBe(true)
    expect((await audibleBacking(page)).filter((note) => note.at >= stopAt)).toEqual([])
    expect(await audibleBacking(page)).toHaveLength(heardBeforeStop)
  })
})

/** The real run's tempo and beat length: fast, so a count-in plus a bar takes two seconds. */
const REAL_TEMPO = 240
const REAL_BEAT_SECONDS = 60 / REAL_TEMPO

/** How far ahead of the audio clock the transport plans sound, in seconds. */
const LOOK_AHEAD_SECONDS = 0.2

/** How close a scheduled note must fall to its beat on the real clock, in seconds. */
const ON_THE_BEAT = 1e-6

// @test-link [[req_session_backing_track]]
// @test-link [[rule_audio_unlocked_by_player_click]]
test('in real Chromium the backing is planned on the audio clock at the beats, after the one Start click', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await installAudioSpy(page)
  await gotoAudioHarness(page, 'real')
  await generateShownPhrase(page, PHRASE_SEED)
  expect(await readAudioSpy(page)).toMatchObject({ installed: true, constructions: 0 })

  const { startAt, countInEndsAt } = await startAudio(page, REAL_TEMPO)
  await queueBacking(page, 1)
  expect(await readAudioSpy(page)).toMatchObject({ constructions: 1 })
  const oneBarIn = countInEndsAt + 4 * REAL_BEAT_SECONDS
  await expect.poll(() => audioNow(page), { timeout: 15_000 }).toBeGreaterThan(oneBarIn)

  const notes = await backingNotes(page)
  expect(notes.some((note) => note.voice === 'bass')).toBe(true)
  expect(notes.some((note) => note.voice === 'chord')).toBe(true)
  expect(Math.abs(notes[0]!.at - countInEndsAt)).toBeLessThanOrEqual(ON_THE_BEAT)
  for (const note of notes) {
    const beat = Math.round((note.at - startAt) / REAL_BEAT_SECONDS)
    expect(beat).toBeGreaterThanOrEqual(4)
    expect(Math.abs(note.at - (startAt + beat * REAL_BEAT_SECONDS))).toBeLessThanOrEqual(
      ON_THE_BEAT,
    )
    expect(note.scheduledAt).toBeLessThanOrEqual(note.at)
    expect(note.at - note.scheduledAt).toBeLessThanOrEqual(LOOK_AHEAD_SECONDS + 1e-9)
  }

  await stopAudio(page)
  expect(pageErrors).toEqual([])
})
