<script setup lang="ts">
/**
 * The review area: the score panel's review mode while it shows, loaded on demand with the
 * Review's code through `loadReviewArea()` in ../review/load-review-panel.ts, so none of it weighs
 * on the first draw. It shows one of the mode's two levels: the lazily loaded `ReviewPanel`, bound
 * here, or the session list (`SessionList`, shipped in this chunk), whose rows open, pin, unpin and
 * delete kept sessions (./use-session-list.ts). What the page keeps of the Review comes from the
 * Review host it is given (./use-review-host.ts: the staff's viewport, the export choices,
 * `Include very short notes` and the Played notes switch, which outlive this area as the Review
 * closes and opens again), the rest from its own side (./use-review-area.ts), the export scope
 * among it, which starts at `Whole session` with every Review. A confirmation the Review or a row
 * opens (deleting played notes, unpinning a session with favorites, deleting a session) shows in
 * the shared confirmation sheet over the page; focus then moves by ./review-area-focus.ts. The
 * sheet and its words load on demand in a chunk of their own, warmed as this area mounts. Each
 * switch between the levels asks the page to scroll to its top.
 */
import { computed, defineAsyncComponent, onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import {
  loadReviewConfirmationSheet,
  loadReviewPanel,
  type ReviewConfirmationSheetComponent,
} from '@/components/review/load-review-panel'
import SessionList from '@/components/review/SessionList.vue'
import { browserReviewExportPorts, type ReviewExportPorts } from './review-export'
import { useReviewAreaFocus, type ReviewAreaLevels } from './review-area-focus'
import { injectSaveSettings } from './save-settings-injection'
import { useReviewArea } from './use-review-area'
import { useSessionList } from './use-session-list'
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

const emit = defineEmits<{
  /** The mode switched between a Review and the list: the page scrolls instantly to its top. */
  'scroll-to-top': []
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
/**
 * Intent: the showing Review's session start, length and keeping, for its panel; null while none
 * shows.
 */
// @spec-link [[req_last_session_review]]
const reviewSession = computed(() => {
  const startedAt = review.startedAt.value
  const lengthSeconds = review.lengthSeconds.value
  const keeping = review.keeping.value
  return startedAt === null || lengthSeconds === null || keeping === null
    ? null
    : { startedAt, lengthSeconds, keeping }
})

const list = useSessionList({
  controller: () => props.controller,
  openConfirmation: review.openConfirmation,
})

/** The mounted Review panel's exposed API; null until its lazy chunk has loaded and mounted. */
const reviewPanel = ref<ReviewAreaLevels['panel'] | null>(null)
/** The mounted session list's exposed API; null while the list does not show. */
const sessionList = ref<ReviewAreaLevels['list'] | null>(null)

/** The review mode's levels, as focus finds them. */
const levels = {
  panel: () => reviewPanel.value,
  list: () => sessionList.value,
  listShowing: () => list.showing.value,
  rows: () => list.rows.value,
}
const focus = useReviewAreaFocus(levels)
watch([reviewPanel, sessionList], focus.retryPending, { flush: 'post' })
onBeforeUnmount(focus.dispose)

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
/** The key of the row whose `Unpin` or `Delete` opened the confirmation; null for the Review's. */
let rowAsked: string | null = null
/** The player took the way back while the confirmed deletion ran. */
let closedWhileRunning = false

/**
 * Intent: confirm the open confirmation. A refusal keeps the sheet. Once it closes, focus moves by
 * the confirmation's own rule; a deletion that finishes after the player closed its sheet moves
 * focus only if it sat on a control the deletion removed, and a refusal then moves nothing (ux
 * D316); a confirmation the page closed (saving turned off) leaves focus on the title.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[module_kept_session_reach]]
async function confirmReviewConfirmation(): Promise<void> {
  const open = review.confirmation.value
  if (open === null) return
  const row = rowAsked
  const rowsBefore = list.rows.value.map(({ key }) => key)
  confirmationClosedByPlayer = true
  closedWhileRunning = false
  focus.trackWhileRunning()
  const outcome = await review.confirm()
  if (outcome === 'failed') {
    confirmationClosedByPlayer = false
    return
  }
  const afterClose = outcome === 'closed' || outcome === 'deleted-after-close'
  const byPlayer = closedWhileRunning
  rowAsked = null
  if (afterClose && !byPlayer) return focus.title()
  if (outcome === 'closed') return
  await focus.afterConfirmation({
    kind: open.kind,
    row,
    rowsBefore,
    holdsPlayedNote: () => review.holdsPlayedNote.value,
    onlyIfRemoved: afterClose,
  })
}

/** Intent: the way back: close the confirmation, focus back on the button that opened it. */
// @spec-link [[req_last_session_review]]
function cancelReviewConfirmation(): void {
  const open = review.confirmation.value
  confirmationClosedByPlayer = true
  if (open?.busy === true) closedWhileRunning = true
  review.cancel()
  const row = rowAsked
  rowAsked = null
  if (open !== null) focus.opener(open.kind, row)
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

// A confirmation closed by the page (saving turned off) leaves focus on the title.
watch(
  () => review.confirmation.value === null,
  (closed) => {
    if (!closed) {
      confirmationClosedByPlayer = false
      showConfirmationSheet()
      return
    }
    if (!confirmationClosedByPlayer && (host.showing.value || list.showing.value)) focus.title()
  },
  { flush: 'post' },
)

/**
 * Intent: a row's title pressed: once read, its Review shows; a failed read keeps focus there; a
 * session found damaged leaves with its row, focus moving as after that row's deletion.
 */
// @spec-link [[module_kept_session_reach]]
// @spec-link [[module_kept_session_save]]
async function openRow(key: string): Promise<void> {
  const rowsBefore = list.rows.value.map((row) => row.key)
  const outcome = await list.open(key)
  if (outcome === 'shown') {
    emit('scroll-to-top')
    focus.title()
  } else if (outcome === 'failed') {
    await focus.rowOpenWhenRendered(key)
  } else if (outcome === 'damaged') {
    await focus.rowLeft(key, rowsBefore)
  }
}

/** Intent: a row's `Pin` / `Unpin` pressed: at once, or its confirmation from this row. */
// @spec-link [[rule_favorite_pins_session]]
function toggleRowPin(key: string): void {
  if (list.togglePin(key)) rowAsked = key
}

/** Intent: a row's `Delete` pressed: its confirmation, from this row. */
// @spec-link [[req_kept_session_list]]
function askRowDelete(key: string): void {
  rowAsked = key
  list.askDelete(key)
}

/**
 * Intent: `All sessions` in a Review: the list replaces it, the page scrolled to its top, focus on
 * that session's row title, or the list's title when it has no row.
 */
// @spec-link [[req_kept_session_list]]
function showAllSessions(): void {
  const controller = props.controller
  if (controller === null) throw new Error('review area: no session controller yet')
  const key = review.sessionKey.value
  controller.showList()
  emit('scroll-to-top')
  focus.rowOrTitle(key)
}

defineExpose({ focusReviewTitle: focus.title })
</script>

<template>
  <SessionList
    v-if="list.showing.value"
    ref="sessionList"
    :rows="list.rows.value"
    :most-recent-key="list.mostRecentKey.value"
    :opening-key="list.openingKey.value"
    :saving-off="list.savingOff.value"
    :unreadable="list.unreadable.value"
    @open="openRow"
    @toggle-pin="toggleRowPin"
    @delete="askRowDelete"
  />
  <ReviewPanel
    v-else-if="reviewSession !== null"
    ref="reviewPanel"
    :records="review.records.value"
    :instrument-name="review.instrumentName.value"
    :preset-label="review.presetLabel.value"
    :started-at="reviewSession.startedAt"
    :length-seconds="reviewSession.lengthSeconds"
    :most-recent="review.mostRecent.value"
    :keeping="reviewSession.keeping"
    :viewport="host.viewport.value"
    :system-position-units="systemPositionUnits"
    :no-room="noRoom"
    :format="host.format.value"
    :backing-track="host.backingTrack.value"
    :scope="review.scope.value"
    :export-file="review.exportFile"
    :holds-played-note="review.holdsPlayedNote.value"
    :played-notes-shown="host.playedNotesShown.value"
    :export-played-notes="review.exportPlayedNotes"
    :keep-played-notes="review.keepPlayedNotes.value"
    :can-delete-played-notes="review.canDeletePlayedNotes.value"
    :include-very-short-notes="host.includeVeryShortNotes.value"
    :played-notes-unavailable="review.playedNotesUnavailable.value"
    :session-key="review.sessionKey.value ?? ''"
    :pinned="review.pinned.value"
    :favorites="review.favorites.value"
    :comment="review.comment.value"
    :can-delete-session="review.canDeleteSession.value"
    @update:format="host.setFormat"
    @update:scope="review.setScope"
    @update:backing-track="host.setBackingTrack"
    @update:played-notes-shown="host.setPlayedNotesShown"
    @update:keep-played-notes="review.setKeepPlayedNotes"
    @update:include-very-short-notes="host.setIncludeVeryShortNotes"
    @delete-played-notes="review.askDeletePlayedNotes"
    @toggle-favorite="review.toggleFavorite"
    @toggle-pin="review.togglePin"
    @delete-session="review.askDeleteSession"
    @save-comment="review.saveComment"
    @all-sessions="showAllSessions"
  />
  <component
    :is="confirmationSheet"
    v-if="review.confirmation.value !== null && confirmationSheet !== null"
    :confirmation="review.confirmation.value"
    @confirm="confirmReviewConfirmation"
    @cancel="cancelReviewConfirmation"
  />
</template>
