/**
 * Saving presets: the restriction choices of save as new and save changes, and the presets those
 * saves make. Pure functions: no storage, interface, clock or random source; a new preset's id
 * comes from an injected id source.
 */

import type { Collection, PitchClass } from '../controls/generation-controls'
import { deepFreeze } from '../events/deep-freeze'
import { isBuiltInPresetId } from './built-in-presets'
import {
  allowsKeyAndMode,
  ANY_KEY_AND_MODE,
  onlyKeyAndMode,
  sameRestriction,
  type KeyAndModeRestriction,
} from './key-and-mode-restriction'
import { isPlayerPresetLimitReached } from './preset-names'
import {
  findPreset,
  makePreset,
  PresetModelError,
  restrictionInForce,
  type Preset,
  type PresetSelection,
  type PresetSettings,
} from './preset-selection'

/** Intent: the three restriction choices a save can offer. */
// @spec-link [[rule_saving_preset_asks_its_restriction]]
export type SaveRestrictionChoiceKind = 'asNow' | 'onlyThisKeyAndMode' | 'anyKeyAndMode'

/** One restriction choice offered when saving, with the restriction it stands for. */
// @spec-link [[module_preset_model]]
// @spec-link [[rule_saving_preset_asks_its_restriction]]
export interface SaveRestrictionChoice {
  readonly kind: SaveRestrictionChoiceKind
  readonly restriction: KeyAndModeRestriction
}

/** Intent: the "any key and mode" choice. */
function anyChoice(): SaveRestrictionChoice {
  return { kind: 'anyKeyAndMode', restriction: ANY_KEY_AND_MODE }
}

/** Intent: the "only this key and mode" choice for the current written key and collection. */
function onlyChoice(key: PitchClass, mode: Collection): SaveRestrictionChoice {
  return { kind: 'onlyThisKeyAndMode', restriction: onlyKeyAndMode(key, mode) }
}

/**
 * Intent: the save-as-new restriction choices, the default first. "As now" is the restriction in
 * force, or any when none is; choices meaning the same restriction are one, in the default's
 * place, under the plainer kind: [any, only] when as now is any, [only, any] when as now is
 * exactly the current pair, otherwise [as now, only, any].
 */
// @spec-link [[module_preset_model]]
// @spec-link [[rule_saving_preset_asks_its_restriction]]
export function saveAsNewChoices(
  selection: PresetSelection,
  key: PitchClass,
  mode: Collection,
  presets: readonly Preset[],
): readonly SaveRestrictionChoice[] {
  const asNow = restrictionInForce(selection, key, mode, presets) ?? ANY_KEY_AND_MODE
  const only = onlyChoice(key, mode)
  if (sameRestriction(asNow, ANY_KEY_AND_MODE)) return deepFreeze([anyChoice(), only])
  if (sameRestriction(asNow, only.restriction)) return deepFreeze([only, anyChoice()])
  return deepFreeze([{ kind: 'asNow', restriction: asNow }, only, anyChoice()])
}

/** Intent: refuse an act the model never allows on a built-in preset. */
function refuseBuiltIn(preset: Preset): void {
  if (preset.kind === 'builtIn') {
    throw new PresetModelError(`Changes are never saved into the built-in preset "${preset.id}".`)
  }
}

/**
 * Intent: whether saving changes into a player preset asks for its restriction: only when the
 * written key or collection lies outside it, offering any (as now, none being in force) then only
 * this key and mode. Inside it nothing is asked and the preset keeps its restriction. Throws a
 * PresetModelError for a built-in preset.
 */
// @spec-link [[rule_save_changes_restriction]]
export function saveChangesQuestion(
  preset: Preset,
  key: PitchClass,
  mode: Collection,
):
  | { readonly asks: false }
  | { readonly asks: true; readonly choices: readonly SaveRestrictionChoice[] } {
  refuseBuiltIn(preset)
  if (allowsKeyAndMode(preset.restriction, key, mode)) return deepFreeze({ asks: false })
  return deepFreeze({ asks: true, choices: [anyChoice(), onlyChoice(key, mode)] })
}

/**
 * Intent: a player preset with changes saved into it: same id, name and kind, the ten preset-held
 * controls and seven levels from the settings, and the restriction answered, or its own when none
 * was asked (null). Throws a PresetModelError for a built-in preset.
 */
// @spec-link [[rule_save_changes_restriction]]
export function presetWithSavedChanges(
  preset: Preset,
  settings: PresetSettings,
  restriction: KeyAndModeRestriction | null,
): Preset {
  refuseBuiltIn(preset)
  return makePreset({
    id: preset.id,
    name: preset.name,
    controls: settings.controls,
    levels: settings.levels,
    restriction: restriction ?? preset.restriction,
    kind: preset.kind,
  })
}

/** Intent: where a new player preset's id comes from, injected by the caller. */
// @spec-link [[module_preset_model]]
export type PresetIdSource = () => string

/**
 * Intent: a new player preset holding the ten preset-held controls, the levels and the restriction
 * chosen, under the name given (already checked by the caller) and an id from `nextId`. Throws a
 * PresetModelError while 50 or more player presets are loaded, or when the id is empty, a built-in
 * id or an existing preset's id.
 */
// @spec-link [[rule_saving_preset_asks_its_restriction]]
// @spec-link [[rule_player_preset_limit]]
export function presetForSaveAsNew(
  input: {
    readonly name: string
    readonly settings: PresetSettings
    readonly restriction: KeyAndModeRestriction
  },
  nextId: PresetIdSource,
  presets: readonly Preset[],
): Preset {
  if (isPlayerPresetLimitReached(presets)) {
    throw new PresetModelError('No new player preset is saved while 50 or more are kept.')
  }
  const id = nextId()
  if (id.length === 0 || isBuiltInPresetId(id) || findPreset(presets, id) !== undefined) {
    throw new PresetModelError(`A new preset cannot take the id ${JSON.stringify(id)}.`)
  }
  return makePreset({
    id,
    name: input.name,
    controls: input.settings.controls,
    levels: input.settings.levels,
    restriction: input.restriction,
    kind: 'player',
  })
}

/** Intent: the selection after either save: the saved preset. */
// @spec-link [[module_preset_model]]
export function selectionOfSavedPreset(preset: Preset): PresetSelection {
  return deepFreeze({ kind: 'preset', presetId: preset.id })
}
