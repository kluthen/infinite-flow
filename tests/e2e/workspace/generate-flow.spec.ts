/**
 * The core generate/regenerate flow: the generation-status announcement sequence, the engraved
 * score appearing, the primary action relabeling to Regenerate, a regenerated score differing from
 * its predecessor, and every configuration control staying read-only-but-focusable while a request
 * is in flight.
 */
import { expect, test } from '@playwright/test'

import { generateAndAwaitReady, gotoWorkspace, primaryButton, radio } from './helpers'

// @test-link [[user_story_controlled_phrase_generation]]
test('generates a phrase: status announces, the score engraves, and the action becomes Regenerate', async ({
  page,
}) => {
  await gotoWorkspace(page)

  await generateAndAwaitReady(page)

  await expect(page.locator('svg.staff-svg')).toBeVisible()
  await expect(primaryButton(page)).toHaveText('Regenerate phrase')
})

// @test-link [[user_story_controlled_phrase_generation]]
test('regenerating replaces the score with a different phrase', async ({ page }) => {
  await gotoWorkspace(page)
  await generateAndAwaitReady(page)

  const firstScore = await page.locator('svg.staff-svg').innerHTML()

  await generateAndAwaitReady(page)

  const secondScore = await page.locator('svg.staff-svg').innerHTML()
  expect(secondScore).not.toBe(firstScore)
})

// @test-link [[user_story_controlled_phrase_generation]]
// @test-link [[rule_readonly_controls_keep_contrast]]
test('controls stay read-only but focusable during generation: arrows move focus, not selection', async ({
  page,
}) => {
  await gotoWorkspace(page)
  // Mixed note density widens the in-flight window without approaching the documented worst case.
  await radio(page, 'Note density', 'Mixed').click()

  await primaryButton(page).click()

  const contourGroup = page.getByRole('radiogroup', { name: 'Contour' })
  await expect(contourGroup).toHaveAttribute('aria-readonly', 'true')

  // D28: read-only controls keep full color (never dimmed) and signal "locked" only via the
  // dashed read-only ring on the wrapping `field-group`, not via opacity.
  const contourFieldGroup = page.locator('.field-group.is-readonly', { has: contourGroup })
  await expect(contourFieldGroup).toHaveCSS('opacity', '1')
  await expect(contourFieldGroup).toHaveCSS('outline-style', 'dashed')
  await expect(contourGroup).toHaveCSS('opacity', '1')

  const checked = contourGroup.getByRole('radio', { checked: true })
  const checkedLabel = await checked.textContent()
  await checked.focus()
  await page.keyboard.press('ArrowRight')

  const focused = page.locator(':focus')
  await expect(focused).not.toHaveText(checkedLabel ?? '')
  await expect(focused).toHaveAttribute('aria-checked', 'false')
  await expect(contourGroup.getByRole('radio', { name: checkedLabel ?? '' })).toHaveAttribute(
    'aria-checked',
    'true',
  )

  await expect(page.locator('.generation-status')).toHaveText('Phrase ready', { timeout: 30_000 })
})
