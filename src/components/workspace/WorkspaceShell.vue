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
 * refused saves the notice row tells.
 */
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'

import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import ControlPanel from '@/components/controls/ControlPanel.vue'
import type { SettableControlKey } from '@/components/controls/set-control-event'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { FigureId, FigureLevel } from '@/domain/figures/figure-levels'
import type { PresetId } from '@/domain/presets/preset-selection'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { NotationError } from '@/notation/notation-error'
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

// What the musical controls show, and the session's start settings for the preset bar.
const { controlsReadonly, shownSettings, startSettings } = useShownSettings({
  idle: () => state.value,
  controller: () => props.controller,
  sessionActive: () => sessionActive.value,
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
  saveSettings: injectSaveSettings(),
})

const emit = defineEmits<{
  /**
   * The connection sheet, the My instrument sheet, the Your data sheet or the preset sheet opened
   * or closed (also once at setup, closed): whether any is open, emitted synchronously inside the
   * change, so the workspace's flag, which keeps a MIDI note from starting a session, never lags
   * the sheets.
   */
  'connection-sheet-open-change': [open: boolean]
}>()

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
  if (requireController().start() === 'started') jumpAfterStart()
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

/** Intent: forward one control-group's validated set-control event onto the session's own action. */
function handleSetControl<K extends SettableControlKey>(payload: {
  readonly key: K
  readonly value: GenerationControls[K]
}): void {
  props.session.actions.setControl(payload.key, payload.value)
}

/**
 * Intent: forward a figure level change onto the session's one figure-level action, which makes
 * Custom and, through the queue's key, discards the pre-generated phrases; the phrase on screen
 * stays.
 */
// @spec-link [[module_figure_level_options]]
// @spec-link [[rule_custom_selection]]
function handleSetFigureLevel(payload: {
  readonly figure: FigureId
  readonly level: FigureLevel
}): void {
  props.session.actions.setFigureLevel(payload.figure, payload.level)
}

/** Intent: forward an instrument-profile selection onto the session's dedicated action. */
function handleSelectInstrumentProfile(id: GenerationControls['instrumentProfileId']): void {
  void props.session.actions.selectInstrumentProfile(id)
}

/** Intent: forward a preset choice onto the session's own action; the phrase on screen stays. */
// @spec-link [[rule_choosing_preset_sets_its_settings]]
function handleSelectPreset(id: PresetId): void {
  props.session.actions.selectPreset(id)
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
      <AppNoticeRow
        v-if="appNotice !== null"
        :notice="appNotice"
        :disabled="appNoticeActionsDisabled"
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
        @stop-session="handleStopSession"
        @show-review="reviewNavigation.showReview"
        @show-sessions="reviewNavigation.showSessions"
        @scroll-to-top="props.scrollToPageTop()"
      />
      <ControlPanel
        :controls="shownSettings.controls"
        :figure-levels="shownSettings.figureLevels"
        :selection="shownSettings.selection"
        :presets="state.presets"
        :readonly="controlsReadonly"
        :note-density-context="state.noteDensityContext"
        :rising-tempo="risingTempo.on.value"
        :rising-tempo-available="risingTempo.available.value"
        :last-session-reached-tempo="risingTempo.lastSessionReachedTempo.value"
        :tension-across-phrases="tensionAcrossPhrases"
        :vary-settings="varySettings"
        :session-options-readonly="sessionOptionsReadonly"
        :start-settings="startSettings"
        :my-instrument="state.myInstrument"
        :instrument-actions-disabled="controlsReadonly || state.operation !== 'idle'"
        :preset-actions="presetSheet.row.value"
        :preset-actions-disabled="sessionActive"
        @open-my-instrument="myInstrumentSheet.open"
        @preset-action="presetSheet.act"
        @set-control="handleSetControl"
        @set-figure-level="handleSetFigureLevel"
        @select-instrument-profile="handleSelectInstrumentProfile"
        @select-preset="handleSelectPreset"
        @set-rising-tempo="handleSetRisingTempo"
        @set-tension-across-phrases="handleSetTensionAcrossPhrases"
        @set-vary-settings="handleSetVarySettings"
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
