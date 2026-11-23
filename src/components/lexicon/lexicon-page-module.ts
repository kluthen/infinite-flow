/**
 * The lexicon page's code entry, which only the page's loader
 * (src/components/workspace/load-lexicon-page.ts) imports, and only dynamically: the page, its
 * visit's state, and the read interface it reads the lexicon's words through. None of it is in
 * the first load.
 */
export { createLexiconReader } from '@/lexicon'
export { createLexiconPageState, type LexiconPageState } from './lexicon-page-state'
export { default as LexiconPage } from './LexiconPage.vue'
