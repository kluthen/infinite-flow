<script setup lang="ts">
/**
 * The phrase-workspace layout root: composes the header, the score panel, the below-score control
 * sheet, and the portrait guard around one already-constructed session. Owns no session state
 * itself -- it only forwards `ControlPanel`'s typed events onto the session's own actions, exactly
 * as the parallel controls-work contract defines them. It also builds the one volume popover of the
 * audio mix, which the toolbar's and the phone's compact `Volume` share and a session's start and
 * end close. It runs the screen's side of a practice session over the session controller: the Start
 * click (popover closed, session started, the one jump), Stop, the musical controls locked while a
 * session runs, and where focus goes when it ends. A stale phrase 1 has Start, or the starting
 * note, open the stale-phrase prompt instead (./StalePhrasePrompt.vue, loaded on demand), whose
 * `Start with this phrase` takes the same start and jump. It also hosts the controller connection: the
 * header `controller-status` it feeds, the click that opens the lazily loaded connection sheet,
 * whether the sheet is open (reported to the workspace as it changes), where focus goes when
 * the sheet closes, and the sheet's confirmed `Use for my instrument` (or `Use and erase`), saved
 * and selected through the My instrument sheet's host with the kept sessions of my instrument the
 * controller counts. It also runs the last session's Review from the screen: `Close review` and
 * `Review last session`, each scrolling the page to its top and moving focus. While a session runs,
 * the read-only controls show what the controller says the phrase now sounding was generated with,
 * the preset bar's description line keeping the text of the session's start settings, and nothing
 * is announced; at the end they show the player's own choices again. The page's `Vary settings`,
 * `Tension across phrases` and `Rising tempo` choices go to the controller and, once it accepts
 * them, are saved; the Tension control never shows a phrase's step across phrases. During a
 * session the tempo control shows the exact tempo in effect, and the tempo field notes the tempo a
 * rising-tempo session reached (./use-rising-tempo-control.ts). It sets the staff's one shared
 * system-position size from the saved my instrument's written range, for the staff and the Review
 * alike. The saved review preferences and "During a session" choices it is given are where the
 * Review's export choices and the options (while the controller loads) start from. It shows the
 * notice row over the load's outcome and save policy, and the reports of the deletions of damaged
 * kept sessions it is given (./use-app-notices.ts): `Dismiss` sends focus to the first enabled
 * of the session action, the phrase action and `controller-status`; `Reload` reloads the page. It
 * ends with the page footer and hosts the Your data sheet (./use-your-data.ts), opened from the
 * footer, the session list's header and the storage-full notice, loaded on demand. It hosts the
 * preset bar's actions and the preset sheet (./use-preset-sheet.ts), loaded on demand, whose
 * refused saves the notice row tells. It holds the workspace's mode (./use-workspace-mode.ts),
 * session mode at every load: the header's mode switch changes it, Jam's view takes the staff's
 * place while Jam mode shows, and while Jam mode opens the controls are read-only and both header
 * actions disabled; whether session mode is held is reported to the workspace as it changes. A
 * failed opening shows Jam's load-failure notice in the notice row, focus on its `Try again`
 * unless a sheet is open, when focus stays in the sheet.
 * Jam's view is given Jam's own written key and collection (./use-jam-settings.ts), the shared
 * instrument and the shared system-position size; the shell keeps what Jam's staff shows, for
 * the header's `Retry notation`, which has Jam's staff engraved again. Jam's view is also given
 * the prewarm port (none while the prewarm policy is off) and Jam's controls and figure levels, for
 * Jam's Idle prewarm. While Jam mode shows, Jam's controls (Jam's code) take the control panel's
 * place, showing Jam's own settings, each change saved by Jam's code, and the shared instrument,
 * read-only as session mode's are; their doodle readings stay empty until a doodle can be kept.
 * Session mode's instrument switches are held while Jam mode opens or shows: an
 * instrument changed there is applied to session mode as a switch on returning. In Jam mode the cue row holds Jam's Idle cue
 * (./use-jam-idle-cue.ts): the home note while a fresh Jam could start, or `jam-needs-controller`
 * without a connected controller, which `Start Jam` names.
 */
import { computed, defineAsyncComponent, nextTick, onMounted, ref, watch } from 'vue'

import type { PostPrewarm } from '@/composables/generation-session-prewarm'
import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import ControlPanel from '@/components/controls/ControlPanel.vue'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { NotationError } from '@/notation/notation-error'
import type { JamControlsProps, JamStaffState, JamWorkspaceProps } from '@/jam/jam-view-types'
import type { JamSettingsChange } from '@/jam/jam-settings'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { AudioTransport } from '@/audio/audio-transport'
import type { SavedDataLoad } from '@/storage-bootstrap'
import { selectedInstrumentProfile } from '@/domain/generation/generation-intent'
import { instrumentClefOf } from '@/domain/profile/instrument-clef'
import type { MidiController } from '@/midi/midi-controller-state'
import { planSystemPositionUnits, type WrittenRangeInClef } from '@/notation/notation-layout-policy'
import { loadVexflowEngraver } from '@/notation/vexflow-engraver-loader'
import {
  DEFAULT_REVIEW_PREFERENCES,
  DEFAULT_SESSION_OPTIONS,
  type ReviewPreferences,
  type SessionOptionChoices,
} from '@/storage/records/setting-defaults'
import AppNoticeRow from './AppNoticeRow.vue'
import LayoutFooter from './LayoutFooter.vue'
import WorkspaceHeader from './WorkspaceHeader.vue'
import ScorePanel from './ScorePanel.vue'
import OrientationNotice from './OrientationNotice.vue'
import { createMixVolumePopover } from './mix-volume-popover'
import { jumpForSessionStart, type SessionJumpView } from './session-start-jump'
import type { SessionEndFocusTarget } from './session-end-focus'
import type { SessionController } from './workspace-session-controller-types'
import {
  useControllerConnection,
  type RememberedControllerStore,
} from './use-controller-connection'
import { useControlPanelActions } from './use-control-panel-actions'
import { useReviewNavigation } from './use-review-navigation'
import { useSessionOptions } from './use-session-options'
import { injectSaveSettings } from './save-settings-injection'
import { createRefusedPresetSaves, useAppNotices } from './use-app-notices'
import type { DamagedSessionReports } from './workspace-kept-sessions-seam'
import { useShownSettings } from './use-shown-settings'
import { useWorkspaceFocus } from './use-workspace-focus'
import { useMyInstrumentSheet } from './use-my-instrument-sheet'
import { usePresetSheet, type PresetStore } from './use-preset-sheet'
import { useYourData } from './use-your-data'
import { loadJamMode } from './load-jam-mode'
import { useWorkspaceMode } from './use-workspace-mode'
import { useJamIdleCue } from './use-jam-idle-cue'
import { useJamSettings } from './use-jam-settings'
import { useFreshJam } from './use-fresh-jam'
import { freshJamCanStart, type FreshJamStartFacts } from './session-action-policy'
import type { HeldModeNoteRoute } from './workspace-session-midi'

// The stale-phrase prompt, in its own chunk: only a stale phrase 1 at a start needs it.
const StalePhrasePrompt = defineAsyncComponent(() => import('./StalePhrasePrompt.vue'))

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
    /** The load's outcome and the visit's save policy, which the notice row reads. */
    savedData: Pick<SavedDataLoad, 'outcome' | 'savePolicy'>
    /** The controller remembered from an earlier visit, and its saves; reselected at setup. */
    rememberedController: RememberedControllerStore
    /** Where the player presets are kept: their saves and a new one's id source. */
    presetStore: PresetStore
    /**
     * The reports of the deletions of damaged kept sessions, which the notice row apologises for
     * or tells refused; none by default.
     */
    damagedSessionReports?: DamagedSessionReports | null
    /** Reload the page (a notice's `Reload`); the window's own by default. */
    reloadPage?: () => void
    /** How the start's jump scrolls and measures the window; the window itself by default. */
    jumpView?: SessionJumpView
    /** Scroll the page instantly to its top (leaving or reopening the Review); the window's own by default. */
    scrollToPageTop?: () => void
    /**
     * The saved my instrument's written range in its clef, or null while none is saved; none by
     * default.
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
    /** The generation worker's prewarm port, for Jam's Idle prewarm; none (the default) when off. */
    prewarm?: PostPrewarm | null
    /** Jam's settings records as the load handed them, undecoded; none by default. */
    jamSettingsRecords?: readonly unknown[]
  }>(),
  {
    // Default: the window's own instant scroll, measured against the layout viewport's height.
    jumpView: () => ({
      scrollBy: (options: Parameters<SessionJumpView['scrollBy']>[0]) => window.scrollBy(options),
      viewportBlockSize: () => document.documentElement.clientHeight,
    }),
    // Default: the window's own instant scroll to its top (a function prop's default is itself).
    scrollToPageTop: () => window.scrollTo({ top: 0, behavior: 'instant' }),
    // Default: the window's own reload (a function prop's default is itself).
    reloadPage: () => window.location.reload(),
    savedMyInstrumentRangeInClef: null,
    damagedSessionReports: null,
    savedReviewPreferences: () => DEFAULT_REVIEW_PREFERENCES,
    savedSessionOptions: () => DEFAULT_SESSION_OPTIONS,
    prewarm: null,
    jamSettingsRecords: () => [],
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
const noticeRow = ref<InstanceType<typeof AppNoticeRow> | null>(null)

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

// What the musical controls show, and the session's start settings for the preset bar.
const { controlsReadonly, shownSettings, startSettings } = useShownSettings({
  idle: () => state.value,
  controller: () => props.controller,
  sessionActive: () => sessionActive.value,
})

const emit = defineEmits<{
  /**
   * The connection sheet, the My instrument sheet, the Your data sheet or the preset sheet opened
   * or closed (also once at setup, closed): whether any is open, emitted synchronously inside the
   * change, so the workspace's flag, which keeps a MIDI note from starting a session, never lags
   * the sheets.
   */
  'connection-sheet-open-change': [open: boolean]
  /**
   * Session mode's hold began or ended (also once at setup, not held): held while Jam mode opens
   * or shows, when it prepares nothing and no note starts a session; emitted synchronously inside
   * the change, so the workspace's flag never lags the mode.
   */
  'session-mode-held-change': [held: boolean]
  /**
   * The note route of Jam mode's Idle, emitted once at setup: what a controller note means there
   * (the home note, while a fresh Jam could start) and the fresh Jam it starts.
   */
  'held-mode-notes-change': [route: HeldModeNoteRoute | null]
  /**
   * What follows a start by session mode's starting note, emitted once at setup: the start's one
   * instant jump, which the session controller makes once the note has started the session.
   */
  'after-note-start-change': [afterStart: () => void]
}>()

/** True while the review mode shows: a Review, or the session list in its place. */
const reviewShowing = computed(
  () =>
    props.controller?.state.review?.showing === true ||
    props.controller?.state.listShowing === true,
)

/**
 * Intent: a failed opening of Jam mode sends focus to its notice's `Try again`, unless a sheet is
 * open as the wait ends: focus then stays in the sheet, the notice showing all the same.
 */
// @spec-link [[module_workspace_mode]]
function focusJamTryAgainOutsideSheets(): void {
  if (!anySheetOpen.value) requireNoticeRow().focusJamTryAgain()
}

// The workspace's mode: session mode at every load, Jam's code loaded on the first press of Jam.
// @spec-link [[module_workspace_mode]]
const workspaceMode = useWorkspaceMode({
  operationRunning: () => state.value.operation !== 'idle',
  sessionActive: () => sessionActive.value,
  reviewShowing: () => reviewShowing.value,
  load: loadJamMode,
  onHeldChange: (held) => {
    emit('session-mode-held-change', held)
    void props.session.actions.holdInstrumentSwitches(held)
  },
  onLoadFailed: () => void nextTick(focusJamTryAgainOutsideSheets),
})
/** The controls are read-only: during a session, as the session holds them, or while Jam opens. */
const settingsReadonly = computed(() => controlsReadonly.value || workspaceMode.opening.value)

// Jam's own settings, made the first time Jam mode shows in the visit.
// @spec-link [[module_workspace_mode]]
const jamSettings = useJamSettings({
  jamModule: () => workspaceMode.jamModule.value,
  jamShowing: () => workspaceMode.jamView.value !== null,
  records: () => props.jamSettingsRecords,
  sessionControls: () => state.value.controls,
  instrumentProfileId: () => state.value.controls.instrumentProfileId,
  saveSettings: injectSaveSettings(),
})

/** What Jam's staff shows while Jam mode shows (Start Jam's conditions read it); null otherwise. */
const jamStaffState = ref<JamStaffState | null>(null)
watch(workspaceMode.jamView, (view) => {
  if (view === null) jamStaffState.value = null
})

// A fresh Jam: its start, what it shows while it runs, and `jam-notice` after it.
// @spec-link [[module_workspace_mode]]
const freshJam = useFreshJam({
  jamModule: () => workspaceMode.jamModule.value,
  jamShowing: () => workspaceMode.jamView.value !== null,
  controller: requireController,
  settings: () => jamSettings.view.value,
  instrument: () => ({
    instrumentProfileId: state.value.controls.instrumentProfileId,
    myInstrument: state.value.myInstrument,
  }),
  lastEnd: () => props.controller?.state.lastEnd ?? null,
  jamStaffState: () => jamStaffState.value,
})

/**
 * What Jam's view is given: Jam's written key and collection, the shared instrument choice (my
 * instrument included), the shared system-position size, and what Jam's Idle prewarm reads: the
 * prewarm port and the controls and figure levels a Jam is generated with. Session mode's values
 * stand in only before Jam's settings exist, while Jam's view does not show.
 */
// @spec-link [[module_workspace_mode]]
const jamViewProps = computed<JamWorkspaceProps>(() => {
  const jam = jamSettings.view.value
  const controls = jam?.controls ?? state.value.controls
  return {
    tonalCenter: controls.tonalCenter,
    collection: controls.collection,
    instrumentProfileId: state.value.controls.instrumentProfileId,
    myInstrument: state.value.myInstrument,
    systemPositionUnits: systemPositionUnits.value,
    prewarm: props.prewarm,
    controls,
    figureLevels: jam?.figureLevels ?? state.value.figureLevels,
    notice: freshJam.noticeShown.value,
  }
})
/** Jam's controls while Jam mode shows with its settings made; null otherwise. */
// @spec-link [[module_workspace_mode]]
const jamControls = computed(() =>
  workspaceMode.jamView.value !== null && jamSettings.view.value !== null
    ? (workspaceMode.jamModule.value?.JamControls ?? null)
    : null,
)
/**
 * What Jam's controls are given: Jam's settings, the shared instrument, the controls' read-only
 * state and `instrument-actions`' as session mode's, and no doodle readings yet (none is kept).
 */
// @spec-link [[module_workspace_mode]]
const jamControlsProps = computed((): JamControlsProps | null => {
  const jam = jamSettings.view.value
  if (jam === null) return null
  return {
    settings: jam.settings,
    instrumentProfileId: state.value.controls.instrumentProfileId,
    myInstrument: state.value.myInstrument,
    readonly: settingsReadonly.value,
    instrumentActionsDisabled: settingsReadonly.value || state.value.operation !== 'idle',
    readings: freshJam.readings.value,
    belowTabletLandscape: state.value.noteDensityContext.belowTabletLandscape,
  }
})

// The player presets' refused saves, which the preset actions tell and the notice row hears.
const refusedPresetSaves = createRefusedPresetSaves()

// The notice row's notice, held still while a session runs.
const {
  notice: appNotice,
  actionsDisabled: appNoticeActionsDisabled,
  dismiss: dismissAppNotice,
} = useAppNotices({
  source: props.savedData,
  sessionActive: () => sessionActive.value,
  ...(props.damagedSessionReports === null ? {} : { damagedSessions: props.damagedSessionReports }),
  refusedPresetSaves,
})

// The "During a session" options and the player's changes to them.
const {
  sessionOptionsReadonly,
  varySettings,
  varySettingsAvailable,
  allowedGroups,
  rhythmLockOn,
  allowedRhythmChanges,
  tensionAcrossPhrases,
  risingTempo,
  setRisingTempo: handleSetRisingTempo,
  setTensionAcrossPhrases: handleSetTensionAcrossPhrases,
  setVarySettings: handleSetVarySettings,
  setAllowedGroups: handleSetAllowedGroups,
  setRhythmLockOn: handleSetRhythmLockOn,
  setAllowedRhythmChanges: handleSetAllowedRhythmChanges,
} = useSessionOptions({
  controller: () => props.controller,
  requireController,
  controlsReadonly: () => settingsReadonly.value,
  savedSessionOptions: () => props.savedSessionOptions,
  saveSettings: injectSaveSettings(),
})

// The My instrument sheet, opened by `instrument-actions`; focus returns to that button.
// @spec-link [[req_my_instrument]]
const myInstrumentSheet = useMyInstrumentSheet({
  session: props.session,
  sessions: () => props.controller?.myInstrumentSessions() ?? null,
  focusInstrumentActions: () => {
    const button = workspacePart('.instrument-actions button')
    if (button instanceof HTMLElement) button.focus()
  },
})
// The Your data sheet, opened from the footer, the session list's header and the storage-full
// notice; it returns focus to its opener itself, else to the workspace's fallback.
// @spec-link [[req_your_data]]
const yourData = useYourData(() => sessionActive.value)
// The preset bar's actions and the preset sheet; focus returns to its opener or the preset box.
const presetSheet = usePresetSheet({
  session: props.session,
  controllerPhase: () => props.controller?.state.phase ?? null,
  savedData: props.savedData,
  store: props.presetStore,
  tellRefusedSave: refusedPresetSaves.tell,
  root: () => layoutRoot.value,
})
let connectionSheetShown = false
/** Intent: tell the workspace whether any of its sheets is open now. */
function reportSheetsOpen(): void {
  const open =
    myInstrumentSheet.sheetOpen.value ||
    yourData.sheet.value !== null ||
    presetSheet.sheetOpen.value
  emit('connection-sheet-open-change', connectionSheetShown || open)
}
watch(myInstrumentSheet.sheetOpen, reportSheetsOpen)
watch(yourData.sheet, reportSheetsOpen, { flush: 'sync' })
watch(presetSheet.sheetOpen, reportSheetsOpen, { flush: 'sync' })

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
  profile: () =>
    selectedInstrumentProfile(state.value.controls.instrumentProfileId, state.value.myInstrument),
  clef: () => instrumentClefOf(state.value.controls.instrumentProfileId, state.value.myInstrument),
  myInstrument: () => state.value.myInstrument,
  sessionActive: () => sessionActive.value,
  controllerLost: () => props.controller !== null && props.controller.state.controllerLost !== null,
  onOpenChange: (open) => {
    connectionSheetShown = open
    reportSheetsOpen()
  },
  rememberedController: props.rememberedController,
})

/** True while any sheet is open: the connection, My instrument, Your data or preset sheet. */
const anySheetOpen = computed(
  () =>
    connectionSheetOpen.value ||
    myInstrumentSheet.sheetOpen.value ||
    yourData.sheet.value !== null ||
    presetSheet.sheetOpen.value,
)

/** Intent: the facts a fresh Jam's start is judged on, now. */
function jamStartFacts(): FreshJamStartFacts {
  return {
    controllerLoaded: props.controller !== null,
    controllerConnected: controllerStatus.form.value.kind === 'connected',
    sessionActive: sessionActive.value,
    reviewShowing: reviewShowing.value,
    sheetOpen: anySheetOpen.value,
    orientationNoticeShown: props.controller?.state.orientationNoticeShown === true,
    jamStaffShown: jamStaffState.value === 'shown',
  }
}

// Jam mode's Idle cue: the home note while a fresh Jam could start, or `jam-needs-controller`.
const jamIdleCue = useJamIdleCue({
  jamModule: () => workspaceMode.jamModule.value,
  jamShowing: () => workspaceMode.jamView.value !== null,
  settings: () => jamViewProps.value,
  startFacts: jamStartFacts,
  pageAwaitsClick: () =>
    props.controller?.state.pageActivated !== true && !props.audio.isUnlocked(),
})

/** `Start Jam` is enabled: Jam mode shows and a fresh Jam could start now. */
// @spec-link [[module_workspace_mode]]
const jamCanStart = computed(
  () => workspaceMode.jamView.value !== null && freshJamCanStart(jamStartFacts()),
)

/**
 * Intent: Jam mode's home note, played while a fresh Jam could start: the start `Start Jam` takes,
 * its one instant jump included (ux D452); focus stays where it is.
 */
// @spec-link [[module_workspace_mode]]
function handleJamHomeNote(): void {
  prepareStart()
  freshJam.start()
  jumpAfterStart()
}
emit('held-mode-notes-change', { meaningOf: jamIdleCue.meaningOf, start: handleJamHomeNote })
emit('after-note-start-change', jumpAfterStart)

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

/** Intent: what precedes a start inside its click: the volume popover closed, a late landing cleared. */
function prepareStart(): void {
  mixPopover.closeForSessionStart()
  workspaceFocus.clearLateRoomNotice()
}

/**
 * Intent: the Start click, synchronously: close the volume popover, start the session (which
 * unlocks the audio and asks for the screen locks inside this click), then make the start's one
 * instant jump for the layout the session holds. Focus stays on the session action. With a stale
 * phrase 1 nothing starts: the controller opens the stale-phrase prompt instead.
 */
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[req_landscape_phrase_workspace]]
function handleStartSession(): void {
  prepareStart()
  if (workspaceMode.jamView.value !== null) {
    freshJam.start()
    jumpAfterStart()
  } else if (requireController().start() === 'started') jumpAfterStart()
}

/**
 * Intent: the staff viewport the start's jump brings into place: in Jam mode Jam's own, which
 * shows `staff-jam`, else session mode's, the first in DOM order.
 */
function startStaffViewport(): Element {
  if (workspaceMode.jamView.value === null) return workspacePart('.staff-viewport')
  const viewports = layoutRoot.value?.querySelectorAll('.staff-viewport') ?? []
  const jam = [...viewports].find((viewport) => viewport.querySelector('.staff-jam') !== null)
  if (jam === undefined) throw new Error("workspace shell: Jam's staff viewport is not mounted")
  return jam
}

/** Intent: the start's one instant jump, for the layout the session just started holds. */
function jumpAfterStart(): void {
  const layout = requireController().state.heldLayout
  if (layout === null) throw new Error('workspace shell: a started session holds no staff layout')
  if (layoutRoot.value === null) throw new Error('workspace shell: the workspace is not mounted')
  jumpForSessionStart(
    props.jumpView,
    {
      workspace: layoutRoot.value,
      cueRow: workspacePart('.session-cue-row'),
      staffViewport: startStaffViewport(),
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
const workspaceFocus = useWorkspaceFocus({
  controller: requireController,
  idle: () => state.value,
  sessionActive: () => sessionActive.value,
  connectionSheetOpen: () => connectionSheetOpen.value,
  mixPopover,
  focusTarget,
  focusRoomNotice: () => focusParts().scorePanel.focusRoomNotice(),
  focusAfterConnectionSheet: () => focusParts().header.focusAfterConnectionSheet(),
  jamShowing: () => workspaceMode.jamView.value !== null,
  jamStaffState: () => jamStaffState.value,
})

// The review mode's moves: `Close review`, `Review last session`, `All sessions` from the cue row,
// and a start from a focused cue-row link.
const reviewNavigation = useReviewNavigation({
  controller: requireController,
  idle: () => state.value,
  sessionActive: () => sessionActive.value,
  header: () => focusParts().header,
  scrollToPageTop: () => props.scrollToPageTop(),
  focusReviewTitle: () => focusParts().scorePanel.focusReviewTitle(),
  focusTarget,
})

/**
 * Intent: move focus to the first enabled of the session action, the phrase action and
 * `controller-status` (the workspace's fallback order).
 */
function focusFallback(): void {
  const { header: shown } = focusParts()
  if (shown.sessionActionEnabled) focusTarget('session-action')
  else if (shown.phraseActionEnabled) focusTarget('phrase-action')
  else focusTarget('controller-status')
}

/** Intent: a change of one of Jam's settings at Idle: saved by Jam's code; `jam-notice` goes. */
// @spec-link [[module_workspace_mode]]
function handleJamSettingChange(change: JamSettingsChange): void {
  freshJam.settingChanged()
  jamSettings.change(change)
}

/** Intent: the instrument changed from Jam's controls: a change of a Jam setting too. */
function handleJamInstrumentChange(id: InstrumentProfileId): void {
  freshJam.settingChanged()
  controlPanelActions.selectInstrumentProfile(id)
}

/** Intent: the header's `Retry notation` in Jam mode: Jam's staff engraves its empty system again. */
// @spec-link [[module_workspace_mode]]
function handleRetryJamNotation(): void {
  if (scorePanel.value === null) throw new Error('workspace shell: the score panel is not mounted')
  scorePanel.value.retryJamNotation()
}

/** Intent: the mounted notice row; asking for it while it shows no notice is a defect. */
function requireNoticeRow(): InstanceType<typeof AppNoticeRow> {
  if (noticeRow.value === null) throw new Error('workspace shell: the notice row is not shown')
  return noticeRow.value
}

/** Intent: Jam's load-failure notice's `Dismiss`: the notice goes, focus to the fallback. */
// @spec-link [[module_workspace_mode]]
function handleDismissJamFailure(): void {
  workspaceMode.dismissFailure()
  focusFallback()
}

/** Intent: `Dismiss`: remove the notice, and move focus to the workspace's fallback. */
// @spec-link [[rule_failed_save_never_disturbs_session]]
function handleDismissAppNotice(): void {
  dismissAppNotice()
  focusFallback()
}

/** Intent: an Idle operation starting settles the end's landing: no late notice takes focus. */
watch(
  () => state.value.operation,
  (operation) => {
    if (operation !== 'idle') workspaceFocus.clearLateRoomNotice()
  },
)

// The control panel's setting events, forwarded onto the session's own actions.
const controlPanelActions = useControlPanelActions(props.session)
</script>

<template>
  <main ref="layoutRoot" class="layout-app" aria-labelledby="workspace-title">
    <WorkspaceHeader
      ref="header"
      :session="session"
      :controller="controller"
      :controller-status="controllerStatus.form.value"
      :workspace-mode="workspaceMode.view.value"
      :jam-staff-state="jamStaffState"
      :jam-needs-controller="jamIdleCue.needsController.value"
      :jam-can-start="jamCanStart"
      :jam-notice-shown="freshJam.noticeShown.value"
      @select-mode="workspaceMode.select"
      @retry-jam-notation="handleRetryJamNotation"
      @start-session="handleStartSession"
      @stop-session="handleStopSession"
      @close-review="reviewNavigation.closeReview"
      @open-connection-sheet="openConnectionSheet"
    />
    <div class="layout-workspace">
      <AppNoticeRow
        v-if="appNotice !== null || workspaceMode.loadFailed.value"
        ref="noticeRow"
        :notice="appNotice"
        :disabled="appNoticeActionsDisabled"
        :jam-load-failed="workspaceMode.loadFailed.value"
        @jam-try-again="workspaceMode.retry"
        @jam-dismiss="handleDismissJamFailure"
        @dismiss="handleDismissAppNotice"
        @reload="reloadPage"
        @your-data="yourData.open"
      />
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
        :jam-view="workspaceMode.jamView.value"
        :jam-view-props="jamViewProps"
        :jam-cue="jamIdleCue.cue.value"
        :jam-session="freshJam.cue.value"
        @jam-staff-state="jamStaffState = $event"
        @stop-session="handleStopSession"
        @show-review="reviewNavigation.showReview"
        @show-sessions="reviewNavigation.showSessions"
        @scroll-to-top="props.scrollToPageTop()"
      />
      <component
        :is="jamControls"
        v-if="jamControls !== null && jamControlsProps !== null"
        v-bind="jamControlsProps"
        @change="handleJamSettingChange"
        @select-instrument-profile="handleJamInstrumentChange"
        @open-my-instrument="myInstrumentSheet.open"
      />
      <ControlPanel
        v-else
        :controls="shownSettings.controls"
        :figure-levels="shownSettings.figureLevels"
        :selection="shownSettings.selection"
        :presets="state.presets"
        :readonly="settingsReadonly"
        :note-density-context="state.noteDensityContext"
        :rising-tempo="risingTempo.on.value"
        :rising-tempo-available="risingTempo.available.value"
        :last-session-reached-tempo="risingTempo.lastSessionReachedTempo.value"
        :tension-across-phrases="tensionAcrossPhrases"
        :vary-settings="varySettings"
        :vary-settings-available="varySettingsAvailable"
        :allowed-groups="allowedGroups"
        :rhythm-lock-on="rhythmLockOn"
        :allowed-rhythm-changes="allowedRhythmChanges"
        :session-options-readonly="sessionOptionsReadonly"
        :start-settings="startSettings"
        :my-instrument="state.myInstrument"
        :instrument-actions-disabled="settingsReadonly || state.operation !== 'idle'"
        :preset-actions="presetSheet.row.value"
        :preset-actions-disabled="sessionActive || workspaceMode.opening.value"
        @open-my-instrument="myInstrumentSheet.open"
        @preset-action="presetSheet.act"
        @set-control="controlPanelActions.setControl"
        @set-figure-level="controlPanelActions.setFigureLevel"
        @select-instrument-profile="controlPanelActions.selectInstrumentProfile"
        @select-preset="controlPanelActions.selectPreset"
        @set-rising-tempo="handleSetRisingTempo"
        @set-tension-across-phrases="handleSetTensionAcrossPhrases"
        @set-vary-settings="handleSetVarySettings"
        @set-allowed-groups="handleSetAllowedGroups"
        @set-rhythm-lock="handleSetRhythmLockOn"
        @set-allowed-rhythm-changes="handleSetAllowedRhythmChanges"
      />
    </div>
    <LayoutFooter
      :disabled="sessionActive || controller === null"
      @open-your-data="yourData.open"
    />
  </main>
  <component
    :is="sheetComponent"
    v-if="sheetComponent !== null && sheetProps !== null"
    v-bind="sheetProps"
    :my-instrument-sessions="myInstrumentSheet.sessions.value"
    :use-and-erase="myInstrumentSheet.useAndErase"
    @close="closeConnectionSheet"
    @use-for-my-instrument="myInstrumentSheet.useForMyInstrument"
  />
  <component
    :is="myInstrumentSheet.sheetComponent.value"
    v-if="
      myInstrumentSheet.sheetComponent.value !== null && myInstrumentSheet.sheetProps.value !== null
    "
    v-bind="myInstrumentSheet.sheetProps.value"
    @save="myInstrumentSheet.save"
    @close="myInstrumentSheet.close"
  />
  <component
    :is="yourData.sheet.value"
    v-if="yourData.sheet.value !== null && controller !== null"
    :controller="controller"
    :saved-data="savedData"
    :my-instrument="state.myInstrument"
    :presets="presetSheet.playerPresets"
    :midi="midi"
    :reload-page="reloadPage"
    :focus-fallback="focusFallback"
    @close="yourData.close"
  />
  <component
    :is="presetSheet.sheetComponent.value"
    v-if="presetSheet.sheetComponent.value !== null && presetSheet.sheetProps.value !== null"
    v-bind="presetSheet.sheetProps.value"
    @save-as-new="presetSheet.saveAsNew"
    @save-changes="presetSheet.saveChanges"
    @rename="presetSheet.rename"
    @close="presetSheet.close"
  />
  <StalePhrasePrompt
    v-if="controller?.state.stalePhrasePrompt"
    :controller="controller"
    :regenerate="session.actions.regenerate"
    :prepare-start="prepareStart"
    :after-start="jumpAfterStart"
    :focus-target="focusTarget"
    :focus-fallback="focusFallback"
  />
  <OrientationNotice />
</template>
