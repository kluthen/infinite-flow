/**
 * v3.3 chunk 19, the Seventh chords control, on the workspace harness (port 4175): one control in
 * the foundation group, after Harmonic motion, that the player sets at Idle and in the review
 * mode. Each of its four segments (Off, Sometimes, Often, Always) sets the level in the next
 * request; a first visit and Delete everything give Off. A change with a preset selected makes
 * "Custom, based on {name}", discards every pre-generated phrase (`?pregeneration=on`), keeps the
 * phrase on screen and announces nothing; under the too-many-notes notice it starts a round. It is
 * read-only in Loading and for a whole session, showing the session's level from the count-in to
 * the end (phrase 1's own through the count-in and phrase 1 after Start with this phrase). Its
 * segments and note wrap within the field at every named breakpoint; keyboard, screen reader and
 * axe behave as for a figure level.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  awaitIdle,
  gotoWorkspaceHarness,
  harnessSnapshot,
  holdGeneration,
  observeLiveRegion,
  announcedCount,
  queueSeeds,
  releaseGeneration,
  showTooManyNotesNotice,
} from '../release/harness-helpers'
import { toBarline, untilReady } from '../session/rolling-helpers'
import {
  DESKTOP,
  PHONE,
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
  toCountInMiddle,
  toRunning,
} from '../session/session-helpers'
import { askConfirmation, confirmingAction, openYourData } from '../storage/your-data-helpers'
import { gotoStorageHarness } from '../storage/storage-helpers'
import { expectPresetShown, generateAndAwaitReady, primaryButton, radio } from './helpers'
import {
  generationRecords,
  gotoPregenerationHarness,
  holdBackground,
  phraseOfSeed,
  playerOrSessionRecordsFrom,
  readyWithSessionSeed,
  untilBackgroundHeld,
  untilQueueFull,
} from './pregeneration-helpers'

/** The control's segments, in order, with the level id each stands for. */
const SEGMENTS = [
  ['Off', 'off'],
  ['Sometimes', 'sometimes'],
  ['Often', 'favored'],
  ['Always', 'stronglyFavored'],
] as const

/** The control's note, as the phrase-workspace handoff words it. */
const NOTE =
  'How often a chord gets one more note stacked on top, as G7 (G, B, D, F) instead of G (G, B, D): a richer, jazzier sound. A preference, never a promise.'

/** The named breakpoints' landscape windows. */
const BREAKPOINTS = [
  { name: 'phone', size: PHONE },
  { name: 'tablet', size: { width: 1024, height: 768 } },
  { name: 'desktop', size: DESKTOP },
] as const

/** The session seed every phrase 1 of the pre-generation case is published with. */
const SESSION_SEED = 4242

/** Intent: the Seventh chords radiogroup. */
function control(page: Page): Locator {
  return page.getByRole('radiogroup', { name: 'Seventh chords', exact: true })
}

/** Intent: the field-group holding the control. */
function field(page: Page): Locator {
  return page.locator('.field-group').filter({ has: control(page) })
}

/** Intent: the checked segment's label. */
function checked(page: Page): Promise<string> {
  return control(page).locator('[role="radio"][aria-checked="true"]').innerText()
}

/** Intent: choose `label` and wait until the control shows it checked. */
async function choose(page: Page, label: string): Promise<void> {
  const segment = control(page).getByRole('radio', { name: label, exact: true })
  await segment.click()
  await expect(segment).toHaveAttribute('aria-checked', 'true')
}

/** Intent: how many `generate` calls the page has made. */
async function requestCount(page: Page): Promise<number> {
  return (await generationRecords(page)).length
}

/** Intent: regenerate phrase 1 with `seed` and give the level its player request carried. */
async function regeneratedLevel(page: Page, seed: number): Promise<string | undefined> {
  const from = await requestCount(page)
  await queueSeeds(page, [seed])
  await generateAndAwaitReady(page)
  const records = await playerOrSessionRecordsFrom(page, from)
  expect(records.length).toBeGreaterThan(0)
  return records.at(-1)!.chordFamilies['seventh-chords']
}

/** Intent: the field's box and whether every segment and the note sit inside it, none cut. */
function fieldFit(page: Page) {
  return field(page).evaluate((element) => {
    const box = element.getBoundingClientRect()
    /** Intent: whether `child` lies within the field's inline extent. */
    const inside = (child: Element) => {
      const inner = child.getBoundingClientRect()
      return inner.left >= box.left - 0.5 && inner.right <= box.right + 0.5
    }
    const segments = [...element.querySelectorAll('[role="radio"]')]
    const note = element.querySelector('.field-note')!
    return {
      segmentsInside: segments.every(
        (segment) => inside(segment) && segment.scrollWidth <= segment.clientWidth + 1,
      ),
      noteInside: inside(note) && note.scrollWidth <= note.clientWidth + 1,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }
  })
}

/** Intent: axe finds nothing inside the foundation group, which holds the control. */
async function expectNoAxeViolations(page: Page, context: string): Promise<void> {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => !(animation instanceof CSSTransition)),
  )
  const results = await new AxeBuilder({ page })
    .include('.control-group-row > .control-group:first-child')
    .analyze()
  expect(
    results.violations,
    `${context}:\n${results.violations.map((v) => `${v.id}: ${v.help}`).join('\n')}`,
  ).toEqual([])
}

// @test-link [[req_seventh_chords_level]]
// @test-link [[module_seventh_chords_level_options]]
test('sits after Harmonic motion, shows Off on a first visit and sets each level in the next request', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoWorkspaceHarness(page)
  const labels = await page
    .locator('.control-group')
    .first()
    .locator('.field-label')
    .allInnerTexts()
  expect(labels.slice(labels.indexOf('Harmonic motion'), labels.indexOf('Tension') + 1)).toEqual([
    'Harmonic motion',
    'Seventh chords',
    'Tension',
  ])
  await expect(control(page).getByRole('radio')).toHaveText(SEGMENTS.map(([label]) => label))
  expect(await checked(page)).toBe('Off')
  await expect(control(page)).toHaveAccessibleDescription(NOTE)
  await expect(control(page).locator('[role="radio"][disabled]')).toHaveCount(0)
  expect(await regeneratedLevel(page, 41)).toBe('off')

  let seed = 42
  for (const [label, level] of [...SEGMENTS.slice(1), SEGMENTS[0]]) {
    await choose(page, label)
    expect(await regeneratedLevel(page, seed), label).toBe(level)
    seed += 1
  }
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/)
})

// @test-link [[req_seventh_chords_level]]
test('after Delete everything the control shows Off and the next request carries Off', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await choose(page, 'Always')

  await openYourData(page)
  await askConfirmation(page, 'Delete everything', 'Delete everything?')
  await Promise.all([page.waitForEvent('load'), confirmingAction(page).click()])
  await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)

  expect(await checked(page)).toBe('Off')
  expect(await regeneratedLevel(page, 51)).toBe('off')
})

// @test-link [[rule_pregeneration_discarded_on_change]]
// @test-link [[rule_custom_selection]]
// @test-link [[module_seventh_chords_level_options]]
test('a change with a preset selected makes Custom, discards every pre-generated phrase, keeps the phrase on screen and announces nothing', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoPregenerationHarness(page)
  await readyWithSessionSeed(page, SESSION_SEED)
  await untilQueueFull(page)
  await holdBackground(page)
  const from = await requestCount(page)
  const timeline = (await harnessSnapshot(page)).timeline
  await expectPresetShown(page, 'Neutral')
  await observeLiveRegion(page, '.generation-status')

  await choose(page, 'Sometimes')

  await expectPresetShown(page, 'Custom, based on Neutral')
  expect((await harnessSnapshot(page)).selection).toEqual({ kind: 'custom', baseId: 'neutral' })
  // The queue starts again from phrase 2, at the new level: every ready phrase was discarded.
  const restarted = await untilBackgroundHeld(page, from)
  expect(await phraseOfSeed(page, SESSION_SEED, restarted.seed)).toBe(2)
  expect(restarted.chordFamilies).toEqual({ 'seventh-chords': 'sometimes' })
  // The phrase on screen stays: no player request, the same timeline.
  expect(await playerOrSessionRecordsFrom(page, from)).toHaveLength(0)
  expect((await harnessSnapshot(page)).timeline).toBe(timeline)
  // Nothing announces it: no live region in its field, and no generation was announced.
  await expect(field(page).locator('[aria-live], [role="status"], [role="alert"]')).toHaveCount(0)
  expect(await announcedCount(page, '.generation-status', 'Generating phrase')).toBe(0)
})

// @test-link [[rule_too_dense_notice_retry_rounds]]
// @test-link [[req_seventh_chords_level]]
test('under the too-many-notes notice a change starts a round, like any setting', async ({
  page,
}) => {
  await page.setViewportSize(PHONE)
  await gotoWorkspaceHarness(page)
  await showTooManyNotesNotice(page, [401, 402, 403, 404])
  const from = await requestCount(page)

  await queueSeeds(page, [405])
  await choose(page, 'Often')

  await expect.poll(async () => (await harnessSnapshot(page)).seed, { timeout: 30_000 }).toBe(405)
  await awaitIdle(page)
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/)
  const records = await playerOrSessionRecordsFrom(page, from)
  expect(records.at(-1)?.chordFamilies).toEqual({ 'seventh-chords': 'favored' })
})

// @test-link [[rule_session_settings_locked]]
test('is read-only in Loading, showing the level, and editable again once the phrase is ready', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await choose(page, 'Sometimes')
  await holdGeneration(page)
  await queueSeeds(page, [61])
  await primaryButton(page).click()
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-loading/)

  await expect(control(page)).toHaveAttribute('aria-readonly', 'true')
  await expect(field(page)).toHaveClass(/is-readonly/)
  await control(page).getByRole('radio', { name: 'Always' }).dispatchEvent('click')
  expect(await checked(page)).toBe('Sometimes')

  await releaseGeneration(page)
  await awaitIdle(page)
  await expect(control(page)).not.toHaveAttribute('aria-readonly')
})

// @test-link [[rule_session_settings_locked]]
// @test-link [[rule_vary_settings_never_moves_seventh_chords_level]]
test("during a session it is read-only with the session's level from the count-in to the end, and editable in the review mode", async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page)
  await choose(page, 'Often')
  await readyToStart(page)

  await startSession(page)
  await expect(control(page)).toHaveAttribute('aria-readonly', 'true')
  expect(await checked(page)).toBe('Often')
  await toCountInMiddle(page)
  expect(await checked(page)).toBe('Often')
  await toRunning(page)
  expect(await checked(page)).toBe('Often')
  await expectNoAxeViolations(page, 'read-only during a session')
  await control(page).getByRole('radio', { name: 'Off' }).dispatchEvent('click')
  expect(await checked(page)).toBe('Often')

  await sessionAction(page).click()
  await expect.poll(async () => (await sessionState(page)).review?.showing).toBe(true)
  await expect(control(page)).not.toHaveAttribute('aria-readonly')
  await choose(page, 'Always')
  await expectPresetShown(page, 'Custom, based on Neutral')
  // The phrase action waits in the review mode: the next request, once it closes, has the level.
  await page.getByRole('button', { name: 'Close review', exact: true }).click()
  await expect.poll(async () => (await sessionState(page)).review?.showing).toBe(false)
  expect(await checked(page)).toBe('Always')
  expect(await regeneratedLevel(page, 71)).toBe('stronglyFavored')
})

// @test-link [[rule_session_settings_locked]]
// @test-link [[rule_stale_phrase_prompt_at_start]]
test("after Start with this phrase it shows phrase 1's level through the count-in and phrase 1, then the session's to the end", async ({
  page,
}) => {
  test.setTimeout(120_000)
  await gotoSessionHarness(page)
  await readyToStart(page)
  expect(await checked(page)).toBe('Off')
  await choose(page, 'Always')

  await sessionAction(page).click()
  const prompt = page.getByRole('alertdialog', { name: 'This phrase is from before your changes' })
  await expect(prompt).toBeVisible()
  await expect(prompt).toContainText('Seventh chords')
  await prompt.getByRole('button', { name: 'Start with this phrase', exact: true }).click()
  await expect(prompt).toHaveCount(0)
  expect((await sessionState(page)).phase).toBe('count-in')

  await expect(control(page)).toHaveAttribute('aria-readonly', 'true')
  expect(await checked(page)).toBe('Off')
  await untilReady(page, 2)
  await toBarline(page, 1, 3)
  expect(await checked(page)).toBe('Off')

  await toBarline(page, 2, 0)
  await expect.poll(() => checked(page)).toBe('Always')
  await expect(control(page)).toHaveAttribute('aria-readonly', 'true')
  await sessionAction(page).click()
  await expect(control(page)).not.toHaveAttribute('aria-readonly')
  expect(await checked(page)).toBe('Always')
})

// @test-link [[module_seventh_chords_level_options]]
test('moves through its segments with the arrow keys, as a figure level does', async ({ page }) => {
  await gotoWorkspaceHarness(page)
  const off = control(page).getByRole('radio', { name: 'Off', exact: true })
  await off.focus()
  await page.keyboard.press('ArrowRight')
  await expect(control(page).getByRole('radio', { name: 'Sometimes' })).toBeFocused()
  await expect(control(page).getByRole('radio', { name: 'Sometimes' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.keyboard.press('End')
  await expect(control(page).getByRole('radio', { name: 'Always' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.keyboard.press('ArrowLeft')
  await expect(control(page).getByRole('radio', { name: 'Often' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expectPresetShown(page, 'Custom, based on Neutral')
})

for (const { name, size } of BREAKPOINTS) {
  // @test-link [[req_seventh_chords_level]]
  test(`at the ${name} breakpoint its segments and note wrap within the field, none cut`, async ({
    page,
  }) => {
    await page.setViewportSize(size)
    await gotoWorkspaceHarness(page)
    await expect(field(page).locator('.field-note')).toHaveText(NOTE)
    expect(await fieldFit(page)).toEqual({
      segmentsInside: true,
      noteInside: true,
      overflow: false,
    })
  })
}

for (const theme of ['Light', 'Dark'] as const) {
  // @test-link [[req_seventh_chords_level]]
  test(`has no detectable axe violations in its field at Idle, ${theme} theme`, async ({
    page,
  }) => {
    await gotoWorkspaceHarness(page)
    await radio(page, 'Presentation theme', theme).click()
    await choose(page, 'Always')
    await expectNoAxeViolations(page, `${theme} theme`)
  })
}
