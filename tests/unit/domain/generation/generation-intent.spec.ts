import { describe, expect, it } from 'vitest'

import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '@/domain/controls/profile-selection'
import {
  createGenerationIntent,
  regenerateGenerationIntent,
  writtenToConcertTonalCenter,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeInstrumentProfile } from '@/domain/profile/instrument-profile'
import { BB_TENOR_PROFILE } from '@/domain/profile/instrument-profiles'
import { REGISTER_WINDOW_ALGORITHM_V1 } from '@/domain/profile/register-window-derivation'
import { makeSeed } from '@/domain/random/seed'

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
    musicalProfile: DEFAULT_PROFILE_SELECTION,
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
      musicalProfile: DEFAULT_PROFILE_SELECTION,
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
      musicalProfile: DEFAULT_PROFILE_SELECTION,
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
      musicalProfile: DEFAULT_PROFILE_SELECTION,
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
      musicalProfile: DEFAULT_PROFILE_SELECTION,
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
      musicalProfile: DEFAULT_PROFILE_SELECTION,
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
  it('regenerates with fresh injected identity and seed while preserving controls/profile', () => {
    const regenerated = regenerateGenerationIntent(first, {
      nextRequestId: () => makeRequestId('request-2'),
      nextSeed: () => makeSeed(2),
    })
    expect(regenerated.requestId).toBe('request-2')
    expect(regenerated.seed).toBe(2)
    expect(regenerated.controls).toEqual(first.controls)
    expect(regenerated.musicalProfile).toEqual(first.musicalProfile)
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
