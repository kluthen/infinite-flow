// @vitest-environment node
/**
 * The `ifk2.` phrase replay key: a phrase made with my instrument encodes as `ifk2.`, the seven
 * `ifk1.` entries followed by my instrument's display name, concert range and transposition, and
 * decodes back to an equal intent that replays to the same timeline. The key holds no clef, so two
 * phrases differing only by the clef share one key. A built-in phrase still encodes as `ifk1.`. A
 * malformed `ifk2.` key, a key whose version and instrument disagree, and a profile no my
 * instrument can have are all rejected.
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
import {
  BASE_CONTROLS,
  buildIntent,
  carryInAfter,
  generateSuccess,
} from '../domain/generation/carry-in/carry-in-fixture'

/** Generous per-test timeout: the replay cases generate each phrase twice. */
const TIMEOUT_MS = 120_000

/** Intent: my instrument written C3 to C6, sounding a minor third lower, in the given clef. */
function hornInA(clef: InstrumentClef = 'treble'): MyInstrument {
  return makeMyInstrument({
    template: 'c-keyboard',
    name: 'My horn in A',
    clef,
    writtenRange: { minMidi: 48, maxMidi: 84 },
    transposition: { octaves: 0, semitones: 3, direction: 'lower' },
  })
}

/** My instrument sounding a major ninth lower, with a non-ASCII name, from the tenor template. */
const BARITONE = makeMyInstrument({
  template: 'bb-tenor',
  name: 'Saxo baryton à moi',
  clef: 'bass',
  writtenRange: { minMidi: 50, maxMidi: 82 },
  transposition: { octaves: 1, semitones: 2, direction: 'lower' },
})

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
    musicalProfile: { musicalProfile: 'Neutral' as const, isCustom: true },
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
function rawKey(version: 'ifk1' | 'ifk2', payload: unknown): string {
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

/** Intent: the seven `ifk1.` entries an intent and phrase number encode to. */
function ifk1EntriesOf(intent: GenerationIntent, phraseNumber: number): unknown[] {
  return JSON.parse(
    JSON.stringify([
      intent.requestId,
      intent.seed,
      PHRASE_REPLAY_KEY_CONTROL_ORDER.map((key) =>
        key === 'tonalCenter' ? intent.writtenTonalCenter : intent.controls[key],
      ),
      intent.musicalProfile.musicalProfile,
      intent.musicalProfile.isCustom,
      phraseNumber,
      intent.carryIn ?? null,
    ]),
  ) as unknown[]
}

/** Intent: the valid `ifk2.` 8-tuple of the horn in A's phrase 1, as a mutable array to corrupt. */
function validTuple(): unknown[] {
  return payloadOf(encodePhraseReplayKey(myInstrumentIntent(hornInA(), 5), 1))
}

/** Intent: the valid 8-tuple with its my-instrument slot replaced. */
function tupleWithProfile(profile: unknown): unknown[] {
  const tuple = validTuple()
  tuple[7] = profile
  return tuple
}

/** Intent: assert encode→decode yields an `ifk2` key and the original intent and number exactly. */
function expectIfk2RoundTrip(intent: GenerationIntent, phraseNumber: number): void {
  const key = encodePhraseReplayKey(intent, phraseNumber)
  expect(key.startsWith('ifk2.')).toBe(true)
  const decoded = decodePhraseReplayKey(key)
  expect(decoded.keyVersion).toBe('ifk2')
  expect(decoded.phraseNumber).toBe(phraseNumber)
  expect(decoded.intent).toEqual(intent)
  expect(JSON.stringify(decoded.intent)).toBe(JSON.stringify(intent))
}

describe('an ifk2 key carries my instrument', () => {
  // @test-link [[module_phrase_replay_key]]
  // @test-link [[entity_my_instrument]]
  it('encodes a my-instrument phrase as ifk2 and decodes it back to an equal intent', () => {
    for (const instrument of [hornInA(), BARITONE])
      for (const seed of [0, 7, 42, 0xffffffff])
        expectIfk2RoundTrip(myInstrumentIntent(instrument, seed), 1)
  })

  // @test-link [[module_phrase_replay_key]]
  it('round-trips a my-instrument phrase 2 carrying phrase 1 forward', () => {
    const first = myInstrumentIntent(BARITONE, 11)
    const carryIn = carryInAfter(first, generateSuccess(first), 1)
    expectIfk2RoundTrip(myInstrumentIntent(BARITONE, 12, carryIn), 2)
  })

  // @test-link [[module_phrase_replay_key]]
  it('holds the seven ifk1 entries, then only the name, concert range and transposition', () => {
    const intent = myInstrumentIntent(BARITONE, 9)
    const tuple = payloadOf(encodePhraseReplayKey(intent, 1))
    expect(tuple).toHaveLength(8)
    expect(tuple.slice(0, 7)).toEqual(ifk1EntriesOf(intent, 1))
    const { displayName, concertRange, transposition } = BARITONE.profile
    expect(tuple[7]).toEqual([
      displayName,
      concertRange.minMidi,
      concertRange.maxMidi,
      transposition.chromatic,
      transposition.diatonic,
    ])
  })

  // @test-link [[module_phrase_replay_key]]
  // @test-link [[req_my_instrument]]
  it("encodes two phrases that differ only by my instrument's clef to the same key", () => {
    const treble = encodePhraseReplayKey(myInstrumentIntent(hornInA('treble'), 3), 1)
    const bass = encodePhraseReplayKey(myInstrumentIntent(hornInA('bass'), 3), 1)
    expect(bass).toBe(treble)
    expect(JSON.stringify(payloadOf(treble))).not.toMatch(/clef|treble|bass|template|c-keyboard/u)
  })

  // @test-link [[module_phrase_replay_key]]
  it('still encodes a built-in phrase as an ifk1 key of seven entries', () => {
    for (const instrumentProfileId of ['c-keyboard', 'bb-tenor', 'eb-alto'] as const) {
      const key = encodePhraseReplayKey(
        buildIntent({ seed: 4, controls: { instrumentProfileId } }),
        1,
      )
      expect(key.startsWith('ifk1.')).toBe(true)
      expect(payloadOf(key)).toHaveLength(7)
    }
  })

  // @test-link [[module_phrase_replay_key]]
  it('announces a my-instrument phrase with its ifk2 key', () => {
    const intent = myInstrumentIntent(hornInA(), 42)
    const lines: string[] = []
    announcePhraseReplayKey(intent, { source: 'workspace' }, (line) => lines.push(line))
    expect(lines).toEqual([
      `[Infinite Flow] phrase replay key · workspace phrase · seed1-0000002a · ${encodePhraseReplayKey(intent, 1)}`,
    ])
  })

  // @test-link [[module_phrase_replay_key]]
  // @test-link [[rule_seeded_phrase_reproduction]]
  // @test-link [[service_headless_phrase_replay]]
  it(
    'replays an ifk2 key to the same timeline as generating the phrase',
    () => {
      for (const instrument of [hornInA(), BARITONE])
        for (const seed of [1, 2, 3]) {
          const intent = myInstrumentIntent(instrument, seed)
          const report = replayPhraseKey(encodePhraseReplayKey(intent, 1))
          expect(report.keyVersion).toBe('ifk2')
          if (report.output.kind === 'crash') throw new Error(report.output.message)
          expect(JSON.stringify(report.output.raw)).toBe(JSON.stringify(generatePhrase(intent)))
        }
    },
    TIMEOUT_MS,
  )
})

describe('an ifk2 key is rejected when it cannot be my instrument', () => {
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
  // @test-link [[entity_my_instrument]]
  it('rejects a profile no my instrument can have, never repairing it', () => {
    for (const profile of [
      ['   ', 45, 81, 3, 2],
      ['My horn in A', 45, 60, 3, 2],
      ['My horn in A', 81, 45, 3, 2],
      ['My horn in A', 45.5, 81, 3, 2],
      ['My horn in A', 110, 140, 3, 2],
    ])
      expect(() => decodePhraseReplayKey(rawKey('ifk2', tupleWithProfile(profile)))).toThrow(
        MyInstrumentError,
      )
    for (const profile of [
      ['My horn in A', 45, 81, 3, 1],
      ['My horn in A', 45, 81, 2.5, 2],
    ])
      expect(() => decodePhraseReplayKey(rawKey('ifk2', tupleWithProfile(profile)))).toThrow(
        TranspositionIntervalError,
      )
  })
})
