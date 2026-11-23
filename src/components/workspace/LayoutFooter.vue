<script setup lang="ts">
/**
 * `layout-footer`, the page's last block, after the workspace, in every state: its note, then
 * `footer-actions`, holding `Your data`, which opens the Your data sheet, and `Lexicon`, which
 * opens the lexicon page, the two wrapping together under the note. Each button has its own
 * disabled flag: `Your data` waits for the session controller, `Lexicon` does not. While the
 * page's code loads, `Lexicon` shows that it is loading.
 */
import { ref } from 'vue'

// @spec-link [[req_your_data]]
// @spec-link [[req_lexicon_page]]
defineProps<{
  /** True while a session runs (or before the controller loads): `Your data` is disabled. */
  yourDataDisabled: boolean
  /** True while a session runs, count-in included: `Lexicon` is disabled. */
  lexiconDisabled: boolean
  /** True while the lexicon page's code loads at its first opening. */
  lexiconLoading: boolean
}>()

const emit = defineEmits<{
  /** `Your data` was pressed. */
  'open-your-data': []
  /** `Lexicon` was pressed. */
  'open-lexicon': []
}>()

const lexiconButton = ref<HTMLButtonElement | null>(null)

/**
 * Move focus to `Lexicon` (the lexicon page closed); hidden by the portrait guard, it takes no
 * focus, which stays on the page as after a portrait end.
 */
// @spec-link [[req_lexicon_page]]
function focusLexicon(): void {
  if (lexiconButton.value === null) throw new Error('footer: Lexicon is not rendered')
  lexiconButton.value.focus()
}

defineExpose({ focusLexicon })
</script>

<template>
  <footer class="layout-footer">
    <p class="footer-note">Your settings and sessions are kept on this device only.</p>
    <div class="footer-actions">
      <button
        type="button"
        class="btn"
        :disabled="yourDataDisabled"
        @click="emit('open-your-data')"
      >
        Your data
      </button>
      <button
        ref="lexiconButton"
        type="button"
        class="btn"
        :class="{ 'is-loading': lexiconLoading }"
        :aria-busy="lexiconLoading ? 'true' : undefined"
        :disabled="lexiconDisabled"
        @click="emit('open-lexicon')"
      >
        Lexicon
      </button>
    </div>
  </footer>
</template>
