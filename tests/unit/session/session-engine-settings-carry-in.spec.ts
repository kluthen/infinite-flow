/**
 * The carry-in of the first phrase requested after a settings change, on timed events at 240 BPM
 * (a 1 s measure): a key change drops its harmonic part, a register change replaces its window or,
 * when the last pitch no longer fits, makes every rung standalone, and a change to Varying makes
 * that phrase standalone before the next one carries in from it again.
 */

import { describe, expect, it } from 'vitest'

import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import type { CarryIn } from '@/domain/generation/carry-in/carry-in'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import { registerWindowContainsPitch } from '@/domain/profile/register-window'
import { successFor, type GenerationRequestOutput, type SessionDriver } from './session-harness'
import { soundingAt } from './scripted-session'
import { carryFromTwo, requestIn, settingsWith, threeRequested } from './settings-change-session'

// @test-link [[rule_setting_change_rechecks_pitch_carry_in]]
// @test-link [[rule_key_change_drops_harmonic_carry_in]]
// @test-link [[rule_register_change_replaces_carried_window]]
describe('the carry-in after a settings change', () => {
  /** Intent: discard the undecided phrase 3 for a change to these settings, and its new request. */
  function changedRequest(overrides: Partial<GenerationControls>): {
    readonly driver: SessionDriver
    readonly request: GenerationRequestOutput
    readonly carry: CarryIn
  } {
    const driver = threeRequested(false)
    const request = requestIn(driver.change(soundingAt(2) + 1, settingsWith(overrides)))
    return { driver, request, carry: carryFromTwo(driver) }
  }

  // @test-link [[rule_key_change_drops_harmonic_carry_in]]
  it('drops the harmonic part after a key change and keeps the pitch part', () => {
    const { request, carry } = changedRequest({ tonalCenter: 'G' })
    expect(carry.finalHarmony).not.toBeNull()
    expect(request.step).toBe('carry-in')
    expect(request.intent.carryIn?.finalHarmony).toBeNull()
    expect(request.intent.carryIn?.lastPitch).toEqual(carry.lastPitch)
    expect(request.intent.carryIn?.registerWindow).toEqual(carry.registerWindow)
  })

  // @test-link [[rule_register_change_replaces_carried_window]]
  it("replaces the carried window with the new register's after a register change", () => {
    const { request, carry } = changedRequest({ register: 'Low' })
    const low = request.intent.registerIntent.candidates.find((entry) => entry.id === 'Low')
    expect(carry.registerWindow).not.toEqual(low?.window)
    expect(request.step).toBe('carry-in')
    expect(request.intent.carryIn?.registerWindow).toEqual(low?.window)
    expect(request.intent.carryIn?.lastPitch).toEqual(carry.lastPitch)
  })

  // @test-link [[rule_setting_change_rechecks_pitch_carry_in]]
  it('requests every rung standalone, pinned to the new register, when the pitch no longer fits', () => {
    const { driver, request, carry } = changedRequest({ register: 'High' })
    const high = request.intent.registerIntent.candidates.find((entry) => entry.id === 'High')!
    expect(registerWindowContainsPitch(high.window, carry.lastPitch.midi)).toBe(false)
    for (let retry = 0; retry < 5; retry += 1) {
      const attempt = driver.lastRequest()
      expect(attempt).toMatchObject({ phraseNumber: 3, step: 'standalone', retry })
      expect(attempt.intent.carryIn).toBeUndefined()
      expect(attempt.intent.controls.register).toBe('High')
      if (retry < 4) driver.fail(soundingAt(2) + 1.1 + retry / 10)
    }
    const [, ready] = driver.accept(soundingAt(2) + 1.6)
    expect(ready).toMatchObject({ kind: 'phrase-ready', phrase: { origin: 'standalone' } })
  })

  // @test-link [[rule_register_change_replaces_carried_window]]
  // @test-link [[rule_varying_register_once_per_session]]
  it('requests a standalone Varying phrase after a change to Varying, and carries in from it next', () => {
    const { driver, request } = changedRequest({ register: 'Varying' })
    expect(request).toMatchObject({ step: 'standalone', retry: 0 })
    expect(request.intent.carryIn).toBeUndefined()
    expect(request.intent.controls.register).toBe('Varying')
    const outcome = successFor(request.intent)
    driver.send({
      kind: 'generation-result',
      at: soundingAt(2) + 1.1,
      attemptId: request.attemptId,
      outcome,
    })
    driver.fit(soundingAt(2) + 1.1, true)
    const next = requestIn(driver.sounding(soundingAt(3), 3))
    expect(next.step).toBe('carry-in')
    expect(next.intent.controls.register).toBe('Varying')
    expect(next.intent.carryIn?.registerWindow).toEqual(
      deriveCarryIn({ intent: request.intent, outcome, phraseNumber: 3 }).registerWindow,
    )
  })
})
