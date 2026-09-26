/**
 * Step 10 release journey (5/8): the tonal-center control is read in the instrument's WRITTEN
 * pitch (ISS-003) -- there is no independently selectable display-notation convention any more,
 * since notation always reads its transposition from the active instrument profile. Verifies the
 * written->concert conversion end to end for the default B-flat tenor profile, a switch to E-flat
 * alto, the transposition-free C MIDI keyboard profile, and a non-Ionian written collection. Runs
 * against the workspace harness (port 4175) for its deterministic seed and snapshot of the real
 * GenerationIntent's `controls.tonalCenter` (concert) / `writtenTonalCenter` (written) pair.
 */
import { expect, test } from '@playwright/test'

import { generateAndAwaitReady, radio } from '../workspace/helpers'
import { gotoWorkspaceHarness, harnessSnapshot, queueSeeds } from './harness-helpers'

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

function pitchClassIndex(pitchClass: string): number {
  const index = PITCH_CLASSES.indexOf(pitchClass as (typeof PITCH_CLASSES)[number])
  if (index === -1) throw new Error(`Unknown pitch class "${pitchClass}".`)
  return index
}

// @test-link [[module_generation_request_construction]]
test('first load: written C Ionian on the default B-flat tenor profile has an empty key signature and converts to concert pc 10', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await expect(
    page.getByRole('radiogroup', { name: 'Instrument profile' }).getByRole('radio', {
      name: 'B-flat tenor saxophone',
    }),
  ).toHaveAttribute('aria-checked', 'true')
  await expect(
    page
      .getByRole('radiogroup', { name: 'Written key' })
      .getByRole('radio', { name: 'C', exact: true }),
  ).toHaveAttribute('aria-checked', 'true')

  await queueSeeds(page, [321])
  await generateAndAwaitReady(page)

  const snapshot = await harnessSnapshot(page)
  expect(snapshot.writtenTonalCenter).toBe('C')
  expect(pitchClassIndex(snapshot.concertTonalCenter!)).toBe(10)

  const label = await page.locator('svg.staff-svg').getAttribute('aria-label')
  expect(label).toContain('no sharps or flats')
  await expect(page.locator('svg')).toBeVisible()
})

// @test-link [[rule_instrument_profile_range]]
test('switching to the E-flat alto profile keeps written C Ionian empty and converts to concert pc 3', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await radio(page, 'Instrument profile', 'E-flat alto saxophone').click()
  await queueSeeds(page, [321])
  await generateAndAwaitReady(page)

  const snapshot = await harnessSnapshot(page)
  expect(snapshot.instrumentProfileId).toBe('eb-alto')
  expect(snapshot.writtenTonalCenter).toBe('C')
  expect(pitchClassIndex(snapshot.concertTonalCenter!)).toBe(3)

  const label = await page.locator('svg.staff-svg').getAttribute('aria-label')
  expect(label).toContain('no sharps or flats')
})

// @test-link [[entity_instrument_profile]]
test('the C MIDI keyboard profile has no transposition: written and concert tonal centers are equal', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await radio(page, 'Instrument profile', 'C MIDI keyboard').click()
  await queueSeeds(page, [321])
  await generateAndAwaitReady(page)

  const snapshot = await harnessSnapshot(page)
  expect(snapshot.instrumentProfileId).toBe('c-keyboard')
  expect(snapshot.concertTonalCenter).toBe(snapshot.writtenTonalCenter)
})

// @test-link [[module_generation_request_construction]]
test('a written D Dorian selection on the B-flat tenor profile converts to concert C Dorian', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await radio(page, 'Written key', 'D').click()
  await radio(page, 'Collection', 'Dorian').click()
  await queueSeeds(page, [321])
  await generateAndAwaitReady(page)

  const snapshot = await harnessSnapshot(page)
  expect(snapshot.writtenTonalCenter).toBe('D')
  expect(snapshot.concertTonalCenter).toBe('C')
})
