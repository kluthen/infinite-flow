/**
 * Step 10 release journey (5/8): every display-notation mode engraves the same phrase without
 * changing it, and a failed notation attempt keeps the previously selected mode rather than
 * silently adopting the one that failed. Runs against the workspace harness (port 4175) for its
 * deterministic seed and the forced-notation-failure seam.
 */
import { expect, test } from '@playwright/test'

import { generateAndAwaitReady, radio } from '../workspace/helpers'
import {
  failNextNotation,
  gotoWorkspaceHarness,
  harnessSnapshot,
  queueSeeds,
} from './harness-helpers'

const NOTATION_MODES = [
  { label: 'Concert', mode: 'Concert' },
  { label: 'B-flat', mode: 'B-flat tenor' },
  { label: 'E-flat', mode: 'E-flat alto' },
] as const

// @test-link [[rule_notation_display_preserves_phrase]]
test('B-flat notation is selected on first load', async ({ page }) => {
  await gotoWorkspaceHarness(page)
  await expect(
    page.getByRole('radiogroup', { name: 'Display notation' }).getByRole('radio', {
      name: 'B-flat',
    }),
  ).toHaveAttribute('aria-checked', 'true')
})

for (const { label, mode } of NOTATION_MODES) {
  // @test-link [[rule_notation_display_preserves_phrase]]
  test(`switching to ${label} notation engraves the phrase without changing the seed, request identity, or timeline`, async ({
    page,
  }) => {
    await gotoWorkspaceHarness(page)
    await queueSeeds(page, [321])
    await generateAndAwaitReady(page)
    const before = await harnessSnapshot(page)

    await radio(page, 'Display notation', label).click()
    await expect.poll(async () => (await harnessSnapshot(page)).operation).toBe('idle')

    const after = await harnessSnapshot(page)
    expect(after.notationMode).toBe(mode)
    expect(after.requestId).toBe(before.requestId)
    expect(after.seed).toBe(before.seed)
    expect(after.timeline).toBe(before.timeline)
    await expect(page.locator('svg')).toBeVisible()
  })
}

// @test-link [[module_notation_layout_preflight]]
test('a failed notation attempt keeps the previously selected display mode', async ({ page }) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [321])
  await generateAndAwaitReady(page)
  const before = await harnessSnapshot(page)
  expect(before.notationMode).toBe('B-flat tenor')

  await failNextNotation(page)
  await radio(page, 'Display notation', 'E-flat').click()
  await expect.poll(async () => (await harnessSnapshot(page)).operation).toBe('idle')

  const after = await harnessSnapshot(page)
  expect(after.notationMode).toBe('B-flat tenor')
  await expect(
    page.getByRole('radiogroup', { name: 'Display notation' }).getByRole('radio', {
      name: 'B-flat',
    }),
  ).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('.inline-alert.alert-error')).toContainText('Notation error')
})
