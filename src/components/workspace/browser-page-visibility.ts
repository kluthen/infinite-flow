/**
 * The browser adapters of the page-visibility port, the document's `visibilitychange` event, and of
 * the page-leaving port beside it, the window's `pagehide` and `pageshow` events, each read through
 * a structural slice so tests supply a hand-made stand-in. Only a change to `hidden` reaches
 * listeners; a hidden tab ends a running session, and a tab shown again changes nothing.
 * `pagehide` marks the page as going away until a `pageshow` from the back-forward cache brings it
 * back; on a reload or close it fires before the change to `hidden`, in the same task, so the save
 * of the session that change ends never starts. A watch a `pagehide` reached stays set for good,
 * the page brought back included, so that save is never resumed.
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
  addEventListener(
    type: 'pageshow',
    listener: (event: { readonly persisted: boolean }) => void,
  ): void
}

/**
 * Intent: adapt a window to the page-leaving port, listening from now on (its listeners are never
 * removed). Each `pagehide` marks the page as going away and counts one leaving; a `pageshow` with
 * `persisted` true (the back-forward cache bringing the page back) clears the mark, and one
 * without it (the first load) changes nothing. A watch reads set at once if the page is going away
 * at the call, or else once a leaving is counted after the call, and then stays set for good.
 */
// @spec-link [[req_rolling_practice_session]]
export function createWindowPageLeaving(target: PageHideTargetLike): PageLeaving {
  let away = false
  let leaves = 0
  target.addEventListener('pagehide', () => {
    away = true
    leaves += 1
  })
  target.addEventListener('pageshow', (event) => {
    if (event.persisted) away = false
  })
  return {
    watch: () => {
      if (away) return () => true
      const at = leaves
      return () => leaves !== at
    },
  }
}

/** Intent: the page leaving of this browser tab, listened for from the call on. */
// @spec-link [[req_rolling_practice_session]]
export function createBrowserPageLeaving(): PageLeaving {
  return createWindowPageLeaving(window)
}
