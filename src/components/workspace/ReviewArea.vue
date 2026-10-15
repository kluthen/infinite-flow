<script setup lang="ts">
/**
 * The review area: the score panel's Review while it shows, loaded on demand with the Review's
 * code through `loadReviewArea()` in ../review/load-review-panel.ts, so none of it weighs on the
 * first draw. It mounts the lazily loaded `ReviewPanel` and binds it: what the page keeps of the
 * Review comes from the Review host it is given (./use-review-host.ts: the staff's viewport, the
 * export choices, `Include very short notes` and the Played notes switch, which outlive this area
 * as the Review closes and opens again), the rest from its own side (./use-review-area.ts). A
 * confirmation the Review opens (deleting played notes, unpinning a session with favorites,
 * `Delete session`) shows in the shared confirmation sheet over the page; once it closes, focus
 * returns to the button that opened it on the way back, after an unpin goes to the pin button,
 * and after a deletion goes to `Keep my played notes` while the Review still shows its played
 * notes, else to `review-title`. The sheet and its words load on demand in a chunk of their own,
 * warmed as this area mounts.
 */
import { computed, defineAsyncComponent, nextTick, ref, shallowRef, watch } from 'vue'

import {
  loadReviewConfirmationSheet,
  loadReviewPanel,
  type ReviewConfirmationSheetComponent,
} from '@/components/review/load-review-panel'
import { browserReviewExportPorts, type ReviewExportPorts } from './review-export'
import { injectSaveSettings } from './save-settings-injection'
import { useReviewArea } from './use-review-area'
import type { ReviewHost } from './use-review-host'
import type { SessionController } from './workspace-session-controller-types'

// The Review and its engraving code load as their own chunk (see load-review-panel.ts).
const ReviewPanel = defineAsyncComponent(loadReviewPanel)

// @spec-link [[req_last_session_review]]
const props = defineProps<{
  /** What the score panel keeps of the Review for the page. */
  host: ReviewHost
  /** The session controller, which holds the showing Review. */
  controller: SessionController | null
  /** The workspace staff has no room (the no-room cause only), live. */
  noRoom: boolean
  /** The shared system-position size, in engraving units, which the Review draws at. */
  systemPositionUnits: number
  /** How the Review's export loads its code and downloads; null for the page's own. */
  exportPorts: ReviewExportPorts | null
}>()

const host = props.host
/** The page's own export ports: the lazy export code, downloading through this page's document. */
const pageExportPorts = browserReviewExportPorts(document)
const review = useReviewArea({
  host,
  controller: () => props.controller,
  exportPorts: () => props.exportPorts ?? pageExportPorts,
  saveSettings: injectSaveSettings(),
})
/** Intent: the showing Review's session start and keeping, for its panel; null while none shows. */
// @spec-link [[req_last_session_review]]
const reviewSession = computed(() => {
  const startedAt = review.startedAt.value
  const keeping = review.keeping.value
  return startedAt === null || keeping === null ? null : { startedAt, keeping }
})

/** The mounted Review panel's exposed API; null until its lazy chunk has loaded and mounted. */
const reviewPanel = ref<{
  readonly focusTitle: () => void
  readonly focusKeepPlayedNotes: () => void
  readonly focusDeletePlayedNotes: () => void
  readonly focusPin: () => void
  readonly focusDeleteSession: () => void
} | null>(null)
/** A `review-title` focus asked for before the panel had mounted. */
let reviewTitleFocusPending = false

/** Intent: focus `review-title` now if the panel is mounted, else once it mounts. */
function focusPendingReviewTitle(): void {
  if (!reviewTitleFocusPending || reviewPanel.value === null) return
  reviewTitleFocusPending = false
  reviewPanel.value.focusTitle()
}

/**
 * Intent: move focus to `review-title`, at once if the panel is mounted, else as soon as its lazy
 * chunk has loaded and it has mounted; the Review closing meanwhile unmounts this area, and drops it.
 */
// @spec-link [[req_last_session_review]]
function focusReviewTitle(): void {
  reviewTitleFocusPending = true
  focusPendingReviewTitle()
}

watch(reviewPanel, focusPendingReviewTitle, { flush: 'post' })

/** The Review's confirmation sheet, with its words; null until its lazy chunk has loaded. */
const confirmationSheet = shallowRef<ReviewConfirmationSheetComponent | null>(null)

/** Intent: load the confirmation sheet's chunk (memoized), keeping the component once loaded. */
function loadConfirmationSheet(): Promise<void> {
  return loadReviewConfirmationSheet().then((component) => {
    confirmationSheet.value = component
  })
}

// As the Review shows, the sheet's chunk is warmed without waiting on it, so a confirmation opens
// on its click. A failure here is not reported: the loader forgets it, and the confirmation's
// opening loads it again, where a failure then surfaces.
void loadConfirmationSheet().catch(() => {})

/** The player closed the confirmation (confirmed or went back), so its focus is already set. */
let confirmationClosedByPlayer = false

/**
 * Intent: confirm the open confirmation; once it closes, focus goes to the pin button after an
 * unpin, to `Keep my played notes` while the Review still shows played notes, else to
 * `review-title`; after `Delete session` the Review is gone. A refusal keeps the sheet.
 */
// @spec-link [[req_last_session_review]]
async function confirmReviewConfirmation(): Promise<void> {
  const kind = review.confirmation.value?.kind
  confirmationClosedByPlayer = true
  const outcome = await review.confirm()
  if (outcome === 'failed') {
    confirmationClosedByPlayer = false
    return
  }
  await nextTick()
  if (kind === 'unpin') reviewPanel.value?.focusPin()
  else if (outcome === 'deleted' && review.holdsPlayedNote.value) {
    reviewPanel.value?.focusKeepPlayedNotes()
  } else {
    reviewPanel.value?.focusTitle()
  }
}

/** Intent: the way back: close the confirmation, focus back on the button that opened it. */
// @spec-link [[req_last_session_review]]
function cancelReviewConfirmation(): void {
  const open = review.confirmation.value
  confirmationClosedByPlayer = true
  review.cancel()
  if (open?.kind === 'session-played-notes') reviewPanel.value?.focusDeletePlayedNotes()
  else if (open?.kind === 'unpin') reviewPanel.value?.focusPin()
  else if (open?.kind === 'delete-session') reviewPanel.value?.focusDeleteSession()
  else reviewPanel.value?.focusKeepPlayedNotes()
}

/**
 * Intent: a confirmation opened before the sheet's chunk has loaded shows once it loads; a failed
 * load closes it the way back does, focus on the button that opened it, and propagates.
 */
// @spec-link [[req_last_session_review]]
function showConfirmationSheet(): void {
  if (confirmationSheet.value !== null) return
  void loadConfirmationSheet().catch((cause: unknown) => {
    if (review.confirmation.value !== null) cancelReviewConfirmation()
    throw cause
  })
}

// A confirmation closed by the page (saving turned off) leaves focus on `review-title`.
watch(
  () => review.confirmation.value === null,
  (closed) => {
    if (!closed) {
      confirmationClosedByPlayer = false
      showConfirmationSheet()
      return
    }
    if (!confirmationClosedByPlayer && host.showing.value) reviewPanel.value?.focusTitle()
  },
  { flush: 'post' },
)

defineExpose({ focusReviewTitle })
</script>

<template>
  <ReviewPanel
    v-if="reviewSession !== null"
    ref="reviewPanel"
    :records="review.records.value"
    :instrument-name="review.instrumentName.value"
    :started-at="reviewSession.startedAt"
    :most-recent="review.mostRecent.value"
    :keeping="reviewSession.keeping"
    :viewport="host.viewport.value"
    :system-position-units="systemPositionUnits"
    :no-room="noRoom"
    :format="host.format.value"
    :backing-track="host.backingTrack.value"
    :export-file="review.exportFile"
    :holds-played-note="review.holdsPlayedNote.value"
    :played-notes-shown="host.playedNotesShown.value"
    :export-played-notes="review.exportPlayedNotes"
    :keep-played-notes="review.keepPlayedNotes.value"
    :can-delete-played-notes="review.canDeletePlayedNotes.value"
    :include-very-short-notes="host.includeVeryShortNotes.value"
    :played-notes-file-holds-note="review.playedNotesFileHoldsNote.value"
    :session-key="review.sessionKey.value ?? ''"
    :pinned="review.pinned.value"
    :favorites="review.favorites.value"
    :comment="review.comment.value"
    :can-delete-session="review.canDeleteSession.value"
    @update:format="host.setFormat"
    @update:backing-track="host.setBackingTrack"
    @update:played-notes-shown="host.setPlayedNotesShown"
    @update:keep-played-notes="review.setKeepPlayedNotes"
    @update:include-very-short-notes="host.setIncludeVeryShortNotes"
    @delete-played-notes="review.askDeletePlayedNotes"
    @toggle-favorite="review.toggleFavorite"
    @toggle-pin="review.togglePin"
    @delete-session="review.askDeleteSession"
    @save-comment="review.saveComment"
  />
  <component
    :is="confirmationSheet"
    v-if="review.confirmation.value !== null && confirmationSheet !== null"
    :confirmation="review.confirmation.value"
    @confirm="confirmReviewConfirmation"
    @cancel="cancelReviewConfirmation"
  />
</template>
