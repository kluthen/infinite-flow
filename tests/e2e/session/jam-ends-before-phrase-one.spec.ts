/**
 * v3.2 chunk 21b: a fresh Jam's ends before phrase 1 sounds, on the workspace harness (port 4175:
 * fake audio clock, fake MIDI, real generations, forced failures). Each returns to Jam mode's Idle
 * (`staff-jam` back, no review, nothing kept or saved), the mode staying Jam, focus where the end
 * sends it: Stop, the tab hidden and no doodle note within 30 s to `Start Jam`; the controller lost
 * at once (no banner), `Start Jam` disabled under `jam-needs-controller`, to `controller-status`;
 * a viewport change leaving no room for the staff to Jam's `room-notice`. Every phrase 1 attempt
 * failed ends the Jam at its deadline under `jam-notice`, which `Start Jam` names, and which the
 * next start, a change of a Jam setting or the instrument, and leaving Jam mode remove; no other
 * end shows it. A Jam stopped once phrase 1 has sounded opens the Review in Jam mode, where the
 * home note starts nothing, and `Close review` leaves Jam mode's Idle.
 */
import { expect, test, type Page } from '@playwright/test'

import { controllerStatus, watchPageErrors } from '../controller/controller-helpers'
import { failNextGeneration } from '../release/harness-helpers'
import { expectReviewShowing } from '../review/review-helpers'
import { radio } from '../workspace/helpers'
import {
  expectChecked,
  jamFrame,
  modeSegment,
  sessionViewport,
} from '../workspace/jam-mode-helpers'
import {
  HOME_NOTE,
  JAM_NOTICE_TEXT,
  PAST_BARLINE,
  cueShown,
  doodleReadings,
  expectJamIdleAfter,
  gotoJamIdle,
  jamGrid,
  jamRoomNotice,
  jamStaffNotice,
  jamToRunning,
  playDoodle,
  startJamByClick,
  untilAttemptsSettled,
  untilPhraseOneAnswered,
} from './jam-helpers'
import { sessionAction, sessionState } from './session-helpers'
import {
  KEYS,
  clockTo,
  disconnectBanner,
  noteOff,
  noteOn,
  startLine,
  unplugNow,
} from './session-midi-helpers'
import {
  KEPT_SENTENCE,
  jamBarSentence,
  untilKeptPhraseOneReady,
} from '../workspace/kept-doodle-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Where in a fresh Jam an end comes, before phrase 1 sounds. */
type JamStage = 'count-in' | 'capture' | 'writing' | 'read-in'

/**
 * Intent: from a fresh Jam just started, move to the middle of `stage` with a one-measure doodle
 * played (from the capture on), phrase 1 answered for the read-in.
 */
async function jamTo(page: Page, stage: JamStage): Promise<void> {
  const grid = await jamGrid(page)
  if (stage === 'count-in') {
    await clockTo(page, grid.startAt + 2 * grid.beat)
    expect(await cueShown(page)).toBe('count-in')
    return
  }
  await playDoodle(page, grid, 1)
  if (stage === 'capture') {
    expect(await cueShown(page)).toBe('jam-capture')
    return
  }
  await clockTo(page, grid.barline(1) + PAST_BARLINE)
  if (stage === 'writing') {
    expect(await cueShown(page)).toBe('jam-writing')
    return
  }
  await untilPhraseOneAnswered(page)
  await clockTo(page, grid.barline(2) + 2 * grid.beat)
  expect(await cueShown(page)).toBe('count-in')
  expect((await sessionState(page)).systems.top, 'phrase 1 entered').toBe('1:whole')
  await expect(doodleReadings(page)).toBeVisible()
}

/**
 * Intent: assert Jam's staff is back as at Idle: `staff-jam` with its empty system, not fading,
 * session mode's staff out of sight with nothing on it, `doodle-readings` empty, no `jam-notice`.
 */
async function expectStaffJamBack(page: Page): Promise<void> {
  await expect(jamFrame(page)).toBeVisible()
  await expect(jamFrame(page).locator('svg.staff-svg')).toHaveCount(1)
  await expect(page.locator('.score-panel .is-fading-out')).toHaveCount(0)
  await expect(sessionViewport(page)).toHaveClass(/is-out-of-sight/)
  expect((await sessionState(page)).systems).toEqual({ top: null, bottom: null })
  await expect(doodleReadings(page)).toHaveCount(0)
  await expect(page.locator('#jam-notice')).toHaveCount(0)
}

// @test-link [[rule_jam_ending_before_phrase_one]]
// @test-link [[module_jam_session_end]]
test.describe("Stop before phrase 1 sounds returns to Jam mode's Idle, focus on Start Jam", () => {
  for (const stage of ['count-in', 'capture', 'writing', 'read-in'] as const) {
    // @test-link [[rule_jam_ending_before_phrase_one]]
    // @test-link [[module_jam_session_end]]
    test(`in the ${stage}`, async ({ page }) => {
      await gotoJamIdle(page)
      await startJamByClick(page)
      await jamTo(page, stage)

      await sessionAction(page).click()

      await expectJamIdleAfter(page, 'stop')
      await expectStaffJamBack(page)
      await expect(sessionAction(page)).toHaveText('Start Jam')
      await expect(sessionAction(page)).toBeEnabled()
      await expect(sessionAction(page)).toBeFocused()
      await expect(startLine(page)).toHaveText('Play this note to start: C5')
    })
  }
})

// @test-link [[rule_jam_controller_loss_before_phrase_one]]
// @test-link [[module_jam_session_end]]
test('the controller lost ends the Jam at once: no banner, jam-needs-controller, focus on controller-status', async ({
  page,
}) => {
  await gotoJamIdle(page)
  await startJamByClick(page)
  await jamTo(page, 'capture')

  await unplugNow(page, KEYS)

  await expectJamIdleAfter(page, 'controller-lost')
  await expect(disconnectBanner(page)).toHaveCount(0)
  expect((await sessionState(page)).controllerLost).toBeNull()
  await expectStaffJamBack(page)
  expect(await cueShown(page)).toBe('needs-controller')
  await expect(sessionAction(page)).toHaveText('Start Jam')
  await expect(sessionAction(page)).toBeDisabled()
  await expect(sessionAction(page)).toHaveAttribute('aria-describedby', 'jam-needs-controller')
  await expect(controllerStatus(page)).toBeFocused()
})

// @test-link [[rule_jam_ending_before_phrase_one]]
test("the tab hidden ends the Jam: Jam mode's Idle, focus on Start Jam", async ({ page }) => {
  await gotoJamIdle(page)
  await startJamByClick(page)
  await jamTo(page, 'writing')

  await page.evaluate(() => window.__workspaceHarness.page.setHidden(true))

  await expectJamIdleAfter(page, 'hidden-tab')
  await expectStaffJamBack(page)
  await expect(sessionAction(page)).toBeFocused()
  await page.evaluate(() => window.__workspaceHarness.page.setHidden(false))
  await expect(sessionAction(page)).toBeEnabled()
})

// @test-link [[rule_jam_ending_before_phrase_one]]
test.describe('the staff no longer shown ends the Jam', () => {
  // @test-link [[rule_jam_ending_before_phrase_one]]
  test("too narrow in the read-in: Jam's staff takes Needs more room, focus on its room-notice", async ({
    page,
  }) => {
    await gotoJamIdle(page)
    await startJamByClick(page)
    await jamTo(page, 'read-in')

    await page.setViewportSize({ width: 300, height: 200 })

    await expectJamIdleAfter(page, 'staff-not-shown')
    await expect(jamRoomNotice(page)).toBeVisible()
    await expect(jamRoomNotice(page)).toBeFocused()
    await expect(sessionAction(page)).toHaveText('Start Jam')
    await expect(sessionAction(page)).toBeDisabled()
    await expect(doodleReadings(page)).toHaveCount(0)
    await expect(page.locator('#jam-notice')).toHaveCount(0)
  })

  // @test-link [[rule_jam_ending_before_phrase_one]]
  test.describe("too narrow before phrase 1 enters: Jam's staff takes Needs more room", () => {
    for (const phase of ['count-in', 'capture'] as const) {
      // @test-link [[rule_jam_ending_before_phrase_one]]
      test(`in the ${phase}: the Jam ends, focus on Jam's room-notice`, async ({ page }) => {
        await gotoJamIdle(page)
        await startJamByClick(page)
        await jamTo(page, phase)

        await page.setViewportSize({ width: 300, height: 200 })

        await expectJamIdleAfter(page, 'staff-not-shown')
        await expect(jamRoomNotice(page)).toBeVisible()
        await expect(jamRoomNotice(page)).toBeFocused()
        await expect(sessionAction(page)).toBeDisabled()
        await expect(page.locator('#jam-notice')).toHaveCount(0)
      })
    }
  })

  // @test-link [[rule_jam_ending_before_phrase_one]]
  test("a portrait view in the capture: turned back, Jam mode's Idle with staff-jam", async ({
    page,
  }) => {
    await gotoJamIdle(page)
    await startJamByClick(page)
    await jamTo(page, 'capture')

    await page.setViewportSize({ width: 800, height: 1100 })

    await expect.poll(async () => (await sessionState(page)).lastEnd?.cause).toBe('staff-not-shown')
    await expect(page.locator('.orientation-notice')).toBeVisible()
    await expect(page.locator('.layout-app')).toBeHidden()
    await page.setViewportSize({ width: 1280, height: 800 })
    await expectJamIdleAfter(page, 'staff-not-shown')
    await expectStaffJamBack(page)
    await expect(sessionAction(page)).toHaveText('Start Jam')
    await expect(sessionAction(page)).toBeEnabled()
  })
})

// @test-link [[rule_jam_without_doodle_note_ends]]
test('no doodle note within 30 s after the count-in ends the Jam, focus on Start Jam', async ({
  page,
}) => {
  await gotoJamIdle(page)
  await startJamByClick(page)
  const grid = await jamGrid(page)

  await clockTo(page, grid.barline(0) + 29.9)
  expect((await sessionState(page)).phase).toBe('count-in')
  expect(await cueShown(page)).toBe('jam-capture')
  await clockTo(page, grid.barline(0) + 30.1)

  await expectJamIdleAfter(page, 'no-note-played')
  await expectStaffJamBack(page)
  await expect(sessionAction(page)).toBeFocused()
})

/**
 * Intent: start a fresh Jam whose every phrase 1 attempt fails, play a one-measure doodle, let
 * every attempt fail, and move past its deadline (three measures after the generation measure
 * begins, barline 4): the Jam ends there, not before, under `jam-notice`.
 */
async function jamWithEveryRungFailed(page: Page): Promise<void> {
  await failNextGeneration(page, 'search_limit_exceeded', 0, 50)
  await startJamByClick(page)
  await expect(page.locator('#jam-notice')).toHaveCount(0)
  const grid = await jamGrid(page)
  await playDoodle(page, grid, 1)
  await clockTo(page, grid.barline(1) + PAST_BARLINE)
  await untilAttemptsSettled(page)
  await clockTo(page, grid.barline(4) - 0.05)
  expect((await sessionState(page)).phase, 'before the deadline').toBe('count-in')
  expect(await cueShown(page)).toBe('jam-writing')
  await clockTo(page, grid.barline(4) + PAST_BARLINE)
  await expectJamIdleAfter(page, 'no-phrase-one')
}

/** Intent: assert `jam-notice` shows under `jam-instruction`, named by `Start Jam`, focused. */
async function expectJamNotice(page: Page): Promise<void> {
  await expect(jamStaffNotice(page)).toHaveText(JAM_NOTICE_TEXT)
  const previous = await jamStaffNotice(page).evaluate(
    (notice) => notice.previousElementSibling?.className ?? null,
  )
  expect(previous, 'under jam-instruction').toBe('jam-instruction')
  await expect(sessionAction(page)).toHaveText('Start Jam')
  await expect(sessionAction(page)).toBeEnabled()
  await expect(sessionAction(page)).toHaveAttribute('aria-describedby', 'jam-notice')
  await expect(sessionAction(page)).toHaveAccessibleDescription(JAM_NOTICE_TEXT)
  await expect(sessionAction(page)).toBeFocused()
}

/** Intent: assert `jam-notice` is gone and `Start Jam` names nothing. */
async function expectNoJamNotice(page: Page): Promise<void> {
  await expect(page.locator('#jam-notice')).toHaveCount(0)
  await expect(sessionAction(page)).not.toHaveAttribute('aria-describedby')
}

// @test-link [[rule_jam_ends_when_phrase_one_never_comes]]
// @test-link [[module_jam_session_end]]
test('every phrase 1 attempt failed: the Jam ends at its deadline under jam-notice; the next start removes it', async ({
  page,
}) => {
  await gotoJamIdle(page)
  await jamWithEveryRungFailed(page)
  const requests = await page.evaluate(() => window.__workspaceHarness.generationRequests())
  expect(requests.length, 'the whole ladder was tried').toBeGreaterThanOrEqual(3)
  expect(requests.every((request) => request.timeline === null)).toBe(true)

  await expectJamNotice(page)
  await expectChecked(page, 'Jam')

  await startJamByClick(page)
  await expectNoJamNotice(page)
  await sessionAction(page).click()
  await expectJamIdleAfter(page, 'stop')
  await expectNoJamNotice(page)
})

/** One way to remove `jam-notice` at Jam mode's Idle. */
interface NoticeRemoval {
  readonly name: string
  readonly remove: (page: Page) => Promise<void>
}

/** Intent: change Jam's written key to G. */
function changeWrittenKey(page: Page): Promise<void> {
  return radio(page, 'Written key', 'G').click()
}

/** Intent: change the instrument to the alto saxophone, from Jam's controls. */
function changeInstrument(page: Page): Promise<void> {
  return radio(page, 'Instrument profile', 'E-flat alto saxophone').click()
}

/** Intent: lower Jam's tempo by one step. */
function changeTempo(page: Page): Promise<void> {
  return page.getByRole('button', { name: 'Decrease tempo' }).click()
}

/** Intent: leave Jam mode for session mode, then come back to Jam mode. */
async function leaveAndComeBack(page: Page): Promise<void> {
  await modeSegment(page, 'Session').click()
  await expectChecked(page, 'Session')
  await modeSegment(page, 'Jam').click()
  await expectChecked(page, 'Jam')
}

const REMOVALS: readonly NoticeRemoval[] = [
  { name: 'the written key', remove: changeWrittenKey },
  { name: 'the instrument', remove: changeInstrument },
  { name: 'the tempo', remove: changeTempo },
  { name: 'leaving Jam mode', remove: leaveAndComeBack },
]

// @test-link [[rule_jam_ends_when_phrase_one_never_comes]]
test.describe('jam-notice goes at a change of a Jam setting, of the instrument, or leaving Jam mode', () => {
  for (const removal of REMOVALS) {
    // @test-link [[rule_jam_ends_when_phrase_one_never_comes]]
    test(removal.name, async ({ page }) => {
      await gotoJamIdle(page)
      await jamWithEveryRungFailed(page)
      await expectJamNotice(page)

      await removal.remove(page)

      await expectNoJamNotice(page)
      await expect(jamFrame(page)).toBeVisible()
      await expectChecked(page, 'Jam')
    })
  }
})

// @test-link [[rule_jam_runs_as_session_from_phrase_one]]
// @test-link [[req_jam]]
// @test-link [[rule_session_end_generates_next_phrase_one]]
test('stopped after phrase 1, the Review opens in Jam mode; the home note starts nothing; Close review leaves Idle', async ({
  page,
}) => {
  await gotoJamIdle(page)
  await startJamByClick(page)
  await jamToRunning(page)

  await sessionAction(page).click()

  await expectReviewShowing(page, 1)
  await expectChecked(page, 'Jam')
  // The end hands Jam's code the ended Jam's Jam part, which keeps its doodle (chunk 24).
  expect((await sessionState(page)).lastEnd).toEqual({
    cause: 'stop',
    phase: 'running',
    soundedPhraseCount: 1,
    jam: expect.objectContaining({ sessionKey: expect.any(String) }),
  })
  const before = await sessionState(page)
  const at = await noteOn(page, KEYS, HOME_NOTE)
  await noteOff(page, KEYS, HOME_NOTE, at)
  expect(await sessionState(page), 'the home note started nothing').toEqual(before)
  expect(await page.evaluate(() => window.__workspaceHarness.audio.isRunning())).toBe(false)
  await expect(sessionAction(page)).toHaveText('Close review')

  await sessionAction(page).click()

  // Idle keeps the doodle: phrase 1 written from it, with jam-bar, its first note the starting note.
  await untilKeptPhraseOneReady(page)
  await expectChecked(page, 'Jam')
  await expect(jamBarSentence(page)).toHaveText(KEPT_SENTENCE)
  await expect(startLine(page)).toHaveText(/Play this note to start: [A-G]/)
})
