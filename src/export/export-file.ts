/**
 * What every export file of a finished session shares, whatever it holds: the shape of a file
 * ready for the browser, the history it is built from, the typed failure for one that cannot be
 * made, the session-stamped stem its name starts with, so a session's generated-notes and
 * played-notes files sort side by side, and the scope that picks which phrases a file holds. Pure: no DOM, no clock read, no storage, no network.
 */

import type { ReviewedPhrase } from '../session/session-history'

/** One file ready to hand to the browser: its name, its MIME type and its bytes. */
// @spec-link [[req_session_export]]
export interface ExportFile {
  readonly fileName: string
  readonly mimeType: string
  readonly bytes: Uint8Array<ArrayBuffer>
}

/** The session history as the export reads it: its phrases and its start time. */
// @spec-link [[req_session_export]]
export interface ExportableHistory {
  phrases(): readonly ReviewedPhrase[]
  readonly startedAt: number
}

/** Typed failure for an export request or start time no file can be made from; never repaired. */
// @spec-link [[req_session_export]]
export class GeneratedNotesFileError extends Error {
  readonly kind = 'GeneratedNotesFileError' as const

  constructor(message: string) {
    super(message)
    this.name = 'GeneratedNotesFileError'
  }
}

/**
 * Which phrases an export file holds: the whole session, or only its favorite phrases, named by
 * their session phrase numbers.
 */
// @spec-link [[req_session_export]]
// @spec-link [[rule_favorites_only_export]]
export type ExportScope =
  | { readonly kind: 'wholeSession' }
  | { readonly kind: 'favoritesOnly'; readonly favorites: readonly number[] }

/** The whole-session scope: every phrase of the session, as v2 exported it. */
// @spec-link [[req_session_export]]
export const WHOLE_SESSION: ExportScope = { kind: 'wholeSession' }

/** Intent: a whole number as text, zero-padded on the left to `width` digits. */
function padded(value: number, width: number): string {
  return String(value).padStart(width, '0')
}

/**
 * Intent: the stem every export file name of a session starts with,
 * `infinite-flow-{YYYY-MM-DD}-{HHmmss}`, from the session's start in the player's local time.
 * Reads no clock: the time is the one the history recorded at start. Throws a
 * GeneratedNotesFileError on a start time that is not finite epoch milliseconds.
 */
// @spec-link [[req_session_export]]
// @spec-link [[req_played_notes_export]]
// @spec-link [[module_review_export_pipeline]]
export function exportFileStem(startedAtMs: number): string {
  if (!Number.isFinite(startedAtMs))
    throw new GeneratedNotesFileError(
      `The session start must be finite epoch milliseconds, got ${startedAtMs}.`,
    )
  const start = new Date(startedAtMs)
  const date = `${padded(start.getFullYear(), 4)}-${padded(start.getMonth() + 1, 2)}-${padded(start.getDate(), 2)}`
  const time = `${padded(start.getHours(), 2)}${padded(start.getMinutes(), 2)}${padded(start.getSeconds(), 2)}`
  return `infinite-flow-${date}-${time}`
}

/**
 * Intent: what a file name adds after its last word for `scope`: `-favorites` for favorites only,
 * nothing for the whole session, whose names stay as they were.
 */
// @spec-link [[rule_favorites_only_export]]
export function scopeNameSuffix(scope: ExportScope): string {
  return scope.kind === 'favoritesOnly' ? '-favorites' : ''
}
