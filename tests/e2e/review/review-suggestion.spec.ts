/**
 * v3.2 chunk 23b, the key and mode suggestion and `Jam again on this doodle` in a Jam session's
 * Review (master spec C6.3 to C6.5; the review's handoff, `review-doodle`, `suggestion-row`, Focus
 * and Keyboard), on the workspace harness (port 4175: fake audio clock, fake MIDI, real
 * generations) over the browser's real IndexedDB; each test from an empty browser context on the
 * tenor saxophone, Jam's Collection set to Major at Jam's Idle (the first visit's is C Ionian,
 * session mode's). A fresh Jam is played with a two-measure
 * doodle of eight notes, one on each beat, then Stopped once phrase 1 sounds:
 *
 * - a doodle plainly in G major (concert) is offered as "A Major" in written pitch, an Ionian
 *   answer read as Major under Major; `Jam in A Major` says "Jams now play in A Major.", focused,
 *   sets Jam's key and mode, kept after a reload, and never session mode's;
 * - `Keep C Major` takes the row away, focus on `Jam again on this doodle`, and the kept session's
 *   Review offers nothing after a reload;
 * - a chromatic doodle gets the "no mode fits" sentence, naming no note, with no button;
 * - the doodle section's controls come in the tab order between `review-view`'s and the first
 *   favorite star;
 * - over session mode (the kept session's Review after a reload), `Jam in A Major` sets Jam's key
 *   and mode only, and `Jam again on this doodle` leaves the review mode onto Jam mode;
 * - axe finds nothing in the doodle section with the suggestion offered, then set, in both themes.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { controllerStatus, watchPageErrors } from '../controller/controller-helpers'
import {
  PAST_BARLINE,
  doodleNote,
  gotoJamIdle,
  jamGrid,
  startJamByClick,
  untilPhraseOneAnswered,
} from '../session/jam-helpers'
import { sessionAction, sessionState } from '../session/session-helpers'
import { clockTo } from '../session/session-midi-helpers'
import { reloadHarness } from '../storage/storage-helpers'
import { expectChecked, modeSegment } from '../workspace/jam-mode-helpers'
import { keepPlayedNotesToggle, reviewLink, reviewPanel, reviewTitle } from './review-helpers'
import { untilKept } from './review-tools-helpers'

/** A doodle plainly in G major, in concert pitch: G A B C D E F-sharp G. */
const G_MAJOR = [67, 69, 71, 72, 74, 76, 78, 79] as const

/** A chromatic run from C to G, in concert pitch: no mode holds 80 % of it. */
const CHROMATIC = [60, 61, 62, 63, 64, 65, 66, 67] as const

/** The sentence a doodle outside the app's keys and modes gets. */
const NO_FIT = "Your doodle uses notes outside the app's keys and modes, so no key is suggested."

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: axe's violations, one per line, for a failing assertion's message. */
function describeViolations(violations: readonly { id: string; help: string }[]): string {
  return violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n')
}

/** Intent: the Review's doodle section. */
function doodleSection(page: Page): Locator {
  return reviewPanel(page).locator('section.review-doodle')
}

/** Intent: the doodle section's suggestion row. */
function suggestionRow(page: Page): Locator {
  return doodleSection(page).locator(':scope > .suggestion-row')
}

/** Intent: `Jam again on this doodle`. */
function jamAgain(page: Page): Locator {
  return doodleSection(page).getByRole('button', { name: 'Jam again on this doodle' })
}

/** Intent: the radio checked in the radiogroup `name` of the controls shown below the staff. */
function checkedIn(page: Page, name: 'Written key' | 'Collection'): Locator {
  return page.getByRole('radiogroup', { name, exact: true }).getByRole('radio', { checked: true })
}

/** Intent: land on Jam mode's Idle, Jam's key and mode set to C Major there. */
async function gotoJamInCMajor(page: Page): Promise<void> {
  await gotoJamIdle(page)
  await page
    .getByRole('radiogroup', { name: 'Collection', exact: true })
    .getByRole('radio', { name: 'Major', exact: true })
    .click()
  await expect(checkedIn(page, 'Collection')).toHaveAccessibleName('Major')
}

/**
 * Intent: from Jam mode's Idle, a fresh Jam whose two-measure doodle is `pitches`, one on each
 * beat, run until phrase 1 sounds, then Stopped: the Review shows.
 */
async function jamReviewed(page: Page, pitches: readonly number[]): Promise<void> {
  await startJamByClick(page)
  const grid = await jamGrid(page)
  for (const [index, pitch] of pitches.entries()) {
    await doodleNote(page, pitch, grid.barline(0) + index * grid.beat + 0.01)
  }
  await clockTo(page, grid.barline(2) + PAST_BARLINE)
  await untilPhraseOneAnswered(page)
  await clockTo(page, grid.barline(4) + 1)
  expect((await sessionState(page)).phase).toBe('running')
  await sessionAction(page).click()
  await expect(reviewTitle(page)).toBeVisible()
}

/** Intent: assert the row offers A Major against Jam's C Major, its two plain buttons. */
async function expectOffered(page: Page): Promise<void> {
  await expect(suggestionRow(page).locator(':scope > p')).toHaveText(
    'Your doodle sounds like A Major.',
  )
  const buttons = suggestionRow(page).locator(':scope > button')
  await expect(buttons).toHaveText(['Jam in A Major', 'Keep C Major'])
  await expect(suggestionRow(page).locator('.btn-primary')).toHaveCount(0)
}

// @test-link [[req_key_and_mode_suggestion]]
test.describe('the suggestion in the review of the Jam just played', () => {
  // @test-link [[rule_suggestion_use_it]]
  // @test-link [[rule_suggestion_named_in_players_family]]
  test("Jam in A Major sets Jam's key and mode, kept after a reload, never session mode's", async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoJamInCMajor(page)
    await jamReviewed(page, G_MAJOR)
    await expectOffered(page)

    await suggestionRow(page).getByRole('button', { name: 'Jam in A Major' }).click()

    const set = suggestionRow(page).locator(':scope > p')
    await expect(set).toHaveText('Jams now play in A Major.')
    await expect(set).toHaveAttribute('tabindex', '-1')
    await expect(set).toBeFocused()
    await expect(suggestionRow(page).locator(':scope > button')).toHaveCount(0)
    // The Review shows over Jam mode: Jam's controls below it take the answer.
    await expect(checkedIn(page, 'Written key')).toHaveAccessibleName('A')
    await expect(checkedIn(page, 'Collection')).toHaveAccessibleName('Major')

    await sessionAction(page).click()
    await expect(reviewPanel(page)).toHaveCount(0)
    await modeSegment(page, 'Session').click()
    await expectChecked(page, 'Session')
    await expect(checkedIn(page, 'Written key')).toHaveAccessibleName('C')
    await expect(checkedIn(page, 'Collection')).toHaveAccessibleName('Ionian')

    await reloadHarness(page)
    await modeSegment(page, 'Jam').click()
    await expectChecked(page, 'Jam')
    await expect(checkedIn(page, 'Written key')).toHaveAccessibleName('A')
  })

  // @test-link [[rule_suggestion_keep_mine]]
  test('Keep C Major takes the row away for good, after a reload too', async ({ page }) => {
    test.setTimeout(150_000)
    await gotoJamInCMajor(page)
    await jamReviewed(page, G_MAJOR)
    await expectOffered(page)
    await untilKept(page, 1)

    await suggestionRow(page).getByRole('button', { name: 'Keep C Major' }).click()

    await expect(suggestionRow(page)).toHaveCount(0)
    await expect(jamAgain(page)).toBeFocused()
    // Jam's key and mode are unchanged.
    await expect(checkedIn(page, 'Written key')).toHaveAccessibleName('C')

    await reloadHarness(page)
    await expectChecked(page, 'Session')
    await reviewLink(page).click()
    await expect(reviewTitle(page)).toBeFocused()
    await expect(jamAgain(page)).toBeEnabled()
    await expect(suggestionRow(page)).toHaveCount(0)
  })

  // @test-link [[rule_doodle_outside_modes_told]]
  test('a chromatic doodle gets the "no mode fits" sentence, naming no note', async ({ page }) => {
    test.setTimeout(120_000)
    await gotoJamInCMajor(page)
    await jamReviewed(page, CHROMATIC)

    await expect(suggestionRow(page)).toHaveText(NO_FIT)
    await expect(suggestionRow(page).locator(':scope > button')).toHaveCount(0)
  })

  // @test-link [[req_key_and_mode_suggestion]]
  test("the doodle section's controls come between review-view's and the first favorite", async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoJamInCMajor(page)
    await jamReviewed(page, G_MAJOR)
    await expectOffered(page)

    await keepPlayedNotesToggle(page).focus()
    const reached: string[] = []
    for (let step = 0; step < 4; step += 1) {
      await page.keyboard.press('Tab')
      reached.push(
        await page.evaluate(() => (document.activeElement as HTMLElement).innerText.trim()),
      )
    }

    expect(reached.slice(0, 3)).toEqual([
      'Jam again on this doodle',
      'Jam in A Major',
      'Keep C Major',
    ])
    await expect(page.locator(':focus')).toHaveClass(/favorite-toggle/u)
  })
})

// @test-link [[req_key_and_mode_suggestion]]
test.describe("the suggestion in a kept Jam session's Review over session mode", () => {
  // @test-link [[rule_suggestion_use_it]]
  // @test-link [[rule_jam_again_on_this_doodle]]
  test("Jam in A Major sets Jam's key and mode only; Jam again opens Jam mode", async ({
    page,
  }) => {
    test.setTimeout(150_000)
    await gotoJamInCMajor(page)
    await jamReviewed(page, G_MAJOR)
    await untilKept(page, 1)
    await reloadHarness(page)
    await expectChecked(page, 'Session')
    await reviewLink(page).click()
    await expectOffered(page)

    await suggestionRow(page).getByRole('button', { name: 'Jam in A Major' }).click()

    await expect(suggestionRow(page)).toHaveText('Jams now play in A Major.')
    // Session mode's controls show below the Review, untouched.
    await expect(checkedIn(page, 'Written key')).toHaveAccessibleName('C')
    await expect(checkedIn(page, 'Collection')).toHaveAccessibleName('Ionian')

    await jamAgain(page).click()

    await expect(reviewPanel(page)).toHaveCount(0)
    await expectChecked(page, 'Jam')
    await expect(sessionAction(page)).toHaveText('Start Jam')
    await expect(checkedIn(page, 'Written key')).toHaveAccessibleName('A')
    await expect(checkedIn(page, 'Collection')).toHaveAccessibleName('Major')
    // Focus as `Close review` moves it in Jam mode's Idle: with no controller since the reload,
    // `Start Jam` is disabled, so `controller-status`.
    await expect(sessionAction(page)).toBeDisabled()
    await expect(controllerStatus(page)).toBeFocused()
  })
})

// The doodle section with its controls, in both themes: the suggestion offered, then set.
for (const theme of ['Light', 'Dark'] as const) {
  // @test-link [[req_key_and_mode_suggestion]]
  test(`has no detectable axe violations with the suggestion offered, then set, ${theme} theme`, async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoJamInCMajor(page)
    await page
      .getByRole('radiogroup', { name: 'Presentation theme' })
      .getByRole('radio', { name: theme, exact: true })
      .click()
    await jamReviewed(page, G_MAJOR)
    await expectOffered(page)
    await expect(doodleSection(page).locator('[data-system-position="top"] svg')).toBeAttached({
      timeout: 30_000,
    })
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => !(animation instanceof CSSTransition)),
    )

    const offered = await new AxeBuilder({ page }).analyze()
    expect(offered.violations, describeViolations(offered.violations)).toEqual([])

    await suggestionRow(page).getByRole('button', { name: 'Jam in A Major' }).click()
    await expect(suggestionRow(page)).toHaveText('Jams now play in A Major.')
    const set = await new AxeBuilder({ page }).analyze()
    expect(set.violations, describeViolations(set.violations)).toEqual([])
  })
}
