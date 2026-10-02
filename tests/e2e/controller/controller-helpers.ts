/**
 * Shared helpers for the controller-connection specs: the workspace harness (port 4175) on the fake
 * audio clock with the fake MIDI access (or a browser without Web MIDI), the header
 * `controller-status`, the connection sheet and its parts, the sheet's expected shape per state,
 * and a guard that fails a test on any page or console error. Every sheet is reached through real clicks and
 * keys; the harness seams only plug devices, play notes, and set the browser's MIDI permission.
 */
import { expect, type Locator, type Page } from '@playwright/test'

import { WORKSPACE_HARNESS_URL } from '../release/harness-helpers'
import { DESKTOP } from '../session/session-helpers'

/** A keyboard, a second one with a long name, and a pad: three distinct fake inputs. */
export const KEYS: WorkspaceHarnessMidiDevice = {
  id: 'port-keys',
  name: 'Keys 49',
  manufacturer: 'Acme',
}
export const PAD: WorkspaceHarnessMidiDevice = {
  id: 'port-pad',
  name: 'Pad 8',
  manufacturer: 'Beta',
}
export const WIND: WorkspaceHarnessMidiDevice = {
  id: 'port-wind',
  name: 'Wind Controller EWI Solo with a very long product name',
  manufacturer: 'Gamma',
}

/** Copy the sheet uses in several states. */
export const CONTINUE_WITHOUT = 'Continue without a controller'

/**
 * Intent: collect every page error and every console error from now on; `expectNoPageErrors`
 * fails the test on any. A crash in the sheet or the controller is a product defect, never noise,
 * including one Vue catches in an event handler and only logs to the console.
 */
export function watchPageErrors(page: Page): () => void {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  return () => expect(errors, `Unexpected page errors:\n${errors.join('\n')}`).toEqual([])
}

/**
 * Intent: land on the workspace harness at `size` on the fake audio clock, with `midi` access
 * (the fake by default, or a browser without Web MIDI), once the session controller has loaded.
 */
export async function gotoControllerHarness(
  page: Page,
  options: {
    readonly midi?: 'fake' | 'unsupported'
    readonly size?: { readonly width: number; readonly height: number }
  } = {},
): Promise<void> {
  await page.setViewportSize(options.size ?? DESKTOP)
  await page.goto(`${WORKSPACE_HARNESS_URL}?audio=fake&midi=${options.midi ?? 'fake'}`)
  await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)
}

/** Intent: the header's `controller-status` button, in whichever form it shows. */
export function controllerStatus(page: Page): Locator {
  return page.locator('.layout-header button.controller-status')
}

/** Intent: the connection sheet's dialog. */
export function sheet(page: Page): Locator {
  return page.getByRole('dialog')
}

/** Intent: the sheet's always-present `Close` button. */
export function sheetClose(page: Page): Locator {
  return sheet(page).locator('.sheet-header .sheet-close')
}

/** Intent: one of the sheet's `sheet-actions` buttons, by its exact label. */
export function sheetAction(page: Page, label: string): Locator {
  return sheet(page).locator('.sheet-actions').getByRole('button', { name: label, exact: true })
}

/** Intent: the picker's option for a device, by its exact visible label. */
export function deviceOption(page: Page, label: string): Locator {
  return sheet(page).locator('.device-option').filter({ hasText: label })
}

/** Intent: click `controller-status` (any form) and wait for the sheet to show. */
export async function clickControllerStatus(page: Page): Promise<void> {
  await controllerStatus(page).click()
  await expect(sheet(page)).toBeVisible()
}

/** What one sheet state shows: its title, body copy, and actions (primary first, flagged). */
export interface SheetShape {
  readonly title: string
  /** The body's text blocks (paragraphs and alerts), in order, exactly. */
  readonly body: readonly string[]
  readonly actions: readonly { readonly label: string; readonly primary: boolean }[]
}

/**
 * Intent: the visible texts of the sheet body's blocks, in order: its paragraphs and inline
 * alerts, an alert made of paragraphs (a check result) giving one text per paragraph.
 */
export function sheetBodyTexts(page: Page): Promise<string[]> {
  return sheet(page)
    .locator('.sheet-body')
    .evaluate((body) => {
      const text = (element: Element): string =>
        (element.textContent ?? '').replace(/\s+/g, ' ').trim()
      return Array.from(body.querySelectorAll(':scope > p, :scope > .inline-alert')).flatMap(
        (block) => {
          const lines = Array.from(block.querySelectorAll(':scope > p'))
          return lines.length > 0 ? lines.map(text) : [text(block)]
        },
      )
    })
}

/** Intent: the sheet's action buttons, in markup order, with their primary flag. */
export function sheetActions(
  page: Page,
): Promise<{ readonly label: string; readonly primary: boolean }[]> {
  return sheet(page)
    .locator('.sheet-actions > button')
    .evaluateAll((buttons) =>
      buttons.map((button) => ({
        label: (button.textContent ?? '').trim(),
        primary: button.classList.contains('btn-primary'),
      })),
    )
}

/**
 * Intent: assert the sheet shows exactly this state: title (also the dialog's name), body blocks,
 * actions (each a `btn`, none `btn-error`), and focus on `focus`.
 */
export async function expectSheet(page: Page, shape: SheetShape, focus: Locator): Promise<void> {
  await expect(sheet(page)).toHaveAttribute('aria-modal', 'true')
  await expect(sheet(page).locator('#sheet-title')).toHaveText(shape.title)
  await expect(sheet(page)).toHaveAccessibleName(shape.title)
  await expect.poll(() => sheetBodyTexts(page)).toEqual([...shape.body])
  expect(await sheetActions(page)).toEqual([...shape.actions])
  await expect(sheet(page).locator('.sheet-actions > button:not(.btn)')).toHaveCount(0)
  await expect(sheet(page).locator('.btn-error')).toHaveCount(0)
  await expect(sheetClose(page)).toBeEnabled()
  await expect(focus).toBeFocused()
}

/** Intent: the header form `controller-status` shows: its words, badge, error tone and dot tone. */
export async function statusForm(page: Page): Promise<{
  readonly text: string
  readonly badge: boolean
  readonly error: boolean
  readonly dot: string | null
}> {
  return controllerStatus(page).evaluate((button) => {
    const dot = button.querySelector('.status-dot')
    const tone =
      dot === null
        ? null
        : (['is-success', 'is-neutral', 'is-error'].find((c) => dot.classList.contains(c)) ?? '')
    return {
      text: (button.textContent ?? '').replace(/\s+/g, ' ').trim(),
      badge: button.classList.contains('is-badge'),
      error: button.classList.contains('is-error'),
      dot: tone,
    }
  })
}

/** The header forms, as `statusForm` reads them. */
export const FORM = {
  connect: { text: 'Connect controller', badge: false, error: false, dot: null },
  connected: (name: string) => ({ text: name, badge: true, error: false, dot: 'is-success' }),
  noController: { text: 'No controller', badge: true, error: false, dot: 'is-neutral' },
  blocked: { text: 'MIDI access blocked', badge: true, error: true, dot: 'is-error' },
  /** The selected controller lost mid-session, while its 30-second countdown runs. */
  disconnected: { text: 'Controller disconnected', badge: true, error: true, dot: 'is-error' },
} as const

/** Intent: the controller's state, read through the harness. */
export function midiState(page: Page): Promise<WorkspaceHarnessMidiState> {
  return page.evaluate(() => window.__workspaceHarness.midi.state())
}

/** Intent: plug a fake device in. */
export function plug(page: Page, device: WorkspaceHarnessMidiDevice): Promise<void> {
  return page.evaluate((d) => window.__workspaceHarness.midi.plug(d), device)
}

/** Intent: unplug a fake device (stamped at audio time 0: no session runs). */
export function unplug(page: Page, device: WorkspaceHarnessMidiDevice): Promise<void> {
  return page.evaluate((id) => window.__workspaceHarness.midi.unplug(id, 0), device.id)
}

/** Intent: play one note (on, then off) on a fake device, stamped at audio time 0. */
export function play(page: Page, device: WorkspaceHarnessMidiDevice, pitch: number): Promise<void> {
  return page.evaluate(
    ([id, p]) => {
      window.__workspaceHarness.midi.noteOn(id, p, 100, 0)
      window.__workspaceHarness.midi.noteOff(id, p, 0)
    },
    [device.id, pitch] as const,
  )
}

/** Intent: how many times MIDI access was requested since the page loaded. */
export function requestCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.midi.requestCount())
}

/** Intent: whether the page's audio is unlocked. */
export function audioUnlocked(page: Page): Promise<boolean> {
  return page.evaluate(() => window.__workspaceHarness.audio.isUnlocked())
}

/** Intent: choose an instrument profile through its radio, while no phrase is shown. */
export async function chooseProfile(page: Page, name: string): Promise<void> {
  const option = page
    .getByRole('radiogroup', { name: 'Instrument profile' })
    .getByRole('radio', { name, exact: true })
  await option.click()
  await expect(option).toHaveAttribute('aria-checked', 'true')
}

/**
 * Intent: with `devices` plugged in first, click `Connect controller` and wait for the sheet to
 * have resolved past Requesting access.
 */
export async function connectThroughSheet(
  page: Page,
  devices: readonly WorkspaceHarnessMidiDevice[],
): Promise<void> {
  for (const device of devices) await plug(page, device)
  await clickControllerStatus(page)
  await expect(sheet(page).locator('#sheet-title')).not.toHaveText(/Connecting…|Allow MIDI access/)
}

/**
 * Intent: from a sheet at the check's Prompt for `device`, play `pitch`, Continue, and close with
 * Done: the device is connected and the sheet closed.
 */
export async function finishCheck(
  page: Page,
  device: WorkspaceHarnessMidiDevice,
  pitch: number,
): Promise<void> {
  await expect(sheet(page).locator('#sheet-title')).toHaveText('Check your controller')
  await play(page, device, pitch)
  await sheetAction(page, 'Continue').click()
  await expect(sheet(page).locator('#sheet-title')).toHaveText('Controller connected')
  await sheetAction(page, 'Done').click()
  await expect(sheet(page)).toBeHidden()
}

/** The check's written note and expected concert pitch for the two profiles the specs use. */
export const CHECK = {
  /** C MIDI keyboard: written C4 (60), sounding C4. */
  keyboard: { written: 60, concert: 60 },
  /** B-flat tenor saxophone (the default profile): written C5 (72), sounding B-flat 3 (58). */
  tenor: { written: 72, concert: 58 },
} as const
