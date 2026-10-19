/**
 * How the engine builds the intent of every attempt: from the settings frozen at start, whatever
 * the caller does to its own objects afterwards, and with a note density that only ever steps
 * down during the session.
 */

import { describe, expect, it } from 'vitest'

import type { GenerationControls } from '@/domain/controls/generation-controls'
import { JAZZ_FIGURE_LEVELS, NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import type { SessionSettings } from '@/session/session-types'
import { BASE_CONTROLS } from '../domain/generation/carry-in/carry-in-fixture'
import { SessionDriver, fakeViewport, phraseOneFor, sessionSettings } from './session-harness'

/** Intent: the densities of every request made so far for one phrase. */
function densitiesOf(driver: SessionDriver, phraseNumber: number): readonly string[] {
  return driver.requests(phraseNumber).map((request) => request.intent.controls.noteDensity)
}

/**
 * Intent: let phrase 2 be repeated at its deadline and let phrase 1 then phrase 2 start sounding,
 * so phrase 3 is requested (60 BPM: a 4 s measure, phrase 2 sounds at 20).
 */
function reachPhraseThree(driver: SessionDriver): void {
  driver.tick(4)
  driver.countInOver(4)
  driver.sounding(20, 2)
}

/** Intent: a driver at 60 BPM with a chosen density, a window reading and phrase 1's density. */
function densityDriver(options: {
  readonly chosen: GenerationControls['noteDensity']
  readonly below: boolean
  readonly phraseOneDensity?: GenerationControls['noteDensity']
}): SessionDriver {
  const settings = sessionSettings({ tempo: 60, noteDensity: options.chosen })
  const phraseOne = phraseOneFor(settings, {
    controls: { noteDensity: options.phraseOneDensity ?? options.chosen },
  })
  return new SessionDriver({ at: 0, settings, phraseOne, viewport: fakeViewport(options.below) })
}

// @test-link [[rule_session_settings_locked]]
// @test-link [[service_session_engine]]
describe('settings locked at start', () => {
  // @test-link [[rule_session_settings_locked]]
  it('builds every intent from the settings as they were at start', () => {
    const controls: { -readonly [K in keyof GenerationControls]: GenerationControls[K] } = {
      ...BASE_CONTROLS,
      tempo: 60,
      instrumentProfileId: 'bb-tenor',
      tonalCenter: 'D',
    }
    const musicalProfile = { musicalProfile: 'Neutral' as const, isCustom: true }
    const settings: SessionSettings = { controls, musicalProfile }
    const phraseOne = phraseOneFor(settings)
    const driver = new SessionDriver({ at: 0, settings, phraseOne })

    controls.collection = 'Minor'
    controls.tonalCenter = 'F'
    controls.tempo = 120
    musicalProfile.isCustom = false
    reachPhraseThree(driver)
    driver.fail(20.5)

    for (const request of driver.requests()) {
      expect(request.intent.controls.collection).toBe('Major')
      expect(request.intent.writtenTonalCenter).toBe('D')
      expect(request.intent.controls.tonalCenter).toBe(phraseOne.intent.controls.tonalCenter)
      expect(request.intent.controls.tempo).toBe(60)
      expect(request.intent.figureLevels).toEqual(NEUTRAL_FIGURE_LEVELS)
      expect(request.intent.controls.instrumentProfileId).toBe('bb-tenor')
    }
    expect(driver.lastRequest().deadline).toBe(32)
  })

  // @test-link [[rule_session_settings_locked]]
  it('builds each attempt from the chosen controls, the carried phrase aside', () => {
    const settings = sessionSettings({ tempo: 60, contour: 'Arch', leapiness: 'Smooth' })
    const driver = new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
    driver.fail(0.1)
    for (const request of driver.requests()) {
      const { tonalCenter, ...chosen } = settings.controls
      const { tonalCenter: concert, ...built } = request.intent.controls
      expect(built).toEqual(chosen)
      expect(request.intent.writtenTonalCenter).toBe(tonalCenter)
      expect(concert).toBe(tonalCenter)
    }
  })
})

// @test-link [[module_generation_request_construction]]
describe("every attempt carries the settings' profile's figure levels", () => {
  it.each([
    ['Neutral', false, NEUTRAL_FIGURE_LEVELS],
    ['Jazz', false, JAZZ_FIGURE_LEVELS],
    ['Jazz', true, JAZZ_FIGURE_LEVELS],
  ] as const)('%s (customized: %s)', (profile, isCustom, levels) => {
    const settings: SessionSettings = {
      ...sessionSettings({ tempo: 60 }),
      musicalProfile: { musicalProfile: profile, isCustom },
    }
    const driver = new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
    reachPhraseThree(driver)
    driver.fail(20.5)

    expect(driver.requests().length).toBeGreaterThan(1)
    for (const request of driver.requests()) {
      expect(request.intent.figureLevels).toStrictEqual(levels)
    }
  })
})

// @test-link [[rule_session_density_only_steps_down]]
// @test-link [[module_session_density_step_down]]
describe('session density only steps down', () => {
  // @test-link [[rule_session_density_only_steps_down]]
  it('keeps Eighth for every phrase after a narrow start, even once the window widens', () => {
    const driver = densityDriver({ chosen: 'Sixteenth', below: true, phraseOneDensity: 'Eighth' })
    driver.fail(0.1)
    expect(densitiesOf(driver, 2)).toEqual(['Eighth', 'Eighth'])
    driver.viewport.below = false
    reachPhraseThree(driver)
    driver.fail(20.5)
    expect(densitiesOf(driver, 3)).toEqual(['Eighth', 'Eighth'])
  })

  // @test-link [[rule_session_density_only_steps_down]]
  it('steps down when the window narrows, even for an attempt that fails, and stays there', () => {
    const driver = densityDriver({ chosen: 'Sixteenth', below: false })
    driver.viewport.below = true
    driver.fail(0.1)
    driver.viewport.below = false
    driver.fail(0.2)
    driver.fail(0.3)
    expect(densitiesOf(driver, 2)).toEqual(['Sixteenth', 'Eighth', 'Eighth', 'Eighth'])
    driver.tick(4)
    driver.countInOver(4)
    driver.sounding(20, 2)
    expect(densitiesOf(driver, 3)).toEqual(['Eighth'])
  })

  // @test-link [[rule_session_density_only_steps_down]]
  it('generates Sixteenth after a phrase 1 generated as Eighth at Idle when the window is wide', () => {
    const driver = densityDriver({ chosen: 'Sixteenth', below: false, phraseOneDensity: 'Eighth' })
    driver.fail(0.1)
    expect(densitiesOf(driver, 2)).toEqual(['Sixteenth', 'Sixteenth'])
    reachPhraseThree(driver)
    expect(densitiesOf(driver, 3)).toEqual(['Sixteenth'])
  })

  // @test-link [[rule_session_density_only_steps_down]]
  it('leaves a chosen Eighth as it is at every width', () => {
    const driver = densityDriver({ chosen: 'Eighth', below: true })
    driver.fail(0.1)
    driver.viewport.below = false
    driver.fail(0.2)
    expect(densitiesOf(driver, 2)).toEqual(['Eighth', 'Eighth', 'Eighth'])
  })
})
