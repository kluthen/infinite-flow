// @vitest-environment node
/**
 * My instrument in the phrase replay key. The `ifk2.` keys v3.0 wrote (the seven `ifk1.` entries
 * followed by my instrument's display name, concert range and transposition), recorded here as
 * fixed strings, still decode to an equal intent holding the profile's levels and replay to the
 * same timeline, as v3.0's built-in `ifk1.` keys do. Every phrase now encodes as `ifk3.`: my
 * instrument's entry at index 6, `null` there for a built-in, and the key decodes back to an equal
 * intent that replays to the same timeline. The key holds no clef, so two phrases differing only
 * by the clef share one key. A malformed key, a key whose version or entry disagrees with its
 * instrument, and a profile no my instrument can have are all rejected.
 */

import { describe, expect, it } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { makeRequestId } from '@/domain/generation/generation-request'
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import {
  makeMyInstrument,
  MyInstrumentError,
  type MyInstrument,
} from '@/domain/profile/my-instrument'
import { TranspositionIntervalError } from '@/domain/profile/transposition-interval'
import { makeSeed } from '@/domain/random/seed'
import { replayPhraseKey } from '@/generation-worker/phrase-replay'
import {
  announcePhraseReplayKey,
  encodePhraseReplayKey,
  PHRASE_REPLAY_KEY_CONTROL_ORDER,
  PhraseReplayKeyError,
} from '@/generation-worker/phrase-replay-key'
import { decodePhraseReplayKey } from '@/generation-worker/phrase-replay-key-decode'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import {
  BASE_CONTROLS,
  buildIntent,
  carryInAfter,
  generateSuccess,
} from '../domain/generation/carry-in/carry-in-fixture'

/** Generous per-test timeout: the replay cases generate each phrase twice. */
const TIMEOUT_MS = 120_000

/**
 * Intent: my instrument written C3 to E5, inside both clefs' bounds, sounding a minor third lower,
 * in the given clef.
 */
function hornInA(clef: InstrumentClef = 'treble'): MyInstrument {
  return makeMyInstrument({
    template: 'c-keyboard',
    name: 'My horn in A',
    clef,
    writtenRange: { minMidi: 48, maxMidi: 76 },
    transposition: { octaves: 0, semitones: 3, direction: 'lower' },
  })
}

/** My instrument sounding a major ninth lower, with a non-ASCII name, from the tenor template. */
const BARITONE = makeMyInstrument({
  template: 'bb-tenor',
  name: 'Saxo baryton à moi',
  clef: 'bass',
  writtenRange: { minMidi: 50, maxMidi: 76 },
  transposition: { octaves: 1, semitones: 2, direction: 'lower' },
})

/** Intent: the baritone, as a recorded key's instrument. */
function baritone(): MyInstrument {
  return BARITONE
}

/** Intent: a real intent for my instrument with a seed and an optional carry-in. */
function myInstrumentIntent(
  instrument: MyInstrument,
  seed: number,
  carryIn?: GenerationIntent['carryIn'],
): GenerationIntent {
  const input = {
    requestId: makeRequestId(`ifk2-${seed}`),
    seed: makeSeed(seed),
    controls: makeGenerationControls({
      ...BASE_CONTROLS,
      tonalCenter: 'D',
      instrumentProfileId: 'my-instrument',
    }),
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    instrumentProfile: instrument.profile,
  }
  return carryIn === undefined
    ? createGenerationIntent(input)
    : makeCarryInGenerationIntent({ ...input, carryIn })
}

/** Intent: unpadded base64url of raw bytes, for hand-built payloads. */
function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '')
}

/** Intent: a key of the given version over any JSON value, bypassing the codec's encoder. */
function rawKey(version: 'ifk1' | 'ifk2' | 'ifk3', payload: unknown): string {
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

/**
 * Intent: the seven `ifk1.` entries v3.0 wrote for an intent and phrase number, its profile slots
 * holding the customized Neutral every intent here is built with.
 */
function ifk1EntriesOf(intent: GenerationIntent, phraseNumber: number): unknown[] {
  return JSON.parse(
    JSON.stringify([
      intent.requestId,
      intent.seed,
      PHRASE_REPLAY_KEY_CONTROL_ORDER.map((key) =>
        key === 'tonalCenter' ? intent.writtenTonalCenter : intent.controls[key],
      ),
      'Neutral',
      true,
      phraseNumber,
      intent.carryIn ?? null,
    ]),
  ) as unknown[]
}

/** Intent: my instrument's owning profile fields as a key stores them. */
function entryOf(instrument: MyInstrument): readonly unknown[] {
  const { displayName, concertRange, transposition } = instrument.profile
  return [
    displayName,
    concertRange.minMidi,
    concertRange.maxMidi,
    transposition.chromatic,
    transposition.diatonic,
  ]
}

/** One `ifk2.` key v3.0 wrote for a my-instrument phrase 1, frozen here, never regenerated. */
interface RecordedIfk2Key {
  readonly instrument: () => MyInstrument
  readonly seed: number
  readonly key: string
}

/** The `ifk2.` keys v3.0 wrote for `myInstrumentIntent(instrument, seed)`, phrase 1. */
const RECORDED_IFK2_KEYS: readonly RecordedIfk2Key[] = [
  {
    instrument: hornInA,
    seed: 0,
    key: [
      'ifk2.WyJpZmsyLTAiLDAsWzkwLCJEIiwiTWFqb3IiLCJHZW50bGUgZGlhdG9uaWMiLCJTZXR0bGVkIiwiUXVhc',
      'nRlciIsIlNsaWdodGx5IHZhcmllZCIsIlN0cmFpZ2h0IiwiU3BhcnNlIiwiV2FuZGVyaW5nIiwiTWlkZGxlIiw',
      'iTGVhcGluZyIsIlByZWRpY3RhYmxlIiwibXktaW5zdHJ1bWVudCJdLCJOZXV0cmFsIix0cnVlLDEsbnVsbCxbI',
      'k15IGhvcm4gaW4gQSIsNDUsNzMsMywyXV0',
    ].join(''),
  },
  {
    instrument: hornInA,
    seed: 3,
    key: [
      'ifk2.WyJpZmsyLTMiLDMsWzkwLCJEIiwiTWFqb3IiLCJHZW50bGUgZGlhdG9uaWMiLCJTZXR0bGVkIiwiUXVhc',
      'nRlciIsIlNsaWdodGx5IHZhcmllZCIsIlN0cmFpZ2h0IiwiU3BhcnNlIiwiV2FuZGVyaW5nIiwiTWlkZGxlIiw',
      'iTGVhcGluZyIsIlByZWRpY3RhYmxlIiwibXktaW5zdHJ1bWVudCJdLCJOZXV0cmFsIix0cnVlLDEsbnVsbCxbI',
      'k15IGhvcm4gaW4gQSIsNDUsNzMsMywyXV0',
    ].join(''),
  },
  {
    instrument: hornInA,
    seed: 0xffffffff,
    key: [
      'ifk2.WyJpZmsyLTQyOTQ5NjcyOTUiLDQyOTQ5NjcyOTUsWzkwLCJEIiwiTWFqb3IiLCJHZW50bGUgZGlhdG9ua',
      'WMiLCJTZXR0bGVkIiwiUXVhcnRlciIsIlNsaWdodGx5IHZhcmllZCIsIlN0cmFpZ2h0IiwiU3BhcnNlIiwiV2F',
      'uZGVyaW5nIiwiTWlkZGxlIiwiTGVhcGluZyIsIlByZWRpY3RhYmxlIiwibXktaW5zdHJ1bWVudCJdLCJOZXV0c',
      'mFsIix0cnVlLDEsbnVsbCxbIk15IGhvcm4gaW4gQSIsNDUsNzMsMywyXV0',
    ].join(''),
  },
  {
    instrument: baritone,
    seed: 7,
    key: [
      'ifk2.WyJpZmsyLTciLDcsWzkwLCJEIiwiTWFqb3IiLCJHZW50bGUgZGlhdG9uaWMiLCJTZXR0bGVkIiwiUXVhc',
      'nRlciIsIlNsaWdodGx5IHZhcmllZCIsIlN0cmFpZ2h0IiwiU3BhcnNlIiwiV2FuZGVyaW5nIiwiTWlkZGxlIiw',
      'iTGVhcGluZyIsIlByZWRpY3RhYmxlIiwibXktaW5zdHJ1bWVudCJdLCJOZXV0cmFsIix0cnVlLDEsbnVsbCxbI',
      'lNheG8gYmFyeXRvbiDDoCBtb2kiLDM2LDYyLDE0LDhdXQ',
    ].join(''),
  },
  {
    instrument: baritone,
    seed: 42,
    key: [
      'ifk2.WyJpZmsyLTQyIiw0MixbOTAsIkQiLCJNYWpvciIsIkdlbnRsZSBkaWF0b25pYyIsIlNldHRsZWQiLCJRd',
      'WFydGVyIiwiU2xpZ2h0bHkgdmFyaWVkIiwiU3RyYWlnaHQiLCJTcGFyc2UiLCJXYW5kZXJpbmciLCJNaWRkbGU',
      'iLCJMZWFwaW5nIiwiUHJlZGljdGFibGUiLCJteS1pbnN0cnVtZW50Il0sIk5ldXRyYWwiLHRydWUsMSxudWxsL',
      'FsiU2F4byBiYXJ5dG9uIMOgIG1vaSIsMzYsNjIsMTQsOF1d',
    ].join(''),
  },
]

/**
 * The `ifk2.` key v3.0 wrote for the baritone's phrase 2 (seed 12), carrying the carry-in of its
 * phrase 1 (seed 11). Frozen here, never regenerated.
 */
const RECORDED_IFK2_CARRY_IN_KEY = [
  'ifk2.WyJpZmsyLTEyIiwxMixbOTAsIkQiLCJNYWpvciIsIkdlbnRsZSBkaWF0b25pYyIsIlNldHRsZWQiLCJRd',
  'WFydGVyIiwiU2xpZ2h0bHkgdmFyaWVkIiwiU3RyYWlnaHQiLCJTcGFyc2UiLCJXYW5kZXJpbmciLCJNaWRkbGU',
  'iLCJMZWFwaW5nIiwiUHJlZGljdGFibGUiLCJteS1pbnN0cnVtZW50Il0sIk5ldXRyYWwiLHRydWUsMix7Imxhc',
  '3RQaXRjaCI6eyJtaWRpIjo0NywiYXJyaXZpbmdJbnRlcnZhbCI6MCwicmVjb3ZlcnkiOnsia2luZCI6InNldHR',
  'sZWQifX0sInJlZ2lzdGVyV2luZG93Ijp7ImtpbmQiOiJSZWdpc3RlcldpbmRvdyIsIm1pbk1pZGkiOjQyLCJtY',
  'XhNaWRpIjo1NX0sImZpbmFsSGFybW9ueSI6eyJ0cmlhZCI6eyJkZWdyZWUiOjUsInBpdGNoQ2xhc3NlcyI6Wzc',
  'sMTEsMl0sInF1YWxpdHkiOiJtYWpvciJ9LCJyb2xlIjoib3Blbl9hcnJpdmFsIiwiZW5kcG9pbnQiOnsia2luZ',
  'CI6InRvbmFsX2RlZ3JlZV9maXZlX2Nob3JkX3RvbmUiLCJkZWdyZWUiOjV9fSwicGhyYXNlTnVtYmVyIjoxfSx',
  'bIlNheG8gYmFyeXRvbiDDoCBtb2kiLDM2LDYyLDE0LDhdXQ',
].join('')

/** The `ifk1.` keys v3.0 wrote for `buildIntent({ seed: 4 })` on each built-in, phrase 1. */
const RECORDED_IFK1_BUILT_IN_KEYS = {
  'c-keyboard': [
    'ifk1.WyJjYXJyeS1pbi00Iiw0LFs5MCwiQyIsIk1ham9yIiwiR2VudGxlIGRpYXRvbmljIiwiU2V0dGxlZCIsI',
    'lF1YXJ0ZXIiLCJTbGlnaHRseSB2YXJpZWQiLCJTdHJhaWdodCIsIlNwYXJzZSIsIldhbmRlcmluZyIsIk1pZGR',
    'sZSIsIkxlYXBpbmciLCJQcmVkaWN0YWJsZSIsImMta2V5Ym9hcmQiXSwiTmV1dHJhbCIsdHJ1ZSwxLG51bGxd',
  ].join(''),
  'bb-tenor': [
    'ifk1.WyJjYXJyeS1pbi00Iiw0LFs5MCwiQyIsIk1ham9yIiwiR2VudGxlIGRpYXRvbmljIiwiU2V0dGxlZCIsI',
    'lF1YXJ0ZXIiLCJTbGlnaHRseSB2YXJpZWQiLCJTdHJhaWdodCIsIlNwYXJzZSIsIldhbmRlcmluZyIsIk1pZGR',
    'sZSIsIkxlYXBpbmciLCJQcmVkaWN0YWJsZSIsImJiLXRlbm9yIl0sIk5ldXRyYWwiLHRydWUsMSxudWxsXQ',
  ].join(''),
  'eb-alto': [
    'ifk1.WyJjYXJyeS1pbi00Iiw0LFs5MCwiQyIsIk1ham9yIiwiR2VudGxlIGRpYXRvbmljIiwiU2V0dGxlZCIsI',
    'lF1YXJ0ZXIiLCJTbGlnaHRseSB2YXJpZWQiLCJTdHJhaWdodCIsIlNwYXJzZSIsIldhbmRlcmluZyIsIk1pZGR',
    'sZSIsIkxlYXBpbmciLCJQcmVkaWN0YWJsZSIsImViLWFsdG8iXSwiTmV1dHJhbCIsdHJ1ZSwxLG51bGxd',
  ].join(''),
} as const

/** Intent: the baritone's phrase 2 (seed 12), carrying the carry-in of its phrase 1 (seed 11). */
function baritonePhraseTwo(): GenerationIntent {
  const first = myInstrumentIntent(BARITONE, 11)
  const carryIn = carryInAfter(first, generateSuccess(first), 1)
  return myInstrumentIntent(BARITONE, 12, carryIn)
}

/** Intent: the valid `ifk2.` 8-tuple of the horn in A's phrase 1, as a mutable array to corrupt. */
function validTuple(): unknown[] {
  return payloadOf(RECORDED_IFK2_KEYS[1]!.key)
}

/** Intent: the valid 8-tuple with its my-instrument slot replaced. */
function tupleWithProfile(profile: unknown): unknown[] {
  const tuple = validTuple()
  tuple[7] = profile
  return tuple
}

/** Intent: the valid `ifk3.` 7-tuple of the horn in A's phrase 1, its slot 6 replaced. */
function ifk3TupleWithProfile(profile: unknown): unknown[] {
  const tuple = payloadOf(encodePhraseReplayKey(myInstrumentIntent(hornInA(), 3), 1))
  tuple[6] = profile
  return tuple
}

/** Intent: an `ifk2.` and an `ifk3.` key of the horn in A holding the given my-instrument entry. */
function keysWithProfile(profile: unknown): readonly string[] {
  return [rawKey('ifk2', tupleWithProfile(profile)), rawKey('ifk3', ifk3TupleWithProfile(profile))]
}

/** Intent: assert a decoded key holds the intent and number exactly, and no musical profile. */
function expectDecodedEqual(
  key: string,
  version: 'ifk1' | 'ifk2' | 'ifk3',
  intent: GenerationIntent,
  phraseNumber: number,
): void {
  const decoded = decodePhraseReplayKey(key)
  expect(decoded.keyVersion).toBe(version)
  expect(decoded.phraseNumber).toBe(phraseNumber)
  expect(decoded.intent).toEqual(intent)
  expect(JSON.stringify(decoded.intent)).toBe(JSON.stringify(intent))
  expect(Object.keys(decoded.intent)).not.toContain('musicalProfile')
}

/** Intent: assert encode→decode yields an `ifk3` key and the original intent and number exactly. */
function expectIfk3RoundTrip(intent: GenerationIntent, phraseNumber: number): void {
  const key = encodePhraseReplayKey(intent, phraseNumber)
  expect(key.startsWith('ifk3.')).toBe(true)
  expectDecodedEqual(key, 'ifk3', intent, phraseNumber)
}

/** Intent: the timeline-bearing outcome a key replays to, failing loudly on a worker crash. */
function replayedRaw(key: string): unknown {
  const report = replayPhraseKey(key)
  if (report.output.kind === 'crash') throw new Error(report.output.message)
  return report.output.raw
}

describe('a v3.0 ifk2 or ifk1 key still decodes to the same phrase', () => {
  // @test-link [[module_phrase_replay_key]]
  // @test-link [[entity_my_instrument]]
  it('decodes each recorded ifk2 key to an equal intent, and its ifk3 re-encoding too', () => {
    for (const { instrument, seed, key } of RECORDED_IFK2_KEYS) {
      const intent = myInstrumentIntent(instrument(), seed)
      expectDecodedEqual(key, 'ifk2', intent, 1)
      expectIfk3RoundTrip(decodePhraseReplayKey(key).intent, 1)
    }
  })

  // @test-link [[module_phrase_replay_key]]
  it('decodes the recorded ifk2 phrase 2 carrying phrase 1 forward, and its ifk3 counterpart', () => {
    const intent = baritonePhraseTwo()
    expectDecodedEqual(RECORDED_IFK2_CARRY_IN_KEY, 'ifk2', intent, 2)
    expectIfk3RoundTrip(intent, 2)
  })

  // @test-link [[module_phrase_replay_key]]
  it('held the seven ifk1 entries, then only the name, concert range and transposition', () => {
    const recorded = RECORDED_IFK2_KEYS[3]!
    const tuple = payloadOf(recorded.key)
    expect(tuple).toHaveLength(8)
    expect(tuple.slice(0, 7)).toEqual(ifk1EntriesOf(myInstrumentIntent(BARITONE, 7), 1))
    expect(tuple[7]).toEqual(entryOf(BARITONE))
  })

  // @test-link [[module_phrase_replay_key]]
  it('still decodes a built-in ifk1 key of seven entries, re-encoded as ifk3 with null at 6', () => {
    for (const instrumentProfileId of ['c-keyboard', 'bb-tenor', 'eb-alto'] as const) {
      const key = RECORDED_IFK1_BUILT_IN_KEYS[instrumentProfileId]
      const intent = buildIntent({ seed: 4, controls: { instrumentProfileId } })
      expect(payloadOf(key)).toHaveLength(7)
      expectDecodedEqual(key, 'ifk1', intent, 1)
      const ifk3 = encodePhraseReplayKey(intent, 1)
      expect(payloadOf(ifk3)).toHaveLength(7)
      expect(payloadOf(ifk3)[6]).toBeNull()
      expectDecodedEqual(ifk3, 'ifk3', intent, 1)
    }
  })

  // @test-link [[module_phrase_replay_key]]
  // @test-link [[rule_seeded_phrase_reproduction]]
  // @test-link [[service_headless_phrase_replay]]
  it(
    'replays a recorded ifk2 key to the same timeline as generating the phrase',
    () => {
      for (const { instrument, seed, key } of [RECORDED_IFK2_KEYS[1]!, RECORDED_IFK2_KEYS[3]!]) {
        expect(replayPhraseKey(key).keyVersion).toBe('ifk2')
        expect(JSON.stringify(replayedRaw(key))).toBe(
          JSON.stringify(generatePhrase(myInstrumentIntent(instrument(), seed))),
        )
      }
    },
    TIMEOUT_MS,
  )
})

describe('an ifk3 key carries my instrument', () => {
  // @test-link [[module_phrase_replay_key]]
  // @test-link [[entity_my_instrument]]
  it('encodes a my-instrument phrase as ifk3 and decodes it back to an equal intent', () => {
    for (const instrument of [hornInA(), BARITONE])
      for (const seed of [0, 7, 42, 0xffffffff])
        expectIfk3RoundTrip(myInstrumentIntent(instrument, seed), 1)
  })

  // @test-link [[module_phrase_replay_key]]
  it('round-trips a my-instrument phrase 2 carrying phrase 1 forward', () => {
    expectIfk3RoundTrip(baritonePhraseTwo(), 2)
  })

  // @test-link [[module_phrase_replay_key]]
  it("holds seven entries, my instrument's name, concert range and transposition at index 6", () => {
    const intent = myInstrumentIntent(BARITONE, 9)
    const tuple = payloadOf(encodePhraseReplayKey(intent, 1))
    expect(tuple).toHaveLength(7)
    expect(tuple.slice(0, 3)).toEqual(ifk1EntriesOf(intent, 1).slice(0, 3))
    expect(tuple[3]).toEqual(intent.figureLevels)
    expect(tuple.slice(4, 6)).toEqual([1, null])
    expect(tuple[6]).toEqual(entryOf(BARITONE))
    expect(JSON.stringify(tuple)).not.toMatch(/Neutral|Jazz|isCustom/u)
  })

  // @test-link [[module_phrase_replay_key]]
  // @test-link [[req_my_instrument]]
  it("encodes two phrases that differ only by my instrument's clef to the same key", () => {
    const treble = encodePhraseReplayKey(myInstrumentIntent(hornInA('treble'), 3), 1)
    const bass = encodePhraseReplayKey(myInstrumentIntent(hornInA('bass'), 3), 1)
    expect(treble.startsWith('ifk3.')).toBe(true)
    expect(bass).toBe(treble)
    expect(JSON.stringify(payloadOf(treble))).not.toMatch(/clef|treble|bass|template|c-keyboard/u)
  })

  // @test-link [[module_phrase_replay_key]]
  it('encodes a built-in phrase as an ifk3 key of seven entries, null at index 6', () => {
    for (const instrumentProfileId of ['c-keyboard', 'bb-tenor', 'eb-alto'] as const) {
      const key = encodePhraseReplayKey(
        buildIntent({ seed: 4, controls: { instrumentProfileId } }),
        1,
      )
      expect(key.startsWith('ifk3.')).toBe(true)
      expect(payloadOf(key)).toHaveLength(7)
      expect(payloadOf(key)[6]).toBeNull()
    }
  })

  // @test-link [[module_phrase_replay_key]]
  it('announces a my-instrument phrase with its ifk3 key', () => {
    const intent = myInstrumentIntent(hornInA(), 42)
    const lines: string[] = []
    announcePhraseReplayKey(intent, { source: 'workspace' }, (line) => lines.push(line))
    const key = encodePhraseReplayKey(intent, 1)
    expect(key.startsWith('ifk3.')).toBe(true)
    expect(lines).toEqual([
      `[Infinite Flow] phrase replay key · workspace phrase · seed1-0000002a · ${key}`,
    ])
  })

  // @test-link [[module_phrase_replay_key]]
  // @test-link [[rule_seeded_phrase_reproduction]]
  // @test-link [[service_headless_phrase_replay]]
  it(
    'replays an ifk3 key to the same timeline as generating the phrase',
    () => {
      for (const instrument of [hornInA(), BARITONE])
        for (const seed of [1, 2, 3]) {
          const intent = myInstrumentIntent(instrument, seed)
          const key = encodePhraseReplayKey(intent, 1)
          expect(replayPhraseKey(key).keyVersion).toBe('ifk3')
          expect(JSON.stringify(replayedRaw(key))).toBe(JSON.stringify(generatePhrase(intent)))
        }
    },
    TIMEOUT_MS,
  )
})

describe('a key is rejected when it cannot be my instrument', () => {
  // @test-link [[module_phrase_replay_key]]
  it('rejects a malformed ifk2 key with the typed key error', () => {
    const valid = validTuple()
    for (const key of [
      'ifk2.',
      'ifk2.!!',
      'ifk2.AAAA',
      rawKey('ifk2', valid.slice(0, 7)),
      rawKey('ifk2', [...valid, null]),
      rawKey('ifk2', tupleWithProfile(null)),
      rawKey('ifk2', tupleWithProfile({ displayName: 'My horn in A' })),
      rawKey('ifk2', tupleWithProfile(['My horn in A', 45, 81, 3])),
      rawKey('ifk2', tupleWithProfile(['My horn in A', 45, 81, 3, 2, 0])),
      rawKey('ifk2', tupleWithProfile([7, 45, 81, 3, 2])),
      rawKey('ifk2', tupleWithProfile(['My horn in A', '45', 81, 3, 2])),
      rawKey('ifk2', tupleWithProfile(['My horn in A', 45, 81, 3, null])),
    ])
      expect(() => decodePhraseReplayKey(key)).toThrow(PhraseReplayKeyError)
  })

  // @test-link [[module_phrase_replay_key]]
  it('rejects an ifk2 key naming a built-in and an ifk1 key naming my instrument', () => {
    const builtIn = ifk1EntriesOf(buildIntent({ seed: 5 }), 1)
    expect(() => decodePhraseReplayKey(rawKey('ifk2', [...builtIn, validTuple()[7]]))).toThrow(
      PhraseReplayKeyError,
    )
    expect(() => decodePhraseReplayKey(rawKey('ifk1', validTuple().slice(0, 7)))).toThrow(
      PhraseReplayKeyError,
    )
    expect(() => decodePhraseReplayKey(rawKey('ifk1', validTuple()))).toThrow(PhraseReplayKeyError)
  })

  // @test-link [[module_phrase_replay_key]]
  it('rejects an ifk3 key naming a built-in with a profile, or my instrument with null', () => {
    const builtIn = payloadOf(encodePhraseReplayKey(buildIntent({ seed: 5 }), 1))
    builtIn[6] = entryOf(hornInA())
    expect(() => decodePhraseReplayKey(rawKey('ifk3', builtIn))).toThrow(PhraseReplayKeyError)
    expect(() => decodePhraseReplayKey(rawKey('ifk3', builtIn))).toThrow(
      /naming the built-in "c-keyboard" must hold null in slot 6 \(myInstrument\)/u,
    )
    const mine = rawKey('ifk3', ifk3TupleWithProfile(null))
    expect(() => decodePhraseReplayKey(mine)).toThrow(PhraseReplayKeyError)
    expect(() => decodePhraseReplayKey(mine)).toThrow(
      /naming "my-instrument" must hold its profile in slot 6 \(myInstrument\)/u,
    )
  })

  // @test-link [[module_phrase_replay_key]]
  // @test-link [[entity_my_instrument]]
  it('rejects a profile no my instrument can have, never repairing it', () => {
    for (const profile of [
      ['   ', 45, 81, 3, 2],
      ['My horn in A', 45, 60, 3, 2],
      ['My horn in A', 81, 45, 3, 2],
      ['My horn in A', 45.5, 81, 3, 2],
      ['My horn in A', 110, 140, 3, 2],
    ])
      for (const key of keysWithProfile(profile))
        expect(() => decodePhraseReplayKey(key)).toThrow(MyInstrumentError)
    for (const profile of [
      ['My horn in A', 45, 81, 3, 1],
      ['My horn in A', 45, 81, 2.5, 2],
    ])
      for (const key of keysWithProfile(profile))
        expect(() => decodePhraseReplayKey(key)).toThrow(TranspositionIntervalError)
  })
})
