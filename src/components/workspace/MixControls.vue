<script setup lang="ts">
/**
 * The audio mix in the score toolbar: the `Backing` and `Click` toggle buttons, then the toolbar's
 * `Volume` button, which holds the one volume popover. Never locked: it drives the audio
 * transport's mix at idle and during a session alike. The levels live in the transport, which
 * starts from the player's saved mix; each toggle the player turns is saved with the value the
 * transport then holds (during a session, written when it ends).
 */
import { ref } from 'vue'

import type { AudioMix, DesignTokenSource } from '@/audio/audio-mix'
import type { AudioTransport } from '@/audio/audio-transport'
import MixVolumeButton from './MixVolumeButton.vue'
import type { MixVolumePopover } from './mix-volume-popover'
import { injectSaveSettings } from './save-settings-injection'

const props = defineProps<{
  audio: AudioTransport
  popover: MixVolumePopover
  /** Where the popover reads the `--mix-*` design tokens; its own default when absent. */
  designTokens?: () => DesignTokenSource
}>()

const mix = ref<AudioMix>(props.audio.mix())
const saveSettings = injectSaveSettings()

/**
 * Intent: turn the backing on or off in the transport's mix, show the mix it now holds, and save
 * the value it holds.
 */
// @spec-link [[req_session_audio_mix]]
// @spec-link [[rule_settings_saved_on_change]]
function toggleBacking(): void {
  props.audio.setBackingOn(!mix.value.backingOn)
  mix.value = props.audio.mix()
  saveSettings({ 'mix.backingOn': mix.value.backingOn })
}

/**
 * Intent: turn the click on or off in the transport's mix, show the mix it now holds, and save
 * the value it holds.
 */
// @spec-link [[req_session_audio_mix]]
// @spec-link [[rule_settings_saved_on_change]]
function toggleClick(): void {
  props.audio.setClickOn(!mix.value.clickOn)
  mix.value = props.audio.mix()
  saveSettings({ 'mix.clickOn': mix.value.clickOn })
}
</script>

<template>
  <div class="mix-controls">
    <button
      type="button"
      class="btn toggle-button"
      :aria-pressed="mix.backingOn ? 'true' : 'false'"
      @click="toggleBacking"
    >
      Backing
      <span class="toggle-button-state" aria-hidden="true">{{ mix.backingOn ? 'on' : 'off' }}</span>
    </button>
    <button
      type="button"
      class="btn toggle-button"
      :aria-pressed="mix.clickOn ? 'true' : 'false'"
      @click="toggleClick"
    >
      Click
      <span class="toggle-button-state" aria-hidden="true">{{ mix.clickOn ? 'on' : 'off' }}</span>
    </button>
    <MixVolumeButton
      :popover="popover"
      opener="toolbar"
      :audio="audio"
      :design-tokens="designTokens"
    />
  </div>
</template>
