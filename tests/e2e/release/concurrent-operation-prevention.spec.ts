/**
 * Step 10 release journey (8/8): while a generation is in flight, every control group is
 * read-only, the primary action is disabled, and a second attempt to start a generation never
 * starts a second request. Runs against the workspace harness (port 4175) so the request can be
 * held open deterministically with `holdGeneration()`.
 */
import { expect, test } from '@playwright/test'

import { primaryButton, statusRegion } from '../workspace/helpers'
import {
  gotoWorkspaceHarness,
  harnessSnapshot,
  holdGeneration,
  queueSeeds,
  releaseGeneration,
} from './harness-helpers'

const SAMPLE_READONLY_GROUPS = ['Written key', 'Register', 'Musical profile preset'] as const

// @test-link [[user_story_controlled_phrase_generation]]
test('every control group is read-only, and the primary action is disabled, while a generation is gated', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [1, 2])
  await holdGeneration(page)

  await primaryButton(page).click()
  await expect(statusRegion(page)).toHaveText('Generating phrase')

  await expect(primaryButton(page)).toBeDisabled()
  for (const groupLabel of SAMPLE_READONLY_GROUPS) {
    await expect(page.getByRole('radiogroup', { name: groupLabel })).toHaveAttribute(
      'aria-readonly',
      'true',
    )
  }

  await releaseGeneration(page)
  await expect(statusRegion(page)).toHaveText('Phrase ready', { timeout: 30_000 })
})

// @test-link [[service_workspace_session_flow]]
test('a second click while a generation is gated never starts a second request', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [1, 2])
  await holdGeneration(page)

  await primaryButton(page).click()
  await expect(statusRegion(page)).toHaveText('Generating phrase')
  const duringFirstRequest = await harnessSnapshot(page)
  expect(duringFirstRequest.operation).toBe('generating')

  // The button is natively disabled; force the click to prove the session guard itself (not just
  // the disabled attribute) rejects a concurrent start.
  await primaryButton(page).click({ force: true })
  await primaryButton(page).click({ force: true })

  await releaseGeneration(page)
  await expect(statusRegion(page)).toHaveText('Phrase ready', { timeout: 30_000 })
  const afterFirstRequest = await harnessSnapshot(page)
  expect(afterFirstRequest.seed).toBe(1)

  // The second queued seed was never drawn by a phantom concurrent request: it is still next.
  await primaryButton(page).click()
  await expect(statusRegion(page)).toHaveText('Phrase ready', { timeout: 30_000 })
  const afterSecondRequest = await harnessSnapshot(page)
  expect(afterSecondRequest.seed).toBe(2)
  expect(afterSecondRequest.requestId).not.toBe(afterFirstRequest.requestId)
})
