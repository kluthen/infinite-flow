/**
 * The workspace's rhythm-domain prewarm on the real page and the real generation Worker: with the
 * policy on (the default) the page posts one prewarm when it starts and one per rhythm-setting
 * change, none for any other edit, and a phrase still generates; with `?prewarm=off` it posts none
 * and a phrase generates cold. Runs against the workspace harness (port 4175), whose prewarm seam
 * forwards every prewarm to the real worker client and counts it.
 */
import { type Page, expect, test } from '@playwright/test'

import { generateAndAwaitReady, radio } from '../workspace/helpers'
import { WORKSPACE_HARNESS_URL, harnessSnapshot, queueSeeds } from './harness-helpers'

/** Intent: open the harness with the given query string and wait for its API. */
async function gotoHarnessWith(page: Page, search: string): Promise<void> {
  await page.goto(`${WORKSPACE_HARNESS_URL}${search}`)
  await page.waitForFunction(() => typeof window.__workspaceHarness !== 'undefined')
}

/** Intent: how many prewarms the page has posted to the real worker so far. */
function prewarmCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.prewarmCount())
}

// @test-link [[module_generation_prewarm]]
test('posts a prewarm at start and per rhythm change, none for other edits, and still generates', async ({
  page,
}) => {
  await gotoHarnessWith(page, '')
  await queueSeeds(page, [3101])
  expect(await prewarmCount(page)).toBe(1)

  await radio(page, 'Rhythmic variety', 'Heavily varied').click()
  await radio(page, 'Silence density', 'Breath-heavy').click()
  expect(await prewarmCount(page)).toBe(3)

  await radio(page, 'Written key', 'D').click()
  await radio(page, 'Register', 'Low').click()
  expect(await prewarmCount(page)).toBe(3)

  await generateAndAwaitReady(page)
  expect((await harnessSnapshot(page)).seed).toBe(3101)
})

// @test-link [[module_generation_prewarm]]
test('posts no prewarm with ?prewarm=off and still generates', async ({ page }) => {
  await gotoHarnessWith(page, '?prewarm=off')
  await queueSeeds(page, [3102])

  await radio(page, 'Rhythmic variety', 'Heavily varied').click()
  await generateAndAwaitReady(page)

  expect(await prewarmCount(page)).toBe(0)
  expect((await harnessSnapshot(page)).seed).toBe(3102)
})
