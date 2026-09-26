<script setup lang="ts">
/**
 * The "Foundation" control group: tempo, tonal center, collection, instrument profile (with its
 * range summary), musical profile preset (with its status region), harmonic motion, and tension.
 * Props-in/events-out only; every value shown is exactly the `controls`/`profileSelection` props
 * this component receives, and every change is reported upward rather than applied locally.
 */
import { computed } from 'vue'

import {
  MUSICAL_PROFILES,
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
import type { ProfileSelection } from '@/domain/controls/profile-selection'
import { getInstrumentProfile } from '@/domain/generation/generation-intent'
import { buildRegisterIntent } from '@/domain/profile/register-intent'
import type { RegisterId } from '@/domain/profile/register-id'
import SegmentedControl from './SegmentedControl.vue'
import TempoStepper from './TempoStepper.vue'
import type { SetControlPayload } from './set-control-event'
import {
  collectionOptions,
  harmonicMotionOptions,
  instrumentProfileOptions,
  musicalProfileOptions,
  tensionOptions,
  tonalCenterOptions,
} from './control-options'

const props = defineProps<{
  controls: GenerationControls
  profileSelection: ProfileSelection
  readonly: boolean
}>()

const emit = defineEmits<{
  'set-control': [payload: SetControlPayload]
  'select-instrument-profile': [id: GenerationControls['instrumentProfileId']]
  'select-musical-profile': [profile: (typeof MUSICAL_PROFILES)[number]]
}>()

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

/** Intent: report an instrument-profile switch by its validated stable identity, never a control value. */
function handleInstrumentProfile(value: string): void {
  emit(
    'select-instrument-profile',
    validateControlValue(INSTRUMENT_PROFILE_IDS, value, 'Instrument profile'),
  )
}

/**
 * Intent: report a preset choice by its validated musical-profile identity. Applying the chosen
 * preset's complete bundle -- and clearing it back to "custom" on any later manual edit -- is
 * session policy the parent owns; this only reports which preset the player picked.
 */
// @spec-link [[rule_selectable_generative_profiles]]
// @spec-link [[rule_profile_presets_apply_defined_controls]]
function handleMusicalProfile(value: string): void {
  emit(
    'select-musical-profile',
    validateControlValue(MUSICAL_PROFILES, value, 'Musical profile preset'),
  )
}

const presetModelValue = computed<string | null>(() =>
  props.profileSelection.isCustom ? null : props.profileSelection.musicalProfile,
)

/** Intent: the polite, always-visible preset status copy for the currently applied/custom state. */
const presetStatusText = computed(() => {
  const { musicalProfile, isCustom } = props.profileSelection
  if (isCustom) {
    return `Custom configuration - ${musicalProfile} grammar retained. Choosing Neutral or Jazz replaces all six preset-controlled values.`
  }
  return `${musicalProfile} preset applied. All six preset-controlled values were replaced.`
})

const activeInstrumentProfile = computed(() =>
  getInstrumentProfile(props.controls.instrumentProfileId),
)
const registerCandidates = computed(
  () => buildRegisterIntent(activeInstrumentProfile.value, props.controls.register).candidates,
)

/** Intent: resolve one canonical register-window candidate by identity, crashing if it is absent. */
function candidateWindow(id: RegisterId): { readonly minMidi: number; readonly maxMidi: number } {
  const found = registerCandidates.value.find((candidate) => candidate.id === id)
  if (!found) {
    throw new Error(`No "${id}" register-window candidate was derived for the active profile.`)
  }
  return found.window
}

/** Intent: the selected profile's active range plus its Low/Middle/High whole-phrase windows. */
const profileRangeSummaryText = computed(() => {
  const range = activeInstrumentProfile.value.concertRange
  const low = candidateWindow('Low')
  const middle = candidateWindow('Middle')
  const high = candidateWindow('High')
  return `Active range ${range.minMidi}-${range.maxMidi}. Whole-phrase windows: Low ${low.minMidi}-${low.maxMidi}, Middle ${middle.minMidi}-${middle.maxMidi}, High ${high.minMidi}-${high.maxMidi}.`
})
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
        :options="instrumentProfileOptions()"
        :model-value="controls.instrumentProfileId"
        :readonly="readonly"
        @update:model-value="handleInstrumentProfile"
      />
      <p class="profile-range-summary">{{ profileRangeSummaryText }}</p>
    </div>
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Musical profile preset</span>
      <SegmentedControl
        label="Musical profile preset"
        :options="musicalProfileOptions()"
        :model-value="presetModelValue"
        :readonly="readonly"
        @update:model-value="handleMusicalProfile"
      />
      <p
        class="preset-status"
        :class="{ 'is-custom': profileSelection.isCustom }"
        role="status"
        aria-live="polite"
      >
        {{ presetStatusText }}
      </p>
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
