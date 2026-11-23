/**
 * v3.4 chunk 2: the lexicon page and the browser's history and address (spec §E8), its loading,
 * and what it holds back while it shows. Every opening adds one `#lexicon` entry on top of the
 * bare address; Back closes the page and stays in the app; Close and Escape step back over the
 * entry; Forward onto it reopens the page adding no entry, except during a session or under an
 * open sheet, where only the address is replaced; a load or a reload at `#lexicon` and a typed
 * `#lexicon` replace the address, then open the page with its own entry, except during a session or
 * under a sheet, which keeps what was typed in it. A session started while the page's code loads
 * cancels the opening; a failed load shows the lexicon's notice, whose `Try again` loads again;
 * and while the page shows no MIDI note starts a session or a Jam, the starting note's line
 * hidden until it closes. On the production build (port 4173) where only the app is the subject,
 * on the workspace harness (port 4175: fake audio clock, fake MIDI, no service worker, so its
 * files can be held or refused on the network) where a session, MIDI or the network is.
 */
import { expect, test, type Page } from '@playwright/test'

import { KEYS } from '../controller/controller-helpers'
import { HOME_NOTE, gotoJamIdle, startJamByHomeNote } from '../session/jam-helpers'
import {
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
} from '../session/session-helpers'
import { connectDevice, firstAttack, startLine, tap } from '../session/session-midi-helpers'
import { nameField, openSheet, mySheet } from '../storage/my-instrument-sheet-helpers'
import { openYourData, sheetButton, yourDataSheet } from '../storage/your-data-helpers'
import { gotoWorkspace, radio } from './helpers'
import {
  LEXICON_LOAD_FAILED,
  LEXICON_PAGE_CHUNK,
  LEXICON_WORDS_CHUNK,
  addressHash,
  barButton,
  expectClosed,
  historyLength,
  holdFile,
  lexiconButton,
  lexiconNotice,
  lexiconNoticeButton,
  lexiconView,
  openLexicon,
  refuseFile,
  searchField,
  settleAWhile,
  watchFile,
} from './lexicon-page-helpers'

/** Assert the page did not open and the address is the bare one. */
async function expectNotOpened(page: Page): Promise<void> {
  await expect.poll(() => addressHash(page)).toBe('')
  await settleAWhile(page)
  await expect(lexiconView(page)).toHaveCount(0)
  expect(await addressHash(page)).toBe('')
}

/** Type `#lexicon` into the address bar, as a player does while the app is open. */
function typeLexiconAddress(page: Page): Promise<void> {
  return page.evaluate(() => {
    location.hash = 'lexicon'
  })
}

/** The stale-phrase prompt. */
function stalePrompt(page: Page) {
  return page.getByRole('alertdialog', { name: 'This phrase is from before your changes' })
}

/** At Ready, change the Written key, so that Start opens the stale-phrase prompt. */
async function staleAtReady(page: Page): Promise<void> {
  await readyToStart(page)
  await radio(page, 'Written key', 'D').click()
  await expect(radio(page, 'Written key', 'D')).toHaveAttribute('aria-checked', 'true')
}

/** Open the stale-phrase prompt by Start, nothing started. */
async function openStalePrompt(page: Page): Promise<void> {
  await sessionAction(page).click()
  await expect(stalePrompt(page)).toBeVisible()
  expect((await sessionState(page)).phase).toBe('idle')
}

/** Stop the session running, from its count-in. */
async function stopSession(page: Page): Promise<void> {
  await sessionAction(page).click()
  await expect.poll(async () => (await sessionState(page)).phase).toBe('idle')
}

// @test-link [[req_lexicon_page]]
// @test-link [[module_lexicon_page_history_entry]]
test("opening adds the page's one entry, and Back closes the page and stays in the app", async ({
  page,
}) => {
  await gotoWorkspace(page)
  const length = await historyLength(page)

  await openLexicon(page)
  expect(await historyLength(page)).toBe(length + 1)

  await page.goBack()
  await expectClosed(page)
  expect(new URL(page.url()).pathname).toBe('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Infinite Flow' })).toBeVisible()
})

// @test-link [[req_lexicon_page]]
// @test-link [[module_lexicon_page_history_entry]]
test('Close and Escape step back over the entry, and Forward reopens the page adding no entry', async ({
  page,
}) => {
  await gotoWorkspace(page)
  const length = await historyLength(page)
  await openLexicon(page)

  await barButton(page, 'Close').click()
  await expectClosed(page)
  expect(await historyLength(page)).toBe(length + 1)

  await page.goForward()
  await expect(lexiconView(page)).toBeVisible()
  expect(await addressHash(page)).toBe('#lexicon')
  expect(await historyLength(page)).toBe(length + 1)

  await searchField(page).press('Escape')
  await expectClosed(page)
  await page.goForward()
  await expect(lexiconView(page)).toBeVisible()
  await page.goBack()
  await expectClosed(page)
  expect(await historyLength(page)).toBe(length + 1)
})

// @test-link [[req_lexicon_page]]
// @test-link [[module_lexicon_page_history_entry]]
test('Forward onto the entry during a session, count-in included, only replaces the address', async ({
  page,
}) => {
  await gotoSessionHarness(page)
  await readyToStart(page)
  await openLexicon(page)
  await barButton(page, 'Close').click()
  await expectClosed(page)
  const length = await historyLength(page)
  await startSession(page)
  await expect(lexiconButton(page)).toBeDisabled()

  await page.goForward()

  await expectNotOpened(page)
  expect(await historyLength(page)).toBe(length)
  expect((await sessionState(page)).phase).toBe('count-in')
  await stopSession(page)
})

// @test-link [[req_lexicon_page]]
// @test-link [[module_lexicon_page_history_entry]]
test('Forward onto the entry under an open sheet only replaces the address, the sheet staying', async ({
  page,
}) => {
  await gotoSessionHarness(page)
  await openLexicon(page)
  await barButton(page, 'Close').click()
  await expectClosed(page)
  await openYourData(page)

  await page.goForward()

  await expectNotOpened(page)
  await expect(yourDataSheet(page)).toHaveAccessibleName('Your data')
  await expect(sheetButton(page, 'Done')).toBeFocused()
})

// @test-link [[req_lexicon_page]]
// @test-link [[module_lexicon_page_history_entry]]
test('a load or a reload at #lexicon replaces the address, then opens the page with its entry, fresh', async ({
  page,
}) => {
  await page.goto('/#lexicon')

  await expect(lexiconView(page)).toBeVisible()
  await expect(searchField(page)).toBeFocused()
  expect(await addressHash(page)).toBe('#lexicon')
  const length = await historyLength(page)
  // Back lands on the load's own entry, its address replaced with the bare one.
  await page.goBack()
  await expectClosed(page)
  expect(new URL(page.url()).pathname).toBe('/')
  expect(await historyLength(page)).toBe(length)

  await page.goForward()
  await expect(lexiconView(page)).toBeVisible()
  await searchField(page).fill('step')
  await page.reload()
  await expect(lexiconView(page)).toBeVisible()
  await expect(searchField(page)).toHaveValue('')
  expect(await addressHash(page)).toBe('#lexicon')
  await page.goBack()
  await expect(lexiconView(page)).toHaveCount(0)
  expect(await addressHash(page)).toBe('')
})

// @test-link [[req_lexicon_page]]
// @test-link [[module_lexicon_page_history_entry]]
test('#lexicon typed into the address bar is handled as a load: replaced, then the page opens', async ({
  page,
}) => {
  await gotoWorkspace(page)

  await typeLexiconAddress(page)

  await expect(lexiconView(page)).toBeVisible()
  await expect(searchField(page)).toBeFocused()
  expect(await addressHash(page)).toBe('#lexicon')
  await page.goBack()
  await expectClosed(page)
  await page.goBack()
  await expect(lexiconView(page)).toHaveCount(0)
  expect(await addressHash(page)).toBe('')
  expect(new URL(page.url()).pathname).toBe('/')
})

// @test-link [[req_lexicon_page]]
// @test-link [[module_lexicon_page_history_entry]]
test('#lexicon typed during a session only replaces the address', async ({ page }) => {
  await gotoSessionHarness(page)
  await readyToStart(page)
  await startSession(page)

  await typeLexiconAddress(page)

  await expectNotOpened(page)
  expect((await sessionState(page)).phase).toBe('count-in')
  await stopSession(page)
})

// @test-link [[req_lexicon_page]]
// @test-link [[module_lexicon_page_history_entry]]
test('#lexicon typed under the Your data sheet opens nothing, the sheet staying open', async ({
  page,
}) => {
  await gotoSessionHarness(page)
  await openYourData(page)

  await typeLexiconAddress(page)

  await expectNotOpened(page)
  await expect(yourDataSheet(page)).toHaveAccessibleName('Your data')
  await expect(sheetButton(page, 'Done')).toBeFocused()
})

// @test-link [[req_lexicon_page]]
// @test-link [[module_lexicon_page_history_entry]]
test('#lexicon typed under the My instrument sheet opens nothing, what was typed in it kept', async ({
  page,
}) => {
  await gotoSessionHarness(page)
  await openSheet(page)
  await nameField(page).fill('My bass clarinet')

  await typeLexiconAddress(page)

  await expectNotOpened(page)
  await expect(mySheet(page)).toBeVisible()
  await expect(nameField(page)).toHaveValue('My bass clarinet')
})

// @test-link [[req_lexicon_page]]
// @test-link [[module_lexicon_page_history_entry]]
test('#lexicon typed under the stale-phrase prompt opens nothing, the prompt staying', async ({
  page,
}) => {
  await gotoSessionHarness(page)
  await staleAtReady(page)
  await openStalePrompt(page)

  await typeLexiconAddress(page)

  await expectNotOpened(page)
  await expect(stalePrompt(page)).toBeVisible()
  expect((await sessionState(page)).phase).toBe('idle')
})

/** One sheet opened, then closed again, while the page's code loads. */
interface SheetDuringLoad {
  readonly name: string
  readonly before?: (page: Page) => Promise<void>
  readonly openAndClose: (page: Page) => Promise<void>
}

const SHEETS_DURING_LOAD: readonly SheetDuringLoad[] = [
  {
    name: 'the Your data sheet',
    openAndClose: async (page) => {
      await openYourData(page)
      await sheetButton(page, 'Done').click()
      await expect(yourDataSheet(page)).toHaveCount(0)
    },
  },
  {
    name: 'the stale-phrase prompt',
    before: staleAtReady,
    openAndClose: async (page) => {
      await openStalePrompt(page)
      await stalePrompt(page).getByRole('button', { name: 'Close', exact: true }).click()
      await expect(stalePrompt(page)).toHaveCount(0)
    },
  },
]

for (const during of SHEETS_DURING_LOAD) {
  // @test-link [[req_lexicon_page]]
  // @test-link [[module_lexicon_page_history_entry]]
  test(`${during.name} opened while the page's code loads stops the opening, even closed before it ends`, async ({
    page,
  }) => {
    await gotoSessionHarness(page)
    await during.before?.(page)
    const length = await historyLength(page)
    const held = await holdFile(page, LEXICON_PAGE_CHUNK)
    await lexiconButton(page).click()
    await expect.poll(held.requests).toBe(1)
    await expect(lexiconButton(page)).toHaveClass(/is-loading/)

    await during.openAndClose(page)
    await held.release()

    await expectNotOpened(page)
    await expect(lexiconButton(page)).not.toHaveClass(/is-loading/)
    expect(await historyLength(page)).toBe(length)
    // A later press opens the page at once, its code kept.
    await openLexicon(page)
    expect(held.requests()).toBe(1)
  })
}

/** One way to start a session while the page's code loads. */
interface StartDuringLoad {
  readonly name: string
  readonly start: (page: Page) => Promise<void>
}

const STARTS_DURING_LOAD: readonly StartDuringLoad[] = [
  { name: 'Start', start: startSession },
  {
    name: 'the starting note',
    start: async (page) => {
      await tap(page, KEYS, (await firstAttack(page)).pitch)
      await expect(sessionAction(page)).toHaveText('Stop')
    },
  },
]

for (const during of STARTS_DURING_LOAD) {
  // @test-link [[req_lexicon_page]]
  test(`a session started by ${during.name} while the page's code loads cancels the opening`, async ({
    page,
  }) => {
    await gotoSessionHarness(page)
    await connectDevice(page, KEYS)
    await readyToStart(page)
    const held = await holdFile(page, LEXICON_PAGE_CHUNK)
    await lexiconButton(page).click()
    await expect.poll(held.requests).toBe(1)
    await expect(lexiconButton(page)).toHaveClass(/is-loading/)
    await expect(lexiconButton(page)).toHaveAttribute('aria-busy', 'true')

    await during.start(page)
    await expect(lexiconButton(page)).toBeDisabled()
    await held.release()

    await expectNotOpened(page)
    await expect(lexiconButton(page)).not.toHaveClass(/is-loading/)
    expect((await sessionState(page)).phase).toBe('count-in')
    await stopSession(page)
    // The code loaded meanwhile is kept: the next press opens the page at once.
    await openLexicon(page)
    expect(held.requests()).toBe(1)
  })
}

// Chromium keeps a failed dynamic import in its module map for the visit: the loader retries under
// a fresh URL (load-lexicon-page.ts), so `Try again` fetches the words again.
// @test-link [[req_lexicon_page]]
test("a failed load opens nothing and shows the lexicon's notice; Try again loads again and opens", async ({
  page,
}) => {
  const words = watchFile(page, LEXICON_WORDS_CHUNK)
  await gotoSessionHarness(page)
  await refuseFile(page, LEXICON_WORDS_CHUNK)

  await lexiconButton(page).click()

  await expect(lexiconNotice(page).locator('p')).toHaveText(LEXICON_LOAD_FAILED)
  await expect(lexiconNoticeButton(page, 'Try again')).toBeFocused()
  await expect(lexiconView(page)).toHaveCount(0)
  expect(await addressHash(page)).toBe('')
  await expect(lexiconButton(page)).not.toHaveClass(/is-loading/)

  await page.unroute(LEXICON_WORDS_CHUNK)
  await lexiconNoticeButton(page, 'Try again').click()

  await expect(lexiconView(page)).toBeVisible()
  await expect(lexiconNotice(page)).toHaveCount(0)
  expect(await addressHash(page)).toBe('#lexicon')
  expect(words).toHaveLength(2)
  expect(words[1]).toMatch(/\?retry=1$/u)
})

// @test-link [[req_lexicon_page]]
test("Dismiss removes the lexicon's notice; Lexicon then loads the page's code again", async ({
  page,
}) => {
  const code = watchFile(page, LEXICON_PAGE_CHUNK)
  await gotoSessionHarness(page)
  await refuseFile(page, LEXICON_PAGE_CHUNK)
  await lexiconButton(page).click()
  await expect(lexiconNoticeButton(page, 'Try again')).toBeFocused()

  await lexiconNoticeButton(page, 'Dismiss').click()

  await expect(lexiconNotice(page)).toHaveCount(0)
  await expect(lexiconView(page)).toHaveCount(0)
  await page.unroute(LEXICON_PAGE_CHUNK)
  await openLexicon(page)
  expect(code).toHaveLength(2)
})

// @test-link [[req_lexicon_page]]
test('while the page shows, the starting note starts no session and its line is hidden', async ({
  page,
}) => {
  await gotoSessionHarness(page)
  await connectDevice(page, KEYS)
  await readyToStart(page)
  const { pitch } = await firstAttack(page)
  await expect(startLine(page)).toBeVisible()
  await openLexicon(page)

  await expect(startLine(page)).toHaveCount(0)
  await tap(page, KEYS, pitch)
  await settleAWhile(page)
  expect((await sessionState(page)).phase).toBe('idle')
  await expect(page.locator('ol.count-in')).toHaveCount(0)
  await expect(lexiconView(page)).toBeVisible()

  await page.keyboard.press('Escape')
  await expectClosed(page)
  await expect(startLine(page)).toBeVisible()
  await tap(page, KEYS, pitch)
  await expect(sessionAction(page)).toHaveText('Stop')
  expect((await sessionState(page)).phase).toBe('count-in')
  await stopSession(page)
})

// @test-link [[req_lexicon_page]]
test('while the page shows, the home note starts no Jam and its line is hidden', async ({
  page,
}) => {
  await gotoJamIdle(page)
  await expect(startLine(page)).toBeVisible()
  await openLexicon(page)

  await expect(startLine(page)).toHaveCount(0)
  await tap(page, KEYS, HOME_NOTE)
  await settleAWhile(page)
  expect((await sessionState(page)).phase).toBe('idle')
  await expect(sessionAction(page)).toHaveText('Start Jam')

  await page.keyboard.press('Escape')
  await expectClosed(page)
  await startJamByHomeNote(page)
  await stopSession(page)
})
