/**
 * v3.0 chunk 13, the favorites-only export scope in the Review, on the workspace harness (port
 * 4175) with its fake audio clock and fake keyboard, over the browser's real IndexedDB:
 *
 * - `review-scope` opens the export row at `Whole session`; without a favorite, `Favorites only` is
 *   disabled and says why; with one, it can be picked, and every file then holds the favorite
 *   phrases only, under a `-favorites` name; removing the last favorite brings `Whole session`
 *   back;
 * - under `Favorites only`, `Export played notes` is disabled with "No played notes in your
 *   favorites." first, then with the favorites' very-short reason, and the option and the scope
 *   update it at once.
 */
import { expect, test, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import { gotoSessionHarness } from '../session/session-helpers'
import { KEYS, connectDevice, tap } from '../session/session-midi-helpers'
import {
  STEM,
  collectDownloads,
  exportError,
  exportOnce,
  exportPlayedButton,
  fixWallClock,
  includeVeryShortNotesToggle,
  pickFormat,
  reviewOfSession,
  reviewPanel,
  sessionEndedAfter,
} from './review-helpers'
import { star } from './review-tools-helpers'
import { smfNoteOns } from './smf-note-ons'

// The export file names carry the session's start in Paris time.
test.use({ timezoneId: 'Europe/Paris' })

const NO_FAVORITES = 'No favorites in this session yet.'
const NO_PLAYED_NOTES_IN_FAVORITES = 'No played notes in your favorites.'
const EVERY_FAVORITE_NOTE_VERY_SHORT =
  'Every note you played in your favorites is very short. Turn on Include very short notes to ' +
  'export them.'
const EVERY_NOTE_VERY_SHORT =
  'Every note you played is very short. Turn on Include very short notes to export them.'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: one of the export scope's two choices. */
function scopeOption(page: Page, label: 'Whole session' | 'Favorites only') {
  return reviewPanel(page)
    .getByRole('radiogroup', { name: 'Export' })
    .getByRole('radio', { name: label, exact: true })
}

/** Intent: assert `Export played notes` is disabled, described by `reason`. */
async function expectPlayedExportOff(page: Page, reason: string): Promise<void> {
  await expect(exportPlayedButton(page)).toBeDisabled()
  await expect(exportPlayedButton(page)).toHaveAccessibleDescription(reason)
}

// @test-link [[rule_favorites_only_export]]
// @test-link [[req_favorite_phrases]]
test.describe('the favorites-only export scope', () => {
  // @test-link [[rule_favorites_only_export]]
  test('is unavailable without a favorite; with one, every file holds the favorites only, named so; the last favorite removed brings Whole session back', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const downloads = collectDownloads(page)
    // Two notes played in phrase 1, one in phrase 2 (pitch 30), each held 100 ms.
    await reviewOfSession(page, true)

    await expect(reviewPanel(page).locator('.review-actions > *').first()).toHaveClass(
      /review-scope/,
    )
    await expect(scopeOption(page, 'Whole session')).toHaveAttribute('aria-checked', 'true')
    await expect(scopeOption(page, 'Favorites only')).toBeDisabled()
    await expect(scopeOption(page, 'Favorites only')).toHaveAccessibleDescription(NO_FAVORITES)

    await star(page, 2).click()
    await expect(scopeOption(page, 'Favorites only')).toBeEnabled()
    await expect(reviewPanel(page).locator('.review-scope .field-note')).toHaveCount(0)
    await scopeOption(page, 'Favorites only').click()
    await expect(scopeOption(page, 'Favorites only')).toHaveAttribute('aria-checked', 'true')

    const musicXml = await exportOnce(page, downloads)
    expect(musicXml.fileName).toBe(`${STEM}-generated-favorites.musicxml`)
    const xml = musicXml.bytes.toString('utf8')
    expect([...xml.matchAll(/<measure number="(\d+)"/gu)].map((match) => match[1])).toEqual([
      '5',
      '6',
      '7',
      '8',
    ])
    expect([...xml.matchAll(/<rehearsal>(\d+)<\/rehearsal>/gu)].map((match) => match[1])).toEqual([
      '2',
    ])

    await pickFormat(page, 'MIDI')
    const midi = await exportOnce(page, downloads)
    expect(midi.fileName).toBe(`${STEM}-generated-favorites.mid`)
    expect(midi.bytes.includes('Phrase 2')).toBe(true)
    expect(midi.bytes.includes('Phrase 1')).toBe(false)

    const played = await exportOnce(page, downloads, exportPlayedButton(page))
    expect(played.fileName).toBe(`${STEM}-played-favorites.mid`)
    expect(smfNoteOns(played.bytes).map((note) => note.pitch)).toEqual([30])
    expect(played.bytes.includes('Phrase 2')).toBe(true)
    await expect(exportError(page)).toHaveCount(0)

    await star(page, 2).click()
    await expect(scopeOption(page, 'Whole session')).toHaveAttribute('aria-checked', 'true')
    await expect(scopeOption(page, 'Favorites only')).toBeDisabled()
    const whole = await exportOnce(page, downloads, exportPlayedButton(page))
    expect(whole.fileName).toBe(`${STEM}-played.mid`)
    expect(smfNoteOns(whole.bytes)).toHaveLength(3)
  })

  // @test-link [[rule_favorites_only_export]]
  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  test('disables Export played notes with the first reason that applies, updated at once by the option and the scope', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const downloads = collectDownloads(page)
    await gotoSessionHarness(page)
    await fixWallClock(page)
    await connectDevice(page, KEYS)
    // One tap, very short, in phrase 2; nothing played in phrase 1.
    await sessionEndedAfter(page, 2, 7, async () => {
      await tap(page, KEYS, 30)
    })
    await expectPlayedExportOff(page, EVERY_NOTE_VERY_SHORT)

    await star(page, 1).click()
    await scopeOption(page, 'Favorites only').click()
    await expectPlayedExportOff(page, NO_PLAYED_NOTES_IN_FAVORITES)
    await includeVeryShortNotesToggle(page).click()
    await expectPlayedExportOff(page, NO_PLAYED_NOTES_IN_FAVORITES)

    await star(page, 2).click()
    await star(page, 1).click()
    await expect(scopeOption(page, 'Favorites only')).toHaveAttribute('aria-checked', 'true')
    await expect(exportPlayedButton(page)).toBeEnabled()
    await includeVeryShortNotesToggle(page).focus()
    await page.keyboard.press('Enter')
    await expectPlayedExportOff(page, EVERY_FAVORITE_NOTE_VERY_SHORT)
    await expect(includeVeryShortNotesToggle(page)).toBeFocused()

    await scopeOption(page, 'Whole session').click()
    await expectPlayedExportOff(page, EVERY_NOTE_VERY_SHORT)
    await scopeOption(page, 'Favorites only').click()
    await includeVeryShortNotesToggle(page).click()
    await expect(exportPlayedButton(page)).toBeEnabled()
    const played = await exportOnce(page, downloads, exportPlayedButton(page))
    expect(played.fileName).toBe(`${STEM}-played-favorites.mid`)
    expect(smfNoteOns(played.bytes).map((note) => note.pitch)).toEqual([30])
  })
})
