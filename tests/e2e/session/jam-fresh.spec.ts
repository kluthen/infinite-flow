/**
 * v3.2 chunk 21b: a fresh Jam on screen, from Jam mode's Idle (no doodle kept) to Session running,
 * on the workspace harness (port 4175: fake audio clock, fake MIDI, real generations). A click of
 * `Start Jam` and the home note each start one: one measure of count-in, the doodle's capture
 * (`jam-capture`, its numbers lighting on the audio clock), `jam-writing` in the generation
 * measure, the read-in measure counted in while `staff-jam` fades out and phrase 1 enters the
 * session staff, then Session running with the session's own cue row. Nothing of the doodle is
 * drawn during the capture; the click sounds from the count-in to the read-in's end with `Click`
 * off, and no backing sounds before phrase 1; `doodle-readings` fills as phrase 1 enters. The mode
 * stays Jam throughout, and the start's jump leaves Jam's staff in view.
 */
import { expect, test, type Page } from '@playwright/test'

import {
  audibleBacking,
  audibleClicks,
  audioEvents,
  audioNow,
} from '../audio/audio-harness-helpers'
import { watchPageErrors } from '../controller/controller-helpers'
import { expectChecked, jamFrame, modeSwitch, scoreTitle } from '../workspace/jam-mode-helpers'
import {
  PAST_BARLINE,
  captureNumbers,
  cueShown,
  doodleReadings,
  gotoJamIdle,
  jamGrid,
  jamToRunning,
  playDoodle,
  startJamByClick,
  startJamByHomeNote,
  untilPhraseOneAnswered,
  type JamGrid,
} from './jam-helpers'
import {
  cueRow,
  sessionAction,
  sessionState,
  shownBeats,
  whollyInViewport,
} from './session-helpers'
import { KEYS, clockTo, noteOff, noteOn, phraseStartsAt } from './session-midi-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Past a count-in click by a little more than one 25 ms wake-up step. */
const PAST_CLICK = 0.03

/** Past a doodle note played 10 ms after its barline, once it counts (38 ms) and wakes the Jam. */
const PAST_NOTE = 0.1

/** The seven controls `doodle-readings` names, in order. */
const READING_NAMES = [
  'Note density',
  'Rhythmic variety',
  'Syncopation',
  'Silence density',
  'Contour',
  'Leapiness',
  'Register',
]

/** Intent: the beats a count-in row shows with beat `current` (0-3) lit, the earlier ones past. */
function beatsAt(current: number): string[] {
  return [0, 1, 2, 3].map((k) => {
    if (k < current) return 'past'
    return k === current ? 'current' : 'muted'
  })
}

/** Intent: the doodle's numbers with measure `current` (0-3) lit, the earlier ones past. */
function numbersAt(current: number): string[] {
  return [0, 1, 2, 3].map((k) => {
    if (k < current) return 'past'
    return k === current ? 'current' : 'unlit'
  })
}

/** Intent: assert a count-in row lights beat by beat on its clicks from `firstClickAt`. */
async function expectCountInLights(page: Page, firstClickAt: number, beat: number): Promise<void> {
  for (let k = 0; k < 4; k += 1) {
    await clockTo(page, firstClickAt + k * beat + PAST_CLICK)
    expect(await cueShown(page), `beat ${k + 1}`).toBe('count-in')
    expect(await shownBeats(page), `beat ${k + 1}`).toEqual(beatsAt(k))
  }
}

/** Intent: assert the mode switch shows Jam checked and read-only, under the score title `Jam`. */
async function expectStillJam(page: Page, when: string): Promise<void> {
  await expectChecked(page, 'Jam')
  await expect(modeSwitch(page), when).toHaveAttribute('aria-readonly', 'true')
  await expect(scoreTitle(page), when).toHaveText('Jam')
}

// @test-link [[req_jam]]
// @test-link [[rule_jam_runs_as_session_from_phrase_one]]
test.describe('a fresh Jam reaches Session running', () => {
  for (const start of ['Start Jam', 'the home note'] as const) {
    // @test-link [[rule_jam_start_conditions]]
    // @test-link [[rule_jam_starting_note_is_home_note]]
    // @test-link [[rule_jam_runs_as_session_from_phrase_one]]
    test(`started by ${start}: count-in, doodle, phrase 1 on the session staff, then running`, async ({
      page,
    }) => {
      await gotoJamIdle(page)

      if (start === 'Start Jam') await startJamByClick(page)
      else await startJamByHomeNote(page)
      expect((await sessionState(page)).sessionHasController).toBe(true)
      await jamToRunning(page)

      const state = await sessionState(page)
      expect(state.phase).toBe('running')
      expect(state.lastEnd).toBeNull()
      expect(state.systems.top).toBe('1:whole')
      expect(await phraseStartsAt(page, 1)).toBeLessThan(await audioNow(page))
      await expect(sessionAction(page)).toHaveText('Stop')
      expect(await cueShown(page), "the session's own cue row").toBe('none')
      await expectStillJam(page, 'Session running')
    })
  }
})

// @test-link [[req_jam]]
// @test-link [[rule_count_in_shown_on_screen]]
test("the cue row: count-in, the doodle's numbers on the clock, writing, read-in counted in, then the session's", async ({
  page,
}) => {
  await gotoJamIdle(page)
  await startJamByClick(page)
  const grid = await jamGrid(page)

  expect(await cueShown(page)).toBe('count-in')
  expect(await shownBeats(page)).toEqual(['muted', 'muted', 'muted', 'muted'])
  await expectCountInLights(page, grid.startAt, grid.beat)

  await clockTo(page, grid.barline(0) + PAST_BARLINE)
  expect(await cueShown(page)).toBe('jam-capture')
  await expect(cueRow(page).locator('.jam-capture .cue-label-wide')).toHaveText('Your doodle')
  await expect(cueRow(page).locator('.jam-capture li')).toHaveText(['1', '2', '3', '4'])
  expect(await captureNumbers(page), 'unlit before the first note').toEqual(numbersAt(-1))

  // Four measures, one note on each barline: 1 lights at the first note, the others at theirs.
  const pitches = [58, 60, 62, 63]
  for (let measure = 0; measure < 4; measure += 1) {
    if (measure > 0) {
      await clockTo(page, grid.barline(measure) - 0.05)
      expect(await captureNumbers(page), `before barline ${measure}`).toEqual(
        numbersAt(measure - 1),
      )
    }
    await clockTo(page, grid.barline(measure) + 0.01)
    await noteOn(page, KEYS, pitches[measure]!)
    await clockTo(page, grid.barline(measure) + PAST_NOTE)
    expect(await cueShown(page)).toBe('jam-capture')
    expect(await captureNumbers(page), `measure ${measure + 1}`).toEqual(numbersAt(measure))
    await clockTo(page, grid.barline(measure) + grid.beat)
    await noteOff(page, KEYS, pitches[measure]!)
  }

  // The doodle ends by length at barline 4: the generation measure.
  await clockTo(page, grid.barline(4) + PAST_BARLINE)
  expect(await cueShown(page)).toBe('jam-writing')
  await expect(cueRow(page).locator('.jam-writing .cue-label-wide')).toHaveText(
    'Writing your first phrase',
  )
  await untilPhraseOneAnswered(page)
  await clockTo(page, grid.barline(5) - 0.05)
  expect(await cueShown(page)).toBe('jam-writing')

  // The read-in measure, counted in on its clicks, then phrase 1 sounds.
  await expectCountInLights(page, grid.barline(5), grid.beat)
  await clockTo(page, grid.barline(6) + PAST_BARLINE)
  expect(await cueShown(page)).toBe('none')
  expect((await sessionState(page)).phase).toBe('running')
  await expect(sessionAction(page)).toHaveText('Stop')
})

/** What the staff area holds that a doodle note, a playhead or a mark could change. */
async function staffArea(page: Page): Promise<unknown> {
  const state = await sessionState(page)
  return {
    jamStaff: await jamFrame(page).innerHTML(),
    marks: await page
      .locator('.score-panel')
      .locator('.note-ack, .playhead-band, .start-note-marker, [data-note-id]')
      .count(),
    systems: state.systems,
    playhead: state.playhead,
    acknowledged: state.acknowledged,
    engravings: await page.evaluate(() => window.__workspaceHarness.engravings()),
  }
}

// @test-link [[rule_jam_live_view_never_shows_doodle]]
test('nothing of the doodle is drawn on the staff during the capture', async ({ page }) => {
  await gotoJamIdle(page)
  const atIdle = await staffArea(page)
  await startJamByClick(page)
  const grid = await jamGrid(page)
  expect(await staffArea(page), 'in the count-in').toEqual(atIdle)

  for (let measure = 0; measure < 3; measure += 1) {
    await clockTo(page, grid.barline(measure) + 0.01)
    await noteOn(page, KEYS, 60 + 2 * measure)
    await clockTo(page, grid.barline(measure) + grid.beat / 2)
    expect(await staffArea(page), `a note held in measure ${measure + 1}`).toEqual(atIdle)
    await noteOff(page, KEYS, 60 + 2 * measure)
    expect(await staffArea(page), `after measure ${measure + 1}'s note`).toEqual(atIdle)
  }
  await clockTo(page, grid.barline(3) + PAST_BARLINE)
  expect(await cueShown(page)).toBe('jam-writing')
  expect(await staffArea(page), 'at the doodle end').toEqual(atIdle)
  await expect(page.locator('.score-panel .is-fading-out')).toHaveCount(0)
})

/** Intent: the beat times from the Jam's first click up to (not including) phrase 1's start. */
function beatsBefore(grid: JamGrid, phraseOneAt: number): number[] {
  const beats: number[] = []
  for (let at = grid.startAt; at < phraseOneAt - 1e-6; at += grid.beat) beats.push(at)
  return beats
}

// @test-link [[rule_jam_click_runs_until_phrase_one]]
// @test-link [[rule_jam_no_backing_before_phrase_one]]
test('with Click off the click sounds from the count-in to the read-in end; no backing before phrase 1', async ({
  page,
}) => {
  await gotoJamIdle(page)
  const clickToggle = page.locator('.score-toolbar').getByRole('button', { name: 'Click' })
  await clickToggle.click()
  await expect(clickToggle).toHaveAttribute('aria-pressed', 'false')
  await startJamByClick(page)
  const grid = await jamToRunning(page)
  const phraseOneAt = await phraseStartsAt(page, 1)
  // A one-measure doodle: count-in, the doodle, the generation measure, the read-in.
  expect(phraseOneAt).toBeCloseTo(grid.barline(3), 6)

  const audible = (await audibleClicks(page)).map((click) => click.at)
  const expected = beatsBefore(grid, phraseOneAt)
  expect(expected).toHaveLength(16)
  expect(audible.filter((at) => at < phraseOneAt - 1e-6)).toHaveLength(expected.length)
  expected.forEach((at, k) => expect(audible[k]).toBeCloseTo(at, 6))
  expect(
    audible.filter((at) => at >= phraseOneAt - 1e-6),
    'Click off from phrase 1',
  ).toEqual([])
  expect(await page.evaluate(() => window.__workspaceHarness.audio.mix().clickOn)).toBe(false)

  const backing = (await audioEvents(page)).filter((event) => event.kind === 'backing')
  expect(backing.length).toBeGreaterThan(0)
  for (const note of backing) expect(note.at).toBeGreaterThanOrEqual(phraseOneAt - 1e-6)
  const heard = await audibleBacking(page)
  expect(
    heard.some((note) => Math.abs(note.at - phraseOneAt) < 1e-6),
    'with phrase 1',
  ).toBe(true)
})

// @test-link [[rule_doodle_sets_jam_controls]]
test("doodle-readings stays empty until phrase 1 enters, then names the doodle's seven controls", async ({
  page,
}) => {
  await gotoJamIdle(page)
  const emptyNote = page.locator('p.field-note', {
    hasText: "They show here once you've played a doodle.",
  })
  await expect(doodleReadings(page)).toHaveCount(0)
  await expect(emptyNote).toBeVisible()

  await startJamByClick(page)
  const grid = await jamGrid(page)
  await playDoodle(page, grid, 1)
  await clockTo(page, grid.barline(1) + PAST_BARLINE)
  expect(await cueShown(page)).toBe('jam-writing')
  await expect(doodleReadings(page), 'in the generation measure').toHaveCount(0)
  await untilPhraseOneAnswered(page)
  await clockTo(page, grid.barline(2) - 0.05)
  await expect(doodleReadings(page), 'just before the read-in').toHaveCount(0)

  await clockTo(page, grid.barline(2) + PAST_BARLINE)
  expect((await sessionState(page)).systems.top, 'phrase 1 entered').toBe('1:whole')
  await expect(doodleReadings(page)).toBeVisible()
  await expect(doodleReadings(page).locator('dt')).toHaveText(READING_NAMES)
  await expect(emptyNote).toHaveCount(0)
  await expect(jamFrame(page).locator('.staff-content')).toHaveClass(/is-fading-out/)

  await clockTo(page, grid.barline(3) + 1)
  expect((await sessionState(page)).phase).toBe('running')
  await expect(doodleReadings(page).locator('dt')).toHaveText(READING_NAMES)
})

// @test-link [[req_jam]]
// @test-link [[rule_jam_runs_as_session_from_phrase_one]]
test("the mode stays Jam throughout, and Start Jam's jump leaves Jam's staff in view", async ({
  page,
}) => {
  await gotoJamIdle(page)
  const jamViewport = page
    .locator('.staff-viewport')
    .filter({ has: page.locator('.staff-frame.staff-jam') })
  const staffTop = await jamViewport.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  )
  await page.evaluate((y) => window.scrollTo({ top: y + 40, behavior: 'instant' }), staffTop)
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(staffTop)

  await startJamByClick(page)
  expect(
    await page.locator('.layout-app').evaluate((element) => element.getBoundingClientRect().top),
  ).toBe(0)
  expect(await whollyInViewport(jamFrame(page)), "Jam's staff in view").toBe(true)
  await expect(sessionAction(page)).toBeFocused()
  await expectStillJam(page, 'the count-in')

  const grid = await jamGrid(page)
  await playDoodle(page, grid, 1)
  await expectStillJam(page, 'the capture')
  await clockTo(page, grid.barline(1) + PAST_BARLINE)
  await expectStillJam(page, 'the generation measure')
  await untilPhraseOneAnswered(page)
  await clockTo(page, grid.barline(2) + PAST_BARLINE)
  await expectStillJam(page, 'the read-in')
  await clockTo(page, grid.barline(3) + 1)
  expect((await sessionState(page)).phase).toBe('running')
  await expectStillJam(page, 'Session running')
})
