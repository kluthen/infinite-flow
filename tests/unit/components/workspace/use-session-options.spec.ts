/**
 * The "During a session" options while the session controller's chunk still loads: `Vary
 * settings` and `Tension across phrases` show the player's saved choices, the very values the
 * controller starts from, so neither changes when it arrives; `Rising tempo` shows Off,
 * unavailable, as it does once the controller exists with no MIDI controller attached.
 */
import { describe, expect, it } from 'vitest'
import { effectScope, shallowRef } from 'vue'

import { useSessionOptions } from '@/components/workspace/use-session-options'
import type { SessionController } from '@/components/workspace/workspace-session-controller-types'
import type { SessionOptionChoices } from '@/storage/records/setting-defaults'
import { createFakeSessionController } from './fake-session-controller'
import { recordingSaveSettings } from './recording-save-settings'

/** Every saved choice on. */
const ALL_ON: SessionOptionChoices = {
  varySettings: true,
  tensionAcrossPhrases: true,
  risingTempo: true,
}

/** Intent: the options over a controller the test sets, inside their own effect scope. */
function options(saved: SessionOptionChoices) {
  const controller = shallowRef<SessionController | null>(null)
  const { saveSettings, saves } = recordingSaveSettings()
  const scope = effectScope()
  const built = scope.run(() =>
    useSessionOptions({
      controller: () => controller.value,
      requireController: () => {
        if (controller.value === null) throw new Error('no controller')
        return controller.value
      },
      controlsReadonly: () => false,
      savedSessionOptions: () => saved,
      saveSettings,
    }),
  )
  if (built === undefined) throw new Error('the effect scope did not run')
  return { built, controller, saves, stop: () => scope.stop() }
}

// @test-link [[rule_first_phrase_waits_for_saved_settings]]
// @test-link [[req_settings_mutation_flag]]
describe('useSessionOptions: while the controller loads', () => {
  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  // @test-link [[req_settings_mutation_flag]]
  // @test-link [[req_multi_phrase_tension_arc]]
  it('shows the saved Vary settings and Tension across phrases, read-only, until it arrives', () => {
    const { built, controller, stop } = options(ALL_ON)

    expect(built.sessionOptionsReadonly.value).toBe(true)
    expect(built.varySettings.value).toBe(true)
    expect(built.tensionAcrossPhrases.value).toBe(true)

    const fake = createFakeSessionController()
    fake.state.varySettings = false
    controller.value = fake.controller
    expect(built.varySettings.value).toBe(false)
    expect(built.sessionOptionsReadonly.value).toBe(false)
    stop()
  })

  // @test-link [[req_adaptive_tempo]]
  // @test-link [[rule_saved_setting_is_players_choice]]
  it('shows Rising tempo unavailable, as with a controller and no MIDI controller attached', () => {
    const { built, controller, stop } = options(ALL_ON)
    expect(built.risingTempo.available.value).toBe(false)

    const fake = createFakeSessionController()
    fake.state.adaptiveTempo = true
    fake.state.adaptiveTempoAvailable = false
    controller.value = fake.controller
    expect(built.risingTempo.available.value).toBe(false)
    expect(built.risingTempo.on.value).toBe(true)
    stop()
  })
})

// @test-link [[rule_settings_saved_on_change]]
// @test-link [[rule_saved_setting_is_players_choice]]
describe("useSessionOptions: saving the player's choices", () => {
  it('saves each choice once the controller accepted it', () => {
    const { built, controller, saves, stop } = options(ALL_ON)
    const fake = createFakeSessionController()
    fake.state.adaptiveTempoAvailable = true
    controller.value = fake.controller

    built.setVarySettings(false)
    built.setTensionAcrossPhrases(false)
    built.setRisingTempo(true)

    expect(fake.setVarySettings).toHaveBeenCalledWith(false)
    expect(saves).toEqual([
      { 'sessionOptions.varySettings': false },
      { 'sessionOptions.tensionAcrossPhrases': false },
      { 'sessionOptions.risingTempo': true },
    ])
    stop()
  })

  it('saves nothing when the controller refuses the change', () => {
    const { built, controller, saves, stop } = options(ALL_ON)
    const fake = createFakeSessionController()
    fake.state.phase = 'running'
    controller.value = fake.controller

    expect(() => built.setVarySettings(true)).toThrow(/during a session/)
    expect(() => built.setTensionAcrossPhrases(true)).toThrow(/during a session/)
    expect(() => built.setRisingTempo(true)).toThrow(/during a session/)

    expect(saves).toEqual([])
    stop()
  })
})
