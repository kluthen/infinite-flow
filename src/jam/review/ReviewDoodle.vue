<script setup lang="ts">
/**
 * The staff of a Jam review's doodle section (`review-doodle`), part of Jam's code: its
 * `review-staff`, which reserves the doodle's system positions (one, or two in the split layout
 * for a doodle of three or four measures) at a phrase's block size before anything is drawn, and,
 * while Played notes is on, a lane under each. The Review's list decides when it is engraved, the
 * doodle first (see src/components/review/review-engraving-window.ts); it then draws the quantized
 * doodle (./../doodle-engraving.ts) in the key the Jam started with, or shows the doodle's note in
 * their place when it cannot. Its lanes hold the raw doodle notes, very short ones left out, on the
 * session's pitch scale; in a Jam on the kept doodle they are empty. Nothing of the session is
 * drawn on the staff, and nothing in it is acknowledged.
 */
import { computed, nextTick, onBeforeUnmount, ref, shallowRef } from 'vue'

import type { PlayedNotesPitchScale } from '@/components/review/played-notes-lane-geometry'
import {
  playedNotesLaneViews,
  systemInlineOffsets,
  type PlayedNotesLaneSource,
  type PlayedNotesLaneView,
} from '@/components/review/played-notes-lane-view'
import type { ReviewEngravingOutcome } from '@/components/review/review-engraving-window'
import { reviewStaffStyle } from '@/components/review/review-staff-style'
import type { ReviewEngraver, ReviewStaffReservation } from '@/components/review/review-types'
import { describeDoodle } from '@/domain/notation/score-description'
import { isStaffLayoutFailure, NotationError } from '@/notation/notation-error'
import type { StaffViewport } from '@/notation/notation-layout-policy'
import type { ReviewedPhrase, SessionDoodle } from '@/session/session-history'
import {
  cutSystemsAtDoodleEnd,
  doodleEngravingContext,
  doodleMeasureAnchors,
  doodleWrittenPhrase,
} from '../doodle-engraving'

// @spec-link [[rule_review_opens_with_doodle]]
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
const props = defineProps<{
  /** The session's doodle: quantized, with its capture tempo, first barline and raw notes. */
  doodle: SessionDoodle
  /** The session's phrase 1, whose key, instrument and clef the doodle is drawn in. */
  phraseOne: Pick<ReviewedPhrase, 'intent' | 'clef'>
  /** The workspace staff's viewport; null until it is known. */
  viewport: StaffViewport | null
  /** The doodle's positions to reserve; null until the viewport is known. */
  reservation: ReviewStaffReservation | null
  /** The Review's system-position size, in engraving units. */
  systemPositionUnits: number
  /** Whether Played notes is on: each position is followed by its lane, its space reserved. */
  playedNotesShown: boolean
  /** The session-wide pitch scale of the lanes; null for a session without a played note. */
  pitchScale: PlayedNotesPitchScale | null
}>()

/** Which note stands in place of the engraving, if any. */
type DoodleNote = 'needs-wider-window' | 'failed'

const NOTE_TEXT: Readonly<Record<DoodleNote, string>> = {
  'needs-wider-window': 'This doodle needs a wider window.',
  failed: "This doodle couldn't be drawn.",
}

const note = ref<DoodleNote | null>(null)
const staffEl = ref<HTMLElement | null>(null)
/** What the lanes are drawn against: the last successful engraving's, null while there is none. */
const laneSource = shallowRef<PlayedNotesLaneSource | null>(null)
let unmounted = false

const staffStyle = computed(() => reviewStaffStyle(props.reservation, props.playedNotesShown))

/**
 * Intent: the doodle's lanes while Played notes is on, none otherwise: its raw notes over its own
 * measures, drawn from the kept engraving, so the switch turned on later draws them at once; a note
 * still sounding at the doodle's last barline stops at it. Blank while nothing is engraved.
 */
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
const lanes = computed((): PlayedNotesLaneView[] => {
  const reservation = props.reservation
  if (!props.playedNotesShown || reservation === null) return []
  const { doodle } = props
  return playedNotesLaneViews({
    phraseNumber: 'doodle',
    record: {
      startedAt: doodle.firstBarlineAt,
      tempo: doodle.captureTempo,
      playedNotes: doodle.playedNotes,
    },
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

/** Intent: the reserved positions rendered in the staff now, top first. */
function renderedPositions(): HTMLElement[] {
  const staff = staffEl.value
  if (staff === null) return []
  return Array.from(staff.querySelectorAll<HTMLElement>(':scope > [data-system-position]'))
}

/** Intent: blank every reserved position and its lane. */
function clearPositions(): void {
  laneSource.value = null
  renderedPositions().forEach((host) => host.replaceChildren())
}

/**
 * Intent: draw the quantized doodle into a new `staff-content` in each reserved position, laid out
 * as a phrase's four-measure system at the staff's width and cut at the doodle's last barline; the
 * split layout's bottom system, unreserved for a short doodle, is drawn nowhere. The top system's
 * SVG is named for the doodle, a bottom one hidden. A layout failure shows the "wider window" note,
 * any other notation failure the "couldn't be drawn" one; anything else is a defect and throws.
 * Null, drawing nothing, when unmounted or the viewport became unknown meanwhile.
 */
// @spec-link [[rule_review_opens_with_doodle]]
async function engrave(engraver: ReviewEngraver): Promise<ReviewEngravingOutcome | null> {
  laneSource.value = null
  if (note.value !== null) {
    note.value = null
    await nextTick()
  }
  const { viewport, reservation, doodle, systemPositionUnits } = props
  const staff = staffEl.value
  if (unmounted || viewport === null || reservation === null || staff === null) return null
  const hosts = renderedPositions()
  if (hosts.length !== reservation.positionCount) {
    throw new Error("The doodle's reserved positions are not rendered.")
  }
  const units = hosts.map((host) => {
    const unit = document.createElement('div')
    unit.className = 'staff-content'
    host.replaceChildren(unit)
    return unit
  })
  const targets = [units[0]!, units[1] ?? document.createElement('div')] as const
  const { measureCount } = doodle.doodle
  try {
    const phrase = doodleWrittenPhrase(doodle.doodle, doodleEngravingContext(props.phraseOne))
    const result = engraver.engraveWrittenPhrase(
      targets,
      phrase,
      1,
      staff.clientWidth,
      viewport,
      systemPositionUnits,
    )
    const svgs = result.svgs.slice(0, reservation.positionCount)
    cutSystemsAtDoodleEnd(svgs, result.measureAnchors, measureCount)
    svgs.forEach((svg, index) => {
      if (index === 0) svg.setAttribute('aria-label', describeDoodle(phrase, measureCount))
      else svg.setAttribute('aria-hidden', 'true')
    })
    laneSource.value = {
      phrase,
      anchors: doodleMeasureAnchors(result.measureAnchors, measureCount),
      systemOffsetsPx: systemInlineOffsets(svgs, hosts),
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
// @spec-link [[rule_review_opens_with_doodle]]
function showFailure(): void {
  clearPositions()
  note.value = 'failed'
}

/** Intent: remove the engraving or note, leaving the reserved space blank. */
function release(): void {
  clearPositions()
  note.value = null
}

defineExpose({ engrave, showFailure, release })
</script>

<template>
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
</template>
