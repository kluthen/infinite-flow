/**
 * v2.2 chunk 27, adaptive tempo through the whole app on the workspace harness's fake audio clock
 * and fake MIDI access: with a controller attached and the page's flag on (set through the
 * harness, as no control shows it yet), a session started at the default 90 BPM plays phrases 1
 * and 2 at 90 BPM and phrase 3 at 95 BPM, which the header's tempo readout shows from phrase 3's
 * first beat; after Stop the header shows the starting tempo again and the flag stays on.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
  sessionTimeline,
  setAdaptiveTempo,
  startSession,
} from './session-helpers'
import { KEYS, clockTo, connectDevice, phraseStartsAt } from './session-midi-helpers'

/** One measure at the default 90 BPM, in seconds. */
const MEASURE = (4 * 60) / 90

/** Intent: the header's tempo readout. */
function tempoReadout(page: Page): Locator {
  return page.locator('.tempo-readout')
}

// @test-link [[req_adaptive_tempo]]
// @test-link [[rule_adaptive_tempo_flat_schedule]]
// @test-link [[rule_adaptive_tempo_resets_after_session]]
test('with the flag on and a controller attached, phrase 3 plays 5 BPM faster, and Stop shows the starting tempo', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await gotoSessionHarness(page)
  await readyToStart(page)
  await connectDevice(page, KEYS)
  expect((await sessionState(page)).adaptiveTempo).toBe(false)
  expect((await sessionState(page)).adaptiveTempoAvailable).toBe(true)
  await setAdaptiveTempo(page, true)
  expect((await sessionState(page)).adaptiveTempo).toBe(true)

  await startSession(page)
  expect((await sessionState(page)).sessionHasController).toBe(true)
  await expect(tempoReadout(page)).toHaveText('90 BPM')

  // Phrase 3's tempo is fixed at the start of phrase 2's last measure; then its start is known.
  const { countInEndsAt } = await sessionTimeline(page)
  await clockTo(page, countInEndsAt + 7 * MEASURE + 0.1)
  const phraseThreeAt = await phraseStartsAt(page, 3)
  expect(phraseThreeAt).toBeCloseTo(countInEndsAt + 8 * MEASURE, 6)

  await clockTo(page, phraseThreeAt - 0.05)
  expect((await sessionState(page)).sessionTempo).toBe(90)
  await expect(tempoReadout(page)).toHaveText('90 BPM')
  await clockTo(page, phraseThreeAt + 0.05)
  expect((await sessionState(page)).sessionTempo).toBe(95)
  await expect(tempoReadout(page)).toHaveText('95 BPM')

  await sessionAction(page).click()
  const ended = await sessionState(page)
  expect(ended.phase).toBe('idle')
  expect(ended.sessionTempo).toBeNull()
  expect(ended.adaptiveTempo).toBe(true)
  await expect(tempoReadout(page)).toHaveText('90 BPM')
})
