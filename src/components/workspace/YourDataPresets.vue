<script setup lang="ts">
/**
 * The Your data sheet's Presets section (ui_ux screens/your-data, Overview copy): how many player
 * presets the preset box lists, with how to delete or save one, then, when there is at least one,
 * one row per player preset, in the order given (the box's Your presets order), its name as the
 * player wrote it, then its own `Delete`, named after it. A row's `Delete` asks the sheet to open
 * that preset's confirmation; its button is handed to the sheet, which moves focus back to it.
 */
import type { Preset, PresetId } from '@/domain/presets/preset-selection'
import { presetDeleteLabel, presetsLines } from './your-data-copy'

// @spec-link [[req_your_data]]
defineProps<{
  /** The player presets the preset box lists, in its Your presets order. */
  presets: readonly Preset[]
  /** Keep the `Delete` of the row of preset `id`, or forget it once it leaves (null). */
  register: (id: PresetId, element: unknown) => void
}>()

const emit = defineEmits<{
  /** A row's `Delete` was pressed. */
  delete: [preset: Preset]
}>()
</script>

<template>
  <section class="sheet-section">
    <h3>Presets</h3>
    <p>{{ presetsLines(presets.length)[0] }}</p>
    <p class="sheet-hint">{{ presetsLines(presets.length)[1] }}</p>
    <ul v-if="presets.length > 0" class="sheet-list">
      <li v-for="preset in presets" :key="preset.id" class="sheet-list-row">
        <span>{{ preset.name }}</span>
        <button
          :ref="(element) => register(preset.id, element)"
          type="button"
          class="btn"
          :aria-label="presetDeleteLabel(preset.name)"
          @click="emit('delete', preset)"
        >
          Delete
        </button>
      </li>
    </ul>
  </section>
</template>
