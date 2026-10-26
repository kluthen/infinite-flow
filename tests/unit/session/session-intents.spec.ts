/**
 * How the engine builds the intent of every attempt: from the settings frozen at start, whatever
 * the caller does to its own objects afterwards, and with a note density that only ever steps
 * down during the session.
 */

import { describe, expect, it } from 'vitest'

import type { GenerationControls } from '@/domain/controls/generation-controls'
import {
  JAZZ_FIGURE_LEVELS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureId,
  type FigureLevel,
} from '@/domain/figures/figure-levels'
import { RHYTHM_CHANGE_KINDS, type RhythmChangeKind } from '@/domain/generation/request-rhythm-lock'
import type { PresetSelection } from '@/domain/presets/preset-selection'
import { freezeSessionSettings } from '@/session/session-intents'
import { SessionEngineError, type SessionSettings } from '@/session/session-types'
import { ALL_GROUPS_ALLOWED, type AllowedGroups } from '@/session/settings-mutation'
import { BASE_CONTROLS } from '../domain/generation/carry-in/carry-in-fixture'
import { SessionDriver, fakeViewport, phraseOneFor, sessionSettings } from './session-harness'

/** The selections the figure-level cases start from. */
const NEUTRAL: PresetSelection = { kind: 'preset', presetId: 'neutral' }
const JAZZ: PresetSelection = { kind: 'preset', presetId: 'jazz' }
const CUSTOM_JAZZ: PresetSelection = { kind: 'custom', baseId: 'jazz' }

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
    const figureLevels: { -readonly [F in FigureId]: FigureLevel } = { ...NEUTRAL_FIGURE_LEVELS }
    const selection: { kind: 'custom'; baseId: string | null } = {
      kind: 'custom',
      baseId: 'neutral',
    }
    const settings: SessionSettings = {
      controls,
      figureLevels,
      selection,
      allowedGroups: ALL_GROUPS_ALLOWED,
      rhythmLockOn: false,
      allowedRhythmChanges: [],
    }
    const phraseOne = phraseOneFor(settings)
    const driver = new SessionDriver({ at: 0, settings, phraseOne })

    controls.collection = 'Minor'
    controls.tonalCenter = 'F'
    controls.tempo = 120
    figureLevels.chromaticApproach = 'stronglyFavored'
    selection.baseId = 'jazz'
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
describe("every attempt carries the settings' own figure levels, whatever the selection", () => {
  it.each([
    ["Neutral's levels, Neutral selected", NEUTRAL_FIGURE_LEVELS, NEUTRAL],
    ["Jazz's levels, Jazz selected", JAZZ_FIGURE_LEVELS, JAZZ],
    ["Jazz's levels, Custom based on Jazz", JAZZ_FIGURE_LEVELS, CUSTOM_JAZZ],
    ["Jazz's levels, Neutral selected", JAZZ_FIGURE_LEVELS, NEUTRAL],
  ] as const)('%s', (_name, levels, selection) => {
    const settings: SessionSettings = {
      ...sessionSettings({ tempo: 60 }),
      figureLevels: levels,
      selection,
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

// @test-link [[rule_session_settings_locked]]
// @test-link [[rule_vary_settings_allowed_groups]]
describe("the settings' allowed groups and rhythm lock state", () => {
  const ONLY_HARMONY: AllowedGroups = {
    keyAndMode: false,
    harmony: true,
    tension: false,
    rhythm: false,
    melodyShape: false,
    figures: false,
  }

  // @test-link [[rule_session_settings_locked]]
  // @test-link [[rule_vary_settings_allowed_groups]]
  it('keeps them as given, frozen, and builds no intent from the allowed groups', () => {
    const allowedGroups = { ...ONLY_HARMONY }
    const allowedRhythmChanges: RhythmChangeKind[] = ['move_rest', 'note_rest']
    const given: SessionSettings = {
      ...sessionSettings({ tempo: 60 }),
      allowedGroups,
      allowedRhythmChanges,
    }
    const frozen = freezeSessionSettings({ ...given, rhythmLockOn: true })
    allowedGroups.figures = true
    allowedRhythmChanges.push('split_note')
    expect(frozen.allowedGroups).toStrictEqual(ONLY_HARMONY)
    expect(frozen.rhythmLockOn).toBe(true)
    expect(frozen.allowedRhythmChanges).toStrictEqual(['move_rest', 'note_rest'])
    expect(Object.isFrozen(frozen.allowedGroups)).toBe(true)
    expect(Object.isFrozen(frozen.allowedRhythmChanges)).toBe(true)

    const intentsUnder = (settings: SessionSettings) => {
      const driver = new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
      reachPhraseThree(driver)
      driver.fail(20.5)
      return driver.requests().map((request) => request.intent)
    }
    const everyGroup = sessionSettings({ tempo: 60 })
    expect(everyGroup.allowedGroups).toStrictEqual(ALL_GROUPS_ALLOWED)
    expect(everyGroup.rhythmLockOn).toBe(false)
    expect(intentsUnder({ ...everyGroup, allowedGroups: ONLY_HARMONY })).toStrictEqual(
      intentsUnder(everyGroup),
    )
  })

  // @test-link [[rule_session_settings_locked]]
  it('refuses allowed groups that are not exactly the six groups, each on or off, and a lock state that is not a boolean', () => {
    const settings = sessionSettings()
    const { figures, ...fiveGroups } = ONLY_HARMONY
    void figures
    const invalidGroups: readonly unknown[] = [
      fiveGroups,
      { ...ONLY_HARMONY, jam: true },
      { ...ONLY_HARMONY, rhythm: 'on' },
      { ...ONLY_HARMONY, figures: undefined },
      null,
      [true, true, true, true, true, true],
    ]
    for (const allowedGroups of invalidGroups)
      expect(() =>
        freezeSessionSettings({
          ...settings,
          allowedGroups: allowedGroups as unknown as AllowedGroups,
        }),
      ).toThrow(SessionEngineError)
    for (const rhythmLockOn of [undefined, 'false', 0])
      expect(() =>
        freezeSessionSettings({ ...settings, rhythmLockOn: rhythmLockOn as unknown as boolean }),
      ).toThrow(SessionEngineError)
  })

  // @test-link [[rule_session_settings_locked]]
  // @test-link [[module_session_rhythm_lock]]
  it('refuses allowed rhythm changes that are not a list of known kinds, each once, in order', () => {
    const settings = sessionSettings()
    const invalid: readonly [unknown, RegExp][] = [
      [undefined, /must be a list/],
      ['split_note', /must be a list/],
      [{ 0: 'split_note' }, /must be a list/],
      [['split_note', 'swing'], /"swing" is none of/],
      [['move_rest', 'move_rest'], /move_rest is repeated/],
      [['note_rest', 'split_note'], /split_note is out of order/],
    ]
    for (const [allowedRhythmChanges, message] of invalid) {
      /** Intent: freeze the settings with this invalid list of allowed changes. */
      const freeze = () =>
        freezeSessionSettings({
          ...settings,
          allowedRhythmChanges: allowedRhythmChanges as readonly RhythmChangeKind[],
        })
      expect(freeze).toThrow(SessionEngineError)
      expect(freeze).toThrow(message)
    }
    expect(
      freezeSessionSettings({ ...settings, allowedRhythmChanges: RHYTHM_CHANGE_KINDS }),
    ).toHaveProperty('allowedRhythmChanges', RHYTHM_CHANGE_KINDS)
    expect(freezeSessionSettings(settings).allowedRhythmChanges).toStrictEqual([])
  })
})
