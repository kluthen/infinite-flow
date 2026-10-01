/**
 * v2.0 item 22, the window ends of a session, each in the count-in and once phrase 1 has sounded:
 * a portrait-shaped view below bp-desktop (a desktop window and a landscape phone turned), the
 * window too narrow for the layout the session holds, and, below bp-tablet-landscape, too short.
 * Each ends like Stop with the engine's `staff-not-shown` cause; the Idle rules then apply in the
 * layout the window gives afresh: the rotate-device notice, or Needs more room with focus on
 * `room-notice`, never the notation error. Runs against the workspace harness (port 4175) on its
 * fake audio clock, with real window sizes.
 */
import { expect, test, type Page } from '@playwright/test'

import {
  expectNoNotationError,
  harnessSnapshot,
  roomNotice,
  settleFrames,
} from '../release/harness-helpers'
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
  toRunning,
} from './session-helpers'

/** A window size. */
interface Size {
  readonly width: number
  readonly height: number
}

/**
 * The desktop window shrunk until the one-system layout it holds has no room at the legibility
 * floor (its container is about 270 px; 400 x 300 still has room). Landscape-shaped, so it is
 * not the portrait end.
 */
const TOO_NARROW_FOR_ONE_SYSTEM: Size = { width: 300, height: 200 }
/** The landscape phone made too short for the split staff at the legibility floor. */
const TOO_SHORT_PHONE: Size = { width: 740, height: 280 }

/** Intent: land at `size`, make a phrase ready, start, and move to `phase`; return the phrase. */
async function sessionIn(page: Page, size: Size, phase: 'count-in' | 'running') {
  await gotoSessionHarness(page, size)
  await readyToStart(page)
  const { requestId } = await harnessSnapshot(page)
  await startSession(page)
  if (phase === 'count-in') await toCountInMiddle(page)
  else await toRunning(page)
  return requestId
}

/** Intent: resize the window and let the staff re-measure and redraw. */
async function resize(page: Page, size: Size): Promise<void> {
  await page.setViewportSize(size)
  await settleFrames(page)
}

/**
 * Intent: assert what a window end leaves whatever its phase: once phrase 1 has sounded, the
 * engine's history closed with every phrase that sounded.
 */
async function expectWindowEnd(page: Page, phase: 'count-in' | 'running'): Promise<void> {
  await expectEndedLikeStop(page, 'staff-not-shown', phase)
  const state = await sessionState(page)
  if (phase === 'count-in') {
    expect(state.lastEnd?.soundedPhraseCount).toBe(0)
    return
  }
  expect(state.lastEnd?.soundedPhraseCount).toBeGreaterThanOrEqual(1)
  expect(state.lastHistoryPhraseCount).toBe(state.lastEnd?.soundedPhraseCount)
}

/** Intent: assert the Idle rules show Needs more room, focused, with Start session disabled. */
async function expectNeedsMoreRoomFocused(page: Page): Promise<void> {
  await expect(roomNotice(page)).toBeVisible()
  await expect(roomNotice(page)).toBeFocused()
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-no-room/)
  await expect(sessionAction(page)).toHaveText('Start session')
  await expect(sessionAction(page)).toBeDisabled()
  await expectNoNotationError(page)
}

for (const phase of ['count-in', 'running'] as const) {
  // @test-link [[rule_session_ends_on_portrait_view]]
  // @test-link [[rule_count_in_ending_returns_to_idle]]
  test.describe(`a portrait-shaped view below bp-desktop, in the ${phase}`, () => {
    for (const [from, to] of [
      [DESKTOP, { width: 800, height: 1100 }],
      [PHONE, { width: 360, height: 740 }],
    ] as const) {
      test(`${from.width}x${from.height} turned to ${to.width}x${to.height} ends the session`, async ({
        page,
      }) => {
        const shownBefore = await sessionIn(page, from, phase)

        await resize(page, to)

        await expectWindowEnd(page, phase)
        // The rotate-device notice replaces the whole workspace (as at Idle, the staff hidden
        // under it cannot be measured, so nothing of the workspace shows or is announced).
        await expect(page.locator('.orientation-notice')).toBeVisible()
        await expect(page.locator('.layout-app')).toBeHidden()

        // Turned back, the workspace shows again with a phrase; after a count-in end it can
        // start again, while a phrase the session played cannot (interim D-A).
        await resize(page, from)
        await expect(sessionAction(page)).toBeVisible()
        await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/, { timeout: 30_000 })
        await expectNoNotationError(page)
        const { requestId } = await harnessSnapshot(page)
        if (phase === 'count-in' || requestId !== shownBefore) {
          await expect(sessionAction(page)).toBeEnabled({ timeout: 30_000 })
        } else {
          await expect(sessionAction(page)).toBeDisabled()
        }
      })
    }
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  // @test-link [[rule_session_layout_fixed_at_start]]
  // @test-link [[rule_count_in_ending_returns_to_idle]]
  test.describe(`the window too small for the held layout, in the ${phase}`, () => {
    test('too narrow for the held one-system layout: Needs more room, focused', async ({
      page,
    }) => {
      await sessionIn(page, DESKTOP, phase)
      expect((await sessionState(page)).heldLayout).toBe('one-system')

      await resize(page, TOO_NARROW_FOR_ONE_SYSTEM)

      await expectWindowEnd(page, phase)
      await expectNeedsMoreRoomFocused(page)
    })

    test('below bp-tablet-landscape, too short for the held split layout: Needs more room, focused', async ({
      page,
    }) => {
      await sessionIn(page, PHONE, phase)
      expect((await sessionState(page)).heldLayout).toBe('split')

      await resize(page, TOO_SHORT_PHONE)

      await expectWindowEnd(page, phase)
      await expectNeedsMoreRoomFocused(page)
    })
  })
}
