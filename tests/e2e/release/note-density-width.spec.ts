/**
 * v2.0 definition of done, item 27, at Idle: below the tablet-landscape layout's width (64rem) the
 * `Sixteenth` note density can't be chosen, a `Sixteenth` chosen while the window was wider stays
 * chosen but the next phrase generated there is generated with `Eighth`, and the chosen value
 * applies again to the next phrase generated at or above that width. Resizing the window across
 * the width never regenerates the phrase on screen. Unsupported rhythm settings are judged on the
 * density a phrase would be generated with, so a crossing can block or unblock generation. Runs
 * against the workspace harness (port 4175) for its seed queue and its session snapshot, which
 * reports both the chosen density and the density the phrase on screen was generated with.
 */
import { type Page, expect, test } from '@playwright/test'

import {
  generateAndAwaitReady,
  observeGenerationStatus,
  primaryButton,
  radio,
  readGenerationStatusLog,
} from '../workspace/helpers'
import { gotoWorkspaceHarness, harnessSnapshot, queueSeeds } from './harness-helpers'

/** At and above bp-tablet-landscape (64rem = 1024 px), landscape. */
const WIDE = { width: 1280, height: 800 }
/** A landscape phone, below bp-tablet-landscape. */
const PHONE = { width: 844, height: 390 }

const FIELD_NOTE = "Sixteenth isn't available on small screens."

/**
 * Intent: resize the window and let every redraw it causes settle: two animation frames for the
 * media-query change and the coalesced staff redraw, then an idle generation status.
 */
async function resizeAndSettle(page: Page, size: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(size)
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  await expect.poll(async () => (await harnessSnapshot(page)).operation).toBe('idle')
}

// @test-link [[rule_sixteenth_unavailable_below_tablet_width]]
// @test-link [[rule_generated_density_follows_window_width]]
test('a chosen Sixteenth generates as Eighth below the width, applies again above it, and a resize never regenerates', async ({
  page,
}) => {
  await page.setViewportSize(WIDE)
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [2701, 2702, 2703])

  await radio(page, 'Note density', 'Sixteenth').click()
  await generateAndAwaitReady(page)
  const wideFirst = await harnessSnapshot(page)
  expect(wideFirst.chosenNoteDensity).toBe('Sixteenth')
  expect(wideFirst.generatedNoteDensity).toBe('Sixteenth')

  // Narrowing below the width: Sixteenth becomes unavailable, the stored Sixteenth shows as the
  // effective Eighth, and the phrase on screen is not regenerated.
  await observeGenerationStatus(page)
  await resizeAndSettle(page, PHONE)
  await expect(radio(page, 'Note density', 'Sixteenth')).toBeDisabled()
  await expect(radio(page, 'Note density', 'Eighth notes')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText(FIELD_NOTE)).toBeVisible()
  const narrowed = await harnessSnapshot(page)
  expect(narrowed.requestId).toBe(wideFirst.requestId)
  expect(narrowed.seed).toBe(wideFirst.seed)
  expect(narrowed.chosenNoteDensity).toBe('Sixteenth')
  expect(await readGenerationStatusLog(page)).not.toContain('Generating phrase')

  // The next phrase generated below the width is generated with Eighth.
  await generateAndAwaitReady(page)
  const narrowPhrase = await harnessSnapshot(page)
  expect(narrowPhrase.seed).toBe(2702)
  expect(narrowPhrase.chosenNoteDensity).toBe('Sixteenth')
  expect(narrowPhrase.generatedNoteDensity).toBe('Eighth')

  // Widening again: Sixteenth is available and checked again, nothing is regenerated, and the
  // next phrase generated at or above the width uses the chosen Sixteenth.
  await observeGenerationStatus(page)
  await resizeAndSettle(page, WIDE)
  await expect(radio(page, 'Note density', 'Sixteenth')).toBeEnabled()
  await expect(radio(page, 'Note density', 'Sixteenth')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText(FIELD_NOTE)).toBeHidden()
  const widened = await harnessSnapshot(page)
  expect(widened.requestId).toBe(narrowPhrase.requestId)
  expect(await readGenerationStatusLog(page)).not.toContain('Generating phrase')

  await generateAndAwaitReady(page)
  const wideAgain = await harnessSnapshot(page)
  expect(wideAgain.seed).toBe(2703)
  expect(wideAgain.generatedNoteDensity).toBe('Sixteenth')
})

// @test-link [[rule_unsupported_rhythm_settings_block_generation]]
test('a combination blocked only by Sixteenth blocks from the width up and generates with Eighth below it', async ({
  page,
}) => {
  await page.setViewportSize(WIDE)
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [2711])

  await radio(page, 'Note density', 'Sixteenth').click()
  await radio(page, 'Rhythmic variety', 'Strict').click()
  await radio(page, 'Silence density', 'Sparse').click()
  await radio(page, 'Syncopation', 'Active displacement').click()
  const alert = page.getByRole('status').filter({ hasText: "can't form a four-bar phrase" })
  await expect(primaryButton(page)).toBeDisabled()
  await expect(alert).toBeVisible()

  await resizeAndSettle(page, PHONE)
  await expect(primaryButton(page)).toBeEnabled()
  await expect(alert).toBeHidden()

  await generateAndAwaitReady(page)
  const phrase = await harnessSnapshot(page)
  expect(phrase.chosenNoteDensity).toBe('Sixteenth')
  expect(phrase.generatedNoteDensity).toBe('Eighth')

  // Widening past the width blocks the combination again; the phrase on screen stays.
  await resizeAndSettle(page, WIDE)
  await expect(primaryButton(page)).toBeDisabled()
  await expect(alert).toBeVisible()
  expect((await harnessSnapshot(page)).requestId).toBe(phrase.requestId)
})
