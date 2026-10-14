<script setup lang="ts">
/**
 * The notice row at the top of the workspace: one `app-notice`, its sentence, then its action and
 * `Dismiss` when it has them. Never error-toned, not a live region, no animation; it moves no
 * focus. Its buttons are disabled while a session runs. `Your data` stays disabled until the Your
 * data sheet exists.
 */
import type { AppNotice } from './use-app-notices'

// @spec-link [[rule_failed_save_never_disturbs_session]]
defineProps<{
  /** The notice to show. */
  notice: AppNotice
  /** True while a session runs: every button is disabled. */
  disabled: boolean
}>()

const emit = defineEmits<{
  /** `Dismiss` was pressed. */
  dismiss: []
  /** `Reload` was pressed. */
  reload: []
}>()
</script>

<template>
  <div class="app-notice-row">
    <div class="inline-alert alert-notice app-notice">
      <p>{{ notice.text }}</p>
      <button v-if="notice.action === 'your-data'" type="button" class="btn" disabled>
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
  </div>
</template>
