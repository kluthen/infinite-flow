<script setup lang="ts">
/**
 * `session-cue-row`: always present between the generation-failure banner's position and the
 * staff, at one fixed block size, holding at most one cue by priority: the disconnect banner while
 * a lost controller's countdown runs (a count-in under it keeps running, and shows again if the
 * device reattaches before beat 4), then the count-in (its beats lit on the audio clock by the
 * session controller), then the struggling notice, then the starting-note line (asking first for
 * the page's first click, tap or key press while the starting note waits for it). Below
 * bp-tablet-landscape, from a session's start to its end, `session-cue-actions` sits at its
 * trailing end: a compact `Stop` and the phone's `Volume`; the stylesheet shows them only there.
 * At Idle, while a most recent session exists and no Review shows (after `Close review`, after a
 * session ended during its count-in, after a reload), `review-link` sits at the trailing end
 * instead, beside the starting-note line or alone: "Review last session", "Last session" below
 * bp-tablet-landscape; it asks the shell to show that session's Review, and takes `is-loading`,
 * disabled, while a kept session is read from the device. After it, `sessions-link` ("All
 * sessions") while the session list has at least one row; it asks the shell to show the list. When
 * each link shows is ./cue-row-links.ts. It is not a live region and nothing in it is announced;
 * its content changes with no animation. In Jam mode (`jamCue`) the starting-note line's place holds
 * Jam's Idle cue instead: the same line naming the home note, with no start marker, or
 * `jam-needs-controller` ("A Jam needs a connected controller. Connect one to start.", "Connect a
 * controller to start." below bp-tablet-landscape), which `Start Jam` names by its id.
 */
import { computed } from 'vue'

import type { AudioTransport } from '@/audio/audio-transport'
import MixVolumeButton from './MixVolumeButton.vue'
import { reviewLinkShown, sessionsLinkShown } from './cue-row-links'
import type { MixVolumePopover } from './mix-volume-popover'
import { JAM_NEEDS_CONTROLLER_ID, type JamCue } from './use-jam-idle-cue'
import type { SessionController } from './workspace-session-controller-types'

const props = withDefaults(
  defineProps<{
    /** The session controller; null while its lazy chunk loads (no session can run then). */
    controller: SessionController | null
    audio: AudioTransport
    mixPopover: MixVolumePopover
    /** Jam's Idle cue, in the starting-note line's place in Jam mode; null (the default) else. */
    jamCue?: JamCue | null
  }>(),
  { jamCue: null },
)

const emit = defineEmits<{
  /** The compact `Stop` was clicked: it does exactly what the header's `Stop` does. */
  stop: []
  /** `Review last session` was clicked; the shell shows the Review and moves focus. */
  'show-review': []
  /** `All sessions` was clicked; the shell shows the session list and moves focus. */
  'show-sessions': []
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
 * Intent: the starting-note line: session mode's starting note, or in Jam mode the home note Jam's
 * Idle cue names; its label, and whether it asks for the page's first click first (after a load,
 * before any click, tap or key press): "Click the page once, then play this note to start",
 * shorter on the phone. Null when neither is named.
 */
// @spec-link [[rule_midi_starting_note]]
// @spec-link [[rule_jam_starting_note_is_home_note]]
const startLine = computed(() => {
  if (startingNote.value !== null) {
    return {
      label: startingNote.value.label,
      awaitsClick: props.controller?.state.startingNoteAwaitsClick === true,
    }
  }
  const jam = props.jamCue
  return jam?.kind === 'starting-note' ? { label: jam.label, awaitsClick: jam.awaitsClick } : null
})

/** Intent: whether `jam-needs-controller` holds the starting-note line's place (Jam mode). */
// @spec-link [[rule_jam_needs_controller]]
const jamNeedsController = computed(() => props.jamCue?.kind === 'needs-controller')

/** Intent: whether `review-link` is offered (./cue-row-links.ts). */
const reviewLink = computed(
  () => props.controller !== null && reviewLinkShown(props.controller.state),
)

/** Intent: whether `sessions-link` is offered (./cue-row-links.ts). */
const sessionsLink = computed(
  () => props.controller !== null && sessionsLinkShown(props.controller.state),
)

/** Intent: whether the most recent session is being read for `review-link`, which then waits. */
// @spec-link [[req_last_session_review]]
const reviewLinkLoading = computed(() => props.controller?.state.readingMostRecent === true)
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
    <!-- Below bp-tablet-landscape the stylesheet drops the cue clauses: the phone's wording. -->
    <p v-else-if="startLine !== null && startLine.awaitsClick" class="start-note-line">
      Click<span class="cue-clause"> the page</span> once, then play<span class="cue-clause">
        this note</span
      >
      to start: <strong>{{ startLine.label }}</strong>
    </p>
    <p v-else-if="startLine !== null" class="start-note-line">
      Play this note to start: <strong>{{ startLine.label }}</strong>
    </p>
    <!-- Below bp-tablet-landscape the stylesheet shows the narrow label instead of the wide one. -->
    <p v-else-if="jamNeedsController" :id="JAM_NEEDS_CONTROLLER_ID" class="jam-needs-controller">
      <span class="cue-label-wide">A Jam needs a connected controller. Connect one to start.</span
      ><span class="cue-label-narrow">Connect a controller to start.</span>
    </p>
    <div v-if="sessionActive" class="session-cue-actions">
      <button type="button" class="btn btn-primary" @click="emit('stop')">Stop</button>
      <MixVolumeButton :popover="mixPopover" opener="compact" :audio="audio" />
    </div>
    <template v-else>
      <button
        v-if="reviewLink"
        type="button"
        class="btn review-link"
        :class="{ 'is-loading': reviewLinkLoading }"
        :disabled="reviewLinkLoading"
        @click="emit('show-review')"
      >
        <span class="cue-label-wide">Review last session</span
        ><span class="cue-label-narrow">Last session</span>
      </button>
      <button
        v-if="sessionsLink"
        type="button"
        class="btn sessions-link"
        @click="emit('show-sessions')"
      >
        All sessions
      </button>
    </template>
  </div>
</template>
