/**
 * v3.3 chunk 23, Jam mode's own Seventh chords level, on the workspace harness (port 4175: fake
 * audio clock, fake MIDI, real generations), each test from an empty browser context:
 *
 * - a fresh Jam started at Always asks every attempt at Always and writes seventh chords: phrase 1
 *   on the staff names seventh chords;
 * - Jam's level and session mode's are two settings: setting one leaves the other's control and
 *   record as they were, and both come back after a reload.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { untilStored, gotoStorageHarness, reloadHarness } from '../storage/storage-helpers'
import { gotoJamIdle, jamToRunning, startJamByClick } from '../session/jam-helpers'
import { expectJamModeShows, expectSessionModeShows, modeSegment } from './jam-mode-helpers'
import { generationRecords } from './pregeneration-helpers'

/** The words a staff's description gives a seventh chord's suffix, whichever its quality. */
const SEVENTH_WORDS = /(major|minor|dominant|half-diminished) seventh/

/** Intent: Jam's control section. */
function jamControls(page: Page): Locator {
  return page.locator('section.control-section[aria-labelledby="jam-controls-heading"]')
}

/** Intent: the Seventh chords radiogroup shown now, Jam's in Jam mode, session mode's otherwise. */
function control(page: Page): Locator {
  return page.getByRole('radiogroup', { name: 'Seventh chords', exact: true })
}

/** Intent: the checked Seventh chords segment's label. */
function checked(page: Page): Promise<string> {
  return control(page).locator('[role="radio"][aria-checked="true"]').innerText()
}

/** Intent: choose `label` in the Seventh chords control shown and wait until it shows checked. */
async function choose(page: Page, label: string): Promise<void> {
  const segment = control(page).getByRole('radio', { name: label, exact: true })
  await segment.click()
  await expect(segment).toHaveAttribute('aria-checked', 'true')
}

/** Intent: press `Jam` and wait until Jam's controls show. */
async function enterJam(page: Page): Promise<void> {
  await modeSegment(page, 'Jam').click()
  await expectJamModeShows(page)
  await expect(jamControls(page).locator('h2')).toHaveText('Shape your Jam')
}

/** Intent: press `Session` and wait until session mode shows. */
async function leaveJam(page: Page): Promise<void> {
  await modeSegment(page, 'Session').click()
  await expectSessionModeShows(page)
}

// @test-link [[rule_jam_has_own_seventh_chords_level]]
test('a Jam at Always asks every attempt at Always and writes seventh chords on the staff', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoJamIdle(page)
  await expect(jamControls(page).locator('.field-label')).toContainText(['Seventh chords'])
  expect(await checked(page)).toBe('Off')
  await choose(page, 'Always')
  const from = (await generationRecords(page)).length

  await startJamByClick(page)
  await expect(control(page)).toHaveAttribute('aria-readonly', 'true')
  await jamToRunning(page)

  const asked = (await generationRecords(page)).slice(from)
  expect(asked.length).toBeGreaterThan(0)
  for (const request of asked)
    expect(request.chordFamilies).toEqual({ 'seventh-chords': 'stronglyFavored' })
  await expect
    .poll(() => page.locator('.score-description').allInnerTexts())
    .toContainEqual(expect.stringMatching(SEVENTH_WORDS))
})

// @test-link [[rule_jam_has_own_seventh_chords_level]]
// @test-link [[req_jam_settings]]
test("Jam's level and session mode's are set apart, and both survive a reload", async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoStorageHarness(page)
  await enterJam(page)
  expect(await checked(page)).toBe('Off')
  await choose(page, 'Always')
  await untilStored(page, { 'jam.seventh-chords': 'stronglyFavored' })

  await leaveJam(page)
  expect(await checked(page)).toBe('Off')
  await choose(page, 'Sometimes')
  await untilStored(page, {
    'chordFamilies.seventh-chords': 'sometimes',
    'jam.seventh-chords': 'stronglyFavored',
  })

  await enterJam(page)
  expect(await checked(page)).toBe('Always')

  await reloadHarness(page)
  expect(await checked(page)).toBe('Sometimes')
  await enterJam(page)
  expect(await checked(page)).toBe('Always')
  await untilStored(page, {
    'chordFamilies.seventh-chords': 'sometimes',
    'jam.seventh-chords': 'stronglyFavored',
  })
})
