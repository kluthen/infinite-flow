<script setup lang="ts">
/**
 * The application root: builds the one production workspace session for this browser tab's
 * lifetime and tears down its worker on unmount. Construction is delegated to its own factory
 * module so a test can replace it and never spin a real Worker in jsdom.
 */
import { onUnmounted, watch } from 'vue'

import { applyThemePreference } from './components/workspace/apply-theme-preference'
import { createWorkspaceSession } from './components/workspace/create-workspace-session'
import WorkspaceShell from './components/workspace/WorkspaceShell.vue'

const workspace = createWorkspaceSession()

watch(() => workspace.session.state.presentation.theme, applyThemePreference, { immediate: true })

onUnmounted(() => workspace.dispose())
</script>

<template>
  <WorkspaceShell
    :session="workspace.session"
    :pending-phrase="workspace.pendingPhrase.value"
    :handle-engraved="workspace.handleEngraved"
    :handle-notation-error="workspace.handleNotationError"
  />
</template>
