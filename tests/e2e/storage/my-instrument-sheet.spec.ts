/**
 * v3.0 chunk 20b, the My instrument sheet on the workspace harness (port 4175), part 1: creating
 * my instrument from a template, the range refused live (under two octaves, outside its clef's
 * bound, checked again at a clef change), a name change alone, and the transposition's named
 * interval at each step. Every case drives the real UI: `instrument-actions`, the sheet's
 * segmented controls, name field, semitone steppers by keyboard, `Save` and `Cancel`.
 */

import { expect, test } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import { harnessSnapshot } from '../release/harness-helpers'
import { readyToStart } from '../session/session-helpers'
import { radio } from '../workspace/helpers'
import { gotoStorageHarness, reloadHarness, storedSettings, untilStored } from './storage-helpers'

import {
  BASS_LEAD,
  BUILT_IN_LABELS,
  INSTRUMENT_GROUP,
  MY_INSTRUMENT_ID,
  SPAN_LEAD,
  TENOR_LABEL,
  TREBLE_LEAD,
  createThroughSheet,
  firstConcertNote,
  firstWrittenNote,
  idleRequests,
  instrumentActions,
  instrumentLabels,
  instrumentRecords,
  mySheet,
  nameField,
  openSheet,
  rangeAlert,
  saveSheet,
  sheetActionButton,
  sheetSegment,
  stepTo,
  stepper,
  timelinePitches,
  transpositionNote,
  untilIdleDrawn,
} from './my-instrument-sheet-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

// @test-link [[req_my_instrument]]
// @test-link [[entity_my_instrument_record]]
// @test-link [[rule_profile_switch_validates_phrase]]
// @test-link [[rule_settings_saved_on_change]]
test('created from the tenor template with a name and a changed range: saved, selected, the phrase replaced in its written pitch, and back after a reload', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoStorageHarness(page)
  await readyToStart(page, 7)
  const before = await harnessSnapshot(page)
  const requestsBefore = (await idleRequests(page)).length

  await expect(instrumentActions(page)).toHaveText('Create my instrument')
  await openSheet(page)
  await expect(mySheet(page).locator('.sheet-title')).toHaveText('Create my instrument')
  await sheetSegment(page, 'Start from', TENOR_LABEL).click()
  await expect(sheetSegment(page, 'Start from', TENOR_LABEL)).toHaveAttribute(
    'aria-checked',
    'true',
  )
  // The tenor's written range, C4 to C6, sounding 14 semitones lower.
  await expect(stepper(page, 'Lowest note')).toHaveAttribute('aria-valuenow', '60')
  await expect(stepper(page, 'Highest note')).toHaveAttribute('aria-valuenow', '84')
  await expect(stepper(page, 'Sounds')).toHaveAttribute('aria-valuenow', '-14')
  await nameField(page).fill('Low tenor')
  await stepTo(page, 'Lowest note', 58)
  await expect(stepper(page, 'Lowest note')).toHaveAttribute('aria-valuetext', 'B♭3')
  await saveSheet(page)

  // Selected: a fourth segment named for it, checked; the button edits it now.
  expect(await instrumentLabels(page)).toEqual([...BUILT_IN_LABELS, 'Low tenor'])
  await expect(radio(page, INSTRUMENT_GROUP, 'Low tenor')).toHaveAttribute('aria-checked', 'true')
  await expect(instrumentActions(page)).toHaveText('Edit my instrument')
  // Saved: its record, and the selection naming it.
  await expect
    .poll(() => instrumentRecords(page))
    .toEqual([
      expect.objectContaining({
        id: MY_INSTRUMENT_ID,
        template: 'bb-tenor',
        name: 'Low tenor',
        clef: 'treble',
        writtenRange: { minMidi: 58, maxMidi: 84 },
        transposition: { octaves: 1, semitones: 2, direction: 'lower' },
      }),
    ])
  await untilStored(page, { 'controls.instrumentProfileId': MY_INSTRUMENT_ID })

  // The phrase replaced: one new request carrying my instrument's profile as data.
  await untilIdleDrawn(page)
  const requests = await idleRequests(page)
  expect(requests.length).toBeGreaterThan(requestsBefore)
  const latest = requests.at(-1)!
  expect(latest.controls.instrumentProfileId).toBe(MY_INSTRUMENT_ID)
  expect(latest.instrumentProfile).toEqual({
    id: MY_INSTRUMENT_ID,
    displayName: 'Low tenor',
    concertRange: { minMidi: 44, maxMidi: 70 },
  })
  const after = await harnessSnapshot(page)
  expect(after.instrumentProfileId).toBe(MY_INSTRUMENT_ID)
  expect(after.timeline).not.toBe(before.timeline)
  const pitches = timelinePitches(after.timeline!)
  expect(Math.min(...pitches)).toBeGreaterThanOrEqual(44)
  expect(Math.max(...pitches)).toBeLessThanOrEqual(70)
  // Drawn in its written pitch: 14 semitones above the concert pitch it sounds.
  expect(await firstWrittenNote(page)).toBe(firstConcertNote(after.timeline!) + 14)

  await reloadHarness(page)
  expect(await instrumentLabels(page)).toEqual([...BUILT_IN_LABELS, 'Low tenor'])
  await expect(radio(page, INSTRUMENT_GROUP, 'Low tenor')).toHaveAttribute('aria-checked', 'true')
  await expect(instrumentActions(page)).toHaveText('Edit my instrument')
  expect((await harnessSnapshot(page)).instrumentProfileId).toBe(MY_INSTRUMENT_ID)
})

// @test-link [[rule_my_instrument_range_limits]]
test.describe('the range is refused live, never clamped', () => {
  test('under two octaves Save is disabled with its refusal, the stepper steps on, and a transposition step keeps the written range', async ({
    page,
  }) => {
    await gotoStorageHarness(page)
    await openSheet(page)
    // The tenor template: written C4 to C6.
    await expect(rangeAlert(page)).toHaveCount(0)
    await expect(sheetActionButton(page, 'Save')).toBeEnabled()

    await stepTo(page, 'Highest note', 83)
    await expect(rangeAlert(page)).toHaveText(`${SPAN_LEAD} It has 23.`)
    await expect(sheetActionButton(page, 'Save')).toBeDisabled()
    await stepTo(page, 'Highest note', 79)
    await expect(rangeAlert(page)).toHaveText(`${SPAN_LEAD} It has 19.`)
    await expect(sheetActionButton(page, 'Save')).toBeDisabled()
    await stepTo(page, 'Highest note', 84)
    await expect(rangeAlert(page)).toHaveCount(0)
    await expect(sheetActionButton(page, 'Save')).toBeEnabled()

    await stepTo(page, 'Sounds', -12)
    await expect(stepper(page, 'Sounds')).toContainText('12 lower')
    await expect(stepper(page, 'Lowest note')).toHaveAttribute('aria-valuenow', '60')
    await expect(stepper(page, 'Highest note')).toHaveAttribute('aria-valuenow', '84')
    await expect(stepper(page, 'Lowest note')).toContainText('C4')
    await expect(stepper(page, 'Highest note')).toContainText('C6')

    await sheetActionButton(page, 'Cancel').click()
    await expect(mySheet(page)).toHaveCount(0)
    await expect(instrumentActions(page)).toBeFocused()
    expect(await instrumentRecords(page)).toEqual([])
  })

  test('outside the clef’s bound Save is disabled with its refusal in note names: C2 to C7 in treble clef, E0 to E5 in bass clef', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await gotoStorageHarness(page)
    await openSheet(page)
    // The keyboard template: written C3 to C5, no transposition; a new one starts in treble clef.
    await sheetSegment(page, 'Start from', 'C MIDI keyboard').click()
    await expect(sheetSegment(page, 'Clef', 'Treble clef')).toHaveAttribute('aria-checked', 'true')
    const save = sheetActionButton(page, 'Save')

    await stepTo(page, 'Lowest note', 36)
    await expect(rangeAlert(page)).toHaveCount(0)
    await stepTo(page, 'Lowest note', 35)
    await expect(rangeAlert(page)).toHaveText(`${TREBLE_LEAD} B1 is too low. It fits in bass clef.`)
    await expect(save).toBeDisabled()
    await stepTo(page, 'Lowest note', 36)
    await stepTo(page, 'Highest note', 96)
    await expect(rangeAlert(page)).toHaveCount(0)
    await expect(save).toBeEnabled()
    await stepTo(page, 'Highest note', 97)
    await expect(rangeAlert(page)).toHaveText(`${TREBLE_LEAD} C♯7 is too high.`)
    await expect(save).toBeDisabled()

    // Bass clef: written C2 to C♯7 reaches far above E5; E0 to E5 is allowed.
    await sheetSegment(page, 'Clef', 'Bass clef').click()
    await expect(rangeAlert(page)).toHaveText(`${BASS_LEAD} C♯7 is too high.`)
    await stepTo(page, 'Highest note', 76)
    await expect(rangeAlert(page)).toHaveCount(0)
    await stepTo(page, 'Lowest note', 16)
    await expect(rangeAlert(page)).toHaveCount(0)
    await expect(save).toBeEnabled()
    await stepTo(page, 'Lowest note', 15)
    await expect(rangeAlert(page)).toHaveText(`${BASS_LEAD} E♭0 is too low.`)
    await expect(save).toBeDisabled()
    await stepTo(page, 'Lowest note', 16)
    await stepTo(page, 'Highest note', 77)
    await expect(rangeAlert(page)).toHaveText(`${BASS_LEAD} F5 is too high.`)
    await expect(save).toBeDisabled()
    await stepTo(page, 'Highest note', 76)
    await expect(rangeAlert(page)).toHaveCount(0)
    await expect(save).toBeEnabled()
  })

  test('a clef change checks the range again at once: C2 to C4 stays valid into bass clef, E0 to E2 is refused in treble clef until the range or the clef changes', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await gotoStorageHarness(page)
    await openSheet(page)
    await sheetSegment(page, 'Start from', 'C MIDI keyboard').click()
    const save = sheetActionButton(page, 'Save')

    await stepTo(page, 'Lowest note', 36)
    await stepTo(page, 'Highest note', 60)
    await expect(rangeAlert(page)).toHaveCount(0)
    await sheetSegment(page, 'Clef', 'Bass clef').click()
    await expect(rangeAlert(page)).toHaveCount(0)
    await expect(save).toBeEnabled()

    await stepTo(page, 'Lowest note', 16)
    await stepTo(page, 'Highest note', 40)
    await expect(rangeAlert(page)).toHaveCount(0)
    await sheetSegment(page, 'Clef', 'Treble clef').click()
    await expect(rangeAlert(page)).toHaveText(`${TREBLE_LEAD} E0 is too low. It fits in bass clef.`)
    await expect(save).toBeDisabled()
    // The clef changing back takes the refusal away …
    await sheetSegment(page, 'Clef', 'Bass clef').click()
    await expect(rangeAlert(page)).toHaveCount(0)
    await expect(save).toBeEnabled()
    // … and so does a range back inside the treble clef's bound.
    await sheetSegment(page, 'Clef', 'Treble clef').click()
    await expect(save).toBeDisabled()
    await stepTo(page, 'Highest note', 60)
    await stepTo(page, 'Lowest note', 36)
    await expect(rangeAlert(page)).toHaveCount(0)
    await expect(save).toBeEnabled()
  })
})

// @test-link [[req_my_instrument]]
// @test-link [[rule_settings_saved_on_change]]
test('a name change alone relabels the fourth segment and keeps the phrase; the saved selection still names my instrument', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoStorageHarness(page)
  await readyToStart(page, 7)
  await createThroughSheet(page, { template: TENOR_LABEL, name: 'Tenor' })
  await untilStored(page, { 'controls.instrumentProfileId': MY_INSTRUMENT_ID })
  const requestsBefore = (await idleRequests(page)).length
  const before = await harnessSnapshot(page)

  await openSheet(page)
  await expect(mySheet(page).locator('.sheet-title')).toHaveText('My instrument')
  await expect(nameField(page)).toBeFocused()
  await nameField(page).fill('Night tenor')
  await saveSheet(page)

  expect(await instrumentLabels(page)).toEqual([...BUILT_IN_LABELS, 'Night tenor'])
  await expect(radio(page, INSTRUMENT_GROUP, 'Night tenor')).toHaveAttribute('aria-checked', 'true')
  await expect
    .poll(() => instrumentRecords(page))
    .toEqual([expect.objectContaining({ name: 'Night tenor', template: 'bb-tenor' })])
  await page.waitForTimeout(300)
  expect(await idleRequests(page)).toHaveLength(requestsBefore)
  const after = await harnessSnapshot(page)
  expect(after.timeline).toBe(before.timeline)
  expect(after.requestId).toBe(before.requestId)
  expect((await storedSettings(page))['controls.instrumentProfileId']).toBe(MY_INSTRUMENT_ID)
})

/** Each transposition step from the tenor's 14 lower to 6 higher, then back to 12 lower. */
const NAMED_STEPS = [
  [
    -14,
    '14 lower',
    'A major ninth lower (an octave and a major second): a written C4 sounds as B♭2.',
  ],
  [6, '6 higher', 'An augmented fourth higher: a written C4 sounds as F♯4.'],
  [-12, '12 lower', 'One octave lower: a written C4 sounds as C3.'],
] as const

// @test-link [[rule_my_instrument_transposition_named_interval]]
// @test-link [[entity_my_instrument_record]]
test('each transposition step names its interval; 12 lower is saved and reloads as lower', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await gotoStorageHarness(page)
  await openSheet(page)
  const sounds = stepper(page, 'Sounds')
  const [start, ...targets] = NAMED_STEPS
  await expect(sounds).toHaveAttribute('aria-valuenow', String(start[0]))
  await expect(sounds).toContainText(start[1])
  await expect(transpositionNote(page)).toHaveText(start[2])

  await sounds.focus()
  let previous: string = start[2]
  let count: number = start[0]
  for (const [target, valueText, note] of targets) {
    const key = target > count ? 'ArrowUp' : 'ArrowDown'
    while (count !== target) {
      await page.keyboard.press(key)
      count += key === 'ArrowUp' ? 1 : -1
      await expect(sounds).toHaveAttribute('aria-valuenow', String(count))
      const shown = (await transpositionNote(page).textContent()) ?? ''
      expect(shown, `the note at ${count}`).not.toBe(previous)
      expect(shown).toMatch(/: a written C4 sounds as [A-G][♯♭]?-?\d\.$/u)
      previous = shown
    }
    await expect(sounds).toContainText(valueText)
    await expect(transpositionNote(page)).toHaveText(note)
  }

  await saveSheet(page)
  await expect
    .poll(() => instrumentRecords(page))
    .toEqual([
      expect.objectContaining({ transposition: { octaves: 1, semitones: 0, direction: 'lower' } }),
    ])

  await reloadHarness(page)
  await openSheet(page)
  await expect(stepper(page, 'Sounds')).toHaveAttribute('aria-valuenow', '-12')
  await expect(stepper(page, 'Sounds')).toContainText('12 lower')
  await expect(stepper(page, 'Sounds')).toHaveAttribute(
    'aria-valuetext',
    '12 semitones lower, one octave',
  )
  await expect(transpositionNote(page)).toHaveText(NAMED_STEPS[2][2])
})
