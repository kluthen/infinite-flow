/**
 * v3.2, session mode's three new saved settings, `Rhythm lock`
 * (`sessionOptions.rhythmLockOn`), `Allowed rhythm changes` (`sessionOptions.allowedRhythmChanges`)
 * and `What may vary` (`sessionOptions.allowedGroups`), on the workspace harness (port 4175) over
 * the browser's real IndexedDB, each test from an empty browser context:
 *
 * - each change writes its own record, alone, and each value survives a reload;
 * - a corrupt record of each loads its default, the other two kept;
 * - v3.1 data (every other setting stored, none of the three) loads their defaults and writes
 *   nothing: the lock off, no change allowed, all six groups on;
 * - nothing of the three can change or is written during a session;
 * - with Idle pre-generation on, a change of each at Idle empties the prepared phrases (a new
 *   background attempt starts again from phrase 2, and a session started then requests phrase 2
 *   itself), while a tempo change keeps them. These cases sit here with the records they share
 *   the controls with; `tests/e2e/workspace/pregeneration.spec.ts` covers the queue's other keys.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
  toRunning,
} from '../session/session-helpers'
import { radio } from '../workspace/helpers'
import {
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
  ALL_GROUPS_ON,
  allowedChangesList,
  changeToggle,
  flipChange,
  flipGroup,
  groupToggle,
  sessionChoices,
  setRhythmLock,
  setVarySettings,
  toggleStates,
  whatMayVaryList,
  type SessionOptionChoices,
} from '../workspace/session-options-helpers'
import { gotoStorageHarness, reloadHarness, seedSettings, storedSettings } from './storage-helpers'

/** The three records v3.2 added. */
const LOCK = 'sessionOptions.rhythmLockOn'
const CHANGES = 'sessionOptions.allowedRhythmChanges'
const GROUPS = 'sessionOptions.allowedGroups'

/** The three v3.2 choices on a first visit, as the controller holds them. */
const DEFAULTS = {
  rhythmLockOn: false,
  allowedRhythmChanges: [],
  allowedGroups: ALL_GROUPS_ON,
} as const

/** The session seed phrase 1 is published with in the pre-generation cases. */
const SESSION_SEED = 4242

/** Intent: how many writes, deletes and batches have reached the app's storage port. */
function portChanges(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.storage.portChanges())
}

/** Intent: the three v3.2 choices the controller holds now. */
async function v32Choices(
  page: Page,
): Promise<Pick<SessionOptionChoices, 'rhythmLockOn' | 'allowedRhythmChanges' | 'allowedGroups'>> {
  const { rhythmLockOn, allowedRhythmChanges, allowedGroups } = await sessionChoices(page)
  return { rhythmLockOn, allowedRhythmChanges, allowedGroups }
}

/**
 * Intent: make one change through the controls and assert it writes exactly one batch to the
 * store, holding `key` set to `value` and changing no other record.
 */
async function expectWritesOnly(
  page: Page,
  change: () => Promise<void>,
  key: string,
  value: unknown,
): Promise<void> {
  const before = await storedSettings(page)
  const writes = await portChanges(page)
  await change()
  await expect.poll(async () => (await storedSettings(page))[key]).toEqual(value)
  expect(await portChanges(page)).toBe(writes + 1)
  const after = await storedSettings(page)
  const changed = Object.keys(after).filter(
    (name) => JSON.stringify(after[name]) !== JSON.stringify(before[name]),
  )
  expect(changed).toEqual([key])
}

/**
 * Intent: try to activate a read-only control both ways a player's click could reach it: a real
 * click at its place (forced, as the read-only group takes the pointer there) and a click event
 * dispatched on the control itself.
 */
async function refuseActivation(page: Page, control: Locator): Promise<void> {
  await control.click({ force: true })
  await control.dispatchEvent('click')
  expect((await sessionState(page)).phase).not.toBe('idle')
}

// @test-link [[rule_settings_saved_on_change]]
// @test-link [[entity_session_option_records]]
test('each change of the three writes its own record, and each value survives a reload', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  for (const key of [LOCK, CHANGES, GROUPS])
    expect(await storedSettings(page)).not.toHaveProperty(key)

  await expectWritesOnly(page, () => setRhythmLock(page, true), LOCK, true)
  await expectWritesOnly(page, () => flipChange(page, 'Add or remove a rest'), CHANGES, [
    'note_rest',
  ])
  await expectWritesOnly(page, () => flipChange(page, 'Move a rest'), CHANGES, [
    'move_rest',
    'note_rest',
  ])
  await setVarySettings(page, true)
  await expect
    .poll(async () => (await storedSettings(page))['sessionOptions.varySettings'])
    .toBe(true)
  await expectWritesOnly(page, () => flipGroup(page, 'Tension'), GROUPS, {
    ...ALL_GROUPS_ON,
    tension: false,
  })
  await expectWritesOnly(page, () => flipGroup(page, 'Embellishments'), GROUPS, {
    ...ALL_GROUPS_ON,
    tension: false,
    figures: false,
  })

  await reloadHarness(page)
  expect(await v32Choices(page)).toEqual({
    rhythmLockOn: true,
    allowedRhythmChanges: ['move_rest', 'note_rest'],
    allowedGroups: { ...ALL_GROUPS_ON, tension: false, figures: false },
  })
  await expect(radio(page, 'Rhythm lock', 'On')).toHaveAttribute('aria-checked', 'true')
  expect(await toggleStates(allowedChangesList(page))).toEqual([
    'Move a note: false',
    'Move a rest: true',
    'Split a note: false',
    'Merge two notes: false',
    'Add or remove a rest: true',
  ])
  expect(await toggleStates(whatMayVaryList(page))).toEqual([
    'Key and mode: true',
    'Harmony: true',
    'Tension: false',
    'Rhythm: false (disabled)',
    'Melody shape: true',
    'Embellishments: false',
  ])
  // The lock shows Rhythm off; the stored group is still on, as the record says.
  expect(((await storedSettings(page))[GROUPS] as Record<string, boolean>).rhythm).toBe(true)
})

/** One corrupt record among three valid ones, and what the controller loads. */
interface CorruptCase {
  readonly name: string
  readonly key: string
  readonly corrupt: unknown
  readonly loaded: Pick<
    SessionOptionChoices,
    'rhythmLockOn' | 'allowedRhythmChanges' | 'allowedGroups'
  >
}

/** Three valid records, each differing from its default. */
const VALID = {
  [LOCK]: true,
  [CHANGES]: ['split_note', 'merge_notes'],
  [GROUPS]: { ...ALL_GROUPS_ON, harmony: false },
} as const

/** The choices VALID loads as. */
const VALID_LOADED = {
  rhythmLockOn: true,
  allowedRhythmChanges: ['split_note', 'merge_notes'],
  allowedGroups: { ...ALL_GROUPS_ON, harmony: false },
} as const

const CORRUPT_CASES: readonly CorruptCase[] = [
  {
    name: 'a lock that is no boolean',
    key: LOCK,
    corrupt: 'yes',
    loaded: { ...VALID_LOADED, rhythmLockOn: false },
  },
  {
    name: 'changes out of their order',
    key: CHANGES,
    corrupt: ['merge_notes', 'split_note'],
    loaded: { ...VALID_LOADED, allowedRhythmChanges: [] },
  },
  {
    name: 'an unknown change',
    key: CHANGES,
    corrupt: ['split_note', 'swing'],
    loaded: { ...VALID_LOADED, allowedRhythmChanges: [] },
  },
  {
    name: 'groups missing one',
    key: GROUPS,
    corrupt: { keyAndMode: true, harmony: false, tension: true, rhythm: true, melodyShape: true },
    loaded: { ...VALID_LOADED, allowedGroups: ALL_GROUPS_ON },
  },
  {
    name: 'a group that is no boolean',
    key: GROUPS,
    corrupt: { ...ALL_GROUPS_ON, harmony: 'off' },
    loaded: { ...VALID_LOADED, allowedGroups: ALL_GROUPS_ON },
  },
]

for (const { name, key, corrupt, loaded } of CORRUPT_CASES) {
  // @test-link [[rule_saved_settings_load_tolerantly]]
  // @test-link [[entity_session_option_records]]
  test(`${name} loads its default, the other two kept`, async ({ page }) => {
    await gotoStorageHarness(page)
    await seedSettings(page, { ...VALID, [key]: corrupt })
    await reloadHarness(page)
    expect(await v32Choices(page)).toEqual(loaded)
    expect(await page.evaluate(() => window.__workspaceHarness.storage.loadOutcome())).toBe(
      'saved-data-read',
    )
  })
}

// @test-link [[rule_saved_settings_load_tolerantly]]
// @test-link [[entity_session_option_records]]
test('v3.1 data, every other setting and none of the three, loads their defaults and writes none', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await seedSettings(page, {
    'controls.tempo': 150,
    'controls.tonalCenter': 'F',
    'controls.collection': 'Dorian',
    'controls.tension': 'Edge',
    'figureLevels.chromaticApproach': 'asToday',
    presetSelection: { kind: 'custom', baseId: 'jazz' },
    theme: 'Dark',
    'mix.clickOn': false,
    'sessionOptions.varySettings': true,
    'sessionOptions.tensionAcrossPhrases': true,
    'sessionOptions.risingTempo': true,
  })
  await reloadHarness(page)

  expect(await v32Choices(page)).toEqual(DEFAULTS)
  // The settings v3.1 saved load as stored.
  expect((await sessionChoices(page)).varySettings).toBe(true)
  expect((await sessionState(page)).tensionAcrossPhrases).toBe(true)
  await expect(page.getByRole('spinbutton', { name: 'Tempo' })).toHaveAttribute(
    'aria-valuenow',
    '150',
  )
  await expect(radio(page, 'Rhythm lock', 'Off')).toHaveAttribute('aria-checked', 'true')
  await expect(allowedChangesList(page)).toHaveCount(0)
  expect(await toggleStates(whatMayVaryList(page))).toEqual([
    'Key and mode: true',
    'Harmony: true',
    'Tension: true',
    'Rhythm: true',
    'Melody shape: true',
    'Embellishments: true',
  ])
  const stored = await storedSettings(page)
  for (const key of [LOCK, CHANGES, GROUPS]) expect(stored).not.toHaveProperty(key)
})

// @test-link [[rule_no_save_during_session]]
// @test-link [[entity_session_option_records]]
test('nothing of the three can change or is written during a session', async ({ page }) => {
  await gotoSessionHarness(page)
  await setRhythmLock(page, true)
  await flipChange(page, 'Split a note')
  await setVarySettings(page, true)
  await flipGroup(page, 'Harmony')
  await expect
    .poll(async () => (await storedSettings(page))[GROUPS])
    .toEqual({
      ...ALL_GROUPS_ON,
      harmony: false,
    })
  await readyToStart(page)
  const storedBefore = await storedSettings(page)
  const choices = await v32Choices(page)

  await startSession(page)
  const writesAtStart = await portChanges(page)
  await toRunning(page)
  await refuseActivation(page, radio(page, 'Rhythm lock', 'Off'))
  await refuseActivation(page, changeToggle(page, 'Move a note'))
  await refuseActivation(page, groupToggle(page, 'Key and mode'))
  await refuseActivation(page, radio(page, 'Vary settings', 'Off'))
  expect(await v32Choices(page)).toEqual(choices)
  expect(await portChanges(page)).toBe(writesAtStart)

  await sessionAction(page).click()
  await expect.poll(async () => (await sessionState(page)).phase).toBe('idle')
  // Saves land in order: once a theme change made now is stored, every earlier write has landed.
  await radio(page, 'Presentation theme', 'Dark').click()
  await expect.poll(async () => (await storedSettings(page)).theme).toBe('Dark')
  const storedAfter = await storedSettings(page)
  for (const key of Object.keys(storedBefore).filter((name) => name.startsWith('sessionOptions.')))
    expect(storedAfter[key], key).toEqual(storedBefore[key])
})

/** One change of the three at Idle, what it needs first, and what phrase 2's requests carry. */
interface DiscardCase {
  readonly name: string
  /** What the player sets first, before phrase 1 and the queue. */
  readonly prepare: (page: Page) => Promise<void>
  readonly apply: (page: Page) => Promise<void>
  /** The lock group phrase 2's requests carry after the change. */
  readonly lockGroup: WorkspaceHarnessGenerationRequest['rhythmLock']
}

const DISCARD_CASES: readonly DiscardCase[] = [
  {
    name: 'the lock turned on',
    /** Intent: nothing to set first: the lock starts off. */
    prepare: async () => undefined,
    /** Intent: turn the lock on. */
    apply: (page) => setRhythmLock(page, true),
    lockGroup: { state: 'locked', allowedChanges: [], tenserPhrase: false },
  },
  {
    name: 'an allowed change turned on',
    /** Intent: turn the lock on, so its toggles show. */
    prepare: (page) => setRhythmLock(page, true),
    /** Intent: allow `Move a note`. */
    apply: (page) => flipChange(page, 'Move a note'),
    lockGroup: { state: 'locked', allowedChanges: ['move_note_start'], tenserPhrase: false },
  },
  {
    name: 'a group turned off',
    /** Intent: turn Vary settings on, so its groups show. */
    prepare: (page) => setVarySettings(page, true),
    /** Intent: turn the Harmony group off. */
    apply: (page) => flipGroup(page, 'Harmony'),
    lockGroup: null,
  },
]

for (const { name, prepare, apply, lockGroup } of DISCARD_CASES) {
  // @test-link [[rule_pregeneration_discarded_on_change]]
  test(`with pre-generation on, ${name} at Idle empties the prepared phrases`, async ({ page }) => {
    test.setTimeout(90_000)
    await gotoPregenerationHarness(page)
    // Set before phrase 1 exists, while no queue runs, so the queue fills once, under it.
    await prepare(page)
    await readyWithSessionSeed(page, SESSION_SEED)
    await untilQueueFull(page)
    await holdBackground(page)
    const from = (await generationRecords(page)).length

    await apply(page)

    // The queue starts again from phrase 2, under the new choice.
    const restarted = await untilBackgroundHeld(page, from)
    expect(await phraseOfSeed(page, SESSION_SEED, restarted.seed)).toBe(2)
    expect(restarted.rhythmLock).toEqual(lockGroup)
    // Nothing is left to spend: the session requests phrase 2 itself.
    const startedAt = (await generationRecords(page)).length
    await startSession(page)
    await expect
      .poll(async () => (await playerOrSessionRecordsFrom(page, startedAt)).length, {
        timeout: 30_000,
      })
      .toBeGreaterThan(0)
    const [phraseTwo] = await playerOrSessionRecordsFrom(page, startedAt)
    expect(phraseTwo!.signal).toBe(true)
    expect(await phraseOfSeed(page, SESSION_SEED, phraseTwo!.seed)).toBe(2)
    expect(phraseTwo!.rhythmLock).toEqual(lockGroup)
  })
}

// @test-link [[rule_pregeneration_discarded_on_change]]
test('with pre-generation on and the three set, a tempo change keeps the prepared phrases', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoPregenerationHarness(page)
  // Set before phrase 1 exists, while no queue runs, so the queue fills once, under them.
  await setRhythmLock(page, true)
  await flipChange(page, 'Merge two notes')
  await setVarySettings(page, true)
  await flipGroup(page, 'Tension')
  await readyWithSessionSeed(page, SESSION_SEED)
  await untilQueueFull(page)
  const from = (await generationRecords(page)).length

  await page.getByRole('button', { name: 'Increase tempo' }).click()
  await expect(page.getByRole('spinbutton', { name: 'Tempo' })).not.toHaveAttribute(
    'aria-valuenow',
    '90',
  )
  await startSession(page)

  const state = await sessionState(page)
  expect(state.sessionTempo).toBeGreaterThan(90)
  expect(state.latestReady).toBeGreaterThanOrEqual(2)
  expect((await generationRecords(page)).slice(from)).toEqual([])
})
