/**
 * The session controller's "During a session" flags at its creation: each starts from the player's
 * saved choice, loaded before the first draw, so none changes value once the workspace is drawn.
 * A saved `Rising tempo` On is kept with no controller attached: it is only unavailable then.
 * Session mode's rhythm lock, its allowed rhythm changes and Vary settings' allowed groups start
 * from the saved choices the same way, change only outside a session and are kept across one.
 */
import { describe, expect, it } from 'vitest'

import { SessionControllerError } from '@/components/workspace/workspace-session-controller-types'
import type { RhythmChangeKind } from '@/domain/generation/request-rhythm-lock'
import type { AllowedGroups } from '@/session/settings-mutation-scales'
import {
  DEFAULT_SESSION_OPTIONS,
  type SessionOptionChoices,
} from '@/storage/records/setting-defaults'
import { controllerRig, playTo, type ControllerRig } from './session-controller-rig'

/** Saved choices with the rhythm lock on, two changes allowed and the Figures group off. */
const SAVED_LOCK: SessionOptionChoices = {
  ...DEFAULT_SESSION_OPTIONS,
  rhythmLockOn: true,
  allowedRhythmChanges: ['move_rest', 'note_rest'],
  allowedGroups: { ...DEFAULT_SESSION_OPTIONS.allowedGroups, figures: false },
}

/** Intent: the controller's three lock and group choices as its state shows them. */
function lockChoicesOf(
  rig: ControllerRig,
): Pick<SessionOptionChoices, 'rhythmLockOn' | 'allowedRhythmChanges' | 'allowedGroups'> {
  const { rhythmLockOn, allowedRhythmChanges, allowedGroups } = rig.controller.state
  return { rhythmLockOn, allowedRhythmChanges, allowedGroups }
}

// @test-link [[service_session_controller]]
// @test-link [[rule_first_phrase_waits_for_saved_settings]]
describe('session controller: the saved session options it starts from', () => {
  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  // @test-link [[req_settings_mutation_flag]]
  // @test-link [[req_multi_phrase_tension_arc]]
  // @test-link [[rule_saved_setting_is_players_choice]]
  it('starts each flag from its saved choice, Rising tempo on but unavailable with no controller', () => {
    const { controller } = controllerRig(undefined, undefined, {
      savedSessionOptions: {
        ...DEFAULT_SESSION_OPTIONS,
        varySettings: true,
        tensionAcrossPhrases: true,
        risingTempo: true,
      },
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

// @test-link [[module_session_lock_and_groups_choices]]
describe('session controller: the rhythm lock, its allowed changes and the allowed groups', () => {
  // @test-link [[module_session_lock_and_groups_choices]]
  // @test-link [[req_rhythm_lock]]
  it('starts the three from their saved choices', () => {
    const rig = controllerRig(undefined, undefined, { savedSessionOptions: SAVED_LOCK })

    expect(lockChoicesOf(rig)).toEqual({
      rhythmLockOn: true,
      allowedRhythmChanges: ['move_rest', 'note_rest'],
      allowedGroups: { ...DEFAULT_SESSION_OPTIONS.allowedGroups, figures: false },
    })
    rig.controller.dispose()
  })

  // @test-link [[module_session_lock_and_groups_choices]]
  it("starts the lock off, no change allowed and every group allowed from a first visit's choices", () => {
    const rig = controllerRig()

    expect(lockChoicesOf(rig)).toEqual({
      rhythmLockOn: false,
      allowedRhythmChanges: [],
      allowedGroups: {
        keyAndMode: true,
        harmony: true,
        tension: true,
        rhythm: true,
        melodyShape: true,
        figures: true,
      },
    })
    rig.controller.dispose()
  })

  // @test-link [[module_session_lock_and_groups_choices]]
  it('refuses each change during the count-in and a running session, each value unchanged', async () => {
    const rig = controllerRig(undefined, undefined, { savedSessionOptions: SAVED_LOCK })
    const saved = lockChoicesOf(rig)
    /** Intent: try each of the three changes, each refused. */
    const triesEach = (): void => {
      expect(() => rig.controller.setRhythmLockOn(false)).toThrow(SessionControllerError)
      expect(() => rig.controller.setAllowedRhythmChanges(['split_note'])).toThrow(
        SessionControllerError,
      )
      expect(() => rig.controller.setAllowedGroups(DEFAULT_SESSION_OPTIONS.allowedGroups)).toThrow(
        SessionControllerError,
      )
    }

    expect(rig.controller.start()).toBe('started')
    expect(rig.controller.state.phase).toBe('count-in')
    triesEach()
    expect(lockChoicesOf(rig)).toEqual(saved)

    await playTo(rig, 7)
    expect(rig.controller.state.phase).toBe('running')
    triesEach()
    expect(lockChoicesOf(rig)).toEqual(saved)
    rig.controller.stop()
  })

  // @test-link [[module_session_lock_and_groups_choices]]
  // @test-link [[rule_allowed_rhythm_changes]]
  // @test-link [[rule_vary_settings_allowed_groups]]
  it('keeps the choices set at Idle across a session, which starts with them', async () => {
    const rig = controllerRig()
    const groups: AllowedGroups = {
      ...DEFAULT_SESSION_OPTIONS.allowedGroups,
      harmony: false,
      rhythm: false,
    }
    rig.controller.setRhythmLockOn(true)
    rig.controller.setAllowedRhythmChanges(['move_note_start', 'merge_notes'])
    rig.controller.setAllowedGroups(groups)
    const chosen = {
      rhythmLockOn: true,
      allowedRhythmChanges: ['move_note_start', 'merge_notes'],
      allowedGroups: groups,
    }

    expect(rig.controller.start()).toBe('started')
    await playTo(rig, 7)
    rig.controller.stop()

    expect(lockChoicesOf(rig)).toEqual(chosen)
    expect(rig.runnerInputs[0]!.start.settings).toMatchObject(chosen)
    expect(rig.controller.state.review?.showing).toBe(true)
    rig.controller.setRhythmLockOn(false)
    expect(rig.controller.state.rhythmLockOn).toBe(false)
  })

  // @test-link [[module_session_lock_and_groups_choices]]
  // @test-link [[rule_allowed_rhythm_changes]]
  // @test-link [[rule_vary_settings_allowed_groups]]
  it('throws on a kinds list out of order, repeated or unknown, and on groups not exactly the six', () => {
    const rig = controllerRig(undefined, undefined, { savedSessionOptions: SAVED_LOCK })
    const before = lockChoicesOf(rig)
    const badKinds: readonly (readonly string[])[] = [
      ['note_rest', 'move_rest'],
      ['move_rest', 'move_rest'],
      ['shuffle'],
    ]
    const { figures, ...fiveGroups } = DEFAULT_SESSION_OPTIONS.allowedGroups
    void figures
    const badGroups: readonly unknown[] = [
      fiveGroups,
      { ...DEFAULT_SESSION_OPTIONS.allowedGroups, pitch: true },
      { ...DEFAULT_SESSION_OPTIONS.allowedGroups, rhythm: 'off' },
    ]

    for (const kinds of badKinds) {
      expect(() => rig.controller.setAllowedRhythmChanges(kinds as RhythmChangeKind[])).toThrow(
        SessionControllerError,
      )
    }
    for (const groups of badGroups) {
      expect(() => rig.controller.setAllowedGroups(groups as AllowedGroups)).toThrow(
        SessionControllerError,
      )
    }
    expect(lockChoicesOf(rig)).toEqual(before)
    rig.controller.dispose()
  })
})
