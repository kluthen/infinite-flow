/**
 * A settings change during a session, on timed events at 240 BPM (a 1 s measure): the pending
 * look-ahead phrase is discarded and requested again only when none of it is on screen and at
 * least a measure remains before its deadline, otherwise the change applies from the phrase after
 * it; and a change the session cannot accept throws. The carry-in of the first phrase requested
 * under the new settings is covered by session-engine-settings-carry-in.spec.ts.
 */

import { describe, expect, it } from 'vitest'

import { SessionEngineError } from '@/session/session-types'
import { fakeDisplay, kinds } from './session-harness'
import { FAST_TEMPO, fastDriver, soundingAt } from './scripted-session'
import {
  SHAPED,
  carryFromTwo,
  requestIn,
  settingsWith,
  threeDecided,
  threeRequested,
} from './settings-change-session'

/** Phrase 3's deadline: the start of phrase 2's last measure. */
const PHRASE_THREE_DEADLINE = soundingAt(2) + 3

// @test-link [[rule_session_change_applies_at_phrase_boundary]]
// @test-link [[module_session_settings_change]]
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
    const [fixed, sounding] = driver.sounding(soundingAt(3), 3)
    expect(fixed).toEqual({ kind: 'phrase-tempo', phraseNumber: 3, tempo: FAST_TEMPO })
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
    expect(outputs.slice(0, 2)).toEqual([
      { kind: 'phrase-tempo', phraseNumber: 3, tempo: FAST_TEMPO },
      { kind: 'phrase-sounding', at: soundingAt(3), phrase: decided, tempo: FAST_TEMPO },
    ])
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
      { kind: 'phrase-tempo', phraseNumber: 3, tempo: FAST_TEMPO },
    ])
  })
})

// @test-link [[rule_session_settings_locked]]
// @test-link [[module_session_settings_change]]
describe('settings changes the session refuses', () => {
  // @test-link [[rule_session_settings_locked]]
  it('throws on a change of the tempo or of the instrument', () => {
    const driver = threeDecided(false)
    expect(() => driver.change(6, settingsWith({ tempo: 120 }))).toThrow(SessionEngineError)
    expect(() => driver.change(6, settingsWith({ instrumentProfileId: 'bb-tenor' }))).toThrow(
      SessionEngineError,
    )
  })

  // @test-link [[module_session_settings_change]]
  it('throws on a change after the end', () => {
    const driver = threeDecided(false)
    driver.end(6)
    expect(() => driver.change(6.5, SHAPED)).toThrow(SessionEngineError)
  })
})
