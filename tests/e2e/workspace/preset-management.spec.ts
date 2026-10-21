/**
 * v3.1 chunk 17, managing presets from the preset bar (`flows/presets/`, Saving, Renaming and
 * Deleting; `screens/preset-sheet/`), on the workspace harness (port 4175), each test from an
 * empty browser context, its player presets seeded through the harness's storage seam:
 *
 * - the actions row by selection: a built-in, or Custom based on one, offers `Save as new preset`
 *   alone; a player preset adds `Rename preset` and `Delete preset`; Custom based on one adds
 *   `Save changes` too;
 * - Save as new from a built-in, Custom based on Reel ("As now" keeping Mixolydian or Dorian), a
 *   player preset and Custom with no base: the choices merged as the design says, "As now" first;
 *   the new preset is the selection, in Your presets, nothing regenerated, focus on its opener;
 * - Save changes inside the base's restriction in one click, keeping it; outside, asking, "Any key
 *   and mode" by default, and replacing it; focus on the preset box;
 * - every refused name with its reason as typed, the main action waiting; typing and pasting cut
 *   at 40 characters; 50 presets disable Save as new with its note, 60 are all listed and block;
 * - rename keeps the selection and Custom's base, moves the preset in the list, and a case-only
 *   change is a rename;
 * - delete leaves Custom with no base and the same values; a failed deletion keeps the
 *   confirmation with its error line;
 * - an unsupported rhythm combination saved as it is, its alert shown when the preset is chosen;
 * - during Loading every action works and the phrase in flight finishes; during a session every
 *   action is disabled, the row as at Start, and no sheet opens; while a sheet is open the
 *   starting note starts nothing;
 * - the preset bar and the open sheet have no axe violations, at a desktop and a phone size.
 */
import { expect, test } from '@playwright/test'

import {
  KEYS,
  clickControllerStatus,
  gotoControllerHarness,
  play,
  plug,
  sheet as connectionSheet,
  sheetClose,
} from '../controller/controller-helpers'
import {
  harnessSnapshot,
  holdGeneration,
  queueSeeds,
  releaseGeneration,
} from '../release/harness-helpers'
import {
  PHONE,
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
} from '../session/session-helpers'
import { gotoStorageHarness, shownControls } from '../storage/storage-helpers'
import {
  choosePreset,
  expectPresetShown,
  presetBox,
  presetDescription,
  primaryButton,
  radio,
  statusRegion,
} from './helpers'
import {
  EARLY_MORNING,
  LATE_NIGHT,
  actionButton,
  expectActions,
  keyAndModeOptions,
  manyPresets,
  nameAlert,
  nameField,
  openSheet,
  presetActions,
  presetRecordNamed,
  presetSheet,
  saveAsNew,
  seedAndReload,
  sheetButton,
  shownChoices,
  yourPresetNames,
  ALL_FOUR,
  LIMIT_NOTE,
  PLAYER_ROW,
  expectNoAxeViolations,
  nameSelected,
  selection,
} from './preset-management-helpers'

// @test-link [[rule_preset_management_actions]]
test('the actions row by selection: a built-in or Custom based on one offers Save as new alone; a player preset adds Rename and Delete; Custom based on one adds Save changes', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await expectActions(page, ['Save as new preset'])
  await radio(page, 'Contour', 'Falling').click()
  await expectPresetShown(page, 'Custom, based on Neutral')
  await expectActions(page, ['Save as new preset'])

  await seedAndReload(page, [LATE_NIGHT], LATE_NIGHT)
  await expectPresetShown(page, 'Late night')
  await expectActions(page, PLAYER_ROW)
  await radio(page, 'Contour', 'Falling').click()
  await expectPresetShown(page, 'Custom, based on Late night')
  await expectActions(page, ALL_FOUR)
  for (const label of ALL_FOUR) await expect(actionButton(page, label)).toBeEnabled()
})

// @test-link [[rule_saving_preset_asks_its_restriction]]
// @test-link [[rule_preset_management_actions]]
test('Save as new from a built-in: the name prefilled and selected, "Any key and mode" first; the new preset is the selection in Your presets, nothing regenerated, focus back on Save as new', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await choosePreset(page, 'Jazz')
  const before = await harnessSnapshot(page)
  const controls = await shownControls(page)

  await openSheet(page, 'Save as new preset', 'Save as a new preset')
  await expect(nameField(page)).toBeFocused()
  await expect(nameField(page)).toHaveValue('My preset')
  expect(await nameSelected(page)).toBe(true)
  expect(await shownChoices(page)).toEqual(['Any key and mode *', 'Only C Ionian'])
  await expect(sheetButton(page, 'Save')).toBeEnabled()
  await sheetButton(page, 'Save').click()

  await expect(presetSheet(page)).toHaveCount(0)
  await expectPresetShown(page, 'My preset')
  expect(await yourPresetNames(page)).toEqual(['My preset'])
  await expect(presetDescription(page)).toHaveText('Your preset.')
  await expectActions(page, PLAYER_ROW)
  await expect(actionButton(page, 'Save as new preset')).toBeFocused()
  const after = await harnessSnapshot(page)
  expect(after.selection.kind).toBe('preset')
  expect(after.presetNames).toContain('My preset')
  expect(after.requestId).toBe(before.requestId)
  expect(await shownControls(page)).toEqual(controls)

  await openSheet(page, 'Save as new preset', 'Save as a new preset')
  await expect(nameField(page)).toHaveValue('My preset 2')
})

// @test-link [[rule_saving_preset_asks_its_restriction]]
// @test-link [[rule_restriction_in_force]]
test('Save as new from Custom based on Reel offers "As now: Mixolydian or Dorian in any key" first, and keeps it', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await choosePreset(page, 'Reel')
  await radio(page, 'Contour', 'Falling').click()
  await expectPresetShown(page, 'Custom, based on Reel')
  await expectActions(page, ['Save as new preset'])

  await openSheet(page, 'Save as new preset', 'Save as a new preset')
  expect(await shownChoices(page)).toEqual([
    'As now: Mixolydian or Dorian in any key *',
    'Only C Mixolydian',
    'Any key and mode',
  ])
  await nameField(page).fill('Evening reel')
  await sheetButton(page, 'Save').click()

  await expectPresetShown(page, 'Evening reel')
  await expect(presetDescription(page)).toHaveText(
    'Your preset. Meant for Mixolydian or Dorian in any key.',
  )
  await expect(radio(page, 'Contour', 'Falling')).toHaveAttribute('aria-checked', 'true')
  await radio(page, 'Collection', 'Dorian').click()
  await expectPresetShown(page, 'Evening reel')
  await expect(radio(page, 'Collection', 'Mixolydian')).toHaveClass(/is-marked/)
  await expect(radio(page, 'Collection', 'Dorian')).toHaveClass(/is-marked/)
})

// @test-link [[rule_saving_preset_asks_its_restriction]]
test('Save as new from a player preset and from Custom with no base: the choices merged as the design says', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT], LATE_NIGHT)
  await openSheet(page, 'Save as new preset', 'Save as a new preset')
  expect(await shownChoices(page)).toEqual([
    'As now: Ionian or Dorian in any key *',
    'Only C Ionian',
    'Any key and mode',
  ])
  await keyAndModeOptions(page).first().press('ArrowDown')
  await expect(keyAndModeOptions(page).nth(1)).toBeFocused()
  expect(await shownChoices(page)).toEqual([
    'As now: Ionian or Dorian in any key',
    'Only C Ionian *',
    'Any key and mode',
  ])
  await nameField(page).fill('Late night in C')
  await sheetButton(page, 'Save').click()
  await expectPresetShown(page, 'Late night in C')
  await expect(presetDescription(page)).toHaveText('Your preset. Meant for C Ionian.')

  // Exactly the current key and mode in force: "As now" is "Only C Ionian".
  await openSheet(page, 'Save as new preset', 'Save as a new preset')
  expect(await shownChoices(page)).toEqual(['Only C Ionian *', 'Any key and mode'])
  await sheetButton(page, 'Cancel').click()

  await seedAndReload(page, [], null)
  await expectPresetShown(page, 'Custom')
  await openSheet(page, 'Save as new preset', 'Save as a new preset')
  expect(await shownChoices(page)).toEqual(['Any key and mode *', 'Only C Ionian'])
})

// @test-link [[rule_save_changes_restriction]]
// @test-link [[rule_preset_management_actions]]
test('Save changes inside the base restriction saves in one click and keeps it; outside it asks, "Any key and mode" by default, and replaces it', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT, EARLY_MORNING], LATE_NIGHT)
  await radio(page, 'Tension', 'Edge').click()
  await expectPresetShown(page, 'Custom, based on Late night')

  await actionButton(page, 'Save changes').click()
  await expect(presetSheet(page)).toHaveCount(0)
  await expectPresetShown(page, 'Late night')
  await expect(presetBox(page)).toBeFocused()
  await expect(presetDescription(page)).toHaveText(
    'Your preset. Meant for Ionian or Dorian in any key.',
  )
  await expect(radio(page, 'Tension', 'Edge')).toHaveAttribute('aria-checked', 'true')
  expect(await selection(page)).toEqual({ kind: 'preset', presetId: 'player-1' })
  await expect
    .poll(async () => (await presetRecordNamed(page, 'Late night')).controls)
    .toMatchObject({ tension: 'Edge' })

  await radio(page, 'Collection', 'Aeolian').click()
  await expectPresetShown(page, 'Custom, based on Late night')
  await openSheet(page, 'Save changes', 'Save changes to “Late night”')
  await expect(presetSheet(page).locator('.sheet-body > p')).toHaveText(
    'Your key and mode, C Aeolian, are outside what “Late night” is meant for: Ionian or Dorian in any key. Choose what it is meant for from now on.',
  )
  await expect(nameField(page)).toHaveCount(0)
  expect(await shownChoices(page)).toEqual(['Any key and mode *', 'Only C Aeolian'])
  await expect(keyAndModeOptions(page).first()).toBeFocused()
  await sheetButton(page, 'Save changes').click()

  await expect(presetSheet(page)).toHaveCount(0)
  await expectPresetShown(page, 'Late night')
  await expect(presetDescription(page)).toHaveText('Your preset.')
  await expect(presetBox(page)).toBeFocused()
  await expect(radio(page, 'Collection', 'Aeolian')).toHaveAttribute('aria-checked', 'true')
  await expect
    .poll(async () => (await presetRecordNamed(page, 'Late night')).restriction)
    .toEqual({ keys: 'any', modes: 'any' })
})

// @test-link [[rule_player_preset_names]]
test('every refused name shows its reason as typed and Save waits; typing and pasting stop at 40 characters', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT], LATE_NIGHT)
  await openSheet(page, 'Save as new preset', 'Save as a new preset')
  const reasons: readonly (readonly [string, string])[] = [
    ['', 'Give it a name.'],
    ['   ', 'Give it a name.'],
    ['cUsToM', '“Custom” is used by the app. Choose another name.'],
    [' jazz  ', "There's already a preset called “Jazz”."],
    ['LATE NIGHT', "There's already a preset called “Late night”."],
  ]
  for (const [typed, reason] of reasons) {
    await nameField(page).fill(typed)
    await expect(nameAlert(page), typed).toHaveText(reason)
    await expect(nameAlert(page)).toHaveAttribute('role', 'status')
    await expect(sheetButton(page, 'Save'), typed).toBeDisabled()
  }
  await nameField(page).press('Enter')
  await expect(presetSheet(page)).toHaveCount(1)

  await nameField(page).fill('')
  await nameField(page).pressSequentially('A'.repeat(45))
  await expect(nameField(page)).toHaveValue('A'.repeat(40))
  await nameField(page).fill('')
  await page.keyboard.insertText(`${'B'.repeat(39)}CDEF`)
  await expect(nameField(page)).toHaveValue(`${'B'.repeat(39)}C`)
  await expect(nameAlert(page)).toHaveCount(0)
  await nameField(page).press('Enter')
  await expect(presetSheet(page)).toHaveCount(0)
  await expectPresetShown(page, `${'B'.repeat(39)}C`)
})

// @test-link [[rule_player_preset_limit]]
test('50 player presets disable Save as new with its note; 60 seeded are all listed and still block', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedAndReload(page, manyPresets(50), null)
  const saveAsNewButton = actionButton(page, 'Save as new preset')
  await expect(saveAsNewButton).toBeDisabled()
  const note = presetActions(page).locator('.field-note')
  await expect(note).toHaveText(LIMIT_NOTE)
  const noteId = await note.getAttribute('id')
  await expect(saveAsNewButton).toHaveAttribute('aria-describedby', noteId ?? '')
  await expect(saveAsNewButton).toHaveAccessibleDescription(LIMIT_NOTE)

  await seedAndReload(page, manyPresets(60), null)
  expect(await yourPresetNames(page)).toHaveLength(60)
  expect((await harnessSnapshot(page)).presetNames).toHaveLength(68)
  await expect(saveAsNewButton).toBeDisabled()
  await expect(note).toHaveText(LIMIT_NOTE)
})

// @test-link [[rule_player_preset_names]]
// @test-link [[rule_custom_names_its_base]]
test('rename keeps the selection and Custom base, moves the preset in the list, and a case-only change is a rename', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT, EARLY_MORNING], LATE_NIGHT)
  expect(await yourPresetNames(page)).toEqual(['Early morning', 'Late night'])

  await openSheet(page, 'Rename preset', 'Rename “Late night”')
  await expect(nameField(page)).toBeFocused()
  await expect(nameField(page)).toHaveValue('Late night')
  expect(await nameSelected(page)).toBe(true)
  await expect(nameAlert(page)).toHaveCount(0)
  await page.keyboard.type('Afterhours')
  await nameField(page).press('Enter')

  await expect(presetSheet(page)).toHaveCount(0)
  await expectPresetShown(page, 'Afterhours')
  expect(await yourPresetNames(page)).toEqual(['Afterhours', 'Early morning'])
  expect(await selection(page)).toEqual({ kind: 'preset', presetId: 'player-1' })
  await expect(actionButton(page, 'Rename preset')).toBeFocused()

  await radio(page, 'Contour', 'Falling').click()
  await expectPresetShown(page, 'Custom, based on Afterhours')
  await openSheet(page, 'Rename preset', 'Rename “Afterhours”')
  await nameField(page).fill('AFTERHOURS')
  await sheetButton(page, 'Rename').click()
  await expectPresetShown(page, 'Custom, based on AFTERHOURS')
  await expect(presetDescription(page)).toContainText('Changed from AFTERHOURS.')
  expect(await selection(page)).toEqual({ kind: 'custom', baseId: 'player-1' })

  // The same name, letter case included, only closes the sheet.
  await openSheet(page, 'Rename preset', 'Rename “AFTERHOURS”')
  await sheetButton(page, 'Rename').click()
  await expect(presetSheet(page)).toHaveCount(0)
  await expect(actionButton(page, 'Rename preset')).toBeFocused()
  await openSheet(page, 'Rename preset', 'Rename “AFTERHOURS”')
  await page.keyboard.press('Escape')
  await expect(presetSheet(page)).toHaveCount(0)
  await expect(actionButton(page, 'Rename preset')).toBeFocused()
})

// @test-link [[rule_deleting_base_preset_leaves_custom]]
// @test-link [[rule_custom_names_its_base]]
test('delete, of the selection or of Custom base, leaves "Custom" with no base and the same values; focus on the preset box', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT, EARLY_MORNING], LATE_NIGHT)
  const controls = await shownControls(page)

  await openSheet(page, 'Delete preset', 'Delete the preset “Late night”?')
  await expect(presetSheet(page).locator('.sheet-body > p')).toHaveText([
    'Your settings stay as they are.',
    "This can't be undone.",
  ])
  await expect(sheetButton(page, 'Cancel')).toBeFocused()
  await sheetButton(page, 'Cancel').click()
  await expect(actionButton(page, 'Delete preset')).toBeFocused()
  await openSheet(page, 'Delete preset', 'Delete the preset “Late night”?')
  await sheetButton(page, 'Delete preset').click()

  await expect(presetSheet(page)).toHaveCount(0)
  await expectPresetShown(page, 'Custom')
  await expect(presetBox(page)).toBeFocused()
  expect(await selection(page)).toEqual({ kind: 'custom', baseId: null })
  expect(await shownControls(page)).toEqual(controls)
  expect(await yourPresetNames(page)).toEqual(['Early morning'])
  await expectActions(page, ['Save as new preset'])

  await choosePreset(page, 'Early morning')
  await radio(page, 'Contour', 'Falling').click()
  await expectPresetShown(page, 'Custom, based on Early morning')
  const changed = await shownControls(page)
  await openSheet(page, 'Delete preset', 'Delete the preset “Early morning”?')
  await sheetButton(page, 'Delete preset').click()
  await expectPresetShown(page, 'Custom')
  expect(await selection(page)).toEqual({ kind: 'custom', baseId: null })
  expect(await shownControls(page)).toEqual(changed)
  expect(await yourPresetNames(page)).toEqual([])
})

// @test-link [[rule_deleting_base_preset_leaves_custom]]
test('a failed deletion keeps the confirmation with its error line and changes nothing; Delete preset tries again', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT], LATE_NIGHT)
  await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves('other'))
  await openSheet(page, 'Delete preset', 'Delete the preset “Late night”?')
  await sheetButton(page, 'Delete preset').click()

  const errorLine = presetSheet(page).locator('.inline-alert.alert-error')
  await expect(errorLine).toHaveText("That couldn't be deleted. Try again.")
  await expect(presetSheet(page)).toHaveAccessibleName('Delete the preset “Late night”?')
  await expect(sheetButton(page, 'Delete preset')).toBeEnabled()
  expect(await yourPresetNames(page)).toEqual(['Late night'])
  expect(await selection(page)).toEqual({ kind: 'preset', presetId: 'player-1' })

  await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves(null))
  await sheetButton(page, 'Delete preset').click()
  await expect(presetSheet(page)).toHaveCount(0)
  await expectPresetShown(page, 'Custom')
})

// @test-link [[rule_player_preset_may_hold_unsupported_rhythm]]
test('Save as new under an unsupported rhythm combination stores it unchanged; choosing that preset later sets it and shows the unsupported-rhythm alert', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await radio(page, 'Note density', 'Sixteenth').click()
  await radio(page, 'Silence density', 'Breath-heavy').click()
  await radio(page, 'Syncopation', 'Active displacement').click()
  const alert = page.getByRole('status').filter({ hasText: "can't form a four-bar phrase" })
  await expect(alert).toBeVisible()

  await saveAsNew(page, 'Breathless')
  await expect
    .poll(async () => (await presetRecordNamed(page, 'Breathless')).controls)
    .toMatchObject({
      noteDensity: 'Sixteenth',
      silenceDensity: 'Breath-heavy',
      syncopation: 'Active displacement',
    })

  await choosePreset(page, 'Neutral')
  await expect(alert).toBeHidden()
  await expect(primaryButton(page)).toBeEnabled()
  await choosePreset(page, 'Breathless')
  await expect(radio(page, 'Note density', 'Sixteenth')).toHaveAttribute('aria-checked', 'true')
  await expect(alert).toBeVisible()
  await expect(primaryButton(page)).toBeDisabled()
})

// @test-link [[rule_preset_management_actions]]
test('during Loading every action works, changes no setting and leaves the phrase in flight to finish', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT], LATE_NIGHT)
  const controls = await shownControls(page)
  await queueSeeds(page, [5])
  await holdGeneration(page)
  await primaryButton(page).click()
  await expect(statusRegion(page)).toHaveText('Generating phrase')
  await expect(presetBox(page)).toHaveAttribute('aria-readonly', 'true')
  for (const label of PLAYER_ROW) await expect(actionButton(page, label)).toBeEnabled()

  await saveAsNew(page, 'While loading')
  await openSheet(page, 'Rename preset', 'Rename “While loading”')
  await nameField(page).fill('Loaded')
  await sheetButton(page, 'Rename').click()
  await expectPresetShown(page, 'Loaded')
  await openSheet(page, 'Delete preset', 'Delete the preset “Loaded”?')
  await sheetButton(page, 'Delete preset').click()
  await expectPresetShown(page, 'Custom')
  expect(await shownControls(page)).toEqual(controls)
  expect((await harnessSnapshot(page)).operation).not.toBe('idle')

  await releaseGeneration(page)
  await expect(statusRegion(page)).toHaveText('Phrase ready', { timeout: 30_000 })
  expect((await harnessSnapshot(page)).seed).toBe(5)
})

// @test-link [[rule_preset_management_actions]]
test('during a session every action is disabled, the row as it was at Start, and no sheet opens; it is enabled again after', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT], LATE_NIGHT)
  await gotoSessionHarness(page)
  await readyToStart(page)
  await expectActions(page, PLAYER_ROW)

  await startSession(page)
  await expectActions(page, PLAYER_ROW)
  for (const label of PLAYER_ROW) await expect(actionButton(page, label)).toBeDisabled()
  await actionButton(page, 'Save as new preset').click({ force: true })
  await actionButton(page, 'Rename preset').click({ force: true })
  await page.waitForTimeout(300)
  await expect(presetSheet(page)).toHaveCount(0)

  await sessionAction(page).click()
  // Stopped in the count-in: no phrase sounded, so no Review; Idle again.
  await expect(sessionAction(page)).toHaveText('Start session')
  for (const label of PLAYER_ROW) await expect(actionButton(page, label)).toBeEnabled()
})

// @test-link [[rule_preset_management_actions]]
test('while a preset sheet is open the starting note starts nothing', async ({ page }) => {
  test.setTimeout(120_000)
  await gotoControllerHarness(page)
  await readyToStart(page)
  await plug(page, KEYS)
  await clickControllerStatus(page)
  await sheetClose(page).click()
  await expect(connectionSheet(page)).toBeHidden()
  const startingNote = (await sessionState(page)).startingNote?.concertPitch
  if (startingNote === undefined) throw new Error('no starting note is named')

  await openSheet(page, 'Save as new preset', 'Save as a new preset')
  await play(page, KEYS, startingNote)
  await page.waitForTimeout(300)
  expect((await sessionState(page)).phase).toBe('idle')
  await sheetButton(page, 'Cancel').click()
  await expect(actionButton(page, 'Save as new preset')).toBeFocused()

  await play(page, KEYS, startingNote)
  await expect(sessionAction(page)).toHaveText('Stop')
  await sessionAction(page).click()
})

for (const size of [
  { name: 'desktop', viewport: { width: 1280, height: 900 } },
  { name: 'landscape phone', viewport: PHONE },
] as const) {
  // @test-link [[rule_preset_management_actions]]
  test(`the preset bar and the open sheet, in Save as new and Delete, have no axe violations at the ${size.name} size`, async ({
    page,
  }) => {
    await gotoStorageHarness(page)
    await seedAndReload(page, [LATE_NIGHT], LATE_NIGHT)
    await page.setViewportSize(size.viewport)
    await radio(page, 'Contour', 'Falling').click()
    await expectActions(page, ALL_FOUR)
    await expectNoAxeViolations(page, '.preset-bar', 'the preset bar')

    await openSheet(page, 'Save as new preset', 'Save as a new preset')
    await nameField(page).fill('Jazz')
    await expect(nameAlert(page)).toBeVisible()
    await expectNoAxeViolations(page, '.sheet-backdrop', 'Save as new, a name refused')
    await sheetButton(page, 'Cancel').click()

    await openSheet(page, 'Delete preset', 'Delete the preset “Late night”?')
    await expectNoAxeViolations(page, '.sheet-backdrop', 'the delete confirmation')
    const width = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(width).toBeLessThanOrEqual(size.viewport.width)
  })
}
