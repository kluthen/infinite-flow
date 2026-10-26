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
import { RHYTHM_CHANGE_KINDS } from '@/domain/generation/request-rhythm-lock'
import { ALL_GROUPS_ALLOWED } from '@/session/settings-mutation-scales'
import {
  DEFAULT_SESSION_OPTIONS,
  type SessionOptionChoices,
} from '@/storage/records/setting-defaults'
import { createFakeSessionController } from './fake-session-controller'
import { recordingSaveSettings } from './recording-save-settings'

/** Every saved flag on, the rhythm lock with them; every rhythm change allowed. */
const ALL_ON: SessionOptionChoices = {
  ...DEFAULT_SESSION_OPTIONS,
  varySettings: true,
  tensionAcrossPhrases: true,
  risingTempo: true,
  rhythmLockOn: true,
  allowedRhythmChanges: RHYTHM_CHANGE_KINDS,
  allowedGroups: { ...ALL_GROUPS_ALLOWED, rhythm: false },
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

  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  // @test-link [[req_rhythm_lock]]
  // @test-link [[rule_vary_settings_allowed_groups]]
  // @test-link [[rule_vary_settings_needs_legal_move]]
  it("shows the saved lock, rhythm changes and groups, Vary settings available, until the controller's arrive", () => {
    const { built, controller, stop } = options(ALL_ON)

    expect(built.rhythmLockOn.value).toBe(true)
    expect(built.allowedRhythmChanges.value).toEqual(RHYTHM_CHANGE_KINDS)
    expect(built.allowedGroups.value).toEqual({ ...ALL_GROUPS_ALLOWED, rhythm: false })
    expect(built.varySettingsAvailable.value).toBe(true)

    const fake = createFakeSessionController()
    fake.state.rhythmLockOn = false
    fake.state.allowedRhythmChanges = ['split_note']
    fake.state.allowedGroups = { ...ALL_GROUPS_ALLOWED, harmony: false }
    fake.state.varySettingsAvailable = false
    controller.value = fake.controller
    expect(built.rhythmLockOn.value).toBe(false)
    expect(built.allowedRhythmChanges.value).toEqual(['split_note'])
    expect(built.allowedGroups.value).toEqual({ ...ALL_GROUPS_ALLOWED, harmony: false })
    expect(built.varySettingsAvailable.value).toBe(false)
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

  it('saves the lock, the rhythm changes and the groups once the controller accepted each', () => {
    const { built, controller, saves, stop } = options(ALL_ON)
    const fake = createFakeSessionController()
    controller.value = fake.controller
    const groups = { ...ALL_GROUPS_ALLOWED, tension: false }

    built.setRhythmLockOn(true)
    built.setAllowedRhythmChanges(['move_rest', 'note_rest'])
    built.setAllowedGroups(groups)

    expect(fake.setRhythmLockOn).toHaveBeenCalledExactlyOnceWith(true)
    expect(fake.setAllowedRhythmChanges).toHaveBeenCalledExactlyOnceWith(['move_rest', 'note_rest'])
    expect(fake.setAllowedGroups).toHaveBeenCalledExactlyOnceWith(groups)
    expect(saves).toEqual([
      { 'sessionOptions.rhythmLockOn': true },
      { 'sessionOptions.allowedRhythmChanges': ['move_rest', 'note_rest'] },
      { 'sessionOptions.allowedGroups': groups },
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
    expect(() => built.setRhythmLockOn(true)).toThrow(/during a session/)
    expect(() => built.setAllowedRhythmChanges([])).toThrow(/during a session/)
    expect(() => built.setAllowedGroups(ALL_GROUPS_ALLOWED)).toThrow(/during a session/)

    expect(saves).toEqual([])
    stop()
  })
})
