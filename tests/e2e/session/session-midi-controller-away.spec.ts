/**
 * v2.0 chunk 17, items 10 and 20: a Start click while the selected controller is away, on the
 * workspace harness's fake audio clock and fake MIDI access. It starts a controller-less session
 * that never gains a controller, count-in included: the same device plugged back in stays away,
 * shows no banner, acknowledges nothing and arms no silence rule. Once the session ends the
 * device reattaches by itself.
 */
import { expect, test, type Page } from '@playwright/test'

import { audioNow } from '../audio/audio-harness-helpers'
import { FORM, statusForm, watchPageErrors } from '../controller/controller-helpers'
import { settleFrames } from '../release/harness-helpers'
import {
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
  toCountInMiddle,
  toRunning,
} from './session-helpers'
import {
  KEYS,
  ackedNoteIds,
  clockTo,
  connectDevice,
  disconnectBanner,
  expectStillRunning,
  expectedNotesOf,
  idleTimeline,
  midiKind,
  phraseStartsAt,
  plugIn,
  startLine,
  tap,
  unplugNow,
} from './session-midi-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: the notes the controller reported played since the page loaded. */
function playedCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.midi.playedNotes().length)
}

// @test-link [[rule_start_while_controller_away]]
// @test-link [[rule_controllerless_session_never_gains_controller]]
test.describe('Start with the selected controller away', () => {
  // @test-link [[rule_start_while_controller_away]]
  // @test-link [[rule_controllerless_session_never_gains_controller]]
  test('a controller-less session the device never joins; it reattaches once the session ends', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await gotoSessionHarness(page)
    await connectDevice(page, KEYS)
    await readyToStart(page)
    const timeline = await idleTimeline(page)
    await unplugNow(page, KEYS)
    await expect.poll(() => midiKind(page)).toBe('away')
    await expect(startLine(page)).toHaveCount(0)

    await startSession(page)
    const startedAt = await audioNow(page)

    const state = await sessionState(page)
    expect(state.sessionHasController).toBe(false)
    expect(state.controllerLost).toBeNull()
    await expect(disconnectBanner(page)).toHaveCount(0)
    expect(await statusForm(page)).toEqual(FORM.noController)

    // The same device back in the count-in: held away, never read.
    await toCountInMiddle(page)
    await plugIn(page, KEYS)
    await settleFrames(page)
    expect(await midiKind(page)).toBe('away')
    expect(await statusForm(page)).toEqual(FORM.noController)
    await expect(disconnectBanner(page)).toHaveCount(0)
    const playedBefore = await playedCount(page)

    // Running: phrase 1's notes played on time acknowledge nothing; the controller reads none.
    await toRunning(page)
    const notes = expectedNotesOf(timeline, 1, await phraseStartsAt(page, 1))
    for (const note of notes.slice(0, 3)) {
      if (note.onsetAt > (await audioNow(page))) await clockTo(page, note.onsetAt)
      await tap(page, KEYS, note.pitch)
    }
    expect(await playedCount(page)).toBe(playedBefore)
    expect((await sessionState(page)).acknowledged).toEqual([])
    expect(await ackedNoteIds(page)).toEqual([])

    // Unplugged and back again while running: still away, still no banner.
    await unplugNow(page, KEYS)
    await plugIn(page, KEYS)
    await settleFrames(page)
    expect(await midiKind(page)).toBe('away')
    expect((await sessionState(page)).controllerLost).toBeNull()

    // No silence rule: more than 30 s with no note read, still running.
    await clockTo(page, startedAt + 40)
    await expectStillRunning(page, '40 s into a controller-less session')
    expect((await sessionState(page)).sessionHasController).toBe(false)

    await sessionAction(page).click()

    await expect.poll(() => midiKind(page)).toBe('connected')
    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
    expect((await sessionState(page)).sessionHasController).toBeNull()
  })

  // @test-link [[rule_start_while_controller_away]]
  test('ended in the count-in, the device reattaches and the start line returns', async ({
    page,
  }) => {
    await gotoSessionHarness(page)
    await connectDevice(page, KEYS)
    await readyToStart(page)
    await unplugNow(page, KEYS)
    await expect.poll(() => midiKind(page)).toBe('away')
    await startSession(page)
    await plugIn(page, KEYS)
    await settleFrames(page)
    expect(await midiKind(page)).toBe('away')

    await sessionAction(page).click()

    await expect.poll(() => midiKind(page)).toBe('connected')
    await expect(startLine(page)).toBeVisible()
    expect((await sessionState(page)).startingNote).not.toBeNull()
  })
})
