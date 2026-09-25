/**
 * Step 10 release journey (2/8): a first generation's status order and its accessible outputs, and
 * a regenerate's fresh seed/request identity while the prior score stays visible during the gated
 * request. Runs against the workspace harness (port 4175) for its deterministic seed queue and
 * generation gate.
 */
import { expect, test } from '@playwright/test'

import {
  observeGenerationStatus,
  primaryButton,
  readGenerationStatusLog,
  statusRegion,
} from '../workspace/helpers'
import {
  gotoWorkspaceHarness,
  harnessSnapshot,
  holdGeneration,
  queueSeeds,
  releaseGeneration,
} from './harness-helpers'

// @test-link [[req_four_measure_phrase]]
// @test-link [[user_story_controlled_phrase_generation]]
test('a first generation announces Generating phrase then Phrase ready, and renders the score with its accessible text description', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [101])

  await observeGenerationStatus(page)
  await primaryButton(page).click()
  await expect
    .poll(async () => (await readGenerationStatusLog(page)).at(-1), { timeout: 30_000 })
    .toBe('Phrase ready')

  const log = await readGenerationStatusLog(page)
  expect(log.indexOf('Generating phrase')).toBeGreaterThanOrEqual(0)
  expect(log.indexOf('Generating phrase')).toBeLessThan(log.indexOf('Phrase ready'))

  await expect(page.locator('svg')).toBeVisible()
  await expect(page.locator('.score-description')).toBeAttached()
  const description = await page.locator('.score-description').textContent()
  expect(description?.length ?? 0).toBeGreaterThan(0)
})

// @test-link [[rule_seeded_phrase_reproduction]]
test('regenerate draws a fresh seed and a fresh request identity while keeping the active controls', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [11, 22])

  await primaryButton(page).click()
  await expect(statusRegion(page)).toHaveText('Phrase ready', { timeout: 30_000 })
  const first = await harnessSnapshot(page)
  expect(first.seed).toBe(11)

  await primaryButton(page).click()
  await expect(statusRegion(page)).toHaveText('Phrase ready', { timeout: 30_000 })
  const second = await harnessSnapshot(page)

  expect(second.seed).toBe(22)
  expect(second.seed).not.toBe(first.seed)
  expect(second.requestId).not.toBe(first.requestId)
})

test('the prior score stays visible while a regenerate request is gated', async ({ page }) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [5, 6])

  await primaryButton(page).click()
  await expect(statusRegion(page)).toHaveText('Phrase ready', { timeout: 30_000 })
  const scoreBefore = await page.locator('svg').innerHTML()
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/)

  await holdGeneration(page)
  await primaryButton(page).click()
  await expect(statusRegion(page)).toHaveText('Generating phrase')
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-loading/)
  expect(await page.locator('svg').innerHTML()).toBe(scoreBefore)

  await releaseGeneration(page)
  await expect(statusRegion(page)).toHaveText('Phrase ready', { timeout: 30_000 })
})
