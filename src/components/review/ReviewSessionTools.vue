<script setup lang="ts">
/**
 * The Review's session tools, at the inline end of its heading row: `Pin` on an unpinned session,
 * `Unpin` on a pinned one (the label changing in place, focus staying), and `Delete session`,
 * absent while saving is off. Two plain buttons; each asks the page, which pins, unpins or opens
 * the confirmation the press calls for.
 */
import { ref } from 'vue'

// @spec-link [[rule_pinned_session_kept]]
// @spec-link [[req_kept_session_list]]
defineProps<{
  /** The session is pinned: the button reads `Unpin`. */
  pinned: boolean
  /** `Delete session` is offered (saving is on). */
  canDelete: boolean
}>()

const emit = defineEmits<{
  /** `Pin` or `Unpin` was pressed. */
  'toggle-pin': []
  /** `Delete session` was pressed. */
  'delete-session': []
}>()

const pinEl = ref<HTMLButtonElement | null>(null)
const deleteEl = ref<HTMLButtonElement | null>(null)

/** Intent: move focus to `element`, which must be rendered. */
function focusRendered(element: HTMLElement | null, name: string): void {
  if (element === null) throw new Error(`review session tools: ${name} is not rendered`)
  element.focus()
}

/** Intent: move focus to `Pin` / `Unpin` (after its confirmation, or on its way back). */
// @spec-link [[rule_pinned_session_kept]]
function focusPin(): void {
  focusRendered(pinEl.value, 'the pin button')
}

/** Intent: move focus back to `Delete session`, on its confirmation's way back. */
// @spec-link [[req_kept_session_list]]
function focusDelete(): void {
  focusRendered(deleteEl.value, 'Delete session')
}

/** Intent: whether `Delete session` holds focus now (before it leaves the page). */
function deleteFocused(): boolean {
  return deleteEl.value !== null && document.activeElement === deleteEl.value
}

defineExpose({ focusPin, focusDelete, deleteFocused })
</script>

<template>
  <div class="review-session-tools">
    <button ref="pinEl" type="button" class="btn" @click="emit('toggle-pin')">
      {{ pinned ? 'Unpin' : 'Pin' }}
    </button>
    <button
      v-if="canDelete"
      ref="deleteEl"
      type="button"
      class="btn"
      @click="emit('delete-session')"
    >
      Delete session
    </button>
  </div>
</template>
