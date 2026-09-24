/**
 * The portrait guard below `bp-desktop` (90rem): the rotate-device notice replaces the interactive
 * workspace in portrait, and the workspace returns the moment the viewport is landscape again.
 */
import { expect, test } from '@playwright/test'

import { gotoWorkspace } from './helpers'

// @test-link [[req_landscape_phrase_workspace]]
test('portrait viewport narrower than bp-desktop shows the rotate notice, not the workspace', async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 800 })
  await gotoWorkspace(page)

  await expect(page.getByText('Infinite Flow is designed for landscape reading.')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Infinite Flow' })).toBeHidden()
})

// @test-link [[req_landscape_phrase_workspace]]
test('landscape viewport hides the rotate notice and shows the workspace', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 400 })
  await gotoWorkspace(page)

  await expect(page.getByText('Infinite Flow is designed for landscape reading.')).toBeHidden()
  await expect(page.getByRole('heading', { level: 1, name: 'Infinite Flow' })).toBeVisible()
})
