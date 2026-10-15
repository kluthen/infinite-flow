<script setup lang="ts">
/**
 * The confirmation a Review opens, in the shared confirmation sheet (./ConfirmationSheet.vue) with
 * its words (./review-confirmation-copy.ts); its confirming action busy while the confirmation
 * runs. It loads on demand with the Review's code, through `loadReviewConfirmationSheet()` in
 * ../review/load-review-panel.ts; the score panel shows and hides it, and moves focus once it closes.
 */
import { computed } from 'vue'

import ConfirmationSheet from './ConfirmationSheet.vue'
import { reviewConfirmationCopy } from './review-confirmation-copy'
import type { ReviewConfirmation } from './use-review-played-notes'

// @spec-link [[rule_kept_played_notes_deletable]]
const props = defineProps<{
  /** The confirmation open over the Review. */
  confirmation: ReviewConfirmation
}>()

const emit = defineEmits<{
  /** The confirming action was pressed. */
  confirm: []
  /** The way back: the way-back action, Close, Escape or a press on the backdrop. */
  cancel: []
}>()

/** Intent: the words of the open confirmation, as the sheet shows them. */
const copy = computed(() => reviewConfirmationCopy(props.confirmation))
</script>

<template>
  <ConfirmationSheet
    v-bind="copy"
    :busy="confirmation.busy"
    @confirm="emit('confirm')"
    @cancel="emit('cancel')"
  />
</template>
