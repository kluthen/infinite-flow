/**
 * The session controller's side of the changes a Review makes to its session: a favorite mark, a
 * pin or unpin, the comment and `Delete session`. Each change applies at once in memory, to the
 * session held under its key in the Review and as the most recent session alike, so both keep
 * drawing one history; it is then saved when made. A session kept on the device is changed through
 * the change path (./kept-session-review-changes.ts), named by its key; a session whose own save
 * was refused is saved instead by a retry of that save (./workspace-session-save.ts), with its
 * facts as they are then, and a change made while a retry runs waits for it; while saving is off a
 * change holds for the visit only. A batch erasing my instrument's sessions holds back the retries
 * of their saves while it is applied: saved, they go with the sessions; refused, each one it held
 * back runs again (spec D338). The first pin or favorite of a visit also asks the browser for
 * persistent storage. `Delete session` removes the session from the device, then from memory.
 * Each change also changes the session's row in the session list (./use-kept-sessions.ts) at
 * once, a deletion once the device has made it. A pin, an unpin and `Delete session` also reach a
 * kept session not held in memory, by its row's key, through the same change path, never reading
 * its body.
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
import type { KeptSessionRow, KeptSessionRows } from './use-kept-sessions'
import type { SessionControllerCore } from './workspace-session-active'
import {
  SessionControllerError,
  type ReviewedSession,
  type SessionDeletion,
  type SessionKeeping,
} from './workspace-session-controller-types'
import { saveEndedSession, tellDamagedDeleted } from './workspace-session-save'

/** The controller's changes to the session a Review draws. */
export interface KeptSessionEdits {
  readonly setFavorite: (key: string, phraseNumber: number, favorite: boolean) => Promise<void>
  readonly setPinned: (key: string, pinned: boolean) => Promise<void>
  readonly setComment: (key: string, comment: string) => Promise<void>
  readonly deleteSession: (key: string) => Promise<SessionDeletion>
  /** The own save of the session under `key` was refused: hold its history for the retry. */
  readonly saveRefused: (key: string, history: SessionHistory) => void
  /** A batch erasing the sessions under `keys` is applied: no retry of their saves writes. */
  readonly holdRetries: (keys: readonly string[]) => void
  /** That batch is saved: the sessions left memory, and the retries of their saves go too. */
  readonly dropRetries: (keys: readonly string[]) => void
  /** That batch is refused, or not made: each retry it held back runs again. */
  readonly resumeRetries: (keys: readonly string[]) => void
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
 * Intent: build the Review's changes over the controller's core and the list's rows: each at Idle
 * only, applied in memory at once, then saved when made.
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[rule_failed_save_never_disturbs_session]]
// @spec-link [[rule_persistent_storage_requested]]
// @spec-link [[module_kept_session_reach]]
export function createKeptSessionEdits(
  core: Pick<SessionControllerCore, 'state' | 'deps'>,
  rows: KeptSessionRows,
): KeptSessionEdits {
  const { state } = core
  const kept = core.deps.keptSessions
  /** The session whose own save was refused, with the history its retry saves. */
  let unsaved: { readonly key: string; readonly history: SessionHistory } | null = null
  /** The retry under way; a change made meanwhile waits for it. */
  let retrying: Promise<void> | null = null
  /** The sessions a batch erasing them holds back from a retry of their save while it applies. */
  const erasing = new Set<string>()
  /** The sessions whose retry such a batch held back, to run again if it is refused. */
  const heldBack = new Set<string>()

  /** Intent: the session held under `key`, in the Review or as the most recent one; null if none. */
  const findHeld = (key: string): ReviewedSession | null => {
    if (state.review?.key === key) return state.review
    const recent = state.mostRecent
    return recent?.kind === 'held' && recent.session.key === key ? recent.session : null
  }

  /** Intent: throw unless at Idle, where every change is made. */
  const assertIdle = (action: string): void => {
    if (state.phase !== 'idle')
      throw new SessionControllerError(`session controller: ${action} during a session`)
  }

  /** Intent: the session held under `key`, at Idle; throws out of turn or with none held. */
  const heldAtIdle = (key: string, action: string): ReviewedSession => {
    assertIdle(action)
    const session = findHeld(key)
    if (session === null)
      throw new SessionControllerError(`session controller: ${action} of no held session`)
    return session
  }

  /**
   * Intent: the row this version reads of the kept session under `key`, not held in memory;
   * throws when there is none (none at all, or one a newer version wrote).
   */
  // @spec-link [[module_kept_session_reach]]
  const currentRow = (
    key: string,
    action: string,
  ): Extract<KeptSessionRow, { kind: 'current' }> => {
    const row = rows.row(key)
    if (row?.kind !== 'current')
      throw new SessionControllerError(`session controller: ${action} of no listed kept session`)
    return row
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
    rows.edited(next.key, {
      pinned: next.pinned,
      favoritesCount: next.favorites.length,
      comment: next.comment,
    })
  }

  /**
   * Intent: run the session's own save again for the session under `key`, with its facts as they
   * are now; once saved, its keep line takes its pinned or not-pinned wording, and the damaged kept
   * sessions its batch deleted are told. A failed retry changes nothing shown. Nothing to retry without the history of a refused save.
   * It stops before its transaction, writing nothing, once its session has left memory, and while
   * a batch erasing it is applied, which holds it back (spec D338).
   */
  // @spec-link [[module_kept_session_save]]
  // @spec-link [[rule_failed_save_never_disturbs_session]]
  const retry = async (session: ReviewedSession): Promise<void> => {
    const pending = unsaved
    if (pending === null || pending.key !== session.key) return
    const { key, playedNotesKept, pinned, favorites, comment } = session
    const saves = rows.savingThrough(core.deps.saveHold, () => findHeld(key))
    /** Intent: whether the retry stops: its session left memory, or a batch erasing it holds it. */
    const stopped = (): boolean => {
      if (unsaved !== pending) return true
      if (!erasing.has(key)) return false
      heldBack.add(key)
      return true
    }
    const outcome = await saveEndedSession(
      {
        saveSession: (changes, pageGoingAway) =>
          saves.saveSession(changes, () => pageGoingAway() || stopped()),
      },
      core.deps.browser.pageLeaving,
      pending.history,
      { key, playedNotesKept },
      { pinned, favorites, comment },
    )
    tellDamagedDeleted(kept.reports, outcome)
    if (outcome.status !== 'saved') return
    if (unsaved === pending) unsaved = null
    const current = findHeld(key)
    if (current?.keeping === 'not-saved') {
      replaceHeld(Object.freeze({ ...current, keeping: keepingOf('not-pinned', current.pinned) }))
    }
  }

  /** Intent: run the retry of `session`'s own save as the retry under way. */
  const retried = (session: ReviewedSession): Promise<void> => {
    const run = retry(session).finally(() => {
      if (retrying === run) retrying = null
    })
    retrying = run
    return run
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
    await retried(session)
  }

  /**
   * Intent: run again, once any retry under way is over, the retry of the session under `key`
   * that a refused batch held back, while it is still held in memory, not saved, and saving is on.
   */
  // @spec-link [[rule_failed_save_never_disturbs_session]]
  const resumed = async (key: string): Promise<void> => {
    if (retrying !== null) await retrying
    const session = findHeld(key)
    if (session === null || session.keeping !== 'not-saved' || kept.savingOff()) return
    await retried(session)
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

  /**
   * Intent: pin or unpin a kept session not held in memory, by its row: the row at once, then
   * saved through the change path, which reads its session-wide record only; nothing is saved
   * while saving is off, and a refusal is told by the notice row, the row staying as changed.
   */
  // @spec-link [[module_kept_session_reach]]
  // @spec-link [[rule_pinned_session_kept]]
  const setRowPinned = (key: string, pinned: boolean): Promise<void> => {
    const row = currentRow(key, 'a pin changed')
    if (row.summary.pinned === pinned) return Promise.resolve()
    rows.edited(key, { pinned })
    if (pinned) kept.requestProtection()
    if (kept.savingOff()) return Promise.resolve()
    // A refusal is told by the notice row; the change holds on the row for the visit.
    return changeKeptPinned(kept.changes, key, pinned).then(() => undefined)
  }

  /** Intent: pin or unpin, at once in memory, then save it. */
  // @spec-link [[rule_pinned_session_kept]]
  // @spec-link [[rule_persistent_storage_requested]]
  const setPinned = (key: string, pinned: boolean): Promise<void> => {
    assertIdle('a pin changed')
    if (findHeld(key) === null) return setRowPinned(key, pinned)
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

  /**
   * Intent: drop the session under `key` from memory: the Review, which the session list replaces
   * when it showed, and the most recent session.
   */
  const forget = (key: string): void => {
    if (state.review?.key === key) {
      if (state.review.showing) state.listShowing = true
      state.review = null
    }
    const recent = state.mostRecent
    if (recent !== null && (recent.kind === 'held' ? recent.session.key : recent.key) === key)
      state.mostRecent = null
    if (unsaved?.key === key) unsaved = null
  }

  /**
   * Intent: `Delete session`: from the device (one batch), then from memory and its row; a
   * session held in memory only because its save failed, from memory alone; one not held, by its
   * row, its body never read. A refusal, or saving turned off meanwhile, leaves it as it was.
   */
  // @spec-link [[req_kept_session_list]]
  // @spec-link [[module_kept_session_reach]]
  // @spec-link [[module_kept_session_changes]]
  const deleteSession = async (key: string): Promise<SessionDeletion> => {
    assertIdle('Delete session')
    if (findHeld(key) === null) currentRow(key, 'Delete session')
    if (kept.savingOff())
      throw new SessionControllerError('session controller: Delete session while saving is off')
    if (retrying !== null) await retrying
    const session = findHeld(key)
    if (session === null || session.keeping !== 'not-saved') {
      const outcome = await deleteKeptSession(kept.changes, key)
      if (outcome.status === 'refused') return 'refused'
      if (outcome.status === 'saving-off') return 'saving-off'
    }
    rows.removed([key])
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
    holdRetries: (keys) => {
      for (const key of keys) erasing.add(key)
    },
    dropRetries: (keys) => {
      for (const key of keys) {
        erasing.delete(key)
        heldBack.delete(key)
      }
      if (unsaved !== null && keys.includes(unsaved.key)) unsaved = null
    },
    resumeRetries: (keys) => {
      for (const key of keys) {
        erasing.delete(key)
        if (heldBack.delete(key)) void resumed(key)
      }
    },
  }
}
