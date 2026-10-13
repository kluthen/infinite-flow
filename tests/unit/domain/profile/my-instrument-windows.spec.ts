import { describe, expect, it } from 'vitest'

import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '@/domain/controls/profile-selection'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { BUILT_IN_INSTRUMENT_CLEF } from '@/domain/profile/instrument-clef'
import {
  ADOPTED_INSTRUMENT_PROFILES,
  BUILT_IN_REGISTER_WINDOW_POLICY,
  type BuiltInInstrumentProfileId,
} from '@/domain/profile/instrument-profiles'
import {
  findMyInstrumentRefusal,
  makeMyInstrument,
  myInstrumentDraftFromTemplate,
  type MyInstrument,
  type MyInstrumentInput,
} from '@/domain/profile/my-instrument'
import { deriveRegisterWindowCandidates } from '@/domain/profile/register-window-derivation'
import type { MyInstrumentDirection } from '@/domain/profile/transposition-interval'
import { createMulberry32 } from '@/domain/random/prng'
import { makeSeed } from '@/domain/random/seed'

// @test-link [[entity_my_instrument]]
describe('my instrument from a built-in template, unchanged', () => {
  // @test-link [[entity_my_instrument]]
  it.each(ADOPTED_INSTRUMENT_PROFILES)(
    '$id gives a profile deep-equal to the built-in, windows included, apart from its id',
    (builtIn) => {
      const draft = myInstrumentDraftFromTemplate(builtIn.id)
      const instrument = makeMyInstrument({
        ...draft,
        name: builtIn.displayName,
        clef: BUILT_IN_INSTRUMENT_CLEF,
      })

      expect(instrument.profile.id).toBe('my-instrument')
      expect({ ...instrument.profile, id: builtIn.id }).toEqual(builtIn)
      expect(
        deriveRegisterWindowCandidates(
          instrument.profile.concertRange,
          instrument.profile.registerWindows,
        ),
      ).toEqual(deriveRegisterWindowCandidates(builtIn.concertRange, builtIn.registerWindows))
    },
  )
})

/** Intent: the intent of a phrase played on this my instrument, at a fixed request and seed. */
function myInstrumentIntent(instrument: MyInstrument, requestId: string, seed: number) {
  return createGenerationIntent({
    requestId: makeRequestId(requestId),
    seed: makeSeed(seed),
    controls: { ...DEFAULT_GENERATION_CONTROLS, instrumentProfileId: 'my-instrument' },
    musicalProfile: DEFAULT_PROFILE_SELECTION,
    instrumentProfile: instrument.profile,
  })
}

// @test-link [[entity_my_instrument]]
describe('my instrument display name never affects generation', () => {
  const draft = myInstrumentDraftFromTemplate('bb-tenor')
  const first = makeMyInstrument({ ...draft, name: 'My tenor', clef: BUILT_IN_INSTRUMENT_CLEF })
  const renamed = makeMyInstrument({
    ...draft,
    name: 'Grandpa’s old horn',
    clef: BUILT_IN_INSTRUMENT_CLEF,
  })

  // @test-link [[entity_my_instrument]]
  it.each([
    ['request-a', 7],
    ['request-b', 13],
  ] as const)(
    'two my instruments differing only by name generate the same phrase (%s, seed %i)',
    (requestId, seed) => {
      const firstIntent = myInstrumentIntent(first, requestId, seed)
      const renamedIntent = myInstrumentIntent(renamed, requestId, seed)
      const withoutName = { ...renamedIntent.instrumentProfile, displayName: 'My tenor' }
      expect({ ...renamedIntent, instrumentProfile: withoutName }).toEqual(firstIntent)

      // The outcome (request, result, provenance, diagnostics) holds no display name: it must be
      // deep-equal as a whole.
      const firstOutcome = generatePhrase(firstIntent)
      const renamedOutcome = generatePhrase(renamedIntent)
      expect(firstOutcome.kind).toBe('generation_success')
      expect(renamedOutcome).toEqual(firstOutcome)
    },
  )
})

// @test-link [[entity_my_instrument]]
describe('my instrument clef never affects generation', () => {
  const draft = myInstrumentDraftFromTemplate('bb-tenor')
  const inTreble = makeMyInstrument({ ...draft, name: 'My tenor', clef: 'treble' })
  const inBass = makeMyInstrument({ ...draft, name: 'My tenor', clef: 'bass' })

  // @test-link [[entity_my_instrument]]
  it.each([
    ['request-a', 7],
    ['request-b', 13],
  ] as const)(
    'two my instruments differing only by clef generate the same phrase (%s, seed %i)',
    (requestId, seed) => {
      const trebleIntent = myInstrumentIntent(inTreble, requestId, seed)
      const bassIntent = myInstrumentIntent(inBass, requestId, seed)
      expect(bassIntent).toEqual(trebleIntent)

      const trebleOutcome = generatePhrase(trebleIntent)
      expect(trebleOutcome.kind).toBe('generation_success')
      expect(generatePhrase(bassIntent)).toEqual(trebleOutcome)
    },
  )
})

/** How many random valid my instruments the window property is checked on. */
const PROPERTY_RUNS = 600

const TEMPLATES: readonly BuiltInInstrumentProfileId[] = ['c-keyboard', 'bb-tenor', 'eb-alto']
const DIRECTIONS: readonly MyInstrumentDirection[] = ['lower', 'same', 'higher']

/** Intent: a whole number drawn uniformly from [min, max] with the given generator. */
function drawInt(next: () => number, min: number, max: number): number {
  return min + Math.floor(next() * (max - min + 1))
}

/**
 * Intent: one random valid my instrument input: a random template, a span of 24 to 60 semitones, a
 * random transposition, and a written range placed so both concert ends sound inside MIDI 0–127.
 */
function randomValidInput(next: () => number, run: number): MyInstrumentInput {
  const direction = DIRECTIONS[drawInt(next, 0, 2)]!
  const octaves = direction === 'same' ? 0 : drawInt(next, 0, 3)
  const drawn = direction === 'same' ? 0 : drawInt(next, 0, 11)
  const semitones = direction !== 'same' && octaves === 0 && drawn === 0 ? 1 : drawn
  const size = 12 * octaves + semitones
  const chromatic = direction === 'lower' ? size : direction === 'higher' ? -size : 0
  const span = drawInt(next, 24, 60)
  const concertMin = drawInt(next, 0, 127 - span)
  return {
    template: TEMPLATES[drawInt(next, 0, 2)]!,
    name: `Random instrument ${run}`,
    clef: run % 2 === 0 ? 'treble' : 'bass',
    writtenRange: { minMidi: concertMin + chromatic, maxMidi: concertMin + chromatic + span },
    transposition: { octaves, semitones, direction },
  }
}

// @test-link [[rule_my_instrument_range_limits]]
// @test-link [[entity_my_instrument]]
describe('derived windows of random valid my instruments (property test)', () => {
  // @test-link [[rule_my_instrument_range_limits]]
  it(`obey every rule the built-in windows obey, over ${PROPERTY_RUNS} seeded random inputs`, () => {
    const generator = createMulberry32(0x5eed16)
    for (let run = 0; run < PROPERTY_RUNS; run += 1) {
      const input = randomValidInput(generator.nextFloat, run)
      expect(findMyInstrumentRefusal(input)).toBe(undefined)
      const { profile } = makeMyInstrument(input)
      expect(profile.registerWindows).toEqual(BUILT_IN_REGISTER_WINDOW_POLICY)

      const range = profile.concertRange
      expect(range.minMidi).toBeGreaterThanOrEqual(0)
      expect(range.maxMidi).toBeLessThanOrEqual(127)
      expect(range.maxMidi - range.minMidi).toBe(
        input.writtenRange.maxMidi - input.writtenRange.minMidi,
      )

      const candidates = deriveRegisterWindowCandidates(range, profile.registerWindows)
      expect(candidates.map((candidate) => [candidate.id, candidate.canonicalIndex])).toEqual([
        ['Low', 0],
        ['Middle', 1],
        ['High', 2],
      ])
      const [low, middle, high] = candidates.map((candidate) => candidate.window)
      const width = range.maxMidi - range.minMidi
      const windowSpan = Math.max(12, Math.ceil(width / 2))
      for (const window of [low!, middle!, high!]) {
        expect(window.minMidi).toBeGreaterThanOrEqual(range.minMidi)
        expect(window.maxMidi).toBeLessThanOrEqual(range.maxMidi)
        expect(window.maxMidi - window.minMidi).toBe(windowSpan)
      }
      expect(low!.minMidi).toBe(range.minMidi)
      expect(high!.maxMidi).toBe(range.maxMidi)
      expect(low!.maxMidi).toBeGreaterThanOrEqual(middle!.minMidi)
      expect(middle!.maxMidi).toBeGreaterThanOrEqual(high!.minMidi)
      expect(low!.minMidi).toBeLessThanOrEqual(middle!.minMidi)
      expect(middle!.minMidi).toBeLessThanOrEqual(high!.minMidi)
      const belowMiddle = middle!.minMidi - range.minMidi
      const aboveMiddle = range.maxMidi - middle!.maxMidi
      expect(aboveMiddle - belowMiddle).toBeGreaterThanOrEqual(0)
      expect(aboveMiddle - belowMiddle).toBeLessThanOrEqual(1)
    }
  })
})
