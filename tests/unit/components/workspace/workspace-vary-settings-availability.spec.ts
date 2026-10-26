/**
 * Whether `Vary settings` is available, through the session controller over real runners: the
 * legal-move check on the settings a session started now would take, the player's lock and groups
 * among them, judged live at Idle and held during a session as it was when the session left Idle.
 */
import { describe, expect, it } from 'vitest'

import type { GenerationControls } from '@/domain/controls/generation-controls'
import { ALL_GROUPS_ALLOWED } from '@/session/settings-mutation-scales'
import { DEFAULT_SESSION_OPTIONS } from '@/storage/records/setting-defaults'
import { controllerRig } from './session-controller-rig'

/** Only the Rhythm group allowed. */
const ONLY_RHYTHM = {
  keyAndMode: false,
  harmony: false,
  tension: false,
  rhythm: true,
  melodyShape: false,
  figures: false,
}

/**
 * Rhythm settings outside the supported block: under the rhythm lock no step leads out of it, so
 * no move is possible whatever the groups.
 */
const BLOCKED_RHYTHM: Partial<GenerationControls> = {
  noteDensity: 'Quarter',
  rhythmicVariety: 'Strict',
  silenceDensity: 'Sparse',
  syncopation: 'Active displacement',
}

// @test-link [[rule_vary_settings_needs_legal_move]]
// @test-link [[module_session_vary_settings_flag]]
describe('session controller: whether Vary settings has a move', () => {
  // @test-link [[rule_vary_settings_needs_legal_move]]
  // @test-link [[rule_vary_settings_allowed_groups]]
  it('is available with the defaults, not with only the Rhythm group under the lock, and again with another group', () => {
    const rig = controllerRig()
    expect(rig.controller.state.varySettingsAvailable).toBe(true)

    rig.controller.setRhythmLockOn(true)
    rig.controller.setAllowedGroups(ONLY_RHYTHM)
    expect(rig.controller.state.varySettingsAvailable).toBe(false)

    rig.controller.setAllowedGroups({ ...ONLY_RHYTHM, harmony: true })
    expect(rig.controller.state.varySettingsAvailable).toBe(true)

    rig.controller.setRhythmLockOn(false)
    rig.controller.setAllowedGroups(ONLY_RHYTHM)
    expect(rig.controller.state.varySettingsAvailable).toBe(true)
  })

  // @test-link [[rule_vary_settings_needs_legal_move]]
  it('follows a change of the Idle settings at Idle', () => {
    const rig = controllerRig(undefined, undefined, {
      savedSessionOptions: { ...DEFAULT_SESSION_OPTIONS, rhythmLockOn: true },
    })
    expect(rig.controller.state.varySettingsAvailable).toBe(true)

    rig.idle.controls = { ...rig.idle.controls, ...BLOCKED_RHYTHM }

    expect(rig.controller.state.varySettingsAvailable).toBe(false)
  })

  // @test-link [[rule_vary_settings_needs_legal_move]]
  it('keeps during a session what it was at the start, whatever Idle does, and is live again after', () => {
    const rig = controllerRig(undefined, undefined, {
      savedSessionOptions: {
        ...DEFAULT_SESSION_OPTIONS,
        rhythmLockOn: true,
        allowedGroups: ALL_GROUPS_ALLOWED,
      },
    })
    rig.controller.start()
    expect(rig.controller.state.phase).not.toBe('idle')

    rig.idle.controls = { ...rig.idle.controls, ...BLOCKED_RHYTHM }
    expect(rig.controller.state.varySettingsAvailable).toBe(true)

    rig.controller.stop()
    expect(rig.controller.state.phase).toBe('idle')
    expect(rig.controller.state.varySettingsAvailable).toBe(false)
  })
})
