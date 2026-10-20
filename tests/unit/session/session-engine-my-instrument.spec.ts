/**
 * A session played with my instrument, over the engine's seams: the settings carry my instrument's
 * profile as data (a built-in's id alone resolves its profile; my instrument's does not), every
 * attempt intent is built with it, carry-in and standalone alike, the carry-in receiver converts
 * the written tonal center with its transposition, and a settings mutation keeps it. Settings that
 * name my instrument without its profile, or a built-in with one, are refused at the start.
 */

import { describe, expect, it } from 'vitest'

import {
  makeGenerationControls,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { EB_ALTO_PROFILE } from '@/domain/profile/instrument-profiles'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import { makeMyInstrument, myInstrumentDraftFromTemplate } from '@/domain/profile/my-instrument'
import { makeSeed } from '@/domain/random/seed'
import { adaptCarryIn } from '@/session/carry-in-adaptation'
import { mutationCandidates } from '@/session/settings-mutation'
import type { SessionSettings, SessionStart } from '@/session/session-types'
import { sessionFigureLevels } from '@/session/session-intents'
import {
  BASE_CONTROLS,
  carryInAfter,
  generateSuccess,
} from '../domain/generation/carry-in/carry-in-fixture'
import { SessionDriver } from './session-harness'

/** My instrument written C3 to C6 (MIDI 48 to 84), sounding a minor third lower. */
const MINOR_THIRD_LOWER = makeMyInstrument({
  template: 'c-keyboard',
  name: 'My horn in A',
  clef: 'treble',
  writtenRange: { minMidi: 48, maxMidi: 84 },
  transposition: { octaves: 0, semitones: 3, direction: 'lower' },
}).profile

/** My instrument made from the alto saxophone template without change: the alto's data. */
const MY_ALTO = makeMyInstrument({
  ...myInstrumentDraftFromTemplate('eb-alto'),
  name: 'My alto',
  clef: 'treble',
}).profile

/** Intent: session settings for my instrument at 60 BPM in written D, with some controls changed. */
function mySettings(
  controls: Partial<GenerationControls> = {},
  profile: InstrumentProfile = MINOR_THIRD_LOWER,
): SessionSettings {
  return {
    controls: makeGenerationControls({
      ...BASE_CONTROLS,
      tempo: 60,
      tonalCenter: 'D',
      instrumentProfileId: 'my-instrument',
      ...controls,
    }),
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    selection: { kind: 'custom', baseId: 'neutral' },
    instrumentProfile: profile,
  }
}

/** Intent: a real phrase 1 generated at Idle under the settings, with its profile as data. */
function myPhraseOne(settings: SessionSettings, seed = 11): SessionStart['phraseOne'] {
  const intent = createGenerationIntent({
    requestId: makeRequestId(`my-phrase-1-${seed}`),
    seed: makeSeed(seed),
    controls: settings.controls,
    figureLevels: sessionFigureLevels(settings),
    ...(settings.instrumentProfile === undefined
      ? {}
      : { instrumentProfile: settings.instrumentProfile }),
  })
  return { intent, outcome: generateSuccess(intent) }
}

/** Intent: expect every intent to be built for my instrument with the given profile. */
function expectBuiltWith(intents: readonly GenerationIntent[], profile: InstrumentProfile): void {
  expect(intents.length).toBeGreaterThan(0)
  for (const intent of intents) {
    expect(intent.controls.instrumentProfileId).toBe('my-instrument')
    expect(intent.instrumentProfile).toStrictEqual(profile)
  }
}

// @test-link [[service_session_engine]]
// @test-link [[entity_my_instrument]]
describe('a session with my instrument builds every attempt with its profile', () => {
  // @test-link [[service_session_engine]]
  it('builds the carry-in attempts and the standalone retry with it', () => {
    const settings = mySettings()
    const driver = new SessionDriver({ at: 0, settings, phraseOne: myPhraseOne(settings) })
    for (let rung = 0; rung < 4; rung += 1) driver.fail(0.1 + rung / 10)

    const requests = driver.requests(2)
    expect(requests.map((request) => request.step)).toEqual([
      'carry-in',
      'carry-in',
      'carry-in',
      'carry-in',
      'standalone',
    ])
    expectBuiltWith(
      requests.map((request) => request.intent),
      MINOR_THIRD_LOWER,
    )
    for (const { intent } of requests) {
      expect(intent.writtenTonalCenter).toBe('D')
      expect(intent.controls.tonalCenter).toBe('B')
    }
  })

  // @test-link [[service_session_engine]]
  it('builds the next phrase’s carry-in attempt with it once phrase 2 is decided', () => {
    const settings = mySettings()
    const driver = new SessionDriver({ at: 0, settings, phraseOne: myPhraseOne(settings) })
    driver.settle(0.1)
    driver.tick(4)
    driver.countInOver(4)
    driver.sounding(20, 2)

    const third = driver.requests(3)
    expect(third[0]?.step).toBe('carry-in')
    expectBuiltWith(
      third.map((request) => request.intent),
      MINOR_THIRD_LOWER,
    )
  })

  // @test-link [[service_session_engine]]
  it('adapts the carry-in to a settings change and keeps the profile, throwing nothing', () => {
    const settings = mySettings()
    const driver = new SessionDriver({ at: 0, settings, phraseOne: myPhraseOne(settings) })
    driver.settle(0.1)
    driver.change(0.2, mySettings({ harmonicMotion: 'Active diatonic', tension: 'Lift' }))
    driver.tick(4)
    driver.countInOver(4)
    driver.sounding(20, 2)

    const third = driver.requests(3)
    expectBuiltWith(
      third.map((request) => request.intent),
      MINOR_THIRD_LOWER,
    )
    expect(third[0]?.intent.controls.harmonicMotion).toBe('Active diatonic')
  })

  // @test-link [[service_session_engine]]
  it('keeps the profile in every settings mutation candidate', () => {
    const candidates = mutationCandidates(mySettings(), {
      belowTabletLandscape: false,
      sessionSteppedDown: false,
      resolvedRegister: 'Middle',
    })
    expect(candidates.length).toBeGreaterThan(0)
    for (const candidate of candidates)
      expect(candidate.settings.instrumentProfile).toStrictEqual(MINOR_THIRD_LOWER)
  })
})

// @test-link [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
// @test-link [[entity_my_instrument]]
describe('the carry-in receiver converts the tonal center with my instrument’s transposition', () => {
  /** The settings changes the receiver is built for: harmony settings, key kept. */
  const CHANGES: readonly Partial<GenerationControls>[] = [
    { harmonicMotion: 'Active diatonic' },
    { tension: 'Lift' },
    { harmonicMotion: 'Static', tension: 'Build' },
  ]
  const SEEDS = [11, 12, 13, 14, 15]

  /** Intent: the alto's settings, built-in or my instrument, in written D with some controls set. */
  function altoSettings(mine: boolean, controls: Partial<GenerationControls>): SessionSettings {
    if (mine) return mySettings(controls, MY_ALTO)
    return {
      controls: makeGenerationControls({
        ...BASE_CONTROLS,
        tonalCenter: 'D',
        instrumentProfileId: 'eb-alto',
        ...controls,
      }),
      figureLevels: NEUTRAL_FIGURE_LEVELS,
      selection: { kind: 'custom', baseId: 'neutral' },
    }
  }

  /** Intent: the adaptation of phrase 1's carry-in to one change, for the built-in or mine. */
  function adaptationFor(mine: boolean, seed: number, change: Partial<GenerationControls>) {
    const before = altoSettings(mine, {})
    const phrase = myPhraseOne(before, seed)
    return adaptCarryIn({
      carryIn: carryInAfter(phrase.intent, phrase.outcome, 1),
      before,
      after: altoSettings(mine, change),
      candidates: phrase.intent.registerIntent.candidates,
    })
  }

  // @test-link [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
  it('adapts exactly as for the built-in alto whose data my instrument has', () => {
    expect({
      ...MY_ALTO,
      id: EB_ALTO_PROFILE.id,
      displayName: EB_ALTO_PROFILE.displayName,
    }).toEqual(EB_ALTO_PROFILE)
    let keptHarmony = 0
    for (const seed of SEEDS)
      for (const change of CHANGES) {
        const mine = adaptationFor(true, seed, change)
        expect(mine).toEqual(adaptationFor(false, seed, change))
        if (mine.kind === 'carry-in' && mine.carryIn.finalHarmony !== null) keptHarmony += 1
      }
    expect(keptHarmony).toBeGreaterThan(0)
  })
})

// @test-link [[service_session_engine]]
// @test-link [[entity_my_instrument]]
describe('settings whose profile does not match their instrument are refused at the start', () => {
  // @test-link [[service_session_engine]]
  it('refuses my instrument without its profile', () => {
    const settings = mySettings()
    const phraseOne = myPhraseOne(settings)
    const { instrumentProfile, ...withoutProfile } = settings
    void instrumentProfile
    expect(() => new SessionDriver({ at: 0, settings: withoutProfile, phraseOne })).toThrow(
      /no my-instrument profile/,
    )
  })

  // @test-link [[service_session_engine]]
  it('refuses a built-in with a profile given as data', () => {
    const settings = altoBuiltIn()
    const phraseOne = myPhraseOne(settings)
    expect(
      () =>
        new SessionDriver({
          at: 0,
          settings: { ...settings, instrumentProfile: EB_ALTO_PROFILE },
          phraseOne,
        }),
    ).toThrow(/supplied profile/)
  })
})

/** Intent: the built-in alto's settings in written D at 60 BPM. */
function altoBuiltIn(): SessionSettings {
  return {
    controls: makeGenerationControls({
      ...BASE_CONTROLS,
      tempo: 60,
      tonalCenter: 'D',
      instrumentProfileId: 'eb-alto',
    }),
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    selection: { kind: 'custom', baseId: 'neutral' },
  }
}
