<script setup lang="ts">
/**
 * One phrase of the Review's list: its number and tempo, then its `review-staff`, which reserves
 * the workspace staff's system positions (one, or two in the split layout) at their block size
 * before anything is drawn, so engraving or releasing it never changes the item's size. The list
 * decides when it is engraved (see ./review-engraving-window.ts); it then draws the stored phrase
 * exactly as it was shown, into one `staff-content` per position, or shows a note in their place
 * when it cannot. Nothing of the session is drawn on it, and a repeat looks like any other phrase.
 */
import { nextTick, onBeforeUnmount, ref } from 'vue'

import { describeWrittenPhrase } from '@/domain/notation/score-description'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import { isStaffLayoutFailure, NotationError } from '@/notation/notation-error'
import type { StaffViewport } from '@/notation/notation-layout-policy'
import type { SessionHistoryRecord } from '@/session/session-history'
import type { ReviewEngravingOutcome } from './review-engraving-window'
import type { ReviewEngraver, ReviewStaffReservation } from './review-types'

// @spec-link [[req_last_session_review]]
// @spec-link [[rule_repeat_phrase_marked_internally_only]]
const props = defineProps<{
  /** The phrase's record; only its number, tempo, outcome and intent are ever read. */
  record: SessionHistoryRecord
  /** The workspace staff's viewport; null until it is known. */
  viewport: StaffViewport | null
  /** The positions to reserve, the same for every phrase; null until the viewport is known. */
  reservation: ReviewStaffReservation | null
}>()

/** Which note stands in place of the engraving, if any. */
type PhraseNote = 'needs-wider-window' | 'failed'

const NOTE_TEXT: Readonly<Record<PhraseNote, string>> = {
  'needs-wider-window': 'This phrase needs a wider window.',
  failed: "This phrase couldn't be drawn.",
}

const note = ref<PhraseNote | null>(null)
const staffEl = ref<HTMLElement | null>(null)
let unmounted = false

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

/** Intent: blank every reserved position. */
function clearPositions(): void {
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
 * staff's content width in the current viewport, replacing what was there. A layout failure (no
 * room, or notes too wide at this width) shows the "wider window" note, any other notation
 * failure the "couldn't be drawn" one; anything else is a defect and throws. A note is removed
 * first, so the positions are rendered to draw in. Null, drawing nothing, when the phrase was
 * unmounted or the viewport became unknown meanwhile.
 * Only the stored phrase reaches the engraver: no played note, acknowledgement, start marker or
 * playhead is drawn, and the repeat mark is never read.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[rule_no_grading_or_mismatch_signal]]
// @spec-link [[rule_repeat_phrase_marked_internally_only]]
async function engrave(engraver: ReviewEngraver): Promise<ReviewEngravingOutcome | null> {
  if (note.value !== null) {
    note.value = null
    await nextTick()
  }
  const { viewport, reservation, record } = props
  const staff = staffEl.value
  if (unmounted || viewport === null || reservation === null || staff === null) return null
  const units = positionHosts(reservation).map((host) => {
    const unit = document.createElement('div')
    unit.className = 'staff-content'
    host.replaceChildren(unit)
    return unit
  })
  // The one-system layout draws nothing into its second target.
  const targets = [units[0]!, units[1] ?? document.createElement('div')] as const
  try {
    const phrase = transformToWrittenPhrase(notationInputFromOutcome(record.outcome, record.intent))
    const result = engraver.engraveWrittenPhrase(
      targets,
      phrase,
      record.phraseNumber,
      staff.clientWidth,
      viewport,
    )
    labelSystems(result.svgs, describeWrittenPhrase(phrase).summary)
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
    <!-- The reserved block size is the notation layout's, set before anything is drawn. -->
    <div
      ref="staffEl"
      class="review-staff"
      :style="
        reservation === null
          ? undefined
          : { blockSize: `${reservation.positionCount * reservation.positionBlockPx}px` }
      "
    >
      <p v-if="note !== null" class="review-phrase-note">{{ NOTE_TEXT[note] }}</p>
      <template v-else-if="reservation !== null">
        <!-- The reserved system positions: placed and sized by the notation layout, no class. -->
        <div
          v-for="index in reservation.positionCount"
          :key="index"
          :data-system-position="index === 1 ? 'top' : 'bottom'"
          :style="{ blockSize: `${reservation.positionBlockPx}px` }"
        ></div>
      </template>
    </div>
  </li>
</template>
