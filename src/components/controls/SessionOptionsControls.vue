<script setup lang="ts">
/**
 * The "During a session" control group (`control-group-session`), last in the control section:
 * in v2.1 its one field, `Vary settings`, `Off` or `On`, with the note that says what it does,
 * which the radiogroup names with `aria-describedby`. It is a session option, not a setting a
 * phrase is generated from: choosing it regenerates nothing. Props-in/events-out only; the parent
 * makes it read-only during a generation and for a whole session.
 */
import { useId } from 'vue'

import SegmentedControl from './SegmentedControl.vue'
import type { SegmentedControlOption } from './segmented-control-option'

defineProps<{
  varySettings: boolean
  readonly: boolean
}>()

const emit = defineEmits<{
  'set-vary-settings': [on: boolean]
}>()

/** The two segments of an option of this group, `Off` first. */
const OFF_ON_OPTIONS: readonly SegmentedControlOption[] = Object.freeze([
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On' },
])

/** The `Vary settings` note, as the phrase-workspace handoff words it. */
const VARY_SETTINGS_NOTE =
  'Every 2 to 4 phrases, one setting moves one step. Never the instrument or the tempo. Your settings come back when the session ends.'

const varySettingsNoteId = useId()

/** Intent: report the player's `Vary settings` choice, refusing a value that is no segment. */
// @spec-link [[req_settings_mutation_flag]]
function handleVarySettings(value: string): void {
  if (value !== 'off' && value !== 'on') {
    throw new Error(`Vary settings has no "${value}" option.`)
  }
  emit('set-vary-settings', value === 'on')
}
</script>

<template>
  <!-- @spec-link [[req_settings_mutation_flag]] -->
  <section class="control-group control-group-session">
    <h3>During a session</h3>
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Vary settings</span>
      <SegmentedControl
        label="Vary settings"
        :options="OFF_ON_OPTIONS"
        :model-value="varySettings ? 'on' : 'off'"
        :readonly="readonly"
        :described-by="varySettingsNoteId"
        @update:model-value="handleVarySettings"
      />
      <p :id="varySettingsNoteId" class="field-note">{{ VARY_SETTINGS_NOTE }}</p>
    </div>
  </section>
</template>
