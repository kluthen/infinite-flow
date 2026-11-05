/**
 * v3.2 chunk 32, tap tempo in Jam's Tempo field (master spec C5.17; flows/jam/handoff.md, Tap
 * tempo; the phrase-workspace handoff, `tap-tempo`), on the workspace harness (port 4175: fake
 * audio clock, fake MIDI, real generations), the first visit's Jam (C Ionian on the tenor
 * saxophone, 90 BPM, the home note B♭3, concert 58). Every tap is placed on the audio clock; no
 * test waits for real time.
 * - Four presses of `Tap tempo` half a second apart set 120 BPM in the stepper and
 *   `tempo-readout`; uneven taps set the rounded mean, a fifth tap sets it again; taps far too
 *   slow or too fast set 60 or 180 with the limit's wording; the note's rest wording with and
 *   without a controller, and its counting wording after a first tap; `is-listening` while it
 *   listens.
 * - Controller notes without a press change nothing; after one press they are taps (a very short
 *   one is not), the home note included, which then starts nothing and is not named; `Start Jam`
 *   still starts and ends listening; two seconds after the last tap the home note starts a Jam.
 * - Taps sound nothing and never reach a doodle, a kept doodle's phrase 1 included.
 * - axe finds nothing in the Tempo field at rest and listening, in both themes; the button names
 *   its polite note, has no `aria-pressed`, taps on Enter and not on its repeats.
 * - On a landscape phone the stepper, the button and the note show, nothing cut or overlapping.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { audioEvents } from '../audio/audio-harness-helpers'
import { gotoControllerHarness, watchPageErrors } from '../controller/controller-helpers'
import { playedNotesToggle, reviewPanel, reviewTitle } from '../review/review-helpers'
import {
  HOME_NOTE,
  PAST_BARLINE,
  gotoJamIdle,
  jamGrid,
  playDoodle,
  startJamByClick,
  untilPhraseOneAnswered,
} from '../session/jam-helpers'
import { sessionAction, sessionState } from '../session/session-helpers'
import {
  KEYS,
  clockTo,
  connectDevice,
  noteOff,
  noteOn,
  startLine,
} from '../session/session-midi-helpers'
import { radio } from './helpers'
import {
  closeReview,
  freshJamReviewed,
  generationCount,
  keptPhraseOneSince,
} from './kept-doodle-helpers'
import { expectJamModeShows, modeSegment } from './jam-mode-helpers'

/** A landscape phone, below bp-tablet-landscape. */
const LANDSCAPE_PHONE = { width: 844, height: 390 } as const

/** The field-note's words. */
const REST_WITH_CONTROLLER = 'Tap the beat here, or press once and tap on your controller.'
const REST_WITHOUT_CONTROLLER = 'Tap the beat here.'
const COUNTING = 'Keep tapping: four beats set the tempo.'
const SET_120 = 'Set to 120 BPM. Keep tapping to correct it.'

/** How long a controller tap is held: well over the 38 ms a note takes to count. */
const HELD = 0.1

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: the `Tap tempo` button. */
function tapButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Tap tempo', exact: true })
}

/** Intent: `tap-tempo`'s field-note. */
function tapNote(page: Page): Locator {
  return page.locator('.field-group > button.tap-tempo + p.field-note')
}

/** Intent: Jam's tempo stepper. */
function stepper(page: Page): Locator {
  return page.getByRole('spinbutton', { name: 'Tempo' })
}

/** Intent: the header's `tempo-readout`. */
function tempoReadout(page: Page): Locator {
  return page.locator('.tempo-readout')
}

/** Intent: the audio clock's time now (unlocked by then). */
function now(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.audio.now())
}

/** Intent: move the audio clock to `at`, then press `Tap tempo`. */
async function pressAt(page: Page, at: number): Promise<void> {
  await clockTo(page, at)
  await tapButton(page).click()
}

/** Intent: press `Tap tempo` once, then on each of `gaps` (seconds) after the last; returns the first. */
async function pressTaps(page: Page, gaps: readonly number[]): Promise<number> {
  await tapButton(page).click()
  const first = await now(page)
  let at = first
  for (const gap of gaps) {
    at += gap
    await pressAt(page, at)
  }
  return first
}

/** Intent: a controller note of `pitch` at `at` on the audio clock, held `held` seconds. */
async function controllerNote(page: Page, pitch: number, at: number, held = HELD): Promise<void> {
  await clockTo(page, at)
  await noteOn(page, KEYS, pitch)
  await clockTo(page, at + held)
  await noteOff(page, KEYS, pitch)
}

/** Intent: assert the stepper and `tempo-readout` both show `tempo`. */
async function expectTempo(page: Page, tempo: number): Promise<void> {
  await expect(stepper(page)).toHaveAttribute('aria-valuenow', String(tempo))
  await expect(tempoReadout(page)).toHaveText(`${tempo} BPM`)
}

/** Intent: the click and backing events the audio output has had since the page loaded. */
async function sounded(page: Page): Promise<readonly WorkspaceHarnessAudioEvent[]> {
  return (await audioEvents(page)).filter(
    (event) => event.kind === 'click' || event.kind === 'backing',
  )
}

/** Intent: axe's violations, one per line, for a failing assertion's message. */
function describeViolations(violations: readonly { id: string; help: string }[]): string {
  return violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n')
}

/** Intent: axe finds nothing in Jam's Tempo field, its transitions settled. */
async function expectNoViolations(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => !(animation instanceof CSSTransition)),
  )
  const results = await new AxeBuilder({ page }).include('.field-group:has(> .tap-tempo)').analyze()
  expect(results.violations, describeViolations(results.violations)).toEqual([])
}

/** Intent: the box of a shown element, which must have one. */
async function boxOf(
  locator: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox()
  if (box === null) throw new Error('the element has no box')
  return box
}

/** Intent: assert two boxes do not overlap. */
function expectApart(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  message: string,
): void {
  const apart =
    a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y
  expect(apart, message).toBe(true)
}

// @test-link [[rule_jam_tempo_from_taps]]
// @test-link [[rule_jam_tap_in_listening]]
test('four presses half a second apart set 120 BPM; uneven taps the rounded mean; a fifth tap sets it again', async ({
  page,
}) => {
  await gotoJamIdle(page)
  await expectTempo(page, 90)
  await expect(tapNote(page)).toHaveText(REST_WITH_CONTROLLER)
  await expect(tapButton(page)).not.toHaveClass(/is-listening/)

  const first = await pressTaps(page, [])
  await expect(tapButton(page)).toHaveClass(/is-listening/)
  await expect(tapNote(page)).toHaveText(COUNTING)
  await pressAt(page, first + 0.5)
  await pressAt(page, first + 1)
  await expect(tapNote(page)).toHaveText(COUNTING)
  await expectTempo(page, 90)
  await pressAt(page, first + 1.5)
  await expectTempo(page, 120)
  await expect(tapNote(page)).toHaveText(SET_120)
  await expect(tapButton(page)).toHaveClass(/is-listening/)

  // Two seconds after the last tap listening is over: the next press starts a new run.
  await pressAt(page, first + 3.5)
  await expect(tapNote(page)).toHaveText(COUNTING)
  await expectTempo(page, 120)

  // Uneven taps: 0.7, 0.4 and 0.7 s, a mean beat of 0.6 s: 100 BPM.
  await clockTo(page, first + 6)
  const uneven = await pressTaps(page, [0.7, 0.4, 0.7])
  await expectTempo(page, 100)
  await expect(tapNote(page)).toHaveText('Set to 100 BPM. Keep tapping to correct it.')
  // A fifth tap 0.5 s later: the last four span 1.6 s, 112.5 BPM, the step nearest 110.
  await pressAt(page, uneven + 2.3)
  await expectTempo(page, 110)
  await expect(tapNote(page)).toHaveText('Set to 110 BPM. Keep tapping to correct it.')
})

// @test-link [[rule_jam_tempo_range]]
test('taps far too slow set 60 BPM and far too fast 180 BPM, each with its limit wording', async ({
  page,
}) => {
  await gotoJamIdle(page)

  // 1.5 s apart, 40 BPM: kept at 60.
  const slow = await pressTaps(page, [1.5, 1.5, 1.5])
  await expectTempo(page, 60)
  await expect(tapNote(page)).toHaveText('Set to 60 BPM, the slowest a Jam goes.')

  // A new run after listening ended: 0.1 s apart, 600 BPM: kept at 180.
  await clockTo(page, slow + 4.5 + 2)
  await pressTaps(page, [0.1, 0.1, 0.1])
  await expectTempo(page, 180)
  await expect(tapNote(page)).toHaveText('Set to 180 BPM, the fastest a Jam goes.')
})

// @test-link [[rule_jam_tap_in_listening]]
test('the rest wording names the controller only while one is connected', async ({ page }) => {
  await gotoControllerHarness(page, { query: { pregeneration: 'off' } })
  await modeSegment(page, 'Jam').click()
  await expectJamModeShows(page, 'disabled')
  await expect(tapButton(page)).toBeEnabled()
  await expect(tapNote(page)).toHaveText(REST_WITHOUT_CONTROLLER)

  await connectDevice(page, KEYS)
  await expect(tapNote(page)).toHaveText(REST_WITH_CONTROLLER)
})

// @test-link [[rule_jam_tap_in_listening]]
// @test-link [[module_jam_idle_notes]]
test('controller notes change nothing without a press; after one press they are taps, a very short one not', async ({
  page,
}) => {
  await gotoJamIdle(page)
  // Notes 0.5 s apart, no press: no listening, the tempo unchanged.
  const start = (await now(page)) + 0.5
  for (let index = 0; index < 5; index += 1) {
    await controllerNote(page, 62, start + index * 0.5)
  }
  await expectTempo(page, 90)
  await expect(tapButton(page)).not.toHaveClass(/is-listening/)
  await expect(tapNote(page)).toHaveText(REST_WITH_CONTROLLER)

  // One press, then a 20 ms note (no tap) and controller taps 0.5 s apart: the press counts as one.
  const first = await pressTaps(page, [])
  await controllerNote(page, 62, first + 0.25, 0.02)
  await controllerNote(page, 64, first + 0.5)
  await controllerNote(page, 65, first + 1)
  await expect(tapNote(page), 'three taps: the short note is none').toHaveText(COUNTING)
  await expectTempo(page, 90)
  await controllerNote(page, 67, first + 1.5)
  await expectTempo(page, 120)
  await expect(tapNote(page)).toHaveText(SET_120)
})

// @test-link [[rule_jam_tap_in_listening]]
// @test-link [[module_session_starting_note]]
// @test-link [[module_jam_idle_notes]]
test('while listening the home note taps and starts nothing; two seconds after the last tap it starts a Jam', async ({
  page,
}) => {
  await gotoJamIdle(page)
  await expect(startLine(page)).toHaveText('Play this note to start: C5')

  const first = await pressTaps(page, [])
  await expect(startLine(page)).toHaveCount(0)
  await controllerNote(page, HOME_NOTE, first + 0.5)
  const state = await sessionState(page)
  expect(state.phase).toBe('idle')
  expect(state.countIn).toBeNull()
  expect(await sounded(page), 'no count-in click scheduled').toEqual([])
  await expect(sessionAction(page)).toHaveText('Start Jam')
  await expect(startLine(page)).toHaveCount(0)
  await controllerNote(page, HOME_NOTE, first + 1)
  await controllerNote(page, HOME_NOTE, first + 1.5)
  await expectTempo(page, 120)
  expect((await sessionState(page)).phase).toBe('idle')

  // Two seconds after the last tap (its onset) listening is over: the home note starts a Jam.
  await clockTo(page, first + 1.5 + 2)
  const at = await noteOn(page, KEYS, HOME_NOTE)
  await noteOff(page, KEYS, HOME_NOTE, at)
  await expect(sessionAction(page)).toHaveText('Stop')
  const started = await sessionState(page)
  expect(started.phase).toBe('count-in')
  expect(started.sessionTempo).toBe(120)
  await sessionAction(page).click()
  await expect(sessionAction(page)).toHaveText('Start Jam')
})

// @test-link [[rule_jam_tap_in_listening]]
test('Start Jam clicked while listening still starts, and listening ends', async ({ page }) => {
  await gotoJamIdle(page)
  await pressTaps(page, [])
  await expect(tapButton(page)).toHaveClass(/is-listening/)
  await expect(sessionAction(page)).toBeEnabled()

  await startJamByClick(page)

  await expect(tapButton(page)).not.toHaveClass(/is-listening/)
  await expect(tapButton(page)).toBeDisabled()
  await expect(tapNote(page)).toHaveText(REST_WITH_CONTROLLER)
  await sessionAction(page).click()
  await expect(sessionAction(page)).toHaveText('Start Jam')
})

// @test-link [[rule_jam_tap_in_listening]]
// @test-link [[module_jam_idle_notes]]
test("taps sound nothing and never reach a fresh Jam's doodle", async ({ page }) => {
  test.setTimeout(120_000)
  await gotoJamIdle(page)
  const first = await pressTaps(page, [])
  await controllerNote(page, 60, first + 0.5)
  await controllerNote(page, HOME_NOTE, first + 1)
  await controllerNote(page, 62, first + 1.5)
  await expectTempo(page, 120)
  expect(await sounded(page), 'no click, no backing').toEqual([])

  // A fresh Jam with a one-note doodle: its Review's doodle holds that note only.
  await clockTo(page, first + 4)
  await startJamByClick(page)
  const grid = await jamGrid(page)
  expect((await sessionState(page)).sessionTempo).toBe(120)
  await playDoodle(page, grid, 1)
  await clockTo(page, grid.barline(1) + PAST_BARLINE)
  await untilPhraseOneAnswered(page)
  await clockTo(page, grid.barline(3) + 1)
  expect((await sessionState(page)).phase).toBe('running')
  await sessionAction(page).click()
  await expect(reviewTitle(page)).toBeVisible()
  const doodle = reviewPanel(page).locator('section.review-doodle')
  await expect(doodle.locator('.review-phrase-tempo')).toHaveText('120 BPM')
  await playedNotesToggle(page).click()
  const lane = doodle.locator(':scope > .review-staff > .played-notes-lane')
  await expect(lane).toHaveCount(1)
  await expect(lane.locator('.played-note')).toHaveCount(1)
})

// @test-link [[rule_jam_tap_in_listening]]
// @test-link [[module_jam_idle_notes]]
test("with a kept doodle, taps (its phrase 1's first note included) start nothing and change no phrase", async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoJamIdle(page)
  await freshJamReviewed(page)
  await closeReview(page)
  const shown = await keptPhraseOneSince(page, 0)
  const from = await generationCount(page)
  const soundedBefore = (await sounded(page)).length
  await expect(startLine(page)).toHaveText(/Play this note to start: \S+$/u)

  const first = await pressTaps(page, [])
  await expect(startLine(page)).toHaveCount(0)
  await controllerNote(page, shown.first.pitch, first + 0.5)
  expect((await sessionState(page)).phase).toBe('idle')
  await controllerNote(page, shown.first.pitch, first + 1)
  await controllerNote(page, shown.first.pitch, first + 1.5)
  await expectTempo(page, 120)

  const state = await sessionState(page)
  expect(state.phase).toBe('idle')
  expect(state.countIn).toBeNull()
  await expect(sessionAction(page)).toHaveText('Start Jam')
  expect(await generationCount(page), 'no phrase written').toBe(from)
  expect(await keptPhraseOneSince(page, 0)).toEqual(shown)
  expect((await sounded(page)).length, 'nothing sounded').toBe(soundedBefore)
})

for (const theme of ['Light', 'Dark'] as const) {
  // @test-link [[rule_jam_tap_in_listening]]
  test(`has no detectable axe violations in the Tempo field, at rest and listening, ${theme} theme`, async ({
    page,
  }) => {
    await gotoJamIdle(page)
    await radio(page, 'Presentation theme', theme).click()
    await expect(tapNote(page)).toHaveText(REST_WITH_CONTROLLER)
    await expectNoViolations(page)

    await tapButton(page).click()
    await expect(tapButton(page)).toHaveClass(/is-listening/)
    await expect(tapNote(page)).toHaveText(COUNTING)
    await expectNoViolations(page)
  })
}

// @test-link [[rule_jam_tap_in_listening]]
test('the button names its polite note, is no toggle, taps on Enter and not on its repeats', async ({
  page,
}) => {
  await gotoJamIdle(page)
  const button = tapButton(page)
  const noteId = await tapNote(page).getAttribute('id')
  expect(noteId).not.toBeNull()
  await expect(button).toHaveAttribute('aria-describedby', noteId!)
  await expect(button).toHaveAccessibleDescription(REST_WITH_CONTROLLER)
  await expect(tapNote(page)).toHaveAttribute('aria-live', 'polite')
  await expect(button).not.toHaveAttribute('aria-pressed')

  await button.focus()
  await page.keyboard.press('Enter')
  const first = await now(page)
  await expect(tapNote(page)).toHaveText(COUNTING)
  await clockTo(page, first + 0.5)
  // Enter held: its first press taps, its repeats nothing.
  await page.keyboard.down('Enter')
  await page.keyboard.down('Enter')
  await page.keyboard.down('Enter')
  await page.keyboard.up('Enter')
  await expect(tapNote(page), 'two taps so far').toHaveText(COUNTING)
  await clockTo(page, first + 1)
  await page.keyboard.press('Enter')
  await expect(tapNote(page), 'three taps so far').toHaveText(COUNTING)
  await expectTempo(page, 90)
  await clockTo(page, first + 1.5)
  await page.keyboard.press('Enter')
  await expectTempo(page, 120)
  await expect(tapNote(page)).toHaveText(SET_120)
  await expect(button).not.toHaveAttribute('aria-pressed')
})

// @test-link [[rule_jam_tap_in_listening]]
test('on a landscape phone the Tempo field shows its stepper, Tap tempo and its note, nothing cut or overlapping', async ({
  page,
}) => {
  await gotoJamIdle(page, LANDSCAPE_PHONE)
  const field = page.locator('.field-group:has(> .tap-tempo)')
  const parts = [field.locator(':scope > .input-stepper'), tapButton(page), tapNote(page)]
  await parts[0]!.scrollIntoViewIfNeeded()
  const fieldBox = await boxOf(field)
  for (const part of parts) {
    await expect(part).toBeVisible()
    const box = await boxOf(part)
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(LANDSCAPE_PHONE.width)
    expect(box.x + box.width).toBeLessThanOrEqual(fieldBox.x + fieldBox.width + 0.5)
    const cut = await part.evaluate(
      (element) =>
        element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight,
    )
    expect(cut, 'nothing cut').toBe(false)
  }
  const [stepperBox, buttonBox, noteBox] = await Promise.all(parts.map(boxOf))
  expectApart(stepperBox!, buttonBox!, 'the stepper and Tap tempo')
  expectApart(stepperBox!, noteBox!, 'the stepper and the note')
  expectApart(buttonBox!, noteBox!, 'Tap tempo and its note')
})
