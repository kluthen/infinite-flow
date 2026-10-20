/**
 * v3.1 chunk 16, presets and levels on the device, on the workspace harness (port 4175) over the
 * browser's real IndexedDB; each test starts from an empty browser context:
 *
 * - each of the seven figure levels, seeded (the level controls are not drawn yet), comes back
 *   after a reload, stored at data version 3, and a later unrelated change does not rewrite it;
 * - the preset selection comes back after a reload: a built-in chosen, a player preset, Custom
 *   based on a preset and Custom with no base;
 * - the player presets are read with the saved settings and listed; on load the saved values win:
 *   a player preset changed in another tab, a deleted base, and a key and mode outside the
 *   selected preset's restriction each load as Custom, nothing moved;
 * - a preset record the codec cannot read is not listed, and is still stored after the load;
 * - a v3.0 database (data version 1) is carried over at the app's open: Jazz selected with
 *   Tension at Build opens as Custom based on Jazz with Jazz's levels, its records at data
 *   version 3 and the presets store created, empty;
 * - a failed or slow start-up read lists the built-ins only and writes nothing; an outdated tab
 *   lists the player presets it read and writes nothing;
 * - nothing is written during a session, and a level Vary settings moved is never saved.
 */
import { expect, test, type Page } from '@playwright/test'

import {
  WORKSPACE_HARNESS_URL,
  harnessSnapshot,
  queueSessionSeeds,
  settingsMutationSeed,
} from '../release/harness-helpers'
import { clockTo } from '../session/session-midi-helpers'
import {
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
  sessionTimeline,
  startSession,
} from '../session/session-helpers'
import { radio } from '../workspace/helpers'
import { gotoHeldLoad, releaseHeldLoad } from './kept-session-v1-helpers'
import {
  databaseRecords,
  gotoStorageHarness,
  harnessReady,
  reloadHarness,
  seedSettings,
  storedSettings,
  untilStored,
} from './storage-helpers'

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
] as const

/** Neutral's seven figure levels: the first-load levels. */
const NEUTRAL_LEVELS = {
  passingTone: 'asToday',
  accentedPassingTone: 'asToday',
  neighborTone: 'asToday',
  appoggiatura: 'off',
  diatonicEnclosure: 'off',
  chromaticApproach: 'off',
  chromaticEnclosure: 'off',
} as const

/** Jazz's seven figure levels: Neutral's, with the chromatic approach and enclosure as today. */
const JAZZ_LEVELS = {
  ...NEUTRAL_LEVELS,
  chromaticApproach: 'asToday',
  chromaticEnclosure: 'asToday',
} as const

/** Jazz's ten preset-held controls. */
const JAZZ_CONTROLS = {
  harmonicMotion: 'Gentle diatonic',
  tension: 'Lift',
  noteDensity: 'Eighth',
  rhythmicVariety: 'Slightly varied',
  syncopation: 'Occasional offbeats',
  silenceDensity: 'Conversational',
  contour: 'Wandering',
  register: 'Varying',
  leapiness: 'Shaped',
  arpeggioChaos: 'Varied',
} as const

/** A level differing from Neutral's for each figure. */
const NON_DEFAULT_LEVELS = {
  passingTone: 'favored',
  accentedPassingTone: 'stronglyFavored',
  neighborTone: 'off',
  appoggiatura: 'asToday',
  diatonicEnclosure: 'favored',
  chromaticApproach: 'stronglyFavored',
  chromaticEnclosure: 'asToday',
} as const

/** A player preset: Jazz's controls with Tension at Build, the passing tone favored, any key in Ionian or Dorian. */
const LATE_NIGHT: WorkspaceHarnessPresetInput = {
  id: 'player-1',
  name: 'Late night',
  controls: { ...JAZZ_CONTROLS, tension: 'Build' },
  levels: { ...JAZZ_LEVELS, passingTone: 'favored' },
  restriction: { keys: 'any', modes: ['Ionian', 'Dorian'] },
  kind: 'player',
}

/** A second player preset: Neutral's values under another name, anywhere. */
const EARLY_MORNING: WorkspaceHarnessPresetInput = {
  id: 'player-2',
  name: 'Early morning',
  controls: {
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
  },
  levels: NEUTRAL_LEVELS,
  restriction: { keys: 'any', modes: 'any' },
  kind: 'player',
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
function seedPresets(page: Page, presets: readonly WorkspaceHarnessPresetInput[]): Promise<void> {
  return page.evaluate((seeded) => window.__workspaceHarness.storage.seedPresets(seeded), presets)
}

/** Intent: seed raw preset records for the next load, straight to IndexedDB. */
function seedRawPresets(page: Page, entries: readonly WorkspaceHarnessRawRecord[]): Promise<void> {
  return page.evaluate(
    (seeded) => window.__workspaceHarness.storage.seedRawPresets(seeded),
    entries,
  )
}

/** Intent: the stored settings record under `key`, as stored, read through the seam. */
async function storedRecord(page: Page, key: string): Promise<Record<string, unknown> | undefined> {
  const records = await page.evaluate(() => window.__workspaceHarness.storage.records('settings'))
  return records.find((record) => (record as { key?: unknown }).key === key) as
    Record<string, unknown> | undefined
}

/** Intent: how many changes reached the app's storage port since the load. */
function portChanges(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.storage.portChanges())
}

/** Intent: the load's outcome and saving state, as the harness reports them. */
function loadReport(page: Page) {
  return page.evaluate(() => ({
    outcome: window.__workspaceHarness.storage.loadOutcome(),
    saving: window.__workspaceHarness.storage.savingState(),
  }))
}

/** Intent: one radio is the checked option of its group. */
async function expectChecked(page: Page, group: string, option: string): Promise<void> {
  await expect(radio(page, group, option)).toHaveAttribute('aria-checked', 'true')
}

/** Intent: the muted control-summary line shows `text`. */
async function expectSummary(page: Page, text: string): Promise<void> {
  await expect(page.locator('.control-summary')).toHaveText(text)
}

/** Intent: choose a preset by its id through the harness, as the player will in the preset box. */
async function selectPreset(page: Page, id: string): Promise<void> {
  expect(
    await page.evaluate((presetId) => window.__workspaceHarness.selectPreset(presetId), id),
  ).toBe(true)
}

/** Intent: open the harness at `search` (an injected read, say), the load ended and mounted. */
async function gotoWith(page: Page, search: string): Promise<void> {
  await page.goto(`${WORKSPACE_HARNESS_URL}${search}`)
  await harnessReady(page)
}

/** Intent: the player presets and the Late night selection seeded, for the next load. */
async function seedLateNightSelected(page: Page): Promise<void> {
  await seedPresets(page, [LATE_NIGHT, EARLY_MORNING])
  await seedSettings(page, {
    ...savedValuesOf(LATE_NIGHT),
    presetSelection: { kind: 'preset', presetId: 'player-1' },
  })
}

for (const [figure, level] of Object.entries(NON_DEFAULT_LEVELS)) {
  // @test-link [[rule_player_presets_saved_on_device]]
  // @test-link [[rule_settings_saved_on_change]]
  test(`the ${figure} level comes back after a reload, stored at data version 3, and a later change does not rewrite it`, async ({
    page,
  }) => {
    await gotoStorageHarness(page)
    await seedSettings(page, { [`figureLevels.${figure}`]: level })
    await reloadHarness(page)

    const snapshot = await harnessSnapshot(page)
    expect(snapshot.figureLevels).toEqual({ ...NEUTRAL_LEVELS, [figure]: level })
    expect(snapshot.selection).toEqual({ kind: 'custom', baseId: 'neutral' })
    const stored = await storedRecord(page, `figureLevels.${figure}`)
    expect(stored).toMatchObject({ dataVersion: 3, value: level })

    await radio(page, 'Presentation theme', 'Dark').click()
    await untilStored(page, { theme: 'Dark' })
    expect(await storedRecord(page, `figureLevels.${figure}`)).toEqual(stored)
    expect(Object.keys(await storedSettings(page)).sort()).toEqual(
      [`figureLevels.${figure}`, 'theme'].sort(),
    )
  })
}

// @test-link [[rule_player_presets_saved_on_device]]
// @test-link [[rule_settings_saved_on_change]]
test('a built-in chosen, and Custom based on it, come back after a reload', async ({ page }) => {
  await gotoStorageHarness(page)
  await radio(page, 'Musical profile preset', 'Jazz').click()
  await untilStored(page, { presetSelection: { kind: 'preset', presetId: 'jazz' } })
  expect(await storedRecord(page, 'presetSelection')).toMatchObject({ dataVersion: 3 })
  await reloadHarness(page)
  expect(await harnessSnapshot(page)).toMatchObject({
    selection: { kind: 'preset', presetId: 'jazz' },
    figureLevels: JAZZ_LEVELS,
  })
  await expectSummary(page, 'C Ionian · Jazz · Lift · Shaped')

  await radio(page, 'Contour', 'Falling').click()
  await untilStored(page, { presetSelection: { kind: 'custom', baseId: 'jazz' } })
  await reloadHarness(page)
  expect((await harnessSnapshot(page)).selection).toEqual({ kind: 'custom', baseId: 'jazz' })
  await expectChecked(page, 'Contour', 'Falling')
  await expectSummary(page, 'C Ionian · Custom, based on Jazz · Lift · Shaped')
})

// @test-link [[rule_player_presets_saved_on_device]]
// @test-link [[rule_presets_read_at_start_up]]
test('a player preset selected, and Custom with no base, come back after a reload', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedLateNightSelected(page)
  await reloadHarness(page)
  expect(await harnessSnapshot(page)).toMatchObject({
    selection: { kind: 'preset', presetId: 'player-1' },
    figureLevels: LATE_NIGHT.levels,
  })
  await expectSummary(page, 'C Ionian · Late night · Build · Shaped')

  await seedSettings(page, { presetSelection: { kind: 'custom', baseId: null } })
  await reloadHarness(page)
  expect(await harnessSnapshot(page)).toMatchObject({
    selection: { kind: 'custom', baseId: null },
    figureLevels: LATE_NIGHT.levels,
  })
  await expectSummary(page, 'C Ionian · Custom · Build · Shaped')
})

// @test-link [[rule_presets_read_at_start_up]]
// @test-link [[rule_player_presets_saved_on_device]]
test('the player presets stored are read with the saved settings and listed after the built-ins', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  expect((await harnessSnapshot(page)).presetNames).toEqual(BUILT_IN_NAMES)
  await seedPresets(page, [LATE_NIGHT, EARLY_MORNING])
  await reloadHarness(page)

  expect((await harnessSnapshot(page)).presetNames).toEqual([
    ...BUILT_IN_NAMES,
    'Late night',
    'Early morning',
  ])
  expect(await loadReport(page)).toEqual({ outcome: 'saved-data-read', saving: 'on' })
})

// @test-link [[rule_preset_load_values_win]]
test('a player preset changed in another tab loads as Custom based on it, with the saved values', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedLateNightSelected(page)
  // Another tab changed Late night's tension after this visit's values were saved.
  await seedPresets(page, [
    { ...LATE_NIGHT, controls: { ...LATE_NIGHT.controls, tension: 'Edge' } },
  ])
  await reloadHarness(page)

  expect(await harnessSnapshot(page)).toMatchObject({
    selection: { kind: 'custom', baseId: 'player-1' },
    figureLevels: LATE_NIGHT.levels,
  })
  await expectChecked(page, 'Tension', 'Build')
  await expectSummary(page, 'C Ionian · Custom, based on Late night · Build · Shaped')
})

// @test-link [[rule_preset_load_values_win]]
test('a selection whose preset was deleted loads as Custom with no base, every value kept', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedSettings(page, {
    ...savedValuesOf(LATE_NIGHT),
    presetSelection: { kind: 'preset', presetId: 'player-1' },
  })
  await reloadHarness(page)

  expect(await harnessSnapshot(page)).toMatchObject({
    selection: { kind: 'custom', baseId: null },
    figureLevels: LATE_NIGHT.levels,
    presetNames: BUILT_IN_NAMES,
  })
  await expectChecked(page, 'Tension', 'Build')
  await expectSummary(page, 'C Ionian · Custom · Build · Shaped')
})

// @test-link [[rule_preset_load_values_win]]
test("a key and mode saved outside the selected preset's restriction load unmoved, as Custom based on it", async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await selectPreset(page, 'reel')
  await untilStored(page, {
    presetSelection: { kind: 'preset', presetId: 'reel' },
    'controls.collection': 'Mixolydian',
  })
  // Saved Ionian, which Reel does not allow, as a damaged or edited record would leave it.
  await seedSettings(page, { 'controls.collection': 'Ionian' })
  await reloadHarness(page)

  expect((await harnessSnapshot(page)).selection).toEqual({ kind: 'custom', baseId: 'reel' })
  await expectChecked(page, 'Written key', 'C')
  await expectChecked(page, 'Collection', 'Ionian')
  await expectSummary(page, 'C Ionian · Custom, based on Reel · Settled · Shaped')
})

// @test-link [[rule_presets_load_tolerantly]]
test('a preset record that cannot be read is not listed, and is still stored after the load', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  const readable = {
    dataVersion: 3,
    appVersion: '3.1.0',
    ...EARLY_MORNING,
  }
  const { kind, ...record } = readable
  void kind
  const unreadable: WorkspaceHarnessRawRecord[] = [
    { key: 'player-3', record: 'not a record' },
    { key: 'player-4', record: { ...record, id: 'player-9', name: 'Under another id' } },
    { key: 'player-5', record: { ...record, id: 'player-5', name: 'Newer', dataVersion: 4 } },
  ]
  await seedRawPresets(page, [{ key: 'player-2', record }, ...unreadable])
  await reloadHarness(page)

  expect((await harnessSnapshot(page)).presetNames).toEqual([...BUILT_IN_NAMES, 'Early morning'])
  const { presets } = await databaseRecords(page)
  expect(presets).toEqual([record, ...unreadable.map((entry) => entry.record)])
  expect(await loadReport(page)).toEqual({ outcome: 'saved-data-read', saving: 'on' })
})

// @test-link [[rule_saved_profile_becomes_preset]]
// @test-link [[rule_preset_load_values_win]]
test('a v3.0 database with Jazz selected and Tension at Build opens as Custom based on Jazz with Jazz levels, its records at data version 3', async ({
  page,
}) => {
  await gotoHeldLoad(page)
  /** Intent: a settings record as v3.0 stored it, at data version 1. */
  const v30 = (key: string, value: unknown): WorkspaceHarnessVersionOneSetting => ({
    key,
    dataVersion: 1,
    appVersion: '3.0.0',
    value,
  })
  await page.evaluate(
    (records) => {
      const held = window.__workspaceHarnessHeldLoad
      if (held === undefined) throw new Error('the load is not held')
      return held.seedVersionOneSettings(records)
    },
    [
      v30('profileSelection', { musicalProfile: 'Jazz', isCustom: false }),
      v30('controls.noteDensity', 'Eighth'),
      v30('controls.syncopation', 'Occasional offbeats'),
      v30('controls.silenceDensity', 'Conversational'),
      v30('controls.contour', 'Wandering'),
      v30('controls.register', 'Varying'),
      v30('controls.tension', 'Build'),
    ],
  )
  await releaseHeldLoad(page)
  await harnessReady(page)

  expect(await harnessSnapshot(page)).toMatchObject({
    selection: { kind: 'custom', baseId: 'jazz' },
    figureLevels: JAZZ_LEVELS,
    presetNames: BUILT_IN_NAMES,
  })
  await expectChecked(page, 'Tension', 'Build')
  await expectSummary(page, 'C Ionian · Custom, based on Jazz · Build · Shaped')

  const { settings = [], presets } = await databaseRecords(page)
  const byKey = new Map(
    settings.map((record) => [(record as { key: string }).key, record as Record<string, unknown>]),
  )
  expect(byKey.has('profileSelection')).toBe(false)
  expect(byKey.get('presetSelection')).toMatchObject({
    dataVersion: 3,
    value: { kind: 'preset', presetId: 'jazz' },
  })
  for (const [figure, level] of Object.entries(JAZZ_LEVELS)) {
    expect(byKey.get(`figureLevels.${figure}`), figure).toMatchObject({
      dataVersion: 3,
      value: level,
    })
  }
  expect(byKey.get('controls.tension')).toMatchObject({ dataVersion: 1, value: 'Build' })
  expect(presets).toEqual([])
})

for (const read of ['fail', 'slow'] as const) {
  // @test-link [[rule_presets_read_at_start_up]]
  // @test-link [[rule_presets_in_visits_that_save_nothing]]
  test(`a ${read === 'fail' ? 'failed' : 'slow'} start-up read lists the built-in presets only, starts from the defaults and writes nothing`, async ({
    page,
  }) => {
    await gotoStorageHarness(page)
    await seedLateNightSelected(page)
    const stored = await databaseRecords(page)
    await gotoWith(page, `?storageRead=${read}`)

    expect(await harnessSnapshot(page)).toMatchObject({
      selection: { kind: 'preset', presetId: 'neutral' },
      figureLevels: NEUTRAL_LEVELS,
      presetNames: BUILT_IN_NAMES,
    })
    expect(await loadReport(page)).toEqual({
      outcome: 'started-from-defaults',
      saving: 'off-unreadable',
    })

    await radio(page, 'Musical profile preset', 'Jazz').click()
    await expectSummary(page, 'C Ionian · Jazz · Lift · Shaped')
    await page.waitForTimeout(300)
    expect(await portChanges(page)).toBe(0)
    expect(await databaseRecords(page)).toEqual(stored)
  })
}

// @test-link [[rule_presets_in_visits_that_save_nothing]]
test('an outdated tab lists the player presets it read, keeps their selection, and writes nothing', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedLateNightSelected(page)
  await page.evaluate(() => window.__workspaceHarness.storage.openNewerVersion())
  await reloadHarness(page)
  const stored = await databaseRecords(page)

  expect(await loadReport(page)).toEqual({ outcome: 'saved-data-read', saving: 'off-outdated' })
  expect(await harnessSnapshot(page)).toMatchObject({
    selection: { kind: 'preset', presetId: 'player-1' },
    presetNames: [...BUILT_IN_NAMES, 'Late night', 'Early morning'],
  })

  await selectPreset(page, 'player-2')
  await expectSummary(page, 'C Ionian · Early morning · Lift · Shaped')
  await page.waitForTimeout(300)
  expect(await portChanges(page)).toBe(0)
  expect(await databaseRecords(page)).toEqual(stored)
})

/** From Neutral, the mutation seed that steps the accented passing tone up one level on phrase 3. */
const FIGURE_STEP_ON_PHRASE_3 = 12

// @test-link [[rule_no_save_during_session]]
// @test-link [[rule_saved_setting_is_players_choice]]
// @test-link [[rule_player_presets_saved_on_device]]
test('nothing is written during a session, and a level Vary settings moved is not saved', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page)
  await queueSessionSeeds(page, [await settingsMutationSeed(page, FIGURE_STEP_ON_PHRASE_3)])
  await readyToStart(page)
  await radio(page, 'Vary settings', 'On').click()
  await untilStored(page, { 'sessionOptions.varySettings': true })
  const chosen = await storedSettings(page)
  expect(chosen).toEqual({ 'sessionOptions.varySettings': true })
  const changesAtStart = await portChanges(page)

  await startSession(page)
  const { countInEndsAt } = await sessionTimeline(page)
  const phraseThree = countInEndsAt + 8 * ((4 * 60) / 90)
  await clockTo(page, phraseThree + 0.1)
  const shown = (await sessionState(page)).shownSettings
  expect(shown?.figureLevels).toEqual({ ...NEUTRAL_LEVELS, accentedPassingTone: 'favored' })
  expect(shown?.selection).toEqual({ kind: 'custom', baseId: 'neutral' })
  expect(await portChanges(page)).toBe(changesAtStart)

  await sessionAction(page).click()
  expect((await sessionState(page)).lastEnd?.cause).toBe('stop')
  expect(await harnessSnapshot(page)).toMatchObject({
    selection: { kind: 'preset', presetId: 'neutral' },
    figureLevels: NEUTRAL_LEVELS,
  })
  // Saves land in order: once the theme is stored, everything the end wrote has landed.
  await radio(page, 'Presentation theme', 'Dark').click()
  await untilStored(page, { theme: 'Dark' })
  expect(await storedSettings(page)).toEqual({ ...chosen, theme: 'Dark' })
})
