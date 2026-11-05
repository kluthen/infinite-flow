/**
 * v3.2 chunk 25, a Jam session's exports from its Review, on the workspace harness (port 4175:
 * fake audio clock, fake MIDI, real generations) over the browser's real IndexedDB; each test from
 * an empty browser context. A fresh Jam is played with a doodle (one note on each of its
 * barlines, nothing played after it), then Stopped once phrase 1 sounds:
 *
 * - every file opens with the doodle: both MIDI files with a "Doodle" marker at tick 0 and
 *   "Phrase 1" at the doodle's last barline, the MusicXML file with the rehearsal "Doodle" in
 *   measure 1, phrase 1 right after the doodle;
 * - the raw doodle notes are played notes: with nothing played in a phrase, the Review still has
 *   `review-view` and an enabled `Export played notes`, whose file holds the doodle's notes, under
 *   `Whole session` and under `Favorites only`;
 * - when Jam's code could not load (a kept Jam session reopened after a reload, its chunk
 *   refused), both exports are disabled, each named by the failure sentence, the other export
 *   controls live and no export error; an export pressed while the chunk is on its way ends in
 *   that state when it is refused, never in the error.
 */
import { expect, test, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import { gotoJamIdle } from '../session/jam-helpers'
import { reloadHarness } from '../storage/storage-helpers'
import { expectChecked, holdJamChunk, refuseJamChunk } from '../workspace/jam-mode-helpers'
import {
  backingTrackToggle,
  collectDownloads,
  exportButton,
  exportError,
  exportOnce,
  exportPlayedButton,
  exportsBuilt,
  formatOption,
  includeVeryShortNotesToggle,
  pickFormat,
  playedNotesToggle,
  reviewItems,
  reviewLink,
  reviewPanel,
  reviewTitle,
} from './review-helpers'
import {
  DOODLE_NOT_LOADED,
  jamReviewed,
  keptJamAfterReload,
  watchPageErrorsBut,
} from './review-jam-helpers'
import { star } from './review-tools-helpers'
import { smfMarkers, smfNoteOns } from './smf-note-ons'

/** MIDI ticks in one 4/4 measure: four quarter notes of 960 ticks. */
const MEASURE_TICKS = 3840

/** The concert pitches of the doodle's notes, one a measure, as the Jam helpers play them. */
const DOODLE_PITCHES = [58, 60, 62, 63] as const

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: the markers a Jam's MIDI file opens with for a `measures`-measure doodle. */
function doodleMarkers(measures: number, firstPhrase = 1) {
  return [
    { tick: 0, text: 'Doodle' },
    { tick: measures * MEASURE_TICKS, text: `Phrase ${firstPhrase}` },
  ]
}

/** Intent: the rehearsal marks of a MusicXML file, each with the number of its measure. */
function rehearsals(xml: string): string[] {
  return [...xml.matchAll(/<measure number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/gu)].flatMap(
    ([, number, body]) =>
      [...(body ?? '').matchAll(/<rehearsal[^>]*>([^<]*)<\/rehearsal>/gu)].map(
        ([, mark]) => `${number}:${mark}`,
      ),
  )
}

/** Intent: one of the export scope's two choices. */
function scopeOption(page: Page, label: 'Whole session' | 'Favorites only') {
  return reviewPanel(page)
    .getByRole('radiogroup', { name: 'Export' })
    .getByRole('radio', { name: label, exact: true })
}

// @test-link [[rule_jam_exports_open_with_doodle]]
// @test-link [[rule_jam_exports_line_up]]
test.describe("a Jam's files open with the doodle", () => {
  for (const measures of [1, 4] as const) {
    // @test-link [[rule_jam_exports_open_with_doodle]]
    // @test-link [[rule_jam_exports_line_up]]
    test(`a ${measures}-measure doodle: Doodle at time zero, phrase 1 at its last barline, in all three files`, async ({
      page,
    }) => {
      test.setTimeout(150_000)
      const downloads = collectDownloads(page)
      await gotoJamIdle(page)
      await jamReviewed(page, measures)

      const musicXml = await exportOnce(page, downloads)
      expect(musicXml.fileName).toMatch(/-generated\.musicxml$/u)
      expect(rehearsals(musicXml.bytes.toString('utf8'))).toEqual(['1:Doodle', `${measures + 1}:1`])

      await pickFormat(page, 'MIDI')
      const generated = await exportOnce(page, downloads)
      expect(generated.fileName).toMatch(/-generated\.mid$/u)
      expect(smfMarkers(generated.bytes)).toEqual(doodleMarkers(measures))

      const played = await exportOnce(page, downloads, exportPlayedButton(page))
      expect(played.fileName).toMatch(/-played\.mid$/u)
      expect(smfMarkers(played.bytes)).toEqual(doodleMarkers(measures))
      expect(smfNoteOns(played.bytes).map((note) => note.pitch)).toEqual(
        DOODLE_PITCHES.slice(0, measures),
      )
      await expect(exportError(page)).toHaveCount(0)
    })
  }
})

// @test-link [[rule_raw_doodle_notes_are_played_notes]]
test.describe('the raw doodle notes are played notes', () => {
  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  // @test-link [[rule_favorites_only_export]]
  test('a Jam in which only the doodle was played exports its doodle notes, in both scopes', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    const downloads = collectDownloads(page)
    await gotoJamIdle(page)
    await jamReviewed(page, 2)

    await expect(reviewPanel(page).locator('.review-view')).toHaveCount(1)
    await expect(playedNotesToggle(page)).toBeVisible()
    await playedNotesToggle(page).click()
    const doodleLane = reviewPanel(page).locator(
      'section.review-doodle > .review-staff > .played-notes-lane',
    )
    await expect(doodleLane).toHaveAccessibleName('Played notes, your doodle')
    await expect(doodleLane.locator('.played-note')).toHaveCount(2)
    await expect(reviewItems(page).locator('.played-notes-lane .played-note')).toHaveCount(0)
    await expect(exportPlayedButton(page)).toBeEnabled()
    await expect(exportPlayedButton(page)).not.toHaveAttribute('aria-describedby')

    const whole = await exportOnce(page, downloads, exportPlayedButton(page))
    expect(whole.fileName).toMatch(/-played\.mid$/u)
    expect(smfNoteOns(whole.bytes).map((note) => note.pitch)).toEqual([58, 60])
    expect(smfMarkers(whole.bytes)).toEqual(doodleMarkers(2))

    await star(page, 1).click()
    await scopeOption(page, 'Favorites only').click()
    await expect(scopeOption(page, 'Favorites only')).toHaveAttribute('aria-checked', 'true')
    await expect(exportPlayedButton(page)).toBeEnabled()
    const favorites = await exportOnce(page, downloads, exportPlayedButton(page))
    expect(favorites.fileName).toMatch(/-played-favorites\.mid$/u)
    expect(smfNoteOns(favorites.bytes).map((note) => note.pitch)).toEqual([58, 60])
    expect(smfMarkers(favorites.bytes)).toEqual(doodleMarkers(2))
    await expect(exportError(page)).toHaveCount(0)
  })
})

/** Intent: assert both exports are disabled, each named by the failure sentence, nothing in error. */
async function expectExportsNeedDoodle(page: Page): Promise<void> {
  for (const button of [exportButton(page), exportPlayedButton(page)]) {
    await expect(button).toBeDisabled()
    await expect(button).not.toHaveClass(/is-loading/u)
    await expect(button).toHaveAccessibleDescription(DOODLE_NOT_LOADED)
  }
  await expect(reviewPanel(page).locator('.review-export > p.field-note')).toHaveText(
    DOODLE_NOT_LOADED,
  )
  await expect(reviewPanel(page).locator('.review-export-played > p.field-note')).toHaveText(
    DOODLE_NOT_LOADED,
  )
  await expect(exportError(page)).toHaveCount(0)
}

// @test-link [[rule_jam_code_loaded_on_demand]]
test.describe("a Jam's exports when Jam's code could not load", () => {
  // @test-link [[rule_jam_code_loaded_on_demand]]
  test('both exports are disabled with the sentence, the other controls live, no error', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    // The refused chunk is logged by the browser as a failed resource: the only error allowed.
    expectNoPageErrors = watchPageErrorsBut(page, /ERR_INTERNET_DISCONNECTED/u)
    const downloads = collectDownloads(page)
    await keptJamAfterReload(page)
    await refuseJamChunk(page)
    await reloadHarness(page)
    await expectChecked(page, 'Session')

    await reviewLink(page).click()
    await expect(reviewTitle(page)).toBeFocused()

    await expectExportsNeedDoodle(page)
    // Format, Backing track, the scope and Include very short notes stay live.
    await pickFormat(page, 'MIDI')
    await backingTrackToggle(page).click()
    await expect(backingTrackToggle(page)).toHaveAttribute('aria-pressed', 'true')
    await includeVeryShortNotesToggle(page).click()
    await expect(includeVeryShortNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')
    await star(page, 1).click()
    await scopeOption(page, 'Favorites only').click()
    await expect(scopeOption(page, 'Favorites only')).toHaveAttribute('aria-checked', 'true')
    await scopeOption(page, 'Whole session').click()
    await expect(scopeOption(page, 'Whole session')).toHaveAttribute('aria-checked', 'true')
    await expectExportsNeedDoodle(page)
    await expect(formatOption(page, 'MusicXML')).toBeEnabled()
    expect(downloads.all).toHaveLength(0)
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  test('an export pressed while the code is on its way ends disabled with the sentence when it is refused, never in error', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    expectNoPageErrors = watchPageErrorsBut(page, /ERR_INTERNET_DISCONNECTED/u)
    const downloads = collectDownloads(page)
    await keptJamAfterReload(page)
    const held = await holdJamChunk(page)
    await reloadHarness(page)
    await expectChecked(page, 'Session')
    const builtBefore = await exportsBuilt(page)

    await reviewLink(page).click()
    await expect(reviewTitle(page)).toBeFocused()
    await expect.poll(held.requests).toBe(1)
    await expect(exportButton(page)).toBeEnabled()
    await expect(exportPlayedButton(page)).toBeEnabled()

    await exportButton(page).click()
    await exportPlayedButton(page).click()
    await expect(exportButton(page)).toHaveClass(/is-loading/u)
    await expect(exportPlayedButton(page)).toHaveClass(/is-loading/u)

    await held.refuse()

    await expectExportsNeedDoodle(page)
    expect(await exportsBuilt(page)).toBe(builtBefore)
    expect(downloads.all).toHaveLength(0)
  })
})
