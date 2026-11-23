/**
 * v3.4 chunk 2: the lexicon page, opened from the footer's `Lexicon` on the production build
 * (port 4173). Every shown entry of the lexicon file is listed A to Z under its letter, the count
 * and the letters read from the file itself; a letter or a related word jumps within the page with
 * no history entry, its target and every element focused by Tab landing clear of the bar's part
 * that stays at the top (the whole bar, or its title row below 64rem), at one and two letter rows;
 * the search finds words by their word and other names in the design's tiers, opens a lone match,
 * shows its no-match state and, from three characters, the entries whose plain line mentions the
 * query; More opens an entry in place; Close and Escape close the page, focus back on `Lexicon`,
 * and it reopens as it was left; the keyboard alone reaches everything in the design's tab order;
 * and the page opens, reads and closes in a portrait view, the rotate notice showing once it has
 * closed.
 */
import { expect, test, type Page } from '@playwright/test'

import { gotoWorkspace } from './helpers'
import {
  ALPHABET,
  addressHash,
  barButton,
  barGeometry,
  entryOf,
  expectClosed,
  fileEntry,
  historyLength,
  idsIn,
  lettersWithWords,
  letterHeading,
  letterLink,
  letterOfWord,
  letterRow,
  letterSection,
  lexiconButton,
  lexiconView,
  matches,
  mentionsGroup,
  moreOf,
  openLexicon,
  orderKey,
  searchField,
  searchFile,
  shownFileEntries,
  topOf,
  type StayingPart,
} from './lexicon-page-helpers'

/** The lexicon file's shown entries, read once for the file. */
const ENTRIES = shownFileEntries()
/** The letters some shown word sorts under. */
const LETTERS = lettersWithWords(ENTRIES)
/** A letter with words in the middle of the row, far enough down the page to need a jump. */
const MIDDLE_LETTER = LETTERS[Math.floor(LETTERS.length / 2)] ?? 'M'

/** The result count's text, once the typing has paused. */
function resultCount(page: Page) {
  return lexiconView(page).locator('p.lexicon-result-count[role="status"]')
}

/** Assert `top` sits under the staying part's bottom with the design's spare space, to a pixel. */
async function expectJustUnderBar(page: Page, part: StayingPart, top: number): Promise<void> {
  const bar = await barGeometry(page, part)
  expect(top).toBeGreaterThanOrEqual(bar.bottom - 0.5)
  expect(Math.abs(top - bar.bottom - (bar.scrollPadding - bar.property))).toBeLessThanOrEqual(1.5)
}

// @test-link [[req_lexicon_page]]
test('A to Z: every shown entry of the file is listed once, under its letter, and counted', async ({
  page,
}) => {
  await gotoWorkspace(page)
  await openLexicon(page)

  await expect(lexiconView(page)).toHaveAttribute('aria-modal', 'true')
  await expect(lexiconView(page)).toHaveAccessibleName('Lexicon')
  await expect(page.locator('main.layout-app')).toHaveAttribute('inert', '')
  await expect(lexiconView(page).locator('.lexicon-bar-row > p.sheet-hint')).toHaveText(
    `${ENTRIES.length} words`,
  )
  const symbol = ENTRIES.some((entry) => letterOfWord(entry.word) === '#') ? 1 : 0
  await expect(letterRow(page).locator('li')).toHaveCount(ALPHABET.length + symbol)
  for (const letter of ALPHABET) {
    const empty = letterRow(page).locator('span.lexicon-letter.is-empty', {
      hasText: new RegExp(`^${letter}$`, 'u'),
    })
    if (LETTERS.includes(letter)) {
      await expect(letterLink(page, letter)).toHaveAttribute(
        'href',
        `#lexicon-letter-${letter.toLowerCase()}`,
      )
      await expect(empty).toHaveCount(0)
    } else {
      await expect(letterLink(page, letter)).toHaveCount(0)
      await expect(empty).toHaveCount(1)
    }
  }

  const sections = await lexiconView(page)
    .locator('section.lexicon-section')
    .evaluateAll((all) =>
      all.map((section) => ({
        letter: section.querySelector('h3.lexicon-letter-heading')?.textContent?.trim() ?? '',
        ids: [...section.querySelectorAll('li.lexicon-entry')].map((li) =>
          li.id.replace(/^lexicon-/u, ''),
        ),
      })),
    )
  expect(sections.map((section) => section.letter)).toEqual(LETTERS)
  for (const section of sections) {
    const words = section.ids.map((id) => fileEntry(ENTRIES, id).word)
    expect(words.map(letterOfWord), `the words under ${section.letter}`).toEqual(
      words.map(() => section.letter),
    )
    const keys = words.map(orderKey)
    expect(keys, `A to Z under ${section.letter}`).toEqual([...keys].sort())
  }
  const listed = sections.flatMap((section) => section.ids)
  expect(listed).toHaveLength(ENTRIES.length)
  expect(new Set(listed)).toEqual(new Set(ENTRIES.map((entry) => entry.id)))
})

// @test-link [[req_lexicon_page]]
test('a letter jumps to its heading just under the bar, focus on it, adding no history entry, even while searching', async ({
  page,
}) => {
  await gotoWorkspace(page)
  await openLexicon(page)
  const length = await historyLength(page)

  await letterLink(page, MIDDLE_LETTER).click()

  await expect(letterHeading(page, MIDDLE_LETTER)).toBeFocused()
  await expectJustUnderBar(page, 'bar', await topOf(letterHeading(page, MIDDLE_LETTER)))
  expect(await addressHash(page)).toBe('#lexicon')
  expect(await historyLength(page)).toBe(length)

  // A letter while searching empties the field and browses from that letter.
  const first = LETTERS[0] ?? 'A'
  await searchField(page).fill('step')
  await expect(lexiconView(page).locator('section.lexicon-section')).toHaveCount(0)
  await letterLink(page, first).click()
  await expect(searchField(page)).toHaveValue('')
  await expect(letterHeading(page, first)).toBeFocused()
  await expect(lexiconView(page).locator('section.lexicon-section')).toHaveCount(LETTERS.length)
  expect(await addressHash(page)).toBe('#lexicon')
  expect(await historyLength(page)).toBe(length)
})

// @test-link [[req_lexicon_page]]
test('the search finds words by their word and other names, best tier first', async ({ page }) => {
  await gotoWorkspace(page)
  await openLexicon(page)

  await searchField(page).fill('compas')
  await expect(matches(page).first()).toHaveId('lexicon-compas')
  await searchField(page).fill('semitone')
  await expect(matches(page).first()).toHaveId('lexicon-half-step')
  // Found by another name: that name first in its "Also called" line, in bold.
  await expect(matches(page).first().locator('p.sheet-hint > strong')).toHaveText('semitone')
  await searchField(page).fill('b flat')
  await expect(entryOf(page, 'b-flat-instrument')).toHaveCount(1)

  await searchField(page).fill('step')
  const found = searchFile(ENTRIES, 'step')
  await expect(matches(page)).toHaveCount(found.tiers.size)
  const ids = await idsIn(matches(page))
  expect(new Set(ids)).toEqual(new Set(found.tiers.keys()))
  expect(ids).toEqual(expect.arrayContaining(['half-step', 'whole-step']))
  const tiers = ids.map((id) => found.tiers.get(id) ?? 0)
  expect(tiers, 'best tier first').toEqual([...tiers].sort((a, b) => a - b))
  expect(new Set(await idsIn(mentionsGroup(page).locator('li.lexicon-entry')))).toEqual(
    new Set(found.mentions),
  )
  await expect(resultCount(page)).toHaveText(`${found.tiers.size} words match “step”.`)
  // A match is closed, as in browsing (Half step stays open: "semitone" found it alone).
  await expect(entryOf(page, 'whole-step').locator('details.lexicon-more')).not.toHaveAttribute(
    'open',
  )
})

// @test-link [[req_lexicon_page]]
test('exactly one match opens its entry', async ({ page }) => {
  expect(searchFile(ENTRIES, 'semitone').tiers.size, 'the file has one match').toBe(1)
  await gotoWorkspace(page)
  await openLexicon(page)

  await searchField(page).fill('semitone')

  await expect(matches(page)).toHaveCount(1)
  const entry = entryOf(page, 'half-step')
  await expect(entry.locator('details.lexicon-more')).toHaveAttribute('open', '')
  await expect(moreOf(entry)).toHaveText('Less')
  await expect(entry.locator('.lexicon-detail > p').first()).toBeVisible()
  await expect(resultCount(page)).toHaveText('1 word matches “semitone”.')
})

// @test-link [[req_lexicon_page]]
test('no match shows its sentence, and Clear search returns to A to Z, focus in the field', async ({
  page,
}) => {
  const query = 'zzqx'
  const found = searchFile(ENTRIES, query)
  expect(found.tiers.size + found.mentions.length, 'nothing in the file matches').toBe(0)
  await gotoWorkspace(page)
  await openLexicon(page)

  await searchField(page).fill(query)

  const empty = lexiconView(page).locator('.lexicon-empty')
  await expect(empty.locator('p').first()).toHaveText(`No word matches “${query}”.`)
  await expect(empty.locator('p.sheet-hint')).toHaveText(
    'Check the spelling, or type only the first letters of the word.',
  )
  await expect(matches(page)).toHaveCount(0)
  await expect(resultCount(page)).toHaveText(`No word matches “${query}”.`)

  await empty.getByRole('button', { name: 'Clear search', exact: true }).click()

  await expect(searchField(page)).toHaveValue('')
  await expect(searchField(page)).toBeFocused()
  await expect(lexiconView(page).locator('section.lexicon-section')).toHaveCount(LETTERS.length)
  await expect(empty).toHaveCount(0)
  expect(await lexiconView(page).evaluate((view) => view.scrollTop)).toBe(0)
})

// @test-link [[req_lexicon_page]]
test('from three characters, the entries whose plain line mentions the query are listed apart', async ({
  page,
}) => {
  const found = searchFile(ENTRIES, 'beat')
  expect(found.mentions.length, 'the file has mentions of "beat"').toBeGreaterThan(0)
  await gotoWorkspace(page)
  await openLexicon(page)

  await searchField(page).fill('be')
  await expect(matches(page).first()).toBeVisible()
  await expect(mentionsGroup(page)).toHaveCount(0)

  await searchField(page).fill('beat')
  await expect(mentionsGroup(page).locator('h3')).toHaveText('Mentioned in other words')
  await expect(mentionsGroup(page).locator(':scope > p.sheet-hint')).toHaveText(
    "Their name doesn't contain “beat”, but their short line does.",
  )
  const mentioned = await idsIn(mentionsGroup(page).locator('li.lexicon-entry'))
  expect(new Set(mentioned)).toEqual(new Set(found.mentions))
  expect(new Set(await idsIn(matches(page)))).toEqual(new Set(found.tiers.keys()))
})

// @test-link [[req_lexicon_page]]
test('a related word empties the search, opens its entry just under the bar, focus on its word, adding no history entry', async ({
  page,
}) => {
  const halfStep = fileEntry(ENTRIES, 'half-step')
  const [target] = halfStep.related
  if (target === undefined) throw new Error('Half step has no related word shown')
  await gotoWorkspace(page)
  await openLexicon(page)
  await searchField(page).fill('semitone')
  const from = entryOf(page, 'half-step')
  if (searchFile(ENTRIES, 'semitone').tiers.size > 1) await moreOf(from).click()
  const links = from.locator('p.lexicon-related a.lexicon-link')
  await expect(links).toHaveCount(halfStep.related.length)
  await expect(links.first()).toHaveAttribute('href', `#lexicon-${target}`)
  const length = await historyLength(page)

  await links.first().click()

  await expect(searchField(page)).toHaveValue('')
  await expect(entryOf(page, target).locator('h4.lexicon-word')).toBeFocused()
  await expect(entryOf(page, target).locator('details.lexicon-more')).toHaveAttribute('open', '')
  await expect(from.locator('details.lexicon-more')).toHaveAttribute('open', '')
  const bar = await barGeometry(page, 'bar')
  expect(await topOf(entryOf(page, target))).toBeGreaterThanOrEqual(bar.bottom - 0.5)
  expect(await addressHash(page)).toBe('#lexicon')
  expect(await historyLength(page)).toBe(length)
})

// @test-link [[req_lexicon_page]]
test('More opens an entry in place and Less closes it; several stay open at once', async ({
  page,
}) => {
  const halfStep = fileEntry(ENTRIES, 'half-step')
  await gotoWorkspace(page)
  await openLexicon(page)
  const entry = entryOf(page, 'half-step')
  const more = moreOf(entry)
  await expect(more).toHaveText('More')
  await expect(more).toHaveAccessibleName('More about Half step')
  await expect(entry.locator('.lexicon-detail')).toBeHidden()

  await more.click()

  await expect(entry.locator('details.lexicon-more')).toHaveAttribute('open', '')
  await expect(more).toHaveText('Less')
  await expect(more).toHaveAccessibleName('Less about Half step')
  await expect(entry.locator('.lexicon-detail > p').first()).toBeVisible()
  await expect(entry.locator('.lexicon-detail > h5')).toHaveCount(halfStep.hasAppMeaning ? 1 : 0)
  await expect(entry.locator('p.lexicon-related')).toHaveText(/^\s*Related: \S/u)
  await moreOf(entryOf(page, 'whole-step')).click()
  await expect(lexiconView(page).locator('details.lexicon-more[open]')).toHaveCount(2)

  await more.click()
  await expect(entry.locator('details.lexicon-more')).not.toHaveAttribute('open')
  await expect(more).toHaveText('More')
  await expect(entryOf(page, 'whole-step').locator('details.lexicon-more')).toHaveAttribute(
    'open',
    '',
  )
})

// @test-link [[req_lexicon_page]]
test('Close closes the page, focus on Lexicon; reopened, it is as it was left', async ({
  page,
}) => {
  await gotoWorkspace(page)
  await openLexicon(page)
  await searchField(page).fill('step')
  await moreOf(entryOf(page, 'whole-step')).click()
  const scrollTop = await lexiconView(page).evaluate((view) => {
    view.scrollTop = 300
    return view.scrollTop
  })
  expect(scrollTop).toBeGreaterThan(0)

  // A pointer's click where Close is: a locator's click first scrolls Close into view, and the
  // view's scroll padding, which covers the bar itself, makes that scroll the view to its top.
  const close = await barButton(page, 'Close').boundingBox()
  if (close === null) throw new Error('Close is not shown')
  await page.mouse.click(close.x + close.width / 2, close.y + close.height / 2)
  await expectClosed(page)

  await lexiconButton(page).click()
  await expect(lexiconView(page)).toBeVisible()
  await expect(searchField(page)).toHaveValue('step')
  await expect(entryOf(page, 'whole-step').locator('details.lexicon-more')).toHaveAttribute(
    'open',
    '',
  )
  expect(await lexiconView(page).evaluate((view) => view.scrollTop)).toBe(scrollTop)
})

// @test-link [[req_lexicon_page]]
test('Escape first empties the search field holding text, then closes the page', async ({
  page,
}) => {
  await gotoWorkspace(page)
  await openLexicon(page)
  await searchField(page).fill('step')

  await page.keyboard.press('Escape')
  await expect(searchField(page)).toHaveValue('')
  await expect(searchField(page)).toBeFocused()
  await expect(lexiconView(page)).toBeVisible()
  await expect(lexiconView(page).locator('section.lexicon-section')).toHaveCount(LETTERS.length)

  await page.keyboard.press('Escape')
  await expectClosed(page)
})

/** The tab stop focused now: its tag, and its id, text or accessible label. */
function focused(page: Page): Promise<string> {
  return page.evaluate(() => {
    const active = document.activeElement
    if (active === null) return 'none'
    const name = active.getAttribute('aria-label') ?? active.id ?? ''
    return `${active.tagName.toLowerCase()}:${name || (active.textContent ?? '').trim()}`
  })
}

// @test-link [[req_lexicon_page]]
test('the keyboard alone: open from the footer, Tab order and trap, Enter on a letter and on More, Escape', async ({
  page,
}) => {
  await gotoWorkspace(page)
  await lexiconButton(page).focus()
  await page.keyboard.press('Enter')
  await expect(searchField(page)).toBeFocused()

  // Search field, Close (Letters is not shown at this width), each letter with words, then More.
  await page.keyboard.press('Tab')
  await expect(barButton(page, 'Close')).toBeFocused()
  for (const letter of LETTERS) {
    await page.keyboard.press('Tab')
    await expect(letterLink(page, letter)).toBeFocused()
  }
  await page.keyboard.press('Tab')
  expect(await focused(page)).toMatch(/^summary:More about /u)
  // The trap: Shift+Tab from the search field wraps to the last More of the page.
  await searchField(page).focus()
  await page.keyboard.press('Shift+Tab')
  const lastMore = lexiconView(page).locator('summary').last()
  await expect(lastMore).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(searchField(page)).toBeFocused()

  // Enter on a letter: its heading takes focus; Tab then reaches its first More.
  const letter = LETTERS[1] ?? 'B'
  for (let stop = 0; stop < 3; stop += 1) await page.keyboard.press('Tab')
  await expect(letterLink(page, letter)).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(letterHeading(page, letter)).toBeFocused()
  expect(await addressHash(page)).toBe('#lexicon')
  await page.keyboard.press('Tab')
  const entries = letterSection(page, letter).locator('li.lexicon-entry')
  const entry = entries.first()
  await expect(moreOf(entry)).toBeFocused()

  // Enter on More opens it, focus staying; an open entry's related links follow its More.
  await page.keyboard.press('Enter')
  await expect(entry.locator('details.lexicon-more')).toHaveAttribute('open', '')
  await expect(moreOf(entry)).toBeFocused()
  await page.keyboard.press('Tab')
  const related = entry.locator('a.lexicon-link')
  if ((await related.count()) > 0) await expect(related.first()).toBeFocused()
  else await expect(moreOf(entries.nth(1))).toBeFocused()

  await page.keyboard.press('Escape')
  await expectClosed(page)
})

/** One window size the bar's staying part is checked at. */
interface BarCase {
  readonly name: string
  readonly size: { readonly width: number; readonly height: number }
  readonly part: StayingPart
  /** How many rows the letters take, when they stay in the bar. */
  readonly letterRows: number | null
}

const BAR_CASES: readonly BarCase[] = [
  {
    name: 'at desktop width, one letter row',
    size: { width: 1440, height: 900 },
    part: 'bar',
    letterRows: 1,
  },
  {
    name: 'at tablet-landscape width, two letter rows',
    size: { width: 1024, height: 768 },
    part: 'bar',
    letterRows: 2,
  },
  {
    name: 'below 64rem, the title row only',
    size: { width: 900, height: 500 },
    part: 'row',
    letterRows: null,
  },
]

for (const barCase of BAR_CASES) {
  // @test-link [[req_lexicon_page]]
  test(`the bar's staying part ${barCase.name}: measured on the view, jumps and Tab land clear of it`, async ({
    page,
  }) => {
    await page.setViewportSize(barCase.size)
    await gotoWorkspace(page)
    await openLexicon(page)
    if (barCase.letterRows !== null) {
      const rows = await letterRow(page)
        .locator('li')
        .evaluateAll(
          (items) =>
            new Set(items.map((item) => Math.round(item.getBoundingClientRect().top))).size,
        )
      expect(rows).toBe(barCase.letterRows)
    }
    if (barCase.part === 'row') await expect(barButton(page, 'Letters')).toBeVisible()
    else await expect(barButton(page, 'Letters')).toBeHidden()
    const bar = await barGeometry(page, barCase.part)
    expect(Math.abs(bar.property - bar.height)).toBeLessThan(0.5)

    await letterLink(page, MIDDLE_LETTER).click()
    await expect(letterHeading(page, MIDDLE_LETTER)).toBeFocused()
    await expectJustUnderBar(page, barCase.part, await topOf(letterHeading(page, MIDDLE_LETTER)))

    // Tab from the section's first word to its More, scrolled first a little under the bar.
    const entry = letterSection(page, MIDDLE_LETTER).locator('li.lexicon-entry').first()
    const more = moreOf(entry)
    await more.evaluate((summary, under) => {
      const view = summary.closest('.lexicon-view')
      if (view === null) throw new Error('no lexicon view')
      view.scrollTop += summary.getBoundingClientRect().top - under
      summary.closest('li')?.querySelector<HTMLElement>('h4')?.focus({ preventScroll: true })
    }, bar.bottom - 4)
    expect(await topOf(more), 'More starts under the bar').toBeLessThan(bar.bottom - 2)
    await page.keyboard.press('Tab')
    await expect(more).toBeFocused()
    expect(await topOf(more)).toBeGreaterThanOrEqual(
      (await barGeometry(page, barCase.part)).bottom - 0.5,
    )

    // Tab onto the staying part's controls from the scrolled view leaves the scroll where it was.
    const scrolled = () => lexiconView(page).evaluate((view) => view.scrollTop)
    const scrollTop = await scrolled()
    expect(scrollTop).toBeGreaterThan(0)
    await searchField(page).evaluate((field) => field.focus({ preventScroll: true }))
    if (barCase.part === 'row') {
      await page.keyboard.press('Tab')
      await expect(barButton(page, 'Letters')).toBeFocused()
      expect(await scrolled()).toBe(scrollTop)
    }
    await page.keyboard.press('Tab')
    await expect(barButton(page, 'Close')).toBeFocused()
    expect(await scrolled()).toBe(scrollTop)

    if (barCase.part === 'row') {
      // `Letters` jumps back to the letter row, which scrolls away below 64rem.
      await barButton(page, 'Letters').click()
      await expect(letterLink(page, LETTERS[0] ?? 'A')).toBeFocused()
      expect(await topOf(letterRow(page))).toBeGreaterThanOrEqual(bar.bottom - 0.5)
    }
  })
}

// @test-link [[req_lexicon_page]]
test('in a portrait view the page opens at #lexicon, reads and closes; the rotate notice shows once it has closed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#lexicon')
  await expect(lexiconView(page)).toBeVisible()
  await expect(searchField(page)).toBeFocused()
  expect(await addressHash(page)).toBe('#lexicon')
  const notice = page.locator('.orientation-notice')
  /** What the player sees at the middle of the window: the page, or the rotate notice. */
  const atMiddle = () =>
    page.evaluate(() => {
      const element = document.elementFromPoint(innerWidth / 2, innerHeight / 2)
      if (element?.closest('.lexicon-view') != null) return 'lexicon'
      return element?.closest('.orientation-notice') != null ? 'notice' : 'other'
    })
  expect(await atMiddle()).toBe('lexicon')
  await expect(barButton(page, 'Letters')).toBeVisible()
  await expect(lexiconView(page).locator('li.lexicon-entry')).toHaveCount(ENTRIES.length)
  const entry = entryOf(page, 'half-step')
  await moreOf(entry).click()
  await expect(entry.locator('.lexicon-detail > p').first()).toBeVisible()
  expect(
    await lexiconView(page).evaluate((view) => view.scrollWidth <= view.clientWidth),
    'nothing scrolls sideways',
  ).toBe(true)

  await barButton(page, 'Close').click()

  await expect(lexiconView(page)).toHaveCount(0)
  await expect.poll(() => addressHash(page)).toBe('')
  await expect(notice).toBeVisible()
  expect(await atMiddle()).toBe('notice')
})
