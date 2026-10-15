<script setup lang="ts">
/**
 * The Review's export scope, `review-scope`, first in its export row: a field group labelled
 * "Export" with `Whole session` and `Favorites only`, which both exports hold. The page holds the
 * choice for the Review; this asks it for the one the player picks. While the session has no
 * favorite, `Favorites only` is disabled and named by its note, "No favorites in this session yet."
 */
import { computed, useId } from 'vue'

import SegmentedControl from '@/components/controls/SegmentedControl.vue'
import type { SegmentedControlOption } from '@/components/controls/segmented-control-option'
import type { ReviewExportScope } from './review-types'

// @spec-link [[rule_favorites_only_export]]
const props = defineProps<{
  /** The scope in force, the page's for this Review. */
  scope: ReviewExportScope
  /** The session holds at least one favorite phrase. */
  hasFavorite: boolean
}>()

const emit = defineEmits<{
  'update:scope': [scope: ReviewExportScope]
}>()

const noteId = useId()

/**
 * Intent: the scope's two choices, `Favorites only` disabled and named by its note while the
 * session has no favorite.
 */
// @spec-link [[rule_favorites_only_export]]
const options = computed((): readonly SegmentedControlOption[] => {
  const favoritesOnly = { value: 'favoritesOnly', label: 'Favorites only' }
  return [
    { value: 'wholeSession', label: 'Whole session' },
    props.hasFavorite ? favoritesOnly : { ...favoritesOnly, disabled: true, describedBy: noteId },
  ]
})

/** Intent: ask the page for the picked scope, refusing a value the control does not offer. */
// @spec-link [[rule_favorites_only_export]]
function select(value: string): void {
  if (value !== 'wholeSession' && value !== 'favoritesOnly') {
    throw new Error(`The export has no scope "${value}".`)
  }
  emit('update:scope', value)
}
</script>

<template>
  <div class="field-group review-scope">
    <span class="field-label">Export</span>
    <SegmentedControl
      label="Export"
      :options="options"
      :model-value="scope"
      :readonly="false"
      @update:model-value="select"
    />
    <p v-if="!hasFavorite" :id="noteId" class="field-note">No favorites in this session yet.</p>
  </div>
</template>
