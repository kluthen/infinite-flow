/**
 * v2.1 chunk 23, the Review's played-notes lanes, on the workspace harness's fake audio clock and
 * fake keyboard (port 4175), after a session with three played notes (two in phrase 1, each
 * exactly on a written note's onset, one in phrase 2): `Played notes` on adds one lane under each
 * system position of every phrase, with a bar per played note, all one colour, placed on the staff's
 * own time axis (a note played on a written note's beat starts right under its notehead), the
 * staff itself unchanged; off removes every lane; the state holds across `Close review` and
 * `Review last session`; the phone's split layout has two lanes per phrase, named for their bars;
 * and nothing in the Review turns scroll anchoring off. From v3.0 (chunk 25), a session whose every
 * played note is very short (three taps): the played-notes tools show, the lanes hold no bar, and
 * `Export played notes` is disabled with its reason until `Include very short notes` is turned on,
 * which holds across Reviews and a later session and is off again after a reload.
 */
import { expect, test, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import { PHONE, sessionAction, sessionState } from '../session/session-helpers'
import { KEYS, expectedNotesOf, tap } from '../session/session-midi-helpers'
import {
  STEM,
  collectDownloads,
  exportError,
  exportOnce,
  exportPlayedButton,
  includeVeryShortNotesToggle,
  playedNotesToggle,
  reviewItems,
  reviewLink,
  reviewOfSession,
  reviewPanel,
  reviewTitle,
  sessionEndedAfter,
} from './review-helpers'
import { smfNoteOns } from './smf-note-ons'

/** The reason `Export played notes` is disabled while every played note is very short. */
const EVERY_NOTE_VERY_SHORT =
  'Every note you played is very short. Turn on Include very short notes to export them.'

// The export file names (unused here) and the wall clock follow the Review specs' zone.
test.use({ timezoneId: 'Europe/Paris' })

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/**
 * Intent: wait until every phrase of the Review holds its engraving, bringing each into view in
 * turn (a short phone window engraves only the phrases near it), then back to the top.
 */
async function expectAllEngraved(page: Page, phraseCount: number): Promise<void> {
  await expect(reviewItems(page)).toHaveCount(phraseCount)
  for (let index = 0; index < phraseCount; index += 1) {
    await reviewItems(page).nth(index).scrollIntoViewIfNeeded()
    await expect(
      reviewItems(page).nth(index).locator('[data-system-position] svg').first(),
    ).toBeAttached({ timeout: 30_000 })
  }
  await reviewItems(page).first().scrollIntoViewIfNeeded()
}

/** Intent: the played notes the history holds per phrase, in phrase order. */
async function playedNotesPerPhrase(page: Page) {
  const phrases = (await sessionState(page)).lastHistoryPhrases
  if (phrases === null) throw new Error('No session history.')
  return phrases
}

/** Intent: every system position's markup, phrase by phrase, top first. */
function staffMarkup(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll('.review-panel .review-staff > [data-system-position]'),
      (position) => position.innerHTML,
    ),
  )
}

/** One lane as measured on screen, with the system position it follows. */
interface MeasuredLane {
  readonly label: string | null
  readonly role: string | null
  readonly tabIndex: number
  readonly text: string
  readonly gapPx: number
  readonly marginPx: number
  readonly lane: { readonly left: number; readonly width: number }
  readonly position: { readonly left: number; readonly width: number }
  readonly svg: { readonly left: number; readonly right: number }
  readonly bars: readonly { readonly left: number; readonly right: number; readonly bg: string }[]
}

/** Intent: measure every lane of phrase `index` (0-based) against the position above it. */
function measureLanes(page: Page, index: number): Promise<MeasuredLane[]> {
  return page.evaluate((itemIndex) => {
    const item = document.querySelectorAll('.review-panel .review-phrase')[itemIndex]
    if (item === undefined) throw new Error(`No review item ${itemIndex}.`)
    return Array.from(item.querySelectorAll<HTMLElement>('.review-staff > .played-notes-lane')).map(
      (lane) => {
        const position = lane.previousElementSibling
        if (position === null || !position.hasAttribute('data-system-position'))
          throw new Error('A lane does not follow a system position.')
        const svg = position.querySelector('svg')
        if (svg === null) throw new Error('A lane follows a blank position.')
        const laneBox = lane.getBoundingClientRect()
        const positionBox = position.getBoundingClientRect()
        const svgBox = svg.getBoundingClientRect()
        return {
          label: lane.getAttribute('aria-label'),
          role: lane.getAttribute('role'),
          tabIndex: lane.tabIndex,
          text: lane.textContent ?? '',
          gapPx: laneBox.top - positionBox.bottom,
          marginPx: Number.parseFloat(getComputedStyle(lane).marginBlockStart),
          lane: { left: laneBox.left, width: laneBox.width },
          position: { left: positionBox.left, width: positionBox.width },
          svg: { left: svgBox.left, right: svgBox.right },
          bars: Array.from(lane.querySelectorAll('.played-note'), (bar) => {
            const box = bar.getBoundingClientRect()
            return { left: box.left, right: box.right, bg: getComputedStyle(bar).backgroundColor }
          }),
        }
      },
    )
  }, index)
}

/**
 * Intent: the screen x of phrase 1's played notes' bars (in record order) and of the noteheads
 * of the written notes they were played on, keyed `<phrase>:<measure>:<event>`.
 */
function barsAndNoteheads(page: Page, keys: readonly string[]) {
  return page.evaluate((noteKeys) => {
    const item = document.querySelectorAll('.review-panel .review-phrase')[0]
    if (item === undefined) throw new Error('No first review item.')
    const bars = Array.from(
      item.querySelectorAll('.played-notes-lane .played-note'),
      (bar) => bar.getBoundingClientRect().left,
    )
    const heads = noteKeys.map((key) => {
      const text = item.querySelector<SVGTextElement>(
        `g[data-note-id="${key}"][data-note-part="notehead"] text`,
      )
      const svg = text?.ownerSVGElement ?? null
      const matrix = text?.getScreenCTM() ?? null
      if (text === null || svg === null || matrix === null)
        throw new Error(`No drawn notehead ${key}.`)
      const point = svg.createSVGPoint()
      point.x = Number(text.getAttribute('x'))
      point.y = Number(text.getAttribute('y'))
      return point.matrixTransform(matrix).x
    })
    return { bars, heads }
  }, keys)
}

/** Intent: the elements of the page (the Review's included) whose overflow-anchor is none. */
function scrollAnchoringOff(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [
      document.documentElement,
      document.body,
      ...document.querySelectorAll('.review-panel, .review-panel *'),
    ]
      .filter((element) => getComputedStyle(element).overflowAnchor === 'none')
      .map((element) => element.tagName + '.' + String(element.getAttribute('class'))),
  )
}

// @test-link [[rule_review_played_notes_toggle]]
// @test-link [[module_review_played_notes_lane]]
// @test-link [[rule_no_grading_or_mismatch_signal]]
test.describe('the Review played-notes lanes', () => {
  // @test-link [[rule_review_played_notes_toggle]]
  // @test-link [[module_review_played_notes_lane]]
  // @test-link [[rule_no_grading_or_mismatch_signal]]
  test('draw every played note under its staff on the staff time axis, one colour, the staff unchanged, and keep their state', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await reviewOfSession(page, true)
    await expectAllEngraved(page, 2)
    const history = await playedNotesPerPhrase(page)
    expect(history.map((phrase) => phrase.playedNotes.length)).toEqual([2, 1])
    await expect(reviewPanel(page).locator('.played-notes-lane')).toHaveCount(0)
    const before = await staffMarkup(page)

    await playedNotesToggle(page).click()
    await expect(playedNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(reviewPanel(page).locator('.played-notes-lane')).toHaveCount(2)
    await expect(reviewPanel(page).locator('.played-note')).toHaveCount(3)
    expect(await staffMarkup(page)).toEqual(before)
    expect(await scrollAnchoringOff(page)).toEqual([])

    const colours = new Set<string>()
    for (const [index, phrase] of history.entries()) {
      const lanes = await measureLanes(page, index)
      expect(lanes).toHaveLength(1)
      const [lane] = lanes
      expect(lane!.label).toBe(`Played notes, phrase ${phrase.phraseNumber}`)
      expect(lane!.role).toBe('img')
      expect(lane!.tabIndex).toBe(-1)
      expect(lane!.text).toBe('')
      // Right under its system, separated by the lane's own margin, across its full width.
      expect(Math.abs(lane!.gapPx - lane!.marginPx)).toBeLessThanOrEqual(1)
      expect(lane!.marginPx).toBeGreaterThan(0)
      expect(Math.abs(lane!.lane.left - lane!.position.left)).toBeLessThanOrEqual(1)
      expect(Math.abs(lane!.lane.width - lane!.position.width)).toBeLessThanOrEqual(1)
      expect(lane!.svg.left).toBeGreaterThanOrEqual(lane!.lane.left - 1)
      expect(lane!.svg.right).toBeLessThanOrEqual(lane!.lane.left + lane!.lane.width + 1)
      expect(lane!.bars).toHaveLength(phrase.playedNotes.length)
      for (const bar of lane!.bars) {
        expect(bar.left).toBeGreaterThanOrEqual(lane!.svg.left)
        expect(bar.right).toBeLessThanOrEqual(lane!.svg.right)
        colours.add(bar.bg)
      }
    }
    expect([...colours]).toHaveLength(1)
    expect([...colours][0]).not.toMatch(/^rgba\(0, 0, 0, 0\)$|^transparent$/u)

    // Phrase 1's two notes were each played exactly on a written note's onset: their bars start
    // right under those noteheads.
    const first = history[0]!
    const written = expectedNotesOf(first.timeline, 1, first.startedAt)
    const keys = first.playedNotes.map((played) => {
      const on = written.find((note) => Math.abs(note.onsetAt - played.onsetAt) < 1e-6)
      if (on === undefined) throw new Error(`No written note at ${played.onsetAt}.`)
      const { phraseNumber, measureIndex, eventIndex } = on.identity
      return `${phraseNumber}:${measureIndex}:${eventIndex}`
    })
    const { bars, heads } = await barsAndNoteheads(page, keys)
    expect(bars).toHaveLength(2)
    bars.forEach((bar, index) => expect(Math.abs(bar - heads[index]!)).toBeLessThanOrEqual(1))

    // Off removes every lane at once; the staff stays as it was.
    await playedNotesToggle(page).click()
    await expect(playedNotesToggle(page)).toHaveAttribute('aria-pressed', 'false')
    await expect(reviewPanel(page).locator('.played-notes-lane')).toHaveCount(0)
    expect(await staffMarkup(page)).toEqual(before)

    // On again, then Close review and Review last session: the switch and the lanes stay on.
    await playedNotesToggle(page).click()
    await expect(reviewPanel(page).locator('.played-notes-lane')).toHaveCount(2)
    await sessionAction(page).click()
    await expect(reviewPanel(page)).toHaveCount(0)
    await reviewLink(page).click()
    await expect(reviewTitle(page)).toBeFocused()
    await expect(playedNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(reviewPanel(page).locator('.played-notes-lane')).toHaveCount(2)
    await expectAllEngraved(page, 2)
    await expect(reviewPanel(page).locator('.played-note')).toHaveCount(3)
  })

  // @test-link [[rule_review_played_notes_toggle]]
  // @test-link [[module_review_played_notes_lane]]
  test('give each split-layout phrase on a landscape phone two lanes, named for their bars', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await reviewOfSession(page, true, PHONE)
    await expectAllEngraved(page, 2)
    await playedNotesToggle(page).click()
    await expect(playedNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')

    for (const index of [0, 1]) {
      const n = index + 1
      const lanes = await measureLanes(page, index)
      expect(lanes.map((lane) => lane.label)).toEqual([
        `Played notes, phrase ${n}, bars 1–2`,
        `Played notes, phrase ${n}, bars 3–4`,
      ])
      for (const lane of lanes) {
        expect(lane.role).toBe('img')
        expect(Math.abs(lane.gapPx - lane.marginPx)).toBeLessThanOrEqual(1)
        expect(Math.abs(lane.lane.width - lane.position.width)).toBeLessThanOrEqual(1)
      }
    }
    await expect(reviewPanel(page).locator('.played-note')).not.toHaveCount(0)
    expect(await scrollAnchoringOff(page)).toEqual([])
  })
})

/**
 * Intent: `Export played notes` is disabled, named by its field note giving the very-short reason,
 * while `Include very short notes` is off.
 */
async function expectDisabledForVeryShortNotes(page: Page): Promise<void> {
  await expect(includeVeryShortNotesToggle(page)).toHaveAttribute('aria-pressed', 'false')
  await expect(exportPlayedButton(page)).toBeDisabled()
  await expect(exportPlayedButton(page)).toHaveAccessibleDescription(EVERY_NOTE_VERY_SHORT)
  await expect(reviewPanel(page).locator('.review-export-played > .field-note')).toHaveText(
    EVERY_NOTE_VERY_SHORT,
  )
}

// @test-link [[rule_stray_notes_filtered_on_reading]]
// @test-link [[rule_played_notes_export_omits_stray_notes]]
test.describe('a session whose every played note is very short', () => {
  // @test-link [[rule_stray_notes_filtered_on_reading]]
  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  // @test-link [[module_review_played_notes_lane]]
  test('keeps its played-notes tools, draws no bar, and exports only with Include very short notes, held for the page visit', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const downloads = collectDownloads(page)
    await reviewOfSession(page, true, undefined, 0)
    const played = ((await sessionState(page)).lastHistoryPhrases ?? []).flatMap(
      (phrase) => phrase.playedNotes,
    )
    expect(played.map((note) => note.releaseAt - note.onsetAt)).toEqual([0, 0, 0])

    // The tools show; the lanes draw no bar.
    await expect(exportPlayedButton(page)).toBeVisible()
    await playedNotesToggle(page).click()
    await expectAllEngraved(page, 2)
    await expect(reviewPanel(page).locator('.played-notes-lane')).toHaveCount(2)
    await expect(reviewPanel(page).locator('.played-note')).toHaveCount(0)
    await expectDisabledForVeryShortNotes(page)

    // Turning the option on enables the export at once, focus staying on the toggle.
    await includeVeryShortNotesToggle(page).focus()
    await page.keyboard.press('Enter')
    await expect(includeVeryShortNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(exportPlayedButton(page)).toBeEnabled()
    await expect(includeVeryShortNotesToggle(page)).toBeFocused()
    await expect(reviewPanel(page).locator('.review-export-played > .field-note')).toHaveCount(0)
    const file = await exportOnce(page, downloads, exportPlayedButton(page))
    expect(file.fileName).toBe(`${STEM}-played.mid`)
    expect(smfNoteOns(file.bytes)).toHaveLength(3)
    await expect(exportError(page)).toHaveCount(0)

    // Held across Close review and Review last session, then into a later session's Review.
    await sessionAction(page).click()
    await reviewLink(page).click()
    await expect(includeVeryShortNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')
    await sessionAction(page).click()
    await sessionEndedAfter(page, 1, 7, async () => {
      await tap(page, KEYS, 30)
    })
    await expect(includeVeryShortNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(exportPlayedButton(page)).toBeEnabled()

    // A new page load starts with it off again.
    await reviewOfSession(page, true, undefined, 0)
    await expectDisabledForVeryShortNotes(page)
    await expect(exportError(page)).toHaveCount(0)
  })
})
