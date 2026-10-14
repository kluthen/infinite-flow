/**
 * The components' saver of the player's changes, recording: every batch a change handler saves
 * lands in `saves`, in order; and the `global.provide` entry that hands a mounted component the
 * saver through `SAVE_SETTINGS`, as App.vue does.
 */
import { SAVE_SETTINGS } from '@/components/workspace/save-settings-injection'
import type { SaveSettings, SettingChanges } from '@/storage/settings-saver'

/** A saver and every batch it was given. */
export interface RecordingSaveSettings {
  readonly saveSettings: SaveSettings
  readonly saves: SettingChanges[]
}

/** Intent: a saver recording every batch it is given, in order. */
export function recordingSaveSettings(): RecordingSaveSettings {
  const saves: SettingChanges[] = []
  return { saveSettings: (changes) => void saves.push(changes), saves }
}

/** Intent: the `global.provide` entry handing a mounted component `saveSettings`. */
export function provideSaveSettings(
  saveSettings: SaveSettings = recordingSaveSettings().saveSettings,
): Record<symbol, SaveSettings> {
  return { [SAVE_SETTINGS as symbol]: saveSettings }
}
