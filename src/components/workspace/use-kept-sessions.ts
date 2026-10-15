/**
 * The kept sessions' rows as the session list shows them, held in memory for the visit beside the
 * session controller: built once from the summaries the saved-data load read with the settings
 * (KeptSessionsSeam.summaries), newest first, and never read from the device again. Every save,
 * change and deletion of the visit keeps them current: a session's own save that succeeds adds its
 * row and removes the rows of the sessions it deleted; a pin, a favorite mark, the comment and the
 * played-notes changes edit their row at once; a deletion removes its row once the device has made
 * it. A summary this version cannot read has no row; one a newer version wrote has a row holding
 * what this version can read of it. A row also says whether its last opening failed.
 */
import { shallowRef } from 'vue'

import {
  decodeKeptSessionSummary,
  readNewerKeptSummary,
  type KeptSessionSummary,
  type KeptSummaryEdit,
  type NewerKeptSummaryFacts,
} from '@/storage/records/kept-session-summary'
import type { SessionSaveHold } from '@/storage/settings-saver'
import type { StorageChange, StoredEntry } from '@/storage/storage-port'
import type { ReviewedSession } from './workspace-session-controller-types'

/**
 * One row of the session list: a kept session whose summary this version reads, with its facts,
 * or one a newer version wrote, with what this version can read of it (it cannot be opened, pinned
 * or deleted). `failedToOpen`: its last opening's read did not give the session, until it opens.
 */
// @spec-link [[module_kept_session_reach]]
// @spec-link [[req_kept_session_list]]
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export type KeptSessionRow =
  | {
      readonly kind: 'current'
      readonly key: string
      readonly summary: KeptSessionSummary
      readonly failedToOpen: boolean
    }
  | {
      readonly kind: 'newer'
      readonly key: string
      readonly readable: NewerKeptSummaryFacts
      readonly failedToOpen: false
    }

/** A session save, as the session's own save and its retry reach the visit's saves. */
export type SessionSaves = Pick<SessionSaveHold, 'saveSession'>

/** The rows held for the visit, and the ways the controller's parts keep them current. */
// @spec-link [[module_kept_session_reach]]
export interface KeptSessionRows {
  /** The rows now, newest first by start; reactive. */
  readonly rows: () => readonly KeptSessionRow[]
  /** The row of the kept session under `key`; null when it has none. */
  readonly row: (key: string) => KeptSessionRow | null
  /** A change to the session under `key` applied to its row, if it has a current one. */
  readonly edited: (key: string, edit: KeptSummaryEdit) => void
  /** The sessions under `keys` deleted from the device: their rows leave. */
  readonly removed: (keys: readonly string[]) => void
  /** Every kept played note deleted: no row says its played notes are kept. */
  readonly playedNotesDeleted: () => void
  /** The opening of the session under `key` failed to read it: its row says so. */
  readonly openFailed: (key: string) => void
  /** The session under `key` opened: its row's failed note goes. */
  readonly opened: (key: string) => void
  /**
   * The visit's session saves, through which a session save that succeeds keeps the rows current:
   * the rows of the sessions its batch deleted leave, and the saved session's row is added with
   * its facts as `held` gives them when it settles (a change made while it ran included).
   */
  readonly savingThrough: (saves: SessionSaves, held: () => ReviewedSession | null) => SessionSaves
}

/** Intent: the start a row sorts by: its session's start, unknown for a newer row without one. */
function startOf(row: KeptSessionRow): number | null {
  if (row.kind === 'current') return row.summary.startedAt
  return row.readable.startedAt ?? null
}

/** Intent: rows newest first by start, a row whose start cannot be read last; frozen. */
function sortedRows(rows: readonly KeptSessionRow[]): readonly KeptSessionRow[] {
  return Object.freeze(
    [...rows].sort((a, b) => (startOf(b) ?? -Infinity) - (startOf(a) ?? -Infinity)),
  )
}

/**
 * Intent: the row a stored summary gives under `key`: its facts when this version reads it, what
 * can be read when a newer version wrote it, none when it cannot be read.
 */
// @spec-link [[module_kept_session_reach]]
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export function keptSessionRow(key: string, value: unknown): KeptSessionRow | null {
  const reading = decodeKeptSessionSummary(value)
  if (reading.reading === 'unreadable') return null
  if (reading.reading === 'newer')
    return Object.freeze({
      kind: 'newer',
      key,
      readable: readNewerKeptSummary(value),
      failedToOpen: false,
    })
  return Object.freeze({ kind: 'current', key, summary: reading.value, failedToOpen: false })
}

/** Intent: the facts of a session held in memory that its row shows and a change may change. */
function heldFacts(session: ReviewedSession): KeptSummaryEdit {
  return {
    pinned: session.pinned,
    favoritesCount: session.favorites.length,
    comment: session.comment,
    playedNotesKept: session.playedNotesKept,
  }
}

/**
 * Intent: the rows of the summaries the load read (none from the defaults), held for the visit and
 * kept current by the controller's saves, changes and deletions.
 */
// @spec-link [[module_kept_session_reach]]
// @spec-link [[req_kept_session_list]]
// @spec-link [[module_saved_data_loader]]
export function useKeptSessions(summaries: readonly StoredEntry[]): KeptSessionRows {
  const held = shallowRef<readonly KeptSessionRow[]>(
    sortedRows(summaries.flatMap(({ key, value }) => keptSessionRow(key, value) ?? [])),
  )

  /** Intent: replace the current row under `key` with `change` of it; others stay. */
  const updateCurrent = (
    key: string,
    change: (row: Extract<KeptSessionRow, { kind: 'current' }>) => KeptSessionRow,
  ): void => {
    if (!held.value.some((row) => row.key === key && row.kind === 'current')) return
    held.value = Object.freeze(
      held.value.map((row) => (row.key === key && row.kind === 'current' ? change(row) : row)),
    )
  }

  /** Intent: apply `edit` to the current row under `key`. */
  const edited = (key: string, edit: KeptSummaryEdit): void => {
    updateCurrent(key, (row) =>
      Object.freeze({ ...row, summary: Object.freeze({ ...row.summary, ...edit }) }),
    )
  }

  /** Intent: drop the rows under `keys`. */
  const removed = (keys: readonly string[]): void => {
    if (!held.value.some((row) => keys.includes(row.key))) return
    held.value = Object.freeze(held.value.filter((row) => !keys.includes(row.key)))
  }

  /**
   * Intent: a saved batch's effect on the rows: every session-wide record it deleted leaves, and
   * every one it wrote gives its row, with the facts the held session has now.
   */
  const applySaved = (batch: readonly StorageChange[], session: ReviewedSession | null): void => {
    const summaryChanges = batch.filter((change) => change.store === 'sessionSummaries')
    removed(summaryChanges.map((change) => change.key))
    const added = summaryChanges.flatMap((change) => {
      if (change.kind !== 'write') return []
      const row = keptSessionRow(change.key, change.record)
      return row === null ? [] : [row]
    })
    if (added.length === 0) return
    held.value = sortedRows([...held.value, ...added])
    for (const row of added) {
      if (session?.key === row.key) edited(row.key, heldFacts(session))
    }
  }

  return {
    rows: () => held.value,
    row: (key) => held.value.find((row) => row.key === key) ?? null,
    edited,
    removed,
    playedNotesDeleted: () => {
      held.value = Object.freeze(
        held.value.map((row) =>
          row.kind === 'current' && row.summary.playedNotesKept
            ? Object.freeze({
                ...row,
                summary: Object.freeze({ ...row.summary, playedNotesKept: false }),
              })
            : row,
        ),
      )
    },
    openFailed: (key) => {
      updateCurrent(key, (row) => Object.freeze({ ...row, failedToOpen: true }))
    },
    opened: (key) => {
      updateCurrent(key, (row) =>
        row.failedToOpen ? Object.freeze({ ...row, failedToOpen: false }) : row,
      )
    },
    savingThrough: (saves, session) => ({
      saveSession: async (changes) => {
        let batch: readonly StorageChange[] = []
        const outcome = await saves.saveSession((keptSummaries) => {
          const built = changes(keptSummaries)
          batch = built
          return built
        })
        if (outcome.status === 'saved') applySaved(batch, session())
        return outcome
      },
    }),
  }
}
