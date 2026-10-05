/**
 * v2.0 chunk 16, the fit of the session's material in the layout it holds: a look-ahead phrase
 * too wide for the held layout is never drawn and counts as a failed attempt, so its retry is the
 * phrase drawn; and a window change that leaves a phrase shown, or one checked and waiting, unable
 * to fit (or the held one-system layout, below bp-tablet-landscape, with no room for its two
 * systems) ends the session like Stop, with no notation error ever shown and the playhead band
 * gone. Runs against the workspace harness (port 4175) on its fake audio clock, its fit verdicts
 * forced where a real phrase would fit.
 */
import { expect, test, type Page } from '@playwright/test'

import {
  engravings,
  expectNoNotationError,
  fitChecks,
  queueFitVerdicts,
  queueSeeds,
  roomNotice,
  seedsDrawn,
  settleFrames,
} from '../release/harness-helpers'
import { reviewPanel } from '../review/review-helpers'
import {
  DESKTOP,
  PHONE,
  expectEndedLikeStop,
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
  toCountInMiddle,
} from './session-helpers'
import {
  drawnKeys,
  sessionNotationErrors,
  settledStaff,
  startRollingLog,
  toBarline,
  untilReady,
} from './rolling-helpers'

/** Two seeds for phrase 2's attempts: the first one forced too wide, the second its retry. */
const MISFIT_SEED = 501
const RETRY_SEED = 502

/**
 * Intent: a fingerprint of phrase 2 as the bottom system draws it in the count-in: its summary
 * and every note's identity and box, which differ between two different phrases.
 */
function phraseTwoFingerprint(page: Page): Promise<string> {
  return page
    .locator('.staff-frame [data-system-position="bottom"] > .staff-content:not(.is-fading-out)')
    .evaluate((unit) => {
      if (unit.getAttribute('data-phrase-number') !== '2') throw new Error('not phrase 2')
      const svg = unit.querySelector<SVGSVGElement>('svg.staff-svg')
      if (svg === null) throw new Error('phrase 2 has no staff SVG')
      const notes = [...svg.querySelectorAll<SVGGraphicsElement>('[data-note-id]')].map((note) => {
        const box = note.getBBox()
        const at = [box.x, box.y, box.width, box.height].map((n) => Math.round(n)).join(',')
        return `${note.getAttribute('data-note-id')}@${at}`
      })
      return JSON.stringify({ summary: svg.getAttribute('aria-label'), notes })
    })
}

/**
 * Intent: start a session in the count-in with the given seeds queued for its attempts (and
 * the given fit verdicts forced), wait for phrase 2 to be drawn below phrase 1, and return its
 * fingerprint with how many seeds, fit checks and engravings that took. Stop ends it after.
 */
async function phraseTwoOfSession(
  page: Page,
  seeds: readonly number[],
  verdicts: readonly WorkspaceHarnessFitVerdict[] = [],
) {
  await queueSeeds(page, seeds)
  await queueFitVerdicts(page, verdicts)
  const before = {
    seeds: await seedsDrawn(page),
    fits: await fitChecks(page),
    engravings: await engravings(page),
  }
  await startSession(page)
  await toCountInMiddle(page)
  await untilReady(page, 2)
  expect(drawnKeys(await settledStaff(page))).toEqual({ top: '1:whole', bottom: '2:whole' })
  const result = {
    fingerprint: await phraseTwoFingerprint(page),
    seeds: (await seedsDrawn(page)) - before.seeds,
    fits: (await fitChecks(page)) - before.fits,
    engravings: (await engravings(page)) - before.engravings,
    struggling: (await sessionState(page)).strugglingNotice,
  }
  const engravedAtStop = await engravings(page)
  await sessionAction(page).click()
  await expect.poll(async () => (await sessionState(page)).phase).toBe('idle')
  await expect(sessionAction(page)).toBeEnabled({ timeout: 30_000 })
  // Back at Idle the staff redraws phrase 1; let it land before the next session is counted.
  await expect.poll(() => engravings(page)).toBeGreaterThan(engravedAtStop)
  await settleFrames(page)
  return result
}

// @test-link [[module_session_display_fit]]
// @test-link [[rule_look_ahead_phrase_must_fit_staff]]
test('a look-ahead phrase too wide for the held layout is never drawn: its retry is', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await gotoSessionHarness(page, DESKTOP)
  await readyToStart(page)

  // What each seed alone gives as phrase 2, every attempt fitting.
  const misfit = await phraseTwoOfSession(page, [MISFIT_SEED])
  const retry = await phraseTwoOfSession(page, [RETRY_SEED])
  expect(misfit.fingerprint).not.toBe(retry.fingerprint)
  expect([misfit.seeds, misfit.fits, misfit.engravings]).toEqual([1, 1, 1])

  // The first attempt forced too wide: a failed attempt, retried with a fresh seed; only the
  // retry is drawn, and one failed attempt raises no struggling notice.
  await startRollingLog(page)
  const forced = await phraseTwoOfSession(page, [MISFIT_SEED, RETRY_SEED], ['notes_too_wide'])
  expect(forced.seeds).toBe(2)
  expect(forced.fits).toBe(2)
  expect(forced.engravings).toBe(1)
  expect(forced.fingerprint).toBe(retry.fingerprint)
  expect(forced.struggling).toBe(false)
  expect(await sessionNotationErrors(page)).toEqual([])
  await expectNoNotationError(page)
})

/** Intent: resize the window and let the staff re-measure and redraw. */
async function resize(
  page: Page,
  size: { readonly width: number; readonly height: number },
): Promise<void> {
  await page.setViewportSize(size)
  await settleFrames(page)
}

/**
 * Intent: assert a session ended like Stop on its staff, with no notation error shown while it
 * ran nor after, and no playhead band left.
 */
async function expectStaffEnd(page: Page, phase: 'count-in' | 'running'): Promise<void> {
  await expectEndedLikeStop(page, 'staff-not-shown', phase)
  await expectNoNotationError(page)
  expect(await sessionNotationErrors(page)).toEqual([])
  await expect(page.locator('.staff-frame rect.playhead-band')).toHaveCount(0)
}

// @test-link [[module_session_display_fit]]
// @test-link [[rule_session_ends_when_staff_too_small]]
// @test-link [[rule_session_layout_fixed_at_start]]
test.describe('a window change the shown or waiting material cannot fit ends like Stop', () => {
  test('in the count-in, a phrase shown no longer fitting the held one-system layout', async ({
    page,
  }) => {
    await gotoSessionHarness(page, DESKTOP)
    await readyToStart(page)
    await startRollingLog(page)
    await startSession(page)
    await toCountInMiddle(page)
    await untilReady(page, 2)
    expect(drawnKeys(await settledStaff(page))).toEqual({ top: '1:whole', bottom: '2:whole' })

    const checksBefore = await fitChecks(page)
    await queueFitVerdicts(page, ['notes_too_wide'])
    await resize(page, { width: 1200, height: 800 })

    await expectStaffEnd(page, 'count-in')
    expect(await fitChecks(page)).toBeGreaterThan(checksBefore)
  })

  test('running, a phrase checked and waiting no longer fitting the held split layout', async ({
    page,
  }) => {
    await gotoSessionHarness(page, PHONE)
    await readyToStart(page)
    await startRollingLog(page)
    await startSession(page)
    await toCountInMiddle(page)
    await untilReady(page, 2)
    await toBarline(page, 1, 0)
    const reading = await settledStaff(page)
    expect(reading.bands).toBe(1)
    expect(drawnKeys(reading)).toEqual({ top: '1:opening', bottom: '1:closing' })
    expect(reading.state.waiting).toEqual(['2:opening', '2:closing'])

    // The material check takes the phrases in order: phrase 1, shown, still fits; phrase 2,
    // waiting, does not.
    const checksBefore = await fitChecks(page)
    await queueFitVerdicts(page, ['fits', 'notes_too_wide'])
    await resize(page, { width: 760, height: 360 })

    await expectStaffEnd(page, 'running')
    expect(await fitChecks(page)).toBeGreaterThanOrEqual(checksBefore + 2)
  })

  test('running, the held one-system layout below bp-tablet-landscape too short for its systems', async ({
    page,
  }) => {
    await gotoSessionHarness(page, DESKTOP)
    await readyToStart(page)
    await startRollingLog(page)
    await startSession(page)
    await toCountInMiddle(page)
    await untilReady(page, 2)
    await toBarline(page, 1, 1)
    const reading = await settledStaff(page)
    expect(reading.state.heldLayout).toBe('one-system')
    expect(reading.bands).toBe(1)

    await resize(page, { width: 1000, height: 280 })

    await expectStaffEnd(page, 'running')
    // Phrase 1 had sounded: the Review shows, its room notice standing in for its list, and the
    // staff's own notice is there once it is closed.
    await expect(reviewPanel(page).locator('p.room-notice')).toBeVisible()
    await sessionAction(page).click()
    await expect(roomNotice(page)).toBeVisible()
  })
})
