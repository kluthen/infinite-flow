/**
 * The Review host's side of the session's own tools: each phrase's favorite star, `Pin` /
 * `Unpin`, `Delete session` and the comment, as the controller holds the session they change. A
 * star, a pin and an unpin of a session without favorites apply at once; unpinning a session with
 * favorites, and `Delete session`, open their confirmation through the host's one open
 * confirmation (./use-review-played-notes.ts), which runs the confirmed change here. `Delete
 * session` is offered only while saving is on. A comment saved for a session no longer held (its
 * deletion closed the Review while its editor was open) is dropped with it.
 */
import { computed, type ComputedRef } from 'vue'

import type {
  SessionController,
  SessionDeletion,
  SessionReview,
} from './workspace-session-controller-types'

/**
 * A confirmation of the session tools: unpinning a session holding `favoritesCount` favorites, or
 * deleting a session, with what its sheet names (its start, its favorites, whether it holds a
 * comment and played notes); whether the deletion was refused, and whether one is running.
 */
// @spec-link [[rule_favorite_pins_session]]
// @spec-link [[req_kept_session_list]]
export type SessionToolConfirmation =
  | {
      readonly kind: 'unpin'
      readonly key: string
      readonly favoritesCount: number
      readonly failed: boolean
      readonly busy: boolean
    }
  | {
      readonly kind: 'delete-session'
      readonly key: string
      readonly startedAt: number
      readonly favoritesCount: number
      readonly comment: boolean
      readonly playedNotes: boolean
      readonly failed: boolean
      readonly busy: boolean
    }

/** What the session tools read and open: the controller, the showing Review, the confirmation. */
export interface ReviewSessionToolsDependencies {
  readonly controller: () => SessionController | null
  readonly shownReview: () => SessionReview | null
  /** The showing Review's history holds a played note. */
  readonly holdsPlayedNote: () => boolean
  /** Open `confirmation` as the host's one open confirmation. */
  readonly openConfirmation: (confirmation: SessionToolConfirmation) => void
}

/** The Review host's session tools. */
export interface ReviewSessionTools {
  /** The showing Review's session key; null while none shows. */
  readonly sessionKey: ComputedRef<string | null>
  /** The showing session is pinned. */
  readonly pinned: ComputedRef<boolean>
  /** The numbers of the showing session's favorite phrases. */
  readonly favorites: ComputedRef<readonly number[]>
  /** The showing session's comment; empty when it has none. */
  readonly comment: ComputedRef<string>
  /** `Delete session` is offered: a Review shows and saving is on. */
  readonly canDeleteSession: ComputedRef<boolean>
  /** The player pressed phrase `phraseNumber`'s star: mark or unmark it at once. */
  readonly toggleFavorite: (phraseNumber: number) => void
  /** The player pressed `Pin` or `Unpin`: at once, or its confirmation with favorites. */
  readonly togglePin: () => void
  /** The player pressed `Delete session`: its confirmation opens. */
  readonly askDeleteSession: () => void
  /** The comment editor saved `text` for the session under `key`. */
  readonly saveComment: (key: string, text: string) => void
}

/** Intent: the controller, which must exist while a Review shows. */
function requireController(deps: Pick<ReviewSessionToolsDependencies, 'controller'>) {
  const controller = deps.controller()
  if (controller === null) throw new Error('review host: no session controller yet')
  return controller
}

/**
 * Intent: run a confirmed session-tool confirmation through `controller`: the unpin applies at
 * once (its save never holds the sheet), the deletion resolves as the device answers.
 */
// @spec-link [[rule_favorite_pins_session]]
// @spec-link [[req_kept_session_list]]
export function runSessionToolConfirmation(
  controller: SessionController,
  open: SessionToolConfirmation,
): Promise<SessionDeletion> {
  if (open.kind === 'delete-session') return controller.deleteSession(open.key)
  void controller.setPinned(open.key, false)
  return Promise.resolve('deleted')
}

/**
 * Intent: the session tools of one Review host, over the controller, the showing Review and the
 * host's confirmation.
 */
// @spec-link [[req_favorite_phrases]]
// @spec-link [[rule_favorite_pins_session]]
// @spec-link [[rule_pinned_session_kept]]
// @spec-link [[rule_session_comment]]
// @spec-link [[req_kept_session_list]]
export function useReviewSessionTools(deps: ReviewSessionToolsDependencies): ReviewSessionTools {
  const savingOff = computed(() => deps.controller()?.state.savingOff ?? false)
  const sessionKey = computed(() => deps.shownReview()?.key ?? null)
  const pinned = computed(() => deps.shownReview()?.pinned ?? false)
  const favorites = computed(() => deps.shownReview()?.favorites ?? [])
  const comment = computed(() => deps.shownReview()?.comment ?? '')
  const canDeleteSession = computed(() => deps.shownReview() !== null && !savingOff.value)

  /** Intent: the showing Review, which a tool can only be pressed in. */
  function requireShown(): SessionReview {
    const review = deps.shownReview()
    if (review === null) throw new Error('review host: no Review shows')
    return review
  }

  /** Intent: mark or unmark phrase `phraseNumber` at once. */
  // @spec-link [[req_favorite_phrases]]
  function toggleFavorite(phraseNumber: number): void {
    const { key, favorites: marked } = requireShown()
    void requireController(deps).setFavorite(key, phraseNumber, !marked.includes(phraseNumber))
  }

  /** Intent: pin at once; unpin at once without favorites, after its confirmation with some. */
  // @spec-link [[rule_pinned_session_kept]]
  // @spec-link [[rule_favorite_pins_session]]
  function togglePin(): void {
    const review = requireShown()
    if (review.pinned && review.favorites.length > 0) {
      deps.openConfirmation({
        kind: 'unpin',
        key: review.key,
        favoritesCount: review.favorites.length,
        failed: false,
        busy: false,
      })
      return
    }
    void requireController(deps).setPinned(review.key, !review.pinned)
  }

  /** Intent: open `Delete session`'s confirmation, naming what the session holds. */
  // @spec-link [[req_kept_session_list]]
  function askDeleteSession(): void {
    if (!canDeleteSession.value) throw new Error('review host: no session to delete')
    const review = requireShown()
    deps.openConfirmation({
      kind: 'delete-session',
      key: review.key,
      startedAt: review.history.startedAt,
      favoritesCount: review.favorites.length,
      comment: review.comment !== '',
      playedNotes: deps.holdsPlayedNote(),
      failed: false,
      busy: false,
    })
  }

  /** Intent: save the comment of the session under `key`, while that session is still held. */
  // @spec-link [[rule_session_comment]]
  function saveComment(key: string, text: string): void {
    const controller = requireController(deps)
    if (controller.state.review?.key !== key) return
    void controller.setComment(key, text)
  }

  return {
    sessionKey,
    pinned,
    favorites,
    comment,
    canDeleteSession,
    toggleFavorite,
    togglePin,
    askDeleteSession,
    saveComment,
  }
}
