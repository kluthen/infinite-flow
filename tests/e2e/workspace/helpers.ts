/**
 * Shared workspace-spec helpers: navigation, the primary phrase-action button, one named
 * radiogroup's radio, and a `generation-status` observer that records every text value the live
 * region takes on so a fast (or slow) generation is asserted deterministically rather than by race.
 */
import { type Locator, type Page, expect } from '@playwright/test'

/** Intent: land on the workspace's empty state, ready for a fresh session. */
export async function gotoWorkspace(page: Page): Promise<void> {
  await page.goto('/')
}

/** Intent: the single workspace-header phrase action (Generate/Regenerate/Retry, by current label). */
export function primaryButton(page: Page): Locator {
  return page.getByRole('button', {
    name: /^(Generate|Regenerate|Retry) (phrase|generation|notation)$/,
  })
}

/** Intent: the persistent, visually hidden generation-status live region. */
export function statusRegion(page: Page): Locator {
  return page.locator('.generation-status')
}

/**
 * Intent: one radio option inside the named radiogroup, resolved by its accessible group label.
 * Matches the option name exactly, since several catalogs (e.g. tonal center) share a prefix
 * (`C` / `C-sharp/D-flat`) that a substring match would otherwise conflate.
 */
export function radio(page: Page, groupLabel: string, optionLabel: string): Locator {
  return page
    .getByRole('radiogroup', { name: groupLabel })
    .getByRole('radio', { name: optionLabel, exact: true })
}

/**
 * Intent: attach a `MutationObserver` on `generation-status` before an action starts, so every text
 * value it takes on (including a value that resolves before Playwright's next poll) is captured.
 */
export async function observeGenerationStatus(page: Page): Promise<void> {
  await page.evaluate(() => {
    const el = document.querySelector('.generation-status')
    if (!el) throw new Error('generation-status region not found')
    window.__statusLog = [el.textContent ?? '']
    new MutationObserver(() => window.__statusLog?.push(el.textContent ?? '')).observe(el, {
      childList: true,
      characterData: true,
      subtree: true,
    })
  })
}

/** Intent: every text value `generation-status` has taken on since the last `observeGenerationStatus` call. */
export async function readGenerationStatusLog(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__statusLog ?? [])
}

/**
 * Intent: click the primary phrase action and wait until the request cycle completes, asserting the
 * live region announced both "Generating phrase" and "Phrase ready" along the way.
 */
export async function generateAndAwaitReady(page: Page): Promise<void> {
  await observeGenerationStatus(page)
  await primaryButton(page).click()
  await expect
    .poll(async () => (await readGenerationStatusLog(page)).at(-1), { timeout: 30_000 })
    .toBe('Phrase ready')
  const log = await readGenerationStatusLog(page)
  expect(log).toContain('Generating phrase')
  expect(log.at(-1)).toBe('Phrase ready')
}
