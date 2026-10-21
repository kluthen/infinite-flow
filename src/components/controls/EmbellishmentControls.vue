<script setup lang="ts">
/**
 * The "Embellishments" control group (`control-group-figures`), after the character group and
 * before "During a session": an intro line, then one four-segment level control per figure, in the
 * fixed figure order, each with the note that says what the figure is and what rhythm it needs,
 * which the radiogroup names with `aria-describedby`. Every segment is always selectable (spec
 * D378). Props-in/events-out only: it holds no level of its own and shows the levels it is given,
 * during a session those of the phrase now sounding, so a figure step shows in place; the parent
 * makes it read-only during Loading and a session.
 */
import { useId } from 'vue'

import type { FigureId, FigureLevel, FigureLevels } from '@/domain/figures/figure-levels'
import SegmentedControl from './SegmentedControl.vue'
import {
  FIGURE_LEVEL_FIELDS,
  figureLevelOfSegment,
  type FigureLevelField,
} from './figure-level-options'

defineProps<{
  figureLevels: FigureLevels
  readonly: boolean
}>()

const emit = defineEmits<{
  'set-figure-level': [payload: { readonly figure: FigureId; readonly level: FigureLevel }]
}>()

/** The group's intro, as the phrase-workspace handoff words it. */
const INTRO =
  'How often the app decorates the melody with each figure. A preference, never a promise: the rhythm decides where a figure fits.'

/** Each field with the id of its note, which its radiogroup names. */
const fields = FIGURE_LEVEL_FIELDS.map((field) => ({ field, noteId: useId() }))

/** Intent: report the level chosen for a figure, refusing a segment value that is no level. */
// @spec-link [[module_figure_level_options]]
// @spec-link [[req_embellishment_figure_levels]]
function handleLevel(field: FigureLevelField, value: string): void {
  emit('set-figure-level', { figure: field.figure, level: figureLevelOfSegment(field, value) })
}
</script>

<template>
  <!-- @spec-link [[req_embellishment_figure_levels]] -->
  <section class="control-group control-group-figures">
    <h3>Embellishments</h3>
    <p class="control-group-intro">{{ INTRO }}</p>
    <!-- @spec-link [[rule_readonly_controls_keep_contrast]] -->
    <div
      v-for="{ field, noteId } in fields"
      :key="field.figure"
      class="field-group"
      :class="{ 'is-readonly': readonly }"
    >
      <span class="field-label">{{ field.label }}</span>
      <SegmentedControl
        :label="field.label"
        :options="field.options"
        :model-value="figureLevels[field.figure]"
        :readonly="readonly"
        :described-by="noteId"
        @update:model-value="(value: string) => handleLevel(field, value)"
      />
      <p :id="noteId" class="field-note">{{ field.note }}</p>
    </div>
  </section>
</template>
