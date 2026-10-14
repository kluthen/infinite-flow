/**
 * How the workspace's components reach the saver of the player's changes: App.vue provides the
 * workspace session's `saveSettings` under `SAVE_SETTINGS`, and each component whose change
 * handlers save (the audio mix, the "During a session" options, the Review's choices) injects it
 * at setup. There is no default: a component mounted without it is a wiring defect, and throws.
 */
import { inject, type InjectionKey } from 'vue'

import type { SaveSettings } from '@/storage/settings-saver'

/** The injection key of the saver of the player's changes. */
// @spec-link [[rule_settings_saved_on_change]]
export const SAVE_SETTINGS: InjectionKey<SaveSettings> = Symbol('save-settings')

/**
 * Intent: the saver of the player's changes, injected at setup; throws when nothing provided it,
 * so a component wired without it fails at once rather than dropping the player's changes.
 */
// @spec-link [[rule_settings_saved_on_change]]
export function injectSaveSettings(): SaveSettings {
  const saveSettings = inject(SAVE_SETTINGS, null)
  if (saveSettings === null) {
    throw new Error('save settings: nothing provided SAVE_SETTINGS to this component')
  }
  return saveSettings
}
