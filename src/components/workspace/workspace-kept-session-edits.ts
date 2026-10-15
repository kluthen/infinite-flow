/**
 * The session controller's side of the changes a Review makes to its session: a favorite mark, a
 * pin or unpin, the comment and `Delete session`. Each change applies at once in memory, to the
 * session held under its key in the Review and as the most recent session alike, so both keep
 * drawing one history; it is then saved when made. A session kept on the device is changed through
 * the change path (./kept-session-review-changes.ts), named by its key; a session whose own save
 * was refused is saved instead by a retry of that save (./workspace-session-save.ts), with its
 * facts as they are then, and a change made while a retry runs waits for it; while saving is off a
 * change holds for the visit only. The first pin or favorite of a visit also asks the browser for
 * persistent storage. `Delete session` removes the session from the device, then from memory.
 */
import type { SessionHistory } from '@/session/session-history'
import { KEPT_SESSION_COMMENT_MAX_LENGTH } from '@/storage/records/kept-session-summary'
import type { KeptChangeOutcome } from '@/storage/save-policy'
import {
  changeKeptComment,
  changeKeptFavorite,
  changeKeptPinned,
  deleteKeptSession,
} from './kept-session-review-changes'
import type { SessionControllerCore } from './workspace-session-active'
import {
  SessionControllerError,
  type ReviewedSession,
  type SessionDeletion,
  type SessionKeeping,
} from './workspace-session-controller-types'
import { saveEndedSession } from './workspace-session-save'

/** The controller's changes to the session a Review draws. */
export interface KeptSessionEdits {
  readonly setFavorite: (key: string, phraseNumber: number, favorite: boolean) => Promise<void>
  readonly setPinned: (key: string, pinned: boolean) => Promise<void>
  readonly setComment: (key: string, comment: string) => Promise<void>
  readonly deleteSession: (key: string) => Promise<SessionDeletion>
  /** The own save of the session under `key` was refused: hold its history for the retry. */
  readonly saveRefused: (key: string, history: SessionHistory) => void
}

/** Intent: how a session with the pin `pinned` is kept, a session not saved staying so. */
function keepingOf(keeping: SessionKeeping, pinned: boolean): SessionKeeping {
  if (keeping === 'not-saved') return keeping
  return pinned ? 'pinned' : 'not-pinned'
}

/**
 * Intent: the session with phrase `phraseNumber` marked a favorite or not; marking pins it, and
 * removing the last favorite leaves the pin as it is.
 */
// @spec-link [[req_favorite_phrases]]
// @spec-link [[rule_favorite_pins_session]]
function withFavorite(
  session: ReviewedSession,
  phraseNumber: number,
  favorite: boolean,
): ReviewedSession {
  const others = session.favorites.filter((number) => number !== phraseNumber)
  const favorites = Object.freeze(
    favorite ? [...others, phraseNumber].sort((a, b) => a - b) : others,
  )
  const pinned = session.pinned || favorite
  return Object.freeze({
    ...session,
    favorites,
    pinned,
    keeping: keepingOf(session.keeping, pinned),
  })
}

/** Intent: the session pinned or unpinned, its keeping saying so unless it is not saved. */
// @spec-link [[rule_pinned_session_kept]]
function withPinned(session: ReviewedSession, pinned: boolean): ReviewedSession {
  return Object.freeze({ ...session, pinned, keeping: keepingOf(session.keeping, pinned) })
}

/**
 * Intent: build the Review's changes over the controller's core: each at Idle only, applied in
 * memory at once, then saved when made.
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[rule_failed_save_never_disturbs_session]]
// @spec-link [[rule_persistent_storage_requested]]
export function createKeptSessionEdits(
  core: Pick<SessionControllerCore, 'state' | 'deps'>,
): KeptSessionEdits {
  const { state } = core
  const kept = core.deps.keptSessions
  /** The session whose own save was refused, with the history its retry saves. */
  let unsaved: { readonly key: string; readonly history: SessionHistory } | null = null
  /** The retry under way; a change made meanwhile waits for it. */
  let retrying: Promise<void> | null = null

  /** Intent: the session held under `key`, in the Review or as the most recent one; null if none. */
  const findHeld = (key: string): ReviewedSession | null => {
    if (state.review?.key === key) return state.review
    const recent = state.mostRecent
    return recent?.kind === 'held' && recent.session.key === key ? recent.session : null
  }

  /** Intent: the session held under `key`, at Idle; throws out of turn or with none held. */
  const heldAtIdle = (key: string, action: string): ReviewedSession => {
    if (state.phase !== 'idle')
      throw new SessionControllerError(`session controller: ${action} during a session`)
    const session = findHeld(key)
    if (session === null)
      throw new SessionControllerError(`session controller: ${action} of no held session`)
    return session
  }

  /**
   * Intent: hold `next` in place of the session under its key, in the most recent session and in
   * the Review (which keeps whether it shows), so both draw the very same history.
   */
  const replaceHeld = (next: ReviewedSession): void => {
    const recent = state.mostRecent
    if (recent?.kind === 'held' && recent.session.key === next.key) {
      state.mostRecent = Object.freeze({ kind: 'held', session: next })
    }
    const review = state.review
    if (review?.key === next.key) state.review = Object.freeze({ ...next, showing: review.showing })
  }

  /**
   * Intent: run the session's own save again for the session under `key`, with its facts as they
   * are now; once saved, its keep line takes its pinned or not-pinned wording. A failed retry
   * changes nothing shown. Nothing to retry without the history of a refused save.
   */
  // @spec-link [[module_kept_session_save]]
  // @spec-link [[rule_failed_save_never_disturbs_session]]
  const retry = async (session: ReviewedSession): Promise<void> => {
    const pending = unsaved
    if (pending === null || pending.key !== session.key) return
    const { key, playedNotesKept, pinned, favorites, comment } = session
    const outcome = await saveEndedSession(
      core.deps.saveHold,
      pending.history,
      { key, playedNotesKept },
      { pinned, favorites, comment },
    )
    if (outcome.status !== 'saved') return
    if (unsaved === pending) unsaved = null
    const current = findHeld(key)
    if (current?.keeping === 'not-saved') {
      replaceHeld(Object.freeze({ ...current, keeping: keepingOf('not-pinned', current.pinned) }))
    }
  }

  /**
   * Intent: save a change made in memory to the session under `key` once any retry under way is
   * over: through `change` while the session is kept on the device, by a retry of its own save
   * while it is not, and not at all while saving is off or once the session left memory.
   */
  const saved = async (key: string, change: () => Promise<KeptChangeOutcome>): Promise<void> => {
    if (retrying !== null) await retrying
    const session = findHeld(key)
    if (session === null || kept.savingOff()) return
    if (session.keeping !== 'not-saved') {
      // A refusal is told by the notice row; the change holds in memory for the visit.
      await change()
      return
    }
    const run = retry(session).finally(() => {
      if (retrying === run) retrying = null
    })
    retrying = run
    await run
  }

  /** Intent: mark or unmark a favorite, at once in memory, then save it. */
  // @spec-link [[req_favorite_phrases]]
  // @spec-link [[rule_favorite_pins_session]]
  // @spec-link [[rule_persistent_storage_requested]]
  const setFavorite = (key: string, phraseNumber: number, favorite: boolean): Promise<void> => {
    const session = heldAtIdle(key, 'a favorite changed')
    if (!session.history.phrases().some((phrase) => phrase.phraseNumber === phraseNumber))
      throw new SessionControllerError(
        `session controller: the session has no phrase ${phraseNumber}`,
      )
    if (session.favorites.includes(phraseNumber) === favorite) return Promise.resolve()
    replaceHeld(withFavorite(session, phraseNumber, favorite))
    if (favorite) kept.requestProtection()
    return saved(key, () => changeKeptFavorite(kept.changes, key, phraseNumber, favorite))
  }

  /** Intent: pin or unpin, at once in memory, then save it. */
  // @spec-link [[rule_pinned_session_kept]]
  // @spec-link [[rule_persistent_storage_requested]]
  const setPinned = (key: string, pinned: boolean): Promise<void> => {
    const session = heldAtIdle(key, 'a pin changed')
    if (session.pinned === pinned) return Promise.resolve()
    replaceHeld(withPinned(session, pinned))
    if (pinned) kept.requestProtection()
    return saved(key, () => changeKeptPinned(kept.changes, key, pinned))
  }

  /** Intent: set the comment, trimmed, at once in memory, then save it unless unchanged. */
  // @spec-link [[rule_session_comment]]
  const setComment = (key: string, text: string): Promise<void> => {
    const session = heldAtIdle(key, 'the comment changed')
    const comment = text.trim()
    if (comment.length > KEPT_SESSION_COMMENT_MAX_LENGTH)
      throw new SessionControllerError(
        `session controller: a comment holds at most ${KEPT_SESSION_COMMENT_MAX_LENGTH} characters`,
      )
    if (comment === session.comment) return Promise.resolve()
    replaceHeld(Object.freeze({ ...session, comment }))
    return saved(key, () => changeKeptComment(kept.changes, key, comment))
  }

  /** Intent: drop the session under `key` from memory: the Review, the most recent session. */
  const forget = (key: string): void => {
    if (state.review?.key === key) state.review = null
    const recent = state.mostRecent
    if (recent !== null && (recent.kind === 'held' ? recent.session.key : recent.key) === key)
      state.mostRecent = null
    if (unsaved?.key === key) unsaved = null
  }

  /**
   * Intent: `Delete session`: from the device (one batch), then from memory; a session held in
   * memory only because its save failed, from memory alone. A refusal, or saving turned off
   * meanwhile, leaves it as it was.
   */
  // @spec-link [[req_kept_session_list]]
  // @spec-link [[module_kept_session_changes]]
  const deleteSession = async (key: string): Promise<SessionDeletion> => {
    heldAtIdle(key, 'Delete session')
    if (kept.savingOff())
      throw new SessionControllerError('session controller: Delete session while saving is off')
    if (retrying !== null) await retrying
    const session = findHeld(key)
    if (session !== null && session.keeping !== 'not-saved') {
      const outcome = await deleteKeptSession(kept.changes, key)
      if (outcome.status === 'refused') return 'refused'
      if (outcome.status === 'saving-off') return 'saving-off'
    }
    forget(key)
    return 'deleted'
  }

  return {
    setFavorite,
    setPinned,
    setComment,
    deleteSession,
    saveRefused: (key, history) => {
      unsaved = { key, history }
    },
  }
}
