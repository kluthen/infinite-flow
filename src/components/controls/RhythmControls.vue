<script setup lang="ts">
/**
 * The "Rhythm" control group: note density, syncopation, silence density, plus the calm inline
 * notice and always-rendered polite live region that appear when the current combination cannot
 * form a four-bar phrase. The suggestion shown is text only -- this component never applies it.
 */
import { computed } from 'vue'

import {
  NOTE_DENSITIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  validateControlValue,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import {
  UNSUPPORTED_RHYTHM_SETTING_MESSAGE,
  describeRhythmSettingSuggestion,
  isUnsupportedRhythmSetting,
  suggestNearestSupportedRhythmChange,
} from '@/domain/controls/unsupported-rhythm-settings'
import SegmentedControl from './SegmentedControl.vue'
import type { SetControlPayload } from './set-control-event'
import { noteDensityOptions, silenceDensityOptions, syncopationOptions } from './control-options'

const props = defineProps<{
  controls: GenerationControls
  readonly: boolean
}>()

const emit = defineEmits<{
  'set-control': [payload: SetControlPayload]
}>()

/** Intent: report a note-density change, re-validating against its catalog. */
function handleNoteDensity(value: string): void {
  emit('set-control', {
    key: 'noteDensity',
    value: validateControlValue(NOTE_DENSITIES, value, 'Note density'),
  })
}

/** Intent: report a syncopation change, re-validating against its catalog. */
function handleSyncopation(value: string): void {
  emit('set-control', {
    key: 'syncopation',
    value: validateControlValue(SYNCOPATIONS, value, 'Syncopation'),
  })
}

/** Intent: report a silence-density change, re-validating against its catalog. */
function handleSilenceDensity(value: string): void {
  emit('set-control', {
    key: 'silenceDensity',
    value: validateControlValue(SILENCE_DENSITIES, value, 'Silence density'),
  })
}

/** Intent: name the rhythm-setting subset of the current controls that the block rule reads. */
const rhythmSetting = computed(() => ({
  noteDensity: props.controls.noteDensity,
  silenceDensity: props.controls.silenceDensity,
  syncopation: props.controls.syncopation,
}))

// @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
const isBlocked = computed(() => isUnsupportedRhythmSetting(rhythmSetting.value))

// @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
const blockedMessage = computed(() => {
  if (!isBlocked.value) return null
  const suggestion = suggestNearestSupportedRhythmChange(rhythmSetting.value)
  return `${UNSUPPORTED_RHYTHM_SETTING_MESSAGE} ${describeRhythmSettingSuggestion(suggestion)}`
})

/** Intent: the persistent live-region text -- empty (not absent) whenever the setting is supported. */
const liveRegionText = computed(() => blockedMessage.value ?? '')
</script>

<template>
  <section class="control-group">
    <h3>Rhythm</h3>
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Note density</span>
      <SegmentedControl
        label="Note density"
        :options="noteDensityOptions()"
        :model-value="controls.noteDensity"
        :readonly="readonly"
        @update:model-value="handleNoteDensity"
      />
    </div>
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Syncopation</span>
      <SegmentedControl
        label="Syncopation"
        :options="syncopationOptions()"
        :model-value="controls.syncopation"
        :readonly="readonly"
        @update:model-value="handleSyncopation"
      />
    </div>
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Silence density</span>
      <SegmentedControl
        label="Silence density"
        :options="silenceDensityOptions()"
        :model-value="controls.silenceDensity"
        :readonly="readonly"
        @update:model-value="handleSilenceDensity"
      />
    </div>
    <p
      v-show="isBlocked"
      class="inline-alert alert-notice"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ liveRegionText }}
    </p>
  </section>
</template>
