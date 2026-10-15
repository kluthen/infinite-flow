/**
 * v3.0 chunk 20a, my instrument loaded and played, on the workspace harness (port 4175) with its
 * fake audio clock and fake MIDI access, over the browser's real IndexedDB. My instrument is seeded
 * through the harness's storage seam (the record's own codec, unchecked), with the saved selection
 * naming it, and the page reloaded so the next load reads them:
 *
 * - a record the rules refuse (a range under two octaves) loads as no my instrument: the
 *   instrument control keeps its three segments and the selection falls back to the default
 *   profile; a valid one adds a fourth segment, named for it and checked;
 * - with a bass-clef my instrument selected (written E1 to E3, sounding 14 semitones lower, so
 *   written below the treble clef's reach), the Idle phrase's request and the rhythm prewarm carry
 *   its profile as data, the Idle phrase, the connection sheet's check note, the running session's
 *   staff, the kept session's phrases and the Review's phrases are all in bass clef, and the
 *   Review names it;
 * - a phrase pre-generated at Idle and taken at Start lies inside its concert range;
 * - the staff's shared system-position size (the engraved staff SVG's `viewBox` height, in
 *   engraving units: 10 per staff space) reads its written range in its clef: written C2 to C4
 *   needs 19 staff spaces in treble clef and stays at the built-in 16 in bass clef, whichever
 *   instrument is selected.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { KEYS, connectThroughSheet, sheet, watchPageErrors } from '../controller/controller-helpers'
import { harnessSnapshot } from '../release/harness-helpers'
import { expectReviewShowing, playUntilPhrase, reviewPanel } from '../review/review-helpers'
import { readyToStart, sessionAction, sessionState, startSession } from '../session/session-helpers'
import { radio } from '../workspace/helpers'
import {
  generationRecords,
  gotoPregenerationHarness,
  readyWithSessionSeed,
  untilQueueFull,
} from '../workspace/pregeneration-helpers'
import {
  gotoStorageHarness,
  reloadHarness,
  seedMyInstrument,
  seedSettings,
} from './storage-helpers'

/** The instrument control's radiogroup label. */
const INSTRUMENT_GROUP = 'Instrument profile'
/** The built-in profiles' segments, in order; the B-flat tenor saxophone is the default. */
const BUILT_IN_LABELS = ['C MIDI keyboard', 'B-flat tenor saxophone', 'E-flat alto saxophone']
const DEFAULT_LABEL = 'B-flat tenor saxophone'
const DEFAULT_ID = 'bb-tenor'
const MY_INSTRUMENT_ID = 'my-instrument'

/**
 * A bass-clef my instrument: written E1 to E3 (MIDI 28 to 52), below the treble clef's reach,
 * sounding 14 semitones (an octave and a major second) lower, so its concert range is MIDI 14 to 38.
 */
const BASS_TENOR: WorkspaceHarnessMyInstrumentInput = {
  template: 'bb-tenor',
  name: 'Low tenor',
  clef: 'bass',
  writtenRange: { minMidi: 28, maxMidi: 52 },
  transposition: { octaves: 1, semitones: 2, direction: 'lower' },
}
const BASS_TENOR_CONCERT = { minMidi: 14, maxMidi: 38 }

/** Its profile as the generator receives it: the fixed id, its name and its concert range. */
const BASS_TENOR_PROFILE: WorkspaceHarnessInstrumentProfile = {
  id: MY_INSTRUMENT_ID,
  displayName: BASS_TENOR.name,
  concertRange: BASS_TENOR_CONCERT,
}

/** The SMuFL clef glyphs VexFlow draws as text: the G (treble) clef and the F (bass) clef. */
const G_CLEF = ''
const F_CLEF = ''

/** The built-in system-position size: 16 staff spaces of 10 engraving units. */
const BUILT_IN_UNITS = 160

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: the instrument control's segments' labels, in order. */
function instrumentLabels(page: Page): Promise<string[]> {
  return page
    .getByRole('radiogroup', { name: INSTRUMENT_GROUP })
    .getByRole('radio')
    .allTextContents()
    .then((labels) => labels.map((label) => label.trim()))
}

/** Intent: seed `instrument` with the saved selection naming it, then reload so the load reads them. */
async function loadWithMyInstrument(
  page: Page,
  instrument: WorkspaceHarnessMyInstrumentInput,
  selected = true,
): Promise<void> {
  await gotoStorageHarness(page)
  await seedMyInstrument(page, instrument)
  if (selected) await seedSettings(page, { 'controls.instrumentProfileId': MY_INSTRUMENT_ID })
  await reloadHarness(page)
}

/** Intent: the clef glyphs every staff SVG inside `scope` draws, in document order. */
function clefGlyphs(scope: Locator): Promise<string[]> {
  return scope
    .locator('svg.staff-svg g.vf-clef > text')
    .evaluateAll((texts) => texts.map((text) => text.textContent ?? ''))
}

/** Intent: the clef glyphs the workspace's staff draws now. */
function staffClefs(page: Page): Promise<string[]> {
  return clefGlyphs(page.locator('.score-panel > .staff-viewport'))
}

/** Intent: every attacked note's concert pitch in a concert timeline (JSON). */
function timelinePitches(timeline: string): number[] {
  const parsed = JSON.parse(timeline) as {
    measures: { events: { kind: string; pitch?: number }[] }[]
  }
  return parsed.measures.flatMap((measure) =>
    measure.events.flatMap((event) =>
      event.kind === 'note' && event.pitch !== undefined ? [event.pitch] : [],
    ),
  )
}

/** Intent: assert every note of `timeline` sounds inside `range`, and that it has notes. */
function expectInside(timeline: string, range: { minMidi: number; maxMidi: number }): void {
  const pitches = timelinePitches(timeline)
  expect(pitches.length).toBeGreaterThan(0)
  expect(Math.min(...pitches)).toBeGreaterThanOrEqual(range.minMidi)
  expect(Math.max(...pitches)).toBeLessThanOrEqual(range.maxMidi)
}

/** Intent: the latest player request's record (no abort signal: the Idle phrase's own). */
async function latestIdleRequest(page: Page): Promise<WorkspaceHarnessGenerationRequest> {
  const records = (await generationRecords(page)).filter((record) => !record.signal)
  const latest = records.at(-1)
  if (latest === undefined) throw new Error('no Idle phrase was requested')
  return latest
}

// @test-link [[entity_my_instrument_record]]
// @test-link [[rule_saved_settings_load_tolerantly]]
// @test-link [[module_saved_data_loader]]
test.describe('my instrument at load', () => {
  test('a record under two octaves loads as none: three segments, and the saved selection falls back to the default', async ({
    page,
  }) => {
    await loadWithMyInstrument(page, {
      ...BASS_TENOR,
      writtenRange: { minMidi: 40, maxMidi: 63 },
    })

    expect(await instrumentLabels(page)).toEqual(BUILT_IN_LABELS)
    await expect(radio(page, INSTRUMENT_GROUP, DEFAULT_LABEL)).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect((await harnessSnapshot(page)).instrumentProfileId).toBe(DEFAULT_ID)
  })

  // @test-link [[req_my_instrument]]
  test('a valid record loads: a fourth segment, named for it and checked by the saved selection', async ({
    page,
  }) => {
    await loadWithMyInstrument(page, BASS_TENOR)

    expect(await instrumentLabels(page)).toEqual([...BUILT_IN_LABELS, BASS_TENOR.name])
    await expect(radio(page, INSTRUMENT_GROUP, BASS_TENOR.name)).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect((await harnessSnapshot(page)).instrumentProfileId).toBe(MY_INSTRUMENT_ID)
  })
})

// @test-link [[req_my_instrument]]
// @test-link [[entity_my_instrument]]
test.describe('a bass-clef my instrument selected', () => {
  test('the Idle request and the rhythm prewarm carry its profile, and the Idle phrase and the check note are in bass clef', async ({
    page,
  }) => {
    await loadWithMyInstrument(page, BASS_TENOR)

    await readyToStart(page, 7)
    const request = await latestIdleRequest(page)
    expect(request.controls.instrumentProfileId).toBe(MY_INSTRUMENT_ID)
    expect(request.instrumentProfile).toEqual(BASS_TENOR_PROFILE)
    expectInside((await harnessSnapshot(page)).timeline!, BASS_TENOR_CONCERT)
    await expect
      .poll(() => page.evaluate(() => window.__workspaceHarness.prewarmInstrumentProfiles()))
      .not.toEqual([])
    const prewarms = await page.evaluate(() =>
      window.__workspaceHarness.prewarmInstrumentProfiles(),
    )
    expect(prewarms).toEqual(prewarms.map(() => BASS_TENOR_PROFILE))
    await expect.poll(() => staffClefs(page)).toEqual([F_CLEF])

    await connectThroughSheet(page, [KEYS])
    await expect(sheet(page).locator('#sheet-title')).toHaveText('Check your controller')
    await expect(sheet(page).locator('.check-note svg .vf-stavenote')).toHaveCount(1)
    expect(await clefGlyphs(sheet(page).locator('.check-note'))).toEqual([F_CLEF])
  })

  test('a session played with it keeps bass clef from Idle through Start to its Review, which names it', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await loadWithMyInstrument(page, BASS_TENOR)
    await readyToStart(page, 7)
    await expect.poll(() => staffClefs(page)).toEqual([F_CLEF])

    await startSession(page)
    const inCountIn = await staffClefs(page)
    expect(inCountIn.length).toBeGreaterThan(0)
    expect(inCountIn.every((glyph) => glyph === F_CLEF)).toBe(true)
    await playUntilPhrase(page, 2)
    expect((await sessionState(page)).phase).toBe('running')
    const running = await staffClefs(page)
    expect(running.length).toBeGreaterThan(0)
    expect(running.every((glyph) => glyph === F_CLEF)).toBe(true)

    await sessionAction(page).click()
    await expectReviewShowing(page, 2)
    await expect(reviewPanel(page).locator('.review-summary')).toContainText(BASS_TENOR.name)
    await expect.poll(async () => (await clefGlyphs(reviewPanel(page))).length).toBeGreaterThan(0)
    expect((await clefGlyphs(reviewPanel(page))).every((glyph) => glyph === F_CLEF)).toBe(true)
    const history = (await sessionState(page)).lastHistoryPhrases ?? []
    expect(history.length).toBe(2)
    for (const phrase of history) expectInside(phrase.timeline, BASS_TENOR_CONCERT)

    // The kept session: played with my instrument, every phrase recorded in bass clef.
    await expect
      .poll(
        async () =>
          (await page.evaluate(() => window.__workspaceHarness.storage.records('sessionBodies')))
            .length,
      )
      .toBe(1)
    const [summary] = await page.evaluate(() =>
      window.__workspaceHarness.storage.records('sessionSummaries'),
    )
    expect(summary).toMatchObject({
      instrument: { id: MY_INSTRUMENT_ID, displayName: BASS_TENOR.name },
    })
    const [body] = (await page.evaluate(() =>
      window.__workspaceHarness.storage.records('sessionBodies'),
    )) as { phrases: { clef: string }[] }[]
    expect(body!.phrases.length).toBeGreaterThan(0)
    expect(body!.phrases.map((phrase) => phrase.clef)).toEqual(body!.phrases.map(() => 'bass'))
  })
})

// @test-link [[module_idle_pregeneration_queue]]
// @test-link [[entity_my_instrument]]
test('with my instrument selected, a phrase pre-generated at Idle and taken at Start lies inside its concert range', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await gotoStorageHarness(page)
  await seedMyInstrument(page, BASS_TENOR)
  await seedSettings(page, { 'controls.instrumentProfileId': MY_INSTRUMENT_ID })
  await gotoPregenerationHarness(page)
  await expect(radio(page, INSTRUMENT_GROUP, BASS_TENOR.name)).toHaveAttribute(
    'aria-checked',
    'true',
  )

  await readyWithSessionSeed(page, 4242)
  const queued = await untilQueueFull(page)
  for (const record of queued) {
    expect(record.instrumentProfile).toEqual(BASS_TENOR_PROFILE)
    expectInside(record.timeline!, BASS_TENOR_CONCERT)
  }

  await startSession(page)
  await playUntilPhrase(page, 2)
  await sessionAction(page).click()
  await expectReviewShowing(page, 2)
  const taken = (await sessionState(page)).lastHistoryPhrases?.[1]
  expect(taken?.timeline).toBe(queued[0]!.timeline)
  expectInside(taken!.timeline, BASS_TENOR_CONCERT)
})

/** Written C2 to C4 (MIDI 36 to 60), no transposition: below the treble staff's built-in reach. */
const LOW_KEYBOARD: WorkspaceHarnessMyInstrumentInput = {
  template: 'c-keyboard',
  name: 'Low keys',
  clef: 'treble',
  writtenRange: { minMidi: 36, maxMidi: 60 },
  transposition: { octaves: 0, semitones: 0, direction: 'same' },
}

// @test-link [[module_notation_layout_preflight]]
// @test-link [[entity_my_instrument_record]]
test.describe('the shared system-position size reads my instrument’s written range in its clef', () => {
  for (const [clef, units] of [
    ['treble', 190],
    ['bass', BUILT_IN_UNITS],
  ] as const) {
    for (const selected of [false, true]) {
      test(`written C2 to C4 in ${clef} clef, ${selected ? 'selected' : 'not selected'}: ${units / 10} staff spaces`, async ({
        page,
      }) => {
        await loadWithMyInstrument(page, { ...LOW_KEYBOARD, clef }, selected)
        await readyToStart(page, 7)

        const heights = await page
          .locator('.score-panel > .staff-viewport svg.staff-svg')
          .evaluateAll((svgs) =>
            svgs.map((svg) => Number(svg.getAttribute('viewBox')!.split(' ')[3])),
          )
        expect(heights.length).toBeGreaterThan(0)
        expect(heights).toEqual(heights.map(() => units))
        const expectedClef = selected && clef === 'bass' ? F_CLEF : G_CLEF
        expect(await staffClefs(page)).toEqual([expectedClef])
      })
    }
  }
})
