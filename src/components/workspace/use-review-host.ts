/**
 * The score panel's side of the last-session Review: whether it shows, what the lazily loaded
 * `ReviewPanel` is given (the session's phrases and instrument, the workspace staff's viewport and
 * no-room state, the generated-notes export's format, backing track and file action, whether the
 * session holds a played note, the played-notes export and the Played notes switch's state), and
 * the warm-up of the panel's chunk when a session starts, so the Review opening at its end does
 * not wait on a fetch. The export's format and backing track and the Played notes switch are
 * page-session state: held here, in memory, for as long as the page lives, kept across Reviews and
 * sessions, never stored, gone on reload.
 */
import { computed, ref, shallowRef, watch, type ComputedRef, type Ref } from 'vue'

import { loadReviewPanel } from '@/components/review/load-review-panel'
import type { ExportRequest, GeneratedNotesFormat } from '@/components/review/review-types'
import type { GenerationSessionState } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import { getInstrumentProfile } from '@/domain/generation/generation-intent'
import type { StaffViewport } from '@/notation/notation-layout-policy'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { SessionHistory, SessionHistoryRecord } from '@/session/session-history'
import {
  exportGeneratedNotes,
  exportPlayedNotes,
  historyHoldsPlayedNote,
  type ReviewExportPorts,
} from './review-export'
import type { SessionController } from './workspace-session-controller-types'

/** What the Review host reads: the session controller, the Idle state, and the export's ports. */
// @spec-link [[req_last_session_review]]
export interface ReviewHostDependencies {
  readonly controller: () => SessionController | null
  readonly idle: () => Readonly<GenerationSessionState<WorkspaceSessionResult>>
  readonly exportPorts: () => ReviewExportPorts
}

/** What the score panel binds the Review with. */
// @spec-link [[req_last_session_review]]
// @spec-link [[req_session_export]]
export interface ReviewHost {
  /** The Review shows, in place of the staff area. */
  readonly showing: ComputedRef<boolean>
  /** The showing Review's phrases, in the order they started sounding; empty while none shows. */
  readonly records: ComputedRef<readonly SessionHistoryRecord[]>
  /** The showing Review's instrument profile, as the instrument-profile control names it. */
  readonly instrumentName: ComputedRef<string>
  /** The workspace staff's latest viewport; null before the staff has reported one. */
  readonly viewport: Readonly<Ref<StaffViewport | null>>
  /** The workspace staff has no room (the no-room cause only), live. */
  readonly noRoom: ComputedRef<boolean>
  readonly format: Ref<GeneratedNotesFormat>
  readonly backingTrack: Ref<boolean>
  /** Build the asked file from the showing Review's history and download it; rejects on failure. */
  readonly exportFile: (request: ExportRequest) => Promise<void>
  /** The showing Review's history holds a played note in a phrase; false while none shows. */
  // @spec-link [[req_played_notes_export]]
  readonly holdsPlayedNote: ComputedRef<boolean>
  /** Build the showing Review's played-notes file and download it; rejects on failure. */
  // @spec-link [[req_played_notes_export]]
  readonly exportPlayedNotes: () => Promise<void>
  /** The Review's Played notes switch is on; off at first, held for the page session. */
  // @spec-link [[module_review_played_notes_lane]]
  readonly playedNotesShown: Ref<boolean>
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
 * what to give it; a session's start warms the panel's chunk.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[req_session_export]]
// @spec-link [[rule_session_data_never_sent_or_stored]]
export function useReviewHost(deps: ReviewHostDependencies): ReviewHost {
  /** Intent: the Review's history while it shows; null otherwise. */
  const shownHistory = computed((): SessionHistory | null => {
    const review = deps.controller()?.state.review ?? null
    return review !== null && review.showing ? review.history : null
  })
  const showing = computed(() => shownHistory.value !== null)
  const records = computed(() => shownHistory.value?.phrases() ?? [])
  const instrumentName = computed(() => {
    const history = shownHistory.value
    return history === null ? '' : getInstrumentProfile(history.instrumentProfileId).displayName
  })
  const viewport = shallowRef<StaffViewport | null>(null)
  const noRoom = computed(() => deps.idle().roomNotice === 'no_room')
  const format = ref<GeneratedNotesFormat>('musicxml')
  const backingTrack = ref(false)
  // @spec-link [[module_review_played_notes_lane]]
  const playedNotesShown = ref(false)
  // @spec-link [[req_played_notes_export]]
  const holdsPlayedNote = computed(() => historyHoldsPlayedNote(records.value))

  /**
   * Intent: run `run` on the showing Review's history; an export asked for with none showing is a
   * defect, refused as a rejection.
   */
  function withShownHistory(run: (history: SessionHistory) => Promise<void>): Promise<void> {
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
    viewport,
    noRoom,
    format,
    backingTrack,
    exportFile,
    holdsPlayedNote,
    exportPlayedNotes: exportPlayed,
    playedNotesShown,
    noteLayoutInputs: (inputs) => {
      viewport.value = inputs.viewport
    },
  }
}
