/**
 * The build-only module the lexicon's build step serves (scripts/lexicon-words-plugin.ts): the
 * lexicon's shown entries, in the lexicon's order. It exists only in a build or the development
 * server, so it is reached only through a dynamic `import()`, never from inside this module.
 */
declare module 'virtual:lexicon-words' {
  import type { LexiconEntry } from '@/lexicon/lexicon-entry'

  // @spec-link [[module_lexicon_single_source]]
  const entries: readonly LexiconEntry[]
  export default entries
}
