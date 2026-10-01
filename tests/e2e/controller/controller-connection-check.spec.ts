/**
 * v2.0 chunk 13, the transposition check and Connected (screens/controller-connection/handoff.md,
 * States, Check result copy, Named actions), on the workspace harness with the fake MIDI access:
 * the engraved check note and its prompt, a match, a whole-octave offset and the worked example
 * with its profile suggestion, Continue, Run check again, Choose a different device with the
 * device in use marked, Disconnect and Done, and the connected badge opening the sheet at
 * Connected. Focus goes to each state's main action, else Close.
 */
import { expect, test } from '@playwright/test'

import {
  CHECK,
  FORM,
  KEYS,
  PAD,
  chooseProfile,
  clickControllerStatus,
  connectThroughSheet,
  deviceOption,
  expectSheet,
  gotoControllerHarness,
  midiState,
  play,
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

const RESULT_ACTIONS = [
  { label: 'Continue', primary: true },
  { label: 'Run check again', primary: false },
] as const

/** Intent: Connected for `name`, with or without `Choose a different device`. */
function connectedShape(name: string, chooseDifferent: boolean) {
  return {
    title: 'Controller connected',
    body: [`${name} is connected.`],
    actions: [
      { label: 'Done', primary: true },
      { label: 'Run check again', primary: false },
      ...(chooseDifferent ? [{ label: 'Choose a different device', primary: false }] : []),
      { label: 'Disconnect', primary: false },
    ],
  }
}

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

// @test-link [[rule_controller_transposition_check]]
test.describe('the transposition check', () => {
  // @test-link [[rule_controller_transposition_check]]
  // @test-link [[rule_controller_attached_definition]]
  test('the Prompt engraves one written note; the device counts as connected from now', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await connectThroughSheet(page, [KEYS])

    await expectSheet(page, CHECK_PROMPT, sheetClose(page))
    // One note on a short staff, engraved by the notation pipeline.
    const note = sheet(page).locator('.check-note')
    await expect(note.locator('svg.staff-svg')).toHaveCount(1)
    await expect(note.locator('svg .vf-stavenote')).toHaveCount(1)
    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
    expect(await midiState(page)).toEqual({ kind: 'connected', device: KEYS })
  })

  // @test-link [[rule_controller_transposition_check]]
  test('a match on the C MIDI keyboard profile', async ({ page }) => {
    await gotoControllerHarness(page)
    await chooseProfile(page, 'C MIDI keyboard')
    await connectThroughSheet(page, [KEYS])

    await play(page, KEYS, CHECK.keyboard.concert)

    await expectSheet(
      page,
      {
        title: 'Check your controller',
        body: [
          'Your controller matches the C MIDI keyboard profile.',
          "Nothing to change — you're ready to play.",
        ],
        actions: RESULT_ACTIONS,
      },
      sheetAction(page, 'Continue'),
    )
    // The note stays; the result is one neutral alert below it.
    await expect(sheet(page).locator('.check-note svg')).toHaveCount(1)
    await expect(sheet(page).locator('.sheet-body .inline-alert.alert-notice')).toHaveCount(1)
  })

  // @test-link [[rule_controller_transposition_check]]
  test('the worked example: the tenor profile, the controller sending the written note', async ({
    page,
  }) => {
    // The default profile is the B-flat tenor saxophone.
    await gotoControllerHarness(page)
    await connectThroughSheet(page, [KEYS])

    await play(page, KEYS, CHECK.tenor.written)

    await expectSheet(
      page,
      {
        title: 'Check your controller',
        body: [
          'Your controller sounds 14 semitones (1 octave and 2) higher than the B-flat tenor saxophone profile expects.',
          "Change your controller's transpose setting so it plays 14 semitones (1 octave and 2) lower, then run the check again.",
          'If you actually play the C MIDI keyboard, choose the C MIDI keyboard instrument profile instead — no controller change needed.',
        ],
        actions: RESULT_ACTIONS,
      },
      sheetAction(page, 'Continue'),
    )
  })

  // @test-link [[rule_controller_transposition_check]]
  test('a whole-octave offset suggests the octave setting and no other profile', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await chooseProfile(page, 'C MIDI keyboard')
    await connectThroughSheet(page, [KEYS])

    // Only the first note-on counts: the later ones change nothing.
    await play(page, KEYS, CHECK.keyboard.concert + 12)
    await play(page, KEYS, CHECK.keyboard.concert)

    await expectSheet(
      page,
      {
        title: 'Check your controller',
        body: [
          'Your controller sounds 1 octave higher than the C MIDI keyboard profile expects.',
          "Change your controller's octave setting so it plays 1 octave lower, then run the check again.",
        ],
        actions: RESULT_ACTIONS,
      },
      sheetAction(page, 'Continue'),
    )
  })

  // @test-link [[rule_controller_transposition_check]]
  test('Run check again from a result returns to the Prompt, asking nothing', async ({ page }) => {
    await gotoControllerHarness(page)
    await connectThroughSheet(page, [KEYS])
    await play(page, KEYS, CHECK.tenor.written)
    await expect(sheetAction(page, 'Continue')).toBeFocused()

    await sheetAction(page, 'Run check again').click()

    await expectSheet(page, CHECK_PROMPT, sheetClose(page))
    expect(await requestCount(page)).toBe(1)

    await play(page, KEYS, CHECK.tenor.concert)
    await expect(sheet(page).locator('.sheet-body')).toContainText(
      'Your controller matches the B-flat tenor saxophone profile.',
    )
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
test.describe('Connected', () => {
  // @test-link [[rule_controller_connects_between_sessions]]
  test('Continue reaches Connected; Done closes, keeping the connection', async ({ page }) => {
    await gotoControllerHarness(page)
    await connectThroughSheet(page, [KEYS])
    await play(page, KEYS, CHECK.tenor.concert)

    await sheetAction(page, 'Continue').click()

    await expectSheet(page, connectedShape(KEYS.name, false), sheetAction(page, 'Done'))
    await expect(sheet(page).locator('.sheet-body .status-dot.is-success')).toHaveCount(1)

    await sheetAction(page, 'Done').click()

    await expect(sheet(page)).toBeHidden()
    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
    expect(await midiState(page)).toEqual({ kind: 'connected', device: KEYS })
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  // @test-link [[rule_controller_transposition_check]]
  test('the connected badge opens at Connected; Run check again runs the check again', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await connectThroughSheet(page, [KEYS])
    await sheetClose(page).click()
    await expect(sheet(page)).toBeHidden()

    await clickControllerStatus(page)

    // Dismissed during the check: connected, unchecked; the badge opens at Connected.
    await expectSheet(page, connectedShape(KEYS.name, false), sheetAction(page, 'Done'))
    expect(await requestCount(page)).toBe(1)

    await sheetAction(page, 'Run check again').click()

    await expectSheet(page, CHECK_PROMPT, sheetClose(page))
    expect(await requestCount(page)).toBe(1)
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  // @test-link [[rule_controller_attached_definition]]
  test('Disconnect releases the device and shows the no-controller badge', async ({ page }) => {
    await gotoControllerHarness(page)
    await connectThroughSheet(page, [KEYS])
    await play(page, KEYS, CHECK.tenor.concert)
    await sheetAction(page, 'Continue').click()

    await sheetAction(page, 'Disconnect').click()

    await expect(sheet(page)).toBeHidden()
    await expect.poll(() => statusForm(page)).toEqual(FORM.noController)
    expect(await midiState(page)).toEqual({ kind: 'choosing' })
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  test('Choose a different device shows once a second input was seen, marking the one in use', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await connectThroughSheet(page, [KEYS, PAD])
    await deviceOption(page, KEYS.name).click()
    await play(page, KEYS, CHECK.tenor.concert)
    await sheetAction(page, 'Continue').click()
    await expectSheet(page, connectedShape(KEYS.name, true), sheetAction(page, 'Done'))

    await sheetAction(page, 'Choose a different device').click()

    await expect(sheet(page).locator('#sheet-title')).toHaveText('Choose a controller')
    const options = sheet(page).locator('.device-option')
    await expect(options).toHaveText([`${KEYS.name} (in use)`, PAD.name])
    await expect(deviceOption(page, KEYS.name)).toHaveClass(/is-selected/)
    await expect(deviceOption(page, PAD.name)).not.toHaveClass(/is-selected/)
    // The option in use holds the roving tab stop and the focus.
    await expect(deviceOption(page, KEYS.name)).toBeFocused()

    // Choosing it again re-runs its check.
    await page.keyboard.press('Enter')
    await expectSheet(page, CHECK_PROMPT, sheetClose(page))
    await play(page, KEYS, CHECK.tenor.concert)
    await sheetAction(page, 'Continue').click()

    // Choosing the other one checks it instead.
    await sheetAction(page, 'Choose a different device').click()
    await deviceOption(page, PAD.name).click()
    await expectSheet(page, CHECK_PROMPT, sheetClose(page))
    await expect.poll(() => midiState(page)).toEqual({ kind: 'connected', device: PAD })
    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(PAD.name))
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  test('a second input seen after connecting adds Choose a different device', async ({ page }) => {
    await gotoControllerHarness(page)
    await connectThroughSheet(page, [KEYS])
    await play(page, KEYS, CHECK.tenor.concert)
    await sheetAction(page, 'Continue').click()
    await expectSheet(page, connectedShape(KEYS.name, false), sheetAction(page, 'Done'))

    await plug(page, PAD)

    await expect
      .poll(() => sheet(page).locator('.sheet-actions > button').allTextContents())
      .toEqual(connectedShape(KEYS.name, true).actions.map((action) => action.label))
    await expect(sheet(page).locator('#sheet-title')).toHaveText('Controller connected')
  })
})
