<script setup lang="ts">
/**
 * Jam's staff for phrase 1 written from the kept doodle (./use-kept-doodle-phrase.ts): its own
 * `staff-viewport` and `staff-frame`, holding its own `PhraseScore`, so session mode's staff, its
 * phrase and its state are never touched by it. The score panel mounts it while Jam mode shows and
 * puts it in sight in `staff-jam`'s place while a doodle is kept; out of sight it stays laid out,
 * so the Idle rules keep measuring and engraving under the Review. Its frame takes the Idle states
 * as session mode's does (./idle-staff-frame.ts): Loading, Ready, the notation error and Needs
 * more room, with the same sentences but Jam's too-many-notes one, which names a new doodle; it
 * shows no instruction, phrase 1 being always on its way from the doodle. While phrase 1's first note would start a Jam, the start marker points at it,
 * as on session mode's Ready staff. What its `PhraseScore` reports goes to Jam's phrase 1.
 */
import { computed, ref } from 'vue'

import PhraseScore from '@/components/notation/PhraseScore.vue'
import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import { noteIdentityKey } from '@/notation/note-identity'
import { NO_SCORE_OVERLAYS, type ScoreOverlays } from '@/notation/score-overlay-state'
import {
  ROOM_NOTICE_NARROW,
  ROOM_NOTICE_TOO_MANY_NOTES_JAM,
  ROOM_NOTICE_WIDE,
} from '@/components/notation/room-notice-copy'
import { idleStaffFrameClass } from './idle-staff-frame'
import type { KeptDoodlePhraseView } from './use-kept-doodle-phrase'

// @spec-link [[rule_held_doodle_phrase_one_at_idle]]
const props = defineProps<{
  /** Jam's phrase 1 at Idle, as the screen shows it. */
  view: KeptDoodlePhraseView
  /** The shared system-position size, in engraving units, the staff draws at. */
  systemPositionUnits: number
  /** The note of phrase 1 the start marker points at; null for no marker. */
  startMarker: ExpectedNoteIdentity | null
}>()

/**
 * Intent: the start marker as PhraseScore draws it, kept as the same object while it points at the
 * same note, so nothing is redrawn for an unchanged marker.
 */
// @spec-link [[rule_starting_note_named]]
// @spec-link [[module_notation_note_identity_overlays]]
const overlays = computed<ScoreOverlays>((previous) => {
  const marker = props.startMarker
  const kept = previous ?? NO_SCORE_OVERLAYS
  const same =
    marker === kept.startMarker ||
    (marker !== null &&
      kept.startMarker !== null &&
      noteIdentityKey(marker) === noteIdentityKey(kept.startMarker))
  return same ? kept : { ...NO_SCORE_OVERLAYS, startMarker: marker }
})

/** Intent: the frame's state class, from phrase 1's Idle state. */
// @spec-link [[rule_held_doodle_phrase_one_at_idle]]
const frameClass = computed(() => idleStaffFrameClass(props.view.state))

/** The room notice's cause, for which sentence `room-notice` holds; null with none. */
const roomNotice = computed(() => props.view.state.roomNotice)

/** Intent: the retained notation failure's message, never over the room notice. */
// @spec-link [[rule_staff_needs_room_notice]]
const notationErrorMessage = computed(() =>
  roomNotice.value === null ? (props.view.state.notationError?.message ?? null) : null,
)

const roomNoticeElement = ref<HTMLElement | null>(null)

/** Intent: move focus to `room-notice`; it must be on screen. */
function focusRoomNotice(): void {
  if (roomNoticeElement.value === null) throw new Error("Jam's staff: room-notice is not shown")
  roomNoticeElement.value.focus()
}

defineExpose({ focusRoomNotice })
</script>

<template>
  <div class="staff-viewport">
    <div class="staff-frame" :class="frameClass" aria-labelledby="score-panel-title">
      <PhraseScore
        :phrase="view.phrase"
        :phrase-number="1"
        :overlays="overlays"
        :system-position-units="systemPositionUnits"
        @engraved="view.staff.handleEngraved()"
        @notation-error="view.staff.handleNotationError"
        @layout-inputs="view.staff.handleLayoutInputs"
      >
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
          {{ ROOM_NOTICE_TOO_MANY_NOTES_JAM }}
        </p>
        <p v-if="notationErrorMessage !== null" class="inline-alert alert-error">
          Notation error: {{ notationErrorMessage }}
        </p>
      </PhraseScore>
    </div>
  </div>
</template>
