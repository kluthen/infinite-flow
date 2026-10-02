/**
 * v2.0 chunk 17, item 16: the selected controller lost mid-session, on the workspace harness's
 * fake audio clock and fake MIDI access. An unplug shows the disconnect banner in the cue row,
 * counting down once a second from 30, and the header's disconnected badge. The same device back
 * within 30 s clears both with no check, notes are acknowledged again (the ones due while it was
 * away stay unmatched) and the silence rule counts from the reattachment; with no replug the
 * session ends at 30 s from the unplug and the header shows the no-controller badge; a different
 * device plugged in meanwhile changes nothing. A loss in the count-in shows the banner while the
 * count-in keeps clicking, and a replug before beat 4 brings the count-in row back.
 */
import { expect, test, type Page } from '@playwright/test'

import {
  FORM,
  controllerStatus,
  sheet,
  statusForm,
  watchPageErrors,
} from '../controller/controller-helpers'
import {
  BEAT,
  countInClickTimes,
  gotoSessionHarness,
  readyToStart,
  sessionState,
  sessionTimeline,
  shownBeats,
  startSession,
  toCountInMiddle,
  toRunning,
} from './session-helpers'
import {
  KEYS,
  PAD,
  ackedNoteIds,
  clockTo,
  connectDevice,
  disconnectBanner,
  expectEndedBetween,
  expectStillRunning,
  expectedNotesOf,
  idleTimeline,
  midiKind,
  noteKey,
  phraseStartsAt,
  plugIn,
  tap,
  unplugNow,
  type ExpectedNoteAt,
} from './session-midi-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** The banner's sentence from bp-tablet-landscape up, at `seconds` left. */
function bannerText(seconds: number): string {
  return `Controller disconnected — plug it back in to keep playing. Session ends in ${seconds} s.`
}

/** Intent: assert the banner shows `seconds` left, the header the disconnected badge. */
async function expectLost(page: Page, seconds: number): Promise<void> {
  await expect(disconnectBanner(page)).toHaveText(bannerText(seconds))
  await expect(disconnectBanner(page).locator('.session-alert-countdown')).toHaveText(
    `${seconds} s`,
  )
  expect((await sessionState(page)).controllerLost).toEqual({ secondsLeft: seconds })
  await expect.poll(() => statusForm(page)).toEqual(FORM.disconnected)
  await expect(controllerStatus(page)).toBeDisabled()
  await expect(sheet(page)).toHaveCount(0)
}

/** Intent: assert the banner is gone and the header shows the connected badge again. */
async function expectBack(page: Page): Promise<void> {
  await expect(disconnectBanner(page)).toHaveCount(0)
  expect((await sessionState(page)).controllerLost).toBeNull()
  await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
  await expect(controllerStatus(page)).toBeDisabled()
}

/** Intent: on a fresh page with the keyboard connected, a phrase ready to start from. */
async function readyWithKeys(page: Page): Promise<void> {
  await gotoSessionHarness(page)
  await connectDevice(page, KEYS)
  await readyToStart(page)
}

// @test-link [[rule_controller_loss_mid_session]]
// @test-link [[rule_controller_reconnection_window]]
test.describe('a controller lost while the session runs', () => {
  // @test-link [[rule_controller_loss_mid_session]]
  // @test-link [[rule_controller_reconnection_window]]
  // @test-link [[rule_silence_timeout_ends_session]]
  test('the banner counts down; the same device back clears it; silence counts from then', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await readyWithKeys(page)
    const starting = (await sessionState(page)).startingNote
    if (starting === null) throw new Error('no starting note is named')
    await tap(page, KEYS, starting.concertPitch)
    await toRunning(page)
    const lastNoteAt = await tap(page, KEYS, 20)
    await clockTo(page, lastNoteAt + 5)

    const lostAt = await unplugNow(page, KEYS)

    await expectLost(page, 30)
    expect(await midiKind(page)).toBe('away')
    await clockTo(page, lostAt + 1)
    await expectLost(page, 29)
    await clockTo(page, lostAt + 10)
    await expectLost(page, 20)
    await expectStillRunning(page, 'while the countdown runs')

    await plugIn(page, KEYS)
    const backAt = lostAt + 10

    await expect.poll(() => midiKind(page)).toBe('connected')
    await expectBack(page)
    // The silence rule was suspended, then re-armed from the reattachment, not the last note.
    await clockTo(page, lastNoteAt + 30.1)
    await expectStillRunning(page, '30.1 s after the last note before the loss')
    await clockTo(page, backAt + 29.9)
    await expectStillRunning(page, '29.9 s after the reattachment')
    await clockTo(page, backAt + 30.1)
    await expectEndedBetween(page, 'silence-timeout', backAt + 30, backAt + 30.1)
  })

  // @test-link [[rule_controller_loss_mid_session]]
  // @test-link [[rule_controller_reconnection_window]]
  test('no replug: a different device changes nothing, and the session ends at 30 s', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await readyWithKeys(page)
    await startSession(page)
    await toRunning(page)

    const lostAt = await unplugNow(page, KEYS)
    await expectLost(page, 30)
    await clockTo(page, lostAt + 5)
    await plugIn(page, PAD)

    await expectLost(page, 25)
    expect(await page.evaluate(() => window.__workspaceHarness.midi.state())).toEqual({
      kind: 'away',
      device: KEYS,
    })
    await clockTo(page, lostAt + 29.9)
    await expectLost(page, 1)
    await expectStillRunning(page, '29.9 s after the unplug')

    await clockTo(page, lostAt + 30.05)

    await expectEndedBetween(page, 'controller-lost', lostAt + 30, lostAt + 30.05)
    await expect(disconnectBanner(page)).toHaveCount(0)
    await expect.poll(() => statusForm(page)).toEqual(FORM.noController)
    await expect(controllerStatus(page)).toBeEnabled()
  })

  // @test-link [[rule_controller_loss_mid_session]]
  // @test-link [[rule_controller_reconnection_window]]
  test('back within the window, notes are acknowledged again; those due while away stay unmatched', async ({
    page,
  }) => {
    await readyWithKeys(page)
    const timeline = await idleTimeline(page)
    await startSession(page)
    const notes = expectedNotesOf(timeline, 1, await phraseStartsAt(page, 1))
    expect(notes.length).toBeGreaterThanOrEqual(4)
    const [first, dueAway1, dueAway2, after] = notes as [
      ExpectedNoteAt,
      ExpectedNoteAt,
      ExpectedNoteAt,
      ExpectedNoteAt,
      ...ExpectedNoteAt[],
    ]
    await clockTo(page, first.onsetAt)
    await tap(page, KEYS, first.pitch)
    await clockTo(page, first.onsetAt + 0.05)
    await unplugNow(page, KEYS)
    await expect(disconnectBanner(page)).toBeVisible()

    await clockTo(page, dueAway2.onsetAt + 0.05)
    await plugIn(page, KEYS)
    await expect.poll(() => midiKind(page)).toBe('connected')
    await expectBack(page)
    await clockTo(page, after.onsetAt)
    await tap(page, KEYS, after.pitch)

    const acked = [first, after].map((note) => note.identity)
    await expect.poll(async () => (await sessionState(page)).acknowledged).toEqual(acked)
    expect(await ackedNoteIds(page)).toEqual(acked.map(noteKey).sort())
    for (const away of [dueAway1, dueAway2]) {
      expect(await ackedNoteIds(page)).not.toContain(noteKey(away.identity))
    }
  })
})

// @test-link [[rule_controller_loss_mid_session]]
// @test-link [[rule_controller_reconnection_window]]
test.describe('a controller lost in the count-in', () => {
  // @test-link [[rule_controller_loss_mid_session]]
  // @test-link [[rule_controller_reconnection_window]]
  test('the banner shows while the count-in clicks on; a replug before beat 4 brings it back', async ({
    page,
  }) => {
    await readyWithKeys(page)
    await startSession(page)
    const { startAt, countInEndsAt } = await sessionTimeline(page)
    await toCountInMiddle(page)

    await unplugNow(page, KEYS)

    await expectLost(page, 30)
    await expect(page.locator('ol.count-in')).toHaveCount(0)
    await clockTo(page, startAt + 2 * BEAT + 0.03)
    const state = await sessionState(page)
    expect(state.phase).toBe('count-in')
    expect(state.countIn?.beats).toEqual(['past', 'past', 'current', 'muted'])
    await expect(disconnectBanner(page)).toBeVisible()
    await expect(page.locator('ol.count-in')).toHaveCount(0)

    await plugIn(page, KEYS)

    await expect.poll(() => midiKind(page)).toBe('connected')
    await expectBack(page)
    await expect(page.locator('ol.count-in')).toBeVisible()
    expect(await shownBeats(page)).toEqual(['past', 'past', 'current', 'muted'])
    await clockTo(page, countInEndsAt + 0.5)
    expect((await sessionState(page)).phase).toBe('running')
    // The count-in clicked all four beats, on time, the loss notwithstanding.
    const clicks = await countInClickTimes(page)
    expect(clicks).toHaveLength(4)
    clicks.forEach((at, beat) => expect(at).toBeCloseTo(startAt + beat * BEAT, 6))
  })
})
