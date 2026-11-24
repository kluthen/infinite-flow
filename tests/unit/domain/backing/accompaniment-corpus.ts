/**
 * The replay-key corpora's phrases as the arranger takes them: each stored key decoded, its phrase
 * regenerated with the real generator, and its timeline, harmony, register window, scale (the
 * concert key's collection) and seed gathered into an arranger phrase. Pure apart from the
 * generator's work, with no file access, so the parts' corpus spec and the arranger's timing
 * harness (M4) share it. Test plumbing: nothing in the app reads it.
 */

import type { ArrangerPhrase } from '@/domain/backing/accompaniment-part'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import { decodePhraseReplayKey } from '@/generation-worker/phrase-replay-key-decode'

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
  return {
    label: corpusCase.label,
    phraseNumber,
    phrase: {
      timeline: outcome.result.timeline,
      harmony: outcome.provenance.harmony.events,
      window: { register: outcome.request.register, range: outcome.request.registerWindow },
      scale: makeHarmonyCollection(intent.controls.tonalCenter, intent.controls.collection),
      seed: outcome.result.seed,
    },
  }
}
