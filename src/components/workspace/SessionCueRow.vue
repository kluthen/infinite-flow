<script setup lang="ts">
/**
 * `session-cue-row`: always present between the generation-failure banner's position and the
 * staff, at one fixed block size, holding at most one cue by priority: the disconnect banner while
 * a lost controller's countdown runs (a count-in under it keeps running, and shows again if the
 * device reattaches before beat 4), then the count-in (its beats lit on the audio clock by the
 * session controller), then the struggling notice, then the starting-note line. Below
 * bp-tablet-landscape, from a session's start to its end, `session-cue-actions` sits at its
 * trailing end: a compact `Stop` and the phone's `Volume`; the stylesheet shows them only there.
 * At Idle, while the last session's Review is kept but not showing, `review-link` sits at the
 * trailing end instead, beside the starting-note line or alone; it asks the shell to show the
 * Review again. It is not a live region and nothing in it is announced; its content changes with
 * no animation.
 */
import { computed } from 'vue'

import type { AudioTransport } from '@/audio/audio-transport'
import MixVolumeButton from './MixVolumeButton.vue'
import type { MixVolumePopover } from './mix-volume-popover'
import type { SessionController } from './workspace-session-controller-types'

const props = defineProps<{
  /** The session controller; null while its lazy chunk loads (no session can run then). */
  controller: SessionController | null
  audio: AudioTransport
  mixPopover: MixVolumePopover
}>()

const emit = defineEmits<{
  /** The compact `Stop` was clicked: it does exactly what the header's `Stop` does. */
  stop: []
  /** `Review last session` was clicked; the shell shows the Review and moves focus. */
  'show-review': []
}>()

/** Intent: whether a session runs, count-in included. */
// @spec-link [[service_session_controller]]
const sessionActive = computed(
  () => props.controller !== null && props.controller.state.phase !== 'idle',
)

/** Intent: a lost controller's countdown while it runs, null otherwise; it outranks every cue. */
// @spec-link [[rule_controller_loss_mid_session]]
// @spec-link [[rule_controller_reconnection_window]]
const controllerLost = computed(() => props.controller?.state.controllerLost ?? null)

/** Intent: the count-in row while the count-in runs, null otherwise; it outranks the notice. */
// @spec-link [[rule_count_in_shown_on_screen]]
const countIn = computed(() => props.controller?.state.countIn ?? null)

/** Intent: whether the controller raises the struggling notice; it outranks the start line. */
// @spec-link [[rule_struggling_generator_notice]]
const strugglingNotice = computed(() => props.controller?.state.strugglingNotice === true)

/** Intent: the note that would start a session if played now, for the start line; else null. */
// @spec-link [[rule_starting_note_named]]
// @spec-link [[rule_midi_starting_note]]
const startingNote = computed(() => props.controller?.state.startingNote ?? null)

/**
 * Intent: whether `review-link` is offered: at Idle, while a Review is kept and not showing. A
 * start discards the Review, which removes it.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[rule_new_session_discards_review]]
const reviewKept = computed(
  () =>
    !sessionActive.value &&
    props.controller !== null &&
    props.controller.state.review !== null &&
    !props.controller.state.review.showing,
)
</script>

<template>
  <div class="session-cue-row">
    <!-- Below bp-tablet-landscape the stylesheet drops the clause: the phone's shorter wording. -->
    <p v-if="controllerLost !== null" class="inline-alert alert-error session-alert">
      <span class="session-alert-text"
        >Controller disconnected<span class="session-alert-clause">
          — plug it back in to keep playing</span
        >. Session ends in
        <span class="session-alert-countdown">{{ controllerLost.secondsLeft }} s</span>.</span
      >
    </p>
    <ol v-else-if="countIn !== null" class="count-in">
      <li
        v-for="(beat, index) in countIn.beats"
        :key="index"
        class="count-in-beat"
        :class="{ 'is-current': beat === 'current', 'is-past': beat === 'past' }"
      >
        {{ index + 1 }}
      </li>
    </ol>
    <p v-else-if="strugglingNotice" class="inline-alert alert-notice session-alert">
      <span class="session-alert-text">The generator is struggling with these settings.</span>
    </p>
    <p v-else-if="startingNote !== null" class="start-note-line">
      Play this note to start: <strong>{{ startingNote.label }}</strong>
    </p>
    <div v-if="sessionActive" class="session-cue-actions">
      <button type="button" class="btn btn-primary" @click="emit('stop')">Stop</button>
      <MixVolumeButton :popover="mixPopover" opener="compact" :audio="audio" />
    </div>
    <button
      v-else-if="reviewKept"
      type="button"
      class="btn review-link"
      @click="emit('show-review')"
    >
      Review last session
    </button>
  </div>
</template>
