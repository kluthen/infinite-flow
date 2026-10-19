// @vitest-environment node
// @lint-ignore-atd until v3.1 chunk 8 adds its @test-link tags (rule_seeded_phrase_reproduction, rule_neutral_and_jazz_figure_levels) and removes this line
/**
 * The v3.0 replay-key corpus: every key recorded on the code v3.0.0 shipped (`ifk1.` keys for the
 * three built-in instruments, `ifk2.` keys for two my instruments of different ranges; Neutral and
 * Jazz, preset and custom, on every collection; a rotating spread of the other controls; standalone
 * and carry-in phrases, some receiving a null final harmony) still decodes, still re-encodes to the
 * same key, and still replays through the generation worker runtime to the stored timeline, byte
 * for byte. The fixture is read only: a timeline changed by hand, or a generator change that alters
 * any old key's phrase, turns this spec red.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  ARPEGGIO_CHAOS_VALUES,
  COLLECTIONS,
  LEAPINESS_VALUES,
  TENSION_ARCS,
} from '@/domain/controls/generation-controls'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { encodePhraseReplayKey } from '@/generation-worker/phrase-replay-key'
import {
  decodePhraseReplayKey,
  type DecodedPhraseReplayKey,
} from '@/generation-worker/phrase-replay-key-decode'
import { replayDecodedPhraseKey } from '@/generation-worker/phrase-replay'

/** One recorded case: its label, its replay key and the timeline the key replayed to. */
interface CorpusCase {
  readonly label: string
  readonly key: string
  readonly timeline: unknown
}

/** The recorded corpus file. */
interface Corpus {
  readonly keyVersions: readonly string[]
  readonly recordedOnAppVersion: string
  readonly cases: readonly CorpusCase[]
}

const CORPUS: Corpus = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../fixtures/replay-keys/v3.0-neutral-jazz.json', import.meta.url)),
    'utf8',
  ),
) as Corpus

/** Generous timeout: the whole corpus replays in a few seconds on a developer machine. */
const TIMEOUT_MS = 300_000

/** Every recorded key, decoded once. */
const DECODED: readonly DecodedPhraseReplayKey[] = CORPUS.cases.map((corpusCase) =>
  decodePhraseReplayKey(corpusCase.key),
)

/** Intent: the instrument a decoded intent names: a built-in id, or my instrument's concert range. */
function instrumentOf(intent: GenerationIntent): string {
  if (intent.controls.instrumentProfileId !== 'my-instrument') {
    return intent.controls.instrumentProfileId
  }
  const { minMidi, maxMidi } = intent.instrumentProfile.concertRange
  return `my-instrument ${minMidi}-${maxMidi}`
}

/** Intent: the profile selection a decoded intent names, as one comparable string. */
function selectionOf(intent: GenerationIntent): string {
  return `${intent.musicalProfile.musicalProfile}/${String(intent.musicalProfile.isCustom)}`
}

/** Intent: the distinct values a read gives over a set of decoded keys. */
function valuesOf(
  keys: readonly DecodedPhraseReplayKey[],
  read: (intent: GenerationIntent) => string,
) {
  return new Set(keys.map((key) => read(key.intent)))
}

/** Intent: the standalone phrases (phrase 1, no carry-in) grouped by profile selection and instrument. */
function standaloneGroups(): ReadonlyMap<string, readonly DecodedPhraseReplayKey[]> {
  const groups = new Map<string, DecodedPhraseReplayKey[]>()
  for (const key of DECODED) {
    if (key.phraseNumber !== 1 || key.intent.carryIn !== undefined) continue
    const group = `${selectionOf(key.intent)} ${instrumentOf(key.intent)}`
    groups.set(group, [...(groups.get(group) ?? []), key])
  }
  return groups
}

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

describe('v3.0 replay-key corpus (ifk1 and ifk2) recorded on v3.0.0', () => {
  it('covers both key versions, every profile selection, collection and instrument', () => {
    expect(CORPUS.recordedOnAppVersion).toBe('3.0.0')
    expect(CORPUS.keyVersions).toEqual(['ifk1', 'ifk2'])
    const labels = CORPUS.cases.map((corpusCase) => corpusCase.label)
    expect(new Set(labels).size).toBe(labels.length)
    expect(new Set(DECODED.map((key) => key.keyVersion))).toEqual(new Set(['ifk1', 'ifk2']))
    for (const key of DECODED)
      expect(key.keyVersion).toBe(
        key.intent.controls.instrumentProfileId === 'my-instrument' ? 'ifk2' : 'ifk1',
      )
    const pairs = valuesOf(
      DECODED,
      (intent) => `${selectionOf(intent)} ${intent.controls.collection}`,
    )
    for (const selection of ['Neutral/false', 'Neutral/true', 'Jazz/false', 'Jazz/true'])
      for (const collection of COLLECTIONS) expect(pairs).toContain(`${selection} ${collection}`)
    const instruments = [...valuesOf(DECODED, instrumentOf)]
    for (const builtIn of ['c-keyboard', 'bb-tenor', 'eb-alto'])
      expect(instruments).toContain(builtIn)
    expect(instruments.filter((name) => name.startsWith('my-instrument')).length).toBe(2)
  })

  it('uses every tension, leapiness, arpeggio chaos and heavily varied fast density', () => {
    expect([...valuesOf(DECODED, (intent) => intent.controls.tension)].sort()).toEqual(
      [...TENSION_ARCS].sort(),
    )
    expect([...valuesOf(DECODED, (intent) => intent.controls.leapiness)].sort()).toEqual(
      [...LEAPINESS_VALUES].sort(),
    )
    expect([...valuesOf(DECODED, (intent) => intent.controls.arpeggioChaos)].sort()).toEqual(
      [...ARPEGGIO_CHAOS_VALUES].sort(),
    )
    const groups = standaloneGroups()
    expect(groups.size).toBe(20)
    for (const [group, keys] of groups) {
      const rhythm = valuesOf(
        keys,
        (intent) => `${intent.controls.noteDensity} ${intent.controls.rhythmicVariety}`,
      )
      expect(valuesOf(keys, (intent) => intent.controls.collection).size, group).toBe(9)
      expect(valuesOf(keys, (intent) => intent.controls.tension).size, group).toBe(4)
      expect(valuesOf(keys, (intent) => intent.controls.leapiness).size, group).toBe(4)
      expect(valuesOf(keys, (intent) => intent.controls.arpeggioChaos).size, group).toBe(3)
      expect(rhythm, group).toContain('Eighth Heavily varied')
      expect(rhythm, group).toContain('Sixteenth Heavily varied')
    }
  })

  it('holds carry-in phrases, with my instrument and with a null final harmony', () => {
    const carried = DECODED.filter((key) => key.intent.carryIn !== undefined)
    expect(carried.length).toBeGreaterThan(0)
    expect(carried.some((key) => key.intent.carryIn?.finalHarmony === null)).toBe(true)
    expect(carried.some((key) => key.intent.carryIn?.finalHarmony !== null)).toBe(true)
    const mine = carried.filter(
      (key) => key.intent.controls.instrumentProfileId === 'my-instrument',
    )
    expect(mine.length).toBeGreaterThan(0)
    expect(mine.every((key) => key.keyVersion === 'ifk2')).toBe(true)
    expect(mine.some((key) => key.intent.carryIn?.finalHarmony === null)).toBe(true)
    expect(new Set(carried.map((key) => key.phraseNumber))).toEqual(new Set([2, 3]))
  })

  it('decodes every key and re-encodes it to the same key', () => {
    for (const corpusCase of CORPUS.cases) {
      const decoded = decodePhraseReplayKey(corpusCase.key)
      expect(encodePhraseReplayKey(decoded.intent, decoded.phraseNumber), corpusCase.label).toBe(
        corpusCase.key,
      )
    }
  })

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
