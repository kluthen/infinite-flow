/**
 * The Review host's played-notes side: `Keep my played notes`, as the controller holds it, saved
 * as the player turns it and handed to the controller, which says when turning it off asks for the
 * deletion of the played notes already kept; `Delete played notes`, offered only for a session
 * whose played notes are kept while saving is on; and the one confirmation that may be open, with
 * its way through: confirmed (closed once deleted, kept open with its error after a refusal, the
 * confirming action trying again), cancelled, or closed deleting nothing when saving turns off or
 * the review mode is left; a deletion under way when its sheet closes finishes all the same. The session tools' confirmations (unpinning a session with favorites,
 * `Delete session`) open here too, as the one open confirmation, and run through the session tools.
 */
import { computed, shallowRef, watch, type ComputedRef, type ShallowRef } from 'vue'

import type { SaveSettings } from '@/storage/settings-saver'
import {
  runSessionToolConfirmation,
  type SessionToolConfirmation,
} from './use-review-session-tools'
import type {
  PlayedNotesDeletion,
  SessionController,
  SessionReview,
} from './workspace-session-controller-types'

/**
 * The confirmation open over the Review: deleting the played notes already kept (`Keep my played
 * notes` turned off while `sessionCount` sessions keep some), or this session's, or one of the
 * session tools'; whether its deletion was refused, and whether one is running.
 */
// @spec-link [[rule_kept_played_notes_deletable]]
export type ReviewConfirmation =
  | {
      readonly kind: 'kept-played-notes'
      readonly sessionCount: number
      readonly failed: boolean
      readonly busy: boolean
    }
  | { readonly kind: 'session-played-notes'; readonly failed: boolean; readonly busy: boolean }
  | SessionToolConfirmation

/**
 * What became of a confirmed deletion: deleted, refused (the sheet stays), or closed with saving
 * off; once the sheet closed while it ran (the way back, or saving turning off), deleted all the
 * same (`deleted-after-close`) or not (`closed`).
 */
export type ConfirmedDeletion = 'deleted' | 'failed' | 'closed' | 'deleted-after-close'

/** What the played-notes side reads: the controller, the showing Review and the saver. */
export interface ReviewPlayedNotesDependencies {
  readonly controller: () => SessionController | null
  readonly shownReview: () => SessionReview | null
  readonly saveSettings: SaveSettings
}

/** The Review host's played-notes side. */
export interface ReviewPlayedNotes {
  /** `Keep my played notes`, as the controller holds it; off before the controller exists. */
  readonly keepPlayedNotes: ComputedRef<boolean>
  /** The player turned `Keep my played notes`: save it, hand it on, and ask when told to. */
  readonly setKeepPlayedNotes: (on: boolean) => Promise<void>
  /** `Delete played notes` is offered: the showing session's played notes are kept, saving on. */
  readonly canDeletePlayedNotes: ComputedRef<boolean>
  /** The player pressed `Delete played notes`: its confirmation opens. */
  readonly askDeletePlayedNotes: () => void
  /** The confirmation open over the Review; null when none is. */
  readonly confirmation: Readonly<ShallowRef<ReviewConfirmation | null>>
  /** The confirming action: run the open confirmation's deletion. */
  readonly confirm: () => Promise<ConfirmedDeletion>
  /** The way back: close the open confirmation, deleting nothing. */
  readonly cancel: () => void
  /** Open a confirmation of the session tools (./use-review-session-tools.ts) over the Review. */
  readonly openConfirmation: (confirmation: SessionToolConfirmation) => void
}

/** Intent: the controller, which must exist while a Review shows. */
function requireController(deps: ReviewPlayedNotesDependencies): SessionController {
  const controller = deps.controller()
  if (controller === null) throw new Error('review host: no session controller yet')
  return controller
}

/**
 * Intent: the played-notes side of one Review host, over the controller, the showing Review and
 * the saver of the player's changes.
 */
// @spec-link [[rule_played_notes_kept_only_after_opt_in]]
// @spec-link [[rule_kept_played_notes_deletable]]
// @spec-link [[rule_review_played_notes_toggle]]
// @spec-link [[rule_settings_saved_on_change]]
export function useReviewPlayedNotes(deps: ReviewPlayedNotesDependencies): ReviewPlayedNotes {
  const confirmation = shallowRef<ReviewConfirmation | null>(null)
  const keepPlayedNotes = computed(() => deps.controller()?.state.keepPlayedNotes ?? false)
  const savingOff = computed(() => deps.controller()?.state.savingOff ?? false)
  const canDeletePlayedNotes = computed(() => {
    const review = deps.shownReview()
    return (
      review !== null &&
      review.playedNotesKept &&
      review.keeping !== 'not-saved' &&
      !savingOff.value
    )
  })

  /** Intent: save the player's change, hand it to the controller, and open what it asks for. */
  // @spec-link [[rule_kept_played_notes_deletable]]
  async function setKeepPlayedNotes(on: boolean): Promise<void> {
    deps.saveSettings({ keepPlayedNotes: on })
    const outcome = await requireController(deps).setKeepPlayedNotes(on)
    if (outcome.kind !== 'confirm-deletion' || deps.shownReview() === null) return
    const { sessionCount } = outcome
    confirmation.value = { kind: 'kept-played-notes', sessionCount, failed: false, busy: false }
  }

  /** Intent: run the open confirmation's deletion through the controller. */
  function deletion(open: ReviewConfirmation): Promise<PlayedNotesDeletion> {
    const controller = requireController(deps)
    if (open.kind === 'unpin' || open.kind === 'delete-session')
      return runSessionToolConfirmation(controller, open)
    return open.kind === 'session-played-notes'
      ? controller.deletePlayedNotes()
      : controller.deleteEveryKeptPlayedNote()
  }

  /** Intent: confirm: closed once deleted, or with saving off; kept open with its error if refused. */
  // @spec-link [[rule_kept_played_notes_deletable]]
  async function confirm(): Promise<ConfirmedDeletion> {
    const open = confirmation.value
    if (open === null || open.busy) throw new Error('review host: no confirmation to confirm')
    confirmation.value = { ...open, busy: true }
    const outcome = await deletion(open)
    // A deletion under way finishes even once its sheet is closed (ux D316).
    if (confirmation.value === null) return outcome === 'deleted' ? 'deleted-after-close' : 'closed'
    if (outcome === 'refused') {
      confirmation.value = { ...open, failed: true, busy: false }
      return 'failed'
    }
    confirmation.value = null
    return outcome === 'deleted' ? 'deleted' : 'closed'
  }

  // A deletion confirmation open when saving turns off, or any once the review mode is left (no
  // Review and no session list shows), closes; the unpin's, which deletes nothing, stays open
  // while saving turns off.
  const modeLeft = () =>
    deps.shownReview() === null && deps.controller()?.state.listShowing !== true
  watch([savingOff, modeLeft], ([off, gone]) => {
    if (gone || (off && confirmation.value?.kind !== 'unpin')) confirmation.value = null
  })

  return {
    keepPlayedNotes,
    setKeepPlayedNotes,
    canDeletePlayedNotes,
    askDeletePlayedNotes: () => {
      if (!canDeletePlayedNotes.value) throw new Error('review host: no played notes to delete')
      confirmation.value = { kind: 'session-played-notes', failed: false, busy: false }
    },
    confirmation,
    confirm,
    cancel: () => {
      confirmation.value = null
    },
    openConfirmation: (opened) => {
      confirmation.value = opened
    },
  }
}
