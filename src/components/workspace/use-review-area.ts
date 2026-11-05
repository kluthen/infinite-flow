/**
 * The review area's side of the Review (./ReviewArea.vue, loaded on demand with the Review's
 * code): what the lazily loaded `ReviewPanel` is given beyond what the page keeps in the Review
 * host (./use-review-host.ts). That is the session's phrases, start and instrument as the session
 * holds them, its length as its kept record stores it, how it is kept and whether it is the most
 * recent session. Its exports (./use-review-exports.ts) give the export scope, the generated-notes
 * export's file action, whether the session holds a played note, and the played-notes export with
 * the reason it would hold no note. Its played-notes side (./use-review-played-notes.ts) gives
 * `Keep my played notes`, `Delete played notes` and the confirmation open over the Review; its
 * session tools (./use-review-session-tools.ts) give each phrase's favorite star, `Pin` /
 * `Unpin`, `Delete session` and the comment.
 */
import { computed, type ComputedRef, type Ref } from 'vue'

import type { ReviewJamCode } from '@/components/review/review-types'
import type { ReviewedPhrase } from '@/session/session-history'
import { sessionLengthSeconds } from '@/session/session-timing'
import type { SaveSettings } from '@/storage/settings-saver'
import type { ReviewExportPorts } from './review-export'
import { useReviewExports, type ReviewExports } from './use-review-exports'
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
  /**
   * Jam's code for the showing Review (./use-review-jam-code.ts), which builds the doodle's part
   * of a Jam session's export files; read only for a Jam session.
   */
  readonly jamCode: Readonly<Ref<ReviewJamCode>>
}

/** What the review area binds the Review with, beyond the host's page-lived choices. */
// @spec-link [[req_last_session_review]]
// @spec-link [[req_session_export]]
export interface ReviewArea extends ReviewExports, ReviewPlayedNotes, ReviewSessionTools {
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
  /** The showing Review's session is a Jam session; false while none shows. */
  readonly isJam: ComputedRef<boolean>
  /** The showing Review's session start, epoch milliseconds; null while none shows. */
  // @spec-link [[req_kept_session_review]]
  readonly startedAt: ComputedRef<number | null>
  /**
   * The showing Review's session length in seconds, the one its kept record stores (or would have
   * stored, its save failed); null while none shows.
   */
  // @spec-link [[req_kept_session_review]]
  readonly lengthSeconds: ComputedRef<number | null>
  /** How the showing Review's session is kept; null while none shows. */
  // @spec-link [[module_kept_session_save]]
  readonly keeping: ComputedRef<SessionKeeping | null>
  /** The showing Review draws the most recent session. */
  // @spec-link [[req_kept_session_review]]
  readonly mostRecent: ComputedRef<boolean>
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
  // @spec-link [[req_last_session_review]]
  const isJam = computed(() => host.shownReview.value?.jam !== undefined)
  const startedAt = computed(() => shownHistory.value?.startedAt ?? null)
  /** Intent: the showing Review's length, by the function its kept record is stored with. */
  // @spec-link [[req_kept_session_review]]
  const lengthSeconds = computed(() => {
    const phrases = records.value
    const first = phrases[0]
    const last = phrases.at(-1)
    return first === undefined || last === undefined ? null : sessionLengthSeconds(first, last)
  })
  const keeping = computed(() => host.shownReview.value?.keeping ?? null)
  /** Intent: whether the showing Review draws the most recent session (titled "Last session"). */
  const mostRecent = computed(() => {
    const recent = deps.controller()?.state.mostRecent ?? null
    const history = shownHistory.value
    return history !== null && recent?.kind === 'held' && recent.session.history === history
  })
  const exports = useReviewExports({ host, exportPorts: deps.exportPorts, jamCode: deps.jamCode })
  const playedNotes = useReviewPlayedNotes({
    controller: deps.controller,
    shownReview: () => host.shownReview.value,
    saveSettings: deps.saveSettings,
  })
  const sessionTools = useReviewSessionTools({
    controller: deps.controller,
    shownReview: () => host.shownReview.value,
    holdsPlayedNote: () => exports.holdsPlayedNote.value,
    openConfirmation: playedNotes.openConfirmation,
  })

  return {
    records,
    instrumentName,
    presetLabel,
    isJam,
    startedAt,
    lengthSeconds,
    keeping,
    mostRecent,
    ...exports,
    ...playedNotes,
    ...sessionTools,
  }
}
