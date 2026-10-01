<script setup lang="ts">
/**
 * The phrase-workspace layout root: composes the header, the score panel, the below-score control
 * sheet, and the portrait guard around one already-constructed session. Owns no session state
 * itself -- it only forwards `ControlPanel`'s typed events onto the session's own actions, exactly
 * as the parallel controls-work contract defines them. It also builds the one volume popover of
 * the audio mix, which the toolbar's and the phone's compact `Volume` share and a session's start
 * and end close. It runs the screen's side of a practice session over the session controller:
 * the Start click (popover closed, session started, the one jump), Stop, the musical controls
 * locked while a session runs, and where focus goes when it ends.
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
import { loadVexflowEngraver } from '@/notation/vexflow-engraver-loader'
import WorkspaceHeader from './WorkspaceHeader.vue'
import ScorePanel from './ScorePanel.vue'
import OrientationNotice from './OrientationNotice.vue'
import { createMixVolumePopover } from './mix-volume-popover'
import { jumpForSessionStart, type SessionJumpView } from './session-start-jump'
import { awaitsLateRoomNotice, sessionEndFocusTarget } from './session-end-focus'
import type { SessionController } from './workspace-session-controller-types'

const props = withDefaults(
  defineProps<{
    session: GenerationSession<WorkspaceSessionResult>
    pendingPhrase: WrittenPhrase | null
    handleEngraved: () => void
    handleNotationError: (error: NotationError) => void
    handleLayoutInputs: (inputs: StaffLayoutInputs) => void
    audio: AudioTransport
    /** The session controller; null while its lazy chunk loads (no session can start then). */
    controller: SessionController | null
    /** How the start's jump scrolls and measures the window; the window itself by default. */
    jumpView?: SessionJumpView
  }>(),
  // Default: the window's own instant scroll, measured against the layout viewport's height.
  {
    jumpView: () => ({
      scrollBy: (options: Parameters<SessionJumpView['scrollBy']>[0]) => window.scrollBy(options),
      viewportBlockSize: () => document.documentElement.clientHeight,
    }),
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
  const parts = focusParts()
  if (target === 'room-notice') parts.scorePanel.focusRoomNotice()
  else if (target === 'phrase-action') parts.header.focusPhraseAction()
  else parts.header.focusSessionAction()
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
 * Intent: a session that ends, or a room notice that lands, while the shell unmounts moves no
 * focus: the page it would go to is going away. The two focus watchers stop here, while the
 * header and score panel are still mounted (Vue would stop them a step later anyway; stopping
 * them here makes it explicit), so neither ever runs without them.
 */
onBeforeUnmount(() => {
  stopEndFocusWatch()
  stopLateNoticeWatch()
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
      @start-session="handleStartSession"
      @stop-session="handleStopSession"
    />
    <div class="layout-workspace">
      <ScorePanel
        ref="scorePanel"
        :session="session"
        :pending-phrase="pendingPhrase"
        :handle-engraved="handleEngraved"
        :handle-notation-error="handleNotationError"
        :handle-layout-inputs="handleLayoutInputs"
        :audio="audio"
        :mix-popover="mixPopover"
        :controller="controller"
        @stop-session="handleStopSession"
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
