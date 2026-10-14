/**
 * v2.0 chunk 20, the minimal Review on a landscape phone (740 x 360, below bp-tablet-landscape),
 * on the workspace harness's fake audio clock (port 4175): a session end opens it with `Close
 * review` in reach, no summary line, and each phrase in the split layout (two system positions,
 * engraved); the export works in both formats, and nothing on the page, the Review's parts
 * included, overflows horizontally, the MIDI options shown or not; `Close review` leaves it behind
 * `review-link`, which shows it again.
 */
import { expect, test, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import { PHONE, gotoSessionHarness, sessionAction } from '../session/session-helpers'
import {
  STEM,
  backingTrackToggle,
  collectDownloads,
  exportButton,
  exportOnce,
  fixWallClock,
  pickFormat,
  reviewItems,
  reviewLink,
  reviewPanel,
  reviewTitle,
  sessionEndedAfter,
} from './review-helpers'

// The export file names are the session's start in the player's local time: fix the zone.
test.use({ timezoneId: 'Europe/Paris' })

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/**
 * Intent: nothing overflows horizontally: the document has no horizontal scroll, and no part of
 * the Review is wider than its box or reaches past the viewport's inline end (1 px rounding
 * tolerance).
 */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth
    const parts = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.review-panel, .review-panel .review-header, .review-panel .review-export, .review-panel .review-phrase, .review-panel .review-staff',
      ),
    )
    return {
      document: document.documentElement.scrollWidth - viewportWidth,
      parts: parts
        .filter(
          (part) =>
            part.scrollWidth > part.clientWidth + 1 ||
            part.getBoundingClientRect().right > viewportWidth + 1,
        )
        .map((part) => part.className),
    }
  })
  expect(overflow.document, 'the document must not overflow horizontally').toBeLessThanOrEqual(1)
  expect(overflow.parts, 'Review parts that overflow').toEqual([])
}

// @test-link [[req_last_session_review]]
// @test-link [[req_session_export]]
// @test-link [[req_landscape_phrase_workspace]]
test.describe('the Review on a landscape phone', () => {
  // @test-link [[req_last_session_review]]
  // @test-link [[req_session_export]]
  // @test-link [[req_landscape_phrase_workspace]]
  test('opens minimal with split staves, exports both formats, never overflows, and closes', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const downloads = collectDownloads(page)
    await gotoSessionHarness(page, PHONE)
    await fixWallClock(page)
    await sessionEndedAfter(page, 2)

    // Minimal: the title and the export, no summary; each phrase on two system positions.
    await expect(reviewTitle(page)).toBeVisible()
    await expect(reviewPanel(page).locator('.review-summary')).toBeHidden()
    // The keep line only in its "Not saved" form on the phone: this session was saved.
    await expect(reviewPanel(page).locator('.review-keep-line')).toHaveCount(0)
    await expect(sessionAction(page)).toBeVisible()
    await expect(exportButton(page)).toBeVisible()
    await expect(reviewItems(page)).toHaveCount(2)
    const firstStaff = reviewItems(page).first().locator('.review-staff')
    await expect(firstStaff.locator('svg').first()).toBeAttached({ timeout: 30_000 })
    await expect(firstStaff.locator('[data-system-position]')).toHaveCount(2)
    await expect(firstStaff.locator('[data-system-position] svg')).toHaveCount(2)
    await expectNoHorizontalOverflow(page)

    const musicXml = await exportOnce(page, downloads)
    expect(musicXml.fileName).toBe(`${STEM}-generated.musicxml`)

    await pickFormat(page, 'MIDI')
    await backingTrackToggle(page).click()
    await expect(backingTrackToggle(page)).toHaveAttribute('aria-pressed', 'true')
    await expectNoHorizontalOverflow(page)
    const midi = await exportOnce(page, downloads)
    expect(midi.fileName).toBe(`${STEM}-generated.mid`)
    expect(midi.bytes.subarray(0, 4).toString('latin1')).toBe('MThd')
    expect(downloads.all).toHaveLength(2)

    // Close review, then Review last session from the cue row.
    await sessionAction(page).click()
    await expect(reviewPanel(page)).toHaveCount(0)
    await expect(sessionAction(page)).toHaveText('Start session')
    await expect(reviewLink(page)).toBeVisible()
    await expect(reviewLink(page)).toHaveAccessibleName('Last session')
    await reviewLink(page).click()
    await expect(reviewTitle(page)).toBeFocused()
    await expect(reviewItems(page)).toHaveCount(2)
    await expectNoHorizontalOverflow(page)
  })
})
