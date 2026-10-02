/**
 * v2.0 chunk 20, a 2 000-phrase Review stays responsive, on the workspace harness's fake audio
 * clock (port 4175) at 1280 x 800, its history inflated by `session.inflateHistory(2000)`: the
 * list holds every phrase, numbered in order, and only the phrases near the visible area are
 * engraved: every item within one viewport height of it is engraved, none beyond three is (ux
 * D149's lazy window), at the top of the list and again once scrolled to its end, where the last
 * phrases are engraved and the first ones released. `Close review` and `Review last session`
 * close and reopen it with all 2 000 items.
 *
 * It also takes one reference measurement and logs it (console and the `review-2000` annotation):
 * the time from the Stop click to the first frame showing all 2 000 items with phrase 1
 * engraved, and the same for `Close review` and `Review last session`, read on `performance.now()`
 * through an animation-frame loop; the longest main-thread task while it opens (the shared
 * `longtask` probe); and Chromium's own counters through the DevTools protocol
 * (`Performance.getMetrics`): task, script, layout and style time spent opening it, and the JS
 * heap and DOM node count once it settled. The numbers are a reference, never a pass/fail check:
 * the assertions are on correctness and counts only.
 */
import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import {
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  startSession,
} from '../session/session-helpers'
import { installMainThreadProbes } from '../workspace/main-thread-probes'
import {
  expectReviewShowing,
  playUntilPhrase,
  reviewItems,
  reviewLink,
  reviewPanel,
  reviewTitle,
} from './review-helpers'

const PHRASE_COUNT = 2000

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** What the Review shows: which items are engraved, and which break the lazy window. */
interface EngravingWindowReading {
  /** Every engraved item's phrase number (its staff holds an SVG). */
  readonly engraved: number[]
  /** Items within one viewport height of the visible area that are not engraved. */
  readonly nearBlank: number[]
  /** Items more than three viewport heights from the visible area that are engraved. */
  readonly farEngraved: number[]
}

/**
 * Intent: read every review item's distance from the visible area (as the Review's scheduler
 * measures it) and whether its staff is engraved. A 1 px margin keeps an item sitting exactly on
 * a window's edge out of either check.
 */
function readEngravingWindow(page: Page): Promise<EngravingWindowReading> {
  return reviewItems(page).evaluateAll((items) => {
    const height = window.innerHeight
    const reading = {
      engraved: [] as number[],
      nearBlank: [] as number[],
      farEngraved: [] as number[],
    }
    items.forEach((item, index) => {
      const box = item.getBoundingClientRect()
      const distance = box.bottom < 0 ? -box.bottom : box.top > height ? box.top - height : 0
      const engraved = item.querySelector('.review-staff svg') !== null
      if (engraved) reading.engraved.push(index + 1)
      if (distance < height - 1 && !engraved) reading.nearBlank.push(index + 1)
      if (distance > 3 * height + 1 && engraved) reading.farEngraved.push(index + 1)
    })
    return reading
  })
}

/**
 * Intent: wait until the lazy window has settled where the page is scrolled to: every near item
 * engraved and no far one; returns that reading.
 */
async function settledWindow(page: Page): Promise<EngravingWindowReading> {
  let reading: EngravingWindowReading | null = null
  await expect
    .poll(
      async () => {
        reading = await readEngravingWindow(page)
        return { nearBlank: reading.nearBlank, farEngraved: reading.farEngraved }
      },
      { timeout: 60_000 },
    )
    .toEqual({ nearBlank: [], farEngraved: [] })
  if (reading === null) throw new Error('the engraving window was never read')
  return reading
}

/** What the Review has to show for a timed action to be done. */
type TimedUntil = 'review-open' | 'review-closed'

type TimingWindow = Window & {
  __reviewTiming: { startedAt: number | null; doneAt: number | null }
}

/**
 * Intent: click `target` and return the milliseconds, on `performance.now()`, from the click to
 * the first animation frame where the Review is open with all its items and phrase 1 engraved,
 * or closed. The loop is armed before the click and stamps the click in the capture phase.
 */
async function clickAndTime(page: Page, target: Locator, until: TimedUntil): Promise<number> {
  await page.evaluate(
    ([kind, count]) => {
      const timing = { startedAt: null as number | null, doneAt: null as number | null }
      ;(window as unknown as TimingWindow).__reviewTiming = timing
      document.addEventListener(
        'click',
        () => {
          timing.startedAt = performance.now()
        },
        { capture: true, once: true },
      )
      const done = (): boolean => {
        if (kind === 'review-closed') return document.querySelector('.review-panel') === null
        const items = document.querySelectorAll('ol.review-list > li.review-phrase')
        return items.length === count && items[0]?.querySelector('.review-staff svg') != null
      }
      const tick = (): void => {
        if (timing.startedAt !== null && done()) {
          timing.doneAt = performance.now()
          return
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    },
    [until, PHRASE_COUNT] as const,
  )
  await target.click()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as TimingWindow).__reviewTiming.doneAt), {
      timeout: 60_000,
    })
    .not.toBeNull()
  const timing = await page.evaluate(() => (window as unknown as TimingWindow).__reviewTiming)
  if (timing.startedAt === null || timing.doneAt === null)
    throw new Error('the click was not timed')
  return timing.doneAt - timing.startedAt
}

/** Intent: Chromium's performance counters now, by name (DevTools protocol). */
async function performanceMetrics(cdp: CDPSession): Promise<Record<string, number>> {
  const { metrics } = await cdp.send('Performance.getMetrics')
  return Object.fromEntries(metrics.map((metric) => [metric.name, metric.value]))
}

/** Intent: the longest main-thread task the probe recorded from `since` on, in ms; 0 for none. */
async function longestTaskSince(page: Page, since: number): Promise<number> {
  return page.evaluate(
    (from) =>
      Math.max(
        0,
        ...(window.__mainThread?.longTasks ?? [])
          .filter((task) => task.startTime + task.duration >= from)
          .map((task) => task.duration),
      ),
    since,
  )
}

/** Intent: a duration in seconds, as Chromium's counters give it, in whole milliseconds. */
function ms(seconds: number): number {
  return Math.round(seconds * 1000)
}

// @test-link [[req_last_session_review]]
test.describe('a 2 000-phrase Review', () => {
  // @test-link [[req_last_session_review]]
  test('lists every phrase, engraves only near the visible area to its end, and closes and reopens', async ({
    page,
  }) => {
    test.setTimeout(240_000)
    await installMainThreadProbes(page)
    await gotoSessionHarness(page)
    await page.evaluate(
      (count) => window.__workspaceHarness.session.inflateHistory(count),
      PHRASE_COUNT,
    )
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Performance.enable')

    await readyToStart(page)
    await startSession(page)
    await playUntilPhrase(page, 1)
    const before = await performanceMetrics(cdp)
    const openMs = await clickAndTime(page, sessionAction(page), 'review-open')
    const opened = await performanceMetrics(cdp)
    const openedAt = await page.evaluate(
      () => (window as unknown as TimingWindow).__reviewTiming.startedAt ?? 0,
    )

    await expectReviewShowing(page, 1)
    await expect(reviewItems(page)).toHaveCount(PHRASE_COUNT)
    await expect(reviewPanel(page).locator('.review-summary')).toHaveText(
      /^2000 phrases · B-flat tenor saxophone\./,
    )
    await expect(reviewItems(page).first().locator('.review-phrase-title')).toHaveText('Phrase 1')
    await expect(reviewItems(page).last().locator('.review-phrase-title')).toHaveText('Phrase 2000')

    // At the top: phrase 1 and its neighbours engraved, a bounded few, nothing far below.
    const top = await settledWindow(page)
    expect(top.engraved[0]).toBe(1)
    expect(top.engraved.length).toBeLessThan(PHRASE_COUNT / 20)
    const settled = await performanceMetrics(cdp)
    const longestOpenTaskMs = await longestTaskSince(page, openedAt)

    // At the end (the last item at the viewport's bottom): the last phrases engraved, the first
    // ones released to their blank space.
    await reviewItems(page)
      .last()
      .evaluate((item) => item.scrollIntoView({ block: 'end', behavior: 'instant' }))
    const end = await settledWindow(page)
    expect(end.engraved.slice(-2)).toEqual([PHRASE_COUNT - 1, PHRASE_COUNT])
    expect(end.engraved.length).toBeLessThan(PHRASE_COUNT / 20)
    expect(end.engraved).not.toContain(1)
    await expect(reviewItems(page).first().locator('.review-staff svg')).toHaveCount(0)
    await expect(
      reviewItems(page).first().locator('.review-staff [data-system-position="top"]'),
    ).toHaveCount(1)

    // Close review, then Review last session: closed, then all 2 000 again, from the top.
    const closeMs = await clickAndTime(page, sessionAction(page), 'review-closed')
    await expect(reviewPanel(page)).toHaveCount(0)
    await expect(sessionAction(page)).toHaveText('Start session')
    const reopenMs = await clickAndTime(page, reviewLink(page), 'review-open')
    await expect(reviewItems(page)).toHaveCount(PHRASE_COUNT)
    await expect(reviewTitle(page)).toBeFocused()
    const reopened = await settledWindow(page)
    expect(reopened.engraved[0]).toBe(1)
    expect(reopened.engraved.length).toBeLessThan(PHRASE_COUNT / 20)

    const report = {
      viewport: page.viewportSize(),
      phrases: PHRASE_COUNT,
      openMs: Math.round(openMs),
      longestOpenTaskMs: Math.round(longestOpenTaskMs),
      openTaskMs: ms((opened.TaskDuration ?? 0) - (before.TaskDuration ?? 0)),
      openScriptMs: ms((opened.ScriptDuration ?? 0) - (before.ScriptDuration ?? 0)),
      openLayoutMs: ms((opened.LayoutDuration ?? 0) - (before.LayoutDuration ?? 0)),
      openStyleMs: ms((opened.RecalcStyleDuration ?? 0) - (before.RecalcStyleDuration ?? 0)),
      jsHeapUsedMB: Math.round(((settled.JSHeapUsedSize ?? 0) / 2 ** 20) * 10) / 10,
      domNodes: settled.Nodes ?? 0,
      engravedAtTop: top.engraved.length,
      engravedAtEnd: end.engraved.length,
      closeMs: Math.round(closeMs),
      reopenMs: Math.round(reopenMs),
    }
    console.log(`2 000-phrase Review reference measurement: ${JSON.stringify(report)}`)
    test.info().annotations.push({ type: 'review-2000', description: JSON.stringify(report) })
  })
})
