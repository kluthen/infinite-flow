// @vitest-environment node
/**
 * The v3.1 replay-key corpus: every `ifk3.` key recorded on the code v3.1.0 shipped (the eight
 * built-in presets on every instrument; four figure-level spreads on every collection and every
 * instrument, the three built-ins and two my instruments of different ranges; a rotating spread of
 * the other controls; standalone and carry-in phrases, some receiving a null final harmony) still
 * decodes, re-encodes to the very same key, and still replays through the generation worker
 * runtime to the stored timeline, byte for byte. An `ifk3.` key names no preset, so the coverage
 * finds each built-in preset by its ten controls and seven levels in the decoded intents. The
 * fixture is read only: a timeline changed by hand, or a change that alters any v3.1 key's phrase,
 * turns this spec red.
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
import { isUnsupportedRhythmSetting } from '@/domain/controls/unsupported-rhythm-settings'
import {
  allowsChromaticNotes,
  FIGURE_IDS,
  FIGURE_LEVEL_IDS,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { allowsKeyAndMode } from '@/domain/presets/key-and-mode-restriction'
import { PRESET_HELD_CONTROL_KEYS, type Preset } from '@/domain/presets/preset-selection'
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
    fileURLToPath(new URL('../../fixtures/replay-keys/v3.1-corpus.json', import.meta.url)),
    'utf8',
  ),
) as Corpus

/** Generous timeout: the whole corpus replays in a few seconds on a developer machine. */
const TIMEOUT_MS = 300_000

/** Every recorded key, decoded once. */
const DECODED: readonly DecodedPhraseReplayKey[] = CORPUS.cases.map((corpusCase) =>
  decodePhraseReplayKey(corpusCase.key),
)

/** Intent: the instrument a decoded intent names: a built-in id, or my instrument's range. */
function instrumentOf(intent: GenerationIntent): string {
  if (intent.controls.instrumentProfileId !== 'my-instrument') {
    return intent.controls.instrumentProfileId
  }
  const { minMidi, maxMidi } = intent.instrumentProfile.concertRange
  return `my-instrument ${minMidi}-${maxMidi}`
}

/** Intent: the figure levels as one comparable string, the seven figures in FIGURE_IDS order. */
function levelsText(levels: FigureLevels): string {
  return FIGURE_IDS.map((figure) => `${figure}:${levels[figure]}`).join(' ')
}

/** Intent: whether a decoded intent holds a preset's controls and levels in an allowed mode. */
function holdsPreset(intent: GenerationIntent, preset: Preset): boolean {
  return (
    PRESET_HELD_CONTROL_KEYS.every((key) => intent.controls[key] === preset.controls[key]) &&
    levelsText(intent.figureLevels) === levelsText(preset.levels) &&
    allowsKeyAndMode(preset.restriction, intent.writtenTonalCenter, intent.controls.collection)
  )
}

/** The levels of the eight built-in presets, as comparable strings. */
const PRESET_LEVELS = new Set(BUILT_IN_PRESETS.map((preset) => levelsText(preset.levels)))

/** Intent: the distinct values a read gives over a set of decoded keys. */
function valuesOf(
  keys: readonly DecodedPhraseReplayKey[],
  read: (intent: GenerationIntent) => string,
) {
  return new Set(keys.map((key) => read(key.intent)))
}

/**
 * Intent: the standalone phrases (phrase 1, no carry-in) whose levels are no built-in preset's,
 * grouped by figure levels and instrument.
 */
function spreadGroups(): ReadonlyMap<string, readonly DecodedPhraseReplayKey[]> {
  const groups = new Map<string, DecodedPhraseReplayKey[]>()
  for (const key of DECODED) {
    if (key.phraseNumber !== 1 || key.intent.carryIn !== undefined) continue
    const levels = levelsText(key.intent.figureLevels)
    if (PRESET_LEVELS.has(levels)) continue
    const group = `${levels} ${instrumentOf(key.intent)}`
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

describe('v3.1 replay-key corpus (ifk3) recorded on v3.1.0', () => {
  it('holds only ifk3 keys and every built-in preset on every instrument', () => {
    expect(CORPUS.recordedOnAppVersion).toBe('3.1.0')
    expect(CORPUS.keyVersions).toEqual(['ifk3'])
    const labels = CORPUS.cases.map((corpusCase) => corpusCase.label)
    expect(new Set(labels).size).toBe(labels.length)
    expect(new Set(DECODED.map((key) => key.keyVersion))).toEqual(new Set(['ifk3']))
    const instruments = [...valuesOf(DECODED, instrumentOf)]
    for (const builtIn of ['c-keyboard', 'bb-tenor', 'eb-alto'])
      expect(instruments).toContain(builtIn)
    expect(instruments.filter((name) => name.startsWith('my-instrument')).length).toBe(2)
    for (const preset of BUILT_IN_PRESETS) {
      const holding = DECODED.filter((key) => holdsPreset(key.intent, preset))
      expect(valuesOf(holding, instrumentOf).size, preset.id).toBe(5)
    }
  })

  it('gives every figure every level, each spread on every collection and instrument', () => {
    const groups = spreadGroups()
    expect(groups.size).toBe(20)
    const spreads = [...groups.values()].map((keys) => keys[0]!.intent.figureLevels)
    for (const figure of FIGURE_IDS)
      expect(new Set(spreads.map((levels) => levels[figure])), figure).toEqual(
        new Set(FIGURE_LEVEL_IDS),
      )
    expect(new Set(spreads.map(allowsChromaticNotes))).toEqual(new Set([true, false]))
    for (const [group, keys] of groups) {
      const rhythm = valuesOf(
        keys,
        (intent) => `${intent.controls.noteDensity} ${intent.controls.rhythmicVariety}`,
      )
      const variety = valuesOf(
        keys,
        (intent) => `${intent.controls.rhythmicVariety} ${intent.controls.syncopation}`,
      )
      expect(valuesOf(keys, (intent) => intent.controls.collection).size, group).toBe(
        COLLECTIONS.length,
      )
      expect(valuesOf(keys, (intent) => intent.controls.tension).size, group).toBe(4)
      expect(valuesOf(keys, (intent) => intent.controls.leapiness).size, group).toBe(4)
      expect(valuesOf(keys, (intent) => intent.controls.arpeggioChaos).size, group).toBe(3)
      expect(rhythm, group).toContain('Eighth Heavily varied')
      expect(rhythm, group).toContain('Sixteenth Heavily varied')
      expect(variety, group).toContain('Strict Straight')
    }
  })

  it('uses every tension, leapiness and arpeggio chaos, several seeds, no blocked rhythm', () => {
    expect([...valuesOf(DECODED, (intent) => intent.controls.tension)].sort()).toEqual(
      [...TENSION_ARCS].sort(),
    )
    expect([...valuesOf(DECODED, (intent) => intent.controls.leapiness)].sort()).toEqual(
      [...LEAPINESS_VALUES].sort(),
    )
    expect([...valuesOf(DECODED, (intent) => intent.controls.arpeggioChaos)].sort()).toEqual(
      [...ARPEGGIO_CHAOS_VALUES].sort(),
    )
    const seeds = valuesOf(DECODED, (intent) => String(intent.seed))
    for (const seed of ['1', '7', '42']) expect(seeds).toContain(seed)
    for (const [index, key] of DECODED.entries())
      expect(isUnsupportedRhythmSetting(key.intent.controls), CORPUS.cases[index]!.label).toBe(
        false,
      )
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
    expect(mine.some((key) => key.intent.carryIn?.finalHarmony === null)).toBe(true)
    expect(new Set(carried.map((key) => key.phraseNumber))).toEqual(new Set([2, 3]))
  })

  // @test-link [[module_phrase_replay_key]]
  it('decodes every key and re-encodes it to the very same key', () => {
    for (const corpusCase of CORPUS.cases) {
      const decoded = decodePhraseReplayKey(corpusCase.key)
      expect(decoded.keyVersion, corpusCase.label).toBe('ifk3')
      expect(encodePhraseReplayKey(decoded.intent, decoded.phraseNumber), corpusCase.label).toBe(
        corpusCase.key,
      )
    }
  })

  // @test-link [[rule_seeded_phrase_reproduction]]
  // @test-link [[module_phrase_replay_key]]
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
