/**
 * The multi-phrase tension arc's four-phrase cycle: each session phrase's step from its number
 * alone, the stepped tension arc clamped at Settled and Edge, and the settings a phrase is
 * generated under, the settings in effect themselves unless the flag is on and the step changes
 * the tension arc.
 */

import { describe, expect, it } from 'vitest'

import { TENSION_ARCS, type TensionArc } from '@/domain/controls/generation-controls'
import { SessionEngineError } from '@/session/session-types'
import {
  settingsGeneratedUnder,
  steppedTensionArc,
  tensionArcCycleStep,
} from '@/session/tension-arc-cycle'
import { sessionSettings } from './session-harness'

/** The session phrase numbers of two whole groups of four. */
const PHRASES_ONE_TO_EIGHT = [1, 2, 3, 4, 5, 6, 7, 8] as const

/** The tension arc each of phrases 1 to 8 is generated with, by the tension arc chosen. */
const EXPECTED_CYCLES: Readonly<Record<TensionArc, readonly TensionArc[]>> = {
  Settled: ['Settled', 'Lift', 'Settled', 'Settled', 'Settled', 'Lift', 'Settled', 'Settled'],
  Lift: ['Lift', 'Build', 'Lift', 'Settled', 'Lift', 'Build', 'Lift', 'Settled'],
  Build: ['Build', 'Edge', 'Build', 'Lift', 'Build', 'Edge', 'Build', 'Lift'],
  Edge: ['Edge', 'Edge', 'Edge', 'Build', 'Edge', 'Edge', 'Edge', 'Build'],
}

// @test-link [[rule_multi_phrase_tension_arc_cycle]]
// @test-link [[module_tension_arc_cycle]]
describe('the cycle step of a session phrase', () => {
  // @test-link [[rule_multi_phrase_tension_arc_cycle]]
  // @test-link [[module_tension_arc_cycle]]
  it('is none, tenser, none, calmer over each group of four', () => {
    expect(PHRASES_ONE_TO_EIGHT.map(tensionArcCycleStep)).toEqual([0, 1, 0, -1, 0, 1, 0, -1])
  })

  // @test-link [[module_tension_arc_cycle]]
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'throws on phrase number %s',
    (phraseNumber) => {
      expect(() => tensionArcCycleStep(phraseNumber)).toThrow(SessionEngineError)
    },
  )
})

// @test-link [[rule_multi_phrase_tension_arc_cycle]]
// @test-link [[module_tension_arc_cycle]]
describe('the stepped tension arc', () => {
  // @test-link [[rule_multi_phrase_tension_arc_cycle]]
  // @test-link [[module_tension_arc_cycle]]
  it.each(TENSION_ARCS)('follows the expected cycle over phrases 1 to 8 from %s', (tension) => {
    const generated = PHRASES_ONE_TO_EIGHT.map((phrase) => steppedTensionArc(tension, phrase))
    expect(generated).toEqual(EXPECTED_CYCLES[tension])
  })

  // @test-link [[rule_multi_phrase_tension_arc_cycle]]
  it.each(TENSION_ARCS)('keeps %s as chosen on phrase 1', (tension) => {
    expect(steppedTensionArc(tension, 1)).toBe(tension)
  })

  // @test-link [[module_tension_arc_cycle]]
  it('throws on a tension arc outside the vocabulary', () => {
    expect(() => Reflect.apply(steppedTensionArc, undefined, ['Wild', 2])).toThrow(
      SessionEngineError,
    )
  })
})

// @test-link [[rule_multi_phrase_tension_arc_cycle]]
// @test-link [[module_tension_arc_cycle]]
describe('the settings a session phrase is generated under', () => {
  // @test-link [[req_multi_phrase_tension_arc]]
  // @test-link [[module_tension_arc_cycle]]
  it('are the settings in effect themselves with the flag off, for every phrase', () => {
    for (const tension of TENSION_ARCS) {
      const settings = sessionSettings({ tension })
      for (const phrase of PHRASES_ONE_TO_EIGHT)
        expect(settingsGeneratedUnder(false, phrase, settings)).toBe(settings)
    }
  })

  // @test-link [[req_multi_phrase_tension_arc]]
  // @test-link [[rule_multi_phrase_tension_arc_cycle]]
  // @test-link [[module_tension_arc_cycle]]
  it.each(TENSION_ARCS)(
    'carry the expected cycle over phrases 1 to 8 with the flag on from %s',
    (tension) => {
      const settings = sessionSettings({ tension })
      const generated = PHRASES_ONE_TO_EIGHT.map(
        (phrase) => settingsGeneratedUnder(true, phrase, settings).controls.tension,
      )
      expect(generated).toEqual(EXPECTED_CYCLES[tension])
    },
  )

  // @test-link [[rule_multi_phrase_tension_arc_cycle]]
  // @test-link [[module_tension_arc_cycle]]
  it('are the settings in effect themselves with the flag on and no step', () => {
    const settings = sessionSettings({ tension: 'Lift' })
    for (const phrase of [1, 3, 5, 7])
      expect(settingsGeneratedUnder(true, phrase, settings)).toBe(settings)
  })

  // @test-link [[rule_multi_phrase_tension_arc_cycle]]
  // @test-link [[module_tension_arc_cycle]]
  it.each([
    { tension: 'Edge', phrase: 2 },
    { tension: 'Settled', phrase: 4 },
  ] as const)(
    'are the settings in effect themselves when the step is clamped ($tension, phrase $phrase)',
    ({ tension, phrase }) => {
      const settings = sessionSettings({ tension })
      expect(settingsGeneratedUnder(true, phrase, settings)).toBe(settings)
    },
  )

  // @test-link [[module_tension_arc_cycle]]
  it('are a frozen copy differing only in the tension arc when stepped, the input unchanged', () => {
    const settings = sessionSettings({ tension: 'Build' })
    const before = structuredClone(settings)
    const stepped = settingsGeneratedUnder(true, 2, settings)
    expect(stepped).not.toBe(settings)
    expect(stepped).toEqual({ ...before, controls: { ...before.controls, tension: 'Edge' } })
    expect(Object.isFrozen(stepped)).toBe(true)
    expect(Object.isFrozen(stepped.controls)).toBe(true)
    expect(Object.isFrozen(stepped.figureLevels)).toBe(true)
    expect(Object.isFrozen(stepped.selection)).toBe(true)
    expect(settings).toEqual(before)
  })

  // @test-link [[module_tension_arc_cycle]]
  it.each([0, 1.5])('throws on phrase number %s', (phraseNumber) => {
    const settings = sessionSettings()
    expect(() => settingsGeneratedUnder(true, phraseNumber, settings)).toThrow(SessionEngineError)
    expect(() => settingsGeneratedUnder(false, phraseNumber, settings)).toThrow(SessionEngineError)
  })

  // @test-link [[module_tension_arc_cycle]]
  it.each(['yes', 1, undefined, null])('throws on the non-boolean flag %s', (flag) => {
    const settings = sessionSettings()
    expect(() => Reflect.apply(settingsGeneratedUnder, undefined, [flag, 1, settings])).toThrow(
      SessionEngineError,
    )
  })
})
