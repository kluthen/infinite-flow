<script setup lang="ts">
/**
 * `session-cue-row`: always present between the generation-failure banner's position and the
 * staff, at one fixed block size, holding at most one cue by priority: the count-in (its beats lit
 * on the audio clock by the session controller), then the struggling notice. (The disconnect
 * banner, above the count-in, and the starting-note line, below the notice, are chunk 17's.) Below
 * bp-tablet-landscape, from a session's start to its end, `session-cue-actions` sits at its
 * trailing end: a compact `Stop` and the phone's `Volume`; the stylesheet shows them only there.
 * It is not a live region and nothing in it is announced; its content changes with no animation.
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
}>()

/** Intent: whether a session runs, count-in included. */
// @spec-link [[service_workspace_session_flow]]
const sessionActive = computed(
  () => props.controller !== null && props.controller.state.phase !== 'idle',
)

/** Intent: the count-in row while the count-in runs, null otherwise; it outranks the notice. */
// @spec-link [[rule_count_in_shown_on_screen]]
const countIn = computed(() => props.controller?.state.countIn ?? null)

/** Intent: show the struggling notice while the controller raises it and no count-in shows. */
// @spec-link [[rule_struggling_generator_notice]]
const strugglingNoticeShown = computed(
  () => countIn.value === null && props.controller?.state.strugglingNotice === true,
)
</script>

<template>
  <div class="session-cue-row">
    <ol v-if="countIn !== null" class="count-in">
      <li
        v-for="(beat, index) in countIn.beats"
        :key="index"
        class="count-in-beat"
        :class="{ 'is-current': beat === 'current', 'is-past': beat === 'past' }"
      >
        {{ index + 1 }}
      </li>
    </ol>
    <p v-else-if="strugglingNoticeShown" class="inline-alert alert-notice session-alert">
      <span class="session-alert-text">The generator is struggling with these settings.</span>
    </p>
    <div v-if="sessionActive" class="session-cue-actions">
      <button type="button" class="btn btn-primary" @click="emit('stop')">Stop</button>
      <MixVolumeButton :popover="mixPopover" opener="compact" :audio="audio" />
    </div>
  </div>
</template>
