<script setup lang="ts">
/**
 * The "Foundation" control group: tempo, tonal center, collection, instrument profile (with its
 * range summary), harmonic motion, and tension; the preset is chosen in the preset bar above the
 * groups. Props-in/events-out only; every value shown is exactly the `controls` prop this
 * component receives, and every change is reported upward rather than applied locally. Under the
 * tempo stepper, after a session that ran rising tempo, a quiet note states the tempo that session
 * reached. While my instrument exists, the instrument control offers it as a fourth choice,
 * labelled with its name, and states its range and windows, from its profile given as data, as for
 * a built-in profile. `instrument-actions` under it reads `Create my instrument` or `Edit my
 * instrument` and asks for the My instrument sheet. The selection and the presets are given for
 * the key and mode marks, which the group does not show yet.
 */
import { computed } from 'vue'

import {
  PITCH_CLASSES,
  TEMPO_VALUES,
  COLLECTIONS,
  HARMONIC_MOTIONS,
  TENSION_ARCS,
  INSTRUMENT_PROFILE_IDS,
  normalizeTempo,
  validateControlValue,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import { selectedInstrumentProfile } from '@/domain/generation/generation-intent'
import { MY_INSTRUMENT_ID, type InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import type { Preset, PresetSelection } from '@/domain/presets/preset-selection'
import SegmentedControl from './SegmentedControl.vue'
import TempoStepper from './TempoStepper.vue'
import type { SetControlPayload } from './set-control-event'
import {
  collectionOptions,
  harmonicMotionOptions,
  instrumentChoiceOptions,
  profileRangeSummaryText,
  tensionOptions,
  tonalCenterOptions,
} from './control-options'

const props = defineProps<{
  controls: GenerationControls
  /** The preset selection: a preset, or Custom naming its base. */
  selection: PresetSelection
  /** The presets the session knows, which name the selection: the built-ins, then the player's. */
  presets: readonly Preset[]
  readonly: boolean
  /** The tempo the last session that ran rising tempo reached, in BPM; null shows no note. */
  lastSessionReachedTempo: number | null
  /** The player's own instrument, while it exists: the instrument control's fourth choice. */
  myInstrument: MyInstrument | null
  /** Whether `instrument-actions` is disabled: during a session and during Loading. */
  instrumentActionsDisabled: boolean
}>()

const emit = defineEmits<{
  'set-control': [payload: SetControlPayload]
  'select-instrument-profile': [id: GenerationControls['instrumentProfileId']]
  /** `instrument-actions` was pressed: open the My instrument sheet. */
  'open-my-instrument': []
}>()

/**
 * Intent: the "reached tempo" note: a past fact in plain words, with no comparison, no target and
 * nothing about how the player played; none when no session that ran rising tempo is the last.
 */
// @spec-link [[rule_adaptive_tempo_resets_after_session]]
// @spec-link [[rule_no_grading_or_mismatch_signal]]
const reachedTempoNote = computed(() =>
  props.lastSessionReachedTempo === null
    ? null
    : `Last session reached ${props.lastSessionReachedTempo} BPM.`,
)

/** Intent: report a tempo change, re-validating against the tempo catalog before it leaves. */
function handleTempo(value: number): void {
  emit('set-control', { key: 'tempo', value: normalizeTempo(value) })
}

/** Intent: report a written-key tonal-center change, re-validating against the pitch-class catalog. */
function handleTonalCenter(value: string): void {
  emit('set-control', {
    key: 'tonalCenter',
    value: validateControlValue(PITCH_CLASSES, value, 'Written key'),
  })
}

/** Intent: report a collection change, re-validating against the collection catalog. */
function handleCollection(value: string): void {
  emit('set-control', {
    key: 'collection',
    value: validateControlValue(COLLECTIONS, value, 'Collection'),
  })
}

/** Intent: report a harmonic-motion change, re-validating against its catalog. */
function handleHarmonicMotion(value: string): void {
  emit('set-control', {
    key: 'harmonicMotion',
    value: validateControlValue(HARMONIC_MOTIONS, value, 'Harmonic motion'),
  })
}

/** Intent: report a tension change, re-validating against the tension-arc catalog. */
function handleTension(value: string): void {
  emit('set-control', {
    key: 'tension',
    value: validateControlValue(TENSION_ARCS, value, 'Tension arc'),
  })
}

/** The instrument control's choices: the built-in profiles, then my instrument while it exists. */
// @spec-link [[req_my_instrument]]
const instrumentOptions = computed(() => instrumentChoiceOptions(props.myInstrument?.name ?? null))

/** Every instrument id the control offers now. */
const offeredInstrumentIds = computed<readonly InstrumentProfileId[]>(() =>
  props.myInstrument === null
    ? INSTRUMENT_PROFILE_IDS
    : [...INSTRUMENT_PROFILE_IDS, MY_INSTRUMENT_ID],
)

/** Intent: report an instrument-profile switch by its validated stable identity, never a control value. */
// @spec-link [[req_my_instrument]]
function handleInstrumentProfile(value: string): void {
  emit(
    'select-instrument-profile',
    validateControlValue(offeredInstrumentIds.value, value, 'Instrument profile'),
  )
}

/** Intent: the selected instrument's profile: my instrument's own, given as data, or a built-in's. */
// @spec-link [[req_my_instrument]]
const activeInstrumentProfile = computed(() =>
  selectedInstrumentProfile(props.controls.instrumentProfileId, props.myInstrument),
)
/** Intent: the selected profile's active range plus its Low/Middle/High whole-phrase windows. */
const profileRangeSummary = computed(() => profileRangeSummaryText(activeInstrumentProfile.value))
</script>

<template>
  <section class="control-group">
    <h3>Foundation</h3>
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Tempo</span>
      <TempoStepper
        :model-value="controls.tempo"
        :values="TEMPO_VALUES"
        :readonly="readonly"
        @update:model-value="handleTempo"
      />
      <p v-if="reachedTempoNote !== null" class="field-note">{{ reachedTempoNote }}</p>
    </div>
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Written key</span>
      <SegmentedControl
        label="Written key"
        :options="tonalCenterOptions()"
        :model-value="controls.tonalCenter"
        :readonly="readonly"
        @update:model-value="handleTonalCenter"
      />
    </div>
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Collection</span>
      <SegmentedControl
        label="Collection"
        :options="collectionOptions()"
        :model-value="controls.collection"
        :readonly="readonly"
        @update:model-value="handleCollection"
      />
    </div>
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Instrument profile</span>
      <SegmentedControl
        label="Instrument profile"
        :options="instrumentOptions"
        :model-value="controls.instrumentProfileId"
        :readonly="readonly"
        @update:model-value="handleInstrumentProfile"
      />
      <p class="profile-range-summary">{{ profileRangeSummary }}</p>
      <div class="instrument-actions">
        <button
          class="btn"
          type="button"
          :disabled="instrumentActionsDisabled"
          @click="emit('open-my-instrument')"
        >
          {{ myInstrument === null ? 'Create my instrument' : 'Edit my instrument' }}
        </button>
      </div>
    </div>
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Harmonic motion</span>
      <SegmentedControl
        label="Harmonic motion"
        :options="harmonicMotionOptions()"
        :model-value="controls.harmonicMotion"
        :readonly="readonly"
        @update:model-value="handleHarmonicMotion"
      />
    </div>
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Tension</span>
      <SegmentedControl
        label="Tension"
        :options="tensionOptions()"
        :model-value="controls.tension"
        :readonly="readonly"
        @update:model-value="handleTension"
      />
    </div>
  </section>
</template>
