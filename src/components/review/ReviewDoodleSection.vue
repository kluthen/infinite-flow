<script setup lang="ts">
/**
 * The doodle section of a Jam session's Review (`review-doodle`), before phrase 1: its header
 * ("Your doodle" and the tempo the doodle was played at, shown at once), then the doodle as the
 * app heard it, which comes with Jam's code (loaded on demand, src/jam/): while that code loads,
 * "Loading your doodle." in the doodle's place, with no spinner; when it could not load, the
 * sentence saying so, never error-toned; once loaded, Jam's own doodle staff (its `review-staff`
 * and lanes, ../../jam/review/ReviewDoodle.vue), which the Review's list engraves first. No
 * number, no chord symbol, no favorite: the doodle is not a phrase.
 */
import { computed, ref, useId } from 'vue'

import type { StaffViewport } from '@/notation/notation-layout-policy'
import type { ReviewedPhrase, SessionDoodle } from '@/session/session-history'
import type { PlayedNotesPitchScale } from './played-notes-lane-geometry'
import type { ReviewEngravingOutcome } from './review-engraving-window'
import { doodleStaffReservation, reviewStaffStyle } from './review-staff-style'
import type { ReviewEngraver, ReviewJamCode, ReviewStaffReservation } from './review-types'

// @spec-link [[rule_review_opens_with_doodle]]
// @spec-link [[rule_jam_code_loaded_on_demand]]
const props = defineProps<{
  /** The session's doodle: quantized, with its capture tempo, first barline and raw notes. */
  doodle: SessionDoodle
  /** The session's phrase 1, whose key, instrument and clef the doodle is drawn in. */
  phraseOne: ReviewedPhrase
  /** Jam's code: loading, unable to load, or loaded. */
  jamCode: ReviewJamCode
  /** The workspace staff's viewport; null until it is known. */
  viewport: StaffViewport | null
  /** The positions a phrase reserves; null until the viewport is known. */
  reservation: ReviewStaffReservation | null
  /** The Review's system-position size, in engraving units. */
  systemPositionUnits: number
  /** Whether Played notes is on (and shown). */
  playedNotesShown: boolean
  /** The session-wide pitch scale of the lanes; null for a session without a played note. */
  pitchScale: PlayedNotesPitchScale | null
}>()

/** The sentences standing in for the doodle while Jam's code is not there. */
const CODE_NOTES = {
  loading: 'Loading your doodle.',
  failed:
    "Your doodle can't be shown: part of the app didn't load. Check that you're online, then " +
    'open this session again.',
} as const

const titleId = useId()
const noteId = useId()

/** The doodle's reserved positions: a phrase's, the top one only for a short split doodle. */
const reservation = computed(() =>
  doodleStaffReservation(props.reservation, props.doodle.doodle.measureCount),
)
/** While Jam's code is not there, its note keeps the doodle's positions; the doodle has no lane then. */
const waitingStyle = computed(() => reviewStaffStyle(reservation.value, false))

/** The exposed API of Jam's doodle staff. */
interface DoodleStaffApi {
  engrave(engraver: ReviewEngraver): Promise<ReviewEngravingOutcome | null>
  showFailure(): void
  release(): void
}

const staff = ref<DoodleStaffApi | null>(null)

/** Intent: Jam's doodle staff, which the list only names once Jam's code has loaded. */
function requireStaff(): DoodleStaffApi {
  if (staff.value === null) throw new Error("The doodle's staff is not mounted.")
  return staff.value
}

/**
 * Intent: engrave the doodle; null, drawing nothing, while its staff is not mounted (Jam's code
 * not there, or the section gone).
 */
// @spec-link [[rule_review_opens_with_doodle]]
async function engrave(engraver: ReviewEngraver): Promise<ReviewEngravingOutcome | null> {
  return staff.value === null ? null : staff.value.engrave(engraver)
}

defineExpose({
  engrave,
  showFailure: () => requireStaff().showFailure(),
  release: () => staff.value?.release(),
  /** The id of the note naming why the doodle is not shown, for the controls it disables. */
  noteId,
})
</script>

<template>
  <section class="review-doodle" :aria-labelledby="titleId">
    <div class="review-phrase-header">
      <h3 :id="titleId" class="review-phrase-title">Your doodle</h3>
      <span class="review-phrase-tempo">{{ doodle.captureTempo }} BPM</span>
      <slot name="header-tools" :note-id="noteId" />
    </div>
    <component
      :is="jamCode.module.ReviewDoodle"
      v-if="jamCode.state === 'loaded'"
      ref="staff"
      :doodle="doodle"
      :phrase-one="phraseOne"
      :viewport="viewport"
      :reservation="reservation"
      :system-position-units="systemPositionUnits"
      :played-notes-shown="playedNotesShown"
      :pitch-scale="pitchScale"
    />
    <div v-else class="review-staff" :style="waitingStyle">
      <p :id="noteId" class="review-phrase-note">{{ CODE_NOTES[jamCode.state] }}</p>
    </div>
    <slot name="suggestion" />
  </section>
</template>
