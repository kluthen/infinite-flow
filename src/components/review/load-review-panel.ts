/**
 * Lazy-loading boundary for the last-session Review (./ReviewPanel.vue): nothing may import it
 * statically outside this file, so the panel, its list items and their engraving scheduler stay out
 * of the entry chunk. `loadReviewPanel()` dynamically `import()`s it and memoizes the resulting
 * promise, so the warm-up at a session's start and the Review's mount at its end share one fetch. A
 * rejected import (a lazy chunk failing to fetch) clears the memo before rethrowing, so the next
 * caller tries again.
 */

/** The Review panel component, typed by its module (a type-only reference, erased in the build). */
// @spec-link [[req_last_session_review]]
export type ReviewPanelComponent = (typeof import('./ReviewPanel.vue'))['default']

let panelPromise: Promise<ReviewPanelComponent> | null = null

/**
 * Intent: the Review panel component, loaded once and shared by every caller. Safe to call
 * speculatively (at a session's start) to absorb the fetch ahead of the Review opening at its end.
 */
// @spec-link [[req_last_session_review]]
export function loadReviewPanel(): Promise<ReviewPanelComponent> {
  if (panelPromise === null) {
    panelPromise = import('./ReviewPanel.vue').then(
      (module) => module.default,
      (cause: unknown) => {
        panelPromise = null
        throw cause
      },
    )
  }
  return panelPromise
}
