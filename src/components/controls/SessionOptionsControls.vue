<script setup lang="ts">
/**
 * The "During a session" control group (`control-group-session`), last in the control section:
 * `Rising tempo`, `Tension across phrases` then `Vary settings`, each `Off` or `On`, with the note
 * that says what it does, which the radiogroup names with `aria-describedby`. They are session
 * options, not settings a phrase is generated from: choosing one regenerates nothing. `Rising tempo` is unavailable while
 * the parent says no controller is attached: its `On` is disabled, `Off` shows checked, and a
 * second note gives the reason; the player's own choice is kept and shows again once it is
 * available. Props-in/events-out only; the parent makes the group read-only during a generation
 * and for a whole session, and says, during a session, what availability the session started with.
 */
import { computed, useId } from 'vue'

import SegmentedControl from './SegmentedControl.vue'
import type { SegmentedControlOption } from './segmented-control-option'

const props = defineProps<{
  risingTempo: boolean
  risingTempoAvailable: boolean
  tensionAcrossPhrases: boolean
  varySettings: boolean
  readonly: boolean
}>()

const emit = defineEmits<{
  'set-rising-tempo': [on: boolean]
  'set-tension-across-phrases': [on: boolean]
  'set-vary-settings': [on: boolean]
}>()

/** The two segments of an option of this group, `Off` first. */
const OFF_ON_OPTIONS: readonly SegmentedControlOption[] = Object.freeze([
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On' },
])

/** The `Rising tempo` note, as the phrase-workspace handoff words it. */
const RISING_TEMPO_NOTE =
  'Adds 5 BPM every 2 phrases, up to 240 BPM. The tempo goes back to your setting when the session ends.'

/** Why `Rising tempo` cannot be turned on, shown while no controller is attached. */
const RISING_TEMPO_UNAVAILABLE_NOTE = 'Needs a connected controller.'

/** The `Tension across phrases` note, as the phrase-workspace handoff words it. */
const TENSION_ACROSS_PHRASES_NOTE =
  'In groups of 4 phrases: your Tension, one step more, your Tension, one step less.'

/** The `Vary settings` note, as the phrase-workspace handoff words it. */
const VARY_SETTINGS_NOTE =
  'Every 2 to 4 phrases, one setting moves one step. Never the instrument or the tempo. Your settings come back when the session ends.'

const risingTempoNoteId = useId()
const risingTempoUnavailableNoteId = useId()
const tensionAcrossPhrasesNoteId = useId()
const varySettingsNoteId = useId()

/** Intent: map a segment's value to on/off, refusing a value that is no segment. */
function isOn(option: string, value: string): boolean {
  if (value !== 'off' && value !== 'on') {
    throw new Error(`${option} has no "${value}" option.`)
  }
  return value === 'on'
}

/** Intent: the `Rising tempo` segments, `On` disabled and naming the reason while unavailable. */
// @spec-link [[req_adaptive_tempo]]
const risingTempoOptions = computed((): readonly SegmentedControlOption[] =>
  props.risingTempoAvailable
    ? OFF_ON_OPTIONS
    : OFF_ON_OPTIONS.map((option) =>
        option.value === 'on'
          ? { ...option, disabled: true, describedBy: risingTempoUnavailableNoteId }
          : option,
      ),
)

/** Intent: the checked `Rising tempo` segment: `Off` while unavailable, else the player's choice. */
// @spec-link [[req_adaptive_tempo]]
const shownRisingTempo = computed(() =>
  props.risingTempoAvailable && props.risingTempo ? 'on' : 'off',
)

/**
 * Intent: report the player's `Rising tempo` choice. Choosing the `Off` that stands in for a kept
 * `On` while unavailable changes nothing, so the kept `On` shows again once a controller attaches.
 */
// @spec-link [[req_adaptive_tempo]]
function handleRisingTempo(value: string): void {
  const on = isOn('Rising tempo', value)
  if (value === shownRisingTempo.value && on !== props.risingTempo) return
  emit('set-rising-tempo', on)
}

/**
 * Intent: report the player's `Tension across phrases` choice, refusing a value that is no
 * segment.
 */
// @spec-link [[req_multi_phrase_tension_arc]]
function handleTensionAcrossPhrases(value: string): void {
  emit('set-tension-across-phrases', isOn('Tension across phrases', value))
}

/** Intent: report the player's `Vary settings` choice, refusing a value that is no segment. */
// @spec-link [[req_settings_mutation_flag]]
function handleVarySettings(value: string): void {
  emit('set-vary-settings', isOn('Vary settings', value))
}
</script>

<template>
  <!-- @spec-link [[req_settings_mutation_flag]] -->
  <section class="control-group control-group-session">
    <h3>During a session</h3>
    <!-- @spec-link [[req_adaptive_tempo]] -->
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Rising tempo</span>
      <SegmentedControl
        label="Rising tempo"
        :options="risingTempoOptions"
        :model-value="shownRisingTempo"
        :readonly="readonly"
        :described-by="risingTempoNoteId"
        @update:model-value="handleRisingTempo"
      />
      <p :id="risingTempoNoteId" class="field-note">{{ RISING_TEMPO_NOTE }}</p>
      <p v-if="!risingTempoAvailable" :id="risingTempoUnavailableNoteId" class="field-note">
        {{ RISING_TEMPO_UNAVAILABLE_NOTE }}
      </p>
    </div>
    <!-- @spec-link [[req_multi_phrase_tension_arc]] -->
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Tension across phrases</span>
      <SegmentedControl
        label="Tension across phrases"
        :options="OFF_ON_OPTIONS"
        :model-value="tensionAcrossPhrases ? 'on' : 'off'"
        :readonly="readonly"
        :described-by="tensionAcrossPhrasesNoteId"
        @update:model-value="handleTensionAcrossPhrases"
      />
      <p :id="tensionAcrossPhrasesNoteId" class="field-note">{{ TENSION_ACROSS_PHRASES_NOTE }}</p>
    </div>
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
