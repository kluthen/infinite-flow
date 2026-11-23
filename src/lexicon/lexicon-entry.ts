/**
 * One shown entry of the lexicon, as the lexicon module hands it out: the entry contract, version
 * 1. Every field is required and no other field exists. Text fields hold the lexicon's words as
 * written, inline marks included.
 */
// @spec-link [[api_lexicon_read_contract]]
export interface LexiconEntry {
  /** The entry's id, unique among the entries. */
  readonly id: string
  /** The entry's heading, as written. */
  readonly word: string
  /** Its other names, in the lexicon's order; empty when the lexicon says `none`. */
  readonly otherNames: readonly string[]
  /** Its plain line, as written. */
  readonly popup: string
  /** Its definition, as written. */
  readonly definition: string
  /** Its app meaning, as written; null when the entry has none. */
  readonly appMeaning: string | null
  /** The ids of its related entries that are shown entries, in the lexicon's order. */
  readonly related: readonly string[]
  /** Its group's name, as the lexicon heads it. */
  readonly group: string
  /** Its group's place in the lexicon's order, from 1. */
  readonly groupOrder: number
}
