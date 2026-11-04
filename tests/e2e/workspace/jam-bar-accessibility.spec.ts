/**
 * v3.2 chunk 24, the kept doodle's bar (`jam-bar`) at Jam mode's Idle, scanned with axe (the
 * phrase workspace's handoff, The kept doodle's bar; flows/jam/handoff.md, Routing Rules), on the
 * workspace harness (port 4175: fake audio clock, fake MIDI, real generations), the tenor
 * saxophone, Jam's Collection set to Major at Jam's Idle. A fresh Jam is played with a two-measure
 * doodle plainly in G major (concert), Stopped once phrase 1 sounds, and its Review closed: Jam
 * mode keeps the doodle, `jam-bar` shows its sentence, `New doodle` and the suggestion "A Major"
 * (written). In both themes: axe finds nothing with the suggestion offered; its sentences are out
 * of the tab order; `Jam in A Major` moves focus to "Jams now play in A Major.", and axe again
 * finds nothing. The bar's whole flow is the kept-doodle flow specs'.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
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
import { reviewPanel, reviewTitle } from '../review/review-helpers'
import { radio } from './helpers'

/** A doodle plainly in G major, in concert pitch: G A B C D E F-sharp G. */
const G_MAJOR = [67, 69, 71, 72, 74, 76, 78, 79] as const

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: axe's violations, one per line, for a failing assertion's message. */
function describeViolations(violations: readonly { id: string; help: string }[]): string {
  return violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n')
}

/** Intent: the kept doodle's bar. */
function jamBar(page: Page): Locator {
  return page.locator('.score-panel > .jam-bar')
}

/**
 * Intent: from Jam mode's Idle with Jam's Collection on Major, a fresh Jam on the G-major doodle,
 * one note on each beat, Stopped once phrase 1 sounds, then its Review closed: the doodle kept.
 */
async function doodleKept(page: Page): Promise<void> {
  await gotoJamIdle(page)
  await page
    .getByRole('radiogroup', { name: 'Collection', exact: true })
    .getByRole('radio', { name: 'Major', exact: true })
    .click()
  await startJamByClick(page)
  const grid = await jamGrid(page)
  for (const [index, pitch] of G_MAJOR.entries()) {
    await doodleNote(page, pitch, grid.barline(0) + index * grid.beat + 0.01)
  }
  await clockTo(page, grid.barline(2) + PAST_BARLINE)
  await untilPhraseOneAnswered(page)
  await clockTo(page, grid.barline(4) + 1)
  expect((await sessionState(page)).phase).toBe('running')
  await sessionAction(page).click()
  await expect(reviewTitle(page)).toBeVisible()
  await expect(sessionAction(page)).toHaveText('Close review')
  await sessionAction(page).click()
  await expect(reviewPanel(page)).toHaveCount(0)
  await expect(sessionAction(page)).toHaveText('Start Jam')
  await expect(sessionAction(page)).toBeEnabled({ timeout: 30_000 })
}

/** Intent: axe finds nothing on the page, its transitions settled. */
async function expectNoViolations(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => !(animation instanceof CSSTransition)),
  )
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations, describeViolations(results.violations)).toEqual([])
}

for (const theme of ['Light', 'Dark'] as const) {
  // @test-link [[module_kept_doodle]]
  // @test-link [[rule_suggestion_use_it]]
  test(`has no detectable axe violations in the kept doodle's bar, offering then set, ${theme} theme`, async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await doodleKept(page)
    await radio(page, 'Presentation theme', theme).click()

    await expect(jamBar(page).locator(':scope > p')).toHaveText(
      'Jamming again on your doodle: phrase 1 continues it. Leaving Jam mode lets it go.',
    )
    await expect(jamBar(page).getByRole('button', { name: 'New doodle' })).toBeEnabled()
    const row = jamBar(page).locator(':scope > .suggestion-row')
    await expect(row.locator(':scope > p')).toHaveText('Your doodle sounds like A Major.')
    await expect(row.locator(':scope > button')).toHaveText(['Jam in A Major', 'Keep C Major'])
    await expect(jamBar(page).locator('p[tabindex="-1"]')).toHaveCount(1)
    await expect(jamBar(page).locator('[aria-live], [role="status"], [role="alert"]')).toHaveCount(
      0,
    )
    await expectNoViolations(page)

    await row.getByRole('button', { name: 'Jam in A Major' }).click()

    const set = row.locator(':scope > p')
    await expect(set).toHaveText('Jams now play in A Major.')
    await expect(set).toHaveAttribute('tabindex', '-1')
    await expect(set).toBeFocused()
    await expect(sessionAction(page)).toBeEnabled({ timeout: 30_000 })
    await expectNoViolations(page)
  })
}
