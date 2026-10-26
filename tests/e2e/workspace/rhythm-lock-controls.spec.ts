/**
 * v3.2, session mode's `Rhythm lock` and its dependent `Allowed rhythm changes` through the whole
 * app on the workspace harness (port 4175), each test from an empty browser context, on the fake
 * audio clock with pre-generation off, so every phrase a session plays is one it requests:
 *
 * - the five toggles show only while the lock shows `On`, kept while hidden;
 * - the lock and the allowed changes reach every request of a session from phrase 2 on, and no
 *   request carries a lock group with the lock off;
 * - during a session the switches and toggles are read-only and no dependent appears or leaves;
 * - nothing in the live view marks a rhythm change: under session seed 8 (phrase 1 seeded 7, the
 *   lock on with every change allowed) phrase 4 is a rhythm change and phrases 2, 3, 5 and 6 keep
 *   the locked bars, and the view's elements, classes, ARIA and live regions are the same at every
 *   phrase's start;
 * - axe finds nothing in the controls with both dependents shown, nor with Vary settings
 *   unavailable.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { queueSessionSeeds } from '../release/harness-helpers'
import { settledStaff } from '../session/rolling-helpers'
import {
  DESKTOP,
  PREGENERATION_OFF,
  gotoSessionHarness,
  readyToStart,
  sessionState,
  startSession,
  toRunning,
} from '../session/session-helpers'
import { phraseOfSeed } from './pregeneration-helpers'
import { radio } from './helpers'
import {
  RHYTHM_CHANGES,
  RHYTHM_LOCKED_NOTE,
  UNAVAILABLE_NOTE,
  VARY_GROUPS,
  allowedChangesList,
  changeToggle,
  checkedIn,
  flipChange,
  flipGroup,
  groupToggle,
  sessionChoices,
  sessionGroup,
  setRhythmLock,
  setVarySettings,
  toPhraseStart,
  toggleStates,
  whatMayVaryList,
} from './session-options-helpers'

/** The `Rhythm lock` note, as the phrase-workspace handoff words it. */
const RHYTHM_LOCK_NOTE =
  'Every phrase keeps the rhythm of the first one, so your eyes can stay on the notes.'

/** The `Allowed rhythm changes` note, as the phrase-workspace handoff words it. */
const ALLOWED_CHANGES_NOTE =
  "Now and then one phrase changes the rhythm in one of these ways, and the next goes back to it. What's possible depends on your rhythm settings: with Strict variety and Straight syncopation, almost nothing."

/** The session seed under which phrase 4 is a rhythm change, the lock on with every change. */
const CHANGE_ON_PHRASE_4 = 8

/** The phrase that seed changes the rhythm of. */
const CHANGED_PHRASE = 4

/** Intent: the five toggles shown off, in order. */
function allOff(): string[] {
  return RHYTHM_CHANGES.map(({ label }) => `${label}: false`)
}

/** Intent: allow every rhythm change with a click on each toggle. */
async function allowEveryChange(page: Page): Promise<void> {
  for (const { label } of RHYTHM_CHANGES) await flipChange(page, label)
}

/**
 * Intent: try to activate a read-only control both ways a player's click could reach it: a real
 * click at its place (forced, as the read-only group takes the pointer there) and a click event
 * dispatched on the control itself, which its own script must refuse.
 */
async function refuseActivation(control: Locator): Promise<void> {
  await control.click({ force: true })
  await control.dispatchEvent('click')
}

/** Intent: every `generate` call's record since the page loaded. */
function requests(page: Page): Promise<readonly WorkspaceHarnessGenerationRequest[]> {
  return page.evaluate(() => window.__workspaceHarness.generationRequests())
}

/**
 * Intent: format axe violations into a readable failure message rather than a raw object dump,
 * as the accessibility spec does.
 */
function describeViolations(violations: readonly { id: string; help: string }[]): string {
  return violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n')
}

/** Intent: run axe on the whole page once no CSS transition is running, and expect nothing. */
async function expectNoAxeViolations(page: Page, when: string): Promise<void> {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => !(animation instanceof CSSTransition)),
  )
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations, `${when}:\n${describeViolations(results.violations)}`).toEqual([])
}

/**
 * What the live view shows besides the music itself, read in one task: every HTML element of the
 * app as its tag, classes, role and ARIA attributes; every class the engraved SVGs use; and every
 * element outside the "During a session" group whose text or attributes mention a change or a
 * bend.
 */
interface ViewMarks {
  readonly elements: readonly string[]
  readonly svgClasses: readonly string[]
  readonly mentions: readonly string[]
}

/** Intent: read the live view's marks (see ViewMarks) now. */
function viewMarks(page: Page): Promise<ViewMarks> {
  return page.evaluate(() => {
    const elements = new Set<string>()
    const svgClasses = new Set<string>()
    const mentions: string[] = []
    for (const element of document.querySelectorAll('body *')) {
      const ownText = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? '')
        .join(' ')
      const attributes = [...element.attributes].map((a) => `${a.name}=${a.value}`).join(' ')
      if (
        /chang|bend/i.test(`${ownText} ${attributes}`) &&
        element.closest('.control-group-session') === null
      ) {
        mentions.push(`${element.tagName} ${attributes}: ${ownText.trim()}`)
      }
      if (element.closest('#app') === null) continue
      if (element.closest('svg') !== null) {
        for (const name of element.classList) svgClasses.add(name)
        continue
      }
      const aria = [...element.attributes]
        .filter((a) => a.name === 'role' || a.name.startsWith('aria-'))
        .map((a) => `${a.name}=${a.value}`)
        .sort()
      elements.add(
        `${element.tagName} ${[...element.classList].sort().join('.')} ${aria.join(' ')}`,
      )
    }
    return { elements: [...elements].sort(), svgClasses: [...svgClasses].sort(), mentions }
  })
}

/**
 * Intent: from now on, log every text a live region (`aria-live`, or a status, alert or log role)
 * of the page takes on, with the session's phase, so a spec can tell what was announced.
 */
async function startLiveRegionLog(page: Page): Promise<void> {
  await page.evaluate(() => {
    const log: string[] = []
    const regions = '[aria-live], [role="status"], [role="alert"], [role="log"]'
    let last = ''
    new MutationObserver(() => {
      const texts = [...document.querySelectorAll(regions)]
        .map((region) => `${region.className}: ${(region.textContent ?? '').trim()}`)
        .join(' | ')
      if (texts === last) return
      last = texts
      log.push(`${window.__workspaceHarness.session.state().phase} ${texts}`)
    }).observe(document.body, { childList: true, subtree: true, characterData: true })
    ;(window as unknown as { __liveRegionLog: string[] }).__liveRegionLog = log
  })
}

/** Intent: the live-region texts logged since `startLiveRegionLog`. */
function liveRegionLog(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __liveRegionLog: string[] }).__liveRegionLog)
}

// @test-link [[ui_field_dependent]]
// @test-link [[ui_toggle_list]]
// @test-link [[rule_allowed_rhythm_changes]]
test('Allowed rhythm changes shows only while Rhythm lock shows On, its toggles kept while hidden', async ({
  page,
}) => {
  await gotoSessionHarness(page, DESKTOP)
  expect(await checkedIn(page, 'Rhythm lock')).toBe('Off')
  await expect(page.getByRole('radiogroup', { name: 'Rhythm lock' })).toHaveAccessibleDescription(
    RHYTHM_LOCK_NOTE,
  )
  await expect(allowedChangesList(page)).toHaveCount(0)
  await expect(sessionGroup(page).locator('.field-dependent')).toHaveCount(0)

  await setRhythmLock(page, true)
  await expect(allowedChangesList(page)).toBeVisible()
  await expect(allowedChangesList(page)).toHaveAccessibleDescription(ALLOWED_CHANGES_NOTE)
  expect(await toggleStates(allowedChangesList(page))).toEqual(allOff())
  await flipChange(page, 'Split a note')
  await flipChange(page, 'Add or remove a rest')
  expect((await sessionChoices(page)).allowedRhythmChanges).toEqual(['split_note', 'note_rest'])

  await setRhythmLock(page, false)
  await expect(allowedChangesList(page)).toHaveCount(0)
  // Hidden, the list keeps the player's choice.
  expect((await sessionChoices(page)).allowedRhythmChanges).toEqual(['split_note', 'note_rest'])

  await setRhythmLock(page, true)
  expect(await toggleStates(allowedChangesList(page))).toEqual([
    'Move a note: false',
    'Move a rest: false',
    'Split a note: true',
    'Merge two notes: false',
    'Add or remove a rest: true',
  ])
})

// @test-link [[req_rhythm_lock]]
// @test-link [[rule_allowed_rhythm_changes]]
test('the lock and the allowed changes set in the controls reach every request from phrase 2 on', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await gotoSessionHarness(page, DESKTOP, PREGENERATION_OFF)
  await setRhythmLock(page, true)
  // Chosen out of order; the request carries them in the canonical order.
  await flipChange(page, 'Merge two notes')
  await flipChange(page, 'Move a rest')
  await readyToStart(page)
  await startSession(page)
  for (let phrase = 2; phrase <= 5; phrase += 1) await toPhraseStart(page, phrase)

  const [idle, ...session] = await requests(page)
  expect(idle?.rhythmLock, 'Idle phrase 1 carries no lock group').toBeNull()
  expect(session.length).toBeGreaterThanOrEqual(4)
  for (const request of session) {
    expect(request.rhythmLock).toEqual({
      state: 'locked',
      allowedChanges: ['move_rest', 'merge_notes'],
      tenserPhrase: false,
    })
  }
})

// @test-link [[req_rhythm_lock]]
test('with the lock off no request carries a lock group, whatever changes it keeps', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await gotoSessionHarness(page, DESKTOP, PREGENERATION_OFF)
  await setRhythmLock(page, true)
  await allowEveryChange(page)
  await setRhythmLock(page, false)
  await readyToStart(page)
  await startSession(page)
  for (let phrase = 2; phrase <= 5; phrase += 1) await toPhraseStart(page, phrase)

  const all = await requests(page)
  expect(all.length).toBeGreaterThanOrEqual(5)
  for (const request of all) {
    expect(request.rhythmLock).toBeNull()
    expect(request.rhythmLockOutcome).toBeNull()
  }
})

// @test-link [[req_rhythm_lock]]
// @test-link [[ui_toggle_list]]
// @test-link [[ui_field_dependent]]
test('during a session the switches and toggles are read-only and no dependent appears or leaves', async ({
  page,
}) => {
  await gotoSessionHarness(page, DESKTOP)
  await setRhythmLock(page, true)
  await flipChange(page, 'Move a note')
  await setVarySettings(page, true)
  await flipGroup(page, 'Harmony')
  await readyToStart(page)
  const choices = await sessionChoices(page)
  const changesShown = await toggleStates(allowedChangesList(page))
  const groupsShown = await toggleStates(whatMayVaryList(page))

  await startSession(page)
  await toRunning(page)
  for (const name of ['Rhythm lock', 'Vary settings']) {
    await expect(page.getByRole('radiogroup', { name, exact: true })).toHaveAttribute(
      'aria-readonly',
      'true',
    )
  }
  for (const { label } of RHYTHM_CHANGES) await refuseActivation(changeToggle(page, label))
  for (const { label } of VARY_GROUPS) {
    // The lock disables Rhythm natively: there is nothing to click.
    if (label !== 'Rhythm') await refuseActivation(groupToggle(page, label))
  }
  await changeToggle(page, 'Move a rest').focus()
  await page.keyboard.press('Space')
  await groupToggle(page, 'Tension').focus()
  await page.keyboard.press('Enter')
  await refuseActivation(radio(page, 'Rhythm lock', 'Off'))
  await refuseActivation(radio(page, 'Vary settings', 'Off'))

  expect(await checkedIn(page, 'Rhythm lock')).toBe('On')
  expect(await checkedIn(page, 'Vary settings')).toBe('On')
  expect(await toggleStates(allowedChangesList(page))).toEqual(changesShown)
  expect(await toggleStates(whatMayVaryList(page))).toEqual(groupsShown)
  expect(await sessionChoices(page)).toEqual(choices)
  expect((await sessionState(page)).phase).toBe('running')
})

// @test-link [[ui_field_dependent]]
test('a session started with both switches off shows no dependent when one is clicked On', async ({
  page,
}) => {
  await gotoSessionHarness(page, DESKTOP)
  await readyToStart(page)
  await startSession(page)
  await toRunning(page)

  await refuseActivation(radio(page, 'Rhythm lock', 'On'))
  await refuseActivation(radio(page, 'Vary settings', 'On'))
  expect(await checkedIn(page, 'Rhythm lock')).toBe('Off')
  expect(await checkedIn(page, 'Vary settings')).toBe('Off')
  await expect(sessionGroup(page).locator('.field-dependent')).toHaveCount(0)
  const choices = await sessionChoices(page)
  expect(choices.rhythmLockOn).toBe(false)
  expect(choices.varySettings).toBe(false)
})

// @test-link [[rule_rhythm_changes_never_shown]]
test('the live view never marks a rhythm change: a changed phrase shows like the locked ones', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await gotoSessionHarness(page, DESKTOP, PREGENERATION_OFF)
  await setRhythmLock(page, true)
  await allowEveryChange(page)
  await queueSessionSeeds(page, [CHANGE_ON_PHRASE_4])
  await readyToStart(page)
  await startLiveRegionLog(page)
  await startSession(page)

  const marks: ViewMarks[] = []
  for (let phrase = 2; phrase <= 6; phrase += 1) {
    await toPhraseStart(page, phrase)
    await settledStaff(page)
    marks.push(await viewMarks(page))
  }

  // The seed does give phrase 4 a rhythm change, and only phrase 4 among phrases 2 to 6.
  const outcomes = new Map<number, string | null>()
  for (const request of (await requests(page)).slice(1)) {
    if (request.settled !== 'answered' || request.timeline === null) continue
    const phrase = await phraseOfSeed(page, CHANGE_ON_PHRASE_4, request.seed)
    if (phrase !== null && phrase <= 6) outcomes.set(phrase, request.rhythmLockOutcome)
  }
  expect(Object.fromEntries(outcomes)).toEqual({
    2: 'locked_bars',
    3: 'locked_bars',
    [CHANGED_PHRASE]: 'rhythm_change',
    5: 'locked_bars',
    6: 'locked_bars',
  })

  // Read ahead from phrase 3's start, sounding from phrase 4's: the view is the same throughout.
  for (const [index, reading] of marks.entries()) {
    expect(reading.mentions, `phrase ${index + 2}: nothing mentions a change`).toEqual([])
    expect(reading.elements, `phrase ${index + 2}: the same elements`).toEqual(marks[0]!.elements)
    expect(reading.svgClasses, `phrase ${index + 2}: the same staff classes`).toEqual(
      marks[0]!.svgClasses,
    )
  }
  // No live region took on a new text once phrase 1 ran, the changed phrase's time included.
  const announced = (await liveRegionLog(page)).filter((entry) => entry.startsWith('running'))
  expect(announced).toEqual([])
  expect((await sessionState(page)).phase).toBe('running')
})

// @test-link [[ui_toggle_list]]
// @test-link [[ui_field_dependent]]
// @test-link [[rule_vary_settings_needs_legal_move]]
test('axe finds nothing with both dependents shown, nor with Vary settings unavailable', async ({
  page,
}) => {
  await gotoSessionHarness(page, DESKTOP)
  await readyToStart(page)
  await setRhythmLock(page, true)
  await flipChange(page, 'Move a note')
  await setVarySettings(page, true)
  await expect(allowedChangesList(page)).toBeVisible()
  await expect(whatMayVaryList(page)).toBeVisible()
  await expect(sessionGroup(page).getByText(RHYTHM_LOCKED_NOTE)).toBeVisible()
  await expectNoAxeViolations(page, 'both dependents shown')

  for (const { label } of VARY_GROUPS) {
    if (label !== 'Rhythm') await flipGroup(page, label)
  }
  await expect.poll(async () => (await sessionChoices(page)).varySettingsAvailable).toBe(false)
  await expect(sessionGroup(page).getByText(UNAVAILABLE_NOTE)).toBeVisible()
  await expectNoAxeViolations(page, 'Vary settings unavailable')
})
