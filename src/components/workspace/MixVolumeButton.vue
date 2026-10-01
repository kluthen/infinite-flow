<script setup lang="ts">
/**
 * One `Volume` button in its `mix-volume` anchor: the toolbar's, or the phone's compact one in the
 * session cue row. Both name the one volume popover and open it anchored under themselves: the
 * popover is rendered in the anchor of the `Volume` that has it open, and in the toolbar's,
 * hidden, while it is closed, so exactly one popover element is ever in the page.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import type { DesignTokenSource } from '@/audio/audio-mix'
import type { AudioTransport } from '@/audio/audio-transport'
import MixVolumePanel from './MixVolumePanel.vue'
import type { MixVolumeOpener, MixVolumePopover } from './mix-volume-popover'

const props = defineProps<{
  popover: MixVolumePopover
  opener: MixVolumeOpener
  audio: AudioTransport
  /** Where the popover reads the `--mix-*` design tokens; its own default when absent. */
  designTokens?: (() => DesignTokenSource) | undefined
}>()

const button = ref<HTMLButtonElement | null>(null)

const expanded = computed(() => props.popover.state.openedBy === props.opener)

/** Intent: whether this anchor holds the popover: open from here, or closed and this is the toolbar's. */
// @spec-link [[req_session_audio_mix]]
const holdsPopover = computed(
  () => expanded.value || (props.opener === 'toolbar' && props.popover.state.openedBy === null),
)

/** Whether this opener had the popover open when the current pointer press began. */
let openAtPress = false

/** Intent: register this opener's button, which focus returns to when the popover closes. */
// @spec-link [[req_session_audio_mix]]
onMounted(() => {
  if (button.value === null) throw new Error('mix volume: the Volume button did not render')
  props.popover.attachOpener(props.opener, button.value)
})

/** Intent: forget this opener as it leaves the page, closing a popover it opened. */
onBeforeUnmount(() => props.popover.detachOpener(props.opener))

/**
 * Intent: note whether the popover was open from here when a pointer press began, before the
 * press's focus move out of the popover (Tab out) closes it, so that the click ends closed.
 */
function notePress(): void {
  openAtPress = expanded.value
}

/**
 * Intent: open or close the popover from this `Volume`. A pointer click (`detail` above 0) acts on
 * the state at its press; a keyboard activation on the state now.
 */
// @spec-link [[req_session_audio_mix]]
function activate(event: MouseEvent): void {
  const wasOpen = event.detail > 0 ? openAtPress : expanded.value
  openAtPress = false
  if (wasOpen) props.popover.dismiss()
  else props.popover.toggleFrom(props.opener)
}
</script>

<template>
  <div class="mix-volume">
    <button
      ref="button"
      type="button"
      class="btn"
      :aria-expanded="expanded ? 'true' : 'false'"
      :aria-controls="popover.id"
      @pointerdown="notePress"
      @click="activate"
    >
      Volume
    </button>
    <MixVolumePanel
      v-if="holdsPopover"
      :audio="audio"
      :popover="popover"
      :open="expanded"
      :design-tokens="designTokens"
    />
  </div>
</template>
