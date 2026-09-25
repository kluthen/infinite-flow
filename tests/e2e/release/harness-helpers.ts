/**
 * Shared helpers for the release journey specs that need the workspace harness's deterministic
 * seams (tests/e2e/workspace-harness) rather than the production build's real crypto seed and
 * request-id providers: navigation to the harness's own origin (port 4175, a second Playwright
 * webServer entry) and thin wrappers around its typed `window.__workspaceHarness` API.
 */
import { type Page } from '@playwright/test'

export const WORKSPACE_HARNESS_URL = 'http://127.0.0.1:4175/'

/** Intent: land on the harness's empty workspace state with its deterministic API ready. */
export async function gotoWorkspaceHarness(page: Page): Promise<void> {
  await page.goto(WORKSPACE_HARNESS_URL)
  await page.waitForFunction(() => typeof window.__workspaceHarness !== 'undefined')
}

/** Intent: read the harness's current session snapshot (requestId/seed/timeline/operation/mode). */
export function harnessSnapshot(page: Page): Promise<WorkspaceHarnessSnapshot> {
  return page.evaluate(() => window.__workspaceHarness.snapshot())
}

/** Intent: queue the exact seeds the next N generations must draw, in order. */
export function queueSeeds(page: Page, seeds: readonly number[]): Promise<void> {
  return page.evaluate((values) => window.__workspaceHarness.queueSeeds(values), seeds)
}

/** Intent: hold every subsequent generate() call before it reaches the real worker. */
export function holdGeneration(page: Page): Promise<void> {
  return page.evaluate(() => window.__workspaceHarness.holdGeneration())
}

/** Intent: release a hold; every gated generate() call resumes immediately. */
export function releaseGeneration(page: Page): Promise<void> {
  return page.evaluate(() => window.__workspaceHarness.releaseGeneration())
}

/** Intent: arm exactly one forced generation failure with a real orchestration failure code. */
export function failNextGeneration(
  page: Page,
  code: WorkspaceHarnessGenerationFailureCode,
): Promise<void> {
  return page.evaluate((c) => window.__workspaceHarness.failNextGeneration(c), code)
}

/** Intent: arm exactly one forced notation engraving-module load failure on the next redraw. */
export function failNextNotation(page: Page): Promise<void> {
  return page.evaluate(() => window.__workspaceHarness.failNextNotation())
}
