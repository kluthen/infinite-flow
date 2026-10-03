/**
 * Step 10 release journey (3/8): the same complete request and seed reproduce the identical
 * phrase, and a different seed under the same controls reproduces a different one. Runs against
 * the workspace harness (port 4175) so the exact seed a generation draws is controlled, then
 * compares the resulting concert-pitch timeline (never the request identity, which is always
 * fresh per generation by design).
 */
import { expect, test } from '@playwright/test'

import { generateAndAwaitReady } from '../workspace/helpers'
import { gotoWorkspaceHarness, harnessSnapshot, queueSeeds } from './harness-helpers'

// The two documented seeds below were chosen empirically against the default controls (C Ionian,
// Neutral preset, B-flat tenor, Register Middle): both are cheap enough to generate well within
// the poll timeout, and 4243's timeline was confirmed (by a throwaway harness probe during this
// spec's authoring) to differ from 4242's rather than coincidentally match it. Both facts were
// re-confirmed after D172 changed the defaults to Gentle diatonic harmonic motion and Varied
// arpeggio chaos.
const REPRODUCIBLE_SEED = 4242
const DIFFERENT_SEED = 4243

// @test-link [[rule_seeded_phrase_reproduction]]
test('the same seed and controls reproduce an identical timeline across two generations', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [REPRODUCIBLE_SEED])
  await generateAndAwaitReady(page)
  const first = await harnessSnapshot(page)
  expect(first.seed).toBe(REPRODUCIBLE_SEED)

  await page.reload()
  await page.waitForFunction(() => typeof window.__workspaceHarness !== 'undefined')
  await queueSeeds(page, [REPRODUCIBLE_SEED])
  await generateAndAwaitReady(page)
  const second = await harnessSnapshot(page)

  expect(second.seed).toBe(first.seed)
  expect(second.timeline).toBe(first.timeline)
  expect(second.instrumentProfileId).toBe(first.instrumentProfileId)
})

// @test-link [[rule_seeded_phrase_reproduction]]
test('a different seed under the same controls produces a different timeline', async ({ page }) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [REPRODUCIBLE_SEED])
  await generateAndAwaitReady(page)
  const first = await harnessSnapshot(page)

  await queueSeeds(page, [DIFFERENT_SEED])
  await generateAndAwaitReady(page)
  const second = await harnessSnapshot(page)

  expect(second.seed).toBe(DIFFERENT_SEED)
  expect(second.timeline).not.toBe(first.timeline)
})
