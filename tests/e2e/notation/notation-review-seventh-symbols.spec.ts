/**
 * Visual regression coverage for v3.3's seventh chord symbols on the Review's staff, chromium-only
 * (as `notation-visual.spec.ts`), on the workspace harness's fake audio clock (port 4175): a
 * one-phrase session played with the Seventh chords level at Mostly, set through the harness's
 * routing-point seam (`setChordFamilyLevel`) until its control ships, ends on the Review, whose
 * staff draws phrase 1 with its seventh symbols in the one-system layout of a desktop window.
 * Saving is on: the session's end keeps it at data version 5, which stores the level and its
 * seventh chords, with no page error. The baseline is generated with `--update-snapshots` and must
 * then re-run stable.
 */
import { expect, test } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import { fixWallClock, reviewItems, sessionEndedAfter } from '../review/review-helpers'
import { DESKTOP, gotoSessionHarness } from '../session/session-helpers'
import { waitForStaffFadeSettled } from './staff-fade-settle'

/** The seed of phrase 1, whose plan at Mostly holds a half-diminished seventh beside the maj7s. */
const PHRASE_ONE_SEED = 7

/** Phrase 1's chord symbols as drawn: letters and digits only (the flat is a music-font glyph). */
const PHRASE_ONE_SYMBOL_LETTERS = ['Cmaj7', 'Bm75', 'Cmaj7', 'Cmaj7']

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

// @test-link [[rule_seventh_chord_symbols]]
test("seventh chord symbols: the Review's staff matches its baseline for a phrase played at Mostly", async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page, DESKTOP)
  expect(await page.evaluate(() => window.__workspaceHarness.storage.savingState())).toBe('on')
  await fixWallClock(page)
  // The level change discards the ready phrases, and is refused while a generation is in flight.
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__workspaceHarness.setChordFamilyLevel('seventh-chords', 'stronglyFavored'),
      ),
    )
    .toBe(true)
  await sessionEndedAfter(page, 1, PHRASE_ONE_SEED)

  const staff = reviewItems(page).first().locator('.review-staff')
  await expect(staff.locator('svg.staff-svg')).toHaveCount(1)
  const symbols = await staff.locator('g.vf-chordsymbol').allTextContents()
  expect(symbols.map((text) => text.replace(/[^A-Za-z0-9]/gu, ''))).toEqual(
    PHRASE_ONE_SYMBOL_LETTERS,
  )

  await waitForStaffFadeSettled(page)
  await expect(staff).toHaveScreenshot('review-staff-sevenths.png')
})
