/**
 * Shared helpers for the last-session Review specs (chunk 20), on the workspace harness (port
 * 4175) with its fake audio clock and fake MIDI access: the Review's parts, a session run to a
 * given phrase and ended with Stop, the phrase the hidden staff holds at Idle, the exports'
 * downloads (the generated notes and, from v2.1, the played notes), and one fixed MIDI session
 * (with or without played notes, on a fixed wall clock) exported in every format.
 */
import { readFile } from 'node:fs/promises'

import { expect, type Download, type Locator, type Page } from '@playwright/test'

import { harnessSnapshot } from '../release/harness-helpers'
import { toBarline, untilReady } from '../session/rolling-helpers'
import {
  cueRow,
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
} from '../session/session-helpers'
import {
  KEYS,
  clockTo,
  connectDevice,
  expectedNotesOf,
  idleTimeline,
  noteOff,
  noteOn,
  phraseStartsAt,
  tap,
} from '../session/session-midi-helpers'

/** The Review's title, which a session end once phrase 1 has sounded shows. */
export const REVIEW_TITLE = 'Last session'

/** Intent: the Review panel, in the staff area's place. */
export function reviewPanel(page: Page): Locator {
  return page.locator('.score-panel > section.review-panel')
}

/** Intent: the Review's `review-title` heading. */
export function reviewTitle(page: Page): Locator {
  return reviewPanel(page).locator('h2.review-title')
}

/** Intent: the Review's list items, one per phrase, in order. */
export function reviewItems(page: Page): Locator {
  return reviewPanel(page).locator('ol.review-list > li.review-phrase')
}

/** Intent: the cue row's `Review last session` link. */
export function reviewLink(page: Page): Locator {
  return cueRow(page).locator('button.review-link')
}

/** Intent: the hidden staff's viewport, out of sight while the Review shows. */
export function staffViewport(page: Page): Locator {
  return page.locator('.score-panel > .staff-viewport')
}

/** Intent: the Review's `Export generated notes` button, in the generated-notes group. */
export function exportButton(page: Page): Locator {
  return reviewPanel(page).locator('.review-export > button.review-export-action')
}

/**
 * Intent: the Review's `Export played notes` button, after the generated-notes group (rendered
 * only when the session holds a played note).
 */
export function exportPlayedButton(page: Page): Locator {
  return reviewPanel(page).locator('.review-actions > button.review-export-action')
}

/** Intent: the Review's `Played notes` switch (rendered only with a played note in the session). */
export function playedNotesToggle(page: Page): Locator {
  return reviewPanel(page)
    .locator('.review-view')
    .getByRole('button', { name: 'Played notes', exact: true })
}

/** Intent: the Review's `Keep my played notes` switch (rendered only with a played note). */
export function keepPlayedNotesToggle(page: Page): Locator {
  return reviewPanel(page).locator('.review-view').getByRole('button', {
    name: 'Keep my played notes',
    exact: true,
  })
}

/** Intent: the Review's `Delete played notes` button (only when its played notes are kept). */
export function deletePlayedNotesButton(page: Page): Locator {
  return reviewPanel(page).locator('.review-view').getByRole('button', {
    name: 'Delete played notes',
    exact: true,
  })
}

/** Intent: the Review's export error. */
export function exportError(page: Page): Locator {
  return reviewPanel(page).locator('.review-export-error')
}

/** Intent: one of the export's Format options, `MusicXML` or `MIDI`. */
export function formatOption(page: Page, label: 'MusicXML' | 'MIDI'): Locator {
  return reviewPanel(page)
    .getByRole('radiogroup', { name: 'Format' })
    .getByRole('radio', { name: label, exact: true })
}

/** Intent: the export's `Backing track` toggle (rendered only while MIDI is picked). */
export function backingTrackToggle(page: Page): Locator {
  return reviewPanel(page).getByRole('button', { name: 'Backing track', exact: true })
}

/**
 * Intent: with a session running, play on until phrase `lastSounded` has started sounding, each
 * phrase readied before the clock passes its deadline (phrase 2's is phrase 1's start) so none is
 * a repeat unless forced, and the next one readied too, so it is drawn as read-ahead without ever
 * sounding.
 */
export async function playUntilPhrase(page: Page, lastSounded: number): Promise<void> {
  await untilReady(page, 2)
  for (let phrase = 1; phrase <= lastSounded; phrase += 1) {
    await untilReady(page, phrase)
    await toBarline(page, phrase, 0)
  }
  await untilReady(page, lastSounded + 1)
}

/**
 * Intent: start a session from Ready (phrase 1 seeded with `seed`), play until phrase
 * `lastSounded` has started sounding with the next one only read ahead, run `beforeStop`, then
 * Stop: the Review opens. Returns phrase 1's concert timeline.
 */
export async function sessionEndedAfter(
  page: Page,
  lastSounded: number,
  seed = 7,
  beforeStop: () => Promise<void> = async () => {},
): Promise<string | null> {
  await readyToStart(page, seed)
  const phraseOne = (await harnessSnapshot(page)).timeline
  await startSession(page)
  await playUntilPhrase(page, lastSounded)
  await beforeStop()
  await sessionAction(page).click()
  await expectReviewShowing(page, lastSounded)
  return phraseOne
}

/**
 * Intent: assert the Review shows for `phraseCount` phrases: the controller's Review showing, the
 * panel titled, `Close review` in the session action's slot, primary and focused.
 */
export async function expectReviewShowing(page: Page, phraseCount: number): Promise<void> {
  await expect(reviewTitle(page)).toHaveText(REVIEW_TITLE)
  await expect(sessionAction(page)).toHaveText('Close review')
  await expect(sessionAction(page)).toHaveClass(/btn-primary/)
  await expect(sessionAction(page)).toBeEnabled()
  await expect(sessionAction(page)).toBeFocused()
  const state = await sessionState(page)
  expect(state.phase).toBe('idle')
  expect(state.review).toEqual({ showing: true, phraseCount })
  expect(state.lastEnd?.soundedPhraseCount).toBe(phraseCount)
}

/** Intent: wait until the hidden staff is in Ready again, with a phrase drawn at Idle. */
export async function expectIdleReady(page: Page): Promise<void> {
  await expect
    .poll(async () => (await harnessSnapshot(page)).operation, { timeout: 30_000 })
    .toBe('idle')
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/, { timeout: 30_000 })
}

/** Every download the page starts, in order, from when `collectDownloads` is called. */
export interface Downloads {
  readonly all: Download[]
}

/** Intent: collect every download the page starts from now on. */
export function collectDownloads(page: Page): Downloads {
  const all: Download[] = []
  page.on('download', (download) => all.push(download))
  return { all }
}

/** One finished download: its suggested file name and its bytes. */
export interface DownloadedFile {
  readonly fileName: string
  readonly bytes: Buffer
}

/**
 * Intent: click `button`, `Export generated notes` unless another is given, once and wait for the
 * action to finish: exactly one file built by the export and exactly one download started, read
 * back whole.
 */
export async function exportOnce(
  page: Page,
  downloads: Downloads,
  button: Locator = exportButton(page),
): Promise<DownloadedFile> {
  const builtBefore = await exportsBuilt(page)
  const downloadsBefore = downloads.all.length
  const download = page.waitForEvent('download')
  await button.click()
  const started = await download
  await expect(button).toBeEnabled()
  await expect(button).not.toHaveClass(/is-loading/)
  expect(await exportsBuilt(page)).toBe(builtBefore + 1)
  expect(downloads.all.length).toBe(downloadsBefore + 1)
  const path = await started.path()
  return { fileName: started.suggestedFilename(), bytes: await readFile(path) }
}

/** Intent: how many files the Review's export has built since the page loaded. */
export function exportsBuilt(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.exportsBuilt())
}

/** The session's start on the wall clock: 2026-10-02 14:03:05 UTC, 16:03:05 in Paris. */
export const STARTED_AT = Date.UTC(2026, 9, 2, 14, 3, 5)
/**
 * The export files' name stem for `STARTED_AT`, in a spec run with `timezoneId: 'Europe/Paris'`:
 * every file of the session starts with it, then names its content (`-generated`, `-played`).
 */
export const STEM = 'infinite-flow-2026-10-02-160305'

/** Intent: fix the wall clock the next session's history reads its start from, at `STARTED_AT`. */
export function fixWallClock(page: Page): Promise<void> {
  return page.evaluate((at) => window.__workspaceHarness.setWallClock(at), STARTED_AT)
}

/** How long each note `reviewOfSession` plays is held: 100 ms, so none is very short (38 ms). */
export const HELD_NOTE_SECONDS = 0.1

/**
 * Intent: a note held `seconds` from audio time `at` (now by default), released by `before` at the
 * latest (the next note's onset: the controller keeps its messages' times in order). Its note-off
 * is timestamped ahead of the fake clock, which places it there.
 */
async function hold(
  page: Page,
  pitch: number,
  seconds: number,
  at?: number,
  before = Number.POSITIVE_INFINITY,
): Promise<void> {
  if (seconds === 0) {
    await tap(page, KEYS, pitch, at)
    return
  }
  const onset = await noteOn(page, KEYS, pitch, at === undefined ? {} : { at })
  await noteOff(page, KEYS, pitch, Math.min(onset + seconds, before))
}

/**
 * Intent: on a fresh page (at `size`, the desktop one unless given) with the keyboard connected
 * and the wall clock fixed, run the same session (phrase 1 seeded 7, Start clicked, Stop once
 * phrase 2 sounds), playing notes into it (one right, two wrong, the first two each exactly on a
 * written note's onset), each held `heldSeconds` (0: taps, all three very short), or none; the
 * Review shows.
 */
export async function reviewOfSession(
  page: Page,
  playNotes: boolean,
  size?: { readonly width: number; readonly height: number },
  heldSeconds = HELD_NOTE_SECONDS,
): Promise<void> {
  await gotoSessionHarness(page, size)
  await fixWallClock(page)
  await connectDevice(page, KEYS)
  await readyToStart(page, 7)
  const phraseOne = await idleTimeline(page)
  await startSession(page)
  if (playNotes) {
    await untilReady(page, 2)
    const [first, second] = expectedNotesOf(phraseOne, 1, await phraseStartsAt(page, 1))
    if (first === undefined || second === undefined) throw new Error('phrase 1 has two notes')
    await clockTo(page, first.onsetAt)
    await hold(page, first.pitch, heldSeconds, first.onsetAt, second.onsetAt)
    await clockTo(page, second.onsetAt)
    await hold(page, second.pitch + 1, heldSeconds, second.onsetAt)
  }
  await playUntilPhrase(page, 2)
  if (playNotes) await hold(page, 30, heldSeconds)
  await sessionAction(page).click()
  await expectReviewShowing(page, 2)
  const played = ((await sessionState(page)).lastHistoryPhrases ?? []).flatMap(
    (phrase) => phrase.playedNotes,
  )
  expect(played.length).toBe(playNotes ? 3 : 0)
}

/** The three files a Review exports: MusicXML, MIDI, and MIDI with the backing track. */
export interface ExportedFiles {
  readonly musicXml: Buffer
  readonly midi: Buffer
  readonly midiWithBacking: Buffer
}

/** Intent: pick a format in the export's Format control. */
export async function pickFormat(page: Page, label: 'MusicXML' | 'MIDI'): Promise<void> {
  await formatOption(page, label).click()
  await expect(formatOption(page, label)).toHaveAttribute('aria-checked', 'true')
}

/**
 * Intent: from a Review at the first-load export settings, export MusicXML, then MIDI, then MIDI
 * with the backing track, each twice, checking each pair is byte-identical and named from `STEM`.
 */
export async function exportEach(page: Page, downloads: Downloads): Promise<ExportedFiles> {
  await expect(formatOption(page, 'MusicXML')).toHaveAttribute('aria-checked', 'true')
  await expect(backingTrackToggle(page)).toHaveCount(0)
  const twice = async (fileName: string): Promise<Buffer> => {
    const first = await exportOnce(page, downloads)
    const second = await exportOnce(page, downloads)
    expect(first.fileName).toBe(fileName)
    expect(second.fileName).toBe(fileName)
    expect(second.bytes.equals(first.bytes), `${fileName} exported twice`).toBe(true)
    return first.bytes
  }
  const musicXml = await twice(`${STEM}-generated.musicxml`)

  await pickFormat(page, 'MIDI')
  await expect(backingTrackToggle(page)).toHaveAttribute('aria-pressed', 'false')
  const midi = await twice(`${STEM}-generated.mid`)

  await backingTrackToggle(page).click()
  await expect(backingTrackToggle(page)).toHaveAttribute('aria-pressed', 'true')
  const midiWithBacking = await twice(`${STEM}-generated.mid`)
  return { musicXml, midi, midiWithBacking }
}
