/**
 * v2.1 chunk 25, `Vary settings` through the whole app on the workspace harness's fake audio
 * clock (port 4175). The control starts off, is set at Idle and in the Review, and is read-only
 * during a session. With it on, a mutation shows in the locked controls at the instant the phrase
 * generated with it starts sounding, with nothing in the control section moving; at the session's
 * end, by a hidden tab or by Stop, the controls show the player's own settings again (the preset
 * selection, the figure levels and a `Varying` register included) and the fresh phrase is
 * generated from them. A step of a setting a preset holds, a figure level or one of the ten
 * controls, Tension included, shows the selection as Custom based on the preset. A settings change made while the next phrase is partly drawn as read-ahead leaves that
 * phrase as drawn and first shows in the phrase after it.
 *
 * Each session's mutation seed derives from the session seed drawn with its phrase 1, queued here
 * as the inverse of the wanted mutation seed: from Neutral, mutation seed 12 steps the accented
 * passing tone from as today to favored on phrase 3 and mutation seed 11 steps Tension from Lift
 * to Settled on phrase 3; from Jazz, mutation seed 25 steps the register on phrase 3 (spec D181
 * scales, v3.1's figure step).
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  harnessSnapshot,
  queueSessionSeeds,
  sessionSeedsDrawn,
  settingsMutationSeed,
} from '../release/harness-helpers'
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

/** Intent: the preset status's text in use. */
function presetStatus(page: Page): Locator {
  return page.locator('.preset-status-text:not(.is-reserve)')
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
 * Intent: the box of every element of the control section, in document order (its classes may
 * change, its geometry may not), the page's scroll and the animations running in the section,
 * read in one task.
 */
function controlSectionLayout(page: Page) {
  return page.evaluate(() => {
    const section = document.querySelector('.control-section')
    if (section === null) throw new Error('no control section')
    return {
      boxes: [section, ...section.querySelectorAll('*')].map((element) => {
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
    'Every 2 to 4 phrases, one setting moves one step. Never the instrument or the tempo. Your settings come back when the session ends.',
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
  await expect(page.locator('.preset-status')).toHaveAttribute('aria-live', 'off')

  const phraseThree = await phraseStart(page, 3)
  await clockTo(page, phraseThree - 0.1)
  await expect(presetStatus(page)).toHaveText(/^Neutral preset applied/)
  expect(await checkedIn(page, 'Musical profile preset')).toBe('Neutral')
  const shownBefore = (await sessionState(page)).shownSettings
  expect(shownBefore).toMatchObject({
    figureLevels: NEUTRAL_LEVELS,
    selection: { kind: 'preset', presetId: 'neutral' },
  })
  const before = await controlSectionLayout(page)

  await clockTo(page, phraseThree + 0.1)
  await expect(presetStatus(page)).toHaveText(
    'Custom configuration - Neutral grammar retained. Choosing Neutral or Jazz replaces all seven preset-controlled values.',
  )
  await expect(page.locator('.control-summary')).toHaveText(
    'C Ionian · Custom, based on Neutral · Lift · Shaped',
  )
  expect(await checkedIn(page, 'Musical profile preset')).toBeNull()
  expect(await checkedIn(page, 'Leapiness')).toBe('Shaped')
  // One figure, one level: the accented passing tone from as today to favored, nothing else.
  const shown = (await sessionState(page)).shownSettings
  expect(shown?.figureLevels).toEqual({ ...NEUTRAL_LEVELS, accentedPassingTone: 'favored' })
  expect(shown?.selection).toEqual({ kind: 'custom', baseId: 'neutral' })
  expect(shown?.controls).toEqual(shownBefore?.controls)
  const after = await controlSectionLayout(page)
  expect(after).toEqual(before)
  expect(after.animations).toBe(0)
  await expect(page.locator('.preset-status')).toHaveAttribute('aria-live', 'off')

  const requestsAtEnd = await requestCount(page)
  await page.evaluate(() => window.__workspaceHarness.page.setHidden(true))
  expect((await sessionState(page)).lastEnd?.cause).toBe('hidden-tab')
  await expect(presetStatus(page)).toHaveText(/^Neutral preset applied/)
  expect(await checkedIn(page, 'Musical profile preset')).toBe('Neutral')
  await expect(page.locator('.control-summary')).toHaveText('C Ionian · Neutral · Lift · Shaped')
  await expect(page.locator('.preset-status')).toHaveAttribute('aria-live', 'polite')
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
  expect(await checkedIn(page, 'Musical profile preset')).toBeNull()
  expect((await sessionState(page)).shownSettings?.selection).toEqual({
    kind: 'custom',
    baseId: 'neutral',
  })

  await sessionAction(page).click()
  expect((await sessionState(page)).lastEnd?.cause).toBe('stop')
  await expect(page.locator('.control-summary')).toHaveText('C Ionian · Neutral · Lift · Shaped')
  expect(await checkedIn(page, 'Tension')).toBe('Lift')
  expect(await checkedIn(page, 'Musical profile preset')).toBe('Neutral')
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
  await radiogroup(page, 'Musical profile preset').getByRole('radio', { name: 'Jazz' }).click()
  await queueMutationSeed(page, REGISTER_ON_PHRASE_3)
  await readyToStart(page)
  expect(await checkedIn(page, 'Register')).toBe('Varying')
  await turnVarySettingsOn(page)
  // The queued session seed is the one drawn with the phrase 1 the session starts from.
  expect(await sessionSeedsDrawn(page)).toBe(1)

  await startSession(page)
  await clockTo(page, (await phraseStart(page, 3)) + 0.1)
  await expect.poll(async () => checkedIn(page, 'Register')).toMatch(/^(Low|Middle|High)$/)
  await expect(presetStatus(page)).toHaveText(/^Custom configuration - Jazz grammar retained/)
  await expect(page.locator('.control-summary')).toHaveText(
    'C Ionian · Custom, based on Jazz · Lift · Shaped',
  )

  const requestsAtEnd = await requestCount(page)
  await sessionAction(page).click()
  expect((await sessionState(page)).lastEnd?.cause).toBe('stop')
  expect(await checkedIn(page, 'Register')).toBe('Varying')
  expect(await checkedIn(page, 'Musical profile preset')).toBe('Jazz')
  await expect(presetStatus(page)).toHaveText(/^Jazz preset applied/)
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
