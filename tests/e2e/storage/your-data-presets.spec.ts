/**
 * v3.1 chunk 18, Your data's Presets section (ui_ux screens/your-data, flows/presets Deleting from
 * Your data), on the workspace harness (port 4175) over the browser's real IndexedDB, each test
 * from an empty browser context:
 *
 * - the section counts and lists the player presets the box lists, in its Your presets order, a
 *   record that cannot be read neither counted nor listed; a row's `Delete` opens the preset's
 *   confirmation, its way back returning focus to that `Delete`; deleting the selection, or
 *   Custom's base, leaves "Custom" with no base and the values kept, shown once the sheet closes;
 *   deleting another preset leaves the selection as it is;
 * - Delete everything names the presets and deletes them all, the unreadable record included;
 * - Delete all played notes and Delete every session leave every preset;
 * - a visit that saves nothing, a failed read or an outdated tab, has no Presets section.
 */
import { expect, test, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import { harnessSnapshot } from '../release/harness-helpers'
import { playSession } from '../review/review-tools-helpers'
import { choosePreset, expectPresetShown, radio } from '../workspace/helpers'
import {
  EARLY_MORNING,
  LATE_NIGHT,
  presetRecords,
  seedAndReload,
  selection,
  yourPresetNames,
} from '../workspace/preset-management-helpers'
import {
  databaseRecords,
  gotoStorageHarness,
  reloadHarness,
  shownControls,
} from './storage-helpers'
import {
  NO_PRESETS,
  OUTDATED_NOTICE,
  OVERVIEW_HEADINGS,
  PRESETS_HINT,
  SETTINGS_LINE,
  UNREADABLE_NOTICE,
  askConfirmation,
  closeWithDone,
  confirmingAction,
  openYourData,
  presetDelete,
  presetRowNames,
  section,
  sectionHeadings,
  sectionLines,
  sheetButton,
  sheetButtons,
  summaryKeys,
  yourDataSheet,
} from './your-data-helpers'

test.use({ locale: 'en-US', timezoneId: 'Europe/Paris' })

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** A third player preset, its name lower case, listed first. */
const BLUE_HOUR: WorkspaceHarnessPresetInput = {
  ...EARLY_MORNING,
  id: 'player-3',
  name: 'blue hour',
}

/** A preset record the codec cannot read: never listed, still stored. */
const UNREADABLE: WorkspaceHarnessRawRecord = { key: 'player-9', record: 'not a record' }

/** The eight built-in presets' names, in the order the session lists them. */
const BUILT_IN_NAMES = [
  'Neutral',
  'Jazz',
  'Gentle',
  'Speed drill',
  'Reel',
  'Bebop',
  'Pop song',
  'Modal (Dorian)',
]

/** The confirmation's paragraphs, the preset sheet's Delete's. */
const PRESET_PARAGRAPHS = ['Your settings stay as they are.', "This can't be undone."]

/** Intent: seed the unreadable record, then `presets` with `selected` the selection, and reload. */
async function seedWithUnreadable(
  page: Page,
  presets: readonly WorkspaceHarnessPresetInput[],
  selected: WorkspaceHarnessPresetInput | null,
): Promise<void> {
  await page.evaluate(
    (entries) => window.__workspaceHarness.storage.seedRawPresets(entries),
    [UNREADABLE],
  )
  await seedAndReload(page, presets, selected)
}

/** Intent: delete the preset named `name` from its Presets row, back on the Overview, on `Done`. */
async function deleteFromYourData(page: Page, name: string): Promise<void> {
  await presetDelete(page, name).click()
  await expect(yourDataSheet(page)).toHaveAccessibleName(`Delete the preset “${name}”?`)
  await expect(confirmingAction(page)).toHaveText('Delete preset')
  await confirmingAction(page).click()
  await expect(yourDataSheet(page)).toHaveAccessibleName('Your data')
  await expect(sheetButton(page, 'Done')).toBeFocused()
}

// @test-link [[req_your_data]]
// @test-link [[rule_deleting_base_preset_leaves_custom]]
// @test-link [[rule_custom_names_its_base]]
test('the Presets section lists the player presets in the box order; deleting the selection there leaves "Custom" with no base, the values kept', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedWithUnreadable(page, [LATE_NIGHT, EARLY_MORNING, BLUE_HOUR], LATE_NIGHT)
  await expectPresetShown(page, 'Late night')
  const controls = await shownControls(page)

  await openYourData(page)
  expect(await sectionHeadings(page)).toEqual(OVERVIEW_HEADINGS)
  expect((await sectionLines(page, 'Settings'))[0]).toBe(SETTINGS_LINE)
  expect(await sectionLines(page, 'Presets')).toEqual(['3 presets of your own.', PRESETS_HINT])
  expect(await presetRowNames(page)).toEqual(['blue hour', 'Early morning', 'Late night'])
  for (const name of ['blue hour', 'Early morning', 'Late night'])
    await expect(presetDelete(page, name)).toHaveText('Delete')
  expect(await sheetButtons(page)).toEqual([
    'Close',
    'Delete',
    'Delete',
    'Delete',
    'Keep my played notes off',
    'Delete everything',
    'Done',
  ])

  // The way back returns focus to the row's Delete.
  await askConfirmation(page, 'Delete preset Late night', 'Delete the preset “Late night”?')
  await expect(yourDataSheet(page).locator('.sheet-body p')).toHaveText(PRESET_PARAGRAPHS)
  await sheetButton(page, 'Cancel').click()
  await expect(yourDataSheet(page)).toHaveAccessibleName('Your data')
  await expect(presetDelete(page, 'Late night')).toBeFocused()

  await deleteFromYourData(page, 'Late night')
  expect(await presetRowNames(page)).toEqual(['blue hour', 'Early morning'])
  expect(await sectionLines(page, 'Presets')).toEqual(['2 presets of your own.', PRESETS_HINT])
  expect(Object.keys(await presetRecords(page))).toEqual(['player-2', 'player-3', 'player-9'])

  await closeWithDone(page)
  await expectPresetShown(page, 'Custom')
  expect(await selection(page)).toEqual({ kind: 'custom', baseId: null })
  expect(await shownControls(page)).toEqual(controls)
  expect(await yourPresetNames(page)).toEqual(['blue hour', 'Early morning'])
})

// @test-link [[req_your_data]]
// @test-link [[rule_deleting_base_preset_leaves_custom]]
// @test-link [[rule_custom_names_its_base]]
test('deleting another preset from Your data leaves the selection as it is; deleting Custom\'s base leaves "Custom" with no base', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT, EARLY_MORNING, BLUE_HOUR], null)
  await choosePreset(page, 'Early morning')
  await radio(page, 'Contour', 'Falling').click()
  await expectPresetShown(page, 'Custom, based on Early morning')
  const controls = await shownControls(page)

  await openYourData(page)
  await deleteFromYourData(page, 'blue hour')
  expect(await presetRowNames(page)).toEqual(['Early morning', 'Late night'])
  await closeWithDone(page)
  await expectPresetShown(page, 'Custom, based on Early morning')
  expect(await selection(page)).toEqual({ kind: 'custom', baseId: 'player-2' })
  expect(await shownControls(page)).toEqual(controls)

  await openYourData(page)
  await deleteFromYourData(page, 'Early morning')
  expect(await sectionLines(page, 'Presets')).toEqual(['1 preset of your own.', PRESETS_HINT])
  await closeWithDone(page)
  await expectPresetShown(page, 'Custom')
  expect(await selection(page)).toEqual({ kind: 'custom', baseId: null })
  expect(await shownControls(page)).toEqual(controls)
  expect(await yourPresetNames(page)).toEqual(['Late night'])
  expect(Object.keys(await presetRecords(page))).toEqual(['player-1'])
})

// @test-link [[rule_delete_everything]]
test('Delete everything names the presets and deletes them all, an unreadable record included', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedWithUnreadable(page, [LATE_NIGHT, EARLY_MORNING], LATE_NIGHT)
  expect(Object.keys(await presetRecords(page))).toEqual(['player-1', 'player-2', 'player-9'])

  await openYourData(page)
  await askConfirmation(page, 'Delete everything', 'Delete everything?')
  await expect(yourDataSheet(page).locator('.sheet-body p')).toHaveText([
    'This deletes everything the app keeps on this device: your settings, your presets, your instrument, the remembered controller and every kept session, with its favorite phrases, comments and played notes. The page then reloads and starts as on a first visit.',
    "This can't be undone.",
  ])
  await Promise.all([page.waitForEvent('load'), confirmingAction(page).click()])
  await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)

  expect((await databaseRecords(page)).presets ?? []).toEqual([])
  expect(await yourPresetNames(page)).toEqual([])
  expect(await harnessSnapshot(page)).toMatchObject({
    selection: { kind: 'preset', presetId: 'neutral' },
    presetNames: BUILT_IN_NAMES,
  })
  await openYourData(page)
  expect(await sectionLines(page, 'Presets')).toEqual(NO_PRESETS)
  await expect(section(page, 'Presets').locator('ul')).toHaveCount(0)
})

// @test-link [[req_your_data]]
test('Delete all played notes and Delete every session leave every preset', async ({ page }) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT, EARLY_MORNING], EARLY_MORNING)
  await playSession(page)
  await expect.poll(() => summaryKeys(page)).toHaveLength(1)
  const [played] = await summaryKeys(page)
  if (played === undefined) throw new Error('the session was not kept')
  await page.evaluate((key) => window.__workspaceHarness.storage.seedPlayedNotes(key), played)
  await reloadHarness(page)
  const records = await presetRecords(page)
  expect(Object.keys(records)).toEqual(['player-1', 'player-2'])

  await openYourData(page)
  await askConfirmation(page, 'Delete all played notes', 'Delete all played notes?')
  await confirmingAction(page).click()
  await expect(yourDataSheet(page)).toHaveAccessibleName('Your data')
  expect((await sectionLines(page, 'Played notes'))[1]).toBe('None kept.')
  await askConfirmation(page, 'Delete every session', 'Delete every session?')
  await confirmingAction(page).click()
  await expect(yourDataSheet(page)).toHaveAccessibleName('Your data')
  expect((await sectionLines(page, 'Sessions'))[0]).toBe('No sessions kept yet.')

  expect(await sectionLines(page, 'Presets')).toEqual(['2 presets of your own.', PRESETS_HINT])
  expect(await presetRowNames(page)).toEqual(['Early morning', 'Late night'])
  expect(await presetRecords(page)).toEqual(records)
  await closeWithDone(page)
  expect(await yourPresetNames(page)).toEqual(['Early morning', 'Late night'])
})

// @test-link [[rule_presets_in_visits_that_save_nothing]]
// @test-link [[rule_failed_read_offers_only_delete_everything]]
test('a visit that saves nothing has no Presets section: a failed read, and an outdated tab whose box still lists them', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT, EARLY_MORNING], LATE_NIGHT)

  // A failed read: the built-ins only, and no Presets section.
  await gotoStorageHarness(page, '?storageRead=fail')
  expect(await yourPresetNames(page)).toEqual([])
  await openYourData(page)
  await expect(yourDataSheet(page).locator('.alert-notice')).toHaveText(UNREADABLE_NOTICE)
  expect(await sectionHeadings(page)).toEqual(['Space used', 'Protection'])
  await closeWithDone(page)

  // An outdated tab: the open sheet takes the outdated form, the box keeps the presets it read.
  await gotoStorageHarness(page)
  await openYourData(page)
  expect(await presetRowNames(page)).toEqual(['Early morning', 'Late night'])
  await page.evaluate(() => window.__workspaceHarness.storage.openNewerVersion())
  await expect(yourDataSheet(page).locator('.alert-notice')).toHaveText(OUTDATED_NOTICE)
  expect(await sectionHeadings(page)).toEqual(['Space used', 'Protection'])
  await closeWithDone(page)
  expect(await yourPresetNames(page)).toEqual(['Early morning', 'Late night'])
  await openYourData(page)
  expect(await sectionHeadings(page)).toEqual(['Space used', 'Protection'])
})
