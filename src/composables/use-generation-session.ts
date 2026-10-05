import { readonly, shallowReactive } from 'vue'

import {
  PITCH_CLASSES,
  type GenerationControls,
  type MusicalProfile,
} from '@/domain/controls/generation-controls'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
  type ProfileControlledValues,
  type ProfileSelection,
  applyControlledCustomValue,
  applyMusicalProfile,
  applyNonProfileControlValue,
} from '@/domain/controls/profile-selection'
import {
  resolveGeneratedControls,
  type NoteDensityContext,
} from '@/domain/controls/generated-note-density'
import { isRhythmSettingBlocked } from '@/domain/controls/unsupported-rhythm-settings'
import {
  type GenerationIntent,
  type GenerationIntentProviders,
  createGenerationIntent,
} from '@/domain/generation/generation-intent'
import type { PitchClassNumber } from '@/domain/harmony/harmony-types'
import { spellWrittenKey } from '@/domain/notation/pitch-spelling'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import { NotationError, isStaffLayoutFailure } from '@/notation/notation-error'
import type {
  StaffFitVerdict,
  StaffKeySignature,
  StaffRoomVerdict,
} from '@/notation/staff-fit-types'
import { createFitRunner, toError, type RoomNoticeCause } from './generation-session-fit-round'
import {
  createSelectInstrumentProfileAction,
  type ProfileSelectionOutcome,
} from './generation-session-profile-switch'
import { createRhythmPrewarmTrigger, type PostPrewarm } from './generation-session-prewarm'
import {
  createRoomNoticeReactions,
  type StaffLayoutReports,
} from './generation-session-room-notice'
import type { ViewportWidthProvider } from './viewport-width'

export type ThemePreference = 'System' | 'Light' | 'Dark'
export type { ProfileSelectionOutcome } from './generation-session-profile-switch'
export type { RoomNoticeCause } from './generation-session-fit-round'
export type { StaffLayoutReports } from './generation-session-room-notice'
export type SessionOperation = 'idle' | 'generating' | 'notating'

export interface PresentationSettings {
  readonly theme: ThemePreference
}

export interface GenerationSessionState<TResult> {
  readonly controls: GenerationControls
  readonly profileSelection: ProfileSelection
  readonly presentation: PresentationSettings
  readonly latestIntent: GenerationIntent | null
  readonly result: TResult | null
  readonly operation: SessionOperation
  readonly generationError: Error | null
  readonly notationError: Error | null
  /**
   * Whether the retained `result` has actually been engraved since it was last assigned: cleared
   * when a fresh result is assigned or a notation attempt against it fails, set once one succeeds.
   * Independent of `notationError`, which a new generation attempt clears without redrawing.
   */
  readonly resultEngraved: boolean
  /**
   * What, besides the chosen note density, decides the density the next phrase is generated with:
   * where the window stood against `bp-tablet-landscape` at the last read or crossing, and whether
   * a session has stepped down (never, at Idle). The controls show the density it gives and the
   * unsupported-rhythm block judges it; each generation reads the width afresh.
   */
  readonly noteDensityContext: NoteDensityContext
  /** Whether the "staff needs more room" notice shows at Idle, and with which cause. */
  readonly roomNotice: RoomNoticeCause | null
  /**
   * Whether a fit run's fresh-seed retries are running: true from the first attempt found too
   * wide, or from the start of a round under the too-many-notes notice, until the run ends.
   */
  readonly retriesRunning: boolean
  /**
   * Counts every time the notice must be announced: each time it begins, and each time a round
   * under it ends with every attempt too wide. The interface re-announces the notice on a change.
   */
  readonly roomNoticeAnnouncements: number
}

export interface GenerationSessionActions {
  readonly setControl: <K extends keyof GenerationControls>(
    key: K,
    value: GenerationControls[K],
  ) => boolean
  readonly selectMusicalProfile: (profile: MusicalProfile) => boolean
  readonly selectInstrumentProfile: (id: InstrumentProfileId) => Promise<ProfileSelectionOutcome>
  readonly setTheme: (theme: ThemePreference) => boolean
  readonly generate: () => Promise<boolean>
  readonly regenerate: () => Promise<boolean>
  readonly retryGeneration: () => Promise<boolean>
  readonly retryNotation: () => Promise<boolean>
  readonly reportNotationFailure: (error: Error) => boolean
  readonly reportNotationRecovered: () => boolean
  /**
   * The phrase a session end asks for once phrase 1 has sounded: the phrase on screen leaves at
   * once and a new one is generated from the current controls (fresh seed, no carry-in, the fit
   * retries), unless the staff has no room (the no-room notice, until it clears) or the rhythm
   * combination is blocked (no phrase). Resolves true when it leaves a phrase as the result.
   */
  // @spec-link [[rule_session_end_generates_next_phrase_one]]
  readonly startFreshPhrase: () => Promise<boolean>
}

export interface GenerationSession<TResult> {
  readonly state: Readonly<GenerationSessionState<TResult>>
  readonly actions: GenerationSessionActions
  /** Stop listening for window-width crossings; the root calls it when the workspace unmounts. */
  readonly dispose: () => void
}

export interface CreateGenerationSessionOptions<TResult> {
  readonly providers: GenerationIntentProviders
  /** Where the window stands against `bp-tablet-landscape`; read when each phrase is generated. */
  readonly viewport: ViewportWidthProvider
  readonly generate: (intent: GenerationIntent) => Promise<TResult>
  readonly notate: (result: TResult) => Promise<void>
  /** Check a generated phrase against the staff's current layout inputs, drawing nothing. */
  readonly checkFit: (result: TResult) => Promise<StaffFitVerdict>
  /** Check whether the staff has room at all, whatever the notes, with this key signature. */
  readonly checkRoom: (signature: StaffKeySignature) => Promise<StaffRoomVerdict>
  /** The staff's layout-input reports (container width, viewport and height budget). */
  readonly staffLayout: StaffLayoutReports
  /**
   * Drop whatever the injected `notate` seam is currently presenting: for a phrase that gives way
   * to no phrase, to the room notice, or to a Loading with no score shown.
   */
  readonly clearPresentedPhrase: () => void
  /**
   * Where to post a rhythm-domain prewarm (the worker client's fire-and-forget `prewarm`): once at
   * creation for the current width-resolved controls, then once per change of the width-resolved
   * rhythm setting. Absent means prewarm is off: the workspace composition root leaves it out when
   * its prewarm policy is disabled, and a caller with no generation worker has nothing to warm.
   */
  readonly prewarm?: PostPrewarm
  /**
   * Told the intent of every Idle phrase the fit run accepts (drawn, or kept as a retryable
   * notation error), once, for its replay-key announcement. Absent means no announcement: the
   * workspace composition root always supplies it, and a caller with no console sink has nothing
   * to announce to.
   */
  // @spec-link [[module_phrase_replay_key]]
  readonly onPhraseAccepted?: (intent: GenerationIntent) => void
}

/** A programming-usage error: a caller used a session action against its documented contract. */
export class SessionUsageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionUsageError'
  }
}

/**
 * Internal mutable mirror of `GenerationSessionState`: the public interface is readonly for
 * consumers, but this module owns the fields and must be able to replace them. Exported so the
 * sibling profile-switch module can share the same reactive state object.
 */
// @spec-link [[service_idle_generation_session]]
export type MutableGenerationSessionState<TResult> = {
  -readonly [K in keyof GenerationSessionState<TResult>]: GenerationSessionState<TResult>[K]
}

const PROFILE_CONTROL_KEYS = new Set<keyof ProfileControlledValues>([
  'harmonicMotion',
  'noteDensity',
  'rhythmicVariety',
  'syncopation',
  'silenceDensity',
  'contour',
  'register',
])

/** Controls that cannot change the notes: changing one starts no round under the notice. */
const NON_NOTE_CONTROL_KEYS = new Set<keyof GenerationControls>(['tempo'])

/**
 * Root composition boundary: call once from application bootstrap and pass the returned readonly
 * state/actions to components. This owns no hidden singleton, storage, browser, or engraving state.
 */
// @spec-link [[service_idle_generation_session]]
export function createGenerationSession<TResult>(
  options: CreateGenerationSessionOptions<TResult>,
): GenerationSession<TResult> {
  const state = shallowReactive<MutableGenerationSessionState<TResult>>({
    controls: DEFAULT_GENERATION_CONTROLS,
    profileSelection: DEFAULT_PROFILE_SELECTION,
    presentation: { theme: 'System' },
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

  function canChangeConfiguration(): boolean {
    return state.operation === 'idle'
  }

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

  /**
   * True when the current controls' rhythm combination has no legal four-bar plan and must not
   * start generation, judged on the note density a phrase would be generated with at the window's
   * current width.
   */
  // @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
  function isBlockedByUnsupportedRhythm(): boolean {
    return isRhythmSettingBlocked(state.controls, readNoteDensityContext())
  }

  /**
   * Manual controlled edits become custom; all other controls retain the current selection state.
   * An edit that changes the width-resolved rhythm setting posts a prewarm for it. Under the room
   * notice, an edit to a setting the phrase is generated from (tempo excluded) reacts to it.
   */
  // @spec-link [[module_profile_control_customization]]
  // @spec-link [[service_idle_generation_session]]
  function setControl<K extends keyof GenerationControls>(
    key: K,
    value: GenerationControls[K],
  ): boolean {
    if ((key as string) === 'instrumentProfileId') {
      throw new SessionUsageError(
        "setControl cannot change 'instrumentProfileId' directly; call selectInstrumentProfile instead.",
      )
    }
    if (!canChangeConfiguration()) return false
    if (PROFILE_CONTROL_KEYS.has(key as keyof ProfileControlledValues)) {
      const [controls, profileSelection] = applyControlledCustomValue(
        state.controls,
        state.profileSelection,
        key as keyof ProfileControlledValues,
        value as ProfileControlledValues[keyof ProfileControlledValues],
      )
      state.controls = controls
      state.profileSelection = profileSelection
      prewarmCurrentRhythmSetting()
      roomNotice.afterGenerationSettingChange()
      return true
    }
    const [controls, profileSelection] = applyNonProfileControlValue(
      state.controls,
      state.profileSelection,
      key as Exclude<keyof GenerationControls, keyof ProfileControlledValues>,
      value as GenerationControls[Exclude<keyof GenerationControls, keyof ProfileControlledValues>],
    )
    state.controls = controls
    state.profileSelection = profileSelection
    prewarmCurrentRhythmSetting()
    if (!NON_NOTE_CONTROL_KEYS.has(key)) roomNotice.afterGenerationSettingChange()
    return true
  }

  /**
   * Apply a musical profile's values; a switch that changes the rhythm setting posts a prewarm, and
   * under the room notice the switch reacts to it as a generation-setting change.
   */
  // @spec-link [[module_generative_profile_selection]]
  // @spec-link [[service_idle_generation_session]]
  function selectMusicalProfile(profile: MusicalProfile): boolean {
    if (!canChangeConfiguration()) return false
    const [controls, profileSelection] = applyMusicalProfile(state.controls, profile)
    state.controls = controls
    state.profileSelection = profileSelection
    prewarmCurrentRhythmSetting()
    roomNotice.afterGenerationSettingChange()
    return true
  }

  /** Presentation-only: never routes to generation or engraving, and never touches phrase/request/seed/result. */
  // @spec-link [[rule_presentation_preference_preserves_phrase]]
  function setTheme(theme: ThemePreference): boolean {
    state.presentation = { ...state.presentation, theme }
    return true
  }

  /**
   * Coordinate one injected notation attempt without changing phrase identity or generation
   * inputs. A layout failure is routed as one of the phrase on screen; the operation is idle by
   * then, so the replacement run it may start owns the operation.
   */
  // @spec-link [[service_idle_generation_session]]
  // @spec-link [[module_idle_fit_round]]
  async function runNotation(result: TResult): Promise<boolean> {
    if (state.operation !== 'idle') return false
    state.operation = 'notating'
    state.notationError = null
    try {
      await options.notate(result)
      state.resultEngraved = true
      state.operation = 'idle'
      return true
    } catch (error: unknown) {
      state.operation = 'idle'
      reportNotationFailure(toError(error))
      return false
    }
  }

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

  /** Retry the retained failed notation request against its original result. */
  // @spec-link [[service_idle_generation_session]]
  function retryNotation(): Promise<boolean> {
    if (state.operation !== 'idle' || state.result === null || state.notationError === null) {
      return Promise.resolve(false)
    }
    return runNotation(state.result)
  }

  /**
   * Surface a notation failure of the phrase on screen raised outside a run (a viewport-resize
   * redraw, a Retry notation): a staff-layout failure goes to the room notice or a replacement
   * run; any other failure is the retryable notation error.
   */
  // @spec-link [[module_notation_layout_preflight]]
  // @spec-link [[module_idle_fit_round]]
  function reportNotationFailure(error: Error): boolean {
    if (state.operation !== 'idle' || state.result === null) return false
    state.resultEngraved = false
    if (error instanceof NotationError && isStaffLayoutFailure(error)) {
      roomNotice.routeLayoutFailure(error)
      return true
    }
    state.notationError = error
    return true
  }

  /** Clear a previously reported outside-operation notation failure once a later redraw succeeds. */
  // @spec-link [[module_notation_layout_preflight]]
  // @spec-link [[service_idle_generation_session]]
  function reportNotationRecovered(): boolean {
    if (state.operation !== 'idle' || state.result === null) return false
    state.notationError = null
    state.resultEngraved = true
    return true
  }

  /**
   * Discard the current phrase, the room notice and every field tied to them, without generating
   * a replacement: no phrase shows, as before a first one exists. The transition wherever a
   * replacement phrase is needed but the active rhythm combination has no legal generation.
   */
  // @spec-link [[rule_profile_switch_validates_phrase]]
  // @spec-link [[module_idle_fit_round]]
  function clearPhrase(): void {
    state.latestIntent = null
    state.result = null
    state.generationError = null
    state.notationError = null
    state.resultEngraved = false
    state.roomNotice = null
    state.retriesRunning = false
    options.clearPresentedPhrase()
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

  const fitRunner = createFitRunner<TResult>({
    state,
    generate: options.generate,
    checkFit: options.checkFit,
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
