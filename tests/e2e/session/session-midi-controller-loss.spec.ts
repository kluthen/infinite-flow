/**
 * v2.0 chunk 17, item 16: the selected controller lost mid-session, on the workspace harness's
 * fake audio clock and fake MIDI access. An unplug shows the disconnect banner in the cue row,
 * counting down once a second from 30, and the header's disconnected badge. The same device back
 * within 30 s clears both with no check, notes are acknowledged again (the ones due while it was
 * away stay unmatched) and the silence rule counts from the reattachment; with no replug the
 * session ends at 30 s from the unplug and the header shows the no-controller badge; a different
 * device plugged in meanwhile changes nothing. Through the countdown and after the replug the
 * phrases keep their start times and the click its beat. A loss in the count-in shows the banner
 * while the count-in keeps clicking, and a replug before beat 4 brings the count-in row back. A
 * controller still away when the session ends, by the 30-second rule or by Stop, keeps its
 * selection into the Review and reattaches there by itself when the same device returns.
 */
import { expect, test, type Page } from '@playwright/test'

import { audioEvents, audioNow } from '../audio/audio-harness-helpers'
import {
  FORM,
  controllerStatus,
  midiState,
  sheet,
  statusForm,
  watchPageErrors,
} from '../controller/controller-helpers'
import { expectReviewShowing, reviewPanel } from '../review/review-helpers'
import { MEASURE, toBarline, untilReady } from './rolling-helpers'
import {
  BEAT,
  countInClickTimes,
  gotoSessionHarness,
  readyToStart,
  sessionAction,
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

/** Intent: the running session's phrase grid: when phrase 1 starts, and how long a phrase lasts. */
async function phraseGrid(page: Page): Promise<{ origin: number; length: number }> {
  const origin = await phraseStartsAt(page, 1)
  return { origin, length: (await phraseStartsAt(page, 2)) - origin }
}

/**
 * Intent: assert the session still plays at its tempo: every phrase begun so far started on
 * `grid`, every click sounded since `since` falls on phrase 1's beat grid with no beat missing,
 * and every phrase begun since then opened with its backing on its first beat.
 */
async function expectAtTempo(
  page: Page,
  grid: { readonly origin: number; readonly length: number },
  since: number,
): Promise<void> {
  const sounding = (await sessionState(page)).playhead?.phraseNumber
  if (sounding === undefined) throw new Error('no phrase is sounding')
  const now = await audioNow(page)
  const events = await audioEvents(page)
  const backingAts = events.flatMap((e) => (e.kind === 'backing' ? [e.at] : []))
  for (let n = 1; n <= sounding; n += 1) {
    const start = await phraseStartsAt(page, n)
    expect(start, `phrase ${n}'s start`).toBeCloseTo(grid.origin + (n - 1) * grid.length, 6)
    if (start > since) {
      expect(
        backingAts.some((at) => Math.abs(at - start) < 1e-6),
        `phrase ${n}'s backing`,
      ).toBe(true)
    }
  }
  const clicks = events
    .flatMap((e) => (e.kind === 'click' && e.route === 'click' ? [e.at] : []))
    .filter((at) => at > since && at <= now)
    .sort((a, b) => a - b)
  const firstBeat = Math.floor((since - grid.origin) / BEAT) + 1
  const lastBeat = Math.floor((now - grid.origin) / BEAT)
  expect(clicks).toHaveLength(lastBeat - firstBeat + 1)
  clicks.forEach((at, k) => expect(at).toBeCloseTo(grid.origin + (firstBeat + k) * BEAT, 6))
}

/**
 * Intent: assert the session has ended into the Review with the lost controller still selected
 * and away: no banner, the no-controller badge, no connection sheet.
 */
async function expectAwayInReview(page: Page): Promise<void> {
  const { lastEnd } = await sessionState(page)
  expect(lastEnd?.soundedPhraseCount).toBeGreaterThanOrEqual(1)
  await expectReviewShowing(page, lastEnd?.soundedPhraseCount ?? 0)
  await expect(disconnectBanner(page)).toHaveCount(0)
  expect(await midiState(page)).toEqual({ kind: 'away', device: KEYS })
  await expect.poll(() => statusForm(page)).toEqual(FORM.noController)
  await expect(sheet(page)).toHaveCount(0)
}

/**
 * Intent: assert the same device, plugged back in, reattached by itself in the Review: connected,
 * no connection sheet, the Review still showing and no session started.
 */
async function expectReattachedInReview(page: Page): Promise<void> {
  const { review } = await sessionState(page)
  await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
  expect(await midiState(page)).toEqual({ kind: 'connected', device: KEYS })
  await expect(sheet(page)).toHaveCount(0)
  await expect(reviewPanel(page)).toBeVisible()
  await expect(sessionAction(page)).toHaveText('Close review')
  const state = await sessionState(page)
  expect(state.phase).toBe('idle')
  expect(state.review).toEqual(review)
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

  // @test-link [[rule_controller_loss_mid_session]]
  // @test-link [[rule_controller_reconnection_window]]
  test('the phrase keeps playing at tempo through the countdown and after the same device is back', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await readyWithKeys(page)
    await startSession(page)
    await untilReady(page, 2)
    await toRunning(page)
    const { sessionTempo } = await sessionState(page)
    // Phrases 1 and 2 are scheduled before the loss: four 4/4 measures apart at the tempo.
    const grid = await phraseGrid(page)
    expect(grid.length).toBeCloseTo(4 * MEASURE, 6)

    const lostAt = await unplugNow(page, KEYS)
    await expectLost(page, 30)

    // Through the countdown: phrase 2 starts on time and the beat goes on.
    await toBarline(page, 2, 0)
    await expect(disconnectBanner(page)).toBeVisible()
    await expectAtTempo(page, grid, lostAt)
    await toBarline(page, 2, 2)
    await expect(disconnectBanner(page)).toBeVisible()
    await expectStillRunning(page, 'mid-countdown')
    await expectAtTempo(page, grid, lostAt)

    await plugIn(page, KEYS)

    await expect.poll(() => midiKind(page)).toBe('connected')
    await expectBack(page)
    await untilReady(page, 3)
    await toBarline(page, 3, 0)
    await toBarline(page, 3, 2)
    await expectStillRunning(page, 'after the replug')
    await expectAtTempo(page, grid, lostAt)
    expect((await sessionState(page)).sessionTempo).toBe(sessionTempo)
  })
})

// @test-link [[rule_start_while_controller_away]]
// @test-link [[rule_same_controller_reattaches]]
test.describe('a controller lost mid-session and still away when the session ends', () => {
  // @test-link [[rule_start_while_controller_away]]
  // @test-link [[rule_same_controller_reattaches]]
  // @test-link [[rule_controller_reconnection_window]]
  test('ended by the 30-second rule: still selected in the Review, it reattaches there when back', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await readyWithKeys(page)
    await startSession(page)
    await untilReady(page, 2)
    await toRunning(page)
    const lostAt = await unplugNow(page, KEYS)
    await expectLost(page, 30)

    await clockTo(page, lostAt + 30.05)

    await expectEndedBetween(page, 'controller-lost', lostAt + 30, lostAt + 30.05)
    await expectAwayInReview(page)

    await plugIn(page, KEYS)

    await expectReattachedInReview(page)
  })

  // @test-link [[rule_start_while_controller_away]]
  // @test-link [[rule_same_controller_reattaches]]
  test('ended by Stop during the countdown: still selected in the Review, it reattaches there when back', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await readyWithKeys(page)
    await startSession(page)
    await untilReady(page, 2)
    await toRunning(page)
    const lostAt = await unplugNow(page, KEYS)
    await clockTo(page, lostAt + 5)
    await expectLost(page, 25)

    await sessionAction(page).click()

    expect((await sessionState(page)).lastEnd).toMatchObject({ cause: 'stop', phase: 'running' })
    await expectAwayInReview(page)

    await plugIn(page, KEYS)

    await expectReattachedInReview(page)
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
