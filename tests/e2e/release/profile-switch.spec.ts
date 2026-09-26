/**
 * Step 10 release journey (4/8): the three instrument-profile switch outcomes -- apply the control
 * alone with no prior phrase, regenerate the complete phrase with a fresh seed when a prior phrase
 * is shown (there is no keep-if-it-fits retention: every profile switch with a shown phrase
 * regenerates, unconditionally -- the switch policy never compares the two profiles'
 * transpositions, see the unit-level table in generation-session-workspace.spec.ts), and clear to
 * the empty workspace when regeneration is needed but the switched controls are themselves an
 * unsupported rhythm setting. Runs against the workspace harness (port 4175) for deterministic
 * seeds.
 */
import { expect, test } from '@playwright/test'

import { generateAndAwaitReady, primaryButton, radio, statusRegion } from '../workspace/helpers'
import { gotoWorkspaceHarness, harnessSnapshot, queueSeeds } from './harness-helpers'

// @test-link [[rule_profile_switch_validates_phrase]]
test('a profile switch with no prior phrase applies the selection alone, without starting a generation', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [777])

  await radio(page, 'Instrument profile', 'E-flat alto saxophone').click()

  const snapshot = await harnessSnapshot(page)
  expect(snapshot.instrumentProfileId).toBe('eb-alto')
  expect(snapshot.operation).toBe('idle')
  expect(snapshot.requestId).toBeNull()
  await expect(page.getByText('Generate a phrase to begin.')).toBeVisible()
  await expect(primaryButton(page)).toHaveText('Generate phrase')
})

// @test-link [[rule_profile_switch_validates_phrase]]
test('a profile switch with a shown phrase always regenerates it with a fresh seed, regardless of the transposition relationship between the two profiles', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [777, 12345])
  await generateAndAwaitReady(page)
  const before = await harnessSnapshot(page)
  expect(before.instrumentProfileId).toBe('bb-tenor')
  expect(before.writtenTonalCenter).toBe('C')
  // bb-tenor's chromatic transposition is +14: concert = (written - chromatic) mod 12.
  expect(before.concertTonalCenter).toBe('A#')

  await radio(page, 'Instrument profile', 'E-flat alto saxophone').click()
  // A warm generation can finish before the transient "Generating phrase" status is observable,
  // so wait for the switch's new request to settle instead of asserting that status.
  await expect
    .poll(
      async () => {
        const snapshot = await harnessSnapshot(page)
        return snapshot.requestId !== before.requestId && snapshot.operation === 'idle'
      },
      { timeout: 30_000 },
    )
    .toBe(true)
  await expect(statusRegion(page)).toHaveText('Phrase ready')

  const after = await harnessSnapshot(page)
  expect(after.instrumentProfileId).toBe('eb-alto')
  expect(after.seed).toBe(12345)
  expect(after.requestId).not.toBe(before.requestId)
  // The written key the player chose never changes across a profile switch.
  expect(after.writtenTonalCenter).toBe(before.writtenTonalCenter)
  // eb-alto's chromatic transposition is +9: concert is recomputed for the new profile.
  expect(after.concertTonalCenter).toBe('D#')
})

// @test-link [[rule_profile_switch_validates_phrase]]
test('a profile switch to the non-transposing C MIDI keyboard also regenerates and recomputes the concert tonal center', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [777, 555])
  await generateAndAwaitReady(page)
  const before = await harnessSnapshot(page)
  expect(before.instrumentProfileId).toBe('bb-tenor')
  expect(before.writtenTonalCenter).toBe('C')
  expect(before.concertTonalCenter).toBe('A#')

  await radio(page, 'Instrument profile', 'C MIDI keyboard').click()
  // A warm generation can finish before the transient "Generating phrase" status is observable,
  // so wait for the switch's new request to settle instead of asserting that status.
  await expect
    .poll(
      async () => {
        const snapshot = await harnessSnapshot(page)
        return snapshot.requestId !== before.requestId && snapshot.operation === 'idle'
      },
      { timeout: 30_000 },
    )
    .toBe(true)
  await expect(statusRegion(page)).toHaveText('Phrase ready')

  const after = await harnessSnapshot(page)
  expect(after.instrumentProfileId).toBe('c-keyboard')
  expect(after.seed).toBe(555)
  expect(after.requestId).not.toBe(before.requestId)
  expect(after.writtenTonalCenter).toBe(before.writtenTonalCenter)
  // c-keyboard is non-transposing: concert equals the written selection.
  expect(after.concertTonalCenter).toBe('C')
})

// @test-link [[rule_profile_switch_validates_phrase]]
// @test-link [[rule_unsupported_rhythm_settings_block_generation]]
test('a profile switch clears the phrase to the empty workspace when regeneration is needed but the rhythm settings are unsupported', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
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
