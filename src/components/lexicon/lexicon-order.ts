/**
 * The lexicon page's A to Z over the shown entries it reads through the read interface: one order
 * by the word, ignoring case and accents, then by the lexicon's group order for a doubled word,
 * then in the lexicon's order; the letters A to Z, always listed, "#" first only when some word
 * starts with no letter; each letter's entries; and how a word is named apart from its own entry,
 * a doubled word with its group in brackets.
 */
import type { LexiconEntry, LexiconReader } from '@/lexicon'

import { foldedText } from './lexicon-text'

/** One item of the letter row: a letter, and whether any word sorts under it. */
export interface LexiconLetter {
  readonly letter: string
  readonly hasWords: boolean
}

/** One letter's section: its letter and its entries, A to Z. */
export interface LexiconSection {
  readonly letter: string
  readonly entries: readonly LexiconEntry[]
}

/** The shown entries as the page lays them out. */
export interface LexiconIndex {
  /** Every shown entry, A to Z. */
  readonly entries: readonly LexiconEntry[]
  /** The letter row: "#" when some word starts with no letter, then A to Z. */
  readonly letters: readonly LexiconLetter[]
  /** One section per letter with words, in the letter row's order. */
  readonly sections: readonly LexiconSection[]
  /** The entry's word as named apart from its own entry: a doubled word with its group. */
  label(id: string): string
  /** The shown entry with this id; an unknown id is a defect. */
  entry(id: string): LexiconEntry
}

const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']

/** The letter a word sorts under: its first character without its accent, or "#". */
// @spec-link [[req_lexicon_page]]
export function letterOf(word: string): string {
  const first = foldedText(word).trimStart().charAt(0).toUpperCase()
  return ALPHABET.includes(first) ? first : '#'
}

/** Compare two folded words by their characters' code points. */
function compareFolded(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

/**
 * Lay the shown entries out A to Z: by the word ignoring case and accents, then by the group's
 * place in the lexicon's order, then in the lexicon's order.
 */
// @spec-link [[req_lexicon_page]]
export function indexLexicon(reader: LexiconReader): LexiconIndex {
  const handed = reader.entries()
  const place = new Map(handed.map((entry, at) => [entry.id, at]))
  const folded = new Map(handed.map((entry) => [entry.id, foldedText(entry.word).trim()]))
  /** An entry's word, folded for the order. */
  const keyOf = (entry: LexiconEntry): string => folded.get(entry.id) ?? ''
  const entries = [...handed].sort(
    (a, b) =>
      compareFolded(keyOf(a), keyOf(b)) ||
      a.groupOrder - b.groupOrder ||
      (place.get(a.id) ?? 0) - (place.get(b.id) ?? 0),
  )
  const byLetter = new Map<string, LexiconEntry[]>()
  for (const entry of entries) {
    const letter = letterOf(entry.word)
    byLetter.set(letter, [...(byLetter.get(letter) ?? []), entry])
  }
  const letters: LexiconLetter[] = [
    ...(byLetter.has('#') ? [{ letter: '#', hasWords: true }] : []),
    ...ALPHABET.map((letter) => ({ letter, hasWords: byLetter.has(letter) })),
  ]
  const sections = letters
    .filter((letter) => letter.hasWords)
    .map((letter) => ({ letter: letter.letter, entries: byLetter.get(letter.letter) ?? [] }))
  const wordCounts = new Map<string, number>()
  for (const key of folded.values()) wordCounts.set(key, (wordCounts.get(key) ?? 0) + 1)
  /** The shown entry with this id; an unknown id is a defect. */
  const entry = (id: string): LexiconEntry => {
    const found = reader.entryById(id)
    if (found === null) throw new Error(`lexicon page: no shown entry has the id ${id}`)
    return found
  }
  return {
    entries,
    letters,
    sections,
    entry,
    label: (id) => {
      const named = entry(id)
      return (wordCounts.get(keyOf(named)) ?? 0) > 1 ? `${named.word} (${named.group})` : named.word
    },
  }
}
