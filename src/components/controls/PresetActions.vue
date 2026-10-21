<script setup lang="ts">
/**
 * The preset bar's actions row, `preset-actions`: plain buttons, each rendered only when the row
 * offers it, in this order: `Save as new preset` always, `Save changes`, `Rename preset` and
 * `Delete preset`. While 50 or more player presets are kept, `Save as new preset` is disabled and
 * names the note after the buttons that says why. `disabled` disables every button (a session),
 * the row keeping the buttons it is given. Props-in/events-out only: a press reports the action
 * asked for; the parent opens the preset sheet or saves.
 */
import { useId } from 'vue'

import type { PresetActionKind, PresetActionsRow } from './preset-bar-model'

defineProps<{
  /** The buttons the row holds, and whether the limit of player presets is reached. */
  row: PresetActionsRow
  /** Every button disabled: during a session. */
  disabled: boolean
}>()

const emit = defineEmits<{
  'preset-action': [action: PresetActionKind]
}>()

const limitNoteId = useId()
</script>

<template>
  <!-- @spec-link [[rule_preset_management_actions]] -->
  <div class="preset-actions">
    <!-- @spec-link [[rule_player_preset_limit]] -->
    <button
      class="btn"
      type="button"
      data-preset-action="save-as-new"
      :disabled="disabled || row.limitReached"
      :aria-describedby="row.limitReached ? limitNoteId : undefined"
      @click="emit('preset-action', 'save-as-new')"
    >
      Save as new preset
    </button>
    <button
      v-if="row.saveChanges"
      class="btn"
      type="button"
      data-preset-action="save-changes"
      :disabled="disabled"
      @click="emit('preset-action', 'save-changes')"
    >
      Save changes
    </button>
    <button
      v-if="row.rename"
      class="btn"
      type="button"
      data-preset-action="rename"
      :disabled="disabled"
      @click="emit('preset-action', 'rename')"
    >
      Rename preset
    </button>
    <!-- @spec-link [[rule_presets_in_visits_that_save_nothing]] -->
    <button
      v-if="row.delete"
      class="btn"
      type="button"
      data-preset-action="delete"
      :disabled="disabled"
      @click="emit('preset-action', 'delete')"
    >
      Delete preset
    </button>
    <p v-if="row.limitReached" :id="limitNoteId" class="field-note">
      You have 50 presets of your own, the most the app keeps. Delete one, here or in Your data, to
      save a new one.
    </p>
  </div>
</template>
