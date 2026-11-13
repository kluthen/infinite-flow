// @vitest-environment node
/**
 * The v3.2 replay-key corpus: every `ifk4.` key recorded on the code v3.2.0 shipped still decodes,
 * re-encodes to the very same key and replays through the generation worker runtime to the stored
 * timeline, byte for byte. It is the baseline later versions must reproduce at Off. It holds the
 * eight built-in presets on every instrument; four figure-level spreads on every one of the nine
 * modes and every instrument, the three built-ins and two my instruments of different ranges; a
 * rotating spread of the other controls; carry-in chains and key changes receiving a null final
 * harmony; a rhythm lock session's locked, changed and forced-bend phrases; a fresh Jam's phrase 1
 * by each rung, its locked and drifted later phrases, and phrase 1 written again from a kept doodle
 * after a Jam setting changed. The coverage is read from the decoded intents, the lock outcomes
 * from the replays. The fixture is read only: a timeline changed by hand, or a change that alters
 * any v3.2 key's phrase, turns this spec red.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  ARPEGGIO_CHAOS_VALUES,
  COLLECTIONS,
  HARMONIC_MOTIONS,
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
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { allowsKeyAndMode } from '@/domain/presets/key-and-mode-restriction'
import { PRESET_HELD_CONTROL_KEYS, type Preset } from '@/domain/presets/preset-selection'
import {
  decodePhraseReplayKey,
  type DecodedPhraseReplayKey,
} from '@/generation-worker/phrase-replay-key-decode'
import { replayDecodedPhraseKey } from '@/generation-worker/phrase-replay'
import { encodeIfk4PhraseReplayKey } from './ifk4-key-writer'

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
    fileURLToPath(new URL('../../fixtures/replay-keys/v3.2-corpus.json', import.meta.url)),
    'utf8',
  ),
) as Corpus

/** Generous timeout: the whole corpus replays in a few seconds on a developer machine. */
const TIMEOUT_MS = 300_000

/** A recorded case's key decoded, with the case's label and key. */
type DecodedCase = DecodedPhraseReplayKey & { readonly label: string; readonly key: string }

/** Every recorded case with its key decoded once. */
const DECODED: readonly DecodedCase[] = CORPUS.cases.map((corpusCase) => ({
  ...decodePhraseReplayKey(corpusCase.key),
  label: corpusCase.label,
  key: corpusCase.key,
}))

/** The lock outcome each rhythm lock case's label ending names. */
const LOCK_OUTCOMES: readonly (readonly [string, string])[] = [
  ['-lock-p2-locked', 'locked_bars'],
  ['-lock-p3-changed', 'rhythm_change'],
  ['-lock-p4-forced-bend', 'forced_bend'],
]

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

/** Intent: whether a decoded key's intent carries a carry-in from no phrase (a Jam's join). */
function carriesJoin(key: DecodedPhraseReplayKey): boolean {
  const { carryIn } = key.intent
  return carryIn !== undefined && Object.hasOwn(carryIn, 'origin')
}

/**
 * Intent: the standalone phrases of the spread (phrase 1, no carry-in, no lock group, no steering
 * block, no Jam), whose levels are no built-in preset's, grouped by figure levels and instrument.
 */
function spreadGroups(): ReadonlyMap<string, readonly DecodedPhraseReplayKey[]> {
  const groups = new Map<string, DecodedPhraseReplayKey[]>()
  for (const key of DECODED) {
    const { intent } = key
    if (key.phraseNumber !== 1 || intent.carryIn !== undefined) continue
    if (intent.rhythmLock !== undefined || intent.steering !== undefined) continue
    if (key.label.includes('-jam-')) continue
    const levels = levelsText(intent.figureLevels)
    if (PRESET_LEVELS.has(levels)) continue
    const group = `${levels} ${instrumentOf(intent)}`
    groups.set(group, [...(groups.get(group) ?? []), key])
  }
  return groups
}

/** Intent: the outcome a key replays to through a fresh worker runtime, or a loud failure. */
function replayOutcome(key: string): Extract<GenerationOutcome, { kind: 'generation_success' }> {
  const report = replayDecodedPhraseKey(key, decodePhraseReplayKey(key))
  if (
    report.output.kind !== 'generation_success' ||
    report.output.raw.kind !== 'generation_success'
  )
    throw new Error(`Key no longer replays to a phrase: ${report.output.kind}.`)
  return report.output.raw
}

/** Intent: the decoded cases whose label holds the given text. */
function labelled(text: string): readonly DecodedCase[] {
  return DECODED.filter((key) => key.label.includes(text))
}

describe('v3.2 replay-key corpus (ifk4) recorded on v3.2.0', () => {
  it('holds only ifk4 keys and every built-in preset on every instrument', () => {
    expect(CORPUS.recordedOnAppVersion).toBe('3.2.0')
    expect(CORPUS.keyVersions).toEqual(['ifk4'])
    const labels = CORPUS.cases.map((corpusCase) => corpusCase.label)
    expect(new Set(labels).size).toBe(labels.length)
    expect(new Set(DECODED.map((key) => key.keyVersion))).toEqual(new Set(['ifk4']))
    const instruments = [...valuesOf(DECODED, instrumentOf)]
    for (const builtIn of ['c-keyboard', 'bb-tenor', 'eb-alto'])
      expect(instruments).toContain(builtIn)
    expect(instruments.filter((name) => name.startsWith('my-instrument')).length).toBe(2)
    for (const preset of BUILT_IN_PRESETS) {
      const holding = DECODED.filter((key) => holdsPreset(key.intent, preset))
      expect(valuesOf(holding, instrumentOf).size, preset.id).toBe(5)
    }
  })

  it('gives every figure every level, each spread on every mode and instrument', () => {
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
      expect(valuesOf(keys, (intent) => intent.controls.harmonicMotion).size, group).toBe(
        HARMONIC_MOTIONS.length,
      )
      expect(valuesOf(keys, (intent) => intent.controls.tension).size, group).toBe(4)
      expect(valuesOf(keys, (intent) => intent.controls.leapiness).size, group).toBe(4)
      expect(valuesOf(keys, (intent) => intent.controls.arpeggioChaos).size, group).toBe(3)
      expect(rhythm, group).toContain('Eighth Heavily varied')
      expect(rhythm, group).toContain('Sixteenth Heavily varied')
      expect(variety, group).toContain('Strict Straight')
    }
  })

  it('uses every harmonic motion, tension, leapiness, chaos, several seeds, no blocked rhythm', () => {
    expect([...valuesOf(DECODED, (intent) => intent.controls.harmonicMotion)].sort()).toEqual(
      [...HARMONIC_MOTIONS].sort(),
    )
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
    for (const seed of ['3', '19', '64']) expect(seeds).toContain(seed)
    for (const key of DECODED)
      expect(isUnsupportedRhythmSetting(key.intent.controls), key.label).toBe(false)
  })

  it('holds carry-in phrases, with my instrument and with a null final harmony', () => {
    const carried = DECODED.filter((key) => key.intent.carryIn !== undefined && !carriesJoin(key))
    expect(carried.some((key) => key.intent.carryIn?.finalHarmony === null)).toBe(true)
    expect(carried.some((key) => key.intent.carryIn?.finalHarmony !== null)).toBe(true)
    const mine = carried.filter(
      (key) => key.intent.controls.instrumentProfileId === 'my-instrument',
    )
    expect(mine.some((key) => key.intent.carryIn?.finalHarmony === null)).toBe(true)
    expect(new Set(carried.map((key) => key.phraseNumber))).toEqual(new Set([2, 3, 4]))
  })

  it("holds a fresh Jam's phrase 1 by each rung, locked and drifted Jam phrases, a kept doodle", () => {
    const rungOne = labelled('-rung1-p1')
    expect(rungOne).toHaveLength(3)
    for (const key of rungOne) {
      expect(carriesJoin(key), key.label).toBe(true)
      expect(key.intent.steering, key.label).toBeDefined()
    }
    const rungTwo = labelled('-rung2-p1')
    expect(rungTwo).toHaveLength(3)
    for (const key of rungTwo) {
      expect(key.intent.carryIn, key.label).toBeUndefined()
      expect(key.intent.steering, key.label).toBeDefined()
    }
    const rungThree = labelled('-rung3-p1')
    expect(rungThree).toHaveLength(3)
    for (const key of rungThree) {
      expect(key.intent.steering, key.label).toBeUndefined()
      expect(key.intent.rhythmLock, key.label).toBeUndefined()
    }
    const phraseOnes = [...rungOne, ...rungTwo]
    expect(phraseOnes.some((key) => key.intent.rhythmLock?.state.kind === 'pending')).toBe(true)
    expect(phraseOnes.some((key) => key.intent.rhythmLock === undefined)).toBe(true)
    const later = DECODED.filter((key) => key.phraseNumber > 1 && key.intent.steering !== undefined)
    expect(later.some((key) => key.intent.rhythmLock?.state.kind === 'locked')).toBe(true)
    expect(new Set(later.map((key) => key.intent.steering!.targetRhythm.band))).toEqual(
      new Set(['close', 'near', 'unbounded']),
    )
    const kept = labelled('-kept-')
    expect(kept).toHaveLength(2)
    for (const key of kept) expect(key.intent.steering, key.label).toBeDefined()
  })

  // @test-link [[module_phrase_replay_key]]
  it('decodes every key as ifk4 and re-encodes it to the very same key', () => {
    for (const corpusCase of CORPUS.cases) {
      const decoded = decodePhraseReplayKey(corpusCase.key)
      expect(decoded.keyVersion, corpusCase.label).toBe('ifk4')
      expect(
        encodeIfk4PhraseReplayKey(decoded.intent, decoded.phraseNumber),
        corpusCase.label,
      ).toBe(corpusCase.key)
    }
  })

  // @test-link [[module_phrase_replay_key]]
  it('replays each rhythm lock case to its lock outcome', () => {
    for (const [ending, outcome] of LOCK_OUTCOMES) {
      const cases = DECODED.filter((key) => key.label.endsWith(ending))
      expect(cases, ending).toHaveLength(3)
      for (const key of cases)
        expect(replayOutcome(key.key).provenance.rhythmLockOutcome, key.label).toBe(outcome)
    }
  })

  // @test-link [[rule_seeded_phrase_reproduction]]
  // @test-link [[module_phrase_replay_key]]
  it(
    'replays every key to its stored timeline byte for byte',
    () => {
      for (const corpusCase of CORPUS.cases) {
        expect(
          JSON.stringify(replayOutcome(corpusCase.key).result.timeline),
          corpusCase.label,
        ).toBe(JSON.stringify(corpusCase.timeline))
      }
    },
    TIMEOUT_MS,
  )
})
