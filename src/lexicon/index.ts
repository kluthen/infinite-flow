/**
 * The lexicon module: the parser of the lexicon file, the shaping into shown entries, the entry's
 * type and the read interface. No DOM, browser storage, Vite-only import or network inside it.
 */
export type { LexiconEntry } from './lexicon-entry'
export { LexiconFormatError, parseLexicon, type ParsedLexiconEntry } from './parse-lexicon'
export { createLexiconReader, type LexiconReader } from './read-lexicon'
export { shownEntries } from './shown-entries'
