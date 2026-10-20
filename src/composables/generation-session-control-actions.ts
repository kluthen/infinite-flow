/**
 * The workspace session's control actions, split out of use-generation-session.ts: the routing
 * point every edit of a generation setting at Idle goes through (a control, a figure level, a
 * preset choice), the presentation theme, and the unsupported-rhythm block that judges the current
 * controls. This module owns no session state of its own: it reads and writes the shared session
 * state object the root composable constructs and passes in. Each action that applies saves the
 * settings it changed: the actions are the player's change handlers' way in, so what they change
 * is the player's choice.
 */

import {
  makeGenerationControls,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import type { NoteDensityContext } from '@/domain/controls/generated-note-density'
import { isRhythmSettingBlocked } from '@/domain/controls/unsupported-rhythm-settings'
import { deepFreeze } from '@/domain/events/deep-freeze'
import {
  FIGURE_IDS,
  FIGURE_LEVEL_IDS,
  type FigureId,
  type FigureLevel,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import {
  choosePreset,
  findPreset,
  PRESET_HELD_CONTROL_KEYS,
  selectionAfterChange,
  type Preset,
  type PresetHeldControlKey,
  type PresetId,
  type PresetSelection,
  type SettingChange,
} from '@/domain/presets/preset-selection'
import { chosenControlChanges, type SaveSettings } from '@/storage/settings-saver'
import {
  SessionUsageError,
  type GenerationSessionActions,
  type MutableGenerationSessionState,
  type ThemePreference,
} from './generation-session-types'

const PRESET_HELD_KEYS: ReadonlySet<string> = new Set(PRESET_HELD_CONTROL_KEYS)
const FIGURE_ID_SET: ReadonlySet<string> = new Set(FIGURE_IDS)
const FIGURE_LEVEL_SET: ReadonlySet<string> = new Set(FIGURE_LEVEL_IDS)

/** The dependency surface the control actions need from the root session composable. */
export interface ControlActionDependencies<TResult> {
  readonly state: MutableGenerationSessionState<TResult>
  /** The note-density context at the window's width now, updated when the width has crossed. */
  readonly readNoteDensityContext: () => NoteDensityContext
  /** Post a prewarm for the width-resolved rhythm setting, when it changed since the last post. */
  readonly prewarmCurrentRhythmSetting: () => void
  /** Tell the room-notice reactions that a setting the phrase is generated from just changed. */
  readonly afterGenerationSettingChange: () => void
  /** Save the settings a player's change changed. */
  readonly saveSettings: SaveSettings
  /** The presets the session knows, chosen from and judged against: the built-ins for now. */
  readonly presets: () => readonly Preset[]
}

/** The control actions, plus the rhythm block the rest of the session judges generation by. */
export type ControlActions = Pick<
  GenerationSessionActions,
  'setControl' | 'setFigureLevel' | 'selectPreset' | 'setTheme'
> & {
  /** Whether the current controls' rhythm combination blocks generation at the width now. */
  readonly isBlockedByUnsupportedRhythm: () => boolean
}

/** The settings the phrase is generated from that a preset choice may change. */
interface GeneratedFrom {
  readonly controls: GenerationControls
  readonly figureLevels: FigureLevels
}

/** Intent: what an edit of one control is, as the selection needs to know it. */
function controlChange(key: keyof GenerationControls, controls: GenerationControls): SettingChange {
  if (PRESET_HELD_KEYS.has(key)) {
    return { kind: 'presetHeldControl', control: key as PresetHeldControlKey }
  }
  if (key === 'tonalCenter' || key === 'collection') {
    return { kind: 'keyOrMode', key: controls.tonalCenter, mode: controls.collection }
  }
  return { kind: 'notPresetHeld' }
}

/** Intent: whether a setting the phrase is generated from differs, the tempo apart. */
function generationSettingsDiffer(before: GeneratedFrom, after: GeneratedFrom): boolean {
  const controlKeys = Object.keys(after.controls) as (keyof GenerationControls)[]
  return (
    controlKeys.some((key) => key !== 'tempo' && before.controls[key] !== after.controls[key]) ||
    FIGURE_IDS.some((figure) => before.figureLevels[figure] !== after.figureLevels[figure])
  )
}

/**
 * Intent: build the session's control actions over the shared state. Configuration edits apply
 * only at idle; the theme is presentation-only and applies at any time.
 */
// @spec-link [[module_profile_control_customization]]
export function createControlActions<TResult>(
  deps: ControlActionDependencies<TResult>,
): ControlActions {
  const { state } = deps

  /** Intent: configuration may change only while no generation or drawing is in flight. */
  function canChangeConfiguration(): boolean {
    return state.operation === 'idle'
  }

  /**
   * Intent: the routing point's one apply: set the player's new controls, figure levels and
   * selection together, and save what changed. The phrase on screen stays.
   */
  // @spec-link [[module_profile_control_customization]]
  // @spec-link [[rule_settings_saved_on_change]]
  function applyChosen(
    controls: GenerationControls,
    figureLevels: FigureLevels,
    selection: PresetSelection,
  ): void {
    const before = {
      controls: state.controls,
      figureLevels: state.figureLevels,
      selection: state.selection,
    }
    state.controls = controls
    state.figureLevels = figureLevels
    state.selection = selection
    deps.saveSettings(chosenControlChanges(before, { controls, figureLevels, selection }))
  }

  /**
   * Intent: the reactions to an applied edit: a prewarm (posted only when the rhythm setting
   * changed, the trigger dedupes), and, for a setting the phrase is generated from, the
   * room-notice reactions.
   */
  // @spec-link [[module_profile_control_customization]]
  function reactToEdit(changesGenerationSetting: boolean): void {
    deps.prewarmCurrentRhythmSetting()
    if (changesGenerationSetting) deps.afterGenerationSettingChange()
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
   * An edit of one control. A preset-held control makes Custom, and so does a written key or a
   * collection outside the restriction in force; one inside it, the tempo and every other control
   * leave the selection as it is. The instrument is refused: it is switched outside this point.
   * An applied edit saves what it changed, posts a prewarm, and, but for the tempo, reacts under
   * the room notice.
   */
  // @spec-link [[module_profile_control_customization]]
  // @spec-link [[rule_custom_selection]]
  // @spec-link [[rule_restriction_in_force]]
  // @spec-link [[service_idle_generation_session]]
  // @spec-link [[rule_settings_saved_on_change]]
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
    const controls = makeGenerationControls({ ...state.controls, [key]: value })
    const selection = selectionAfterChange(
      state.selection,
      controlChange(key, controls),
      deps.presets(),
    )
    applyChosen(controls, state.figureLevels, selection)
    reactToEdit(key !== 'tempo')
    return true
  }

  /**
   * An edit of one figure's level: with a preset selected, the selection becomes Custom based on
   * it. A figure or a level that is not one is a defect. Applied, it saves what changed, posts a
   * prewarm and reacts under the room notice.
   */
  // @spec-link [[module_profile_control_customization]]
  // @spec-link [[rule_custom_selection]]
  // @spec-link [[service_idle_generation_session]]
  function setFigureLevel(figure: FigureId, level: FigureLevel): boolean {
    if (!FIGURE_ID_SET.has(figure)) {
      throw new SessionUsageError(`setFigureLevel: ${JSON.stringify(figure)} is not a figure.`)
    }
    if (!FIGURE_LEVEL_SET.has(level)) {
      throw new SessionUsageError(`setFigureLevel: ${JSON.stringify(level)} is not a level.`)
    }
    if (!canChangeConfiguration()) return false
    const figureLevels: FigureLevels = deepFreeze({ ...state.figureLevels, [figure]: level })
    const selection = selectionAfterChange(
      state.selection,
      { kind: 'figureLevel', figure },
      deps.presets(),
    )
    applyChosen(state.controls, figureLevels, selection)
    reactToEdit(true)
    return true
  }

  /**
   * Choose a known preset: its ten controls and seven levels replace the current ones, the key and
   * mode kept when its restriction allows them, and the selection becomes it; the tempo, the
   * instrument and the session options never change. Choosing the preset already selected changes,
   * saves, warms and reacts to nothing. An applied choice saves what changed and posts a prewarm;
   * one that changed a setting the phrase is generated from reacts under the room notice. An id no
   * known preset has is a defect.
   */
  // @spec-link [[module_generative_profile_selection]]
  // @spec-link [[rule_choosing_preset_sets_its_settings]]
  // @spec-link [[rule_choosing_preset_keeps_allowed_key_and_mode]]
  // @spec-link [[service_idle_generation_session]]
  // @spec-link [[rule_settings_saved_on_change]]
  function selectPreset(id: PresetId): boolean {
    const preset = findPreset(deps.presets(), id)
    if (preset === undefined) {
      throw new SessionUsageError(`selectPreset: no known preset has the id ${JSON.stringify(id)}.`)
    }
    if (!canChangeConfiguration()) return false
    const current = { controls: state.controls, levels: state.figureLevels }
    const chosen = choosePreset(current, state.selection, preset)
    if (chosen.settings === current) return true
    const before: GeneratedFrom = { controls: state.controls, figureLevels: state.figureLevels }
    const after: GeneratedFrom = {
      controls: makeGenerationControls(chosen.settings.controls),
      figureLevels: chosen.settings.levels,
    }
    applyChosen(after.controls, after.figureLevels, chosen.selection)
    reactToEdit(generationSettingsDiffer(before, after))
    return true
  }

  /**
   * Presentation-only: never routes to generation or engraving, and never touches
   * phrase/request/seed/result. A theme that changed is saved.
   */
  // @spec-link [[rule_presentation_preference_preserves_phrase]]
  // @spec-link [[rule_settings_saved_on_change]]
  function setTheme(theme: ThemePreference): boolean {
    const changed = state.presentation.theme !== theme
    state.presentation = { ...state.presentation, theme }
    if (changed) deps.saveSettings({ theme })
    return true
  }

  return { isBlockedByUnsupportedRhythm, setControl, setFigureLevel, selectPreset, setTheme }
}
