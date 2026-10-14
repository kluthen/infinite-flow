/**
 * The session controller's "During a session" flags at its creation: each starts from the player's
 * saved choice, loaded before the first draw, so none changes value once the workspace is drawn.
 * A saved `Rising tempo` On is kept with no controller attached: it is only unavailable then.
 */
import { describe, expect, it } from 'vitest'

import { controllerRig } from './session-controller-rig'

// @test-link [[service_session_controller]]
// @test-link [[rule_first_phrase_waits_for_saved_settings]]
describe('session controller: the saved session options it starts from', () => {
  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  // @test-link [[req_settings_mutation_flag]]
  // @test-link [[req_multi_phrase_tension_arc]]
  // @test-link [[rule_saved_setting_is_players_choice]]
  it('starts each flag from its saved choice, Rising tempo on but unavailable with no controller', () => {
    const { controller } = controllerRig(undefined, undefined, {
      savedSessionOptions: { varySettings: true, tensionAcrossPhrases: true, risingTempo: true },
    })

    expect(controller.state.varySettings).toBe(true)
    expect(controller.state.tensionAcrossPhrases).toBe(true)
    expect(controller.state.adaptiveTempo).toBe(true)
    expect(controller.state.adaptiveTempoAvailable).toBe(false)
    controller.dispose()
  })

  // @test-link [[rule_settings_saved_on_change]]
  it("starts each flag off from a first visit's choices", () => {
    const { controller } = controllerRig()

    expect(controller.state.varySettings).toBe(false)
    expect(controller.state.tensionAcrossPhrases).toBe(false)
    expect(controller.state.adaptiveTempo).toBe(false)
    controller.dispose()
  })
})
