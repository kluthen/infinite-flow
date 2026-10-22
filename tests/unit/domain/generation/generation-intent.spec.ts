import { describe, expect, it } from 'vitest'

import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import type { MusicalProfile } from '@/domain/controls/generation-controls'
import {
  FIGURE_IDS,
  JAZZ_FIGURE_LEVELS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import {
  GenerationIntentError,
  createGenerationIntent,
  makeGenerationIntent,
  getInstrumentProfile,
  regenerateGenerationIntent,
  resolveInstrumentProfile,
  writtenToConcertTonalCenter,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { type InstrumentProfile, makeInstrumentProfile } from '@/domain/profile/instrument-profile'
import { BB_TENOR_PROFILE } from '@/domain/profile/instrument-profiles'
import { makeMyInstrument } from '@/domain/profile/my-instrument'
import {
  REGISTER_WINDOW_ALGORITHM_V1,
  deriveRegisterWindowCandidates,
} from '@/domain/profile/register-window-derivation'
import { makeSeed } from '@/domain/random/seed'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import {
  BASE_CONTROLS,
  buildIntent,
  carryInAfter,
  generateSuccess,
} from './carry-in/carry-in-fixture'
import { SAMPLE_RHYTHM_LOCK, SAMPLE_STEERING } from './request-inputs-fixture'

/**
 * Two open, fabricated test-only instrument profiles -- neither transposition any shipped
 * first-release preset uses -- built with the same `makeInstrumentProfile` constructor real
 * profiles use, proving `writtenToConcertTonalCenter` branches on nothing but the pair's values.
 */
const TEST_PROFILE_BASE = {
  displayName: 'TEST-ONLY instrument',
  concertRange: { minMidi: 48, maxMidi: 72 },
  registerWindows: {
    algorithm: REGISTER_WINDOW_ALGORITHM_V1,
    minimumSpan: 12,
    widthNumerator: 1,
    widthDenominator: 2,
  },
} as const

const TEST_PROFILE_PLUS_2_1 = makeInstrumentProfile({
  ...TEST_PROFILE_BASE,
  id: 'test-plus2-plus1',
  transposition: { chromatic: 2, diatonic: 1 },
})

const TEST_PROFILE_PLUS_21_12 = makeInstrumentProfile({
  ...TEST_PROFILE_BASE,
  id: 'test-plus21-plus12',
  transposition: { chromatic: 21, diatonic: 12 },
})

// @test-link [[module_generation_request_construction]]
describe('GenerationIntent', () => {
  const first = createGenerationIntent({
    requestId: makeRequestId('request-1'),
    seed: makeSeed(1),
    controls: DEFAULT_GENERATION_CONTROLS,
    figureLevels: NEUTRAL_FIGURE_LEVELS,
  })

  it('is complete, serializable, immutable, and reuses the selected Step 3 profile policy', () => {
    expect(first).toMatchObject({
      requestId: 'request-1',
      seed: 1,
      measureCount: 4,
      meter: { beatsPerMeasure: 4, beatUnit: 4 },
      instrumentProfile: BB_TENOR_PROFILE,
      registerIntent: { requestedRegister: 'Middle' },
    })
    // The default B-flat tenor profile transposes written C (the default written tonal center)
    // down to concert A# (pc 10): `controls.tonalCenter` is always concert pitch.
    expect(JSON.parse(JSON.stringify(first)).controls).toEqual({
      ...DEFAULT_GENERATION_CONTROLS,
      tonalCenter: 'A#',
    })
    expect(first.writtenTonalCenter).toBe('C')
    expect(() => {
      // @ts-expect-error generation intent is readonly
      first.seed = makeSeed(2)
    }).toThrow(TypeError)
  })

  // @test-link [[module_generation_request_construction]]
  it('converts the written tonal center to concert pitch using each instrument profile transposition', () => {
    const tenor = createGenerationIntent({
      requestId: makeRequestId('request-tenor'),
      seed: makeSeed(1),
      controls: {
        ...DEFAULT_GENERATION_CONTROLS,
        tonalCenter: 'C',
        instrumentProfileId: 'bb-tenor',
      },
      figureLevels: NEUTRAL_FIGURE_LEVELS,
    })
    expect(tenor.writtenTonalCenter).toBe('C')
    expect(tenor.controls.tonalCenter).toBe('A#')

    const alto = createGenerationIntent({
      requestId: makeRequestId('request-alto'),
      seed: makeSeed(1),
      controls: {
        ...DEFAULT_GENERATION_CONTROLS,
        tonalCenter: 'C',
        instrumentProfileId: 'eb-alto',
      },
      figureLevels: NEUTRAL_FIGURE_LEVELS,
    })
    expect(alto.writtenTonalCenter).toBe('C')
    expect(alto.controls.tonalCenter).toBe('D#')

    const keyboard = createGenerationIntent({
      requestId: makeRequestId('request-keyboard'),
      seed: makeSeed(1),
      controls: {
        ...DEFAULT_GENERATION_CONTROLS,
        tonalCenter: 'C',
        instrumentProfileId: 'c-keyboard',
      },
      figureLevels: NEUTRAL_FIGURE_LEVELS,
    })
    expect(keyboard.writtenTonalCenter).toBe('C')
    expect(keyboard.controls.tonalCenter).toBe('C')
  })

  // @test-link [[module_generation_request_construction]]
  it('converts a written non-Ionian collection selection to its concert-pitch equivalent', () => {
    const dorian = createGenerationIntent({
      requestId: makeRequestId('request-dorian'),
      seed: makeSeed(1),
      controls: {
        ...DEFAULT_GENERATION_CONTROLS,
        tonalCenter: 'D',
        collection: 'Dorian',
        instrumentProfileId: 'bb-tenor',
      },
      figureLevels: NEUTRAL_FIGURE_LEVELS,
    })
    expect(dorian.writtenTonalCenter).toBe('D')
    expect(dorian.controls.tonalCenter).toBe('C')
    expect(dorian.controls.collection).toBe('Dorian')
  })

  it('retains unresolved Varying only in its outer register intent', () => {
    const varying = createGenerationIntent({
      requestId: makeRequestId('request-varying'),
      seed: makeSeed(2),
      controls: { ...DEFAULT_GENERATION_CONTROLS, register: 'Varying' },
      figureLevels: NEUTRAL_FIGURE_LEVELS,
    })
    expect(varying.registerIntent.requestedRegister).toBe('Varying')
    expect(varying.registerIntent.candidates.map((candidate) => candidate.id)).toEqual([
      'Low',
      'Middle',
      'High',
    ])
  })

  // @test-link [[rule_presentation_preference_preserves_phrase]]
  it('structurally excludes presentation, browser, and session fields', () => {
    const attempt = (): typeof first => ({
      ...first,
      // @ts-expect-error presentation state cannot be part of GenerationIntent
      theme: 'Dark',
    })
    expect(typeof attempt).toBe('function')
    expect(Object.keys(first)).not.toContain('notationMode')
    expect(Object.keys(first)).not.toContain('browserState')
  })

  // @test-link [[rule_seeded_phrase_reproduction]]
  it('regenerates with fresh injected identity and seed while preserving controls and levels', () => {
    const regenerated = regenerateGenerationIntent(first, {
      nextRequestId: () => makeRequestId('request-2'),
      nextSeed: () => makeSeed(2),
    })
    expect(regenerated.requestId).toBe('request-2')
    expect(regenerated.seed).toBe(2)
    expect(regenerated.controls).toEqual(first.controls)
    expect(regenerated.figureLevels).toEqual(first.figureLevels)
  })
})

/**
 * Open transposition (Definition of Done): a test-only instrument profile whose transposition no
 * first-release profile uses passes end to end through request construction (this describe),
 * spelling (written-phrase.spec.ts) and engraving (the notation harness), with no production code
 * change. `writtenToConcertTonalCenter` is exercised directly against a fabricated `InstrumentProfile`
 * value, never through the closed adopted-id lookup `getInstrumentProfile` performs.
 */
// @test-link [[module_generation_request_construction]]
// @test-link [[entity_instrument_profile]]
describe('writtenToConcertTonalCenter: test-only instrument transposition', () => {
  it('converts written C to concert pc 10 (B-flat/A#) for a fabricated +2/+1 transposition', () => {
    expect(writtenToConcertTonalCenter('C', TEST_PROFILE_PLUS_2_1)).toBe('A#')
  })

  it('converts written C to concert pc 3 (E-flat/D#) for a fabricated +21/+12 transposition', () => {
    expect(writtenToConcertTonalCenter('C', TEST_PROFILE_PLUS_21_12)).toBe('D#')
  })
})

/** A my instrument sounding a perfect fourth lower than written: written C is concert G. */
const FOURTH_LOWER = makeMyInstrument({
  template: 'c-keyboard',
  name: 'Fourth-lower horn',
  clef: 'treble',
  writtenRange: { minMidi: 60, maxMidi: 90 },
  transposition: { octaves: 0, semitones: 5, direction: 'lower' },
})

const MY_INSTRUMENT_CONTROLS = {
  ...DEFAULT_GENERATION_CONTROLS,
  tonalCenter: 'C',
  instrumentProfileId: 'my-instrument',
} as const

/** Intent: the my-instrument intent input with the given supplied profile, if any. */
function myInstrumentInput(instrumentProfile?: InstrumentProfile) {
  return {
    requestId: makeRequestId('request-mine'),
    seed: makeSeed(3),
    controls: MY_INSTRUMENT_CONTROLS,
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    ...(instrumentProfile === undefined ? {} : { instrumentProfile }),
  }
}

// @test-link [[entity_my_instrument]]
// @test-link [[module_generation_request_construction]]
describe('GenerationIntent: my instrument travels as data beside the controls', () => {
  // @test-link [[entity_my_instrument]]
  it('refuses my-instrument controls without a profile', () => {
    expect(() => createGenerationIntent(myInstrumentInput())).toThrow(GenerationIntentError)
    expect(() => resolveInstrumentProfile('my-instrument', undefined)).toThrow(
      GenerationIntentError,
    )
  })

  // @test-link [[entity_my_instrument]]
  it('refuses a supplied profile whose id is not my-instrument', () => {
    expect(() => createGenerationIntent(myInstrumentInput(BB_TENOR_PROFILE))).toThrow(
      GenerationIntentError,
    )
    expect(() => createGenerationIntent(myInstrumentInput(TEST_PROFILE_PLUS_2_1))).toThrow(
      GenerationIntentError,
    )
  })

  // @test-link [[entity_my_instrument]]
  it('refuses a profile supplied for a built-in id', () => {
    expect(() =>
      createGenerationIntent({
        ...myInstrumentInput(FOURTH_LOWER.profile),
        controls: { ...MY_INSTRUMENT_CONTROLS, instrumentProfileId: 'bb-tenor' },
      }),
    ).toThrow(GenerationIntentError)
    expect(() => resolveInstrumentProfile('bb-tenor', BB_TENOR_PROFILE)).toThrow(
      GenerationIntentError,
    )
  })

  // @test-link [[entity_my_instrument]]
  it('resolves a built-in id from the built-in table', () => {
    expect(resolveInstrumentProfile('bb-tenor', undefined)).toBe(BB_TENOR_PROFILE)
  })

  // @test-link [[entity_my_instrument]]
  it('embeds the supplied profile and converts the written tonal center with its chromatic count', () => {
    const intent = createGenerationIntent(myInstrumentInput(FOURTH_LOWER.profile))
    expect(intent.instrumentProfile).toEqual(FOURTH_LOWER.profile)
    expect(intent.controls.instrumentProfileId).toBe('my-instrument')
    expect(intent.writtenTonalCenter).toBe('C')
    expect(intent.controls.tonalCenter).toBe('G')
    expect(intent.registerIntent.candidates.map((candidate) => candidate.window)).toEqual(
      deriveRegisterWindowCandidates(
        FOURTH_LOWER.profile.concertRange,
        FOURTH_LOWER.profile.registerWindows,
      ).map((candidate) => candidate.window),
    )
  })

  // @test-link [[entity_my_instrument]]
  // @test-link [[rule_seeded_phrase_reproduction]]
  it('regenerates with the my-instrument profile kept', () => {
    const intent = createGenerationIntent(myInstrumentInput(FOURTH_LOWER.profile))
    const regenerated = regenerateGenerationIntent(intent, {
      nextRequestId: () => makeRequestId('request-mine-2'),
      nextSeed: () => makeSeed(4),
    })
    expect(regenerated.instrumentProfile).toEqual(FOURTH_LOWER.profile)
    expect(regenerated.controls).toEqual(intent.controls)
    expect(regenerated.writtenTonalCenter).toBe('C')
  })

  it('refuses to look my instrument up by id alone', () => {
    expect(() => getInstrumentProfile('my-instrument')).toThrow(GenerationIntentError)
  })
})

const LEVELS_OF: Readonly<Record<MusicalProfile, FigureLevels>> = {
  Neutral: NEUTRAL_FIGURE_LEVELS,
  Jazz: JAZZ_FIGURE_LEVELS,
}

const NAMED_LEVELS = (['Neutral', 'Jazz'] as const).map((name) => ({
  name,
  levels: LEVELS_OF[name],
}))

// @test-link [[module_generation_request_construction]]
// @test-link [[module_figure_levels]]
describe('GenerationIntent: the figure levels are the levels the input gives', () => {
  it.each(NAMED_LEVELS)(
    'holds the $name levels it was given when built and regenerated',
    ({ levels }) => {
      const intent = makeGenerationIntent({
        requestId: makeRequestId('request-levels'),
        seed: makeSeed(7),
        controls: DEFAULT_GENERATION_CONTROLS,
        figureLevels: levels,
      })
      expect(intent.figureLevels).toStrictEqual(levels)
      expect(Object.isFrozen(intent.figureLevels)).toBe(true)
      const regenerated = regenerateGenerationIntent(intent, {
        nextRequestId: () => makeRequestId('request-levels-2'),
        nextSeed: () => makeSeed(8),
      })
      expect(regenerated.figureLevels).toStrictEqual(levels)
    },
  )

  it.each(['Neutral', 'Jazz'] as const)(
    'an intent receiving a carry-in holds the %s levels it was given',
    (musicalProfile) => {
      const first = buildIntent({ seed: 11, musicalProfile, label: 'levels' })
      expect(first.figureLevels).toStrictEqual(LEVELS_OF[musicalProfile])
      const carryIn = carryInAfter(first, generateSuccess(first), 1)
      const second = buildIntent({ seed: 12, musicalProfile, carryIn, label: 'levels' })
      expect(second.carryIn).toBeDefined()
      expect(second.figureLevels).toStrictEqual(LEVELS_OF[musicalProfile])
    },
  )

  it.each(NAMED_LEVELS)(
    'an intent given the $name levels holds no musical profile, only the levels',
    ({ levels }) => {
      const intent = createGenerationIntent({
        requestId: makeRequestId('request-levels-keys'),
        seed: makeSeed(9),
        controls: DEFAULT_GENERATION_CONTROLS,
        figureLevels: levels,
      })
      const keys = Object.keys(intent)
      expect(keys).not.toContain('musicalProfile')
      expect(keys[keys.indexOf('writtenTonalCenter') + 1]).toBe('figureLevels')
      expect(JSON.stringify(intent)).not.toMatch(/Neutral|Jazz|isCustom/u)
      expect(intent.figureLevels).toStrictEqual(levels)
    },
  )
})

/** Levels no musical profile gives, listed out of FIGURE_IDS order. */
const GIVEN_LEVELS: FigureLevels = {
  chromaticEnclosure: 'off',
  passingTone: 'favored',
  appoggiatura: 'stronglyFavored',
  accentedPassingTone: 'off',
  neighborTone: 'asToday',
  diatonicEnclosure: 'favored',
  chromaticApproach: 'asToday',
}

// @test-link [[module_generation_request_construction]]
// @test-link [[module_figure_levels]]
describe('GenerationIntent: the figure levels given as levels', () => {
  /** Intent: an intent built from levels no musical profile gives. */
  function levelsIntent(): ReturnType<typeof createGenerationIntent> {
    return createGenerationIntent({
      requestId: makeRequestId('request-given-levels'),
      seed: makeSeed(10),
      controls: DEFAULT_GENERATION_CONTROLS,
      figureLevels: GIVEN_LEVELS,
    })
  }

  it('holds the given levels as a fresh frozen copy in figure order, and no profile', () => {
    const intent = levelsIntent()
    expect(intent.figureLevels).toStrictEqual(GIVEN_LEVELS)
    expect(intent.figureLevels).not.toBe(GIVEN_LEVELS)
    expect(Object.keys(intent.figureLevels)).toEqual([...FIGURE_IDS])
    expect(Object.isFrozen(intent.figureLevels)).toBe(true)
    expect(Object.keys(intent)).not.toContain('musicalProfile')
  })

  it('regenerates with the previous levels kept, never remapped through a profile', () => {
    const regenerated = regenerateGenerationIntent(levelsIntent(), {
      nextRequestId: () => makeRequestId('request-given-levels-2'),
      nextSeed: () => makeSeed(11),
    })
    expect(regenerated.figureLevels).toStrictEqual(GIVEN_LEVELS)
    expect(regenerated.seed).toBe(11)
  })
})

/** Intent: the plain intent input every v3.2 request-input test builds on. */
function plainInput() {
  return {
    requestId: makeRequestId('request-v32-inputs'),
    seed: makeSeed(21),
    controls: DEFAULT_GENERATION_CONTROLS,
    figureLevels: NEUTRAL_FIGURE_LEVELS,
  }
}

/** The full field order of an intent holding every optional group. */
const FULL_INTENT_KEYS = [
  'requestId',
  'seed',
  'measureCount',
  'meter',
  'controls',
  'writtenTonalCenter',
  'figureLevels',
  'instrumentProfile',
  'registerIntent',
  'carryIn',
  'rhythmLock',
  'steering',
]

// @test-link [[entity_request_rhythm_lock]]
// @test-link [[entity_steering_block]]
describe('GenerationIntent: the rhythm lock group and the steering block', () => {
  // @test-link [[entity_request_rhythm_lock]]
  it('keeps a rhythm lock group it is given, frozen, after the v3.1 fields', () => {
    const intent = makeGenerationIntent({ ...plainInput(), rhythmLock: SAMPLE_RHYTHM_LOCK })

    expect(intent.rhythmLock).toStrictEqual(SAMPLE_RHYTHM_LOCK)
    expect(Object.isFrozen(intent.rhythmLock)).toBe(true)
    expect(Object.keys(intent).at(-1)).toBe('rhythmLock')
    expect(Object.keys(intent)).not.toContain('steering')
  })

  // @test-link [[entity_steering_block]]
  it('keeps a steering block it is given, frozen, after the v3.1 fields', () => {
    const intent = makeGenerationIntent({ ...plainInput(), steering: SAMPLE_STEERING })

    expect(intent.steering).toStrictEqual(SAMPLE_STEERING)
    expect(Object.isFrozen(intent.steering)).toBe(true)
    expect(Object.keys(intent).at(-1)).toBe('steering')
    expect(Object.keys(intent)).not.toContain('rhythmLock')
  })

  // @test-link [[rule_jam_and_lock_off_reproduce_earlier_phrases]]
  it('built with neither group, has no such key and is the intent v3.1 builds', () => {
    const v31Intent = makeGenerationIntent(plainInput())
    const intent = makeGenerationIntent({ ...plainInput() })

    expect(Object.keys(intent)).toEqual(FULL_INTENT_KEYS.slice(0, 9))
    expect(intent).toStrictEqual(v31Intent)
    expect(JSON.stringify(intent)).toBe(JSON.stringify(v31Intent))
  })

  // @test-link [[entity_request_rhythm_lock]]
  // @test-link [[entity_steering_block]]
  it('regenerates with both groups handed on unchanged', () => {
    const intent = makeGenerationIntent({
      ...plainInput(),
      rhythmLock: SAMPLE_RHYTHM_LOCK,
      steering: SAMPLE_STEERING,
    })
    const regenerated = regenerateGenerationIntent(intent, {
      nextRequestId: () => makeRequestId('request-v32-inputs-2'),
      nextSeed: () => makeSeed(22),
    })

    expect(regenerated.rhythmLock).toStrictEqual(SAMPLE_RHYTHM_LOCK)
    expect(regenerated.steering).toStrictEqual(SAMPLE_STEERING)
    expect(Object.keys(regenerated)).toEqual(Object.keys(intent))
  })

  // @test-link [[rule_jam_and_lock_off_reproduce_earlier_phrases]]
  it('regenerates an intent without the groups without adding either key', () => {
    const regenerated = regenerateGenerationIntent(makeGenerationIntent(plainInput()), {
      nextRequestId: () => makeRequestId('request-v32-inputs-3'),
      nextSeed: () => makeSeed(23),
    })

    expect(Object.keys(regenerated)).toEqual(FULL_INTENT_KEYS.slice(0, 9))
  })

  // @test-link [[entity_request_rhythm_lock]]
  // @test-link [[entity_steering_block]]
  it('an intent receiving a carry-in keeps the full field order, the groups after the carry-in', () => {
    const first = buildIntent({ seed: 11, label: 'groups' })
    const carryIn = carryInAfter(first, generateSuccess(first), 1)
    const input = { ...plainInput(), controls: BASE_CONTROLS, carryIn }
    const withGroups = makeCarryInGenerationIntent({
      ...input,
      rhythmLock: SAMPLE_RHYTHM_LOCK,
      steering: SAMPLE_STEERING,
    })
    const withoutGroups = makeCarryInGenerationIntent(input)

    expect(Object.keys(withGroups)).toEqual(FULL_INTENT_KEYS)
    expect(Object.isFrozen(withGroups)).toBe(true)
    expect(withGroups.rhythmLock).toStrictEqual(SAMPLE_RHYTHM_LOCK)
    expect(withGroups.steering).toStrictEqual(SAMPLE_STEERING)
    expect(Object.keys(withoutGroups)).toEqual(FULL_INTENT_KEYS.slice(0, 10))
  })
})
