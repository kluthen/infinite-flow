/**
 * The page's adaptive-tempo flag on its own, from the value it starts with: the player's saved
 * `Rising tempo` choice, kept even with no controller attached (it is only unavailable then, and
 * no session runs adaptive tempo without a controller), while turning it on still needs one.
 */
import { describe, expect, it } from 'vitest'
import { shallowRef } from 'vue'

import { createAdaptiveTempoFlag } from '@/components/workspace/workspace-adaptive-tempo'
import {
  SessionControllerError,
  type SessionControllerPhase,
} from '@/components/workspace/workspace-session-controller-types'
import type { MidiControllerState } from '@/midi/midi-controller-state'

/** A controller as the MIDI controller reports it once connected. */
const CONNECTED: MidiControllerState = {
  kind: 'connected',
  device: { id: 'keys', name: 'Keys', manufacturer: 'Test' },
}

/** Intent: a flag at Idle over a MIDI state the test sets, starting from `initialOn`. */
function flagFrom(initialOn: boolean) {
  const controller = shallowRef<MidiControllerState>({ kind: 'not-requested' })
  const phase: SessionControllerPhase = 'idle'
  const flag = createAdaptiveTempoFlag(
    () => controller.value,
    () => phase,
    initialOn,
  )
  return { flag, controller }
}

// @test-link [[req_adaptive_tempo]]
// @test-link [[rule_saved_setting_is_players_choice]]
describe('the adaptive-tempo flag: the value it starts from', () => {
  // @test-link [[req_adaptive_tempo]]
  it('starts off when loaded off, and turning it on still needs a controller', () => {
    const { flag, controller } = flagFrom(false)
    expect(flag.on()).toBe(false)
    expect(() => flag.set(true)).toThrow(SessionControllerError)
    controller.value = CONNECTED
    flag.set(true)
    expect(flag.on()).toBe(true)
  })

  // @test-link [[rule_saved_setting_is_players_choice]]
  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  it('keeps a loaded on with no controller attached: unavailable, and no session runs it', () => {
    const { flag, controller } = flagFrom(true)
    expect(flag.on()).toBe(true)
    expect(flag.available()).toBe(false)
    expect(flag.forSession(false)).toBe(false)
    expect(flag.forSession(null)).toBe(false)
    expect(() => flag.set(true)).toThrow(SessionControllerError)
    expect(flag.on()).toBe(true)

    controller.value = CONNECTED
    expect(flag.available()).toBe(true)
    expect(flag.forSession(true)).toBe(true)
  })
})
