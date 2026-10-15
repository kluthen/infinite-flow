<script setup lang="ts">
/**
 * The Review's comment on its session, in one of three states: collapsed and empty (`Add a
 * comment`), collapsed with the comment (its line breaks kept, never cut) and `Edit comment`, or
 * editing (a labelled text area of at most 500 characters, typing stopping and a paste cut there,
 * its count, and `Done`). The editor opens with focus in the field, the caret at the end. The draft
 * is handed to the page to save on `Done` (or Escape in the field, which closes the editor and
 * returns focus to its button), whenever the field loses focus (the editor staying open), and when
 * the Review is left or replaced while it is open; the page trims it, and an emptied one removes
 * the comment. Each save names the session the editor was opened for, by its key.
 */
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue'

import { KEPT_SESSION_COMMENT_MAX_LENGTH } from '@/storage/records/kept-session-summary'

// @spec-link [[rule_session_comment]]
const props = defineProps<{
  /** The session's comment as held; empty when it has none. */
  comment: string
  /** The key of the session the comment belongs to. */
  sessionKey: string
}>()

const emit = defineEmits<{
  /** Save `text` as the comment of the session under `key`. */
  save: [key: string, text: string]
}>()

const MAX = KEPT_SESSION_COMMENT_MAX_LENGTH
const fieldId = useId()
const countId = useId()
const editing = ref(false)
const draft = ref('')
const fieldEl = ref<HTMLTextAreaElement | null>(null)
const toggleEl = ref<HTMLButtonElement | null>(null)
const count = computed(() => `${draft.value.length}/${MAX}`)

/** Intent: open the editor on the comment as held, focus in the field and the caret at its end. */
// @spec-link [[rule_session_comment]]
async function startEditing(): Promise<void> {
  draft.value = props.comment
  editing.value = true
  await nextTick()
  const field = fieldEl.value
  if (field === null) throw new Error('review comment: the field is not rendered')
  field.focus()
  field.setSelectionRange(field.value.length, field.value.length)
}

/** Intent: keep what the field holds as the draft, cut at 500 characters (a paste included). */
function input(event: Event): void {
  const field = event.target as HTMLTextAreaElement
  if (field.value.length > MAX) field.value = field.value.slice(0, MAX)
  draft.value = field.value
}

/** Intent: hand the draft to the page to save, for the session the editor is open on. */
// @spec-link [[rule_session_comment]]
function save(): void {
  emit('save', props.sessionKey, draft.value)
}

/** Intent: `Done` (or Escape): save, close the editor and move focus to its button. */
// @spec-link [[rule_session_comment]]
async function done(): Promise<void> {
  save()
  editing.value = false
  await nextTick()
  toggleEl.value?.focus()
}

// Leaving or replacing the Review while the editor is open saves the draft.
onBeforeUnmount(() => {
  if (editing.value) save()
})
</script>

<template>
  <div class="review-comment">
    <div v-if="editing" class="field-group">
      <label class="field-label" :for="fieldId">Comment</label>
      <textarea
        :id="fieldId"
        ref="fieldEl"
        class="text-area"
        :maxlength="MAX"
        :aria-describedby="countId"
        :value="draft"
        @input="input"
        @blur="save"
        @keydown.esc.prevent="done"
      ></textarea>
      <p :id="countId" class="field-count">{{ count }}</p>
      <button type="button" class="btn" @click="done">Done</button>
    </div>
    <template v-else-if="comment === ''">
      <button ref="toggleEl" type="button" class="btn" @click="startEditing">Add a comment</button>
    </template>
    <template v-else>
      <p>{{ comment }}</p>
      <button ref="toggleEl" type="button" class="btn" @click="startEditing">Edit comment</button>
    </template>
  </div>
</template>
