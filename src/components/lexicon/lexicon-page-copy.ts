/** The lexicon page's own words (ui_ux screens/lexicon-page: Components and Content, States). */

/** The body's intro, shown in browsing and searching alike. */
export const LEXICON_INTRO =
  'The music words and the controls Infinite Flow uses, each in plain words. Choose a letter, or type part of a word in Find a word.'

/** The no-match state's hint, under its sentence. */
export const NO_MATCH_HINT = 'Check the spelling, or type only the first letters of the word.'

/** The matches' visually hidden heading while searching: fixed, with no count or query. */
export const MATCHES_TITLE = 'Matching words'

/** The heading of the group of entries whose plain line mentions the query. */
export const MENTIONS_TITLE = 'Mentioned in other words'

/** The bar's count of the shown entries: "{n} words", "1 word" for one. */
// @spec-link [[req_lexicon_page]]
export function wordCountText(count: number): string {
  return count === 1 ? '1 word' : `${count} words`
}

/** The search's result count, for screen readers; the no-match sentence when nothing matches. */
export function resultCountText(count: number, query: string): string {
  if (count === 0) return noMatchText(query)
  return count === 1 ? `1 word matches “${query}”.` : `${count} words match “${query}”.`
}

/** The no-match state's sentence. */
export function noMatchText(query: string): string {
  return `No word matches “${query}”.`
}

/** The hint under "Mentioned in other words". */
export function mentionsHintText(query: string): string {
  return `Their name doesn't contain “${query}”, but their short line does.`
}
