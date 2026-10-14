/**
 * v2.0 chunk 20, the Review's generated-notes export on the workspace harness's fake audio clock
 * and fake MIDI access, with the session's wall clock fixed so the file names are known: the
 * player picks MusicXML (the default) or MIDI, with the backing track for MIDI only and off by
 * default; each export downloads exactly one file, named from the session's start in local time;
 * exporting twice gives identical bytes; neither file holds a played note (a session with played
 * notes exports the very bytes of the same session played silently); and any failure, the export
 * code's chunk failing to load or the file failing to build, shows the export error with nothing
 * downloaded, the next export starting afresh. From v2.1, a session with played notes also
 * exports them, as a MIDI file of its own (the same name stem, `-played.mid`) holding exactly the
 * played notes as received, beside the generated-notes files and never merged into them; a
 * session without one shows neither `Export played notes` nor the `Played notes` switch; and a
 * failed played-notes export shows the same export error, which the next export of either
 * content removes.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { gotoSessionHarness, sessionAction, sessionState } from '../session/session-helpers'
import { untilStored } from '../storage/storage-helpers'
import {
  STEM,
  backingTrackToggle,
  collectDownloads,
  exportButton,
  exportEach,
  exportError,
  exportOnce,
  exportPlayedButton,
  exportsBuilt,
  fixWallClock,
  formatOption,
  pickFormat,
  playedNotesToggle,
  reviewLink,
  reviewOfSession,
  reviewPanel,
  sessionEndedAfter,
  type Downloads,
} from './review-helpers'
import { smfNoteOns } from './smf-note-ons'

// The file names are the session's start in the player's local time: fix the zone.
test.use({ timezoneId: 'Europe/Paris' })

/** Every page error and console error of the running test, and the ones it expects. */
let pageErrors: string[] = []
let expectedErrors: RegExp[] = []

// As `watchPageErrors`, but a test may name the errors it causes on purpose.
test.beforeEach(({ page }) => {
  pageErrors = []
  expectedErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`)
  })
})

test.afterEach(() => {
  const unexpected = pageErrors.filter((error) => !expectedErrors.some((re) => re.test(error)))
  expect(unexpected, `Unexpected page errors:\n${unexpected.join('\n')}`).toEqual([])
})

// @test-link [[req_session_export]]
// @test-link [[rule_generated_notes_musicxml_export]]
// @test-link [[rule_generated_notes_midi_export]]
// @test-link [[rule_no_grading_or_mismatch_signal]]
test.describe('exporting the generated notes', () => {
  // @test-link [[req_session_export]]
  // @test-link [[rule_generated_notes_musicxml_export]]
  // @test-link [[rule_generated_notes_midi_export]]
  // @test-link [[rule_no_grading_or_mismatch_signal]]
  // @test-link [[req_played_notes_export]]
  test('one named file per export, the same bytes twice, and no played note in either format', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const downloads = collectDownloads(page)
    await reviewOfSession(page, true)
    await expect(exportPlayedButton(page)).toHaveText('Export played notes')

    const played = await exportEach(page, downloads)

    expect(downloads.all).toHaveLength(6)
    const xml = played.musicXml.toString('utf8')
    expect(xml).toContain('<score-partwise version="4.0">')
    // The session's B-flat tenor saxophone transposes.
    expect(xml).toContain('<transpose>')
    expect(played.midi.subarray(0, 4).toString('latin1')).toBe('MThd')
    expect(played.midiWithBacking.subarray(0, 4).toString('latin1')).toBe('MThd')
    expect(played.midiWithBacking.length).toBeGreaterThan(played.midi.length)

    // The format and the backing track hold across leaving the Review.
    await sessionAction(page).click()
    await reviewLink(page).click()
    await expect(formatOption(page, 'MIDI')).toHaveAttribute('aria-checked', 'true')
    await expect(backingTrackToggle(page)).toHaveAttribute('aria-pressed', 'true')
    // Since v3.0 they are saved preferences: put them back to their first-load values, and wait
    // until they are stored, so the silent session's Review starts from them as this one did.
    await backingTrackToggle(page).click()
    await pickFormat(page, 'MusicXML')
    await untilStored(page, { 'review.format': 'musicxml', 'review.backingTrack': false })

    // The same session played silently exports the very same bytes: no played note is in them.
    const silentDownloads = collectDownloads(page)
    await reviewOfSession(page, false)
    // Nothing was played in a phrase: neither played-notes tool is rendered.
    await expect(exportPlayedButton(page)).toHaveCount(0)
    await expect(reviewPanel(page).locator('.review-view')).toHaveCount(0)
    await expect(playedNotesToggle(page)).toHaveCount(0)
    const silent = await exportEach(page, silentDownloads)
    expect(silent.musicXml.equals(played.musicXml), 'MusicXML').toBe(true)
    expect(silent.midi.equals(played.midi), 'MIDI').toBe(true)
    expect(silent.midiWithBacking.equals(played.midiWithBacking), 'MIDI with backing').toBe(true)
  })
})

// @test-link [[req_played_notes_export]]
// @test-link [[rule_export_contents_never_merged]]
test.describe('exporting the played notes', () => {
  // @test-link [[req_played_notes_export]]
  // @test-link [[rule_export_contents_never_merged]]
  test('a MIDI file of its own holding the played notes, beside the generated MIDI file with none', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const downloads = collectDownloads(page)
    await reviewOfSession(page, true)
    await expect(playedNotesToggle(page)).toHaveAttribute('aria-pressed', 'false')

    const played = await exportOnce(page, downloads, exportPlayedButton(page))
    expect(played.fileName).toBe(`${STEM}-played.mid`)
    expect(downloads.all).toHaveLength(1)
    await expect(exportPlayedButton(page)).toBeFocused()

    await pickFormat(page, 'MIDI')
    const generated = await exportOnce(page, downloads)
    expect(generated.fileName).toBe(`${STEM}-generated.mid`)
    expect(downloads.all).toHaveLength(2)

    // The played file holds every played note, at concert pitch as received, with its velocity.
    const recorded = ((await sessionState(page)).lastHistoryPhrases ?? [])
      .flatMap((phrase) => phrase.playedNotes)
      .toSorted((a, b) => a.onsetAt - b.onsetAt)
    expect(recorded).toHaveLength(3)
    expect(played.bytes.subarray(0, 4).toString('latin1')).toBe('MThd')
    const playedNotes = smfNoteOns(played.bytes)
    expect(playedNotes.map((note) => [note.pitch, note.velocity])).toEqual(
      recorded.map((note) => [note.pitch, note.velocity]),
    )
    // The generated file holds none of them: the low note played in phrase 2 is not in it.
    const generatedPitches = smfNoteOns(generated.bytes).map((note) => note.pitch)
    expect(generatedPitches.length).toBeGreaterThan(0)
    expect(generatedPitches).not.toContain(30)
  })

  // @test-link [[req_played_notes_export]]
  test('a failed played-notes export shows the export error, which the next export removes', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const downloads = collectDownloads(page)
    await reviewOfSession(page, true)
    await page.evaluate(() => window.__workspaceHarness.failNextExport())

    await failedExport(page, downloads, exportPlayedButton(page))

    const file = await exportOnce(page, downloads)
    await expect(exportError(page)).toHaveCount(0)
    expect(file.fileName).toBe(`${STEM}-generated.musicxml`)
    expect(downloads.all).toHaveLength(1)
  })
})

/** Intent: click `button` (`Export generated notes` by default) and wait for the failed export. */
async function failedExport(
  page: Page,
  downloads: Downloads,
  button: Locator = exportButton(page),
): Promise<void> {
  const builtBefore = await exportsBuilt(page)
  await button.click()
  await expect(exportError(page)).toHaveText("The file couldn't be made. Try again.")
  await expect(exportError(page)).toHaveClass(/inline-alert alert-error/)
  await expect(button).toBeEnabled()
  await expect(button).toBeFocused()
  expect(await exportsBuilt(page)).toBe(builtBefore)
  expect(downloads.all).toHaveLength(0)
}

// @test-link [[req_session_export]]
test.describe('an export that fails', () => {
  // @test-link [[req_session_export]]
  test('the export code failing to load shows the error, with nothing downloaded', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    // The browser reports the aborted fetch of the export code's chunk.
    expectedErrors = [/^console: Failed to load resource: net::ERR_FAILED$/]
    const downloads = collectDownloads(page)
    await gotoSessionHarness(page)
    await sessionEndedAfter(page, 1)
    let aborted = 0
    await page.route('**/generated-notes-file-*.js', async (route) => {
      aborted += 1
      await route.abort()
    })

    await failedExport(page, downloads)

    expect(aborted).toBe(1)
  })

  // @test-link [[req_session_export]]
  test('the file failing to build shows the error, which the next export removes', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const downloads = collectDownloads(page)
    await gotoSessionHarness(page)
    await fixWallClock(page)
    await sessionEndedAfter(page, 1)
    await page.evaluate(() => window.__workspaceHarness.failNextExport())

    await failedExport(page, downloads)

    const file = await exportOnce(page, downloads)
    await expect(exportError(page)).toHaveCount(0)
    expect(file.fileName).toBe(`${STEM}-generated.musicxml`)
    expect(downloads.all).toHaveLength(1)
  })
})
