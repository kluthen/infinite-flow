/**
 * The preset label: how the musical profile selected at a session's start is named, "Neutral" or
 * "Jazz", or "Custom, based on Neutral" / "Custom, based on Jazz" when its controls were edited
 * away from the preset. This is the one label function both a newly kept session and the data
 * version 2 upgrade of an earlier kept session use, so the label stored with a session reads the
 * same whichever way it was written; `control-summary` will route through it later. Pure.
 */
import type { ProfileSelection } from './profile-selection'

/**
 * Intent: the preset label of a musical profile selection: the preset's name, or "Custom, based
 * on {preset}" when the selection is custom.
 */
// @spec-link [[rule_preset_label_kept_with_session]]
export function presetLabel(selection: ProfileSelection): string {
  return selection.isCustom
    ? `Custom, based on ${selection.musicalProfile}`
    : selection.musicalProfile
}
