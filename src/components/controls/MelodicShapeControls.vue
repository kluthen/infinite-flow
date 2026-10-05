<script setup lang="ts">
/**
 * The "Melodic shape" control group: contour, register, leapiness. Props-in/events-out only.
 */
import {
  CONTOURS,
  LEAPINESS_VALUES,
  REGISTER_CHOICES,
  validateControlValue,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import SegmentedControl from './SegmentedControl.vue'
import type { SetControlPayload } from './set-control-event'
import { contourOptions, leapinessOptions, registerOptions } from './control-options'

defineProps<{
  controls: GenerationControls
  readonly: boolean
}>()

const emit = defineEmits<{
  'set-control': [payload: SetControlPayload]
}>()

/** Intent: report a contour change, re-validating against its catalog. */
// @spec-link [[module_generation_control_catalog]]
function handleContour(value: string): void {
  emit('set-control', { key: 'contour', value: validateControlValue(CONTOURS, value, 'Contour') })
}

/** Intent: report a register change, re-validating against its catalog. */
// @spec-link [[module_generation_control_catalog]]
function handleRegister(value: string): void {
  emit('set-control', {
    key: 'register',
    value: validateControlValue(REGISTER_CHOICES, value, 'Register'),
  })
}

/** Intent: report a leapiness change, re-validating against its catalog. */
// @spec-link [[module_generation_control_catalog]]
function handleLeapiness(value: string): void {
  emit('set-control', {
    key: 'leapiness',
    value: validateControlValue(LEAPINESS_VALUES, value, 'Leapiness'),
  })
}
</script>

<template>
  <section class="control-group">
    <h3>Melodic shape</h3>
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Contour</span>
      <SegmentedControl
        label="Contour"
        :options="contourOptions()"
        :model-value="controls.contour"
        :readonly="readonly"
        @update:model-value="handleContour"
      />
    </div>
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Register</span>
      <SegmentedControl
        label="Register"
        :options="registerOptions()"
        :model-value="controls.register"
        :readonly="readonly"
        @update:model-value="handleRegister"
      />
    </div>
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Leapiness</span>
      <SegmentedControl
        label="Leapiness"
        :options="leapinessOptions()"
        :model-value="controls.leapiness"
        :readonly="readonly"
        @update:model-value="handleLeapiness"
      />
    </div>
  </section>
</template>
