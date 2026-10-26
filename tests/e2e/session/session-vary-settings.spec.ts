/**
 * v2.1 chunk 25, `Vary settings` through the whole app on the workspace harness's fake audio
 * clock (port 4175). The control starts off, is set at Idle and in the Review, and is read-only
 * during a session. With it on, a mutation shows in the locked controls at the instant the phrase
 * generated with it starts sounding, with nothing in the control section moving; at the session's
 * end, by a hidden tab or by Stop, the controls show the player's own settings again (the preset
 * selection, the figure levels and a `Varying` register included) and the fresh phrase is
 * generated from them. A step of a setting a preset holds, a figure level or one of the ten
 * controls, Tension included, shows the selection as Custom based on the preset: the preset box
 * turns Custom while its description keeps the text it had at Start, and nothing in the preset bar
 * is a live region. A settings change made while the next phrase is partly drawn as read-ahead leaves that
 * phrase as drawn and first shows in the phrase after it. v3.1 chunk 15: the key and mode moves
 * stay inside the restriction of the preset in force at Start, a move outside it drawn again as
 * another step, and a key or mode move never shows Custom.
 *
 * Each session's mutation seed derives from the session seed drawn with its phrase 1, queued here
 * as the inverse of the wanted mutation seed: from Neutral, mutation seed 12 steps the accented
 * passing tone from as today to favored on phrase 3 and mutation seed 11 steps Tension from Lift
 * to Settled on phrase 3; from Jazz, mutation seed 25 steps the register on phrase 3 (spec D181
 * scales, v3.1's figure step). Reel and Modal (Dorian), chosen in the preset box from C Ionian,
 * restrict the mode to Mixolydian and Dorian, and to Dorian: under Reel mutation seed 40 moves
 * the mode to Dorian on phrase 3, and mutation seed 44, whose move to Ionian is drawn again, steps
 * a figure there; under Modal (Dorian) mutation seed 40, whose move to Aeolian is drawn again,
 * steps Rhythmic variety to Heavily varied on phrase 3.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  harnessSnapshot,
  queueSessionSeeds,
  sessionSeedsDrawn,
  settingsMutationSeed,
} from '../release/harness-helpers'
import { choosePreset, expectPresetShown, presetBox, presetDescription } from '../workspace/helpers'
import { clockTo } from './session-midi-helpers'
import { drawnKeys, settledStaff, toBarline, untilReady } from './rolling-helpers'
import {
  BEAT,
  DESKTOP,
  PHONE,
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
  sessionTimeline,
  startSession,
} from './session-helpers'

/** One measure at the default 90 BPM, in seconds. */
const MEASURE = 4 * BEAT

/** From Neutral, the mutation seed that steps the accented passing tone up one level on phrase 3. */
const FIGURE_STEP_ON_PHRASE_3 = 12
/** From Neutral, the mutation seed that steps Tension from Lift to Settled on phrase 3. */
const TENSION_ON_PHRASE_3 = 11
/** The mutation seed that steps the register on phrase 3. */
const REGISTER_ON_PHRASE_3 = 25
/** From Reel, the mutation seed that moves the mode from Mixolydian to Dorian on phrase 3. */
const REEL_MODE_ON_PHRASE_3 = 40
/** From Reel, the mutation seed whose move to Ionian on phrase 3 is drawn again as a figure step. */
const REEL_REDRAWN_ON_PHRASE_3 = 44
/** From Modal (Dorian), the mutation seed whose move to Aeolian on phrase 3 is drawn again. */
const MODAL_REDRAWN_ON_PHRASE_3 = 40

/** Intent: queue the session seed whose Vary settings mutation seed is `mutationSeed`. */
async function queueMutationSeed(page: Page, mutationSeed: number): Promise<void> {
  await queueSessionSeeds(page, [await settingsMutationSeed(page, mutationSeed)])
}

/** Intent: a radiogroup of the control section by its exact accessible name. */
function radiogroup(page: Page, name: string): Locator {
  return page.getByRole('radiogroup', { name, exact: true })
}

/** Intent: the label of a radiogroup's checked segment, or null when none is checked. */
async function checkedIn(page: Page, name: string): Promise<string | null> {
  const checked = radiogroup(page, name).locator('[role="radio"][aria-checked="true"]')
  return (await checked.count()) === 0 ? null : checked.innerText()
}

/** Neutral's description line. */
const NEUTRAL_DESCRIPTION = "Plain lines in the key, in quarter notes: the app's starting point."
/** Jazz's description line. */
const JAZZ_DESCRIPTION =
  'Eighth notes and offbeats, now and then with a short note from outside the key.'
/** Reel's description line. */
const REEL_DESCRIPTION =
  'A fast folk dance in steady eighth notes, in Mixolydian or Dorian. Also try it in Ionian (a major key).'
/** Modal (Dorian)'s description line. */
const MODAL_DESCRIPTION =
  'A steady two-chord bed in Dorian, so its color note is heard in the melody.'

/** Intent: the preset box shows `text` and its description line reads `description`. */
async function expectPreset(page: Page, text: string, description: string): Promise<void> {
  await expectPresetShown(page, text)
  await expect(presetDescription(page)).toHaveText(description)
}

/** Intent: nothing in the preset bar is a live region, so no change of it is announced. */
async function expectPresetBarSilent(page: Page): Promise<void> {
  await expect(
    page.locator(
      '.preset-bar [aria-live], .preset-bar [role="status"], .preset-bar [role="alert"], .preset-bar [role="log"]',
    ),
  ).toHaveCount(0)
}

/** Intent: turn `Vary settings` on with a click on its `On` segment. */
async function turnVarySettingsOn(page: Page): Promise<void> {
  await radiogroup(page, 'Vary settings').getByRole('radio', { name: 'On' }).click()
  expect(await checkedIn(page, 'Vary settings')).toBe('On')
}

/** Intent: when phrase `n` starts sounding, at the default 90 BPM. */
async function phraseStart(page: Page, n: number): Promise<number> {
  return (await sessionTimeline(page)).countInEndsAt + 4 * (n - 1) * MEASURE
}

/**
 * Intent: move the clock phrase by phrase to `offset` seconds from phrase `n`'s start, holding it
 * at each phrase's start until the session has readied the next: a generation slower than the
 * fake clock would otherwise be cancelled before its phrase sounds.
 */
async function clockToReadied(page: Page, n: number, offset: number): Promise<void> {
  for (let k = 2; k <= n; k += 1) {
    await clockTo(page, (await phraseStart(page, k - 1)) + 0.1)
    await untilReady(page, k)
  }
  await clockTo(page, (await phraseStart(page, n)) + offset)
}

/**
 * Intent: the box of every element of the control section, in document order (its classes may
 * change, its geometry may not), but a select's options and groups, which the select draws and
 * which take no box (Custom's option comes and goes inside the preset box), the page's scroll and
 * the animations running in the section, read in one task.
 */
function controlSectionLayout(page: Page) {
  return page.evaluate(() => {
    const section = document.querySelector('.control-section')
    if (section === null) throw new Error('no control section')
    return {
      // A select's options and groups are drawn by the select, never laid out: its box is.
      boxes: [section, ...section.querySelectorAll(':not(option, optgroup)')].map((element) => {
        const box = element.getBoundingClientRect()
        return `${element.tagName} ${box.x},${box.y} ${box.width}x${box.height}`
      }),
      scrollY: window.scrollY,
      animations: section.getAnimations({ subtree: true }).length,
    }
  })
}

/** Intent: the settings of the latest `generate` call made after `count` earlier ones. */
async function requestAfter(page: Page, count: number): Promise<WorkspaceHarnessGenerationRequest> {
  let latest: WorkspaceHarnessGenerationRequest | undefined
  await expect
    .poll(async () => {
      const requests = await page.evaluate(() => window.__workspaceHarness.generationRequests())
      latest = requests.length > count ? requests.at(-1) : undefined
      return latest !== undefined
    })
    .toBe(true)
  return latest!
}

/** Intent: how many `generate` calls the page has made. */
async function requestCount(page: Page): Promise<number> {
  return (await page.evaluate(() => window.__workspaceHarness.generationRequests())).length
}

/** Neutral's seven figure levels, the player's own in these tests. */
const NEUTRAL_LEVELS = {
  passingTone: 'asToday',
  accentedPassingTone: 'asToday',
  neighborTone: 'asToday',
  appoggiatura: 'off',
  diatonicEnclosure: 'off',
  chromaticApproach: 'off',
  chromaticEnclosure: 'off',
} as const

// @test-link [[req_settings_mutation_flag]]
// @test-link [[rule_automatic_change_updates_controls_quietly]]
// @test-link [[rule_mutation_reverts_at_session_end]]
// @test-link [[rule_vary_settings_figure_step]]
// @test-link [[rule_vary_settings_marks_custom]]
// @test-link [[rule_mutation_marks_profile_customized]]
test('a figure step shows Custom in place at its phrase with nothing moving, and a hidden tab restores the selection and every setting', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page, DESKTOP)
  expect(await checkedIn(page, 'Vary settings')).toBe('Off')
  await expect(radiogroup(page, 'Vary settings')).toHaveAccessibleDescription(
    'Every 2 to 4 phrases, one setting from the groups below moves one step. Never the instrument or the tempo. Keys and modes stay within what your preset is meant for. Your settings come back when the session ends.',
  )
  await queueMutationSeed(page, FIGURE_STEP_ON_PHRASE_3)
  await readyToStart(page)
  const idleRequest = (
    await page.evaluate(() => window.__workspaceHarness.generationRequests())
  ).at(-1)!
  await turnVarySettingsOn(page)
  // The queued session seed is the one drawn with the phrase 1 the session starts from.
  expect(await sessionSeedsDrawn(page)).toBe(1)

  await startSession(page)
  await expect(radiogroup(page, 'Vary settings')).toHaveAttribute('aria-readonly', 'true')
  await expectPresetBarSilent(page)

  const phraseThree = await phraseStart(page, 3)
  await clockTo(page, phraseThree - 0.1)
  await expectPreset(page, 'Neutral', NEUTRAL_DESCRIPTION)
  const shownBefore = (await sessionState(page)).shownSettings
  expect(shownBefore).toMatchObject({
    figureLevels: NEUTRAL_LEVELS,
    selection: { kind: 'preset', presetId: 'neutral' },
  })
  const before = await controlSectionLayout(page)

  await clockTo(page, phraseThree + 0.1)
  // The box turns Custom; its description keeps the text it had at Start.
  await expectPreset(page, 'Custom, based on Neutral', NEUTRAL_DESCRIPTION)
  await expect(page.locator('.control-summary')).toHaveText(
    'C Ionian · Custom, based on Neutral · Lift · Shaped',
  )
  expect(await checkedIn(page, 'Leapiness')).toBe('Shaped')
  // One figure, one level: the accented passing tone from as today to favored, nothing else.
  const shown = (await sessionState(page)).shownSettings
  expect(shown?.figureLevels).toEqual({ ...NEUTRAL_LEVELS, accentedPassingTone: 'favored' })
  expect(shown?.selection).toEqual({ kind: 'custom', baseId: 'neutral' })
  expect(shown?.controls).toEqual(shownBefore?.controls)
  const after = await controlSectionLayout(page)
  expect(after).toEqual(before)
  expect(after.animations).toBe(0)
  await expectPresetBarSilent(page)

  const requestsAtEnd = await requestCount(page)
  await page.evaluate(() => window.__workspaceHarness.page.setHidden(true))
  expect((await sessionState(page)).lastEnd?.cause).toBe('hidden-tab')
  await expectPreset(page, 'Neutral', NEUTRAL_DESCRIPTION)
  await expect(page.locator('.control-summary')).toHaveText('C Ionian · Neutral · Lift · Shaped')
  await expect(presetBox(page)).not.toHaveAttribute('aria-readonly')
  await expectPresetBarSilent(page)
  expect(await checkedIn(page, 'Vary settings')).toBe('On')
  const restored = await harnessSnapshot(page)
  expect(restored.selection).toEqual({ kind: 'preset', presetId: 'neutral' })
  expect(restored.figureLevels).toEqual(NEUTRAL_LEVELS)

  const fresh = await requestAfter(page, requestsAtEnd)
  expect(fresh.figureLevels).toEqual(idleRequest.figureLevels)
  expect(fresh.controls).toEqual(idleRequest.controls)
  expect(fresh.carryIn).toBe(false)
})

// @test-link [[rule_vary_settings_marks_custom]]
// @test-link [[rule_mutation_reverts_at_session_end]]
test('a Tension move shows Custom based on Neutral at its phrase, and Stop gives back Neutral and Lift', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page, DESKTOP)
  await queueMutationSeed(page, TENSION_ON_PHRASE_3)
  await readyToStart(page)
  await turnVarySettingsOn(page)
  expect(await sessionSeedsDrawn(page)).toBe(1)

  await startSession(page)
  await clockTo(page, (await phraseStart(page, 3)) - 0.1)
  await expect(page.locator('.control-summary')).toHaveText('C Ionian · Neutral · Lift · Shaped')

  await clockTo(page, (await phraseStart(page, 3)) + 0.1)
  await expect(page.locator('.control-summary')).toHaveText(
    'C Ionian · Custom, based on Neutral · Settled · Shaped',
  )
  expect(await checkedIn(page, 'Tension')).toBe('Settled')
  await expectPreset(page, 'Custom, based on Neutral', NEUTRAL_DESCRIPTION)
  expect((await sessionState(page)).shownSettings?.selection).toEqual({
    kind: 'custom',
    baseId: 'neutral',
  })

  await sessionAction(page).click()
  expect((await sessionState(page)).lastEnd?.cause).toBe('stop')
  await expect(page.locator('.control-summary')).toHaveText('C Ionian · Neutral · Lift · Shaped')
  expect(await checkedIn(page, 'Tension')).toBe('Lift')
  await expectPreset(page, 'Neutral', NEUTRAL_DESCRIPTION)
  expect((await harnessSnapshot(page)).selection).toEqual({ kind: 'preset', presetId: 'neutral' })
})

// @test-link [[req_settings_mutation_flag]]
// @test-link [[rule_mutation_reverts_at_session_end]]
// @test-link [[rule_varying_register_once_per_session]]
test('a register stepped from Varying is Varying again after Stop, and the flag is set in the Review', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page, DESKTOP)
  await choosePreset(page, 'Jazz')
  await queueMutationSeed(page, REGISTER_ON_PHRASE_3)
  await readyToStart(page)
  expect(await checkedIn(page, 'Register')).toBe('Varying')
  await turnVarySettingsOn(page)
  // The queued session seed is the one drawn with the phrase 1 the session starts from.
  expect(await sessionSeedsDrawn(page)).toBe(1)

  await startSession(page)
  await clockTo(page, (await phraseStart(page, 3)) + 0.1)
  await expect.poll(async () => checkedIn(page, 'Register')).toMatch(/^(Low|Middle|High)$/)
  await expectPreset(page, 'Custom, based on Jazz', JAZZ_DESCRIPTION)
  await expect(page.locator('.control-summary')).toHaveText(
    'C Ionian · Custom, based on Jazz · Lift · Shaped',
  )

  const requestsAtEnd = await requestCount(page)
  await sessionAction(page).click()
  expect((await sessionState(page)).lastEnd?.cause).toBe('stop')
  expect(await checkedIn(page, 'Register')).toBe('Varying')
  await expectPreset(page, 'Jazz', JAZZ_DESCRIPTION)
  await expect(page.locator('.control-summary')).toHaveText('C Ionian · Jazz · Lift · Shaped')
  const fresh = await requestAfter(page, requestsAtEnd)
  expect(fresh.controls.register).toBe('Varying')
  expect(fresh.figureLevels.chromaticApproach).toBe('asToday')
  expect(fresh.figureLevels.chromaticEnclosure).toBe('asToday')

  expect((await sessionState(page)).review?.showing).toBe(true)
  await expect(radiogroup(page, 'Vary settings')).not.toHaveAttribute('aria-readonly', 'true')
  await radiogroup(page, 'Vary settings').getByRole('radio', { name: 'Off' }).click()
  expect(await checkedIn(page, 'Vary settings')).toBe('Off')
  expect((await sessionState(page)).varySettings).toBe(false)
})

// @test-link [[rule_session_change_applies_at_phrase_boundary]]
// @test-link [[module_session_rolling_display]]
test('a change while the next phrase is partly drawn leaves it as drawn and shows from the phrase after', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page, PHONE)
  await readyToStart(page)
  await startSession(page)
  expect((await sessionState(page)).heldLayout).toBe('split')

  await toBarline(page, 2, 2)
  await untilReady(page, 3)
  const drawn = await settledStaff(page)
  expect(drawnKeys(drawn)).toEqual({ top: '3:opening', bottom: '2:closing' })
  const requestsBefore = await requestCount(page)

  await page.evaluate(() =>
    window.__workspaceHarness.session.changeSettings({ leapiness: 'Angular' }),
  )

  const unchanged = await settledStaff(page)
  expect(unchanged.state.latestReady).toBe(3)
  expect(unchanged.top).toEqual(drawn.top)
  expect(await checkedIn(page, 'Leapiness')).toBe('Shaped')

  await clockTo(page, (await phraseStart(page, 3)) + 0.1)
  const sounding = await settledStaff(page)
  expect(sounding.top?.key).toBe('3:opening')
  expect(sounding.top?.notes).toEqual(drawn.top?.notes)
  expect(await checkedIn(page, 'Leapiness')).toBe('Shaped')
  expect((await sessionState(page)).shownSettings?.controls.leapiness).toBe('Shaped')

  await clockTo(page, (await phraseStart(page, 4)) + 0.1)
  await expect.poll(async () => checkedIn(page, 'Leapiness')).toBe('Angular')
  const requests = await page.evaluate(() => window.__workspaceHarness.generationRequests())
  const afterChange = requests.slice(requestsBefore)
  expect(afterChange.length).toBeGreaterThan(0)
  for (const request of afterChange) expect(request.controls.leapiness).toBe('Angular')
  for (const request of requests.slice(0, requestsBefore))
    expect(request.controls.leapiness).toBe('Shaped')
})

/** Reel's seven figure levels, the player's own in the Reel tests. */
const REEL_LEVELS = {
  passingTone: 'favored',
  accentedPassingTone: 'asToday',
  neighborTone: 'favored',
  appoggiatura: 'off',
  diatonicEnclosure: 'off',
  chromaticApproach: 'off',
  chromaticEnclosure: 'off',
} as const

// @test-link [[rule_vary_settings_stays_inside_restriction]]
// @test-link [[rule_vary_settings_marks_custom]]
// @test-link [[rule_mutation_reverts_at_session_end]]
test('under Reel a mode move to Dorian shows at its phrase and keeps Reel, and Stop gives back Mixolydian', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page, DESKTOP)
  await choosePreset(page, 'Reel')
  await queueMutationSeed(page, REEL_MODE_ON_PHRASE_3)
  await readyToStart(page)
  await expect(page.locator('.control-summary')).toHaveText(
    'C Mixolydian · Reel · Settled · Shaped',
  )
  await turnVarySettingsOn(page)
  expect(await sessionSeedsDrawn(page)).toBe(1)

  await startSession(page)
  await clockToReadied(page, 3, -0.1)
  expect((await sessionState(page)).shownSettings?.controls.collection).toBe('Mixolydian')

  await clockTo(page, (await phraseStart(page, 3)) + 0.1)
  await expect(page.locator('.control-summary')).toHaveText('C Dorian · Reel · Settled · Shaped')
  expect(await checkedIn(page, 'Collection')).toBe('Dorian')
  await expectPreset(page, 'Reel', REEL_DESCRIPTION)
  const shown = (await sessionState(page)).shownSettings
  expect(shown?.controls.collection).toBe('Dorian')
  expect(shown?.figureLevels).toEqual(REEL_LEVELS)
  // A mode move never marks Custom.
  expect(shown?.selection).toEqual({ kind: 'preset', presetId: 'reel' })

  await sessionAction(page).click()
  expect((await sessionState(page)).lastEnd?.cause).toBe('stop')
  await expect(page.locator('.control-summary')).toHaveText(
    'C Mixolydian · Reel · Settled · Shaped',
  )
  expect(await checkedIn(page, 'Collection')).toBe('Mixolydian')
  await expectPreset(page, 'Reel', REEL_DESCRIPTION)
  const restored = await harnessSnapshot(page)
  expect(restored.selection).toEqual({ kind: 'preset', presetId: 'reel' })
  expect(restored.figureLevels).toEqual(REEL_LEVELS)
})

// @test-link [[rule_vary_settings_stays_inside_restriction]]
// @test-link [[rule_vary_settings_marks_custom]]
// @test-link [[rule_mutation_reverts_at_session_end]]
test('under Reel a mode move to Ionian is drawn again as a figure step, Custom based on Reel in Mixolydian, and Stop gives back Reel', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page, DESKTOP)
  await choosePreset(page, 'Reel')
  await queueMutationSeed(page, REEL_REDRAWN_ON_PHRASE_3)
  await readyToStart(page)
  await turnVarySettingsOn(page)
  expect(await sessionSeedsDrawn(page)).toBe(1)

  await startSession(page)
  await clockToReadied(page, 3, -0.1)
  const shownBefore = (await sessionState(page)).shownSettings
  expect(shownBefore?.selection).toEqual({ kind: 'preset', presetId: 'reel' })

  await clockTo(page, (await phraseStart(page, 3)) + 0.1)
  await expect(page.locator('.control-summary')).toHaveText(
    'C Mixolydian · Custom, based on Reel · Settled · Shaped',
  )
  expect(await checkedIn(page, 'Collection')).toBe('Mixolydian')
  await expectPreset(page, 'Custom, based on Reel', REEL_DESCRIPTION)
  const shown = (await sessionState(page)).shownSettings
  expect(shown?.selection).toEqual({ kind: 'custom', baseId: 'reel' })
  expect(shown?.controls).toEqual(shownBefore?.controls)
  expect(shown?.figureLevels).toEqual({ ...REEL_LEVELS, diatonicEnclosure: 'asToday' })

  await sessionAction(page).click()
  expect((await sessionState(page)).lastEnd?.cause).toBe('stop')
  await expect(page.locator('.control-summary')).toHaveText(
    'C Mixolydian · Reel · Settled · Shaped',
  )
  await expectPreset(page, 'Reel', REEL_DESCRIPTION)
  const restored = await harnessSnapshot(page)
  expect(restored.selection).toEqual({ kind: 'preset', presetId: 'reel' })
  expect(restored.figureLevels).toEqual(REEL_LEVELS)
})

// @test-link [[rule_vary_settings_stays_inside_restriction]]
// @test-link [[rule_vary_settings_marks_custom]]
test('under Modal (Dorian) the mode never moves: a move to Aeolian is drawn again as Heavily varied, and every phrase is Dorian', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await gotoSessionHarness(page, DESKTOP)
  await choosePreset(page, 'Modal (Dorian)')
  await queueMutationSeed(page, MODAL_REDRAWN_ON_PHRASE_3)
  await readyToStart(page)
  await expect(page.locator('.control-summary')).toHaveText(
    'C Dorian · Modal (Dorian) · Lift · Leaping',
  )
  await turnVarySettingsOn(page)
  expect(await sessionSeedsDrawn(page)).toBe(1)
  const requestsAtStart = await requestCount(page)

  await startSession(page)
  await clockToReadied(page, 3, 0.1)
  await expect(page.locator('.control-summary')).toHaveText(
    'C Dorian · Custom, based on Modal (Dorian) · Lift · Leaping',
  )
  await expectPreset(page, 'Custom, based on Modal (Dorian)', MODAL_DESCRIPTION)
  expect(await checkedIn(page, 'Collection')).toBe('Dorian')
  expect(await checkedIn(page, 'Rhythmic variety')).toBe('Heavily varied')
  const shown = (await sessionState(page)).shownSettings
  expect(shown?.controls.collection).toBe('Dorian')
  expect(shown?.selection).toEqual({ kind: 'custom', baseId: 'modal-dorian' })

  // More mutations land by phrase 12; none of them moves the mode.
  await clockToReadied(page, 12, 0.1)
  expect((await sessionState(page)).phase).toBe('running')
  const requests = (
    await page.evaluate(() => window.__workspaceHarness.generationRequests())
  ).slice(requestsAtStart)
  expect(requests.length).toBeGreaterThanOrEqual(11)
  expect(new Set(requests.map((request) => JSON.stringify(request.controls))).size).toBeGreaterThan(
    2,
  )
  for (const request of requests) expect(request.controls.collection).toBe('Dorian')
})
