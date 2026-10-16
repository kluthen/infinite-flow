<script setup lang="ts">
/**
 * `layout-footer`, the page's last block, after the workspace, in every state: its note, then
 * `Your data`, which opens the Your data sheet; the button is disabled during a session.
 */

// @spec-link [[req_your_data]]
defineProps<{
  /** True while a session runs (or before the controller loads): `Your data` is disabled. */
  disabled: boolean
}>()

const emit = defineEmits<{
  /** `Your data` was pressed. */
  'open-your-data': []
}>()
</script>

<template>
  <footer class="layout-footer">
    <p class="footer-note">Your settings and sessions are kept on this device only.</p>
    <button type="button" class="btn" :disabled="disabled" @click="emit('open-your-data')">
      Your data
    </button>
  </footer>
</template>
