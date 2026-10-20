/**
 * Step 10 release, revised in v3.0 chunk 7b: the ephemeral-state boundary verified across the
 * full required phrase workflow. Since v3.0 the player's settings are saved in the app's one
 * IndexedDB database (`infinite-flow`) and come back after a reload (the theme alone is covered by
 * tests/e2e/workspace/theme.spec.ts); a generated phrase and an in-flight or retryable operation
 * state still do not survive one: no failure is recorded in the database, whose stores other than
 * the settings stay empty. Nothing is ever written to localStorage or sessionStorage. The PWA's
 * own immutable-asset precache (Cache Storage) is read here too, but only to confirm it holds only
 * static assets.
 */
import { expect, test, type Page } from '@playwright/test'

import { databaseSettings } from '../storage/storage-helpers'
import { generateAndAwaitReady, gotoWorkspace, radio } from '../workspace/helpers'
import { failNextGeneration, gotoWorkspaceHarness, queueSeeds } from './harness-helpers'

/** Intent: the Web Storage areas' lengths and the IndexedDB databases this origin holds. */
function readWebStorage(page: Page) {
  return page.evaluate(async () => {
    const databases = (await indexedDB.databases?.()) ?? []
    return {
      localStorageLength: localStorage.length,
      sessionStorageLength: sessionStorage.length,
      indexedDbDatabaseNames: databases.map((db) => db.name),
    }
  })
}

/** The app's stores other than the settings, which hold no record for a phrase or a failure. */
const NON_SETTINGS_STORES = [
  'instrument',
  'controller',
  'sessionSummaries',
  'sessionBodies',
  'playedNotes',
] as const

/** Intent: how many records each store but the settings holds, read through the harness's seam. */
function nonSettingsRecordCounts(page: Page): Promise<Record<string, number>> {
  return page.evaluate(async (stores) => {
    const counts: Record<string, number> = {}
    for (const store of stores) {
      counts[store] = (await window.__workspaceHarness.storage.records(store)).length
    }
    return counts
  }, NON_SETTINGS_STORES)
}

/** Every store but the settings, empty. */
const NO_RECORD = Object.fromEntries(NON_SETTINGS_STORES.map((store) => [store, 0]))

// @test-link [[specification_ephemeral_state_verification]]
// @test-link [[rule_ephemeral_session_state]]
// @test-link [[rule_settings_saved_on_change]]
test('customized controls and the instrument profile come back after a reload, a generated phrase does not, and Web Storage stays empty', async ({
  page,
}) => {
  await gotoWorkspace(page)
  await radio(page, 'Musical profile preset', 'Jazz').click()
  await radio(page, 'Register', 'Low').click()
  await generateAndAwaitReady(page)
  await radio(page, 'Instrument profile', 'E-flat alto saxophone').click()
  // The saves are asynchronous: the reload must read them, not race them.
  await expect
    .poll(() => databaseSettings(page))
    .toMatchObject({
      profileSelection: { musicalProfile: 'Jazz', isCustom: true },
      'controls.register': 'Low',
      'controls.instrumentProfileId': 'eb-alto',
    })

  const before = await readWebStorage(page)
  expect(before.localStorageLength).toBe(0)
  expect(before.sessionStorageLength).toBe(0)
  expect(before.indexedDbDatabaseNames).toEqual(['infinite-flow'])

  await page.reload()

  await expect(page.locator('.control-summary')).toHaveText(
    'C Ionian · Custom, based on Jazz · Lift · Shaped',
  )
  await expect(radio(page, 'Register', 'Low')).toHaveAttribute('aria-checked', 'true')
  await expect(radio(page, 'Instrument profile', 'E-flat alto saxophone')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(page.getByText('Generate a phrase to begin.')).toBeVisible()

  const after = await readWebStorage(page)
  expect(after.localStorageLength).toBe(0)
  expect(after.sessionStorageLength).toBe(0)
  expect(after.indexedDbDatabaseNames).toEqual(['infinite-flow'])
})

// @test-link [[specification_ephemeral_state_verification]]
test('a retryable generation failure does not survive a reload', async ({ page }) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [11])
  await failNextGeneration(page, 'no_legal_harmony_plan')

  await page.getByRole('button', { name: 'Generate phrase' }).click()
  await expect(page.locator('.generation-status')).toHaveText('Generation failed. Try again.')
  await expect(page.getByRole('button', { name: 'Retry generation' })).toBeVisible()

  const before = await readWebStorage(page)
  expect(before.localStorageLength).toBe(0)
  expect(before.sessionStorageLength).toBe(0)
  expect(await nonSettingsRecordCounts(page)).toEqual(NO_RECORD)

  await page.reload()

  await expect(page.getByText('Generate a phrase to begin.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate phrase' })).toBeVisible()
  await expect(page.locator('.inline-alert.alert-error')).toHaveCount(0)

  const after = await readWebStorage(page)
  expect(after.localStorageLength).toBe(0)
  expect(after.sessionStorageLength).toBe(0)
  await page.waitForFunction(() => typeof window.__workspaceHarness !== 'undefined')
  expect(await nonSettingsRecordCounts(page)).toEqual(NO_RECORD)
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
