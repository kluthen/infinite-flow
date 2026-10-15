<script setup lang="ts">
/**
 * The score panel: its toolbar (title, the persistent generation-status and notation-status live
 * regions, and a generation-failure banner) plus the staff viewport, whose `staff-frame` always
 * holds `PhraseScore` and with it the two reserved staff system positions, in every state the
 * States table defines -- empty (the instruction laid over the blank positions), loading (with the
 * prior phrase still visible), ready, or a notation-error message laid over the still-mounted
 * `PhraseScore` so a later Retry notation can redraw the same instance rather than remounting it,
 * or the "staff needs more room" notice laid over the same reserved positions. It forwards the
 * staff's layout inputs to the workspace, whose pre-draw fit and room checks plan against them.
 * The toolbar also holds the audio mix (`MixControls`), which drives the session's audio transport.
 * Between the banner's position and the staff sits `SessionCueRow`, the practice session's cues.
 * While a practice session runs, `PhraseScore` shows the controller's session staff instead of the
 * Idle phrase, and its failure to show it is forwarded to the session, never to Idle. It hands
 * `PhraseScore` the controller's marks: the start marker at Idle, the acknowledged notes in a session.
 * While the last session's Review shows, the lazily loaded review area (./ReviewArea.vue), which
 * holds the Review's panel and the confirmations it opens, takes the staff area's place after the
 * toolbar: the banner, the cue row and the score title are hidden, and the staff viewport stays
 * laid out, out of sight and inert, so the Idle rules keep engraving and measuring under it; both
 * live regions stay silent then, and say nothing as it closes. The staff and the Review both draw
 * at the one shared system-position size the workspace gives it. What the page keeps of the
 * Review lives here, in its Review host (./use-review-host.ts), and outlives the area as the
 * Review closes and opens again: the staff's viewport, and the export choices and Played notes
 * switch, which start from the saved review preferences it is given.
 */
import { computed, defineAsyncComponent, nextTick, ref, watch } from 'vue'

import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import { generationFailureAlertText } from '@/composables/generation-failure-alert'
import PhraseScore from '@/components/notation/PhraseScore.vue'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import {
  NOTATION_PHONE_LAYOUT_MEDIA_QUERY,
  NOTATION_SYSTEM_POSITION_UNITS,
} from '@/notation/notation-layout-policy'
import type { NotationError } from '@/notation/notation-error'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { AudioTransport } from '@/audio/audio-transport'
import { loadReviewArea } from '@/components/review/load-review-panel'
import { ROOM_NOTICE_NARROW, ROOM_NOTICE_WIDE } from '@/components/notation/room-notice-copy'
import {
  DEFAULT_REVIEW_PREFERENCES,
  type ReviewPreferences,
} from '@/storage/records/setting-defaults'
import MixControls from './MixControls.vue'
import SessionCueRow from './SessionCueRow.vue'
import { useScoreOverlays } from './use-score-overlays'
import type { MixVolumePopover } from './mix-volume-popover'
import type { ReviewExportPorts } from './review-export'
import { useReviewHost } from './use-review-host'
import { injectSaveSettings } from './save-settings-injection'
import type { SessionController } from './workspace-session-controller-types'

// The Review's area, with its exports, tools and confirmations, loads as its own chunk (see
// load-review-panel.ts), as does the panel it holds.
const ReviewArea = defineAsyncComponent(loadReviewArea)

// @spec-link [[module_idle_fit_round]]
const props = withDefaults(
  defineProps<{
    session: GenerationSession<WorkspaceSessionResult>
    pendingPhrase: WrittenPhrase | null
    handleEngraved: () => void
    handleNotationError: (error: NotationError) => void
    /** The staff failing to show a running session; it ends the session, never reaching Idle. */
    handleSessionStaffFailed: (error: NotationError) => void
    handleLayoutInputs: (inputs: StaffLayoutInputs) => void
    /** The session's audio transport, whose mix the toolbar's audio mix sets. */
    audio: AudioTransport
    /** The one volume popover, shared with the phone's compact `Volume` in the session cue row. */
    mixPopover: MixVolumePopover
    /** The session controller the cue row shows; null while its lazy chunk loads. */
    controller: SessionController | null
    /**
     * Whether the notation layout's width query matches now, which is also the query the
     * stylesheet shows `room-notice-narrow` by; the window's own `matchMedia` by default.
     */
    matchesPhoneLayout?: () => boolean
    /**
     * How the Review's export loads its code and downloads; null (the default) for the page's own,
     * which the review area builds.
     */
    reviewExportPorts?: ReviewExportPorts | null
    /**
     * The shared system-position size, in engraving units, which the staff and the Review draw
     * at; the workspace always passes it (`planSystemPositionUnits`), the built-in size by default.
     */
    systemPositionUnits?: number
    /**
     * The saved review preferences the Review's export choices and Played notes switch start
     * from, loaded before the first draw; a first visit's by default.
     */
    savedReviewPreferences?: ReviewPreferences
  }>(),
  {
    // Default: the notation layout's own width query (the split layout's), read from the window now.
    matchesPhoneLayout: () => window.matchMedia(NOTATION_PHONE_LAYOUT_MEDIA_QUERY).matches,
    reviewExportPorts: null,
    systemPositionUnits: NOTATION_SYSTEM_POSITION_UNITS,
    savedReviewPreferences: () => DEFAULT_REVIEW_PREFERENCES,
  },
)

const emit = defineEmits<{
  /** The cue row's compact `Stop` was clicked. */
  'stop-session': []
  /** The cue row's `Review last session` was clicked. */
  'show-review': []
}>()

const state = computed(() => props.session.state)

// @spec-link [[req_last_session_review]]
const review = useReviewHost({
  controller: () => props.controller,
  initialPreferences: props.savedReviewPreferences,
  saveSettings: injectSaveSettings(),
})
const reviewShowing = review.showing

const roomNoticeElement = ref<HTMLElement | null>(null)

/**
 * Intent: move focus to `room-notice` (a session ended during its count-in into Needs more room);
 * it must be on screen.
 */
// @spec-link [[rule_count_in_ending_returns_to_idle]]
function focusRoomNotice(): void {
  if (roomNoticeElement.value === null) throw new Error('score panel: room-notice is not shown')
  roomNoticeElement.value.focus()
}

/** The mounted review area's exposed API; null until its lazy chunk has loaded and mounted. */
const reviewArea = ref<{ readonly focusReviewTitle: () => void } | null>(null)
/** A `review-title` focus asked for before the area had mounted. */
let reviewTitleFocusPending = false

/** Intent: hand the `review-title` focus to the area now if it is mounted, else once it mounts. */
function focusPendingReviewTitle(): void {
  if (!reviewTitleFocusPending || reviewArea.value === null) return
  reviewTitleFocusPending = false
  reviewArea.value.focusReviewTitle()
}

/**
 * Intent: move focus to `review-title` (Review last session), as soon as the area's and the
 * panel's lazy chunks have loaded and they have mounted; a Review closed meanwhile drops it.
 */
// @spec-link [[req_last_session_review]]
function focusReviewTitle(): void {
  reviewTitleFocusPending = true
  focusPendingReviewTitle()
}

watch(reviewArea, focusPendingReviewTitle, { flush: 'post' })

defineExpose({ focusRoomNotice, focusReviewTitle })

const statusText = ref('')
const notationStatusText = ref('')
/** Counts announcements, so one superseded while its region was emptied never lands. */
let roomNoticeAnnouncement = 0

/**
 * Intent: the Review showing silences both live regions: they empty as it opens (cancelling a
 * room notice still to be announced) and announce nothing while it shows; its close announces
 * nothing either, the player seeing the staff and focus landing per the flow.
 */
// @spec-link [[req_last_session_review]]
watch(reviewShowing, (showing) => {
  if (!showing) {
    reviewTitleFocusPending = false
    return
  }
  statusText.value = ''
  notationStatusText.value = ''
  roomNoticeAnnouncement += 1
})

/**
 * True from the moment a whole generate/regenerate/retry-generation cycle starts until it next
 * returns to idle. Retry notation only ever passes through "notating" without ever setting this,
 * so it stays silent below -- matching the requirement that only a real generation cycle announces
 * its own completion.
 */
let announceOnIdle = false

/**
 * Intent: announce only the three defined generation-status transitions, once per run however
 * many attempts it makes: the operation stays `generating` between attempts, and a retry after a
 * too-wide draw only sets the same text again, which changes nothing on screen. Tracked with
 * `announceOnIdle` rather than the immediately-preceding operation value alone, because a
 * successful generate cycle passes through "notating" on its way back to idle -- an intermediate
 * step this watcher must see through, not treat as the end of the cycle.
 */
watch(
  () => state.value.operation,
  (next) => {
    if (next === 'generating') {
      if (!reviewShowing.value) statusText.value = 'Generating phrase'
      announceOnIdle = true
      return
    }
    if (next !== 'idle' || !announceOnIdle) return
    announceOnIdle = false
    // A run ending out of sight, under the Review, says nothing.
    if (reviewShowing.value) return
    if (state.value.generationError !== null) {
      statusText.value = 'Generation failed. Try again.'
      return
    }
    // Only a phrase actually shown is ready: a run that ends in the room notice (`notation-status`
    // speaks) or on Empty (stopped by a blocking width crossing) has none to call ready.
    const phraseShown =
      state.value.result !== null &&
      state.value.notationError === null &&
      state.value.roomNotice === null
    statusText.value = phraseShown ? 'Phrase ready' : ''
  },
)

/**
 * Intent: announce a notation failure whenever `notationError` becomes set, whatever set it -- a
 * fresh generation's own engraving step, Retry notation, or an out-of-band redraw -- by watching
 * the error itself rather than any call site, except out of sight under the Review. Recovery stays
 * silent: a cleared error only empties the region, never announces.
 */
// @spec-link [[service_idle_generation_session]]
watch(
  () => state.value.notationError,
  (next) => {
    notationStatusText.value =
      next !== null && !reviewShowing.value ? 'Notation error. Try again.' : ''
  },
)

const ROOM_NOTICE_TOO_MANY_NOTES =
  'These notes need more room. Make the window larger, or choose a lower note density.'

/**
 * Intent: the room-notice sentence on screen now: for the no-room cause, the one the stylesheet
 * shows by the notation layout's width query; for the too-many-notes cause, its own sentence.
 */
// @spec-link [[rule_staff_needs_room_notice]]
function visibleRoomNoticeSentence(): string | null {
  const cause = state.value.roomNotice
  if (cause === null) return null
  if (cause === 'notes_too_wide') return ROOM_NOTICE_TOO_MANY_NOTES
  return props.matchesPhoneLayout() ? ROOM_NOTICE_NARROW : ROOM_NOTICE_WIDE
}

/**
 * Intent: announce the notice's visible sentence each time the session asks for it (the notice
 * beginning, or a round under it ending with every attempt too wide), except out of sight under
 * the Review. The region is emptied and the DOM flushed first, so the same sentence announced
 * again is a change a screen reader hears.
 */
// @spec-link [[rule_staff_needs_room_notice]]
// @spec-link [[rule_too_dense_notice_retry_rounds]]
watch(
  () => state.value.roomNoticeAnnouncements,
  async (next, previous) => {
    if (next <= previous || reviewShowing.value) return
    const sentence = visibleRoomNoticeSentence()
    if (sentence === null) return
    const announcement = ++roomNoticeAnnouncement
    notationStatusText.value = ''
    await nextTick()
    if (announcement !== roomNoticeAnnouncement) return
    notationStatusText.value = sentence
  },
)

/** Intent: the notice's clearing is silent: the region only empties, as a notation recovery does. */
// @spec-link [[rule_staff_notice_gives_way_to_new_phrase]]
watch(
  () => state.value.roomNotice,
  (next) => {
    if (next !== null) return
    roomNoticeAnnouncement += 1
    if (state.value.notationError === null) notationStatusText.value = ''
  },
)

/**
 * The staff-frame state class the States table defines, in priority order, the room notice first.
 * A retained result that was never engraved (its notation error cleared by a later generation
 * attempt that then failed) falls back to `staff-error` rather than `staff-ready` -- but only while
 * idle, since every ordinary generation assigns a not-yet-engraved result just before its own
 * engraving step runs.
 */
// @spec-link [[service_idle_generation_session]]
// @spec-link [[rule_staff_needs_room_notice]]
const staffFrameStateClass = computed(() => {
  // The notice holds the frame through a round under it, dimmed as the Loading it is.
  if (state.value.roomNotice !== null) {
    return state.value.operation === 'idle' ? 'staff-no-room' : 'staff-no-room staff-loading'
  }
  if (state.value.operation === 'generating') return 'staff-loading'
  if (state.value.notationError !== null) return 'staff-error'
  if (
    state.value.operation === 'idle' &&
    state.value.result !== null &&
    !state.value.resultEngraved
  ) {
    return 'staff-error'
  }
  if (state.value.result !== null) return 'staff-ready'
  return 'staff-empty'
})

/**
 * Intent: show the instruction whenever no phrase is shown, as v1 did -- Empty, and a Loading that
 * shows no score yet (the first Generate's, or a replacement's) -- but never under the room notice,
 * which holds the staff in its place.
 */
// @spec-link [[rule_staff_needs_room_notice]]
const showEmptyInstruction = computed(
  () => props.pendingPhrase === null && state.value.roomNotice === null,
)

/**
 * Intent: surface the retained notation failure as the staff-frame's replacement error content;
 * never over the room notice, since a staff with no room is never a notation error.
 */
// @spec-link [[module_notation_layout_preflight]]
// @spec-link [[rule_staff_needs_room_notice]]
const notationErrorMessage = computed(() =>
  state.value.roomNotice === null ? (state.value.notationError?.message ?? null) : null,
)

/** Intent: the notice's cause, for the markup: which sentence `room-notice` holds. */
const roomNotice = computed(() => state.value.roomNotice)

/**
 * Intent: the running session's staff, which PhraseScore shows instead of the Idle phrase; null
 * with no session (or no controller loaded yet), so it shows Idle.
 */
// @spec-link [[module_session_rolling_display]]
const sessionStaff = computed(() => props.controller?.state.sessionStaff ?? null)

/** Intent: the controller's marks PhraseScore draws on the score; see useScoreOverlays. */
const overlays = useScoreOverlays(() => props.controller)

/** Intent: keep the staff's viewport for the Review, then pass the report on to the workspace. */
// @spec-link [[req_last_session_review]]
function handleStaffLayoutInputs(inputs: StaffLayoutInputs): void {
  review.noteLayoutInputs(inputs)
  props.handleLayoutInputs(inputs)
}

/** Intent: the D29 alert-banner text, mapped by failure kind rather than a "Generation failed: " prefix concatenated onto the error's own message. */
// @spec-link [[rule_generation_failure_alert_copy]]
const generationErrorAlertText = computed(() =>
  state.value.generationError !== null
    ? generationFailureAlertText(state.value.generationError)
    : null,
)
</script>

<template>
  <div class="score-panel">
    <div class="score-toolbar">
      <h2 id="score-panel-title" class="score-context" :hidden="reviewShowing">
        Four-measure phrase
      </h2>
      <p class="generation-status" role="status" aria-live="polite" aria-atomic="true">
        {{ statusText }}
      </p>
      <MixControls :audio="audio" :popover="mixPopover" />
      <p class="notation-status" role="status" aria-live="polite" aria-atomic="true">
        {{ notationStatusText }}
      </p>
    </div>
    <ReviewArea
      v-if="reviewShowing"
      ref="reviewArea"
      :host="review"
      :controller="controller"
      :no-room="state.roomNotice === 'no_room'"
      :system-position-units="systemPositionUnits"
      :export-ports="reviewExportPorts"
    />
    <p
      v-if="generationErrorAlertText !== null"
      class="inline-alert alert-error"
      :hidden="reviewShowing"
    >
      {{ generationErrorAlertText }}
    </p>
    <SessionCueRow
      :controller="controller"
      :audio="audio"
      :mix-popover="mixPopover"
      :hidden="reviewShowing"
      @stop="emit('stop-session')"
      @show-review="emit('show-review')"
    />
    <!-- Out of sight, not hidden, under the Review: the staff keeps its geometry. `inert` is
         bound as present or absent, never "false", which a DOM without the property would keep. -->
    <div
      class="staff-viewport"
      :class="{ 'is-out-of-sight': reviewShowing }"
      :inert="reviewShowing || undefined"
    >
      <div class="staff-frame" :class="staffFrameStateClass" aria-labelledby="score-panel-title">
        <!-- The idle phrase is the phrase a session starts with, phrase 1. -->
        <PhraseScore
          :phrase="pendingPhrase"
          :phrase-number="1"
          :session="sessionStaff"
          :overlays="overlays"
          :system-position-units="systemPositionUnits"
          @engraved="handleEngraved"
          @notation-error="handleNotationError"
          @session-staff-failed="handleSessionStaffFailed"
          @layout-inputs="handleStaffLayoutInputs"
        >
          <p v-if="showEmptyInstruction" class="staff-empty-copy">Generate a phrase to begin.</p>
          <!-- The stylesheet shows one no-room sentence by the notation layout's width query. -->
          <p
            v-if="roomNotice === 'no_room'"
            ref="roomNoticeElement"
            class="room-notice"
            tabindex="-1"
          >
            <span class="room-notice-wide">{{ ROOM_NOTICE_WIDE }}</span>
            <span class="room-notice-narrow">{{ ROOM_NOTICE_NARROW }}</span>
          </p>
          <p
            v-else-if="roomNotice === 'notes_too_wide'"
            ref="roomNoticeElement"
            class="room-notice"
            tabindex="-1"
          >
            {{ ROOM_NOTICE_TOO_MANY_NOTES }}
          </p>
          <p v-if="notationErrorMessage !== null" class="inline-alert alert-error">
            Notation error: {{ notationErrorMessage }}
          </p>
        </PhraseScore>
      </div>
    </div>
  </div>
</template>
