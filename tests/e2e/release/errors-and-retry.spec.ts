/**
 * Step 10 release journey (7/8): an initial generation failure and its Retry (building a fresh
 * request from the current controls/profile, with a fresh seed and identity, never replaying the
 * failed intent unchanged -- D30), a later failure that keeps the prior valid phrase visible, and
 * a notation failure that keeps the phrase data while replacing the score with a retryable error,
 * recovered by Retry notation. Runs against the workspace harness (port 4175) for the real typed
 * generation- and notation-failure injection seams.
 */
import { expect, test } from '@playwright/test'

import { generateAndAwaitReady, primaryButton, statusRegion } from '../workspace/helpers'
import {
  failNextGeneration,
  failNextNotation,
  gotoWorkspaceHarness,
  harnessSnapshot,
  queueSeeds,
} from './harness-helpers'

// @test-link [[service_workspace_session_flow]]
test('an initial generation failure shows the empty workspace with an error, and Retry generation builds a fresh request with a new seed', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  // Queue one seed for the failed attempt and a distinct one for the retry: if Retry replayed the
  // failed intent unchanged, it would never draw the second queued seed at all.
  await queueSeeds(page, [42, 99])
  await failNextGeneration(page, 'no_legal_harmony_plan')

  await page.getByRole('button', { name: 'Generate phrase' }).click()
  await expect(statusRegion(page)).toHaveText('Generation failed. Try again.')
  await expect(page.locator('.inline-alert.alert-error')).toHaveText(
    "This combination of written key, collection, harmonic motion, tension, and musical profile can't produce a phrase. Try a different written key, collection, harmonic motion, tension, or profile.",
  )
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-empty/)
  await expect(page.getByText('Generate a phrase to begin.')).toBeVisible()
  await expect(primaryButton(page)).toHaveText('Retry generation')

  // No failure armed this time: Retry must build a brand-new request (D30), drawing the second
  // queued seed rather than reusing the first failed attempt's seed.
  await primaryButton(page).click()
  await expect(statusRegion(page)).toHaveText('Phrase ready', { timeout: 30_000 })
  const snap = await harnessSnapshot(page)
  expect(snap.seed).toBe(99)
  expect(snap.seed).not.toBe(42)
})

// @test-link [[service_workspace_session_flow]]
test('a later generation failure keeps the prior valid phrase visible', async ({ page }) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [77])
  await generateAndAwaitReady(page)
  const before = await harnessSnapshot(page)
  const scoreBefore = await page.locator('svg').innerHTML()

  await queueSeeds(page, [88])
  await failNextGeneration(page, 'search_limit_exceeded')
  await primaryButton(page).click()
  await expect(statusRegion(page)).toHaveText('Generation failed. Try again.')

  await expect(page.locator('.inline-alert.alert-error')).toHaveText(
    "This phrase search hit its work limit before finding a result. That doesn't prove this combination is impossible. Trying again may find a result, or try different settings.",
  )
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/)
  expect(await page.locator('svg').innerHTML()).toBe(scoreBefore)
  const after = await harnessSnapshot(page)
  expect(after.requestId).toBe(before.requestId)
  expect(after.seed).toBe(before.seed)
  expect(after.timeline).toBe(before.timeline)
  await expect(primaryButton(page)).toHaveText('Retry generation')
})

// @test-link [[module_notation_layout_preflight]]
test('a notation failure keeps the phrase data but replaces the score with a retryable error, and Retry notation recovers', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [77])
  await generateAndAwaitReady(page)
  const before = await harnessSnapshot(page)

  await failNextNotation(page)
  // No session action: force an out-of-band PhraseScore redraw (a resize) to fail on its own. Stays
  // above the 64rem phone-layout breakpoint so this is the only redraw trigger the resize fires --
  // crossing the breakpoint also fires the phone-layout `matchMedia` listener's own `scheduleRedraw`,
  // whose later, unarmed redraw would silently recover the just-armed failure before assertions run.
  await page.setViewportSize({ width: 1100, height: 720 })

  await expect(page.locator('.staff-frame')).toHaveClass(/staff-error/)
  await expect(page.locator('.inline-alert.alert-error')).toContainText('Notation error')
  await expect(primaryButton(page)).toHaveText('Retry notation')
  // The generated phrase's identity is untouched: only the redraw attempt failed.
  const midFailure = await harnessSnapshot(page)
  expect(midFailure.requestId).toBe(before.requestId)
  expect(midFailure.seed).toBe(before.seed)

  await primaryButton(page).click()
  await expect.poll(async () => (await harnessSnapshot(page)).operation).toBe('idle')

  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/)
  await expect(page.locator('svg')).toBeVisible()
  const after = await harnessSnapshot(page)
  expect(after.requestId).toBe(before.requestId)
  expect(after.seed).toBe(before.seed)
  expect(after.timeline).toBe(before.timeline)
})
