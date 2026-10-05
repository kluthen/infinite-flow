/**
 * The workspace session's control actions, split out of use-generation-session.ts: the manual
 * control edit, the musical-profile switch, the presentation theme, and the unsupported-rhythm
 * block that judges the current controls. This module owns no session state of its own: it reads
 * and writes the shared session state object the root composable constructs and passes in.
 */

import type { GenerationControls, MusicalProfile } from '@/domain/controls/generation-controls'
import {
  type ProfileControlledValues,
  applyControlledCustomValue,
  applyMusicalProfile,
  applyNonProfileControlValue,
} from '@/domain/controls/profile-selection'
import type { NoteDensityContext } from '@/domain/controls/generated-note-density'
import { isRhythmSettingBlocked } from '@/domain/controls/unsupported-rhythm-settings'
import {
  SessionUsageError,
  type GenerationSessionActions,
  type MutableGenerationSessionState,
  type ThemePreference,
} from './generation-session-types'

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

/** The dependency surface the control actions need from the root session composable. */
export interface ControlActionDependencies<TResult> {
  readonly state: MutableGenerationSessionState<TResult>
  /** The note-density context at the window's width now, updated when the width has crossed. */
  readonly readNoteDensityContext: () => NoteDensityContext
  /** Post a prewarm for the width-resolved rhythm setting, when it changed since the last post. */
  readonly prewarmCurrentRhythmSetting: () => void
  /** Tell the room-notice reactions that a setting the phrase is generated from just changed. */
  readonly afterGenerationSettingChange: () => void
}

/** The control actions, plus the rhythm block the rest of the session judges generation by. */
export type ControlActions = Pick<
  GenerationSessionActions,
  'setControl' | 'selectMusicalProfile' | 'setTheme'
> & {
  /** Whether the current controls' rhythm combination blocks generation at the width now. */
  readonly isBlockedByUnsupportedRhythm: () => boolean
}

/**
 * Intent: build the session's control actions over the shared state. Configuration edits apply
 * only at idle; the theme is presentation-only and applies at any time.
 */
export function createControlActions<TResult>(
  deps: ControlActionDependencies<TResult>,
): ControlActions {
  const { state } = deps

  /** Intent: configuration may change only while no generation or drawing is in flight. */
  function canChangeConfiguration(): boolean {
    return state.operation === 'idle'
  }

  /**
   * True when the current controls' rhythm combination has no legal four-bar plan and must not
   * start generation, judged on the note density a phrase would be generated with at the window's
   * current width.
   */
  // @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
  function isBlockedByUnsupportedRhythm(): boolean {
    return isRhythmSettingBlocked(state.controls, deps.readNoteDensityContext())
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
      deps.prewarmCurrentRhythmSetting()
      deps.afterGenerationSettingChange()
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
    deps.prewarmCurrentRhythmSetting()
    if (!NON_NOTE_CONTROL_KEYS.has(key)) deps.afterGenerationSettingChange()
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
    deps.prewarmCurrentRhythmSetting()
    deps.afterGenerationSettingChange()
    return true
  }

  /** Presentation-only: never routes to generation or engraving, and never touches phrase/request/seed/result. */
  // @spec-link [[rule_presentation_preference_preserves_phrase]]
  function setTheme(theme: ThemePreference): boolean {
    state.presentation = { ...state.presentation, theme }
    return true
  }

  return { isBlockedByUnsupportedRhythm, setControl, selectMusicalProfile, setTheme }
}
