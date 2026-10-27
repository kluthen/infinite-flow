<script setup lang="ts">
/**
 * The notice row at the top of the workspace: the saved-data flow's `app-notice`, its sentence,
 * then its action and `Dismiss` when it has them, and Jam's load-failure notice, with `Try again`
 * and `Dismiss`, when Jam mode could not open. Never error-toned, not a live region, no animation;
 * it moves no focus itself (the shell focuses `Try again` through `focusJamTryAgain`). Its buttons
 * are disabled while a session runs. `Your data` opens the Your data sheet.
 */
import { ref } from 'vue'

import type { AppNotice } from './use-app-notices'

// @spec-link [[rule_failed_save_never_disturbs_session]]
withDefaults(
  defineProps<{
    /** The saved-data notice to show; none (null) shows only Jam's. */
    notice: AppNotice | null
    /** True while a session runs: every button is disabled. */
    disabled: boolean
    /** Jam mode could not open: its load-failure notice shows; none by default. */
    jamLoadFailed?: boolean
  }>(),
  { jamLoadFailed: false },
)

const emit = defineEmits<{
  /** `Dismiss` was pressed. */
  dismiss: []
  /** `Reload` was pressed. */
  reload: []
  /** `Your data` was pressed. */
  'your-data': []
  /** Jam's load-failure notice's `Try again` was pressed: a press of `Jam`. */
  'jam-try-again': []
  /** Jam's load-failure notice's `Dismiss` was pressed. */
  'jam-dismiss': []
}>()

const JAM_LOAD_FAILED_TEXT =
  "Jam mode couldn't open because part of the app didn't load. Check that you're online, then try again."

const jamTryAgainButton = ref<HTMLButtonElement | null>(null)

/** Intent: move focus to the load-failure notice's `Try again`, which must be shown. */
// @spec-link [[module_workspace_mode]]
function focusJamTryAgain(): void {
  if (jamTryAgainButton.value === null)
    throw new Error("notice row: Jam's load-failure notice is not shown")
  jamTryAgainButton.value.focus()
}

defineExpose({ focusJamTryAgain })
</script>

<template>
  <div class="app-notice-row">
    <div v-if="notice !== null" class="inline-alert alert-notice app-notice">
      <p>{{ notice.text }}</p>
      <button
        v-if="notice.action === 'your-data'"
        type="button"
        class="btn"
        :disabled="disabled"
        @click="emit('your-data')"
      >
        Your data
      </button>
      <button
        v-if="notice.action === 'reload'"
        type="button"
        class="btn"
        :disabled="disabled"
        @click="emit('reload')"
      >
        Reload
      </button>
      <button
        v-if="notice.dismissable"
        type="button"
        class="btn"
        :disabled="disabled"
        @click="emit('dismiss')"
      >
        Dismiss
      </button>
    </div>
    <!-- @spec-link [[module_workspace_mode]] -->
    <div v-if="jamLoadFailed" class="inline-alert alert-notice app-notice">
      <p>{{ JAM_LOAD_FAILED_TEXT }}</p>
      <button
        ref="jamTryAgainButton"
        type="button"
        class="btn"
        :disabled="disabled"
        @click="emit('jam-try-again')"
      >
        Try again
      </button>
      <button type="button" class="btn" :disabled="disabled" @click="emit('jam-dismiss')">
        Dismiss
      </button>
    </div>
  </div>
</template>
