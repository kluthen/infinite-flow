<script setup lang="ts">
/**
 * Jam's controls, "Shape your Jam", in `control-section`'s place while Jam mode shows (master spec
 * C5.16; the phrase-workspace handoff, Jam's controls): three groups. **Foundation**: Jam's tempo
 * (60 to 180 BPM in steps of 10, with `tap-tempo` after the stepper in the Tempo field and its
 * note under both, ./TapTempo.vue), written key and collection, the shared instrument (its range
 * summary and `instrument-actions` as in session mode), Jam's harmonic motion and tension, and one
 * Embellishments level given to all seven figures. **Following your doodle**: the drift, and Jam's
 * own rhythm lock with its allowed rhythm changes under it. **From your doodle**: what the app read
 * from the doodle (./DoodleReadings.vue). No preset bar, no key and mode marks, no "During a
 * session" options; arpeggio chaos is not shown, a Jam holding it at Varied. Props-in/events-out
 * only: every change of Jam's own settings is reported as a change of them, the instrument as a
 * selection of session mode's shared one, `tap-tempo`'s press and end of listening as they come;
 * the parent makes them read-only during Loading and a session, `tap-tempo` then disabled. Part of
 * Jam's code (src/jam/), loaded on demand.
 */
import { computed, useId } from 'vue'

import RhythmLockField from '@/components/controls/RhythmLockField.vue'
import SegmentedControl from '@/components/controls/SegmentedControl.vue'
import TempoStepper from '@/components/controls/TempoStepper.vue'
import {
  collectionOptions,
  harmonicMotionOptions,
  instrumentChoiceOptions,
  profileRangeSummaryText,
  tensionOptions,
  tonalCenterOptions,
} from '@/components/controls/control-options'
import { FIGURE_LEVEL_FIELDS } from '@/components/controls/figure-level-options'
import type { SegmentedControlOption } from '@/components/controls/segmented-control-option'
import {
  COLLECTIONS,
  HARMONIC_MOTIONS,
  INSTRUMENT_PROFILE_IDS,
  PITCH_CLASSES,
  TENSION_ARCS,
  validateControlValue,
} from '@/domain/controls/generation-controls'
import { FIGURE_LEVEL_IDS } from '@/domain/figures/figure-levels'
import { selectedInstrumentProfile } from '@/domain/generation/generation-intent'
import type { RhythmChangeKind } from '@/domain/generation/request-rhythm-lock'
import { MY_INSTRUMENT_ID, type InstrumentProfileId } from '@/domain/profile/instrument-profiles'

import DoodleReadings from './DoodleReadings.vue'
import TapTempo from './TapTempo.vue'
import { JAM_TEMPO_VALUES, type JamSettingsChange } from './jam-settings'
import type { JamControlsProps } from './jam-view-types'
import { JAM_DRIFTS } from './steering-block-builder'

// @spec-link [[req_jam_settings]]
const props = defineProps<JamControlsProps>()

const emit = defineEmits<{
  /** A change of Jam's own settings. */
  change: [change: JamSettingsChange]
  /** The shared instrument chosen: session mode's selection. */
  'select-instrument-profile': [id: InstrumentProfileId]
  /** `instrument-actions` was pressed: open the My instrument sheet. */
  'open-my-instrument': []
  /** `tap-tempo` was pressed: a tap. */
  'tap-tempo-press': []
  /** While tap tempo listens, anything else was used or the page hidden or left: it ends. */
  'tap-tempo-end': []
}>()

/** The section's copy, as the phrase-workspace handoff words it. */
const SECTION_COPY =
  "Set these before you start. Jam keeps its own key, mode and tempo; the rhythm and the melody's shape come from your doodle."
const EMBELLISHMENTS_NOTE =
  'How often the app decorates the melody with passing tones, neighbor tones and the other figures. A preference, never a promise.'
const DRIFT_NOTE =
  'How far the phrases wander from your doodle: Close follows its rhythm and its moves, Near its ups and downs, Free only starts where it ended.'
const RHYTHM_LOCK_NOTE =
  'Every phrase keeps one rhythm, the one nearest your doodle, so your eyes can stay on the notes.'
const READINGS_INTRO = 'The app reads these from your doodle, so the phrases move like it.'

/** Embellishments' four levels, Off to Very often, as every figure's control offers them. */
const EMBELLISHMENT_OPTIONS = FIGURE_LEVEL_FIELDS[0]!.options

/** Drift's three positions, closest first. */
const DRIFT_OPTIONS: readonly SegmentedControlOption[] = JAM_DRIFTS.map((drift) => ({
  value: drift,
  label: drift,
}))

const embellishmentsNoteId = useId()
const driftNoteId = useId()

/** Intent: an option's label by its value, as its control shows it; one it lacks is a defect. */
function labelOf(options: readonly SegmentedControlOption[], value: string): string {
  const found = options.find((option) => option.value === value)
  if (found === undefined) throw new Error(`Jam's controls: no option for "${value}".`)
  return found.label
}

/**
 * Intent: the control-summary line, "{key} {mode} · Drift: {drift} · Rhythm lock: {On or Off}",
 * Jam's key and mode as their controls show them.
 */
// @spec-link [[req_jam_settings]]
const controlSummary = computed(() => {
  const { settings } = props
  const key = labelOf(tonalCenterOptions(), settings.tonalCenter)
  const mode = labelOf(collectionOptions(), settings.collection)
  const lock = settings.rhythmLockOn ? 'On' : 'Off'
  return `${key} ${mode} · Drift: ${settings.drift} · Rhythm lock: ${lock}`
})

/** Intent: report a change of Jam's tempo, one of its 60 to 180 BPM steps. */
// @spec-link [[rule_jam_tempo_range]]
function handleTempo(value: number): void {
  if (!JAM_TEMPO_VALUES.includes(value)) throw new Error(`Jam's tempo has no step ${value}.`)
  emit('change', { tempo: value })
}

/** Intent: report a change of Jam's written key, re-validated against the pitch-class catalog. */
function handleTonalCenter(value: string): void {
  emit('change', { tonalCenter: validateControlValue(PITCH_CLASSES, value, 'Written key') })
}

/** Intent: report a change of Jam's collection, re-validated against the collection catalog. */
function handleCollection(value: string): void {
  emit('change', { collection: validateControlValue(COLLECTIONS, value, 'Collection') })
}

/** Intent: report a change of Jam's harmonic motion, re-validated against its catalog. */
function handleHarmonicMotion(value: string): void {
  emit('change', {
    harmonicMotion: validateControlValue(HARMONIC_MOTIONS, value, 'Harmonic motion'),
  })
}

/** Intent: report a change of Jam's tension, re-validated against the tension-arc catalog. */
function handleTension(value: string): void {
  emit('change', { tension: validateControlValue(TENSION_ARCS, value, 'Tension arc') })
}

/** Intent: report Jam's one Embellishments level, given to all seven figures alike. */
// @spec-link [[rule_jam_embellishments_one_level]]
function handleEmbellishments(value: string): void {
  emit('change', {
    embellishments: validateControlValue(FIGURE_LEVEL_IDS, value, 'Embellishments'),
  })
}

/** Intent: report a change of Jam's drift, one of its three positions. */
// @spec-link [[rule_jam_drift_positions]]
function handleDrift(value: string): void {
  emit('change', { drift: validateControlValue(JAM_DRIFTS, value, 'Drift') })
}

/** The instrument control's choices: the built-in profiles, then my instrument while it exists. */
const instrumentOptions = computed(() => instrumentChoiceOptions(props.myInstrument?.name ?? null))

/**
 * Intent: report the shared instrument chosen in Jam mode, by its validated identity: session
 * mode's own selection, which reaches session mode's phrase on returning.
 */
// @spec-link [[rule_shared_setting_changed_in_jam_mode]]
function handleInstrumentProfile(value: string): void {
  const offered: readonly InstrumentProfileId[] =
    props.myInstrument === null
      ? INSTRUMENT_PROFILE_IDS
      : [...INSTRUMENT_PROFILE_IDS, MY_INSTRUMENT_ID]
  emit('select-instrument-profile', validateControlValue(offered, value, 'Instrument profile'))
}

/** Intent: the selected profile's active range and its Low, Middle and High windows. */
const profileRangeSummary = computed(() =>
  profileRangeSummaryText(selectedInstrumentProfile(props.instrumentProfileId, props.myInstrument)),
)
</script>

<template>
  <!-- @spec-link [[req_jam_settings]] -->
  <section class="control-section" aria-labelledby="jam-controls-heading">
    <h2 id="jam-controls-heading" class="control-section-title">Shape your Jam</h2>
    <p class="control-section-copy">{{ SECTION_COPY }}</p>
    <p class="control-summary">{{ controlSummary }}</p>
    <div class="control-group-row">
      <section class="control-group">
        <h3>Foundation</h3>
        <div class="field-group" :class="{ 'is-readonly': readonly }">
          <span class="field-label">Tempo</span>
          <TempoStepper
            :model-value="settings.tempo"
            :values="JAM_TEMPO_VALUES"
            :readonly="readonly"
            @update:model-value="handleTempo"
          />
          <!-- @spec-link [[rule_jam_tap_in_listening]] -->
          <TapTempo
            :listening="tapTempo.listening"
            :note="tapTempo.note"
            :controller-connected="tapTempo.controllerConnected"
            :disabled="readonly"
            @press="emit('tap-tempo-press')"
            @end="emit('tap-tempo-end')"
          />
        </div>
        <div class="field-group" :class="{ 'is-readonly': readonly }">
          <span class="field-label">Written key</span>
          <SegmentedControl
            label="Written key"
            :options="tonalCenterOptions()"
            :model-value="settings.tonalCenter"
            :readonly="readonly"
            @update:model-value="handleTonalCenter"
          />
        </div>
        <div class="field-group" :class="{ 'is-readonly': readonly }">
          <span class="field-label">Collection</span>
          <SegmentedControl
            label="Collection"
            :options="collectionOptions()"
            :model-value="settings.collection"
            :readonly="readonly"
            @update:model-value="handleCollection"
          />
        </div>
        <div class="field-group" :class="{ 'is-readonly': readonly }">
          <span class="field-label">Instrument profile</span>
          <SegmentedControl
            label="Instrument profile"
            :options="instrumentOptions"
            :model-value="instrumentProfileId"
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
            :model-value="settings.harmonicMotion"
            :readonly="readonly"
            @update:model-value="handleHarmonicMotion"
          />
        </div>
        <div class="field-group" :class="{ 'is-readonly': readonly }">
          <span class="field-label">Tension</span>
          <SegmentedControl
            label="Tension"
            :options="tensionOptions()"
            :model-value="settings.tension"
            :readonly="readonly"
            @update:model-value="handleTension"
          />
        </div>
        <!-- @spec-link [[rule_jam_embellishments_one_level]] -->
        <div class="field-group" :class="{ 'is-readonly': readonly }">
          <span class="field-label">Embellishments</span>
          <SegmentedControl
            label="Embellishments"
            :options="EMBELLISHMENT_OPTIONS"
            :model-value="settings.embellishments"
            :readonly="readonly"
            :described-by="embellishmentsNoteId"
            @update:model-value="handleEmbellishments"
          />
          <p :id="embellishmentsNoteId" class="field-note">{{ EMBELLISHMENTS_NOTE }}</p>
        </div>
      </section>
      <section class="control-group">
        <h3>Following your doodle</h3>
        <!-- @spec-link [[rule_jam_drift_positions]] -->
        <div class="field-group" :class="{ 'is-readonly': readonly }">
          <span class="field-label">Drift</span>
          <SegmentedControl
            label="Drift"
            :options="DRIFT_OPTIONS"
            :model-value="settings.drift"
            :readonly="readonly"
            :described-by="driftNoteId"
            @update:model-value="handleDrift"
          />
          <p :id="driftNoteId" class="field-note">{{ DRIFT_NOTE }}</p>
        </div>
        <RhythmLockField
          :rhythm-lock-on="settings.rhythmLockOn"
          :allowed-rhythm-changes="settings.allowedRhythmChanges"
          :readonly="readonly"
          :note="RHYTHM_LOCK_NOTE"
          @set-rhythm-lock="(on: boolean) => emit('change', { rhythmLockOn: on })"
          @set-allowed-rhythm-changes="
            (kinds: readonly RhythmChangeKind[]) => emit('change', { allowedRhythmChanges: kinds })
          "
        />
      </section>
      <section class="control-group">
        <h3>From your doodle</h3>
        <p class="control-group-intro">{{ READINGS_INTRO }}</p>
        <DoodleReadings :readings="readings" :below-tablet-landscape="belowTabletLandscape" />
      </section>
    </div>
  </section>
</template>
