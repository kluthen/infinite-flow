/**
 * v3.2 chunk 23a, the doodle section of a Jam session's Review (`review-doodle`), on the workspace
 * harness (port 4175: fake audio clock, fake MIDI, real generations) over the browser's real
 * IndexedDB; each test from an empty browser context. A fresh Jam is played with a doodle of one,
 * two or four measures (one note on each of its barlines), then Stopped once phrase 1 sounds:
 *
 * - its Review opens with the doodle section before phrase 1: "Your doodle", the tempo the doodle
 *   was played at, no phrase number and no favorite, and the quantized doodle engraved, its top
 *   system named "Your doodle, ..." with its length, holding no expected note;
 * - with Played notes on, a lane "Played notes, your doodle" under it holds a bar per raw doodle
 *   note;
 * - kept, then reopened from the session list after a reload, the doodle section shows again; a
 *   session kept before v3.2 (v3.1's records, seeded through the harness's v3.1 seam) has none;
 * - after a reload, its Review opened in session mode loads Jam's code on demand: "Loading your
 *   doodle." while the code is held on the network, the doodle once it arrives; refused, the
 *   failure sentence in the doodle's place, the rest of the Review working, and the next opening
 *   tries again;
 * - on a landscape phone, a four-measure doodle reserves two system positions and a two-measure
 *   one a single position, none overlapping, each drawing inside its position.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import {
  PAST_BARLINE,
  gotoJamIdle,
  jamGrid,
  playDoodle,
  startJamByClick,
  untilPhraseOneAnswered,
} from '../session/jam-helpers'
import { PHONE, sessionAction, sessionState } from '../session/session-helpers'
import { clockTo } from '../session/session-midi-helpers'
import {
  gotoStorageHarness,
  harnessReady,
  reloadHarness,
  seedSettings,
} from '../storage/storage-helpers'
import {
  gotoHeldLoad,
  releaseHeldLoad,
  seedVersionThree,
  storedSession,
  v31Session,
} from '../storage/kept-session-v1-helpers'
import {
  expectChecked,
  holdJamChunk,
  refuseJamChunk,
  JAM_CHUNK,
} from '../workspace/jam-mode-helpers'
import {
  formatOption,
  playedNotesToggle,
  reviewItems,
  reviewLink,
  reviewPanel,
  reviewTitle,
} from './review-helpers'
import { keyedRecords, untilKept } from './review-tools-helpers'
import { rowOpen, rows, sessionAt, sessionDateOf, showListFromCueRow } from './session-list-helpers'

/** The sentence in the doodle's place while Jam's code loads. */
const LOADING_NOTE = 'Loading your doodle.'

/** The sentence in the doodle's place when Jam's code could not load. */
const FAILED_NOTE =
  "Your doodle can't be shown: part of the app didn't load. Check that you're online, then open this session again."

/** The words a doodle's length is named with, by its measure count. */
const LENGTH_WORDS: Readonly<Record<number, string>> = {
  1: 'one measure',
  2: 'two measures',
  3: 'three measures',
  4: 'four measures',
}

/** The start of the session kept before v3.2: 10:05 UTC on 2 October 2026. */
const V31_STARTED_AT = Date.UTC(2026, 9, 2, 10, 5)

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: the Review's doodle section. */
function doodleSection(page: Page): Locator {
  return reviewPanel(page).locator('section.review-doodle')
}

/** Intent: the doodle section's `review-staff`. */
function doodleStaff(page: Page): Locator {
  return doodleSection(page).locator(':scope > .review-staff')
}

/** Intent: the engraved SVG of the doodle's top system. */
function doodleTopSvg(page: Page): Locator {
  return doodleStaff(page).locator(':scope > [data-system-position="top"] svg')
}

/** Intent: the aria-label the doodle's top system carries for a doodle of `measures` measures. */
function doodleName(measures: number): RegExp {
  return new RegExp(
    `^Your doodle, treble clef, key signature [^,]+ \\([^)]+\\), 4/4 time, ${LENGTH_WORDS[measures]}\\.$`,
    'u',
  )
}

/**
 * Intent: from Jam mode's Idle, a fresh Jam with a doodle of `measures` measures (one note on each
 * of its barlines), run until phrase 1 sounds, then Stopped: the Review shows. Returns the tempo
 * the doodle was played at, Jam's.
 */
async function jamReviewed(page: Page, measures: number): Promise<number> {
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

/** Intent: assert the doodle section's header: its title and tempo, nothing of a phrase. */
async function expectDoodleHeader(page: Page, captureTempo: number): Promise<void> {
  const header = doodleSection(page).locator(':scope > .review-phrase-header')
  await expect(header.locator('h3.review-phrase-title')).toHaveText('Your doodle')
  await expect(header.locator('.review-phrase-tempo')).toHaveText(`${captureTempo} BPM`)
  await expect(doodleSection(page)).toHaveAccessibleName('Your doodle')
  // No phrase number and no favorite: the doodle is not a phrase. `Jam again on this doodle` at
  // the line's trailing end, where per-phrase tools go.
  await expect(header.locator(':scope > *')).toHaveCount(3)
  await expect(header.locator(':scope > button:last-child')).toHaveText('Jam again on this doodle')
  await expect(doodleSection(page).locator('.favorite-toggle')).toHaveCount(0)
}

/** Intent: whether the doodle section comes before the Review's list, outside it. */
function sectionBeforeList(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const section = document.querySelector('.review-panel section.review-doodle')
    const list = document.querySelector('.review-panel ol.review-list')
    if (section === null || list === null) return false
    return (
      section.closest('ol') === null &&
      (section.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
    )
  })
}

/** Intent: assert the doodle is engraved: its top system named for a `measures`-measure doodle. */
async function expectDoodleEngraved(page: Page, measures: number): Promise<void> {
  // A short window engraves only what is near the visible area: bring the doodle into view.
  await doodleSection(page).scrollIntoViewIfNeeded()
  await expect(doodleTopSvg(page)).toBeAttached({ timeout: 30_000 })
  await expect(doodleTopSvg(page)).toHaveAttribute('aria-label', doodleName(measures))
  // The doodle holds no expected note: nothing in it is tagged as one.
  await expect(doodleStaff(page).locator('[data-note-id], [data-note-part]')).toHaveCount(0)
}

// @test-link [[rule_review_opens_with_doodle]]
test.describe("a Jam session's Review opens with its doodle", () => {
  for (const measures of [1, 2, 4] as const) {
    // @test-link [[rule_review_opens_with_doodle]]
    test(`a ${measures}-measure doodle: the section before phrase 1, its tempo, engraved and named with its length`, async ({
      page,
    }) => {
      test.setTimeout(120_000)
      await gotoJamIdle(page)

      const captureTempo = await jamReviewed(page, measures)

      await expect(doodleSection(page)).toHaveCount(1)
      expect(await sectionBeforeList(page)).toBe(true)
      await expectDoodleHeader(page, captureTempo)
      await expectDoodleEngraved(page, measures)
      // One system position from bp-tablet-landscape up, whatever the doodle's length.
      await expect(doodleStaff(page).locator(':scope > [data-system-position]')).toHaveCount(1)
      await expect(doodleStaff(page).locator('.review-phrase-note')).toHaveCount(0)
      // Phrase 1 is still the list's first item, numbered and engraved as before.
      await expect(reviewItems(page).first().locator('.review-staff svg').first()).toBeAttached({
        timeout: 30_000,
      })
    })
  }

  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  test('with Played notes on, a lane under the doodle holds a bar per raw doodle note', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoJamIdle(page)
    await jamReviewed(page, 2)
    await expectDoodleEngraved(page, 2)
    await expect(doodleStaff(page).locator('.played-notes-lane')).toHaveCount(0)

    await playedNotesToggle(page).click()

    await expect(playedNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')
    const lane = doodleStaff(page).locator(':scope > .played-notes-lane')
    await expect(lane).toHaveCount(1)
    await expect(lane).toHaveAttribute('role', 'img')
    await expect(lane).toHaveAccessibleName('Played notes, your doodle')
    // It follows the doodle's system position, and holds the two notes played in the doodle.
    expect(
      await lane.evaluate((element) =>
        element.previousElementSibling?.getAttribute('data-system-position'),
      ),
    ).toBe('top')
    await expect(lane.locator('.played-note')).toHaveCount(2)
    // Nothing was played in the phrases: their lanes hold no bar.
    await expect(reviewItems(page).locator('.played-notes-lane .played-note')).toHaveCount(0)

    await playedNotesToggle(page).click()
    await expect(lane).toHaveCount(0)
  })
})

// @test-link [[rule_review_opens_with_doodle]]
test.describe('a kept session reopened from the session list', () => {
  // @test-link [[rule_review_opens_with_doodle]]
  // @test-link [[rule_jam_code_loaded_on_demand]]
  test('a kept Jam session shows its doodle section again after a reload', async ({ page }) => {
    test.setTimeout(120_000)
    await gotoJamIdle(page)
    const captureTempo = await jamReviewed(page, 2)
    await untilKept(page, 1)

    await reloadHarness(page)
    await expectChecked(page, 'Session')
    await showListFromCueRow(page)
    await expect(rows(page)).toHaveCount(1)
    await rows(page).first().locator('button.session-row-open').click()

    await expect(reviewTitle(page)).toBeFocused()
    await expect(doodleSection(page)).toHaveCount(1)
    expect(await sectionBeforeList(page)).toBe(true)
    await expectDoodleHeader(page, captureTempo)
    await expectDoodleEngraved(page, 2)
  })

  // @test-link [[rule_review_opens_with_doodle]]
  test('a session kept before v3.2 opens as before, with no doodle section', async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000)
    await gotoStorageHarness(page)
    await sessionAt(page, V31_STARTED_AT)
    const [played] = await untilKept(page, 1)
    if (played === undefined) throw new Error('the session was not kept')
    const template = v31Session(await storedSession(page, played))

    // A fresh context: the test's own still holds this version's database.
    const context = await browser.newContext()
    try {
      const fresh = await context.newPage()
      const expectNoFreshErrors = watchPageErrors(fresh)
      await gotoHeldLoad(fresh)
      await seedVersionThree(fresh, template, 1)
      await releaseHeldLoad(fresh)
      await harnessReady(fresh)

      await showListFromCueRow(fresh)
      await rowOpen(fresh, await sessionDateOf(fresh, V31_STARTED_AT)).click()

      await expect(reviewTitle(fresh)).toBeFocused()
      await expect(reviewItems(fresh)).toHaveCount(2)
      await expect(reviewItems(fresh).first().locator('.review-staff svg').first()).toBeAttached({
        timeout: 30_000,
      })
      await expect(doodleSection(fresh)).toHaveCount(0)
      await expect(reviewPanel(fresh).getByText(/doodle/iu)).toHaveCount(0)
      expectNoFreshErrors()
    } finally {
      await context.close()
    }
  })
})

// @test-link [[rule_jam_code_loaded_on_demand]]
test.describe("Jam's code for a kept Jam session's Review, after a reload", () => {
  /**
   * Intent: a fresh Jam with a two-measure doodle, its raw doodle notes kept, reviewed then kept;
   * the page reloaded in session mode, Jam's code not loaded in this visit.
   */
  async function keptJamAfterReload(page: Page): Promise<number> {
    await gotoJamIdle(page)
    await seedSettings(page, { keepPlayedNotes: true })
    await gotoJamIdle(page)
    const captureTempo = await jamReviewed(page, 2)
    await untilKept(page, 1)
    await expect.poll(async () => (await keyedRecords(page, 'playedNotes')).length).toBe(1)
    return captureTempo
  }

  // @test-link [[rule_jam_code_loaded_on_demand]]
  test('shows "Loading your doodle." while the code is on its way, then the doodle', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const captureTempo = await keptJamAfterReload(page)
    const held = await holdJamChunk(page)
    await reloadHarness(page)
    await expectChecked(page, 'Session')

    await reviewLink(page).click()

    await expect(reviewTitle(page)).toBeFocused()
    await expectDoodleHeader(page, captureTempo)
    await expect(doodleStaff(page).locator('.review-phrase-note')).toHaveText(LOADING_NOTE)
    await expect(
      doodleSection(page).getByRole('button', { name: 'Jam again on this doodle' }),
    ).toBeDisabled()
    await expect.poll(held.requests).toBe(1)
    await expect(reviewItems(page).first().locator('.review-staff svg').first()).toBeAttached({
      timeout: 30_000,
    })
    await expect(doodleStaff(page).locator('.review-phrase-note')).toHaveText(LOADING_NOTE)

    await held.release()

    await expectDoodleEngraved(page, 2)
    await expect(doodleStaff(page).locator('.review-phrase-note')).toHaveCount(0)
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  // @test-link [[rule_review_opens_with_doodle]]
  test('refused, the doodle section says so and the rest of the Review works; the next opening tries again', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    // The refused chunk is logged by the browser as a failed resource: the only error allowed.
    expectNoPageErrors = watchPageErrorsBut(page, /ERR_INTERNET_DISCONNECTED/u)
    const captureTempo = await keptJamAfterReload(page)
    await refuseJamChunk(page)
    await reloadHarness(page)
    await expectChecked(page, 'Session')

    await reviewLink(page).click()

    await expectDoodleHeader(page, captureTempo)
    await expect(doodleStaff(page).locator('.review-phrase-note')).toHaveText(FAILED_NOTE)
    await expect(doodleStaff(page).locator('[data-system-position]')).toHaveCount(0)
    // `Jam again on this doodle` disabled, named by the sentence; no suggestion.
    const jamAgain = doodleSection(page).getByRole('button', { name: 'Jam again on this doodle' })
    await expect(jamAgain).toBeDisabled()
    await expect(jamAgain).toHaveAccessibleDescription(FAILED_NOTE)
    await expect(doodleSection(page).locator('.suggestion-row')).toHaveCount(0)
    // The note is never error-toned.
    await expect(
      doodleSection(page).locator('.inline-alert, .alert-error, [role="alert"]'),
    ).toHaveCount(0)
    // The rest of the Review works: phrase 1 engraves, Played notes and the format switch.
    await expect(reviewItems(page)).toHaveCount(1)
    await expect(reviewItems(page).first().locator('.review-staff svg').first()).toBeAttached({
      timeout: 30_000,
    })
    await playedNotesToggle(page).click()
    await expect(playedNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(reviewItems(page).first().locator('.played-notes-lane')).toHaveCount(1)
    await expect(doodleStaff(page).locator('.played-notes-lane')).toHaveCount(0)
    await formatOption(page, 'MIDI').click()
    await expect(formatOption(page, 'MIDI')).toHaveAttribute('aria-checked', 'true')

    // Back online, the next opening of the Review asks for Jam's code again.
    await page.unroute(JAM_CHUNK)
    await sessionAction(page).click()
    await expect(reviewPanel(page)).toHaveCount(0)
    await reviewLink(page).click()
    await expectDoodleEngraved(page, 2)
    await expect(doodleStaff(page).locator(':scope > .played-notes-lane')).toHaveAccessibleName(
      'Played notes, your doodle',
    )
  })
})

/** One box on screen, in CSS px. */
interface Box {
  readonly top: number
  readonly bottom: number
  readonly left: number
  readonly right: number
}

/** What the doodle's staff takes on screen: its positions, their drawings and lanes, the list. */
interface DoodleLayout {
  readonly staff: Box
  readonly positions: readonly { readonly name: string; readonly box: Box; readonly svg: Box }[]
  readonly lanes: readonly Box[]
  readonly firstPhraseTop: number
  readonly viewportWidth: number
}

/** Intent: measure the doodle's staff, its positions, their SVGs and its lanes. */
function doodleLayout(page: Page): Promise<DoodleLayout> {
  return page.evaluate(() => {
    /** Intent: an element's box, as a plain object. */
    const box = (element: Element) => {
      const { top, bottom, left, right } = element.getBoundingClientRect()
      return { top, bottom, left, right }
    }
    const staff = document.querySelector('.review-panel section.review-doodle > .review-staff')
    const phrase = document.querySelector('.review-panel ol.review-list > li.review-phrase')
    if (staff === null || phrase === null) throw new Error('No doodle staff or first phrase.')
    return {
      staff: box(staff),
      positions: Array.from(staff.querySelectorAll(':scope > [data-system-position]'), (host) => {
        const svg = host.querySelector('svg')
        if (svg === null) throw new Error('A reserved position holds no drawing.')
        return {
          name: host.getAttribute('data-system-position') ?? '',
          box: box(host),
          svg: box(svg),
        }
      }),
      lanes: Array.from(staff.querySelectorAll(':scope > .played-notes-lane'), box),
      firstPhraseTop: box(phrase).top,
      viewportWidth: document.documentElement.clientWidth,
    }
  })
}

/** Intent: assert the boxes follow each other down the page without overlapping (1 px rounding). */
function expectStacked(boxes: readonly Box[], what: string): void {
  boxes.slice(1).forEach((next, index) => {
    expect(next.top, `${what} ${index + 2} below ${index + 1}`).toBeGreaterThanOrEqual(
      boxes[index]!.bottom - 1,
    )
  })
}

// @test-link [[rule_review_opens_with_doodle]]
test.describe('the doodle on a landscape phone', () => {
  for (const [measures, positions] of [
    [4, ['top', 'bottom']],
    [2, ['top']],
  ] as const) {
    // @test-link [[rule_review_opens_with_doodle]]
    test(`a ${measures}-measure doodle reserves ${positions.length === 2 ? 'two system positions' : 'one system position'}, nothing cut or overlapping`, async ({
      page,
    }) => {
      test.setTimeout(120_000)
      await gotoJamIdle(page, PHONE)
      await jamReviewed(page, measures)
      await expectDoodleEngraved(page, measures)
      await playedNotesToggle(page).click()
      await expect(doodleStaff(page).locator(':scope > .played-notes-lane')).toHaveCount(
        positions.length,
      )

      const layout = await doodleLayout(page)

      expect(layout.positions.map((position) => position.name)).toEqual([...positions])
      const labels = await doodleStaff(page)
        .locator(':scope > .played-notes-lane')
        .evaluateAll((lanes) => lanes.map((lane) => lane.getAttribute('aria-label')))
      expect(labels).toEqual(
        positions.length === 2
          ? ['Played notes, your doodle, bars 1–2', 'Played notes, your doodle, bars 3–4']
          : ['Played notes, your doodle'],
      )
      if (positions.length === 2) {
        await expect(
          doodleStaff(page).locator('[data-system-position="bottom"] svg'),
        ).toHaveAttribute('aria-hidden', 'true')
      }
      // Position, lane, position, lane: each below the one before, all inside the staff.
      const stacked = layout.positions.flatMap((position, index) => [
        position.box,
        layout.lanes[index]!,
      ])
      expectStacked(stacked, 'doodle part')
      for (const part of stacked) {
        expect(part.top).toBeGreaterThanOrEqual(layout.staff.top - 1)
        expect(part.bottom).toBeLessThanOrEqual(layout.staff.bottom + 1)
      }
      // Each drawing inside its position and the viewport, nothing cut.
      for (const position of layout.positions) {
        expect(position.svg.top, position.name).toBeGreaterThanOrEqual(position.box.top - 1)
        expect(position.svg.bottom, position.name).toBeLessThanOrEqual(position.box.bottom + 1)
        expect(position.svg.left, position.name).toBeGreaterThanOrEqual(position.box.left - 1)
        expect(position.svg.right, position.name).toBeLessThanOrEqual(position.box.right + 1)
        expect(position.svg.right, position.name).toBeLessThanOrEqual(layout.viewportWidth + 1)
      }
      // The doodle section ends before phrase 1 begins.
      expect(layout.firstPhraseTop).toBeGreaterThanOrEqual(layout.staff.bottom - 1)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(1)
    })
  }
})

/** Intent: like `watchPageErrors`, but letting through console errors matching `allowed`. */
function watchPageErrorsBut(page: Page, allowed: RegExp): () => void {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' && !allowed.test(message.text()))
      errors.push(`console: ${message.text()}`)
  })
  return () => expect(errors, `Unexpected page errors:\n${errors.join('\n')}`).toEqual([])
}
