import { readonly, shallowReactive } from 'vue'

import { type GenerationControls, type MusicalProfile } from '@/domain/controls/generation-controls'
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
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import {
  createSelectInstrumentProfileAction,
  type ProfileSelectionOutcome,
} from './generation-session-profile-switch'
import type { ViewportWidthProvider } from './viewport-width'

export type ThemePreference = 'System' | 'Light' | 'Dark'
export type { ProfileSelectionOutcome } from './generation-session-profile-switch'
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
  /**
   * Drop whatever the injected `notate` seam is currently presenting, for the `clearPhrase`
   * transition below. Optional because a caller with no presented-phrase concept of its own (every
   * `TResult` in this file's own unit tests) has nothing to drop.
   */
  readonly clearPresentedPhrase?: () => void
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
// @spec-link [[service_workspace_session_flow]]
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

/** Normalize an unknown caught value to an Error without swallowing a non-Error throw's message. */
function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

/**
 * Root composition boundary: call once from application bootstrap and pass the returned readonly
 * state/actions to components. This owns no hidden singleton, storage, browser, or engraving state.
 */
// @spec-link [[service_workspace_session_flow]]
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
  // @spec-link [[service_workspace_session_flow]]
  function readNoteDensityContext(): NoteDensityContext {
    const belowTabletLandscape = options.viewport.isBelowTabletLandscape()
    if (belowTabletLandscape !== state.noteDensityContext.belowTabletLandscape) {
      state.noteDensityContext = { ...state.noteDensityContext, belowTabletLandscape }
    }
    return state.noteDensityContext
  }

  const stopListeningForCrossings = options.viewport.subscribe(readNoteDensityContext)

  /**
   * True when the current controls' rhythm combination has no legal four-bar plan and must not
   * start generation, judged on the note density a phrase would be generated with at the window's
   * current width.
   */
  // @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
  function isBlockedByUnsupportedRhythm(): boolean {
    return isRhythmSettingBlocked(state.controls, readNoteDensityContext())
  }

  /** Manual controlled edits become custom; all other controls retain the current selection state. */
  // @spec-link [[module_profile_control_customization]]
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
    return true
  }

  // @spec-link [[module_generative_profile_selection]]
  function selectMusicalProfile(profile: MusicalProfile): boolean {
    if (!canChangeConfiguration()) return false
    const [controls, profileSelection] = applyMusicalProfile(state.controls, profile)
    state.controls = controls
    state.profileSelection = profileSelection
    return true
  }

  /** Presentation-only: never routes to generation or engraving, and never touches phrase/request/seed/result. */
  // @spec-link [[rule_presentation_preference_preserves_phrase]]
  function setTheme(theme: ThemePreference): boolean {
    state.presentation = { ...state.presentation, theme }
    return true
  }

  /**
   * Coordinate one full generation-then-engraving operation. A generation failure preserves the
   * prior result and leaves notation state cleared (this attempt's start already cleared it); a
   * generation success always continues into engraving the written phrase within the same
   * operation, and resolves true even if that engraving then fails — the failure is exposed
   * through `notationError` while the freshly generated result is kept.
   */
  // @spec-link [[service_workspace_session_flow]]
  async function run(intent: GenerationIntent): Promise<boolean> {
    state.operation = 'generating'
    state.generationError = null
    state.notationError = null
    state.latestIntent = intent

    let result: TResult
    try {
      result = await options.generate(intent)
    } catch (error: unknown) {
      state.generationError = toError(error)
      state.operation = 'idle'
      return false
    }

    state.result = result
    state.resultEngraved = false
    state.operation = 'notating'
    try {
      await options.notate(result)
      state.resultEngraved = true
    } catch (error: unknown) {
      state.notationError = toError(error)
      state.resultEngraved = false
    } finally {
      state.operation = 'idle'
    }
    return true
  }

  /** Coordinate one injected notation attempt without changing phrase identity or generation inputs. */
  // @spec-link [[service_workspace_session_flow]]
  async function runNotation(result: TResult): Promise<boolean> {
    if (state.operation !== 'idle') return false
    state.operation = 'notating'
    state.notationError = null
    try {
      await options.notate(result)
      state.resultEngraved = true
      return true
    } catch (error: unknown) {
      state.notationError = toError(error)
      state.resultEngraved = false
      return false
    } finally {
      state.operation = 'idle'
    }
  }

  /**
   * Build a fresh, freshly identified/seeded intent from the current controls and profile
   * selection, with the note density the window's width gives now: the intent carries that plain
   * density, never the width itself, while `state.controls` keeps the chosen value.
   */
  // @spec-link [[rule_generated_density_follows_window_width]]
  // @spec-link [[service_workspace_session_flow]]
  function freshIntentFromControls(): GenerationIntent {
    return createGenerationIntent({
      requestId: options.providers.nextRequestId(),
      seed: options.providers.nextSeed(),
      controls: resolveGeneratedControls(state.controls, readNoteDensityContext()),
      musicalProfile: state.profileSelection,
    })
  }

  /** Explicit generation is the only ordinary action that creates a new intent. */
  // @spec-link [[module_generation_request_construction]]
  function generate(): Promise<boolean> {
    if (state.operation !== 'idle') return Promise.resolve(false)
    if (isBlockedByUnsupportedRhythm()) return Promise.resolve(false)
    return run(freshIntentFromControls())
  }

  /** Regeneration creates a new identity and seed while retaining active controls and grammar. */
  // @spec-link [[module_generation_request_construction]]
  function regenerate(): Promise<boolean> {
    if (state.operation !== 'idle') return Promise.resolve(false)
    if (isBlockedByUnsupportedRhythm()) return Promise.resolve(false)
    return run(freshIntentFromControls())
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
  // @spec-link [[service_workspace_session_flow]]
  function retryGeneration(): Promise<boolean> {
    if (state.operation !== 'idle' || state.generationError === null) {
      return Promise.resolve(false)
    }
    if (isBlockedByUnsupportedRhythm()) return Promise.resolve(false)
    return run(freshIntentFromControls())
  }

  /** Retry the retained failed notation request against its original result. */
  // @spec-link [[service_workspace_session_flow]]
  function retryNotation(): Promise<boolean> {
    if (state.operation !== 'idle' || state.result === null || state.notationError === null) {
      return Promise.resolve(false)
    }
    return runNotation(state.result)
  }

  /** Surface a notation failure raised outside a session operation (e.g. a viewport-resize redraw). */
  // @spec-link [[module_notation_layout_preflight]]
  // @spec-link [[service_workspace_session_flow]]
  function reportNotationFailure(error: Error): boolean {
    if (state.operation !== 'idle' || state.result === null) return false
    state.notationError = error
    state.resultEngraved = false
    return true
  }

  /** Clear a previously reported outside-operation notation failure once a later redraw succeeds. */
  // @spec-link [[module_notation_layout_preflight]]
  // @spec-link [[service_workspace_session_flow]]
  function reportNotationRecovered(): boolean {
    if (state.operation !== 'idle' || state.result === null) return false
    state.notationError = null
    state.resultEngraved = true
    return true
  }

  /**
   * Discard the current phrase and every field tied to it, without generating a replacement: the
   * transition a profile switch takes when the new profile invalidates the phrase but the active
   * rhythm combination has no legal regeneration to fall back to, so the switch applies and the
   * phrase disappears instead of blocking.
   */
  // @spec-link [[rule_profile_switch_validates_phrase]]
  function clearPhrase(): void {
    state.latestIntent = null
    state.result = null
    state.generationError = null
    state.notationError = null
    state.resultEngraved = false
    options.clearPresentedPhrase?.()
  }

  const selectInstrumentProfile = createSelectInstrumentProfileAction<TResult>({
    state,
    providers: options.providers,
    readNoteDensityContext,
    runGeneration: run,
    clearPhrase,
  })

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
    },
    dispose: stopListeningForCrossings,
  }
}
