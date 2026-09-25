import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { generateAndAwaitReady, gotoWorkspace, primaryButton, radio } from './workspace/helpers'
import {
  failNextGeneration,
  failNextNotation,
  gotoWorkspaceHarness,
  harnessSnapshot,
  holdGeneration,
  queueSeeds,
  releaseGeneration,
} from './release/harness-helpers'

/** Intent: format axe violations into a readable failure message rather than a raw object dump. */
function describeViolations(violations: readonly { id: string; help: string }[]): string {
  return violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n')
}

test('has no detectable axe violations in the empty shell', async ({ page }) => {
  await page.goto('/')

  const results = await new AxeBuilder({ page }).analyze()

  expect(results.violations, describeViolations(results.violations)).toEqual([])
})

test('has no detectable axe violations after generation, in Light and Dark theme', async ({
  page,
}) => {
  await gotoWorkspace(page)
  await generateAndAwaitReady(page)

  for (const theme of ['Light', 'Dark'] as const) {
    await radio(page, 'Presentation theme', theme).click()
    // Theme colours transition (e.g. `.btn-primary` over `--duration-feedback`); scanning
    // mid-transition would catch a transient blended colour, not the settled theme palette.
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => !(animation instanceof CSSTransition)),
    )
    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations,
      `${theme} theme:\n${describeViolations(results.violations)}`,
    ).toEqual([])
  }
})

// @test-link [[rule_unsupported_rhythm_settings_block_generation]]
test('has no detectable axe violations in the unsupported-rhythm-setting state', async ({
  page,
}) => {
  await gotoWorkspace(page)
  await generateAndAwaitReady(page)

  await radio(page, 'Note density', 'Sixteenth').click()
  await radio(page, 'Silence density', 'Breath-heavy').click()
  await radio(page, 'Syncopation', 'Active displacement').click()
  await expect(
    page.getByRole('status').filter({ hasText: "can't form a four-bar phrase" }),
  ).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations, describeViolations(results.violations)).toEqual([])
})

// The remaining states below need the real generation/notation failure seams the workspace harness
// (port 4175) exposes -- the production build (port 4173) has no way to force them deterministically.

test('has no detectable axe violations while a generation is gated in flight', async ({ page }) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [1])
  await holdGeneration(page)

  await primaryButton(page).click()
  await expect.poll(async () => (await harnessSnapshot(page)).operation).toBe('generating')

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations, describeViolations(results.violations)).toEqual([])

  await releaseGeneration(page)
  await expect.poll(async () => (await harnessSnapshot(page)).operation).toBe('idle')
})

test('has no detectable axe violations in the generation-failed error state', async ({ page }) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [1])
  await failNextGeneration(page, 'no_legal_harmony_plan')

  await primaryButton(page).click()
  await expect(page.locator('.inline-alert.alert-error')).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations, describeViolations(results.violations)).toEqual([])
})

test('has no detectable axe violations in the notation-failed error state', async ({ page }) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [1])
  await generateAndAwaitReady(page)

  await failNextNotation(page)
  await radio(page, 'Display notation', 'Concert').click()
  await expect.poll(async () => (await harnessSnapshot(page)).operation).toBe('idle')
  await expect(page.locator('.inline-alert.alert-error')).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations, describeViolations(results.violations)).toEqual([])
})
