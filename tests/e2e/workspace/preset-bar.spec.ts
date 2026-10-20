/**
 * v3.1 chunk 13, the preset bar, on the workspace harness (port 4175) and the production preview
 * (port 4173). The "Preset" box lists the eight built-ins under Practice and Styles, and the
 * player's own under Your presets, alphabetical ignoring case, duplicates kept. Choosing each
 * built-in through the box sets master spec B6.5's ten controls (the figure levels have no control
 * yet), keeps the key and moves the mode only when the preset's restriction must, leaves the tempo
 * and the instrument, and shows the preset's description. Editing a preset-held control turns the
 * box to "Custom, based on {name}" with "Changed from {name}." under it, until a preset is chosen
 * again. During Loading and a session the box is read-only: a keyboard change is refused and the
 * box, its description and every control keep their values; at Idle and in the review mode it is
 * editable. Choosing keeps focus on the box and announces nothing. At the landscape-phone and
 * desktop sizes the bar's label, box and description are all shown, uncut, the page never wider
 * than the window.
 */
import { expect, test, type Page } from '@playwright/test'

import {
  gotoWorkspaceHarness,
  harnessSnapshot,
  holdGeneration,
  observeLiveRegion,
  queueSeeds,
  readLiveRegionLog,
  releaseGeneration,
} from '../release/harness-helpers'
import {
  DESKTOP,
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
  toCountInMiddle,
  toRunning,
} from '../session/session-helpers'
import {
  gotoStorageHarness,
  reloadHarness,
  shownControls,
  type ShownControls,
} from '../storage/storage-helpers'
import {
  choosePreset,
  expectPresetShown,
  gotoWorkspace,
  presetBox,
  presetDescription,
  primaryButton,
  radio,
  statusRegion,
} from './helpers'

/** The ten preset-held controls as the controls show them: each radiogroup's checked label. */
type ShownPresetControls = Readonly<Record<string, string>>

/** The ten preset-held controls, in the order of master spec B6.5's rows. */
const PRESET_HELD =
  'Harmonic motion | Tension | Note density | Rhythmic variety | Syncopation | Silence density | Contour | Register | Leapiness | Arpeggio chaos'.split(
    ' | ',
  )

/**
 * Intent: the ten controls as shown, from one preset's column of B6.5 written in the controls'
 * own labels, `value | value | ...` in the rows' order.
 */
function controlsOf(column: string): ShownPresetControls {
  const values = column.split(' | ')
  if (values.length !== PRESET_HELD.length) throw new Error(`not ten values: ${column}`)
  return Object.fromEntries(PRESET_HELD.map((group, index) => [group, values[index] ?? '']))
}

/**
 * Intent: one built-in as master spec B6.5 gives it, chosen from D Aeolian: its name and fixed id,
 * the mode its restriction leaves (Aeolian itself under "any"), its column of controls and its
 * description line.
 */
function builtIn(name: string, id: string, mode: string, column: string, description: string) {
  return { name, id, mode, controls: controlsOf(column), description }
}

const NEUTRAL_DESCRIPTION = "Plain lines in the key, in quarter notes: the app's starting point."
const JAZZ_DESCRIPTION =
  'Eighth notes and offbeats, now and then with a short note from outside the key.'

/** The eight built-ins, in the box's order, with master spec B6.5's values written out. */
const BUILT_INS = [
  builtIn(
    'Neutral',
    'neutral',
    'Aeolian',
    'Gentle diatonic | Lift | Quarter notes | Slightly varied | Straight | Sparse | Arch | Middle | Shaped | Varied',
    NEUTRAL_DESCRIPTION,
  ),
  builtIn(
    'Gentle',
    'gentle',
    'Aeolian',
    'Static | Settled | Quarter notes | Strict | Straight | Conversational space | Arch | Middle | Smooth | Predictable',
    'One chord, quarter notes, steps only, nothing tense. A warm-up, or a first try at improvising.',
  ),
  builtIn(
    'Speed drill',
    'speed-drill',
    'Aeolian',
    'Active diatonic | Lift | Sixteenth | Heavily varied | Occasional offbeats | Sparse | Wandering | Varying | Leaping | Chaotic',
    'Dense, changing rhythms with most embellishments favored, to read fast in any key.',
  ),
  builtIn(
    'Jazz',
    'jazz',
    'Aeolian',
    'Gentle diatonic | Lift | Eighth notes | Slightly varied | Occasional offbeats | Conversational space | Wandering | Varying | Shaped | Varied',
    JAZZ_DESCRIPTION,
  ),
  builtIn(
    'Bebop',
    'bebop',
    'Major',
    'Active diatonic | Build | Eighth notes | Strict | Occasional offbeats | Sparse | Wandering | Varying | Leaping | Varied',
    'Fast jazz lines that circle chord notes from outside the key. It uses Major rather than Ionian: the same notes, with chords that lead home through the chord on the 5th note.',
  ),
  builtIn(
    'Pop song',
    'pop-song',
    'Major',
    'Gentle diatonic | Lift | Eighth notes | Heavily varied | Occasional offbeats | Conversational space | Arch | Middle | Shaped | Varied',
    'Song-like phrases over familiar chords. It uses Major rather than Ionian: the same notes, with chords that lead home the way songs do.',
  ),
  builtIn(
    'Reel',
    'reel',
    'Mixolydian',
    'Gentle diatonic | Settled | Eighth notes | Strict | Straight | Sparse | Arch | Middle | Shaped | Varied',
    'A fast folk dance in steady eighth notes, in Mixolydian or Dorian. Also try it in Ionian (a major key).',
  ),
  builtIn(
    'Modal (Dorian)',
    'modal-dorian',
    'Dorian',
    'Gentle diatonic | Lift | Eighth notes | Slightly varied | Occasional offbeats | Conversational space | Wandering | Varying | Leaping | Varied',
    'A steady two-chord bed in Dorian, so its color note is heard in the melody.',
  ),
]

/** Intent: the built-in case named `name`; a name no case has is a defect of the spec. */
function builtInNamed(name: string): (typeof BUILT_INS)[number] {
  const found = BUILT_INS.find((builtIn) => builtIn.name === name)
  if (found === undefined) throw new Error(`no built-in case is named ${name}`)
  return found
}

/** The box's two built-in groups on a fresh device, in order. */
const BUILT_IN_GROUPS = [
  { label: 'Practice', options: ['Neutral', 'Gentle', 'Speed drill'] },
  { label: 'Styles', options: ['Jazz', 'Bebop', 'Pop song', 'Reel', 'Modal (Dorian)'] },
] as const

/** Intent: the box's groups as listed: each `optgroup`'s label and its options' text. */
function listedGroups(page: Page) {
  return presetBox(page)
    .locator('optgroup')
    .evaluateAll((groups) =>
      groups.map((group) => ({
        label: group.getAttribute('label'),
        options: [...group.querySelectorAll('option')].map((option) =>
          (option.textContent ?? '').trim(),
        ),
      })),
    )
}

/** Intent: a player preset holding Neutral's values under `name`, for any key and mode. */
function playerPreset(id: string, name: string): WorkspaceHarnessPresetInput {
  return {
    id,
    name,
    controls: {
      harmonicMotion: 'Gentle diatonic',
      tension: 'Lift',
      noteDensity: 'Quarter',
      rhythmicVariety: 'Slightly varied',
      syncopation: 'Straight',
      silenceDensity: 'Sparse',
      contour: 'Arch',
      register: 'Middle',
      leapiness: 'Shaped',
      arpeggioChaos: 'Varied',
    },
    levels: {
      passingTone: 'asToday',
      accentedPassingTone: 'asToday',
      neighborTone: 'asToday',
      appoggiatura: 'off',
      diatonicEnclosure: 'off',
      chromaticApproach: 'off',
      chromaticEnclosure: 'off',
    },
    restriction: { keys: 'any', modes: 'any' },
    kind: 'player',
  }
}

/** Intent: seed player preset records for the next load, through the harness's preset codec. */
function seedPresets(page: Page, presets: readonly WorkspaceHarnessPresetInput[]): Promise<void> {
  return page.evaluate((seeded) => window.__workspaceHarness.storage.seedPresets(seeded), presets)
}

/** Intent: one radio is the checked option of its group. */
async function expectChecked(page: Page, group: string, option: string): Promise<void> {
  await expect(radio(page, group, option)).toHaveAttribute('aria-checked', 'true')
}

/** Intent: every control of `controls` shows its value checked. */
async function expectControls(page: Page, controls: ShownPresetControls): Promise<void> {
  for (const [group, option] of Object.entries(controls)) await expectChecked(page, group, option)
}

/** Intent: check, in each control of `controls`, an option other than the one given there. */
async function moveAwayFrom(page: Page, controls: ShownPresetControls): Promise<void> {
  for (const [group, option] of Object.entries(controls)) {
    const labels = await page
      .getByRole('radiogroup', { name: group, exact: true })
      .getByRole('radio')
      .allInnerTexts()
    const other = labels.map((label) => label.trim()).find((label) => label !== option)
    if (other === undefined) throw new Error(`${group} offers nothing but ${option}`)
    await radio(page, group, other).click()
    await expectChecked(page, group, other)
  }
}

/** Intent: every radiogroup of the page has exactly one checked segment. */
async function expectEveryGroupChecked(page: Page): Promise<void> {
  const groups = page.getByRole('radiogroup')
  const count = await groups.count()
  expect(count).toBeGreaterThan(10)
  for (let index = 0; index < count; index++) {
    const group = groups.nth(index)
    await expect(
      group.locator('[role="radio"][aria-checked="true"]'),
      `${await group.getAttribute('aria-label')} has one checked segment`,
    ).toHaveCount(1)
  }
}

/**
 * Intent: with the box read-only, focus it and press ArrowDown then ArrowUp: the box keeps showing
 * `name` with its description, and no control moves.
 */
async function expectKeyboardRefused(
  page: Page,
  name: string,
  description: string,
  controls: ShownControls,
): Promise<void> {
  const box = presetBox(page)
  await expect(box).toHaveAttribute('aria-readonly', 'true')
  await expect(box).toHaveClass(/is-readonly/)
  const value = await box.inputValue()
  await box.focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowUp')
  await expect(box).toBeFocused()
  await expect(box).toHaveValue(value)
  await expectPresetShown(page, name)
  await expect(presetDescription(page)).toHaveText(description)
  expect(await shownControls(page)).toEqual(controls)
}

declare global {
  interface Window {
    __liveChanges?: string[]
  }
}

/** A live region: a polite or assertive `aria-live`, or a `status`, `alert` or `log` role. */
const LIVE_REGION =
  '[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"]'

/**
 * Intent: record, from now, every text change of every live region of the page (a polite or
 * assertive `aria-live`, a `status`, `alert` or `log` role), each entry the region's class and
 * its new text.
 */
async function observeEveryLiveRegion(page: Page): Promise<void> {
  await page.evaluate((selector) => {
    const changes: string[] = []
    window.__liveChanges = changes
    for (const region of document.querySelectorAll(selector)) {
      new MutationObserver(() =>
        changes.push(`${region.className}: ${(region.textContent ?? '').trim()}`),
      ).observe(region, { childList: true, characterData: true, subtree: true })
    }
  }, LIVE_REGION)
}

// @test-link [[req_presets]]
// @test-link [[module_preset_bar_model]]
test('the box lists the eight built-ins under Practice and Styles, and the player presets under Your presets, alphabetical ignoring case, duplicates kept', async ({
  page,
}) => {
  await gotoStorageHarness(page)
  await expect(page.locator('.preset-bar label')).toHaveText('Preset')
  expect(await listedGroups(page)).toEqual(BUILT_IN_GROUPS)
  // Outside Custom no option stands outside the groups.
  await expect(presetBox(page).locator(':scope > option')).toHaveCount(0)
  await expectPresetShown(page, 'Neutral')
  await expect(presetDescription(page)).toHaveText(NEUTRAL_DESCRIPTION)

  await seedPresets(page, [
    playerPreset('player-1', 'zebra crossing'),
    playerPreset('player-2', 'Apple'),
    playerPreset('player-3', 'Mango'),
    playerPreset('player-4', 'apple'),
  ])
  await reloadHarness(page)
  expect(await listedGroups(page)).toEqual([
    ...BUILT_IN_GROUPS,
    { label: 'Your presets', options: ['Apple', 'apple', 'Mango', 'zebra crossing'] },
  ])

  await choosePreset(page, 'Mango')
  await expect(presetDescription(page)).toHaveText('Your preset.')
  expect((await harnessSnapshot(page)).selection).toMatchObject({ presetId: 'player-3' })
})

for (const preset of BUILT_INS) {
  // @test-link [[rule_built_in_preset_values]]
  // @test-link [[rule_choosing_preset_sets_its_settings]]
  // @test-link [[rule_choosing_preset_keeps_allowed_key_and_mode]]
  test(`choosing ${preset.name} in the box from D Aeolian sets its ten controls and D ${preset.mode}, keeps the tempo and the instrument, and shows its description`, async ({
    page,
  }) => {
    await gotoWorkspaceHarness(page)
    await radio(page, 'Written key', 'D').click()
    await radio(page, 'Collection', 'Aeolian').click()
    await page.getByRole('button', { name: 'Increase tempo' }).click()
    await radio(page, 'Instrument profile', 'E-flat alto saxophone').click()
    await moveAwayFrom(page, preset.controls)

    await choosePreset(page, preset.name)
    await expect(presetBox(page)).toHaveValue(preset.id)
    await expectControls(page, preset.controls)
    await expectChecked(page, 'Written key', 'D')
    await expectChecked(page, 'Collection', preset.mode)
    await expect(page.getByRole('spinbutton', { name: 'Tempo' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    )
    await expectChecked(page, 'Instrument profile', 'E-flat alto saxophone')
    await expect(presetDescription(page)).toHaveText(preset.description)
    await expect(page.locator('.control-summary')).toHaveText(
      `D ${preset.mode} · ${preset.name} · ${preset.controls.Tension} · ${preset.controls.Leapiness}`,
    )
    expect((await harnessSnapshot(page)).selection).toMatchObject({ presetId: preset.id })
  })
}

// @test-link [[rule_custom_selection]]
// @test-link [[rule_custom_names_its_base]]
test('editing a control Jazz holds turns the box to Custom, based on Jazz with its description, every control still checked, until Jazz is chosen again', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await choosePreset(page, 'Jazz')
  await expect(presetDescription(page)).toHaveText(JAZZ_DESCRIPTION)

  await radio(page, 'Contour', 'Falling').click()
  await expectPresetShown(page, 'Custom, based on Jazz')
  await expect(presetBox(page)).toHaveValue('')
  await expect(presetDescription(page)).toHaveText(
    'Changed from Jazz. Save as a new preset to keep these settings under a name.',
  )
  await expect(page.locator('.control-summary')).toHaveText(
    'C Ionian · Custom, based on Jazz · Lift · Shaped',
  )
  await expectEveryGroupChecked(page)
  // Custom is the box's value, never in its list.
  expect(await listedGroups(page)).toEqual(BUILT_IN_GROUPS)
  await expect(presetBox(page).locator('option:checked')).toHaveAttribute('hidden', '')
  await expect(presetBox(page).locator('option:checked')).toBeDisabled()
  expect((await harnessSnapshot(page)).selection).toEqual({ kind: 'custom', baseId: 'jazz' })

  await choosePreset(page, 'Jazz')
  await expect(presetBox(page)).toHaveValue('jazz')
  await expect(presetDescription(page)).toHaveText(JAZZ_DESCRIPTION)
  await expect(page.locator('.control-summary')).toHaveText('C Ionian · Jazz · Lift · Shaped')
  expect((await harnessSnapshot(page)).selection).toEqual({ kind: 'preset', presetId: 'jazz' })
})

// @test-link [[module_preset_bar_model]]
test('while a phrase is generated the box is read-only: a keyboard change is refused, the session refuses a choice too, and every control stays', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await choosePreset(page, 'Jazz')
  await expect(presetBox(page)).not.toHaveAttribute('aria-readonly')
  await queueSeeds(page, [1])
  await holdGeneration(page)
  await primaryButton(page).click()
  await expect(statusRegion(page)).toHaveText('Generating phrase')

  const controls = await shownControls(page)
  await expectKeyboardRefused(page, 'Jazz', JAZZ_DESCRIPTION, controls)
  // Past the box, the session itself refuses a choice while the phrase is generated.
  expect(await page.evaluate(() => window.__workspaceHarness.selectPreset('reel'))).toBe(false)
  expect((await harnessSnapshot(page)).selection).toEqual({ kind: 'preset', presetId: 'jazz' })
  expect(await shownControls(page)).toEqual(controls)

  await releaseGeneration(page)
  await expect(statusRegion(page)).toHaveText('Phrase ready', { timeout: 30_000 })
  await expect(presetBox(page)).not.toHaveAttribute('aria-readonly')
  await expect(presetBox(page)).not.toHaveClass(/is-readonly/)
})

// @test-link [[rule_session_settings_locked]]
// @test-link [[rule_automatic_change_updates_controls_quietly]]
test('during a session the box is read-only, a keyboard change refused, the box and its description keeping their text through the count-in, and it is editable again in the review mode', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page, DESKTOP)
  await choosePreset(page, 'Jazz')
  await readyToStart(page)

  await startSession(page)
  const controls = await shownControls(page)
  await expectKeyboardRefused(page, 'Jazz', JAZZ_DESCRIPTION, controls)
  await toCountInMiddle(page)
  await expectKeyboardRefused(page, 'Jazz', JAZZ_DESCRIPTION, controls)
  await toRunning(page)
  await expectKeyboardRefused(page, 'Jazz', JAZZ_DESCRIPTION, controls)
  expect((await sessionState(page)).shownSettings?.selection).toMatchObject({ presetId: 'jazz' })

  await sessionAction(page).click()
  await expect.poll(async () => (await sessionState(page)).review?.showing).toBe(true)
  await expect(presetBox(page)).not.toHaveAttribute('aria-readonly')
  await choosePreset(page, 'Bebop')
  await expect(presetDescription(page)).toHaveText(builtInNamed('Bebop').description)
  expect((await harnessSnapshot(page)).selection).toEqual({ kind: 'preset', presetId: 'bebop' })
})

// @test-link [[module_preset_bar_model]]
// @test-link [[req_presets]]
test('choosing with the keyboard or the pointer keeps focus on the box and announces nothing', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await observeLiveRegion(page, '.generation-status')
  await observeLiveRegion(page, '.notation-status')
  await observeEveryLiveRegion(page)

  await presetBox(page).focus()
  await page.keyboard.press('ArrowDown')
  await expectPresetShown(page, 'Gentle')
  await expect(presetBox(page)).toBeFocused()
  expect((await harnessSnapshot(page)).selection).toEqual({ kind: 'preset', presetId: 'gentle' })

  await choosePreset(page, 'Reel')
  await expect(presetBox(page)).toBeFocused()
  await expectChecked(page, 'Collection', 'Mixolydian')

  // Nothing in the bar is a live region, and no live region of the page changed.
  await expect(page.locator('.preset-bar').locator(LIVE_REGION)).toHaveCount(0)
  expect(await readLiveRegionLog(page, '.generation-status')).toEqual([])
  expect(await readLiveRegionLog(page, '.notation-status')).toEqual([])
  expect(await page.evaluate(() => window.__liveChanges)).toEqual([])
})

/** The landscape phone and desktop sizes the bar is checked at. */
const BAR_VIEWPORTS = [
  { name: 'landscape phone', width: 800, height: 400 },
  { name: 'desktop', width: 1600, height: 900 },
] as const

for (const viewport of BAR_VIEWPORTS) {
  // @test-link [[req_landscape_phrase_workspace]]
  test(`${viewport.name} (${viewport.width}x${viewport.height}): the bar stacks its label, box and description, all shown and uncut, the box keeping its size in Custom, with no page overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await gotoWorkspace(page)
    const bar = page.locator('.preset-bar')
    const label = bar.locator('label')
    await presetBox(page).scrollIntoViewIfNeeded()
    for (const shown of [label, presetBox(page), presetDescription(page)])
      await expect(shown).toBeVisible()

    /** Intent: the bar's geometry: its parts' boxes, whether any is cut, and the page's width. */
    const measure = () =>
      bar.evaluate((element) => {
        /** Intent: a node's box edges in the viewport. */
        const rect = (node: Element) => {
          const box = node.getBoundingClientRect()
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom }
        }
        /** Intent: the bar's part under `selector`; one missing is a defect of the page. */
        const part = (selector: string) => {
          const node = element.querySelector(selector)
          if (node === null) throw new Error(`no ${selector} in the preset bar`)
          return node
        }
        const note = part('.field-note')
        return {
          bar: rect(element),
          children: [...element.children].map(rect),
          label: rect(part('label')),
          box: rect(part('select')),
          note: rect(note),
          noteCut: note.scrollWidth > note.clientWidth || note.scrollHeight > note.clientHeight,
          pageWidth: document.documentElement.scrollWidth,
          windowWidth: document.documentElement.clientWidth,
        }
      })

    const before = await measure()
    expect(before.pageWidth, 'the page is no wider than the window').toBeLessThanOrEqual(
      before.windowWidth + 1,
    )
    expect(before.noteCut, 'the description is not cut').toBe(false)
    for (const part of [before.label, before.box, before.note]) {
      expect(part.left).toBeGreaterThanOrEqual(before.bar.left - 1)
      expect(part.right).toBeLessThanOrEqual(before.bar.right + 1)
      expect(part.right).toBeLessThanOrEqual(before.windowWidth + 1)
    }
    // The field stacks: its label above the box, the description under it.
    expect(before.label.bottom).toBeLessThanOrEqual(before.box.top + 1)
    expect(before.box.bottom).toBeLessThanOrEqual(before.note.top + 1)
    // Below the tablet-landscape width the bar's rows stack too, nothing beside the field.
    if (viewport.width < 1024) {
      before.children.slice(1).forEach((child, index) => {
        expect(child.top).toBeGreaterThanOrEqual((before.children[index]?.bottom ?? 0) - 1)
      })
    }

    // The longest built-in text the box can show: Custom, based on Modal (Dorian).
    await choosePreset(page, 'Modal (Dorian)')
    await radio(page, 'Contour', 'Falling').click()
    await expectPresetShown(page, 'Custom, based on Modal (Dorian)')
    const custom = await measure()
    expect(custom.box.right - custom.box.left).toBeCloseTo(before.box.right - before.box.left, 0)
    expect(custom.box.right).toBeLessThanOrEqual(custom.bar.right + 1)
    expect(custom.noteCut, 'the Custom description is not cut').toBe(false)
    expect(custom.pageWidth).toBeLessThanOrEqual(custom.windowWidth + 1)
  })
}
