/**
 * The Review's transitions, as the session controller applies them: a session end once phrase 1
 * has sounded gives the session its Review draws (named from its own data, kept as its save
 * allows) and opens it showing; `Close review` keeps it without showing it; `Review last session`
 * shows the most recent session again, only at Idle; the save's outcome settles how the session is
 * kept; its played notes are kept after its save, or deleted, from memory too. Each transition returns a new frozen value; one asked for out of turn throws. Pure; the
 * controller holds the current Review and the most recent session in its state.
 */
import type { SessionHistory } from '@/session/session-history'
import type { SessionSaveOutcome } from '@/storage/save-policy'
import type { EndedSessionSave } from './workspace-session-save'
import {
  SessionControllerError,
  type MostRecentSession,
  type ReviewedSession,
  type SessionControllerPhase,
  type SessionKeeping,
  type SessionReview,
} from './workspace-session-controller-types'

/**
 * Intent: the session a session end gives its Review: its closed history, the instrument's name
 * from phrase 1's own intent (the profile the session was played with, my instrument's included,
 * never looked up by id), the tempo it reached (its last sounded phrase's), how it is kept, and
 * the key and played-notes fact its save was asked for with; a history in which no phrase sounded
 * gives none and throws.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[rule_adaptive_tempo_resets_after_session]]
// @spec-link [[module_kept_session_save]]
export function endedSession(
  history: Pick<SessionHistory, 'phrases' | 'phraseCount' | 'startedAt' | 'tempoReached'>,
  keeping: SessionKeeping,
  saving: EndedSessionSave,
): ReviewedSession {
  const tempoReached = history.tempoReached()
  const first = history.phrases()[0]
  if (tempoReached === null || first === undefined) {
    throw new Error('session review: no phrase sounded, so no Review opens')
  }
  const instrumentName = first.intent.instrumentProfile.displayName
  const { key, playedNotesKept } = saving
  return Object.freeze({ history, instrumentName, tempoReached, keeping, key, playedNotesKept })
}

/** Intent: whether a session's history holds a played note in a phrase. */
// @spec-link [[rule_played_notes_kept_only_after_opt_in]]
export function holdsPlayedNote(session: Pick<ReviewedSession, 'history'>): boolean {
  return session.history.phrases().some((phrase) => phrase.playedNotes.length > 0)
}

/**
 * Intent: whether `Keep my played notes` turned on keeps a session's played notes after its save:
 * they are still in memory, not kept yet, and the session is kept on the device.
 */
// @spec-link [[rule_played_notes_kept_only_after_opt_in]]
// @spec-link [[module_kept_session_changes]]
export function mayKeepPlayedNotes(session: ReviewedSession): boolean {
  return !session.playedNotesKept && session.keeping !== 'not-saved' && holdsPlayedNote(session)
}

/** Intent: the session with its played notes kept on the device, its history unchanged. */
// @spec-link [[rule_played_notes_kept_only_after_opt_in]]
export function withPlayedNotesKept(session: ReviewedSession): ReviewedSession {
  return Object.freeze({ ...session, playedNotesKept: true })
}

/**
 * Intent: the session once its played notes are deleted, from memory too: a history of the same
 * phrases, each holding no played note, and its played notes no longer kept.
 */
// @spec-link [[rule_kept_played_notes_deletable]]
export function withoutPlayedNotes(session: ReviewedSession): ReviewedSession {
  const phrases = Object.freeze(
    session.history.phrases().map((phrase) => Object.freeze({ ...phrase, playedNotes: [] })),
  )
  const history = Object.freeze({
    phrases: () => phrases,
    phraseCount: session.history.phraseCount,
    startedAt: session.history.startedAt,
  })
  return Object.freeze({ ...session, history, playedNotesKept: false })
}

/** Intent: the Review a session end opens over `session`, showing. */
// @spec-link [[req_last_session_review]]
export function openedReview(session: ReviewedSession): SessionReview {
  return Object.freeze({ ...session, showing: true })
}

/** Intent: the Review `Close review` leaves: kept, not showing; closing one not showing throws. */
// @spec-link [[req_last_session_review]]
// @spec-link [[rule_new_session_discards_review]]
export function closedReview(review: SessionReview | null): SessionReview {
  if (review === null || !review.showing) {
    throw new SessionControllerError('session controller: no Review shows')
  }
  return Object.freeze({ ...review, showing: false })
}

/**
 * Intent: check that `Review last session` may show the most recent session now and give it:
 * with none, a Review already showing, a session running, or its read already under way, the
 * request is out of turn and throws.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[rule_most_recent_session_kept]]
export function assertReviewMayShow(
  mostRecent: MostRecentSession | null,
  review: SessionReview | null,
  phase: SessionControllerPhase,
  reading: boolean,
): MostRecentSession {
  if (mostRecent === null) throw new SessionControllerError('session controller: no Review exists')
  if (review?.showing === true)
    throw new SessionControllerError('session controller: the Review already shows')
  if (phase !== 'idle') {
    throw new SessionControllerError('session controller: no Review shows during a session')
  }
  if (reading) {
    throw new SessionControllerError('session controller: the most recent session is being read')
  }
  return mostRecent
}

/** Intent: the Review `Review last session` shows over the most recent session, showing. */
// @spec-link [[req_last_session_review]]
// @spec-link [[req_kept_session_review]]
export function shownReview(session: ReviewedSession): SessionReview {
  return Object.freeze({ ...session, showing: true })
}

/**
 * Intent: how the session is kept once its own save's outcome is known: still not pinned once
 * saved (the same value), not saved once the save was refused or skipped with saving off.
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[rule_failed_save_never_disturbs_session]]
export function settledKeeping(
  session: ReviewedSession,
  outcome: SessionSaveOutcome,
): ReviewedSession {
  const keeping: SessionKeeping = outcome.status === 'saved' ? session.keeping : 'not-saved'
  return keeping === session.keeping ? session : Object.freeze({ ...session, keeping })
}
