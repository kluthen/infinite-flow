/**
 * v3.2 chunk 20: Jam mode at Idle, no doodle kept. Its staff shows the empty system in Jam's
 * written key and collection (session mode's until Jam has settings of its own), an image named as
 * a phrase's summary names its staff, renamed silently on a redraw, drawing the opening line at
 * the system's start and no other barline, under the score title `Jam`; no phrase is
 * generated, prepared or replaced; `Start Jam` is primary and, until chunk 21, disabled. The cue
 * row names the home note (the tonic of Jam's key, in the instrument's written pitch, in the
 * octave nearest the middle of its written range) while a fresh Jam could start, or shows
 * `jam-needs-controller` without a connected controller, which `Start Jam` names; a controller
 * arriving or leaving swaps the two and never the mode. In Jam mode phrase 1's first note starts
 * nothing and is not named, and the home note starts nothing yet either. Entering Jam's Idle warms
 * the generation worker for the first-visit rhythm values with Jam's tension, and nothing under
 * `?prewarm=off`. On the workspace harness (port 4175: fake audio clock, fake MIDI).
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { audioEvents } from '../audio/audio-harness-helpers'
import {
  KEYS,
  chooseProfile,
  gotoControllerHarness,
  play,
  unplug,
} from '../controller/controller-helpers'
import { harnessSnapshot, settleFrames } from '../release/harness-helpers'
import {
  cueRow,
  phraseAction,
  readyToStart,
  sessionAction,
  sessionState,
} from '../session/session-helpers'
import { connectDevice, midiKind, startLine } from '../session/session-midi-helpers'
import { observeGenerationStatus, radio, readGenerationStatusLog } from './helpers'
import {
  expectJamModeShows,
  jamFrame,
  modeSegment,
  modeSwitch,
  scoreTitle,
} from './jam-mode-helpers'
import { generationRecords } from './pregeneration-helpers'

/** A landscape phone, below bp-tablet-landscape. */
const LANDSCAPE_PHONE = { width: 844, height: 390 } as const

/** The SMuFL sharp and flat glyphs, as VexFlow draws a key signature's accidentals. */
const SMUFL_SHARP = ''
const SMUFL_FLAT = ''

/** The two lines of `jam-needs-controller`. */
const NEEDS_CONTROLLER_WIDE = 'A Jam needs a connected controller. Connect one to start.'
const NEEDS_CONTROLLER_NARROW = 'Connect a controller to start.'

/** Intent: land on the harness, pre-generation off, at `size`, its controller loaded. */
function gotoHarness(page: Page, size?: { readonly width: number; readonly height: number }) {
  return gotoControllerHarness(page, {
    query: { pregeneration: 'off' },
    ...(size === undefined ? {} : { size }),
  })
}

/** Intent: let a few animation frames pass, so whatever a change set going has had its turn. */
async function settleAWhile(page: Page): Promise<void> {
  for (let frame = 0; frame < 5; frame += 1) await settleFrames(page)
}

/** Intent: press `Jam` and wait until Jam mode shows. */
async function enterJam(page: Page): Promise<void> {
  await modeSegment(page, 'Jam').click()
  await expectJamModeShows(page)
}

/** Intent: the cue row's `jam-needs-controller` line. */
function needsController(page: Page): Locator {
  return cueRow(page).locator('p.jam-needs-controller')
}

/** Intent: the glyphs drawn in the empty system's key signature, in drawing order. */
function keySignatureGlyphs(page: Page): Promise<string[]> {
  return jamFrame(page)
    .locator('svg.staff-svg g.vf-keysignature text')
    .evaluateAll((texts) => texts.map((text) => text.textContent ?? ''))
}

/** One key and collection, as their radios read, and the signature theory gives them. */
interface SignatureCase {
  readonly key: string
  readonly collection: string
  readonly glyph: string
  readonly count: number
}

/** The nine collections on white-key tonics: each shares C major's signature, no accidental. */
const NO_ACCIDENTAL_CASES: readonly SignatureCase[] = [
  ['C', 'Major'],
  ['A', 'Minor'],
  ['C', 'Ionian'],
  ['D', 'Dorian'],
  ['E', 'Phrygian'],
  ['F', 'Lydian'],
  ['G', 'Mixolydian'],
  ['A', 'Aeolian'],
  ['B', 'Locrian'],
].map(([key, collection]) => ({ key: key!, collection: collection!, glyph: SMUFL_SHARP, count: 0 }))

/**
 * The nine collections in a second key each, with accidentals, the signature of the major key
 * whose scale holds the same notes: D major and E Dorian two sharps (as D major); C minor three
 * flats (as E♭ major); B♭ Ionian two flats; B Phrygian and D Mixolydian one sharp (as G major);
 * B♭ Lydian and E Locrian one flat (as F major); F♯ Aeolian three sharps (as A major).
 */
const ACCIDENTAL_CASES: readonly SignatureCase[] = [
  { key: 'D', collection: 'Major', glyph: SMUFL_SHARP, count: 2 },
  { key: 'C', collection: 'Minor', glyph: SMUFL_FLAT, count: 3 },
  { key: 'A-sharp/B-flat', collection: 'Ionian', glyph: SMUFL_FLAT, count: 2 },
  { key: 'E', collection: 'Dorian', glyph: SMUFL_SHARP, count: 2 },
  { key: 'B', collection: 'Phrygian', glyph: SMUFL_SHARP, count: 1 },
  { key: 'A-sharp/B-flat', collection: 'Lydian', glyph: SMUFL_FLAT, count: 1 },
  { key: 'D', collection: 'Mixolydian', glyph: SMUFL_SHARP, count: 1 },
  { key: 'F-sharp/G-flat', collection: 'Aeolian', glyph: SMUFL_SHARP, count: 3 },
  { key: 'E', collection: 'Locrian', glyph: SMUFL_FLAT, count: 1 },
]

/** Intent: assert two boxes do not overlap. */
function expectApart(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  message: string,
): void {
  const apart =
    a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y
  expect(apart, message).toBe(true)
}

/** Intent: the box of a shown element, which must have one. */
async function boxOf(
  locator: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox()
  if (box === null) throw new Error('the element has no box')
  return box
}

// @test-link [[rule_jam_idle_shows_no_phrase]]
// @test-link [[rule_jam_pregeneration_only_for_kept_doodle]]
test('Jam mode at Idle shows the empty system and generates, prepares and replaces nothing', async ({
  page,
}) => {
  await gotoHarness(page)
  await connectDevice(page, KEYS)
  await observeGenerationStatus(page)
  const before = await harnessSnapshot(page)

  await enterJam(page)
  await settleAWhile(page)

  await expect(jamFrame(page)).toBeVisible()
  await expect(jamFrame(page).locator('svg.staff-svg')).toHaveCount(1)
  await expect(phraseAction(page)).toHaveText('Generate phrase')
  await expect(phraseAction(page)).toBeDisabled()
  await expect(phraseAction(page)).not.toHaveClass(/btn-primary/)
  await expect(sessionAction(page)).toHaveText('Start Jam')
  await expect(sessionAction(page)).toHaveClass(/btn-primary/)
  await expect(sessionAction(page)).toBeDisabled()
  expect(await generationRecords(page), 'nothing generated or prepared').toEqual([])
  const after = await harnessSnapshot(page)
  expect(after.timeline, 'no phrase').toBeNull()
  expect(after.requestId).toBe(before.requestId)
  const announced = (await readGenerationStatusLog(page)).filter((text) => text.trim() !== '')
  expect(announced, 'generation-status silent').toEqual([])
})

// @test-link [[rule_jam_idle_shows_no_phrase]]
test("the empty system shows the key signature of Jam's key and collection, nine collections in two keys", async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoHarness(page)
  await enterJam(page)

  for (const { key, collection, glyph, count } of [...NO_ACCIDENTAL_CASES, ...ACCIDENTAL_CASES]) {
    await radio(page, 'Written key', key).click()
    await radio(page, 'Collection', collection).click()
    await expect
      .poll(() => keySignatureGlyphs(page), { message: `${key} ${collection}` })
      .toEqual(Array<string>(count).fill(glyph))
  }
  await expectJamModeShows(page)
  expect(await generationRecords(page), 'a key change in Jam mode generates nothing').toEqual([])
})

/** Intent: the empty system's SVG. */
function emptySystem(page: Page): Locator {
  return jamFrame(page).locator('[data-system-position="top"] > .staff-content > svg.staff-svg')
}

// @test-link [[rule_jam_idle_shows_no_phrase]]
test('the empty system is an image named by its clef, key and 4/4, renamed silently on a redraw', async ({
  page,
}) => {
  await gotoHarness(page)
  await enterJam(page)

  await expect(scoreTitle(page)).toHaveText('Jam')
  await expect(jamFrame(page)).toHaveAttribute('aria-labelledby', 'score-panel-title')
  await expect(emptySystem(page)).toHaveAttribute('role', 'img')
  await expect(emptySystem(page)).not.toHaveAttribute('aria-hidden')
  // C Ionian on the tenor saxophone, the first visit's settings.
  await expect(
    jamFrame(page).getByRole('img', {
      name: 'Empty staff, treble clef, key signature no sharps or flats (C Ionian), 4/4 time.',
      exact: true,
    }),
  ).toHaveCount(1)

  await radio(page, 'Written key', 'G').click()
  await expect(emptySystem(page)).toHaveAccessibleName(
    'Empty staff, treble clef, key signature 1 sharp (G Ionian), 4/4 time.',
  )
  await radio(page, 'Written key', 'A-sharp/B-flat').click()
  await expect(emptySystem(page)).toHaveAccessibleName(
    'Empty staff, treble clef, key signature 2 flats (B flat Ionian), 4/4 time.',
  )
  // G Ionian and E Aeolian share one sharp, not a name.
  await radio(page, 'Written key', 'E').click()
  await radio(page, 'Collection', 'Aeolian').click()
  await expect(emptySystem(page)).toHaveAccessibleName(
    'Empty staff, treble clef, key signature 1 sharp (E Aeolian), 4/4 time.',
  )
  await expect(jamFrame(page).locator('[aria-live], [role="status"], [role="alert"]')).toHaveCount(
    0,
  )
})

// @test-link [[rule_jam_idle_shows_no_phrase]]
test("the empty system draws the opening line at the system's start, and no other barline", async ({
  page,
}) => {
  await gotoHarness(page)
  await enterJam(page)

  const drawn = emptySystem(page).locator('g.vf-stavebarline rect')
  await expect(drawn, 'one barline drawn: the opening line').toHaveCount(1)
  const line = await boxOf(drawn)
  // The stave group holds the five staff lines only.
  const staffLines = await boxOf(emptySystem(page).locator('g.vf-stave'))
  const clef = await boxOf(emptySystem(page).locator('g.vf-clef'))
  expect(Math.abs(line.x - staffLines.x), "at the staff lines' start").toBeLessThan(1.5)
  expect(line.x + line.width, 'before the clef').toBeLessThanOrEqual(clef.x)
  expect(Math.abs(line.y - staffLines.y), 'from the top line').toBeLessThan(1.5)
  expect(
    Math.abs(line.y + line.height - (staffLines.y + staffLines.height)),
    'to the bottom line',
  ).toBeLessThan(1.5)
})

// @test-link [[rule_jam_starting_note_is_home_note]]
// @test-link [[module_jam_idle_notes]]
test('the starting-note line names the home note with its octave for each built-in instrument', async ({
  page,
}) => {
  await gotoHarness(page)
  await connectDevice(page, KEYS)
  // G major. The keyboard writes C3 to C5 (middle C4): G3 is nearer than G4. Both saxophones write
  // C4 to C6 (middle C5): G4 is nearer than G5.
  await radio(page, 'Written key', 'G').click()
  await radio(page, 'Collection', 'Major').click()
  const homeNotes = [
    ['C MIDI keyboard', 'G3'],
    ['B-flat tenor saxophone', 'G4'],
    ['E-flat alto saxophone', 'G4'],
  ] as const

  for (const [instrument, note] of homeNotes) {
    await modeSegment(page, 'Session').click()
    await chooseProfile(page, instrument)
    await enterJam(page)
    await expect(startLine(page)).toHaveText(`Play this note to start: ${note}`)
    await expect(startLine(page).locator('strong')).toHaveText(note)
    await expect(page.locator('.start-note-marker')).toHaveCount(0)
    await expect(needsController(page)).toHaveCount(0)
  }
  expect(await generationRecords(page)).toEqual([])
})

// @test-link [[rule_jam_needs_controller]]
// @test-link [[module_workspace_mode]]
test('without a controller jam-needs-controller shows and Start Jam names it; a controller swaps it', async ({
  page,
}) => {
  await gotoHarness(page)
  await enterJam(page)

  await expect(needsController(page)).toBeVisible()
  await expect(needsController(page).locator('.cue-label-wide')).toBeVisible()
  await expect(needsController(page).locator('.cue-label-wide')).toHaveText(NEEDS_CONTROLLER_WIDE)
  await expect(needsController(page).locator('.cue-label-narrow')).toBeHidden()
  await expect(needsController(page)).not.toHaveAttribute('aria-live')
  await expect(startLine(page)).toHaveCount(0)
  await expect(sessionAction(page)).toBeDisabled()
  const describedBy = await sessionAction(page).getAttribute('aria-describedby')
  expect(describedBy).toBe(await needsController(page).getAttribute('id'))
  await expect(sessionAction(page)).toHaveAccessibleDescription(NEEDS_CONTROLLER_WIDE)

  await connectDevice(page, KEYS)
  await expect(needsController(page)).toHaveCount(0)
  await expect(startLine(page)).toHaveText('Play this note to start: C5')
  await expect(sessionAction(page)).not.toHaveAttribute('aria-describedby')
  await expectJamModeShows(page)

  await unplug(page, KEYS)
  await expect.poll(() => midiKind(page)).toBe('away')
  await expect(needsController(page)).toBeVisible()
  await expect(startLine(page)).toHaveCount(0)
  await expect(sessionAction(page)).toHaveAttribute('aria-describedby', describedBy ?? '')
  await expectJamModeShows(page)
})

// @test-link [[module_session_starting_note]]
// @test-link [[module_jam_idle_notes]]
test("in Jam mode phrase 1's first note starts nothing and is not named, nor yet the home note", async ({
  page,
}) => {
  await gotoHarness(page)
  await connectDevice(page, KEYS)
  await readyToStart(page)
  const sessionStart = (await sessionState(page)).startingNote
  if (sessionStart === null) throw new Error('session mode names no starting note')
  await expect(startLine(page)).toHaveText(`Play this note to start: ${sessionStart.label}`)

  await enterJam(page)
  expect(
    (await sessionState(page)).startingNote,
    'the session starting note is not named',
  ).toBeNull()
  // C Ionian on the tenor saxophone: written C5, the middle of C4 to C6, sounding B♭3 (58).
  await expect(startLine(page)).toHaveText('Play this note to start: C5')

  for (const pitch of [sessionStart.concertPitch, 58]) {
    await play(page, KEYS, pitch)
    await settleAWhile(page)
    const state = await sessionState(page)
    expect(state.phase).toBe('idle')
    expect(state.countIn).toBeNull()
    expect(state.startingNote).toBeNull()
    expect(
      (await audioEvents(page)).filter((event) => event.kind === 'click'),
      'no count-in click scheduled',
    ).toEqual([])
    await expectJamModeShows(page)
    await expect(startLine(page)).toHaveText('Play this note to start: C5')
  }
})

// @test-link [[module_generation_prewarm]]
// @test-link [[rule_jam_pregeneration_only_for_kept_doodle]]
test("before any doodle, entering Jam's Idle prewarms the first-visit rhythm values with Lift", async ({
  page,
}) => {
  await gotoHarness(page)
  // Session mode's own rhythm setting differs from Jam's: Edge tension.
  await radio(page, 'Tension', 'Edge').click()
  await settleAWhile(page)
  const posted = await page.evaluate(() => window.__workspaceHarness.prewarmRhythmSettings())
  expect(posted.at(-1)?.tension).toBe('Edge')

  await enterJam(page)
  await expect
    .poll(() => page.evaluate(() => window.__workspaceHarness.prewarmRhythmSettings()))
    .toEqual([
      ...posted,
      {
        noteDensity: 'Quarter',
        rhythmicVariety: 'Slightly varied',
        syncopation: 'Straight',
        silenceDensity: 'Sparse',
        tension: 'Lift',
      },
    ])
  await settleAWhile(page)
  expect(await page.evaluate(() => window.__workspaceHarness.prewarmRhythmSettings())).toHaveLength(
    posted.length + 1,
  )
  expect(await generationRecords(page)).toEqual([])

  await gotoControllerHarness(page, { query: { pregeneration: 'off', prewarm: 'off' } })
  await enterJam(page)
  await settleAWhile(page)
  expect(await page.evaluate(() => window.__workspaceHarness.prewarmRhythmSettings())).toEqual([])
  expect(await page.evaluate(() => window.__workspaceHarness.prewarmCount())).toBe(0)
})

// @test-link [[rule_jam_needs_controller]]
test('on a landscape phone jam-needs-controller shows its short text, nothing cut or overlapping', async ({
  page,
}) => {
  await gotoHarness(page, LANDSCAPE_PHONE)
  await enterJam(page)

  const line = needsController(page)
  await expect(line.locator('.cue-label-narrow')).toBeVisible()
  await expect(line.locator('.cue-label-narrow')).toHaveText(NEEDS_CONTROLLER_NARROW)
  await expect(line.locator('.cue-label-wide')).toBeHidden()
  const cut = await line.evaluate(
    (element) =>
      element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight,
  )
  expect(cut, 'the line is not cut').toBe(false)
  const rowBox = await boxOf(cueRow(page))
  const lineBox = await boxOf(line)
  expect(lineBox.y >= rowBox.y && lineBox.y + lineBox.height <= rowBox.y + rowBox.height).toBe(true)
  expect(lineBox.x + lineBox.width).toBeLessThanOrEqual(LANDSCAPE_PHONE.width)

  const parts = [modeSwitch(page), phraseAction(page), sessionAction(page)]
  for (const part of parts) {
    await part.scrollIntoViewIfNeeded()
    await expect(part).toBeInViewport()
    const box = await boxOf(part)
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(LANDSCAPE_PHONE.width)
  }
  const [switchBox, phraseBox, sessionBox] = await Promise.all(parts.map(boxOf))
  expectApart(switchBox!, phraseBox!, 'the mode switch and the phrase action')
  expectApart(switchBox!, sessionBox!, 'the mode switch and Start Jam')
  expectApart(phraseBox!, sessionBox!, 'the two header actions')
  await modeSegment(page, 'Session').click()
  await expect(modeSegment(page, 'Session')).toHaveAttribute('aria-checked', 'true')
})
