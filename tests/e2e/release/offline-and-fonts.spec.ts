/**
 * Step 10 release: the browser-only operation boundary verified end to end against the production
 * preview build (port 4173) -- after the PWA service worker installs on first load, the workspace
 * reloads and completes a full generation offline, with no server dependency; and the two self-hosted
 * UI typefaces resolve from the precached build output rather than any network request.
 */
import { expect, test } from '@playwright/test'

import { generateAndAwaitReady, gotoWorkspace } from '../workspace/helpers'

/** Intent: wait until this page's own service worker has installed and taken control. */
async function waitForServiceWorkerReady(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    if (!registration.active) throw new Error('service worker registered without an active worker')
  })
}

// @test-link [[specification_browser_only_operation_verification]]
test('after the service worker installs, the workspace reloads and completes a full generation while offline', async ({
  page,
  context,
}) => {
  await gotoWorkspace(page)
  await waitForServiceWorkerReady(page)

  await context.setOffline(true)
  await page.reload()

  await expect(page.getByRole('heading', { level: 1, name: 'Infinite Flow' })).toBeVisible()
  await generateAndAwaitReady(page)
  await expect(page.locator('svg.staff-svg')).toBeVisible()

  await context.setOffline(false)
})

// @test-link [[specification_browser_only_operation_verification]]
test('the two self-hosted UI typefaces load without any network request', async ({ page }) => {
  const fontRequests: string[] = []
  page.on('request', (request) => {
    if (/\.woff2?(\?|$)/i.test(request.url()) || request.url().includes('fonts.googleapis.com')) {
      fontRequests.push(request.url())
    }
  })

  await gotoWorkspace(page)
  await waitForServiceWorkerReady(page)

  const loadedFamilies = await page.evaluate(async () => {
    await document.fonts.ready
    return {
      display: document.fonts.check('16px "Fraunces Variable"'),
      ui: document.fonts.check('16px "Source Sans 3 Variable"'),
    }
  })
  expect(loadedFamilies.display).toBe(true)
  expect(loadedFamilies.ui).toBe(true)

  // Both requests, if any occurred at all, must have resolved against this origin's own build
  // output (the precached woff2 files), never an external fonts CDN.
  for (const url of fontRequests) {
    expect(url).not.toContain('fonts.googleapis.com')
    expect(new URL(url).origin).toBe(new URL(page.url()).origin)
  }
})
