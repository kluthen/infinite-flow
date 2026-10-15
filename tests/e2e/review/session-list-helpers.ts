/**
 * Shared helpers for the session list spec (v3.0 chunk 14b), on the workspace harness (port 4175)
 * with its fake audio clock, over the browser's real IndexedDB: the list's parts and rows, the cue
 * row's `sessions-link` and the Review's `All sessions`, sessions played on a fixed wall clock so
 * each start (and so each row's date) is known, the session date as the page writes it, each row's
 * text as the design writes it from the session's stored facts, and the storage seams the list's
 * cases need (a session copied, as this version or a newer one wrote it; a refused body read).
 */
import { expect, type Locator, type Page } from '@playwright/test'

import { expectIdleReady, reviewPanel } from './review-helpers'
import { keyedRecords, NOT_PINNED, playSession } from './review-tools-helpers'
import { cueRow, sessionAction } from '../session/session-helpers'

/** The start of the `n`th session a spec plays or seeds: 10:05 UTC on October `n + 1`, 2026. */
export function startAt(n: number): number {
  return Date.UTC(2026, 9, n + 1, 10, 5)
}

/** A row's note, for a session saved by a newer version of the app. */
export const NEWER_NOTE =
  'This session was saved by a newer version of the app. Reload the page to open it.'
/** A row's note after its opening failed, saving on. */
export const FAILED_NOTE = "This session couldn't be opened. Try again, or delete it."
/** The list's empty state, saving on. */
export const EMPTY = 'No sessions are kept. Your next session will be kept here.'

/** Intent: the session list, in the Review's place. */
export function sessionsPanel(page: Page): Locator {
  return page.locator('.score-panel section.sessions-panel')
}

/** Intent: the list's title, "All sessions". */
export function listTitle(page: Page): Locator {
  return sessionsPanel(page).locator('h2.review-title')
}

/** Intent: the list's rows, newest first. */
export function rows(page: Page): Locator {
  return sessionsPanel(page).locator('ol.session-list > li.session-row')
}

/** Intent: the row whose title starts with `date`. */
export function rowOf(page: Page, date: string): Locator {
  return rows(page).filter({
    has: page.locator('button.session-row-open', { hasText: date }),
  })
}

/** Intent: the title button of the row of `date`. */
export function rowOpen(page: Page, date: string): Locator {
  return rowOf(page, date).locator('button.session-row-open')
}

/** Intent: the row action of `date` named `verb` (`Pin`, `Unpin` or `Delete`) by its label. */
export function rowAction(page: Page, date: string, verb: 'Pin' | 'Unpin' | 'Delete'): Locator {
  return rowOf(page, date).getByRole('button', { name: `${verb} session ${date}`, exact: true })
}

/** Intent: the cue row's `sessions-link`, "All sessions". */
export function sessionsLink(page: Page): Locator {
  return cueRow(page).locator('button.sessions-link')
}

/** Intent: the Review's `All sessions`, its first row. */
export function allSessions(page: Page): Locator {
  return reviewPanel(page).locator('.review-nav').getByRole('button', { name: 'All sessions' })
}

/** Intent: the session date the page writes for a start, with the browser's locale and zone. */
export function sessionDateOf(page: Page, startedAt: number): Promise<string> {
  return page.evaluate(
    (at) =>
      new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(at),
    startedAt,
  )
}

/** Intent: the key of the kept session that started at `startedAt`, once it is stored. */
export async function keyStartedAt(page: Page, startedAt: number): Promise<string> {
  /** Intent: the key stored with that start, if any yet. */
  const find = async (): Promise<string | undefined> =>
    (await keyedRecords(page, 'sessionSummaries')).find(
      ({ value }) => (value as { startedAt?: unknown }).startedAt === startedAt,
    )?.key
  await expect.poll(find).toBeDefined()
  return (await find())!
}

/**
 * Intent: leave the review mode if it shows, then play a two-phrase session started at
 * `startedAt` on the wall clock, then Stop: the Review shows.
 */
export async function sessionAt(page: Page, startedAt: number): Promise<void> {
  if ((await sessionAction(page).textContent())?.trim() === 'Close review') {
    await expectIdleReady(page)
    await sessionAction(page).click()
    await expect(sessionAction(page)).toHaveText('Start session')
  }
  await page.evaluate((at) => window.__workspaceHarness.setWallClock(at), startedAt)
  await playSession(page)
}

/** Intent: show the list from the cue row; focus lands on its title. */
export async function showListFromCueRow(page: Page): Promise<void> {
  await sessionsLink(page).click()
  await expect(listTitle(page)).toBeFocused()
}

/** Intent: refuse (or stop refusing) each read of a kept session's body, through the seam. */
export function refuseKeptReads(page: Page, on: boolean): Promise<void> {
  return page.evaluate(
    (value) => window.__workspaceHarness.storage.refuseKeptSessionReads(value),
    on,
  )
}

/** Intent: copy the kept session under `from` under `key`, started at `startedAt`, maybe newer. */
export function seedCopy(
  page: Page,
  from: string,
  key: string,
  copy: { readonly startedAt: number; readonly newer: boolean },
): Promise<void> {
  return page.evaluate(
    ([source, target, options]) =>
      window.__workspaceHarness.storage.seedKeptSessionCopy(source, target, options),
    [from, key, copy] as const,
  )
}

/** What one row shows: its title, each paragraph as `class: text`, each action as `text [label]`. */
export interface ShownRow {
  readonly title: string
  readonly openDisabled: boolean
  readonly lines: readonly string[]
  readonly actions: readonly string[]
}

/** Intent: what every row of the list shows, in order. */
export function shownRows(page: Page): Promise<ShownRow[]> {
  return rows(page).evaluateAll((items) =>
    items.map((item) => {
      /** Intent: an element's text, trimmed. */
      const text = (element: Element): string => (element.textContent ?? '').trim()
      const open = item.querySelector<HTMLButtonElement>('button.session-row-open')
      return {
        title: open === null ? '' : text(open),
        openDisabled: open?.disabled ?? false,
        lines: [...item.querySelectorAll('p')].map((p) => `${p.className}: ${text(p)}`),
        actions: [...item.querySelectorAll('.session-row-actions button')].map(
          (button) => `${text(button)} [${button.getAttribute('aria-label') ?? ''}]`,
        ),
      }
    }),
  )
}

/** The stored facts a row is written from. */
export interface StoredSummary {
  readonly lengthSeconds: number
  readonly phraseCount: number
  readonly instrument: { readonly displayName: string }
  readonly musicalProfile: { readonly musicalProfile: string; readonly isCustom: boolean }
  readonly favoritesCount: number
  readonly playedNotesKept: boolean
  readonly pinned: boolean
  readonly comment: string
}

/** Intent: the session-wide record stored under `key`. */
export async function storedSummary(page: Page, key: string): Promise<StoredSummary> {
  const record = (await keyedRecords(page, 'sessionSummaries')).find((entry) => entry.key === key)
  if (record === undefined) throw new Error(`no session-wide record under "${key}"`)
  return record.value as StoredSummary
}

/** Intent: the detail and status lines the design writes for `summary`, as `shownRows` gives them. */
export function expectedLines(summary: StoredSummary): string[] {
  const { lengthSeconds, phraseCount, favoritesCount } = summary
  const length = lengthSeconds < 30 ? 'Under 1 min' : `${Math.round(lengthSeconds / 60)} min`
  const profile = summary.musicalProfile.isCustom
    ? `Custom (${summary.musicalProfile.musicalProfile} grammar)`
    : summary.musicalProfile.musicalProfile
  const favorites =
    favoritesCount === 0
      ? 'No favorites'
      : `${favoritesCount} ${favoritesCount === 1 ? 'favorite' : 'favorites'}`
  const phrases = `${phraseCount} ${phraseCount === 1 ? 'phrase' : 'phrases'}`
  return [
    `session-row-meta: ${length} · ${phrases} · ${summary.instrument.displayName} · ${profile}`,
    `session-row-meta: ${[
      favorites,
      ...(summary.playedNotesKept ? ['Played notes kept'] : []),
      summary.pinned ? 'Pinned' : NOT_PINNED,
    ].join(' · ')}`,
  ]
}

/** Intent: the two actions of a row this version reads, as `shownRows` gives them. */
export function expectedActions(date: string, pinned: boolean): string[] {
  const pin = pinned ? 'Unpin' : 'Pin'
  return [`${pin} [${pin} session ${date}]`, `Delete [Delete session ${date}]`]
}
