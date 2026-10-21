/**
 * v3.1 chunk 14, the Embellishments group, on the workspace harness (port 4175): seven figure
 * level controls the player sets at Idle. Each sets its figure's level in the next request, in any
 * combination, every figure Off included (no segment is ever disabled, spec D378). A level change
 * with a preset selected makes "Custom, based on {name}", discards every pre-generated phrase
 * (`?pregeneration=on`) and never regenerates the phrase on screen. During a session the group is
 * read-only and a Vary settings figure step shows as that figure's level changing in place at its
 * phrase. A landscape phone stacks the seven fields; a desktop window lays them out in columns.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  gotoWorkspaceHarness,
  harnessSnapshot,
  queueSeeds,
  queueSessionSeeds,
  settingsMutationSeed,
} from '../release/harness-helpers'
import { clockTo } from '../session/session-midi-helpers'
import {
  BEAT,
  DESKTOP,
  PHONE,
  gotoSessionHarness,
  readyToStart,
  sessionState,
  sessionTimeline,
  startSession,
} from '../session/session-helpers'
import { expectPresetShown, generateAndAwaitReady, radio } from './helpers'
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

/** The seven figures' field labels, in the group's order. */
const FIGURES = [
  'Passing tone',
  'Accented passing tone',
  'Neighbor tone',
  'Appoggiatura',
  'Diatonic enclosure',
  'Chromatic approach',
  'Chromatic enclosure',
] as const

type FigureLabel = (typeof FIGURES)[number]

/** Neutral's levels, as the controls show them. */
const NEUTRAL_SHOWN: Readonly<Record<FigureLabel, string>> = {
  'Passing tone': 'Rarely',
  'Accented passing tone': 'Rarely',
  'Neighbor tone': 'Rarely',
  Appoggiatura: 'Off',
  'Diatonic enclosure': 'Off',
  'Chromatic approach': 'Off',
  'Chromatic enclosure': 'Off',
}

/** Neutral's levels, as the request carries them. */
const NEUTRAL_LEVELS = {
  passingTone: 'asToday',
  accentedPassingTone: 'asToday',
  neighborTone: 'asToday',
  appoggiatura: 'off',
  diatonicEnclosure: 'off',
  chromaticApproach: 'off',
  chromaticEnclosure: 'off',
} as const

/** The session seed every phrase 1 of the pre-generation case is published with. */
const SESSION_SEED = 4242
/** From Neutral, the mutation seed that steps the accented passing tone up one level on phrase 3. */
const FIGURE_STEP_ON_PHRASE_3 = 12

/** Intent: the Embellishments group. */
function figuresGroup(page: Page): Locator {
  return page.locator('.control-group-figures')
}

/** Intent: a figure's level control, by its exact accessible name. */
function levelControl(page: Page, figure: FigureLabel): Locator {
  return page.getByRole('radiogroup', { name: figure, exact: true })
}

/** Intent: choose `level` for `figure` and wait until the control shows it checked. */
async function chooseLevel(page: Page, figure: FigureLabel, level: string): Promise<void> {
  const segment = levelControl(page, figure).getByRole('radio', { name: level, exact: true })
  await segment.click()
  await expect(segment).toHaveAttribute('aria-checked', 'true')
}

/** Intent: the checked segment's label of each figure's control. */
async function shownLevels(page: Page): Promise<Record<FigureLabel, string>> {
  const shown = {} as Record<FigureLabel, string>
  for (const figure of FIGURES) {
    shown[figure] = await levelControl(page, figure)
      .locator('[role="radio"][aria-checked="true"]')
      .innerText()
  }
  return shown
}

/** Intent: how many `generate` calls the page has made. */
async function requestCount(page: Page): Promise<number> {
  return (await generationRecords(page)).length
}

/**
 * Intent: regenerate phrase 1 with `seed` and return the player request it was made from, never a
 * background attempt the harness's pre-generation mode may have made meanwhile.
 */
async function regenerate(page: Page, seed: number): Promise<WorkspaceHarnessGenerationRequest> {
  const from = await requestCount(page)
  await queueSeeds(page, [seed])
  await generateAndAwaitReady(page)
  const records = await playerOrSessionRecordsFrom(page, from)
  expect(records.length).toBeGreaterThan(0)
  return records.at(-1)!
}

/** Intent: the seven fields' boxes, in the group's order, read in one task. */
function fieldBoxes(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('.control-group-figures > .field-group')].map((field) => {
      const box = field.getBoundingClientRect()
      const segments = [...field.querySelectorAll('[role="radio"]')].map((segment) => {
        const inner = segment.getBoundingClientRect()
        return {
          inside:
            inner.left >= box.left - 0.5 &&
            inner.right <= box.right + 0.5 &&
            segment.scrollWidth <= segment.clientWidth + 1,
        }
      })
      return {
        x: Math.round(box.x),
        y: Math.round(box.y),
        bottom: Math.round(box.bottom),
        segmentsInside: segments.every((segment) => segment.inside),
      }
    }),
  )
}

/** Intent: axe finds nothing inside the Embellishments group, with the theme settled. */
async function expectNoAxeViolations(page: Page, context: string): Promise<void> {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => !(animation instanceof CSSTransition)),
  )
  const results = await new AxeBuilder({ page }).include('.control-group-figures').analyze()
  expect(
    results.violations,
    `${context}:\n${results.violations.map((v) => `${v.id}: ${v.help}`).join('\n')}`,
  ).toEqual([])
}

// @test-link [[req_embellishment_figure_levels]]
// @test-link [[module_figure_level_options]]
// @test-link [[rule_custom_selection]]
test("the seven controls show Neutral's levels on a first visit and set each figure's level in the next request, every figure Off included", async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await expect(figuresGroup(page).locator('h3')).toHaveText('Embellishments')
  expect(await shownLevels(page)).toEqual(NEUTRAL_SHOWN)
  for (const figure of FIGURES) {
    await expect(levelControl(page, figure)).toHaveAccessibleDescription(/^.+\. Needs .+/)
  }
  await expect(figuresGroup(page).locator('[role="radio"][disabled]')).toHaveCount(0)
  expect((await regenerate(page, 41)).figureLevels).toEqual(NEUTRAL_LEVELS)

  // Passing and neighbor tones both Off, every other level once: nothing is disabled or moved.
  const timeline = (await harnessSnapshot(page)).timeline
  const before = await requestCount(page)
  await chooseLevel(page, 'Passing tone', 'Off')
  await expectPresetShown(page, 'Custom, based on Neutral')
  await chooseLevel(page, 'Neighbor tone', 'Off')
  await chooseLevel(page, 'Accented passing tone', 'Very often')
  await chooseLevel(page, 'Appoggiatura', 'Often')
  await chooseLevel(page, 'Diatonic enclosure', 'Rarely')
  await chooseLevel(page, 'Chromatic approach', 'Very often')
  await chooseLevel(page, 'Chromatic enclosure', 'Often')
  await expect(figuresGroup(page).locator('[role="radio"][disabled]')).toHaveCount(0)
  await expect(figuresGroup(page).locator('.field-note')).toHaveCount(7)
  expect(await shownLevels(page)).toEqual({
    'Passing tone': 'Off',
    'Accented passing tone': 'Very often',
    'Neighbor tone': 'Off',
    Appoggiatura: 'Often',
    'Diatonic enclosure': 'Rarely',
    'Chromatic approach': 'Very often',
    'Chromatic enclosure': 'Often',
  })
  // The phrase on screen stays: no level change makes a player request (with pre-generation on,
  // each change rightly restarts the background queue, so only player requests are counted).
  expect(await playerOrSessionRecordsFrom(page, before)).toHaveLength(0)
  expect((await harnessSnapshot(page)).timeline).toBe(timeline)
  await expectPresetShown(page, 'Custom, based on Neutral')

  expect((await regenerate(page, 42)).figureLevels).toEqual({
    passingTone: 'off',
    accentedPassingTone: 'stronglyFavored',
    neighborTone: 'off',
    appoggiatura: 'favored',
    diatonicEnclosure: 'asToday',
    chromaticApproach: 'stronglyFavored',
    chromaticEnclosure: 'favored',
  })

  for (const figure of FIGURES) await chooseLevel(page, figure, 'Off')
  expect((await regenerate(page, 43)).figureLevels).toEqual({
    passingTone: 'off',
    accentedPassingTone: 'off',
    neighborTone: 'off',
    appoggiatura: 'off',
    diatonicEnclosure: 'off',
    chromaticApproach: 'off',
    chromaticEnclosure: 'off',
  })
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/)
})

// @test-link [[rule_pregeneration_discarded_on_change]]
// @test-link [[rule_custom_selection]]
// @test-link [[module_figure_level_options]]
test('a level change with a preset selected makes Custom, discards every pre-generated phrase and keeps the phrase on screen', async ({
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

  await chooseLevel(page, 'Chromatic enclosure', 'Very often')

  await expectPresetShown(page, 'Custom, based on Neutral')
  expect((await harnessSnapshot(page)).selection).toEqual({ kind: 'custom', baseId: 'neutral' })
  // The queue starts again from phrase 2, with the new level: every ready phrase was discarded.
  const restarted = await untilBackgroundHeld(page, from)
  expect(await phraseOfSeed(page, SESSION_SEED, restarted.seed)).toBe(2)
  expect(restarted.figureLevels).toEqual({
    ...NEUTRAL_LEVELS,
    chromaticEnclosure: 'stronglyFavored',
  })
  // The phrase on screen stays: no player request was made and the timeline is the same.
  expect(await playerOrSessionRecordsFrom(page, from)).toHaveLength(0)
  expect((await harnessSnapshot(page)).timeline).toBe(timeline)
})

// @test-link [[rule_readonly_controls_keep_contrast]]
// @test-link [[rule_vary_settings_figure_step]]
// @test-link [[module_figure_level_options]]
test('during a session the group is read-only and a figure step shows as that level changing in place at its phrase', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page, DESKTOP)
  await queueSessionSeeds(page, [await settingsMutationSeed(page, FIGURE_STEP_ON_PHRASE_3)])
  await readyToStart(page)
  await radio(page, 'Vary settings', 'On').click()

  await startSession(page)
  for (const figure of FIGURES) {
    await expect(levelControl(page, figure)).toHaveAttribute('aria-readonly', 'true')
  }
  await expect(figuresGroup(page).locator('.field-group.is-readonly')).toHaveCount(7)
  await expectNoAxeViolations(page, 'read-only during a session')
  // A click reaching a read-only segment changes nothing (the read-only group takes no pointer).
  await levelControl(page, 'Appoggiatura')
    .getByRole('radio', { name: 'Very often' })
    .dispatchEvent('click')
  expect((await shownLevels(page)).Appoggiatura).toBe('Off')

  const phraseThree = (await sessionTimeline(page)).countInEndsAt + 4 * 2 * 4 * BEAT
  await clockTo(page, phraseThree - 0.1)
  expect(await shownLevels(page)).toEqual(NEUTRAL_SHOWN)
  const before = await fieldBoxes(page)

  await clockTo(page, phraseThree + 0.1)
  await expect(
    levelControl(page, 'Accented passing tone').getByRole('radio', { name: 'Often', exact: true }),
  ).toHaveAttribute('aria-checked', 'true')
  expect(await shownLevels(page)).toEqual({ ...NEUTRAL_SHOWN, 'Accented passing tone': 'Often' })
  expect(await fieldBoxes(page)).toEqual(before)
  await expectPresetShown(page, 'Custom, based on Neutral')

  // At the session's end the player's own levels show again, editable.
  await page.evaluate(() => window.__workspaceHarness.page.setHidden(true))
  expect((await sessionState(page)).lastEnd?.cause).toBe('hidden-tab')
  expect(await shownLevels(page)).toEqual(NEUTRAL_SHOWN)
  for (const figure of FIGURES) {
    await expect(levelControl(page, figure)).not.toHaveAttribute('aria-readonly')
  }
})

// @test-link [[req_embellishment_figure_levels]]
test('a landscape phone stacks the seven fields and a desktop window lays them out in columns, no segment cut', async ({
  page,
}) => {
  await page.setViewportSize(PHONE)
  await gotoWorkspaceHarness(page)
  const phone = await fieldBoxes(page)
  expect(phone).toHaveLength(7)
  for (let index = 1; index < phone.length; index += 1) {
    expect(phone[index]!.x, `phone field ${index} x`).toBe(phone[0]!.x)
    expect(phone[index]!.y, `phone field ${index} y`).toBeGreaterThanOrEqual(
      phone[index - 1]!.bottom,
    )
  }
  expect(phone.every((field) => field.segmentsInside)).toBe(true)

  await page.setViewportSize(DESKTOP)
  await expect
    .poll(async () => new Set((await fieldBoxes(page)).map((field) => field.x)).size)
    .toBeGreaterThan(1)
  const desktop = await fieldBoxes(page)
  // Side by side: the first row holds more than one field.
  expect(desktop.filter((field) => field.y === desktop[0]!.y).length).toBeGreaterThan(1)
  expect(desktop.every((field) => field.segmentsInside)).toBe(true)
  // "During a session" follows the group.
  const order = await page.evaluate(() =>
    [...document.querySelectorAll('.control-group-row > .control-group')].map(
      (group) => group.querySelector('h3')?.textContent,
    ),
  )
  expect(order.slice(-3)).toEqual(['Character', 'Embellishments', 'During a session'])
})

for (const theme of ['Light', 'Dark'] as const) {
  // @test-link [[req_embellishment_figure_levels]]
  test(`has no detectable axe violations in the Embellishments group at Idle, ${theme} theme`, async ({
    page,
  }) => {
    await gotoWorkspaceHarness(page)
    await radio(page, 'Presentation theme', theme).click()
    await chooseLevel(page, 'Chromatic approach', 'Very often')
    await expectNoAxeViolations(page, `${theme} theme`)
  })
}
