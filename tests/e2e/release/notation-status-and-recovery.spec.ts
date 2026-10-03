/**
 * Step 10 release journey follow-up: the visually hidden `notation-status` live region (D33) that
 * announces "Notation error. Try again." whenever `notationError` becomes set, whatever the source,
 * and clears silently on recovery; an out-of-band `PhraseScore` redraw (a viewport resize) that
 * recovers a prior engraving failure without starting a new generation (the phrase's own request
 * identity is untouched, since there is no independently selectable display convention -- ISS-003
 * -- for a redraw to "commit"); and a regenerate-branch instrument-profile switch that itself fails
 * to generate, replacing a retained notation error with the generation-failure banner rather than
 * surfacing a stale "Notation error:" message (D34). Runs against the workspace harness (port 4175)
 * for the deterministic seed, generation-failure, and notation-failure injection seams.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { generateAndAwaitReady, primaryButton, radio, statusRegion } from '../workspace/helpers'
import {
  failNextGeneration,
  failNextNotation,
  gotoWorkspaceHarness,
  harnessSnapshot,
  queueSeeds,
} from './harness-helpers'

declare global {
  interface Window {
    __staffFrameClassLog?: string[]
  }
}

/** Intent: the persistent, visually hidden notation-status live region. */
function notationStatusRegion(page: Page): Locator {
  return page.locator('.notation-status')
}

/**
 * Intent: attach a `MutationObserver` on `.staff-frame`'s `class` attribute before an action
 * starts, so every class-list value it takes on (including one that resolves before Playwright's
 * next poll) is captured to prove an ordinary generation never passes through `staff-error`.
 */
async function observeStaffFrameClasses(page: Page): Promise<void> {
  await page.evaluate(() => {
    const el = document.querySelector('.staff-frame')
    if (!el) throw new Error('staff-frame not found')
    window.__staffFrameClassLog = [el.className]
    new MutationObserver(() => window.__staffFrameClassLog?.push(el.className)).observe(el, {
      attributes: true,
      attributeFilter: ['class'],
    })
  })
}

/** Intent: every class-list value `.staff-frame` has taken on since the last observe call. */
async function readStaffFrameClassLog(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__staffFrameClassLog ?? [])
}

// @test-link [[service_workspace_session_flow]]
test('a fresh generation whose own engraving fails announces through notation-status, and Retry notation recovers silently', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [11])
  await failNextNotation(page)

  const status = notationStatusRegion(page)
  await expect(status).toHaveAttribute('role', 'status')
  await expect(status).toHaveAttribute('aria-live', 'polite')
  await expect(status).toHaveAttribute('aria-atomic', 'true')

  await primaryButton(page).click()
  await expect
    .poll(async () => (await harnessSnapshot(page)).operation, { timeout: 30_000 })
    .toBe('idle')

  await expect(status).toHaveText('Notation error. Try again.')
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-error/)
  await expect(primaryButton(page)).toHaveText('Retry notation')
  await expect(statusRegion(page)).not.toContainText('Notation')

  await primaryButton(page).click()
  await expect
    .poll(async () => (await harnessSnapshot(page)).operation, { timeout: 10_000 })
    .toBe('idle')

  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/)
  await expect(status).toHaveText('')
})

// @test-link [[service_workspace_session_flow]]
test('an out-of-band redraw (a viewport resize) recovers a prior engraving failure without touching the phrase identity', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [23])
  await observeStaffFrameClasses(page)
  await generateAndAwaitReady(page)

  // Prove an ordinary, uninterrupted generation never passes through staff-error.
  const ordinaryLog = await readStaffFrameClassLog(page)
  expect(ordinaryLog.some((entry) => entry.includes('staff-error'))).toBe(false)
  const before = await harnessSnapshot(page)

  await failNextNotation(page)
  // No session action: force an out-of-band PhraseScore redraw (a resize) to fail on its own. Stays
  // above the 64rem phone-layout breakpoint so this is the only redraw trigger the resize fires --
  // crossing the breakpoint also fires the phone-layout `matchMedia` listener's own `scheduleRedraw`,
  // whose later, unarmed redraw would silently recover the just-armed failure before assertions run.
  await page.setViewportSize({ width: 1100, height: 720 })

  await expect(page.locator('.staff-frame')).toHaveClass(/staff-error/)
  await expect(notationStatusRegion(page)).toHaveText('Notation error. Try again.')
  const midFailure = await harnessSnapshot(page)
  expect(midFailure.requestId).toBe(before.requestId)
  expect(midFailure.seed).toBe(before.seed)

  // No click: a second out-of-band PhraseScore redraw (a further resize) is the only thing that
  // happens next.
  await page.setViewportSize({ width: 1152, height: 720 })

  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/, { timeout: 10_000 })
  await expect(notationStatusRegion(page)).toHaveText('')
  await expect(primaryButton(page)).toHaveText('Regenerate phrase')
  const after = await harnessSnapshot(page)
  expect(after.requestId).toBe(before.requestId)
  expect(after.seed).toBe(before.seed)
})

// @test-link [[service_workspace_session_flow]]
test('a regenerate-branch profile switch that itself fails to generate replaces a retained notation error with the generation-failure banner', async ({
  page,
}) => {
  await gotoWorkspaceHarness(page)
  await radio(page, 'Register', 'Low').click()
  // seed 9 generates a phrase under the defaults plus Register Low. Its pitches do not matter here:
  // a profile switch always regenerates while a phrase is shown. The second seed is drawn as the
  // profile switch's fresh seed but is never actually consumed by a generation, since that
  // generation is itself forced to fail below.
  await queueSeeds(page, [9, 12345])
  await generateAndAwaitReady(page)

  await failNextNotation(page)
  // No session action: force an out-of-band PhraseScore redraw (a resize) to fail on its own. Stays
  // above the 64rem phone-layout breakpoint so this is the only redraw trigger the resize fires --
  // crossing the breakpoint also fires the phone-layout `matchMedia` listener's own `scheduleRedraw`,
  // whose later, unarmed redraw would silently recover the just-armed failure before assertions run.
  await page.setViewportSize({ width: 1100, height: 720 })
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-error/)
  await expect(primaryButton(page)).toHaveText('Retry notation')

  await failNextGeneration(page, 'no_legal_harmony_plan')
  await radio(page, 'Instrument profile', 'E-flat alto saxophone').click()
  await expect
    .poll(async () => (await harnessSnapshot(page)).operation, { timeout: 30_000 })
    .toBe('idle')

  const staffFrame = page.locator('.staff-frame')
  await expect(staffFrame).toHaveClass(/staff-error/)
  await expect(staffFrame).not.toContainText('Notation error')
  await expect(staffFrame.locator('.inline-alert.alert-error')).toHaveCount(0)
  await expect(page.locator('.inline-alert.alert-error')).toBeVisible()
  await expect(primaryButton(page)).toHaveText('Retry generation')
})
