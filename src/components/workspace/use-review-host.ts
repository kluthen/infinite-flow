/**
 * The score panel's side of the Review: what it keeps for as long as the page lives, whatever
 * Review shows or closes. That is whether the Review shows and which one; the workspace staff's
 * viewport, which the staff reports whether or not a Review shows; the generated-notes export's
 * format and backing track, `Include very short notes` and the Played notes switch; and the
 * warm-up of the Review's code. The export's format and backing track and the Played notes switch
 * start from the player's saved review preferences, loaded before the first draw, and are then
 * held here, kept across Reviews and sessions; each change of the player's goes through this
 * host's setters, which save it as it changes. `Include very short notes` starts off and is held
 * the same way, for the page only: it is never saved. Everything else the Review is given, its
 * exports, its played-notes side and its session tools, lives in the lazily loaded review area
 * (./ReviewArea.vue, ./use-review-area.ts), which this host is handed to. A session's start warms
 * the area's chunk and the panel's, and the Review showing warms the panel's, so the Review opening
 * does not wait on one fetch after another.
 */
import { computed, readonly, ref, shallowRef, watch, type ComputedRef, type Ref } from 'vue'

import { loadReviewArea, loadReviewPanel } from '@/components/review/load-review-panel'
import type { GeneratedNotesFormat } from '@/components/review/review-types'
import type { StaffViewport } from '@/notation/notation-layout-policy'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { ReviewPreferences } from '@/storage/records/setting-defaults'
import type { SaveSettings } from '@/storage/settings-saver'
import type { SessionController, SessionReview } from './workspace-session-controller-types'

/**
 * What the Review host reads: the session controller, the saved review preferences its export
 * choices and Played notes switch start from, and the saver of the player's changes to them.
 */
// @spec-link [[req_last_session_review]]
export interface ReviewHostDependencies {
  readonly controller: () => SessionController | null
  // @spec-link [[rule_first_phrase_waits_for_saved_settings]]
  // @spec-link [[module_review_played_notes_lane]]
  readonly initialPreferences: ReviewPreferences
  /** Save the settings a player's change changed. */
  // @spec-link [[rule_settings_saved_on_change]]
  readonly saveSettings: SaveSettings
}

/** What the score panel keeps of the Review for the page, and hands to the review area. */
// @spec-link [[req_last_session_review]]
// @spec-link [[req_session_export]]
export interface ReviewHost {
  /** The Review shows, in place of the staff area. */
  readonly showing: ComputedRef<boolean>
  /** The Review while it shows; null otherwise. */
  readonly shownReview: ComputedRef<SessionReview | null>
  /** The workspace staff's latest viewport; null before the staff has reported one. */
  readonly viewport: Readonly<Ref<StaffViewport | null>>
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
  /** `Include very short notes`: off at first, held for the page, never saved. */
  // @spec-link [[rule_played_notes_export_omits_stray_notes]]
  readonly includeVeryShortNotes: Readonly<Ref<boolean>>
  /** The player turned `Include very short notes`: set it, for the page only. */
  // @spec-link [[rule_played_notes_export_omits_stray_notes]]
  readonly setIncludeVeryShortNotes: (on: boolean) => void
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
 * Intent: warm the review area's chunk and the panel's without waiting on them, the same way: a
 * failure is not reported here, the Review's mount loads again and a failure then surfaces.
 */
// @spec-link [[req_last_session_review]]
function warmReviewArea(): void {
  void loadReviewArea().catch(() => {})
  warmReviewPanel()
}

/**
 * Intent: the Review host of one score panel: from it the panel learns when the Review shows, and
 * the review area what the page keeps of it, its export choices and Played notes switch starting
 * from the saved preferences and saved as the player changes them; a session's start warms the
 * Review's chunks, and the Review showing warms the panel's.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
// @spec-link [[req_session_export]]
// @spec-link [[rule_settings_saved_on_change]]
export function useReviewHost(deps: ReviewHostDependencies): ReviewHost {
  /** Intent: the Review while it shows; null otherwise. */
  const shownReview = computed((): SessionReview | null => {
    const review = deps.controller()?.state.review ?? null
    return review !== null && review.showing ? review : null
  })
  const showing = computed(() => shownReview.value !== null)
  const viewport = shallowRef<StaffViewport | null>(null)
  const format = ref<GeneratedNotesFormat>(deps.initialPreferences.format)
  const backingTrack = ref(deps.initialPreferences.backingTrack)
  // @spec-link [[module_review_played_notes_lane]]
  const playedNotesShown = ref(deps.initialPreferences.playedNotesShown)
  // @spec-link [[rule_played_notes_export_omits_stray_notes]]
  const includeVeryShortNotes = ref(false)

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

  /** Intent: the player turned `Include very short notes`: set it for the page; nothing is saved. */
  // @spec-link [[rule_played_notes_export_omits_stray_notes]]
  function setIncludeVeryShortNotes(on: boolean): void {
    includeVeryShortNotes.value = on
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
    if (active) warmReviewArea()
  })
  // The area's chunk loads as it mounts; the panel's is fetched alongside it, not after it.
  watch(
    showing,
    (shows) => {
      if (shows) warmReviewPanel()
    },
    { immediate: true },
  )

  return {
    showing,
    shownReview,
    viewport,
    format: readonly(format),
    backingTrack: readonly(backingTrack),
    setFormat,
    setBackingTrack,
    includeVeryShortNotes: readonly(includeVeryShortNotes),
    setIncludeVeryShortNotes,
    playedNotesShown: readonly(playedNotesShown),
    setPlayedNotesShown,
    noteLayoutInputs: (inputs) => {
      viewport.value = inputs.viewport
    },
  }
}
