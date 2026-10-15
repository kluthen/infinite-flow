/**
 * The session controller's side of `Keep my played notes`: the setting, from the player's saved
 * choice, which a session's end reads for its save; turning it on keeps the played notes of the
 * most recent session when they are still in memory and the session is kept; turning it off asks
 * for the deletion when played notes are kept with some session, read at the switch; deleting one
 * session's played notes, or every kept one, after their save, from memory too once the device
 * has. Every change goes through the change path (./kept-session-changes.ts), naming a session by
 * its key; while saving is off the switch changes for the visit only and no deletion is made.
 */
import { shallowRef } from 'vue'

import {
  countSessionsWithKeptPlayedNotes,
  deleteEveryKeptPlayedNote,
  deleteSessionPlayedNotes,
  keepSessionPlayedNotes,
} from './kept-session-changes'
import { mayKeepPlayedNotes, withoutPlayedNotes, withPlayedNotesKept } from './session-review-state'
import type { SessionControllerCore } from './workspace-session-active'
import {
  SessionControllerError,
  type KeepPlayedNotesSwitch,
  type PlayedNotesDeletion,
  type ReviewedSession,
} from './workspace-session-controller-types'
import type { KeptChangeOutcome } from '@/storage/save-policy'

/** The controller's `Keep my played notes` and its deletions. */
export interface KeptPlayedNotes {
  /** The setting now. */
  readonly on: () => boolean
  readonly set: (on: boolean) => Promise<KeepPlayedNotesSwitch>
  readonly deleteShown: () => Promise<PlayedNotesDeletion>
  readonly deleteEvery: () => Promise<PlayedNotesDeletion>
}

const DONE: KeepPlayedNotesSwitch = Object.freeze({ kind: 'done' })

/** Intent: what a deletion's outcome is to the player: a refusal, saving off, or deleted. */
function deletionOf(outcome: KeptChangeOutcome): PlayedNotesDeletion {
  if (outcome.status === 'refused') return 'refused'
  return outcome.status === 'saving-off' ? 'saving-off' : 'deleted'
}

/**
 * Intent: the controller's `Keep my played notes` over its core, starting from the saved choice:
 * the setting, its switch and the deletions, each at Idle only.
 */
// @spec-link [[rule_played_notes_kept_only_after_opt_in]]
// @spec-link [[rule_kept_played_notes_deletable]]
// @spec-link [[module_kept_session_changes]]
export function createKeptPlayedNotes(
  core: Pick<SessionControllerCore, 'state' | 'deps'>,
  saved: boolean,
): KeptPlayedNotes {
  const { state } = core
  const kept = core.deps.keptSessions
  const setting = shallowRef(saved)

  /** Intent: throw unless at Idle, where the Review and its switch are. */
  const assertIdle = (action: string): void => {
    if (state.phase !== 'idle')
      throw new SessionControllerError(`session controller: ${action} during a session`)
  }

  /** Intent: throw unless at Idle with saving on: no deletion is offered while saving is off. */
  const assertDeletable = (action: string): void => {
    assertIdle(action)
    if (kept.savingOff())
      throw new SessionControllerError(`session controller: ${action} while saving is off`)
  }

  /** Intent: the session held under `key`, in the Review or as the most recent one; null if none. */
  const heldSession = (key: string): ReviewedSession | null => {
    if (state.review?.key === key) return state.review
    const recent = state.mostRecent
    return recent?.kind === 'held' && recent.session.key === key ? recent.session : null
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

  /** Intent: keep the most recent session's played notes, still in memory, once it is kept. */
  // @spec-link [[rule_played_notes_kept_only_after_opt_in]]
  const keepMostRecent = async (): Promise<void> => {
    const recent = state.mostRecent
    if (recent?.kind !== 'held' || !mayKeepPlayedNotes(recent.session)) return
    const session = recent.session
    replaceHeld(withPlayedNotesKept(session))
    // A refusal is told by the notice row; the change holds in memory for the visit.
    await keepSessionPlayedNotes(kept.changes, session.key, session.history)
  }

  /** Intent: turn the setting; on, keep the most recent session's; off, count what is kept. */
  // @spec-link [[rule_played_notes_kept_only_after_opt_in]]
  // @spec-link [[rule_kept_played_notes_deletable]]
  const set = async (on: boolean): Promise<KeepPlayedNotesSwitch> => {
    assertIdle('Keep my played notes changed')
    setting.value = on
    if (kept.savingOff()) return DONE
    if (on) {
      await keepMostRecent()
      return DONE
    }
    const counted = await countSessionsWithKeptPlayedNotes(kept.changes)
    if (counted.status !== 'read' || counted.value === 0 || setting.value) return DONE
    return Object.freeze({ kind: 'confirm-deletion', sessionCount: counted.value })
  }

  /** Intent: delete the played notes of the session the Review shows. */
  // @spec-link [[rule_kept_played_notes_deletable]]
  const deleteShown = async (): Promise<PlayedNotesDeletion> => {
    assertDeletable('Delete played notes')
    const review = state.review
    if (
      review === null ||
      !review.showing ||
      !review.playedNotesKept ||
      review.keeping === 'not-saved'
    )
      throw new SessionControllerError('session controller: the Review shows no kept played notes')
    const deletion = deletionOf(await deleteSessionPlayedNotes(kept.changes, review.key))
    const held = heldSession(review.key)
    if (deletion === 'deleted' && held !== null) replaceHeld(withoutPlayedNotes(held))
    return deletion
  }

  /** Intent: delete every kept played note, and from memory those a held session kept. */
  // @spec-link [[rule_kept_played_notes_deletable]]
  const deleteEvery = async (): Promise<PlayedNotesDeletion> => {
    assertDeletable('Delete every kept played note')
    const deletion = deletionOf(await deleteEveryKeptPlayedNote(kept.changes))
    if (deletion !== 'deleted') return deletion
    const recent = state.mostRecent
    const held = [state.review, recent?.kind === 'held' ? recent.session : null]
    for (const session of held) {
      if (session === null || !session.playedNotesKept || session.keeping === 'not-saved') continue
      const current = heldSession(session.key)
      if (current !== null && current.playedNotesKept) replaceHeld(withoutPlayedNotes(current))
    }
    return deletion
  }

  return { on: () => setting.value, set, deleteShown, deleteEvery }
}
