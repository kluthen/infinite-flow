/**
 * The browser adapters of the page-visibility port, the document's `visibilitychange` event, and of
 * the page-leaving port beside it, the window's `pagehide` event, each read through a structural
 * slice so tests supply a hand-made stand-in. Only a change to `hidden` reaches listeners; a
 * hidden tab ends a running session, and a tab shown again changes nothing. `pagehide` marks the
 * page as going away for the rest of its life; on a reload or close it fires before the change to
 * `hidden`, in the same task, so the save of the session that change ends never starts.
 */
import type { PageLeaving, PageVisibility } from '@/session/session-browser-ports'

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

/** The slice of `window` the page-leaving adapter reads. */
// @spec-link [[req_rolling_practice_session]]
export interface PageHideTargetLike {
  addEventListener(type: 'pagehide', listener: () => void): void
}

/**
 * Intent: adapt a window to the page-leaving port: listening from now on, the first `pagehide`
 * marks the page as going away, for good (a page brought back from the back-forward cache stays
 * marked, and its listener is never removed).
 */
// @spec-link [[req_rolling_practice_session]]
export function createWindowPageLeaving(target: PageHideTargetLike): PageLeaving {
  let goingAway = false
  target.addEventListener('pagehide', () => {
    goingAway = true
  })
  return { isGoingAway: () => goingAway }
}

/** Intent: the page leaving of this browser tab, listened for from the call on. */
// @spec-link [[req_rolling_practice_session]]
export function createBrowserPageLeaving(): PageLeaving {
  return createWindowPageLeaving(window)
}
