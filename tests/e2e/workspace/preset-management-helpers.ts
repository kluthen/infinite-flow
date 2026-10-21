/**
 * Shared helpers for the preset management specs on the workspace harness (port 4175): player
 * presets as the harness seeds them (through its preset codec, never hand-built records) with the
 * settings that keep one selected, the preset bar's actions row, the preset sheet and its parts,
 * the box's Your presets group, the preset records stored, read back through the seam, the
 * selection the session holds, and an axe scan of one part of the page.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

import { harnessSnapshot } from '../release/harness-helpers'
import { reloadHarness, seedSettings } from '../storage/storage-helpers'
import { presetBox } from './helpers'

/** Neutral's seven figure levels: the first-load levels. */
export const NEUTRAL_LEVELS = {
  passingTone: 'asToday',
  accentedPassingTone: 'asToday',
  neighborTone: 'asToday',
  appoggiatura: 'off',
  diatonicEnclosure: 'off',
  chromaticApproach: 'off',
  chromaticEnclosure: 'off',
} as const

/** Neutral's ten preset-held controls: the first-load controls. */
export const NEUTRAL_CONTROLS = {
  harmonicMotion: 'Gentle diatonic',
  tension: 'Lift',
  noteDensity: 'Quarter',
  rhythmicVariety: 'Slightly varied',
  syncopation: 'Straight',
  silenceDensity: 'Sparse',
  contour: 'Arch',
  register: 'Middle',
  leapiness: 'Shaped',
  arpeggioChaos: 'Varied',
} as const

/** A player preset: Neutral's values with Tension at Build, meant for Ionian or Dorian in any key. */
export const LATE_NIGHT: WorkspaceHarnessPresetInput = {
  id: 'player-1',
  name: 'Late night',
  controls: { ...NEUTRAL_CONTROLS, tension: 'Build' },
  levels: NEUTRAL_LEVELS,
  restriction: { keys: 'any', modes: ['Ionian', 'Dorian'] },
  kind: 'player',
}

/** A second player preset: Neutral's values under another name, anywhere. */
export const EARLY_MORNING: WorkspaceHarnessPresetInput = {
  id: 'player-2',
  name: 'Early morning',
  controls: NEUTRAL_CONTROLS,
  levels: NEUTRAL_LEVELS,
  restriction: { keys: 'any', modes: 'any' },
  kind: 'player',
}

/** Intent: `count` player presets, `p1`... named "Preset 01"..., Neutral's values, anywhere. */
export function manyPresets(count: number): WorkspaceHarnessPresetInput[] {
  return Array.from({ length: count }, (_, index) => ({
    ...EARLY_MORNING,
    id: `p${String(index + 1)}`,
    name: `Preset ${String(index + 1).padStart(2, '0')}`,
  }))
}

/** Intent: the settings records that hold a preset's ten controls and seven levels, as saved. */
function savedValuesOf(preset: WorkspaceHarnessPresetInput): Record<string, unknown> {
  return {
    ...Object.fromEntries(
      Object.entries(preset.controls).map(([key, value]) => [`controls.${key}`, value]),
    ),
    ...Object.fromEntries(
      Object.entries(preset.levels).map(([figure, level]) => [`figureLevels.${figure}`, level]),
    ),
  }
}

/** Intent: seed player preset records for the next load, through the harness's preset codec. */
export function seedPresets(
  page: Page,
  presets: readonly WorkspaceHarnessPresetInput[],
): Promise<void> {
  return page.evaluate((seeded) => window.__workspaceHarness.storage.seedPresets(seeded), presets)
}

/**
 * Intent: seed `presets` and the settings that keep `selected` the selection (its values, so the
 * load does not make it Custom), or Custom with no base for null, then reload so the load reads
 * them.
 */
export async function seedAndReload(
  page: Page,
  presets: readonly WorkspaceHarnessPresetInput[],
  selected: WorkspaceHarnessPresetInput | null,
): Promise<void> {
  if (presets.length > 0) await seedPresets(page, presets)
  if (selected !== null) {
    await seedSettings(page, {
      ...savedValuesOf(selected),
      presetSelection: { kind: 'preset', presetId: selected.id },
    })
  } else {
    await seedSettings(page, { presetSelection: { kind: 'custom', baseId: null } })
  }
  await reloadHarness(page)
}

/** Intent: the preset bar's actions row. */
export function presetActions(page: Page): Locator {
  return page.locator('.preset-bar .preset-actions')
}

/** Intent: one button of the actions row, by its exact label. */
export function actionButton(page: Page, label: string): Locator {
  return presetActions(page).getByRole('button', { name: label, exact: true })
}

/** Intent: expect the actions row to hold exactly `labels`, in order. */
export async function expectActions(page: Page, labels: readonly string[]): Promise<void> {
  await expect(presetActions(page).getByRole('button')).toHaveText([...labels])
}

/** Intent: the preset sheet's dialog. */
export function presetSheet(page: Page): Locator {
  return page.getByRole('dialog')
}

/** Intent: the open preset sheet's name field. */
export function nameField(page: Page): Locator {
  return presetSheet(page).getByRole('textbox', { name: 'Name', exact: true })
}

/** Intent: the open preset sheet's refused-name reason. */
export function nameAlert(page: Page): Locator {
  return presetSheet(page).locator('.name-alert')
}

/** Intent: one of the sheet's `sheet-actions` buttons, by its exact label. */
export function sheetButton(page: Page, label: string): Locator {
  return presetSheet(page)
    .locator('.sheet-actions')
    .getByRole('button', { name: label, exact: true })
}

/** Intent: the open sheet's Key and mode options. */
export function keyAndModeOptions(page: Page): Locator {
  return presetSheet(page).getByRole('radiogroup', { name: 'Key and mode' }).getByRole('radio')
}

/** Intent: the Key and mode options' labels, the checked one marked with " *". */
export function shownChoices(page: Page): Promise<string[]> {
  return keyAndModeOptions(page).evaluateAll((options) =>
    options.map(
      (option) =>
        `${(option.textContent ?? '').trim()}${option.getAttribute('aria-checked') === 'true' ? ' *' : ''}`,
    ),
  )
}

/** Intent: press an action of the row that opens the sheet, and wait for it, titled `title`. */
export async function openSheet(page: Page, action: string, title: string): Promise<void> {
  await actionButton(page, action).click()
  await expect(presetSheet(page)).toHaveAccessibleName(title)
}

/** Intent: Save as new under `name` with the default choice, the sheet closed and `name` shown. */
export async function saveAsNew(page: Page, name: string): Promise<void> {
  await openSheet(page, 'Save as new preset', 'Save as a new preset')
  await nameField(page).fill(name)
  await sheetButton(page, 'Save').click()
  await expect(presetSheet(page)).toHaveCount(0)
  await expect(presetBox(page)).toHaveAttribute('title', name.trim())
}

/** Intent: the names the box lists under Your presets, in order. */
export function yourPresetNames(page: Page): Promise<string[]> {
  return presetBox(page)
    .locator('optgroup[label="Your presets"] > option')
    .evaluateAll((options) => options.map((option) => option.textContent?.trim() ?? ''))
}

/** Intent: every preset record stored, by key, read through the harness's seam. */
export async function presetRecords(page: Page): Promise<Record<string, Record<string, unknown>>> {
  const records = await page.evaluate(() =>
    window.__workspaceHarness.storage.keyedRecords('presets'),
  )
  return Object.fromEntries(
    records.map(({ key, value }) => [key, value as Record<string, unknown>]),
  )
}

/** Intent: the one stored preset record named `name`; none or several is a failure. */
export async function presetRecordNamed(
  page: Page,
  name: string,
): Promise<Record<string, unknown>> {
  const named = Object.values(await presetRecords(page)).filter((record) => record.name === name)
  expect(named, `the records named "${name}"`).toHaveLength(1)
  return named[0] ?? {}
}

/** The actions row of Custom based on a player preset: all four. */
export const ALL_FOUR = ['Save as new preset', 'Save changes', 'Rename preset', 'Delete preset']
/** The actions row of a player preset selected. */
export const PLAYER_ROW = ['Save as new preset', 'Rename preset', 'Delete preset']
/** The note `Save as new preset` names while 50 or more player presets are kept. */
export const LIMIT_NOTE =
  'You have 50 presets of your own, the most the app keeps. Delete one, here or in Your data, to save a new one.'

/** Intent: axe finds nothing inside `selector`, with every transition settled. */
export async function expectNoAxeViolations(
  page: Page,
  selector: string,
  context: string,
): Promise<void> {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => !(animation instanceof CSSTransition)),
  )
  const results = await new AxeBuilder({ page }).include(selector).analyze()
  expect(
    results.violations,
    `${context}:\n${results.violations.map((v) => `${v.id}: ${v.help}`).join('\n')}`,
  ).toEqual([])
}

/** Intent: the selection the session holds now. */
export async function selection(page: Page): Promise<WorkspaceHarnessPresetSelection> {
  return (await harnessSnapshot(page)).selection
}

/** Intent: whether the name field's whole text is selected, so typing replaces it. */
export function nameSelected(page: Page): Promise<boolean> {
  return nameField(page).evaluate((input) => {
    const field = input as HTMLInputElement
    return field.selectionStart === 0 && field.selectionEnd === field.value.length
  })
}
