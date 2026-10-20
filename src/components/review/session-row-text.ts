/**
 * What one row of the session list writes: its title (the session date, " · Last session" on the
 * most recent session's row), the detail line ("{length} · {n} phrases · {instrument} ·
 * {preset}"), the status line ("{favorites} · Played notes kept · {keeping}"), the comment's
 * first line and the row's note. A row saved by a newer version writes what can be read of it: a
 * line whose facts cannot all be read is omitted, and its title falls back when its start cannot be
 * read. No line or count says how the player played. Pure.
 */
import type { KeptSessionRow } from '@/components/workspace/use-kept-sessions'
import type { NewerKeptSummaryFacts } from '@/storage/records/kept-session-summary'
import { sessionDate } from './session-date'

/** The text one row shows; a null line is not rendered. */
// @spec-link [[req_kept_session_list]]
export interface SessionRowText {
  readonly title: string
  readonly detail: string | null
  readonly status: string | null
  readonly comment: string | null
  readonly note: string | null
}

/** Intent: a count of a thing, singular for one: "1 phrase", "3 phrases". */
function counted(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

/**
 * Intent: a session's length as the row writes it: whole minutes rounded to the nearest, "{m}
 * min", or "Under 1 min" below 30 seconds.
 */
// @spec-link [[req_kept_session_list]]
export function sessionLengthText(seconds: number): string {
  if (seconds < 30) return 'Under 1 min'
  return `${Math.round(seconds / 60)} min`
}

/** Intent: the detail line, or null when one of its facts cannot be read. */
function detailLine(facts: NewerKeptSummaryFacts): string | null {
  const { lengthSeconds, phraseCount, instrument, presetLabel } = facts
  if (
    lengthSeconds === undefined ||
    phraseCount === undefined ||
    instrument === undefined ||
    presetLabel === undefined
  )
    return null
  return [
    sessionLengthText(lengthSeconds),
    counted(phraseCount, 'phrase', 'phrases'),
    instrument.displayName,
    presetLabel,
  ].join(' · ')
}

/** Intent: the status line, or null when one of its facts cannot be read. */
// @spec-link [[rule_pinned_session_kept]]
// @spec-link [[req_favorite_phrases]]
function statusLine(facts: NewerKeptSummaryFacts): string | null {
  const { favoritesCount, playedNotesKept, pinned } = facts
  if (favoritesCount === undefined || playedNotesKept === undefined || pinned === undefined)
    return null
  const favorites =
    favoritesCount === 0 ? 'No favorites' : counted(favoritesCount, 'favorite', 'favorites')
  const keeping = pinned ? 'Pinned' : 'Not pinned: deleted when your next session is saved.'
  return [favorites, ...(playedNotesKept ? ['Played notes kept'] : []), keeping].join(' · ')
}

/** Intent: the comment on one line, its line breaks as spaces; null with none. */
// @spec-link [[rule_session_comment]]
function commentLine(comment: string | undefined): string | null {
  if (comment === undefined || comment === '') return null
  return comment.replace(/\r\n|\r|\n/g, ' ')
}

/**
 * Intent: the text of `row`: its title (" · Last session" when `mostRecent`), its two lines, and
 * either its comment or its note: the newer version's, or the failed opening's, which offers the
 * deletion only while saving is on.
 */
// @spec-link [[req_kept_session_list]]
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export function sessionRowText(
  row: KeptSessionRow,
  mostRecent: boolean,
  savingOff: boolean,
): SessionRowText {
  const facts: NewerKeptSummaryFacts = row.kind === 'current' ? row.summary : row.readable
  const date =
    facts.startedAt === undefined ? 'Saved by a newer version' : sessionDate(facts.startedAt)
  const title = mostRecent ? `${date} · Last session` : date
  let note: string | null = null
  if (row.kind === 'newer')
    note = 'This session was saved by a newer version of the app. Reload the page to open it.'
  else if (row.failedToOpen)
    note = savingOff
      ? "This session couldn't be opened. Try again."
      : "This session couldn't be opened. Try again, or delete it."
  return {
    title,
    detail: detailLine(facts),
    status: statusLine(facts),
    comment: note === null ? commentLine(facts.comment) : null,
    note,
  }
}
