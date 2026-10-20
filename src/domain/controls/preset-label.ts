/**
 * The preset label: how the selection at a session's start is named, the selected preset's name,
 * or "Custom, based on {name}" naming Custom's base, or just "Custom" when it has none. This is the
 * one label function a newly kept session, the data version 2 upgrade of an earlier kept session
 * and the control summary use, so the label reads the same wherever it is written. A v3.0 musical
 * profile selection, which the upgrade still reads, labels exactly as v3.0 did ("Jazz", "Custom,
 * based on Jazz"). Pure.
 */
import { BUILT_IN_PRESETS } from '../presets/built-in-presets'
import { findPreset, type Preset, type PresetSelection } from '../presets/preset-selection'
import type { ProfileSelection } from './profile-selection'

/** Intent: whether a selection is v3.0's musical profile selection, not a preset selection. */
function isProfileSelection(
  selection: PresetSelection | ProfileSelection,
): selection is ProfileSelection {
  return 'musicalProfile' in selection
}

/**
 * Intent: the preset label of a selection. A v3.0 musical profile selection: the profile's name,
 * or "Custom, based on {profile}" when it is custom. A preset selection, named from the presets the
 * session knows: the preset's name; Custom with a base found, "Custom, based on {name}"; Custom
 * with no base, or a base no preset has (deleted), just "Custom". A selected preset id no preset
 * has is a defect and throws.
 */
// @spec-link [[rule_preset_label_kept_with_session]]
// @spec-link [[rule_custom_names_its_base]]
export function presetLabel(
  selection: PresetSelection | ProfileSelection,
  presets: readonly Preset[] = BUILT_IN_PRESETS,
): string {
  if (isProfileSelection(selection))
    return selection.isCustom
      ? `Custom, based on ${selection.musicalProfile}`
      : selection.musicalProfile
  if (selection.kind === 'preset') {
    const preset = findPreset(presets, selection.presetId)
    if (preset === undefined)
      throw new Error(`preset label: no preset has the selected id "${selection.presetId}"`)
    return preset.name
  }
  const base = selection.baseId === null ? undefined : findPreset(presets, selection.baseId)
  return base === undefined ? 'Custom' : `Custom, based on ${base.name}`
}
