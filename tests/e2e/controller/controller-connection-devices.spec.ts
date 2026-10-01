/**
 * v2.0 chunk 13, devices plugged in or unplugged while the connection sheet is open
 * (screens/controller-connection/handoff.md, Device changes while the sheet is open), on the
 * workspace harness with the fake MIDI access: No device found moving on by itself, the picker's
 * list following the inputs (and focus following a removed option), the chosen device unplugged
 * during the check or at Connected with its device-change line, the same device coming back, and
 * another device changing with no visible effect.
 */
import { expect, test } from '@playwright/test'

import {
  CHECK,
  FORM,
  KEYS,
  PAD,
  WIND,
  clickControllerStatus,
  connectThroughSheet,
  deviceOption,
  gotoControllerHarness,
  midiState,
  play,
  plug,
  sheet,
  sheetAction,
  sheetBodyTexts,
  sheetClose,
  statusForm,
  unplug,
  watchPageErrors,
} from './controller-helpers'

const PICKER_LINE = 'Several MIDI devices are plugged in. Choose the one you play.'
const NO_DEVICE_LINE =
  'No MIDI controller is plugged in. Plug one in and switch it on, or continue without one.'
const PROMPT_LINES = [
  'Play this note on your controller.',
  "Playing it here won't start a session.",
]

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: the sheet's title. */
function title(page: Parameters<typeof sheet>[0]) {
  return sheet(page).locator('#sheet-title')
}

/** Intent: reach Connected for `device`, from a sheet at its check's Prompt. */
async function continueToConnected(
  page: Parameters<typeof sheet>[0],
  device: WorkspaceHarnessMidiDevice,
): Promise<void> {
  await play(page, device, CHECK.tenor.concert)
  await sheetAction(page, 'Continue').click()
  await expect(title(page)).toHaveText('Controller connected')
}

// @test-link [[rule_controller_connects_between_sessions]]
test.describe('No device found', () => {
  // @test-link [[rule_controller_connects_between_sessions]]
  test('one device plugged in moves on to its check by itself', async ({ page }) => {
    await gotoControllerHarness(page)
    await clickControllerStatus(page)
    await expect(title(page)).toHaveText('No controller found')

    await plug(page, KEYS)

    await expect(title(page)).toHaveText('Check your controller')
    await expect(sheetClose(page)).toBeFocused()
    await expect.poll(() => midiState(page)).toEqual({ kind: 'connected', device: KEYS })
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
test.describe('Multi-device picker', () => {
  // @test-link [[rule_controller_connects_between_sessions]]
  test('a plugged device is appended; a removed one leaves, focus moving next then previous', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await connectThroughSheet(page, [KEYS, PAD])
    const options = sheet(page).locator('.device-option')
    await expect(deviceOption(page, KEYS.name)).toBeFocused()

    await plug(page, WIND)
    await expect(options).toHaveText([KEYS.name, PAD.name, WIND.name])
    await expect(deviceOption(page, KEYS.name)).toBeFocused()

    // The focused option goes: focus moves to the next one.
    await unplug(page, KEYS)
    await expect(options).toHaveText([PAD.name, WIND.name])
    await expect(deviceOption(page, PAD.name)).toBeFocused()
    await expect(deviceOption(page, PAD.name)).toHaveAttribute('tabindex', '0')

    // The focused option was the last: focus moves to the previous one.
    await page.keyboard.press('ArrowDown')
    await expect(deviceOption(page, WIND.name)).toBeFocused()
    await unplug(page, WIND)
    await expect(options).toHaveText([PAD.name])
    await expect(deviceOption(page, PAD.name)).toBeFocused()
    // One option left: the picker stays; the player chooses it.
    await expect(title(page)).toHaveText('Choose a controller')

    // None left: No device found, focus on its main action.
    await unplug(page, PAD)
    await expect(title(page)).toHaveText('No controller found')
    await expect(sheetAction(page, 'Try again')).toBeFocused()
    expect(await sheetBodyTexts(page)).toEqual([NO_DEVICE_LINE])
  })
})

// @test-link [[rule_same_controller_reattaches]]
test.describe('the chosen device unplugged', () => {
  // @test-link [[rule_same_controller_reattaches]]
  // @test-link [[rule_controller_transposition_check]]
  test('mid-check, others present: the picker with the line; back: the check again', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await connectThroughSheet(page, [KEYS, PAD])
    await deviceOption(page, KEYS.name).click()
    await expect(title(page)).toHaveText('Check your controller')

    await unplug(page, KEYS)

    await expect(title(page)).toHaveText('Choose a controller')
    expect(await sheetBodyTexts(page)).toEqual([`${KEYS.name} was unplugged.`, PICKER_LINE])
    await expect(sheet(page).locator('.sheet-body > .inline-alert.alert-notice')).toHaveCount(1)
    await expect(sheet(page).locator('.device-option')).toHaveText([PAD.name])
    await expect(deviceOption(page, PAD.name)).toBeFocused()
    await expect.poll(() => statusForm(page)).toEqual(FORM.noController)
    // The sheet never switches device by itself.
    expect(await midiState(page)).toEqual({ kind: 'away', device: KEYS })

    await plug(page, KEYS)

    await expect(title(page)).toHaveText('Check your controller')
    await expect.poll(() => sheetBodyTexts(page)).toEqual(PROMPT_LINES)
    await expect(sheetClose(page)).toBeFocused()
    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
  })

  // @test-link [[rule_same_controller_reattaches]]
  test('at Connected, none left: No device found with the line; back: Connected, no check', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await connectThroughSheet(page, [KEYS])
    await continueToConnected(page, KEYS)

    await unplug(page, KEYS)

    await expect(title(page)).toHaveText('No controller found')
    expect(await sheetBodyTexts(page)).toEqual([`${KEYS.name} was unplugged.`, NO_DEVICE_LINE])
    await expect(sheetAction(page, 'Try again')).toBeFocused()
    await expect.poll(() => statusForm(page)).toEqual(FORM.noController)

    await plug(page, KEYS)

    await expect(title(page)).toHaveText('Controller connected')
    await expect.poll(() => sheetBodyTexts(page)).toEqual([`${KEYS.name} is connected.`])
    await expect(sheetAction(page, 'Done')).toBeFocused()
    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
  })

  // @test-link [[rule_same_controller_reattaches]]
  test('at Connected, others present: the picker with the line; back: Connected', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await connectThroughSheet(page, [KEYS, PAD])
    await deviceOption(page, KEYS.name).click()
    await continueToConnected(page, KEYS)

    await unplug(page, KEYS)

    await expect(title(page)).toHaveText('Choose a controller')
    expect(await sheetBodyTexts(page)).toEqual([`${KEYS.name} was unplugged.`, PICKER_LINE])
    // Reached by an unplug, not from Connected: nothing is marked in use.
    await expect(sheet(page).locator('.device-option')).toHaveText([PAD.name])
    await expect(sheet(page).locator('.device-option.is-selected')).toHaveCount(0)

    await plug(page, KEYS)

    await expect(title(page)).toHaveText('Controller connected')
    await expect.poll(() => sheetBodyTexts(page)).toEqual([`${KEYS.name} is connected.`])
  })

  // @test-link [[rule_same_controller_reattaches]]
  test('closing without choosing keeps the selection: plugged back later, it reattaches', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await connectThroughSheet(page, [KEYS, PAD])
    await deviceOption(page, KEYS.name).click()
    await continueToConnected(page, KEYS)
    await unplug(page, KEYS)
    await expect(title(page)).toHaveText('Choose a controller')

    await sheetClose(page).click()
    await expect(sheet(page)).toBeHidden()
    await plug(page, KEYS)

    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
    await expect(sheet(page)).toBeHidden()
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
test.describe('another device changing', () => {
  // @test-link [[rule_controller_transposition_check]]
  test('during the check: no visible change', async ({ page }) => {
    await gotoControllerHarness(page)
    await connectThroughSheet(page, [KEYS])
    await expect(title(page)).toHaveText('Check your controller')
    const before = await sheet(page).innerHTML()

    await plug(page, PAD)
    await expect
      .poll(() => page.evaluate(() => window.__workspaceHarness.midi.devices().length))
      .toBe(2)
    await unplug(page, PAD)
    await expect
      .poll(() => page.evaluate(() => window.__workspaceHarness.midi.devices().length))
      .toBe(1)

    expect(await sheet(page).innerHTML()).toBe(before)
    await expect(sheetClose(page)).toBeFocused()
    // The check still answers the chosen device.
    await play(page, KEYS, CHECK.tenor.concert)
    await expect(sheetAction(page, 'Continue')).toBeFocused()
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  test('at Connected: only Choose a different device appears', async ({ page }) => {
    await gotoControllerHarness(page)
    await connectThroughSheet(page, [KEYS])
    await continueToConnected(page, KEYS)
    const bodyBefore = await sheetBodyTexts(page)

    await plug(page, PAD)
    await expect(sheetAction(page, 'Choose a different device')).toBeVisible()
    await unplug(page, PAD)

    // Seen once, it stays; the body and title never changed.
    await expect(sheetAction(page, 'Choose a different device')).toBeVisible()
    expect(await sheetBodyTexts(page)).toEqual(bodyBefore)
    await expect(title(page)).toHaveText('Controller connected')
    await expect(sheetAction(page, 'Done')).toBeFocused()
  })
})
