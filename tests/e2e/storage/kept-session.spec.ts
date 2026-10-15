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
 * From chunk 10b, the reach: the Review's keep line says how the session is kept (not pinned once
 * saved; not saved after a refusal or with saving off, the Review working in full); a session
 * ended in its count-in brings `review-link` back to the most recent session, saved or held in
 * memory; after a reload `review-link` opens the readable kept session with the latest start.
 *
 * From chunk 27, a session cut short by the page going away (spec D309): reloaded after phrase 1
 * has sounded, it is never saved and the kept session stays; and after a `pagehide` that left the
 * page alive (as one the back-forward cache brings back), its Review reads not saved and nothing
 * is written; once a `pageshow` from the cache brings the page back (spec D328), the next session
 * that ends with a review is saved as any session is. The harness's page visibility is a fake that
 * does not follow the browser's, so a spec hides it from a `pagehide` listener added after the
 * app's, as the browser hides the page right after `pagehide`, in the same task, and shows it
 * again itself.
 *
 * A pinned session and an unreadable one are seeded through the harness's storage seam.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import {
  collectDownloads,
  expectIdleReady,
  expectReviewShowing,
  exportOnce,
  playUntilPhrase,
  reviewLink,
  reviewPanel,
  reviewTitle,
  sessionEndedAfter,
} from '../review/review-helpers'
import {
  readyToStart,
  sessionAction,
  sessionState,
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

/** The keep line's three wordings. */
const NOT_PINNED = 'Not pinned: deleted when your next session is saved.'
const PINNED = 'Pinned: kept until you unpin or delete it.'
const NOT_SAVED = 'Not saved on this device: export it to keep it.'

/** Intent: the Review's keep line. */
function keepLine(page: Page): Locator {
  return reviewPanel(page).locator('.review-keep-line')
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

/**
 * Intent: from now on, hide the harness's fake page right after each `pagehide` the app hears, as
 * the browser fires `visibilitychange` to hidden right after it.
 */
function hideOnPageHide(page: Page): Promise<void> {
  return page.evaluate(() => {
    window.addEventListener('pagehide', () => window.__workspaceHarness.page.setHidden(true))
  })
}

/** Intent: close the Review shown, then start a session and play until phrase 1 has sounded. */
async function nextSessionSounded(page: Page): Promise<void> {
  await expectIdleReady(page)
  await sessionAction(page).click()
  await startSession(page)
  await playUntilPhrase(page, 1)
}

/**
 * Intent: close the Review shown, then play a session until phrase `phrases` sounds and Stop it.
 */
async function nextSessionEnded(page: Page, phrases = 1): Promise<void> {
  await expectIdleReady(page)
  await sessionAction(page).click()
  await startSession(page)
  await playUntilPhrase(page, phrases)
  await sessionAction(page).click()
  await expectReviewShowing(page, phrases)
}

/** Intent: close the Review shown, then start a session and Stop it during its count-in. */
async function countInEnded(page: Page): Promise<void> {
  await expectIdleReady(page)
  await sessionAction(page).click()
  await startSession(page)
  await toCountInMiddle(page)
  await sessionAction(page).click()
  await expect(sessionAction(page)).toHaveText('Start session')
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
  await expect(keepLine(page)).toHaveText(NOT_PINNED)
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
  // review-link returns to the most recent session, saved.
  await reviewLink(page).click()
  await expect(reviewTitle(page)).toBeFocused()
  await expect(keepLine(page)).toHaveText(NOT_PINNED)
  expect((await sessionState(page)).review).toEqual({ showing: true, phraseCount: 1 })
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
      await expect(keepLine(page)).toHaveText(NOT_SAVED)
      expect(await keptKeys(page)).toEqual([])
      // The Review works in full, in memory.
      const file = await exportOnce(page, collectDownloads(page))
      expect(file.bytes.length).toBeGreaterThan(0)

      // Held in memory only, it stays the most recent session across a count-in end.
      await countInEnded(page)
      await reviewLink(page).click()
      await expect(reviewTitle(page)).toBeFocused()
      await expect(keepLine(page)).toHaveText(NOT_SAVED)
      expect((await sessionState(page)).mostRecent).toEqual({
        kind: 'held',
        phraseCount: 1,
        keeping: 'not-saved',
      })
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
      await expect(keepLine(page)).toHaveText(NOT_SAVED)
      await page.waitForTimeout(SETTLE_MS)

      expect(await portChanges(page)).toBe(0)
      await expect(keepLine(page)).toHaveText(NOT_SAVED)
      await reloadHarness(page)
      expect(await keptKeys(page)).toEqual(kept)
    })
  }
})

// @test-link [[module_kept_session_save]]
// @test-link [[rule_most_recent_session_kept]]
// @test-link [[req_kept_session_review]]
test('after a reload, review-link opens the readable kept session with the latest start', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await gotoStorageHarness(page)
  // Three sessions: two pinned (one phrase, then two), then an unpinned one, deleted elsewhere.
  await sessionEndedAfter(page, 1)
  const [first] = await untilKept(page, 1)
  await page.evaluate((key) => window.__workspaceHarness.storage.pinKeptSession(key), first ?? '')
  await nextSessionEnded(page, 2)
  const second = (await untilKept(page, 2)).find((key) => key !== first)
  await page.evaluate((key) => window.__workspaceHarness.storage.pinKeptSession(key), second ?? '')
  await nextSessionEnded(page, 1)
  const third = (await untilKept(page, 3)).find((key) => key !== first && key !== second)
  await page.evaluate(
    (key) => window.__workspaceHarness.storage.deleteKeptSession(key),
    third ?? '',
  )
  await page.evaluate(
    (key) => window.__workspaceHarness.storage.seedUnreadableKeptSession(key),
    'session-9999999999999-1',
  )

  await reloadHarness(page)

  expect((await sessionState(page)).mostRecent).toEqual({ kind: 'kept', key: second })
  await expect(reviewLink(page)).toBeVisible()
  await reviewLink(page).click()
  await expect(reviewTitle(page)).toBeFocused()
  await expect(reviewTitle(page)).toHaveText('Last session')
  await expect(keepLine(page)).toHaveText(PINNED)
  expect((await sessionState(page)).review).toEqual({ showing: true, phraseCount: 2 })
})

// @test-link [[module_kept_session_save]]
// @test-link [[rule_most_recent_session_kept]]
// @test-link [[req_rolling_practice_session]]
test.describe('a session cut short by the page going away', () => {
  test('reloaded after phrase 1 has sounded: no new kept session, the kept one stays and opens', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await sessionEndedAfter(page, 1)
    const kept = await untilKept(page, 1)
    const summaries = await keyedRecords(page, 'sessionSummaries')
    await nextSessionSounded(page)
    await hideOnPageHide(page)

    await reloadHarness(page)

    expect(await keyedRecords(page, 'sessionSummaries')).toEqual(summaries)
    expect((await keyedRecords(page, 'sessionBodies')).map(({ key }) => key)).toEqual(kept)
    expect((await sessionState(page)).mostRecent).toEqual({ kind: 'kept', key: kept[0] })
    await reviewLink(page).click()
    await expect(reviewTitle(page)).toBeFocused()
    await expect(keepLine(page)).toHaveText(NOT_PINNED)
    expect((await sessionState(page)).review).toEqual({ showing: true, phraseCount: 1 })
  })

  test('a pagehide that leaves the page alive: the Review reads not saved and nothing is written, then the page back saves the next session', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await installTransactionSpy(page)
    await gotoStorageHarness(page)
    await sessionEndedAfter(page, 1)
    const kept = await untilKept(page, 1)
    await nextSessionSounded(page)
    await hideOnPageHide(page)

    await setPhase(page, 'leaving')
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')))
    await expectReviewShowing(page, 1)
    await expect(keepLine(page)).toHaveText(NOT_SAVED)
    await page.waitForTimeout(SETTLE_MS)

    expect(await transactionsIn(page, 'leaving')).toEqual([])
    await expect(page.locator('.app-notice-row')).toHaveCount(0)
    await expect(keepLine(page)).toHaveText(NOT_SAVED)
    expect(await keptKeys(page)).toEqual(kept)

    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
      window.__workspaceHarness.page.setHidden(false)
    })
    await nextSessionEnded(page)

    await expect(keepLine(page)).toHaveText(NOT_PINNED)
    await expect.poll(async () => (await keptKeys(page)).some((key) => key !== kept[0])).toBe(true)
    expect(await keptKeys(page)).toHaveLength(1)
  })
})
