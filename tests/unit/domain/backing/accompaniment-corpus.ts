/**
 * The replay-key corpora's phrases as the arranger takes them: each stored key decoded, its phrase
 * regenerated with the real generator, and its timeline, harmony, register window, scale (the
 * concert key's collection) and seed gathered into an arranger phrase. Pure apart from the
 * generator's work, with no file access, so the parts' corpus spec and the arranger's timing
 * harness (M4) share it. Also a seeded supplement of phrases generated with Seventh chords on
 * Strongly favored, since the replay-key corpora hold no seventh chord. Test plumbing: nothing in
 * the app reads it.
 */

import type { ArrangerPhrase } from '@/domain/backing/accompaniment-part'
import type { ChordFamilies } from '@/domain/chords/chord-families'
import {
  makeGenerationControls,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import { levelsForProfile } from '@/domain/figures/figure-levels'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import type { RegisterChoice } from '@/domain/profile/register-intent'
import { makeSeed } from '@/domain/random/seed'
import { decodePhraseReplayKey } from '@/generation-worker/phrase-replay-key-decode'
import {
  INSTRUMENTS,
  type CorpusInstrument,
} from '../../generation-worker/replay-key-corpus-v32-builders'

/** The replay-key corpora under `tests/fixtures/replay-keys/`, oldest first. */
export const REPLAY_KEY_CORPUS_FILES = [
  'ifk1-v2.0.json',
  'v3.0-neutral-jazz.json',
  'v3.1-corpus.json',
  'v3.2-corpus.json',
] as const

/** One stored case of a corpus: its label and its replay key. */
export interface CorpusCaseKey {
  readonly label: string
  readonly key: string
}

/** One corpus phrase: its case's label, its phrase number and what the arranger renders it from. */
export interface CorpusArrangerPhrase {
  readonly label: string
  readonly phraseNumber: number
  readonly phrase: ArrangerPhrase
}

/** The cases of a parsed corpus file; throws on a file without a `cases` list of labelled keys. */
export function corpusCaseKeys(corpus: unknown): readonly CorpusCaseKey[] {
  const cases = (corpus as { readonly cases?: unknown }).cases
  if (!Array.isArray(cases)) throw new Error('Corpus file: no cases list.')
  return cases.map((corpusCase: unknown, index) => {
    const { label, key } = corpusCase as { readonly label?: unknown; readonly key?: unknown }
    if (typeof label !== 'string' || typeof key !== 'string') {
      throw new Error(`Corpus file: case ${index} has no label and key.`)
    }
    return { label, key }
  })
}

/**
 * One case's phrase regenerated from its key and gathered as an arranger phrase. Throws when the
 * key no longer generates a phrase.
 */
export function corpusArrangerPhrase(corpusCase: CorpusCaseKey): CorpusArrangerPhrase {
  const { intent, phraseNumber } = decodePhraseReplayKey(corpusCase.key)
  const outcome = generatePhrase(intent)
  if (outcome.kind !== 'generation_success') {
    throw new Error(`Corpus case ${corpusCase.label} no longer generates: ${outcome.code}.`)
  }
  return { label: corpusCase.label, phraseNumber, phrase: gathered(intent, outcome) }
}

/** A generated phrase's timeline, harmony, resolved window, concert-key scale and seed. */
function gathered(
  intent: GenerationIntent,
  outcome: Extract<GenerationOutcome, { kind: 'generation_success' }>,
): ArrangerPhrase {
  return {
    timeline: outcome.result.timeline,
    harmony: outcome.provenance.harmony.events,
    window: { register: outcome.request.register, range: outcome.request.registerWindow },
    scale: makeHarmonyCollection(intent.controls.tonalCenter, intent.controls.collection),
    seed: outcome.result.seed,
  }
}

/** The Seventh chords level of the supplement: Strongly favored, so most chords are sevenths. */
const SEVENTH_CHORDS: ChordFamilies = { 'seventh-chords': 'stronglyFavored' }

/** The register choices the supplement covers: each window, and Varying. */
export const SEVENTH_SUPPLEMENT_REGISTERS: readonly RegisterChoice[] = [
  'Low',
  'Middle',
  'High',
  'Varying',
]

/** The supplement's two fixed seeds. */
export const SEVENTH_SUPPLEMENT_SEEDS = [7, 23] as const

/** The supplement's controls apart from the instrument and the register. */
const SEVENTH_CONTROLS: Omit<GenerationControls, 'instrumentProfileId' | 'register'> = {
  tempo: 100,
  tonalCenter: 'F',
  collection: 'Major',
  harmonicMotion: 'Gentle diatonic',
  tension: 'Settled',
  noteDensity: 'Eighth',
  rhythmicVariety: 'Slightly varied',
  syncopation: 'Straight',
  silenceDensity: 'Sparse',
  contour: 'Wandering',
  leapiness: 'Shaped',
  arpeggioChaos: 'Varied',
}

/** One supplement intent: the instrument, the register choice and the seed, Jazz figure levels. */
function seventhIntent(
  label: string,
  instrument: CorpusInstrument,
  register: RegisterChoice,
  seed: number,
): GenerationIntent {
  return createGenerationIntent({
    requestId: makeRequestId(`accompaniment-${label}`),
    seed: makeSeed(seed),
    controls: makeGenerationControls({
      ...SEVENTH_CONTROLS,
      register,
      instrumentProfileId: instrument.instrumentProfileId,
    }),
    figureLevels: levelsForProfile('Jazz'),
    chordFamilies: SEVENTH_CHORDS,
    ...(instrument.instrumentProfile === undefined
      ? {}
      : { instrumentProfile: instrument.instrumentProfile }),
  })
}

/**
 * The seventh-chord supplement: one phrase per corpus instrument (the three built-ins and two my
 * instruments) × register choice × seed, generated with Seventh chords on Strongly favored and
 * gathered as arranger phrases, labelled `seventh-<instrument>-<register>-s<seed>`. Deterministic;
 * throws when a case does not generate.
 */
export function seventhChordArrangerPhrases(): readonly CorpusArrangerPhrase[] {
  return INSTRUMENTS.flatMap((instrument) =>
    SEVENTH_SUPPLEMENT_REGISTERS.flatMap((register) =>
      SEVENTH_SUPPLEMENT_SEEDS.map((seed) => {
        const label = `seventh-${instrument.label}-${register}-s${seed}`
        const intent = seventhIntent(label, instrument, register, seed)
        const outcome = generatePhrase(intent)
        if (outcome.kind !== 'generation_success') {
          throw new Error(`Supplement case ${label} does not generate: ${outcome.code}.`)
        }
        return { label, phraseNumber: 1, phrase: gathered(intent, outcome) }
      }),
    ),
  )
}
