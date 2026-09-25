/**
 * Step 10 release journey (6/8): presentation-theme isolation beyond what
 * tests/e2e/workspace/theme.spec.ts already covers against the production build (data-theme
 * value, no redraw/regenerate, no persistence across reload). This file adds the workspace
 * harness's (port 4175) deterministic angle: a theme change never touches the session snapshot
 * (seed/requestId/timeline), and the theme control keeps working while an operation is in flight
 * -- unlike every generation control, which the header marks read-only for that same span.
 */
import { expect, test } from '@playwright/test'

import { generateAndAwaitReady, radio } from '../workspace/helpers'
import {
  gotoWorkspaceHarness,
  harnessSnapshot,
  holdGeneration,
  queueSeeds,
  releaseGeneration,
} from './harness-helpers'

// @test-link [[rule_presentation_preference_preserves_phrase]]
test('a theme change never alters the session snapshot', async ({ page }) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [55])
  await generateAndAwaitReady(page)
  const before = await harnessSnapshot(page)

  await radio(page, 'Presentation theme', 'Dark').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  const after = await harnessSnapshot(page)
  expect(after).toEqual(before)
})

// @test-link [[rule_presentation_preference_preserves_phrase]]
test('the theme control keeps working while a generation is gated in flight', async ({ page }) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [55])
  await holdGeneration(page)

  await page.getByRole('button', { name: 'Generate phrase' }).click()
  await expect.poll(async () => (await harnessSnapshot(page)).operation).toBe('generating')

  await radio(page, 'Presentation theme', 'Dark').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect((await harnessSnapshot(page)).operation).toBe('generating')

  await releaseGeneration(page)
  await expect(page.locator('.generation-status')).toHaveText('Phrase ready', { timeout: 30_000 })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
