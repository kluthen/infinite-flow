/**
 * Step 10 release journey (1/8): the empty workspace's default state, and every discrete control
 * group's keyboard and pointer selection behavior, including the two selectable presets and the
 * Custom selection a manual edit of a preset-held control produces, its summary naming the base.
 * Runs against the production preview build (port 4173), except the preset tests, which read the
 * seven figure levels and the selection from the workspace harness's snapshot (port 4175); no
 * assertion depends on a particular generated phrase.
 */
import { type Locator, type Page, expect, test } from '@playwright/test'

import { gotoWorkspace, radio } from '../workspace/helpers'
import { gotoWorkspaceHarness, harnessSnapshot } from './harness-helpers'

/** Intent: every accessible radiogroup label this workspace renders, in on-page order. */
const RADIOGROUP_LABELS = [
  'Written key',
  'Collection',
  'Instrument profile',
  'Musical profile preset',
  'Harmonic motion',
  'Tension',
  'Note density',
  'Rhythmic variety',
  'Syncopation',
  'Silence density',
  'Contour',
  'Register',
  'Leapiness',
  'Arpeggio chaos',
  'Presentation theme',
] as const

/**
 * Intent: fully exercise one radiogroup's roving-tabindex contract -- pointer selection of every
 * option, then keyboard Arrow/Home/End navigation over every option -- asserting exactly one radio
 * is ever `aria-checked` and carries the roving `tabindex="0"` at a time.
 */
async function assertRovingRadiogroup(page: Page, groupLabel: string): Promise<void> {
  const group = page.getByRole('radiogroup', { name: groupLabel, exact: true })
  const radios = group.getByRole('radio')
  const count = await radios.count()
  expect(count, `${groupLabel} must have at least one option`).toBeGreaterThan(0)

  for (let index = 0; index < count; index++) {
    const option = radios.nth(index)
    await option.click()
    await expect(option, `${groupLabel} option ${index} after pointer click`).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect(option).toHaveAttribute('tabindex', '0')
    await expectExactlyOneChecked(radios, count, index)
  }

  await radios.first().focus()
  for (let index = 1; index < count; index++) {
    await page.keyboard.press('ArrowRight')
    await expect(radios.nth(index), `${groupLabel} ArrowRight to ${index}`).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect(radios.nth(index)).toHaveAttribute('tabindex', '0')
  }
  // One more ArrowRight from the last option wraps back to the first.
  await page.keyboard.press('ArrowRight')
  await expect(radios.first()).toHaveAttribute('aria-checked', 'true')

  await page.keyboard.press('End')
  await expect(radios.last(), `${groupLabel} End`).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Home')
  await expect(radios.first(), `${groupLabel} Home`).toHaveAttribute('aria-checked', 'true')
}

/** Intent: assert exactly one radio in the group is checked, and it is the expected index. */
async function expectExactlyOneChecked(
  radios: Locator,
  count: number,
  expectedIndex: number,
): Promise<void> {
  for (let other = 0; other < count; other++) {
    if (other === expectedIndex) continue
    await expect(radios.nth(other)).toHaveAttribute('aria-checked', 'false')
  }
}

// @test-link [[user_story_controlled_phrase_generation]]
test('the empty workspace shows the spec-default control summary and empty-state copy', async ({
  page,
}) => {
  await gotoWorkspace(page)

  await expect(page.locator('.control-summary')).toHaveText('C Ionian · Neutral · Lift · Shaped')
  await expect(page.getByText('Generate a phrase to begin.')).toBeVisible()
  await expect(radio(page, 'Written key', 'C')).toHaveAttribute('aria-checked', 'true')
  await expect(radio(page, 'Collection', 'Ionian')).toHaveAttribute('aria-checked', 'true')
  await expect(radio(page, 'Musical profile preset', 'Neutral')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(radio(page, 'Instrument profile', 'B-flat tenor saxophone')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(radio(page, 'Harmonic motion', 'Gentle diatonic')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(radio(page, 'Arpeggio chaos', 'Varied')).toHaveAttribute('aria-checked', 'true')
})

for (const groupLabel of RADIOGROUP_LABELS) {
  // @test-link [[user_story_controlled_phrase_generation]]
  test(`"${groupLabel}" supports keyboard and pointer selection of every option with a roving tab stop`, async ({
    page,
  }) => {
    await gotoWorkspace(page)
    await assertRovingRadiogroup(page, groupLabel)
  })
}

// @test-link [[module_generation_control_catalog]]
// @test-link [[module_rhythm_variety_grammar]]
test('Rhythmic variety follows Note density with exactly Strict, Slightly varied (default) and Heavily varied, and Note density has no Mixed option', async ({
  page,
}) => {
  await gotoWorkspace(page)

  const groupOrder = await page
    .getByRole('radiogroup')
    .evaluateAll((groups) => groups.map((group) => group.getAttribute('aria-label')))
  const densityIndex = groupOrder.indexOf('Note density')
  const varietyIndex = groupOrder.indexOf('Rhythmic variety')
  expect(densityIndex).toBeGreaterThanOrEqual(0)
  expect(varietyIndex).toBe(densityIndex + 1)

  const noteDensityGroup = page.getByRole('radiogroup', { name: 'Note density', exact: true })
  await expect(noteDensityGroup.getByRole('radio')).toHaveText([
    'Quarter notes',
    'Eighth notes',
    'Sixteenth',
  ])

  const varietyGroup = page.getByRole('radiogroup', { name: 'Rhythmic variety', exact: true })
  const varietyRadios = varietyGroup.getByRole('radio')
  await expect(varietyRadios).toHaveText(['Strict', 'Slightly varied', 'Heavily varied'])
  await expect(radio(page, 'Rhythmic variety', 'Slightly varied')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(radio(page, 'Rhythmic variety', 'Strict')).toHaveAttribute('aria-checked', 'false')
  await expect(radio(page, 'Rhythmic variety', 'Heavily varied')).toHaveAttribute(
    'aria-checked',
    'false',
  )
})

/** Neutral's seven figure levels, as the harness snapshot reads them. */
const NEUTRAL_LEVELS = {
  passingTone: 'asToday',
  accentedPassingTone: 'asToday',
  neighborTone: 'asToday',
  appoggiatura: 'off',
  diatonicEnclosure: 'off',
  chromaticApproach: 'off',
  chromaticEnclosure: 'off',
} as const

/** Jazz's seven figure levels: Neutral's, with the chromatic approach and enclosure as today. */
const JAZZ_LEVELS = {
  ...NEUTRAL_LEVELS,
  chromaticApproach: 'asToday',
  chromaticEnclosure: 'asToday',
} as const

/** Intent: every radiogroup of `controls` shows its option checked. */
async function expectControls(
  page: Page,
  controls: Readonly<Record<string, string>>,
): Promise<void> {
  for (const [group, option] of Object.entries(controls)) {
    await expect(radio(page, group, option), `${group}: ${option}`).toHaveAttribute(
      'aria-checked',
      'true',
    )
  }
}

// @test-link [[module_generative_profile_selection]]
// @test-link [[rule_choosing_preset_sets_its_settings]]
test('the Neutral preset sets its ten controls and its seven levels', async ({ page }) => {
  await gotoWorkspaceHarness(page)

  await radio(page, 'Musical profile preset', 'Jazz').click()
  await radio(page, 'Harmonic motion', 'Active diatonic').click()
  await radio(page, 'Tension', 'Build').click()
  await radio(page, 'Rhythmic variety', 'Heavily varied').click()
  await radio(page, 'Leapiness', 'Angular').click()
  await radio(page, 'Arpeggio chaos', 'Chaotic').click()
  await radio(page, 'Musical profile preset', 'Neutral').click()

  await expectControls(page, {
    'Harmonic motion': 'Gentle diatonic',
    Tension: 'Lift',
    'Note density': 'Quarter notes',
    'Rhythmic variety': 'Slightly varied',
    Syncopation: 'Straight',
    'Silence density': 'Sparse',
    Contour: 'Arch',
    Register: 'Middle',
    Leapiness: 'Shaped',
    'Arpeggio chaos': 'Varied',
  })
  const { selection, figureLevels } = await harnessSnapshot(page)
  expect(selection).toEqual({ kind: 'preset', presetId: 'neutral' })
  expect(figureLevels).toEqual(NEUTRAL_LEVELS)
  await expect(page.locator('.control-summary')).toHaveText('C Ionian · Neutral · Lift · Shaped')
})

// @test-link [[module_generative_profile_selection]]
// @test-link [[rule_choosing_preset_sets_its_settings]]
test('the Jazz preset sets its ten controls and its seven levels', async ({ page }) => {
  await gotoWorkspaceHarness(page)

  await radio(page, 'Harmonic motion', 'Active diatonic').click()
  await radio(page, 'Tension', 'Edge').click()
  await radio(page, 'Rhythmic variety', 'Strict').click()
  await radio(page, 'Leapiness', 'Smooth').click()
  await radio(page, 'Arpeggio chaos', 'Predictable').click()
  await radio(page, 'Musical profile preset', 'Jazz').click()

  await expectControls(page, {
    'Harmonic motion': 'Gentle diatonic',
    Tension: 'Lift',
    'Note density': 'Eighth notes',
    'Rhythmic variety': 'Slightly varied',
    Syncopation: 'Occasional offbeats',
    'Silence density': 'Conversational space',
    Contour: 'Wandering',
    Register: 'Varying',
    Leapiness: 'Shaped',
    'Arpeggio chaos': 'Varied',
  })
  const { selection, figureLevels } = await harnessSnapshot(page)
  expect(selection).toEqual({ kind: 'preset', presetId: 'jazz' })
  expect(figureLevels).toEqual(JAZZ_LEVELS)
  await expect(page.locator('.control-summary')).toHaveText('C Ionian · Jazz · Lift · Shaped')
})

// @test-link [[module_profile_control_customization]]
// @test-link [[rule_profile_control_customization]]
// @test-link [[rule_custom_selection]]
// @test-link [[rule_custom_names_its_base]]
test('manually editing a preset-held control makes Custom based on the preset, the summary naming its base', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)

  await radio(page, 'Contour', 'Falling').click()

  const presetGroup = page.getByRole('radiogroup', { name: 'Musical profile preset' })
  await expect(presetGroup.getByRole('radio', { checked: true })).toHaveCount(0)
  await expect(page.locator('.preset-status-text:not(.is-reserve)')).toHaveText(
    'Custom configuration - Neutral grammar retained. Choosing Neutral or Jazz replaces all seven preset-controlled values.',
  )
  await expect(page.locator('.control-summary')).toHaveText(
    'C Ionian · Custom, based on Neutral · Lift · Shaped',
  )
  expect((await harnessSnapshot(page)).selection).toEqual({ kind: 'custom', baseId: 'neutral' })

  // Tension, Leapiness and Arpeggio chaos are preset-held too: from Jazz each makes Custom.
  for (const [group, option] of [
    ['Tension', 'Build'],
    ['Leapiness', 'Smooth'],
    ['Arpeggio chaos', 'Chaotic'],
  ] as const) {
    await radio(page, 'Musical profile preset', 'Jazz').click()
    await expect(presetGroup.getByRole('radio', { checked: true })).toHaveText('Jazz')
    await radio(page, group, option).click()
    await expect(presetGroup.getByRole('radio', { checked: true })).toHaveCount(0)
    await expect(page.locator('.control-summary')).toContainText(' · Custom, based on Jazz · ')
    expect((await harnessSnapshot(page)).selection).toEqual({ kind: 'custom', baseId: 'jazz' })
  }
})
