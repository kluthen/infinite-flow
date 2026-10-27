/**
 * v3.2 chunk 20: the header's mode switch, `Session` then `Jam`. The app opens in session mode at
 * every load, a reload in Jam mode included; the switch works at Idle only, read-only during
 * Loading, a session and the review mode; the first press of `Jam` in a visit fetches Jam's code
 * chunk, never before and never again; while it loads the workspace is held and `Session` cancels;
 * a failed load leaves session mode as it was under Jam's load-failure notice, focus on its
 * `Try again` unless a sheet is open as the wait ends, when focus stays in the sheet; the score
 * title reads `Jam` in Jam mode and `Four-measure phrase` otherwise, while Jam's code loads
 * included; leaving Jam mode
 * returns session mode with its phrase and its pre-generated phrases untouched, pre-generation
 * resuming where it stopped; a controller arriving or leaving never switches the mode; and once
 * the service worker has kept the build, Jam mode opens offline. On the workspace harness (port
 * 4175: fake audio clock, fake MIDI, gated generation) except where the production build (port
 * 4173) and its service worker are the subject.
 */
import { expect, test, type Page } from '@playwright/test'

import { KEYS, gotoControllerHarness, plug, unplug } from '../controller/controller-helpers'
import {
  awaitIdle,
  harnessSnapshot,
  holdGeneration,
  releaseGeneration,
  queueSeeds,
  settleFrames,
} from '../release/harness-helpers'
import { sessionEndedAfter } from '../review/review-helpers'
import { allSessions, listTitle } from '../review/session-list-helpers'
import { toBarline } from '../session/rolling-helpers'
import {
  footerYourData,
  openYourData,
  sheetButton,
  yourDataSheet,
} from '../storage/your-data-helpers'
import {
  DESKTOP,
  PREGENERATION_OFF,
  gotoSessionHarness,
  phraseAction,
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
} from '../session/session-helpers'
import { connectDevice, midiKind } from '../session/session-midi-helpers'
import { gotoWorkspace, primaryButton } from './helpers'
import {
  JAM_CHUNK,
  JAM_LOAD_FAILED,
  expectChecked,
  expectJamModeShows,
  expectSessionModeShows,
  expectSwitchRefuses,
  holdJamChunk,
  jamFrame,
  jamNotice,
  jamNoticeButton,
  modeSegment,
  modeSwitch,
  openingSeen,
  refuseJamChunk,
  scoreTitle,
  sessionFrame,
  waitForServiceWorkerReady,
  watchJamChunk,
  watchOpening,
} from './jam-mode-helpers'
import {
  backgroundCounts,
  generationRecords,
  gotoPregenerationHarness,
  holdBackground,
  phraseOfSeed,
  readyWithSessionSeed,
  releaseBackground,
  untilBackgroundHeld,
  untilQueueFull,
} from './pregeneration-helpers'

/** The session seed every phrase 1 of the pre-generation cases is published with. */
const SESSION_SEED = 4242

/** Intent: land on the harness with pre-generation off, whatever the harness build's default. */
function gotoHarness(page: Page): Promise<void> {
  return gotoSessionHarness(page, DESKTOP, PREGENERATION_OFF)
}

/** Intent: a phrase on screen at Idle, from the harness: its timeline, never null. */
async function shownTimeline(page: Page): Promise<string> {
  const { timeline } = await harnessSnapshot(page)
  if (timeline === null) throw new Error('no phrase is shown')
  return timeline
}

/** Intent: assert session mode shows at Idle with exactly `timeline` drawn, ready to start. */
async function expectSessionModeAsLeft(page: Page, timeline: string): Promise<void> {
  await expectSessionModeShows(page)
  await expect(sessionFrame(page)).toHaveClass(/staff-ready/)
  await expect(sessionAction(page)).toBeEnabled()
  expect(await shownTimeline(page)).toBe(timeline)
}

/** Intent: let a few animation frames pass, so whatever a change set going has had its turn. */
async function settleAWhile(page: Page): Promise<void> {
  for (let frame = 0; frame < 5; frame += 1) await settleFrames(page)
}

/**
 * Intent: let exactly the background attempt held at the gate through, holding the next one: the
 * gate is released and closed again in one turn of the page.
 */
async function passOneBackground(page: Page): Promise<void> {
  const answered = (await backgroundCounts(page)).answered
  await page.evaluate(() => {
    window.__workspaceHarness.releaseBackgroundGeneration()
    window.__workspaceHarness.holdBackgroundGeneration()
  })
  await expect
    .poll(async () => (await backgroundCounts(page)).answered, { timeout: 30_000 })
    .toBe(answered + 1)
  await untilBackgroundHeld(page)
}

/**
 * Intent: start a session, play until phrase 3 sounds, Stop, and return the timelines of the
 * phrases 2 and 3 it played; no attempt was made for them.
 */
async function playedPhrasesTwoAndThree(page: Page): Promise<(string | undefined)[]> {
  const startedAt = (await generationRecords(page)).length
  await startSession(page)
  await toBarline(page, 3, 0)
  await sessionAction(page).click()
  const { lastHistoryPhrases } = await sessionState(page)
  const history = (await generationRecords(page)).slice(startedAt)
  expect(
    history.filter((record) => record.signal),
    'phrases 2 and 3 were ready',
  ).toEqual([])
  return (lastHistoryPhrases ?? []).slice(1, 3).map((phrase) => phrase.timeline)
}

// @test-link [[rule_app_opens_in_session_mode]]
// @test-link [[module_workspace_mode]]
test('the app opens in session mode, after a reload too, even one made in Jam mode', async ({
  page,
}) => {
  await gotoWorkspace(page)
  await expectSessionModeShows(page)

  await page.reload()
  await page.locator('.generation-status').waitFor({ state: 'attached' })
  await expectSessionModeShows(page)

  await modeSegment(page, 'Jam').click()
  await expectJamModeShows(page)
  await page.reload()
  await page.locator('.generation-status').waitFor({ state: 'attached' })
  await expectSessionModeShows(page)
})

// @test-link [[rule_mode_button_at_idle_only]]
test('the switch is read-only during Loading, a session and the review mode, and works at Idle', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const jamRequests = watchJamChunk(page)
  await gotoHarness(page)

  // Loading: the generation held.
  await holdGeneration(page)
  await queueSeeds(page, [7])
  await primaryButton(page).click()
  await expect.poll(async () => (await harnessSnapshot(page)).operation).not.toBe('idle')
  await expectSwitchRefuses(page, 'Session')
  await releaseGeneration(page)
  await awaitIdle(page)
  await expect(modeSwitch(page)).not.toHaveAttribute('aria-readonly')

  // A session, in its count-in (the fake audio clock stands still); Stop there ends it.
  await expect(sessionAction(page)).toBeEnabled()
  await startSession(page)
  await expectSwitchRefuses(page, 'Session')
  await sessionAction(page).click()
  await expect(sessionAction(page)).toHaveText('Start session')

  // The review mode: the Review, then the session list.
  await sessionEndedAfter(page, 1)
  await expectSwitchRefuses(page, 'Session')
  await allSessions(page).click()
  await expect(listTitle(page)).toBeVisible()
  await expectSwitchRefuses(page, 'Session')
  await sessionAction(page).click()
  await expect(sessionAction(page)).toHaveText('Start session')
  expect(jamRequests).toEqual([])

  // Idle: switchable by a click and by the arrow keys, focus staying on the segment pressed.
  await expect(modeSwitch(page)).not.toHaveAttribute('aria-readonly')
  await modeSegment(page, 'Jam').click()
  await expectJamModeShows(page)
  await expect(modeSegment(page, 'Jam')).toBeFocused()
  await modeSegment(page, 'Jam').press('ArrowLeft')
  await expectSessionModeShows(page)
  await expect(modeSegment(page, 'Session')).toBeFocused()
  await modeSegment(page, 'Session').press('ArrowRight')
  await expectJamModeShows(page)
  await expect(modeSegment(page, 'Jam')).toBeFocused()
  await modeSegment(page, 'Session').click()
  await expectSessionModeShows(page)
  await expect(modeSegment(page, 'Session')).toBeFocused()
})

// @test-link [[rule_jam_code_loaded_on_demand]]
// @test-link [[module_jam_code_boundary]]
test("the first press of Jam fetches Jam's code, once; later presses wait for nothing", async ({
  page,
}) => {
  const jamRequests = watchJamChunk(page)
  await gotoHarness(page)
  await readyToStart(page)
  await settleAWhile(page)
  expect(jamRequests, 'nothing of Jam is fetched before the first press').toEqual([])

  await modeSegment(page, 'Jam').click()
  await expectJamModeShows(page)
  expect(jamRequests).toHaveLength(1)

  await modeSegment(page, 'Session').click()
  await expectSessionModeShows(page)
  await watchOpening(page)
  await modeSegment(page, 'Jam').click()
  await expectJamModeShows(page)
  await modeSegment(page, 'Session').click()
  await modeSegment(page, 'Jam').click()
  await expectJamModeShows(page)
  expect(await openingSeen(page), 'a later press shows Jam mode at once').toBe(false)
  expect(jamRequests).toHaveLength(1)
})

// @test-link [[module_workspace_mode]]
test('while Jam mode opens the workspace is held, and Session cancels the opening', async ({
  page,
}) => {
  await gotoHarness(page)
  await readyToStart(page)
  const timeline = await shownTimeline(page)
  const phraseLabel = (await phraseAction(page).textContent())?.trim() ?? ''
  const held = await holdJamChunk(page)

  await modeSegment(page, 'Jam').click()
  await expect.poll(held.requests).toBe(1)
  await expectChecked(page, 'Jam')
  await expect(modeSwitch(page)).toHaveClass(/is-loading/)
  await expect(modeSwitch(page)).toHaveAttribute('aria-busy', 'true')
  await expect(modeSwitch(page)).not.toHaveAttribute('aria-readonly')
  await expect(sessionAction(page)).toHaveText('Start session')
  await expect(sessionAction(page)).toBeDisabled()
  await expect(phraseAction(page)).toHaveText(phraseLabel)
  await expect(phraseAction(page)).toBeDisabled()
  await expect(page.getByRole('radiogroup', { name: 'Contour' })).toHaveAttribute(
    'aria-readonly',
    'true',
  )
  await expect(sessionFrame(page)).toHaveClass(/staff-ready/)
  await expect(jamFrame(page)).toHaveCount(0)
  await expect(scoreTitle(page), 'the title follows the mode shown, not the switch').toHaveText(
    'Four-measure phrase',
  )

  await modeSegment(page, 'Session').click()
  await expectSessionModeAsLeft(page, timeline)
  await expect(modeSegment(page, 'Session')).toBeFocused()
  await expect(phraseAction(page)).toBeEnabled()
  await expect(page.getByRole('radiogroup', { name: 'Contour' })).not.toHaveAttribute(
    'aria-readonly',
  )

  await held.release()
  await settleAWhile(page)
  await expectSessionModeAsLeft(page, timeline)

  await watchOpening(page)
  await modeSegment(page, 'Jam').click()
  await expectJamModeShows(page)
  expect(await openingSeen(page), 'the code loaded after the cancel is kept').toBe(false)
  expect(held.requests()).toBe(1)
})

// @test-link [[module_workspace_mode]]
test("a failed load leaves session mode as it was under Jam's load-failure notice", async ({
  page,
}) => {
  await gotoHarness(page)
  await readyToStart(page)
  const timeline = await shownTimeline(page)
  await refuseJamChunk(page)

  await modeSegment(page, 'Jam').click()

  await expect(jamNotice(page).locator('p')).toHaveText(JAM_LOAD_FAILED)
  await expect(jamNoticeButton(page, 'Try again')).toBeFocused()
  await expectSessionModeAsLeft(page, timeline)
})

// @test-link [[module_workspace_mode]]
test('a load failing while a sheet is open shows the notice, focus staying in the sheet', async ({
  page,
}) => {
  await gotoHarness(page)
  await readyToStart(page)
  const timeline = await shownTimeline(page)
  const held = await holdJamChunk(page)
  await modeSegment(page, 'Jam').click()
  await expect.poll(held.requests).toBe(1)
  await openYourData(page)

  await held.refuse()

  await expect(jamNotice(page).locator('p')).toHaveText(JAM_LOAD_FAILED)
  await expectChecked(page, 'Session')
  await settleAWhile(page)
  await expect(sheetButton(page, 'Done')).toBeFocused()

  // The sheet's own closing rule then applies: focus back to its opener.
  await sheetButton(page, 'Done').click()
  await expect(yourDataSheet(page)).toHaveCount(0)
  await expect(footerYourData(page)).toBeFocused()
  await expect(jamNotice(page)).toHaveCount(1)
  await expectSessionModeAsLeft(page, timeline)
})

// @test-link [[module_workspace_mode]]
test('a load ending while a sheet is open shows Jam mode under it, focus staying in the sheet', async ({
  page,
}) => {
  await gotoHarness(page)
  await readyToStart(page)
  const held = await holdJamChunk(page)
  await modeSegment(page, 'Jam').click()
  await expect.poll(held.requests).toBe(1)
  await openYourData(page)

  await held.release()

  await expect(modeSwitch(page)).not.toHaveClass(/is-loading/)
  await expectChecked(page, 'Jam')
  await expect(jamFrame(page)).toHaveCount(1)
  await expect(scoreTitle(page)).toHaveText('Jam')
  await settleAWhile(page)
  await expect(sheetButton(page, 'Done')).toBeFocused()

  await sheetButton(page, 'Done').click()
  await expect(footerYourData(page)).toBeFocused()
  await expectJamModeShows(page)
})

// Chromium keeps a failed dynamic import in its module map for the visit: the loader retries under
// a fresh URL (load-jam-mode.ts), so `Try again` fetches the chunk again.
// @test-link [[module_workspace_mode]]
// @test-link [[module_jam_code_boundary]]
test('Try again, once the network is back, fetches the code again and opens Jam mode', async ({
  page,
}) => {
  const jamRequests = watchJamChunk(page)
  await gotoHarness(page)
  await readyToStart(page)
  await refuseJamChunk(page)
  await modeSegment(page, 'Jam').click()
  await expect(jamNoticeButton(page, 'Try again')).toBeFocused()

  await page.unroute(JAM_CHUNK)
  await jamNoticeButton(page, 'Try again').click()

  await expect.poll(() => jamRequests.length).toBe(2)
  await expectJamModeShows(page)
  await expect(jamNotice(page)).toHaveCount(0)
})

// @test-link [[module_workspace_mode]]
test("Dismiss removes Jam's load-failure notice, session mode as it was", async ({ page }) => {
  await gotoHarness(page)
  await readyToStart(page)
  const timeline = await shownTimeline(page)
  await refuseJamChunk(page)

  await modeSegment(page, 'Jam').click()
  await expect(jamNoticeButton(page, 'Try again')).toBeFocused()
  await jamNoticeButton(page, 'Dismiss').click()

  await expect(jamNotice(page)).toHaveCount(0)
  await expectSessionModeAsLeft(page, timeline)
})

// @test-link [[rule_leaving_jam_mode_keeps_session_mode]]
// @test-link [[module_idle_pregeneration_queue]]
test('leaving Jam mode returns session mode with its phrase and its ready phrases', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await gotoPregenerationHarness(page)
  await readyWithSessionSeed(page, SESSION_SEED)
  const queued = await untilQueueFull(page)
  const timeline = await shownTimeline(page)
  const counts = await backgroundCounts(page)
  const calls = (await generationRecords(page)).length

  await modeSegment(page, 'Jam').click()
  await expectJamModeShows(page)
  await settleAWhile(page)
  expect(await backgroundCounts(page), 'nothing made, cancelled or discarded').toEqual(counts)

  await modeSegment(page, 'Session').click()
  await settleAWhile(page)
  await expectSessionModeAsLeft(page, timeline)
  expect(await backgroundCounts(page)).toEqual(counts)
  expect(await generationRecords(page)).toHaveLength(calls)

  expect(await playedPhrasesTwoAndThree(page)).toEqual([queued[0]!.timeline, queued[1]!.timeline])
})

// @test-link [[rule_leaving_jam_mode_keeps_session_mode]]
// @test-link [[module_idle_pregeneration_queue]]
test('pre-generation stops while Jam mode shows and resumes after the last ready phrase', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await gotoPregenerationHarness(page)
  await holdBackground(page)
  await readyWithSessionSeed(page, SESSION_SEED)
  await untilBackgroundHeld(page)
  await passOneBackground(page)
  await passOneBackground(page)
  const ready = (await generationRecords(page)).filter(
    (record) => record.background && record.timeline !== null,
  )
  const inFlight = await untilBackgroundHeld(page)
  expect(await phraseOfSeed(page, SESSION_SEED, inFlight.seed)).toBe(4)
  const timeline = await shownTimeline(page)

  // Jam mode: the attempt in flight is let go, the two ready phrases kept, nothing new made.
  await modeSegment(page, 'Jam').click()
  await expectJamModeShows(page)
  await expect.poll(async () => (await backgroundCounts(page)).cancelled).toBe(1)
  const inJam = (await generationRecords(page)).length
  await settleAWhile(page)
  expect(await generationRecords(page)).toHaveLength(inJam)
  expect((await backgroundCounts(page)).held).toBe(0)

  await modeSegment(page, 'Session').click()
  await expectSessionModeAsLeft(page, timeline)
  const resumed = await untilBackgroundHeld(page, inJam)
  expect(await phraseOfSeed(page, SESSION_SEED, resumed.seed), 'resumes at phrase 4').toBe(4)
  await releaseBackground(page)
  await untilQueueFull(page)

  expect(await playedPhrasesTwoAndThree(page)).toEqual(ready.map((record) => record.timeline))
})

// @test-link [[rule_mode_button_at_idle_only]]
// @test-link [[module_workspace_mode]]
test('a controller arriving or leaving never switches the mode', async ({ page }) => {
  await gotoControllerHarness(page, { query: { pregeneration: 'off' } })

  await connectDevice(page, KEYS)
  await expectSessionModeShows(page)
  await unplug(page, KEYS)
  await expect.poll(() => midiKind(page)).toBe('away')
  await expectSessionModeShows(page)

  await modeSegment(page, 'Jam').click()
  await expectJamModeShows(page)
  await plug(page, KEYS)
  await expect.poll(() => midiKind(page)).toBe('connected')
  await expectJamModeShows(page)
  await unplug(page, KEYS)
  await expect.poll(() => midiKind(page)).toBe('away')
  await expectJamModeShows(page)
})

// @test-link [[rule_jam_code_loaded_on_demand]]
// @test-link [[module_jam_code_boundary]]
test('offline, once the service worker has kept the files, Jam mode opens', async ({
  page,
  context,
}) => {
  const failed: string[] = []
  page.on('requestfailed', (request) =>
    failed.push(`${request.url()}: ${request.failure()?.errorText ?? 'failed'}`),
  )
  page.on('response', (response) => {
    if (response.status() >= 400) failed.push(`${response.url()}: HTTP ${response.status()}`)
  })
  await gotoWorkspace(page)
  await waitForServiceWorkerReady(page)
  await context.setOffline(true)
  await page.reload()
  await page.locator('.generation-status').waitFor({ state: 'attached' })

  const jamResponse = page.waitForResponse((response) => JAM_CHUNK.test(response.url()))
  await modeSegment(page, 'Jam').click()
  await expectJamModeShows(page)
  expect((await jamResponse).fromServiceWorker()).toBe(true)
  await expect(jamNotice(page)).toHaveCount(0)
  expect(failed).toEqual([])

  await context.setOffline(false)
})
