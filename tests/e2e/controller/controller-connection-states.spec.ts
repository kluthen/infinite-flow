/**
 * v2.0 chunk 13, the connection sheet's states (screens/controller-connection/handoff.md, States
 * and Focus Management), each reached through the header's `controller-status` click on the
 * workspace harness with the fake MIDI access: Requesting access in both sub-states, Unsupported
 * browser, Permission denied (and Check again), No device found (and Try again), the device
 * picker and its roving keys, and the focus trap. The `Connect controller` click also unlocks the
 * audio. The check and Connected are in controller-connection-check.spec.ts.
 */
import { expect, test } from '@playwright/test'

import {
  CONTINUE_WITHOUT,
  FORM,
  KEYS,
  PAD,
  WIND,
  audioUnlocked,
  clickControllerStatus,
  connectThroughSheet,
  deviceOption,
  expectSheet,
  gotoControllerHarness,
  midiState,
  plug,
  requestCount,
  sheet,
  sheetAction,
  sheetClose,
  statusForm,
  watchPageErrors,
} from './controller-helpers'

const CHECK_PROMPT = {
  title: 'Check your controller',
  body: ['Play this note on your controller.', "Playing it here won't start a session."],
  actions: [],
} as const

const NO_DEVICE = {
  title: 'No controller found',
  body: [
    'No MIDI controller is plugged in. Plug one in and switch it on, or continue without one.',
  ],
  actions: [
    { label: 'Try again', primary: true },
    { label: CONTINUE_WITHOUT, primary: false },
  ],
} as const

const PICKER = {
  title: 'Choose a controller',
  body: ['Several MIDI devices are plugged in. Choose the one you play.'],
  actions: [{ label: CONTINUE_WITHOUT, primary: false }],
} as const

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

// @test-link [[rule_controller_connects_between_sessions]]
test.describe('Requesting access', () => {
  // @test-link [[rule_controller_connects_between_sessions]]
  // @test-link [[rule_audio_unlocked_by_player_click]]
  test('Checking shows while a decided permission resolves; the click unlocks audio', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await plug(page, KEYS)
    await page.evaluate(() => {
      window.__workspaceHarness.midi.setPermission('granted')
      window.__workspaceHarness.midi.holdNextRequest()
    })
    expect(await audioUnlocked(page)).toBe(false)
    await expect.poll(() => statusForm(page)).toEqual(FORM.connect)

    await clickControllerStatus(page)

    expect(await audioUnlocked(page)).toBe(true)
    const checking = { title: 'Connecting…', body: ['Looking for your controller…'], actions: [] }
    await expectSheet(page, checking, sheetClose(page))
    await expect(sheet(page).locator('.sheet-actions')).toHaveCount(0)
    expect(await requestCount(page)).toBe(1)

    await page.evaluate(() => window.__workspaceHarness.midi.releaseHeldRequest())

    // Exactly one input: the check, with that device connected from this moment.
    await expectSheet(page, CHECK_PROMPT, sheetClose(page))
    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  test('Waiting for your browser shows while the prompt is open, then resolves', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await page.evaluate(() => window.__workspaceHarness.midi.holdNextRequest())

    await clickControllerStatus(page)

    const waiting = {
      title: 'Allow MIDI access',
      body: [
        'Your browser is asking whether this page may use MIDI devices. Choose Allow in its prompt, near the address bar.',
        'You can also close this and practice without a controller.',
      ],
      actions: [],
    }
    await expectSheet(page, waiting, sheetClose(page))
    await expect(sheet(page).locator('.sheet-hint')).toHaveText(waiting.body[1]!)

    await page.evaluate(() => window.__workspaceHarness.midi.releaseHeldRequest())

    await expectSheet(page, NO_DEVICE, sheetAction(page, 'Try again'))
  })
})

// @test-link [[rule_chromium_only_support]]
// @test-link [[rule_midi_never_blocks_session]]
test('a browser without Web MIDI shows Unsupported browser, with no retry', async ({ page }) => {
  await gotoControllerHarness(page, { midi: 'unsupported' })

  await clickControllerStatus(page)

  await expectSheet(
    page,
    {
      title: "Controller connection isn't available here",
      body: [
        "This browser can't see MIDI controllers. Practicing without one works exactly the same.",
        'To use a controller, open Infinite Flow in a Chromium-based browser such as Chrome or Edge.',
      ],
      actions: [{ label: CONTINUE_WITHOUT, primary: true }],
    },
    sheetAction(page, CONTINUE_WITHOUT),
  )
  await expect(sheet(page).locator('.status-dot')).toHaveCount(0)
  expect(await audioUnlocked(page)).toBe(true)

  await sheetAction(page, CONTINUE_WITHOUT).click()

  await expect(sheet(page)).toBeHidden()
  await expect.poll(() => statusForm(page)).toEqual(FORM.connect)
})

// @test-link [[rule_controller_connects_between_sessions]]
// @test-link [[rule_midi_never_blocks_session]]
test('a refused request shows Permission denied and the MIDI-blocked badge; Check again asks again', async ({
  page,
}) => {
  await gotoControllerHarness(page)
  await page.evaluate(() => window.__workspaceHarness.midi.denyNextRequest())

  await clickControllerStatus(page)

  await expectSheet(
    page,
    {
      title: 'MIDI access is blocked',
      body: [
        "Your browser has blocked MIDI devices for this page, so the app can't ask again by itself.",
        'To allow it: click the site-settings icon at the left of the address bar, set MIDI devices to Allow, then choose Check again.',
      ],
      actions: [
        { label: 'Check again', primary: true },
        { label: CONTINUE_WITHOUT, primary: false },
      ],
    },
    sheetAction(page, 'Check again'),
  )
  // The only error-toned state.
  await expect(sheet(page).locator('.inline-alert.alert-error')).toHaveCount(1)
  await expect.poll(() => statusForm(page)).toEqual(FORM.blocked)

  // Still blocked: Check again lands back on Permission denied.
  await page.evaluate(() => window.__workspaceHarness.midi.denyNextRequest())
  await sheetAction(page, 'Check again').click()
  await expect
    .poll(() => page.evaluate(() => window.__workspaceHarness.midi.stateLog()))
    .toEqual(['not-requested', 'requesting', 'denied', 'requesting', 'denied'])
  await expect(sheet(page).locator('#sheet-title')).toHaveText('MIDI access is blocked')
  await expect(sheetAction(page, 'Check again')).toBeFocused()
  expect(await requestCount(page)).toBe(2)

  // The browser willing to ask again: Check again waits for its prompt, then proceeds normally.
  await plug(page, KEYS)
  await page.evaluate(() => {
    window.__workspaceHarness.midi.setPermission('prompt')
    window.__workspaceHarness.midi.holdNextRequest()
  })
  await sheetAction(page, 'Check again').click()
  await expect(sheet(page).locator('#sheet-title')).toHaveText('Allow MIDI access')
  await expect(sheetClose(page)).toBeFocused()
  await page.evaluate(() => window.__workspaceHarness.midi.releaseHeldRequest())

  await expectSheet(page, CHECK_PROMPT, sheetClose(page))
  expect(await requestCount(page)).toBe(3)
  await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
})

// @test-link [[rule_controller_connects_between_sessions]]
test('no input shows No device found; Try again resolves again', async ({ page }) => {
  await gotoControllerHarness(page)

  await clickControllerStatus(page)
  await expectSheet(page, NO_DEVICE, sheetAction(page, 'Try again'))
  await expect(sheet(page).locator('.inline-alert.alert-notice')).toHaveCount(1)

  await sheetAction(page, 'Try again').click()

  // Access is already granted: no new permission request, the same state, focus on Try again.
  await expectSheet(page, NO_DEVICE, sheetAction(page, 'Try again'))
  expect(await requestCount(page)).toBe(1)
  await expect.poll(() => statusForm(page)).toEqual(FORM.connect)
})

// @test-link [[rule_controller_connects_between_sessions]]
test.describe('Multi-device picker', () => {
  // @test-link [[rule_controller_connects_between_sessions]]
  test('lists every input in browser order; arrows move focus only, never choosing', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await connectThroughSheet(page, [KEYS, PAD, WIND])

    await expectSheet(page, PICKER, deviceOption(page, KEYS.name))
    const options = sheet(page).locator('.device-option')
    await expect(options).toHaveText([KEYS.name, PAD.name, WIND.name])
    await expect(sheet(page).getByRole('group')).toHaveAccessibleName(PICKER.body[0])
    expect(await options.evaluateAll((all) => all.map((o) => o.getAttribute('tabindex')))).toEqual([
      '0',
      '-1',
      '-1',
    ])

    const keys: [string, string][] = [
      ['ArrowDown', PAD.name],
      ['ArrowRight', WIND.name],
      ['ArrowDown', WIND.name],
      ['ArrowUp', PAD.name],
      ['ArrowLeft', KEYS.name],
      ['ArrowUp', KEYS.name],
      ['ArrowDown', PAD.name],
    ]
    for (const [key, focused] of keys) {
      await page.keyboard.press(key)
      await expect(deviceOption(page, focused)).toBeFocused()
      await expect(deviceOption(page, focused)).toHaveAttribute('tabindex', '0')
    }
    await expect(sheet(page).locator('#sheet-title')).toHaveText(PICKER.title)
    expect(await midiState(page)).toEqual({ kind: 'choosing' })
    // A long name wraps inside its option rather than widening the sheet.
    const wind = deviceOption(page, WIND.name)
    expect(await wind.evaluate((o) => o.scrollWidth <= o.clientWidth)).toBe(true)
  })

  for (const how of ['Enter', 'Space', 'click'] as const) {
    // @test-link [[rule_controller_connects_between_sessions]]
    test(`${how} chooses the focused option and opens its check`, async ({ page }) => {
      await gotoControllerHarness(page)
      await connectThroughSheet(page, [KEYS, PAD])
      await expect(deviceOption(page, KEYS.name)).toBeFocused()

      if (how === 'click') {
        await deviceOption(page, PAD.name).click()
      } else {
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press(how)
      }

      await expectSheet(page, CHECK_PROMPT, sheetClose(page))
      await expect.poll(() => midiState(page)).toEqual({ kind: 'connected', device: PAD })
      await expect.poll(() => statusForm(page)).toEqual(FORM.connected(PAD.name))
    })
  }
})

// @test-link [[rule_controller_connects_between_sessions]]
test('focus stays trapped in the sheet: Tab and Shift+Tab cycle its controls', async ({ page }) => {
  await gotoControllerHarness(page)
  await connectThroughSheet(page, [KEYS, PAD])
  await expect(deviceOption(page, KEYS.name)).toBeFocused()

  // Close, the picker's one tab stop, then the actions; wrapping at both ends.
  const forward = [CONTINUE_WITHOUT, 'Close', KEYS.name, CONTINUE_WITHOUT]
  for (const name of forward) {
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveText(name)
  }
  for (const name of [KEYS.name, 'Close', CONTINUE_WITHOUT]) {
    await page.keyboard.press('Shift+Tab')
    await expect(page.locator(':focus')).toHaveText(name)
  }
})
