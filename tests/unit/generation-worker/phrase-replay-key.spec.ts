import { describe, expect, it, vi } from 'vitest'

import {
  GenerationControlError,
  makeGenerationControls,
  REGISTER_CHOICES,
} from '@/domain/controls/generation-controls'
import { JAZZ_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { CarryInError, makeCarryIn } from '@/domain/generation/carry-in/carry-in'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeSeed, SeedConstructionError } from '@/domain/random/seed'
import { GenerationWorkerProtocolError } from '@/generation-worker/generation-worker-protocol'
import {
  announcePhraseReplayKey,
  encodePhraseReplayKey,
  PHRASE_REPLAY_KEY_CONTROL_ORDER,
  PHRASE_REPLAY_KEY_PREFIX,
  PHRASE_REPLAY_KEY_V3_PREFIX,
  PhraseReplayKeyError,
  phraseReplayKeyLine,
  requireConsistentPhraseNumber,
} from '@/generation-worker/phrase-replay-key'
import { decodePhraseReplayKey } from '@/generation-worker/phrase-replay-key-decode'
import {
  BASE_CONTROLS,
  buildIntent,
  carryInAfter,
  generateSuccess,
  keyChangeIntent,
} from '../domain/generation/carry-in/carry-in-fixture'
import { SAMPLE_STEERING } from '../domain/generation/request-inputs-fixture'

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

/** Intent: encode any JSON value as an `ifk3.` key, bypassing the codec's own encoder. */
function rawIfk3Key(payload: unknown): string {
  return `${PHRASE_REPLAY_KEY_V3_PREFIX}${base64Url(new TextEncoder().encode(JSON.stringify(payload)))}`
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

/** Intent: unpadded base64url of raw bytes, for hand-built malformed payloads. */
function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '')
}

/**
 * Intent: the `ifk1.` 7-tuple v3.0 wrote for an intent and phrase number, its profile slots
 * holding the customized Neutral buildIntent builds with, as a mutable array to corrupt.
 */
function tupleOf(intent: GenerationIntent, phraseNumber: number): unknown[] {
  return [
    intent.requestId,
    intent.seed,
    PHRASE_REPLAY_KEY_CONTROL_ORDER.map((key) =>
      key === 'tonalCenter' ? intent.writtenTonalCenter : intent.controls[key],
    ),
    'Neutral',
    true,
    phraseNumber,
    intent.carryIn ?? null,
  ]
}

/** Intent: the valid `ifk1.` 7-tuple of a plain intent without a carry-in. */
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

/**
 * Intent: the valid `ifk3.` 7-tuple of a plain built-in intent: the first seven entries of the
 * `ifk4.` 9-tuple the encoder writes, which keep the `ifk3.` order and meaning.
 */
function validIfk3Tuple(): unknown[] {
  return payloadOf(encodePhraseReplayKey(buildIntent({ seed: 5, label: 'tuple' }), 1)).slice(0, 7)
}

/** Intent: assert encode→decode yields an `ifk4` key and the original intent and number exactly. */
function expectRoundTrip(intent: GenerationIntent, phraseNumber: number): void {
  const key = encodePhraseReplayKey(intent, phraseNumber)
  expect(key.startsWith('ifk4.')).toBe(true)
  const decoded = decodePhraseReplayKey(key)
  expect(decoded.keyVersion).toBe('ifk4')
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

  it("round-trips a custom Jazz phrase's levels", () => {
    const intent = buildIntent({ seed: 9, musicalProfile: 'Jazz' })
    expect(intent.figureLevels).toStrictEqual(JAZZ_FIGURE_LEVELS)
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
    expect(intent.carryIn).toMatchObject({ phraseNumber: 1 })
    expectRoundTrip(intent, 2)
  })

  it('decodes an otherwise valid ifk1 or ifk3 key whose carry-in slot is null', () => {
    for (const key of [rawKey(validTuple()), rawIfk3Key(validIfk3Tuple())]) {
      const decoded = decodePhraseReplayKey(key)
      expect(decoded.intent).toEqual(buildIntent({ seed: 5, label: 'tuple' }))
      expect('carryIn' in decoded.intent).toBe(false)
    }
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

/**
 * The `ifk1.` key v3.0 wrote for `keyChangeIntent(12, 'replay')`, phrase 2, whose carry-in
 * dropped its harmony (an explicit null). Frozen here, never regenerated.
 */
const NULL_HARMONY_IFK1_KEY = [
  'ifk1.WyJyZXBsYXktMTIiLDEyLFs5MCwiRiMiLCJEb3JpYW4iLCJHZW50bGUgZGlhdG9uaWMiLCJTZXR0bGVkIiw',
  'iUXVhcnRlciIsIlNsaWdodGx5IHZhcmllZCIsIlN0cmFpZ2h0IiwiU3BhcnNlIiwiV2FuZGVyaW5nIiwiTWlkZGx',
  'lIiwiTGVhcGluZyIsIlByZWRpY3RhYmxlIiwiYy1rZXlib2FyZCJdLCJOZXV0cmFsIix0cnVlLDIseyJsYXN0UGl',
  '0Y2giOnsibWlkaSI6NjQsImFycml2aW5nSW50ZXJ2YWwiOjQsInJlY292ZXJ5Ijp7ImtpbmQiOiJzZXR0bGVkIn1',
  '9LCJyZWdpc3RlcldpbmRvdyI6eyJraW5kIjoiUmVnaXN0ZXJXaW5kb3ciLCJtaW5NaWRpIjo1NCwibWF4TWlkaSI',
  '6NjZ9LCJmaW5hbEhhcm1vbnkiOm51bGwsInBocmFzZU51bWJlciI6MX1d',
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

  it('rejects an ifk1 or ifk3 key whose carry-in has no harmony field at all', () => {
    const intent = keyChangeIntent(12, 'replay')
    const ifk1 = tupleOf(intent, 2)
    const ifk3 = payloadOf(encodePhraseReplayKey(intent, 2)).slice(0, 7)
    for (const [tuple, slot, encode] of [
      [ifk1, 6, rawKey],
      [ifk3, 5, rawIfk3Key],
    ] as const) {
      const carryIn = { ...(tuple[slot] as Record<string, unknown>) }
      delete carryIn.finalHarmony
      tuple[slot] = carryIn
      expect(() => decodePhraseReplayKey(encode(tuple))).toThrow(CarryInError)
    }
  })

  it('still decodes a key encoded with the full carried harmony, unchanged', () => {
    const decoded = decodePhraseReplayKey(PRE_NULL_HARMONY_KEY)
    const intent = carryInIntent()
    expect(decoded.keyVersion).toBe('ifk1')
    expect(decoded.phraseNumber).toBe(2)
    expect(decoded.intent).toEqual(intent)
    expect(JSON.stringify(decoded.intent)).toBe(JSON.stringify(intent))
    expect(decoded.intent.carryIn?.finalHarmony?.triad.degree).toBe(5)
    const reEncoded = decodePhraseReplayKey(encodePhraseReplayKey(decoded.intent, 2))
    expect(reEncoded.keyVersion).toBe('ifk4')
    expect(reEncoded.intent).toEqual(intent)
  })

  it('still decodes an ifk1 key whose carry-in dropped its harmony, unchanged', () => {
    const decoded = decodePhraseReplayKey(NULL_HARMONY_IFK1_KEY)
    const intent = keyChangeIntent(12, 'replay')
    expect(decoded.keyVersion).toBe('ifk1')
    expect(decoded.phraseNumber).toBe(2)
    expect(decoded.intent.carryIn?.finalHarmony).toBeNull()
    expect(JSON.stringify(decoded.intent)).toBe(JSON.stringify(intent))
    expect(decodePhraseReplayKey(encodePhraseReplayKey(decoded.intent, 2)).intent).toEqual(intent)
  })
})

// @test-link [[module_phrase_replay_key]]
describe('phrase replay key format', () => {
  it('is one line of the ifk4 prefix and unpadded base64url', () => {
    const key = encodePhraseReplayKey(carryInIntent(), 2)
    expect(key.startsWith('ifk4.')).toBe(true)
    expect(key).toMatch(/^ifk4\.[A-Za-z0-9_-]+$/u)
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
    for (const version of ['ifk0', 'ifk5', 'ifk9', 'ifk12']) {
      const key = rawIfk3Key(validIfk3Tuple()).replace(/^ifk3\./u, `${version}.`)
      expect(() => decodePhraseReplayKey(key)).toThrow(
        `Phrase replay key has unsupported key version "${version}"; only "ifk1", "ifk2", "ifk3" and "ifk4" are supported.`,
      )
      expect(() => decodePhraseReplayKey(key)).toThrow(PhraseReplayKeyError)
    }
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
  })

  it('rejects an ifk1 key naming no musical profile, naming its slot', () => {
    const key = rawKey(tupleWith(3, 'Bebop'))
    expect(() => decodePhraseReplayKey(key)).toThrow(PhraseReplayKeyError)
    expect(() => decodePhraseReplayKey(key)).toThrow(
      /slot 3 \(musicalProfile\) must be one of \["Neutral","Jazz"\], got "Bebop"/u,
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
    expect(decodePhraseReplayKey(rawKey(tupleOf(intent, 2))).intent).toEqual(intent)
    for (const phraseNumber of [1, 3, 5])
      expect(() => decodePhraseReplayKey(rawKey(tupleOf(intent, phraseNumber)))).toThrow(
        /plus one/u,
      )
    const ifk3 = payloadOf(encodePhraseReplayKey(intent, 2)).slice(0, 7)
    for (const phraseNumber of [1, 3]) {
      ifk3[4] = phraseNumber
      expect(() => decodePhraseReplayKey(rawIfk3Key(ifk3))).toThrow(/plus one/u)
    }
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

  it('accepts an ifk3 or ifk4 key and refuses a key that is not one well-formed ifk1-ifk4 key', () => {
    const ifk3 = rawIfk3Key(validIfk3Tuple())
    const ifk4 = encodePhraseReplayKey(buildIntent({ seed: 5, label: 'tuple' }), 1)
    for (const accepted of [ifk3, ifk4])
      expect(phraseReplayKeyLine(accepted, { source: 'workspace' }, seed)).toBe(
        `[Infinite Flow] phrase replay key · workspace phrase · seed1-0000002a · ${accepted}`,
      )
    for (const bad of [`${key}\nmore`, ifk4.replace(/^ifk4\./u, 'ifk5.')]) {
      expect(() => phraseReplayKeyLine(bad, { source: 'workspace' }, seed)).toThrow(
        PhraseReplayKeyError,
      )
      expect(() => phraseReplayKeyLine(bad, { source: 'workspace' }, seed)).toThrow(
        'Phrase replay key line needs a well-formed "ifk1.", "ifk2.", "ifk3." or "ifk4." key.',
      )
    }
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
      '· session phrase 6 (standalone) · seed1-0000000d · ifk4.',
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

/** The doodle's join into a Middle phrase 1: a carry-in from no phrase. */
const NO_PHRASE_CARRY_IN = makeCarryIn({
  origin: 'none',
  lastPitch: { midi: makeConcertPitch(60), arrivingInterval: null, recovery: { kind: 'settled' } },
  registerWindow: makeRegisterWindow(54, 66),
  finalHarmony: null,
})

/** Intent: a real Middle phrase-1 intent receiving the doodle's join, with its steering block. */
function noPhraseIntent(): GenerationIntent {
  const plain = buildIntent({ seed: 14, label: 'replay-doodle' })
  return makeCarryInGenerationIntent({
    requestId: plain.requestId,
    seed: plain.seed,
    controls: BASE_CONTROLS,
    figureLevels: plain.figureLevels,
    carryIn: NO_PHRASE_CARRY_IN,
    steering: SAMPLE_STEERING,
  })
}

// @test-link [[module_phrase_replay_key]]
// @test-link [[rule_jam_phrase_one_joins_doodle]]
describe('phrase replay key and a carry-in from no phrase', () => {
  it('takes phrase number 1, the phrase the doodle joins, and refuses any other', () => {
    const intent = noPhraseIntent()

    expect(() => requireConsistentPhraseNumber(intent, 1)).not.toThrow()
    expect(() => requireConsistentPhraseNumber(intent, 2)).toThrow(PhraseReplayKeyError)
    expect(() => requireConsistentPhraseNumber(intent, 2)).toThrow(/must be 1/u)
  })

  it('the decoder refuses a key whose carry-in holds an origin, as v3.1 does', () => {
    const wireCarryIn = structuredClone(NO_PHRASE_CARRY_IN)
    const ifk3 = validIfk3Tuple()
    ifk3[5] = wireCarryIn

    for (const key of [rawIfk3Key(ifk3), rawKey(tupleWith(6, wireCarryIn))]) {
      expect(() => decodePhraseReplayKey(key)).toThrow(CarryInError)
      expect(() => decodePhraseReplayKey(key)).toThrow('CarryIn has unknown field "origin".')
    }
  })
})
