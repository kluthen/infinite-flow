/**
 * The words of the confirmations a Review opens, as the confirmation sheet shows them: its
 * question, its paragraphs, its two actions, whether the confirming one deletes, and the error a
 * refused deletion shows. Pure.
 */
import type { ReviewConfirmation } from './use-review-played-notes'

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

/**
 * Intent: the words of a Review's confirmation: "Delete the played notes already kept?" when
 * `Keep my played notes` was turned off while some are kept, "Delete this session's played
 * notes?" for `Delete played notes`.
 */
// @spec-link [[rule_kept_played_notes_deletable]]
export function reviewConfirmationCopy(open: ReviewConfirmation): ConfirmationCopy {
  const error = open.failed ? NOT_DELETED : null
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
