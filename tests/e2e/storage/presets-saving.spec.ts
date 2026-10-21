/**
 * v3.1 chunk 17, the player presets on the device (`flows/presets/`, A refused save, Saving off,
 * Persistent storage), on the workspace harness (port 4175) over the browser's real IndexedDB,
 * each test from an empty browser context, its saved data seeded through the harness's storage
 * seam:
 *
 * - Save as new writes one whole preset record at data version 3 and saves the selection naming
 *   it; Save changes writes the whole preset again; a rename writes the new name under the same
 *   id; a deletion deletes the record; after a reload the preset made, changed or renamed is still
 *   selected, and the one deleted leaves Custom with no base; a rename leaves a kept session's
 *   label as it was;
 * - a refused save keeps the preset usable for the visit and shows the save-problem notice at once
 *   in its preset wording, or its storage-full wording when storage is full;
 * - the browser is asked for persistent storage once, at the visit's first Save as new or Save
 *   changes, never for a rename or a deletion;
 * - an outdated tab and a visit whose saved data was not read: a preset made there is usable,
 *   nothing is written, and `Delete preset` is not offered;
 * - the generated-notes and played-notes files of a session played under a distinctively named
 *   player preset hold neither its name nor its restriction, byte for byte.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { WORKSPACE_HARNESS_URL, harnessSnapshot } from '../release/harness-helpers'
import { playSession, summaryOf, untilKept } from '../review/review-tools-helpers'
import { gotoSessionHarness } from '../session/session-helpers'
import {
  collectDownloads,
  exportEach,
  exportOnce,
  exportPlayedButton,
  pickFormat,
  reviewOfSession,
  reviewPanel,
} from '../review/review-helpers'
import { choosePreset, expectPresetShown, radio } from '../workspace/helpers'
import {
  EARLY_MORNING,
  LATE_NIGHT,
  NEUTRAL_CONTROLS,
  NEUTRAL_LEVELS,
  actionButton,
  expectActions,
  nameField,
  openSheet,
  presetRecordNamed,
  presetRecords,
  saveAsNew,
  seedAndReload,
  sheetButton,
  yourPresetNames,
} from '../workspace/preset-management-helpers'
import { persistCalls, spyOnPersist } from './my-instrument-sheet-helpers'
import {
  databaseRecords,
  gotoStorageHarness,
  harnessReady,
  reloadHarness,
  storedSettings,
  untilStored,
} from './storage-helpers'

// The export file names are the session's start in the player's local time: fix the zone.
test.use({ timezoneId: 'Europe/Paris' })

/** How long a save, or a notice it raises, takes at most to land on this harness. */
const SETTLE_MS = 300

const STORAGE_FULL =
  "This device has no room left for the app's data, so something couldn't be saved. Deleting sessions you no longer need frees space."

/** Intent: the notice row's notices. */
function notices(page: Page): Locator {
  return page.locator('.layout-workspace > .app-notice-row > .app-notice')
}

/** Intent: the changes that reached the storage port since the load (the write spy). */
function portChanges(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.storage.portChanges())
}

/** Intent: the save policy's saving state. */
function savingState(page: Page): Promise<string | null> {
  return page.evaluate(() => window.__workspaceHarness.storage.savingState())
}

/** Intent: the selection the session holds now. */
async function selection(page: Page): Promise<WorkspaceHarnessPresetSelection> {
  return (await harnessSnapshot(page)).selection
}

/** Intent: the id of the player preset selected now; another selection is a failure. */
async function selectedId(page: Page): Promise<string> {
  const now = await selection(page)
  if (now.kind !== 'preset') throw new Error(`no preset is selected: ${JSON.stringify(now)}`)
  return now.presetId
}

// @test-link [[rule_player_presets_saved_on_device]]
test('Save as new writes one whole record at data version 3 and saves the selection naming it; after a reload it is still selected', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await radio(page, 'Tension', 'Build').click()
  await saveAsNew(page, '  Night drive ')
  const id = await selectedId(page)
  expect(id).not.toBe('')

  await expect.poll(() => presetRecords(page)).toHaveProperty(id)
  const record = (await presetRecords(page))[id]
  expect(record).toEqual({
    dataVersion: 3,
    appVersion: expect.any(String) as unknown as string,
    id,
    name: 'Night drive',
    controls: { ...NEUTRAL_CONTROLS, tension: 'Build' },
    levels: NEUTRAL_LEVELS,
    restriction: { keys: 'any', modes: 'any' },
  })
  await untilStored(page, { presetSelection: { kind: 'preset', presetId: id } })

  await reloadHarness(page)
  await expectPresetShown(page, 'Night drive')
  expect(await selection(page)).toEqual({ kind: 'preset', presetId: id })
  expect(await yourPresetNames(page)).toEqual(['Night drive'])
})

// @test-link [[rule_player_presets_saved_on_device]]
test('Save changes writes the whole preset again under its id; after a reload it is selected with the saved values', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT, EARLY_MORNING], LATE_NIGHT)
  await radio(page, 'Contour', 'Falling').click()
  await actionButton(page, 'Save changes').click()
  await expectPresetShown(page, 'Late night')

  await expect
    .poll(async () => (await presetRecords(page))['player-1'])
    .toMatchObject({
      id: 'player-1',
      name: 'Late night',
      controls: { ...LATE_NIGHT.controls, contour: 'Falling' },
      restriction: LATE_NIGHT.restriction,
    })
  await untilStored(page, { presetSelection: { kind: 'preset', presetId: 'player-1' } })
  await reloadHarness(page)
  await expectPresetShown(page, 'Late night')
  await expect(radio(page, 'Contour', 'Falling')).toHaveAttribute('aria-checked', 'true')
})

// @test-link [[rule_player_presets_saved_on_device]]
test('a rename writes the new name under the same id, a case-only one too; after a reload the renamed preset is still selected', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT], LATE_NIGHT)
  const settingsBefore = await storedSettings(page)

  await openSheet(page, 'Rename preset', 'Rename “Late night”')
  await nameField(page).fill('Afterhours')
  await sheetButton(page, 'Rename').click()
  await expect.poll(async () => (await presetRecords(page))['player-1']?.name).toBe('Afterhours')
  await openSheet(page, 'Rename preset', 'Rename “Afterhours”')
  await nameField(page).fill('afterhours')
  await sheetButton(page, 'Rename').click()
  await expect.poll(async () => (await presetRecords(page))['player-1']?.name).toBe('afterhours')
  expect(Object.keys(await presetRecords(page))).toEqual(['player-1'])
  expect(await storedSettings(page)).toEqual(settingsBefore)

  await reloadHarness(page)
  await expectPresetShown(page, 'afterhours')
  expect(await selection(page)).toEqual({ kind: 'preset', presetId: 'player-1' })
})

// @test-link [[rule_player_presets_saved_on_device]]
test('a deletion deletes the record and saves Custom with no base; after a reload Custom loads with the same values', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT, EARLY_MORNING], LATE_NIGHT)
  await openSheet(page, 'Delete preset', 'Delete the preset “Late night”?')
  await sheetButton(page, 'Delete preset').click()
  await expectPresetShown(page, 'Custom')

  await expect.poll(async () => Object.keys(await presetRecords(page))).toEqual(['player-2'])
  await untilStored(page, { presetSelection: { kind: 'custom', baseId: null } })
  await reloadHarness(page)
  await expectPresetShown(page, 'Custom')
  await expect(radio(page, 'Tension', 'Build')).toHaveAttribute('aria-checked', 'true')
  expect(await yourPresetNames(page)).toEqual(['Early morning'])
})

// @test-link [[rule_player_preset_names]]
test("rename leaves a kept session's label as it was", async ({ page }) => {
  test.setTimeout(120_000)
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT], LATE_NIGHT)
  await gotoSessionHarness(page)
  await expectPresetShown(page, 'Late night')
  await playSession(page)
  const [key] = await untilKept(page, 1)
  expect(await summaryOf(page, key ?? '')).toMatchObject({ presetLabel: 'Late night' })
  await expect(reviewPanel(page).locator('.review-summary')).toContainText('Late night')

  await openSheet(page, 'Rename preset', 'Rename “Late night”')
  await page.keyboard.type('Afterhours')
  await sheetButton(page, 'Rename').click()
  await expectPresetShown(page, 'Afterhours')
  await expect(reviewPanel(page).locator('.review-summary')).toContainText('Late night')
  await expect(reviewPanel(page).locator('.review-summary')).not.toContainText('Afterhours')
  await page.waitForTimeout(300)
  expect(await summaryOf(page, key ?? '')).toMatchObject({ presetLabel: 'Late night' })
})

for (const refusal of ['other', 'quota'] as const) {
  // @test-link [[rule_refused_preset_save_told]]
  // @test-link [[rule_failed_save_never_disturbs_session]]
  test(`a save refused as ${refusal} keeps the preset usable and shows the notice at once in its ${refusal === 'quota' ? 'storage-full' : 'preset'} wording`, async ({
    page,
  }) => {
    await gotoStorageHarness(page)
    await page.evaluate(
      (kind) => window.__workspaceHarness.storage.refuseSaves(kind),
      refusal as 'other' | 'quota',
    )
    await saveAsNew(page, 'Night drive')

    const wording =
      refusal === 'quota'
        ? STORAGE_FULL
        : "Your preset “Night drive” couldn't be saved on this device. You can use it until this page closes."
    await expect(notices(page)).toHaveCount(1)
    await expect(notices(page).locator('p')).toHaveText(wording)
    await expect(actionButton(page, 'Save as new preset')).toBeFocused()

    await choosePreset(page, 'Jazz')
    await choosePreset(page, 'Night drive')
    expect(await yourPresetNames(page)).toEqual(['Night drive'])
    expect(await presetRecords(page)).toEqual({})
  })
}

// @test-link [[rule_persistent_storage_requested]]
test('the first Save as new of a visit asks for persistent storage once, a rename and a deletion never; a later Save changes asks no more', async ({
  page,
}) => {
  await spyOnPersist(page)
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT, EARLY_MORNING], LATE_NIGHT)

  await openSheet(page, 'Rename preset', 'Rename “Late night”')
  await nameField(page).fill('Afterhours')
  await sheetButton(page, 'Rename').click()
  await expect.poll(async () => (await presetRecords(page))['player-1']?.name).toBe('Afterhours')
  await openSheet(page, 'Delete preset', 'Delete the preset “Afterhours”?')
  await sheetButton(page, 'Delete preset').click()
  await expectPresetShown(page, 'Custom')
  await page.waitForTimeout(SETTLE_MS)
  expect(await persistCalls(page)).toBe(0)

  await saveAsNew(page, 'Night drive')
  await expect.poll(() => persistCalls(page)).toBe(1)
  await radio(page, 'Contour', 'Falling').click()
  await actionButton(page, 'Save changes').click()
  await expectPresetShown(page, 'Night drive')
  await expect
    .poll(async () => (await presetRecordNamed(page, 'Night drive')).controls)
    .toMatchObject({ contour: 'Falling' })
  await page.waitForTimeout(SETTLE_MS)
  expect(await persistCalls(page)).toBe(1)
})

// @test-link [[rule_persistent_storage_requested]]
test('a Save changes first in the visit asks for persistent storage once', async ({ page }) => {
  await spyOnPersist(page)
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT], LATE_NIGHT)
  await radio(page, 'Contour', 'Falling').click()
  await actionButton(page, 'Save changes').click()
  await expect.poll(() => persistCalls(page)).toBe(1)
})

/** Intent: in a visit that saves nothing: a preset made and renamed is usable; nothing is written. */
async function expectPresetsLastForThePage(page: Page): Promise<void> {
  const stored = await databaseRecords(page)
  const changes = await portChanges(page)

  await saveAsNew(page, 'Made here')
  await expectActions(page, ['Save as new preset', 'Rename preset'])
  await openSheet(page, 'Rename preset', 'Rename “Made here”')
  await nameField(page).fill('Made here too')
  await sheetButton(page, 'Rename').click()
  await expectPresetShown(page, 'Made here too')
  await choosePreset(page, 'Jazz')
  await choosePreset(page, 'Made here too')
  await expectActions(page, ['Save as new preset', 'Rename preset'])
  await expect(actionButton(page, 'Delete preset')).toHaveCount(0)

  await page.waitForTimeout(SETTLE_MS)
  expect(await portChanges(page)).toBe(changes)
  expect(await databaseRecords(page)).toEqual(stored)
}

// @test-link [[rule_presets_in_visits_that_save_nothing]]
// @test-link [[rule_outdated_tab_stops_saving]]
test('an outdated tab: a preset made there is usable, nothing is written, and Delete preset is not offered', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT], LATE_NIGHT)
  await expectActions(page, ['Save as new preset', 'Rename preset', 'Delete preset'])
  await page.evaluate(() => window.__workspaceHarness.storage.openNewerVersion())
  await expect.poll(() => savingState(page)).toBe('off-outdated')
  await expectActions(page, ['Save as new preset', 'Rename preset'])
  await expectPresetsLastForThePage(page)
})

// @test-link [[rule_presets_in_visits_that_save_nothing]]
test('a visit whose saved data was not read: a preset made there is usable, nothing is written, and Delete preset is not offered', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedAndReload(page, [LATE_NIGHT], LATE_NIGHT)
  await page.goto(`${WORKSPACE_HARNESS_URL}?storageRead=fail`)
  await harnessReady(page)
  expect(await savingState(page)).toBe('off-unreadable')
  expect(await yourPresetNames(page)).toEqual([])
  await expectPresetsLastForThePage(page)
})

/** A distinctively named player preset: Neutral's values, meant for C in Ionian or Lydian. */
const QUOKKA: WorkspaceHarnessPresetInput = {
  ...EARLY_MORNING,
  id: 'player-quokka',
  name: 'Zephyr Quokka Groove',
  restriction: { keys: ['C'], modes: ['Ionian', 'Lydian'] },
}

/** What a file must never hold: the preset's name, its parts, and its restriction's words. */
const NEVER_EXPORTED = [
  'Zephyr Quokka Groove',
  'Zephyr',
  'Quokka',
  'Lydian',
  'lydian',
  'LYDIAN',
  'Ionian or Lydian',
  'Meant for',
  'player-quokka',
]

// @test-link [[rule_no_preset_leaves_device]]
test('the generated-notes and played-notes files of a session played under a distinctively named player preset hold neither its name nor its restriction', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page)
  await seedAndReload(page, [QUOKKA], QUOKKA)
  await expectPresetShown(page, 'Zephyr Quokka Groove')
  const downloads = collectDownloads(page)
  await reviewOfSession(page, true)
  await expectPresetShown(page, 'Zephyr Quokka Groove')
  await expect(reviewPanel(page).locator('.review-summary')).toContainText('Zephyr Quokka Groove')

  const generated = await exportEach(page, downloads)
  const playedMidi = await exportOnce(page, downloads, exportPlayedButton(page))
  await pickFormat(page, 'MusicXML')
  const playedXml = await exportOnce(page, downloads, exportPlayedButton(page))
  const files: Record<string, Buffer> = {
    'generated MusicXML': generated.musicXml,
    'generated MIDI': generated.midi,
    'generated MIDI with backing': generated.midiWithBacking,
    [`played notes ${playedMidi.fileName}`]: playedMidi.bytes,
    [`played notes ${playedXml.fileName}`]: playedXml.bytes,
  }
  for (const [label, bytes] of Object.entries(files)) {
    expect(bytes.length, label).toBeGreaterThan(0)
    for (const text of NEVER_EXPORTED) {
      for (const encoding of ['utf8', 'utf16le'] as const) {
        expect(bytes.includes(Buffer.from(text, encoding)), `${label} holds "${text}"`).toBe(false)
      }
    }
  }
})
