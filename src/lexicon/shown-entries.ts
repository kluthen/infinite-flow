import type { LexiconEntry } from './lexicon-entry'
import type { ParsedLexiconEntry } from './parse-lexicon'

/**
 * Split an `aliases` field into other names: at each comma outside parentheses, each name trimmed
 * and otherwise as written; `none` (with or without its backticks) gives no name.
 */
function otherNames(aliases: string | null): string[] {
  if (aliases === null || aliases === 'none' || aliases === '`none`') return []
  const names: string[] = []
  let depth = 0
  let start = 0
  for (const [index, character] of [...aliases].entries()) {
    if (character === '(') depth += 1
    else if (character === ')') depth = Math.max(0, depth - 1)
    else if (character === ',' && depth === 0) {
      names.push(aliases.slice(start, index).trim())
      start = index + 1
    }
  }
  names.push(aliases.slice(start).trim())
  return names
}

/**
 * Shape parsed entries into the shown entries of the entry contract, in the order given (the
 * lexicon's): Internal entries dropped, and with them every related id naming one; `sources`
 * dropped; `aliases` split into other names; no app meaning as null; every text field as written.
 * Each entry and its lists are frozen.
 */
// @spec-link [[api_lexicon_read_contract]]
// @spec-link [[module_lexicon_single_source]]
export function shownEntries(entries: readonly ParsedLexiconEntry[]): readonly LexiconEntry[] {
  const shown = entries.filter((entry) => !entry.internal)
  const shownIds = new Set(shown.map((entry) => entry.id))
  return Object.freeze(
    shown.map((entry): LexiconEntry =>
      Object.freeze({
        id: entry.id,
        word: entry.word,
        otherNames: Object.freeze(otherNames(entry.aliases)),
        popup: entry.popup,
        definition: entry.definition,
        appMeaning: entry.inInfiniteFlow,
        related: Object.freeze(entry.related.filter((id) => shownIds.has(id))),
        group: entry.group,
        groupOrder: entry.groupOrder,
      }),
    ),
  )
}
