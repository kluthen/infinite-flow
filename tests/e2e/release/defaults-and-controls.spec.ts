/**
 * Step 10 release journey (1/8): the empty workspace's default state, and every discrete control
 * group's keyboard and pointer selection behavior, including the two selectable presets and the
 * custom-configuration transition a manual profile-controlled edit produces. Runs against the
 * production preview build (port 4173): nothing here needs the workspace harness's deterministic
 * seams, since no assertion depends on a particular generated phrase.
 */
import { type Locator, type Page, expect, test } from '@playwright/test'

import { gotoWorkspace, radio } from '../workspace/helpers'

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

// @test-link [[module_generative_profile_selection]]
test('the Neutral preset sets its seven controlled values', async ({ page }) => {
  await gotoWorkspace(page)

  await radio(page, 'Musical profile preset', 'Jazz').click()
  await radio(page, 'Rhythmic variety', 'Heavily varied').click()
  await radio(page, 'Musical profile preset', 'Neutral').click()

  await expect(radio(page, 'Harmonic motion', 'Static')).toHaveAttribute('aria-checked', 'true')
  await expect(radio(page, 'Note density', 'Quarter notes')).toHaveAttribute('aria-checked', 'true')
  await expect(radio(page, 'Rhythmic variety', 'Slightly varied')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(radio(page, 'Syncopation', 'Straight')).toHaveAttribute('aria-checked', 'true')
  await expect(radio(page, 'Silence density', 'Sparse')).toHaveAttribute('aria-checked', 'true')
  await expect(radio(page, 'Contour', 'Arch')).toHaveAttribute('aria-checked', 'true')
  await expect(radio(page, 'Register', 'Middle')).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('.control-summary')).toHaveText('C Ionian · Neutral · Lift · Shaped')
})

// @test-link [[module_generative_profile_selection]]
test('the Jazz preset sets its seven controlled values', async ({ page }) => {
  await gotoWorkspace(page)

  await radio(page, 'Rhythmic variety', 'Strict').click()
  await radio(page, 'Musical profile preset', 'Jazz').click()

  await expect(radio(page, 'Harmonic motion', 'Gentle diatonic')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(radio(page, 'Note density', 'Eighth notes')).toHaveAttribute('aria-checked', 'true')
  await expect(radio(page, 'Rhythmic variety', 'Slightly varied')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(radio(page, 'Syncopation', 'Occasional offbeats')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(radio(page, 'Silence density', 'Conversational space')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(radio(page, 'Contour', 'Wandering')).toHaveAttribute('aria-checked', 'true')
  await expect(radio(page, 'Register', 'Varying')).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('.control-summary')).toHaveText('C Ionian · Jazz · Lift · Shaped')
})

// @test-link [[module_profile_control_customization]]
// @test-link [[rule_profile_control_customization]]
test('manually editing a preset-controlled value clears the preset selection to custom', async ({
  page,
}) => {
  await gotoWorkspace(page)

  await radio(page, 'Contour', 'Falling').click()

  const presetGroup = page.getByRole('radiogroup', { name: 'Musical profile preset' })
  await expect(presetGroup.getByRole('radio', { checked: true })).toHaveCount(0)
  await expect(page.locator('.preset-status')).toHaveText(
    'Custom configuration - Neutral grammar retained. Choosing Neutral or Jazz replaces all seven preset-controlled values.',
  )
  await expect(page.locator('.control-summary')).toHaveText(
    'C Ionian · Custom (Neutral grammar) · Lift · Shaped',
  )
})
