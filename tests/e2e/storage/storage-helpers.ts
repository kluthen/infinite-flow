/**
 * Shared helpers for the saved-data specs on the workspace harness (port 4175): seeding settings
 * through the harness's storage seam, reloading so the next load reads them, and recording the
 * controls as the workspace is first drawn, before the browser paints, to compare with what they
 * show later.
 */
import type { Page } from '@playwright/test'

import { WORKSPACE_HARNESS_URL } from '../release/harness-helpers'

/** Every control's shown value at one moment, and the theme applied to the page. */
export interface ShownControls {
  readonly theme: string | null
  /** Each radiogroup's label with its checked options' text, and its disabled ones. */
  readonly radiogroups: readonly string[]
  /** Each toggle button's text with its pressed state. */
  readonly toggles: readonly string[]
  /** Each spinbutton's label with its value. */
  readonly spinbuttons: readonly string[]
}

/** The page's own reading of its controls, also run inside the first-draw recorder. */
type ShownControlsReader = () => ShownControls

declare global {
  interface Window {
    __firstDraw?: ShownControls
  }
}

/**
 * Intent: read every control's shown value from the page's DOM: checked and disabled radios by
 * group, pressed toggles and spinbutton values, and the theme attribute.
 */
const readShownControls: ShownControlsReader = () => {
  const text = (element: Element): string => (element.textContent ?? '').replace(/\s+/g, ' ').trim()
  const radiogroups = [...document.querySelectorAll('[role="radiogroup"]')].map((group) => {
    const radios = [...group.querySelectorAll('[role="radio"]')]
    const checked = radios.filter((radio) => radio.getAttribute('aria-checked') === 'true')
    const disabled = radios.filter((radio) => radio.hasAttribute('disabled'))
    return `${group.getAttribute('aria-label')}: ${checked.map(text).join('|')} (disabled: ${disabled.map(text).join('|')})`
  })
  const toggles = [...document.querySelectorAll('[aria-pressed]')].map(
    (button) => `${text(button)}: ${button.getAttribute('aria-pressed')}`,
  )
  const spinbuttons = [...document.querySelectorAll('[role="spinbutton"]')].map(
    (spin) => `${spin.getAttribute('aria-label')}: ${spin.getAttribute('aria-valuenow')}`,
  )
  return {
    theme: document.documentElement.getAttribute('data-theme'),
    radiogroups,
    toggles,
    spinbuttons,
  }
}

/** Intent: the controls the page shows now. */
export function shownControls(page: Page): Promise<ShownControls> {
  return page.evaluate(`(${readShownControls.toString()})()`) as Promise<ShownControls>
}

/**
 * Intent: before any page script runs, on every load of the page, record the controls at the
 * first DOM change that shows a radiogroup, which is the workspace's first draw, in the same task
 * and so before the browser paints it, into `window.__firstDraw`.
 */
export async function recordFirstDraw(page: Page): Promise<void> {
  await page.addInitScript(`(() => {
    const read = ${readShownControls.toString()}
    const observer = new MutationObserver(() => {
      if (document.querySelector('[role="radiogroup"]') === null) return
      window.__firstDraw = read()
      observer.disconnect()
    })
    observer.observe(document, { childList: true, subtree: true })
  })()`)
}

/** Intent: the controls recorded at the workspace's first draw. */
export async function firstDraw(page: Page): Promise<ShownControls> {
  const recorded = await page.evaluate(() => window.__firstDraw ?? null)
  if (recorded === null) throw new Error('the first draw was not recorded')
  return recorded
}

/** Intent: wait until the harness has loaded the saved data, mounted, and built its controller. */
export async function harnessReady(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)
}

/** Intent: open the harness with `search`, ready. */
export async function gotoStorageHarness(page: Page, search = ''): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`${WORKSPACE_HARNESS_URL}${search}`)
  await harnessReady(page)
}

/** Intent: seed settings records for the next load, through the harness's storage seam. */
export function seedSettings(page: Page, values: Readonly<Record<string, unknown>>): Promise<void> {
  return page.evaluate((seeded) => window.__workspaceHarness.storage.seedSettings(seeded), values)
}

/** Intent: reload the page, so the load reads what is stored, and wait until it is ready. */
export async function reloadHarness(page: Page): Promise<void> {
  await page.reload()
  await harnessReady(page)
}
