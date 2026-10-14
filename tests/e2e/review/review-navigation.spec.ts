/**
 * v2.0 chunk 20, moving in and out of the last-session Review on the workspace harness's fake
 * audio clock: `Close review` keeps it, scrolls the page to its top and moves focus by the idle
 * state the staff shows; `Review last session` shows it again, scrolled to the top, with focus on
 * its title. Since v3.0 chunk 10: the next session's start hides it with no confirmation while the
 * most recent session stays, so an end of that session during its count-in brings `review-link`
 * back to it; after a reload, `Review last session` opens the kept session, read by its key, with
 * the very notation and exports it had before.
 */
import { expect, test, type Page } from '@playwright/test'
import type { DownloadedFile, Downloads } from './review-helpers'

import { controllerStatus, watchPageErrors } from '../controller/controller-helpers'
import { holdGeneration, releaseGeneration } from '../release/harness-helpers'
import {
  cueRow,
  gotoSessionHarness,
  phraseAction,
  sessionAction,
  sessionState,
  startSession,
  toCountInMiddle,
} from '../session/session-helpers'
import {
  collectDownloads,
  expectIdleReady,
  exportOnce,
  pickFormat,
  reviewItems,
  reviewLink,
  reviewPanel,
  reviewTitle,
  sessionEndedAfter,
  staffViewport,
} from './review-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
  // Nothing in these moves asks for a confirmation.
  page.on('dialog', (dialog) => {
    throw new Error(`Unexpected ${dialog.type()} dialog: ${dialog.message()}`)
  })
})

test.afterEach(() => expectNoPageErrors())

/** Intent: scroll the page down by `y` px, instantly, and check it moved. */
async function scrollDown(page: Page, y = 200): Promise<void> {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
}

/** Intent: the page's scroll offset. */
function scrollY(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY)
}

// @test-link [[req_last_session_review]]
test.describe('leaving and reopening the Review', () => {
  // @test-link [[req_last_session_review]]
  test('Close review keeps it behind review-link; Review last session shows it again at the top', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await gotoSessionHarness(page)
    await sessionEndedAfter(page, 2)
    await expectIdleReady(page)

    // Close review from the keyboard, with the page scrolled down.
    await scrollDown(page)
    await page.keyboard.press('Enter')

    await expect(reviewPanel(page)).toHaveCount(0)
    expect(await scrollY(page)).toBe(0)
    await expect(staffViewport(page)).toBeVisible()
    await expect(page.locator('#score-panel-title')).toBeVisible()
    await expect(sessionAction(page)).toHaveText('Start session')
    await expect(sessionAction(page)).toBeEnabled()
    await expect(sessionAction(page)).toBeFocused()
    await expect(reviewLink(page)).toHaveAccessibleName('Review last session')
    await expect(reviewLink(page).locator('.cue-label-narrow')).toBeHidden()
    expect((await sessionState(page)).review).toEqual({ showing: false, phraseCount: 2 })

    // Review last session from the keyboard, with the page scrolled down.
    await reviewLink(page).focus()
    await scrollDown(page)
    await page.keyboard.press('Enter')

    await expect(reviewTitle(page)).toBeFocused()
    expect(await scrollY(page)).toBe(0)
    await expect(reviewLink(page)).toHaveCount(0)
    await expect(cueRow(page)).toBeHidden()
    await expect(sessionAction(page)).toHaveText('Close review')
    await expect(reviewPanel(page).locator('li.review-phrase')).toHaveCount(2)
    expect((await sessionState(page)).review).toEqual({ showing: true, phraseCount: 2 })
  })

  // @test-link [[req_last_session_review]]
  test('Close review while the next phrase still loads moves focus to controller-status', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await gotoSessionHarness(page)
    // The phrase the end asks for waits at the generation gate.
    await sessionEndedAfter(page, 1, 7, () => holdGeneration(page))
    expect((await page.evaluate(() => window.__workspaceHarness.snapshot())).operation).toBe(
      'generating',
    )

    await sessionAction(page).click()

    await expect(sessionAction(page)).toHaveText('Start session')
    await expect(sessionAction(page)).toBeDisabled()
    await expect(phraseAction(page)).toBeDisabled()
    await expect(controllerStatus(page)).toBeFocused()
    await expect(reviewLink(page)).toBeVisible()

    await releaseGeneration(page)
    await expectIdleReady(page)
    await expect(sessionAction(page)).toBeEnabled()
  })
})

/**
 * Intent: what each engraved review item draws, as markup, once every item is engraved; the
 * engraver's own element ids, numbered by a page-wide counter, are left out.
 */
async function reviewNotation(page: Page, count: number): Promise<string[]> {
  for (let index = 0; index < count; index += 1) {
    await expect(reviewItems(page).nth(index).locator('.review-staff svg').first()).toBeAttached({
      timeout: 30_000,
    })
  }
  return reviewItems(page).evaluateAll((items) =>
    items.map((item) =>
      [...item.querySelectorAll('.review-staff svg')]
        .map((svg) => svg.outerHTML.replace(/ id="vf-auto\d+"/g, ''))
        .join(''),
    ),
  )
}

/** Intent: the generated-notes export as MusicXML and as MIDI, from the Review showing. */
async function exportBoth(
  page: Page,
  downloads: Downloads,
  order: readonly ('MusicXML' | 'MIDI')[],
): Promise<Record<string, DownloadedFile>> {
  const files: Record<string, DownloadedFile> = {}
  for (const format of order) {
    await pickFormat(page, format)
    files[format] = await exportOnce(page, downloads)
  }
  return files
}

/**
 * Intent: before any page script runs, count each transaction the page opens over the kept
 * sessions' bodies in `window.__bodyReads`.
 */
async function countBodyReads(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const counted = window as unknown as { __bodyReads: number }
    counted.__bodyReads = 0
    const original = IDBDatabase.prototype.transaction
    IDBDatabase.prototype.transaction = function (
      this: IDBDatabase,
      ...args: Parameters<IDBDatabase['transaction']>
    ) {
      const [stores, mode] = args
      if ([stores].flat().includes('sessionBodies') && (mode ?? 'readonly') === 'readonly') {
        counted.__bodyReads += 1
      }
      return original.apply(this, args)
    }
  })
}

/** Intent: how many read transactions over the kept sessions' bodies the page has opened. */
function bodyReads(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __bodyReads: number }).__bodyReads)
}

// @test-link [[rule_new_session_discards_review]]
// @test-link [[rule_most_recent_session_kept]]
test.describe('the next session and the most recent one', () => {
  // @test-link [[rule_new_session_discards_review]]
  // @test-link [[rule_most_recent_session_kept]]
  test('the next session start hides the Review with no confirmation; its count-in end brings review-link back to it', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await gotoSessionHarness(page)
    await sessionEndedAfter(page, 2)
    await expectIdleReady(page)
    await sessionAction(page).click()
    await expect(reviewLink(page)).toBeVisible()

    await startSession(page)

    await expect(reviewLink(page)).toHaveCount(0)
    await expect(reviewPanel(page)).toHaveCount(0)
    expect((await sessionState(page)).review).toBeNull()
    expect((await sessionState(page)).mostRecent).toMatchObject({ kind: 'held', phraseCount: 2 })

    await toCountInMiddle(page)
    await sessionAction(page).click()

    await expect(sessionAction(page)).toHaveText('Start session')
    await expect(sessionAction(page)).toBeFocused()
    await expect(reviewPanel(page)).toHaveCount(0)
    await expect(reviewLink(page)).toBeVisible()
    const state = await sessionState(page)
    expect(state.lastEnd).toEqual({ cause: 'stop', phase: 'count-in', soundedPhraseCount: 0 })
    expect(state.review).toBeNull()

    await reviewLink(page).click()

    await expect(reviewTitle(page)).toBeFocused()
    await expect(reviewPanel(page).locator('li.review-phrase')).toHaveCount(2)
    expect((await sessionState(page)).review).toEqual({ showing: true, phraseCount: 2 })
  })
})

// @test-link [[req_kept_session_review]]
// @test-link [[module_kept_session_save]]
test.describe('after a reload', () => {
  // @test-link [[req_kept_session_review]]
  // @test-link [[req_last_session_review]]
  // @test-link [[module_kept_session_save]]
  // @test-link [[module_review_export_pipeline]]
  test('Review last session opens the kept session, read by its key: the same notation and exports', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await countBodyReads(page)
    await gotoSessionHarness(page)
    await sessionEndedAfter(page, 2)
    const notation = await reviewNotation(page, 2)
    const before = await exportBoth(page, collectDownloads(page), ['MusicXML', 'MIDI'])
    await expect
      .poll(
        async () =>
          (
            await page.evaluate(() =>
              window.__workspaceHarness.storage.keyedRecords('sessionBodies'),
            )
          ).length,
      )
      .toBe(1)

    await page.reload()
    await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)

    await expect(reviewPanel(page)).toHaveCount(0)
    await expect(reviewLink(page)).toBeVisible()
    const [kept] = await page.evaluate(() =>
      window.__workspaceHarness.storage.keyedRecords('sessionSummaries'),
    )
    const state = await sessionState(page)
    expect(state.review).toBeNull()
    expect(state.lastEnd).toBeNull()
    expect(state.mostRecent).toEqual({ kind: 'kept', key: kept?.key })
    const readsBefore = await bodyReads(page)

    await reviewLink(page).click()

    await expect(reviewTitle(page)).toBeFocused()
    await expect(reviewTitle(page)).toHaveText('Last session')
    await expect(reviewPanel(page).locator('.review-keep-line')).toHaveText(
      'Not pinned: deleted when your next session is saved.',
    )
    expect(await bodyReads(page)).toBe(readsBefore + 1)
    expect((await sessionState(page)).review).toEqual({ showing: true, phraseCount: 2 })
    expect(await reviewNotation(page, 2)).toEqual(notation)
    // The format saved last (MIDI) comes back with the Review.
    const after = await exportBoth(page, collectDownloads(page), ['MIDI', 'MusicXML'])
    for (const format of ['MusicXML', 'MIDI']) {
      expect(after[format]?.fileName, format).toBe(before[format]?.fileName)
      expect(after[format]?.bytes.equals(before[format]!.bytes), format).toBe(true)
    }

    // Held in memory once read: closing and showing it again reads nothing more.
    await sessionAction(page).click()
    await reviewLink(page).click()
    await expect(reviewTitle(page)).toBeFocused()
    expect(await bodyReads(page)).toBe(readsBefore + 1)
  })

  // @test-link [[req_kept_session_review]]
  test('a Review showing at the reload is not showing after it; review-link opens it', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await gotoSessionHarness(page)
    await sessionEndedAfter(page, 1)
    await expect
      .poll(
        async () =>
          (
            await page.evaluate(() =>
              window.__workspaceHarness.storage.keyedRecords('sessionBodies'),
            )
          ).length,
      )
      .toBe(1)

    await page.reload()
    await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)

    await expect(reviewPanel(page)).toHaveCount(0)
    await expect(sessionAction(page)).toHaveText('Start session')
    await reviewLink(page).click()
    await expect(reviewTitle(page)).toBeFocused()
    expect((await sessionState(page)).review).toEqual({ showing: true, phraseCount: 1 })
  })
})
