/**
 * Shared helpers for the specs of a Jam session's Review (v3.2 chunks 23a and 25), on the
 * workspace harness (port 4175: fake audio clock, fake MIDI, real generations): a fresh Jam played
 * with a doodle of a given length, then Stopped once phrase 1 sounds; the same Jam kept with its
 * played notes, ready for a reload; and a page-error watch that lets the browser's own log of a
 * refused Jam chunk through.
 */
import { expect, type Page } from '@playwright/test'

import {
  PAST_BARLINE,
  gotoJamIdle,
  jamGrid,
  playDoodle,
  startJamByClick,
  untilPhraseOneAnswered,
} from '../session/jam-helpers'
import { sessionAction, sessionState } from '../session/session-helpers'
import { clockTo } from '../session/session-midi-helpers'
import { seedSettings } from '../storage/storage-helpers'
import { reviewTitle } from './review-helpers'
import { keyedRecords, untilKept } from './review-tools-helpers'

/** The sentence a Jam's Review gives when Jam's code could not load. */
export const DOODLE_NOT_LOADED =
  "Your doodle can't be shown: part of the app didn't load. Check that you're online, then open this session again."

/**
 * Intent: from Jam mode's Idle, a fresh Jam with a doodle of `measures` measures (one note on each
 * of its barlines), run until phrase 1 sounds, then Stopped: the Review shows. Returns the tempo
 * the doodle was played at, Jam's.
 */
export async function jamReviewed(page: Page, measures: number): Promise<number> {
  await startJamByClick(page)
  const grid = await jamGrid(page)
  const captureTempo = (await sessionState(page)).sessionTempo
  if (captureTempo === null) throw new Error('no Jam runs')
  await playDoodle(page, grid, measures)
  await clockTo(page, grid.barline(measures) + PAST_BARLINE)
  await untilPhraseOneAnswered(page)
  await clockTo(page, grid.barline(measures + 2) + 1)
  expect((await sessionState(page)).phase).toBe('running')
  await sessionAction(page).click()
  await expect(reviewTitle(page)).toBeVisible()
  return captureTempo
}

/**
 * Intent: a fresh Jam with a two-measure doodle, its raw doodle notes kept, reviewed then kept,
 * ready for the page to be reloaded in session mode with Jam's code not loaded in that visit.
 * Returns the tempo the doodle was played at.
 */
export async function keptJamAfterReload(page: Page): Promise<number> {
  await gotoJamIdle(page)
  await seedSettings(page, { keepPlayedNotes: true })
  await gotoJamIdle(page)
  const captureTempo = await jamReviewed(page, 2)
  await untilKept(page, 1)
  await expect.poll(async () => (await keyedRecords(page, 'playedNotes')).length).toBe(1)
  return captureTempo
}

/** Intent: like `watchPageErrors`, but letting through console errors matching `allowed`. */
export function watchPageErrorsBut(page: Page, allowed: RegExp): () => void {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' && !allowed.test(message.text()))
      errors.push(`console: ${message.text()}`)
  })
  return () => expect(errors, `Unexpected page errors:\n${errors.join('\n')}`).toEqual([])
}
