<script setup lang="ts">
/**
 * The full below-score control sheet: the Foundation, Rhythm, Melodic shape, and Character groups
 * from the phrase-workspace handoff, then the "During a session" group, each delegated to its own
 * group component. Props-in/events-out only -- no session import. This component owns no control
 * state itself; it only forwards each group's typed events upward unchanged. The values it shows
 * are the ones it is given: during a session, what the phrase now sounding was generated with.
 */
import { computed } from 'vue'

import type { NoteDensityContext } from '@/domain/controls/generated-note-density'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { ProfileSelection } from '@/domain/controls/profile-selection'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import FoundationControls from './FoundationControls.vue'
import RhythmControls from './RhythmControls.vue'
import MelodicShapeControls from './MelodicShapeControls.vue'
import CharacterControls from './CharacterControls.vue'
import SessionOptionsControls from './SessionOptionsControls.vue'
import { controlSummaryText } from './control-options'
import type { SetControlPayload } from './set-control-event'

const props = defineProps<{
  controls: GenerationControls
  profileSelection: ProfileSelection
  readonly: boolean
  noteDensityContext: NoteDensityContext
  /** The page's `Rising tempo` choice, kept even while it is unavailable. */
  risingTempo: boolean
  /** Whether `Rising tempo` may be turned on: a controller is attached. */
  risingTempoAvailable: boolean
  /** The tempo the last session that ran rising tempo reached, for the tempo field's note. */
  lastSessionReachedTempo: number | null
  /** The page's `Tension across phrases` flag. */
  tensionAcrossPhrases: boolean
  /** The page's `Vary settings` flag. */
  varySettings: boolean
  /** Whether the "During a session" options are read-only. */
  sessionOptionsReadonly: boolean
  /** The preset status's live announcement: `polite`, or `off` while a session runs. */
  presetStatusLive: 'polite' | 'off'
  /** The player's own instrument, while it exists: the instrument control's fourth choice. */
  myInstrument: MyInstrument | null
  /** Whether `instrument-actions` is disabled: during a session and during Loading. */
  instrumentActionsDisabled: boolean
}>()

const emit = defineEmits<{
  'set-control': [payload: SetControlPayload]
  'select-instrument-profile': [id: GenerationControls['instrumentProfileId']]
  'select-musical-profile': [profile: ProfileSelection['musicalProfile']]
  'set-rising-tempo': [on: boolean]
  'set-tension-across-phrases': [on: boolean]
  'set-vary-settings': [on: boolean]
  'open-my-instrument': []
}>()

/** Intent: forward a group's set-control event upward unchanged. */
function forwardSetControl(payload: SetControlPayload): void {
  emit('set-control', payload)
}

/** Intent: forward the instrument-profile group's selection event upward unchanged. */
function forwardInstrumentProfile(id: GenerationControls['instrumentProfileId']): void {
  emit('select-instrument-profile', id)
}

/** Intent: forward the preset group's selection event upward unchanged. */
function forwardMusicalProfile(profile: ProfileSelection['musicalProfile']): void {
  emit('select-musical-profile', profile)
}

/** Intent: forward the player's `Rising tempo` choice upward unchanged. */
function forwardRisingTempo(on: boolean): void {
  emit('set-rising-tempo', on)
}

/** Intent: forward the player's `Tension across phrases` choice upward unchanged. */
function forwardTensionAcrossPhrases(on: boolean): void {
  emit('set-tension-across-phrases', on)
}

/** Intent: forward the player's `Vary settings` choice upward unchanged. */
function forwardVarySettings(on: boolean): void {
  emit('set-vary-settings', on)
}

/**
 * Intent: the muted control-summary line, restating the chosen tonal center, collection, profile
 * state, tension arc and leapiness at a glance, recomputed on every relevant control change.
 */
// @spec-link [[module_generation_control_catalog]]
const controlSummary = computed(() => controlSummaryText(props.controls, props.profileSelection))
</script>

<template>
  <section class="control-section" aria-labelledby="controls-heading">
    <h2 id="controls-heading" class="control-section-title">Shape the next phrase</h2>
    <p class="control-section-copy">
      Scroll here when you want a different musical direction. Your current phrase remains visible
      above.
    </p>
    <p class="control-summary">{{ controlSummary }}</p>
    <div class="control-group-row">
      <FoundationControls
        :controls="controls"
        :profile-selection="profileSelection"
        :readonly="readonly"
        :preset-status-live="presetStatusLive"
        :last-session-reached-tempo="lastSessionReachedTempo"
        :my-instrument="myInstrument"
        :instrument-actions-disabled="instrumentActionsDisabled"
        @open-my-instrument="emit('open-my-instrument')"
        @set-control="forwardSetControl"
        @select-instrument-profile="forwardInstrumentProfile"
        @select-musical-profile="forwardMusicalProfile"
      />
      <RhythmControls
        :controls="controls"
        :readonly="readonly"
        :note-density-context="noteDensityContext"
        @set-control="forwardSetControl"
      />
      <MelodicShapeControls
        :controls="controls"
        :readonly="readonly"
        @set-control="forwardSetControl"
      />
      <CharacterControls
        :controls="controls"
        :readonly="readonly"
        @set-control="forwardSetControl"
      />
      <SessionOptionsControls
        :rising-tempo="risingTempo"
        :rising-tempo-available="risingTempoAvailable"
        :tension-across-phrases="tensionAcrossPhrases"
        :vary-settings="varySettings"
        :readonly="sessionOptionsReadonly"
        @set-rising-tempo="forwardRisingTempo"
        @set-tension-across-phrases="forwardTensionAcrossPhrases"
        @set-vary-settings="forwardVarySettings"
      />
    </div>
  </section>
</template>
