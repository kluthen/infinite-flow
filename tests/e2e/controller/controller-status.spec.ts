/**
 * v2.0 chunk 13, the header's `controller-status` (screens/phrase-workspace/handoff.md,
 * `controller-status`; flows/controller-connection/handoff.md, Routing rules and Between-session
 * unplug), on the workspace harness with the fake MIDI access: disabled during a session, a status
 * display at full strength; its form kept while a session runs and updated once it ends, except
 * for the disconnected badge a controller lost mid-session shows during its countdown (chunk 17); a
 * controller unplugged at Idle keeping its selection and reattaching by itself, a selection a page
 * reload reattaches when MIDI access is already allowed and forgets after `Disconnect` (v3.0
 * chunk 22, item 18); and the forms' order and one width, the `Connect controller` button
 * included (D146), which never moves the rest of the header.
 */
import { expect, test, type Page } from '@playwright/test'

import {
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
  toRunning,
} from '../session/session-helpers'
import {
  CONTINUE_WITHOUT,
  FORM,
  KEYS,
  PAD,
  WIND,
  clickControllerStatus,
  connectThroughSheet,
  controllerStatus,
  gotoControllerHarness,
  midiState,
  plug,
  requestCount,
  sheet,
  sheetAction,
  sheetClose,
  statusForm,
  unplug,
  watchPageErrors,
} from './controller-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** The header forms a session can start with, and how each is reached from a fresh page. */
const BADGE_SETUPS = {
  connected: async (page: Page) => {
    await connectThroughSheet(page, [KEYS])
    await sheetClose(page).click()
  },
  'no-controller': async (page: Page) => {
    await connectThroughSheet(page, [KEYS])
    await sheetClose(page).click()
    await clickControllerStatus(page)
    await sheetAction(page, 'Disconnect').click()
  },
  blocked: async (page: Page) => {
    await page.evaluate(() => window.__workspaceHarness.midi.denyNextRequest())
    await clickControllerStatus(page)
    await sheetAction(page, CONTINUE_WITHOUT).click()
  },
} as const

/** Intent: wait until no CSS transition runs, so computed colours are the settled ones. */
async function settled(page: Page): Promise<void> {
  await page.mouse.move(1, 1)
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => !(animation instanceof CSSTransition)),
  )
}

/** Intent: the computed look of `controller-status`, its label and its dot. */
function statusLook(page: Page): Promise<Record<string, string>> {
  return controllerStatus(page).evaluate((button) => {
    const look = (element: Element | null, prefix: string): Record<string, string> => {
      if (element === null) return {}
      const style = getComputedStyle(element)
      return {
        [`${prefix}opacity`]: style.opacity,
        [`${prefix}color`]: style.color,
        [`${prefix}background`]: style.backgroundColor,
        [`${prefix}border`]: style.borderColor,
        [`${prefix}filter`]: style.filter,
      }
    }
    return {
      ...look(button, ''),
      ...look(button.querySelector('.controller-status-label'), 'label-'),
      ...look(button.querySelector('.status-dot'), 'dot-'),
    }
  })
}

/** Intent: assert a click on the disabled `controller-status` opens nothing. */
async function expectStatusOnly(page: Page): Promise<void> {
  await expect(controllerStatus(page)).toBeDisabled()
  await controllerStatus(page).click({ force: true })
  await expect(sheet(page)).toHaveCount(0)
}

// @test-link [[rule_controller_connects_between_sessions]]
test.describe('during a session', () => {
  // @test-link [[rule_controller_connects_between_sessions]]
  test('Connect controller is disabled, with the ordinary disabled look', async ({ page }) => {
    await gotoControllerHarness(page)
    await readyToStart(page)

    await startSession(page)
    await expectStatusOnly(page)
    await settled(page)
    expect((await statusLook(page)).opacity).toBe('0.55')
    await toRunning(page)
    await expectStatusOnly(page)

    await sessionAction(page).click()
    await expect.poll(async () => (await sessionState(page)).phase).toBe('idle')
    await expect(controllerStatus(page)).toBeEnabled()
  })

  for (const [form, setup] of Object.entries(BADGE_SETUPS)) {
    // @test-link [[rule_controller_connects_between_sessions]]
    // @test-link [[rule_readonly_controls_keep_contrast]]
    test(`the ${form} badge is a status display at full strength`, async ({ page }) => {
      await gotoControllerHarness(page)
      await setup(page)
      await expect(sheet(page)).toBeHidden()
      await readyToStart(page)
      const formBefore = await statusForm(page)
      await settled(page)
      const idleLook = await statusLook(page)
      expect(idleLook.opacity).toBe('1')

      await startSession(page)
      await expectStatusOnly(page)
      await settled(page)
      expect(await statusLook(page)).toEqual(idleLook)
      await toRunning(page)
      await expectStatusOnly(page)
      await settled(page)
      expect(await statusLook(page)).toEqual(idleLook)
      expect(await statusForm(page)).toEqual(formBefore)
    })
  }

  // @test-link [[rule_midi_never_blocks_session]]
  // @test-link [[rule_same_controller_reattaches]]
  // @test-link [[rule_controller_loss_mid_session]]
  test('an unplug shows the disconnected badge while the countdown runs, no-controller once it ends', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await BADGE_SETUPS.connected(page)
    await readyToStart(page)
    await startSession(page)
    await toRunning(page)
    await settled(page)
    const runningLook = await statusLook(page)
    const runningBoxes = await headerBoxes(page)

    await unplug(page, KEYS)

    // The session runs on with the countdown; the badge turns error-toned, still a status display
    // at full strength, and its width never changes.
    await expect.poll(() => midiState(page)).toEqual({ kind: 'away', device: KEYS })
    await expect.poll(() => statusForm(page)).toEqual(FORM.disconnected)
    await expect(page.locator('.session-cue-row .session-alert-countdown')).toHaveText('30 s')
    await expectStatusOnly(page)
    await settled(page)
    expect((await statusLook(page)).opacity).toBe(runningLook.opacity)
    expect(await headerBoxes(page)).toEqual(runningBoxes)
    expect((await sessionState(page)).phase).toBe('running')

    await sessionAction(page).click()

    // Still away when it ends: handled as unplugged between sessions.
    await expect.poll(() => statusForm(page)).toEqual(FORM.noController)
    await plug(page, KEYS)
    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
  })

  // @test-link [[rule_midi_never_blocks_session]]
  // @test-link [[rule_controller_connects_between_sessions]]
  test('a late Block during the session waits for its end to show the MIDI-blocked badge', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await readyToStart(page)
    await page.evaluate(() => window.__workspaceHarness.midi.holdNextRequest())
    await clickControllerStatus(page)
    await expect(sheet(page).locator('#sheet-title')).toHaveText('Allow MIDI access')
    await sheetClose(page).click()
    await startSession(page)

    await page.evaluate(() => {
      window.__workspaceHarness.midi.denyNextRequest()
      window.__workspaceHarness.midi.releaseHeldRequest()
    })

    await expect.poll(() => midiState(page)).toEqual({ kind: 'denied' })
    expect(await statusForm(page)).toEqual(FORM.connect)
    await toRunning(page)
    expect(await statusForm(page)).toEqual(FORM.connect)

    await sessionAction(page).click()

    await expect.poll(() => statusForm(page)).toEqual(FORM.blocked)
  })
})

// @test-link [[rule_same_controller_reattaches]]
// @test-link [[rule_controller_attached_definition]]
test.describe('item 19: unplugged at Idle', () => {
  // @test-link [[rule_same_controller_reattaches]]
  // @test-link [[rule_controller_attached_definition]]
  test('keeps its selection, shows no-controller, and reattaches by itself with no check', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await readyToStart(page)
    await BADGE_SETUPS.connected(page)

    await unplug(page, KEYS)

    await expect.poll(() => statusForm(page)).toEqual(FORM.noController)
    expect(await midiState(page)).toEqual({ kind: 'away', device: KEYS })
    // Neutral and calm: no countdown, no banner, the session can start.
    await expect(page.locator('.session-cue-row')).toHaveText('')
    await expect(sessionAction(page)).toBeEnabled()

    // A different device is not picked up.
    await plug(page, PAD)
    await expect
      .poll(() => page.evaluate(() => window.__workspaceHarness.midi.devices().length))
      .toBe(1)
    expect(await statusForm(page)).toEqual(FORM.noController)
    expect(await midiState(page)).toEqual({ kind: 'away', device: KEYS })

    // The same device back: the connected badge, with no click, no sheet and no check.
    await plug(page, KEYS)

    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
    expect(await midiState(page)).toEqual({ kind: 'connected', device: KEYS })
    await expect(sheet(page)).toHaveCount(0)
    expect(await requestCount(page)).toBe(1)
  })

  // @test-link [[rule_same_controller_reattaches]]
  // @test-link [[rule_last_controller_remembered]]
  // @test-link [[rule_disconnect_forgets_controller]]
  test('after a page reload the remembered controller reattaches when MIDI access is already allowed; after Disconnect nothing does', async ({
    page,
  }) => {
    // The browser keeps its MIDI permission and the device stays plugged in across the reloads.
    await gotoControllerHarness(page, { atLoad: { permission: 'granted', devices: [KEYS] } })
    await clickControllerStatus(page)
    await sheetClose(page).click()
    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
    await expect
      .poll(() => page.evaluate(() => window.__workspaceHarness.storage.records('controller')))
      .toHaveLength(1)

    await page.reload()
    await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)

    // Reattached with no click and no sheet: one request, which cannot prompt.
    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
    expect(await page.evaluate(() => window.__workspaceHarness.midi.stateLog())).toEqual([
      'not-requested',
      'requesting',
      'opening',
      'connected',
    ])
    expect(await requestCount(page)).toBe(1)
    await expect(sheet(page)).toHaveCount(0)

    await clickControllerStatus(page)
    await sheetAction(page, 'Disconnect').click()
    // The forgetting is saved before the reload, as the player's next load would find it.
    await expect
      .poll(() => page.evaluate(() => window.__workspaceHarness.storage.records('controller')))
      .toEqual([])
    await page.reload()
    await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)

    // Back to Connect controller: nothing asked the browser for MIDI access, so nothing attached.
    await expect.poll(() => statusForm(page)).toEqual(FORM.connect)
    expect(await midiState(page)).toEqual({ kind: 'not-requested' })
    expect(await page.evaluate(() => window.__workspaceHarness.midi.stateLog())).toEqual([
      'not-requested',
    ])
    expect(await requestCount(page)).toBe(0)
    await expect(sheet(page)).toHaveCount(0)
  })
})

/** The header elements a form change must never move. */
const HEADER_PARTS = [
  '.score-context',
  '.context-group > :last-child',
  '.header-actions > button:not(.session-action)',
  '.header-actions > button.session-action',
] as const

/** Intent: the boxes of `controller-status` and of every other header part, rounded to 0.1 px. */
async function headerBoxes(page: Page): Promise<{ status: number[]; others: number[][] }> {
  const box = async (selector: string): Promise<number[]> => {
    const b = await page.locator(`.layout-header ${selector}`).boundingBox()
    if (b === null) throw new Error(`${selector} is not rendered`)
    return [b.x, b.y, b.width, b.height].map((v) => Math.round(v * 10) / 10)
  }
  return {
    status: await box('button.controller-status'),
    others: await Promise.all(HEADER_PARTS.map(box)),
  }
}

// @test-link [[rule_controller_connects_between_sessions]]
// @test-link [[rule_controller_attached_definition]]
test.describe('the header forms', () => {
  // @test-link [[rule_controller_connects_between_sessions]]
  test('Connect, blocked, connected, no-controller: one width, nothing else moves, never back to Connect', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await expect.poll(() => statusForm(page)).toEqual(FORM.connect)

    // D146: every form, the `Connect controller` button included, has one inline size, so no
    // change of form moves the rest of the header.
    const connect = await headerBoxes(page)

    await BADGE_SETUPS.blocked(page)
    await expect.poll(() => statusForm(page)).toEqual(FORM.blocked)
    expect(await headerBoxes(page)).toEqual(connect)

    // A later success replaces it: a long-named device, cut with an ellipsis.
    await connectThroughSheet(page, [WIND])
    await sheetClose(page).click()
    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(WIND.name))
    await expect(controllerStatus(page)).toHaveAttribute('title', WIND.name)
    const label = controllerStatus(page).locator('.controller-status-label')
    expect(await label.evaluate((l) => getComputedStyle(l).textOverflow)).toBe('ellipsis')
    expect(await label.evaluate((l) => l.scrollWidth > l.clientWidth)).toBe(true)
    expect(await headerBoxes(page)).toEqual(connect)

    await clickControllerStatus(page)
    await sheetAction(page, 'Disconnect').click()
    await expect.poll(() => statusForm(page)).toEqual(FORM.noController)
    await expect(controllerStatus(page)).not.toHaveAttribute('title')
    expect(await headerBoxes(page)).toEqual(connect)

    // Nothing resolved afterwards brings back Connect controller.
    await unplug(page, WIND)
    await clickControllerStatus(page)
    await expect(sheet(page).locator('#sheet-title')).toHaveText('No controller found')
    await sheetAction(page, CONTINUE_WITHOUT).click()
    expect(await statusForm(page)).toEqual(FORM.noController)
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  test('the first connection, Connect to the connected badge, moves nothing in the header', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await expect.poll(() => statusForm(page)).toEqual(FORM.connect)
    const connect = await headerBoxes(page)

    await BADGE_SETUPS.connected(page)

    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
    expect(await headerBoxes(page)).toEqual(connect)
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  test('a success after a refusal with no controller ever connected returns to Connect', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await BADGE_SETUPS.blocked(page)
    await expect.poll(() => statusForm(page)).toEqual(FORM.blocked)

    await clickControllerStatus(page)

    await expect(sheet(page).locator('#sheet-title')).toHaveText('No controller found')
    await expect.poll(() => statusForm(page)).toEqual(FORM.connect)
  })
})
