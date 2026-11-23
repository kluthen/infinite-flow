/**
 * What the lexicon page keeps for the visit, so a reopening shows it as it was left: the search
 * field's text, the open entries and the scroll position. The page's host makes it once and hands
 * it to every opening; nothing of it is saved on the device, so a reload starts it fresh.
 */
import { reactive } from 'vue'

/** The page's state for the visit, read reactively and changed through its methods. */
export interface LexiconPageState {
  /** The search field's text, as typed. */
  readonly query: string
  /** The ids of the open entries, in the order they were opened. */
  readonly openIds: readonly string[]
  /** The view's scroll position when it last closed. */
  readonly scrollTop: number
  setQuery(query: string): void
  setOpen(id: string, open: boolean): void
  keepScrollTop(scrollTop: number): void
}

/** A fresh state: an empty search, no entry open, at the top. */
// @spec-link [[req_lexicon_page]]
export function createLexiconPageState(): LexiconPageState {
  const data = reactive({ query: '', openIds: [] as string[], scrollTop: 0 })
  return {
    get query() {
      return data.query
    },
    get openIds() {
      return data.openIds
    },
    get scrollTop() {
      return data.scrollTop
    },
    setQuery: (query) => {
      data.query = query
    },
    setOpen: (id, open) => {
      const isOpen = data.openIds.includes(id)
      if (open && !isOpen) data.openIds.push(id)
      else if (!open && isOpen) data.openIds = data.openIds.filter((openId) => openId !== id)
    },
    keepScrollTop: (scrollTop) => {
      data.scrollTop = scrollTop
    },
  }
}
