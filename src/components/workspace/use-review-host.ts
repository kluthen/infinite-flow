/**
 * The score panel's side of the Review: whether it shows, what the lazily loaded `ReviewPanel` is
 * given (the session's phrases, start and instrument as the session holds them, how it is kept and
 * whether it is the most recent session, the workspace staff's viewport and
 * no-room state, the generated-notes export's format, backing track and file action, whether the
 * session holds a played note, the played-notes export and the Played notes switch's state), and
 * the warm-up of the panel's chunk when a session starts, so the Review opening at its end does
 * not wait on a fetch. The export's format and backing track and the Played notes switch start
 * from the player's saved review preferences, loaded before the first draw, and are then held
 * here for as long as the page lives, kept across Reviews and sessions; each change of the
 * player's goes through this host's setters, which save it as it changes.
 */
import { computed, readonly, ref, shallowRef, watch, type ComputedRef, type Ref } from 'vue'

import { loadReviewPanel } from '@/components/review/load-review-panel'
import type { ExportRequest, GeneratedNotesFormat } from '@/components/review/review-types'
import type { GenerationSessionState } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { StaffViewport } from '@/notation/notation-layout-policy'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { ReviewedPhrase } from '@/session/session-history'
import type { ReviewPreferences } from '@/storage/records/setting-defaults'
import type { SaveSettings } from '@/storage/settings-saver'
import {
  exportGeneratedNotes,
  exportPlayedNotes,
  historyHoldsPlayedNote,
  type ReviewExportPorts,
} from './review-export'
import type {
  ReviewedHistory,
  SessionController,
  SessionKeeping,
  SessionReview,
} from './workspace-session-controller-types'

/**
 * What the Review host reads: the session controller, the Idle state, the export's ports, the
 * saved review preferences its export choices and Played notes switch start from, and the saver
 * of the player's changes to them.
 */
// @spec-link [[req_last_session_review]]
export interface ReviewHostDependencies {
  readonly controller: () => SessionController | null
  readonly idle: () => Readonly<GenerationSessionState<WorkspaceSessionResult>>
  readonly exportPorts: () => ReviewExportPorts
  // @spec-link [[rule_first_phrase_waits_for_saved_settings]]
  // @spec-link [[module_review_played_notes_lane]]
  readonly initialPreferences: ReviewPreferences
  /** Save the settings a player's change changed. */
  // @spec-link [[rule_settings_saved_on_change]]
  readonly saveSettings: SaveSettings
}

/** What the score panel binds the Review with. */
// @spec-link [[req_last_session_review]]
// @spec-link [[req_session_export]]
export interface ReviewHost {
  /** The Review shows, in place of the staff area. */
  readonly showing: ComputedRef<boolean>
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
  /** The workspace staff's latest viewport; null before the staff has reported one. */
  readonly viewport: Readonly<Ref<StaffViewport | null>>
  /** The workspace staff has no room (the no-room cause only), live. */
  readonly noRoom: ComputedRef<boolean>
  /** The generated-notes export's format; from the saved preference, changed by `setFormat`. */
  readonly format: Readonly<Ref<GeneratedNotesFormat>>
  /** The export's backing track; from the saved preference, changed by `setBackingTrack`. */
  readonly backingTrack: Readonly<Ref<boolean>>
  /** The player chose the export's format: set and save it. */
  // @spec-link [[rule_settings_saved_on_change]]
  readonly setFormat: (format: GeneratedNotesFormat) => void
  /** The player chose whether the export holds the backing track: set and save it. */
  // @spec-link [[rule_settings_saved_on_change]]
  readonly setBackingTrack: (on: boolean) => void
  /** Build the asked file from the showing Review's history and download it; rejects on failure. */
  readonly exportFile: (request: ExportRequest) => Promise<void>
  /** The showing Review's history holds a played note in a phrase; false while none shows. */
  // @spec-link [[req_played_notes_export]]
  readonly holdsPlayedNote: ComputedRef<boolean>
  /** Build the showing Review's played-notes file and download it; rejects on failure. */
  // @spec-link [[req_played_notes_export]]
  readonly exportPlayedNotes: () => Promise<void>
  /**
   * The Review's Played notes switch is on; from the saved preference, held for the page, changed
   * by `setPlayedNotesShown`.
   */
  // @spec-link [[module_review_played_notes_lane]]
  readonly playedNotesShown: Readonly<Ref<boolean>>
  /** The player turned the Played notes switch: set and save it. */
  // @spec-link [[rule_settings_saved_on_change]]
  readonly setPlayedNotesShown: (on: boolean) => void
  /** Keep the viewport of a layout report the staff made. */
  readonly noteLayoutInputs: (inputs: StaffLayoutInputs) => void
}

/**
 * Intent: warm the Review panel's chunk without waiting on it. A failure here is not reported:
 * the loader forgets it, the Review's mount retries the same loader and a failure then surfaces.
 */
// @spec-link [[req_last_session_review]]
function warmReviewPanel(): void {
  void loadReviewPanel().catch(() => {})
}

/**
 * Intent: the Review host of one score panel: from it the panel learns when the Review shows and
 * what to give it, its export choices and Played notes switch starting from the saved
 * preferences and saved as the player changes them; a session's start warms the panel's chunk.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
// @spec-link [[req_session_export]]
// @spec-link [[rule_session_data_never_sent_or_stored]]
// @spec-link [[rule_settings_saved_on_change]]
export function useReviewHost(deps: ReviewHostDependencies): ReviewHost {
  /** Intent: the Review while it shows; null otherwise. */
  const shownReview = computed((): SessionReview | null => {
    const review = deps.controller()?.state.review ?? null
    return review !== null && review.showing ? review : null
  })
  /** Intent: the Review's history while it shows; null otherwise. */
  const shownHistory = computed((): ReviewedHistory | null => shownReview.value?.history ?? null)
  const showing = computed(() => shownHistory.value !== null)
  const records = computed(() => shownHistory.value?.phrases() ?? [])
  // @spec-link [[req_last_session_review]]
  // @spec-link [[req_kept_session_review]]
  const instrumentName = computed(() => shownReview.value?.instrumentName ?? '')
  const startedAt = computed(() => shownHistory.value?.startedAt ?? null)
  const keeping = computed(() => shownReview.value?.keeping ?? null)
  /** Intent: whether the showing Review draws the most recent session (titled "Last session"). */
  const mostRecent = computed(() => {
    const recent = deps.controller()?.state.mostRecent ?? null
    const history = shownHistory.value
    return history !== null && recent?.kind === 'held' && recent.session.history === history
  })
  const viewport = shallowRef<StaffViewport | null>(null)
  const noRoom = computed(() => deps.idle().roomNotice === 'no_room')
  const format = ref<GeneratedNotesFormat>(deps.initialPreferences.format)
  const backingTrack = ref(deps.initialPreferences.backingTrack)
  // @spec-link [[module_review_played_notes_lane]]
  const playedNotesShown = ref(deps.initialPreferences.playedNotesShown)
  // @spec-link [[req_played_notes_export]]
  const holdsPlayedNote = computed(() => historyHoldsPlayedNote(records.value))

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

  /** Intent: export the played-notes file from the showing Review's history. */
  // @spec-link [[req_played_notes_export]]
  function exportPlayed(): Promise<void> {
    return withShownHistory((history) => exportPlayedNotes(history, deps.exportPorts()))
  }

  /** Intent: the player chose the export's format: set it and save it. */
  function setFormat(chosen: GeneratedNotesFormat): void {
    format.value = chosen
    deps.saveSettings({ 'review.format': chosen })
  }

  /** Intent: the player chose whether the export holds the backing track: set it and save it. */
  function setBackingTrack(on: boolean): void {
    backingTrack.value = on
    deps.saveSettings({ 'review.backingTrack': on })
  }

  /** Intent: the player turned the Played notes switch: set it and save it. */
  // @spec-link [[module_review_played_notes_lane]]
  function setPlayedNotesShown(on: boolean): void {
    playedNotesShown.value = on
    deps.saveSettings({ 'review.playedNotesShown': on })
  }

  const sessionActive = computed(() => {
    const controller = deps.controller()
    return controller !== null && controller.state.phase !== 'idle'
  })
  watch(sessionActive, (active) => {
    if (active) warmReviewPanel()
  })

  return {
    showing,
    records,
    instrumentName,
    startedAt,
    keeping,
    mostRecent,
    viewport,
    noRoom,
    format: readonly(format),
    backingTrack: readonly(backingTrack),
    setFormat,
    setBackingTrack,
    exportFile,
    holdsPlayedNote,
    exportPlayedNotes: exportPlayed,
    playedNotesShown: readonly(playedNotesShown),
    setPlayedNotesShown,
    noteLayoutInputs: (inputs) => {
      viewport.value = inputs.viewport
    },
  }
}
