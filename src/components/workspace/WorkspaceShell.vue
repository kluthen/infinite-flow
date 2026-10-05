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
 * settings` and `Rising tempo` choices go to the controller; during a session the tempo control
 * shows the exact tempo in effect, and the tempo field notes the tempo a rising-tempo session
 * reached (./use-rising-tempo-control.ts).
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import ControlPanel from '@/components/controls/ControlPanel.vue'
import type { SettableControlKey } from '@/components/controls/set-control-event'
import type { GenerationControls, MusicalProfile } from '@/domain/controls/generation-controls'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { NotationError } from '@/notation/notation-error'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { AudioTransport } from '@/audio/audio-transport'
import { loadConnectionSheet } from '@/components/controller-connection/load-connection-sheet'
import { getInstrumentProfile } from '@/domain/generation/generation-intent'
import type { MidiController } from '@/midi/midi-controller-state'
import { loadVexflowEngraver } from '@/notation/vexflow-engraver-loader'
import WorkspaceHeader from './WorkspaceHeader.vue'
import ScorePanel from './ScorePanel.vue'
import OrientationNotice from './OrientationNotice.vue'
import { createMixVolumePopover } from './mix-volume-popover'
import { jumpForSessionStart, type SessionJumpView } from './session-start-jump'
import {
  awaitsLateRoomNotice,
  sessionEndFocusTarget,
  type SessionEndFocusTarget,
} from './session-end-focus'
import type { SessionController } from './workspace-session-controller-types'
import { useConnectionSheet } from './use-connection-sheet'
import { useControllerStatus } from './use-controller-status'
import { useReviewNavigation } from './use-review-navigation'
import { useRisingTempoControl } from './use-rising-tempo-control'

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
  }>(),
  {
    // Default: the window's own instant scroll, measured against the layout viewport's height.
    jumpView: () => ({
      scrollBy: (options: Parameters<SessionJumpView['scrollBy']>[0]) => window.scrollBy(options),
      viewportBlockSize: () => document.documentElement.clientHeight,
    }),
    // Default: the window's own instant scroll to its top (a function prop's default is itself).
    scrollToPageTop: () => window.scrollTo({ top: 0, behavior: 'instant' }),
  },
)

const state = computed(() => props.session.state)

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

/**
 * Warm the lazy connection sheet chunk once the workspace mounts, so a `controller-status` click
 * opens it without waiting on its fetch. A failure here is not reported: the click retries the same
 * memoized loader, and a failure then propagates.
 */
onMounted(() => {
  void loadConnectionSheet().catch(() => {})
})

/**
 * The element a window end moved focus to, while Needs more room may still land late (see
 * `awaitsLateRoomNotice`); null otherwise. Cleared when the notice lands, at the next start, and
 * when an Idle operation starts.
 */
let lateRoomNoticeFrom: Element | null = null

/** True while a session runs, count-in included. */
// @spec-link [[service_workspace_session_flow]]
const sessionActive = computed(
  () => props.controller !== null && props.controller.state.phase !== 'idle',
)

/**
 * Every musical control, tempo included, is read-only for the whole lifetime of any Idle
 * operation and of a session, through the same read-only treatment (values at full contrast).
 */
// @spec-link [[rule_session_settings_locked]]
// @spec-link [[rule_readonly_controls_keep_contrast]]
const controlsReadonly = computed(() => state.value.operation !== 'idle' || sessionActive.value)

/**
 * The "During a session" options take the same read-only treatment, and stay read-only while the
 * controller, which holds them, is still loading.
 */
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[rule_readonly_controls_keep_contrast]]
const sessionOptionsReadonly = computed(() => controlsReadonly.value || props.controller === null)

/** The page's `Vary settings` flag, off while the controller loads (as it is at page load). */
// @spec-link [[req_settings_mutation_flag]]
const varySettings = computed(() => props.controller?.state.varySettings ?? false)

/** The `Rising tempo` control and the reached-tempo note, read from the controller. */
// @spec-link [[req_adaptive_tempo]]
const risingTempo = useRisingTempoControl(() => props.controller)

/**
 * The settings the controls show: during a session, those the controller says the phrase now
 * sounding was generated with, at the exact tempo in effect (off the tempo control's list once a
 * rising tempo has moved it); otherwise the player's own, which a session never writes, so every
 * end shows the starting tempo again.
 */
// @spec-link [[rule_automatic_change_updates_controls_quietly]]
// @spec-link [[rule_mutation_reverts_at_session_end]]
// @spec-link [[rule_adaptive_tempo_resets_after_session]]
const shownSettings = computed(() => {
  const session = props.controller?.state.shownSettings ?? null
  if (session === null)
    return { controls: state.value.controls, profileSelection: state.value.profileSelection }
  const tempo = props.controller?.state.sessionTempo ?? null
  if (tempo === null) throw new Error('workspace shell: a session shows settings but no tempo')
  return { controls: { ...session.controls, tempo }, profileSelection: session.musicalProfile }
})

/**
 * The preset status's live announcement: off from a session's start, before its count-in renders
 * (a sync watcher), so no automatic change is announced; polite again only once the screen has
 * rendered the player's own values back at its end (a post-flush watcher), so neither is the
 * return.
 */
// @spec-link [[rule_automatic_change_updates_controls_quietly]]
const presetStatusLive = ref<'polite' | 'off'>('polite')
watch(
  sessionActive,
  (active) => {
    if (active) presetStatusLive.value = 'off'
  },
  { flush: 'sync' },
)
watch(
  sessionActive,
  (active, wasActive) => {
    if (!active && wasActive) presetStatusLive.value = 'polite'
  },
  { flush: 'post' },
)

const emit = defineEmits<{
  /**
   * The connection sheet opened or closed (also once at setup, closed), emitted synchronously
   * inside the change, so the workspace's flag never lags the sheet, its load included.
   */
  'connection-sheet-open-change': [open: boolean]
}>()

// The header's `controller-status`, frozen at its form while a session runs, except that it shows
// the disconnected badge while a lost controller's countdown runs.
// @spec-link [[rule_same_controller_reattaches]]
// @spec-link [[rule_controller_loss_mid_session]]
const controllerStatus = useControllerStatus(
  props.midi,
  () => sessionActive.value,
  () => props.controller !== null && props.controller.state.controllerLost !== null,
)

// @spec-link [[rule_controller_connects_between_sessions]]
const {
  connectionSheetOpen,
  sheetComponent,
  sheetProps,
  open: openConnectionSheet,
  close: closeConnectionSheet,
} = useConnectionSheet({
  midi: props.midi,
  audio: props.audio,
  status: controllerStatus,
  profile: () => getInstrumentProfile(state.value.controls.instrumentProfileId),
  sessionActive: () => sessionActive.value,
})

/**
 * Intent: report the sheet's open flag to the workspace at once, synchronously, at every change:
 * a MIDI note can arrive right after the click, and none may start a session while it is open.
 */
// @spec-link [[rule_controller_connects_between_sessions]]
// @spec-link [[rule_midi_starting_note]]
watch(connectionSheetOpen, (open) => emit('connection-sheet-open-change', open), {
  flush: 'sync',
  immediate: true,
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
  lateRoomNoticeFrom = null
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
 * the shell unmounts, and the focus watchers below stop before that (see `onBeforeUnmount`), so a
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

/**
 * Intent: move focus where the session's end sends it, once the Idle rules have applied and the
 * screen shows the state they reached (called after the render, so the Idle state read here is
 * the one on screen); after a window end, remember where it went, for a room notice that lands
 * late.
 */
// @spec-link [[rule_count_in_ending_returns_to_idle]]
function focusAfterSessionEnd(): void {
  const end = requireController().state.lastEnd
  if (end === null) throw new Error('workspace shell: a session ended with no end summary')
  const target = sessionEndFocusTarget(end, state.value)
  focusTarget(target)
  lateRoomNoticeFrom = awaitsLateRoomNotice(end, target) ? document.activeElement : null
}

/**
 * Intent: at every session end, close a volume popover the compact `Volume` opened, then, once
 * the screen has rendered the Idle state it ends in (a post-flush watcher), move focus.
 */
// @spec-link [[rule_stop_ends_session]]
const stopEndFocusWatch = watch(
  sessionActive,
  (active, wasActive) => {
    if (active || !wasActive) return
    mixPopover.closeIfOpenedBy('compact')
    focusAfterSessionEnd()
  },
  { flush: 'post' },
)

/**
 * Intent: when Needs more room lands, rendered, after a window end's focus move, move focus once
 * to `room-notice`, unless the player has moved it since (it is still where the end put it, or
 * lost to the page because the notice disabled that button).
 */
// @spec-link [[rule_count_in_ending_returns_to_idle]]
// @spec-link [[rule_session_ends_when_staff_too_small]]
const stopLateNoticeWatch = watch(
  () => state.value.roomNotice,
  (notice) => {
    const from = lateRoomNoticeFrom
    if (notice === null || from === null) return
    lateRoomNoticeFrom = null
    const active = document.activeElement
    if (active !== from && active !== document.body && active !== null) return
    focusParts().scorePanel.focusRoomNotice()
  },
  { flush: 'post' },
)

/**
 * Intent: once the connection sheet has closed, by any path, and the page has rendered without
 * it, move focus to the first enabled of the session action, the phrase action and
 * `controller-status`.
 */
// @spec-link [[rule_controller_connects_between_sessions]]
const stopSheetCloseFocusWatch = watch(
  connectionSheetOpen,
  (open, wasOpen) => {
    if (open || !wasOpen) return
    focusParts().header.focusAfterConnectionSheet()
  },
  { flush: 'post' },
)

/**
 * Intent: a session that ends, a room notice that lands, or a sheet that closes while the shell
 * unmounts moves no focus: the page it would go to is going away. The focus watchers stop here,
 * while the header and score panel are still mounted (Vue would stop them a step later anyway;
 * stopping them here makes it explicit), so none ever runs without them.
 */
onBeforeUnmount(() => {
  stopEndFocusWatch()
  stopLateNoticeWatch()
  stopSheetCloseFocusWatch()
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
    if (operation !== 'idle') lateRoomNoticeFrom = null
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

/** Intent: forward the player's `Rising tempo` choice to the controller, which holds it. */
// @spec-link [[req_adaptive_tempo]]
function handleSetRisingTempo(on: boolean): void {
  requireController().setAdaptiveTempo(on)
}

/** Intent: forward the player's `Vary settings` choice to the controller, which holds it. */
// @spec-link [[req_settings_mutation_flag]]
function handleSetVarySettings(on: boolean): void {
  requireController().setVarySettings(on)
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
        :vary-settings="varySettings"
        :session-options-readonly="sessionOptionsReadonly"
        :preset-status-live="presetStatusLive"
        @set-control="handleSetControl"
        @select-instrument-profile="handleSelectInstrumentProfile"
        @select-musical-profile="handleSelectMusicalProfile"
        @set-rising-tempo="handleSetRisingTempo"
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
