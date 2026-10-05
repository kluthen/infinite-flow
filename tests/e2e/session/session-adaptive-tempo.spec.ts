/**
 * v2.2 chunks 27 and 28, rising tempo (adaptive tempo) through the whole app on the workspace
 * harness's fake audio clock and fake MIDI access. Before a controller is attached the
 * `Rising tempo` control is unavailable and says why; once one is, the player turns it on with its
 * own control. A session started at the default 90 BPM then plays phrases 1 and 2 at 90 BPM,
 * 3 and 4 at 95 BPM and 5 at 100 BPM: the transport's phrase starts follow those tempos, the
 * running session hears each phrase start at exactly that time (its tempo shows from then, in the
 * header's readout and in the read-only tempo stepper, off the stepper's 10-BPM list included),
 * and its history records the same starts. After Stop both show the starting tempo again, the
 * tempo field states the tempo reached, and the control stays on, settable in the Review.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  gotoSessionHarness,
  readyToStart,
  risingTempoSegment,
  sessionAction,
  sessionState,
  sessionTimeline,
  setRisingTempo,
  startSession,
} from './session-helpers'
import { KEYS, clockTo, connectDevice, phraseStartsAt } from './session-midi-helpers'

/** One measure at `bpm`, in seconds. */
function measure(bpm: number): number {
  return (4 * 60) / bpm
}

/** Intent: the header's tempo readout. */
function tempoReadout(page: Page): Locator {
  return page.locator('.tempo-readout')
}

/** Intent: the tempo stepper's shown value. */
function stepperValue(page: Page): Locator {
  return page.getByRole('spinbutton', { name: 'Tempo' }).locator('.input-stepper-value')
}

/** Intent: the tempo field's notes (the reached-tempo note, when one shows). */
function tempoFieldNotes(page: Page): Locator {
  return page
    .locator('.field-group')
    .filter({ has: page.getByRole('spinbutton', { name: 'Tempo' }) })
    .locator('.field-note')
}

/**
 * Intent: move the clock just before and just after a phrase's start, `startsAt`, and check the tempo shown
 * changes from `before` to `after` at that instant, in the session state, the header and the
 * stepper.
 */
async function expectTempoChangesAt(
  page: Page,
  startsAt: number,
  before: number,
  after: number,
): Promise<void> {
  await clockTo(page, startsAt - 0.05)
  expect((await sessionState(page)).sessionTempo).toBe(before)
  await expect(tempoReadout(page)).toHaveText(`${before} BPM`)
  await expect(stepperValue(page)).toHaveText(`${before} BPM`)
  await clockTo(page, startsAt + 0.05)
  expect((await sessionState(page)).sessionTempo).toBe(after)
  await expect(tempoReadout(page)).toHaveText(`${after} BPM`)
  await expect(stepperValue(page)).toHaveText(`${after} BPM`)
}

// @test-link [[req_adaptive_tempo]]
// @test-link [[rule_controller_attached_definition]]
test('Rising tempo is unavailable, saying why, until a controller is attached', async ({
  page,
}) => {
  await gotoSessionHarness(page)
  await readyToStart(page)
  const group = page.getByRole('radiogroup', { name: 'Rising tempo' })
  await expect(risingTempoSegment(page, 'Off')).toHaveAttribute('aria-checked', 'true')
  await expect(risingTempoSegment(page, 'On')).toBeDisabled()
  const reason = page.locator(
    `#${await risingTempoSegment(page, 'On').getAttribute('aria-describedby')}`,
  )
  await expect(reason).toHaveText('Needs a connected controller.')
  await expect(page.locator(`#${await group.getAttribute('aria-describedby')}`)).toHaveText(
    'Adds 5 BPM every 2 phrases, up to 240 BPM. The tempo goes back to your setting when the session ends.',
  )

  await connectDevice(page, KEYS)
  await expect(risingTempoSegment(page, 'On')).toBeEnabled()
  await expect(reason).toHaveCount(0)
  await setRisingTempo(page, true)
  await expect(risingTempoSegment(page, 'On')).toHaveAttribute('aria-checked', 'true')
})

// @test-link [[req_adaptive_tempo]]
// @test-link [[rule_adaptive_tempo_flat_schedule]]
// @test-link [[rule_adaptive_tempo_resets_after_session]]
// @test-link [[rule_session_settings_locked]]
test('with Rising tempo on, each phrase starts and shows at its own tempo, and Stop shows the starting tempo and the tempo reached', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page)
  await readyToStart(page)
  await connectDevice(page, KEYS)
  expect((await sessionState(page)).adaptiveTempo).toBe(false)
  await setRisingTempo(page, true)
  await expect(tempoFieldNotes(page)).toHaveCount(0)

  await startSession(page)
  expect((await sessionState(page)).sessionHasController).toBe(true)
  await expect(tempoReadout(page)).toHaveText('90 BPM')
  await expect(stepperValue(page)).toHaveText('90 BPM')
  await expect(page.getByRole('radiogroup', { name: 'Rising tempo' })).toHaveAttribute(
    'aria-readonly',
    'true',
  )

  // Each phrase's start is known once the phrase before has its tempo fixed, at the start of the
  // phrase before that one's last measure.
  const { countInEndsAt } = await sessionTimeline(page)
  await clockTo(page, countInEndsAt + 7 * measure(90) + 0.1)
  const three = await phraseStartsAt(page, 3)
  expect(three).toBeCloseTo(countInEndsAt + 8 * measure(90), 6)
  await expectTempoChangesAt(page, three, 90, 95)

  await clockTo(page, three + 3 * measure(95) + 0.1)
  const four = await phraseStartsAt(page, 4)
  expect(four).toBeCloseTo(three + 4 * measure(95), 6)
  await clockTo(page, four + 3 * measure(95) + 0.1)
  const five = await phraseStartsAt(page, 5)
  expect(five).toBeCloseTo(four + 4 * measure(95), 6)
  await expectTempoChangesAt(page, five, 95, 100)

  await sessionAction(page).click()
  const ended = await sessionState(page)
  expect(ended.phase).toBe('idle')
  expect(ended.sessionTempo).toBeNull()
  expect(ended.adaptiveTempo).toBe(true)
  expect(ended.lastSessionReachedTempo).toBe(100)
  const startedAt = (ended.lastHistoryPhrases ?? []).map((phrase) => phrase.startedAt)
  expect(startedAt.slice(2, 5)).toEqual([three, four, five])
  await expect(tempoReadout(page)).toHaveText('90 BPM')
  await expect(stepperValue(page)).toHaveText('90 BPM')
  await expect(tempoFieldNotes(page)).toHaveText(['Last session reached 100 BPM.'])

  // In the Review the control is editable again; the note stays until the next session's end.
  expect(ended.review?.showing).toBe(true)
  await setRisingTempo(page, false)
  await setRisingTempo(page, true)
  await expect(tempoFieldNotes(page)).toHaveText(['Last session reached 100 BPM.'])
})
