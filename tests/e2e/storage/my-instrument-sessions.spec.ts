/**
 * v3.0 chunk 20c, my instrument's sessions, on the workspace harness (port 4175) with its fake
 * audio clock and fake MIDI access, over the browser's real IndexedDB; each test starts from an
 * empty browser context and plays its sessions on a fixed wall clock:
 *
 * - deleting my instrument names the kept sessions played with it and deletes exactly those with
 *   its record (summaries, bodies, played notes), the other profile's sessions untouched;
 * - a range or transposition change while my instrument has kept sessions warns first, `Cancel`
 *   keeping the edit and saving nothing, `Save and erase` saving and erasing them; with none, it
 *   saves at once; a name or clef change never warns, and a kept bass-clef session still reviews
 *   in bass clef after the clef is switched;
 * - the check's `Use for my instrument` that changes the transposition reads `Use and erase`;
 * - a confirmed erase closes the Review of the session that just ended, as `Delete session` does;
 * - an outdated tab withholds the range, the transposition and the deletion, deleting nothing;
 * - a refused deletion or save-and-erase keeps its confirmation with its error line, changing
 *   nothing.
 *
 * Saved data is seeded only by playing sessions and through the harness's storage seams
 * (`seedKeptSessionCopy`, `seedPlayedNotes`, `seedMyInstrument`, `refuseSaves`, `openNewerVersion`).
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  KEYS,
  connectThroughSheet,
  play,
  sheetActions,
  sheetBodyTexts,
  sheetClose,
  watchPageErrors,
} from '../controller/controller-helpers'
import { expectIdleReady, reviewLink, reviewPanel } from '../review/review-helpers'
import {
  EMPTY,
  keyStartedAt,
  rowOpen,
  rows,
  seedCopy,
  sessionAt,
  sessionDateOf,
  sessionsPanel,
  showListFromCueRow,
  startAt,
} from '../review/session-list-helpers'
import {
  keyedRecords,
  pinButton,
  portChanges,
  star,
  summaryOf,
} from '../review/review-tools-helpers'
import { readyToStart, sessionAction, sessionState } from '../session/session-helpers'
import { radio } from '../workspace/helpers'
import {
  BUILT_IN_LABELS,
  F_CLEF,
  G_CLEF,
  INSTRUMENT_GROUP,
  MY_INSTRUMENT_ID,
  TENOR_LABEL,
  createThroughSheet,
  instrumentLabels,
  instrumentRecords,
  mySheet,
  nameField,
  openSheet,
  saveSheet,
  sheetActionButton,
  sheetSegment,
  staffClefs,
  stepTo,
  stepper,
} from './my-instrument-sheet-helpers'
import {
  databaseRecords,
  gotoStorageHarness,
  reloadHarness,
  seedMyInstrument,
  seedSettings,
  untilStored,
} from './storage-helpers'

test.use({ locale: 'en-US', timezoneId: 'Europe/Paris' })

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** My instrument's name in the seeded cases: made from the B-flat tenor saxophone. */
const MY_NAME = 'Low tenor'
/** The keys of the two seeded copies: of the tenor's session, and of my instrument's latest. */
const TENOR_COPY = 'session-copy-tenor'
const MINE_COPY = 'session-copy-mine'

/** The kept-session stores. */
const KEPT_STORES = ['sessionSummaries', 'sessionBodies', 'playedNotes'] as const

const ERASE_TITLE = 'Save and erase sessions?'
const DELETE_TITLE = 'Delete my instrument?'
const UNDONE = "This can't be undone."
const ERASE_THREE =
  'Changing the range or the transposition erases the 3 sessions played with this instrument, with their favorite phrases, comments and played notes.'
const KEEP_HINT = 'To keep a session, cancel, then export it from its review first.'
const ERASE_FAILED = "That couldn't be saved, and nothing was erased. Try again."
const DELETE_FAILED = "That couldn't be deleted. Try again."
const RELOAD_LINE = `Reload this page to change the range or the transposition, or to delete ${MY_NAME}: either would erase the sessions played with this instrument, and this page can't delete anything until it is reloaded.`

/** The tenor's written range and transposition (a major ninth lower), as stored. */
const TENOR_RANGE = { minMidi: 60, maxMidi: 84 }
const ONE_OCTAVE_LOWER = { octaves: 1, semitones: 0, direction: 'lower' }

/** The seeded kept sessions' keys: my instrument's three, the tenor profile's two. */
interface Seeded {
  readonly mine: readonly string[]
  readonly tenor: readonly string[]
}

/** The kept-session keys each store holds, sorted. */
type StoredKeys = Record<(typeof KEPT_STORES)[number], string[]>

/** Intent: the keys each kept-session store holds now, sorted, read through the seam. */
async function storedKeys(page: Page): Promise<StoredKeys> {
  const entries = await Promise.all(
    KEPT_STORES.map(async (store) => {
      const keys = (await keyedRecords(page, store)).map((record) => record.key)
      return [store, keys.sort()] as const
    }),
  )
  return Object.fromEntries(entries) as StoredKeys
}

/** Intent: the keys each kept-session store holds, sorted, read straight from IndexedDB. */
async function databaseKeys(page: Page): Promise<Record<string, number>> {
  const records = await databaseRecords(page)
  return Object.fromEntries(
    [...KEPT_STORES, 'instrument'].map((store) => [store, (records[store] ?? []).length]),
  )
}

/** Intent: the stored keys with the seed's five sessions, played notes kept for one of mine. */
function allFive(seeded: Seeded): StoredKeys {
  const all = [...seeded.mine, ...seeded.tenor].sort()
  return { sessionSummaries: all, sessionBodies: [...all], playedNotes: [MINE_COPY] }
}

/** Intent: the stored keys with only the tenor's two sessions. */
function tenorOnly(seeded: Seeded): StoredKeys {
  const tenor = [...seeded.tenor].sort()
  return { sessionSummaries: tenor, sessionBodies: [...tenor], playedNotes: [] }
}

/** Intent: every record of every kept-session store stored under one of `keys`, by store. */
async function recordsUnder(
  page: Page,
  keys: readonly string[],
): Promise<Record<string, { readonly key: string; readonly value: unknown }[]>> {
  const entries = await Promise.all(
    KEPT_STORES.map(async (store) => {
      const records = await keyedRecords(page, store)
      return [store, records.filter((record) => keys.includes(record.key))] as const
    }),
  )
  return Object.fromEntries(entries)
}

/** Intent: close the Review showing, back to Idle with a phrase drawn. */
async function closeReview(page: Page): Promise<void> {
  await expectIdleReady(page)
  await expect(sessionAction(page)).toHaveText('Close review')
  await sessionAction(page).click()
  await expect(sessionAction(page)).toHaveText('Start session')
}

/** Intent: choose an instrument profile with its radio, at Idle, and wait until it is checked. */
async function chooseInstrument(page: Page, label: string): Promise<void> {
  await radio(page, INSTRUMENT_GROUP, label).click()
  await expect(radio(page, INSTRUMENT_GROUP, label)).toHaveAttribute('aria-checked', 'true')
}

/**
 * Intent: three kept sessions of my instrument (made from the tenor, named `MY_NAME`, selected)
 * and two of the tenor profile, then a reload: M1 (start 1, a favorite, so pinned), T1 (start 2,
 * the tenor, pinned), M3 (start 5, the most recent), then copies T2 of T1 (start 3) and M2 of M3
 * (start 4, with played notes). The copies come after the last session's own save, which deletes
 * every unpinned kept session but its own.
 */
async function seedSessions(page: Page): Promise<Seeded> {
  await gotoStorageHarness(page)
  await readyToStart(page, 7)
  await createThroughSheet(page, { template: TENOR_LABEL, name: MY_NAME })

  await sessionAt(page, startAt(1))
  const mine1 = await keyStartedAt(page, startAt(1))
  await star(page, 1).click()
  await expect.poll(async () => (await summaryOf(page, mine1))?.pinned).toBe(true)

  await closeReview(page)
  await chooseInstrument(page, TENOR_LABEL)
  await sessionAt(page, startAt(2))
  const tenor1 = await keyStartedAt(page, startAt(2))
  await pinButton(page).click()
  await expect.poll(async () => (await summaryOf(page, tenor1))?.pinned).toBe(true)

  await closeReview(page)
  await chooseInstrument(page, MY_NAME)
  await untilStored(page, { 'controls.instrumentProfileId': MY_INSTRUMENT_ID })
  await sessionAt(page, startAt(5))
  const mine3 = await keyStartedAt(page, startAt(5))
  await expect.poll(async () => (await keyedRecords(page, 'sessionSummaries')).length).toBe(3)

  await seedCopy(page, tenor1, TENOR_COPY, { startedAt: startAt(3), newer: false })
  await seedCopy(page, mine3, MINE_COPY, { startedAt: startAt(4), newer: false })
  await page.evaluate((key) => window.__workspaceHarness.storage.seedPlayedNotes(key), MINE_COPY)
  await reloadHarness(page)

  const seeded: Seeded = { mine: [mine1, MINE_COPY, mine3], tenor: [tenor1, TENOR_COPY] }
  // The seed as stored: five sessions, three of them played with my instrument.
  expect(await storedKeys(page)).toEqual(allFive(seeded))
  const instruments = Object.fromEntries(
    (await keyedRecords(page, 'sessionSummaries')).map(({ key, value }) => [
      key,
      (value as { instrument: { id: string } }).instrument.id,
    ]),
  )
  expect(instruments).toEqual({
    [mine1]: MY_INSTRUMENT_ID,
    [MINE_COPY]: MY_INSTRUMENT_ID,
    [mine3]: MY_INSTRUMENT_ID,
    [tenor1]: 'bb-tenor',
    [TENOR_COPY]: 'bb-tenor',
  })
  expect((await summaryOf(page, mine1))?.favoritesCount).toBe(1)
  expect((await summaryOf(page, MINE_COPY))?.playedNotesKept).toBe(true)
  await expect(radio(page, INSTRUMENT_GROUP, MY_NAME)).toHaveAttribute('aria-checked', 'true')
  return seeded
}

/** Intent: the open confirmation's body paragraphs, in order. */
function bodyParagraphs(page: Page): Locator {
  return mySheet(page).locator('.sheet-body > p')
}

/** Intent: the open sheet's error line. */
function errorLine(page: Page): Locator {
  return mySheet(page).locator('.sheet-body > .inline-alert.alert-error')
}

/** Intent: assert the erase warning shows, naming `first`, with its hint and its two actions. */
async function expectEraseWarning(page: Page, first: string, hint: string): Promise<void> {
  await expect(mySheet(page)).toHaveAccessibleName(ERASE_TITLE)
  await expect(bodyParagraphs(page)).toHaveText([first, UNDONE, hint])
  await expect(bodyParagraphs(page).nth(2)).toHaveClass(/sheet-hint/)
  await expect(mySheet(page).locator('.sheet-actions > button')).toHaveText([
    'Save and erase',
    'Cancel',
  ])
  await expect(sheetActionButton(page, 'Save and erase')).toHaveClass(/btn-error/)
  await expect(sheetActionButton(page, 'Cancel')).toBeFocused()
}

/** Intent: the clef glyphs every staff SVG inside `scope` draws, in document order. */
function clefGlyphs(scope: Locator): Promise<string[]> {
  return scope
    .locator('svg.staff-svg g.vf-clef > text')
    .evaluateAll((texts) => texts.map((text) => text.textContent ?? ''))
}

/** Intent: wait until the Review shows staves, and give their clef glyphs. */
async function reviewClefs(page: Page): Promise<string[]> {
  await expect.poll(async () => (await clefGlyphs(reviewPanel(page))).length).toBeGreaterThan(0)
  return clefGlyphs(reviewPanel(page))
}

// @test-link [[entity_my_instrument_record]]
test('deleting my instrument says three sessions go; confirmed, exactly those go with its record, the tenor ones untouched, and after a reload', async ({
  page,
}) => {
  test.setTimeout(240_000)
  const seeded = await seedSessions(page)
  const tenorBefore = await recordsUnder(page, seeded.tenor)

  await openSheet(page)
  await mySheet(page).locator('.sheet-actions-destructive').getByRole('button').click()
  await expect(mySheet(page)).toHaveAccessibleName(DELETE_TITLE)
  await expect(bodyParagraphs(page)).toHaveText([
    `${MY_NAME} will be deleted, with its clef, range and transposition. The 3 sessions played with it go too, with their favorite phrases, comments and played notes. The instrument goes back to ${TENOR_LABEL}, the profile it was made from.`,
    UNDONE,
    KEEP_HINT,
  ])
  await expect(bodyParagraphs(page).nth(2)).toHaveClass(/sheet-hint/)
  await expect(sheetActionButton(page, 'Delete my instrument')).toHaveClass(/btn-error/)
  await expect(sheetActionButton(page, 'Cancel')).toBeFocused()
  await sheetActionButton(page, 'Delete my instrument').click()
  await expect(mySheet(page)).toHaveCount(0)

  await expect.poll(() => storedKeys(page)).toEqual(tenorOnly(seeded))
  expect(await recordsUnder(page, seeded.tenor)).toEqual(tenorBefore)
  await expect.poll(() => instrumentRecords(page)).toEqual([])
  await expect(radio(page, INSTRUMENT_GROUP, TENOR_LABEL)).toHaveAttribute('aria-checked', 'true')
  await untilStored(page, { 'controls.instrumentProfileId': 'bb-tenor' })

  await reloadHarness(page)
  expect(await storedKeys(page)).toEqual(tenorOnly(seeded))
  expect(await recordsUnder(page, seeded.tenor)).toEqual(tenorBefore)
  expect(await instrumentRecords(page)).toEqual([])
  await expect.poll(() => instrumentLabels(page)).toEqual(BUILT_IN_LABELS)
  await showListFromCueRow(page)
  await expect(rows(page)).toHaveCount(2)
})

/** The two sound changes the erase warning guards, each made through the sheet's steppers. */
const SOUND_CHANGES = [
  {
    what: 'range',
    edit: (page: Page) => stepTo(page, 'Lowest note', 59),
    shown: { name: 'Lowest note', value: '59' },
    saved: { writtenRange: { minMidi: 59, maxMidi: 84 } },
  },
  {
    what: 'transposition',
    edit: (page: Page) => stepTo(page, 'Sounds', -12),
    shown: { name: 'Sounds', value: '-12' },
    saved: { transposition: ONE_OCTAVE_LOWER },
  },
] as const

// @test-link [[entity_my_instrument_record]]
test.describe('a sound change while my instrument has kept sessions', () => {
  for (const change of SOUND_CHANGES) {
    // @test-link [[entity_my_instrument_record]]
    test(`a ${change.what} change warns with three; Cancel keeps the edit and saves nothing; Save and erase saves it and erases the three`, async ({
      page,
    }) => {
      test.setTimeout(240_000)
      const seeded = await seedSessions(page)
      const tenorBefore = await recordsUnder(page, seeded.tenor)
      const [instrumentBefore] = await instrumentRecords(page)

      await openSheet(page)
      await change.edit(page)
      await sheetActionButton(page, 'Save').click()
      await expectEraseWarning(page, ERASE_THREE, KEEP_HINT)

      await sheetActionButton(page, 'Cancel').click()
      await expect(mySheet(page)).toHaveAccessibleName('My instrument')
      await expect(sheetActionButton(page, 'Save')).toBeFocused()
      await expect(stepper(page, change.shown.name)).toHaveAttribute(
        'aria-valuenow',
        change.shown.value,
      )
      await page.waitForTimeout(300)
      expect(await instrumentRecords(page)).toEqual([instrumentBefore])
      expect(await storedKeys(page)).toEqual(allFive(seeded))

      await sheetActionButton(page, 'Save').click()
      await expectEraseWarning(page, ERASE_THREE, KEEP_HINT)
      await sheetActionButton(page, 'Save and erase').click()
      await expect(mySheet(page)).toHaveCount(0)

      await expect
        .poll(() => instrumentRecords(page))
        .toEqual([expect.objectContaining({ name: MY_NAME, ...change.saved })])
      await expect.poll(() => storedKeys(page)).toEqual(tenorOnly(seeded))
      expect(await recordsUnder(page, seeded.tenor)).toEqual(tenorBefore)
      await expect(radio(page, INSTRUMENT_GROUP, MY_NAME)).toHaveAttribute('aria-checked', 'true')

      await reloadHarness(page)
      expect(await instrumentRecords(page)).toEqual([expect.objectContaining(change.saved)])
      expect(await storedKeys(page)).toEqual(tenorOnly(seeded))
    })
  }
})

// @test-link [[rule_transposition_check_sets_my_instrument]]
// @test-link [[entity_my_instrument_record]]
test('the check’s use for my instrument that changes its transposition names three, reads Use and erase, and confirmed erases them', async ({
  page,
}) => {
  test.setTimeout(240_000)
  const seeded = await seedSessions(page)
  const tenorBefore = await recordsUnder(page, seeded.tenor)

  await connectThroughSheet(page, [KEYS])
  await expect(mySheet(page).locator('#sheet-title')).toHaveText('Check your controller')
  // My instrument's check note is the tenor's, written C5 sounding B-flat 3 (58): C4 (60) is
  // 2 semitones higher, so its use makes my instrument sound one octave lower.
  await play(page, KEYS, 60)
  await sheetActionButton(page, 'Use this for my instrument').click()

  await expect(mySheet(page)).toHaveAccessibleName('Use this for my instrument?')
  await expect
    .poll(() => sheetBodyTexts(page))
    .toEqual([
      'One octave lower: a written C4 will sound as C3.',
      `${MY_NAME} keeps its range, C4 to C6 in written notes, and its clef.`,
      'Changing the transposition erases the 3 sessions played with my instrument, with their favorite phrases, comments and played notes.',
      UNDONE,
      'To keep a session, choose Back, close this sheet, then export it from its review.',
    ])
  expect(await sheetActions(page)).toEqual([
    { label: 'Use and erase', primary: false },
    { label: 'Back', primary: false },
  ])
  await expect(sheetActionButton(page, 'Use and erase')).toHaveClass(/btn-error/)
  await page.waitForTimeout(300)
  expect(await storedKeys(page)).toEqual(allFive(seeded))

  await sheetActionButton(page, 'Use and erase').click()
  await expect(mySheet(page).locator('#sheet-title')).toHaveText('Controller connected')

  await expect
    .poll(() => instrumentRecords(page))
    .toEqual([
      expect.objectContaining({
        id: MY_INSTRUMENT_ID,
        name: MY_NAME,
        writtenRange: TENOR_RANGE,
        transposition: ONE_OCTAVE_LOWER,
      }),
    ])
  await expect.poll(() => storedKeys(page)).toEqual(tenorOnly(seeded))
  expect(await recordsUnder(page, seeded.tenor)).toEqual(tenorBefore)
  await expect(radio(page, INSTRUMENT_GROUP, MY_NAME)).toHaveAttribute('aria-checked', 'true')
})

// @test-link [[entity_my_instrument_record]]
test('a name change saves with no warning and keeps every session', async ({ page }) => {
  test.setTimeout(240_000)
  const seeded = await seedSessions(page)
  const before = await recordsUnder(page, [...seeded.mine, ...seeded.tenor])

  await openSheet(page)
  await nameField(page).fill('Tenor two')
  await saveSheet(page)

  await expect
    .poll(() => instrumentRecords(page))
    .toEqual([expect.objectContaining({ name: 'Tenor two', writtenRange: TENOR_RANGE })])
  await expect(radio(page, INSTRUMENT_GROUP, 'Tenor two')).toHaveAttribute('aria-checked', 'true')
  await page.waitForTimeout(300)
  expect(await storedKeys(page)).toEqual(allFive(seeded))
  expect(await recordsUnder(page, [...seeded.mine, ...seeded.tenor])).toEqual(before)
})

/** Written C2 to C4 in bass clef, no transposition: a bass-clef my instrument. */
const LOW_KEYS_BASS: WorkspaceHarnessMyInstrumentInput = {
  template: 'c-keyboard',
  name: 'Low keys',
  clef: 'bass',
  writtenRange: { minMidi: 36, maxMidi: 60 },
  transposition: { octaves: 0, semitones: 0, direction: 'same' },
}

// @test-link [[entity_my_instrument_record]]
// @test-link [[req_kept_session_review]]
test('a clef change saves with no warning and keeps the session; the kept bass-clef session still reviews in bass clef', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page)
  await seedMyInstrument(page, LOW_KEYS_BASS)
  await seedSettings(page, { 'controls.instrumentProfileId': MY_INSTRUMENT_ID })
  await reloadHarness(page)
  await expect(radio(page, INSTRUMENT_GROUP, LOW_KEYS_BASS.name)).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await sessionAt(page, startAt(1))
  const key = await keyStartedAt(page, startAt(1))
  expect((await reviewClefs(page)).every((glyph) => glyph === F_CLEF)).toBe(true)
  const before = await recordsUnder(page, [key])

  await closeReview(page)
  await openSheet(page)
  await sheetSegment(page, 'Clef', 'Treble clef').click()
  await saveSheet(page)
  await expect
    .poll(() => instrumentRecords(page))
    .toEqual([
      expect.objectContaining({ clef: 'treble', writtenRange: LOW_KEYS_BASS.writtenRange }),
    ])
  await expect.poll(() => staffClefs(page)).toEqual([G_CLEF])
  await page.waitForTimeout(300)
  expect(await recordsUnder(page, [key])).toEqual(before)

  const date = await sessionDateOf(page, startAt(1))
  await showListFromCueRow(page)
  await rowOpen(page, date).click()
  const shown = await reviewClefs(page)
  expect(
    shown.every((glyph) => glyph === F_CLEF),
    shown.join(' '),
  ).toBe(true)

  // From the saved data alone.
  await reloadHarness(page)
  await showListFromCueRow(page)
  await rowOpen(page, date).click()
  const reloaded = await reviewClefs(page)
  expect(
    reloaded.every((glyph) => glyph === F_CLEF),
    reloaded.join(' '),
  ).toBe(true)
})

// @test-link [[entity_my_instrument_record]]
// @test-link [[req_kept_session_review]]
test('a confirmed range change closes the Review of the session that just ended, as Delete session does, and Review last session goes', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page)
  await readyToStart(page, 7)
  await createThroughSheet(page, { template: TENOR_LABEL, name: MY_NAME })
  await sessionAt(page, startAt(1))
  await keyStartedAt(page, startAt(1))

  await openSheet(page)
  await stepTo(page, 'Lowest note', 59)
  await sheetActionButton(page, 'Save').click()
  await expectEraseWarning(
    page,
    'Changing the range or the transposition erases the session played with this instrument, with its favorite phrases, comment and played notes. It is the session reviewed on screen, so its review closes.',
    'To keep it, cancel, then export it from its review first.',
  )
  await sheetActionButton(page, 'Save and erase').click()
  await expect(mySheet(page)).toHaveCount(0)

  await expect(reviewPanel(page)).toHaveCount(0)
  await expect(sessionsPanel(page)).toBeVisible()
  await expect(sessionsPanel(page)).toContainText(EMPTY)
  await expect(reviewLink(page)).toHaveCount(0)
  expect((await sessionState(page)).review).toBeNull()
  await expect
    .poll(() => instrumentRecords(page))
    .toEqual([expect.objectContaining({ writtenRange: { minMidi: 59, maxMidi: 84 } })])
  await expect
    .poll(() => storedKeys(page))
    .toEqual({ sessionSummaries: [], sessionBodies: [], playedNotes: [] })
})

// @test-link [[entity_my_instrument_record]]
test('with only the tenor’s kept sessions, a range change saves at once, with no warning', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page)
  await sessionAt(page, startAt(1))
  const tenor = await keyStartedAt(page, startAt(1))
  await closeReview(page)
  await createThroughSheet(page, { template: TENOR_LABEL, name: MY_NAME })
  const before = await recordsUnder(page, [tenor])

  await openSheet(page)
  await stepTo(page, 'Lowest note', 59)
  await saveSheet(page)

  await expect
    .poll(() => instrumentRecords(page))
    .toEqual([expect.objectContaining({ writtenRange: { minMidi: 59, maxMidi: 84 } })])
  await page.waitForTimeout(300)
  expect(await recordsUnder(page, [tenor])).toEqual(before)
  expect((await storedKeys(page)).sessionSummaries).toEqual([tenor])
})

// @test-link [[entity_my_instrument_record]]
// @test-link [[rule_outdated_tab_stops_saving]]
test('in an outdated tab, the sheet shows the reload line, its steppers disabled and no Delete; nothing is deleted', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await seedSessions(page)
  const stored = await databaseKeys(page)
  expect(stored).toEqual({ sessionSummaries: 5, sessionBodies: 5, playedNotes: 1, instrument: 1 })
  await page.evaluate(() => window.__workspaceHarness.storage.openNewerVersion())
  await expect
    .poll(() => page.evaluate(() => window.__workspaceHarness.storage.savingState()))
    .toBe('off-outdated')
  const changesBefore = await portChanges(page)

  await openSheet(page)
  await expect(mySheet(page)).toHaveAccessibleName('My instrument')
  const first = mySheet(page).locator('.sheet-body > :first-child')
  await expect(first).toHaveClass(/inline-alert/)
  await expect(first).toHaveClass(/alert-notice/)
  await expect(first).toHaveText(RELOAD_LINE)
  for (const name of ['Lowest note', 'Highest note', 'Sounds'] as const) {
    await expect(stepper(page, name)).toHaveAttribute('aria-disabled', 'true')
    for (const button of await stepper(page, name).getByRole('button').all()) {
      await expect(button).toBeDisabled()
    }
  }
  await stepper(page, 'Lowest note').focus()
  await page.keyboard.press('ArrowUp')
  await expect(stepper(page, 'Lowest note')).toHaveAttribute('aria-valuenow', '60')
  await expect(mySheet(page).locator('.sheet-actions-destructive')).toHaveCount(0)

  await sheetClose(page).click()
  await expect(mySheet(page)).toHaveCount(0)
  await page.waitForTimeout(300)
  expect(await portChanges(page)).toBe(changesBefore)
  expect(await databaseKeys(page)).toEqual(stored)
})

// @test-link [[entity_my_instrument_record]]
test('a refused deletion keeps the confirmation with its error line; nothing is deleted', async ({
  page,
}) => {
  test.setTimeout(240_000)
  const seeded = await seedSessions(page)
  const [instrumentBefore] = await instrumentRecords(page)
  await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves('other'))

  await openSheet(page)
  await mySheet(page).locator('.sheet-actions-destructive').getByRole('button').click()
  await sheetActionButton(page, 'Delete my instrument').click()

  await expect(errorLine(page)).toHaveText(DELETE_FAILED)
  await expect(mySheet(page)).toHaveAccessibleName(DELETE_TITLE)
  await expect(sheetActionButton(page, 'Delete my instrument')).toBeEnabled()
  expect(await storedKeys(page)).toEqual(allFive(seeded))
  expect(await instrumentRecords(page)).toEqual([instrumentBefore])
  await expect(radio(page, INSTRUMENT_GROUP, MY_NAME)).toHaveAttribute('aria-checked', 'true')

  await reloadHarness(page)
  expect(await storedKeys(page)).toEqual(allFive(seeded))
  expect(await instrumentRecords(page)).toEqual([instrumentBefore])
})

// @test-link [[entity_my_instrument_record]]
test('a refused save-and-erase keeps the warning with its error line; the old range and the three sessions stay, and no notice shows', async ({
  page,
}) => {
  test.setTimeout(240_000)
  const seeded = await seedSessions(page)
  const [instrumentBefore] = await instrumentRecords(page)
  await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves('other'))

  await openSheet(page)
  await stepTo(page, 'Lowest note', 59)
  await sheetActionButton(page, 'Save').click()
  await expectEraseWarning(page, ERASE_THREE, KEEP_HINT)
  await sheetActionButton(page, 'Save and erase').click()

  await expect(errorLine(page)).toHaveText(ERASE_FAILED)
  await expect(mySheet(page)).toHaveAccessibleName(ERASE_TITLE)
  await expect(sheetActionButton(page, 'Save and erase')).toBeEnabled()
  expect(await storedKeys(page)).toEqual(allFive(seeded))
  expect(await instrumentRecords(page)).toEqual([instrumentBefore])
  await page.waitForTimeout(300)
  await expect(page.locator('.app-notice-row')).toHaveCount(0)

  // Out of the sheet and back: my instrument keeps its old range.
  await sheetActionButton(page, 'Cancel').click()
  await sheetClose(page).click()
  await expect(mySheet(page)).toHaveCount(0)
  await openSheet(page)
  await expect(stepper(page, 'Lowest note')).toHaveAttribute('aria-valuenow', '60')
  await sheetClose(page).click()
  await expect(page.locator('.app-notice-row')).toHaveCount(0)

  await reloadHarness(page)
  expect(await instrumentRecords(page)).toEqual([instrumentBefore])
  expect(await storedKeys(page)).toEqual(allFive(seeded))
  await openSheet(page)
  await expect(stepper(page, 'Lowest note')).toHaveAttribute('aria-valuenow', '60')
  await sheetClose(page).click()
  await showListFromCueRow(page)
  await expect(rows(page)).toHaveCount(5)
  await expect(page.locator('.app-notice-row')).toHaveCount(0)
})
