<script setup lang="ts">
/**
 * The preset bar, the first row of the control section: the "Preset" box, a native select listing
 * the built-ins in Practice and Styles and the player's own under Your presets, showing Custom
 * through a first option that is its value but never in its list, and the description line under
 * it. The box follows `selection`; the description is worked out from `descriptionSelection`, the
 * session's start selection during a session, so it keeps its text. Props-in/events-out only:
 * choosing reports the preset id upward, and the box always shows its props again afterwards, so a
 * choice the parent refuses never sticks. Read-only (Loading, a session), it stays focusable and a
 * keyboard change is refused and reverted at once. Nothing is announced and focus never moves.
 */
import { computed, nextTick, ref, useId, watch } from 'vue'

import { validateControlValue } from '@/domain/controls/generation-controls'
import type { Preset, PresetId, PresetSelection } from '@/domain/presets/preset-selection'
import {
  presetBarCustomOption,
  presetBarFullText,
  presetBarGroups,
  presetDescription,
} from './preset-bar-model'

const props = defineProps<{
  /** The presets the session knows: the built-ins, then the player's. */
  presets: readonly Preset[]
  /** The selection the box shows, which may turn Custom during a session. */
  selection: PresetSelection
  /** The selection the description line is worked out from. */
  descriptionSelection: PresetSelection
  readonly: boolean
}>()

const emit = defineEmits<{
  'select-preset': [id: PresetId]
}>()

const selectId = useId()
const descriptionId = useId()
const select = ref<HTMLSelectElement | null>(null)

/** The box's groups and options. */
const groups = computed(() => presetBarGroups(props.presets))

/** Every preset id the box lists, against which a chosen value is checked. */
const listedIds = computed<readonly PresetId[]>(() =>
  groups.value.flatMap((group) => group.options.map((option) => option.value)),
)

/** Custom's option label, or null outside Custom. */
const customLabel = computed(() => presetBarCustomOption(props.selection, props.presets))

/** The box's full text, for its title. */
const fullText = computed(() => presetBarFullText(props.selection, props.presets))

/** The DOM value the props give the box: the selected preset's id, or Custom's empty value. */
const shownValue = computed(() =>
  props.selection.kind === 'preset' ? props.selection.presetId : '',
)

/** Intent: the description line, from the description selection, never the one the box shows. */
// @spec-link [[module_preset_bar_model]]
// @spec-link [[rule_vary_settings_marks_custom]]
// @spec-link [[rule_automatic_change_updates_controls_quietly]]
const description = computed(() => presetDescription(props.descriptionSelection, props.presets))

/** Intent: put the box's DOM value back to what the props say. */
function showProps(): void {
  if (select.value !== null) select.value.value = shownValue.value
}

// Every change of the shown value lands in the DOM once rendered, whatever the options did.
watch(shownValue, showProps, { flush: 'post' })

/**
 * Intent: report the player's choice by its validated preset id. Read-only, the change is refused
 * and reverted at once. Either way the box shows its props again after the parent has answered,
 * so it never keeps a value the parent did not take. Applying the preset is the parent's.
 */
// @spec-link [[rule_choosing_preset_sets_its_settings]]
// @spec-link [[rule_selectable_generative_profiles]]
// @spec-link [[module_generative_profile_selection]]
function handleChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  if (props.readonly) {
    showProps()
    return
  }
  emit('select-preset', validateControlValue(listedIds.value, target.value, 'Preset'))
  void nextTick(showProps)
}
</script>

<template>
  <div class="preset-bar">
    <div class="field-group" :class="{ 'is-readonly': readonly }">
      <label class="field-label" :for="selectId">Preset</label>
      <!-- @spec-link [[rule_readonly_controls_keep_contrast]] -->
      <select
        :id="selectId"
        ref="select"
        class="preset-select"
        :class="{ 'is-readonly': readonly }"
        :aria-readonly="readonly ? 'true' : undefined"
        :title="fullText"
        :aria-describedby="descriptionId"
        @change="handleChange"
      >
        <option v-if="customLabel !== null" value="" selected disabled hidden>
          {{ customLabel }}
        </option>
        <optgroup v-for="group in groups" :key="group.label" :label="group.label">
          <option
            v-for="option in group.options"
            :key="option.value"
            :value="option.value"
            :selected="option.value === shownValue"
          >
            {{ option.label }}
          </option>
        </optgroup>
      </select>
      <p :id="descriptionId" class="field-note">{{ description }}</p>
    </div>
  </div>
</template>
