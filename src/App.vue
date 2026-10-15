<script setup lang="ts">
/**
 * The application root: builds the one workspace session for this browser tab's lifetime, from
 * the saved data `main.ts` loaded before mounting it, and tears down its worker on unmount. The
 * workspace is first drawn with the loaded values: Idle's controls, profile selection and theme
 * (applied to the page at once, from the session's state), the audio mix, the Review's
 * preferences and the "During a session" choices; no control changes value after that first draw.
 * Construction is delegated to an injected factory, given the loaded saved data (falling back to
 * the production `createWorkspaceSession`), so a test or an e2e harness's `main.ts` can
 * `provide(WORKSPACE_SESSION_FACTORY, ...)` a deterministic/gated/failure-injecting session
 * without ever branching this file on being under test. It also builds the workspace's one
 * session controller, whose module loads as its own chunk: until it has loaded, `Start session`
 * stays disabled. A load failure is not caught: it surfaces as the unhandled error it is. It
 * keeps the workspace's connection-sheet flag in step with the shell's sheet, and provides the
 * workspace's saver of the player's changes to the components whose change handlers save.
 */
import { computed, inject, onUnmounted, provide, shallowRef, watch } from 'vue'

import { applyThemePreference } from './components/workspace/apply-theme-preference'
import {
  WORKSPACE_SESSION_FACTORY,
  createWorkspaceSession,
} from './components/workspace/create-workspace-session'
import {
  pregenerationPolicyFromSearch,
  prewarmPolicyFromSearch,
} from './components/workspace/prewarm-policy'
import { SAVE_SETTINGS } from './components/workspace/save-settings-injection'
import WorkspaceShell from './components/workspace/WorkspaceShell.vue'
import type { SessionController } from './components/workspace/workspace-session-controller-types'
import type { WrittenRangeInClef } from './notation/notation-layout-policy'
import type { SavedDataLoad } from './storage-bootstrap'

const props = defineProps<{
  /** The saved data loaded before the mount: every setting the workspace is first drawn with. */
  savedData: SavedDataLoad
}>()

// The production fallback reads the prewarm and pre-generation policies once from the page URL:
// `?prewarm=off` is the latency measurement seam, loading the real app with cold generation, and
// `?pregeneration=off` runs no background pre-generation at Idle; both are on otherwise.
const buildWorkspaceSession = inject(WORKSPACE_SESSION_FACTORY, (savedData: SavedDataLoad) =>
  createWorkspaceSession({
    prewarmPolicy: prewarmPolicyFromSearch(window.location.search),
    pregenerationPolicy: pregenerationPolicyFromSearch(window.location.search),
    savedData,
  }),
)
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
const workspace = buildWorkspaceSession(props.savedData)

watch(() => workspace.session.state.presentation.theme, applyThemePreference, { immediate: true })

/**
 * The saved my instrument's written range in its clef, which sizes the staff's shared system
 * positions; null while no my instrument exists. It changes only when my instrument does.
 */
// @spec-link [[module_notation_layout_preflight]]
// @spec-link [[entity_my_instrument_record]]
const savedMyInstrumentRangeInClef = computed<WrittenRangeInClef | null>(() => {
  const mine = workspace.session.state.myInstrument
  return mine === null ? null : { writtenRange: mine.writtenRange, clef: mine.clef }
})

// The components whose change handlers save the player's changes (the audio mix, the "During a
// session" options, the Review's choices) inject the workspace's saver at their setup.
// @spec-link [[rule_settings_saved_on_change]]
provide(SAVE_SETTINGS, workspace.saveSettings)

const sessionController = shallowRef<SessionController | null>(null)
let unmounted = false

/**
 * Intent: load the session controller once, at setup; one that arrives after unmount is disposed
 * of at once, so nothing it reads outlives the app.
 */
// @spec-link [[service_session_controller]]
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
// @spec-link [[service_session_controller]]
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
    :saved-data="savedData"
    :saved-my-instrument-range-in-clef="savedMyInstrumentRangeInClef"
    :saved-review-preferences="savedData.settings.review"
    :saved-session-options="savedData.settings.sessionOptions"
    :remembered-controller="workspace.rememberedController"
    @connection-sheet-open-change="handleConnectionSheetOpenChange"
  />
</template>
