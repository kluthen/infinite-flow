/**
 * v3.3 chunk 17, session mode's Seventh chords level on the device, on the workspace harness (port
 * 4175: fake audio clock, real generations) over the browser's real IndexedDB; each test starts
 * from an empty browser context. The level has no control on screen yet (chunk 19): a spec sets
 * it through the harness's routing-point seam (`setChordFamilyLevel`, the action its control will
 * call) or by choosing a preset, and reads it back from the request the next phrase is generated
 * from (`generationRequests`), the stored `chordFamilies.seventh-chords` record and the preset
 * box:
 *
 * - the level comes back after a reload at each of its four values;
 * - a player preset holding Mostly loads selected with it; a saved level differing from the
 *   selected built-in's loads as "Custom, based on {name}";
 * - choosing a preset that differs from the current settings only in its level saves the level
 *   with the selection, both to a player preset at Mostly and back to a built-in at Off;
 * - Delete everything leaves the level at Off; an outdated tab and a visit whose read failed
 *   write no level;
 * - a session played at a level above Off, saving on, is kept with no page error.
 */
import { expect, test, type Page } from '@playwright/test'

import { generateShownPhrase } from '../audio/audio-harness-helpers'
import { watchPageErrors } from '../controller/controller-helpers'
import { playSession, portChanges, untilKept } from '../review/review-tools-helpers'
import { expectPresetShown, choosePreset } from '../workspace/helpers'
import { storedPhrases, storedSession } from './kept-session-v1-helpers'
import {
  databaseRecords,
  gotoStorageHarness,
  reloadHarness,
  seedSettings,
  storedSettings,
  untilStored,
} from './storage-helpers'
import { askConfirmation, confirmingAction, openYourData } from './your-data-helpers'

/** The Seventh chords level's settings record key. */
const LEVEL_KEY = 'chordFamilies.seventh-chords'

/** The level's internal ids, Off first; the interface calls `stronglyFavored` Mostly. */
const LEVELS = ['off', 'sometimes', 'favored', 'stronglyFavored'] as const

/** How long a save takes at most to land on this harness. */
const SETTLE_MS = 300

/** A player preset holding Neutral's values with the Seventh chords level at Mostly, anywhere. */
const NEUTRAL_SEVENTHS: WorkspaceHarnessPresetInput = {
  id: 'player-1',
  name: 'Neutral sevenths',
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
  levels: {
    passingTone: 'asToday',
    accentedPassingTone: 'asToday',
    neighborTone: 'asToday',
    appoggiatura: 'off',
    diatonicEnclosure: 'off',
    chromaticApproach: 'off',
    chromaticEnclosure: 'off',
  },
  chordFamilies: { 'seventh-chords': 'stronglyFavored' },
  restriction: { keys: 'any', modes: 'any' },
  kind: 'player',
}

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: set the level through the routing point, as its control will; whether it applied. */
function setLevel(page: Page, level: string): Promise<boolean> {
  return page.evaluate(
    (chosen) => window.__workspaceHarness.setChordFamilyLevel('seventh-chords', chosen),
    level,
  )
}

/** Intent: generate a seeded phrase and give the level its request was built with. */
async function generatedLevel(page: Page): Promise<string | undefined> {
  await generateShownPhrase(page, 7)
  const requests = await page.evaluate(() => window.__workspaceHarness.generationRequests())
  return requests.at(-1)?.chordFamilies['seventh-chords']
}

/** Intent: seed the player preset `NEUTRAL_SEVENTHS` through the harness's storage seam. */
function seedNeutralSevenths(page: Page): Promise<void> {
  return page.evaluate(
    (preset) => window.__workspaceHarness.storage.seedPresets([preset]),
    NEUTRAL_SEVENTHS,
  )
}

/** Intent: the stored level record's value, or undefined with none, read straight from IndexedDB. */
async function storedLevel(page: Page): Promise<unknown> {
  const { settings = [] } = await databaseRecords(page)
  const record = settings.find((stored) => (stored as { key?: unknown }).key === LEVEL_KEY)
  return (record as { value?: unknown } | undefined)?.value
}

// @test-link [[req_seventh_chords_level]]
// @test-link [[rule_settings_saved_on_change]]
test('the level comes back after a reload at each of its four values', async ({ page }) => {
  test.setTimeout(120_000)
  await gotoStorageHarness(page)
  expect(await generatedLevel(page)).toBe('off')

  for (const level of [...LEVELS.slice(1), 'off'] as const) {
    expect(await setLevel(page, level)).toBe(true)
    await untilStored(page, { [LEVEL_KEY]: level })
    await reloadHarness(page)

    expect(await generatedLevel(page), level).toBe(level)
    expect(
      await page.evaluate(() => window.__workspaceHarness.storage.settingsNotReadBack()),
    ).toEqual([])
  }
  const records = await page.evaluate(() => window.__workspaceHarness.storage.records('settings'))
  expect(records.find((record) => (record as { key: string }).key === LEVEL_KEY)).toMatchObject({
    dataVersion: 1,
    value: 'off',
  })
})

// @test-link [[req_seventh_chords_level]]
// @test-link [[rule_preset_load_values_win]]
test('a player preset holding Mostly loads selected with it', async ({ page }) => {
  await gotoStorageHarness(page)
  await seedNeutralSevenths(page)
  await seedSettings(page, {
    [LEVEL_KEY]: 'stronglyFavored',
    presetSelection: { kind: 'preset', presetId: 'player-1' },
  })
  await reloadHarness(page)

  await expectPresetShown(page, 'Neutral sevenths')
  expect(await generatedLevel(page)).toBe('stronglyFavored')
})

// @test-link [[rule_preset_load_values_win]]
test("a saved level differing from the selected built-in's loads as Custom, based on it, the level kept", async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedSettings(page, {
    [LEVEL_KEY]: 'favored',
    presetSelection: { kind: 'preset', presetId: 'neutral' },
  })
  await reloadHarness(page)

  await expectPresetShown(page, 'Custom, based on Neutral')
  expect(await generatedLevel(page)).toBe('favored')
})

// @test-link [[rule_choosing_preset_sets_its_settings]]
// @test-link [[rule_settings_saved_on_change]]
test('choosing a preset that differs only in its level saves the level with the selection, there and back', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoStorageHarness(page)
  await seedNeutralSevenths(page)
  await reloadHarness(page)
  await expectPresetShown(page, 'Neutral')

  await choosePreset(page, 'Neutral sevenths')
  const toPlayer = {
    [LEVEL_KEY]: 'stronglyFavored',
    presetSelection: { kind: 'preset', presetId: 'player-1' },
  }
  await untilStored(page, toPlayer)
  expect(await storedSettings(page)).toEqual(toPlayer)
  await reloadHarness(page)
  await expectPresetShown(page, 'Neutral sevenths')
  expect(await generatedLevel(page)).toBe('stronglyFavored')

  await choosePreset(page, 'Neutral')
  const toBuiltIn = {
    [LEVEL_KEY]: 'off',
    presetSelection: { kind: 'preset', presetId: 'neutral' },
  }
  await untilStored(page, toBuiltIn)
  expect(await storedSettings(page)).toEqual(toBuiltIn)
  await reloadHarness(page)
  await expectPresetShown(page, 'Neutral')
  expect(await generatedLevel(page)).toBe('off')
})

// @test-link [[rule_delete_everything]]
// @test-link [[req_seventh_chords_level]]
test('Delete everything leaves the level at Off', async ({ page }) => {
  await gotoStorageHarness(page)
  expect(await setLevel(page, 'favored')).toBe(true)
  await untilStored(page, { [LEVEL_KEY]: 'favored' })

  await openYourData(page)
  await askConfirmation(page, 'Delete everything', 'Delete everything?')
  await Promise.all([page.waitForEvent('load'), confirmingAction(page).click()])
  await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)

  expect((await databaseRecords(page)).settings ?? []).toEqual([])
  expect(await generatedLevel(page)).toBe('off')
})

// @test-link [[rule_outdated_tab_reads_what_it_can]]
test('an outdated tab writes no level', async ({ page }) => {
  await gotoStorageHarness(page)
  await page.evaluate(() => window.__workspaceHarness.storage.openNewerVersion())
  expect(await page.evaluate(() => window.__workspaceHarness.storage.savingState())).toBe(
    'off-outdated',
  )
  const changes = await portChanges(page)

  expect(await setLevel(page, 'favored')).toBe(true)
  await page.waitForTimeout(SETTLE_MS)

  expect(await portChanges(page)).toBe(changes)
  expect(await storedLevel(page)).toBeUndefined()
})

// @test-link [[rule_saved_settings_load_tolerantly]]
test('a visit whose read failed starts at Off and writes no level', async ({ page }) => {
  await gotoStorageHarness(page)
  await seedSettings(page, { [LEVEL_KEY]: 'sometimes' })
  await gotoStorageHarness(page, '?storageRead=fail')
  expect(await page.evaluate(() => window.__workspaceHarness.storage.savingState())).toBe(
    'off-unreadable',
  )

  expect(await generatedLevel(page)).toBe('off')
  expect(await setLevel(page, 'stronglyFavored')).toBe(true)
  await page.waitForTimeout(SETTLE_MS)

  expect(await portChanges(page)).toBe(0)
  expect(await storedLevel(page)).toBe('sometimes')
})

// @test-link [[req_seventh_chords_level]]
// @test-link [[rule_no_save_during_session]]
test('a session played at Mostly, saving on, is kept at Mostly with no page error', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await gotoStorageHarness(page)
  expect(await setLevel(page, 'stronglyFavored')).toBe(true)
  await untilStored(page, { [LEVEL_KEY]: 'stronglyFavored' })

  await playSession(page)
  const [key] = await untilKept(page, 1)
  if (key === undefined) throw new Error('the session was not kept')

  expect(await page.evaluate(() => window.__workspaceHarness.storage.savingState())).toBe('on')
  const { body } = await storedSession(page, key)
  expect(body.dataVersion).toBe(5)
  const phrases = storedPhrases(body)
  expect(phrases.length).toBeGreaterThan(0)
  for (const { intent } of phrases) {
    expect(intent.chordFamilies).toEqual({ 'seventh-chords': 'stronglyFavored' })
  }
})
