import type { LexiconEntry } from './lexicon-entry'

/** The read interface over the lexicon's shown entries. */
// @spec-link [[api_lexicon_read_contract]]
export interface LexiconReader {
  /** The shown entries, in the lexicon's order. */
  entries(): readonly LexiconEntry[]
  /** The entry with this id, or null when no shown entry has it. */
  entryById(id: string): LexiconEntry | null
  /** The groups' names, in the lexicon's order, each once. */
  groupNames(): readonly string[]
}

/**
 * The read interface over the shown entries handed to it, which must already be in the lexicon's
 * order. Reads no file and no network. Throws when the entries break the contract: an id given
 * twice, or a group's place lower than one before it.
 */
// @spec-link [[api_lexicon_read_contract]]
export function createLexiconReader(entries: readonly LexiconEntry[]): LexiconReader {
  const byId = new Map<string, LexiconEntry>()
  const groups: string[] = []
  let lastGroupOrder = 0
  for (const entry of entries) {
    if (byId.has(entry.id)) throw new Error(`Lexicon entries: the id ${entry.id} is given twice`)
    byId.set(entry.id, entry)
    if (entry.groupOrder < lastGroupOrder) {
      throw new Error(
        `Lexicon entries: the group ${entry.group} comes after a later group in the lexicon's order`,
      )
    }
    lastGroupOrder = entry.groupOrder
    if (!groups.includes(entry.group)) groups.push(entry.group)
  }
  const ordered = Object.freeze([...entries])
  const groupNames = Object.freeze(groups)
  return {
    entries: () => ordered,
    entryById: (id) => byId.get(id) ?? null,
    groupNames: () => groupNames,
  }
}
