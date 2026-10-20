/**
 * The cases of the `ifk1.` replay-key corpus: each one a real generation intent and the phrase
 * number its key names. The corpus covers the three built-in instruments, both musical profiles,
 * a spread of the other controls and several seeds, standalone phrases and carry-in phrases (one
 * of them receiving a carry-in whose final harmony is null). The recording script turns these
 * cases into `tests/fixtures/replay-keys/ifk1-v2.0.json`; the corpus spec reads only that file.
 */

import {
  makeGenerationControls,
  type GenerationControls,
  type MusicalProfile,
} from '@/domain/controls/generation-controls'
import { makeCarryIn, type CarryIn } from '@/domain/generation/carry-in/carry-in'
import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import { makeSeed } from '@/domain/random/seed'
import { levelsForProfile } from '@/domain/figures/figure-levels'

/** One corpus case: a label naming it, its intent and the phrase number its key carries. */
export interface ReplayKeyCorpusCase {
  readonly label: string
  readonly intent: GenerationIntent
  readonly phraseNumber: number
}

/** The three built-in instruments, in the order v2.0 lists them. */
const INSTRUMENTS: readonly InstrumentProfileId[] = ['c-keyboard', 'bb-tenor', 'eb-alto']

/** Both musical profiles, each with the custom flag the corpus stores it under. */
const PROFILES: readonly { readonly musicalProfile: MusicalProfile; readonly isCustom: boolean }[] =
  [
    { musicalProfile: 'Neutral', isCustom: false },
    { musicalProfile: 'Jazz', isCustom: true },
  ]

/** The seeds every standalone setting is recorded with. */
const SEEDS = [1, 7, 42] as const

/** A named spread of the thirteen non-instrument controls. */
interface ControlSpread {
  readonly name: string
  readonly controls: Omit<GenerationControls, 'instrumentProfileId'>
}

/** Four spreads that between them use every value of most controls at least once. */
const SPREADS: readonly ControlSpread[] = [
  {
    name: 'plain',
    controls: {
      tempo: 90,
      tonalCenter: 'C',
      collection: 'Major',
      harmonicMotion: 'Gentle diatonic',
      tension: 'Settled',
      noteDensity: 'Quarter',
      rhythmicVariety: 'Slightly varied',
      syncopation: 'Straight',
      silenceDensity: 'Sparse',
      contour: 'Wandering',
      register: 'Middle',
      leapiness: 'Leaping',
      arpeggioChaos: 'Predictable',
    },
  },
  {
    name: 'eighths',
    controls: {
      tempo: 140,
      tonalCenter: 'F',
      collection: 'Minor',
      harmonicMotion: 'Active diatonic',
      tension: 'Lift',
      noteDensity: 'Eighth',
      rhythmicVariety: 'Slightly varied',
      syncopation: 'Occasional offbeats',
      silenceDensity: 'Conversational',
      contour: 'Arch',
      register: 'High',
      leapiness: 'Smooth',
      arpeggioChaos: 'Varied',
    },
  },
  {
    name: 'modal-low',
    controls: {
      tempo: 70,
      tonalCenter: 'A#',
      collection: 'Dorian',
      harmonicMotion: 'Static',
      tension: 'Build',
      noteDensity: 'Quarter',
      rhythmicVariety: 'Heavily varied',
      syncopation: 'Straight',
      silenceDensity: 'Breath-heavy',
      contour: 'Falling',
      register: 'Low',
      leapiness: 'Angular',
      arpeggioChaos: 'Chaotic',
    },
  },
  {
    name: 'sixteenths-varying',
    controls: {
      tempo: 200,
      tonalCenter: 'E',
      collection: 'Mixolydian',
      harmonicMotion: 'Gentle diatonic',
      tension: 'Edge',
      noteDensity: 'Sixteenth',
      rhythmicVariety: 'Strict',
      syncopation: 'Straight',
      silenceDensity: 'Sparse',
      contour: 'Rising',
      register: 'Varying',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
    },
  },
]

/** Intent: build one real intent, with or without a carry-in, from written controls and a seed. */
function corpusIntent(options: {
  readonly label: string
  readonly controls: GenerationControls
  readonly profile: (typeof PROFILES)[number]
  readonly seed: number
  readonly carryIn?: CarryIn
}): GenerationIntent {
  const input = {
    requestId: makeRequestId(`corpus-${options.label}`),
    seed: makeSeed(options.seed),
    controls: makeGenerationControls(options.controls),
    figureLevels: levelsForProfile(options.profile.musicalProfile),
  }
  return options.carryIn === undefined
    ? createGenerationIntent(input)
    : makeCarryInGenerationIntent({ ...input, carryIn: options.carryIn })
}

/**
 * Intent: the carry-in a phrase hands forward as the given phrase number. The phrase must
 * generate successfully; a failure means the corpus was built on an unusable case and crashes.
 */
function carryInFrom(intent: GenerationIntent, phraseNumber: number): CarryIn {
  const outcome = generatePhrase(intent)
  if (outcome.kind !== 'generation_success') {
    throw new Error(`Corpus carry-in source failed to generate: ${outcome.code}.`)
  }
  return deriveCarryIn({ intent, outcome, phraseNumber })
}

/** Intent: every standalone case: instrument × profile × spread × seed, each as phrase 1. */
function standaloneCases(): readonly ReplayKeyCorpusCase[] {
  return INSTRUMENTS.flatMap((instrumentProfileId) =>
    PROFILES.flatMap((profile) =>
      SPREADS.flatMap((spread) =>
        SEEDS.map((seed) => {
          const label = `${instrumentProfileId}-${profile.musicalProfile}-${spread.name}-s${seed}`
          const controls = { ...spread.controls, instrumentProfileId }
          return {
            label,
            intent: corpusIntent({ label, controls, profile, seed }),
            phraseNumber: 1,
          }
        }),
      ),
    ),
  )
}

/**
 * Intent: a three-phrase chain per instrument and profile on the eighths spread: phrase 1
 * standalone (not a case: the standalone cases cover it), phrase 2 receiving phrase 1's carry-in,
 * phrase 3 receiving phrase 2's.
 */
function chainCases(): readonly ReplayKeyCorpusCase[] {
  const spread = SPREADS[1]!
  return INSTRUMENTS.flatMap((instrumentProfileId) =>
    PROFILES.flatMap((profile) => {
      const controls = { ...spread.controls, instrumentProfileId }
      const base = `${instrumentProfileId}-${profile.musicalProfile}-chain`
      const first = corpusIntent({ label: `${base}-p1`, controls, profile, seed: 5 })
      const second = corpusIntent({
        label: `${base}-p2`,
        controls,
        profile,
        seed: 6,
        carryIn: carryInFrom(first, 1),
      })
      const third = corpusIntent({
        label: `${base}-p3`,
        controls,
        profile,
        seed: 9,
        carryIn: carryInFrom(second, 2),
      })
      return [
        { label: `${base}-p2`, intent: second, phraseNumber: 2 },
        { label: `${base}-p3`, intent: third, phraseNumber: 3 },
      ]
    }),
  )
}

/**
 * Intent: per instrument, a phrase 2 in F# Dorian receiving the carry-in of a C Ionian phrase 1
 * with its final harmony dropped (null), as a session does when the key changes between phrases.
 */
function nullHarmonyCases(): readonly ReplayKeyCorpusCase[] {
  const profile = PROFILES[0]!
  const spread = SPREADS[0]!
  return INSTRUMENTS.map((instrumentProfileId) => {
    const label = `${instrumentProfileId}-Neutral-key-change-p2`
    const first = corpusIntent({
      label: `${instrumentProfileId}-Neutral-key-change-p1`,
      controls: { ...spread.controls, instrumentProfileId, collection: 'Ionian' },
      profile,
      seed: 11,
    })
    const carryIn = makeCarryIn({ ...carryInFrom(first, 1), finalHarmony: null })
    const intent = corpusIntent({
      label,
      controls: {
        ...spread.controls,
        instrumentProfileId,
        tonalCenter: 'F#',
        collection: 'Dorian',
      },
      profile,
      seed: 13,
      carryIn,
    })
    return { label, intent, phraseNumber: 2 }
  })
}

/** Intent: every case of the corpus, in a fixed order. */
export function replayKeyCorpusCases(): readonly ReplayKeyCorpusCase[] {
  return [...standaloneCases(), ...chainCases(), ...nullHarmonyCases()]
}
