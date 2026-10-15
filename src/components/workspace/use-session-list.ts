/**
 * The review area's side of the session list (../review/SessionList.vue), loaded on demand with
 * the Review's code: the rows the controller holds, which row is the most recent session's and
 * which one's opening runs, and a row's actions. A row's title opens its session; `Pin` pins at
 * once; `Unpin` unpins at once, or opens its confirmation when the row counts favorites; `Delete`
 * opens its confirmation, naming what the row says the session holds. Both confirmations open as
 * the area's one open confirmation (./use-review-played-notes.ts) and run as the Review's do
 * (./use-review-session-tools.ts), keyed by the row; the session's body is never read for them.
 */
import { computed, type ComputedRef } from 'vue'

import type { KeptSessionRow } from './use-kept-sessions'
import type { SessionToolConfirmation } from './use-review-session-tools'
import type { SessionController, SessionOpening } from './workspace-session-controller-types'

/** What the list side reads and opens: the controller and the area's confirmation. */
export interface SessionListDependencies {
  readonly controller: () => SessionController | null
  /** Open `confirmation` as the area's one open confirmation. */
  readonly openConfirmation: (confirmation: SessionToolConfirmation) => void
}

/** The review area's side of the session list. */
export interface SessionListSide {
  /** The list shows, in the review mode's place of a Review. */
  readonly showing: ComputedRef<boolean>
  readonly rows: ComputedRef<readonly KeptSessionRow[]>
  /** The most recent session's key, kept or held; null with none. */
  readonly mostRecentKey: ComputedRef<string | null>
  readonly openingKey: ComputedRef<string | null>
  readonly savingOff: ComputedRef<boolean>
  readonly unreadable: ComputedRef<boolean>
  /** The player pressed a row's title: open its session. */
  readonly open: (key: string) => Promise<SessionOpening>
  /** The player pressed a row's `Pin` / `Unpin`; true when it opened a confirmation. */
  readonly togglePin: (key: string) => boolean
  /** The player pressed a row's `Delete`: its confirmation opens. */
  readonly askDelete: (key: string) => void
}

/** Intent: the controller, which must exist while the list shows. */
function requireController(deps: SessionListDependencies): SessionController {
  const controller = deps.controller()
  if (controller === null) throw new Error('session list: no session controller yet')
  return controller
}

/**
 * Intent: the row of the session under `key` this version reads, which a row's action can only be
 * pressed on.
 */
function currentRow(
  controller: SessionController,
  key: string,
): Extract<KeptSessionRow, { kind: 'current' }> {
  const row = controller.state.keptRows.find((candidate) => candidate.key === key)
  if (row?.kind !== 'current') throw new Error(`session list: no listed session "${key}"`)
  return row
}

/**
 * Intent: the list side of one review area, over the controller and the area's confirmation.
 */
// @spec-link [[req_kept_session_list]]
// @spec-link [[module_kept_session_reach]]
// @spec-link [[rule_favorite_pins_session]]
export function useSessionList(deps: SessionListDependencies): SessionListSide {
  const state = () => deps.controller()?.state ?? null
  const mostRecentKey = computed(() => {
    const recent = state()?.mostRecent ?? null
    if (recent === null) return null
    return recent.kind === 'held' ? recent.session.key : recent.key
  })

  /** Intent: pin at once; unpin at once without favorites, after its confirmation with some. */
  // @spec-link [[rule_pinned_session_kept]]
  // @spec-link [[rule_favorite_pins_session]]
  function togglePin(key: string): boolean {
    const controller = requireController(deps)
    const { summary } = currentRow(controller, key)
    if (summary.pinned && summary.favoritesCount > 0) {
      deps.openConfirmation({
        kind: 'unpin',
        key,
        favoritesCount: summary.favoritesCount,
        failed: false,
        busy: false,
      })
      return true
    }
    void controller.setPinned(key, !summary.pinned)
    return false
  }

  /** Intent: open `Delete`'s confirmation, naming what the row says the session holds. */
  // @spec-link [[req_kept_session_list]]
  function askDelete(key: string): void {
    const controller = requireController(deps)
    if (controller.state.savingOff) throw new Error('session list: no deletion while saving is off')
    const { summary } = currentRow(controller, key)
    deps.openConfirmation({
      kind: 'delete-session',
      key,
      startedAt: summary.startedAt,
      favoritesCount: summary.favoritesCount,
      comment: summary.comment !== '',
      playedNotes: summary.playedNotesKept,
      failed: false,
      busy: false,
    })
  }

  return {
    showing: computed(() => state()?.listShowing === true),
    rows: computed(() => state()?.keptRows ?? []),
    mostRecentKey,
    openingKey: computed(() => state()?.openingKey ?? null),
    savingOff: computed(() => state()?.savingOff ?? false),
    unreadable: computed(() => state()?.keptSessionsUnreadable ?? false),
    open: (key) => requireController(deps).openSession(key),
    togglePin,
    askDelete,
  }
}
