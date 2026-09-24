<script setup lang="ts">
/**
 * The "Character" control group: arpeggio chaos, presented behind the `character-disclosure`
 * wrapper the handoff defines for this advanced-only group. Props-in/events-out only.
 */
import {
  ARPEGGIO_CHAOS_VALUES,
  validateControlValue,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import SegmentedControl from './SegmentedControl.vue'
import type { SetControlPayload } from './set-control-event'
import { arpeggioChaosOptions } from './control-options'

defineProps<{
  controls: GenerationControls
  readonly: boolean
}>()

const emit = defineEmits<{
  'set-control': [payload: SetControlPayload]
}>()

/** Intent: report an arpeggio-chaos change, re-validating against its catalog. */
function handleArpeggioChaos(value: string): void {
  emit('set-control', {
    key: 'arpeggioChaos',
    value: validateControlValue(ARPEGGIO_CHAOS_VALUES, value, 'Arpeggio chaos'),
  })
}
</script>

<template>
  <section class="control-group">
    <h3>Character</h3>
    <div class="character-disclosure">
      <div class="field-group" :class="{ 'is-readonly': readonly }">
        <span class="field-label">Arpeggio chaos</span>
        <SegmentedControl
          label="Arpeggio chaos"
          :options="arpeggioChaosOptions()"
          :model-value="controls.arpeggioChaos"
          :readonly="readonly"
          @update:model-value="handleArpeggioChaos"
        />
      </div>
    </div>
  </section>
</template>
