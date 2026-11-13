// @vitest-environment node
/**
 * The `ifk5.` replay key, written for every phrase from v3.3: the `ifk4.` 9-tuple with the same
 * meaning, plus the chord families (the Seventh chords level by capability name) at index 9, and a
 * carry-in whose carried chord may hold its seventh. Encoding then decoding returns an equal
 * intent and replaying it gives the generated phrase, at each level, with and without a carried
 * seventh; every recorded older key still decodes at Off; a malformed level, an unknown capability
 * or a malformed carried seventh is refused with the reason, and `ifk6.` is an unsupported version.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it, vi } from 'vitest'

import {
  OFF_CHORD_FAMILIES,
  type ChordFamilies,
  type ChordFamilyLevel,
} from '@/domain/chords/chord-families'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { CarryInError, makeCarryIn, type CarryIn } from '@/domain/generation/carry-in/carry-in'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { RequestRhythmLock } from '@/domain/generation/request-rhythm-lock'
import type { SteeringBlock } from '@/domain/generation/steering-block'
import { makeMyInstrument } from '@/domain/profile/my-instrument'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { makeSeed } from '@/domain/random/seed'
import { replayPhraseKey } from '@/generation-worker/phrase-replay'
import {
  announcePhraseReplayKey,
  encodePhraseReplayKey,
  PhraseReplayKeyError,
} from '@/generation-worker/phrase-replay-key'
import { decodePhraseReplayKey } from '@/generation-worker/phrase-replay-key-decode'
import {
  BASE_CONTROLS,
  carryInAfter,
  generateSuccess,
} from '../domain/generation/carry-in/carry-in-fixture'
import { SAMPLE_RHYTHM_LOCK, SAMPLE_STEERING } from '../domain/generation/request-inputs-fixture'
import { encodeIfk4PhraseReplayKey } from './ifk4-key-writer'

/** Generous per-test timeout: the replay cases generate each phrase twice. */
const TIMEOUT_MS = 120_000

/** The four Seventh chords levels, Off first. */
const LEVELS: readonly ChordFamilyLevel[] = ['off', 'sometimes', 'favored', 'stronglyFavored']

/** My instrument written C3 to E5, sounding a minor third lower. */
const HORN_IN_A = makeMyInstrument({
  template: 'c-keyboard',
  name: 'My horn in A',
  clef: 'treble',
  writtenRange: { minMidi: 48, maxMidi: 76 },
  transposition: { octaves: 0, semitones: 3, direction: 'lower' },
})

/** The doodle's join into a Middle phrase 1: a carry-in from no phrase. */
const NO_PHRASE_CARRY_IN = makeCarryIn({
  origin: 'none',
  lastPitch: { midi: makeConcertPitch(60), arrivingInterval: null, recovery: { kind: 'settled' } },
  registerWindow: makeRegisterWindow(54, 66),
  finalHarmony: null,
})

/** Intent: the chord families holding one Seventh chords level. */
function familiesAt(level: ChordFamilyLevel): ChordFamilies {
  return { 'seventh-chords': level }
}

/** Intent: a real C major phrase intent at a level, built-in or my instrument, with a carry-in. */
function intentAt(
  seed: number,
  level: ChordFamilyLevel,
  options: {
    readonly carryIn?: CarryIn
    readonly mine?: boolean
    readonly rhythmLock?: RequestRhythmLock
    readonly steering?: SteeringBlock
  } = {},
): GenerationIntent {
  const mine = options.mine === true
  const input = {
    requestId: makeRequestId(`ifk5-${seed}`),
    seed: makeSeed(seed),
    controls: makeGenerationControls({
      ...BASE_CONTROLS,
      ...(mine ? { tonalCenter: 'D', instrumentProfileId: 'my-instrument' } : {}),
    }),
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    chordFamilies: familiesAt(level),
    ...(mine ? { instrumentProfile: HORN_IN_A.profile } : {}),
    ...(options.rhythmLock === undefined ? {} : { rhythmLock: options.rhythmLock }),
    ...(options.steering === undefined ? {} : { steering: options.steering }),
  }
  return options.carryIn === undefined
    ? createGenerationIntent(input)
    : makeCarryInGenerationIntent({ ...input, carryIn: options.carryIn })
}

/**
 * Intent: the carry-in a Mostly phrase 1 (seed 5, every event in seventh form) hands forward: its
 * final chord G7, the key's own seventh on degree 5, carried with its seventh.
 */
function carriedSeventhCarryIn(): CarryIn {
  const first = intentAt(5, 'stronglyFavored')
  const carryIn = carryInAfter(first, generateSuccess(first), 1)
  expect(carryIn.finalHarmony?.seventh).toStrictEqual({
    pitchClass: 5,
    quality: 'dominant-seventh',
  })
  return carryIn
}

/** Intent: unpadded base64url of raw bytes, for hand-built payloads. */
function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '')
}

/** Intent: encode any JSON value as a key of the given version, bypassing the codec's encoder. */
function rawKey(version: string, payload: unknown): string {
  return `${version}.${base64Url(new TextEncoder().encode(JSON.stringify(payload)))}`
}

/** Intent: the JSON payload of a key, read back without the codec's decoder. */
function payloadOf(key: string): unknown[] {
  const payload = key
    .slice(key.indexOf('.') + 1)
    .replace(/-/gu, '+')
    .replace(/_/gu, '/')
  const binary = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown[]
}

/** Intent: what a key replays to through the headless worker path, failing loudly on a crash. */
function replayedRaw(key: string): unknown {
  const report = replayPhraseKey(key)
  if (report.output.kind === 'crash') throw new Error(report.output.message)
  return report.output.raw
}

/** Intent: the valid `ifk5.` 10-tuple of a phrase 2 joined after a carried seventh, to corrupt. */
function carriedSeventhTuple(): unknown[] {
  return payloadOf(
    encodePhraseReplayKey(intentAt(12, 'favored', { carryIn: carriedSeventhCarryIn() }), 2),
  )
}

/** Intent: a valid `ifk5.` tuple of a plain Sometimes phrase with one slot replaced. */
function tupleWith(index: number, value: unknown): unknown[] {
  const tuple = payloadOf(encodePhraseReplayKey(intentAt(6, 'sometimes'), 1))
  tuple[index] = value
  return tuple
}

// @test-link [[module_phrase_replay_key]]
// @test-link [[rule_seventh_chord_draws_reproducible]]
describe('the ifk5 key', () => {
  it('is written for every phrase: ten entries, the first nine an ifk4 key would hold, the level at 9', () => {
    for (const mine of [false, true])
      for (const level of LEVELS) {
        const key = encodePhraseReplayKey(intentAt(7, level, { mine }), 1)
        const tuple = payloadOf(key)
        expect(key).toMatch(/^ifk5\.[A-Za-z0-9_-]+$/u)
        expect(tuple).toHaveLength(10)
        expect(tuple.slice(0, 9)).toEqual(
          payloadOf(encodeIfk4PhraseReplayKey(intentAt(7, 'off', { mine }), 1)),
        )
        expect(tuple[9]).toEqual({ 'seventh-chords': level })
      }
  })

  it('holds a carried seventh chord in the carry-in slot, with its seventh', () => {
    const carryIn = carriedSeventhCarryIn()
    const tuple = payloadOf(encodePhraseReplayKey(intentAt(12, 'off', { carryIn }), 2))
    expect(tuple[5]).toEqual(JSON.parse(JSON.stringify(carryIn)))
    expect((tuple[5] as { finalHarmony: { seventh: unknown } }).finalHarmony.seventh).toEqual({
      pitchClass: 5,
      quality: 'dominant-seventh',
    })
  })

  it('leaves the ifk4 key to a test-only writer, which refuses a carried seventh', () => {
    const intent = intentAt(12, 'off', { carryIn: carriedSeventhCarryIn() })
    expect(encodePhraseReplayKey(intent, 2).startsWith('ifk5.')).toBe(true)
    expect(() => encodeIfk4PhraseReplayKey(intent, 2)).toThrow(PhraseReplayKeyError)
    expect(() => encodeIfk4PhraseReplayKey(intent, 2)).toThrow(/carried seventh chord.*"ifk4"/u)
  })

  it('is announced for a phrase at every level, on one console line', () => {
    for (const level of LEVELS) {
      const intent = intentAt(8, level)
      const log = vi.fn()
      announcePhraseReplayKey(intent, { source: 'workspace' }, log)
      expect(log).toHaveBeenCalledTimes(1)
      const line = log.mock.calls[0]![0] as string
      expect(line.split('\n')).toHaveLength(1)
      const key = line.split(' · ')[3]!
      expect(key).toBe(encodePhraseReplayKey(intent, 1))
      expect(decodePhraseReplayKey(key).intent.chordFamilies).toStrictEqual(familiesAt(level))
    }
  })
})

// @test-link [[module_phrase_replay_key]]
// @test-link [[rule_seventh_chord_draws_reproducible]]
// @test-link [[rule_seeded_phrase_reproduction]]
describe('an ifk5 key round-trips and replays to the same phrase', () => {
  it(
    'gives an equal intent and the same outcome at each level, with and without a carried seventh',
    () => {
      const carryIn = carriedSeventhCarryIn()
      for (const level of LEVELS)
        for (const [label, intent, phraseNumber] of [
          [`${level}, phrase 1`, intentAt(5, level), 1],
          [`${level}, joined after a carried seventh`, intentAt(12, level, { carryIn }), 2],
        ] as const) {
          const key = encodePhraseReplayKey(intent, phraseNumber)
          const decoded = decodePhraseReplayKey(key)
          expect(decoded.keyVersion, label).toBe('ifk5')
          expect(decoded.phraseNumber, label).toBe(phraseNumber)
          expect(decoded.intent, label).toStrictEqual(intent)
          expect(JSON.stringify(decoded.intent), label).toBe(JSON.stringify(intent))
          const generated = generatePhrase(intent)
          expect(generated.kind, label).toBe('generation_success')
          expect(JSON.stringify(replayedRaw(key)), label).toBe(JSON.stringify(generated))
        }
    },
    TIMEOUT_MS,
  )

  it('round-trips every request group at every level, for a built-in and for my instrument', () => {
    const groups = [
      { rhythmLock: SAMPLE_RHYTHM_LOCK },
      { steering: SAMPLE_STEERING },
      { rhythmLock: SAMPLE_RHYTHM_LOCK, steering: SAMPLE_STEERING },
    ]
    for (const mine of [false, true])
      for (const level of LEVELS)
        for (const group of groups) {
          const intent = intentAt(9, level, { mine, ...group })
          const rebuilt = decodePhraseReplayKey(encodePhraseReplayKey(intent, 1)).intent
          expect(rebuilt).toStrictEqual(intent)
        }
  })
})

// @test-link [[module_phrase_replay_key]]
// @test-link [[entity_phrase_carry_in]]
describe('ifk5 decoding refuses a malformed key with the reason', () => {
  it('refuses a payload that is not a 10-entry array', () => {
    const nine = tupleWith(9, null).slice(0, 9)
    expect(() => decodePhraseReplayKey(rawKey('ifk5', nine))).toThrow(PhraseReplayKeyError)
    expect(() => decodePhraseReplayKey(rawKey('ifk5', nine))).toThrow(
      'Phrase replay key "ifk5" payload must be an array of exactly 10 entries.',
    )
  })

  it('refuses a chord families slot that is not an object, naming it', () => {
    for (const value of [null, 'off', ['off']]) {
      const key = rawKey('ifk5', tupleWith(9, value))
      expect(() => decodePhraseReplayKey(key)).toThrow(
        'Phrase replay key slot 9 (chordFamilies) has the wrong type.',
      )
    }
  })

  it('refuses an unknown capability, an unknown level or a missing capability, with the reason', () => {
    for (const [families, reason] of [
      [
        { 'seventh-chords': 'off', 'ninth-chords': 'sometimes' },
        'Chord families name an unknown family "ninth-chords".',
      ],
      [
        { 'seventh-chords': 'always' },
        'Chord families give "seventh-chords" the unknown level "always"',
      ],
      [{}, 'Chord families are missing the family "seventh-chords".'],
    ] as const) {
      const key = rawKey('ifk5', tupleWith(9, families))
      expect(() => decodePhraseReplayKey(key)).toThrow(PhraseReplayKeyError)
      expect(() => decodePhraseReplayKey(key)).toThrow(
        `Phrase replay key slot 9 (chordFamilies) is invalid: ${reason}`,
      )
    }
  })

  it('refuses a malformed carried seventh with the carry-in reason', () => {
    for (const [seventh, reason] of [
      [
        { pitchClass: 5, quality: 'major-seventh' },
        'The carried seventh chord quality is "major-seventh", but its notes form a "dominant-seventh" chord.',
      ],
      [
        { pitchClass: 4, quality: 'dominant-seventh' },
        "The carried fourth note 4 is not the seventh of the chord's own degree: the four notes form no seventh chord.",
      ],
      [
        { pitchClass: 12, quality: 'dominant-seventh' },
        'The carried seventh must be a pitch class 0-11, got 12.',
      ],
      [
        { pitchClass: 5, quality: 'ninth' },
        'The carried seventh chord quality "ninth" is unknown.',
      ],
    ] as const) {
      const tuple = carriedSeventhTuple()
      ;(tuple[5] as { finalHarmony: Record<string, unknown> }).finalHarmony.seventh = seventh
      expect(() => decodePhraseReplayKey(rawKey('ifk5', tuple))).toThrow(CarryInError)
      expect(() => decodePhraseReplayKey(rawKey('ifk5', tuple))).toThrow(reason)
    }
  })

  it("checks a carried seventh's stack and quality, not its fit to the key: a G major seventh in C major passes", () => {
    const tuple = carriedSeventhTuple()
    const carried = tuple[5] as { finalHarmony: Record<string, unknown> }
    carried.finalHarmony.seventh = { pitchClass: 6, quality: 'major-seventh' }
    const decoded = decodePhraseReplayKey(rawKey('ifk5', tuple))
    expect(decoded.intent.carryIn?.finalHarmony?.seventh).toStrictEqual({
      pitchClass: 6,
      quality: 'major-seventh',
    })
  })

  it('takes the join from no phrase beside a steering block, at a level above Off', () => {
    const joined = intentAt(14, 'favored', {
      carryIn: NO_PHRASE_CARRY_IN,
      steering: SAMPLE_STEERING,
    })
    expect(decodePhraseReplayKey(encodePhraseReplayKey(joined, 1)).intent).toStrictEqual(joined)
  })

  it('refuses an ifk6 key as an unsupported version', () => {
    const key = rawKey('ifk6', tupleWith(9, OFF_CHORD_FAMILIES))
    expect(() => decodePhraseReplayKey(key)).toThrow(PhraseReplayKeyError)
    expect(() => decodePhraseReplayKey(key)).toThrow(
      'Phrase replay key has unsupported key version "ifk6"; only "ifk1", "ifk2", "ifk3", "ifk4" and "ifk5" are supported.',
    )
  })
})

/**
 * The four recorded replay-key corpora: v2.0's `ifk1.` keys, v3.0's `ifk1.` and `ifk2.` keys,
 * v3.1's `ifk3.` keys and v3.2's `ifk4.` keys.
 */
const RECORDED_CORPORA = [
  'ifk1-v2.0.json',
  'v3.0-neutral-jazz.json',
  'v3.1-corpus.json',
  'v3.2-corpus.json',
] as const

/** Intent: every key a recorded corpus file holds. */
function recordedKeys(file: string): readonly string[] {
  const corpus = JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../../fixtures/replay-keys/${file}`, import.meta.url)),
      'utf8',
    ),
  ) as { readonly cases: readonly { readonly key: string }[] }
  return corpus.cases.map((corpusCase) => corpusCase.key)
}

// @test-link [[module_phrase_replay_key]]
// @test-link [[rule_seventh_chords_off_changes_nothing]]
describe('every recorded older key and the ifk5 key', () => {
  it(
    'decodes every ifk1 to ifk4 key at Off with a triad carried, and its ifk5 re-encoding to an equal intent',
    () => {
      const versions = new Set<string>()
      for (const file of RECORDED_CORPORA)
        for (const key of recordedKeys(file)) {
          const decoded = decodePhraseReplayKey(key)
          versions.add(decoded.keyVersion)
          expect(decoded.intent.chordFamilies, key).toStrictEqual(OFF_CHORD_FAMILIES)
          expect(decoded.intent.carryIn?.finalHarmony?.seventh, key).toBeUndefined()
          const ifk5 = encodePhraseReplayKey(decoded.intent, decoded.phraseNumber)
          expect(ifk5.startsWith('ifk5.'), key).toBe(true)
          const reDecoded = decodePhraseReplayKey(ifk5)
          expect(reDecoded.intent, key).toStrictEqual(decoded.intent)
          expect(reDecoded.phraseNumber, key).toBe(decoded.phraseNumber)
        }
      expect([...versions].sort()).toEqual(['ifk1', 'ifk2', 'ifk3', 'ifk4'])
    },
    TIMEOUT_MS,
  )
})
