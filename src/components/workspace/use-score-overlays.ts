/**
 * The score panel's overlays: what PhraseScore marks on the score from the session controller's
 * state, kept as one stable object so a change elsewhere in that state never redraws the score.
 */
import { computed, type ComputedRef } from 'vue'

import { noteIdentityKey } from '@/notation/note-identity'
import { NO_SCORE_OVERLAYS, type ScoreOverlays } from '@/notation/score-overlay-state'
import type { SessionController } from './workspace-session-controller-types'

/**
 * Intent: what PhraseScore marks on the score: the start marker over the starting note while one
 * would start a session, and the running session's acknowledged notes (the session staff draws
 * its own playhead band, so none here); nothing while the controller is null (still loading). The
 * previous object is kept while neither changes, a new starting note with the same identity
 * included, so a change elsewhere (an unmatched note) never redraws the score.
 */
// @spec-link [[module_notation_note_identity_overlays]]
// @spec-link [[rule_starting_note_named]]
// @spec-link [[rule_acknowledgement_highlights_expected_note_only]]
// @spec-link [[rule_no_grading_or_mismatch_signal]]
export function useScoreOverlays(
  controller: () => SessionController | null,
): ComputedRef<ScoreOverlays> {
  return computed<ScoreOverlays>((previous) => {
    const state = controller()?.state
    const startMarker = state?.startingNote?.identity ?? null
    const acknowledged = state?.acknowledged ?? NO_SCORE_OVERLAYS.acknowledged
    const kept = previous ?? NO_SCORE_OVERLAYS
    const sameMarker =
      startMarker === kept.startMarker ||
      (startMarker !== null &&
        kept.startMarker !== null &&
        noteIdentityKey(startMarker) === noteIdentityKey(kept.startMarker))
    const sameAcknowledged =
      acknowledged === kept.acknowledged ||
      (acknowledged.length === 0 && kept.acknowledged.length === 0)
    if (sameMarker && sameAcknowledged) return kept
    return { startMarker, playheadMeasure: null, acknowledged }
  })
}
