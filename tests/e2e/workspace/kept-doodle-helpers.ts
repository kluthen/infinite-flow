/**
 * Shared helpers for the kept-doodle specs (v3.2 chunk 24), on the workspace harness's fake audio
 * clock and fake MIDI access: a fresh Jam played to phrase 1 and Stopped, its Review closed so Jam
 * mode keeps the doodle, `jam-bar` and its `New doodle`, Jam's staff for the kept doodle's phrase 1
 * (in sight at Jam mode's Idle only), phrase 1's attempts read from the harness's record of
 * generation requests, its first note, the start marker on it, and the Review's doodle section.
 */
import { expect, type Locator, type Page } from '@playwright/test'

import { reviewPanel, reviewTitle } from '../review/review-helpers'
import { jamToRunning, startJamByClick } from '../session/jam-helpers'
import { sessionAction } from '../session/session-helpers'
import { expectedNotesOf, noteKey, type ExpectedNoteAt } from '../session/session-midi-helpers'

/** `jam-bar`'s sentence. */
export const KEPT_SENTENCE =
  'Jamming again on your doodle: phrase 1 continues it. Leaving Jam mode lets it go.'

/** Intent: the kept doodle's bar, between the score toolbar and the cue row. */
export function jamBar(page: Page): Locator {
  return page.locator('.score-panel > .jam-bar')
}

/** Intent: `jam-bar`'s own sentence. */
export function jamBarSentence(page: Page): Locator {
  return jamBar(page).locator(':scope > p')
}

/** Intent: `jam-bar`'s `New doodle`. */
export function newDoodleButton(page: Page): Locator {
  return jamBar(page).getByRole('button', { name: 'New doodle', exact: true })
}

/**
 * Intent: Jam's staff for the kept doodle's phrase 1, at Jam mode's Idle: the one staff frame in
 * sight that is not `staff-jam` (session mode's is out of sight in Jam mode).
 */
export function keptFrame(page: Page): Locator {
  return page.locator(
    '.score-panel > div > .staff-viewport:not(.is-out-of-sight) > .staff-frame:not(.staff-jam)',
  )
}

/** Intent: `staff-jam`'s viewport, Jam's empty system's. */
export function jamViewport(page: Page): Locator {
  return page
    .locator('.score-panel .staff-viewport')
    .filter({ has: page.locator(':scope > .staff-frame.staff-jam') })
}

/** Intent: the Review's doodle section. */
export function reviewDoodle(page: Page): Locator {
  return reviewPanel(page).locator('section.review-doodle')
}

/** Intent: how many `generate` calls the page has made since it loaded. */
export async function generationCount(page: Page): Promise<number> {
  return (await page.evaluate(() => window.__workspaceHarness.generationRequests())).length
}

/**
 * Intent: how many of the `generate` calls made after the first `from` are Idle attempts at
 * phrase 1: those carrying no abort signal (a session's look-ahead and a background attempt carry
 * one).
 */
export async function phraseOneCallsSince(page: Page, from: number): Promise<number> {
  const requests = await page.evaluate(() => window.__workspaceHarness.generationRequests())
  return requests.slice(from).filter((request) => !request.signal).length
}

/** Phrase 1 written at Jam mode's Idle from the kept doodle: its seed, timeline and first note. */
export interface KeptPhraseOne {
  readonly seed: number
  readonly timeline: string
  readonly first: ExpectedNoteAt
}

/**
 * Intent: the latest phrase 1 answered at Idle among the `generate` calls made after the first
 * `from`: answered, carrying no abort signal (a session's look-ahead and a background attempt
 * carry one).
 */
export async function keptPhraseOneSince(page: Page, from: number): Promise<KeptPhraseOne> {
  const requests = await page.evaluate(() => window.__workspaceHarness.generationRequests())
  const answered = requests
    .slice(from)
    .filter((request) => !request.signal && request.timeline !== null)
  const last = answered.at(-1)
  if (last === undefined || last.timeline === null) throw new Error('no phrase 1 was written')
  const [first] = expectedNotesOf(last.timeline, 1, 0)
  if (first === undefined) throw new Error('phrase 1 has no attacked note')
  return { seed: last.seed, timeline: last.timeline, first }
}

/**
 * Intent: from Jam mode's Idle with no doodle kept, a fresh Jam on a one-measure doodle run into
 * phrase 1, then Stopped: its Review shows.
 */
export async function freshJamReviewed(page: Page): Promise<void> {
  await startJamByClick(page)
  await jamToRunning(page)
  await sessionAction(page).click()
  await expect(reviewTitle(page)).toBeVisible()
}

/** Intent: wait until the kept doodle's phrase 1 is Ready at Jam mode's Idle, `Start Jam` enabled. */
export async function untilKeptPhraseOneReady(page: Page): Promise<void> {
  await expect(keptFrame(page)).toHaveClass(/staff-ready/, { timeout: 30_000 })
  await expect(sessionAction(page)).toHaveText('Start Jam')
  await expect(sessionAction(page)).toBeEnabled()
}

/** Intent: `Close review`, then wait until the kept doodle's phrase 1 is Ready at Jam's Idle. */
export async function closeReview(page: Page): Promise<void> {
  await expect(sessionAction(page)).toHaveText('Close review')
  await sessionAction(page).click()
  await expect(reviewPanel(page)).toHaveCount(0)
  await untilKeptPhraseOneReady(page)
}

/**
 * Intent: whether the kept staff's one start marker stands over `first`'s notehead: its centre
 * between the notehead's left and right edges.
 */
export function markerOverNote(page: Page, first: ExpectedNoteAt): Promise<boolean> {
  return keptFrame(page).evaluate((frame, key) => {
    const markers = frame.querySelectorAll('.start-note-marker')
    const head = frame.querySelector(`[data-note-id="${key}"][data-note-part="notehead"]`)
    if (markers.length !== 1 || head === null) return false
    const marker = markers[0]!.getBoundingClientRect()
    const box = head.getBoundingClientRect()
    const centre = (marker.left + marker.right) / 2
    return centre >= box.left && centre <= box.right
  }, noteKey(first.identity))
}
