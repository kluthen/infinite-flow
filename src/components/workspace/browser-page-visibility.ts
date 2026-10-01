/**
 * The browser adapter of the page-visibility port: the document's `visibilitychange` event, read
 * through a structural slice so tests supply a hand-made stand-in. Only a change to `hidden`
 * reaches listeners; a hidden tab ends a running session, and a tab shown again changes nothing.
 */
import type { PageVisibility } from '@/session/session-browser-ports'

/** The slice of `document` the adapter reads. */
// @spec-link [[rule_hidden_tab_ends_session]]
export interface VisibilityDocumentLike {
  readonly visibilityState: DocumentVisibilityState
  addEventListener(type: 'visibilitychange', listener: () => void): void
  removeEventListener(type: 'visibilitychange', listener: () => void): void
}

/**
 * Intent: adapt a document to the page-visibility port: each `visibilitychange` after which the
 * document reads `hidden` calls the listener; the returned function removes it.
 */
// @spec-link [[rule_hidden_tab_ends_session]]
export function createDocumentPageVisibility(doc: VisibilityDocumentLike): PageVisibility {
  return {
    onHidden: (listener) => {
      const onChange = (): void => {
        if (doc.visibilityState === 'hidden') listener()
      }
      doc.addEventListener('visibilitychange', onChange)
      return () => doc.removeEventListener('visibilitychange', onChange)
    },
  }
}

/** Intent: the page visibility of this browser tab. */
// @spec-link [[rule_hidden_tab_ends_session]]
export function createBrowserPageVisibility(): PageVisibility {
  return createDocumentPageVisibility(document)
}
