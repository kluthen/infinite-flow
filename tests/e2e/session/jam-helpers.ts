/**
 * Shared helpers for the fresh-Jam specs (v3.2 chunk 21b), on the workspace harness's fake audio
 * clock and fake MIDI access: Jam mode at Idle with the keyboard connected, a fresh Jam started by
 * `Start Jam` or by the home note, its barlines on the audio clock, a doodle played on them, the
 * wait for phrase 1's attempt to be answered, what the cue row shows, the doodle's numbers in
 * `jam-capture`, Jam's staff, room notice and `jam-notice`, `doodle-readings`, and Jam mode's Idle
 * as an end before phrase 1 leaves it.
 */
import { expect, type Locator, type Page } from '@playwright/test'

import { KEYS, gotoControllerHarness } from '../controller/controller-helpers'
import { reviewPanel } from '../review/review-helpers'
import { expectChecked, jamFrame, modeSegment, scoreTitle } from '../workspace/jam-mode-helpers'
import {
  BEAT,
  DESKTOP,
  cueRow,
  sessionAction,
  sessionState,
  sessionTimeline,
} from './session-helpers'
import { clockTo, connectDevice, noteOff, noteOn, startLine } from './session-midi-helpers'

/**
 * The home note of the first visit's Jam (C Ionian on the tenor saxophone): written C5, sounding
 * B♭3, concert MIDI 58.
 */
export const HOME_NOTE = 58

/** `jam-notice`'s sentence. */
export const JAM_NOTICE_TEXT =
  "The app couldn't continue your doodle with these settings. Try again, or change a setting."

/** Past a barline by more than the time a note takes to count (38 ms), and a wake-up step. */
export const PAST_BARLINE = 0.06

/** A window size. */
export interface Size {
  readonly width: number
  readonly height: number
}

/**
 * Intent: land on the harness at `size` (pre-generation off), the keyboard connected, press `Jam`
 * and wait until Jam mode's Idle shows with `Start Jam` enabled.
 */
export async function gotoJamIdle(page: Page, size: Size = DESKTOP): Promise<void> {
  await gotoControllerHarness(page, { query: { pregeneration: 'off' }, size })
  await connectDevice(page, KEYS)
  await modeSegment(page, 'Jam').click()
  await expectChecked(page, 'Jam')
  await expect(jamFrame(page)).toBeVisible()
  await expect(sessionAction(page)).toHaveText('Start Jam')
  await expect(sessionAction(page)).toBeEnabled()
}

/** Intent: click `Start Jam` and wait until the Jam's count-in runs. */
export async function startJamByClick(page: Page): Promise<void> {
  await expect(sessionAction(page)).toHaveText('Start Jam')
  await sessionAction(page).click()
  await expect(sessionAction(page)).toHaveText('Stop')
  expect((await sessionState(page)).phase).toBe('count-in')
}

/** Intent: play the home note (on, then off) now, and wait until the Jam's count-in runs. */
export async function startJamByHomeNote(page: Page): Promise<void> {
  await expect(startLine(page)).toHaveText('Play this note to start: C5')
  const at = await noteOn(page, KEYS, HOME_NOTE)
  await noteOff(page, KEYS, HOME_NOTE, at)
  await expect(sessionAction(page)).toHaveText('Stop')
  expect((await sessionState(page)).phase).toBe('count-in')
}

/**
 * A fresh Jam's grid on the audio clock: its count-in's first click, its beat, and barline `k`'s
 * time (barline 0 ends the count-in).
 */
export interface JamGrid {
  readonly startAt: number
  readonly beat: number
  readonly barline: (measure: number) => number
}

/**
 * Intent: the running Jam's grid: its start read from its count-in clicks (the first after the
 * last fade, an earlier session's end), its beat from the session's tempo, Jam's.
 */
export async function jamGrid(page: Page): Promise<JamGrid> {
  const { startAt } = await sessionTimeline(page)
  const tempo = (await sessionState(page)).sessionTempo
  if (tempo === null) throw new Error('no Jam runs')
  const beat = 60 / tempo
  return { startAt, beat, barline: (measure) => startAt + (4 + 4 * measure) * beat }
}

/** Intent: play one doodle note of `pitch` on the keyboard at `at`, held for half a beat. */
export async function doodleNote(page: Page, pitch: number, at: number): Promise<void> {
  await clockTo(page, at)
  await noteOn(page, KEYS, pitch)
  await clockTo(page, at + BEAT / 2)
  await noteOff(page, KEYS, pitch)
}

/** Concert pitches of the doodle's notes, one a measure: B♭3, C4, D4, E♭4 (in B♭ major). */
const DOODLE_PITCHES = [58, 60, 62, 63] as const

/** Intent: play a doodle of `measures` measures (1 to 4), one beat-long note on each barline. */
export async function playDoodle(page: Page, grid: JamGrid, measures: number): Promise<void> {
  for (let measure = 0; measure < measures; measure += 1) {
    await doodleNote(page, DOODLE_PITCHES[measure]!, grid.barline(measure) + 0.01)
  }
}

/**
 * Intent: wait until phrase 1's attempts have settled with one answered by a phrase: requests
 * made, none pending, one with a timeline.
 */
export async function untilPhraseOneAnswered(page: Page): Promise<void> {
  await expect
    .poll(
      async () => {
        const requests = await page.evaluate(() => window.__workspaceHarness.generationRequests())
        return (
          requests.length > 0 &&
          requests.every((request) => request.settled !== 'pending') &&
          requests.some((request) => request.timeline !== null)
        )
      },
      { timeout: 30_000 },
    )
    .toBe(true)
}

/** Intent: wait until every phrase 1 attempt made so far has settled (answered or cancelled). */
export async function untilAttemptsSettled(page: Page): Promise<void> {
  await expect
    .poll(
      async () => {
        const requests = await page.evaluate(() => window.__workspaceHarness.generationRequests())
        return requests.length > 0 && requests.every((request) => request.settled !== 'pending')
      },
      { timeout: 30_000 },
    )
    .toBe(true)
}

/**
 * Intent: from a fresh Jam's count-in, play a one-measure doodle, let phrase 1 be written in the
 * generation measure, and move the clock one second into phrase 1 (barline 3): Session running.
 */
export async function jamToRunning(page: Page): Promise<JamGrid> {
  const grid = await jamGrid(page)
  await playDoodle(page, grid, 1)
  await clockTo(page, grid.barline(1) + PAST_BARLINE)
  await untilPhraseOneAnswered(page)
  await clockTo(page, grid.barline(3) + 1)
  expect((await sessionState(page)).phase).toBe('running')
  return grid
}

/** What the cue row shows first: a count-in, a part of Jam's, a line, or none of them. */
export type CueShown =
  'count-in' | 'jam-capture' | 'jam-writing' | 'start-line' | 'needs-controller' | 'none'

/** Intent: what the cue row shows now, by the part it holds before its actions. */
export function cueShown(page: Page): Promise<CueShown> {
  return cueRow(page).evaluate((row): CueShown => {
    if (row.querySelector(':scope > ol.count-in') !== null) return 'count-in'
    if (row.querySelector(':scope > .jam-capture') !== null) return 'jam-capture'
    if (row.querySelector(':scope > .jam-writing') !== null) return 'jam-writing'
    if (row.querySelector(':scope > .start-note-line') !== null) return 'start-line'
    if (row.querySelector(':scope > .jam-needs-controller') !== null) return 'needs-controller'
    return 'none'
  })
}

/** Intent: how `jam-capture`'s four numbers show: `current`, `past` or `unlit`. */
export function captureNumbers(page: Page): Promise<string[]> {
  return cueRow(page)
    .locator('.jam-capture ol.count-in > li.count-in-beat')
    .evaluateAll((items) =>
      items.map((item) => {
        if (item.classList.contains('is-current')) return 'current'
        return item.classList.contains('is-past') ? 'past' : 'unlit'
      }),
    )
}

/** Intent: `doodle-readings`, Jam's controls' "From your doodle" list. */
export function doodleReadings(page: Page): Locator {
  return page.locator('dl.doodle-readings')
}

/** Intent: Jam's staff's `jam-notice`. */
export function jamStaffNotice(page: Page): Locator {
  return page.locator('.staff-frame.staff-jam p#jam-notice.inline-alert.alert-notice.jam-notice')
}

/** Intent: Jam's staff's room notice, Needs more room (session mode's staff is out of sight). */
export function jamRoomNotice(page: Page): Locator {
  return page.locator(
    '.score-panel .staff-viewport:not(.is-out-of-sight) > .staff-frame.staff-no-room p.room-notice',
  )
}

/**
 * Intent: assert Jam mode's Idle as an end before phrase 1 leaves it: the session over with
 * `cause` in the count-in phase and nothing sounded, `Jam` still checked, Jam's empty system back,
 * no review, nothing kept or saved, no phrase.
 */
export async function expectJamIdleAfter(
  page: Page,
  cause: WorkspaceHarnessSessionEndCause,
): Promise<void> {
  await expect.poll(async () => (await sessionState(page)).phase).toBe('idle')
  const state = await sessionState(page)
  expect(state.lastEnd).toEqual({ cause, phase: 'count-in', soundedPhraseCount: 0 })
  expect(state.review).toBeNull()
  expect(state.mostRecent).toBeNull()
  expect(await page.evaluate(() => window.__workspaceHarness.audio.isRunning())).toBe(false)
  await expectChecked(page, 'Jam')
  await expect(scoreTitle(page)).toHaveText('Jam')
  await expect(reviewPanel(page)).toHaveCount(0)
  expect(await page.evaluate(() => window.__workspaceHarness.snapshot().timeline)).toBeNull()
  expect(
    await page.evaluate(() => window.__workspaceHarness.storage.records('sessionSummaries')),
  ).toEqual([])
}
