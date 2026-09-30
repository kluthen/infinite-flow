<script setup lang="ts">
/**
 * The application root: builds the one workspace session for this browser tab's lifetime and
 * tears down its worker on unmount. Construction is delegated to an injected factory (falling
 * back to the production `createWorkspaceSession`) so a test or an e2e harness's `main.ts` can
 * `provide(WORKSPACE_SESSION_FACTORY, ...)` a deterministic/gated/failure-injecting session
 * without ever branching this file on being under test.
 */
import { inject, onUnmounted, watch } from 'vue'

import { applyThemePreference } from './components/workspace/apply-theme-preference'
import {
  WORKSPACE_SESSION_FACTORY,
  createWorkspaceSession,
} from './components/workspace/create-workspace-session'
import { prewarmPolicyFromSearch } from './components/workspace/prewarm-policy'
import WorkspaceShell from './components/workspace/WorkspaceShell.vue'

// The production fallback reads the prewarm policy once from the page URL: `?prewarm=off` is the
// latency measurement seam, loading the real app with cold generation; prewarm is on otherwise.
const buildWorkspaceSession = inject(WORKSPACE_SESSION_FACTORY, () =>
  createWorkspaceSession({ prewarmPolicy: prewarmPolicyFromSearch(window.location.search) }),
)
const workspace = buildWorkspaceSession()

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
