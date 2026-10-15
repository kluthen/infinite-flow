/**
 * v3.0 chunk 12, the comment on a session in its Review, on the workspace harness (port 4175)
 * with its fake audio clock, over the browser's real IndexedDB; each test starts from an empty
 * browser context and plays a two-phrase session, then Stop:
 *
 * - `Add a comment` opens the editor, focus in the field; a paste of 600 characters keeps 500;
 *   `Done` saves it and returns focus to `Edit comment`; it survives a reload;
 * - the field losing focus saves it, the editor staying open; `Close review` with the editor open
 *   saves it too; an emptied comment is removed;
 * - in a session whose save failed, a comment retries the session's own save; once saved, the
 *   keep line takes its not-pinned wording.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import {
  expectReviewShowing,
  playUntilPhrase,
  reviewLink,
  reviewPanel,
  reviewTitle,
} from './review-helpers'
import { readyToStart, sessionAction, startSession } from '../session/session-helpers'
import { gotoStorageHarness, reloadHarness } from '../storage/storage-helpers'

/** One record a store holds, with its key. */
interface KeyedRecord {
  readonly key: string
  readonly value: unknown
}

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: the comment stored with the one kept session; null while none is kept. */
async function storedComment(page: Page): Promise<string | null> {
  const summaries: KeyedRecord[] = await page.evaluate(() =>
    window.__workspaceHarness.storage.keyedRecords('sessionSummaries'),
  )
  if (summaries.length !== 1) return null
  return (summaries[0]!.value as { readonly comment: string }).comment
}

/** Intent: from Idle, play a two-phrase session, then Stop: the Review shows. */
async function playSession(page: Page): Promise<void> {
  await readyToStart(page, 7)
  await startSession(page)
  await playUntilPhrase(page, 2)
  await sessionAction(page).click()
  await expectReviewShowing(page, 2)
}

/** Intent: the comment row's button named `name`. */
function commentButton(page: Page, name: string): Locator {
  return reviewPanel(page).locator('.review-comment').getByRole('button', { name, exact: true })
}

/** Intent: the comment's field, named "Comment". */
function commentField(page: Page): Locator {
  return reviewPanel(page).getByRole('textbox', { name: 'Comment', exact: true })
}

// @test-link [[rule_session_comment]]
test.describe('the comment', () => {
  test('a paste of 600 characters keeps 500; Done saves it; it survives a reload', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await playSession(page)
    await expect.poll(() => storedComment(page)).toBe('')

    await commentButton(page, 'Add a comment').click()
    await expect(commentField(page)).toBeFocused()
    await expect(reviewPanel(page).locator('.field-count')).toHaveText('0/500')
    await page.keyboard.insertText(`${'a'.repeat(300)}\n${'b'.repeat(299)}`)
    await expect(commentField(page)).toHaveValue(`${'a'.repeat(300)}\n${'b'.repeat(199)}`)
    await expect(reviewPanel(page).locator('.field-count')).toHaveText('500/500')

    await commentButton(page, 'Done').click()
    await expect(commentButton(page, 'Edit comment')).toBeFocused()
    const kept = `${'a'.repeat(300)}\n${'b'.repeat(199)}`
    await expect(reviewPanel(page).locator('.review-comment > p')).toHaveText(kept)
    await expect.poll(() => storedComment(page)).toBe(kept)

    await reloadHarness(page)
    await reviewLink(page).click()
    await expect(reviewTitle(page)).toBeFocused()
    await expect(reviewPanel(page).locator('.review-comment > p')).toHaveText(kept)
  })

  test('saves on blur and when the Review is left with the editor open; an emptied one is removed', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await playSession(page)

    await commentButton(page, 'Add a comment').click()
    await page.keyboard.insertText('  Slower next time.  ')
    await page.keyboard.press('Tab')
    await expect(commentField(page)).toBeVisible()
    await expect.poll(() => storedComment(page)).toBe('Slower next time.')

    await commentField(page).fill('Then faster.')
    await sessionAction(page).click()
    await expect(reviewPanel(page)).toHaveCount(0)
    await expect.poll(() => storedComment(page)).toBe('Then faster.')

    await reviewLink(page).click()
    await expect(reviewPanel(page).locator('.review-comment > p')).toHaveText('Then faster.')
    await commentButton(page, 'Edit comment').click()
    await commentField(page).fill('   ')
    await commentField(page).press('Escape')
    await expect(commentButton(page, 'Add a comment')).toBeFocused()
    await expect.poll(() => storedComment(page)).toBe('')
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  test("in a session whose save failed, retries the session's own save", async ({ page }) => {
    test.setTimeout(120_000)
    await gotoStorageHarness(page)
    await readyToStart(page, 7)
    await startSession(page)
    await playUntilPhrase(page, 2)
    await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves('quota'))
    await sessionAction(page).click()
    await expectReviewShowing(page, 2)
    const keepLine = reviewPanel(page).locator('.review-keep-line')
    await expect(keepLine).toHaveText('Not saved on this device: export it to keep it.')
    await page.evaluate(() => window.__workspaceHarness.storage.refuseSaves(null))

    await commentButton(page, 'Add a comment').click()
    await page.keyboard.insertText('Kept now.')
    await commentButton(page, 'Done').click()

    await expect(keepLine).toHaveText('Not pinned: deleted when your next session is saved.')
    await expect.poll(() => storedComment(page)).toBe('Kept now.')
  })
})
