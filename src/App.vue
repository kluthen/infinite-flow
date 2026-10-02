<script setup lang="ts">
/**
 * The application root: builds the one workspace session for this browser tab's lifetime and
 * tears down its worker on unmount. Construction is delegated to an injected factory (falling
 * back to the production `createWorkspaceSession`) so a test or an e2e harness's `main.ts` can
 * `provide(WORKSPACE_SESSION_FACTORY, ...)` a deterministic/gated/failure-injecting session
 * without ever branching this file on being under test. It also builds the workspace's one
 * session controller, whose module loads as its own chunk: until it has loaded, `Start session`
 * stays disabled. A load failure is not caught: it surfaces as the unhandled error it is. It
 * keeps the workspace's connection-sheet flag in step with the shell's sheet.
 */
import { inject, onUnmounted, shallowRef, watch } from 'vue'

import { applyThemePreference } from './components/workspace/apply-theme-preference'
import {
  WORKSPACE_SESSION_FACTORY,
  createWorkspaceSession,
} from './components/workspace/create-workspace-session'
import { prewarmPolicyFromSearch } from './components/workspace/prewarm-policy'
import WorkspaceShell from './components/workspace/WorkspaceShell.vue'
import type { SessionController } from './components/workspace/workspace-session-controller-types'

// The production fallback reads the prewarm policy once from the page URL: `?prewarm=off` is the
// latency measurement seam, loading the real app with cold generation; prewarm is on otherwise.
const buildWorkspaceSession = inject(WORKSPACE_SESSION_FACTORY, () =>
  createWorkspaceSession({ prewarmPolicy: prewarmPolicyFromSearch(window.location.search) }),
)
const workspace = buildWorkspaceSession()

watch(() => workspace.session.state.presentation.theme, applyThemePreference, { immediate: true })

const sessionController = shallowRef<SessionController | null>(null)
let unmounted = false

/**
 * Intent: load the session controller once, at setup; one that arrives after unmount is disposed
 * of at once, so nothing it reads outlives the app.
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[rule_session_start_conditions]]
void workspace.createSessionController().then((controller) => {
  if (unmounted) controller.dispose()
  else sessionController.value = controller
})

/**
 * Intent: keep the workspace's connection-sheet flag, which the session controller reads, equal to
 * the shell's sheet; the shell reports every change synchronously.
 */
// @spec-link [[rule_controller_connects_between_sessions]]
function handleConnectionSheetOpenChange(open: boolean): void {
  workspace.connectionSheetOpen.value = open
}

/** Intent: end any running session and stop the controller, then tear the workspace down. */
// @spec-link [[service_workspace_session_flow]]
onUnmounted(() => {
  unmounted = true
  sessionController.value?.dispose()
  workspace.dispose()
})
</script>

<template>
  <WorkspaceShell
    :session="workspace.session"
    :pending-phrase="workspace.pendingPhrase.value"
    :handle-engraved="workspace.handleEngraved"
    :handle-notation-error="workspace.handleNotationError"
    :handle-session-staff-failed="workspace.handleSessionStaffFailed"
    :handle-layout-inputs="workspace.handleLayoutInputs"
    :audio="workspace.audio"
    :midi="workspace.midi"
    :controller="sessionController"
    @connection-sheet-open-change="handleConnectionSheetOpenChange"
  />
</template>
