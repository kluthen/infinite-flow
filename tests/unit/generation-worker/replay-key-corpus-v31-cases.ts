/**
 * The cases of the v3.1 replay-key corpus: each one a real generation intent and the phrase number
 * its key names. The corpus is a covering spread, not a full cross product. The eight built-in
 * presets, applied as choosing them applies them, meet every instrument (the three built-ins and
 * two my instruments of different written ranges). Four figure-level spreads, which between them
 * give every figure every level and of which one allows no chromatic note, meet every collection
 * on every instrument, and the other controls rotate by index so that, for every spread and
 * instrument, the nine collections between them use every tension, leapiness and arpeggio-chaos
 * value, pair eighth and sixteenth notes with heavily varied rhythm and hold a strict, straight
 * rhythm. Three-phrase carry-in chains and key-change phrases receiving a null final harmony
 * complete it. On v3.1, which recorded the corpus, every phrase encoded as an `ifk3.` key. The
 * recording script turned these cases into `tests/fixtures/replay-keys/v3.1-corpus.json`; the
 * corpus spec reads only that file.
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
} from '@/domain/controls/generation-controls'
import {
  isUnsupportedRhythmSetting,
  suggestNearestSupportedRhythmChange,
} from '@/domain/controls/unsupported-rhythm-settings'
import {
  FIGURE_IDS,
  FIGURE_LEVEL_IDS,
  JAZZ_FIGURE_LEVELS,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import { makeCarryIn, type CarryIn } from '@/domain/generation/carry-in/carry-in'
import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { choosePreset } from '@/domain/presets/preset-selection'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import type { BuiltInInstrumentProfileId } from '@/domain/profile/instrument-profiles'
import { makeMyInstrument } from '@/domain/profile/my-instrument'
import { makeSeed } from '@/domain/random/seed'

/** One corpus case: a label naming it, its intent and the phrase number its key carries. */
export interface ReplayKeyCorpusV31Case {
  readonly label: string
  readonly intent: GenerationIntent
  readonly phraseNumber: number
}

/** A figure-level spread: its label and the seven levels it sets. */
interface LevelSpread {
  readonly label: string
  readonly levels: FigureLevels
}

/**
 * Each figure's offset in the level rotation, in FIGURE_IDS order. The two chromatic figures share
 * one, so the spread that turns one of them off turns the other off too and allows no chromatic
 * note.
 */
const FIGURE_OFFSETS = [0, 1, 2, 3, 0, 2, 2] as const

/** Intent: the levels of spread `s`: figure `f` at level `(s + offset of f) mod 4`. */
function spreadLevels(s: number): FigureLevels {
  return Object.fromEntries(
    FIGURE_IDS.map((figure, f) => [figure, pick(FIGURE_LEVEL_IDS, s + FIGURE_OFFSETS[f]!)]),
  ) as FigureLevels
}

/**
 * The four figure-level spreads, in a fixed order. Across them every figure takes every level
 * once; each spread mixes all four levels, and spread 2 turns both chromatic figures off.
 */
const SPREADS: readonly LevelSpread[] = [0, 1, 2, 3].map((s) => ({
  label: `levels${s}`,
  levels: spreadLevels(s),
}))

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

/** The seeds the standalone and preset cases rotate through. */
const SEEDS = [1, 7, 42] as const

/** Intent: the value of a catalog at an index, wrapping around; crashes on an empty catalog. */
function pick<T>(values: readonly T[], index: number): T {
  const value = values[index % values.length]
  if (value === undefined) throw new Error('Corpus rotation picked from an empty catalog.')
  return value
}

/** Intent: build one real intent, with or without a carry-in, from written controls and a seed. */
function corpusIntent(options: {
  readonly label: string
  readonly controls: Omit<GenerationControls, 'instrumentProfileId'>
  readonly levels: FigureLevels
  readonly instrument: CorpusInstrument
  readonly seed: number
  readonly carryIn?: CarryIn
}): GenerationIntent {
  const { instrument } = options
  const input = {
    requestId: makeRequestId(`corpus-v31-${options.label}`),
    seed: makeSeed(options.seed),
    controls: makeGenerationControls({
      ...options.controls,
      instrumentProfileId: instrument.instrumentProfileId,
    }),
    figureLevels: options.levels,
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
 * Intent: the controls with a rhythm setting the workspace blocks (no legal four-bar plan, under
 * any seed) replaced by the workspace's suggested change, which is always a lighter syncopation;
 * controls the workspace allows come back unchanged.
 */
function allowedRhythm(
  controls: Omit<GenerationControls, 'instrumentProfileId'>,
): Omit<GenerationControls, 'instrumentProfileId'> {
  if (!isUnsupportedRhythmSetting(controls)) return controls
  const suggestion = suggestNearestSupportedRhythmChange(controls)
  if (suggestion.control !== 'syncopation') {
    throw new Error(`Corpus rotation would change ${suggestion.control}, not syncopation.`)
  }
  return { ...controls, syncopation: suggestion.to }
}

/** The tempo, written key and mode the player holds before choosing a preset. */
interface HeldSettings {
  readonly tempo: number
  readonly tonalCenter: GenerationControls['tonalCenter']
  readonly collection: Collection
}

/**
 * Intent: every preset case: built-in preset × instrument, each phrase 1. The player holds a
 * rotating tempo, written key and mode, then chooses the preset: its ten controls and seven levels
 * replace the held ones, and a mode its restriction does not allow moves to the restriction's
 * first. A built-in preset never holds a blocked rhythm setting; one would crash the corpus.
 */
function presetCases(): readonly ReplayKeyCorpusV31Case[] {
  return BUILT_IN_PRESETS.flatMap((preset, k) =>
    INSTRUMENTS.map((instrument, i) => {
      const n = k * INSTRUMENTS.length + i
      const held: HeldSettings = {
        tempo: pick(TEMPO_VALUES, n * 7),
        tonalCenter: pick(PITCH_CLASSES, n * 5),
        collection: pick(COLLECTIONS, n * 2),
      }
      const { settings } = choosePreset(
        {
          controls: makeGenerationControls({
            ...CARRY_IN_CONTROLS,
            ...held,
            instrumentProfileId: instrument.instrumentProfileId,
          }),
          levels: JAZZ_FIGURE_LEVELS,
        },
        { kind: 'custom', baseId: null },
        preset,
      )
      const { controls } = settings
      if (isUnsupportedRhythmSetting(controls)) {
        throw new Error(`Built-in preset ${preset.id} holds a blocked rhythm setting.`)
      }
      const seed = pick(SEEDS, k + i)
      const label = `${instrument.label}-preset-${preset.id}-${controls.collection}-s${seed}`
      return {
        label,
        intent: corpusIntent({ label, controls, levels: settings.levels, instrument, seed }),
        phraseNumber: 1,
      }
    }),
  )
}

/**
 * Intent: the non-instrument controls of the standalone case at collection index `c`, instrument
 * index `i` and spread index `s`. Over the nine collections of one (spread, instrument) pair,
 * `c + i` walks every tension, `c + 2i + s` every leapiness and `c + i + s` every arpeggio chaos;
 * note density cycles quarter, eighth, sixteenth with `c`, and rhythmic variety changes with each
 * group of three collections, so eighth and sixteenth notes each meet every variety once, and
 * syncopation `c + 2s + i` is straight once in the strict group. The remaining controls rotate on
 * the case's global index so the corpus visits all their values. A blocked rhythm setting takes
 * the workspace's suggested lighter syncopation.
 */
function standaloneControls(
  c: number,
  i: number,
  s: number,
): Omit<GenerationControls, 'instrumentProfileId'> {
  const n = (s * INSTRUMENTS.length + i) * COLLECTIONS.length + c
  return allowedRhythm({
    tempo: pick(TEMPO_VALUES, n * 7),
    tonalCenter: pick(PITCH_CLASSES, n * 5),
    collection: pick(COLLECTIONS, c),
    harmonicMotion: pick(HARMONIC_MOTIONS, c + s),
    tension: pick(TENSION_ARCS, c + i),
    noteDensity: pick(NOTE_DENSITIES, c),
    rhythmicVariety: pick(RHYTHMIC_VARIETIES, Math.floor(c / 3) + i + s),
    syncopation: pick(SYNCOPATIONS, c + 2 * s + i),
    silenceDensity: pick(SILENCE_DENSITIES, 2 * c + i),
    contour: pick(CONTOURS, n + s),
    register: pick(REGISTER_CHOICES, n * 3 + i),
    leapiness: pick(LEAPINESS_VALUES, c + 2 * i + s),
    arpeggioChaos: pick(ARPEGGIO_CHAOS_VALUES, c + i + s),
  })
}

/** Intent: every standalone case: level spread × instrument × collection, each phrase 1. */
function standaloneCases(): readonly ReplayKeyCorpusV31Case[] {
  return SPREADS.flatMap((spread, s) =>
    INSTRUMENTS.flatMap((instrument, i) =>
      COLLECTIONS.map((collection, c) => {
        const seed = pick(SEEDS, c + i + s)
        const label = `${instrument.label}-${spread.label}-${collection}-s${seed}`
        const controls = standaloneControls(c, i, s)
        return {
          label,
          intent: corpusIntent({ label, controls, levels: spread.levels, instrument, seed }),
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
 * Intent: a three-phrase chain per instrument for spreads 0 and 3, each instrument in its own
 * collection: phrase 1 (not a case), phrase 2 receiving phrase 1's carry-in, phrase 3 receiving
 * phrase 2's.
 */
function chainCases(): readonly ReplayKeyCorpusV31Case[] {
  const spreads = [SPREADS[0]!, SPREADS[3]!]
  return INSTRUMENTS.flatMap((instrument, i) =>
    spreads.flatMap((spread) => {
      const collection: Collection = pick(COLLECTIONS, 2 * i + 1)
      const controls = { ...CARRY_IN_CONTROLS, collection }
      const { levels } = spread
      const base = `${instrument.label}-${spread.label}-chain`
      const first = corpusIntent({ label: `${base}-p1`, controls, levels, instrument, seed: 5 })
      const second = corpusIntent({
        label: `${base}-p2`,
        controls,
        levels,
        instrument,
        seed: 6,
        carryIn: carryInFrom(`${base}-p1`, first, 1),
      })
      const third = corpusIntent({
        label: `${base}-p3`,
        controls,
        levels,
        instrument,
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
 * Intent: per instrument for spreads 1 and 2, a phrase 2 in F# Dorian receiving the carry-in of a
 * C Ionian phrase 1 with its final harmony dropped (null), as a session does when the key changes
 * between phrases.
 */
function nullHarmonyCases(): readonly ReplayKeyCorpusV31Case[] {
  const spreads = [SPREADS[1]!, SPREADS[2]!]
  return INSTRUMENTS.flatMap((instrument) =>
    spreads.map((spread) => {
      const { levels } = spread
      const base = `${instrument.label}-${spread.label}-key-change`
      const first = corpusIntent({
        label: `${base}-p1`,
        controls: { ...CARRY_IN_CONTROLS, tonalCenter: 'C', collection: 'Ionian' },
        levels,
        instrument,
        seed: 11,
      })
      const carryIn = makeCarryIn({ ...carryInFrom(`${base}-p1`, first, 1), finalHarmony: null })
      const label = `${base}-p2`
      const intent = corpusIntent({
        label,
        controls: { ...CARRY_IN_CONTROLS, tonalCenter: 'F#', collection: 'Dorian' },
        levels,
        instrument,
        seed: 13,
        carryIn,
      })
      return { label, intent, phraseNumber: 2 }
    }),
  )
}

/** Intent: every case of the v3.1 corpus, in a fixed order. */
export function replayKeyCorpusV31Cases(): readonly ReplayKeyCorpusV31Case[] {
  return [...presetCases(), ...standaloneCases(), ...chainCases(), ...nullHarmonyCases()]
}
