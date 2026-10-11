// @vitest-environment node
/**
 * The `ifk1.` replay-key corpus: every key recorded on the code v2.0.0 shipped (the three built-in
 * instruments, Neutral and Jazz, a spread of controls, several seeds, standalone and carry-in
 * phrases, one carry-in with a null final harmony) still decodes, still re-encodes to the same
 * key, and still replays through the generation worker runtime to the stored timeline, byte for
 * byte. The fixture is read only: a timeline changed by hand, or a generator change that alters
 * any old key's phrase, turns this spec red.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { encodePhraseReplayKey } from '@/generation-worker/phrase-replay-key'
import { decodePhraseReplayKey } from '@/generation-worker/phrase-replay-key-decode'
import { replayDecodedPhraseKey } from '@/generation-worker/phrase-replay'

/** One recorded case: its label, its replay key and the timeline the key replayed to. */
interface CorpusCase {
  readonly label: string
  readonly key: string
  readonly timeline: unknown
}

/** The recorded corpus file. */
interface Corpus {
  readonly keyVersion: string
  readonly recordedOnAppVersion: string
  readonly cases: readonly CorpusCase[]
}

const CORPUS: Corpus = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../fixtures/replay-keys/ifk1-v2.0.json', import.meta.url)),
    'utf8',
  ),
) as Corpus

/** Generous timeout: the whole corpus replays in a few seconds on a developer machine. */
const TIMEOUT_MS = 120_000

/** Intent: the timeline a key replays to through a fresh worker runtime, or a loud failure. */
function replayTimeline(key: string): unknown {
  const report = replayDecodedPhraseKey(key, decodePhraseReplayKey(key))
  if (
    report.output.kind !== 'generation_success' ||
    report.output.raw.kind !== 'generation_success'
  )
    throw new Error(`Key no longer replays to a phrase: ${report.output.kind}.`)
  return report.output.raw.result.timeline
}

describe('ifk1 replay-key corpus recorded on v2.0', () => {
  it('covers the built-in instruments, both profiles, and carry-in phrases', () => {
    expect(CORPUS.keyVersion).toBe('ifk1')
    expect(CORPUS.recordedOnAppVersion).toBe('2.0.0')
    const labels = CORPUS.cases.map((corpusCase) => corpusCase.label)
    expect(new Set(labels).size).toBe(labels.length)
    for (const instrument of ['c-keyboard', 'bb-tenor', 'eb-alto'])
      expect(labels.some((label) => label.startsWith(instrument))).toBe(true)
    for (const profile of ['Neutral', 'Jazz'])
      expect(labels.some((label) => label.includes(`-${profile}-`))).toBe(true)
    const decoded = CORPUS.cases.map((corpusCase) => decodePhraseReplayKey(corpusCase.key))
    expect(decoded.some((key) => key.intent.carryIn !== undefined)).toBe(true)
    expect(decoded.some((key) => key.intent.carryIn?.finalHarmony === null)).toBe(true)
  })

  // @test-link [[module_phrase_replay_key]]
  it('decodes every key and re-encodes it to the same key', () => {
    for (const corpusCase of CORPUS.cases) {
      const decoded = decodePhraseReplayKey(corpusCase.key)
      expect(encodePhraseReplayKey(decoded.intent, decoded.phraseNumber), corpusCase.label).toBe(
        corpusCase.key,
      )
    }
  })

  // @test-link [[module_phrase_replay_key]]
  // @test-link [[rule_seeded_phrase_reproduction]]
  it(
    'replays every key to its stored timeline byte for byte',
    () => {
      for (const corpusCase of CORPUS.cases) {
        expect(JSON.stringify(replayTimeline(corpusCase.key)), corpusCase.label).toBe(
          JSON.stringify(corpusCase.timeline),
        )
      }
    },
    TIMEOUT_MS,
  )
})
