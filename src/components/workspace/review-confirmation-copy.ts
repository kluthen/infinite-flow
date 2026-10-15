/**
 * The words of the confirmations a Review opens, as the confirmation sheet shows them: its
 * question, its paragraphs, its two actions, whether the confirming one deletes, and the error a
 * refused deletion shows. Pure.
 */
import { sessionDate } from '@/components/review/session-date'
import type { ReviewConfirmation } from './use-review-played-notes'
import type { SessionToolConfirmation } from './use-review-session-tools'

/** What the confirmation sheet shows for one confirmation. */
export interface ConfirmationCopy {
  readonly title: string
  readonly paragraphs: readonly string[]
  readonly confirmLabel: string
  readonly cancelLabel: string
  readonly destructive: boolean
  /** The error under the paragraphs; null until a deletion is refused. */
  readonly error: string | null
}

/** The last paragraph of every deletion. */
const CANNOT_BE_UNDONE = "This can't be undone."

/** What a refused deletion's sheet says. */
const NOT_DELETED = "That couldn't be deleted. Try again."

/** Intent: "with 1 session", or "with {n} sessions". */
function withSessions(count: number): string {
  return count === 1 ? 'with 1 session' : `with ${count} sessions`
}

/** Intent: parts joined with commas and a last "and": "a", "a and b", "a, b and c". */
function joinedWithAnd(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
}

/**
 * Intent: the words of a session tool's confirmation: "Unpin this session?" for a session with
 * favorites, naming them; "Delete this session?", naming the session by its date and what it
 * holds, in this order and only when present: its favorite phrases, its comment, its played notes.
 */
// @spec-link [[rule_favorite_pins_session]]
// @spec-link [[req_kept_session_list]]
function sessionToolCopy(open: SessionToolConfirmation, error: string | null): ConfirmationCopy {
  if (open.kind === 'unpin') {
    const favorites =
      open.favoritesCount === 1 ? 'its favorite' : `its ${open.favoritesCount} favorites`
    return {
      title: 'Unpin this session?',
      paragraphs: [`It will be deleted, with ${favorites}, when your next session is saved.`],
      confirmLabel: 'Unpin',
      cancelLabel: 'Keep pinned',
      destructive: false,
      error,
    }
  }
  const holds: string[] = []
  if (open.favoritesCount === 1) holds.push('its favorite phrase')
  if (open.favoritesCount > 1) holds.push(`its ${open.favoritesCount} favorite phrases`)
  if (open.comment) holds.push('its comment')
  if (open.playedNotes) holds.push('its played notes')
  const date = sessionDate(open.startedAt)
  const what = holds.length === 0 ? '' : `, with ${joinedWithAnd(holds)}`
  return {
    title: 'Delete this session?',
    paragraphs: [`This deletes the session from ${date}${what}.`, CANNOT_BE_UNDONE],
    confirmLabel: 'Delete session',
    cancelLabel: 'Cancel',
    destructive: true,
    error,
  }
}

/**
 * Intent: the words of a Review's confirmation: "Delete the played notes already kept?" when
 * `Keep my played notes` was turned off while some are kept, "Delete this session's played
 * notes?" for `Delete played notes`, and the session tools' own.
 */
// @spec-link [[rule_kept_played_notes_deletable]]
export function reviewConfirmationCopy(open: ReviewConfirmation): ConfirmationCopy {
  const error = open.failed ? NOT_DELETED : null
  if (open.kind === 'unpin' || open.kind === 'delete-session') return sessionToolCopy(open, error)
  if (open.kind === 'kept-played-notes') {
    return {
      title: 'Delete the played notes already kept?',
      paragraphs: [
        `Your played notes won't be kept from now on. The ones already kept ${withSessions(open.sessionCount)} can be deleted too; the sessions stay.`,
        CANNOT_BE_UNDONE,
      ],
      confirmLabel: 'Delete them',
      cancelLabel: 'Keep them',
      destructive: true,
      error,
    }
  }
  return {
    title: "Delete this session's played notes?",
    paragraphs: [
      'This deletes the notes you played in this session. The session stays, with its favorite phrases and comment.',
      CANNOT_BE_UNDONE,
    ],
    confirmLabel: 'Delete played notes',
    cancelLabel: 'Cancel',
    destructive: true,
    error,
  }
}
