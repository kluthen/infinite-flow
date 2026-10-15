<script setup lang="ts">
/**
 * One `session-row` of the session list: the row's title button (`session-row-open`, the session
 * date, " · Last session" on the most recent session's row), its detail and status lines, its
 * comment's first line or its note, and `session-row-actions`: `Pin` / `Unpin` (none on a row
 * saved by a newer version) and `Delete` (none while saving is off). The title button opens the
 * session; it takes `is-loading`, disabled, while its read runs, and is disabled on a row saved by
 * a newer version. The row's text is ./session-row-text.ts.
 */
import { computed, ref } from 'vue'

import type { KeptSessionRow } from '@/components/workspace/use-kept-sessions'
import { sessionRowText } from './session-row-text'

const props = defineProps<{
  row: KeptSessionRow
  /** The row is the most recent session's. */
  mostRecent: boolean
  /** Its opening's read runs. */
  opening: boolean
  /** Saving is off for the visit: no `Delete`. */
  savingOff: boolean
}>()

const emit = defineEmits<{
  open: []
  'toggle-pin': []
  delete: []
}>()

/** Intent: the row's text, as the design writes it. */
// @spec-link [[req_kept_session_list]]
const text = computed(() => sessionRowText(props.row, props.mostRecent, props.savingOff))

/** Intent: the session's pin, offered on a row this version reads; null on a newer one. */
// @spec-link [[rule_pinned_session_kept]]
const pinned = computed(() => (props.row.kind === 'current' ? props.row.summary.pinned : null))

/** Intent: the session date the actions' accessible names end with. */
const date = computed(() => text.value.title.replace(/ · Last session$/, ''))

const openEl = ref<HTMLButtonElement | null>(null)
const pinEl = ref<HTMLButtonElement | null>(null)
const deleteEl = ref<HTMLButtonElement | null>(null)

/** Intent: move focus to `element`, which must be rendered. */
function focusRendered(element: HTMLButtonElement | null, name: string): void {
  if (element === null) throw new Error(`session row: ${name} is not rendered`)
  element.focus()
}

defineExpose({
  focusOpen: () => focusRendered(openEl.value, 'its title'),
  focusPin: () => focusRendered(pinEl.value, 'Pin'),
  focusDelete: () => focusRendered(deleteEl.value, 'Delete'),
  /** Whether `Delete` holds focus now. */
  deleteFocused: () => deleteEl.value !== null && document.activeElement === deleteEl.value,
})
</script>

<template>
  <li class="session-row">
    <div>
      <h3>
        <button
          ref="openEl"
          type="button"
          class="btn session-row-open"
          :class="{ 'is-loading': opening }"
          :disabled="opening || row.kind === 'newer'"
          @click="emit('open')"
        >
          {{ text.title }}
        </button>
      </h3>
      <p v-if="text.detail !== null" class="session-row-meta">{{ text.detail }}</p>
      <p v-if="text.status !== null" class="session-row-meta">{{ text.status }}</p>
      <p v-if="text.comment !== null" class="session-row-comment">{{ text.comment }}</p>
      <p v-if="text.note !== null" class="session-row-note">{{ text.note }}</p>
    </div>
    <div v-if="pinned !== null" class="session-row-actions">
      <button
        ref="pinEl"
        type="button"
        class="btn"
        :aria-label="`${pinned ? 'Unpin' : 'Pin'} session ${date}`"
        @click="emit('toggle-pin')"
      >
        {{ pinned ? 'Unpin' : 'Pin' }}
      </button>
      <button
        v-if="!savingOff"
        ref="deleteEl"
        type="button"
        class="btn"
        :aria-label="`Delete session ${date}`"
        @click="emit('delete')"
      >
        Delete
      </button>
    </div>
  </li>
</template>
