/**
 * v3.0 chunk 20b, the My instrument sheet on the workspace harness (port 4175), part 2: deleting
 * my instrument (selected or not, the remembered controller untouched), a clef change alone
 * redrawing the phrase and resizing the staff, the phrases pre-generated at Idle re-checked at a
 * clef change, and the first save of a visit asking once for persistent storage.
 */
import { expect, test, type Page } from '@playwright/test'

import {
  KEYS,
  clickControllerStatus,
  gotoControllerHarness,
  sheetClose,
  watchPageErrors,
} from '../controller/controller-helpers'
import { fitChecks, harnessSnapshot, queueFitVerdicts } from '../release/harness-helpers'
import { readyToStart, sessionState, startSession } from '../session/session-helpers'
import { radio } from '../workspace/helpers'
import {
  backgroundRecordsFrom,
  generationRecords,
  gotoPregenerationHarness,
  holdBackground,
  phraseOfSeed,
  playerOrSessionRecordsFrom,
  readyWithSessionSeed,
  untilBackgroundHeld,
  untilQueueFull,
} from '../workspace/pregeneration-helpers'
import {
  gotoStorageHarness,
  reloadHarness,
  seedMyInstrument,
  seedSettings,
  storedSettings,
  untilStored,
} from './storage-helpers'

import {
  BUILT_IN_LABELS,
  F_CLEF,
  G_CLEF,
  INSTRUMENT_GROUP,
  MY_INSTRUMENT_ID,
  SESSION_SEED,
  TENOR_LABEL,
  controllerRecords,
  createThroughSheet,
  idleRequests,
  instrumentActions,
  instrumentLabels,
  instrumentRecords,
  mySheet,
  nameField,
  openSheet,
  persistCalls,
  saveSheet,
  sheetActionButton,
  sheetSegment,
  spyOnPersist,
  staffClefs,
  staffHeights,
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
test.describe('deleting my instrument', () => {
  test('while selected returns the control to its template, its record gone, the remembered controller untouched', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await gotoControllerHarness(page, { atLoad: { permission: 'granted', devices: [KEYS] } })
    await clickControllerStatus(page)
    await expect(mySheet(page).locator('#sheet-title')).toHaveText('Check your controller')
    await sheetClose(page).click()
    await expect(mySheet(page)).toHaveCount(0)
    await expect.poll(() => controllerRecords(page)).toHaveLength(1)
    const controller = await controllerRecords(page)

    await readyToStart(page, 7)
    await createThroughSheet(page, { template: 'E-flat alto saxophone', name: 'My alto' })
    await expect.poll(() => instrumentRecords(page)).toHaveLength(1)

    await openSheet(page)
    await mySheet(page).locator('.sheet-actions-destructive').getByRole('button').click()
    await expect(mySheet(page).locator('.sheet-title')).toHaveText('Delete my instrument?')
    await expect(mySheet(page).locator('.sheet-body')).toContainText(
      'My alto will be deleted, with its clef, range and transposition. The instrument goes back to E-flat alto saxophone, the profile it was made from.',
    )
    await expect(sheetActionButton(page, 'Cancel')).toBeFocused()
    await sheetActionButton(page, 'Delete my instrument').click()
    await expect(mySheet(page)).toHaveCount(0)

    await expect.poll(() => instrumentLabels(page)).toEqual(BUILT_IN_LABELS)
    await expect(radio(page, INSTRUMENT_GROUP, 'E-flat alto saxophone')).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect(instrumentActions(page)).toHaveText('Create my instrument')
    await expect.poll(() => instrumentRecords(page)).toEqual([])
    await untilStored(page, { 'controls.instrumentProfileId': 'eb-alto' })
    expect(await controllerRecords(page)).toEqual(controller)
    await untilIdleDrawn(page)
    expect((await harnessSnapshot(page)).instrumentProfileId).toBe('eb-alto')
  })

  test('while another profile is selected changes nothing else: the selection and the phrase stay', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await gotoStorageHarness(page)
    await readyToStart(page, 7)
    await createThroughSheet(page, { template: TENOR_LABEL, name: 'Tenor' })
    await radio(page, INSTRUMENT_GROUP, 'C MIDI keyboard').click()
    await expect(radio(page, INSTRUMENT_GROUP, 'C MIDI keyboard')).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await untilIdleDrawn(page)
    await untilStored(page, { 'controls.instrumentProfileId': 'c-keyboard' })
    const requestsBefore = (await idleRequests(page)).length
    const before = await harnessSnapshot(page)

    await openSheet(page)
    await mySheet(page).locator('.sheet-actions-destructive').getByRole('button').click()
    await expect(mySheet(page).locator('.sheet-body')).toContainText(
      'Tenor will be deleted, with its clef, range and transposition.',
    )
    await expect(mySheet(page).locator('.sheet-body')).not.toContainText('goes back')
    await sheetActionButton(page, 'Delete my instrument').click()
    await expect(mySheet(page)).toHaveCount(0)

    await expect.poll(() => instrumentLabels(page)).toEqual(BUILT_IN_LABELS)
    await expect(radio(page, INSTRUMENT_GROUP, 'C MIDI keyboard')).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect(instrumentActions(page)).toHaveText('Create my instrument')
    await expect.poll(() => instrumentRecords(page)).toEqual([])
    await page.waitForTimeout(300)
    expect(await idleRequests(page)).toHaveLength(requestsBefore)
    const after = await harnessSnapshot(page)
    expect(after.timeline).toBe(before.timeline)
    expect(after.instrumentProfileId).toBe('c-keyboard')
    expect((await storedSettings(page))['controls.instrumentProfileId']).toBe('c-keyboard')
  })
})

// @test-link [[req_my_instrument]]
// @test-link [[entity_my_instrument_record]]
test('a new one starts in treble clef; bass clef saved redraws the phrase without replacing it, resizes the staff and survives a reload', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoStorageHarness(page)
  await readyToStart(page, 7)
  await openSheet(page)
  await expect(sheetSegment(page, 'Clef', 'Treble clef')).toHaveAttribute('aria-checked', 'true')
  await sheetActionButton(page, 'Cancel').click()
  // Written C2 to C4: in treble clef the staff needs 19 staff spaces, in bass clef the built-in 16.
  await createThroughSheet(page, {
    template: 'C MIDI keyboard',
    name: 'Low keys',
    range: { minMidi: 36, maxMidi: 60 },
  })
  await expect.poll(() => staffClefs(page)).toEqual([G_CLEF])
  await expect.poll(() => staffHeights(page)).toEqual([190])
  const requestsBefore = (await idleRequests(page)).length
  const before = await harnessSnapshot(page)

  await openSheet(page)
  await sheetSegment(page, 'Clef', 'Bass clef').click()
  await saveSheet(page)

  await expect.poll(() => staffClefs(page)).toEqual([F_CLEF])
  await expect.poll(() => staffHeights(page)).toEqual([160])
  await untilIdleDrawn(page)
  await page.waitForTimeout(300)
  expect(await idleRequests(page)).toHaveLength(requestsBefore)
  const after = await harnessSnapshot(page)
  expect(after.timeline).toBe(before.timeline)
  expect(after.requestId).toBe(before.requestId)
  await expect
    .poll(() => instrumentRecords(page))
    .toEqual([
      expect.objectContaining({ clef: 'bass', writtenRange: { minMidi: 36, maxMidi: 60 } }),
    ])

  await reloadHarness(page)
  await expect(radio(page, INSTRUMENT_GROUP, 'Low keys')).toHaveAttribute('aria-checked', 'true')
  await readyToStart(page, 7)
  await expect.poll(() => staffClefs(page)).toEqual([F_CLEF])
  expect(await staffHeights(page)).toEqual([160])
  await openSheet(page)
  await expect(sheetSegment(page, 'Clef', 'Bass clef')).toHaveAttribute('aria-checked', 'true')
})

/** Written C2 to C4 in bass clef, no transposition: the built-in 16 staff spaces; 19 in treble. */
const LOW_KEYS_BASS: WorkspaceHarnessMyInstrumentInput = {
  template: 'c-keyboard',
  name: 'Low keys',
  clef: 'bass',
  writtenRange: { minMidi: 36, maxMidi: 60 },
  transposition: { octaves: 0, semitones: 0, direction: 'same' },
}

/**
 * Intent: with `LOW_KEYS_BASS` saved and selected, on the harness with pre-generation on, publish
 * phrase 1 and wait until the queue is full, then hold the background gate. Returns the call
 * index after which the change's effects are read.
 */
async function queueFullWithLowKeys(page: Page): Promise<number> {
  await gotoStorageHarness(page)
  await seedMyInstrument(page, LOW_KEYS_BASS)
  await seedSettings(page, { 'controls.instrumentProfileId': MY_INSTRUMENT_ID })
  await gotoPregenerationHarness(page)
  await expect(radio(page, INSTRUMENT_GROUP, LOW_KEYS_BASS.name)).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await readyWithSessionSeed(page, SESSION_SEED)
  await untilQueueFull(page)
  await expect.poll(() => staffHeights(page)).toEqual([160])
  await holdBackground(page)
  return (await generationRecords(page)).length
}

/** Intent: switch my instrument to treble clef through the sheet: the staff grows to 19 spaces. */
async function switchToTreble(page: Page): Promise<void> {
  await openSheet(page)
  await sheetSegment(page, 'Clef', 'Treble clef').click()
  await saveSheet(page)
  await expect.poll(() => staffClefs(page)).toEqual([G_CLEF])
  await expect.poll(() => staffHeights(page)).toEqual([190])
}

// @test-link [[rule_pregeneration_discarded_on_change]]
test.describe('a clef change re-checks the phrases pre-generated at Idle', () => {
  test('one that no longer fits is discarded with every phrase after it', async ({ page }) => {
    test.setTimeout(120_000)
    const from = await queueFullWithLowKeys(page)
    // The re-check's first two fit checks: phrase 2 fits, phrase 3 no longer does.
    await queueFitVerdicts(page, ['fits', 'notes_too_wide'])

    await switchToTreble(page)

    const restarted = await untilBackgroundHeld(page, from)
    expect(await phraseOfSeed(page, SESSION_SEED, restarted.seed)).toBe(3)
    expect(restarted.instrumentProfile.id).toBe(MY_INSTRUMENT_ID)
    expect(await playerOrSessionRecordsFrom(page, from)).toEqual([])
  })

  test('one that still fits stays', async ({ page }) => {
    test.setTimeout(120_000)
    const from = await queueFullWithLowKeys(page)
    const checksBefore = await fitChecks(page)

    await switchToTreble(page)

    // Every ready phrase was checked again, and none was discarded: nothing new is attempted.
    await expect.poll(() => fitChecks(page)).toBeGreaterThanOrEqual(checksBefore + 4)
    await page.waitForTimeout(500)
    expect(await backgroundRecordsFrom(page, from)).toEqual([])
    expect(await playerOrSessionRecordsFrom(page, from)).toEqual([])
    await startSession(page)
    expect((await sessionState(page)).latestReady).toBeGreaterThanOrEqual(2)
  })
})

// @test-link [[rule_persistent_storage_requested]]
test('the first save of my instrument asks for persistent storage once, a second save none', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await spyOnPersist(page)
  await gotoStorageHarness(page)
  await readyToStart(page, 7)
  expect(await persistCalls(page)).toBe(0)

  await createThroughSheet(page, { template: TENOR_LABEL, name: 'Tenor' })
  await expect.poll(() => persistCalls(page)).toBe(1)

  await openSheet(page)
  await nameField(page).fill('Tenor two')
  await saveSheet(page)
  await expect
    .poll(() => instrumentRecords(page))
    .toEqual([expect.objectContaining({ name: 'Tenor two' })])
  await page.waitForTimeout(300)
  expect(await persistCalls(page)).toBe(1)
})
