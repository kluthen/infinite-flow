<script setup lang="ts">
/**
 * The one volume popover of the audio mix: the `Backing volume` and `Click volume` sliders, which
 * set the audio transport's mix live as they move and save the level once released. Rendered by the
 * `Volume` button that holds it (see `MixVolumeButton`), hidden while closed. It opens and closes
 * instantly, with no animation; opening focuses the first slider, and Escape, a pointer press
 * outside, and Tab out of it close it through the shared `popover` controller.
 */
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

import {
  readAudioMixDesign,
  readMixVolumeStep,
  type AudioMix,
  type DesignTokenSource,
} from '@/audio/audio-mix'
import type { AudioTransport } from '@/audio/audio-transport'
import type { MixVolumePopover } from './mix-volume-popover'
import { injectSaveSettings } from './save-settings-injection'

const props = withDefaults(
  defineProps<{
    audio: AudioTransport
    popover: MixVolumePopover
    /** Whether the popover is open (shown) here. */
    open: boolean
    /** Where the `--mix-*` design tokens are read; the root element's computed style by default. */
    designTokens?: (() => DesignTokenSource) | undefined
  }>(),
  // Default: the loaded stylesheet's tokens, read from the document root when first needed.
  { designTokens: () => getComputedStyle(document.documentElement) },
)

/** One slider's range and step. */
interface SliderRange {
  readonly min: number
  readonly max: number
  readonly step: number
}

const mix = ref<AudioMix>(props.audio.mix())
const saveSettings = injectSaveSettings()
const panel = ref<HTMLElement | null>(null)
const firstSlider = ref<HTMLInputElement | null>(null)
/** The sliders' ranges, read from the tokens the first time the popover opens. */
const sliders = shallowRef<{ readonly backing: SliderRange; readonly click: SliderRange } | null>(
  null,
)

/**
 * Intent: the sliders' ranges from the `--mix-*` tokens: the click slider starts at its audible
 * minimum, never at silence; the backing slider may reach silence.
 */
// @spec-link [[req_session_audio_mix]]
// @spec-link [[rule_click_volume_never_silent]]
function readSliders(): { readonly backing: SliderRange; readonly click: SliderRange } {
  const tokens = props.designTokens()
  const { range } = readAudioMixDesign(tokens)
  const step = readMixVolumeStep(tokens)
  return {
    backing: { min: range.backingVolumeMin, max: range.volumeMax, step },
    click: { min: range.clickVolumeMin, max: range.volumeMax, step },
  }
}

/** Intent: the level a slider's input event carries; throws when it did not come from a slider. */
function sliderLevel(event: Event): number {
  const target = event.currentTarget
  if (!(target instanceof HTMLInputElement)) throw new Error('mix volume: input from a non-slider')
  return Number(target.value)
}

/** Intent: set the backing volume from its slider; the level applies even while the backing is off. */
// @spec-link [[req_session_audio_mix]]
function setBackingVolume(event: Event): void {
  props.audio.setBackingVolume(sliderLevel(event))
  mix.value = props.audio.mix()
}

/** Intent: set the click volume from its slider, whose minimum keeps it audible. */
// @spec-link [[rule_click_volume_never_silent]]
function setClickVolume(event: Event): void {
  props.audio.setClickVolume(sliderLevel(event))
  mix.value = props.audio.mix()
}

/**
 * Intent: save the backing volume the transport holds once its slider is released; the moves
 * before it set the level only, so one drag saves once.
 */
// @spec-link [[rule_settings_saved_on_change]]
function saveBackingVolume(): void {
  saveSettings({ 'mix.backingVolume': props.audio.mix().backingVolume })
}

/** Intent: save the click volume the transport holds once its slider is released. */
// @spec-link [[rule_settings_saved_on_change]]
function saveClickVolume(): void {
  saveSettings({ 'mix.clickVolume': props.audio.mix().clickVolume })
}

/** Intent: Escape inside the popover closes it and returns focus to its `Volume`. */
// @spec-link [[req_session_audio_mix]]
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') props.popover.escape()
}

/** Intent: Tab (or any focus move) out of the popover closes it; a move between its sliders does not. */
// @spec-link [[req_session_audio_mix]]
function handleFocusout(event: FocusEvent): void {
  const next = event.relatedTarget
  if (!(next instanceof Node) || panel.value?.contains(next) === true) return
  props.popover.dismiss()
}

/** Intent: a pointer press outside the popover and its `Volume` closes it, focus left alone. */
// @spec-link [[req_session_audio_mix]]
function handleDocumentPointerdown(event: Event): void {
  if (event.target instanceof Node && props.popover.isOutside(event.target)) {
    props.popover.dismiss()
  }
}

/**
 * Intent: on opening, show the transport's current levels, listen for outside presses and focus
 * the first slider once it is drawn; on closing, stop listening.
 */
// @spec-link [[req_session_audio_mix]]
watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) {
      document.removeEventListener('pointerdown', handleDocumentPointerdown, true)
      return
    }
    sliders.value ??= readSliders()
    mix.value = props.audio.mix()
    document.addEventListener('pointerdown', handleDocumentPointerdown, true)
    await nextTick()
    if (props.open) firstSlider.value?.focus()
  },
  { immediate: true },
)

/** Intent: hand the popover element to the controller, which checks where focus is. */
onMounted(() => {
  if (panel.value === null) throw new Error('mix volume: the popover did not render')
  props.popover.attachPanel(panel.value)
})

/** Intent: stop listening and take the element back from the controller as it leaves the page. */
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerdown, true)
  if (panel.value !== null) props.popover.detachPanel(panel.value)
})
</script>

<template>
  <div
    :id="popover.id"
    ref="panel"
    class="popover"
    :hidden="!open"
    @keydown="handleKeydown"
    @focusout="handleFocusout"
  >
    <template v-if="sliders !== null">
      <div class="field-group">
        <label class="field-label" :for="`${popover.id}-backing`">Backing volume</label>
        <input
          :id="`${popover.id}-backing`"
          ref="firstSlider"
          class="range-input"
          type="range"
          :min="sliders.backing.min"
          :max="sliders.backing.max"
          :step="sliders.backing.step"
          :value="mix.backingVolume"
          @input="setBackingVolume"
          @change="saveBackingVolume"
        />
      </div>
      <div class="field-group">
        <label class="field-label" :for="`${popover.id}-click`">Click volume</label>
        <input
          :id="`${popover.id}-click`"
          class="range-input"
          type="range"
          :min="sliders.click.min"
          :max="sliders.click.max"
          :step="sliders.click.step"
          :value="mix.clickVolume"
          @input="setClickVolume"
          @change="saveClickVolume"
        />
      </div>
    </template>
  </div>
</template>
