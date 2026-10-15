/**
 * Shared helpers for the Review's session tools specs (v3.0 chunk 12: favorites, pin and Delete
 * session), on the workspace harness (port 4175) over the browser's real IndexedDB: the kept
 * session's stored records read through the harness's seam, a two-phrase session ended with Stop,
 * and the Review's star, pin button, `Delete session`, keep line and confirmation sheet.
 */
import { expect, type Locator, type Page } from '@playwright/test'

import { expectReviewShowing, playUntilPhrase, reviewPanel } from './review-helpers'
import { readyToStart, sessionAction, startSession } from '../session/session-helpers'

/** One record a store holds, with its key. */
interface KeyedRecord {
  readonly key: string
  readonly value: unknown
}

/** A kept session's stores. */
type KeptStore = 'sessionSummaries' | 'sessionBodies' | 'playedNotes'

export const PINNED = 'Pinned: kept until you unpin or delete it.'
export const NOT_PINNED = 'Not pinned: deleted when your next session is saved.'
export const NOT_SAVED = 'Not saved on this device: export it to keep it.'

/** Intent: every record of a store with its key, read through the harness's seam. */
export function keyedRecords(page: Page, store: KeptStore): Promise<KeyedRecord[]> {
  return page.evaluate((name) => window.__workspaceHarness.storage.keyedRecords(name), store)
}

/** Intent: the changes that reached the storage port since the load (the write spy). */
export function portChanges(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.storage.portChanges())
}

/** Intent: the session-wide record stored under `key`, as a plain object. */
export async function summaryOf(
  page: Page,
  key: string,
): Promise<Record<string, unknown> | undefined> {
  const summaries = await keyedRecords(page, 'sessionSummaries')
  return summaries.find((record) => record.key === key)?.value as Record<string, unknown>
}

/** Intent: the favorite marks of the body stored under `key`, phrase by phrase. */
export async function favoriteMarks(page: Page, key: string): Promise<boolean[] | null> {
  const bodies = await keyedRecords(page, 'sessionBodies')
  const body = bodies.find((record) => record.key === key)?.value as
    { readonly phrases: readonly { readonly favorite: boolean }[] } | undefined
  return body === undefined ? null : body.phrases.map((phrase) => phrase.favorite)
}

/** Intent: wait until exactly `count` kept sessions are stored, and give their keys. */
export async function untilKept(page: Page, count: number): Promise<string[]> {
  await expect.poll(async () => (await keyedRecords(page, 'sessionSummaries')).length).toBe(count)
  return (await keyedRecords(page, 'sessionSummaries')).map((record) => record.key)
}

/** Intent: from Idle, play a two-phrase session seeded `seed`, then Stop: the Review shows. */
export async function playSession(page: Page, seed = 7): Promise<void> {
  await readyToStart(page, seed)
  await startSession(page)
  await playUntilPhrase(page, 2)
  await sessionAction(page).click()
  await expectReviewShowing(page, 2)
}

/** Intent: phrase `n`'s favorite star in the Review. */
export function star(page: Page, n: number): Locator {
  return reviewPanel(page).getByRole('button', { name: `Favorite phrase ${n}`, exact: true })
}

/** Intent: the Review's pin button, whichever it reads. */
export function pinButton(page: Page): Locator {
  return reviewPanel(page).locator('.review-session-tools > button').first()
}

/** Intent: the Review's `Delete session`. */
export function deleteSessionButton(page: Page): Locator {
  return reviewPanel(page).getByRole('button', { name: 'Delete session', exact: true })
}

/** Intent: the Review's keep line. */
export function keepLine(page: Page): Locator {
  return reviewPanel(page).locator('.review-keep-line')
}

/** Intent: the open confirmation sheet. */
export function sheet(page: Page): Locator {
  return page.getByRole('dialog')
}

/** Intent: the open sheet's action named `name`. */
export function sheetAction(page: Page, name: string): Locator {
  return sheet(page).locator('.sheet-actions').getByRole('button', { name, exact: true })
}
