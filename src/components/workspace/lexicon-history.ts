/**
 * The history seam of the lexicon page, the app's one use of the browser's history and of the
 * address's `#` part: no component touches `window.history` or the address itself. The page has
 * one history entry of its own, address `#lexicon`, marked as the page's in its state; the seam
 * pushes it, steps back over it, replaces the address with the bare one, and tells its listener of
 * every move of the history or the address (Back, Forward, an address typed). Any other address
 * part (the path, the query) is left alone.
 */

/** The page's address. */
export const LEXICON_ADDRESS = '#lexicon'

/** The key of the mark the page's own entry carries in its history state. */
const PAGE_ENTRY_MARK = 'infiniteFlowLexiconPage'

/** The browser's history and address, as the lexicon page's host reads and changes them. */
export interface LexiconHistory {
  /** Whether the address is `#lexicon` now. */
  atLexiconAddress(): boolean
  /** Whether the entry now is the page's own: at `#lexicon` and marked as the page's. */
  onPageEntry(): boolean
  /** Add the page's own entry, marked, at `#lexicon`, on top of the entry now. */
  pushPageEntry(): void
  /** Mark the entry now, at `#lexicon`, as the page's own, adding no entry. */
  markPageEntry(): void
  /** Replace the address with the bare one (no `#` part), the entry unmarked, adding no entry. */
  replaceWithBareAddress(): void
  /** Step back over the page's entry, as the browser's Back button does. */
  stepBack(): void
  /** Hear every move of the history or the address; returns the stop. */
  listen(onMove: () => void): () => void
}

/** Whether a history state is the page's mark. */
function isPageMark(state: unknown): boolean {
  return typeof state === 'object' && state !== null && PAGE_ENTRY_MARK in state
}

/** The lexicon page's history seam over a browser window's own history and address. */
// @spec-link [[module_lexicon_page_history_entry]]
export function browserLexiconHistory(target: Window = window): LexiconHistory {
  const { history, location } = target
  const atLexiconAddress = (): boolean => location.hash === LEXICON_ADDRESS
  return {
    atLexiconAddress,
    onPageEntry: () => atLexiconAddress() && isPageMark(history.state),
    pushPageEntry: () => history.pushState({ [PAGE_ENTRY_MARK]: true }, '', LEXICON_ADDRESS),
    markPageEntry: () => history.replaceState({ [PAGE_ENTRY_MARK]: true }, '', LEXICON_ADDRESS),
    replaceWithBareAddress: () =>
      history.replaceState(null, '', `${location.pathname}${location.search}`),
    stepBack: () => history.back(),
    listen: (onMove) => {
      target.addEventListener('popstate', onMove)
      target.addEventListener('hashchange', onMove)
      return () => {
        target.removeEventListener('popstate', onMove)
        target.removeEventListener('hashchange', onMove)
      }
    },
  }
}
