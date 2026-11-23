/**
 * The lexicon page's search over the shown entries: a query matches an entry when its text
 * appears in the entry's word or one of its other names, each folded by `searchKey` (case,
 * accents, hyphens, apostrophes, spaces and inline marks). Matches rank in five tiers, A to Z
 * inside each; from three characters, the other entries whose plain line has a word starting with
 * the query are listed apart. Definitions and app meanings are never searched.
 */
import type { LexiconEntry } from '@/lexicon'

import type { LexiconIndex } from './lexicon-order'
import { searchKey } from './lexicon-text'

/** The query's length, folded, from which the plain lines are searched too. */
export const MENTIONS_FROM_CHARACTERS = 3

/** One match: its entry, and the other name it was found by (null when found by its word). */
export interface LexiconMatch {
  readonly entry: LexiconEntry
  readonly foundBy: string | null
}

/** A search's outcome: its matches, best first, and the entries mentioning the query. */
export interface LexiconSearch {
  readonly matches: readonly LexiconMatch[]
  readonly mentions: readonly LexiconEntry[]
}

/** Whether a folded text has a word starting with the folded query. */
function hasWordStarting(text: string, query: string): boolean {
  return ` ${text}`.includes(` ${query}`)
}

/**
 * The tier a folded name matches the folded query in, from 1 (best) to 5, or null for no
 * match: the word equals it (1), another name equals it (2), the word starts with it (3), a word
 * inside starts with it (4), it appears anywhere (5).
 */
function tierOf(name: string, query: string, isWord: boolean): number | null {
  if (name === query) return isWord ? 1 : 2
  if (isWord && name.startsWith(query)) return 3
  if (hasWordStarting(name, query)) return 4
  return name.includes(query) ? 5 : null
}

/** An entry's best tier for the query, and the other name it came from when not its word. */
function bestMatch(
  entry: LexiconEntry,
  query: string,
): { tier: number; foundBy: string | null } | null {
  let best: { tier: number; foundBy: string | null } | null = null
  const wordTier = tierOf(searchKey(entry.word), query, true)
  if (wordTier !== null) best = { tier: wordTier, foundBy: null }
  for (const name of entry.otherNames) {
    const tier = tierOf(searchKey(name), query, false)
    if (tier !== null && (best === null || tier < best.tier)) best = { tier, foundBy: name }
  }
  return best
}

/** Search the shown entries for the query; a query that folds to nothing matches nothing. */
// @spec-link [[req_lexicon_page]]
export function searchLexicon(index: LexiconIndex, query: string): LexiconSearch {
  const folded = searchKey(query)
  if (folded === '') return { matches: [], mentions: [] }
  const ranked: { tier: number; match: LexiconMatch }[] = []
  const mentions: LexiconEntry[] = []
  for (const entry of index.entries) {
    const best = bestMatch(entry, folded)
    if (best !== null) ranked.push({ tier: best.tier, match: { entry, foundBy: best.foundBy } })
    else if (
      folded.length >= MENTIONS_FROM_CHARACTERS &&
      hasWordStarting(searchKey(entry.popup), folded)
    )
      mentions.push(entry)
  }
  // A stable sort over the A to Z order keeps each tier A to Z.
  ranked.sort((a, b) => a.tier - b.tier)
  return { matches: ranked.map((item) => item.match), mentions }
}
