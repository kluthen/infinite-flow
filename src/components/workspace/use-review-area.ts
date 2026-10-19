/**
 * The review area's side of the Review (./ReviewArea.vue, loaded on demand with the Review's
 * code): what the lazily loaded `ReviewPanel` is given beyond what the page keeps in the Review
 * host (./use-review-host.ts). That is the session's phrases, start and instrument as the session
 * holds them, how it is kept and whether it is the most recent session; the export scope (`Whole
 * session` at every Review, back to it when the last favorite goes, never saved), which both
 * exports read; the generated-notes export's file action; whether the session holds a played note,
 * and the played-notes export as the host's `Include very short notes` and the scope ask, with the
 * reason it would hold no note. Its played-notes side (./use-review-played-notes.ts)
 * gives `Keep my played notes`, `Delete played notes` and the confirmation open over the Review;
 * its session tools (./use-review-session-tools.ts) give each phrase's favorite star, `Pin` /
 * `Unpin`, `Delete session` and the comment.
 */
import { computed, ref, watch, type ComputedRef } from 'vue'

import type {
  ExportRequest,
  PlayedNotesUnavailable,
  ReviewExportScope,
} from '@/components/review/review-types'
import { WHOLE_SESSION, type ExportScope } from '@/export/export-file'
import type { ReviewedPhrase } from '@/session/session-history'
import type { SaveSettings } from '@/storage/settings-saver'
import {
  exportGeneratedNotes,
  exportPlayedNotes,
  historyHoldsPlayedNote,
  playedNotesFileHoldsNote,
  playedNotesUnavailable,
  type PlayedNotesExportRequest,
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
  /**
   * The showing Review's preset label, the one the session recorded at its start (never rebuilt
   * from the current settings); empty while none shows.
   */
  // @spec-link [[rule_preset_label_kept_with_session]]
  readonly presetLabel: ComputedRef<string>
  /** The showing Review's session start, epoch milliseconds; null while none shows. */
  // @spec-link [[req_kept_session_review]]
  readonly startedAt: ComputedRef<number | null>
  /** How the showing Review's session is kept; null while none shows. */
  // @spec-link [[module_kept_session_save]]
  readonly keeping: ComputedRef<SessionKeeping | null>
  /** The showing Review draws the most recent session. */
  // @spec-link [[req_kept_session_review]]
  readonly mostRecent: ComputedRef<boolean>
  /**
   * The export scope both exports hold: `wholeSession` at every Review, and again as soon as the
   * session has no favorite left.
   */
  // @spec-link [[rule_favorites_only_export]]
  readonly scope: ComputedRef<ReviewExportScope>
  /** The player picked a scope; `favoritesOnly` is refused while the session has no favorite. */
  // @spec-link [[rule_favorites_only_export]]
  readonly setScope: (scope: ReviewExportScope) => void
  /**
   * Build the asked file, under the scope it names, from the showing Review's history and download
   * it; rejects on failure.
   */
  readonly exportFile: (request: ExportRequest) => Promise<void>
  /** The showing Review's history holds a played note in a phrase; false while none shows. */
  // @spec-link [[req_played_notes_export]]
  readonly holdsPlayedNote: ComputedRef<boolean>
  /**
   * Build the showing Review's played-notes file as `Include very short notes` and the scope ask
   * when it starts, and download it; rejects on failure.
   */
  // @spec-link [[req_played_notes_export]]
  readonly exportPlayedNotes: () => Promise<void>
  /**
   * The showing Review's played-notes file would hold a note under `Include very short notes` and
   * the scope; false while none shows. `Export played notes` is disabled while it would not.
   */
  // @spec-link [[rule_played_notes_export_omits_stray_notes]]
  readonly playedNotesFileHoldsNote: ComputedRef<boolean>
  /** Why that file would hold no note, the first reason that applies; null while it holds one. */
  // @spec-link [[rule_favorites_only_export]]
  readonly playedNotesUnavailable: ComputedRef<PlayedNotesUnavailable | null>
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
  // @spec-link [[rule_preset_label_kept_with_session]]
  const presetLabel = computed(() => host.shownReview.value?.presetLabel ?? '')
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
  /** The showing Review's favorite phrases, by number; none while no Review shows. */
  const favorites = computed(() => host.shownReview.value?.favorites ?? [])
  /** The scope the player picked for this Review. */
  const picked = ref<ReviewExportScope>('wholeSession')
  /** Intent: the scope in force: the player's, but the whole session while there is no favorite. */
  // @spec-link [[rule_favorites_only_export]]
  const scope = computed((): ReviewExportScope =>
    favorites.value.length === 0 ? 'wholeSession' : picked.value,
  )
  // A Review of another session starts at the whole session, and so does the scope once the last
  // favorite goes, so a favorite marked again later never brings `Favorites only` back by itself.
  watch(
    shownHistory,
    () => {
      picked.value = 'wholeSession'
    },
    { flush: 'sync' },
  )
  watch(
    () => favorites.value.length === 0,
    (none) => {
      if (none) picked.value = 'wholeSession'
    },
    { flush: 'sync' },
  )

  /** Intent: the player picked `next`; favorites only is refused while there is no favorite. */
  // @spec-link [[rule_favorites_only_export]]
  function setScope(next: ReviewExportScope): void {
    if (next === 'favoritesOnly' && favorites.value.length === 0) {
      throw new Error('review area: favorites only was picked with no favorite in the session')
    }
    picked.value = next
  }

  /**
   * Intent: the export scope `kind` names, favorites only with the showing Review's favorites read
   * now, so a build keeps the favorites it started with.
   */
  // @spec-link [[rule_favorites_only_export]]
  function exportScope(kind: ReviewExportScope): ExportScope {
    if (kind === 'wholeSession') return WHOLE_SESSION
    if (kind === 'favoritesOnly') return { kind, favorites: [...favorites.value] }
    throw new Error(`review area: no export scope "${String(kind)}"`)
  }

  /** Intent: the played-notes request the current choices make. */
  function playedRequest(): PlayedNotesExportRequest {
    return {
      includeVeryShortNotes: host.includeVeryShortNotes.value,
      scope: exportScope(scope.value),
    }
  }
  // @spec-link [[rule_played_notes_export_omits_stray_notes]]
  const playedNotesFileHolds = computed(() =>
    playedNotesFileHoldsNote(records.value, playedRequest()),
  )
  // @spec-link [[rule_favorites_only_export]]
  const playedNotesReason = computed(() => playedNotesUnavailable(records.value, playedRequest()))

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

  /**
   * Intent: export the asked generated-notes file, under the scope it names, from the showing
   * Review's history.
   */
  // @spec-link [[rule_favorites_only_export]]
  function exportFile(request: ExportRequest): Promise<void> {
    return withShownHistory((history) => {
      const { format, backingTrack } = request
      const asked = { format, backingTrack, scope: exportScope(request.scope) }
      return exportGeneratedNotes(history, asked, deps.exportPorts())
    })
  }

  /**
   * Intent: export the played-notes file from the showing Review's history, very short notes in it
   * only if `Include very short notes` is on now, under the scope in force now; a later change
   * leaves this build as it started.
   */
  // @spec-link [[req_played_notes_export]]
  // @spec-link [[rule_played_notes_export_omits_stray_notes]]
  function exportPlayed(): Promise<void> {
    const request = playedRequest()
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
    presetLabel,
    startedAt,
    keeping,
    mostRecent,
    scope,
    setScope,
    exportFile,
    holdsPlayedNote,
    exportPlayedNotes: exportPlayed,
    playedNotesFileHoldsNote: playedNotesFileHolds,
    playedNotesUnavailable: playedNotesReason,
    ...playedNotes,
    ...sessionTools,
  }
}
