/**
 * The cases of the v3.0 replay-key corpus: each one a real generation intent and the phrase number
 * its key names. The corpus is a covering spread, not a full cross product: every profile
 * selection (Neutral and Jazz, preset and custom) meets every collection on every instrument (the
 * three built-ins and two my instruments of different written ranges), and the other controls
 * rotate by index so that, for every profile selection and instrument, the nine collections
 * between them use every tension, leapiness and arpeggio-chaos value, and pair eighth and
 * sixteenth notes with heavily varied rhythm. Three-phrase carry-in chains and key-change phrases
 * receiving a null final harmony complete it. On v3.0, which recorded the corpus, a built-in
 * phrase encoded as an `ifk1.` key, a my-instrument phrase as an `ifk2.` key. The recording script
 * turned these cases into `tests/fixtures/replay-keys/v3.0-neutral-jazz.json`; the corpus spec
 * reads only that file.
 */

import {
  ARPEGGIO_CHAOS_VALUES,
  COLLECTIONS,
  CONTOURS,
  HARMONIC_MOTIONS,
  LEAPINESS_VALUES,
  makeGenerationControls,
  NOTE_DENSITIES,
  PITCH_CLASSES,
  REGISTER_CHOICES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TEMPO_VALUES,
  TENSION_ARCS,
  type Collection,
  type GenerationControls,
  type MusicalProfile,
} from '@/domain/controls/generation-controls'
import {
  isUnsupportedRhythmSetting,
  suggestNearestSupportedRhythmChange,
} from '@/domain/controls/unsupported-rhythm-settings'
import { makeCarryIn, type CarryIn } from '@/domain/generation/carry-in/carry-in'
import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import type { BuiltInInstrumentProfileId } from '@/domain/profile/instrument-profiles'
import { makeMyInstrument } from '@/domain/profile/my-instrument'
import { makeSeed } from '@/domain/random/seed'
import { levelsForProfile } from '@/domain/figures/figure-levels'

/** One corpus case: a label naming it, its intent and the phrase number its key carries. */
export interface ReplayKeyCorpusV30Case {
  readonly label: string
  readonly intent: GenerationIntent
  readonly phraseNumber: number
}

/** A profile selection: the musical profile and whether the controls were customised. */
interface ProfileSelection {
  readonly musicalProfile: MusicalProfile
  readonly isCustom: boolean
}

/** The four profile selections, in a fixed order. */
const PROFILES: readonly ProfileSelection[] = [
  { musicalProfile: 'Neutral', isCustom: false },
  { musicalProfile: 'Neutral', isCustom: true },
  { musicalProfile: 'Jazz', isCustom: false },
  { musicalProfile: 'Jazz', isCustom: true },
]

/**
 * One corpus instrument: its label, the instrument id the controls carry and, for my instrument,
 * the profile that travels beside the controls.
 */
interface CorpusInstrument {
  readonly label: string
  readonly instrumentProfileId: BuiltInInstrumentProfileId | 'my-instrument'
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
const INSTRUMENTS: readonly CorpusInstrument[] = [
  { label: 'c-keyboard', instrumentProfileId: 'c-keyboard' },
  { label: 'bb-tenor', instrumentProfileId: 'bb-tenor' },
  { label: 'eb-alto', instrumentProfileId: 'eb-alto' },
  { label: 'my-horn', instrumentProfileId: 'my-instrument', instrumentProfile: MY_HORN.profile },
  {
    label: 'my-baritone',
    instrumentProfileId: 'my-instrument',
    instrumentProfile: MY_BARITONE.profile,
  },
]

/** The seeds the standalone cases rotate through. */
const SEEDS = [1, 7, 42] as const

/** Intent: the value of a catalog at an index, wrapping around; crashes on an empty catalog. */
function pick<T>(values: readonly T[], index: number): T {
  const value = values[index % values.length]
  if (value === undefined) throw new Error('Corpus rotation picked from an empty catalog.')
  return value
}

/** Intent: the label fragment naming an instrument and a profile selection. */
function selectionLabel(instrument: CorpusInstrument, profile: ProfileSelection): string {
  return `${instrument.label}-${profile.musicalProfile}-${profile.isCustom ? 'custom' : 'preset'}`
}

/** Intent: build one real intent, with or without a carry-in, from written controls and a seed. */
function corpusIntent(options: {
  readonly label: string
  readonly controls: Omit<GenerationControls, 'instrumentProfileId'>
  readonly instrument: CorpusInstrument
  readonly profile: ProfileSelection
  readonly seed: number
  readonly carryIn?: CarryIn
}): GenerationIntent {
  const { instrument } = options
  const input = {
    requestId: makeRequestId(`corpus-v30-${options.label}`),
    seed: makeSeed(options.seed),
    controls: makeGenerationControls({
      ...options.controls,
      instrumentProfileId: instrument.instrumentProfileId,
    }),
    figureLevels: levelsForProfile(options.profile.musicalProfile),
    ...(instrument.instrumentProfile === undefined
      ? {}
      : { instrumentProfile: instrument.instrumentProfile }),
  }
  return options.carryIn === undefined
    ? createGenerationIntent(input)
    : makeCarryInGenerationIntent({ ...input, carryIn: options.carryIn })
}

/**
 * Intent: the carry-in a phrase hands forward as the given phrase number. The phrase must
 * generate successfully; a failure means the corpus was built on an unusable case and crashes.
 */
function carryInFrom(label: string, intent: GenerationIntent, phraseNumber: number): CarryIn {
  const outcome = generatePhrase(intent)
  if (outcome.kind !== 'generation_success') {
    throw new Error(`Corpus carry-in source ${label} failed to generate: ${outcome.code}.`)
  }
  return deriveCarryIn({ intent, outcome, phraseNumber })
}

/**
 * Intent: the non-instrument controls of the standalone case at collection index `c`, instrument
 * index `i` and profile index `p`. Over the nine collections of one (profile, instrument) pair,
 * `c + i` walks every tension, `c + 2i + p` every leapiness and `c + i + p` every arpeggio chaos;
 * note density cycles quarter, eighth, sixteenth with `c`, and rhythmic variety changes with each
 * group of three collections, so eighth and sixteenth notes each meet every variety once. The
 * remaining controls rotate on the case's global index so the corpus visits all their values.
 * A rotation landing on a rhythm setting the workspace blocks (no legal four-bar plan, under any
 * seed) takes the workspace's suggested change instead, which is always a lighter syncopation.
 */
function standaloneControls(
  c: number,
  i: number,
  p: number,
): Omit<GenerationControls, 'instrumentProfileId'> {
  const n = (p * INSTRUMENTS.length + i) * COLLECTIONS.length + c
  const controls = {
    tempo: pick(TEMPO_VALUES, n * 7),
    tonalCenter: pick(PITCH_CLASSES, n * 5),
    collection: pick(COLLECTIONS, c),
    harmonicMotion: pick(HARMONIC_MOTIONS, c + p),
    tension: pick(TENSION_ARCS, c + i),
    noteDensity: pick(NOTE_DENSITIES, c),
    rhythmicVariety: pick(RHYTHMIC_VARIETIES, Math.floor(c / 3) + i + p),
    syncopation: pick(SYNCOPATIONS, c + 2 * p + i),
    silenceDensity: pick(SILENCE_DENSITIES, 2 * c + i),
    contour: pick(CONTOURS, n + p),
    register: pick(REGISTER_CHOICES, n * 3 + i),
    leapiness: pick(LEAPINESS_VALUES, c + 2 * i + p),
    arpeggioChaos: pick(ARPEGGIO_CHAOS_VALUES, c + i + p),
  }
  if (!isUnsupportedRhythmSetting(controls)) return controls
  const suggestion = suggestNearestSupportedRhythmChange(controls)
  if (suggestion.control !== 'syncopation') {
    throw new Error(`Corpus rotation would change ${suggestion.control}, not syncopation.`)
  }
  return { ...controls, syncopation: suggestion.to }
}

/** Intent: every standalone case: profile selection × instrument × collection, each phrase 1. */
function standaloneCases(): readonly ReplayKeyCorpusV30Case[] {
  return PROFILES.flatMap((profile, p) =>
    INSTRUMENTS.flatMap((instrument, i) =>
      COLLECTIONS.map((collection, c) => {
        const seed = pick(SEEDS, c + i + p)
        const label = `${selectionLabel(instrument, profile)}-${collection}-s${seed}`
        const controls = standaloneControls(c, i, p)
        return {
          label,
          intent: corpusIntent({ label, controls, instrument, profile, seed }),
          phraseNumber: 1,
        }
      }),
    ),
  )
}

/** The controls every carry-in chain and key-change phrase starts from. */
const CARRY_IN_CONTROLS: Omit<GenerationControls, 'instrumentProfileId'> = {
  tempo: 140,
  tonalCenter: 'F',
  collection: 'Minor',
  harmonicMotion: 'Active diatonic',
  tension: 'Lift',
  noteDensity: 'Eighth',
  rhythmicVariety: 'Heavily varied',
  syncopation: 'Occasional offbeats',
  silenceDensity: 'Conversational',
  contour: 'Arch',
  register: 'Middle',
  leapiness: 'Shaped',
  arpeggioChaos: 'Varied',
}

/**
 * Intent: a three-phrase chain per instrument for Neutral preset and Jazz custom, each instrument
 * in its own collection: phrase 1 (not a case), phrase 2 receiving phrase 1's carry-in, phrase 3
 * receiving phrase 2's.
 */
function chainCases(): readonly ReplayKeyCorpusV30Case[] {
  const profiles = [PROFILES[0]!, PROFILES[3]!]
  return INSTRUMENTS.flatMap((instrument, i) =>
    profiles.flatMap((profile) => {
      const collection: Collection = pick(COLLECTIONS, 2 * i + 1)
      const controls = { ...CARRY_IN_CONTROLS, collection }
      const base = `${selectionLabel(instrument, profile)}-chain`
      const first = corpusIntent({ label: `${base}-p1`, controls, instrument, profile, seed: 5 })
      const second = corpusIntent({
        label: `${base}-p2`,
        controls,
        instrument,
        profile,
        seed: 6,
        carryIn: carryInFrom(`${base}-p1`, first, 1),
      })
      const third = corpusIntent({
        label: `${base}-p3`,
        controls,
        instrument,
        profile,
        seed: 9,
        carryIn: carryInFrom(`${base}-p2`, second, 2),
      })
      return [
        { label: `${base}-p2`, intent: second, phraseNumber: 2 },
        { label: `${base}-p3`, intent: third, phraseNumber: 3 },
      ]
    }),
  )
}

/**
 * Intent: per instrument for Neutral custom and Jazz preset, a phrase 2 in F# Dorian receiving the
 * carry-in of a C Ionian phrase 1 with its final harmony dropped (null), as a session does when
 * the key changes between phrases.
 */
function nullHarmonyCases(): readonly ReplayKeyCorpusV30Case[] {
  const profiles = [PROFILES[1]!, PROFILES[2]!]
  return INSTRUMENTS.flatMap((instrument) =>
    profiles.map((profile) => {
      const base = `${selectionLabel(instrument, profile)}-key-change`
      const first = corpusIntent({
        label: `${base}-p1`,
        controls: { ...CARRY_IN_CONTROLS, tonalCenter: 'C', collection: 'Ionian' },
        instrument,
        profile,
        seed: 11,
      })
      const carryIn = makeCarryIn({ ...carryInFrom(`${base}-p1`, first, 1), finalHarmony: null })
      const label = `${base}-p2`
      const intent = corpusIntent({
        label,
        controls: { ...CARRY_IN_CONTROLS, tonalCenter: 'F#', collection: 'Dorian' },
        instrument,
        profile,
        seed: 13,
        carryIn,
      })
      return { label, intent, phraseNumber: 2 }
    }),
  )
}

/** Intent: every case of the v3.0 corpus, in a fixed order. */
export function replayKeyCorpusV30Cases(): readonly ReplayKeyCorpusV30Case[] {
  return [...standaloneCases(), ...chainCases(), ...nullHarmonyCases()]
}
