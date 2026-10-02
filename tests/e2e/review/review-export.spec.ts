/**
 * v2.0 chunk 20, the Review's generated-notes export on the workspace harness's fake audio clock
 * and fake MIDI access, with the session's wall clock fixed so the file names are known: the
 * player picks MusicXML (the default) or MIDI, with the backing track for MIDI only and off by
 * default; each export downloads exactly one file, named from the session's start in local time;
 * exporting twice gives identical bytes; neither file holds a played note (a session with played
 * notes exports the very bytes of the same session played silently); and any failure, the export
 * code's chunk failing to load or the file failing to build, shows the export error with nothing
 * downloaded, the next export starting afresh.
 */
import { expect, test, type Page } from '@playwright/test'

import { gotoSessionHarness, sessionAction } from '../session/session-helpers'
import {
  STEM,
  backingTrackToggle,
  collectDownloads,
  exportButton,
  exportEach,
  exportError,
  exportOnce,
  exportsBuilt,
  fixWallClock,
  formatOption,
  reviewLink,
  reviewOfSession,
  sessionEndedAfter,
  type Downloads,
} from './review-helpers'

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
  test('one named file per export, the same bytes twice, and no played note in either format', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const downloads = collectDownloads(page)
    await reviewOfSession(page, true)

    const played = await exportEach(page, downloads)

    expect(downloads.all).toHaveLength(6)
    const xml = played.musicXml.toString('utf8')
    expect(xml).toContain('<score-partwise version="4.0">')
    // The session's B-flat tenor saxophone transposes.
    expect(xml).toContain('<transpose>')
    expect(played.midi.subarray(0, 4).toString('latin1')).toBe('MThd')
    expect(played.midiWithBacking.subarray(0, 4).toString('latin1')).toBe('MThd')
    expect(played.midiWithBacking.length).toBeGreaterThan(played.midi.length)

    // The format and the backing track hold for the page session, across leaving the Review.
    await sessionAction(page).click()
    await reviewLink(page).click()
    await expect(formatOption(page, 'MIDI')).toHaveAttribute('aria-checked', 'true')
    await expect(backingTrackToggle(page)).toHaveAttribute('aria-pressed', 'true')

    // The same session played silently exports the very same bytes: no played note is in them.
    const silentDownloads = collectDownloads(page)
    await reviewOfSession(page, false)
    const silent = await exportEach(page, silentDownloads)
    expect(silent.musicXml.equals(played.musicXml), 'MusicXML').toBe(true)
    expect(silent.midi.equals(played.midi), 'MIDI').toBe(true)
    expect(silent.midiWithBacking.equals(played.midiWithBacking), 'MIDI with backing').toBe(true)
  })
})

/** Intent: click `Export generated notes` and wait for the failed export to settle. */
async function failedExport(page: Page, downloads: Downloads): Promise<void> {
  const builtBefore = await exportsBuilt(page)
  await exportButton(page).click()
  await expect(exportError(page)).toHaveText("The file couldn't be made. Try again.")
  await expect(exportError(page)).toHaveClass(/inline-alert alert-error/)
  await expect(exportButton(page)).toBeEnabled()
  await expect(exportButton(page)).toBeFocused()
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
    expect(file.fileName).toBe(`${STEM}.musicxml`)
    expect(downloads.all).toHaveLength(1)
  })
})
