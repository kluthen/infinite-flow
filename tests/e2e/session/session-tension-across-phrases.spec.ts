/**
 * v2.2 chunk 30, `Tension across phrases` through the whole app on the workspace harness's fake
 * audio clock (port 4175). The control starts off, sits in the "During a session" group between
 * `Rising tempo` and `Vary settings`, is set at Idle and in the Review, and is read-only during a
 * session. A session started with it on, at the default Lift, requests its phrases from 2 on in
 * groups of four around Lift (phrase 2 Build, 3 Lift, 4 Settled, 5 Lift, 6 Build): the engine got
 * the flag. The Tension control shows Lift the whole time, never a phrase's step, and the fresh
 * phrase after the end is generated at Lift.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { clockTo } from './session-midi-helpers'
import {
  BEAT,
  DESKTOP,
  gotoSessionHarness,
  PREGENERATION_OFF,
  readyToStart,
  sessionAction,
  sessionState,
  sessionTimeline,
  startSession,
} from './session-helpers'

/** One measure at the default 90 BPM, in seconds. */
const MEASURE = 4 * BEAT

/** The control's accessible name and field label. */
const OPTION = 'Tension across phrases'

/** Intent: a radiogroup of the control section by its accessible name. */
function radiogroup(page: Page, name: string): Locator {
  return page.getByRole('radiogroup', { name, exact: true })
}

/** Intent: the label of a radiogroup's checked segment, or null when none is checked. */
async function checkedIn(page: Page, name: string): Promise<string | null> {
  const checked = radiogroup(page, name).locator('[role="radio"][aria-checked="true"]')
  return (await checked.count()) === 0 ? null : checked.innerText()
}

/**
 * Intent: set `Tension across phrases` with a click on its segment, and wait until the controller
 * holds the choice.
 */
async function setTensionAcrossPhrases(page: Page, on: boolean): Promise<void> {
  await radiogroup(page, OPTION)
    .getByRole('radio', { name: on ? 'On' : 'Off', exact: true })
    .click()
  await expect.poll(async () => (await sessionState(page)).tensionAcrossPhrases).toBe(on)
}

/** Intent: the tension of every `generate` call the page has made, in call order. */
async function requestedTensions(page: Page): Promise<string[]> {
  const requests = await page.evaluate(() => window.__workspaceHarness.generationRequests())
  return requests.map((request) => String(request.controls.tension))
}

/**
 * Intent: the tensions requested after the first `skip` calls, each run of equal ones counted
 * once: a phrase's retries all carry its tension, and no two phrases in a row here share one.
 */
async function tensionsPerPhraseAfter(page: Page, skip: number): Promise<string[]> {
  return (await requestedTensions(page))
    .slice(skip)
    .filter((tension, index, all) => index === 0 || all[index - 1] !== tension)
}

// @test-link [[req_multi_phrase_tension_arc]]
// @test-link [[rule_session_settings_locked]]
test('Tension across phrases starts Off between Rising tempo and Vary settings, and is read-only during a session', async ({
  page,
}) => {
  await gotoSessionHarness(page, DESKTOP, PREGENERATION_OFF)
  await readyToStart(page)
  await expect(page.locator('.control-group-session .field-label')).toHaveText([
    'Rhythm lock',
    'Rising tempo',
    OPTION,
    'Vary settings',
  ])
  expect(await checkedIn(page, OPTION)).toBe('Off')
  expect((await sessionState(page)).tensionAcrossPhrases).toBe(false)
  await expect(radiogroup(page, OPTION)).toHaveAccessibleDescription(
    'In groups of 4 phrases: your Tension, one step more, your Tension, one step less.',
  )

  const requestsBefore = (await requestedTensions(page)).length
  await setTensionAcrossPhrases(page, true)
  expect(await checkedIn(page, OPTION)).toBe('On')
  // A session option regenerates nothing.
  expect((await requestedTensions(page)).length).toBe(requestsBefore)

  await startSession(page)
  await expect(radiogroup(page, OPTION)).toHaveAttribute('aria-readonly', 'true')
  await radiogroup(page, OPTION)
    .getByRole('radio', { name: 'Off', exact: true })
    .click({ force: true })
  expect(await checkedIn(page, OPTION)).toBe('On')
  expect((await sessionState(page)).tensionAcrossPhrases).toBe(true)
})

// @test-link [[req_multi_phrase_tension_arc]]
// @test-link [[rule_multi_phrase_tension_arc_cycle]]
// @test-link [[rule_automatic_change_updates_controls_quietly]]
// @test-link [[rule_session_settings_locked]]
test('a session with it on generates each group of four around Lift while the Tension control keeps showing Lift', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page, DESKTOP, PREGENERATION_OFF)
  await readyToStart(page)
  expect(await checkedIn(page, 'Tension')).toBe('Lift')
  await setTensionAcrossPhrases(page, true)
  const idleRequests = (await requestedTensions(page)).length

  await startSession(page)
  const { countInEndsAt } = await sessionTimeline(page)
  for (let n = 1; n <= 5; n += 1) {
    await clockTo(page, countInEndsAt + 4 * (n - 1) * MEASURE + 0.1)
    expect((await sessionState(page)).phase).toBe('running')
    expect(await checkedIn(page, 'Tension')).toBe('Lift')
    expect((await sessionState(page)).shownSettings?.controls.tension).toBe('Lift')
  }
  // Phrase 6 is requested once phrase 5 starts sounding.
  await expect
    .poll(() => tensionsPerPhraseAfter(page, idleRequests))
    .toEqual(['Build', 'Lift', 'Settled', 'Lift', 'Build'])

  const beforeStop = (await requestedTensions(page)).length
  await sessionAction(page).click()
  const ended = await sessionState(page)
  expect(ended.phase).toBe('idle')
  expect(ended.review?.showing).toBe(true)
  expect(ended.tensionAcrossPhrases).toBe(true)
  expect(await checkedIn(page, 'Tension')).toBe('Lift')
  // The fresh phrase the end asks for is generated from the player's own Tension.
  await expect.poll(async () => (await requestedTensions(page)).length).toBeGreaterThan(beforeStop)
  expect((await requestedTensions(page)).at(-1)).toBe('Lift')

  // In the Review the control is editable again.
  await expect(radiogroup(page, OPTION)).not.toHaveAttribute('aria-readonly', 'true')
  await setTensionAcrossPhrases(page, false)
  await setTensionAcrossPhrases(page, true)
})
