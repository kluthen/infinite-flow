/**
 * v3.2, `Vary settings`' dependent `What may vary` through the whole app on the workspace harness
 * (port 4175), each test from an empty browser context, on the fake audio clock with
 * pre-generation off:
 *
 * - its six toggles show only while Vary settings shows `On`, all on by default;
 * - a group turned off never moves in a seeded session: one session per group, its session seed
 *   chosen so that, with every group on, the session's first move lands on phrase 3 and moves that
 *   very group (each checked by a control session); with the group off the move at phrase 3 is
 *   drawn again in another group, and through phrase 10 at least three moves land, none in it;
 * - under the rhythm lock `Rhythm` is disabled and shown off, its stored choice back, on or off,
 *   when the lock goes off;
 * - choices that leave no move (the lock on and only `Rhythm` on) show Vary settings unavailable
 *   with its sentence, the stored `On` back once a move exists, and a session started meanwhile
 *   runs with no move at all.
 *
 * The session seeds were found by playing sessions from phrase 1 seeded 7 at C Ionian, Neutral,
 * 90 BPM, 1280 × 800: with every group on, the first move lands on phrase 3 and moves Key and mode
 * under seed 25, Harmony under 8, Tension under 13, Rhythm under 21, Melody shape under 17 and the
 * figure levels (Embellishments) under 18.
 */
import { expect, test, type Page } from '@playwright/test'

import { queueSessionSeeds } from '../release/harness-helpers'
import {
  DESKTOP,
  PREGENERATION_OFF,
  gotoSessionHarness,
  readyToStart,
  sessionState,
  startSession,
} from '../session/session-helpers'
import { radio } from './helpers'
import {
  ALL_GROUPS_ON,
  RHYTHM_LOCKED_NOTE,
  UNAVAILABLE_NOTE,
  VARY_GROUPS,
  VARY_SETTINGS_NOTE,
  checkedIn,
  flipGroup,
  groupToggle,
  movedGroups,
  requestGroupValue,
  sessionChoices,
  sessionGroup,
  setRhythmLock,
  setVarySettings,
  toPhraseStart,
  toggleStates,
  whatMayVaryList,
  type VaryGroup,
  type VaryGroupLabel,
} from './session-options-helpers'

/** The last phrase a group-off session is played to. */
const LAST_PHRASE = 10

/** One group, and the session seed whose first move, with every group on, moves it on phrase 3. */
interface GroupCase {
  readonly group: VaryGroup
  readonly label: VaryGroupLabel
  readonly sessionSeed: number
}

const GROUP_CASES: readonly GroupCase[] = [
  { group: 'keyAndMode', label: 'Key and mode', sessionSeed: 25 },
  { group: 'harmony', label: 'Harmony', sessionSeed: 8 },
  { group: 'tension', label: 'Tension', sessionSeed: 13 },
  { group: 'rhythm', label: 'Rhythm', sessionSeed: 21 },
  { group: 'melodyShape', label: 'Melody shape', sessionSeed: 17 },
  { group: 'figures', label: 'Embellishments', sessionSeed: 18 },
]

/** The groups' toggles as shown, each with its pressed state. */
function shownGroups(pressed: Readonly<Record<VaryGroup, boolean>>): string[] {
  return VARY_GROUPS.map(({ group, label }) => `${label}: ${pressed[group]}`)
}

/** Intent: every `generate` call's record since the page loaded. */
function requests(page: Page): Promise<readonly WorkspaceHarnessGenerationRequest[]> {
  return page.evaluate(() => window.__workspaceHarness.generationRequests())
}

/**
 * Intent: the settings the controls show from the count-in (the start settings) to just past
 * phrase `last`'s start, phrase by phrase: index 0 the count-in's, index n - 1 phrase n's.
 */
async function shownThrough(page: Page, last: number): Promise<WorkspaceHarnessSettings[]> {
  const atStart = (await sessionState(page)).shownSettings
  if (atStart === null) throw new Error('no settings shown in the count-in')
  const shown = [atStart]
  for (let phrase = 2; phrase <= last; phrase += 1) {
    await toPhraseStart(page, phrase)
    const now = (await sessionState(page)).shownSettings
    if (now === null) throw new Error(`no settings shown at phrase ${phrase}`)
    shown.push(now)
  }
  return shown
}

/** Intent: the groups each phrase from 2 on moved, by phrase number (empty arrays left out). */
function movesByPhrase(shown: readonly WorkspaceHarnessSettings[]): Record<number, VaryGroup[]> {
  const moves: Record<number, VaryGroup[]> = {}
  for (let index = 1; index < shown.length; index += 1) {
    const moved = movedGroups(shown[index - 1]!, shown[index]!)
    if (moved.length > 0) moves[index + 1] = moved
  }
  return moves
}

/**
 * Intent: on a loaded page with Vary settings on, make phrase 1 (seeded 7) the one a session with
 * session seed `sessionSeed` starts from, and start it.
 */
async function startSeeded(page: Page, sessionSeed: number): Promise<void> {
  await queueSessionSeeds(page, [sessionSeed])
  await readyToStart(page)
  await startSession(page)
}

/**
 * Intent: with phrase 1 shown and Vary settings on, the lock on and every group but Rhythm off:
 * the choices that leave Vary settings no move.
 */
async function leaveNoMove(page: Page): Promise<void> {
  await setVarySettings(page, true)
  await setRhythmLock(page, true)
  for (const { label } of VARY_GROUPS) {
    if (label !== 'Rhythm') await flipGroup(page, label)
  }
  await expect.poll(async () => (await sessionChoices(page)).varySettingsAvailable).toBe(false)
}

/** Intent: Vary settings shows its unavailable state: `On` disabled and named, `Off` checked. */
async function expectUnavailable(page: Page): Promise<void> {
  await expect(radio(page, 'Vary settings', 'On')).toBeDisabled()
  expect(await checkedIn(page, 'Vary settings')).toBe('Off')
  await expect(sessionGroup(page).getByText(UNAVAILABLE_NOTE, { exact: true })).toBeVisible()
  await expect(radio(page, 'Vary settings', 'On')).toHaveAccessibleDescription(UNAVAILABLE_NOTE)
  // What may vary stays shown, so the cause can be fixed.
  await expect(whatMayVaryList(page)).toBeVisible()
}

/** Intent: Vary settings shows the stored `On` again, enabled, with no unavailable note. */
async function expectOnAgain(page: Page): Promise<void> {
  await expect(radio(page, 'Vary settings', 'On')).toBeEnabled()
  expect(await checkedIn(page, 'Vary settings')).toBe('On')
  await expect(sessionGroup(page).getByText(UNAVAILABLE_NOTE, { exact: true })).toHaveCount(0)
}

// @test-link [[ui_field_dependent]]
// @test-link [[ui_toggle_list]]
// @test-link [[rule_vary_settings_allowed_groups]]
test('What may vary shows only while Vary settings shows On, its six toggles all on by default', async ({
  page,
}) => {
  await gotoSessionHarness(page, DESKTOP)
  expect(await checkedIn(page, 'Vary settings')).toBe('Off')
  await expect(page.getByRole('radiogroup', { name: 'Vary settings' })).toHaveAccessibleDescription(
    VARY_SETTINGS_NOTE,
  )
  await expect(whatMayVaryList(page)).toHaveCount(0)

  await setVarySettings(page, true)
  await expect(whatMayVaryList(page)).toBeVisible()
  expect(await toggleStates(whatMayVaryList(page))).toEqual(shownGroups(ALL_GROUPS_ON))
  expect((await sessionChoices(page)).allowedGroups).toEqual(ALL_GROUPS_ON)
  await flipGroup(page, 'Melody shape')

  await setVarySettings(page, false)
  await expect(whatMayVaryList(page)).toHaveCount(0)
  await setVarySettings(page, true)
  expect(await toggleStates(whatMayVaryList(page))).toEqual(
    shownGroups({ ...ALL_GROUPS_ON, melodyShape: false }),
  )
})

for (const { group, label, sessionSeed } of GROUP_CASES) {
  // @test-link [[rule_vary_settings_allowed_groups]]
  test(`control: with every group on, session seed ${sessionSeed}'s first move lands on phrase 3 in ${label}`, async ({
    page,
  }) => {
    await gotoSessionHarness(page, DESKTOP, PREGENERATION_OFF)
    await setVarySettings(page, true)
    await startSeeded(page, sessionSeed)
    expect(movesByPhrase(await shownThrough(page, 3))).toEqual({ 3: [group] })
  })

  // @test-link [[rule_vary_settings_allowed_groups]]
  test(`with only ${label} off, a seeded session never moves it`, async ({ page }) => {
    test.setTimeout(60_000)
    await gotoSessionHarness(page, DESKTOP, PREGENERATION_OFF)
    await setVarySettings(page, true)
    await flipGroup(page, label)
    expect((await sessionChoices(page)).allowedGroups).toEqual({ ...ALL_GROUPS_ON, [group]: false })
    await startSeeded(page, sessionSeed)

    const moves = movesByPhrase(await shownThrough(page, LAST_PHRASE))
    // The move still lands on phrase 3, drawn again in another group, and more follow.
    expect(moves[3]?.length).toBe(1)
    expect(Object.keys(moves).length).toBeGreaterThanOrEqual(3)
    for (const moved of Object.values(moves)) expect(moved).not.toContain(group)

    const [idle, ...session] = await requests(page)
    expect(session.length).toBeGreaterThanOrEqual(LAST_PHRASE - 1)
    for (const request of session) {
      expect(requestGroupValue(request, group)).toBe(requestGroupValue(idle!, group))
    }
  })
}

for (const storedOn of [true, false]) {
  // @test-link [[rule_vary_settings_allowed_groups]]
  // @test-link [[req_rhythm_lock]]
  test(`under the lock Rhythm is disabled and shown off, its stored ${storedOn ? 'On' : 'Off'} back when the lock goes off`, async ({
    page,
  }) => {
    await gotoSessionHarness(page, DESKTOP)
    await setVarySettings(page, true)
    if (!storedOn) await flipGroup(page, 'Rhythm')
    const stored = { ...ALL_GROUPS_ON, rhythm: storedOn }
    expect(await toggleStates(whatMayVaryList(page))).toEqual(shownGroups(stored))
    await expect(sessionGroup(page).getByText(RHYTHM_LOCKED_NOTE)).toHaveCount(0)

    await setRhythmLock(page, true)
    const underLock = shownGroups(stored).map((line) =>
      line.startsWith('Rhythm:') ? 'Rhythm: false (disabled)' : line,
    )
    expect(await toggleStates(whatMayVaryList(page))).toEqual(underLock)
    await expect(groupToggle(page, 'Rhythm')).toHaveAccessibleDescription(RHYTHM_LOCKED_NOTE)
    await expect(sessionGroup(page).getByText(RHYTHM_LOCKED_NOTE, { exact: true })).toBeVisible()
    // The lock shows the group off without changing the player's choice.
    expect((await sessionChoices(page)).allowedGroups).toEqual(stored)

    await setRhythmLock(page, false)
    expect(await toggleStates(whatMayVaryList(page))).toEqual(shownGroups(stored))
    await expect(sessionGroup(page).getByText(RHYTHM_LOCKED_NOTE)).toHaveCount(0)
  })
}

// @test-link [[rule_vary_settings_needs_legal_move]]
// @test-link [[ui_field_dependent]]
test('choices that leave no move show Vary settings unavailable, and the stored On returns once a move exists', async ({
  page,
}) => {
  await gotoSessionHarness(page, DESKTOP)
  await readyToStart(page)
  await leaveNoMove(page)
  await expectUnavailable(page)
  expect(await toggleStates(whatMayVaryList(page))).toEqual([
    'Key and mode: false',
    'Harmony: false',
    'Tension: false',
    'Rhythm: false (disabled)',
    'Melody shape: false',
    'Embellishments: false',
  ])
  // The checked Off stands in for the stored On: choosing it changes nothing.
  await radio(page, 'Vary settings', 'Off').click()
  expect((await sessionChoices(page)).varySettings).toBe(true)

  // The lock off gives Rhythm back: a move exists.
  await setRhythmLock(page, false)
  await expectOnAgain(page)
  expect((await sessionChoices(page)).varySettingsAvailable).toBe(true)

  // Under the lock again, another group turned on gives a move.
  await setRhythmLock(page, true)
  await expectUnavailable(page)
  await flipGroup(page, 'Harmony')
  await expectOnAgain(page)
})

// @test-link [[rule_vary_settings_needs_legal_move]]
test('a session started while Vary settings is unavailable runs with no move at all', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await gotoSessionHarness(page, DESKTOP, PREGENERATION_OFF)
  await queueSessionSeeds(page, [25])
  await readyToStart(page)
  await leaveNoMove(page)
  await startSession(page)
  expect((await sessionChoices(page)).varySettingsAvailable).toBe(false)

  const shown = await shownThrough(page, 8)
  expect(movesByPhrase(shown)).toEqual({})
  const [idle, ...session] = await requests(page)
  expect(session.length).toBeGreaterThanOrEqual(7)
  for (const request of session) {
    expect(request.writtenTonalCenter).toBe(idle!.writtenTonalCenter)
    expect(request.controls).toEqual(idle!.controls)
    expect(request.figureLevels).toEqual(idle!.figureLevels)
  }
  // The player's On is kept through the session, still unavailable there.
  expect(await sessionChoices(page)).toMatchObject({
    varySettings: true,
    varySettingsAvailable: false,
  })
})
