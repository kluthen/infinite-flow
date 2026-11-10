/**
 * The building blocks of the v3.2 replay-key corpus's cases (./replay-key-corpus-v32-cases.ts and
 * ./replay-key-corpus-v32-jam-lock-cases.ts): the five corpus instruments (the three built-ins and
 * two my instruments of different written ranges and clefs), the seeds, the rotation over a
 * catalog, one real intent from written controls (with or without a carry-in, a rhythm lock group
 * and a steering block), the carry-in a phrase hands forward, and a seed search for the first
 * phrase that generates with the outcome a case needs. Test plumbing: nothing in the app reads it.
 */

import { OFF_CHORD_FAMILIES } from '@/domain/chords/chord-families'
import {
  isUnsupportedRhythmSetting,
  suggestNearestSupportedRhythmChange,
} from '@/domain/controls/unsupported-rhythm-settings'
import {
  makeGenerationControls,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import type { FigureLevels } from '@/domain/figures/figure-levels'
import type { CarryIn } from '@/domain/generation/carry-in/carry-in'
import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import type { RequestRhythmLock } from '@/domain/generation/request-rhythm-lock'
import type { SteeringBlock } from '@/domain/generation/steering-block'
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import type { BuiltInInstrumentProfileId } from '@/domain/profile/instrument-profiles'
import { makeMyInstrument } from '@/domain/profile/my-instrument'
import { makeSeed } from '@/domain/random/seed'

/** One corpus case: a label naming it, its intent and the phrase number its key carries. */
export interface ReplayKeyCorpusV32Case {
  readonly label: string
  readonly intent: GenerationIntent
  readonly phraseNumber: number
}

/** A phrase that generated. */
export type SuccessOutcome = Extract<GenerationOutcome, { kind: 'generation_success' }>

/** Written controls without the instrument, which the corpus instrument sets. */
export type CorpusControls = Omit<GenerationControls, 'instrumentProfileId'>

/**
 * One corpus instrument: its label, the instrument id the controls carry, the clef it is drawn in
 * and, for my instrument, the profile that travels beside the controls.
 */
export interface CorpusInstrument {
  readonly label: string
  readonly instrumentProfileId: BuiltInInstrumentProfileId | 'my-instrument'
  readonly clef: InstrumentClef
  readonly instrumentProfile?: InstrumentProfile
}

/** My instrument written C3 to E5 in treble clef, sounding a minor third lower. */
const MY_HORN = makeMyInstrument({
  template: 'c-keyboard',
  name: 'My horn in A',
  clef: 'treble',
  writtenRange: { minMidi: 48, maxMidi: 76 },
  transposition: { octaves: 0, semitones: 3, direction: 'lower' },
})

/** My instrument written D3 to E5 in bass clef, sounding an octave and two semitones lower. */
const MY_BARITONE = makeMyInstrument({
  template: 'bb-tenor',
  name: 'My baritone',
  clef: 'bass',
  writtenRange: { minMidi: 50, maxMidi: 76 },
  transposition: { octaves: 1, semitones: 2, direction: 'lower' },
})

/** The five corpus instruments: the three built-ins, then the two my instruments. */
export const INSTRUMENTS: readonly CorpusInstrument[] = [
  { label: 'c-keyboard', instrumentProfileId: 'c-keyboard', clef: 'treble' },
  { label: 'bb-tenor', instrumentProfileId: 'bb-tenor', clef: 'treble' },
  { label: 'eb-alto', instrumentProfileId: 'eb-alto', clef: 'treble' },
  {
    label: 'my-horn',
    instrumentProfileId: 'my-instrument',
    clef: MY_HORN.clef,
    instrumentProfile: MY_HORN.profile,
  },
  {
    label: 'my-baritone',
    instrumentProfileId: 'my-instrument',
    clef: MY_BARITONE.clef,
    instrumentProfile: MY_BARITONE.profile,
  },
]

/** Intent: the corpus instrument of a label; an unknown label is a corpus defect and throws. */
export function corpusInstrument(label: string): CorpusInstrument {
  const instrument = INSTRUMENTS.find((entry) => entry.label === label)
  if (instrument === undefined) throw new Error(`No corpus instrument is labelled ${label}.`)
  return instrument
}

/** The seeds the standalone and preset cases rotate through, none of the v3.1 corpus's. */
export const SEEDS = [3, 19, 64] as const

/** The seeds a search for a phrase with a given outcome tries, in order. */
export const SEARCH_SEEDS: readonly number[] = Array.from({ length: 40 }, (_, index) => 101 + index)

/** Intent: the value of a catalog at an index, wrapping around; crashes on an empty catalog. */
export function pick<T>(values: readonly T[], index: number): T {
  const value = values[index % values.length]
  if (value === undefined) throw new Error('Corpus rotation picked from an empty catalog.')
  return value
}

/** What one corpus intent is built from. */
export interface CorpusIntentOptions {
  readonly label: string
  readonly controls: CorpusControls
  readonly levels: FigureLevels
  readonly instrument: CorpusInstrument
  readonly seed: number
  readonly carryIn?: CarryIn
  readonly rhythmLock?: RequestRhythmLock
  readonly steering?: SteeringBlock
}

/**
 * Intent: build one real intent from written controls and a seed, with a carry-in, a rhythm lock
 * group and a steering block when given.
 */
export function corpusIntent(options: CorpusIntentOptions): GenerationIntent {
  const { instrument } = options
  const input = {
    requestId: makeRequestId(`corpus-v32-${options.label}`),
    seed: makeSeed(options.seed),
    controls: makeGenerationControls({
      ...options.controls,
      instrumentProfileId: instrument.instrumentProfileId,
    }),
    figureLevels: options.levels,
    chordFamilies: OFF_CHORD_FAMILIES,
    ...(instrument.instrumentProfile === undefined
      ? {}
      : { instrumentProfile: instrument.instrumentProfile }),
    ...(options.rhythmLock === undefined ? {} : { rhythmLock: options.rhythmLock }),
    ...(options.steering === undefined ? {} : { steering: options.steering }),
  }
  return options.carryIn === undefined
    ? createGenerationIntent(input)
    : makeCarryInGenerationIntent({ ...input, carryIn: options.carryIn })
}

/** Intent: generate a phrase that must succeed; a failure means an unusable corpus case. */
export function generated(label: string, intent: GenerationIntent): SuccessOutcome {
  const outcome = generatePhrase(intent)
  if (outcome.kind !== 'generation_success') {
    throw new Error(`Corpus phrase ${label} failed to generate: ${outcome.code}.`)
  }
  return outcome
}

/** Intent: the carry-in a phrase that must generate hands forward as the given phrase number. */
export function carryInFrom(
  label: string,
  intent: GenerationIntent,
  phraseNumber: number,
): CarryIn {
  return deriveCarryIn({ intent, outcome: generated(label, intent), phraseNumber })
}

/**
 * Intent: the first intent, over the search seeds in order, that generates a phrase the predicate
 * accepts, with that phrase; crashes when no search seed gives one, so the corpus never silently
 * holds a case of the wrong kind.
 */
export function searchSeed(
  label: string,
  build: (seed: number) => GenerationIntent,
  accepts: (outcome: SuccessOutcome) => boolean,
): { readonly intent: GenerationIntent; readonly outcome: SuccessOutcome } {
  for (const seed of SEARCH_SEEDS) {
    const intent = build(seed)
    const outcome = generatePhrase(intent)
    if (outcome.kind === 'generation_success' && accepts(outcome)) return { intent, outcome }
  }
  throw new Error(`No search seed gives corpus case ${label} the phrase it needs.`)
}

/**
 * Intent: the controls with a rhythm setting the workspace blocks (no legal four-bar plan, under
 * any seed) replaced by the workspace's suggested change, which is always a lighter syncopation;
 * controls the workspace allows come back unchanged.
 */
export function allowedRhythm(controls: CorpusControls): CorpusControls {
  if (!isUnsupportedRhythmSetting(controls)) return controls
  const suggestion = suggestNearestSupportedRhythmChange(controls)
  if (suggestion.control !== 'syncopation') {
    throw new Error(`Corpus rotation would change ${suggestion.control}, not syncopation.`)
  }
  return { ...controls, syncopation: suggestion.to }
}

/** The controls every carry-in chain, key-change, lock and Jam phrase starts from. */
export const CHAIN_CONTROLS: CorpusControls = {
  tempo: 130,
  tonalCenter: 'A#',
  collection: 'Minor',
  harmonicMotion: 'Gentle diatonic',
  tension: 'Build',
  noteDensity: 'Eighth',
  rhythmicVariety: 'Slightly varied',
  syncopation: 'Occasional offbeats',
  silenceDensity: 'Conversational',
  contour: 'Arch',
  register: 'Middle',
  leapiness: 'Shaped',
  arpeggioChaos: 'Varied',
}
