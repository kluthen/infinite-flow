/**
 * Shared workspace-spec helpers: navigation, the primary phrase-action button, one named
 * radiogroup's radio, the preset box and its description line, and a `generation-status` observer
 * that records every text value the live region takes on so a fast (or slow) generation is
 * asserted deterministically rather than by race.
 */
import { type Locator, type Page, expect } from '@playwright/test'

/**
 * Intent: land on the workspace's empty state, ready for a fresh session. `search` is an optional
 * page-URL query string (e.g. `?prewarm=off`); omitted, the page loads with no query. The app
 * mounts only once its saved data has loaded, so this waits for the workspace to be drawn.
 */
export async function gotoWorkspace(page: Page, search = ''): Promise<void> {
  await page.goto(`/${search}`)
  await page.locator('.generation-status').waitFor({ state: 'attached' })
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

/** Intent: the preset bar's "Preset" box, a native select, by its accessible name. */
export function presetBox(page: Page): Locator {
  return page.getByRole('combobox', { name: 'Preset', exact: true })
}

/** Intent: the preset bar's description line, the `field-note` the box names as its description. */
export function presetDescription(page: Page): Locator {
  return page.locator('.preset-bar .field-note')
}

/**
 * Intent: the box shows `text`, as the player reads it: its selected option's text (a preset's
 * name, "Custom, based on {name}" or "Custom") and its `title`, which holds the full text.
 */
export async function expectPresetShown(page: Page, text: string): Promise<void> {
  await expect(presetBox(page)).toHaveAttribute('title', text)
  await expect(presetBox(page).locator('option:checked')).toHaveText(text)
}

/**
 * Intent: choose a preset by its name through the box, as the player does at Idle or in the
 * review mode, and wait until the box shows it. A refused choice (Loading, a session) fails here:
 * drive the box directly to prove a refusal.
 */
export async function choosePreset(page: Page, name: string): Promise<void> {
  await presetBox(page).selectOption({ label: name })
  await expectPresetShown(page, name)
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

/** The primary phrase action's accessible labels, matched against its text in the page. */
const PRIMARY_ACTION_TEXT = /^(Generate|Regenerate|Retry) (phrase|generation|notation)$/

/** One generation cycle's timing, from the primary-action click to "Phrase ready". */
export interface PhraseReadyTiming {
  /** Wall clock in the test runner, including Playwright's polling of the live region. */
  readonly wallMs: number
  /** In-page `performance.now()` from the click's dispatch to the live region reading "Phrase ready". */
  readonly inPageMs: number
  /** In-page `performance.now()` at the click's dispatch, to match other in-page timestamps against. */
  readonly clickAt: number
}

/**
 * Intent: click the primary phrase action and time the cycle until `generation-status` reads
 * "Phrase ready", two ways. The wall-clock figure waits on Playwright's assertion polling, which
 * backs off to one check every 500 ms, so it can overstate a long cycle by up to that much. The
 * in-page figure is exact to the page's clock: a capture-phase click listener stamps the click's
 * dispatch and a `MutationObserver` stamps the moment the live region's text becomes "Phrase
 * ready", which the page sets in the same task that finishes engraving the phrase.
 */
export async function timePhraseReady(page: Page, timeoutMs: number): Promise<PhraseReadyTiming> {
  await page.evaluate((pattern) => {
    const status = document.querySelector('.generation-status')
    if (!status) throw new Error('generation-status region not found')
    const text = new RegExp(pattern)
    const timing: { clickAt: number | null; readyAt: number | null } = {
      clickAt: null,
      readyAt: null,
    }
    window.__phraseTiming = timing
    const onClick = (event: Event): void => {
      const button = event.target instanceof Element ? event.target.closest('button') : null
      if (button === null || !text.test(button.textContent?.trim() ?? '')) return
      timing.clickAt = performance.now()
      document.removeEventListener('click', onClick, true)
    }
    document.addEventListener('click', onClick, true)
    const observer = new MutationObserver(() => {
      if (timing.clickAt === null || status.textContent !== 'Phrase ready') return
      timing.readyAt = performance.now()
      observer.disconnect()
    })
    observer.observe(status, { childList: true, characterData: true, subtree: true })
  }, PRIMARY_ACTION_TEXT.source)

  const start = Date.now()
  await primaryButton(page).click()
  await expect(statusRegion(page)).toHaveText('Phrase ready', { timeout: timeoutMs })
  const wallMs = Date.now() - start

  const handle = await page.waitForFunction(() => {
    const timing = window.__phraseTiming
    if (timing === undefined || timing.clickAt === null || timing.readyAt === null) return null
    return { clickAt: timing.clickAt, readyAt: timing.readyAt }
  })
  const stamps = await handle.jsonValue()
  if (stamps === null) throw new Error('the in-page phrase timing never completed')
  return { wallMs, inPageMs: stamps.readyAt - stamps.clickAt, clickAt: stamps.clickAt }
}
