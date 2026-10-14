<script setup lang="ts">
/**
 * The phrase-workspace layout root: composes the header, the score panel, the below-score control
 * sheet, and the portrait guard around one already-constructed session. Owns no session state
 * itself -- it only forwards `ControlPanel`'s typed events onto the session's own actions, exactly
 * as the parallel controls-work contract defines them. It also builds the one volume popover of
 * the audio mix, which the toolbar's and the phone's compact `Volume` share and a session's start
 * and end close. It runs the screen's side of a practice session over the session controller:
 * the Start click (popover closed, session started, the one jump), Stop, the musical controls
 * locked while a session runs, and where focus goes when it ends. It also hosts the controller
 * connection: the header `controller-status` it feeds, the click that opens the lazily loaded
 * connection sheet, whether the sheet is open (reported to the workspace as it changes), and where
 * focus goes when the sheet closes. It also runs the last session's Review from the screen: `Close
 * review` and `Review last session`, each scrolling the page to its top and moving focus. While a
 * session runs, the read-only controls show what the controller says the phrase now sounding was
 * generated with, and the preset status announces nothing; at the end they show the player's own
 * choices again, and the status announces again once those have rendered. The page's `Vary
 * settings`, `Tension across phrases` and `Rising tempo` choices go to the controller; the Tension
 * control never shows a phrase's step across phrases. During a session the tempo control
 * shows the exact tempo in effect, and the tempo field notes the tempo a rising-tempo session
 * reached (./use-rising-tempo-control.ts). It sets the staff's one shared system-position size
 * from the saved my instrument's written range, for the staff and the Review alike. The saved
 * review preferences and "During a session" choices it is given are where the Review's export
 * choices and the options (while the controller loads) start from.
 */
import { computed, onMounted, ref, watch } from 'vue'

import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import ControlPanel from '@/components/controls/ControlPanel.vue'
import type { SettableControlKey } from '@/components/controls/set-control-event'
import type { GenerationControls, MusicalProfile } from '@/domain/controls/generation-controls'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { NotationError } from '@/notation/notation-error'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { AudioTransport } from '@/audio/audio-transport'
import { getInstrumentProfile } from '@/domain/generation/generation-intent'
import type { MidiController } from '@/midi/midi-controller-state'
import { planSystemPositionUnits, type WrittenRangeInClef } from '@/notation/notation-layout-policy'
import { loadVexflowEngraver } from '@/notation/vexflow-engraver-loader'
import {
  DEFAULT_REVIEW_PREFERENCES,
  DEFAULT_SESSION_OPTIONS,
  type ReviewPreferences,
  type SessionOptionChoices,
} from '@/storage/records/setting-defaults'
import WorkspaceHeader from './WorkspaceHeader.vue'
import ScorePanel from './ScorePanel.vue'
import OrientationNotice from './OrientationNotice.vue'
import { createMixVolumePopover } from './mix-volume-popover'
import { jumpForSessionStart, type SessionJumpView } from './session-start-jump'
import type { SessionEndFocusTarget } from './session-end-focus'
import type { SessionController } from './workspace-session-controller-types'
import { useControllerConnection } from './use-controller-connection'
import { useReviewNavigation } from './use-review-navigation'
import { useSessionOptions } from './use-session-options'
import { useShownSettings } from './use-shown-settings'
import { useWorkspaceFocus } from './use-workspace-focus'

const props = withDefaults(
  defineProps<{
    session: GenerationSession<WorkspaceSessionResult>
    pendingPhrase: WrittenPhrase | null
    handleEngraved: () => void
    handleNotationError: (error: NotationError) => void
    /** The staff failing to show a running session; it ends the session, never reaching Idle. */
    handleSessionStaffFailed: (error: NotationError) => void
    handleLayoutInputs: (inputs: StaffLayoutInputs) => void
    audio: AudioTransport
    /** The app's one MIDI controller, which `controller-status` shows and the sheet connects. */
    midi: MidiController
    /** The session controller; null while its lazy chunk loads (no session can start then). */
    controller: SessionController | null
    /** How the start's jump scrolls and measures the window; the window itself by default. */
    jumpView?: SessionJumpView
    /** Scroll the page instantly to its top (leaving or reopening the Review); the window's own by default. */
    scrollToPageTop?: () => void
    /**
     * The saved my instrument's written range in its clef, or null while none is saved; none by
     * default. Nothing saves one yet: chunk 20's my-instrument record feeds it.
     */
    savedMyInstrumentRangeInClef?: WrittenRangeInClef | null
    /**
     * The saved review preferences, loaded before the first draw, which the Review's export
     * choices and Played notes switch start from; a first visit's by default.
     */
    savedReviewPreferences?: ReviewPreferences
    /**
     * The saved "During a session" choices, loaded before the first draw, which the options show
     * while the session controller loads (it starts from the same); a first visit's by default.
     */
    savedSessionOptions?: SessionOptionChoices
  }>(),
  {
    // Default: the window's own instant scroll, measured against the layout viewport's height.
    jumpView: () => ({
      scrollBy: (options: Parameters<SessionJumpView['scrollBy']>[0]) => window.scrollBy(options),
      viewportBlockSize: () => document.documentElement.clientHeight,
    }),
    // Default: the window's own instant scroll to its top (a function prop's default is itself).
    scrollToPageTop: () => window.scrollTo({ top: 0, behavior: 'instant' }),
    savedMyInstrumentRangeInClef: null,
    savedReviewPreferences: () => DEFAULT_REVIEW_PREFERENCES,
    savedSessionOptions: () => DEFAULT_SESSION_OPTIONS,
  },
)

const state = computed(() => props.session.state)

/**
 * The one shared system-position size of the workspace, for the staff and the Review: from the
 * saved my instrument's written range in its clef, so it changes only when my instrument is saved
 * or deleted, never from one phrase to the next nor with the instrument selected.
 */
// @spec-link [[module_notation_layout_preflight]]
const systemPositionUnits = computed(() =>
  planSystemPositionUnits(props.savedMyInstrumentRangeInClef),
)

const layoutRoot = ref<HTMLElement | null>(null)
const header = ref<InstanceType<typeof WorkspaceHeader> | null>(null)
const scorePanel = ref<InstanceType<typeof ScorePanel> | null>(null)

// The one volume popover of the page: its id is unique, since the workspace is rendered once.
// @spec-link [[req_session_audio_mix]]
const mixPopover = createMixVolumePopover('mix-volume-popover')

/**
 * Warm the lazy VexFlow engraver chunk as soon as the workspace mounts, well before the first
 * phrase exists to notate, so the first Generate is not slowed by its fetch. A failure here is not
 * reported: `PhraseScore` retries the same memoized loader once a phrase actually needs engraving,
 * and surfaces any real failure through its own typed notation-error path at that point.
 */
onMounted(() => {
  void loadVexflowEngraver().catch(() => {})
})

/** True while a session runs, count-in included. */
// @spec-link [[service_session_controller]]
const sessionActive = computed(
  () => props.controller !== null && props.controller.state.phase !== 'idle',
)

// What the musical controls show, and the preset status's announcement. Its watchers of a
// session's start and end are registered first, so each runs before the others of its flush.
const { controlsReadonly, shownSettings, presetStatusLive } = useShownSettings({
  idle: () => state.value,
  controller: () => props.controller,
  sessionActive: () => sessionActive.value,
})

// The "During a session" options and the player's changes to them.
const {
  sessionOptionsReadonly,
  varySettings,
  tensionAcrossPhrases,
  risingTempo,
  setRisingTempo: handleSetRisingTempo,
  setTensionAcrossPhrases: handleSetTensionAcrossPhrases,
  setVarySettings: handleSetVarySettings,
} = useSessionOptions({
  controller: () => props.controller,
  requireController,
  controlsReadonly: () => controlsReadonly.value,
  savedSessionOptions: () => props.savedSessionOptions,
})

const emit = defineEmits<{
  /**
   * The connection sheet opened or closed (also once at setup, closed), emitted synchronously
   * inside the change, so the workspace's flag never lags the sheet, its load included.
   */
  'connection-sheet-open-change': [open: boolean]
}>()

// The header's `controller-status` and the connection sheet it opens.
const {
  controllerStatus,
  connectionSheetOpen,
  sheetComponent,
  sheetProps,
  open: openConnectionSheet,
  close: closeConnectionSheet,
} = useControllerConnection({
  midi: props.midi,
  audio: props.audio,
  profile: () => getInstrumentProfile(state.value.controls.instrumentProfileId),
  sessionActive: () => sessionActive.value,
  controllerLost: () => props.controller !== null && props.controller.state.controllerLost !== null,
  onOpenChange: (open) => emit('connection-sheet-open-change', open),
})

defineExpose({
  /** True while the connection sheet is open (see `ConnectionSheetHost.connectionSheetOpen`). */
  connectionSheetOpen,
})

/** Intent: the loaded controller; a session action reaching here before it loads is a defect. */
function requireController(): SessionController {
  if (props.controller === null)
    throw new Error('workspace shell: the session controller is not loaded')
  return props.controller
}

/** Intent: one element of the mounted workspace, found by its class; it must be there. */
function workspacePart(selector: string): Element {
  const element = layoutRoot.value?.querySelector(selector) ?? null
  if (element === null) throw new Error(`workspace shell: ${selector} is not mounted`)
  return element
}

/**
 * Intent: the Start click, synchronously: close the volume popover, start the session (which
 * unlocks the audio and asks for the screen locks inside this click), then make the start's one
 * instant jump for the layout the session holds. Focus stays on the session action.
 */
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[req_landscape_phrase_workspace]]
function handleStartSession(): void {
  const controller = requireController()
  mixPopover.closeForSessionStart()
  workspaceFocus.clearLateRoomNotice()
  controller.start()
  const layout = controller.state.heldLayout
  if (layout === null) throw new Error('workspace shell: a started session holds no staff layout')
  if (layoutRoot.value === null) throw new Error('workspace shell: the workspace is not mounted')
  jumpForSessionStart(
    props.jumpView,
    {
      workspace: layoutRoot.value,
      cueRow: workspacePart('.session-cue-row'),
      staffViewport: workspacePart('.staff-viewport'),
    },
    layout,
  )
}

/** Intent: `Stop`, from the header or the phone's compact one. */
// @spec-link [[rule_stop_ends_session]]
function handleStopSession(): void {
  requireController().stop()
}

/**
 * Intent: the mounted header and score panel the focus moves reach. Their refs are only null once
 * the shell unmounts, and the focus watchers stop before that (see `useWorkspaceFocus`), so a
 * missing one here is a defect.
 */
function focusParts(): {
  readonly header: InstanceType<typeof WorkspaceHeader>
  readonly scorePanel: InstanceType<typeof ScorePanel>
} {
  if (header.value === null || scorePanel.value === null)
    throw new Error('workspace shell: a focus move ran with the header or score panel unmounted')
  return { header: header.value, scorePanel: scorePanel.value }
}

/** Intent: move focus to the element a focus target names, in the mounted header or score panel. */
function focusTarget(target: SessionEndFocusTarget): void {
  const parts = focusParts()
  if (target === 'room-notice') parts.scorePanel.focusRoomNotice()
  else if (target === 'phrase-action') parts.header.focusPhraseAction()
  else if (target === 'controller-status') parts.header.focusControllerStatus()
  else parts.header.focusSessionAction()
}

// Where focus goes at a session's end, when a late room notice lands, and when the sheet closes.
// Its watcher of a session's end is registered after the preset status's, so it runs after it.
const workspaceFocus = useWorkspaceFocus({
  controller: requireController,
  idle: () => state.value,
  sessionActive: () => sessionActive.value,
  connectionSheetOpen: () => connectionSheetOpen.value,
  mixPopover,
  focusTarget,
  focusRoomNotice: () => focusParts().scorePanel.focusRoomNotice(),
  focusAfterConnectionSheet: () => focusParts().header.focusAfterConnectionSheet(),
})

// The Review's moves: `Close review`, `Review last session`, and a start from a focused review-link.
const reviewNavigation = useReviewNavigation({
  controller: requireController,
  idle: () => state.value,
  sessionActive: () => sessionActive.value,
  header: () => focusParts().header,
  scrollToPageTop: () => props.scrollToPageTop(),
  focusReviewTitle: () => focusParts().scorePanel.focusReviewTitle(),
  focusTarget,
})

/** Intent: an Idle operation starting settles the end's landing: no late notice takes focus. */
watch(
  () => state.value.operation,
  (operation) => {
    if (operation !== 'idle') workspaceFocus.clearLateRoomNotice()
  },
)

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
  <main ref="layoutRoot" class="layout-app" aria-labelledby="workspace-title">
    <WorkspaceHeader
      ref="header"
      :session="session"
      :controller="controller"
      :controller-status="controllerStatus.form.value"
      @start-session="handleStartSession"
      @stop-session="handleStopSession"
      @close-review="reviewNavigation.closeReview"
      @open-connection-sheet="openConnectionSheet"
    />
    <div class="layout-workspace">
      <ScorePanel
        ref="scorePanel"
        :session="session"
        :pending-phrase="pendingPhrase"
        :handle-engraved="handleEngraved"
        :handle-notation-error="handleNotationError"
        :handle-session-staff-failed="handleSessionStaffFailed"
        :handle-layout-inputs="handleLayoutInputs"
        :audio="audio"
        :mix-popover="mixPopover"
        :controller="controller"
        :system-position-units="systemPositionUnits"
        :saved-review-preferences="savedReviewPreferences"
        @stop-session="handleStopSession"
        @show-review="reviewNavigation.showReview"
      />
      <ControlPanel
        :controls="shownSettings.controls"
        :profile-selection="shownSettings.profileSelection"
        :readonly="controlsReadonly"
        :note-density-context="state.noteDensityContext"
        :rising-tempo="risingTempo.on.value"
        :rising-tempo-available="risingTempo.available.value"
        :last-session-reached-tempo="risingTempo.lastSessionReachedTempo.value"
        :tension-across-phrases="tensionAcrossPhrases"
        :vary-settings="varySettings"
        :session-options-readonly="sessionOptionsReadonly"
        :preset-status-live="presetStatusLive"
        @set-control="handleSetControl"
        @select-instrument-profile="handleSelectInstrumentProfile"
        @select-musical-profile="handleSelectMusicalProfile"
        @set-rising-tempo="handleSetRisingTempo"
        @set-tension-across-phrases="handleSetTensionAcrossPhrases"
        @set-vary-settings="handleSetVarySettings"
      />
    </div>
  </main>
  <component
    :is="sheetComponent"
    v-if="sheetComponent !== null && sheetProps !== null"
    v-bind="sheetProps"
    @close="closeConnectionSheet"
  />
  <OrientationNotice />
</template>
