/**
 * Adaptive tempo in the session engine, on timed events: each phrase from 2 on has its tempo fixed
 * and output once at its look-ahead deadline; with adaptive tempo it rises by 5 BPM every two
 * phrases counted while the controller is attached, up to 240 BPM; deadlines, phrase sounding and
 * the settings-change discard guard follow each phrase's own tempo; the settings and every intent
 * keep the starting tempo; and the controller event is refused when it changes nothing.
 */

import { describe, expect, it } from 'vitest'

import { measureSeconds } from '@/session/session-timing'
import { SessionEngineError } from '@/session/session-types'
import { fakeDisplay, kinds, sessionSettings, type SessionDriver } from './session-harness'
import {
  driveTempoSession,
  phraseStartAt,
  phraseTempoOf,
  tempoDriver,
  tempoMap,
  type ControllerStep,
} from './tempo-session'

/** The starting tempo of most tests: 100 BPM, a 2.4 s measure. */
const T = 100

/** Intent: a driver at the starting tempo `tempo`, adaptive tempo on unless told otherwise. */
function adaptive(tempo = T, adaptiveTempo = true): SessionDriver {
  return tempoDriver({ tempo, adaptiveTempo, display: fakeDisplay(false) })
}

/** Intent: the tempos a driven session gave phrases 1 to `count`, with the script's controller. */
function scheduleOf(
  controller: readonly ControllerStep[],
  count = 7,
  tempo = T,
): readonly number[] {
  const driver = adaptive(tempo)
  driveTempoSession(driver, count, { controller })
  return tempoMap(driver, count)
}

// @test-link [[rule_adaptive_tempo_flat_schedule]]
// @test-link [[module_session_adaptive_tempo_schedule]]
describe('the adaptive-tempo schedule in a session', () => {
  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('rises by 5 BPM every two phrases over ten phrases, the controller always attached', () => {
    const driver = adaptive()
    driveTempoSession(driver, 10)
    expect(tempoMap(driver, 11)).toEqual([100, 100, 105, 105, 110, 110, 115, 115, 120, 120, 125])
    expect(driver.all('phrase-tempo').map((output) => output.phraseNumber)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ])
  })

  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('stops at 240 BPM: 220 rises to 225, 230, 235 and 240, then stays', () => {
    const driver = adaptive(220)
    driveTempoSession(driver, 13)
    expect(tempoMap(driver, 14)).toEqual([
      220, 220, 225, 225, 230, 230, 235, 235, 240, 240, 240, 240, 240, 240,
    ])
  })

  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('never changes a session started at 240 BPM', () => {
    const driver = adaptive(240)
    driveTempoSession(driver, 9)
    expect(new Set(tempoMap(driver, 10))).toEqual(new Set([240]))
  })

  // @test-link [[module_session_adaptive_tempo_schedule]]
  it('carries each phrase’s tempo on its phrase-sounding output, phrase 1 at the starting tempo', () => {
    const driver = adaptive()
    driveTempoSession(driver, 9)
    expect(
      driver.all('phrase-sounding').map((output) => [output.phrase.phraseNumber, output.tempo]),
    ).toEqual(tempoMap(driver, 9).map((tempo, index) => [index + 1, tempo]))
    expect(driver.all('phrase-sounding')[0]).toMatchObject({
      tempo: T,
      phrase: { phraseNumber: 1 },
    })
  })

  // @test-link [[module_session_look_ahead_timing]]
  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('sets each deadline from the tempo of the phrase sounding when it is requested', () => {
    const driver = adaptive()
    driveTempoSession(driver, 9)
    expect(driver.requests(2)[0]!.deadline).toBe(measureSeconds(T))
    for (let phraseNumber = 2; phraseNumber <= 9; phraseNumber += 1) {
      const soundingAt = phraseStartAt(driver, phraseNumber)
      const expected = soundingAt + 3 * measureSeconds(phraseTempoOf(driver, phraseNumber))
      for (const request of driver.requests(phraseNumber + 1))
        expect(request.deadline).toBeCloseTo(expected, 9)
      const sounding = driver.all('phrase-sounding')[phraseNumber - 1]!
      expect(sounding.at).toBe(soundingAt)
    }
    expect(phraseTempoOf(driver, 9)).toBe(120)
  })

  // @test-link [[rule_tempo_never_affects_generation]]
  it('keeps the starting tempo in every intent and never reports a rise as a settings change', () => {
    const driver = adaptive()
    driveTempoSession(driver, 10)
    expect(phraseTempoOf(driver, 10)).toBe(120)
    expect(new Set(driver.requests().map((request) => request.intent.controls.tempo))).toEqual(
      new Set([T]),
    )
    expect(
      new Set(driver.all('phrase-ready').map((ready) => ready.phrase.intent.controls.tempo)),
    ).toEqual(new Set([T]))
    expect(driver.all('settings-changed')).toEqual([])
  })
})

// @test-link [[req_adaptive_tempo]]
// @test-link [[rule_controller_attached_definition]]
describe('a session without adaptive tempo', () => {
  // @test-link [[req_adaptive_tempo]]
  // @test-link [[rule_controller_attached_definition]]
  it('fixes the starting tempo at every deadline, with or without controller events', () => {
    for (const controller of [[], [{ during: 2, measures: 1, attached: false }]]) {
      const driver = adaptive(T, false)
      driveTempoSession(driver, 9, { controller })
      expect(driver.all('phrase-tempo').map((output) => output.tempo)).toEqual(
        Array.from({ length: 9 }, () => T),
      )
      expect(new Set(driver.all('phrase-sounding').map((output) => output.tempo))).toEqual(
        new Set([T]),
      )
    }
  })
})

// @test-link [[rule_session_change_applies_at_phrase_boundary]]
// @test-link [[module_session_adaptive_tempo_schedule]]
describe('when a phrase’s tempo is fixed', () => {
  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  it('outputs phrase 2’s tempo once, at the end of the count-in, and none for phrase 1', () => {
    const driver = adaptive()
    const measure = measureSeconds(T)
    expect(kinds(driver.startOutputs)).not.toContain('phrase-tempo')
    driver.accept(measure / 2)
    expect(driver.tick(measure - 0.01)).toEqual([])
    expect(driver.tick(measure)).toEqual([{ kind: 'phrase-tempo', phraseNumber: 2, tempo: T }])
    expect(kinds(driver.countInOver(measure))).toEqual(['phrase-sounding'])
    expect(driver.tick(measure + 1)).toEqual([])
  })

  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  it('fixes it on the first event at or after the deadline, whatever its kind', () => {
    const driver = adaptive()
    driver.accept(1)
    expect(kinds(driver.countInOver(measureSeconds(T) + 0.2))).toEqual([
      'phrase-tempo',
      'phrase-sounding',
    ])
  })

  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  // @test-link [[rule_session_generation_failure_ladder]]
  it('fixes it after a repeat decided at the same deadline, once', () => {
    const driver = adaptive()
    driveTempoSession(driver, 1)
    const at = phraseStartAt(driver, 2)
    driver.sounding(at, 2)
    driver.exhaust(at + 1)
    const deadline = at + 3 * measureSeconds(T)
    const outputs = driver.tick(deadline)
    expect(kinds(outputs)).toEqual(['phrase-ready', 'phrase-tempo'])
    expect(outputs[0]).toMatchObject({ phrase: { phraseNumber: 3, origin: 'repeat' } })
    expect(outputs[1]).toEqual({ kind: 'phrase-tempo', phraseNumber: 3, tempo: T + 5 })
    expect(driver.tick(deadline + 0.5)).toEqual([])
  })

  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  it('cannot be followed by a discard: a settings change at the deadline applies after the phrase', () => {
    const driver = adaptive()
    driveTempoSession(driver, 2)
    const at = phraseStartAt(driver, 3)
    driver.sounding(at, 3)
    driver.settle(at + 1)
    const deadline = at + 3 * measureSeconds(T + 5)
    const changed = sessionSettings({ tempo: T, leapiness: 'Shaped' })
    const outputs = driver.change(deadline, changed)
    expect(outputs).toEqual([
      { kind: 'phrase-tempo', phraseNumber: 4, tempo: T + 5 },
      { kind: 'settings-changed', phraseNumber: 5, settings: changed, cause: 'automatic' },
    ])
    expect(driver.display.asked).toEqual([])
  })

  // @test-link [[module_session_adaptive_tempo_schedule]]
  it('refuses a phrase that starts sounding before its tempo is fixed', () => {
    const driver = adaptive()
    driveTempoSession(driver, 1)
    const at = phraseStartAt(driver, 2)
    driver.sounding(at, 2)
    driver.settle(at + 1)
    expect(() => driver.sounding(at + 2 * measureSeconds(T), 3)).toThrow(SessionEngineError)
    expect(kinds(driver.sounding(at + 4 * measureSeconds(T), 3))).toContain('phrase-tempo')
  })

  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  it('still fixes a phrase discarded by a settings change, at the same deadline', () => {
    const driver = adaptive()
    driveTempoSession(driver, 2)
    const at = phraseStartAt(driver, 3)
    driver.sounding(at, 3)
    driver.settle(at + 1)
    const changed = sessionSettings({ tempo: T, leapiness: 'Shaped' })
    expect(kinds(driver.change(at + 2, changed))).toEqual([
      'phrase-discarded',
      'settings-changed',
      'request-generation',
    ])
    driver.settle(at + 3)
    const deadline = at + 3 * measureSeconds(T + 5)
    expect(driver.lastRequest().deadline).toBeCloseTo(deadline, 9)
    expect(driver.tick(deadline)).toEqual([{ kind: 'phrase-tempo', phraseNumber: 4, tempo: T + 5 }])
  })
})

// @test-link [[rule_session_change_applies_at_phrase_boundary]]
// @test-link [[module_session_settings_change]]
describe('the settings-change discard guard after a rise', () => {
  /** Intent: a 60 BPM adaptive session with phrase 3 (at 65 BPM) sounding, phrase 4 undecided. */
  function fourRequested(): { readonly driver: SessionDriver; readonly deadline: number } {
    const driver = adaptive(60)
    driveTempoSession(driver, 2)
    const at = phraseStartAt(driver, 3)
    expect(phraseTempoOf(driver, 3)).toBe(65)
    driver.sounding(at, 3)
    return { driver, deadline: at + 3 * measureSeconds(65) }
  }

  const changed = sessionSettings({ tempo: 60, leapiness: 'Shaped' })

  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  it('measures the measure left at the sounding phrase’s tempo, not the starting tempo', () => {
    // 3.8 s is more than a measure at 65 BPM (3.69 s) but less than one at 60 BPM (4 s).
    const { driver, deadline } = fourRequested()
    const outputs = driver.change(deadline - 3.8, changed)
    expect(kinds(outputs)).toEqual(['settings-changed', 'request-generation'])
    expect(outputs[0]).toMatchObject({ phraseNumber: 4 })
    expect(driver.display.asked).toEqual([4])
  })

  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  it('keeps the phrase with less than a measure left at the sounding phrase’s tempo', () => {
    const { driver, deadline } = fourRequested()
    expect(driver.change(deadline - 3.6, changed)).toEqual([
      { kind: 'settings-changed', phraseNumber: 5, settings: changed, cause: 'automatic' },
    ])
    expect(driver.display.asked).toEqual([])
  })
})

// @test-link [[rule_adaptive_tempo_flat_schedule]]
// @test-link [[module_session_adaptive_tempo_schedule]]
describe('adaptive tempo while the controller is away', () => {
  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('holds a due rise across a loss and applies it at the first fixing after reconnecting', () => {
    // Phrases 1 and 2 counted; away before phrase 3's tempo is fixed, back during phrase 3.
    expect(
      scheduleOf([
        { during: 2, measures: 1, attached: false },
        { during: 3, measures: 1, attached: true },
      ]),
    ).toEqual([T, T, T, T + 5, T + 5, T + 10, T + 10])
  })

  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('resumes counting where it stopped after a loss in mid-pair, not counting phrases started away', () => {
    // Phrase 3 counted after the rise; phrase 4 starts away; phrase 5 completes the pair.
    expect(
      scheduleOf([
        { during: 3, measures: 1, attached: false },
        { during: 4, measures: 1, attached: true },
      ]),
    ).toEqual([T, T, T + 5, T + 5, T + 5, T + 10, T + 10])
  })

  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('changes nothing when the controller is back before any phrase starts', () => {
    expect(
      scheduleOf([
        { during: 2, measures: 0.5, attached: false },
        { during: 2, measures: 2, attached: true },
      ]),
    ).toEqual([T, T, T + 5, T + 5, T + 10, T + 10, T + 15])
  })

  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('keeps a rise already fixed when the controller goes in the final measure', () => {
    // Phrase 3's rise is fixed before the loss; phrase 3 starts away and does not count.
    expect(
      scheduleOf([
        { during: 2, measures: 3.5, attached: false },
        { during: 3, measures: 1, attached: true },
      ]),
    ).toEqual([T, T, T + 5, T + 5, T + 5, T + 10, T + 10])
  })

  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('does not count phrase 1 after a loss during the count-in', () => {
    expect(
      scheduleOf([
        { during: 0, measures: 0.25, attached: false },
        { during: 1, measures: 1, attached: true },
      ]),
    ).toEqual([T, T, T, T + 5, T + 5, T + 10, T + 10])
  })

  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('never rises while the controller stays away', () => {
    expect(scheduleOf([{ during: 1, measures: 1, attached: false }], 8)).toEqual(
      Array.from({ length: 8 }, () => T),
    )
  })
})

// @test-link [[module_session_adaptive_tempo_schedule]]
describe('the controller event', () => {
  // @test-link [[module_session_adaptive_tempo_schedule]]
  it('throws when it does not change the controller’s presence', () => {
    const attached = adaptive()
    expect(() => attached.controller(0.1, true)).toThrow(SessionEngineError)
    const away = adaptive()
    away.controller(0.1, false)
    expect(() => away.controller(0.2, false)).toThrow(SessionEngineError)
    const off = adaptive(T, false)
    expect(() => off.controller(0.1, true)).toThrow(SessionEngineError)
  })

  // @test-link [[module_session_adaptive_tempo_schedule]]
  it('is accepted during the count-in and while running, with or without adaptive tempo', () => {
    for (const adaptiveTempo of [true, false]) {
      const driver = adaptive(T, adaptiveTempo)
      expect(driver.controller(0.1, false)).toEqual([])
      expect(driver.controller(0.2, true)).toEqual([])
      driveTempoSession(driver, 2, { controller: [{ during: 2, measures: 1, attached: false }] })
      expect(driver.controller(phraseStartAt(driver, 2) + 3.5 * measureSeconds(T), true)).toEqual(
        [],
      )
    }
  })

  // @test-link [[module_session_look_ahead_timing]]
  it('runs the deadline logic for its time first', () => {
    const driver = adaptive()
    const outputs = driver.controller(measureSeconds(T), false)
    expect(kinds(outputs)).toEqual(['phrase-ready', 'phrase-tempo'])
    expect(outputs[0]).toMatchObject({ phrase: { phraseNumber: 2, origin: 'repeat' } })
  })

  // @test-link [[service_session_engine]]
  it('throws when its time runs backwards', () => {
    const driver = adaptive()
    driver.tick(1)
    expect(() => driver.controller(0.5, false)).toThrow(SessionEngineError)
  })

  // @test-link [[module_session_adaptive_tempo_schedule]]
  it('is dropped after the end, as a loss can race it', () => {
    const driver = adaptive()
    driver.end(0.5)
    expect(driver.controller(0.6, false)).toEqual([])
    expect(driver.controller(0.7, false)).toEqual([])
  })
})
