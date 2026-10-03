import { describe, expect, it, vi } from 'vitest'

import {
  GenerationControlError,
  makeGenerationControls,
  REGISTER_CHOICES,
} from '@/domain/controls/generation-controls'
import { CarryInError } from '@/domain/generation/carry-in/carry-in'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeSeed, SeedConstructionError } from '@/domain/random/seed'
import { GenerationWorkerProtocolError } from '@/generation-worker/generation-worker-protocol'
import {
  announcePhraseReplayKey,
  encodePhraseReplayKey,
  PHRASE_REPLAY_KEY_CONTROL_ORDER,
  PHRASE_REPLAY_KEY_PREFIX,
  PhraseReplayKeyError,
  phraseReplayKeyLine,
} from '@/generation-worker/phrase-replay-key'
import { decodePhraseReplayKey } from '@/generation-worker/phrase-replay-key-decode'
import {
  BASE_CONTROLS,
  buildIntent,
  carryInAfter,
  generateSuccess,
  keyChangeIntent,
} from '../domain/generation/carry-in/carry-in-fixture'

/** Intent: a real intent for phrase 2 of a session, carrying phrase 1's carry-in. */
function carryInIntent(): GenerationIntent {
  const firstIntent = buildIntent({ seed: 11, label: 'replay' })
  const carryIn = carryInAfter(firstIntent, generateSuccess(firstIntent), 1)
  return buildIntent({ seed: 12, label: 'replay', carryIn })
}

/** Intent: encode any JSON value as an `ifk1.` key, bypassing the codec's own encoder. */
function rawKey(payload: unknown): string {
  return `${PHRASE_REPLAY_KEY_PREFIX}${base64Url(new TextEncoder().encode(JSON.stringify(payload)))}`
}

/** Intent: unpadded base64url of raw bytes, for hand-built malformed payloads. */
function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '')
}

/** Intent: the 7-tuple an intent and phrase number encode to, as a mutable array to corrupt. */
function tupleOf(intent: GenerationIntent, phraseNumber: number): unknown[] {
  return [
    intent.requestId,
    intent.seed,
    PHRASE_REPLAY_KEY_CONTROL_ORDER.map((key) =>
      key === 'tonalCenter' ? intent.writtenTonalCenter : intent.controls[key],
    ),
    intent.musicalProfile.musicalProfile,
    intent.musicalProfile.isCustom,
    phraseNumber,
    intent.carryIn ?? null,
  ]
}

/** Intent: the valid 7-tuple of a plain intent without a carry-in. */
function validTuple(): unknown[] {
  return tupleOf(buildIntent({ seed: 5, label: 'tuple' }), 1)
}

/** Intent: a valid tuple with one slot replaced. */
function tupleWith(index: number, value: unknown): unknown[] {
  const tuple = validTuple()
  tuple[index] = value
  return tuple
}

/** Intent: a valid tuple with one control value replaced. */
function tupleWithControl(key: string, value: unknown): unknown[] {
  const tuple = validTuple()
  const controls = [...(tuple[2] as unknown[])]
  controls[PHRASE_REPLAY_KEY_CONTROL_ORDER.indexOf(key as never)] = value
  tuple[2] = controls
  return tuple
}

/** Intent: assert encode→decode yields the original intent and phrase number exactly. */
function expectRoundTrip(intent: GenerationIntent, phraseNumber: number): void {
  const decoded = decodePhraseReplayKey(encodePhraseReplayKey(intent, phraseNumber))
  expect(decoded.keyVersion).toBe('ifk1')
  expect(decoded.phraseNumber).toBe(phraseNumber)
  expect(decoded.intent).toEqual(intent)
  expect(JSON.stringify(decoded.intent)).toBe(JSON.stringify(intent))
}

// @test-link [[module_phrase_replay_key]]
describe('phrase replay key round trip', () => {
  it('round-trips plain intents with different seeds', () => {
    for (const seed of [0, 1, 42, 0xffffffff]) expectRoundTrip(buildIntent({ seed }), 1)
  })

  it('round-trips a non-C written tonal center on transposing instruments', () => {
    for (const instrumentProfileId of ['bb-tenor', 'eb-alto'] as const) {
      const intent = buildIntent({
        seed: 7,
        controls: { tonalCenter: 'F#', instrumentProfileId },
      })
      expect(intent.controls.tonalCenter).not.toBe(intent.writtenTonalCenter)
      expectRoundTrip(intent, 3)
    }
  })

  it('round-trips a custom Jazz profile', () => {
    const intent = buildIntent({ seed: 9, musicalProfile: 'Jazz' })
    expect(intent.musicalProfile).toEqual({ musicalProfile: 'Jazz', isCustom: true })
    expectRoundTrip(intent, 1)
  })

  it('round-trips every register choice, Varying included', () => {
    for (const register of REGISTER_CHOICES)
      expectRoundTrip(
        buildIntent({ seed: 3, controls: { register, instrumentProfileId: 'eb-alto' } }),
        1,
      )
  })

  it('round-trips an intent with a carry-in and its phrase number', () => {
    const intent = carryInIntent()
    expect(intent.carryIn?.phraseNumber).toBe(1)
    expectRoundTrip(intent, 2)
  })

  it('decodes an otherwise valid key whose carry-in slot is null', () => {
    const decoded = decodePhraseReplayKey(rawKey(validTuple()))
    expect(decoded.intent).toEqual(buildIntent({ seed: 5, label: 'tuple' }))
    expect('carryIn' in decoded.intent).toBe(false)
  })
})

/**
 * A key encoded before a carry-in could drop its harmony: phrase 2 of `carryInIntent()`, whose
 * carry-in holds the full carried harmony (G major, open arrival). It is frozen here, never
 * regenerated, so the decoder is proven to read every older key unchanged.
 */
const PRE_NULL_HARMONY_KEY = [
  'ifk1.WyJyZXBsYXktMTIiLDEyLFs5MCwiQyIsIk1ham9yIiwiR2VudGxlIGRpYXRvbmljIiwiU2V0dGxlZCIsIlF',
  '1YXJ0ZXIiLCJTbGlnaHRseSB2YXJpZWQiLCJTdHJhaWdodCIsIlNwYXJzZSIsIldhbmRlcmluZyIsIk1pZGRsZSI',
  'sIkxlYXBpbmciLCJQcmVkaWN0YWJsZSIsImMta2V5Ym9hcmQiXSwiTmV1dHJhbCIsdHJ1ZSwyLHsibGFzdFBpdGN',
  'oIjp7Im1pZGkiOjU5LCJhcnJpdmluZ0ludGVydmFsIjowLCJyZWNvdmVyeSI6eyJraW5kIjoic2V0dGxlZCJ9fSw',
  'icmVnaXN0ZXJXaW5kb3ciOnsia2luZCI6IlJlZ2lzdGVyV2luZG93IiwibWluTWlkaSI6NTQsIm1heE1pZGkiOjY',
  '2fSwiZmluYWxIYXJtb255Ijp7InRyaWFkIjp7ImRlZ3JlZSI6NSwicGl0Y2hDbGFzc2VzIjpbNywxMSwyXSwicXV',
  'hbGl0eSI6Im1ham9yIn0sInJvbGUiOiJvcGVuX2Fycml2YWwiLCJlbmRwb2ludCI6eyJraW5kIjoidG9uYWxfZGV',
  'ncmVlX2ZpdmVfY2hvcmRfdG9uZSIsImRlZ3JlZSI6NX19LCJwaHJhc2VOdW1iZXIiOjF9XQ',
].join('')

// @test-link [[rule_key_change_drops_harmonic_carry_in]]
// @test-link [[module_phrase_replay_key]]
describe('phrase replay key with a carry-in whose harmony was dropped', () => {
  it('round-trips the explicit null harmony and its phrase number', () => {
    const intent = keyChangeIntent(12, 'replay')
    expect(intent.carryIn?.finalHarmony).toBeNull()
    expectRoundTrip(intent, 2)
    expect(decodePhraseReplayKey(encodePhraseReplayKey(intent, 2)).intent.carryIn).toStrictEqual(
      intent.carryIn,
    )
  })

  it('rejects a key whose carry-in has no harmony field at all', () => {
    const tuple = tupleOf(keyChangeIntent(12, 'replay'), 2)
    const carryIn = { ...(tuple[6] as Record<string, unknown>) }
    delete carryIn.finalHarmony
    tuple[6] = carryIn
    expect(() => decodePhraseReplayKey(rawKey(tuple))).toThrow(CarryInError)
  })

  it('still decodes a key encoded with the full carried harmony, unchanged', () => {
    const decoded = decodePhraseReplayKey(PRE_NULL_HARMONY_KEY)
    const intent = carryInIntent()
    expect(decoded.phraseNumber).toBe(2)
    expect(decoded.intent).toEqual(intent)
    expect(JSON.stringify(decoded.intent)).toBe(JSON.stringify(intent))
    expect(decoded.intent.carryIn?.finalHarmony?.triad.degree).toBe(5)
    expect(encodePhraseReplayKey(decoded.intent, 2)).toBe(PRE_NULL_HARMONY_KEY)
  })
})

// @test-link [[module_phrase_replay_key]]
describe('phrase replay key format', () => {
  it('is one line of the ifk1 prefix and unpadded base64url', () => {
    const key = encodePhraseReplayKey(carryInIntent(), 2)
    expect(key.startsWith('ifk1.')).toBe(true)
    expect(key).toMatch(/^ifk1\.[A-Za-z0-9_-]+$/u)
    expect(key.split('\n')).toHaveLength(1)
  })

  it('decodes a key surrounded by whitespace', () => {
    const intent = buildIntent({ seed: 21 })
    const decoded = decodePhraseReplayKey(`  \n${encodePhraseReplayKey(intent, 1)}\t \n`)
    expect(decoded.intent).toEqual(intent)
  })

  it('orders exactly the GenerationControls keys', () => {
    const controlKeys = Object.keys(makeGenerationControls(BASE_CONTROLS)).sort()
    expect([...PHRASE_REPLAY_KEY_CONTROL_ORDER].sort()).toEqual(controlKeys)
    expect(new Set(PHRASE_REPLAY_KEY_CONTROL_ORDER).size).toBe(
      PHRASE_REPLAY_KEY_CONTROL_ORDER.length,
    )
  })

  it('refuses to encode a phrase number that is not a positive integer', () => {
    const intent = buildIntent({ seed: 1 })
    for (const phraseNumber of [0, -1, 1.5, Number.NaN])
      expect(() => encodePhraseReplayKey(intent, phraseNumber)).toThrow(PhraseReplayKeyError)
  })

  it("refuses to encode a phrase number other than its carry-in's plus one", () => {
    const intent = carryInIntent()
    expect(() => encodePhraseReplayKey(intent, 1)).toThrow(PhraseReplayKeyError)
    expect(() => encodePhraseReplayKey(intent, 3)).toThrow(PhraseReplayKeyError)
  })
})

// @test-link [[module_phrase_replay_key]]
describe('phrase replay key decoding rejects malformed keys', () => {
  it('rejects an empty key or a wrong prefix', () => {
    for (const key of ['', '   ', 'abc', 'ifk.AAAA', 'IFK1.AAAA', 'seed1-0000002a'])
      expect(() => decodePhraseReplayKey(key)).toThrow(PhraseReplayKeyError)
  })

  it('rejects an unsupported key version by name', () => {
    const key = rawKey(validTuple()).replace(/^ifk1\./u, 'ifk2.')
    expect(() => decodePhraseReplayKey(key)).toThrow(/unsupported key version "ifk2"/u)
    expect(() => decodePhraseReplayKey(key)).toThrow(PhraseReplayKeyError)
  })

  it('rejects a payload that is not strict unpadded base64url', () => {
    const valid = rawKey(validTuple())
    for (const key of [
      'ifk1.',
      'ifk1.AB+/',
      'ifk1.AB CD',
      `${valid}=`,
      'ifk1.QQ==',
      'ifk1.A',
      'ifk1.AB',
    ])
      expect(() => decodePhraseReplayKey(key)).toThrow(PhraseReplayKeyError)
  })

  it('rejects a payload that is not UTF-8 or not JSON', () => {
    expect(() => decodePhraseReplayKey(`ifk1.${base64Url(Uint8Array.of(0xff, 0xfe))}`)).toThrow(
      /not valid UTF-8/u,
    )
    expect(() =>
      decodePhraseReplayKey(`ifk1.${base64Url(new TextEncoder().encode('{nope'))}`),
    ).toThrow(/not valid JSON/u)
  })

  it('rejects a payload that is not a 7-entry array', () => {
    for (const payload of [
      { requestId: 'x' },
      'text',
      7,
      null,
      validTuple().slice(0, 6),
      [...validTuple(), 1],
    ])
      expect(() => decodePhraseReplayKey(rawKey(payload))).toThrow(/exactly 7 entries/u)
  })

  it('rejects a slot of the wrong type and names it', () => {
    const cases: readonly [number, unknown, RegExp][] = [
      [0, 12, /slot 0 \(requestId\)/u],
      [1, '5', /slot 1 \(seed\)/u],
      [2, ['C'], /slot 2 \(controls\)/u],
      [2, {}, /slot 2 \(controls\)/u],
      [3, true, /slot 3 \(musicalProfile\)/u],
      [4, 'true', /slot 4 \(isCustom\)/u],
      [5, '1', /slot 5 \(phraseNumber\)/u],
      [6, [], /slot 6 \(carryIn\)/u],
      [6, 'none', /slot 6 \(carryIn\)/u],
    ]
    for (const [index, value, message] of cases) {
      const key = rawKey(tupleWith(index, value))
      expect(() => decodePhraseReplayKey(key)).toThrow(PhraseReplayKeyError)
      expect(() => decodePhraseReplayKey(key)).toThrow(message)
    }
  })

  it('propagates the domain error for an unknown control value', () => {
    expect(() => decodePhraseReplayKey(rawKey(tupleWithControl('collection', 'Blues')))).toThrow(
      GenerationControlError,
    )
    expect(() => decodePhraseReplayKey(rawKey(tupleWithControl('tempo', 65)))).toThrow(
      GenerationControlError,
    )
    expect(() => decodePhraseReplayKey(rawKey(tupleWithControl('tonalCenter', 'H')))).toThrow(
      GenerationWorkerProtocolError,
    )
    expect(() => decodePhraseReplayKey(rawKey(tupleWith(3, 'Bebop')))).toThrow(
      GenerationWorkerProtocolError,
    )
  })

  it('propagates the seed error for an out-of-range or fractional seed', () => {
    for (const seed of [-1, 2 ** 32, 1.5])
      expect(() => decodePhraseReplayKey(rawKey(tupleWith(1, seed)))).toThrow(SeedConstructionError)
  })

  it('propagates the carry-in error for a malformed carry-in', () => {
    const intent = carryInIntent()
    const tuple = tupleOf(intent, 2)
    tuple[6] = { ...intent.carryIn, tempo: 140 }
    expect(() => decodePhraseReplayKey(rawKey(tuple))).toThrow(CarryInError)
  })

  it('rejects a phrase number that is not a positive integer', () => {
    for (const phraseNumber of [0, -3, 1.5])
      expect(() => decodePhraseReplayKey(rawKey(tupleWith(5, phraseNumber)))).toThrow(
        PhraseReplayKeyError,
      )
  })

  it("rejects a phrase number other than its carry-in's plus one", () => {
    const intent = carryInIntent()
    expect(rawKey(tupleOf(intent, 2))).toBe(encodePhraseReplayKey(intent, 2))
    for (const phraseNumber of [1, 3, 5])
      expect(() => decodePhraseReplayKey(rawKey(tupleOf(intent, phraseNumber)))).toThrow(
        /plus one/u,
      )
  })
})

// @test-link [[module_phrase_replay_key]]
describe('phrase replay key console line', () => {
  const key = rawKey(validTuple())
  const seed = makeSeed(42)

  it('names a workspace phrase', () => {
    expect(phraseReplayKeyLine(key, { source: 'workspace' }, seed)).toBe(
      `[Infinite Flow] phrase replay key · workspace phrase · seed1-0000002a · ${key}`,
    )
  })

  it('names a session phrase and its origin', () => {
    expect(
      phraseReplayKeyLine(key, { source: 'session', phraseNumber: 4, origin: 'carry-in' }, seed),
    ).toBe(
      `[Infinite Flow] phrase replay key · session phrase 4 (carry-in) · seed1-0000002a · ${key}`,
    )
    expect(
      phraseReplayKeyLine(key, { source: 'session', phraseNumber: 7, origin: 'standalone' }, seed),
    ).toBe(
      `[Infinite Flow] phrase replay key · session phrase 7 (standalone) · seed1-0000002a · ${key}`,
    )
  })

  it('refuses a key that is not one well-formed ifk1 key', () => {
    expect(() => phraseReplayKeyLine(`${key}\nmore`, { source: 'workspace' }, seed)).toThrow(
      PhraseReplayKeyError,
    )
  })

  it('announces a workspace phrase once as phrase 1', () => {
    const intent = buildIntent({ seed: 42 })
    const log = vi.fn<(line: string) => void>()
    announcePhraseReplayKey(intent, { source: 'workspace' }, log)
    expect(log).toHaveBeenCalledTimes(1)
    const line = log.mock.calls[0]![0]
    expect(line.split('\n')).toHaveLength(1)
    expect(line).toBe(
      phraseReplayKeyLine(encodePhraseReplayKey(intent, 1), { source: 'workspace' }, intent.seed),
    )
    expect(decodePhraseReplayKey(line.split(' · ')[3]!).phraseNumber).toBe(1)
  })

  it('announces a session carry-in phrase once with its own number', () => {
    const intent = carryInIntent()
    const context = { source: 'session', phraseNumber: 2, origin: 'carry-in' } as const
    const log = vi.fn<(line: string) => void>()
    announcePhraseReplayKey(intent, context, log)
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0]![0]).toBe(
      `[Infinite Flow] phrase replay key · session phrase 2 (carry-in) · seed1-0000000c · ${encodePhraseReplayKey(intent, 2)}`,
    )
  })

  it('announces a session standalone phrase once with its own number', () => {
    const intent = buildIntent({ seed: 13 })
    const log = vi.fn<(line: string) => void>()
    announcePhraseReplayKey(
      intent,
      { source: 'session', phraseNumber: 6, origin: 'standalone' },
      log,
    )
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0]![0]).toContain(
      '· session phrase 6 (standalone) · seed1-0000000d · ifk1.',
    )
  })

  it('refuses an origin that disagrees with the carry-in, logging nothing', () => {
    const log = vi.fn<(line: string) => void>()
    expect(() =>
      announcePhraseReplayKey(
        buildIntent({ seed: 1 }),
        { source: 'session', phraseNumber: 2, origin: 'carry-in' },
        log,
      ),
    ).toThrow(PhraseReplayKeyError)
    expect(() =>
      announcePhraseReplayKey(
        carryInIntent(),
        { source: 'session', phraseNumber: 2, origin: 'standalone' },
        log,
      ),
    ).toThrow(PhraseReplayKeyError)
    expect(() => announcePhraseReplayKey(carryInIntent(), { source: 'workspace' }, log)).toThrow(
      PhraseReplayKeyError,
    )
    expect(log).not.toHaveBeenCalled()
  })
})
