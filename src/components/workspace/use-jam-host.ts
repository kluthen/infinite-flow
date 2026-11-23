/**
 * The workspace shell's Jam host (./WorkspaceShell.vue): the workspace's mode
 * (./use-workspace-mode.ts), Jam's code loaded through `loadJamMode` on the first press of Jam, and
 * everything the shell wires over it, made in the shell's setup in this order: Jam's own settings
 * (./use-jam-settings.ts), what Jam's staff shows, the kept doodle (./use-kept-doodle-host.ts), its
 * phrase 1 (./use-kept-doodle-phrase.ts) and Jam's own pre-generation queue
 * (./use-jam-pregeneration.ts), a fresh Jam (./use-fresh-jam.ts), the Jam `Start Jam` starts
 * (./use-kept-doodle-jam.ts), Jam's tap tempo (./use-tap-tempo-host.ts), what Jam's view and
 * controls are given (./use-jam-view-props.ts), Jam mode's Idle cue (./use-jam-idle-cue.ts) and
 * the Jam ports with the kept doodle's bar (./use-jam-bar.ts); with the handlers of Jam's
 * controls, the header's `Retry notation` in Jam mode and Jam's load-failure notice. It returns
 * what the shell's template binds and what its other parts read.
 */
import { computed, nextTick, ref, watch, type ComputedRef, type Ref } from 'vue'

import type { PostPrewarm } from '@/composables/generation-session-prewarm'
import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { JamStaffState } from '@/jam/jam-view-types'
import type { JamSettingsChange } from '@/jam/jam-settings'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import type { AudioTransport } from '@/audio/audio-transport'
import { selectedInstrumentProfile } from '@/domain/generation/generation-intent'
import { injectSaveSettings } from './save-settings-injection'
import { loadJamMode } from './load-jam-mode'
import {
  useWorkspaceMode,
  type WorkspaceModeDependencies,
  type WorkspaceModeState,
} from './use-workspace-mode'
import { useJamIdleCue, type JamIdleCue } from './use-jam-idle-cue'
import { useJamSettings } from './use-jam-settings'
import { useFreshJam, type WorkspaceFreshJam } from './use-fresh-jam'
import { useKeptDoodleHost, type WorkspaceKeptDoodle } from './use-kept-doodle-host'
import { useTapTempoHost, type WorkspaceTapTempo } from './use-tap-tempo-host'
import {
  useJamViewProps,
  type JamViewPropsSeams,
  type WorkspaceJamViewProps,
} from './use-jam-view-props'
import {
  useKeptDoodlePhrase,
  type KeptDoodleGeneration,
  type WorkspaceKeptDoodlePhrase,
} from './use-kept-doodle-phrase'
import { useJamPregeneration } from './use-jam-pregeneration'
import type { JamPregenerationLoader } from './jam-pregeneration'
import { useKeptDoodleJam, type WorkspaceKeptDoodleJam } from './use-kept-doodle-jam'
import { useJamPortsAndBar, type JamBarView, type JamPortsAndBarSeams } from './use-jam-bar'
import type { FreshJamStartFacts } from './session-action-policy'
import type { SessionController } from './workspace-session-controller-types'

/** What the Jam host reaches of the shell, every reading current when called. */
export interface JamHostDependencies
  extends
    Pick<WorkspaceModeDependencies, 'sessionActive' | 'reviewShowing' | 'onHeldChange'>,
    Pick<JamPortsAndBarSeams, 'closeReview' | 'header'> {
  /** Session mode's Idle state: its controls, my instrument, its operation and figure levels. */
  readonly idle: () => GenerationSession<WorkspaceSessionResult>['state']
  /** The session controller; null while its lazy chunk loads. */
  readonly controller: () => SessionController | null
  /** The loaded controller; a session action reaching here before it loads is a defect. */
  readonly requireController: () => SessionController
  readonly audio: AudioTransport
  /** The generation worker's prewarm port, for Jam's Idle prewarm; null when off. */
  readonly prewarm: () => PostPrewarm | null
  /** Jam's settings records as the load handed them, undecoded. */
  readonly jamSettingsRecords: () => readonly unknown[]
  /** What Jam's phrase 1 from the kept doodle is generated with; null in a test. */
  readonly keptDoodleGeneration: KeptDoodleGeneration | null
  /** How Jam's own pre-generation queue is loaded; null in a test. */
  readonly jamPregeneration: JamPregenerationLoader | null
  /** The musical controls are read-only as a session holds them. */
  readonly controlsReadonly: () => boolean
  /** The shared instrument: the selected profile, and my instrument when one is saved. */
  readonly instrumentChoice: JamViewPropsSeams['instrument']
  /** The workspace's one shared system-position size. */
  readonly systemPositionUnits: () => number
  /** A sheet is open (the lexicon page counts as one). */
  readonly anySheetOpen: () => boolean
  /** `controller-status` shows a connected controller. */
  readonly controllerConnected: () => boolean
  /** Focus on the notice row's Jam `Try again`. */
  readonly focusJamTryAgain: () => void
  /** Focus on the workspace's fallback. */
  readonly focusFallback: () => void
  /** The mounted score panel, which engraves Jam's staff again; null once unmounted. */
  readonly scorePanel: () => { retryJamNotation: () => void } | null
  /** Session mode's instrument selection, which Jam's controls change too. */
  readonly selectInstrumentProfile: (id: InstrumentProfileId) => void
}

/** What the shell's template binds of its Jam host, and what its other parts read. */
export interface JamHost {
  readonly workspaceMode: WorkspaceModeState
  /** The controls are read-only: a session, Jam opening, the Loading of Jam's phrase 1. */
  readonly settingsReadonly: ComputedRef<boolean>
  /** What Jam's staff shows while Jam mode shows; null otherwise. Jam's view sets it. */
  readonly jamStaffState: Ref<JamStaffState | null>
  readonly keptDoodle: WorkspaceKeptDoodle
  readonly keptPhrase: WorkspaceKeptDoodlePhrase
  readonly freshJam: WorkspaceFreshJam
  readonly keptDoodleJam: WorkspaceKeptDoodleJam
  readonly jamTapTempo: WorkspaceTapTempo
  readonly jamViewProps: WorkspaceJamViewProps['view']
  readonly jamTempo: WorkspaceJamViewProps['tempo']
  readonly jamControls: WorkspaceJamViewProps['controls']
  readonly jamControlsProps: WorkspaceJamViewProps['controlsProps']
  readonly jamIdleCue: JamIdleCue
  /** The kept doodle's bar; null while Jam's code is not loaded or no doodle is kept. */
  readonly jamBar: ComputedRef<JamBarView | null>
  readonly handleJamSettingChange: (change: JamSettingsChange) => void
  readonly handleJamInstrumentChange: (id: InstrumentProfileId) => void
  readonly handleRetryJamNotation: () => void
  readonly handleDismissJamFailure: () => void
}

/** The workspace's Jam over the shell, as its setup makes it. */
export function useJamHost(deps: JamHostDependencies): JamHost {
  /**
   * A failed opening of Jam mode sends focus to its notice's `Try again`, unless a sheet is
   * open as the wait ends: focus then stays in the sheet, the notice showing all the same.
   */
  // @spec-link [[module_workspace_mode]]
  function focusJamTryAgainOutsideSheets(): void {
    if (!deps.anySheetOpen()) deps.focusJamTryAgain()
  }

  // The workspace's mode: session mode at every load, Jam's code loaded on the first press of Jam.
  // @spec-link [[module_workspace_mode]]
  const workspaceMode = useWorkspaceMode({
    operationRunning: () => deps.idle().operation !== 'idle' || jamPhraseRunning.value,
    sessionActive: deps.sessionActive,
    reviewShowing: deps.reviewShowing,
    load: loadJamMode,
    onHeldChange: deps.onHeldChange,
    onLoadFailed: () => void nextTick(focusJamTryAgainOutsideSheets),
  })
  /**
   * The controls are read-only: during a session, as the session holds them, while Jam opens, and
   * during the Loading of Jam's phrase 1.
   */
  const settingsReadonly = computed(
    () => deps.controlsReadonly() || workspaceMode.opening.value || jamPhraseRunning.value,
  )

  // Jam's own settings, made the first time Jam mode shows in the visit.
  // @spec-link [[module_workspace_mode]]
  const jamSettings = useJamSettings({
    jamModule: () => workspaceMode.jamModule.value,
    jamShowing: () => workspaceMode.jamView.value !== null,
    records: deps.jamSettingsRecords,
    sessionControls: () => deps.idle().controls,
    instrumentProfileId: () => deps.idle().controls.instrumentProfileId,
    saveSettings: injectSaveSettings(),
  })

  /**
   * What Jam's staff shows while Jam mode shows (Start Jam's conditions read it); null otherwise.
   */
  const jamStaffState = ref<JamStaffState | null>(null)
  watch(workspaceMode.jamView, (view) => {
    if (view === null) jamStaffState.value = null
  })

  // Jam mode's kept doodle, made once Jam's code loads: what keeps it reaches it here, and leaving
  // Jam mode or the player's deletion of the session it comes from lets it go.
  const keptDoodle = useKeptDoodleHost({
    jamModule: () => workspaceMode.jamModule.value,
    jamShowing: () => workspaceMode.jamView.value !== null,
    lastDeletion: () => deps.controller()?.state.lastDeletion ?? null,
    instrument: () =>
      selectedInstrumentProfile(deps.idle().controls.instrumentProfileId, deps.idle().myInstrument),
    keyAndMode: (jam) => jamSettings.reviewKeyAndMode(jam),
  })

  // Jam's phrase 1 written from the kept doodle at Idle, on a staff of its own.
  const keptPhrase = useKeptDoodlePhrase({
    generation: deps.keptDoodleGeneration,
    jamModule: () => workspaceMode.jamModule.value,
    jamShowing: () => workspaceMode.jamView.value !== null,
    kept: () => keptDoodle.kept.value,
    settings: () => jamSettings.view.value,
    instrument: deps.instrumentChoice,
  })
  const jamPhraseRunning = computed(() => keptPhrase.state.operation !== 'idle')

  // Jam's own pre-generation queue, from the kept doodle's phrase 1: a Jam started on it takes its
  // ready phrases with `take(heldLayout)`.
  const jamPregeneration = useJamPregeneration({
    load: deps.jamPregeneration,
    jamModule: () => workspaceMode.jamModule.value,
    phrase: keptPhrase,
    kept: () => keptDoodle.kept.value,
    settings: () => jamSettings.view.value,
    instrument: deps.instrumentChoice,
    facts: () => ({
      jamShowing: workspaceMode.jamView.value !== null,
      sessionActive: deps.sessionActive(),
      reviewShowing: deps.reviewShowing(),
      orientationNoticeShown: deps.controller()?.state.orientationNoticeShown === true,
    }),
  })

  // A fresh Jam: its start, what it shows while it runs, `jam-notice` after it, and its doodle kept
  // at its end with a review.
  // @spec-link [[module_workspace_mode]]
  const freshJam = useFreshJam({
    jamModule: () => workspaceMode.jamModule.value,
    jamShowing: () => workspaceMode.jamView.value !== null,
    controller: deps.requireController,
    settings: () => jamSettings.view.value,
    instrument: deps.instrumentChoice,
    lastEnd: () => deps.controller()?.state.lastEnd ?? null,
    jamStaffState: () => jamStaffState.value,
    keepDoodle: keptDoodle.keep,
  })

  // The Jam `Start Jam` starts: on the kept doodle (as from Ready) when one is kept, else a
  // fresh one.
  const keptDoodleJam = useKeptDoodleJam({
    controller: deps.requireController,
    kept: () => keptDoodle.kept.value,
    phrase: keptPhrase,
    tempo: () => jamSettings.view.value?.controls.tempo ?? null,
    take: jamPregeneration.take,
    lastEnd: () => deps.controller()?.state.lastEnd ?? null,
    startFresh: freshJam.start,
  })

  // Jam's tap tempo, made once Jam's code loads: its taps set Jam's tempo as a change by hand.
  const jamTapTempo = useTapTempoHost({
    jamModule: () => workspaceMode.jamModule.value,
    jamShowing: () => workspaceMode.jamView.value !== null,
    readonly: () => settingsReadonly.value,
    controllerConnected: () => jamStartFacts().controllerConnected,
    audio: deps.audio,
    tempo: () => jamSettings.view.value?.settings.tempo ?? null,
    setTempo: (tempo) => handleJamSettingChange({ tempo }),
  })

  // What Jam's view and Jam's controls are given, and Jam's tempo for the header's `tempo-readout`.
  const {
    view: jamViewProps,
    tempo: jamTempo,
    controls: jamControls,
    controlsProps: jamControlsProps,
  } = useJamViewProps({
    jamModule: () => workspaceMode.jamModule.value,
    jamShowing: () => workspaceMode.jamView.value !== null,
    jam: () => jamSettings.view.value,
    sessionControls: () => deps.idle().controls,
    sessionFigureLevels: () => deps.idle().figureLevels,
    instrument: deps.instrumentChoice,
    systemPositionUnits: deps.systemPositionUnits,
    prewarm: deps.prewarm,
    noticeShown: () => freshJam.noticeShown.value,
    tapTempo: () => jamTapTempo.view.value,
    readonly: () => settingsReadonly.value,
    operationRunning: () => deps.idle().operation !== 'idle',
    freshReadings: () => freshJam.readings.value,
    keptReadings: () => keptDoodle.kept.value?.readings ?? null,
    belowTabletLandscape: () => deps.idle().noteDensityContext.belowTabletLandscape,
  })

  /** The facts a fresh Jam's start is judged on, now. */
  function jamStartFacts(): FreshJamStartFacts {
    return {
      controllerLoaded: deps.controller() !== null,
      controllerConnected: deps.controllerConnected(),
      sessionActive: deps.sessionActive(),
      reviewShowing: deps.reviewShowing(),
      sheetOpen: deps.anySheetOpen(),
      orientationNoticeShown: deps.controller()?.state.orientationNoticeShown === true,
      jamStaffShown: jamStaffState.value === 'shown',
    }
  }

  // Jam mode's Idle cue: the starting note while a Jam could start (the home note, or the kept
  // doodle's phrase 1's first note), or `jam-needs-controller`; none while tap tempo listens.
  const jamIdleCue = useJamIdleCue({
    jamModule: () => workspaceMode.jamModule.value,
    jamShowing: () => workspaceMode.jamView.value !== null,
    settings: () => jamViewProps.value,
    startFacts: jamStartFacts,
    pageAwaitsClick: () =>
      deps.controller()?.state.pageActivated !== true && !deps.audio.isUnlocked(),
    keptPhrase: keptDoodleJam.phraseCue,
    tapListening: jamTapTempo.isListening,
    tap: jamTapTempo.tap,
  })

  // What a Jam session's Review reaches of the workspace's Jam (its key and mode, the shared
  // instrument, `Jam in {answer}`, `Jam again on this doodle`, which keeps its doodle, and a
  // decline, which reaches the kept doodle from its session), and the kept doodle's bar over the
  // same.
  // @spec-link [[module_workspace_mode]]
  const jamBar = useJamPortsAndBar({
    jamSettings,
    instrument: () =>
      selectedInstrumentProfile(deps.idle().controls.instrumentProfileId, deps.idle().myInstrument),
    settingChanged: () => freshJam.settingChanged(),
    mode: () => workspaceMode.mode.value,
    selectJam: () => workspaceMode.select('jam'),
    jamShown: () => loadJamMode().then(() => nextTick()),
    closeReview: deps.closeReview,
    jamModule: () => workspaceMode.jamModule.value,
    keptDoodle,
    loading: () => jamPhraseRunning.value,
    sessionActive: deps.sessionActive,
    controller: deps.requireController,
    header: deps.header,
  })

  /** A change of one of Jam's settings at Idle: saved by Jam's code; `jam-notice` goes. */
  // @spec-link [[module_workspace_mode]]
  function handleJamSettingChange(change: JamSettingsChange): void {
    freshJam.settingChanged()
    jamSettings.change(change)
  }

  /** The instrument changed from Jam's controls: a change of a Jam setting too. */
  function handleJamInstrumentChange(id: InstrumentProfileId): void {
    freshJam.settingChanged()
    deps.selectInstrumentProfile(id)
  }

  /** The header's `Retry notation` in Jam mode: Jam's staff engraves its empty system again. */
  // @spec-link [[module_workspace_mode]]
  function handleRetryJamNotation(): void {
    const scorePanel = deps.scorePanel()
    if (scorePanel === null) throw new Error('workspace shell: the score panel is not mounted')
    scorePanel.retryJamNotation()
  }

  /** Jam's load-failure notice's `Dismiss`: the notice goes, focus to the fallback. */
  // @spec-link [[module_workspace_mode]]
  function handleDismissJamFailure(): void {
    workspaceMode.dismissFailure()
    deps.focusFallback()
  }

  return {
    workspaceMode,
    settingsReadonly,
    jamStaffState,
    keptDoodle,
    keptPhrase,
    freshJam,
    keptDoodleJam,
    jamTapTempo,
    jamViewProps,
    jamTempo,
    jamControls,
    jamControlsProps,
    jamIdleCue,
    jamBar,
    handleJamSettingChange,
    handleJamInstrumentChange,
    handleRetryJamNotation,
    handleDismissJamFailure,
  }
}
