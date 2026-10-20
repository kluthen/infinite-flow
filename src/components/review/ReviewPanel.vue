<script setup lang="ts">
/**
 * A session's Review, shown in the staff area's place: first `All sessions` (`review-nav`), which
 * asks the page for the session list in its place; then its title ("Last session" for the most
 * recent session, the session date for any other), its summary, the keep line saying how the
 * session is kept (only its "Not saved" form below bp-tablet-landscape, where the workspace staff
 * takes the split layout), the
 * export scope (./ReviewScope.vue, `review-scope`: `Whole session` or `Favorites only`, the page's
 * for this Review, `Favorites only` disabled with its reason while the session has no favorite),
 * which both
 * exports hold, the generated-notes export (Format, Backing track for MIDI, and the export
 * button), and, when the session holds a played note, the played-notes export (`Include very
 * short notes`, the page's for the visit, and the export button, disabled with the page's reason
 * while its file would hold no note) and the Played notes switch (its
 * state held by the page; while on, each phrase draws its played-notes lanes on one session-wide
 * pitch scale), `Keep my played notes` (the page's setting) and, only when this session's played
 * notes are kept and may be deleted, `Delete played notes`, which asks the page for its
 * confirmation. Its heading row ends with the session tools (./ReviewSessionTools.vue: `Pin` /
 * `Unpin`, `Delete session`), and its comment (./ReviewComment.vue) takes a row of its own before
 * the exports; each asks the page, as each phrase's favorite star does. Then the list of the
 * session's phrases in order, each engraved lazily as it comes
 * near the visible area (see ./review-engraving-window.ts) in positions reserved at the workspace
 * staff's size (its viewport and shared system-position size), so a review of any length stays
 * responsive and never moves the page as phrases are drawn. While the workspace staff has no room,
 * the room notice stands in for the list. Everything it shows comes from the session history it is
 * given; it holds each export's state only while its file is built (see
 * ./use-review-export-action.ts), the two exports running independently and sharing one error.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

import SegmentedControl from '@/components/controls/SegmentedControl.vue'
import type { SegmentedControlOption } from '@/components/controls/segmented-control-option'
import { ROOM_NOTICE_NARROW, ROOM_NOTICE_WIDE } from '@/components/notation/room-notice-copy'
import { recordsWithoutVeryShortNotes } from '@/domain/played-notes/stray-notes'
import { NotationError } from '@/notation/notation-error'
import {
  NOTATION_SYSTEM_POSITION_UNITS,
  planStaffPositions,
  type StaffViewport,
} from '@/notation/notation-layout-policy'
import { loadVexflowEngraver } from '@/notation/vexflow-engraver-loader'
import type { ReviewedPhrase } from '@/session/session-history'
import type { SessionKeeping } from '@/components/workspace/workspace-session-controller-types'
import ReviewComment from './ReviewComment.vue'
import ReviewPhrase from './ReviewPhrase.vue'
import ReviewScope from './ReviewScope.vue'
import ReviewSessionTools from './ReviewSessionTools.vue'
import { playedNotesPitchScale } from './played-notes-lane-geometry'
import { sessionDate } from './session-date'
import { sessionLengthText } from './session-row-text'
import {
  createReviewEngravingWindow,
  type ReviewEngravingOutcome,
  type ReviewEngravingWindow,
} from './review-engraving-window'
import { reviewSystemPositionUnits } from './review-system-size'
import { distanceFromVisibleArea, observeReviewList } from './review-list-observers'
import { useReviewExportAction } from './use-review-export-action'
import type {
  ExportRequest,
  GeneratedNotesFormat,
  PlayedNotesUnavailable,
  ReviewEngraver,
  ReviewExportScope,
  ReviewStaffReservation,
} from './review-types'

// @spec-link [[req_last_session_review]]
// @spec-link [[req_session_export]]
const props = withDefaults(
  defineProps<{
    /** The session's phrases in the order they started sounding; at least one. */
    records: readonly ReviewedPhrase[]
    /** The session's instrument, by the name it had at the session. */
    instrumentName: string
    /** The preset label the session recorded at its start, as the session list writes it. */
    presetLabel: string
    /** The session's start, epoch milliseconds. */
    startedAt: number
    /** The session's length in seconds, as its kept record stores it. */
    lengthSeconds: number
    /** Whether the session is the most recent one, titled "Last session". */
    mostRecent: boolean
    /** How the session is kept, for the keep line. */
    keeping: SessionKeeping
    /** The workspace staff's current viewport; null while unknown, and nothing engraves. */
    viewport: StaffViewport | null
    /** The workspace staff has no room: the room notice replaces the list. */
    noRoom: boolean
    /** The export's format, held by the page for its session. */
    format: GeneratedNotesFormat
    /** Whether the MIDI export holds the backing track, held by the page for its session. */
    backingTrack: boolean
    /** The export scope both exports hold, the page's for this Review. */
    scope: ReviewExportScope
    /** Build one file from the session history and hand it to the browser; rejects on failure. */
    exportFile: (request: ExportRequest) => Promise<void>
    /** The session history holds a played note in a phrase: the played-notes tools show. */
    holdsPlayedNote: boolean
    /** Whether the Played notes switch is on, held by the page for its session. */
    playedNotesShown: boolean
    /** Build the played-notes file and hand it to the browser; rejects on failure. */
    exportPlayedNotes: () => Promise<void>
    /** `Keep my played notes`, the page's one saved setting. */
    keepPlayedNotes: boolean
    /** This session's played notes are kept and may be deleted: `Delete played notes` shows. */
    canDeletePlayedNotes: boolean
    /** `Include very short notes`, held by the page for its visit. */
    includeVeryShortNotes: boolean
    /**
     * Why the played-notes file would hold no note under the option and the scope, its export
     * disabled with it; null while it holds one.
     */
    playedNotesUnavailable: PlayedNotesUnavailable | null
    /** The key the session is held under, which its comment is saved for. */
    sessionKey: string
    /** The session is pinned: the pin button reads `Unpin`. */
    pinned: boolean
    /** The numbers of the session's favorite phrases. */
    favorites: readonly number[]
    /** The session's comment; empty when it has none. */
    comment: string
    /** `Delete session` is offered (saving is on). */
    canDeleteSession: boolean
    /**
     * The workspace staff's shared system-position size, in engraving units
     * (`planSystemPositionUnits`); the workspace always passes it, the built-in size by default.
     */
    systemPositionUnits?: number
  }>(),
  { systemPositionUnits: NOTATION_SYSTEM_POSITION_UNITS },
)

const emit = defineEmits<{
  'update:format': [format: GeneratedNotesFormat]
  'update:scope': [scope: ReviewExportScope]
  'update:backingTrack': [on: boolean]
  'update:playedNotesShown': [on: boolean]
  'update:keepPlayedNotes': [on: boolean]
  'update:includeVeryShortNotes': [on: boolean]
  'delete-played-notes': []
  'toggle-favorite': [phraseNumber: number]
  'toggle-pin': []
  'delete-session': []
  'save-comment': [key: string, text: string]
  /** `All sessions` was pressed: the list replaces the Review. */
  'all-sessions': []
}>()

const titleId = useId()
const titleEl = ref<HTMLElement | null>(null)

/** Intent: move focus to the title (Review last session); it is never in the tab order. */
// @spec-link [[req_last_session_review]]
function focusTitle(): void {
  if (titleEl.value === null) throw new Error('review panel: the title is not mounted')
  titleEl.value.focus()
}

const keepPlayedNotesEl = ref<HTMLButtonElement | null>(null)
const deletePlayedNotesEl = ref<HTMLButtonElement | null>(null)

/** Intent: move focus to `element`, which must be rendered. */
function focusRendered(element: HTMLElement | null, name: string): void {
  if (element === null) throw new Error(`review panel: ${name} is not rendered`)
  element.focus()
}

/** Intent: move focus to `Keep my played notes` (after its confirmation, review-view still shown). */
// @spec-link [[rule_kept_played_notes_deletable]]
function focusKeepPlayedNotes(): void {
  focusRendered(keepPlayedNotesEl.value, 'Keep my played notes')
}

/** Intent: move focus back to `Delete played notes`, on its confirmation's way back. */
// @spec-link [[rule_kept_played_notes_deletable]]
function focusDeletePlayedNotes(): void {
  focusRendered(deletePlayedNotesEl.value, 'Delete played notes')
}

const sessionToolsEl = ref<InstanceType<typeof ReviewSessionTools> | null>(null)

/** Intent: move focus to `Pin` / `Unpin` (after the unpin's confirmation, or on its way back). */
function focusPin(): void {
  if (sessionToolsEl.value === null)
    throw new Error('review panel: the session tools are not mounted')
  sessionToolsEl.value.focusPin()
}

/** Intent: move focus back to `Delete session`, on its confirmation's way back. */
function focusDeleteSession(): void {
  if (sessionToolsEl.value === null)
    throw new Error('review panel: the session tools are not mounted')
  sessionToolsEl.value.focusDelete()
}

defineExpose({
  focusTitle,
  focusKeepPlayedNotes,
  focusDeletePlayedNotes,
  focusPin,
  focusDeleteSession,
})

/**
 * Intent: `Delete session` leaving while it holds focus (saving turned off) hands focus to the
 * title; read before the button leaves the page, moved once it has.
 */
watch(
  () => props.canDeleteSession,
  (offered) => {
    if (offered || sessionToolsEl.value?.deleteFocused() !== true) return
    void nextTick(focusTitle)
  },
  { flush: 'pre' },
)

/** Intent: the session's favorite phrases, by number, for each phrase's star. */
const favoriteSet = computed(() => new Set(props.favorites))

/**
 * Intent: `Delete played notes` leaving while it holds focus (saving turned off) hands focus to
 * the title; read before the button leaves the page, moved once it has.
 */
// @spec-link [[rule_kept_played_notes_deletable]]
watch(
  () => props.canDeletePlayedNotes,
  (offered) => {
    const button = deletePlayedNotesEl.value
    if (offered || button === null || document.activeElement !== button) return
    void nextTick(focusTitle)
  },
  { flush: 'pre' },
)

/** Intent: the session date of the session's start, as the title and the summary write it. */
// @spec-link [[req_kept_session_review]]
const date = computed(() => sessionDate(props.startedAt))

/** Intent: "Last session" for the most recent session, the session date for any other. */
// @spec-link [[req_last_session_review]]
// @spec-link [[req_kept_session_review]]
const title = computed(() => (props.mostRecent ? 'Last session' : date.value))

/**
 * Intent: "{session date} · {length} · {n} phrases · {instrument} · {preset} · {favorites}", the
 * date left out when it is the title, the length and the preset as the session list's detail line
 * writes them ("{m} min" or "Under 1 min"; the label the session recorded at its start), "1
 * phrase" for one, the favorites as "No favorites", "1 favorite" or "{k} favorites", changing in
 * place as a star is pressed; a review is never empty.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[req_kept_session_review]]
const summary = computed(() => {
  const count = props.records.length
  if (count === 0) throw new Error('A review holds at least one phrase.')
  const phrases = count === 1 ? '1 phrase' : `${count} phrases`
  const marked = props.favorites.length
  const favorites =
    marked === 0 ? 'No favorites' : marked === 1 ? '1 favorite' : `${marked} favorites`
  const length = sessionLengthText(props.lengthSeconds)
  const parts = [length, phrases, props.instrumentName, props.presetLabel, favorites]
  return (props.mostRecent ? [date.value, ...parts] : parts).join(' · ')
})

/** The keep line's wording for each way a session is kept. */
const KEEP_LINES: Readonly<Record<SessionKeeping, string>> = {
  pinned: 'Pinned: kept until you unpin or delete it.',
  'not-pinned': 'Not pinned: deleted when your next session is saved.',
  'not-saved': 'Not saved on this device: export it to keep it.',
}

/**
 * Intent: the keep line, saying how the session is kept; below bp-tablet-landscape (the workspace
 * staff's split layout, the same width query) only its "Not saved" form, which the pin button's
 * label cannot say; null when it is not rendered.
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[rule_failed_save_never_disturbs_session]]
const keepLine = computed((): string | null => {
  const narrow = props.viewport?.layout === 'split'
  return narrow && props.keeping !== 'not-saved' ? null : KEEP_LINES[props.keeping]
})

/**
 * Intent: the positions each phrase reserves: one system position, two in the split layout, at
 * the block size the workspace staff's positions have in this viewport at the shared
 * system-position size; with no room in its height budget, the two share the budget, as on the
 * workspace staff.
 */
// @spec-link [[req_last_session_review]]
function reviewStaffReservation(
  viewport: StaffViewport | null,
  systemPositionUnits: number,
): ReviewStaffReservation | null {
  if (viewport === null) return null
  const positionCount = viewport.layout === 'split' ? 2 : 1
  const positions = planStaffPositions(viewport, systemPositionUnits)
  if (positions.kind === 'room') {
    return { positionCount, positionBlockPx: positions.positionBlockPx }
  }
  if (viewport.heightBudgetPx === null) {
    throw new Error('staff positions have no room without a height budget.')
  }
  return { positionCount, positionBlockPx: Math.max(0, viewport.heightBudgetPx) / 2 }
}

/** The Review's own system-position size: the shared one, or more for this session's own clef. */
const positionUnits = computed(() =>
  reviewSystemPositionUnits(props.systemPositionUnits, props.records),
)

const reservation = computed(() => reviewStaffReservation(props.viewport, positionUnits.value))

// ---- Export ----

const FORMAT_OPTIONS: readonly SegmentedControlOption[] = [
  { value: 'musicxml', label: 'MusicXML' },
  { value: 'midi', label: 'MIDI' },
]

const exportButtonEl = ref<HTMLButtonElement | null>(null)
const playedExportButtonEl = ref<HTMLButtonElement | null>(null)
const playedExportNoteId = useId()
/** The words of each reason `Export played notes` is disabled while its file would hold no note. */
const PLAYED_NOTES_UNAVAILABLE: Readonly<Record<PlayedNotesUnavailable, string>> = {
  noPlayedNoteInFavorites: 'No played notes in your favorites.',
  everyFavoriteNoteVeryShort:
    'Every note you played in your favorites is very short. Turn on Include very short notes to ' +
    'export them.',
  everyNoteVeryShort:
    'Every note you played is very short. Turn on Include very short notes to export them.',
}
/** The Review's one export error, after a failed export of either content. */
const exportFailed = ref(false)

/** Intent: ask the page for the picked format, refusing a value the control does not offer. */
// @spec-link [[req_session_export]]
function selectFormat(value: string): void {
  if (value !== 'musicxml' && value !== 'midi') {
    throw new Error(`The export has no format "${value}".`)
  }
  emit('update:format', value)
}

/** Intent: ask the page to turn the MIDI export's backing track on or off. */
// @spec-link [[req_session_export]]
function toggleBackingTrack(): void {
  emit('update:backingTrack', !props.backingTrack)
}

/**
 * Intent: build one generated-notes file in the chosen format (the backing track applying to MIDI
 * only) under the scope, Format, Backing track and the scope staying live while it is built.
 */
// @spec-link [[req_session_export]]
const { running: exporting, start: startExport } = useReviewExportAction({
  button: exportButtonEl,
  failed: exportFailed,
  build: () =>
    props.exportFile({
      format: props.format,
      backingTrack: props.format === 'midi' && props.backingTrack,
      scope: props.scope,
    }),
})

/** Intent: build the session's played-notes file, independently of the generated-notes export. */
// @spec-link [[req_played_notes_export]]
const { running: exportingPlayed, start: startPlayedExport } = useReviewExportAction({
  button: playedExportButtonEl,
  failed: exportFailed,
  build: () => props.exportPlayedNotes(),
})

/** Intent: ask the page to turn `Include very short notes`; focus stays on the toggle. */
// @spec-link [[req_played_notes_export]]
function toggleIncludeVeryShortNotes(): void {
  emit('update:includeVeryShortNotes', !props.includeVeryShortNotes)
}

/** Intent: ask the page to switch the played-notes lanes on or off; focus stays on the switch. */
// @spec-link [[rule_review_played_notes_toggle]]
// @spec-link [[module_review_played_notes_lane]]
function togglePlayedNotes(): void {
  emit('update:playedNotesShown', !props.playedNotesShown)
}

/** Intent: ask the page to turn `Keep my played notes`; focus stays on the switch. */
// @spec-link [[rule_played_notes_kept_only_after_opt_in]]
function toggleKeepPlayedNotes(): void {
  emit('update:keepPlayedNotes', !props.keepPlayedNotes)
}

/**
 * Intent: the lanes' one pitch scale for the whole session, from the played notes the lanes show
 * (very short notes left out, so one never widens it; none when every played note is very short);
 * and whether the lanes show: only while the switch is on and shown, so a session without a played
 * note shows none, whatever the page's switch state.
 */
// @spec-link [[module_review_played_notes_lane]]
const pitchScale = computed(() =>
  playedNotesPitchScale(recordsWithoutVeryShortNotes(props.records)),
)
const lanesShown = computed(() => props.holdsPlayedNote && props.playedNotesShown)

// ---- Lazy engraving ----

/** The exposed API of one list item. */
type ReviewPhraseApi = InstanceType<typeof ReviewPhrase>

const listEl = ref<HTMLOListElement | null>(null)
/** Each item's component, by list index; null once Vue removes it. */
const phrases: (ReviewPhraseApi | null)[] = []

/** Intent: keep the item component at `index` (null when Vue removes it). */
function setPhrase(index: number, instance: unknown): void {
  phrases[index] = instance === null ? null : (instance as ReviewPhraseApi)
}

let engraverLoad: Promise<ReviewEngraver> | null = null

/**
 * Intent: load the lazy engraver and its notation fonts once; a failed load is forgotten, so the
 * next engraving tries again.
 */
function loadEngraver(): Promise<ReviewEngraver> {
  engraverLoad ??= loadVexflowEngraver()
    .then(async (engraver) => {
      await engraver.ensureNotationFonts()
      return engraver
    })
    .catch((error: unknown) => {
      engraverLoad = null
      throw error
    })
  return engraverLoad
}

/**
 * Intent: engrave one item; a failed engraver load shows its "couldn't be drawn" note. Null when
 * the item is gone (the list unmounted meanwhile).
 */
// @spec-link [[req_last_session_review]]
async function engraveItem(index: number): Promise<ReviewEngravingOutcome | null> {
  let engraver: ReviewEngraver
  try {
    engraver = await loadEngraver()
  } catch (error) {
    if (!(error instanceof NotationError)) throw error
    const phrase = phrases[index] ?? null
    if (phrase === null) return null
    phrase.showFailure()
    return 'failed'
  }
  const phrase = phrases[index] ?? null
  return phrase === null ? null : phrase.engrave(engraver)
}

/** Intent: the item component at `index`, which the scheduler only names while it is mounted. */
function requirePhrase(index: number): ReviewPhraseApi {
  const phrase = phrases[index] ?? null
  if (phrase === null) throw new Error(`Review item ${index} is not mounted.`)
  return phrase
}

let engraving: ReviewEngravingWindow | null = null
let stopObserving: (() => void) | null = null
/** The list and records the running scheduler serves. */
let served: {
  readonly list: HTMLOListElement
  readonly records: readonly ReviewedPhrase[]
} | null = null

/** Intent: stop the list's observers and scheduler, if any. */
function stopEngraving(): void {
  stopObserving?.()
  stopObserving = null
  engraving?.dispose()
  engraving = null
  served = null
}

/** Intent: start a scheduler and its observers for the list on screen. */
// @spec-link [[req_last_session_review]]
function startEngraving(list: HTMLOListElement): void {
  const scheduler = createReviewEngravingWindow({
    itemCount: props.records.length,
    canEngrave: () => props.viewport !== null,
    distance: (index) => {
      const item = list.children[index]
      if (item === undefined) throw new Error(`Review item ${index} is not in the list.`)
      return distanceFromVisibleArea(item)
    },
    engrave: engraveItem,
    release: (index) => requirePhrase(index).release(),
    nextTurn: () => new Promise((resolve) => setTimeout(resolve, 0)),
  })
  engraving = scheduler
  served = { list, records: props.records }
  stopObserving = observeReviewList(list, scheduler)
}

/**
 * Intent: serve the list on screen: from the mount on, and again whenever the list is replaced
 * (shown again after no room) or the records change; nothing while the room notice stands in.
 */
function serveList(): void {
  const list = listEl.value
  if (served !== null && served.list === list && served.records === props.records) return
  stopEngraving()
  if (list !== null) startEngraving(list)
}

onMounted(serveList)
watch([listEl, () => props.records], serveList, { flush: 'post' })

/**
 * Intent: a real change of the viewport or the Review's system-position size re-engraves what is
 * engraved near the window, once rendered.
 */
watch(
  () => [props.viewport, positionUnits.value] as const,
  (next, previous) => {
    if (JSON.stringify(next) === JSON.stringify(previous)) return
    engraving?.invalidate()
  },
  { flush: 'post' },
)

onBeforeUnmount(stopEngraving)
</script>

<template>
  <section class="review-panel" :aria-labelledby="titleId">
    <div class="review-nav">
      <button type="button" class="btn" @click="emit('all-sessions')">All sessions</button>
    </div>
    <div class="review-header">
      <div class="review-heading">
        <h2 :id="titleId" ref="titleEl" class="review-title" tabindex="-1">{{ title }}</h2>
        <p class="review-summary">{{ summary }}</p>
        <p v-if="keepLine !== null" class="review-keep-line">{{ keepLine }}</p>
      </div>
      <ReviewSessionTools
        ref="sessionToolsEl"
        :pinned="pinned"
        :can-delete="canDeleteSession"
        @toggle-pin="emit('toggle-pin')"
        @delete-session="emit('delete-session')"
      />
    </div>
    <ReviewComment
      :key="sessionKey"
      :comment="comment"
      :session-key="sessionKey"
      @save="(key, text) => emit('save-comment', key, text)"
    />
    <div class="review-actions">
      <ReviewScope
        :scope="scope"
        :has-favorite="favorites.length > 0"
        @update:scope="(next) => emit('update:scope', next)"
      />
      <div class="review-export" role="group" aria-label="Export generated notes">
        <div class="field-group">
          <span class="field-label">Format</span>
          <SegmentedControl
            label="Format"
            :options="FORMAT_OPTIONS"
            :model-value="format"
            :readonly="false"
            @update:model-value="selectFormat"
          />
        </div>
        <button
          v-if="format === 'midi'"
          type="button"
          class="btn toggle-button"
          :aria-pressed="backingTrack ? 'true' : 'false'"
          @click="toggleBackingTrack"
        >
          Backing track
          <span class="toggle-button-state" aria-hidden="true">{{
            backingTrack ? 'on' : 'off'
          }}</span>
        </button>
        <button
          ref="exportButtonEl"
          type="button"
          class="btn review-export-action"
          :class="{ 'is-loading': exporting }"
          :disabled="exporting"
          @click="startExport"
        >
          Export generated notes
        </button>
      </div>
      <div
        v-if="holdsPlayedNote"
        class="review-export-played"
        role="group"
        aria-label="Export played notes"
      >
        <button
          type="button"
          class="btn toggle-button"
          :aria-pressed="includeVeryShortNotes ? 'true' : 'false'"
          @click="toggleIncludeVeryShortNotes"
        >
          Include very short notes
          <span class="toggle-button-state" aria-hidden="true">{{
            includeVeryShortNotes ? 'on' : 'off'
          }}</span>
        </button>
        <button
          ref="playedExportButtonEl"
          type="button"
          class="btn review-export-action"
          :class="{ 'is-loading': exportingPlayed }"
          :disabled="exportingPlayed || playedNotesUnavailable !== null"
          :aria-describedby="playedNotesUnavailable === null ? undefined : playedExportNoteId"
          @click="startPlayedExport"
        >
          Export played notes
        </button>
        <p v-if="playedNotesUnavailable !== null" :id="playedExportNoteId" class="field-note">
          {{ PLAYED_NOTES_UNAVAILABLE[playedNotesUnavailable] }}
        </p>
      </div>
    </div>
    <p v-if="exportFailed" class="inline-alert alert-error review-export-error">
      The file couldn't be made. Try again.
    </p>
    <div v-if="holdsPlayedNote" class="review-view">
      <button
        type="button"
        class="btn toggle-button"
        :aria-pressed="playedNotesShown ? 'true' : 'false'"
        @click="togglePlayedNotes"
      >
        Played notes
        <span class="toggle-button-state" aria-hidden="true">{{
          playedNotesShown ? 'on' : 'off'
        }}</span>
      </button>
      <button
        ref="keepPlayedNotesEl"
        type="button"
        class="btn toggle-button"
        :aria-pressed="keepPlayedNotes ? 'true' : 'false'"
        @click="toggleKeepPlayedNotes"
      >
        Keep my played notes
        <span class="toggle-button-state" aria-hidden="true">{{
          keepPlayedNotes ? 'on' : 'off'
        }}</span>
      </button>
      <button
        v-if="canDeletePlayedNotes"
        ref="deletePlayedNotesEl"
        type="button"
        class="btn"
        @click="emit('delete-played-notes')"
      >
        Delete played notes
      </button>
    </div>
    <ol v-if="!noRoom" ref="listEl" class="review-list">
      <ReviewPhrase
        v-for="(record, index) in records"
        :key="record.phraseNumber"
        :ref="(instance) => setPhrase(index, instance)"
        :record="record"
        :viewport="viewport"
        :system-position-units="positionUnits"
        :reservation="reservation"
        :played-notes-shown="lanesShown"
        :pitch-scale="pitchScale"
        :favorite="favoriteSet.has(record.phraseNumber)"
        @toggle-favorite="emit('toggle-favorite', record.phraseNumber)"
      />
    </ol>
    <!-- The stylesheet shows one no-room sentence by the notation layout's width query. -->
    <p v-else class="room-notice">
      <span class="room-notice-wide">{{ ROOM_NOTICE_WIDE }}</span>
      <span class="room-notice-narrow">{{ ROOM_NOTICE_NARROW }}</span>
    </p>
  </section>
</template>
