/**
 * Step 10 release journey (4/8): the three instrument-profile switch outcomes -- retain, complete
 * regeneration, and clear-to-empty when regeneration is needed but the current rhythm settings are
 * unsupported. Runs against the workspace harness (port 4175) for deterministic seeds. Fixtures
 * were derived from the profile-switch policy's own window arithmetic (evaluateProfileSwitch,
 * src/domain/generation/profile-switch.ts) and confirmed empirically against the running harness
 * during this spec's authoring:
 *  - retain: default controls (Register Middle, B-flat tenor), seed 777, produces pitches {60,64},
 *    which fit both B-flat tenor's Middle window [52,64] and E-flat alto's Middle window [57,69].
 *  - regenerate/cleared: Register Low + B-flat tenor, seed 9, produces a pitch of 48, below
 *    E-flat alto's active-range floor of 51 -- guaranteed to fail retention under that profile.
 */
import { expect, test } from '@playwright/test'

import { generateAndAwaitReady, primaryButton, radio, statusRegion } from '../workspace/helpers'
import { gotoWorkspaceHarness, harnessSnapshot, queueSeeds } from './harness-helpers'

// @test-link [[rule_profile_switch_validates_phrase]]
test('a profile switch retains the phrase when every event fits the new profile', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [777])
  await generateAndAwaitReady(page)
  const before = await harnessSnapshot(page)

  await radio(page, 'Instrument profile', 'E-flat alto saxophone').click()
  await expect.poll(async () => (await harnessSnapshot(page)).operation).toBe('idle')

  await expect(statusRegion(page)).toHaveText('Phrase ready')
  const after = await harnessSnapshot(page)
  expect(after.requestId).toBe(before.requestId)
  expect(after.seed).toBe(before.seed)
  expect(after.timeline).toBe(before.timeline)
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/)
})

// @test-link [[rule_profile_switch_validates_phrase]]
test('a profile switch regenerates the phrase with a fresh seed when it no longer fits', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await radio(page, 'Register', 'Low').click()
  await queueSeeds(page, [9, 12345])
  await generateAndAwaitReady(page)
  const before = await harnessSnapshot(page)
  expect(before.seed).toBe(9)

  await radio(page, 'Instrument profile', 'E-flat alto saxophone').click()
  await expect(statusRegion(page)).toHaveText('Generating phrase')
  await expect(statusRegion(page)).toHaveText('Phrase ready', { timeout: 30_000 })

  const after = await harnessSnapshot(page)
  expect(after.seed).toBe(12345)
  expect(after.requestId).not.toBe(before.requestId)
  expect(after.timeline).not.toBe(before.timeline)
})

// @test-link [[rule_profile_switch_validates_phrase]]
// @test-link [[rule_unsupported_rhythm_settings_block_generation]]
test('a profile switch clears the phrase to the empty workspace when regeneration is needed but the rhythm settings are unsupported', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await radio(page, 'Register', 'Low').click()
  await queueSeeds(page, [9])
  await generateAndAwaitReady(page)
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/)

  // Quarter density + Sparse silence are the spec defaults; adding Active displacement syncopation
  // lands on one of the six unsupported combinations without touching density or silence.
  await radio(page, 'Syncopation', 'Active displacement').click()
  await expect(
    page.getByText("This mix of note density, silence, and syncopation can't form"),
  ).toBeVisible()
  await expect(primaryButton(page)).toBeDisabled()

  await radio(page, 'Instrument profile', 'E-flat alto saxophone').click()
  await expect.poll(async () => (await harnessSnapshot(page)).operation).toBe('idle')

  await expect(page.locator('.staff-frame')).toHaveClass(/staff-empty/)
  await expect(page.getByText('Generate a phrase to begin.')).toBeVisible()
  await expect(primaryButton(page)).toHaveText('Generate phrase')
  await expect(primaryButton(page)).toBeDisabled()
  // The rhythm block notice stays visible: the switch cleared the phrase, not the rhythm setting.
  await expect(
    page.getByText("This mix of note density, silence, and syncopation can't form"),
  ).toBeVisible()
})
