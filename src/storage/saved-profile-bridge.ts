/**
 * The interim bridge between the session's preset selection and v3.0's stored musical-profile
 * selection (spec D377), until chunk 16 replaces v3.0's settings record: what a selection is
 * written as, and what a stored selection loads as. Only Neutral and Jazz, the two built-ins v3.0
 * knew, have a stored form; the figure levels are not stored yet. Pure: no browser API.
 */

import type { GenerationControls, MusicalProfile } from '@/domain/controls/generation-controls'
import type { ProfileSelection } from '@/domain/controls/profile-selection'
import { deepFreeze } from '@/domain/events/deep-freeze'
import type { FigureLevels } from '@/domain/figures/figure-levels'
import { builtInPreset, type BuiltInPresetId } from '@/domain/presets/built-in-presets'
import {
  PRESET_HELD_CONTROL_KEYS,
  type PresetId,
  type PresetSelection,
} from '@/domain/presets/preset-selection'

/** The two built-ins v3.0's stored selection can name, by its musical profile. */
const PROFILE_PRESET_IDS: Readonly<Record<MusicalProfile, BuiltInPresetId>> = deepFreeze({
  Neutral: 'neutral',
  Jazz: 'jazz',
})

/** Intent: the v3.0 musical profile a built-in's id stands for, or null for any other preset. */
function profileOfPresetId(id: PresetId | null): MusicalProfile | null {
  if (id === PROFILE_PRESET_IDS.Neutral) return 'Neutral'
  if (id === PROFILE_PRESET_IDS.Jazz) return 'Jazz'
  return null
}

/**
 * Intent: a selection written as v3.0's stored selection: Neutral, Jazz, or Custom based on
 * either (customized); null for any other selection, which v3.0's record cannot hold.
 */
// @spec-link [[rule_settings_saved_on_change]]
export function savedProfileOf(selection: PresetSelection): ProfileSelection | null {
  const isCustom = selection.kind === 'custom'
  const musicalProfile = profileOfPresetId(isCustom ? selection.baseId : selection.presetId)
  return musicalProfile === null ? null : { musicalProfile, isCustom }
}

/**
 * Intent: the preset selection and figure levels v3.0's stored selection loads as, read against
 * the loaded controls: the levels are that built-in's; the selection is Custom based on it when
 * the stored one was customized, or when any of the ten preset-held controls differs from the
 * built-in's value (saved values win: Jazz saved with Tension at Build loads as Custom based on
 * Jazz); otherwise the built-in.
 */
// @spec-link [[rule_saved_profile_becomes_preset]]
export function presetChoiceOfSavedProfile(
  saved: ProfileSelection,
  controls: GenerationControls,
): { readonly selection: PresetSelection; readonly figureLevels: FigureLevels } {
  const preset = builtInPreset(PROFILE_PRESET_IDS[saved.musicalProfile])
  const differs = PRESET_HELD_CONTROL_KEYS.some((key) => controls[key] !== preset.controls[key])
  const selection: PresetSelection =
    saved.isCustom || differs
      ? { kind: 'custom', baseId: preset.id }
      : { kind: 'preset', presetId: preset.id }
  return deepFreeze({ selection, figureLevels: preset.levels })
}
