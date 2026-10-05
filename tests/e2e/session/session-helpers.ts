/**
 * Shared helpers for the session screen specs: the workspace harness (port 4175) with its fake
 * audio clock, a phrase made ready to start from, the header's session action, the cue row, the
 * session controller's state through `window.__workspaceHarness.session`, the `Rising tempo`
 * control, the count-in clicks on the audio clock, and the staff's measure boxes in page
 * coordinates.
 */
import { expect, type Locator, type Page } from '@playwright/test'

import { advanceAudio, audioEvents, generateShownPhrase } from '../audio/audio-harness-helpers'
import { gotoWorkspaceHarness } from '../release/harness-helpers'

/** At and above bp-tablet-landscape (64rem = 1024 px): the one-system layout. */
export const DESKTOP = { width: 1280, height: 800 } as const
/** A landscape phone, below bp-tablet-landscape, with room for the split staff. */
export const PHONE = { width: 740, height: 360 } as const

/** Intent: the header's session action, `Start session` or `Stop`. */
export function sessionAction(page: Page): Locator {
  return page.locator('.layout-header button.session-action')
}

/** Intent: the always-present session cue row. */
export function cueRow(page: Page): Locator {
  return page.locator('.session-cue-row')
}

/** Intent: the session controller's state, read through the harness. */
export function sessionState(page: Page): Promise<WorkspaceHarnessSessionState> {
  return page.evaluate(() => window.__workspaceHarness.session.state())
}

/** Intent: a segment of the `Rising tempo` control, `Off` or `On`. */
export function risingTempoSegment(page: Page, label: 'Off' | 'On'): Locator {
  return page
    .getByRole('radiogroup', { name: 'Rising tempo' })
    .getByRole('radio', { name: label, exact: true })
}

/**
 * Intent: turn rising tempo (the page's adaptive-tempo flag) on or off with a click on its
 * control, and wait until the controller holds the choice.
 */
// @test-link [[req_adaptive_tempo]]
export async function setRisingTempo(page: Page, on: boolean): Promise<void> {
  await risingTempoSegment(page, on ? 'On' : 'Off').click()
  await expect
    .poll(() => page.evaluate(() => window.__workspaceHarness.session.state().adaptiveTempo))
    .toBe(on)
}

/** Intent: land on the harness at `size`, and wait for the session controller to load. */
export async function gotoSessionHarness(
  page: Page,
  size: { readonly width: number; readonly height: number } = DESKTOP,
): Promise<void> {
  await page.setViewportSize(size)
  await gotoWorkspaceHarness(page)
  await page.waitForFunction(() => window.__workspaceHarness.session.loaded())
}

/** Intent: generate a phrase seeded with `seed` and wait until `Start session` is enabled. */
export async function readyToStart(page: Page, seed = 7): Promise<void> {
  await generateShownPhrase(page, seed)
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/)
  await expect(sessionAction(page)).toBeEnabled()
}

/** Intent: click `Start session` and wait until the count-in shows. */
// @test-link [[rule_session_start_conditions]]
export async function startSession(page: Page): Promise<void> {
  await expect(sessionAction(page)).toHaveText('Start session')
  await sessionAction(page).click()
  await expect(sessionAction(page)).toHaveText('Stop')
  expect((await sessionState(page)).phase).toBe('count-in')
}

/** Intent: the count-in clicks the transport scheduled, in time order. */
export async function countInClickTimes(page: Page): Promise<number[]> {
  const events = await audioEvents(page)
  return events
    .filter(
      (event): event is Extract<WorkspaceHarnessAudioEvent, { kind: 'click' }> =>
        event.kind === 'click' && event.route === 'count-in',
    )
    .map((event) => event.at)
    .sort((a, b) => a - b)
}

/** Intent: how each count-in beat shows on screen: `current`, `past` or `muted`. */
export async function shownBeats(page: Page): Promise<string[]> {
  return page.locator('ol.count-in > li.count-in-beat').evaluateAll((items) =>
    items.map((item) => {
      if (item.classList.contains('is-current')) return 'current'
      return item.classList.contains('is-past') ? 'past' : 'muted'
    }),
  )
}

/** Intent: move the fake audio clock forward in steps of at most one second. */
export async function advanceAudioBy(page: Page, seconds: number): Promise<void> {
  let left = seconds
  while (left > 0) {
    const step = Math.min(1, left)
    await advanceAudio(page, step)
    left -= step
  }
}

/** The default tempo's beat, in seconds (90 BPM). */
export const BEAT = 60 / 90

/** Intent: the header's phrase action (Generate, Regenerate or Retry). */
export function phraseAction(page: Page): Locator {
  return page.locator('.header-actions > button:not(.session-action)')
}

/**
 * Intent: the latest session's timeline on the audio clock, read from its count-in clicks (planned
 * as the clock moves, the first at Start): its first click after the last fade (an earlier
 * session's end) starts it, and phrase 1 starts four beats later. Throws before any start.
 */
export async function sessionTimeline(
  page: Page,
): Promise<{ readonly startAt: number; readonly countInEndsAt: number }> {
  const lastFadeAt = Math.max(
    -1,
    ...(await audioEvents(page)).filter((e) => e.kind === 'fade').map((e) => e.at),
  )
  const startAt = (await countInClickTimes(page)).find((at) => at > lastFadeAt)
  if (startAt === undefined) throw new Error('no session count-in was scheduled')
  return { startAt, countInEndsAt: startAt + 4 * BEAT }
}

/** Intent: move the audio clock to the middle of the count-in, after its second click. */
export async function toCountInMiddle(page: Page): Promise<void> {
  const { startAt } = await sessionTimeline(page)
  await advanceAudioBy(page, startAt + BEAT + 0.03 - (await audioClock(page)))
  expect((await sessionState(page)).phase).toBe('count-in')
}

/** Intent: move the audio clock one second into phrase 1, so phrase 1 has sounded. */
export async function toRunning(page: Page): Promise<void> {
  const { countInEndsAt } = await sessionTimeline(page)
  await advanceAudioBy(page, countInEndsAt + 1 - (await audioClock(page)))
  expect((await sessionState(page)).phase).toBe('running')
}

/** Intent: the audio clock's time. */
function audioClock(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.audio.now())
}

/** The wake lock's and the orientation lock's request/release/held counters. */
export interface LockCounts {
  readonly wake: { readonly requests: number; readonly releases: number; readonly held: boolean }
  readonly orientation: {
    readonly requests: number
    readonly releases: number
    readonly held: boolean
  }
}

/** Intent: the wake lock's and the orientation lock's request/release/held counters. */
export function lockCounts(page: Page): Promise<LockCounts> {
  return page.evaluate(() => {
    const { wake, orientation } = window.__workspaceHarness.screenLocks
    return {
      wake: { requests: wake.requests(), releases: wake.releases(), held: wake.isHeld() },
      orientation: {
        requests: orientation.requests(),
        releases: orientation.releases(),
        held: orientation.isHeld(),
      },
    }
  })
}

/**
 * Intent: assert the session ended like Stop: the controller back at idle with this end summary,
 * the transport stopped by one fade on its bus, and both screen locks released.
 */
// @test-link [[rule_stop_ends_session]]
// @test-link [[rule_screen_wake_lock_during_session]]
// @test-link [[rule_landscape_lock_during_session]]
export async function expectEndedLikeStop(
  page: Page,
  cause: WorkspaceHarnessSessionEndCause,
  phase: 'count-in' | 'running',
): Promise<void> {
  await expect.poll(async () => (await sessionState(page)).phase).toBe('idle')
  const { lastEnd } = await sessionState(page)
  expect(lastEnd?.cause).toBe(cause)
  expect(lastEnd?.phase).toBe(phase)
  expect(await page.evaluate(() => window.__workspaceHarness.audio.isRunning())).toBe(false)
  const fades = (await audioEvents(page)).filter((event) => event.kind === 'fade')
  // The end faded the bus out at the audio time it happened; the clock has not moved since.
  expect(fades.at(-1)?.scheduledAt).toBe(await audioClock(page))
  const locks = await lockCounts(page)
  expect(locks.wake.held).toBe(false)
  expect(locks.orientation.held).toBe(false)
  expect(locks.wake.releases).toBe(locks.wake.requests)
  expect(locks.orientation.releases).toBe(locks.orientation.requests)
}

/** One box in page coordinates (scroll-independent). */
export interface PageBox {
  readonly top: number
  readonly left: number
  readonly width: number
  readonly height: number
}

/** Intent: every drawn measure's box of phrase `phraseNumber` on the staff, in page coordinates. */
export function measureBoxes(page: Page, phraseNumber: number): Promise<PageBox[]> {
  const slots = `.staff-frame [data-phrase-number="${phraseNumber}"] g.measure-slot`
  return page.locator(slots).evaluateAll((slots) =>
    slots.map((slot) => {
      const box = slot.getBoundingClientRect()
      return {
        top: box.top + window.scrollY,
        left: box.left + window.scrollX,
        width: box.width,
        height: box.height,
      }
    }),
  )
}

/**
 * Intent: whether `locator`'s whole box is inside the viewport now, to within one CSS pixel: the
 * page scrolls by whole pixels, so a box laid out at a fractional offset can overrun by less.
 */
export function whollyInViewport(locator: Locator): Promise<boolean> {
  return locator.evaluate((element) => {
    const box = element.getBoundingClientRect()
    const height = document.documentElement.clientHeight
    const width = document.documentElement.clientWidth
    return box.top > -1 && box.left > -1 && box.bottom < height + 1 && box.right < width + 1
  })
}

/** Intent: whether `inner`'s whole box lies inside `outer`'s. */
export async function boxInside(inner: Locator, outer: Locator): Promise<boolean> {
  const [a, b] = await Promise.all([inner.boundingBox(), outer.boundingBox()])
  if (a === null || b === null) throw new Error('boxInside: an element is not rendered')
  return (
    a.x >= b.x && a.y >= b.y && a.x + a.width <= b.x + b.width && a.y + a.height <= b.y + b.height
  )
}
