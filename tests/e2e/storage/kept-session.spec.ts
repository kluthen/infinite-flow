/**
 * v3.0 chunk 10a, the session's own save, on the workspace harness (port 4175) with its fake audio
 * clock, over the browser's real IndexedDB; each test starts from an empty browser context:
 *
 * - a transaction spy sees nothing from Start to the session's end; then, at an end with a review,
 *   the settings changed during the session in a transaction of their own (none when nothing
 *   changed), the read of the kept summaries, and one transaction for the session;
 * - each save keeps the session under `session-{startedAt}-{sessionSeed}` and deletes every
 *   readable kept session that is not pinned: a pinned one and an unreadable one survive;
 * - a session ended in its count-in changes nothing kept;
 * - a refused save never delays the end: an `other` refusal raises no notice, a `quota` one the
 *   storage-full notice;
 * - with saving off (an outdated tab, a visit started from the defaults) the end writes and deletes
 *   nothing, and every kept session is still there after a reload.
 *
 * A pinned session and an unreadable one are seeded through the harness's storage seam.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import {
  expectIdleReady,
  expectReviewShowing,
  playUntilPhrase,
  sessionEndedAfter,
} from '../review/review-helpers'
import {
  readyToStart,
  sessionAction,
  startSession,
  toCountInMiddle,
  toRunning,
} from '../session/session-helpers'
import { radio } from '../workspace/helpers'
import { gotoStorageHarness, reloadHarness } from './storage-helpers'

/** One transaction the page opened, and the phase the test was in when it did. */
interface SeenTransaction {
  readonly mode: string
  readonly stores: string
  readonly phase: string
}

/** One record a store holds, with its key. */
interface KeyedRecord {
  readonly key: string
  readonly value: unknown
}

declare global {
  interface Window {
    __phase?: string
    __transactions?: SeenTransaction[]
  }
}

const STORAGE_FULL =
  "This device has no room left for the app's data, so something couldn't be saved. Deleting sessions you no longer need frees space."

/** How long a save, or a notice it raises, takes at most to land on this harness. */
const SETTLE_MS = 300

/** The key a seeded unreadable kept session is stored under. */
const UNREADABLE_KEY = 'session-1-1'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/**
 * Intent: before any page script runs, wrap `IDBDatabase.prototype.transaction` so each
 * transaction opened is recorded in `window.__transactions` with its mode, its stores in name
 * order and the phase the test set in `window.__phase`.
 */
async function installTransactionSpy(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__phase = 'load'
    window.__transactions = []
    const original = IDBDatabase.prototype.transaction
    IDBDatabase.prototype.transaction = function (
      this: IDBDatabase,
      ...args: Parameters<IDBDatabase['transaction']>
    ) {
      const [stores, mode] = args
      window.__transactions?.push({
        mode: mode ?? 'readonly',
        stores: [stores].flat().sort().join(','),
        phase: window.__phase ?? '',
      })
      return original.apply(this, args)
    }
  })
}

/** Intent: mark the transactions opened from now on with `phase`. */
function setPhase(page: Page, phase: string): Promise<void> {
  return page.evaluate((value) => {
    window.__phase = value
  }, phase)
}

/** Intent: the transactions the spy saw in `phase`, in order, as `mode stores`. */
async function transactionsIn(page: Page, phase: string): Promise<string[]> {
  const seen = await page.evaluate(() => window.__transactions ?? [])
  return seen.filter((t) => t.phase === phase).map((t) => `${t.mode} ${t.stores}`)
}

/** Intent: every record of a store with its key, read through the harness's seam. */
function keyedRecords(
  page: Page,
  store: 'sessionSummaries' | 'sessionBodies' | 'playedNotes',
): Promise<KeyedRecord[]> {
  return page.evaluate((name) => window.__workspaceHarness.storage.keyedRecords(name), store)
}

/** Intent: the keys of the kept sessions' summaries. */
async function keptKeys(page: Page): Promise<string[]> {
  return (await keyedRecords(page, 'sessionSummaries')).map((record) => record.key)
}

/** Intent: the changes that reached the storage port since the load (the write spy). */
function portChanges(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.storage.portChanges())
}

/** Intent: the notice row's notices. */
function notices(page: Page): Locator {
  return page.locator('.layout-workspace > .app-notice-row > .app-notice')
}

/** Intent: wait until `count` kept sessions are stored, and give their keys. */
async function untilKept(page: Page, count: number): Promise<string[]> {
  await expect.poll(async () => (await keptKeys(page)).length).toBe(count)
  return keptKeys(page)
}

/** Intent: close the Review shown, then play a session until phrase 1 sounds and Stop it. */
async function nextSessionEnded(page: Page): Promise<void> {
  await expectIdleReady(page)
  await sessionAction(page).click()
  await startSession(page)
  await playUntilPhrase(page, 1)
  await sessionAction(page).click()
  await expectReviewShowing(page, 1)
}

/** Intent: the stored kept sessions, each as its key and whether it is pinned. */
async function keptPins(page: Page): Promise<string[]> {
  return (await keyedRecords(page, 'sessionSummaries')).map(
    ({ key, value }) => `${key} ${String((value as { pinned?: unknown }).pinned)}`,
  )
}

// @test-link [[module_kept_session_save]]
// @test-link [[rule_no_save_during_session]]
test.describe('the session saved at its end', () => {
  for (const changed of [true, false]) {
    test(`with ${changed ? 'a setting' : 'no setting'} changed during it: nothing from Start to the end, then ${changed ? 'the settings, then ' : ''}one transaction for the session`, async ({
      page,
    }) => {
      test.setTimeout(90_000)
      await installTransactionSpy(page)
      await gotoStorageHarness(page)
      await readyToStart(page)

      await setPhase(page, 'session')
      await startSession(page)
      await toRunning(page)
      if (changed) {
        await radio(page, 'Presentation theme', 'Dark').click()
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      }
      // A write the hold failed to hold would land within a few milliseconds of its change.
      await page.waitForTimeout(SETTLE_MS)
      expect(await transactionsIn(page, 'session')).toEqual([])

      await setPhase(page, 'ended')
      await sessionAction(page).click()
      const session = 'readwrite meta,sessionBodies,sessionSummaries'
      await expect
        .poll(async () => (await transactionsIn(page, 'ended')).includes(session))
        .toBe(true)
      await page.waitForTimeout(SETTLE_MS)
      expect(await transactionsIn(page, 'ended')).toEqual([
        ...(changed ? ['readwrite meta,settings'] : []),
        'readonly sessionSummaries',
        session,
      ])
    })
  }
})

// @test-link [[module_kept_session_save]]
// @test-link [[rule_most_recent_session_kept]]
// @test-link [[entity_kept_session_record]]
test('each save keeps one unpinned session under its key; pinned and unreadable ones survive', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await gotoStorageHarness(page)
  await sessionEndedAfter(page, 1)
  const [first] = await untilKept(page, 1)
  if (first === undefined) throw new Error('the first session was not kept')
  await page.evaluate((key) => window.__workspaceHarness.storage.pinKeptSession(key), first)
  await page.evaluate(
    (key) => window.__workspaceHarness.storage.seedUnreadableKeptSession(key),
    UNREADABLE_KEY,
  )

  await nextSessionEnded(page)
  const second = (await untilKept(page, 3)).find((key) => key !== first && key !== UNREADABLE_KEY)
  await nextSessionEnded(page)
  await expect.poll(async () => (await keptKeys(page)).includes(second ?? '')).toBe(false)

  const summaries = await keyedRecords(page, 'sessionSummaries')
  expect(summaries).toHaveLength(3)
  const third = summaries.find(({ key }) => key !== first && key !== UNREADABLE_KEY)
  expect(third?.key).not.toBe(second)
  expect(await keptPins(page)).toEqual(
    expect.arrayContaining([`${first} true`, `${third?.key} false`, `${UNREADABLE_KEY} undefined`]),
  )
  for (const { key, value } of summaries.filter((summary) => summary.key !== UNREADABLE_KEY)) {
    const { startedAt, sessionSeed } = value as { startedAt: number; sessionSeed: number }
    expect(key).toBe(`session-${startedAt}-${sessionSeed}`)
  }
  expect((await keyedRecords(page, 'sessionBodies')).map(({ key }) => key).sort()).toEqual(
    summaries.map(({ key }) => key).sort(),
  )
  expect(await keyedRecords(page, 'playedNotes')).toEqual([])
})

// @test-link [[module_kept_session_save]]
test('a session ended in its count-in changes nothing kept', async ({ page }) => {
  test.setTimeout(90_000)
  await installTransactionSpy(page)
  await gotoStorageHarness(page)
  await sessionEndedAfter(page, 1)
  await untilKept(page, 1)
  const kept = await keyedRecords(page, 'sessionSummaries')
  await expectIdleReady(page)
  await sessionAction(page).click()

  await setPhase(page, 'count-in')
  await startSession(page)
  await toCountInMiddle(page)
  await sessionAction(page).click()
  await expect(sessionAction(page)).toHaveText('Start session')
  await page.waitForTimeout(SETTLE_MS)

  expect(await transactionsIn(page, 'count-in')).toEqual([])
  await setPhase(page, 'check')
  expect(await keyedRecords(page, 'sessionSummaries')).toEqual(kept)
})

// @test-link [[module_kept_session_save]]
// @test-link [[rule_failed_save_never_disturbs_session]]
test.describe("a refusal of the session's save", () => {
  for (const kind of ['other', 'quota'] as const) {
    test(`as ${kind}: the end and the Review as usual, ${kind === 'quota' ? 'the storage-full notice' : 'no notice'}`, async ({
      page,
    }) => {
      test.setTimeout(90_000)
      await gotoStorageHarness(page)
      await readyToStart(page)
      await startSession(page)
      await playUntilPhrase(page, 1)
      await page.evaluate((refusal) => window.__workspaceHarness.storage.refuseSaves(refusal), kind)
      const before = await portChanges(page)

      await sessionAction(page).click()

      await expectReviewShowing(page, 1)
      await expect.poll(() => portChanges(page)).toBe(before + 1)
      await page.waitForTimeout(SETTLE_MS)
      if (kind === 'quota') {
        await expect(notices(page)).toHaveCount(1)
        await expect(notices(page).locator('p')).toHaveText(STORAGE_FULL)
      } else {
        await expect(page.locator('.app-notice-row')).toHaveCount(0)
      }
      await expectReviewShowing(page, 1)
      expect(await keptKeys(page)).toEqual([])
    })
  }
})

// @test-link [[module_kept_session_save]]
// @test-link [[rule_outdated_tab_stops_saving]]
// @test-link [[rule_first_phrase_waits_for_saved_settings]]
test.describe('with saving off', () => {
  for (const cause of ['an outdated tab', 'a visit started from the defaults'] as const) {
    test(`in ${cause}: the end writes and deletes nothing, and the kept session is still there after a reload`, async ({
      page,
    }) => {
      test.setTimeout(120_000)
      await gotoStorageHarness(page)
      await sessionEndedAfter(page, 1)
      const kept = await untilKept(page, 1)
      if (cause === 'an outdated tab') {
        await reloadHarness(page)
        await page.evaluate(() => window.__workspaceHarness.storage.openNewerVersion())
      } else {
        await gotoStorageHarness(page, '?storageRead=fail')
      }
      expect(await page.evaluate(() => window.__workspaceHarness.storage.savingState())).not.toBe(
        'on',
      )

      await sessionEndedAfter(page, 1)
      await page.waitForTimeout(SETTLE_MS)

      expect(await portChanges(page)).toBe(0)
      await reloadHarness(page)
      expect(await keptKeys(page)).toEqual(kept)
    })
  }
})
