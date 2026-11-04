/**
 * v3.2 chunk 24, the kept doodle round twice (flows/jam/handoff.md, The Kept Doodle and Routing
 * Rules), on the workspace harness (port 4175: fake audio clock, fake MIDI, real generations, the
 * browser's real IndexedDB). A fresh Jam on a one-measure doodle is Stopped once phrase 1 sounds:
 * its Review shows the doodle; `Close review` leaves Jam mode's Idle with the doodle kept, phrase 1
 * written from it on Jam's own staff, `jam-bar` and its sentence, `doodle-readings` filled and the
 * start marker on phrase 1's first note. `Start Jam` then runs a Jam on the kept doodle: the
 * count-in, then that phrase 1, with no capture and no writing measure, `jam-bar` held still. Its
 * Review shows the kept doodle with an empty played-notes lane; closed, a new phrase 1 (a fresh
 * seed) is written from the doodle, and a second Jam started by phrase 1's first note keeps it
 * still, its save replacing the earlier unpinned session. A Jam setting changed at Idle writes
 * phrase 1 again through Loading, the tempo does not, and a Jam never meets the out-of-date
 * phrase prompt. A Jam on the kept doodle Stopped in its count-in shows the same phrase 1 again.
 */
import { expect, test, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import { playedNotesToggle, reviewPanel, reviewTitle } from '../review/review-helpers'
import { untilKept } from '../review/review-tools-helpers'
import {
  PAST_BARLINE,
  cueShown,
  doodleReadings,
  gotoJamIdle,
  jamGrid,
  startJamByClick,
} from '../session/jam-helpers'
import { sessionAction, sessionState } from '../session/session-helpers'
import {
  KEYS,
  clockTo,
  noteOff,
  noteOn,
  phraseStartsAt,
  startLine,
} from '../session/session-midi-helpers'
import { jamFrame } from './jam-mode-helpers'
import {
  KEPT_SENTENCE,
  closeReview,
  freshJamReviewed,
  generationCount,
  jamBar,
  jamBarSentence,
  jamViewport,
  keptFrame,
  keptPhraseOneSince,
  markerOverNote,
  newDoodleButton,
  phraseOneCallsSince,
  reviewDoodle,
  untilKeptPhraseOneReady,
  type KeptPhraseOne,
} from './kept-doodle-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: the out-of-date phrase prompt, which a Jam never meets. */
function stalePrompt(page: Page) {
  return page.getByRole('alertdialog', { name: 'This phrase is from before your changes' })
}

/** Intent: the segment `option` of the radiogroup named exactly `group`. */
function segment(page: Page, group: string, option: string) {
  return page
    .getByRole('radiogroup', { name: group, exact: true })
    .getByRole('radio', { name: option, exact: true })
}

/**
 * Intent: assert Jam mode's Idle with a doodle kept: `jam-bar` with its sentence and `New doodle`,
 * Jam's empty system out of sight, phrase 1 Ready on the kept staff with the start marker over its
 * first note and the starting line, `doodle-readings` filled.
 */
async function expectKeptIdle(page: Page, phraseOne: KeptPhraseOne): Promise<void> {
  await expect(jamBar(page)).toBeVisible()
  await expect(jamBarSentence(page)).toHaveText(KEPT_SENTENCE)
  await expect(newDoodleButton(page)).toBeEnabled()
  await expect(jamViewport(page)).toHaveClass(/is-out-of-sight/)
  await expect(keptFrame(page)).toHaveClass(/staff-ready/)
  await expect(keptFrame(page).locator('.start-note-marker')).toHaveCount(1)
  expect(await markerOverNote(page, phraseOne.first), 'the marker over the first note').toBe(true)
  await expect(startLine(page)).toHaveText(/Play this note to start: \S+$/u)
  await expect(doodleReadings(page)).toBeVisible()
  expect((await sessionState(page)).phase).toBe('idle')
}

/**
 * Intent: from Jam mode's Idle with a doodle kept and a Jam on it just started, assert the
 * count-in runs with no capture, then phrase 1 sounds on the count-in's last barline with the
 * session's own cue row, `jam-bar` held still; the clock left one second into phrase 1.
 */
async function expectNoCaptureThenPhraseOne(page: Page): Promise<number> {
  const grid = await jamGrid(page)
  for (let beat = 0; beat < 4; beat += 1) {
    await clockTo(page, grid.startAt + beat * grid.beat + 0.03)
    expect(await cueShown(page), `count-in beat ${beat + 1}`).toBe('count-in')
  }
  await expect(jamBarSentence(page)).toHaveText(KEPT_SENTENCE)
  await expect(newDoodleButton(page)).toBeDisabled()

  await clockTo(page, grid.barline(0) + PAST_BARLINE)
  const state = await sessionState(page)
  expect(state.phase).toBe('running')
  expect(state.systems.top).toBe('1:whole')
  expect(await cueShown(page), 'no jam-capture, no jam-writing').toBe('none')
  expect(await phraseStartsAt(page, 1)).toBeCloseTo(grid.barline(0), 6)
  await clockTo(page, grid.barline(0) + 1)
  await expect(jamBarSentence(page)).toHaveText(KEPT_SENTENCE)
  await expect(newDoodleButton(page)).toBeDisabled()
  return grid.barline(0)
}

/** Intent: the concert timeline of the last ended session's phrase 1. */
async function lastSessionPhraseOne(page: Page): Promise<string | undefined> {
  return (await sessionState(page)).lastHistoryPhrases?.[0]?.timeline
}

// @test-link [[rule_held_doodle_phrase_one_at_idle]]
// @test-link [[rule_jam_on_held_doodle_skips_capture]]
// @test-link [[rule_held_doodle_dropped_on_change]]
test('round twice on one doodle: kept at Idle, a Jam on it with no capture, kept again after its end', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await gotoJamIdle(page)
  await expect(jamBar(page)).toHaveCount(0)

  // A fresh Jam: its Review shows the doodle; out of sight, phrase 1 is written from it.
  let from = await generationCount(page)
  await freshJamReviewed(page)
  await expect(reviewDoodle(page)).toHaveCount(1)
  await expect(jamBar(page)).toBeHidden()
  await closeReview(page)
  const one = await keptPhraseOneSince(page, from)
  await expectKeptIdle(page, one)
  const [firstSession] = await untilKept(page, 1)

  // A Jam on it: no capture; phrase 1 is the one shown at Idle.
  await startJamByClick(page)
  const phraseOneAt = await expectNoCaptureThenPhraseOne(page)
  // A note played in phrase 1, so the Review has played notes to show.
  await noteOn(page, KEYS, 60, { at: phraseOneAt + 1 })
  await clockTo(page, phraseOneAt + 1.3)
  await noteOff(page, KEYS, 60)
  from = await generationCount(page)
  await sessionAction(page).click()
  await expect(reviewTitle(page)).toBeVisible()
  expect(await lastSessionPhraseOne(page)).toBe(one.timeline)

  // Its Review shows the kept doodle, with no played doodle note in its lane.
  await expect(reviewDoodle(page)).toHaveCount(1)
  await expect(reviewDoodle(page).locator('[data-system-position="top"] svg')).toHaveAttribute(
    'aria-label',
    /one measure\.$/u,
    { timeout: 30_000 },
  )
  await playedNotesToggle(page).click()
  const lane = reviewDoodle(page).locator('.review-staff > .played-notes-lane')
  await expect(lane).toHaveCount(1)
  await expect(lane.locator('.played-note')).toHaveCount(0)
  await expect(reviewPanel(page).locator('.played-notes-lane .played-note')).toHaveCount(1)

  // Closed: a new phrase 1 from the same doodle, with a fresh seed.
  await closeReview(page)
  const two = await keptPhraseOneSince(page, from)
  expect(two.seed).not.toBe(one.seed)
  await expectKeptIdle(page, two)
  const [secondSession] = await untilKept(page, 1)
  expect(secondSession).not.toBe(firstSession)

  // A second Jam on it, started by phrase 1's first note: kept still after its end.
  const at = await noteOn(page, KEYS, two.first.pitch)
  await noteOff(page, KEYS, two.first.pitch, at)
  await expect(sessionAction(page)).toHaveText('Stop')
  await expectNoCaptureThenPhraseOne(page)
  from = await generationCount(page)
  await sessionAction(page).click()
  await expect(reviewTitle(page)).toBeVisible()
  expect(await lastSessionPhraseOne(page)).toBe(two.timeline)
  await closeReview(page)
  const [thirdSession] = await untilKept(page, 1)
  expect(thirdSession).not.toBe(secondSession)
  await expectKeptIdle(page, await keptPhraseOneSince(page, from))
})

// @test-link [[rule_jam_setting_change_rewrites_kept_phrase_one]]
test('a Jam setting changed at Idle writes phrase 1 again through Loading; the tempo does not; no out-of-date prompt', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await gotoJamIdle(page)
  await freshJamReviewed(page)
  await closeReview(page)

  for (const [group, option] of [
    ['Drift', 'Close'],
    ['Written key', 'D'],
  ] as const) {
    const before = await keptPhraseOneSince(page, 0)
    const from = await generationCount(page)
    await page.evaluate(() => window.__workspaceHarness.holdGeneration())
    await segment(page, group, option).click()
    await expect(keptFrame(page), `${group} ${option}: Loading`).toHaveClass(/staff-loading/)
    await expect(newDoodleButton(page)).toBeDisabled()
    await expect(jamBar(page)).toBeVisible()
    await page.evaluate(() => window.__workspaceHarness.releaseGeneration())
    await untilKeptPhraseOneReady(page)
    const after = await keptPhraseOneSince(page, from)
    expect(after.seed, `${group} ${option}: a fresh seed`).not.toBe(before.seed)
    await expectKeptIdle(page, after)
  }

  // The tempo rewrites nothing: the Jam plays the phrase 1 shown, at the new tempo.
  const shown = await keptPhraseOneSince(page, 0)
  const from = await generationCount(page)
  const tempo = page.getByRole('spinbutton', { name: 'Tempo' })
  const bpm = Number(await tempo.getAttribute('aria-valuenow'))
  await tempo.press('ArrowUp')
  await expect(tempo).not.toHaveAttribute('aria-valuenow', String(bpm))
  const raised = Number(await tempo.getAttribute('aria-valuenow'))
  expect(raised).toBeGreaterThan(bpm)
  await expect(keptFrame(page)).toHaveClass(/staff-ready/)
  expect(await phraseOneCallsSince(page, from)).toBe(0)

  await startJamByClick(page)
  await expect(stalePrompt(page)).toHaveCount(0)
  expect((await sessionState(page)).sessionTempo).toBe(raised)
  await expectNoCaptureThenPhraseOne(page)
  await sessionAction(page).click()
  await expect(reviewTitle(page)).toBeVisible()
  expect(await lastSessionPhraseOne(page)).toBe(shown.timeline)
  await expect(stalePrompt(page)).toHaveCount(0)
})

// @test-link [[rule_jam_on_held_doodle_skips_capture]]
// @test-link [[rule_held_doodle_dropped_on_change]]
test('a Jam on the kept doodle Stopped in its count-in: the same phrase 1 shows again, the doodle kept', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoJamIdle(page)
  await freshJamReviewed(page)
  await closeReview(page)
  const shown = await keptPhraseOneSince(page, 0)
  const line = await startLine(page).textContent()
  const from = await generationCount(page)

  await startJamByClick(page)
  const grid = await jamGrid(page)
  await clockTo(page, grid.startAt + 2 * grid.beat)
  expect(await cueShown(page)).toBe('count-in')
  await sessionAction(page).click()

  await expect.poll(async () => (await sessionState(page)).phase).toBe('idle')
  const state = await sessionState(page)
  expect(state.lastEnd).toEqual({ cause: 'stop', phase: 'count-in', soundedPhraseCount: 0 })
  await expect(reviewPanel(page)).toHaveCount(0)
  await untilKeptPhraseOneReady(page)
  await expect(sessionAction(page)).toBeFocused()
  expect(await phraseOneCallsSince(page, from), 'phrase 1 not written again').toBe(0)
  await expectKeptIdle(page, shown)
  await expect(startLine(page)).toHaveText(line ?? '')
  await expect(jamFrame(page)).toBeHidden()
})
