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
  type GenerationIntent,
  type GenerationIntentProviders,
  createGenerationIntent,
} from '@/domain/generation/generation-intent'

export type ThemePreference = 'System' | 'Light' | 'Dark'
export type NotationMode = 'Concert' | 'B-flat tenor' | 'E-flat alto'
export type SessionOperation = 'idle' | 'generating' | 'notating'

export interface PresentationSettings {
  readonly theme: ThemePreference
  readonly notationMode: NotationMode
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
  readonly failedNotationMode: NotationMode | null
}

export interface GenerationSessionActions {
  readonly setControl: <K extends keyof GenerationControls>(
    key: K,
    value: GenerationControls[K],
  ) => boolean
  readonly selectMusicalProfile: (profile: MusicalProfile) => boolean
  readonly setTheme: (theme: ThemePreference) => boolean
  readonly setNotationMode: (notationMode: NotationMode) => Promise<boolean>
  readonly generate: () => Promise<boolean>
  readonly regenerate: () => Promise<boolean>
  readonly retryGeneration: () => Promise<boolean>
  readonly retryNotation: () => Promise<boolean>
}

export interface GenerationSession<TResult> {
  readonly state: Readonly<GenerationSessionState<TResult>>
  readonly actions: GenerationSessionActions
}

export interface CreateGenerationSessionOptions<TResult> {
  readonly providers: GenerationIntentProviders
  readonly generate: (intent: GenerationIntent) => Promise<TResult>
  readonly notate: (result: TResult, requestedMode: NotationMode) => Promise<void>
}

/**
 * Internal mutable mirror of `GenerationSessionState`: the public interface is readonly for
 * consumers, but this module owns the fields and must be able to replace them.
 */
// @spec-link [[service_workspace_session_flow]]
type MutableGenerationSessionState<TResult> = {
  -readonly [K in keyof GenerationSessionState<TResult>]: GenerationSessionState<TResult>[K]
}

const PROFILE_CONTROL_KEYS = new Set<keyof ProfileControlledValues>([
  'harmonicMotion',
  'noteDensity',
  'syncopation',
  'silenceDensity',
  'contour',
  'register',
])

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
    presentation: { theme: 'System', notationMode: 'B-flat tenor' },
    latestIntent: null,
    result: null,
    operation: 'idle',
    generationError: null,
    notationError: null,
    failedNotationMode: null,
  })

  function canChangeConfiguration(): boolean {
    return state.operation === 'idle'
  }

  /** Manual controlled edits become custom; all other controls retain the current selection state. */
  // @spec-link [[module_profile_control_customization]]
  function setControl<K extends keyof GenerationControls>(
    key: K,
    value: GenerationControls[K],
  ): boolean {
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

  function setTheme(theme: ThemePreference): boolean {
    state.presentation = { ...state.presentation, theme }
    return true
  }

  /**
   * With no phrase, a display choice is pending presentation state. With a phrase, commit it only
   * after the injected notation boundary succeeds, so a failed redraw preserves the prior mode.
   */
  // @spec-link [[service_workspace_session_flow]]
  function setNotationMode(notationMode: NotationMode): Promise<boolean> {
    if (state.result === null) {
      state.presentation = { ...state.presentation, notationMode }
      return Promise.resolve(true)
    }
    return runNotation(state.result, notationMode)
  }

  /** Coordinate one injected generation operation, preserving a prior successful result on failure. */
  // @spec-link [[service_workspace_session_flow]]
  async function run(intent: GenerationIntent): Promise<boolean> {
    state.operation = 'generating'
    state.generationError = null
    state.latestIntent = intent
    try {
      state.result = await options.generate(intent)
      return true
    } catch (error: unknown) {
      state.generationError = error instanceof Error ? error : new Error(String(error))
      return false
    } finally {
      state.operation = 'idle'
    }
  }

  /** Coordinate one injected notation attempt without changing phrase identity or generation inputs. */
  // @spec-link [[service_workspace_session_flow]]
  async function runNotation(result: TResult, requestedMode: NotationMode): Promise<boolean> {
    if (state.operation !== 'idle') return false
    state.operation = 'notating'
    state.notationError = null
    state.failedNotationMode = null
    try {
      await options.notate(result, requestedMode)
      state.presentation = { ...state.presentation, notationMode: requestedMode }
      return true
    } catch (error: unknown) {
      state.notationError = error instanceof Error ? error : new Error(String(error))
      state.failedNotationMode = requestedMode
      return false
    } finally {
      state.operation = 'idle'
    }
  }

  /** Explicit generation is the only ordinary action that creates a new intent. */
  // @spec-link [[module_generation_request_construction]]
  function generate(): Promise<boolean> {
    if (state.operation !== 'idle') return Promise.resolve(false)
    return run(
      createGenerationIntent({
        requestId: options.providers.nextRequestId(),
        seed: options.providers.nextSeed(),
        controls: state.controls,
        musicalProfile: state.profileSelection,
      }),
    )
  }

  /** Regeneration creates a new identity and seed while retaining active controls and grammar. */
  // @spec-link [[module_generation_request_construction]]
  function regenerate(): Promise<boolean> {
    if (state.operation !== 'idle') return Promise.resolve(false)
    return run(
      createGenerationIntent({
        requestId: options.providers.nextRequestId(),
        seed: options.providers.nextSeed(),
        controls: state.controls,
        musicalProfile: state.profileSelection,
      }),
    )
  }

  /** Retry repeats the failed immutable intent exactly; it never requests a replacement seed. */
  // @spec-link [[service_workspace_session_flow]]
  function retryGeneration(): Promise<boolean> {
    if (
      state.operation !== 'idle' ||
      state.generationError === null ||
      state.latestIntent === null
    ) {
      return Promise.resolve(false)
    }
    return run(state.latestIntent)
  }

  /** Retry the retained failed notation request with its original result and requested display mode. */
  // @spec-link [[service_workspace_session_flow]]
  function retryNotation(): Promise<boolean> {
    if (
      state.operation !== 'idle' ||
      state.result === null ||
      state.notationError === null ||
      state.failedNotationMode === null
    ) {
      return Promise.resolve(false)
    }
    return runNotation(state.result, state.failedNotationMode)
  }

  return {
    state: readonly(state) as Readonly<GenerationSessionState<TResult>>,
    actions: {
      setControl,
      selectMusicalProfile,
      setTheme,
      setNotationMode,
      generate,
      regenerate,
      retryGeneration,
      retryNotation,
    },
  }
}
