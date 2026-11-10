/**
 * The cases of the v3.2 replay-key corpus: each one a real generation intent and the phrase number
 * its key names. The corpus is a covering spread, not a full cross product, and none of its
 * phrases is one of the v3.1 corpus's (other seeds, spreads and rotations). The eight built-in
 * presets, applied as choosing them applies them, meet every instrument (the three built-ins and
 * two my instruments of different written ranges). Four figure-level spreads, which between them
 * give every figure every level and of which one allows no chromatic note, meet every one of the
 * nine modes on every instrument, and the other controls rotate by index so that, for every spread
 * and instrument, the nine modes between them use every harmonic motion, tension, leapiness and
 * arpeggio-chaos value, pair eighth and sixteenth notes with heavily varied rhythm and hold a
 * strict, straight rhythm. Three-phrase carry-in chains and key-change pairs whose phrase 2
 * receives a null final harmony follow, then the rhythm lock and Jam cases
 * (./replay-key-corpus-v32-jam-lock-cases.ts). On v3.2, which recorded the corpus, every phrase
 * encodes as an `ifk4.` key. The recording script turns these cases into
 * `tests/fixtures/replay-keys/v3.2-corpus.json`; the corpus spec reads only that file.
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
import { isUnsupportedRhythmSetting } from '@/domain/controls/unsupported-rhythm-settings'
import {
  FIGURE_IDS,
  FIGURE_LEVEL_IDS,
  JAZZ_FIGURE_LEVELS,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import { makeCarryIn } from '@/domain/generation/carry-in/carry-in'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { choosePreset } from '@/domain/presets/preset-selection'

import {
  allowedRhythm,
  carryInFrom,
  CHAIN_CONTROLS,
  corpusIntent,
  INSTRUMENTS,
  pick,
  SEEDS,
  type CorpusControls,
  type ReplayKeyCorpusV32Case,
} from './replay-key-corpus-v32-builders'
import { jamCases, lockCases } from './replay-key-corpus-v32-jam-lock-cases'

export type { ReplayKeyCorpusV32Case }

/** A figure-level spread: its label and the seven levels it sets. */
interface LevelSpread {
  readonly label: string
  readonly levels: FigureLevels
}

/**
 * Each figure's offset in the level rotation, in FIGURE_IDS order: the v3.1 corpus's offsets, one
 * step on, so its spreads are new. The two chromatic figures share one, so the spread that turns
 * one of them off (spread 1) turns the other off too and allows no chromatic note.
 */
const FIGURE_OFFSETS = [1, 2, 3, 0, 1, 3, 3] as const

/** Intent: the levels of spread `s`: figure `f` at level `(s + offset of f) mod 4`. */
function spreadLevels(s: number): FigureLevels {
  return Object.fromEntries(
    FIGURE_IDS.map((figure, f) => [figure, pick(FIGURE_LEVEL_IDS, s + FIGURE_OFFSETS[f]!)]),
  ) as FigureLevels
}

/** The four figure-level spreads, in a fixed order; across them every figure takes every level. */
const SPREADS: readonly LevelSpread[] = [0, 1, 2, 3].map((s) => ({
  label: `levels${s}`,
  levels: spreadLevels(s),
}))

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
function presetCases(): readonly ReplayKeyCorpusV32Case[] {
  return BUILT_IN_PRESETS.flatMap((preset, k) =>
    INSTRUMENTS.map((instrument, i) => {
      const n = k * INSTRUMENTS.length + i
      const held: HeldSettings = {
        tempo: pick(TEMPO_VALUES, n * 7 + 3),
        tonalCenter: pick(PITCH_CLASSES, n * 5 + 2),
        collection: pick(COLLECTIONS, n * 2 + 1),
      }
      const { settings } = choosePreset(
        {
          controls: makeGenerationControls({
            ...CHAIN_CONTROLS,
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
      const seed = pick(SEEDS, k + i + 1)
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
 * Intent: the non-instrument controls of the standalone case at mode index `c`, instrument index
 * `i` and spread index `s`. Over the nine modes of one (spread, instrument) pair, `c + s + 1`
 * walks every harmonic motion, `c + i + 1` every tension, `c + 2i + s + 1` every leapiness and
 * `c + i + s + 1` every arpeggio chaos; note density cycles eighth, sixteenth, quarter with `c`,
 * and rhythmic variety changes with each group of three modes, so eighth and sixteenth notes each
 * meet every variety once, and syncopation `c + 2s + i + 1` is straight once in the strict group.
 * The remaining controls rotate on the case's global index so the corpus visits all their values.
 * A blocked rhythm setting takes the workspace's suggested lighter syncopation.
 */
function standaloneControls(c: number, i: number, s: number): CorpusControls {
  const n = (s * INSTRUMENTS.length + i) * COLLECTIONS.length + c
  return allowedRhythm({
    tempo: pick(TEMPO_VALUES, n * 7 + 3),
    tonalCenter: pick(PITCH_CLASSES, n * 5 + 2),
    collection: pick(COLLECTIONS, c),
    harmonicMotion: pick(HARMONIC_MOTIONS, c + s + 1),
    tension: pick(TENSION_ARCS, c + i + 1),
    noteDensity: pick(NOTE_DENSITIES, c + 1),
    rhythmicVariety: pick(RHYTHMIC_VARIETIES, Math.floor(c / 3) + i + s),
    syncopation: pick(SYNCOPATIONS, c + 2 * s + i + 1),
    silenceDensity: pick(SILENCE_DENSITIES, 2 * c + i + 1),
    contour: pick(CONTOURS, n + s + 1),
    register: pick(REGISTER_CHOICES, n * 3 + i + 1),
    leapiness: pick(LEAPINESS_VALUES, c + 2 * i + s + 1),
    arpeggioChaos: pick(ARPEGGIO_CHAOS_VALUES, c + i + s + 1),
  })
}

/** Intent: every standalone case: level spread × instrument × mode, each phrase 1. */
function standaloneCases(): readonly ReplayKeyCorpusV32Case[] {
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

/**
 * Intent: a three-phrase chain per instrument for spreads 1 and 2, each instrument in its own
 * mode: phrase 1, phrase 2 receiving phrase 1's carry-in, phrase 3 receiving phrase 2's. All three
 * are cases, so the backing and file corpus can hold the chain as a session.
 */
function chainCases(): readonly ReplayKeyCorpusV32Case[] {
  const spreads = [SPREADS[1]!, SPREADS[2]!]
  return INSTRUMENTS.flatMap((instrument, i) =>
    spreads.flatMap((spread) => {
      const collection: Collection = pick(COLLECTIONS, 2 * i + 2)
      const controls = { ...CHAIN_CONTROLS, collection }
      const { levels } = spread
      const base = `${instrument.label}-${spread.label}-chain`
      const first = corpusIntent({ label: `${base}-p1`, controls, levels, instrument, seed: 8 })
      const second = corpusIntent({
        label: `${base}-p2`,
        controls,
        levels,
        instrument,
        seed: 10,
        carryIn: carryInFrom(`${base}-p1`, first, 1),
      })
      const third = corpusIntent({
        label: `${base}-p3`,
        controls,
        levels,
        instrument,
        seed: 12,
        carryIn: carryInFrom(`${base}-p2`, second, 2),
      })
      return [
        { label: `${base}-p1`, intent: first, phraseNumber: 1 },
        { label: `${base}-p2`, intent: second, phraseNumber: 2 },
        { label: `${base}-p3`, intent: third, phraseNumber: 3 },
      ]
    }),
  )
}

/**
 * Intent: per instrument for spreads 0 and 3, a D Lydian phrase 1 and a G# Phrygian phrase 2
 * receiving its carry-in with the final harmony dropped (null), as a session does when the key
 * changes between phrases.
 */
function keyChangeCases(): readonly ReplayKeyCorpusV32Case[] {
  const spreads = [SPREADS[0]!, SPREADS[3]!]
  return INSTRUMENTS.flatMap((instrument) =>
    spreads.flatMap((spread) => {
      const { levels } = spread
      const base = `${instrument.label}-${spread.label}-key-change`
      const first = corpusIntent({
        label: `${base}-p1`,
        controls: { ...CHAIN_CONTROLS, tonalCenter: 'D', collection: 'Lydian' },
        levels,
        instrument,
        seed: 15,
      })
      const carryIn = makeCarryIn({ ...carryInFrom(`${base}-p1`, first, 1), finalHarmony: null })
      const second = corpusIntent({
        label: `${base}-p2`,
        controls: { ...CHAIN_CONTROLS, tonalCenter: 'G#', collection: 'Phrygian' },
        levels,
        instrument,
        seed: 17,
        carryIn,
      })
      return [
        { label: `${base}-p1`, intent: first, phraseNumber: 1 },
        { label: `${base}-p2`, intent: second, phraseNumber: 2 },
      ]
    }),
  )
}

/** Intent: every case of the v3.2 corpus, in a fixed order. */
export function replayKeyCorpusV32Cases(): readonly ReplayKeyCorpusV32Case[] {
  return [
    ...presetCases(),
    ...standaloneCases(),
    ...chainCases(),
    ...keyChangeCases(),
    ...lockCases(),
    ...jamCases(),
  ]
}
