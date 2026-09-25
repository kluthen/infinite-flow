/**
 * Step 10 release: the ephemeral-state boundary verified across the full required phrase workflow
 * (not just the presentation theme, already covered by tests/e2e/workspace/theme.spec.ts) -- no
 * customized control, generated phrase, notation mode, or in-flight/retryable operation state
 * survives a reload, and no user- or session-state entry is ever written to localStorage,
 * sessionStorage, or IndexedDB. The PWA's own immutable-asset precache (Cache Storage) is read here
 * too, but only to confirm it is the one storage area allowed to be non-empty.
 */
import { expect, test } from '@playwright/test'

import { generateAndAwaitReady, gotoWorkspace, radio } from '../workspace/helpers'
import { failNextGeneration, gotoWorkspaceHarness, queueSeeds } from './harness-helpers'

/** Intent: every user/session persistence area this origin could have written to. */
async function readUserStatePersistence(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const databases = (await indexedDB.databases?.()) ?? []
    return {
      localStorageLength: localStorage.length,
      sessionStorageLength: sessionStorage.length,
      indexedDbDatabaseNames: databases.map((db) => db.name),
    }
  })
}

// @test-link [[specification_ephemeral_state_verification]]
// @test-link [[rule_ephemeral_session_state]]
test('no customized control, generated phrase, or notation mode survives a reload', async ({
  page,
}) => {
  await gotoWorkspace(page)
  await radio(page, 'Musical profile preset', 'Jazz').click()
  await radio(page, 'Register', 'Low').click()
  await generateAndAwaitReady(page)
  await radio(page, 'Display notation', 'Concert').click()

  const before = await readUserStatePersistence(page)
  expect(before.localStorageLength).toBe(0)
  expect(before.sessionStorageLength).toBe(0)
  expect(before.indexedDbDatabaseNames).toEqual([])

  await page.reload()

  await expect(page.locator('.control-summary')).toHaveText('C Ionian · Neutral · Lift · Shaped')
  await expect(radio(page, 'Musical profile preset', 'Neutral')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(radio(page, 'Register', 'Middle')).toHaveAttribute('aria-checked', 'true')
  await expect(
    page.getByRole('radiogroup', { name: 'Display notation' }).getByRole('radio', {
      name: 'B-flat',
    }),
  ).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('Generate a phrase to begin.')).toBeVisible()

  const after = await readUserStatePersistence(page)
  expect(after.localStorageLength).toBe(0)
  expect(after.sessionStorageLength).toBe(0)
  expect(after.indexedDbDatabaseNames).toEqual([])
})

// @test-link [[specification_ephemeral_state_verification]]
test('a retryable generation failure does not survive a reload', async ({ page }) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [11])
  await failNextGeneration(page, 'no_legal_harmony_plan')

  await page.getByRole('button', { name: 'Generate phrase' }).click()
  await expect(page.locator('.generation-status')).toHaveText('Generation failed. Try again.')
  await expect(page.getByRole('button', { name: 'Retry generation' })).toBeVisible()

  const before = await readUserStatePersistence(page)
  expect(before.localStorageLength).toBe(0)
  expect(before.sessionStorageLength).toBe(0)

  await page.reload()

  await expect(page.getByText('Generate a phrase to begin.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate phrase' })).toBeVisible()
  await expect(page.locator('.inline-alert.alert-error')).toHaveCount(0)

  const after = await readUserStatePersistence(page)
  expect(after.localStorageLength).toBe(0)
  expect(after.sessionStorageLength).toBe(0)
})

// @test-link [[specification_ephemeral_state_verification]]
test('the PWA precache exists and holds only immutable static assets, never user or session state', async ({
  page,
}) => {
  await gotoWorkspace(page)
  await page.evaluate(() => navigator.serviceWorker.ready)

  const cacheEntries = await page.evaluate(async () => {
    const cacheNames = await caches.keys()
    const entries: string[] = []
    for (const name of cacheNames) {
      const cache = await caches.open(name)
      const requests = await cache.keys()
      entries.push(...requests.map((request) => request.url))
    }
    return entries
  })

  expect(cacheEntries.length).toBeGreaterThan(0)
  for (const url of cacheEntries) {
    expect(url).toMatch(/\.(html|js|css|woff2|png|svg|ico|webmanifest)(\?.*)?$|\/$/)
  }
})
