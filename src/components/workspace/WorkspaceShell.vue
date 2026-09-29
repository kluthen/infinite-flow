<script setup lang="ts">
/**
 * The phrase-workspace layout root: composes the header, the score panel, the below-score control
 * sheet, and the portrait guard around one already-constructed session. Owns no session state
 * itself -- it only forwards `ControlPanel`'s typed events onto the session's own actions, exactly
 * as the parallel controls-work contract defines them.
 */
import { computed, onMounted } from 'vue'

import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import ControlPanel from '@/components/controls/ControlPanel.vue'
import type { SettableControlKey } from '@/components/controls/set-control-event'
import type { GenerationControls, MusicalProfile } from '@/domain/controls/generation-controls'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { NotationError } from '@/notation/notation-error'
import { loadVexflowEngraver } from '@/notation/vexflow-engraver-loader'
import WorkspaceHeader from './WorkspaceHeader.vue'
import ScorePanel from './ScorePanel.vue'
import OrientationNotice from './OrientationNotice.vue'

const props = defineProps<{
  session: GenerationSession<WorkspaceSessionResult>
  pendingPhrase: WrittenPhrase | null
  handleEngraved: () => void
  handleNotationError: (error: NotationError) => void
}>()

const state = computed(() => props.session.state)

/**
 * Warm the lazy VexFlow engraver chunk as soon as the workspace mounts, well before the first
 * phrase exists to notate, so the first Generate is not slowed by its fetch. A failure here is not
 * reported: `PhraseScore` retries the same memoized loader once a phrase actually needs engraving,
 * and surfaces any real failure through its own typed notation-error path at that point.
 */
onMounted(() => {
  void loadVexflowEngraver().catch(() => {})
})

/** Every configuration control is read-only for the whole lifetime of any operation, not only generation. */
const controlsReadonly = computed(() => state.value.operation !== 'idle')

/** Intent: forward one control-group's validated set-control event onto the session's own action. */
function handleSetControl<K extends SettableControlKey>(payload: {
  readonly key: K
  readonly value: GenerationControls[K]
}): void {
  props.session.actions.setControl(payload.key, payload.value)
}

/** Intent: forward an instrument-profile selection onto the session's dedicated action. */
function handleSelectInstrumentProfile(id: GenerationControls['instrumentProfileId']): void {
  void props.session.actions.selectInstrumentProfile(id)
}

/** Intent: forward a musical-profile preset selection onto the session's own action. */
function handleSelectMusicalProfile(profile: MusicalProfile): void {
  props.session.actions.selectMusicalProfile(profile)
}
</script>

<template>
  <main class="layout-app" aria-labelledby="workspace-title">
    <WorkspaceHeader :session="session" />
    <div class="layout-workspace">
      <ScorePanel
        :session="session"
        :pending-phrase="pendingPhrase"
        :handle-engraved="handleEngraved"
        :handle-notation-error="handleNotationError"
      />
      <ControlPanel
        :controls="state.controls"
        :profile-selection="state.profileSelection"
        :readonly="controlsReadonly"
        :note-density-context="state.noteDensityContext"
        @set-control="handleSetControl"
        @select-instrument-profile="handleSelectInstrumentProfile"
        @select-musical-profile="handleSelectMusicalProfile"
      />
    </div>
  </main>
  <OrientationNotice />
</template>
