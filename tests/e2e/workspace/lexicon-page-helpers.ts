/**
 * Shared helpers for the lexicon page specs (v3.4 chunk 2): an independent plain reading of the
 * lexicon file (the shown entries, their letters, what a search finds), the footer's `Lexicon`,
 * the page and its parts, opening it, the page's two built files (its code and its words) held,
 * refused or watched on the network, the lexicon's load-failure notice, the browser's history and
 * address, and the bar's part that stays at the top.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { expect, type Locator, type Page } from '@playwright/test'

/** The lexicon file the build reads. */
const LEXICON_PATH = fileURLToPath(new URL('../../../docs/music/lexicon.md', import.meta.url))

/** One shown entry of the lexicon file, as a plain reading of the text finds it. */
export interface FileEntry {
  readonly id: string
  readonly word: string
  readonly otherNames: readonly string[]
  readonly popup: string
  readonly hasAppMeaning: boolean
  readonly related: readonly string[]
}

/** Split an `aliases` field at each comma outside parentheses; `none` gives no name. */
function splitNames(aliases: string | undefined): string[] {
  if (aliases === undefined || /^`?none`?$/u.test(aliases.trim())) return []
  const names: string[] = []
  let depth = 0
  let current = ''
  for (const character of aliases) {
    if (character === '(') depth += 1
    if (character === ')') depth = Math.max(0, depth - 1)
    if (character === ',' && depth === 0) {
      names.push(current.trim())
      current = ''
    } else current += character
  }
  return [...names, current.trim()]
}

/** The ids an `id` or `related` field names, backticks removed. */
function idsOf(field: string | undefined): string[] {
  if (field === undefined || field.trim() === '') return []
  return field.split(',').map((id) => id.trim().replace(/^`|`$/gu, ''))
}

/**
 * Every entry the page shows, read from the lexicon file without the app's parser: fenced
 * blocks removed, the text cut at each `## ` group and each `### ` entry, the Internal group left
 * out, and each related id kept only when it names a shown entry. In the file's order.
 */
export function shownFileEntries(): FileEntry[] {
  const text = readFileSync(LEXICON_PATH, 'utf8').replace(/^```[\s\S]*?^```/gmu, '')
  const raw: { word: string; fields: Record<string, string> }[] = []
  for (const group of text.split(/^## /mu).slice(1)) {
    if (/^Internal\b/u.test(group)) continue
    for (const block of group.split(/^### /mu).slice(1)) {
      const fields = Object.fromEntries(
        [...block.matchAll(/^- \*\*(\w+):\*\*(?: (.*))?$/gmu)].map((m) => [m[1], m[2] ?? '']),
      )
      raw.push({ word: (block.split('\n')[0] ?? '').trim(), fields })
    }
  }
  const shownIds = new Set(raw.map((entry) => idsOf(entry.fields.id)[0]))
  return raw.map(({ word, fields }) => ({
    id: idsOf(fields.id)[0] ?? '',
    word,
    otherNames: splitNames(fields.aliases),
    popup: fields.popup ?? '',
    hasAppMeaning: (fields.in_infinite_flow ?? '') !== '',
    related: idsOf(fields.related).filter((id) => shownIds.has(id)),
  }))
}

/** A text with its inline marks (code, bold, emphasis) dropped, accents removed, in lower case. */
function folded(text: string): string {
  return text
    .replace(/`([^`]+)`/gu, '$1')
    .replace(/\*\*(.+?)\*\*/gu, '$1')
    .replace(/(?<![\p{L}\p{N}_])_(?![\s_])(.+?)(?<![\s_])_(?![\p{L}\p{N}_])/gu, '$1')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

/** A text as the search compares it: folded, hyphens, apostrophes and runs of spaces one space. */
export function searchFolded(text: string): string {
  return folded(text)
    .replace(/[-‐‑‒–—'‘’ʼ]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

/** A word as the A to Z order compares it: folded, with no space at either end. */
export function orderKey(word: string): string {
  return folded(word).trim()
}

/** The letter a word sorts under, its first character without its accent, or `#`. */
export function letterOfWord(word: string): string {
  const first = folded(word).trimStart().charAt(0).toUpperCase()
  return /^[A-Z]$/u.test(first) ? first : '#'
}

/** The 26 letters, A to Z. */
export const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']

/** The letters A to Z some shown word sorts under, in order. */
export function lettersWithWords(entries: readonly FileEntry[]): string[] {
  const used = new Set(entries.map((entry) => letterOfWord(entry.word)))
  return ALPHABET.filter((letter) => used.has(letter))
}

/** Whether a folded text has a word starting with the folded query. */
function hasWordStarting(text: string, query: string): boolean {
  return ` ${text}`.includes(` ${query}`)
}

/**
 * The tier a name matches a folded query in, by the design's five tiers (How Search Works), or
 * null: the word equals it (1), another name equals it (2), the word starts with it (3), a word
 * inside starts with it (4), it appears anywhere (5).
 */
function tierOf(name: string, query: string, isWord: boolean): number | null {
  const key = searchFolded(name)
  if (key === query) return isWord ? 1 : 2
  if (isWord && key.startsWith(query)) return 3
  if (hasWordStarting(key, query)) return 4
  return key.includes(query) ? 5 : null
}

/** What a search finds in the file: each match's id with its best tier, and the mentions' ids. */
export interface FileSearch {
  readonly tiers: ReadonlyMap<string, number>
  readonly mentions: readonly string[]
}

/** Search the file's shown entries for `query` as the design says the page does. */
export function searchFile(entries: readonly FileEntry[], query: string): FileSearch {
  const key = searchFolded(query)
  const tiers = new Map<string, number>()
  const mentions: string[] = []
  for (const entry of entries) {
    const found = [
      tierOf(entry.word, key, true),
      ...entry.otherNames.map((name) => tierOf(name, key, false)),
    ].filter((tier): tier is number => tier !== null)
    if (found.length > 0) tiers.set(entry.id, Math.min(...found))
    else if (key.length >= 3 && hasWordStarting(searchFolded(entry.popup), key))
      mentions.push(entry.id)
  }
  return { tiers, mentions }
}

/** One shown entry of the file, by its id; it must be there. */
export function fileEntry(entries: readonly FileEntry[], id: string): FileEntry {
  const found = entries.find((entry) => entry.id === id)
  if (found === undefined) throw new Error(`the lexicon shows no entry ${id}`)
  return found
}

/** The footer's `Lexicon`. */
export function lexiconButton(page: Page): Locator {
  return page.locator('.layout-footer .footer-actions').getByRole('button', {
    name: 'Lexicon',
    exact: true,
  })
}

/** The lexicon page, while it shows. */
export function lexiconView(page: Page): Locator {
  return page.locator('div.lexicon-view[role="dialog"]')
}

/** The bar's `Find a word` field. */
export function searchField(page: Page): Locator {
  return lexiconView(page).getByRole('searchbox', { name: 'Find a word', exact: true })
}

/** One of the bar's buttons: `Close` or `Letters`. */
export function barButton(page: Page, name: 'Close' | 'Letters'): Locator {
  return lexiconView(page).locator('.lexicon-bar-row').getByRole('button', { name, exact: true })
}

/** The letter row, the `nav` "Letters". */
export function letterRow(page: Page): Locator {
  return lexiconView(page).getByRole('navigation', { name: 'Letters', exact: true })
}

/** A letter's link in the letter row. */
export function letterLink(page: Page, letter: string): Locator {
  return letterRow(page).getByRole('link', { name: letter, exact: true })
}

/** A letter's heading in the body. */
export function letterHeading(page: Page, letter: string): Locator {
  return lexiconView(page).locator(`h3#lexicon-letter-${letter.toLowerCase()}`)
}

/** A letter's section in the body. */
export function letterSection(page: Page, letter: string): Locator {
  return lexiconView(page).locator(
    `section.lexicon-section:has(> h3#lexicon-letter-${letter.toLowerCase()})`,
  )
}

/** An entry of the page, by its id. */
export function entryOf(page: Page, id: string): Locator {
  return lexiconView(page).locator(`li.lexicon-entry[id="lexicon-${id}"]`)
}

/** An entry's `More` (or `Less`). */
export function moreOf(entry: Locator): Locator {
  return entry.locator('details.lexicon-more > summary')
}

/** The search's matches, best first, in the section their hidden heading names. */
export function matches(page: Page): Locator {
  return lexiconView(page).locator(
    '.lexicon-body > section:has(> h3.lexicon-matches-heading) > ul.lexicon-list > li.lexicon-entry',
  )
}

/** The "Mentioned in other words" group. */
export function mentionsGroup(page: Page): Locator {
  return lexiconView(page).locator('section.lexicon-mentions')
}

/** The ids of the entries `list` holds, in order. */
export function idsIn(list: Locator): Promise<string[]> {
  return list.evaluateAll((items) => items.map((item) => item.id.replace(/^lexicon-/u, '')))
}

/** Press `Lexicon` and wait until the page shows, focus in its search field (a fine pointer). */
export async function openLexicon(page: Page): Promise<void> {
  await lexiconButton(page).click()
  await expect(lexiconView(page)).toBeVisible()
  await expect(searchField(page)).toBeFocused()
  await expect.poll(() => addressHash(page)).toBe('#lexicon')
}

/** Assert the page is closed, the address bare and focus on the footer's `Lexicon`. */
export async function expectClosed(page: Page): Promise<void> {
  await expect(lexiconView(page)).toHaveCount(0)
  await expect.poll(() => addressHash(page)).toBe('')
  await expect(lexiconButton(page)).toBeFocused()
  await expect(page.locator('main.layout-app')).not.toHaveAttribute('inert')
}

/** The address's `#` part now. */
export function addressHash(page: Page): Promise<string> {
  return page.evaluate(() => location.hash)
}

/** The number of entries in the tab's history. */
export function historyLength(page: Page): Promise<number> {
  return page.evaluate(() => history.length)
}

/** The page's code entry as the build names it. */
export const LEXICON_PAGE_CHUNK = /\/assets\/lexicon-page-module-[\w-]+\.js(\?.*)?$/
/** The lexicon's words file as the build names it. */
export const LEXICON_WORDS_CHUNK = /\/assets\/lexicon-words-[\w-]+\.js(\?.*)?$/

/** Record the URL of every request for a file matching `file` the page makes from now on. */
export function watchFile(page: Page, file: RegExp): string[] {
  const urls: string[] = []
  page.on('request', (request) => {
    if (file.test(request.url())) urls.push(request.url())
  })
  return urls
}

/** A built file held on the network until the test lets it through. */
export interface HeldFile {
  /** How many requests for it reached the route. */
  readonly requests: () => number
  /** Let every held request through; resolves once its response has finished. */
  readonly release: () => Promise<void>
}

/** Hold every request for a file matching `file` until `release`. */
export async function holdFile(page: Page, file: RegExp): Promise<HeldFile> {
  let requests = 0
  let release!: () => void
  const released = new Promise<void>((resolve) => (release = resolve))
  await page.route(file, async (route) => {
    requests += 1
    await released
    await route.continue()
  })
  return {
    requests: () => requests,
    release: async () => {
      const finished = page.waitForEvent('requestfinished', (request) => file.test(request.url()))
      release()
      await finished
    },
  }
}

/** Refuse every request for a file matching `file`, as a network gone away does. */
export async function refuseFile(page: Page, file: RegExp): Promise<void> {
  await page.route(file, (route) => route.abort('internetdisconnected'))
}

/** The lexicon's load-failure notice's sentence. */
export const LEXICON_LOAD_FAILED =
  "The lexicon couldn't open because part of the app didn't load. Check that you're online, then try again."

/** The lexicon's load-failure notice in the notice row. */
export function lexiconNotice(page: Page): Locator {
  return page.locator('.app-notice-row .app-notice').filter({ hasText: LEXICON_LOAD_FAILED })
}

/** One of the lexicon notice's buttons. */
export function lexiconNoticeButton(page: Page, name: 'Try again' | 'Dismiss'): Locator {
  return lexiconNotice(page).getByRole('button', { name, exact: true })
}

/** Let a few animation frames pass, so whatever a change set going has had its turn. */
export async function settleAWhile(page: Page): Promise<void> {
  for (let frame = 0; frame < 5; frame += 1) {
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)))
  }
}

/** The bar's part that stays at the top: the whole bar, or its title row below 64rem. */
export type StayingPart = 'bar' | 'row'

/** The staying part's geometry, and what the page keeps of it on the view. */
export interface BarGeometry {
  /** The staying part's bottom edge, in the viewport. */
  readonly bottom: number
  /** Its measured height. */
  readonly height: number
  /** `--lexicon-bar-block-size` on `lexicon-view`, in pixels. */
  readonly property: number
  /** The view's resolved `scroll-padding-block-start`, in pixels. */
  readonly scrollPadding: number
}

/** Measure the bar's staying part, and read what the view keeps of it. */
export function barGeometry(page: Page, part: StayingPart): Promise<BarGeometry> {
  const selector = part === 'bar' ? '.lexicon-bar' : '.lexicon-bar-row'
  return lexiconView(page).evaluate((view, staying) => {
    const element = view.querySelector(staying)
    if (element === null) throw new Error(`${staying} is not shown`)
    const box = element.getBoundingClientRect()
    return {
      bottom: box.bottom,
      height: box.height,
      property: parseFloat(
        (view as HTMLElement).style.getPropertyValue('--lexicon-bar-block-size'),
      ),
      scrollPadding: parseFloat(getComputedStyle(view).scrollPaddingBlockStart),
    }
  }, selector)
}

/** The top edge of `locator`'s box, in the viewport. */
export function topOf(locator: Locator): Promise<number> {
  return locator.evaluate((element) => element.getBoundingClientRect().top)
}
