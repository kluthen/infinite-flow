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
  /** The page's `Vary settings` flag. */
  varySettings: boolean
  /** Whether the "During a session" options are read-only. */
  sessionOptionsReadonly: boolean
  /** The preset status's live announcement: `polite`, or `off` while a session runs. */
  presetStatusLive: 'polite' | 'off'
}>()

const emit = defineEmits<{
  'set-control': [payload: SetControlPayload]
  'select-instrument-profile': [id: GenerationControls['instrumentProfileId']]
  'select-musical-profile': [profile: ProfileSelection['musicalProfile']]
  'set-vary-settings': [on: boolean]
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

/** Intent: forward the player's `Vary settings` choice upward unchanged. */
function forwardVarySettings(on: boolean): void {
  emit('set-vary-settings', on)
}

/** Intent: the muted control-summary line per D25, recomputed on every relevant control change. */
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
        :vary-settings="varySettings"
        :readonly="sessionOptionsReadonly"
        @set-vary-settings="forwardVarySettings"
      />
    </div>
  </section>
</template>
