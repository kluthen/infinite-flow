/**
 * v3.0 chunk 24b, a stale phrase 1 at Start (master spec §16), on the workspace harness's fake
 * audio clock and fake MIDI access. With the Written key changed at Idle after phrase 1 was made,
 * Start opens the stale-phrase prompt and nothing sounds; `Start with this phrase` runs the
 * count-in from phrase 1 as it was, phrase 2 is made in the new key, and the controls show phrase
 * 1's key until phrase 2 sounds; the Review shows phrase 1 in its own key and phrase 2 in the new
 * one. `Regenerate phrase` makes a new phrase at Idle and starts nothing, and the next Start asks
 * nothing; dismissing leaves Idle. With no change, or only a tempo change, Start starts at once.
 * The starting note opens the same prompt and starts nothing, and no note played while it shows
 * starts anything. It passes with pre-generation on and off, whichever lane runs it.
 */
import { expect, test, type ConsoleMessage, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import { harnessSnapshot } from '../release/harness-helpers'
import { collectDownloads, exportOnce } from '../review/review-helpers'
import { toBarline, untilReady } from '../session/rolling-helpers'
import {
  countInClickTimes,
  gotoSessionHarness,
  lockCounts,
  phraseAction,
  readyToStart,
  sessionAction,
  sessionState,
} from '../session/session-helpers'
import {
  KEYS,
  connectDevice,
  firstAttack,
  idleTimeline,
  startLine,
  tap,
} from '../session/session-midi-helpers'
import { radio } from './helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: the stale-phrase prompt. */
function prompt(page: Page) {
  return page.getByRole('alertdialog', { name: 'This phrase is from before your changes' })
}

/** Intent: one of the prompt's buttons by its label. */
function promptButton(page: Page, label: string) {
  return prompt(page).getByRole('button', { name: label, exact: true })
}

/** Intent: the Written key option checked now, as the control shows it. */
async function expectWrittenKey(page: Page, label: string): Promise<void> {
  await expect(radio(page, 'Written key', label)).toHaveAttribute('aria-checked', 'true')
}

/** Intent: the console's phrase replay key lines from now on. */
function replayKeyLines(page: Page): string[] {
  const lines: string[] = []
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'info' && message.text().includes('phrase replay key'))
      lines.push(message.text())
  })
  return lines
}

/**
 * Intent: the written keys of the requests joining a phrase before (a carry-in), made from call
 * `from` on: phrase 2 and later, pre-generated at Idle or requested by the session.
 */
async function joinedKeysFrom(page: Page, from: number): Promise<string[]> {
  const records = await page.evaluate(() => window.__workspaceHarness.generationRequests())
  return records
    .slice(from)
    .filter((record) => record.carryIn)
    .map((record) => record.writtenTonalCenter)
}

/**
 * Intent: at Ready with phrase 1 made in C, change the Written key to D at Idle; returns how many
 * generate calls were made before the change. Pre-generation may still be making phrases in C at
 * Idle, so the count is read in the page as the click reaches it, before the control handles it:
 * no call can land between the count and the change.
 */
async function staleAtReady(page: Page): Promise<number> {
  await readyToStart(page)
  await expectWrittenKey(page, 'C')
  const mark = await page.evaluateHandle(() => {
    const atChange = { requests: -1 }
    window.addEventListener(
      'click',
      () => {
        atChange.requests = window.__workspaceHarness.generationRequests().length
      },
      { capture: true, once: true },
    )
    return atChange
  })
  await radio(page, 'Written key', 'D').click()
  await expectWrittenKey(page, 'D')
  const before = await mark.evaluate((atChange) => atChange.requests)
  await mark.dispose()
  expect(before).toBeGreaterThan(0)
  return before
}

/** Intent: the written key of the generate call that made each played phrase from phrase 2 on. */
async function playedKeysFromPhraseTwo(page: Page): Promise<(string | undefined)[]> {
  const records = await page.evaluate(() => window.__workspaceHarness.generationRequests())
  const phrases = (await sessionState(page)).lastHistoryPhrases ?? []
  return phrases
    .filter((phrase) => phrase.phraseNumber >= 2)
    .map((phrase) => records.find((record) => record.timeline === phrase.timeline))
    .map((record) => record?.writtenTonalCenter)
}

/** Intent: nothing of a start happened: Idle, no count-in click, no lock asked for. */
async function expectNothingStarted(page: Page): Promise<void> {
  expect((await sessionState(page)).phase).toBe('idle')
  await expect(sessionAction(page)).toHaveText('Start session')
  expect(await countInClickTimes(page)).toEqual([])
  const locks = await lockCounts(page)
  expect([locks.wake.requests, locks.orientation.requests]).toEqual([0, 0])
}

// @test-link [[rule_stale_phrase_prompt_at_start]]
// @test-link [[service_workspace_session_flow]]
test.describe('a stale phrase 1 at Start', () => {
  // @test-link [[rule_stale_phrase_prompt_at_start]]
  // @test-link [[module_session_shown_settings]]
  // @test-link [[rule_phrase_one_is_idle_phrase]]
  test('asks, then Start with this phrase plays phrase 1 as it was and phrase 2 in the new key', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const lines = replayKeyLines(page)
    const downloads = collectDownloads(page)
    await gotoSessionHarness(page)
    const beforeChange = await staleAtReady(page)
    const phraseOne = await idleTimeline(page)
    const idleLines = lines.length

    await sessionAction(page).click()

    await expect(prompt(page)).toBeVisible()
    await expect(prompt(page)).toContainText('Since it was made, you changed Written key.')
    await expect(promptButton(page, 'Regenerate phrase')).toBeFocused()
    await expectNothingStarted(page)

    await promptButton(page, 'Start with this phrase').click()

    await expect(prompt(page)).toHaveCount(0)
    await expect(sessionAction(page)).toHaveText('Stop')
    await expect(sessionAction(page)).toBeFocused()
    expect((await sessionState(page)).phase).toBe('count-in')
    expect((await countInClickTimes(page)).length).toBeGreaterThan(0)
    expect((await harnessSnapshot(page)).timeline).toBe(phraseOne)
    await expectWrittenKey(page, 'C')

    await untilReady(page, 2)
    await toBarline(page, 1, 3)
    await expectWrittenKey(page, 'C')
    await toBarline(page, 2, 0)
    await expectWrittenKey(page, 'D')
    await untilReady(page, 3)
    // Phrase 2 on is made under the session's settings, pre-generated at Idle or requested now:
    // every call made from the change on that joins a phrase before is in D.
    const joinedKeys = await joinedKeysFrom(page, beforeChange)
    expect(joinedKeys.length).toBeGreaterThan(0)
    expect(new Set(joinedKeys)).toEqual(new Set(['D']))
    const sessionLines = lines.slice(idleLines)
    expect(sessionLines.some((line) => line.includes('workspace phrase'))).toBe(false)
    expect(sessionLines.some((line) => line.includes('session phrase 1 '))).toBe(false)

    await sessionAction(page).click()
    await expect(sessionAction(page)).toHaveText('Close review')
    // And every phrase played from phrase 2 on was made in D.
    const playedKeys = await playedKeysFromPhraseTwo(page)
    expect(playedKeys.length).toBeGreaterThan(0)
    expect(new Set(playedKeys)).toEqual(new Set(['D']))
    const [first] = (await sessionState(page)).lastHistoryPhrases ?? []
    expect(first?.timeline).toBe(phraseOne)
    const musicXml = (await exportOnce(page, downloads)).bytes.toString('utf8')
    const fifths = [...musicXml.matchAll(/<fifths>(-?\d+)<\/fifths>/gu)].map((match) =>
      Number(match[1]),
    )
    // Phrase 1 in C, phrase 2 in D: two more sharps, as written or as sounding alike.
    expect(fifths.length).toBeGreaterThan(1)
    expect(fifths.at(-1)! - fifths[0]!).toBe(2)
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  test('Regenerate phrase makes a new phrase at Idle and starts nothing; the next Start asks nothing', async ({
    page,
  }) => {
    await gotoSessionHarness(page)
    await staleAtReady(page)
    const phraseOne = await idleTimeline(page)
    await sessionAction(page).click()
    await expect(prompt(page)).toBeVisible()

    await promptButton(page, 'Regenerate phrase').click()

    await expect(prompt(page)).toHaveCount(0)
    await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/, { timeout: 30_000 })
    await expect(sessionAction(page)).toBeEnabled()
    expect(await idleTimeline(page)).not.toBe(phraseOne)
    await expectNothingStarted(page)
    await expectWrittenKey(page, 'D')

    await sessionAction(page).click()

    await expect(prompt(page)).toHaveCount(0)
    await expect(sessionAction(page)).toHaveText('Stop')
    await sessionAction(page).click()
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  test('Close and Escape leave Idle as it was, focus on Start session; the next Start asks again', async ({
    page,
  }) => {
    await gotoSessionHarness(page)
    await staleAtReady(page)
    const phraseOne = await idleTimeline(page)

    await sessionAction(page).click()
    await promptButton(page, 'Close').click()
    await expect(prompt(page)).toHaveCount(0)
    await expect(sessionAction(page)).toBeFocused()
    await sessionAction(page).click()
    await expect(prompt(page)).toBeVisible()
    await page.keyboard.press('Escape')

    await expect(prompt(page)).toHaveCount(0)
    await expectNothingStarted(page)
    expect(await idleTimeline(page)).toBe(phraseOne)
    await expectWrittenKey(page, 'D')
    await expect(phraseAction(page)).toHaveText('Regenerate phrase')
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  // @test-link [[rule_tempo_never_affects_generation]]
  test('with no change, or only a tempo change, Start starts at once', async ({ page }) => {
    await gotoSessionHarness(page)
    await readyToStart(page)
    await sessionAction(page).click()
    await expect(sessionAction(page)).toHaveText('Stop')
    await expect(prompt(page)).toHaveCount(0)
    await sessionAction(page).click()
    await expect(sessionAction(page)).toHaveText('Start session')

    await page.getByRole('button', { name: 'Increase tempo' }).click()
    await sessionAction(page).click()

    await expect(prompt(page)).toHaveCount(0)
    await expect(sessionAction(page)).toHaveText('Stop')
    await sessionAction(page).click()
  })
})

// @test-link [[rule_stale_phrase_prompt_at_start]]
// @test-link [[rule_midi_starting_note]]
test.describe('a stale phrase 1 at the starting note', () => {
  // @test-link [[rule_midi_starting_note]]
  // @test-link [[module_session_starting_note]]
  test('opens the prompt and starts nothing; no note played while it shows starts anything', async ({
    page,
  }) => {
    await gotoSessionHarness(page)
    await connectDevice(page, KEYS)
    await staleAtReady(page)
    const { pitch } = await firstAttack(page)
    await expect(startLine(page)).toBeVisible()

    await tap(page, KEYS, pitch)

    await expect(prompt(page)).toBeVisible()
    await expect(prompt(page)).toContainText(
      "Your note didn't start the session. Nothing you play will until you choose.",
    )
    await expect(prompt(page).locator('.sheet-hint')).toHaveText(
      'A new phrase may start on a different note: the line above the staff names it.',
    )
    await expect(startLine(page)).toHaveCount(0)
    await tap(page, KEYS, pitch)
    await tap(page, KEYS, pitch + 1)
    await expectNothingStarted(page)
    expect((await sessionState(page)).startingNote).toBeNull()

    await promptButton(page, 'Close').click()

    await expect(startLine(page)).toBeVisible()
    await expectNothingStarted(page)
  })
})
