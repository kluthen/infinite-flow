/**
 * v3.0 chunk 7a, the saved settings loaded before the first draw, on the workspace harness (port
 * 4175) over the browser's real IndexedDB: settings seeded through the harness's storage seam are
 * read by the app's own loader on the next load, and the workspace is first drawn with them;
 * until the load ends the page shows only its background, and no control changes value after the
 * first draw. An invalid saved value loads as its default, silently. A saved `Rising tempo` `On`
 * shows `Off` and disabled while no controller is attached, and `On` once one is.
 */
import { expect, test, type Page } from '@playwright/test'

import { radio } from '../workspace/helpers'
import { KEYS, connectDevice } from '../session/session-midi-helpers'
import {
  firstDraw,
  gotoStorageHarness,
  harnessReady,
  recordFirstDraw,
  reloadHarness,
  seedSettings,
  shownControls,
} from './storage-helpers'
import { WORKSPACE_HARNESS_URL } from '../release/harness-helpers'

/** A saved value for one setting of each kind, each differing from its default. */
const SAVED = {
  'controls.tempo': 150,
  'controls.tonalCenter': 'F',
  'controls.collection': 'Dorian',
  'controls.tension': 'Edge',
  'controls.register': 'Low',
  'controls.contour': 'Falling',
  'controls.leapiness': 'Leaping',
  'controls.instrumentProfileId': 'eb-alto',
  'figureLevels.chromaticApproach': 'asToday',
  'figureLevels.chromaticEnclosure': 'asToday',
  presetSelection: { kind: 'custom', baseId: 'jazz' },
  theme: 'Dark',
  'mix.clickOn': false,
  'mix.clickVolume': 0.5,
  'mix.backingOn': false,
  'mix.backingVolume': 0.3,
  'sessionOptions.varySettings': true,
  'sessionOptions.tensionAcrossPhrases': true,
  'sessionOptions.risingTempo': true,
} as const

/** Intent: the toggle button of one mix channel. */
function mixToggle(page: Page, channel: 'Backing' | 'Click') {
  return page.locator('.mix-controls').getByRole('button', { name: channel, exact: false })
}

/** Intent: the shown option of a "During a session" option. */
function sessionOption(page: Page, option: string, label: 'Off' | 'On') {
  return radio(page, option, label)
}

/** Intent: the load's outcome and saving state, as the harness reports them. */
function loadReport(page: Page) {
  return page.evaluate(() => ({
    outcome: window.__workspaceHarness.storage.loadOutcome(),
    saving: window.__workspaceHarness.storage.savingState(),
  }))
}

// @test-link [[rule_first_phrase_waits_for_saved_settings]]
// @test-link [[rule_settings_saved_on_change]]
test('every seeded setting loads, the workspace is first drawn with it, and no control changes value after', async ({
  page,
}) => {
  await recordFirstDraw(page)
  await gotoStorageHarness(page)
  await seedSettings(page, SAVED)
  await reloadHarness(page)

  const drawn = await firstDraw(page)
  expect(drawn.theme).toBe('dark')
  expect(drawn.spinbuttons).toContain('Tempo: 150')
  for (const line of [
    'Written key: F ',
    'Collection: Dorian ',
    'Tension: Edge ',
    'Register: Low ',
    'Contour: Falling ',
    'Leapiness: Leaping ',
    'Instrument profile: E-flat alto saxophone ',
    'Vary settings: On ',
    'Tension across phrases: On ',
    'Rising tempo: Off (disabled: On)',
  ]) {
    expect(drawn.radiogroups.some((group) => group.startsWith(line))).toBe(true)
  }
  expect(drawn.toggles).toEqual(expect.arrayContaining(['Backing off: false', 'Click off: false']))
  await expect(page.locator('.control-summary')).toContainText('Custom, based on Jazz')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.getByRole('button', { name: 'Volume' }).first().click()
  await expect(page.getByLabel('Click volume')).toHaveValue('0.5')
  await expect(page.getByLabel('Backing volume')).toHaveValue('0.3')
  await page.getByRole('button', { name: 'Volume' }).first().click()

  // The controller, its own chunk, has loaded since the first draw; nothing moved.
  await page.waitForTimeout(500)
  expect(await shownControls(page)).toEqual(drawn)
  expect(await loadReport(page)).toEqual({ outcome: 'saved-data-read', saving: 'on' })
})

// @test-link [[rule_first_phrase_waits_for_saved_settings]]
test('until the load ends the page shows only its background, then the workspace in its saved theme', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedSettings(page, { theme: 'Dark' })

  await page.goto(`${WORKSPACE_HARNESS_URL}?storageLoad=held`)
  await page.waitForFunction(() => window.__workspaceHarnessHeldLoad !== undefined)
  expect(await page.locator('#app').evaluate((app) => app.childElementCount)).toBe(0)
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/)
  const background = await page
    .locator('body')
    .evaluate((body) => getComputedStyle(body).backgroundColor)
  expect(background).not.toBe('rgba(0, 0, 0, 0)')

  await page.evaluate(() => window.__workspaceHarnessHeldLoad?.release())
  await harnessReady(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(radio(page, 'Presentation theme', 'Dark')).toHaveAttribute('aria-checked', 'true')
})

// @test-link [[rule_saved_settings_load_tolerantly]]
test('a seeded invalid value loads as its default, silently, and the other seeded values load', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  const defaults = await shownControls(page)
  await seedSettings(page, {
    theme: 'Sepia',
    'controls.tempo': 999,
    'mix.clickOn': 'yes',
    'controls.register': 'Low',
    'controls.collection': 'Dorian',
  })
  await reloadHarness(page)

  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/)
  await expect(radio(page, 'Presentation theme', 'System')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('spinbutton', { name: 'Tempo' })).toHaveAttribute(
    'aria-valuenow',
    '90',
  )
  await expect(mixToggle(page, 'Click')).toHaveAttribute('aria-pressed', 'true')
  await expect(radio(page, 'Register', 'Low')).toHaveAttribute('aria-checked', 'true')
  await expect(radio(page, 'Collection', 'Dorian')).toHaveAttribute('aria-checked', 'true')
  const shown = await shownControls(page)
  expect(shown.spinbuttons).toEqual(defaults.spinbuttons)
  expect(shown.toggles).toEqual(defaults.toggles)
  // Silently: no alert, no notice.
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.locator('.inline-alert')).toHaveCount(0)
  expect(await loadReport(page)).toEqual({ outcome: 'saved-data-read', saving: 'on' })
})

// @test-link [[rule_saved_setting_is_players_choice]]
// @test-link [[req_adaptive_tempo]]
test('a seeded Rising tempo On shows Off and disabled with no controller, and On once one attaches; Vary settings and Tension across phrases load on', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedSettings(page, {
    'sessionOptions.risingTempo': true,
    'sessionOptions.varySettings': true,
    'sessionOptions.tensionAcrossPhrases': true,
  })
  await reloadHarness(page)

  await expect(sessionOption(page, 'Rising tempo', 'Off')).toHaveAttribute('aria-checked', 'true')
  await expect(sessionOption(page, 'Rising tempo', 'On')).toBeDisabled()
  await expect(sessionOption(page, 'Vary settings', 'On')).toHaveAttribute('aria-checked', 'true')
  await expect(sessionOption(page, 'Tension across phrases', 'On')).toHaveAttribute(
    'aria-checked',
    'true',
  )

  await connectDevice(page, KEYS)
  await expect(sessionOption(page, 'Rising tempo', 'On')).toBeEnabled()
  await expect(sessionOption(page, 'Rising tempo', 'On')).toHaveAttribute('aria-checked', 'true')
})
