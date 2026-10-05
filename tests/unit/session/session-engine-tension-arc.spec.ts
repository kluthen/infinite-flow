/**
 * The session engine with the multi-phrase tension arc: off, every phrase is generated with the
 * tension arc in effect and the session is the one without the flag; on, phrase n is generated
 * with its four-phrase cycle step around the tension arc in effect (phrase 1, the Idle phrase,
 * unchanged), the settings in effect and every settings-changed output keep the player's choice,
 * a phrase requested again after a settings change uses the step of its own number, and a start
 * whose flag is not a boolean throws at once.
 */

import { describe, expect, it } from 'vitest'

import type { TensionArc } from '@/domain/controls/generation-controls'
import { createSessionEngine } from '@/session/session-engine'
import { SessionEngineError, type SessionPhrase } from '@/session/session-types'
import {
  SessionDriver,
  fakeDisplay,
  fakeViewport,
  phraseOneFor,
  queuedProviders,
  sessionSettings,
} from './session-harness'
import { FAST_TEMPO, driveSession, settingsChanges, soundingAt } from './scripted-session'

/** How many phrases each session sounds; phrases 2 to `SOUNDED + 1` are generated. */
const SOUNDED = 10

/**
 * The tension arc phrases 1 to 11 are generated with under the arc, by the tension arc chosen:
 * the cycle none, tenser, none, calmer, clamped at Settled and Edge.
 */
const EXPECTED_ARCS: Readonly<Record<TensionArc, readonly TensionArc[]>> = {
  Settled: [
    'Settled',
    'Lift',
    'Settled',
    'Settled',
    'Settled',
    'Lift',
    'Settled',
    'Settled',
    'Settled',
    'Lift',
    'Settled',
  ],
  Lift: [
    'Lift',
    'Build',
    'Lift',
    'Settled',
    'Lift',
    'Build',
    'Lift',
    'Settled',
    'Lift',
    'Build',
    'Lift',
  ],
  Build: [
    'Build',
    'Edge',
    'Build',
    'Lift',
    'Build',
    'Edge',
    'Build',
    'Lift',
    'Build',
    'Edge',
    'Build',
  ],
  Edge: ['Edge', 'Edge', 'Edge', 'Build', 'Edge', 'Edge', 'Edge', 'Build', 'Edge', 'Edge', 'Edge'],
}

/** The four tension arcs, calmest first. */
const CHOSEN_ARCS = ['Settled', 'Lift', 'Build', 'Edge'] as const

/** Intent: a fast driver for a chosen tension arc, the arc on or off (or left to its default). */
function arcDriver(tension: TensionArc, multiPhraseTensionArc?: boolean): SessionDriver {
  const settings = sessionSettings({ tempo: FAST_TEMPO, tension })
  return new SessionDriver({
    at: 0,
    settings,
    phraseOne: phraseOneFor(settings),
    ...(multiPhraseTensionArc === undefined ? {} : { multiPhraseTensionArc }),
  })
}

/** Intent: every generated (neither Idle nor repeat) phrase a driver readied, in order. */
function generatedPhrases(driver: SessionDriver): readonly SessionPhrase[] {
  return driver
    .all('phrase-ready')
    .map((output) => output.phrase)
    .filter((phrase) => phrase.origin !== 'repeat')
}

/** Intent: run phrase 2 through the count-in, then phrases 2 to `last` sounding and answered. */
function driveUntilAnswered(driver: SessionDriver, last: number): void {
  driver.settle(0.5)
  driver.tick(1)
  driver.countInOver(soundingAt(1))
  for (let phraseNumber = 2; phraseNumber <= last; phraseNumber += 1) {
    driver.sounding(soundingAt(phraseNumber), phraseNumber)
    driver.settle(soundingAt(phraseNumber) + 0.5)
    if (phraseNumber < last) driver.tick(soundingAt(phraseNumber) + 3)
  }
}

// @test-link [[req_multi_phrase_tension_arc]]
// @test-link [[module_session_tension_arc_step]]
describe('a session with the multi-phrase tension arc off', () => {
  // @test-link [[req_multi_phrase_tension_arc]]
  it.each(CHOSEN_ARCS)(
    'generates every phrase with the tension arc in effect, as without the flag (%s)',
    (tension) => {
      const off = arcDriver(tension, false)
      const unset = arcDriver(tension)
      driveSession(off, SOUNDED)
      driveSession(unset, SOUNDED)
      expect(generatedPhrases(off).length).toBeGreaterThan(0)
      for (const request of off.requests()) expect(request.intent.controls.tension).toBe(tension)
      for (const phrase of generatedPhrases(off))
        expect(phrase.intent.controls.tension).toBe(tension)
      expect(off.log).toEqual(unset.log)
    },
  )
})

// @test-link [[rule_multi_phrase_tension_arc_cycle]]
// @test-link [[req_multi_phrase_tension_arc]]
// @test-link [[module_tension_arc_cycle]]
// @test-link [[module_session_tension_arc_step]]
describe('a session with the multi-phrase tension arc on', () => {
  // @test-link [[rule_multi_phrase_tension_arc_cycle]]
  // @test-link [[module_tension_arc_cycle]]
  it.each(CHOSEN_ARCS)(
    'generates phrase n with its cycle step around the chosen tension arc (%s)',
    (tension) => {
      const driver = arcDriver(tension, true)
      driveSession(driver, SOUNDED)
      const expected = EXPECTED_ARCS[tension]
      const [phraseOne] = driver.all('phrase-sounding')
      expect(phraseOne?.phrase).toMatchObject({ phraseNumber: 1, origin: 'idle' })
      expect(phraseOne?.phrase.intent).toEqual(driver.phraseOne.intent)
      expect(phraseOne?.phrase.intent.controls.tension).toBe(expected[0])
      const generated = generatedPhrases(driver)
      expect(generated.length).toBeGreaterThanOrEqual(SOUNDED - 2)
      for (const phrase of generated) {
        const controls = { ...driver.settings.controls, tension: expected[phrase.phraseNumber - 1] }
        expect(phrase.intent.controls, `phrase ${phrase.phraseNumber}`).toEqual(controls)
      }
      for (const request of driver.requests()) {
        const label = `request ${request.attemptId} for phrase ${request.phraseNumber}`
        expect(request.intent.controls.tension, label).toBe(expected[request.phraseNumber - 1])
      }
      expect(settingsChanges(driver)).toEqual([])
    },
  )
})

// @test-link [[rule_multi_phrase_tension_arc_cycle]]
// @test-link [[module_tension_arc_cycle]]
// @test-link [[module_session_tension_arc_step]]
describe('the tension-arc setting under the multi-phrase tension arc', () => {
  // @test-link [[rule_multi_phrase_tension_arc_cycle]]
  // @test-link [[module_tension_arc_cycle]]
  it('reports the chosen tension arc on a settings change that discards a stepped phrase', () => {
    const driver = arcDriver('Lift', true)
    driveUntilAnswered(driver, 5)
    expect(settingsChanges(driver)).toEqual([])
    expect(driver.all('phrase-ready').at(-1)?.phrase.intent.controls.tension).toBe('Build')
    const shaped = sessionSettings({ tempo: FAST_TEMPO, tension: 'Lift', contour: 'Arch' })
    const outputs = driver.change(soundingAt(5) + 1, shaped)
    expect(outputs.slice(0, 2)).toEqual([
      { kind: 'phrase-discarded', phraseNumber: 6 },
      { kind: 'settings-changed', phraseNumber: 6, settings: shaped, cause: 'automatic' },
    ])
    expect(outputs[2]).toMatchObject({ kind: 'request-generation', phraseNumber: 6, retry: 0 })
    expect(driver.lastRequest().intent.controls).toEqual({ ...shaped.controls, tension: 'Build' })
    driver.settle(soundingAt(5) + 1.5)
    driver.tick(soundingAt(5) + 3)
    for (const [phraseNumber, tension] of [
      [6, 'Lift'],
      [7, 'Settled'],
      [8, 'Lift'],
    ] as const) {
      driver.sounding(soundingAt(phraseNumber), phraseNumber)
      const request = driver.lastRequest()
      expect(request.phraseNumber).toBe(phraseNumber + 1)
      expect(request.intent.controls).toEqual({ ...shaped.controls, tension })
      driver.settle(soundingAt(phraseNumber) + 0.5)
      driver.tick(soundingAt(phraseNumber) + 3)
    }
    expect(settingsChanges(driver)).toHaveLength(1)
  })

  // @test-link [[rule_multi_phrase_tension_arc_cycle]]
  // @test-link [[module_tension_arc_cycle]]
  it('steps around a tension arc a late settings change puts in effect from the phrase after', () => {
    const driver = arcDriver('Lift', true)
    driveUntilAnswered(driver, 4)
    const built = sessionSettings({ tempo: FAST_TEMPO, tension: 'Build' })
    expect(driver.change(soundingAt(4) + 2.5, built)).toEqual([
      { kind: 'settings-changed', phraseNumber: 6, settings: built, cause: 'automatic' },
    ])
    driver.tick(soundingAt(4) + 3)
    for (const [phraseNumber, tension] of [
      [5, 'Edge'],
      [6, 'Build'],
      [7, 'Lift'],
    ] as const) {
      driver.sounding(soundingAt(phraseNumber), phraseNumber)
      const request = driver.lastRequest()
      expect(request.phraseNumber).toBe(phraseNumber + 1)
      expect(request.intent.controls).toEqual({ ...built.controls, tension })
      driver.settle(soundingAt(phraseNumber) + 0.5)
      driver.tick(soundingAt(phraseNumber) + 3)
    }
    expect(settingsChanges(driver)).toHaveLength(1)
  })
})

// @test-link [[req_multi_phrase_tension_arc]]
// @test-link [[module_tension_arc_cycle]]
describe('the multi-phrase tension arc flag at the session start', () => {
  // @test-link [[req_multi_phrase_tension_arc]]
  // @test-link [[module_tension_arc_cycle]]
  it.each([
    { label: 'a string', flag: 'on' },
    { label: 'a number', flag: 1 },
    { label: 'null', flag: null },
    { label: 'missing', flag: undefined },
  ])('throws when the flag is $label', ({ flag }) => {
    const valid = arcDriver('Settled', false).start
    const deps = {
      providers: queuedProviders(),
      viewport: fakeViewport(false),
      display: fakeDisplay(),
    }
    const start = { ...valid, multiPhraseTensionArc: flag }
    expect(() => Reflect.apply(createSessionEngine, undefined, [deps, start])).toThrow(
      SessionEngineError,
    )
  })
})
