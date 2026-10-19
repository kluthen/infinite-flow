/**
 * Phrase 1's settings and the stale check: the session settings phrase 1 was generated under,
 * built from what the Idle result recorded with the session's tempo; and whether phrase 1 is stale,
 * compared by value over what the generation reads. Every setting master spec §16 counts makes it
 * stale; the tempo, the session options, the profile's customized mark, my instrument's clef and
 * name, the window and a setting changed and changed back never do.
 */

import { describe, expect, it } from 'vitest'

import {
  makeGenerationControls,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '@/domain/controls/profile-selection'
import { FIGURE_IDS } from '@/domain/figures/figure-levels'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeMyInstrument, type MyInstrument } from '@/domain/profile/my-instrument'
import { MY_INSTRUMENT_ID } from '@/domain/profile/instrument-profiles'
import { makeSeed } from '@/domain/random/seed'
import { SessionEngineError, type SessionSettings } from '@/session/session-types'
import {
  isPhraseOneStale,
  phraseOneSettings,
  phraseOneSettingsAtStart,
  staleSettingsOf,
  type StaleSetting,
} from '@/session/stale-phrase-one'

/** Intent: settings on the first-load defaults, with these controls changed. */
function settingsWith(overrides: Partial<GenerationControls> = {}): SessionSettings {
  return {
    controls: makeGenerationControls({ ...DEFAULT_GENERATION_CONTROLS, ...overrides }),
    musicalProfile: DEFAULT_PROFILE_SELECTION,
  }
}

/** Intent: my instrument on the tenor template, with a range and transposition of choice. */
function mine(overrides: Partial<Parameters<typeof makeMyInstrument>[0]> = {}): MyInstrument {
  return makeMyInstrument({
    template: 'bb-tenor',
    name: 'My tenor',
    clef: 'treble',
    writtenRange: { minMidi: 48, maxMidi: 74 },
    transposition: { octaves: 1, semitones: 2, direction: 'lower' },
    ...overrides,
  })
}

/** Intent: settings naming my instrument, carrying its profile as the generation reads it. */
function mySettings(instrument: MyInstrument): SessionSettings {
  return {
    ...settingsWith({ instrumentProfileId: MY_INSTRUMENT_ID }),
    instrumentProfile: instrument.profile,
  }
}

/** One setting that counts, changed from the defaults. */
interface CountedChange {
  readonly name: string
  readonly current: SessionSettings
}

/** Every generation control master spec §16 counts, each changed alone, and the figure levels. */
const COUNTED: readonly CountedChange[] = [
  { name: 'Written key', current: settingsWith({ tonalCenter: 'F#' }) },
  { name: 'Collection', current: settingsWith({ collection: 'Major' }) },
  { name: 'Harmonic motion', current: settingsWith({ harmonicMotion: 'Static' }) },
  { name: 'Tension', current: settingsWith({ tension: 'Edge' }) },
  { name: 'Note density', current: settingsWith({ noteDensity: 'Sixteenth' }) },
  { name: 'Rhythmic variety', current: settingsWith({ rhythmicVariety: 'Heavily varied' }) },
  { name: 'Syncopation', current: settingsWith({ syncopation: 'Active displacement' }) },
  { name: 'Silence density', current: settingsWith({ silenceDensity: 'Breath-heavy' }) },
  { name: 'Contour', current: settingsWith({ contour: 'Rising' }) },
  { name: 'Register', current: settingsWith({ register: 'Low' }) },
  { name: 'Leapiness', current: settingsWith({ leapiness: 'Angular' }) },
  { name: 'Arpeggio chaos', current: settingsWith({ arpeggioChaos: 'Chaotic' }) },
  { name: 'the instrument', current: settingsWith({ instrumentProfileId: 'c-keyboard' }) },
  {
    name: 'the musical profile',
    current: { ...settingsWith(), musicalProfile: { musicalProfile: 'Jazz', isCustom: false } },
  },
]

// @test-link [[rule_stale_phrase_prompt_at_start]]
describe('the stale check', () => {
  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it.each(COUNTED)('makes phrase 1 stale after a change of $name', ({ current }) => {
    expect(isPhraseOneStale(settingsWith(), current)).toBe(true)
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it("makes phrase 1 stale after a change of my instrument's range or transposition", () => {
    const before = mySettings(mine())
    const ranged = mySettings(mine({ writtenRange: { minMidi: 48, maxMidi: 76 } }))
    const transposed = mySettings(
      mine({ transposition: { octaves: 1, semitones: 0, direction: 'lower' } }),
    )

    expect(isPhraseOneStale(before, ranged)).toBe(true)
    expect(isPhraseOneStale(before, transposed)).toBe(true)
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  // @test-link [[rule_tempo_never_affects_generation]]
  it('never counts the tempo, nor the profile’s customized mark', () => {
    const custom = {
      ...settingsWith(),
      musicalProfile: { musicalProfile: 'Neutral' as const, isCustom: true },
    }

    expect(isPhraseOneStale(settingsWith(), settingsWith({ tempo: 240 }))).toBe(false)
    expect(isPhraseOneStale(settingsWith(), custom)).toBe(false)
    expect(staleSettingsOf(settingsWith(), custom)).toEqual([])
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it("never counts my instrument's clef or display name", () => {
    const before = mySettings(mine())
    const renamed = mySettings(mine({ name: 'Another name', clef: 'bass' }))

    expect(isPhraseOneStale(before, renamed)).toBe(false)
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it('compares values, not edits: a setting changed and changed back makes nothing stale', () => {
    const changedBack = settingsWith({
      ...settingsWith({ tonalCenter: 'F#' }).controls,
      tonalCenter: 'C',
    })

    expect(isPhraseOneStale(settingsWith(), changedBack)).toBe(false)
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it('never counts the window: a Sixteenth chosen below the tablet-landscape width is the chosen Sixteenth', () => {
    const recorded = {
      controls: settingsWith({ noteDensity: 'Sixteenth' }).controls,
      profileSelection: DEFAULT_PROFILE_SELECTION,
    }
    const narrowIntent = createGenerationIntent({
      requestId: makeRequestId('narrow'),
      seed: makeSeed(5),
      controls: { ...recorded.controls, noteDensity: 'Eighth' },
      musicalProfile: DEFAULT_PROFILE_SELECTION,
    })

    const phraseOne = phraseOneSettings(recorded, narrowIntent, 90)

    expect(phraseOne.controls.noteDensity).toBe('Sixteenth')
    expect(isPhraseOneStale(phraseOne, settingsWith({ noteDensity: 'Sixteenth' }))).toBe(false)
  })
})

// @test-link [[service_session_engine]]
describe("phrase 1's settings", () => {
  // @test-link [[service_session_engine]]
  // @test-link [[service_idle_generation_session]]
  it("are the recorded controls at the session's tempo, my instrument's profile taken from phrase 1", () => {
    const instrument = mine()
    const controls = makeGenerationControls({
      ...DEFAULT_GENERATION_CONTROLS,
      instrumentProfileId: MY_INSTRUMENT_ID,
      tonalCenter: 'D',
    })
    const intent = createGenerationIntent({
      requestId: makeRequestId('mine'),
      seed: makeSeed(6),
      controls,
      musicalProfile: DEFAULT_PROFILE_SELECTION,
      instrumentProfile: instrument.profile,
    })

    const settings = phraseOneSettings(
      { controls, profileSelection: DEFAULT_PROFILE_SELECTION },
      intent,
      150,
    )

    expect(settings.controls).toEqual({ ...controls, tempo: 150 })
    expect(settings.musicalProfile).toEqual(DEFAULT_PROFILE_SELECTION)
    expect(settings.instrumentProfile).toEqual(instrument.profile)
  })

  // @test-link [[service_session_engine]]
  it('are the chosen settings when a start gives none, and are checked when it gives some', () => {
    const chosen = settingsWith({ tempo: 120 })

    expect(phraseOneSettingsAtStart(chosen, undefined)).toBe(chosen)
    expect(
      phraseOneSettingsAtStart(chosen, settingsWith({ tempo: 120, tonalCenter: 'G' })).controls
        .tonalCenter,
    ).toBe('G')
    expect(() => phraseOneSettingsAtStart(chosen, settingsWith({ tempo: 60 }))).toThrow(
      SessionEngineError,
    )
    expect(() =>
      phraseOneSettingsAtStart(
        chosen,
        settingsWith({ tempo: 120, instrumentProfileId: 'c-keyboard' }),
      ),
    ).toThrow(SessionEngineError)
  })
})

/** The settings each counted change names: a Neutral–Jazz change, by its two chromatic figures. */
const NAMED: readonly (readonly StaleSetting[])[] = [
  ['tonalCenter'],
  ['collection'],
  ['harmonicMotion'],
  ['tension'],
  ['noteDensity'],
  ['rhythmicVariety'],
  ['syncopation'],
  ['silenceDensity'],
  ['contour'],
  ['register'],
  ['leapiness'],
  ['arpeggioChaos'],
  ['instrumentProfileId'],
  ['chromaticApproach', 'chromaticEnclosure'],
]

// @test-link [[rule_stale_phrase_prompt_at_start]]
describe('the settings a stale phrase 1 differs in', () => {
  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it.each(COUNTED.map((change, index) => ({ ...change, settings: NAMED[index] })))(
    'names $settings alone after a change of $name',
    ({ current, settings }) => {
      expect(staleSettingsOf(settingsWith(), current)).toEqual(settings)
    },
  )

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it('names a Neutral–Jazz change, either way, by exactly the two chromatic figures, never the profile', () => {
    const neutral = settingsWith()
    const jazz = {
      ...settingsWith(),
      musicalProfile: { musicalProfile: 'Jazz' as const, isCustom: true },
    }
    const chromatic = FIGURE_IDS.filter((figure) => figure.startsWith('chromatic'))

    expect(chromatic).toEqual(['chromaticApproach', 'chromaticEnclosure'])
    for (const [before, after] of [
      [neutral, jazz],
      [jazz, neutral],
    ] as const) {
      const named: readonly string[] = staleSettingsOf(before, after)
      expect(named).toEqual(chromatic)
      expect(named).not.toContain('musicalProfile')
    }
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it("names the instrument after a change of my instrument's range, and nothing for its name", () => {
    const before = mySettings(mine())

    expect(
      staleSettingsOf(before, mySettings(mine({ writtenRange: { minMidi: 48, maxMidi: 76 } }))),
    ).toEqual(['instrumentProfileId'])
    expect(staleSettingsOf(before, mySettings(mine({ name: 'Renamed', clef: 'bass' })))).toEqual([])
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it('names several changes, none for the tempo, and agrees with the stale check', () => {
    const current = {
      ...settingsWith({ tonalCenter: 'G', register: 'Low', tempo: 200 }),
      musicalProfile: { musicalProfile: 'Jazz' as const, isCustom: true },
    }

    expect(staleSettingsOf(settingsWith(), current)).toEqual([
      'tonalCenter',
      'register',
      'chromaticApproach',
      'chromaticEnclosure',
    ])
    expect(staleSettingsOf(settingsWith(), settingsWith({ tempo: 200 }))).toEqual([])
    for (const { current: each } of COUNTED)
      expect(isPhraseOneStale(settingsWith(), each)).toBe(
        staleSettingsOf(settingsWith(), each).length > 0,
      )
  })
})
