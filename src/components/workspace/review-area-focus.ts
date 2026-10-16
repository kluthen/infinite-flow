/**
 * Where focus goes in the review area (./ReviewArea.vue), over its two levels: the Review panel,
 * loaded on demand, and the session list. A focus asked for before its target has mounted waits
 * for it. After a confirmation: an unpin to the pin button; `Delete session` from a Review to the
 * list's title; a row's deletion to the next row's title, else the previous row's, else the list's
 * title, as after a row whose opening found its session damaged and deleted it; a played-notes
 * deletion to `Keep my played notes` while the Review still shows played
 * notes, else to the title. The way back returns focus to the button that opened the sheet. A
 * deletion that finishes after the player closed its sheet moves focus by that same rule only if
 * focus sat on a control the deletion removed; focus anywhere else stays (ux D316).
 */
import { nextTick } from 'vue'

import type { KeptSessionRow } from './use-kept-sessions'
import type { ReviewConfirmation } from './use-review-played-notes'

/** What the review area's two levels expose to focus. */
export interface ReviewAreaLevels {
  readonly panel: {
    readonly focusTitle: () => void
    readonly focusKeepPlayedNotes: () => void
    readonly focusDeletePlayedNotes: () => void
    readonly focusPin: () => void
    readonly focusDeleteSession: () => void
  }
  readonly list: {
    readonly focusTitle: () => void
    readonly focusOpen: (key: string) => void
    readonly focusPin: (key: string) => void
    readonly focusDelete: (key: string) => void
  }
}

/** The mounted levels, each null until mounted, and which one shows. */
export interface ReviewAreaFocusDependencies {
  readonly panel: () => ReviewAreaLevels['panel'] | null
  readonly list: () => ReviewAreaLevels['list'] | null
  readonly listShowing: () => boolean
  /** The list's rows now. */
  readonly rows: () => readonly KeptSessionRow[]
}

/** A confirmation that closed after its deletion ran: what focus is moved by. */
export interface ClosedConfirmation {
  readonly kind: ReviewConfirmation['kind']
  /** The row whose action opened it; null for the Review's own. */
  readonly row: string | null
  /** The rows' keys when it was confirmed. */
  readonly rowsBefore: readonly string[]
  readonly holdsPlayedNote: () => boolean
  /** The player had closed its sheet: move focus only if it sat on a removed control. */
  readonly onlyIfRemoved: boolean
}

/** The review area's focus moves. */
export interface ReviewAreaFocus {
  /** Try the waiting focus again (a level just mounted). */
  readonly retryPending: () => void
  /** Focus the title of the level that shows, once mounted. */
  readonly title: () => void
  /** Focus the row title of the session under `key`, else the list's title, once mounted. */
  readonly rowOrTitle: (key: string | null) => void
  /** Focus a row's title once it is rendered again (after its failed opening). */
  readonly rowOpenWhenRendered: (key: string) => Promise<void>
  /**
   * Once rendered, focus as after the deletion of the row under `key` (its opening found it
   * damaged): the next row's title, else the previous one's, else the list's title.
   */
  readonly rowLeft: (key: string, rowsBefore: readonly string[]) => Promise<void>
  /** The way back from a confirmation of `kind`, opened from `row` or the Review. */
  readonly opener: (kind: ReviewConfirmation['kind'], row: string | null) => void
  /** Follow focus while a confirmed deletion runs, to know where it sat when it ends. */
  readonly trackWhileRunning: () => void
  /** A confirmation's deletion ended and the sheet is closed: move focus by its rule. */
  readonly afterConfirmation: (closed: ClosedConfirmation) => Promise<void>
  /** Stop following focus. */
  readonly dispose: () => void
}

/** Intent: whether `key` names a row whose title can take focus (one this version opens). */
function openable(rows: readonly KeptSessionRow[], key: string | undefined): key is string {
  return key !== undefined && rows.some((row) => row.key === key && row.kind === 'current')
}

/**
 * Intent: the review area's focus moves over its levels; a move asked for before its target has
 * mounted waits for it, the latest move replacing a waiting one.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[req_kept_session_list]]
// @spec-link [[module_kept_session_reach]]
export function useReviewAreaFocus(deps: ReviewAreaFocusDependencies): ReviewAreaFocus {
  /** The move waiting for its target; it returns false while the target is not mounted. */
  let pending: (() => boolean) | null = null
  /** The last element focus moved to while a deletion ran. */
  let lastFocused: Element | null = null
  let tracking = false

  /** Intent: run the waiting move; drop it once it found its target. */
  const retryPending = (): void => {
    if (pending !== null && pending()) pending = null
  }

  /** Intent: make `move` the waiting move and try it now. */
  const attempt = (move: () => boolean): void => {
    pending = move
    retryPending()
  }

  /** Intent: focus the title of the level that shows; false while it is not mounted. */
  const focusTitle = (): boolean => {
    const level = deps.listShowing() ? deps.list() : deps.panel()
    if (level === null) return false
    level.focusTitle()
    return true
  }

  /** Intent: remember where focus moves, while a deletion runs. */
  const onFocusIn = (event: FocusEvent): void => {
    lastFocused = event.target instanceof Element ? event.target : null
  }

  /** Intent: stop following focus. */
  const stopTracking = (): void => {
    if (!tracking) return
    tracking = false
    document.removeEventListener('focusin', onFocusIn)
  }

  /** Intent: focus after a row's deletion: the next row's title, else the previous, else the title. */
  const afterRowDeletion = (row: string, before: readonly string[]): void => {
    const list = deps.list()
    if (list === null) return
    const index = before.indexOf(row)
    const rows = deps.rows()
    const target = [before[index + 1], before[index - 1]].find((key) => openable(rows, key))
    if (target === undefined) list.focusTitle()
    else list.focusOpen(target)
  }

  return {
    retryPending,
    title: () => attempt(focusTitle),
    rowOrTitle: (key) =>
      attempt(() => {
        const list = deps.list()
        if (list === null) return false
        if (key !== null && openable(deps.rows(), key)) list.focusOpen(key)
        else list.focusTitle()
        return true
      }),
    rowOpenWhenRendered: async (key) => {
      await nextTick()
      deps.list()?.focusOpen(key)
    },
    rowLeft: async (key, rowsBefore) => {
      await nextTick()
      afterRowDeletion(key, rowsBefore)
    },
    opener: (kind, row) => {
      const list = deps.list()
      if (row !== null && list !== null) {
        if (kind === 'unpin') list.focusPin(row)
        else list.focusDelete(row)
        return
      }
      const panel = deps.panel()
      if (kind === 'session-played-notes') panel?.focusDeletePlayedNotes()
      else if (kind === 'unpin') panel?.focusPin()
      else if (kind === 'delete-session') panel?.focusDeleteSession()
      else panel?.focusKeepPlayedNotes()
    },
    trackWhileRunning: () => {
      lastFocused = document.activeElement
      if (tracking) return
      tracking = true
      document.addEventListener('focusin', onFocusIn)
    },
    afterConfirmation: async (closed) => {
      const sat = lastFocused
      stopTracking()
      await nextTick()
      if (closed.onlyIfRemoved && (sat === null || sat.isConnected)) return
      if (closed.kind === 'unpin') {
        if (closed.row !== null) deps.list()?.focusPin(closed.row)
        else deps.panel()?.focusPin()
      } else if (closed.kind === 'delete-session') {
        if (closed.row !== null) afterRowDeletion(closed.row, closed.rowsBefore)
        else attempt(focusTitle)
      } else if (closed.holdsPlayedNote()) {
        deps.panel()?.focusKeepPlayedNotes()
      } else {
        attempt(focusTitle)
      }
    },
    dispose: stopTracking,
  }
}
