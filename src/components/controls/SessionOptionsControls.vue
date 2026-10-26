<script setup lang="ts">
/**
 * The "During a session" control group (`control-group-session`), last in the control section:
 * `Rhythm lock` (with its dependent `Allowed rhythm changes`), `Rising tempo`, `Tension across
 * phrases` then `Vary settings` (with its dependent `What may vary`), each `Off` or `On`, with the
 * note that says what it does, which the radiogroup names with `aria-describedby`. They are session
 * options, not settings a phrase is generated from: choosing one regenerates nothing. `Rising
 * tempo` is unavailable while the parent says no controller is attached, and `Vary settings` while
 * it says no move is possible: `On` is disabled, `Off` shows checked, and a second note gives the
 * reason; the player's own choice is kept and shows again once it is available. Props-in/events-out
 * only; the parent makes the group read-only during a generation and for a whole session, and
 * says, during a session, what availability the session started with.
 */
import { computed, useId } from 'vue'

import type { RhythmChangeKind } from '@/domain/generation/request-rhythm-lock'
import type { AllowedGroups } from '@/session/settings-mutation-scales'
import RhythmLockField from './RhythmLockField.vue'
import SegmentedControl from './SegmentedControl.vue'
import VarySettingsField from './VarySettingsField.vue'
import { chosenOffOn, isOn, OFF_ON_OPTIONS, offOnOptions, shownOffOn } from './off-on-segments'

const props = defineProps<{
  rhythmLockOn: boolean
  allowedRhythmChanges: readonly RhythmChangeKind[]
  risingTempo: boolean
  risingTempoAvailable: boolean
  tensionAcrossPhrases: boolean
  varySettings: boolean
  varySettingsAvailable: boolean
  allowedGroups: AllowedGroups
  readonly: boolean
}>()

const emit = defineEmits<{
  'set-rhythm-lock': [on: boolean]
  'set-allowed-rhythm-changes': [kinds: readonly RhythmChangeKind[]]
  'set-rising-tempo': [on: boolean]
  'set-tension-across-phrases': [on: boolean]
  'set-vary-settings': [on: boolean]
  'set-allowed-groups': [groups: AllowedGroups]
}>()

/** The `Rising tempo` note, as the phrase-workspace handoff words it. */
const RISING_TEMPO_NOTE =
  'Adds 5 BPM every 2 phrases, up to 240 BPM. The tempo goes back to your setting when the session ends.'

/** Why `Rising tempo` cannot be turned on, shown while no controller is attached. */
const RISING_TEMPO_UNAVAILABLE_NOTE = 'Needs a connected controller.'

/** The `Tension across phrases` note, as the phrase-workspace handoff words it. */
const TENSION_ACROSS_PHRASES_NOTE =
  'In groups of 4 phrases: your Tension, one step more, your Tension, one step less.'

const risingTempoNoteId = useId()
const risingTempoUnavailableNoteId = useId()
const tensionAcrossPhrasesNoteId = useId()

/** Intent: the `Rising tempo` segments, `On` disabled and naming the reason while unavailable. */
// @spec-link [[req_adaptive_tempo]]
const risingTempoOptions = computed(() =>
  offOnOptions(props.risingTempoAvailable, risingTempoUnavailableNoteId),
)

/** Intent: the checked `Rising tempo` segment: `Off` while unavailable, else the player's choice. */
// @spec-link [[req_adaptive_tempo]]
const shownRisingTempo = computed(() => shownOffOn(props.risingTempo, props.risingTempoAvailable))

/**
 * Intent: report the player's `Rising tempo` choice. Choosing the `Off` that stands in for a kept
 * `On` while unavailable changes nothing, so the kept `On` shows again once a controller attaches.
 */
// @spec-link [[req_adaptive_tempo]]
function handleRisingTempo(value: string): void {
  const on = chosenOffOn('Rising tempo', value, props.risingTempo, props.risingTempoAvailable)
  if (on !== null) emit('set-rising-tempo', on)
}

/**
 * Intent: report the player's `Tension across phrases` choice, refusing a value that is no
 * segment.
 */
// @spec-link [[req_multi_phrase_tension_arc]]
function handleTensionAcrossPhrases(value: string): void {
  emit('set-tension-across-phrases', isOn('Tension across phrases', value))
}
</script>

<template>
  <!-- @spec-link [[req_settings_mutation_flag]] -->
  <section class="control-group control-group-session">
    <h3>During a session</h3>
    <!-- @spec-link [[req_rhythm_lock]] -->
    <RhythmLockField
      :rhythm-lock-on="rhythmLockOn"
      :allowed-rhythm-changes="allowedRhythmChanges"
      :readonly="readonly"
      @set-rhythm-lock="emit('set-rhythm-lock', $event)"
      @set-allowed-rhythm-changes="emit('set-allowed-rhythm-changes', $event)"
    />
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
    <!-- @spec-link [[rule_vary_settings_allowed_groups]] -->
    <VarySettingsField
      :vary-settings="varySettings"
      :vary-settings-available="varySettingsAvailable"
      :allowed-groups="allowedGroups"
      :rhythm-lock-on="rhythmLockOn"
      :readonly="readonly"
      @set-vary-settings="emit('set-vary-settings', $event)"
      @set-allowed-groups="emit('set-allowed-groups', $event)"
    />
  </section>
</template>
