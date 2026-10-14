<script setup lang="ts">
/**
 * One phrase of the Review's list: its number and tempo, then its `review-staff`, which reserves
 * the workspace staff's system positions (one, or two in the split layout) at their block size
 * before anything is drawn, and, while Played notes is on, a played-notes lane's block size under
 * each, so engraving or releasing it never changes the item's size. The list decides when it is
 * engraved (see ./review-engraving-window.ts); it then draws the stored phrase exactly as it was
 * shown, into one `staff-content` per position, or shows a note in their place when it cannot.
 * The staff never shows anything of the session: the played notes appear only in the lanes, on
 * request, drawn with the engraving against its anchors (see ./played-notes-lane-view.ts). A
 * repeat looks like any other phrase.
 */
import { computed, nextTick, onBeforeUnmount, ref, shallowRef } from 'vue'

import { describeWrittenPhrase } from '@/domain/notation/score-description'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import { BUILT_IN_INSTRUMENT_CLEF } from '@/domain/profile/instrument-clef'
import { isStaffLayoutFailure, NotationError } from '@/notation/notation-error'
import {
  NOTATION_SYSTEM_POSITION_UNITS,
  type StaffViewport,
} from '@/notation/notation-layout-policy'
import type { ReviewedPhrase } from '@/session/session-history'
import type { PlayedNotesPitchScale } from './played-notes-lane-geometry'
import {
  playedNotesLaneViews,
  systemInlineOffsets,
  type PlayedNotesLaneSource,
  type PlayedNotesLaneView,
} from './played-notes-lane-view'
import type { ReviewEngravingOutcome } from './review-engraving-window'
import type { ReviewEngraver, ReviewStaffReservation } from './review-types'

// @spec-link [[req_last_session_review]]
// @spec-link [[rule_repeat_phrase_marked_internally_only]]
// @spec-link [[rule_review_played_notes_toggle]]
const props = withDefaults(
  defineProps<{
    /**
     * The phrase's record. The staff reads only its number, tempo, outcome and intent; the lanes
     * read its start, tempo and played notes, and only while Played notes is on.
     */
    record: ReviewedPhrase
    /** The workspace staff's viewport; null until it is known. */
    viewport: StaffViewport | null
    /** The positions to reserve, the same for every phrase; null until the viewport is known. */
    reservation: ReviewStaffReservation | null
    /** Whether Played notes is on: each position is followed by its lane, its space reserved. */
    playedNotesShown: boolean
    /** The session-wide pitch scale of the lanes; null for a session without a played note. */
    pitchScale: PlayedNotesPitchScale | null
    /** The workspace staff's shared system-position size, in engraving units; 160 by default. */
    systemPositionUnits?: number
  }>(),
  { systemPositionUnits: NOTATION_SYSTEM_POSITION_UNITS },
)

/** Which note stands in place of the engraving, if any. */
type PhraseNote = 'needs-wider-window' | 'failed'

const NOTE_TEXT: Readonly<Record<PhraseNote, string>> = {
  'needs-wider-window': 'This phrase needs a wider window.',
  failed: "This phrase couldn't be drawn.",
}

const note = ref<PhraseNote | null>(null)
const staffEl = ref<HTMLElement | null>(null)
/** What the lanes are drawn against: the last successful engraving's, null while there is none. */
const laneSource = shallowRef<PlayedNotesLaneSource | null>(null)
let unmounted = false

/**
 * Intent: the review staff's reserved block size: its positions', plus, while Played notes is on,
 * one lane and its separating gap per position, whether the engraving is drawn, not yet drawn,
 * released or replaced by its note.
 */
// @spec-link [[module_review_played_notes_lane]]
const staffStyle = computed(() => {
  const reservation = props.reservation
  if (reservation === null) return undefined
  const { positionCount: n, positionBlockPx } = reservation
  const positions = `${n * positionBlockPx}px`
  if (!props.playedNotesShown) return { blockSize: positions }
  const lanes = `${n} * (var(--played-notes-lane-block-size) + var(--spacing-2))`
  return { blockSize: `calc(${positions} + ${lanes})` }
})

/**
 * Intent: the lanes to render under the positions while Played notes is on, none otherwise: drawn
 * from the kept engraving and the record's played notes on the session's pitch scale, so turning
 * the switch on after engraving draws them at once without engraving again; blank while the phrase
 * holds no engraving. Every bar looks the same: nothing marks a note matched or not.
 */
// @spec-link [[module_review_played_notes_lane]]
// @spec-link [[rule_no_grading_or_mismatch_signal]]
const lanes = computed((): PlayedNotesLaneView[] => {
  const reservation = props.reservation
  if (!props.playedNotesShown || reservation === null) return []
  return playedNotesLaneViews({
    phraseNumber: props.record.phraseNumber,
    record: props.record,
    positionCount: reservation.positionCount,
    source: laneSource.value,
    scale: props.pitchScale,
  })
})

/** Intent: the reserved positions, top first, each with its lane, if one is rendered. */
const positionSlots = computed(() =>
  Array.from({ length: props.reservation?.positionCount ?? 0 }, (_, index) => ({
    position: index === 0 ? 'top' : 'bottom',
    lane: lanes.value[index] ?? null,
  })),
)

onBeforeUnmount(() => {
  unmounted = true
})

/** Intent: the reserved positions rendered in the review staff now, top first. */
function renderedPositions(): HTMLElement[] {
  const staff = staffEl.value
  if (staff === null) return []
  return Array.from(staff.querySelectorAll<HTMLElement>(':scope > [data-system-position]'))
}

/** Intent: the reserved positions on screen now, crashing if they disagree with the reservation. */
function positionHosts(reservation: ReviewStaffReservation): HTMLElement[] {
  const hosts = renderedPositions()
  if (hosts.length !== reservation.positionCount) {
    throw new Error(`Phrase ${props.record.phraseNumber}: its reserved positions are not rendered.`)
  }
  return hosts
}

/** Intent: blank every reserved position and its lane. */
function clearPositions(): void {
  laneSource.value = null
  renderedPositions().forEach((host) => host.replaceChildren())
}

/**
 * Intent: give the top system's SVG the phrase's accessible name, and hide the split layout's
 * bottom system, which the same name covers, as the workspace staff does.
 */
function labelSystems(svgs: readonly SVGSVGElement[], summary: string): void {
  svgs.forEach((svg, index) => {
    if (index === 0) svg.setAttribute('aria-label', summary)
    else svg.setAttribute('aria-hidden', 'true')
  })
}

/**
 * Intent: draw the phrase as it was shown, its written phrase computed from the stored outcome
 * and intent only now, into a new `staff-content` in each reserved position, at the review
 * staff's content width in the current viewport and shared system-position size, replacing what
 * was there. A layout failure (no room, or notes too wide at this width) shows the "wider window"
 * note, any other notation failure the "couldn't be drawn" one; anything else is a defect and
 * throws. A note is removed first, so the positions are rendered to draw in. Null, drawing
 * nothing, when the phrase was unmounted or the viewport became unknown meanwhile.
 * Only the stored phrase reaches the engraver, whether Played notes is on or off: no played note,
 * acknowledgement, start marker or playhead is drawn on the staff, and the repeat mark is never
 * read. A successful engraving keeps what the lanes are drawn against (the written phrase, its
 * measure anchors and each system's inline offset); the lanes themselves are drawn outside it.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[rule_no_grading_or_mismatch_signal]]
// @spec-link [[rule_repeat_phrase_marked_internally_only]]
// @spec-link [[module_review_played_notes_lane]]
async function engrave(engraver: ReviewEngraver): Promise<ReviewEngravingOutcome | null> {
  laneSource.value = null
  if (note.value !== null) {
    note.value = null
    await nextTick()
  }
  const { viewport, reservation, record, systemPositionUnits } = props
  const staff = staffEl.value
  if (unmounted || viewport === null || reservation === null || staff === null) return null
  const hosts = positionHosts(reservation)
  const units = hosts.map((host) => {
    const unit = document.createElement('div')
    unit.className = 'staff-content'
    host.replaceChildren(unit)
    return unit
  })
  // The one-system layout draws nothing into its second target.
  const targets = [units[0]!, units[1] ?? document.createElement('div')] as const
  try {
    // The clef this record carries, which chunk 17 adds to the record.
    const clef = BUILT_IN_INSTRUMENT_CLEF
    const phrase = transformToWrittenPhrase(
      notationInputFromOutcome(record.outcome, record.intent, clef),
    )
    const result = engraver.engraveWrittenPhrase(
      targets,
      phrase,
      record.phraseNumber,
      staff.clientWidth,
      viewport,
      systemPositionUnits,
    )
    labelSystems(result.svgs, describeWrittenPhrase(phrase).summary)
    laneSource.value = {
      phrase,
      anchors: result.measureAnchors,
      systemOffsetsPx: systemInlineOffsets(result.svgs, hosts),
    }
    return 'engraved'
  } catch (error) {
    if (!(error instanceof NotationError)) throw error
    clearPositions()
    note.value = isStaffLayoutFailure(error) ? 'needs-wider-window' : 'failed'
    return note.value
  }
}

/** Intent: show the "couldn't be drawn" note without drawing (the engraver failed to load). */
// @spec-link [[req_last_session_review]]
function showFailure(): void {
  clearPositions()
  note.value = 'failed'
}

/** Intent: remove the engraving or note, leaving the reserved space blank. */
// @spec-link [[req_last_session_review]]
function release(): void {
  clearPositions()
  note.value = null
}

defineExpose({ engrave, showFailure, release })
</script>

<template>
  <li class="review-phrase">
    <div class="review-phrase-header">
      <h3 class="review-phrase-title">Phrase {{ record.phraseNumber }}</h3>
      <span class="review-phrase-tempo">{{ record.tempo }} BPM</span>
    </div>
    <!-- The reserved block size is the notation layout's (and the lanes'), set before drawing. -->
    <div ref="staffEl" class="review-staff" :style="staffStyle">
      <p v-if="note !== null" class="review-phrase-note">{{ NOTE_TEXT[note] }}</p>
      <template v-else-if="reservation !== null">
        <template v-for="slot in positionSlots" :key="slot.position">
          <!-- A reserved system position: placed and sized by the notation layout, no class. -->
          <div
            :data-system-position="slot.position"
            :style="{ blockSize: `${reservation.positionBlockPx}px` }"
          ></div>
          <!-- Its played-notes lane while Played notes is on: not focusable, no text. -->
          <div
            v-if="slot.lane !== null"
            class="played-notes-lane"
            role="img"
            :aria-label="slot.lane.label"
          >
            <div
              v-for="(divider, d) in slot.lane.dividers"
              :key="`divider-${d}`"
              class="played-notes-divider"
              :style="divider"
            ></div>
            <div
              v-for="(bar, b) in slot.lane.bars"
              :key="`note-${b}`"
              class="played-note"
              :style="bar"
            ></div>
          </div>
        </template>
      </template>
    </div>
  </li>
</template>
