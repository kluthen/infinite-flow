<script setup lang="ts">
/**
 * The last-session Review, shown in the staff area's place: its title and summary, the
 * generated-notes export (Format, Backing track for MIDI, and the export button), and, when the
 * session holds a played note, the played-notes export button and the Played notes switch (its
 * state held by the page; while on, each phrase draws its played-notes lanes on one session-wide
 * pitch scale), then the list of the session's phrases in order, each engraved lazily as it comes
 * near the visible area (see ./review-engraving-window.ts) in positions reserved at the workspace
 * staff's size (its viewport and shared system-position size), so a review of any length stays
 * responsive and never moves the page as phrases are drawn. While the workspace staff has no room,
 * the room notice stands in for the list. Everything it shows comes from the session history it is
 * given; it holds each export's state only while its file is built (see
 * ./use-review-export-action.ts), the two exports running independently and sharing one error.
 */
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

import SegmentedControl from '@/components/controls/SegmentedControl.vue'
import type { SegmentedControlOption } from '@/components/controls/segmented-control-option'
import { ROOM_NOTICE_NARROW, ROOM_NOTICE_WIDE } from '@/components/notation/room-notice-copy'
import { NotationError } from '@/notation/notation-error'
import {
  NOTATION_SYSTEM_POSITION_UNITS,
  planStaffPositions,
  type StaffViewport,
} from '@/notation/notation-layout-policy'
import { loadVexflowEngraver } from '@/notation/vexflow-engraver-loader'
import type { SessionHistoryRecord } from '@/session/session-history'
import ReviewPhrase from './ReviewPhrase.vue'
import { playedNotesPitchScale } from './played-notes-lane-geometry'
import {
  createReviewEngravingWindow,
  type ReviewEngravingOutcome,
  type ReviewEngravingWindow,
} from './review-engraving-window'
import { distanceFromVisibleArea, observeReviewList } from './review-list-observers'
import { useReviewExportAction } from './use-review-export-action'
import type {
  ExportRequest,
  GeneratedNotesFormat,
  ReviewEngraver,
  ReviewStaffReservation,
} from './review-types'

// @spec-link [[req_last_session_review]]
// @spec-link [[req_session_export]]
const props = withDefaults(
  defineProps<{
    /** The session's phrases in the order they started sounding; at least one. */
    records: readonly SessionHistoryRecord[]
    /** The session's instrument profile, as the instrument-profile control names it. */
    instrumentName: string
    /** The workspace staff's current viewport; null while unknown, and nothing engraves. */
    viewport: StaffViewport | null
    /** The workspace staff has no room: the room notice replaces the list. */
    noRoom: boolean
    /** The export's format, held by the page for its session. */
    format: GeneratedNotesFormat
    /** Whether the MIDI export holds the backing track, held by the page for its session. */
    backingTrack: boolean
    /** Build one file from the session history and hand it to the browser; rejects on failure. */
    exportFile: (request: ExportRequest) => Promise<void>
    /** The session history holds a played note in a phrase: the played-notes tools show. */
    holdsPlayedNote: boolean
    /** Whether the Played notes switch is on, held by the page for its session. */
    playedNotesShown: boolean
    /** Build the played-notes file and hand it to the browser; rejects on failure. */
    exportPlayedNotes: () => Promise<void>
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
  'update:backingTrack': [on: boolean]
  'update:playedNotesShown': [on: boolean]
}>()

const titleId = useId()
const titleEl = ref<HTMLElement | null>(null)

/** Intent: move focus to the title (Review last session); it is never in the tab order. */
// @spec-link [[req_last_session_review]]
function focusTitle(): void {
  if (titleEl.value === null) throw new Error('review panel: the title is not mounted')
  titleEl.value.focus()
}

defineExpose({ focusTitle })

/** Intent: "{n} phrases · {instrument}. Kept ...", "1 phrase" for one; a review is never empty. */
// @spec-link [[req_last_session_review]]
const summary = computed(() => {
  const count = props.records.length
  if (count === 0) throw new Error('A review holds at least one phrase.')
  const phrases = count === 1 ? '1 phrase' : `${count} phrases`
  return `${phrases} · ${props.instrumentName}. Kept until the next session starts or the page is closed.`
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

const reservation = computed(() =>
  reviewStaffReservation(props.viewport, props.systemPositionUnits),
)

// ---- Export ----

const FORMAT_OPTIONS: readonly SegmentedControlOption[] = [
  { value: 'musicxml', label: 'MusicXML' },
  { value: 'midi', label: 'MIDI' },
]

const exportButtonEl = ref<HTMLButtonElement | null>(null)
const playedExportButtonEl = ref<HTMLButtonElement | null>(null)
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
 * only), Format and Backing track staying live while it is built.
 */
// @spec-link [[req_session_export]]
const { running: exporting, start: startExport } = useReviewExportAction({
  button: exportButtonEl,
  failed: exportFailed,
  build: () =>
    props.exportFile({
      format: props.format,
      backingTrack: props.format === 'midi' && props.backingTrack,
    }),
})

/** Intent: build the session's played-notes file, independently of the generated-notes export. */
// @spec-link [[req_played_notes_export]]
const { running: exportingPlayed, start: startPlayedExport } = useReviewExportAction({
  button: playedExportButtonEl,
  failed: exportFailed,
  build: () => props.exportPlayedNotes(),
})

/** Intent: ask the page to switch the played-notes lanes on or off; focus stays on the switch. */
// @spec-link [[rule_review_played_notes_toggle]]
// @spec-link [[module_review_played_notes_lane]]
function togglePlayedNotes(): void {
  emit('update:playedNotesShown', !props.playedNotesShown)
}

/**
 * Intent: the lanes' one pitch scale for the whole session, from every phrase's played notes; and
 * whether the lanes show: only while the switch is on and shown, so a session without a played
 * note shows none, whatever the page's switch state.
 */
// @spec-link [[module_review_played_notes_lane]]
const pitchScale = computed(() => playedNotesPitchScale(props.records))
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
  readonly records: readonly SessionHistoryRecord[]
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
 * Intent: a real change of the viewport or the shared system-position size re-engraves what is
 * engraved near the window, once rendered.
 */
watch(
  () => [props.viewport, props.systemPositionUnits] as const,
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
    <div class="review-header">
      <div class="review-heading">
        <h2 :id="titleId" ref="titleEl" class="review-title" tabindex="-1">Last session</h2>
        <p class="review-summary">{{ summary }}</p>
      </div>
      <div class="review-actions">
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
        <button
          v-if="holdsPlayedNote"
          ref="playedExportButtonEl"
          type="button"
          class="btn review-export-action"
          :class="{ 'is-loading': exportingPlayed }"
          :disabled="exportingPlayed"
          @click="startPlayedExport"
        >
          Export played notes
        </button>
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
      </div>
    </div>
    <ol v-if="!noRoom" ref="listEl" class="review-list">
      <ReviewPhrase
        v-for="(record, index) in records"
        :key="record.phraseNumber"
        :ref="(instance) => setPhrase(index, instance)"
        :record="record"
        :viewport="viewport"
        :system-position-units="systemPositionUnits"
        :reservation="reservation"
        :played-notes-shown="lanesShown"
        :pitch-scale="pitchScale"
      />
    </ol>
    <!-- The stylesheet shows one no-room sentence by the notation layout's width query. -->
    <p v-else class="room-notice">
      <span class="room-notice-wide">{{ ROOM_NOTICE_WIDE }}</span>
      <span class="room-notice-narrow">{{ ROOM_NOTICE_NARROW }}</span>
    </p>
  </section>
</template>
