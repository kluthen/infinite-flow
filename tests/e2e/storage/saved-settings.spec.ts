/**
 * v3.0 chunk 7b, the settings saved on change, on the workspace harness (port 4175) over the
 * browser's real IndexedDB: each test starts from an empty browser context, changes settings
 * through the controls as the player does, waits until the change is stored, reloads, and checks
 * what the page shows, and where useful what is stored. One test per row of the master spec's
 * §4.2 table outside a session: the 14 controls, the preset selection and the figure levels a
 * preset choice sets (a chosen `Sixteenth`
 * stays `Sixteenth` below the tablet-landscape width), the theme, the audio mix, and the three
 * "During a session" options, each back on only if the player turned it on. The session rows
 * (the review's preferences, what a session sets, the hold) are in saved-settings-session.spec.ts.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { harnessSnapshot } from '../release/harness-helpers'
import { KEYS, connectDevice } from '../session/session-midi-helpers'
import { setRisingTempo } from '../session/session-helpers'
import { radio } from '../workspace/helpers'
import { gotoStorageHarness, reloadHarness, storedSettings, untilStored } from './storage-helpers'

/** A landscape phone, below bp-tablet-landscape (64rem = 1024 px). */
const PHONE = { width: 844, height: 390 } as const
/** A desktop window, at and above bp-tablet-landscape. */
const DESKTOP = { width: 1280, height: 900 } as const

/** Intent: whether a radio is the checked option of its group. */
async function expectChecked(page: Page, group: string, option: string): Promise<void> {
  await expect(radio(page, group, option)).toHaveAttribute('aria-checked', 'true')
}

/** Intent: the tempo stepper. */
function tempoStepper(page: Page): Locator {
  return page.getByRole('spinbutton', { name: 'Tempo' })
}

/** Intent: the preset status's text in use. */
function presetStatus(page: Page): Locator {
  return page.locator('.preset-status-text:not(.is-reserve)')
}

/** Intent: the toolbar toggle of one mix channel. */
function mixToggle(page: Page, channel: 'Backing' | 'Click'): Locator {
  return page.locator('.score-toolbar').getByRole('button', { name: channel, exact: true })
}

/** Intent: open the toolbar's Volume popover and wait for it to show. */
async function openVolume(page: Page): Promise<void> {
  await page.locator('.score-toolbar').getByRole('button', { name: 'Volume', exact: true }).click()
  await expect(page.locator('#mix-volume-popover')).toBeVisible()
}

/** Intent: the volume slider labelled `name`. */
function slider(page: Page, name: 'Backing volume' | 'Click volume'): Locator {
  return page.getByRole('slider', { name, exact: true })
}

// @test-link [[rule_settings_saved_on_change]]
// @test-link [[rule_saved_setting_is_players_choice]]
test('the controls and the preset selection the player changed come back after a reload, a picked preset checked', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await page.getByRole('button', { name: 'Increase tempo' }).click()
  await page.getByRole('button', { name: 'Increase tempo' }).click()
  await radio(page, 'Written key', 'D').click()
  await radio(page, 'Collection', 'Dorian').click()
  await radio(page, 'Register', 'Low').click()
  await radio(page, 'Instrument profile', 'E-flat alto saxophone').click()
  await untilStored(page, {
    'controls.tempo': 110,
    'controls.tonalCenter': 'D',
    'controls.collection': 'Dorian',
    'controls.register': 'Low',
    'controls.instrumentProfileId': 'eb-alto',
    presetSelection: { kind: 'custom', baseId: 'neutral' },
  })

  await reloadHarness(page)
  await expect(tempoStepper(page)).toHaveAttribute('aria-valuenow', '110')
  await expectChecked(page, 'Written key', 'D')
  await expectChecked(page, 'Collection', 'Dorian')
  await expectChecked(page, 'Register', 'Low')
  await expectChecked(page, 'Instrument profile', 'E-flat alto saxophone')
  await expect(presetStatus(page)).toHaveText(/^Custom configuration - Neutral grammar retained/)
  await expect(page.locator('.control-summary')).toHaveText(
    'D Dorian · Custom, based on Neutral · Lift · Shaped',
  )
  await expect(radio(page, 'Musical profile preset', 'Neutral')).toHaveAttribute(
    'aria-checked',
    'false',
  )

  // A preset picked, not customized: it comes back checked, with its own values.
  await radio(page, 'Musical profile preset', 'Jazz').click()
  await untilStored(page, {
    presetSelection: { kind: 'preset', presetId: 'jazz' },
    'figureLevels.chromaticApproach': 'asToday',
    'figureLevels.chromaticEnclosure': 'asToday',
    'controls.register': 'Varying',
  })
  await reloadHarness(page)
  await expectChecked(page, 'Musical profile preset', 'Jazz')
  await expect(presetStatus(page)).toHaveText(/^Jazz preset applied/)
  await expect(page.locator('.control-summary')).toHaveText('D Dorian · Jazz · Lift · Shaped')
  await expectChecked(page, 'Register', 'Varying')
  expect((await harnessSnapshot(page)).figureLevels).toMatchObject({
    chromaticApproach: 'asToday',
    chromaticEnclosure: 'asToday',
  })
  await expect(tempoStepper(page)).toHaveAttribute('aria-valuenow', '110')
  await expectChecked(page, 'Written key', 'D')
  await expectChecked(page, 'Collection', 'Dorian')
  await expectChecked(page, 'Instrument profile', 'E-flat alto saxophone')
})

// @test-link [[rule_saved_setting_is_players_choice]]
test('below the tablet-landscape width a chosen Sixteenth reloads as Sixteenth, shown as Eighth until the window widens', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await radio(page, 'Note density', 'Sixteenth').click()
  await untilStored(page, { 'controls.noteDensity': 'Sixteenth' })

  // Narrowed: Sixteenth is unavailable and shows as the checked Eighth, still chosen; a change
  // made there is saved at the narrow width.
  await page.setViewportSize(PHONE)
  await expect(radio(page, 'Note density', 'Sixteenth')).toBeDisabled()
  await expectChecked(page, 'Note density', 'Eighth notes')
  await radio(page, 'Contour', 'Falling').click()
  await untilStored(page, { 'controls.contour': 'Falling' })

  await reloadHarness(page)
  await expect(radio(page, 'Note density', 'Sixteenth')).toBeDisabled()
  await expectChecked(page, 'Note density', 'Eighth notes')
  await expectChecked(page, 'Contour', 'Falling')
  expect((await harnessSnapshot(page)).chosenNoteDensity).toBe('Sixteenth')
  expect((await storedSettings(page))['controls.noteDensity']).toBe('Sixteenth')

  await page.setViewportSize(DESKTOP)
  await expect(radio(page, 'Note density', 'Sixteenth')).toBeEnabled()
  await expectChecked(page, 'Note density', 'Sixteenth')
})

// @test-link [[rule_settings_saved_on_change]]
test('the theme the player chose comes back after a reload', async ({ page }) => {
  await gotoStorageHarness(page)
  await radio(page, 'Presentation theme', 'Dark').click()
  await untilStored(page, { theme: 'Dark' })

  await reloadHarness(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expectChecked(page, 'Presentation theme', 'Dark')
})

// @test-link [[rule_settings_saved_on_change]]
test('the audio mix comes back after a reload: each channel off, each volume at its released level', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await mixToggle(page, 'Backing').click()
  await mixToggle(page, 'Click').click()
  await openVolume(page)
  // Each key press on a focused slider moves it one step and releases it (input, then change).
  await expect(slider(page, 'Backing volume')).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await slider(page, 'Click volume').focus()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await untilStored(page, {
    'mix.backingOn': false,
    'mix.clickOn': false,
    'mix.backingVolume': 0.75,
    'mix.clickVolume': 0.7,
  })

  await reloadHarness(page)
  await expect(mixToggle(page, 'Backing')).toHaveAttribute('aria-pressed', 'false')
  await expect(mixToggle(page, 'Click')).toHaveAttribute('aria-pressed', 'false')
  await openVolume(page)
  await expect(slider(page, 'Backing volume')).toHaveValue('0.75')
  await expect(slider(page, 'Click volume')).toHaveValue('0.7')
})

// @test-link [[rule_settings_saved_on_change]]
// @test-link [[rule_saved_setting_is_players_choice]]
test('Vary settings and Tension across phrases come back on only once the player turned them on, and off once turned off', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await reloadHarness(page)
  await expectChecked(page, 'Vary settings', 'Off')
  await expectChecked(page, 'Tension across phrases', 'Off')

  await radio(page, 'Vary settings', 'On').click()
  await radio(page, 'Tension across phrases', 'On').click()
  await untilStored(page, {
    'sessionOptions.varySettings': true,
    'sessionOptions.tensionAcrossPhrases': true,
  })
  await reloadHarness(page)
  await expectChecked(page, 'Vary settings', 'On')
  await expectChecked(page, 'Tension across phrases', 'On')

  await radio(page, 'Vary settings', 'Off').click()
  await radio(page, 'Tension across phrases', 'Off').click()
  await untilStored(page, {
    'sessionOptions.varySettings': false,
    'sessionOptions.tensionAcrossPhrases': false,
  })
  await reloadHarness(page)
  await expectChecked(page, 'Vary settings', 'Off')
  await expectChecked(page, 'Tension across phrases', 'Off')
})

// @test-link [[rule_settings_saved_on_change]]
// @test-link [[rule_saved_setting_is_players_choice]]
// @test-link [[req_adaptive_tempo]]
test('Rising tempo turned on comes back stored On: Off and disabled with no controller, On once one attaches', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await connectDevice(page, KEYS)
  await setRisingTempo(page, true)
  await untilStored(page, { 'sessionOptions.risingTempo': true })

  await reloadHarness(page)
  await expectChecked(page, 'Rising tempo', 'Off')
  await expect(radio(page, 'Rising tempo', 'On')).toBeDisabled()
  expect((await storedSettings(page))['sessionOptions.risingTempo']).toBe(true)

  await connectDevice(page, KEYS)
  await expect(radio(page, 'Rising tempo', 'On')).toBeEnabled()
  await expectChecked(page, 'Rising tempo', 'On')
})
