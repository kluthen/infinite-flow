<script setup lang="ts">
/**
 * The "Rhythm" control group: note density, syncopation, silence density, plus the calm inline
 * notice and always-rendered polite live region that appear when the current combination cannot
 * form a four-bar phrase. The suggestion shown is text only -- this component never applies it.
 *
 * Note density shows the density a phrase would be generated with, not always the chosen one:
 * below `bp-tablet-landscape` its `Sixteenth` segment is unavailable, with its reason in a
 * `field-note`, and a chosen `Sixteenth` shows as the checked `Eighth` while staying chosen. The
 * unsupported-rhythm notice judges that same density.
 */
import { computed, useId } from 'vue'

import {
  NOTE_DENSITIES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  validateControlValue,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import {
  resolveGeneratedNoteDensity,
  type NoteDensityContext,
} from '@/domain/controls/generated-note-density'
import {
  UNSUPPORTED_RHYTHM_SETTING_MESSAGE,
  describeRhythmSettingSuggestion,
  generatedRhythmSetting,
  isRhythmSettingBlocked,
  suggestNearestSupportedRhythmChange,
} from '@/domain/controls/unsupported-rhythm-settings'
import SegmentedControl from './SegmentedControl.vue'
import type { SetControlPayload } from './set-control-event'
import {
  noteDensityOptions,
  rhythmicVarietyOptions,
  silenceDensityOptions,
  syncopationOptions,
} from './control-options'

const props = defineProps<{
  controls: GenerationControls
  readonly: boolean
  noteDensityContext: NoteDensityContext
}>()

/** The reason `Sixteenth` is unavailable below `bp-tablet-landscape`, shown in its `field-note`. */
const SIXTEENTH_UNAVAILABLE_NOTE = "Sixteenth isn't available on small screens."

const sixteenthNoteId = useId()

/** Intent: whether the window is below `bp-tablet-landscape`, where `Sixteenth` can't be chosen. */
// @spec-link [[rule_sixteenth_unavailable_below_tablet_width]]
const sixteenthUnavailable = computed(() => props.noteDensityContext.belowTabletLandscape)

/** Intent: the note-density segments, with `Sixteenth` unavailable below `bp-tablet-landscape`. */
// @spec-link [[rule_sixteenth_unavailable_below_tablet_width]]
const densityOptions = computed(() =>
  noteDensityOptions().map((option) =>
    option.value === 'Sixteenth' && sixteenthUnavailable.value
      ? { ...option, disabled: true, describedBy: sixteenthNoteId }
      : option,
  ),
)

/** Intent: the checked density segment: the density a phrase would be generated with now. */
// @spec-link [[rule_generated_density_follows_window_width]]
const shownNoteDensity = computed(() =>
  resolveGeneratedNoteDensity(props.controls.noteDensity, props.noteDensityContext),
)

const emit = defineEmits<{
  'set-control': [payload: SetControlPayload]
}>()

/**
 * Intent: report a note-density change, re-validating against its catalog. Choosing the checked
 * segment while it stands in for a chosen `Sixteenth` changes nothing, so the chosen `Sixteenth`
 * is kept.
 */
// @spec-link [[rule_sixteenth_unavailable_below_tablet_width]]
function handleNoteDensity(value: string): void {
  if (value === shownNoteDensity.value && value !== props.controls.noteDensity) return
  emit('set-control', {
    key: 'noteDensity',
    value: validateControlValue(NOTE_DENSITIES, value, 'Note density'),
  })
}

/** Intent: report a rhythmic-variety change, re-validating against its catalog. */
function handleRhythmicVariety(value: string): void {
  emit('set-control', {
    key: 'rhythmicVariety',
    value: validateControlValue(RHYTHMIC_VARIETIES, value, 'Rhythmic variety'),
  })
}

/** Intent: report a syncopation change, re-validating against its catalog. */
function handleSyncopation(value: string): void {
  emit('set-control', {
    key: 'syncopation',
    value: validateControlValue(SYNCOPATIONS, value, 'Syncopation'),
  })
}

/** Intent: report a silence-density change, re-validating against its catalog. */
function handleSilenceDensity(value: string): void {
  emit('set-control', {
    key: 'silenceDensity',
    value: validateControlValue(SILENCE_DENSITIES, value, 'Silence density'),
  })
}

/** Intent: name the rhythm-setting subset of the current controls that the block rule reads. */
const rhythmSetting = computed(() => ({
  noteDensity: props.controls.noteDensity,
  rhythmicVariety: props.controls.rhythmicVariety,
  silenceDensity: props.controls.silenceDensity,
  syncopation: props.controls.syncopation,
}))

/** Intent: whether the chosen setting blocks generation, judged on the density generated with. */
// @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
const isBlocked = computed(() =>
  isRhythmSettingBlocked(rhythmSetting.value, props.noteDensityContext),
)

/** Intent: the notice and a suggestion computed from the setting a phrase would be generated from. */
// @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
const blockedMessage = computed(() => {
  if (!isBlocked.value) return null
  const suggestion = suggestNearestSupportedRhythmChange(
    generatedRhythmSetting(rhythmSetting.value, props.noteDensityContext),
  )
  return `${UNSUPPORTED_RHYTHM_SETTING_MESSAGE} ${describeRhythmSettingSuggestion(suggestion)}`
})

/** Intent: the persistent live-region text -- empty (not absent) whenever the setting is supported. */
const liveRegionText = computed(() => blockedMessage.value ?? '')
</script>

<template>
  <section class="control-group">
    <h3>Rhythm</h3>
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Note density</span>
      <SegmentedControl
        label="Note density"
        :options="densityOptions"
        :model-value="shownNoteDensity"
        :readonly="readonly"
        @update:model-value="handleNoteDensity"
      />
      <p v-if="sixteenthUnavailable" :id="sixteenthNoteId" class="field-note">
        {{ SIXTEENTH_UNAVAILABLE_NOTE }}
      </p>
    </div>
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Rhythmic variety</span>
      <SegmentedControl
        label="Rhythmic variety"
        :options="rhythmicVarietyOptions()"
        :model-value="controls.rhythmicVariety"
        :readonly="readonly"
        @update:model-value="handleRhythmicVariety"
      />
    </div>
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Syncopation</span>
      <SegmentedControl
        label="Syncopation"
        :options="syncopationOptions()"
        :model-value="controls.syncopation"
        :readonly="readonly"
        @update:model-value="handleSyncopation"
      />
    </div>
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <span class="field-label">Silence density</span>
      <SegmentedControl
        label="Silence density"
        :options="silenceDensityOptions()"
        :model-value="controls.silenceDensity"
        :readonly="readonly"
        @update:model-value="handleSilenceDensity"
      />
    </div>
    <p
      :class="{ 'inline-alert alert-notice': isBlocked }"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ liveRegionText }}
    </p>
  </section>
</template>
