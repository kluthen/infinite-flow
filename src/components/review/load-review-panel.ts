/**
 * Lazy-loading boundary for the last-session Review (./ReviewPanel.vue): nothing may import it
 * statically outside this file, so the panel, its list items and their engraving scheduler stay out
 * of the entry chunk. `loadReviewPanel()` dynamically `import()`s it and memoizes the resulting
 * promise, so the warm-up at a session's start and the Review's mount at its end share one fetch. A
 * rejected import (a lazy chunk failing to fetch) clears the memo before rethrowing, so the next
 * caller tries again. The confirmation sheet a Review opens, with its words, loads the same way
 * through `loadReviewConfirmationSheet()`, in a chunk of its own, and so does the review area that
 * holds the panel and the sheet over the score panel, through `loadReviewArea()`.
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

/**
 * The confirmation sheet a Review opens, typed by its module (a type-only reference, erased in the
 * build). Like the panel, nothing may import it statically outside this file.
 */
// @spec-link [[rule_kept_played_notes_deletable]]
export type ReviewConfirmationSheetComponent =
  (typeof import('@/components/workspace/ReviewConfirmationSheet.vue'))['default']

let confirmationSheetPromise: Promise<ReviewConfirmationSheetComponent> | null = null

/**
 * Intent: the Review's confirmation sheet component, with its words, loaded once and shared by
 * every caller. Safe to call speculatively (as the Review shows) to absorb the fetch ahead of the
 * click that opens a confirmation. A rejected import clears the memo before rethrowing.
 */
// @spec-link [[rule_kept_played_notes_deletable]]
export function loadReviewConfirmationSheet(): Promise<ReviewConfirmationSheetComponent> {
  if (confirmationSheetPromise === null) {
    confirmationSheetPromise = import('@/components/workspace/ReviewConfirmationSheet.vue').then(
      (module) => module.default,
      (cause: unknown) => {
        confirmationSheetPromise = null
        throw cause
      },
    )
  }
  return confirmationSheetPromise
}

/**
 * The review area, which binds the panel and opens the confirmation sheet over the score panel,
 * typed by its module (a type-only reference, erased in the build). Like the panel, nothing may
 * import it statically outside this file.
 */
// @spec-link [[req_last_session_review]]
export type ReviewAreaComponent =
  (typeof import('@/components/workspace/ReviewArea.vue'))['default']

let areaPromise: Promise<ReviewAreaComponent> | null = null

/**
 * Intent: the review area component, with the Review's exports, played-notes side and session
 * tools, loaded once and shared by every caller. Safe to call speculatively (at a session's start)
 * to absorb the fetch ahead of the Review opening. A rejected import clears the memo before
 * rethrowing.
 */
// @spec-link [[req_last_session_review]]
export function loadReviewArea(): Promise<ReviewAreaComponent> {
  if (areaPromise === null) {
    areaPromise = import('@/components/workspace/ReviewArea.vue').then(
      (module) => module.default,
      (cause: unknown) => {
        areaPromise = null
        throw cause
      },
    )
  }
  return areaPromise
}
