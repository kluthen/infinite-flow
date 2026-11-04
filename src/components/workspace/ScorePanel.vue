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
 * switch, which start from the saved review preferences it is given. While Jam mode shows, Jam's
 * view (`jamView`, Jam's code, loaded on demand) takes the staff's place: the session's staff
 * viewport stays laid out, out of sight and inert as under the Review, so session mode returns
 * exactly as it was left, and the generation-failure banner is hidden; the Review hides Jam's view
 * the same way. Jam's view gets the props the workspace gives it (`jamViewProps`); what its staff
 * shows is passed on (`jam-staff-state`), and its `retryNotation()` is reached through
 * `retryJamNotation()`. As a fresh Jam's phrase 1 enters (the controller's session staff set in
 * Jam mode: its read-in, then its session), the session's staff viewport comes in sight, `staff-ready`
 * with none of session mode's overlays whatever its Idle shows (its state untouched, the banner
 * still hidden), while Jam's view, laid over it in the same place, leaves (`leaving`): its empty
 * system fades out as phrase 1 fades in, and once it reports `left` it goes out of sight and inert,
 * still mounted; when the session staff goes, it comes back in sight as it was. The session's
 * viewport stays the first `staff-viewport` in DOM order. The cue row is given Jam's Idle cue
 * (`jamCue`) and a fresh Jam's cue row parts and phase (`jamSession`) as they are. The score title,
 * which also names the staff frame, follows the mode shown: `Jam` while Jam's view shows, else
 * `Four-measure phrase` (while Jam's code loads too). While Jam mode shows it also mounts Jam's
 * staff for phrase 1 written from the kept doodle (./KeptDoodleStaff.vue, `keptPhrase`), after the
 * session's viewport: while a doodle is kept it takes Jam's view's place in sight (Jam's view out
 * of sight and inert, still mounted), out of sight under the Review and while a session's staff
 * shows; with none kept it is out of sight and inert and Jam's view shows as before. In Jam mode
 * both live regions and the generation-failure banner follow Jam's phrase 1, never session mode's
 * Idle, so with no doodle kept they say nothing and no banner shows.
 */
import { computed, defineAsyncComponent, nextTick, ref, watch, type Component } from 'vue'

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
import type { JamStaffState, JamWorkspaceProps } from '@/jam/jam-view-types'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { AudioTransport } from '@/audio/audio-transport'
import { loadReviewArea } from '@/components/review/load-review-panel'
import {
  ROOM_NOTICE_NARROW,
  ROOM_NOTICE_TOO_MANY_NOTES,
  ROOM_NOTICE_WIDE,
} from '@/components/notation/room-notice-copy'
import {
  DEFAULT_REVIEW_PREFERENCES,
  type ReviewPreferences,
} from '@/storage/records/setting-defaults'
import MixControls from './MixControls.vue'
import SessionCueRow from './SessionCueRow.vue'
import type { JamSessionCue } from './jam-session-cue'
import type { JamCue } from './use-jam-idle-cue'
import { useScoreOverlays } from './use-score-overlays'
import { idleStaffFrameClass } from './idle-staff-frame'
import type { MixVolumePopover } from './mix-volume-popover'
import type { ReviewExportPorts } from './review-export'
import { useReviewHost } from './use-review-host'
import KeptDoodleStaff from './KeptDoodleStaff.vue'
import type { KeptDoodlePhraseView } from './use-kept-doodle-phrase'
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
    /** Jam's view while Jam mode shows, in the staff's place; null (the default) in session mode. */
    jamView?: Component | null
    /** The props Jam's view is given while it shows; null (the default) with none. */
    jamViewProps?: JamWorkspaceProps | null
    /** What the cue row holds in the starting-note line's place in Jam mode; null (the default) else. */
    jamCue?: JamCue | null
    /** A fresh Jam's cue row parts and phase while it runs, for the cue row; null (the default) else. */
    jamSession?: JamSessionCue | null
    /** Jam's phrase 1 from the kept doodle while Jam mode shows; null (the default) otherwise. */
    keptPhrase?: KeptDoodlePhraseView | null
  }>(),
  {
    // Default: the notation layout's own width query (the split layout's), read from the window now.
    matchesPhoneLayout: () => window.matchMedia(NOTATION_PHONE_LAYOUT_MEDIA_QUERY).matches,
    reviewExportPorts: null,
    systemPositionUnits: NOTATION_SYSTEM_POSITION_UNITS,
    savedReviewPreferences: () => DEFAULT_REVIEW_PREFERENCES,
    jamView: null,
    jamViewProps: null,
    jamCue: null,
    jamSession: null,
    keptPhrase: null,
  },
)

const emit = defineEmits<{
  /** The cue row's compact `Stop` was clicked. */
  'stop-session': []
  /** The cue row's `Review last session` was clicked. */
  'show-review': []
  /** The cue row's `All sessions` was clicked. */
  'show-sessions': []
  /** The review mode switched between a Review and the session list. */
  'scroll-to-top': []
  /** What Jam's staff shows changed. */
  'jam-staff-state': [state: JamStaffState]
}>()

const state = computed(() => props.session.state)

/**
 * The Idle state the live regions and the banner follow: Jam's phrase 1 while Jam mode shows,
 * session mode's Idle otherwise.
 */
// @spec-link [[service_idle_generation_session]]
const announced = computed(() => props.keptPhrase?.state ?? state.value)

/** A doodle is kept in Jam mode: Jam's staff shows its phrase 1 in Jam's view's place. */
const keptShows = computed(() => props.keptPhrase?.kept === true)

// @spec-link [[req_last_session_review]]
const review = useReviewHost({
  controller: () => props.controller,
  initialPreferences: props.savedReviewPreferences,
  saveSettings: injectSaveSettings(),
})
const reviewShowing = review.showing

/**
 * Intent: the running session's staff, which PhraseScore shows instead of the Idle phrase; null
 * with no session (or no controller loaded yet), so it shows Idle.
 */
// @spec-link [[module_session_rolling_display]]
const sessionStaff = computed(() => props.controller?.state.sessionStaff ?? null)

/**
 * Intent: whether a fresh Jam's phrase 1 has entered the session's staff (its read-in, then its
 * session): Jam mode shows and the controller's session staff is set.
 */
// @spec-link [[module_session_rolling_display]]
const jamPhraseOneIn = computed(() => props.jamView !== null && sessionStaff.value !== null)

/**
 * Session mode's staff is out of sight: under the Review, or while Jam mode shows until a fresh
 * Jam's phrase 1 enters it.
 */
const sessionStaffAway = computed(
  () => reviewShowing.value || (props.jamView !== null && !jamPhraseOneIn.value),
)

/** Jam's view has reported it left as phrase 1 entered; cleared when the session staff goes. */
const jamLeft = ref(false)

/** Intent: the session staff gone (the session ended), Jam's view comes back in sight. */
watch(jamPhraseOneIn, (entered) => {
  if (!entered) jamLeft.value = false
})

/**
 * Jam's view is out of sight: under the Review, once it has left as phrase 1 entered, or while
 * Jam's staff shows the kept doodle's phrase 1 in its place.
 */
const jamViewAway = computed(() => reviewShowing.value || jamLeft.value || keptShows.value)

/** Jam's staff for the kept doodle is out of sight: with none kept, under the Review, in a session. */
const keptAway = computed(() => !keptShows.value || reviewShowing.value || jamPhraseOneIn.value)

/** While it leaves, Jam's view lies over the session's viewport, in the same place. */
const JAM_LEAVING_STYLE = 'position: absolute; inset: 0'
/** What lays the two viewports in the same place: the session's, and Jam's while it leaves. */
const STAFF_STACK_STYLE = 'position: relative'
/**
 * The score title: one per mode, following the mode the workspace shows, not the switch, so it
 * still reads "Four-measure phrase" while Jam's code loads.
 */
const scoreTitle = computed(() => (props.jamView !== null ? 'Jam' : 'Four-measure phrase'))

/**
 * The generation-failure banner is hidden under the Review, and in Jam mode with no doodle kept
 * (Jam's phrase 1 then has none to show).
 */
const bannerAway = computed(
  () => reviewShowing.value || (props.jamView !== null && !keptShows.value),
)

const roomNoticeElement = ref<HTMLElement | null>(null)

/**
 * Intent: move focus to `room-notice` (a session ended during its count-in into Needs more room);
 * it must be on screen. In Jam mode, Jam's staff's (a Jam ended before phrase 1 into it).
 */
// @spec-link [[rule_count_in_ending_returns_to_idle]]
function focusRoomNotice(): void {
  if (keptShows.value) {
    if (keptStaff.value === null) throw new Error("score panel: Jam's staff is not shown")
    keptStaff.value.focusRoomNotice()
    return
  }
  if (props.jamView !== null) {
    if (jamViewInstance.value === null) throw new Error("score panel: Jam's view is not shown")
    jamViewInstance.value.focusRoomNotice()
    return
  }
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

/** Jam's mounted staff for the kept doodle's phrase 1; null while Jam mode does not show. */
const keptStaff = ref<InstanceType<typeof KeptDoodleStaff> | null>(null)

/** Jam's mounted view's exposed API; null while Jam mode does not show. */
const jamViewInstance = ref<{
  readonly retryNotation: () => void
  readonly focusRoomNotice: () => void
} | null>(null)

/** Intent: `Retry notation` in Jam mode: Jam's view engraves its staff again; it must be shown. */
function retryJamNotation(): void {
  if (jamViewInstance.value === null) throw new Error("score panel: Jam's view is not shown")
  jamViewInstance.value.retryNotation()
}

defineExpose({ focusRoomNotice, focusReviewTitle, retryJamNotation })

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
  () => announced.value.operation,
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
    if (announced.value.generationError !== null) {
      statusText.value = 'Generation failed. Try again.'
      return
    }
    // Only a phrase actually shown is ready: a run that ends in the room notice (`notation-status`
    // speaks) or on Empty (stopped by a blocking width crossing) has none to call ready.
    const phraseShown =
      announced.value.result !== null &&
      announced.value.notationError === null &&
      announced.value.roomNotice === null
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
  () => announced.value.notationError,
  (next) => {
    notationStatusText.value =
      next !== null && !reviewShowing.value ? 'Notation error. Try again.' : ''
  },
)

/**
 * Intent: the room-notice sentence on screen now: for the no-room cause, the one the stylesheet
 * shows by the notation layout's width query; for the too-many-notes cause, its own sentence.
 */
// @spec-link [[rule_staff_needs_room_notice]]
function visibleRoomNoticeSentence(): string | null {
  const cause = announced.value.roomNotice
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
  () => announced.value.roomNoticeAnnouncements,
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
  () => announced.value.roomNotice,
  (next) => {
    if (next !== null) return
    roomNoticeAnnouncement += 1
    if (announced.value.notationError === null) notationStatusText.value = ''
  },
)

/**
 * The staff-frame state class the States table defines (./idle-staff-frame.ts), except while a
 * fresh Jam's phrase 1 shows over session mode's Idle, whatever that Idle shows.
 */
// @spec-link [[service_idle_generation_session]]
// @spec-link [[rule_staff_needs_room_notice]]
const staffFrameStateClass = computed(() =>
  jamPhraseOneIn.value ? 'staff-ready' : idleStaffFrameClass(state.value),
)

/**
 * Intent: show the instruction whenever no phrase is shown, as v1 did -- Empty, and a Loading that
 * shows no score yet (the first Generate's, or a replacement's) -- but never under the room notice,
 * which holds the staff in its place.
 */
// @spec-link [[rule_staff_needs_room_notice]]
const showEmptyInstruction = computed(
  () => props.pendingPhrase === null && state.value.roomNotice === null && !jamPhraseOneIn.value,
)

/**
 * Intent: surface the retained notation failure as the staff-frame's replacement error content;
 * never over the room notice, since a staff with no room is never a notation error.
 */
// @spec-link [[module_notation_layout_preflight]]
// @spec-link [[rule_staff_needs_room_notice]]
const notationErrorMessage = computed(() =>
  state.value.roomNotice === null && !jamPhraseOneIn.value
    ? (state.value.notationError?.message ?? null)
    : null,
)

/**
 * Intent: the notice's cause, for the markup: which sentence `room-notice` holds; none while a
 * fresh Jam's phrase 1 shows.
 */
const roomNotice = computed(() => (jamPhraseOneIn.value ? null : state.value.roomNotice))

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
  announced.value.generationError !== null
    ? generationFailureAlertText(announced.value.generationError)
    : null,
)
</script>

<template>
  <div class="score-panel">
    <div class="score-toolbar">
      <h2 id="score-panel-title" class="score-context" :hidden="reviewShowing">
        {{ scoreTitle }}
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
      @scroll-to-top="emit('scroll-to-top')"
    />
    <p
      v-if="generationErrorAlertText !== null"
      class="inline-alert alert-error"
      :hidden="bannerAway"
    >
      {{ generationErrorAlertText }}
    </p>
    <SessionCueRow
      :controller="controller"
      :audio="audio"
      :mix-popover="mixPopover"
      :jam-cue="jamCue"
      :jam-session="jamSession"
      :hidden="reviewShowing"
      @stop="emit('stop-session')"
      @show-review="emit('show-review')"
      @show-sessions="emit('show-sessions')"
    />
    <!-- The session's viewport and Jam's view, laid in the same place while Jam's view leaves. -->
    <div :style="STAFF_STACK_STYLE">
      <!-- Out of sight, not hidden, under the Review and in Jam mode: the staff keeps its geometry.
           `inert` is bound as present or absent, never "false", which a DOM without the property
           would keep. -->
      <div
        class="staff-viewport"
        :class="{ 'is-out-of-sight': sessionStaffAway }"
        :inert="sessionStaffAway || undefined"
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
      <!-- Jam's staff for the kept doodle's phrase 1, in sight while a doodle is kept. -->
      <KeptDoodleStaff
        v-if="keptPhrase !== null"
        ref="keptStaff"
        :view="keptPhrase"
        :system-position-units="systemPositionUnits"
        :class="{ 'is-out-of-sight': keptAway }"
        :inert="keptAway || undefined"
      />
      <!-- Jam's view, its own staff-viewport where the session's (out of sight) takes no room; laid
           over it while it leaves, as a fresh Jam's phrase 1 enters it. -->
      <component
        :is="jamView"
        v-if="jamView !== null"
        ref="jamViewInstance"
        v-bind="jamViewProps ?? {}"
        :leaving="jamPhraseOneIn"
        :class="{ 'is-out-of-sight': jamViewAway }"
        :style="jamPhraseOneIn ? JAM_LEAVING_STYLE : undefined"
        :inert="jamViewAway || undefined"
        @staff-state="emit('jam-staff-state', $event)"
        @left="jamLeft = true"
      />
    </div>
  </div>
</template>
