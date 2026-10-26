<script setup lang="ts">
/**
 * The full below-score control sheet: the preset bar first, then the Foundation, Rhythm, Melodic
 * shape, Character and Embellishments groups from the phrase-workspace handoff, then the "During a
 * session" group, each delegated to its own component. Props-in/events-out only -- no session import. This
 * component owns no control state itself; it only forwards each part's typed events upward
 * unchanged. The values it shows are the ones it is given: during a session, what the phrase now
 * sounding was generated with, the preset box and the figure levels included, while the preset bar's description line
 * and the key and mode marks keep what the session's start settings give.
 */
import { computed } from 'vue'

import type { NoteDensityContext } from '@/domain/controls/generated-note-density'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { FigureId, FigureLevel, FigureLevels } from '@/domain/figures/figure-levels'
import type { Preset, PresetId, PresetSelection } from '@/domain/presets/preset-selection'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import FoundationControls from './FoundationControls.vue'
import PresetBar from './PresetBar.vue'
import RhythmControls from './RhythmControls.vue'
import MelodicShapeControls from './MelodicShapeControls.vue'
import CharacterControls from './CharacterControls.vue'
import EmbellishmentControls from './EmbellishmentControls.vue'
import SessionOptionsControls from './SessionOptionsControls.vue'
import { controlSummaryText } from './control-options'
import type { RhythmChangeKind } from '@/domain/generation/request-rhythm-lock'
import type { AllowedGroups } from '@/session/settings-mutation-scales'
import type { PresetActionKind, PresetActionsRow, SessionStartSettings } from './preset-bar-model'
import type { SetControlPayload } from './set-control-event'

const props = defineProps<{
  controls: GenerationControls
  /** The seven figure levels the Embellishments group shows. */
  figureLevels: FigureLevels
  /** The preset selection: a preset, or Custom naming its base. */
  selection: PresetSelection
  /** The presets the session knows, which name the selection: the built-ins, then the player's. */
  presets: readonly Preset[]
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
  /** Whether `Vary settings` has a move: while false its `On` cannot be chosen. */
  varySettingsAvailable: boolean
  /** The groups `Vary settings` may move. */
  allowedGroups: AllowedGroups
  /** Session mode's rhythm lock. */
  rhythmLockOn: boolean
  /** The rhythm changes the lock allows, kept while it is off. */
  allowedRhythmChanges: readonly RhythmChangeKind[]
  /** Whether the "During a session" options are read-only. */
  sessionOptionsReadonly: boolean
  /** The session's start settings during a session; null with no session. */
  startSettings: SessionStartSettings | null
  /** The player's own instrument, while it exists: the instrument control's fourth choice. */
  myInstrument: MyInstrument | null
  /** Whether `instrument-actions` is disabled: during a session and during Loading. */
  instrumentActionsDisabled: boolean
  /** The buttons the preset bar's actions row holds. */
  presetActions: PresetActionsRow
  /** Whether every preset action is disabled: during a session. */
  presetActionsDisabled: boolean
}>()

const emit = defineEmits<{
  'set-control': [payload: SetControlPayload]
  'set-figure-level': [payload: { readonly figure: FigureId; readonly level: FigureLevel }]
  'select-instrument-profile': [id: GenerationControls['instrumentProfileId']]
  'select-preset': [id: PresetId]
  'set-rising-tempo': [on: boolean]
  'set-tension-across-phrases': [on: boolean]
  'set-vary-settings': [on: boolean]
  'set-allowed-groups': [groups: AllowedGroups]
  'set-rhythm-lock': [on: boolean]
  'set-allowed-rhythm-changes': [kinds: readonly RhythmChangeKind[]]
  'open-my-instrument': []
  'preset-action': [action: PresetActionKind]
}>()

/** Intent: forward a group's set-control event upward unchanged. */
function forwardSetControl(payload: SetControlPayload): void {
  emit('set-control', payload)
}

/** Intent: forward the Embellishments group's level change upward unchanged. */
// @spec-link [[module_figure_level_options]]
function forwardFigureLevel(payload: {
  readonly figure: FigureId
  readonly level: FigureLevel
}): void {
  emit('set-figure-level', payload)
}

/** Intent: forward the instrument-profile group's selection event upward unchanged. */
function forwardInstrumentProfile(id: GenerationControls['instrumentProfileId']): void {
  emit('select-instrument-profile', id)
}

/** Intent: forward the preset bar's choice upward unchanged. */
function forwardSelectPreset(id: PresetId): void {
  emit('select-preset', id)
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
 * Intent: the muted control-summary line, restating the chosen tonal center, collection, preset
 * label (Custom naming its base), tension arc and leapiness at a glance, recomputed on every relevant control change.
 */
// @spec-link [[module_generation_control_catalog]]
// @spec-link [[rule_custom_names_its_base]]
const controlSummary = computed(() =>
  controlSummaryText(props.controls, props.selection, props.presets),
)
</script>

<template>
  <section class="control-section" aria-labelledby="controls-heading">
    <h2 id="controls-heading" class="control-section-title">Shape the next phrase</h2>
    <p class="control-section-copy">
      Scroll here when you want a different musical direction. Your current phrase remains visible
      above.
    </p>
    <p class="control-summary">{{ controlSummary }}</p>
    <!-- @spec-link [[module_preset_bar_model]] -->
    <PresetBar
      :presets="presets"
      :selection="selection"
      :description-selection="startSettings?.selection ?? selection"
      :readonly="readonly"
      :actions="presetActions"
      :actions-disabled="presetActionsDisabled"
      @select-preset="forwardSelectPreset"
      @preset-action="emit('preset-action', $event)"
    />
    <div class="control-group-row">
      <FoundationControls
        :controls="controls"
        :selection="selection"
        :presets="presets"
        :readonly="readonly"
        :last-session-reached-tempo="lastSessionReachedTempo"
        :my-instrument="myInstrument"
        :instrument-actions-disabled="instrumentActionsDisabled"
        :start-settings="startSettings"
        @open-my-instrument="emit('open-my-instrument')"
        @set-control="forwardSetControl"
        @select-instrument-profile="forwardInstrumentProfile"
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
      <EmbellishmentControls
        :figure-levels="figureLevels"
        :readonly="readonly"
        @set-figure-level="forwardFigureLevel"
      />
      <SessionOptionsControls
        :rhythm-lock-on="rhythmLockOn"
        :allowed-rhythm-changes="allowedRhythmChanges"
        :rising-tempo="risingTempo"
        :rising-tempo-available="risingTempoAvailable"
        :tension-across-phrases="tensionAcrossPhrases"
        :vary-settings="varySettings"
        :vary-settings-available="varySettingsAvailable"
        :allowed-groups="allowedGroups"
        :readonly="sessionOptionsReadonly"
        @set-rhythm-lock="emit('set-rhythm-lock', $event)"
        @set-allowed-rhythm-changes="emit('set-allowed-rhythm-changes', $event)"
        @set-rising-tempo="forwardRisingTempo"
        @set-tension-across-phrases="forwardTensionAcrossPhrases"
        @set-vary-settings="forwardVarySettings"
        @set-allowed-groups="emit('set-allowed-groups', $event)"
      />
    </div>
  </section>
</template>
