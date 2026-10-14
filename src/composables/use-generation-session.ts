import { readonly, shallowReactive } from 'vue'

import { PITCH_CLASSES } from '@/domain/controls/generation-controls'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '@/domain/controls/profile-selection'
import {
  resolveGeneratedControls,
  type NoteDensityContext,
} from '@/domain/controls/generated-note-density'
import {
  type GenerationIntent,
  createGenerationIntent,
} from '@/domain/generation/generation-intent'
import type { PitchClassNumber } from '@/domain/harmony/harmony-types'
import { spellWrittenKey } from '@/domain/notation/pitch-spelling'
import type { StaffKeySignature } from '@/notation/staff-fit-types'
import { createControlActions } from './generation-session-control-actions'
import { createFitRunner } from './generation-session-fit-round'
import { createNotationActions } from './generation-session-notation'
import { createSelectInstrumentProfileAction } from './generation-session-profile-switch'
import { createRhythmPrewarmTrigger } from './generation-session-prewarm'
import { createRoomNoticeReactions } from './generation-session-room-notice'
import {
  SessionUsageError,
  type CreateGenerationSessionOptions,
  type GenerationSession,
  type GenerationSessionState,
  type InitialGenerationSettings,
  type MutableGenerationSessionState,
} from './generation-session-types'

export type { ProfileSelectionOutcome } from './generation-session-profile-switch'
export type { RoomNoticeCause } from './generation-session-fit-round'
export type { StaffLayoutReports } from './generation-session-room-notice'
export type {
  CreateGenerationSessionOptions,
  GenerationSession,
  GenerationSessionActions,
  GenerationSessionState,
  InitialGenerationSettings,
  MutableGenerationSessionState,
  PresentationSettings,
  SessionOperation,
  ThemePreference,
} from './generation-session-types'
export { SessionUsageError } from './generation-session-types'

/** The settings a session given none starts from: the first-load values. */
const FIRST_LOAD_SETTINGS: InitialGenerationSettings = {
  controls: DEFAULT_GENERATION_CONTROLS,
  profileSelection: DEFAULT_PROFILE_SELECTION,
  theme: 'System',
}

/**
 * Root composition boundary: call once from application bootstrap and pass the returned readonly
 * state/actions to components. This owns no hidden singleton, storage, browser, or engraving state.
 * Each phrase 1 a fit run publishes is the generated phrase joined with the session seed drawn
 * for it. Its state starts from the given initial settings (the saved ones the app loaded before
 * its first draw), or from the first-load values when none are given. The player's changes to the
 * controls, the profile selection and the theme are saved through `saveSettings` as they apply.
 */
// @spec-link [[service_idle_generation_session]]
// @spec-link [[module_session_seed_plan]]
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
export function createGenerationSession<TResult, TGenerated = TResult>(
  options: CreateGenerationSessionOptions<TResult, TGenerated>,
): GenerationSession<TResult> {
  const initial = options.initialSettings ?? FIRST_LOAD_SETTINGS
  const state = shallowReactive<MutableGenerationSessionState<TResult>>({
    controls: initial.controls,
    profileSelection: initial.profileSelection,
    presentation: { theme: initial.theme },
    latestIntent: null,
    result: null,
    operation: 'idle',
    generationError: null,
    notationError: null,
    resultEngraved: false,
    noteDensityContext: {
      belowTabletLandscape: options.viewport.isBelowTabletLandscape(),
      sessionSteppedDown: false,
    },
    roomNotice: null,
    retriesRunning: false,
    roomNoticeAnnouncements: 0,
  })

  /**
   * Read the window's width now and return the note-density context it gives, updating the
   * exposed context when the width has crossed `bp-tablet-landscape` since the last read. Idle
   * generation has no session behind it, so it never counts as stepped down.
   */
  // @spec-link [[rule_generated_density_follows_window_width]]
  // @spec-link [[service_idle_generation_session]]
  function readNoteDensityContext(): NoteDensityContext {
    const belowTabletLandscape = options.viewport.isBelowTabletLandscape()
    if (belowTabletLandscape !== state.noteDensityContext.belowTabletLandscape) {
      state.noteDensityContext = { ...state.noteDensityContext, belowTabletLandscape }
    }
    return state.noteDensityContext
  }

  const rhythmPrewarm =
    options.prewarm === undefined ? undefined : createRhythmPrewarmTrigger(options.prewarm)

  /**
   * Post a prewarm for the controls a phrase would be generated with now, at the window's current
   * width, when that rhythm setting differs from the last one posted (the trigger dedupes). Never
   * draws a seed or request id, and changes no session state beyond the width read.
   */
  // @spec-link [[service_idle_generation_session]]
  function prewarmCurrentRhythmSetting(): void {
    if (rhythmPrewarm === undefined) return
    rhythmPrewarm(
      resolveGeneratedControls(state.controls, readNoteDensityContext()),
      state.profileSelection,
    )
  }

  /**
   * A width crossing updates the note-density context, then re-warms if it changed the setting,
   * and stops a running fit run at once when the combination now blocks generation.
   */
  // @spec-link [[rule_generated_density_follows_window_width]]
  // @spec-link [[module_idle_fit_round]]
  function handleWidthCrossing(): void {
    readNoteDensityContext()
    prewarmCurrentRhythmSetting()
    fitRunner.stopIfBlocked()
  }

  const { isBlockedByUnsupportedRhythm, setControl, selectMusicalProfile, setTheme } =
    createControlActions<TResult>({
      state,
      readNoteDensityContext,
      prewarmCurrentRhythmSetting,
      afterGenerationSettingChange: () => roomNotice.afterGenerationSettingChange(),
      saveSettings: options.saveSettings,
    })

  const { retryNotation, reportNotationFailure, reportNotationRecovered, clearPhrase } =
    createNotationActions<TResult>({
      state,
      notate: options.notate,
      clearPresentedPhrase: options.clearPresentedPhrase,
      routeLayoutFailure: (error) => roomNotice.routeLayoutFailure(error),
    })

  /**
   * Build a fresh, freshly identified/seeded intent from the current controls and profile
   * selection, with the note density the window's width gives now: the intent carries that plain
   * density, never the width itself, while `state.controls` keeps the chosen value.
   */
  // @spec-link [[rule_generated_density_follows_window_width]]
  // @spec-link [[service_idle_generation_session]]
  function freshIntentFromControls(): GenerationIntent {
    return createGenerationIntent({
      requestId: options.providers.nextRequestId(),
      seed: options.providers.nextSeed(),
      controls: resolveGeneratedControls(state.controls, readNoteDensityContext()),
      musicalProfile: state.profileSelection,
    })
  }

  /**
   * The key signature the next phrase would have: the written key the current written tonal
   * center and collection spell, which sets the width of the staff's fixed parts.
   */
  // @spec-link [[module_idle_fit_round]]
  function currentKeySignature(): StaffKeySignature {
    const writtenTonic = PITCH_CLASSES.indexOf(state.controls.tonalCenter) as PitchClassNumber
    return spellWrittenKey(writtenTonic, state.controls.collection).signature
  }

  /** Explicit generation is the only ordinary action that creates a new intent. */
  // @spec-link [[module_generation_request_construction]]
  function generate(): Promise<boolean> {
    if (state.operation !== 'idle') return Promise.resolve(false)
    if (isBlockedByUnsupportedRhythm()) return Promise.resolve(false)
    return fitRunner.run('keep_screen')
  }

  /** Regeneration creates a new identity and seed while retaining active controls and grammar. */
  // @spec-link [[module_generation_request_construction]]
  function regenerate(): Promise<boolean> {
    if (state.operation !== 'idle') return Promise.resolve(false)
    if (isBlockedByUnsupportedRhythm()) return Promise.resolve(false)
    return fitRunner.run('keep_screen')
  }

  /**
   * Retry builds a brand-new intent from the current controls/profile with a fresh seed and
   * identity -- the same construction as `regenerate()` -- rather than replaying the failed
   * `state.latestIntent` unchanged. This is so a deterministic failure is never a dead end: since
   * configuration edits are permitted while idle after an error, an edit made after the failure
   * and before pressing Retry is picked up, exactly as it would be for `regenerate()` (user
   * decision, 2026-09-25; see D30 in `ui_ux/decisions.md`). It therefore no longer needs
   * `state.latestIntent` to be present, and applies the same unsupported-rhythm-settings block as
   * `generate()`/`regenerate()`, since it starts a new generation from current controls.
   */
  // @spec-link [[service_idle_generation_session]]
  function retryGeneration(): Promise<boolean> {
    if (state.operation !== 'idle' || state.generationError === null) {
      return Promise.resolve(false)
    }
    if (isBlockedByUnsupportedRhythm()) return Promise.resolve(false)
    return fitRunner.run('keep_screen')
  }

  /**
   * Intent: replace whatever the staff holds with a fresh phrase, as a session end once phrase 1
   * has sounded asks: no phrase of the ended session may show again, so the phrase leaves at once,
   * with no score shown meanwhile, and the room is checked before anything is generated. It may
   * take over a run still generating (a replacement the end's hand-off started), never one drawing:
   * a drawing in flight cannot be dropped, so that is a caller defect.
   */
  // @spec-link [[rule_session_end_generates_next_phrase_one]]
  function startFreshPhrase(): Promise<boolean> {
    if (state.operation === 'notating') {
      throw new SessionUsageError('startFreshPhrase cannot drop a phrase still being drawn.')
    }
    return fitRunner.run('fresh')
  }

  const fitRunner = createFitRunner<TResult, TGenerated>({
    state,
    generate: options.generate,
    checkFit: options.checkFit,
    nextSessionSeed: options.nextSessionSeed,
    withSessionSeed: options.withSessionSeed,
    notate: options.notate,
    clearPresentedPhrase: options.clearPresentedPhrase,
    freshIntent: freshIntentFromControls,
    isBlocked: isBlockedByUnsupportedRhythm,
    checkRoom: () => options.checkRoom(currentKeySignature()),
    showEmpty: clearPhrase,
    onPublished: (intent) => options.onPhraseAccepted?.(intent),
  })

  const roomNotice = createRoomNoticeReactions<TResult>({
    state,
    checkRoom: options.checkRoom,
    staffLayout: options.staffLayout,
    fitRunner,
    currentSignature: currentKeySignature,
    isBlocked: isBlockedByUnsupportedRhythm,
    showEmpty: clearPhrase,
  })

  const selectInstrumentProfile = createSelectInstrumentProfileAction<TResult>({
    state,
    isBlocked: isBlockedByUnsupportedRhythm,
    runFitRun: () => fitRunner.run('keep_screen'),
    clearPhrase,
    saveSettings: options.saveSettings,
  })

  const stopListeningForCrossings = options.viewport.subscribe(handleWidthCrossing)
  prewarmCurrentRhythmSetting()

  return {
    state: readonly(state) as Readonly<GenerationSessionState<TResult>>,
    actions: {
      setControl,
      selectMusicalProfile,
      selectInstrumentProfile,
      setTheme,
      generate,
      regenerate,
      retryGeneration,
      retryNotation,
      reportNotationFailure,
      reportNotationRecovered,
      startFreshPhrase,
    },
    dispose: () => {
      stopListeningForCrossings()
      roomNotice.dispose()
    },
  }
}
