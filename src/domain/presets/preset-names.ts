/**
 * Player preset names and the player preset limit: the name check run when saving or renaming,
 * the suggested name for a new preset, and the 50-preset limit. Pure functions: no storage,
 * interface, clock or random source.
 */

import { deepFreeze } from '../events/deep-freeze'
import type { Preset, PresetId } from './preset-selection'

/** Intent: the longest name, in UTF-16 code units after trimming, matching the input's maxlength. */
// @spec-link [[rule_player_preset_names]]
export const PRESET_NAME_MAX_LENGTH = 40

/** Intent: the most player presets kept before a new save is refused. */
// @spec-link [[rule_player_preset_limit]]
export const PLAYER_PRESET_LIMIT = 50

/** Intent: the name the app uses for an unsaved selection, refused in any letter case. */
// @spec-link [[rule_player_preset_names]]
export const RESERVED_PRESET_NAME = 'Custom'

/** The outcome of a name check: the trimmed name, or the first reason it is refused. */
// @spec-link [[module_preset_model]]
// @spec-link [[rule_player_preset_names]]
export type PresetNameCheck =
  | { readonly ok: true; readonly name: string }
  | { readonly ok: false; readonly reason: 'empty' }
  | { readonly ok: false; readonly reason: 'tooLong' }
  | { readonly ok: false; readonly reason: 'reserved' }
  | { readonly ok: false; readonly reason: 'taken'; readonly existingName: string }

/** Intent: a name as compared for uniqueness: trimmed, ignoring case. */
function comparable(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Intent: check a typed name, trimmed at both ends, giving the first reason that applies: empty;
 * too long (over 40 code units); reserved ("Custom" in any case); taken (another preset's name,
 * trimmed and ignoring case, built-ins included, the preset being renamed excepted), naming that
 * preset as it writes it. An accepted name is given trimmed.
 */
// @spec-link [[module_preset_model]]
// @spec-link [[rule_player_preset_names]]
export function checkPresetName(
  typed: string,
  presets: readonly Preset[],
  renamingId?: PresetId,
): PresetNameCheck {
  return deepFreeze(nameCheck(typed.trim(), presets, renamingId))
}

/** Intent: the check of an already trimmed name, the first reason that applies. */
function nameCheck(
  name: string,
  presets: readonly Preset[],
  renamingId: PresetId | undefined,
): PresetNameCheck {
  if (name.length === 0) return { ok: false, reason: 'empty' }
  if (name.length > PRESET_NAME_MAX_LENGTH) return { ok: false, reason: 'tooLong' }
  if (comparable(name) === comparable(RESERVED_PRESET_NAME)) {
    return { ok: false, reason: 'reserved' }
  }
  const taken = presets.find(
    (preset) => preset.id !== renamingId && comparable(preset.name) === comparable(name),
  )
  if (taken !== undefined) return { ok: false, reason: 'taken', existingName: taken.name }
  return { ok: true, name }
}

/**
 * Intent: the name a new preset is offered: "My preset", else "My preset 2", "My preset 3" and so
 * on, the first no preset has, ignoring case and the spaces around existing names.
 */
// @spec-link [[rule_player_preset_names]]
export function suggestedPresetName(presets: readonly Preset[]): string {
  const taken = new Set(presets.map((preset) => comparable(preset.name)))
  const base = 'My preset'
  if (!taken.has(comparable(base))) return base
  let number = 2
  while (taken.has(comparable(`${base} ${number}`))) number += 1
  return `${base} ${number}`
}

/** Intent: whether saving a new player preset is refused: 50 or more player presets loaded. */
// @spec-link [[module_preset_model]]
// @spec-link [[rule_player_preset_limit]]
export function isPlayerPresetLimitReached(presets: readonly Preset[]): boolean {
  return presets.filter((preset) => preset.kind === 'player').length >= PLAYER_PRESET_LIMIT
}
