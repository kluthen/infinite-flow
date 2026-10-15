/**
 * The remembered controller (master spec §7.3), on the workspace harness with the fake MIDI access,
 * whose browser state (MIDI permission, devices plugged in) is set in the URL so a reload keeps it
 * as a browser does. The last controller the player chose is reattached at load with no prompt and
 * no sheet, only when MIDI access is already allowed, matched on its port id; `Disconnect` forgets
 * it; a visit that saves nothing neither remembers nor forgets (spec D318); and after a load its
 * starting note waits for the page's first click, tap or key press.
 */
import { expect, test, type Page } from '@playwright/test'

import { sessionAction, sessionState } from '../session/session-helpers'
import {
  audioUnlocked,
  CHECK,
  clickControllerStatus,
  connectThroughSheet,
  controllerStatus,
  expectSheet,
  FORM,
  gotoControllerHarness,
  KEYS,
  midiState,
  PAD,
  play,
  plug,
  requestCount,
  sheet,
  sheetAction,
  sheetClose,
  statusForm,
  watchPageErrors,
} from './controller-helpers'

/** The browser at load: MIDI access already allowed, these devices plugged in. */
function allowed(...devices: WorkspaceHarnessMidiDevice[]) {
  return { atLoad: { permission: 'granted' as const, devices } }
}

/** Intent: the raw records of the `controller` store, read through the app's port. */
function controllerRecords(page: Page): Promise<unknown[]> {
  return page.evaluate(() => window.__workspaceHarness.storage.records('controller'))
}

/** Intent: how many writes, deletes and batches reached the app's port since the load. */
function portChanges(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.storage.portChanges())
}

/** Intent: connect `device`, the only one plugged in, through the sheet, and close it. */
async function connectOnly(page: Page): Promise<void> {
  await clickControllerStatus(page)
  await expect(sheet(page).locator('#sheet-title')).toHaveText('Check your controller')
  await sheetClose(page).click()
  await expect(sheet(page)).toBeHidden()
}

/** Intent: Disconnect the connected controller through its sheet. */
async function disconnect(page: Page): Promise<void> {
  await clickControllerStatus(page)
  await sheetAction(page, 'Disconnect').click()
  await expect(sheet(page)).toBeHidden()
}

/** Intent: a first visit that connects KEYS, the browser allowing MIDI access from then on. */
async function rememberKeys(page: Page): Promise<void> {
  await gotoControllerHarness(page, allowed(KEYS))
  await connectOnly(page)
  await expect.poll(() => controllerRecords(page)).toHaveLength(1)
}

// @test-link [[rule_last_controller_remembered]]
// @test-link [[entity_remembered_controller_record]]
test.describe('the remembered controller at load', () => {
  test('is reattached after a reload with no sheet and one request that cannot prompt', async ({
    page,
  }) => {
    const expectNoPageErrors = watchPageErrors(page)
    await rememberKeys(page)
    const [record] = await controllerRecords(page)
    expect(record).toMatchObject({ dataVersion: 1, ...KEYS })

    await page.reload()
    await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)

    await expect.poll(() => midiState(page)).toEqual({ kind: 'connected', device: KEYS })
    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
    expect(await requestCount(page)).toBe(1)
    await expect(sheet(page)).toHaveCount(0)
    expectNoPageErrors()
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  test('is not requested when MIDI access is not already allowed: Connect controller shows', async ({
    page,
  }) => {
    await rememberKeys(page)

    await gotoControllerHarness(page, { atLoad: { permission: 'prompt', devices: [KEYS] } })

    expect(await requestCount(page)).toBe(0)
    expect(await midiState(page)).toEqual({ kind: 'not-requested' })
    await expect.poll(() => statusForm(page)).toEqual(FORM.connect)
  })

  test('not plugged in, shows the no-controller badge, and attaches when plugged in', async ({
    page,
  }) => {
    await rememberKeys(page)

    await gotoControllerHarness(page, allowed(PAD))
    await expect.poll(() => statusForm(page)).toEqual(FORM.noController)
    expect(await midiState(page)).toEqual({ kind: 'away', device: KEYS })

    await plug(page, KEYS)
    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
    await expect(sheet(page)).toHaveCount(0)
  })

  // @test-link [[rule_same_controller_reattaches]]
  test('a different device plugged in is not picked up, whatever its name', async ({ page }) => {
    await rememberKeys(page)

    await gotoControllerHarness(page, allowed())
    await plug(page, { ...KEYS, id: 'port-keys-twin' })
    await plug(page, PAD)

    await expect.poll(() => statusForm(page)).toEqual(FORM.noController)
    expect(await midiState(page)).toEqual({ kind: 'away', device: KEYS })
  })

  // @test-link [[rule_disconnect_forgets_controller]]
  test('Disconnect, reload: nothing reattaches and nothing is requested', async ({ page }) => {
    await rememberKeys(page)
    await disconnect(page)
    await expect.poll(() => controllerRecords(page)).toEqual([])

    await page.reload()
    await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)

    expect(await requestCount(page)).toBe(0)
    expect(await midiState(page)).toEqual({ kind: 'not-requested' })
    await expect.poll(() => statusForm(page)).toEqual(FORM.connect)
  })

  // @test-link [[rule_controller_transposition_check]]
  test('reattached at load, its check hears the controller though no click unlocked the audio', async ({
    page,
  }) => {
    const expectNoPageErrors = watchPageErrors(page)
    await rememberKeys(page)
    await page.reload()
    await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)
    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))

    await clickControllerStatus(page)
    await expect(sheet(page).locator('#sheet-title')).toHaveText('Controller connected')
    await sheetAction(page, 'Run check again').click()
    await expect(sheet(page).locator('#sheet-title')).toHaveText('Check your controller')
    await play(page, KEYS, CHECK.tenor.concert)
    await sheetAction(page, 'Continue').click()

    await expect(sheet(page).locator('#sheet-title')).toHaveText('Controller connected')
    expect(await audioUnlocked(page)).toBe(false)
    expectNoPageErrors()
  })

  test('chosen through the sheet goes straight to Connected among several inputs', async ({
    page,
  }) => {
    await rememberKeys(page)

    await gotoControllerHarness(page, { atLoad: { permission: 'prompt', devices: [PAD, KEYS] } })
    await clickControllerStatus(page)

    await expectSheet(
      page,
      {
        title: 'Controller connected',
        body: [
          `${KEYS.name} is connected.`,
          'This is the controller you chose last time. Run the check again if you have changed its settings.',
        ],
        actions: [
          { label: 'Done', primary: true },
          { label: 'Run check again', primary: false },
          { label: 'Choose a different device', primary: false },
          { label: 'Disconnect', primary: false },
        ],
      },
      sheetAction(page, 'Done'),
    )
  })
})

// @test-link [[rule_last_controller_remembered]]
// @test-link [[entity_remembered_controller_record]]
test.describe('a visit that saves nothing neither remembers nor forgets (spec D318)', () => {
  test('started from the defaults: connecting and Disconnect write nothing; the next load reselects', async ({
    page,
  }) => {
    await rememberKeys(page)

    await gotoControllerHarness(page, { ...allowed(PAD, KEYS), query: { storageRead: 'fail' } })
    expect(await midiState(page)).toEqual({ kind: 'not-requested' })
    await connectThroughSheet(page, [])
    await sheet(page).locator('.device-option').filter({ hasText: PAD.name }).click()
    await sheetClose(page).click()
    await expect.poll(() => midiState(page)).toEqual({ kind: 'connected', device: PAD })
    await disconnect(page)
    expect(await portChanges(page)).toBe(0)

    await gotoControllerHarness(page, allowed(PAD, KEYS))
    await expect.poll(() => midiState(page)).toEqual({ kind: 'connected', device: KEYS })
  })

  test('an outdated tab: connecting and Disconnect write nothing; the next load reselects', async ({
    page,
  }) => {
    await gotoControllerHarness(page, allowed(PAD, KEYS))
    await clickControllerStatus(page)
    await sheet(page).locator('.device-option').filter({ hasText: KEYS.name }).click()
    await sheetClose(page).click()
    await expect.poll(() => controllerRecords(page)).toHaveLength(1)
    await page.evaluate(() => window.__workspaceHarness.storage.openNewerVersion())
    const changesBefore = await portChanges(page)

    await disconnect(page)
    await clickControllerStatus(page)
    await sheet(page).locator('.device-option').filter({ hasText: PAD.name }).click()
    await sheetClose(page).click()
    await expect.poll(() => midiState(page)).toEqual({ kind: 'connected', device: PAD })
    expect(await portChanges(page)).toBe(changesBefore)

    await page.reload()
    await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)
    await expect.poll(() => midiState(page)).toEqual({ kind: 'connected', device: KEYS })
    await expect(controllerStatus(page)).toBeVisible()
  })
})

// @test-link [[rule_starting_note_waits_for_first_gesture]]
// @test-link [[rule_midi_starting_note]]
test.describe('the starting note after a load', () => {
  test("starts nothing before the page's first click; after one, it starts a session, with sound", async ({
    page,
  }) => {
    const expectNoPageErrors = watchPageErrors(page)
    await rememberKeys(page)
    await page.reload()
    await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)
    await expect.poll(() => midiState(page)).toEqual({ kind: 'connected', device: KEYS })

    // Reach Ready with no click, tap or key press: a script's click() fires no input event, so the
    // page has had no first click (in practice the player's Generate phrase click is one).
    await page.evaluate(() => {
      const generate = Array.from(document.querySelectorAll('.layout-header button')).find(
        (button) => button.textContent?.trim() === 'Generate phrase',
      )
      if (!(generate instanceof HTMLButtonElement)) throw new Error('no Generate phrase button')
      generate.click()
    })
    const line = page.locator('.session-cue-row p.start-note-line')
    await expect(line).toHaveText(/^\s*Click the page once, then play this note to start: \S+\s*$/)
    const starting = (await sessionState(page)).startingNote
    if (starting === null) throw new Error('no starting note is named')

    await play(page, KEYS, starting.concertPitch)
    expect((await sessionState(page)).phase).toBe('idle')
    expect(await audioUnlocked(page)).toBe(false)
    await expect(line).toHaveText(/^\s*Click the page once/)

    // The first click, on the line itself: it makes no sound and creates no audio context.
    await line.click()
    await expect(line).toHaveText(/^\s*Play this note to start: \S+\s*$/)
    expect(await audioUnlocked(page)).toBe(false)

    await play(page, KEYS, starting.concertPitch)
    await expect(sessionAction(page)).toHaveText('Stop')
    expect((await sessionState(page)).phase).toBe('count-in')
    expect(await audioUnlocked(page)).toBe(true)
    expect(await page.evaluate(() => window.__workspaceHarness.audio.isRunning())).toBe(true)
    await sessionAction(page).click()
    expectNoPageErrors()
  })
})
