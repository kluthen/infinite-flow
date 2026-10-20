/**
 * v3.1 chunk 12, presets replace the musical profile, on the workspace harness (port 4175).
 * Choosing a preset sets its ten controls and seven figure levels and nothing else: the tempo, the
 * instrument and the phrase on screen stay, and a preset that restricts the mode keeps the key and
 * moves the mode only when it must. Editing a setting a preset holds, or leaving the restriction
 * in force, makes the selection Custom, and `control-summary` names its base; the tempo, the
 * instrument and a key or mode inside the restriction never do. The selection and the levels are
 * saved on change (spec D377): Jazz, Custom based on Jazz and Reel come back after a reload with
 * their levels, and a saved Jazz whose controls are not Jazz's loads as Custom based on Jazz with
 * Jazz's levels.
 *
 * Every preset is chosen in the preset box, as the player does, and the box shows the selection:
 * the preset's name, or "Custom, based on {name}".
 */
import { expect, test, type Page } from '@playwright/test'

import { gotoWorkspaceHarness, harnessSnapshot, queueSeeds } from '../release/harness-helpers'
import {
  gotoStorageHarness,
  reloadHarness,
  seedSettings,
  untilStored,
} from '../storage/storage-helpers'
import { choosePreset, expectPresetShown, generateAndAwaitReady, radio } from './helpers'

/** The ten preset-held controls as the controls show them: each radiogroup's checked label. */
type ShownPresetControls = Readonly<Record<string, string>>

/** Neutral's ten controls, as shown. */
const NEUTRAL_CONTROLS: ShownPresetControls = {
  'Harmonic motion': 'Gentle diatonic',
  Tension: 'Lift',
  'Note density': 'Quarter notes',
  'Rhythmic variety': 'Slightly varied',
  Syncopation: 'Straight',
  'Silence density': 'Sparse',
  Contour: 'Arch',
  Register: 'Middle',
  Leapiness: 'Shaped',
  'Arpeggio chaos': 'Varied',
}

/** Jazz's ten controls, as shown. */
const JAZZ_CONTROLS: ShownPresetControls = {
  'Harmonic motion': 'Gentle diatonic',
  Tension: 'Lift',
  'Note density': 'Eighth notes',
  'Rhythmic variety': 'Slightly varied',
  Syncopation: 'Occasional offbeats',
  'Silence density': 'Conversational space',
  Contour: 'Wandering',
  Register: 'Varying',
  Leapiness: 'Shaped',
  'Arpeggio chaos': 'Varied',
}

/** Reel's ten controls, as shown. */
const REEL_CONTROLS: ShownPresetControls = {
  'Harmonic motion': 'Gentle diatonic',
  Tension: 'Settled',
  'Note density': 'Eighth notes',
  'Rhythmic variety': 'Strict',
  Syncopation: 'Straight',
  'Silence density': 'Sparse',
  Contour: 'Arch',
  Register: 'Middle',
  Leapiness: 'Shaped',
  'Arpeggio chaos': 'Varied',
}

/** Neutral's seven figure levels. */
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

/** Reel's seven figure levels. */
const REEL_LEVELS = {
  passingTone: 'favored',
  accentedPassingTone: 'asToday',
  neighborTone: 'favored',
  appoggiatura: 'off',
  diatonicEnclosure: 'off',
  chromaticApproach: 'off',
  chromaticEnclosure: 'off',
} as const

/** Intent: one radio is the checked option of its group. */
async function expectChecked(page: Page, group: string, option: string): Promise<void> {
  await expect(radio(page, group, option)).toHaveAttribute('aria-checked', 'true')
}

/** Intent: every control of `controls` shows its value checked. */
async function expectControls(page: Page, controls: ShownPresetControls): Promise<void> {
  for (const [group, option] of Object.entries(controls)) await expectChecked(page, group, option)
}

/** Intent: the control summary's text. */
async function expectSummary(page: Page, text: string): Promise<void> {
  await expect(page.locator('.control-summary')).toHaveText(text)
}

/** Intent: the session's selection and levels now, as the harness snapshot reads them. */
async function chosenPreset(page: Page) {
  const { selection, figureLevels } = await harnessSnapshot(page)
  return { selection, figureLevels }
}

/** Intent: the tempo stepper's value. */
async function expectTempo(page: Page, bpm: number): Promise<void> {
  await expect(page.getByRole('spinbutton', { name: 'Tempo' })).toHaveAttribute(
    'aria-valuenow',
    String(bpm),
  )
}

// @test-link [[rule_choosing_preset_sets_its_settings]]
// @test-link [[rule_choosing_preset_keeps_allowed_key_and_mode]]
test('choosing Jazz then Neutral sets the ten controls and the seven levels, and the key, mode, tempo, instrument and phrase on screen stay', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await page.getByRole('button', { name: 'Increase tempo' }).click()
  await page.getByRole('button', { name: 'Increase tempo' }).click()
  await radio(page, 'Instrument profile', 'E-flat alto saxophone').click()
  await radio(page, 'Written key', 'D').click()
  await radio(page, 'Collection', 'Dorian').click()
  await queueSeeds(page, [41])
  await generateAndAwaitReady(page)
  const shown = await harnessSnapshot(page)
  expect(shown.seed).toBe(41)

  // Moved away from both presets first, so choosing one has every control to set.
  await radio(page, 'Harmonic motion', 'Active diatonic').click()
  await radio(page, 'Leapiness', 'Angular').click()
  await radio(page, 'Arpeggio chaos', 'Chaotic').click()
  await radio(page, 'Silence density', 'Breath-heavy').click()

  await choosePreset(page, 'Jazz')
  await expectControls(page, JAZZ_CONTROLS)
  await expectPresetShown(page, 'Jazz')
  expect(await chosenPreset(page)).toEqual({
    selection: { kind: 'preset', presetId: 'jazz' },
    figureLevels: JAZZ_LEVELS,
  })
  await expectSummary(page, 'D Dorian · Jazz · Lift · Shaped')

  await radio(page, 'Tension', 'Build').click()
  await expectSummary(page, 'D Dorian · Custom, based on Jazz · Build · Shaped')
  await choosePreset(page, 'Neutral')
  await expectControls(page, NEUTRAL_CONTROLS)
  await expectPresetShown(page, 'Neutral')
  expect(await chosenPreset(page)).toEqual({
    selection: { kind: 'preset', presetId: 'neutral' },
    figureLevels: NEUTRAL_LEVELS,
  })
  await expectSummary(page, 'D Dorian · Neutral · Lift · Shaped')

  await expectChecked(page, 'Written key', 'D')
  await expectChecked(page, 'Collection', 'Dorian')
  await expectTempo(page, 110)
  await expectChecked(page, 'Instrument profile', 'E-flat alto saxophone')
  // The phrase on screen stays: no new generation replaced it.
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/)
  const after = await harnessSnapshot(page)
  expect(after.instrumentProfileId).toBe('eb-alto')
  expect(after.requestId).toBe(shown.requestId)
  expect(after.seed).toBe(shown.seed)
  expect(after.timeline).toBe(shown.timeline)
})

// @test-link [[rule_choosing_preset_keeps_allowed_key_and_mode]]
// @test-link [[rule_choosing_preset_sets_its_settings]]
test('choosing Reel from A Aeolian lands on A Mixolydian, and from A Dorian moves neither the key nor the mode', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await radio(page, 'Written key', 'A').click()
  await radio(page, 'Collection', 'Aeolian').click()

  await choosePreset(page, 'Reel')
  await expectChecked(page, 'Written key', 'A')
  await expectChecked(page, 'Collection', 'Mixolydian')
  await expectControls(page, REEL_CONTROLS)
  await expectPresetShown(page, 'Reel')
  expect(await chosenPreset(page)).toEqual({
    selection: { kind: 'preset', presetId: 'reel' },
    figureLevels: REEL_LEVELS,
  })
  await expectSummary(page, 'A Mixolydian · Reel · Settled · Shaped')

  await choosePreset(page, 'Neutral')
  await radio(page, 'Collection', 'Dorian').click()
  await expectSummary(page, 'A Dorian · Neutral · Lift · Shaped')
  await choosePreset(page, 'Reel')
  await expectChecked(page, 'Written key', 'A')
  await expectChecked(page, 'Collection', 'Dorian')
  await expectSummary(page, 'A Dorian · Reel · Settled · Shaped')
})

// @test-link [[rule_custom_selection]]
// @test-link [[rule_custom_names_its_base]]
test('editing a control Jazz holds makes Custom based on Jazz, and changing it back stays Custom', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await choosePreset(page, 'Jazz')
  await expectSummary(page, 'C Ionian · Jazz · Lift · Shaped')

  await radio(page, 'Contour', 'Falling').click()
  await expectSummary(page, 'C Ionian · Custom, based on Jazz · Lift · Shaped')
  await expectPresetShown(page, 'Custom, based on Jazz')
  expect(await chosenPreset(page)).toEqual({
    selection: { kind: 'custom', baseId: 'jazz' },
    figureLevels: JAZZ_LEVELS,
  })

  // Values are not compared: Jazz's own contour again is still Custom.
  await radio(page, 'Contour', 'Wandering').click()
  await expectControls(page, JAZZ_CONTROLS)
  await expectSummary(page, 'C Ionian · Custom, based on Jazz · Lift · Shaped')
  await expectPresetShown(page, 'Custom, based on Jazz')
  expect((await harnessSnapshot(page)).selection).toEqual({ kind: 'custom', baseId: 'jazz' })

  // Only choosing a preset leaves Custom.
  await choosePreset(page, 'Jazz')
  await expectSummary(page, 'C Ionian · Jazz · Lift · Shaped')
  expect((await harnessSnapshot(page)).selection).toEqual({ kind: 'preset', presetId: 'jazz' })
})

// @test-link [[rule_restriction_in_force]]
// @test-link [[rule_custom_selection]]
// @test-link [[rule_custom_names_its_base]]
test('under Reel a key, a mode inside its restriction, the tempo and the instrument keep Reel, and Ionian makes Custom based on Reel', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await choosePreset(page, 'Reel')
  await expectSummary(page, 'C Mixolydian · Reel · Settled · Shaped')

  for (const key of ['G', 'F-sharp/G-flat', 'D']) {
    await radio(page, 'Written key', key).click()
    await expectChecked(page, 'Written key', key)
  }
  await radio(page, 'Collection', 'Dorian').click()
  await page.getByRole('button', { name: 'Increase tempo' }).click()
  await expectTempo(page, 100)
  await radio(page, 'Instrument profile', 'E-flat alto saxophone').click()
  await expectChecked(page, 'Instrument profile', 'E-flat alto saxophone')
  await expectSummary(page, 'D Dorian · Reel · Settled · Shaped')
  expect((await harnessSnapshot(page)).selection).toEqual({ kind: 'preset', presetId: 'reel' })

  // Opting out of the restriction: nothing else moves.
  await radio(page, 'Collection', 'Ionian').click()
  await expectSummary(page, 'D Ionian · Custom, based on Reel · Settled · Shaped')
  await expectControls(page, REEL_CONTROLS)
  await expectPresetShown(page, 'Custom, based on Reel')
  expect(await chosenPreset(page)).toEqual({
    selection: { kind: 'custom', baseId: 'reel' },
    figureLevels: REEL_LEVELS,
  })
  await expectTempo(page, 100)
})

// @test-link [[rule_player_presets_saved_on_device]]
// @test-link [[rule_settings_saved_on_change]]
test('Jazz and Custom based on Jazz come back after a reload with Jazz levels', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await choosePreset(page, 'Jazz')
  await untilStored(page, {
    presetSelection: { kind: 'preset', presetId: 'jazz' },
    'figureLevels.chromaticApproach': 'asToday',
    'figureLevels.chromaticEnclosure': 'asToday',
  })
  await reloadHarness(page)
  await expectPresetShown(page, 'Jazz')
  await expectControls(page, JAZZ_CONTROLS)
  await expectSummary(page, 'C Ionian · Jazz · Lift · Shaped')
  expect(await chosenPreset(page)).toEqual({
    selection: { kind: 'preset', presetId: 'jazz' },
    figureLevels: JAZZ_LEVELS,
  })

  await radio(page, 'Contour', 'Falling').click()
  await untilStored(page, {
    presetSelection: { kind: 'custom', baseId: 'jazz' },
    'controls.contour': 'Falling',
  })
  await reloadHarness(page)
  await expectPresetShown(page, 'Custom, based on Jazz')
  await expectChecked(page, 'Contour', 'Falling')
  await expectSummary(page, 'C Ionian · Custom, based on Jazz · Lift · Shaped')
  expect(await chosenPreset(page)).toEqual({
    selection: { kind: 'custom', baseId: 'jazz' },
    figureLevels: JAZZ_LEVELS,
  })
})

// @test-link [[rule_preset_load_values_win]]
test('a Jazz saved with Jazz controls loads as Jazz, and one saved with Tension at Build loads as Custom based on Jazz with Jazz levels', async ({
  page,
}) => {
  /** Jazz selected with its levels and its controls as stored, those that differ from the defaults. */
  const jazzStored = {
    presetSelection: { kind: 'preset', presetId: 'jazz' },
    'figureLevels.chromaticApproach': 'asToday',
    'figureLevels.chromaticEnclosure': 'asToday',
    'controls.noteDensity': 'Eighth',
    'controls.syncopation': 'Occasional offbeats',
    'controls.silenceDensity': 'Conversational',
    'controls.contour': 'Wandering',
    'controls.register': 'Varying',
  }
  await gotoStorageHarness(page)
  await seedSettings(page, jazzStored)
  await reloadHarness(page)
  await expectPresetShown(page, 'Jazz')
  await expectSummary(page, 'C Ionian · Jazz · Lift · Shaped')
  expect(await chosenPreset(page)).toEqual({
    selection: { kind: 'preset', presetId: 'jazz' },
    figureLevels: JAZZ_LEVELS,
  })

  await seedSettings(page, { ...jazzStored, 'controls.tension': 'Build' })
  await reloadHarness(page)
  await expectControls(page, { ...JAZZ_CONTROLS, Tension: 'Build' })
  await expectPresetShown(page, 'Custom, based on Jazz')
  await expectSummary(page, 'C Ionian · Custom, based on Jazz · Build · Shaped')
  expect(await chosenPreset(page)).toEqual({
    selection: { kind: 'custom', baseId: 'jazz' },
    figureLevels: JAZZ_LEVELS,
  })
})

// @test-link [[rule_player_presets_saved_on_device]]
// @test-link [[rule_settings_saved_on_change]]
test('choosing Reel saves it selected: after a reload Reel is selected, with its controls and levels', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await choosePreset(page, 'Jazz')
  await untilStored(page, { presetSelection: { kind: 'preset', presetId: 'jazz' } })

  await choosePreset(page, 'Reel')
  await untilStored(page, {
    'controls.collection': 'Mixolydian',
    'controls.tension': 'Settled',
    'controls.rhythmicVariety': 'Strict',
    'controls.register': 'Middle',
    'figureLevels.passingTone': 'favored',
    'figureLevels.neighborTone': 'favored',
    'figureLevels.chromaticApproach': 'off',
    'figureLevels.chromaticEnclosure': 'off',
    presetSelection: { kind: 'preset', presetId: 'reel' },
  })

  await reloadHarness(page)
  await expectControls(page, REEL_CONTROLS)
  await expectChecked(page, 'Collection', 'Mixolydian')
  await expectPresetShown(page, 'Reel')
  await expectSummary(page, 'C Mixolydian · Reel · Settled · Shaped')
  expect(await chosenPreset(page)).toEqual({
    selection: { kind: 'preset', presetId: 'reel' },
    figureLevels: REEL_LEVELS,
  })
})
