/**
 * Shared steps of the Your data specs (./your-data.spec.ts, ./your-data-deletions.spec.ts): the
 * sheet, its openers, its sections'
 * lines and actions, a stub of the browser's storage manager (the space used, whether the data is
 * persistent) installed by an init script, and the kept-session stores read back through the
 * harness's storage seam.
 */
import { expect, type Locator, type Page } from '@playwright/test'

import { sessionState } from '../session/session-helpers'

/** The intro every form of the sheet opens with. */
export const INTRO =
  'Everything here is kept on this device, in this browser only, for anyone who opens the app in it. Nothing is ever sent anywhere.'
export const PROTECTED = "Protected. The browser won't clear this data to free up space."
export const NOT_PROTECTED =
  'Not protected. The browser may clear this data if the device runs short of space. Export what you want to be sure to keep.'
export const DELETION_FAILED = "That couldn't be deleted. Try again."
export const UNREADABLE_NOTICE =
  "Your saved data couldn't be read in this visit, so it isn't listed here. Reload the page to try again, or delete everything to start afresh."
export const OUTDATED_NOTICE =
  "A newer version of the app saved this data, so it isn't listed here, and nothing can be deleted until the page is reloaded. Reload the page to see it."
export const OUTDATED_DEFAULTS_NOTICE =
  "Your saved data couldn't be read in this visit, so it isn't listed here. A newer version of the app has also saved data on this device, so nothing can be deleted until the page is reloaded. Reload the page to use the newer version."
/** The notice row's outdated wording when the tab read its saved data (spec D300, D331). */
export const OUTDATED_ROW_NOTICE =
  'A newer version of Infinite Flow has saved data on this device. Reload this page to use it; until then, nothing here is saved.'

/** The kept-session stores. */
export const KEPT_STORES = ['sessionSummaries', 'sessionBodies', 'playedNotes'] as const

/** What the stubbed storage manager reports: the database's bytes, and whether it is persistent. */
export interface StorageStub {
  readonly databaseBytes: number
  readonly persisted: boolean
}

/**
 * Intent: from the next load on, the browser's storage manager reports `stub`: an estimate whose
 * IndexedDB part is `databaseBytes` (beside a larger offline copy, which the sheet must not count),
 * and `persisted()`; `setStorageStub` changes it in the page later.
 */
export async function stubStorageManager(page: Page, stub: StorageStub): Promise<void> {
  await page.addInitScript((initial) => {
    const holder = window as unknown as { __storageStub: StorageStub }
    holder.__storageStub = initial
    const storage = navigator.storage
    storage.estimate = () =>
      Promise.resolve({
        usage: holder.__storageStub.databaseBytes + 5_000_000,
        quota: 1_000_000_000,
        usageDetails: { indexedDB: holder.__storageStub.databaseBytes, caches: 5_000_000 },
      } as StorageEstimate)
    storage.persisted = () => Promise.resolve(holder.__storageStub.persisted)
  }, stub)
}

/** Intent: change what the stubbed storage manager reports, in the page. */
export function setStorageStub(page: Page, stub: StorageStub): Promise<void> {
  return page.evaluate((next) => {
    ;(window as unknown as { __storageStub: StorageStub }).__storageStub = next
  }, stub)
}

/** Intent: the Your data sheet. */
export function yourDataSheet(page: Page): Locator {
  return page.getByRole('dialog')
}

/** Intent: the footer's `Your data`. */
export function footerYourData(page: Page): Locator {
  return page.locator('.layout-footer').getByRole('button', { name: 'Your data', exact: true })
}

/** Intent: the session list header's `Your data`. */
export function listYourData(page: Page): Locator {
  return page.locator('.sessions-header').getByRole('button', { name: 'Your data', exact: true })
}

/** Intent: open the sheet from `opener`; it shows its Overview, focus on `Done`. */
export async function openYourData(page: Page, opener: Locator = footerYourData(page)) {
  await opener.click()
  await expect(yourDataSheet(page)).toHaveAccessibleName('Your data')
  await expect(sheetButton(page, 'Done')).toBeFocused()
}

/** Intent: the sheet's button named `name`, anywhere in it. */
export function sheetButton(page: Page, name: string): Locator {
  return yourDataSheet(page).getByRole('button', { name, exact: true })
}

/** Intent: the sheet's section headed `heading`. */
export function section(page: Page, heading: string): Locator {
  return yourDataSheet(page)
    .locator('.sheet-section')
    .filter({ has: page.getByRole('heading', { name: heading, exact: true }) })
}

/** Intent: the plain lines of the section headed `heading`, hints included, in order. */
export function sectionLines(page: Page, heading: string): Promise<string[]> {
  return section(page, heading).locator('p').allInnerTexts()
}

/** Intent: the headings of the sheet's sections, in order. */
export function sectionHeadings(page: Page): Promise<string[]> {
  return yourDataSheet(page).locator('.sheet-section > h3').allInnerTexts()
}

/** Intent: the sheet's buttons' names, in order. */
export function sheetButtons(page: Page): Promise<string[]> {
  return yourDataSheet(page)
    .getByRole('button')
    .evaluateAll((buttons) =>
      buttons.map((button) => (button.textContent ?? '').replace(/\s+/g, ' ').trim()),
    )
}

/** Intent: open the Confirmation of `button`; its title is `title`, focus on its way back. */
export async function askConfirmation(
  page: Page,
  button: string,
  title: string,
  wayBack = 'Cancel',
) {
  await sheetButton(page, button).click()
  await expect(yourDataSheet(page)).toHaveAccessibleName(title)
  await expect(
    yourDataSheet(page)
      .locator('.sheet-actions')
      .getByRole('button', { name: wayBack, exact: true }),
  ).toBeFocused()
}

/** Intent: the open Confirmation's confirming action. */
export function confirmingAction(page: Page): Locator {
  return yourDataSheet(page).locator('.sheet-actions .btn-error')
}

/** Intent: the keys a kept-session store holds, through the harness's seam. */
export async function storedKeys(
  page: Page,
  store: (typeof KEPT_STORES)[number],
): Promise<string[]> {
  const records = await page.evaluate(
    (name) => window.__workspaceHarness.storage.keyedRecords(name),
    store,
  )
  return records.map((record) => record.key)
}

/** Intent: the keys the three kept-session stores hold, by store. */
export async function keptKeys(page: Page): Promise<Record<string, string[]>> {
  const keys = await Promise.all(KEPT_STORES.map((store) => storedKeys(page, store)))
  return Object.fromEntries(KEPT_STORES.map((store, index) => [store, keys[index] ?? []]))
}

/** Intent: the save policy's saving state. */
export function savingState(page: Page): Promise<string | null> {
  return page.evaluate(() => window.__workspaceHarness.storage.savingState())
}

/** The my instrument the seeded visits hold. */
export const LOW_TENOR = {
  template: 'bb-tenor',
  name: 'Low tenor',
  clef: 'bass',
  writtenRange: { minMidi: 28, maxMidi: 52 },
  transposition: { octaves: 1, semitones: 2, direction: 'lower' },
} as const

/** The session list's empty state. */
export const EMPTY_LIST = 'No sessions are kept. Your next session will be kept here.'

/** Intent: the keys of the kept sessions stored now. */
export function summaryKeys(page: Page): Promise<string[]> {
  return storedKeys(page, 'sessionSummaries')
}

/** Intent: the most recent session as the controller holds it. */
export async function mostRecent(page: Page): Promise<unknown> {
  return (await sessionState(page)).mostRecent
}

/** Intent: close the sheet with `Done`; focus returns to `opener`. */
export async function closeWithDone(page: Page, opener = footerYourData(page)): Promise<void> {
  await sheetButton(page, 'Done').click()
  await expect(yourDataSheet(page)).toHaveCount(0)
  await expect(opener).toBeFocused()
}
