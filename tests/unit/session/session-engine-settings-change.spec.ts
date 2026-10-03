/**
 * A settings change during a session, on timed events at 240 BPM (a 1 s measure): the pending
 * look-ahead phrase is discarded and requested again only when none of it is on screen and at
 * least a measure remains before its deadline, otherwise the change applies from the phrase after
 * it; the carry-in of the first phrase requested under the new settings is adapted to them; and a
 * change the session cannot accept throws.
 */

import { describe, expect, it } from 'vitest'

import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import type { CarryIn } from '@/domain/generation/carry-in/carry-in'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import { registerWindowContainsPitch } from '@/domain/profile/register-window'
import { SessionEngineError } from '@/session/session-types'
import {
  fakeDisplay,
  kinds,
  sessionSettings,
  successFor,
  type GenerationRequestOutput,
  type SessionDriver,
} from './session-harness'
import { FAST_TEMPO, fastDriver, soundingAt } from './scripted-session'

/** Phrase 3's deadline: the start of phrase 2's last measure. */
const PHRASE_THREE_DEADLINE = soundingAt(2) + 3

/** Intent: fast-session settings with the given overrides. */
function settingsWith(overrides: Partial<GenerationControls>): ReturnType<typeof sessionSettings> {
  return sessionSettings({ tempo: FAST_TEMPO, ...overrides })
}

/** Settings that differ from the chosen ones in one control the carry-in never depends on. */
const SHAPED = settingsWith({ leapiness: 'Shaped' })

/** Intent: a fast session with phrase 2 sounding and phrase 3 requested, still undecided. */
function threeRequested(onScreen = false): SessionDriver {
  const driver = fastDriver({ display: fakeDisplay(onScreen) })
  driver.accept(0.5)
  driver.countInOver(soundingAt(1))
  driver.sounding(soundingAt(2), 2)
  return driver
}

/** Intent: a fast session with phrase 2 sounding and phrase 3 decided, not yet sounding. */
function threeDecided(onScreen = false): SessionDriver {
  const driver = threeRequested(onScreen)
  driver.accept(soundingAt(2) + 0.5)
  return driver
}

/** Intent: the carry-in phrase 3 receives from the phrase 2 a driver decided. */
function carryFromTwo(driver: SessionDriver): CarryIn {
  const two = driver.all('phrase-ready')[0]!.phrase
  return deriveCarryIn({ intent: two.intent, outcome: two.outcome, phraseNumber: 2 })
}

/** Intent: the request among some outputs, failing the assertion when there is none. */
function requestIn(outputs: readonly unknown[]): GenerationRequestOutput {
  const request = outputs.find(
    (output): output is GenerationRequestOutput =>
      (output as { kind: string }).kind === 'request-generation',
  )
  expect(request, 'a request among the outputs').toBeDefined()
  return request!
}

// @test-link [[rule_session_change_applies_at_phrase_boundary]]
// @test-link [[service_session_engine]]
describe('a settings change and the pending look-ahead phrase', () => {
  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  it('discards a decided phrase with nothing on screen and a measure left, and requests it again', () => {
    const driver = threeDecided(false)
    const outputs = driver.change(soundingAt(2) + 1, SHAPED)
    expect(kinds(outputs)).toEqual(['phrase-discarded', 'settings-changed', 'request-generation'])
    expect(outputs[0]).toEqual({ kind: 'phrase-discarded', phraseNumber: 3 })
    expect(outputs[1]).toEqual({
      kind: 'settings-changed',
      phraseNumber: 3,
      settings: SHAPED,
      cause: 'automatic',
    })
    expect(outputs[2]).toMatchObject({
      phraseNumber: 3,
      step: 'carry-in',
      retry: 0,
      deadline: PHRASE_THREE_DEADLINE,
    })
    const request = requestIn(outputs)
    expect(request.intent.controls).toEqual(SHAPED.controls)
    expect(request.intent.carryIn).toEqual(carryFromTwo(driver))
    expect(driver.display.asked).toEqual([3])
    driver.accept(soundingAt(2) + 1.5)
    const [sounding] = driver.sounding(soundingAt(3), 3)
    expect(sounding).toMatchObject({ kind: 'phrase-sounding', phrase: { phraseNumber: 3 } })
    expect(sounding?.kind === 'phrase-sounding' && sounding.phrase.intent).toBe(request.intent)
  })

  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  it('keeps a decided phrase partly on screen, and applies the change from the phrase after it', () => {
    const driver = threeDecided(true)
    const decided = driver.all('phrase-ready').at(-1)!.phrase
    expect(driver.change(soundingAt(2) + 1, SHAPED)).toEqual([
      { kind: 'settings-changed', phraseNumber: 4, settings: SHAPED, cause: 'automatic' },
    ])
    expect(driver.display.asked).toEqual([3])
    const outputs = driver.sounding(soundingAt(3), 3)
    expect(outputs[0]).toEqual({ kind: 'phrase-sounding', at: soundingAt(3), phrase: decided })
    expect(requestIn(outputs).intent.controls).toEqual(SHAPED.controls)
    expect(driver.all('phrase-discarded')).toEqual([])
  })

  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  // @test-link [[rule_look_ahead_deadline]]
  it('keeps a decided phrase with less than a measure left, and applies the change from the phrase after it', () => {
    const driver = threeDecided(false)
    expect(driver.change(PHRASE_THREE_DEADLINE - 0.5, SHAPED)).toEqual([
      { kind: 'settings-changed', phraseNumber: 4, settings: SHAPED, cause: 'automatic' },
    ])
    expect(driver.display.asked).toEqual([])
    const outputs = driver.sounding(soundingAt(3), 3)
    expect(requestIn(outputs).intent.controls).toEqual(SHAPED.controls)
  })

  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  // @test-link [[rule_look_ahead_deadline]]
  it('discards a decided phrase with exactly one measure left', () => {
    const driver = threeDecided(false)
    expect(kinds(driver.change(PHRASE_THREE_DEADLINE - 1, SHAPED))).toEqual([
      'phrase-discarded',
      'settings-changed',
      'request-generation',
    ])
  })

  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  // @test-link [[rule_session_generation_failure_ladder]]
  it('drops the attempt in flight of an undecided phrase with a measure left, ignoring its late result', () => {
    const driver = threeRequested(false)
    const old = driver.lastRequest()
    const outputs = driver.change(soundingAt(2) + 1, SHAPED)
    expect(kinds(outputs)).toEqual(['settings-changed', 'request-generation'])
    expect(outputs[0]).toMatchObject({ phraseNumber: 3, cause: 'automatic' })
    const renewed = requestIn(outputs)
    expect(renewed).toMatchObject({ phraseNumber: 3, retry: 0, deadline: PHRASE_THREE_DEADLINE })
    expect(renewed.attemptId).toBeGreaterThan(old.attemptId)
    expect(renewed.intent.controls).toEqual(SHAPED.controls)
    expect(driver.succeed(soundingAt(2) + 1.1, old)).toEqual([])
    expect(driver.fit(soundingAt(2) + 1.1, true, old.attemptId)).toEqual([])
    const [ready] = driver
      .accept(soundingAt(2) + 1.2)
      .filter((output) => output.kind !== 'check-fit')
    expect(ready?.kind === 'phrase-ready' && ready.phrase.intent).toBe(renewed.intent)
  })

  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  it("keeps an undecided phrase's ladder on its own settings with less than a measure left", () => {
    const driver = threeRequested(false)
    expect(kinds(driver.change(PHRASE_THREE_DEADLINE - 0.8, SHAPED))).toEqual(['settings-changed'])
    driver.fail(PHRASE_THREE_DEADLINE - 0.7)
    expect(driver.lastRequest()).toMatchObject({ phraseNumber: 3, retry: 1 })
    expect(driver.lastRequest().intent.controls).toEqual(driver.settings.controls)
    driver.accept(PHRASE_THREE_DEADLINE - 0.6)
    expect(requestIn(driver.sounding(soundingAt(3), 3)).intent.controls).toEqual(SHAPED.controls)
  })

  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  // @test-link [[rule_phrase_one_is_idle_phrase]]
  it('never discards phrase 1 during the count-in: phrase 2 is the pending phrase', () => {
    const late = fastDriver({ display: fakeDisplay(false) })
    expect(late.change(0.5, SHAPED)).toEqual([
      { kind: 'settings-changed', phraseNumber: 3, settings: SHAPED, cause: 'automatic' },
    ])
    expect(late.display.asked).toEqual([])
    const early = fastDriver({ display: fakeDisplay(false) })
    expect(kinds(early.change(0, SHAPED))).toEqual(['settings-changed', 'request-generation'])
    expect(early.lastRequest()).toMatchObject({ phraseNumber: 2, retry: 0, deadline: 1 })
    expect(early.display.asked).toEqual([2])
  })

  // @test-link [[rule_struggling_generator_notice]]
  it('takes back the discarded decision for the struggling notice', () => {
    const driver = fastDriver({ display: fakeDisplay(false) })
    driver.tick(1)
    driver.countInOver(soundingAt(1))
    driver.sounding(soundingAt(2), 2)
    driver.accept(soundingAt(2) + 0.5)
    driver.change(soundingAt(2) + 1, SHAPED)
    driver.exhaust(soundingAt(2) + 1.5)
    expect(driver.tick(PHRASE_THREE_DEADLINE)).toEqual([
      expect.objectContaining({ kind: 'phrase-ready' }),
      { kind: 'struggling-notice', visible: true },
    ])
  })
})

// @test-link [[rule_session_settings_locked]]
// @test-link [[service_session_engine]]
describe('settings changes the session refuses', () => {
  // @test-link [[rule_session_settings_locked]]
  it('throws on a change of the tempo or of the instrument', () => {
    const driver = threeDecided(false)
    expect(() => driver.change(6, settingsWith({ tempo: 120 }))).toThrow(SessionEngineError)
    expect(() => driver.change(6, settingsWith({ instrumentProfileId: 'bb-tenor' }))).toThrow(
      SessionEngineError,
    )
  })

  // @test-link [[service_session_engine]]
  it('throws on a change after the end', () => {
    const driver = threeDecided(false)
    driver.end(6)
    expect(() => driver.change(6.5, SHAPED)).toThrow(SessionEngineError)
  })
})

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
    const { request, carry } = changedRequest({ register: 'High' })
    const high = request.intent.registerIntent.candidates.find((entry) => entry.id === 'High')
    expect(carry.registerWindow).not.toEqual(high?.window)
    expect(request.step).toBe('carry-in')
    expect(request.intent.carryIn?.registerWindow).toEqual(high?.window)
    expect(request.intent.carryIn?.lastPitch).toEqual(carry.lastPitch)
  })

  // @test-link [[rule_setting_change_rechecks_pitch_carry_in]]
  it('requests every rung standalone, pinned to the new register, when the pitch no longer fits', () => {
    const { driver, request, carry } = changedRequest({ register: 'Low' })
    const low = request.intent.registerIntent.candidates.find((entry) => entry.id === 'Low')!
    expect(registerWindowContainsPitch(low.window, carry.lastPitch.midi)).toBe(false)
    for (let retry = 0; retry < 5; retry += 1) {
      const attempt = driver.lastRequest()
      expect(attempt).toMatchObject({ phraseNumber: 3, step: 'standalone', retry })
      expect(attempt.intent.carryIn).toBeUndefined()
      expect(attempt.intent.controls.register).toBe('Low')
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
