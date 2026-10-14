/**
 * A component reaches the saver of the player's changes through `SAVE_SETTINGS`, as App.vue
 * provides it; mounted without it, it fails at setup rather than dropping the player's changes.
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'

import { injectSaveSettings } from '@/components/workspace/save-settings-injection'
import type { SaveSettings } from '@/storage/settings-saver'
import { provideSaveSettings, recordingSaveSettings } from './recording-save-settings'

/** Intent: a component that injects the saver at setup and hands it to `found`. */
function injecting(found: (saveSettings: SaveSettings) => void) {
  return defineComponent({
    setup() {
      found(injectSaveSettings())
      return () => h('div')
    },
  })
}

// @test-link [[rule_settings_saved_on_change]]
describe('injectSaveSettings', () => {
  it('gives the saver provided under SAVE_SETTINGS', () => {
    const { saveSettings } = recordingSaveSettings()
    let injected: SaveSettings | null = null

    mount(
      injecting((found) => (injected = found)),
      { global: { provide: provideSaveSettings(saveSettings) } },
    )

    expect(injected).toBe(saveSettings)
  })

  it('throws at setup when nothing provided it', () => {
    expect(() => mount(injecting(() => undefined))).toThrow(/SAVE_SETTINGS/)
  })
})
