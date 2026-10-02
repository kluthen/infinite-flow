/**
 * v2.0 items 9 and 22, a session's start on screen at bp-tablet-landscape and up: the Start click
 * leaves focus on the session action, now `Stop`; the count-in shows in the cue row beat by beat,
 * each beat lit in time with its click on the (fake) audio clock, and the row empties after beat
 * 4; phrase 1's first measure is fully visible, and phrase 1 neither moves nor is engraved again
 * (phrase 2 fading in below is the rolling display's). A Stop during the count-in returns to Ready
 * with focus on `Start session`; a Stop once phrase 1 has sounded opens the last-session Review,
 * with focus on `Close review`. Runs against the workspace harness (port 4175).
 */
import { expect, test } from '@playwright/test'

import { advanceAudioTo, audioNow } from '../audio/audio-harness-helpers'
import {
  boxInside,
  countInClickTimes,
  cueRow,
  gotoSessionHarness,
  measureBoxes,
  readyToStart,
  sessionAction,
  sessionState,
  shownBeats,
  startSession,
  whollyInViewport,
} from './session-helpers'

/** The default tempo's beat, in seconds (90 BPM). */
const BEAT = 60 / 90

/** Past a scheduled time by a little more than one 25 ms wake-up step. */
const AFTER = 0.03

// @test-link [[rule_count_in_shown_on_screen]]
// @test-link [[rule_session_layout_fixed_at_start]]
// @test-link [[service_workspace_session_flow]]
test('the count-in lights beat by beat with its clicks, and phrase 1 never moves', async ({
  page,
}) => {
  await gotoSessionHarness(page)
  await readyToStart(page)
  const boxesBefore = await measureBoxes(page, 1)
  expect(boxesBefore.length).toBeGreaterThan(0)
  // Marks phrase 1's drawn systems: a redraw would replace them, dropping the mark.
  const phraseOneSvgs = page.locator('.staff-frame [data-phrase-number="1"] svg')
  await phraseOneSvgs.evaluateAll((svgs) => svgs.forEach((svg) => (svg.dataset.drawnAtIdle = '')))
  const phraseOneSystems = await phraseOneSvgs.count()

  await startSession(page)
  await expect(sessionAction(page)).toBeFocused()
  await expect(sessionAction(page)).toHaveClass(/btn-primary/)
  expect((await sessionState(page)).heldLayout).toBe('one-system')

  // Before the first click every beat is muted.
  const [firstClick] = await countInClickTimes(page)
  if (firstClick === undefined) throw new Error('the Start click scheduled no count-in click')
  expect(await audioNow(page)).toBeLessThan(firstClick)
  expect(await shownBeats(page)).toEqual(['muted', 'muted', 'muted', 'muted'])

  for (let beat = 0; beat < 4; beat += 1) {
    const clickAt = firstClick + beat * BEAT
    await advanceAudioTo(page, clickAt + AFTER)
    const clicks = await countInClickTimes(page)
    expect(clicks[beat]).toBeCloseTo(clickAt, 6)
    const expected = ['muted', 'muted', 'muted', 'muted'].map((_, k) => {
      if (k < beat) return 'past'
      return k === beat ? 'current' : 'muted'
    })
    expect(await shownBeats(page)).toEqual(expected)
  }

  // After beat 4 the row empties and phrase 1 runs.
  await advanceAudioTo(page, firstClick + 4 * BEAT + AFTER)
  await expect(cueRow(page).locator('.count-in')).toHaveCount(0)
  await expect(cueRow(page).locator('.session-alert')).toHaveCount(0)
  // The phone's compact Stop and Volume never show from bp-tablet-landscape up.
  await expect(cueRow(page).locator('.session-cue-actions')).toBeHidden()
  expect((await sessionState(page)).phase).toBe('running')

  const firstMeasure = page.locator('.staff-frame g.measure-slot[data-measure-index="0"]').first()
  expect(await whollyInViewport(firstMeasure)).toBe(true)
  expect(await boxInside(firstMeasure, page.locator('.staff-viewport'))).toBe(true)
  expect(await measureBoxes(page, 1)).toEqual(boxesBefore)
  expect(
    await phraseOneSvgs.evaluateAll((svgs) => svgs.map((svg) => 'drawnAtIdle' in svg.dataset)),
  ).toEqual(Array.from({ length: phraseOneSystems }, () => true))

  await sessionAction(page).click()
  expect((await sessionState(page)).phase).toBe('idle')
})

// @test-link [[rule_count_in_ending_returns_to_idle]]
// @test-link [[rule_stop_ends_session]]
test('Stop during the count-in returns to Ready, with focus on Start session', async ({ page }) => {
  await gotoSessionHarness(page)
  await readyToStart(page)
  await startSession(page)
  const [firstClick] = await countInClickTimes(page)
  await advanceAudioTo(page, (firstClick ?? 0) + BEAT + AFTER)

  await page.keyboard.press('Enter')

  await expect(sessionAction(page)).toHaveText('Start session')
  await expect(sessionAction(page)).toBeFocused()
  await expect(sessionAction(page)).toBeEnabled()
  await expect(cueRow(page)).toHaveText('')
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/)
  const state = await sessionState(page)
  expect(state.lastEnd).toEqual({ cause: 'stop', phase: 'count-in', soundedPhraseCount: 0 })
})

// @test-link [[rule_stop_ends_session]]
// @test-link [[req_last_session_review]]
test('Stop once phrase 1 has sounded opens the Review, with focus on Close review', async ({
  page,
}) => {
  await gotoSessionHarness(page)
  await readyToStart(page)
  await startSession(page)
  const [firstClick] = await countInClickTimes(page)
  await advanceAudioTo(page, (firstClick ?? 0) + 5 * BEAT)
  expect((await sessionState(page)).phase).toBe('running')

  await sessionAction(page).click()

  await expect(page.locator('.review-panel h2.review-title')).toHaveText('Last session')
  await expect(sessionAction(page)).toHaveText('Close review')
  await expect(sessionAction(page)).toBeEnabled()
  await expect(sessionAction(page)).toBeFocused()
  const phraseAction = page.locator('.header-actions > button:not(.session-action)')
  await expect(phraseAction).toBeDisabled()
  const state = await sessionState(page)
  expect(state.lastEnd).toEqual({ cause: 'stop', phase: 'running', soundedPhraseCount: 1 })
  expect(state.lastHistoryPhraseCount).toBe(1)
  expect(state.review).toEqual({ showing: true, phraseCount: 1 })
})

// @test-link [[service_workspace_session_flow]]
// @test-link [[req_landscape_phrase_workspace]]
test('a Start with the staff top scrolled out of view jumps once, instantly, to the workspace top', async ({
  page,
}) => {
  await gotoSessionHarness(page)
  await readyToStart(page)
  const staffTop = await page
    .locator('.staff-viewport')
    .evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
  await page.evaluate((y) => window.scrollTo({ top: y + 40, behavior: 'instant' }), staffTop)
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(staffTop)

  await startSession(page)

  const workspaceTop = await page
    .locator('.layout-app')
    .evaluate((el) => el.getBoundingClientRect().top)
  expect(workspaceTop).toBe(0)
  await expect(sessionAction(page)).toBeFocused()
  await sessionAction(page).click()
})
