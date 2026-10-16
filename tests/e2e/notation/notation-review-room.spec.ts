/**
 * A Review never cuts a phrase (ux D290, spec D296): a kept session played with my instrument in
 * treble clef, written C2 to C4 (19 staff spaces), reviewed after my instrument is switched to bass
 * clef (shared height 16), gets the larger size, so every phrase is drawn whole: each of its
 * systems is engraved at 19 staff spaces, the size the planner gives that range's ink. On the
 * workspace harness (port 4175), its fake audio clock and the browser's real IndexedDB.
 */
import { expect, test, type Page } from '@playwright/test'

import { expectIdleReady } from '../review/review-helpers'
import {
  rowOpen,
  sessionAt,
  sessionDateOf,
  showListFromCueRow,
  startAt,
} from '../review/session-list-helpers'
import { sessionAction } from '../session/session-helpers'
import {
  instrumentRecords,
  openSheet,
  saveSheet,
  sheetSegment,
} from '../storage/my-instrument-sheet-helpers'
import {
  gotoStorageHarness,
  reloadHarness,
  seedMyInstrument,
  seedSettings,
} from '../storage/storage-helpers'

/** The Review's engraved system SVGs. */
const REVIEW_SYSTEMS = '.review-panel .review-staff svg.staff-svg'

/** Intent: leave the Review for Idle. */
async function closeReview(page: Page): Promise<void> {
  await expectIdleReady(page)
  await expect(sessionAction(page)).toHaveText('Close review')
  await sessionAction(page).click()
  await expect(sessionAction(page)).toHaveText('Start session')
}

/**
 * Intent: the height, in engraving units, each of the Review's systems is engraved at: its SVG's
 * viewBox height, the system-position size the staff was placed in.
 */
function reviewSystemHeights(page: Page): Promise<number[]> {
  return page.$$eval(REVIEW_SYSTEMS, (svgs) =>
    svgs.map((svg) => (svg as SVGSVGElement).viewBox.baseVal.height),
  )
}

// @test-link [[module_notation_layout_preflight]]
// @test-link [[req_kept_session_review]]
test('a session played in treble clef, written C2 to C4, reviews whole after my instrument is switched to bass clef', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page)
  await seedMyInstrument(page, {
    template: 'c-keyboard',
    name: 'Low keys',
    clef: 'treble',
    writtenRange: { minMidi: 36, maxMidi: 60 },
    transposition: { octaves: 0, semitones: 0, direction: 'same' },
  })
  await seedSettings(page, { 'controls.instrumentProfileId': 'my-instrument' })
  await reloadHarness(page)
  await sessionAt(page, startAt(1))
  await closeReview(page)

  await openSheet(page)
  await sheetSegment(page, 'Clef', 'Bass clef').click()
  await saveSheet(page)
  await expect
    .poll(() => instrumentRecords(page))
    .toEqual([expect.objectContaining({ clef: 'bass' })])

  await showListFromCueRow(page)
  await rowOpen(page, await sessionDateOf(page, startAt(1))).click()
  // planSystemPositionUnits({ C2, C4 } in treble clef): 19 staff spaces, 190 units, where the
  // whole range's ink, with its end clearance, fits; the shared size in bass clef is 160.
  await expect.poll(async () => (await reviewSystemHeights(page)).length).toBeGreaterThan(0)
  const heights = await reviewSystemHeights(page)
  expect(
    heights.every((height) => Math.abs(height - 190) < 1e-6),
    heights.join(' '),
  ).toBe(true)
})
