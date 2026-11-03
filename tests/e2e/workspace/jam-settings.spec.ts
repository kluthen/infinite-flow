/**
 * v3.2 chunk 31: Jam's own settings, "Shape your Jam", in the control section's place while Jam
 * mode shows, on the workspace harness (port 4175) over the browser's real IndexedDB, each test
 * from an empty browser context:
 *
 * - the first time, Jam's settings start from session mode's key and mode and its tempo kept in 60
 *   to 180 BPM, with C5.16's other first values; each change is saved among Jam's records alone
 *   and survives a reload, session mode's records and controls untouched; a damaged record loads
 *   its first value, the others as saved;
 * - Delete everything resets them to their first values;
 * - an instrument changed in Jam mode is applied to session mode on returning, as an instrument
 *   switch made there: phrase 1 written again for it and the prepared phrases discarded; any other
 *   Jam change leaves session mode's phrase and prepared phrases alone;
 * - on a landscape phone the three groups stack, each inside the window.
 */
import { expect, test, type Page } from '@playwright/test'

import { harnessSnapshot, queueSeeds, queueSessionSeeds } from '../release/harness-helpers'
import { expectIdleReady } from '../review/review-helpers'
import { sessionAction } from '../session/session-helpers'
import {
  gotoStorageHarness,
  reloadHarness,
  seedSettings,
  storedSettings,
  untilStored,
} from '../storage/storage-helpers'
import { askConfirmation, confirmingAction, openYourData } from '../storage/your-data-helpers'
import { radio } from './helpers'
import { expectJamModeShows, expectSessionModeShows, modeSegment } from './jam-mode-helpers'
import {
  generationRecords,
  gotoPregenerationHarness,
  readyWithSessionSeed,
  untilQueueFull,
} from './pregeneration-helpers'

/** The session seed phrase 1 is published with, and the one its replacement is. */
const SESSION_SEED = 4242
const NEXT_SESSION_SEED = 5353

/** A landscape phone, below bp-tablet-landscape. */
const LANDSCAPE_PHONE = { width: 844, height: 390 } as const

/** Intent: press `Jam` and wait until Jam mode shows. */
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

/** Intent: Jam's control section. */
function jamControls(page: Page) {
  return page.locator('section.control-section[aria-labelledby="jam-controls-heading"]')
}

/** Intent: the segment `option` of the radiogroup named exactly `group`. */
function segment(page: Page, group: string, option: string) {
  return page
    .getByRole('radiogroup', { name: group, exact: true })
    .getByRole('radio', { name: option, exact: true })
}

/** Intent: the checked segment's label of each named radiogroup, by its name. */
async function checked(page: Page, groups: readonly string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    groups.map(async (group) => {
      const radio = page
        .getByRole('radiogroup', { name: group, exact: true })
        .locator('[role="radio"][aria-checked="true"]')
      return [group, (await radio.textContent())?.trim() ?? ''] as const
    }),
  )
  return Object.fromEntries(entries)
}

/** Intent: the tempo the stepper shows. */
function tempo(page: Page) {
  return page.getByRole('spinbutton', { name: 'Tempo' })
}

/** Intent: every stored settings record of session mode's, by key. */
async function sessionModeRecords(page: Page): Promise<Record<string, unknown>> {
  const stored = await storedSettings(page)
  return Object.fromEntries(Object.entries(stored).filter(([key]) => !key.startsWith('jam.')))
}

const JAM_GROUPS = [
  'Written key',
  'Collection',
  'Harmonic motion',
  'Tension',
  'Embellishments',
  'Drift',
  'Rhythm lock',
] as const

/** C5.16's first values, the key and mode being session mode's first-visit C Ionian. */
const FIRST_VALUES = {
  'Written key': 'C',
  Collection: 'Ionian',
  'Harmonic motion': 'Gentle diatonic',
  Tension: 'Lift',
  Embellishments: 'Rarely',
  Drift: 'Near',
  'Rhythm lock': 'Off',
}

// @test-link [[req_jam_settings]]
// @test-link [[rule_jam_settings_first_values]]
// @test-link [[rule_jam_settings_saved_on_change]]
// @test-link [[rule_jam_settings_load_tolerantly]]
// @test-link [[rule_jam_tempo_range]]
test("Jam's settings start from their first values, each survives a reload, session mode untouched", async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoStorageHarness(page)
  await seedSettings(page, { 'controls.tempo': 200, 'controls.collection': 'Dorian' })
  await reloadHarness(page)
  const sessionBefore = await sessionModeRecords(page)

  await enterJam(page)
  await expect(tempo(page)).toHaveAttribute('aria-valuenow', '180')
  expect(await checked(page, JAM_GROUPS)).toEqual({ ...FIRST_VALUES, Collection: 'Dorian' })
  await expect(jamControls(page).locator('.control-summary')).toHaveText(
    'C Dorian · Drift: Near · Rhythm lock: Off',
  )
  await expect(jamControls(page).locator('.field-dependent')).toHaveCount(0)
  await expect(jamControls(page).locator('.doodle-readings')).toHaveCount(0)
  await expect(
    jamControls(page).getByText("They show here once you've played a doodle."),
  ).toBeVisible()
  await untilStored(page, { 'jam.tempo': 180, 'jam.tonalCenter': 'C', 'jam.collection': 'Dorian' })

  await page.getByRole('button', { name: 'Decrease tempo' }).click()
  await segment(page, 'Written key', 'G').click()
  await segment(page, 'Collection', 'Mixolydian').click()
  await segment(page, 'Harmonic motion', 'Static').click()
  await segment(page, 'Tension', 'Build').click()
  await segment(page, 'Embellishments', 'Often').click()
  await segment(page, 'Drift', 'Close').click()
  await segment(page, 'Rhythm lock', 'On').click()
  await jamControls(page).getByRole('button', { name: 'Move a rest', exact: true }).click()
  const changed = {
    'jam.tempo': 170,
    'jam.tonalCenter': 'G',
    'jam.collection': 'Mixolydian',
    'jam.harmonicMotion': 'Static',
    'jam.tension': 'Build',
    'jam.embellishments': 'favored',
    'jam.drift': 'Close',
    'jam.rhythmLockOn': true,
    'jam.allowedRhythmChanges': ['move_rest'],
  }
  await untilStored(page, changed)
  expect(await sessionModeRecords(page)).toEqual(sessionBefore)

  await reloadHarness(page)
  await enterJam(page)
  await expect(tempo(page)).toHaveAttribute('aria-valuenow', '170')
  expect(await checked(page, JAM_GROUPS)).toEqual({
    'Written key': 'G',
    Collection: 'Mixolydian',
    'Harmonic motion': 'Static',
    Tension: 'Build',
    Embellishments: 'Often',
    Drift: 'Close',
    'Rhythm lock': 'On',
  })
  await expect(
    jamControls(page).getByRole('button', { name: 'Move a rest', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')

  await leaveJam(page)
  await expect(tempo(page)).toHaveAttribute('aria-valuenow', '200')
  expect(await checked(page, ['Written key', 'Collection', 'Tension'])).toEqual({
    'Written key': 'C',
    Collection: 'Dorian',
    Tension: 'Lift',
  })
  expect(await sessionModeRecords(page)).toEqual(sessionBefore)

  // A damaged record loads its first value (the tempo's from session mode's, kept in range); the
  // others load as saved.
  await seedSettings(page, { 'jam.drift': 'Sideways', 'jam.tempo': 175 })
  await reloadHarness(page)
  await enterJam(page)
  expect(await checked(page, ['Drift', 'Written key'])).toEqual({
    Drift: 'Near',
    'Written key': 'G',
  })
  await expect(tempo(page)).toHaveAttribute('aria-valuenow', '180')
})

// @test-link [[rule_delete_everything]]
// @test-link [[rule_jam_settings_first_values]]
test("Delete everything resets Jam's settings to their first values", async ({ page }) => {
  test.setTimeout(90_000)
  await gotoStorageHarness(page)
  await enterJam(page)
  await segment(page, 'Drift', 'Free').click()
  await segment(page, 'Written key', 'D').click()
  await untilStored(page, { 'jam.drift': 'Free', 'jam.tonalCenter': 'D' })
  await leaveJam(page)

  await openYourData(page)
  await askConfirmation(page, 'Delete everything', 'Delete everything?')
  await Promise.all([page.waitForEvent('load'), confirmingAction(page).click()])
  await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)
  expect(await storedSettings(page)).toEqual({})

  await enterJam(page)
  await expect(tempo(page)).toHaveAttribute('aria-valuenow', '90')
  expect(await checked(page, JAM_GROUPS)).toEqual(FIRST_VALUES)
})

// @test-link [[rule_shared_setting_changed_in_jam_mode]]
test('an instrument changed in Jam mode writes phrase 1 again on returning and discards the prepared phrases', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await gotoPregenerationHarness(page)
  await readyWithSessionSeed(page, SESSION_SEED)
  await untilQueueFull(page)
  const before = (await harnessSnapshot(page)).timeline
  const entered = (await generationRecords(page)).length

  await enterJam(page)
  await queueSeeds(page, [8])
  await queueSessionSeeds(page, [NEXT_SESSION_SEED])
  await radio(page, 'Instrument profile', 'E-flat alto saxophone').click()
  await expect(radio(page, 'Instrument profile', 'E-flat alto saxophone')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  // Nothing is written for session mode while Jam mode shows.
  expect((await generationRecords(page)).slice(entered)).toEqual([])

  const returned = (await generationRecords(page)).length
  await leaveJam(page)
  await expect
    .poll(async () => (await harnessSnapshot(page)).timeline, { timeout: 30_000 })
    .not.toBe(before)
  await expectIdleReady(page)
  await expect(sessionAction(page)).toBeEnabled()
  await expect(radio(page, 'Instrument profile', 'E-flat alto saxophone')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  const phraseOne = (await generationRecords(page))
    .slice(returned)
    .filter((record) => !record.background)
  expect(phraseOne.map((record) => record.controls.instrumentProfileId)).toEqual(['eb-alto'])
  const prepared = await untilQueueFull(page, returned)
  for (const record of prepared) expect(record.controls.instrumentProfileId).toBe('eb-alto')
})

// @test-link [[rule_shared_setting_changed_in_jam_mode]]
test("any other Jam change leaves session mode's phrase and prepared phrases alone", async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoPregenerationHarness(page)
  await readyWithSessionSeed(page, SESSION_SEED)
  await untilQueueFull(page)
  const before = (await harnessSnapshot(page)).timeline
  const entered = (await generationRecords(page)).length

  await enterJam(page)
  await segment(page, 'Written key', 'A').click()
  await segment(page, 'Tension', 'Edge').click()
  await segment(page, 'Embellishments', 'Off').click()
  await page.getByRole('button', { name: 'Increase tempo' }).click()
  await leaveJam(page)
  await expectIdleReady(page)
  for (let frame = 0; frame < 10; frame += 1)
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)))

  expect((await harnessSnapshot(page)).timeline).toBe(before)
  expect((await generationRecords(page)).slice(entered)).toEqual([])
  expect(await checked(page, ['Written key', 'Collection'])).toEqual({
    'Written key': 'C',
    Collection: 'Ionian',
  })
  await expect(tempo(page)).toHaveAttribute('aria-valuenow', '90')
})

// @test-link [[req_jam_settings]]
test('on a landscape phone the three groups stack, each inside the window', async ({ page }) => {
  await page.setViewportSize(LANDSCAPE_PHONE)
  await gotoStorageHarness(page)
  await page.setViewportSize(LANDSCAPE_PHONE)
  await enterJam(page)
  const boxes = await jamControls(page)
    .locator('.control-group-row > .control-group')
    .evaluateAll((groups) =>
      groups.map((group) => {
        const box = group.getBoundingClientRect()
        return { top: box.top, bottom: box.bottom, left: box.left, right: box.right }
      }),
    )
  expect(boxes).toHaveLength(3)
  for (const [index, box] of boxes.entries()) {
    expect(box.left).toBeGreaterThanOrEqual(0)
    expect(box.right).toBeLessThanOrEqual(LANDSCAPE_PHONE.width)
    if (index > 0) expect(box.top).toBeGreaterThanOrEqual(boxes[index - 1]!.bottom)
  }
  const overflowing = await jamControls(page).evaluate(
    (section) => section.scrollWidth > section.clientWidth,
  )
  expect(overflowing).toBe(false)
})
