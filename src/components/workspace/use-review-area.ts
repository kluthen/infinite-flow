/**
 * The review area's side of the Review (./ReviewArea.vue, loaded on demand with the Review's
 * code): what the lazily loaded `ReviewPanel` is given beyond what the page keeps in the Review
 * host (./use-review-host.ts). That is the session's phrases, start and instrument as the session
 * holds them, how it is kept and whether it is the most recent session; the generated-notes
 * export's file action; whether the session holds a played note, and the played-notes export as
 * the host's `Include very short notes` asks. Its played-notes side (./use-review-played-notes.ts)
 * gives `Keep my played notes`, `Delete played notes` and the confirmation open over the Review;
 * its session tools (./use-review-session-tools.ts) give each phrase's favorite star, `Pin` /
 * `Unpin`, `Delete session` and the comment.
 */
import { computed, type ComputedRef } from 'vue'

import type { ExportRequest } from '@/components/review/review-types'
import type { ReviewedPhrase } from '@/session/session-history'
import type { SaveSettings } from '@/storage/settings-saver'
import {
  exportGeneratedNotes,
  exportPlayedNotes,
  historyHoldsPlayedNote,
  playedNotesFileHoldsNote,
  type ReviewExportPorts,
} from './review-export'
import type { ReviewHost } from './use-review-host'
import { useReviewPlayedNotes, type ReviewPlayedNotes } from './use-review-played-notes'
import { useReviewSessionTools, type ReviewSessionTools } from './use-review-session-tools'
import type {
  ReviewedHistory,
  SessionController,
  SessionKeeping,
} from './workspace-session-controller-types'

/**
 * What the review area reads: the page's Review host, the session controller, the export's ports,
 * and the saver of the player's changes.
 */
// @spec-link [[req_last_session_review]]
export interface ReviewAreaDependencies {
  /** What the page keeps of the Review: the showing Review and `Include very short notes`. */
  readonly host: Pick<ReviewHost, 'shownReview' | 'includeVeryShortNotes'>
  readonly controller: () => SessionController | null
  readonly exportPorts: () => ReviewExportPorts
  /** Save the settings a player's change changed. */
  readonly saveSettings: SaveSettings
}

/** What the review area binds the Review with, beyond the host's page-lived choices. */
// @spec-link [[req_last_session_review]]
// @spec-link [[req_session_export]]
export interface ReviewArea extends ReviewPlayedNotes, ReviewSessionTools {
  /** The showing Review's phrases, in the order they started sounding; empty while none shows. */
  readonly records: ComputedRef<readonly ReviewedPhrase[]>
  /**
   * The showing Review's instrument, by the name the session holds (never looked up by id); empty
   * while none shows.
   */
  // @spec-link [[req_kept_session_review]]
  readonly instrumentName: ComputedRef<string>
  /** The showing Review's session start, epoch milliseconds; null while none shows. */
  // @spec-link [[req_kept_session_review]]
  readonly startedAt: ComputedRef<number | null>
  /** How the showing Review's session is kept; null while none shows. */
  // @spec-link [[module_kept_session_save]]
  readonly keeping: ComputedRef<SessionKeeping | null>
  /** The showing Review draws the most recent session. */
  // @spec-link [[req_kept_session_review]]
  readonly mostRecent: ComputedRef<boolean>
  /** Build the asked file from the showing Review's history and download it; rejects on failure. */
  readonly exportFile: (request: ExportRequest) => Promise<void>
  /** The showing Review's history holds a played note in a phrase; false while none shows. */
  // @spec-link [[req_played_notes_export]]
  readonly holdsPlayedNote: ComputedRef<boolean>
  /**
   * Build the showing Review's played-notes file as `Include very short notes` asks when it starts,
   * and download it; rejects on failure.
   */
  // @spec-link [[req_played_notes_export]]
  readonly exportPlayedNotes: () => Promise<void>
  /**
   * The showing Review's played-notes file would hold a note under `Include very short notes`;
   * false while none shows. `Export played notes` is disabled while it would not.
   */
  // @spec-link [[rule_played_notes_export_omits_stray_notes]]
  readonly playedNotesFileHoldsNote: ComputedRef<boolean>
}

/**
 * Intent: the review area of one score panel: what its Review is given, read from the showing
 * Review the host names, its exports downloading through the ports and reading the host's
 * `Include very short notes`, with its played-notes side and its session tools.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[req_session_export]]
// @spec-link [[rule_session_data_never_sent_or_stored]]
export function useReviewArea(deps: ReviewAreaDependencies): ReviewArea {
  const { host } = deps
  /** Intent: the Review's history while it shows; null otherwise. */
  const shownHistory = computed(
    (): ReviewedHistory | null => host.shownReview.value?.history ?? null,
  )
  const records = computed(() => shownHistory.value?.phrases() ?? [])
  // @spec-link [[req_last_session_review]]
  // @spec-link [[req_kept_session_review]]
  const instrumentName = computed(() => host.shownReview.value?.instrumentName ?? '')
  const startedAt = computed(() => shownHistory.value?.startedAt ?? null)
  const keeping = computed(() => host.shownReview.value?.keeping ?? null)
  /** Intent: whether the showing Review draws the most recent session (titled "Last session"). */
  const mostRecent = computed(() => {
    const recent = deps.controller()?.state.mostRecent ?? null
    const history = shownHistory.value
    return history !== null && recent?.kind === 'held' && recent.session.history === history
  })
  // @spec-link [[req_played_notes_export]]
  const holdsPlayedNote = computed(() => historyHoldsPlayedNote(records.value))
  // @spec-link [[rule_played_notes_export_omits_stray_notes]]
  const playedNotesFileHolds = computed(() =>
    playedNotesFileHoldsNote(records.value, {
      includeVeryShortNotes: host.includeVeryShortNotes.value,
    }),
  )

  /**
   * Intent: run `run` on the showing Review's history; an export asked for with none showing is a
   * defect, refused as a rejection.
   */
  function withShownHistory(run: (history: ReviewedHistory) => Promise<void>): Promise<void> {
    const history = shownHistory.value
    if (history === null) {
      return Promise.reject(
        new Error('review host: an export was asked for with no Review showing'),
      )
    }
    return run(history)
  }

  /** Intent: export the asked generated-notes file from the showing Review's history. */
  function exportFile(request: ExportRequest): Promise<void> {
    return withShownHistory((history) => exportGeneratedNotes(history, request, deps.exportPorts()))
  }

  /**
   * Intent: export the played-notes file from the showing Review's history, very short notes in it
   * only if `Include very short notes` is on now; a later change leaves this build as it started.
   */
  // @spec-link [[req_played_notes_export]]
  // @spec-link [[rule_played_notes_export_omits_stray_notes]]
  function exportPlayed(): Promise<void> {
    const request = { includeVeryShortNotes: host.includeVeryShortNotes.value }
    return withShownHistory((history) => exportPlayedNotes(history, request, deps.exportPorts()))
  }

  const playedNotes = useReviewPlayedNotes({
    controller: deps.controller,
    shownReview: () => host.shownReview.value,
    saveSettings: deps.saveSettings,
  })
  const sessionTools = useReviewSessionTools({
    controller: deps.controller,
    shownReview: () => host.shownReview.value,
    holdsPlayedNote: () => holdsPlayedNote.value,
    openConfirmation: playedNotes.openConfirmation,
  })

  return {
    records,
    instrumentName,
    startedAt,
    keeping,
    mostRecent,
    exportFile,
    holdsPlayedNote,
    exportPlayedNotes: exportPlayed,
    playedNotesFileHoldsNote: playedNotesFileHolds,
    ...playedNotes,
    ...sessionTools,
  }
}
