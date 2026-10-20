/**
 * The unsupported-rhythm-setting block: Generate/Regenerate disables, the prior score stays
 * visible, the calm message appears next to the rhythm controls and in a polite live region, the
 * controls stay selectable, a supported syncopation re-enables Generate, and each of the eight
 * built-in presets, chosen in the preset box from a blocked combination, lands on a supported
 * setting.
 */
import { expect, test } from '@playwright/test'

import { choosePreset, generateAndAwaitReady, gotoWorkspace, primaryButton, radio } from './helpers'

// @test-link [[rule_unsupported_rhythm_settings_block_generation]]
test('an unsupported rhythm combination blocks Generate, keeps the score, and explains why', async ({
  page,
}) => {
  await gotoWorkspace(page)
  await generateAndAwaitReady(page)
  const scoreBefore = await page.locator('svg.staff-svg').innerHTML()

  await radio(page, 'Note density', 'Sixteenth').click()
  await radio(page, 'Silence density', 'Breath-heavy').click()
  await radio(page, 'Syncopation', 'Active displacement').click()

  await expect(primaryButton(page)).toBeDisabled()
  expect(await page.locator('svg.staff-svg').innerHTML()).toBe(scoreBefore)

  const message = page.getByRole('status').filter({ hasText: "can't form a four-bar phrase" })
  await expect(message).toBeVisible()
  await expect(message).toContainText('Suggested change')

  // The controls remain selectable even while generation is blocked.
  await radio(page, 'Note density', 'Eighth notes').click()
  await expect(radio(page, 'Note density', 'Eighth notes')).toHaveAttribute('aria-checked', 'true')

  // Restore the unsupported combination, then relax syncopation to a supported value. Note
  // Sixteenth + Breath-heavy is unsupported with either "Occasional offbeats" or "Active
  // displacement" syncopation, so only "Straight" recovers it here.
  await radio(page, 'Note density', 'Sixteenth').click()
  await radio(page, 'Syncopation', 'Straight').click()

  await expect(primaryButton(page)).toBeEnabled()
  await expect(message).toBeHidden()
})

// @test-link [[rule_profile_presets_apply_defined_controls]]
test('choosing any of the eight built-in presets never lands on an unsupported rhythm setting', async ({
  page,
}) => {
  await gotoWorkspace(page)

  for (const preset of [
    'Neutral',
    'Gentle',
    'Speed drill',
    'Jazz',
    'Bebop',
    'Pop song',
    'Reel',
    'Modal (Dorian)',
  ] as const) {
    // From a blocked combination, so the preset itself has to land on a supported one.
    await radio(page, 'Rhythmic variety', 'Slightly varied').click()
    await radio(page, 'Note density', 'Sixteenth').click()
    await radio(page, 'Silence density', 'Breath-heavy').click()
    await radio(page, 'Syncopation', 'Active displacement').click()
    await expect(primaryButton(page)).toBeDisabled()
    await choosePreset(page, preset)
    await expect(primaryButton(page), preset).toBeEnabled()
  }
})
