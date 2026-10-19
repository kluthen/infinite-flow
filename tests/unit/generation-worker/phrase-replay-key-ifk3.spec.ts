// @vitest-environment node
/**
 * The `ifk3.` phrase replay key's own format: a fixed 7-tuple, always seven entries in the order
 * phrase-replay-key.ts states, the figure levels by figure id in slot 3 and `null` at index 6 for a
 * built-in instrument; no musical profile's or preset's name and no customized flag. A malformed
 * `ifk3.` key, and one naming a figure or level the app does not know, are refused naming the slot
 * and the reason. An `ifk1.` key's profile name decodes to that profile's levels whatever its
 * customized flag, and no decoded intent holds a profile.
 */

import { describe, expect, it } from 'vitest'

import type { MusicalProfile } from '@/domain/controls/generation-controls'
import {
  FIGURE_IDS,
  JAZZ_FIGURE_LEVELS,
  NEUTRAL_FIGURE_LEVELS,
} from '@/domain/figures/figure-levels'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import {
  encodePhraseReplayKey,
  PHRASE_REPLAY_KEY_CONTROL_ORDER,
  PhraseReplayKeyError,
} from '@/generation-worker/phrase-replay-key'
import { decodePhraseReplayKey } from '@/generation-worker/phrase-replay-key-decode'
import {
  buildIntent,
  carryInAfter,
  generateSuccess,
} from '../domain/generation/carry-in/carry-in-fixture'

/** Intent: a real intent for phrase 2 of a session, carrying phrase 1's carry-in. */
function carryInIntent(): GenerationIntent {
  const firstIntent = buildIntent({ seed: 11, label: 'replay' })
  const carryIn = carryInAfter(firstIntent, generateSuccess(firstIntent), 1)
  return buildIntent({ seed: 12, label: 'replay', carryIn })
}

/** Intent: unpadded base64url of raw bytes, for hand-built payloads. */
function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '')
}

/** Intent: encode any JSON value as an `ifk1.` key, bypassing the codec's own encoder. */
function rawKey(payload: unknown): string {
  return `ifk1.${base64Url(new TextEncoder().encode(JSON.stringify(payload)))}`
}

/** Intent: encode any JSON value as an `ifk3.` key, bypassing the codec's own encoder. */
function rawIfk3Key(payload: unknown): string {
  return `ifk3.${base64Url(new TextEncoder().encode(JSON.stringify(payload)))}`
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
 * Intent: the `ifk1.` 7-tuple v3.0 wrote for an intent and phrase number, its profile slots
 * holding the given profile (a customized Neutral by default, as buildIntent's).
 */
function tupleOf(
  intent: GenerationIntent,
  phraseNumber: number,
  profile: MusicalProfile = 'Neutral',
  isCustom = true,
): unknown[] {
  return [
    intent.requestId,
    intent.seed,
    PHRASE_REPLAY_KEY_CONTROL_ORDER.map((key) =>
      key === 'tonalCenter' ? intent.writtenTonalCenter : intent.controls[key],
    ),
    profile,
    isCustom,
    phraseNumber,
    intent.carryIn ?? null,
  ]
}

/** Intent: the valid `ifk3.` 7-tuple the encoder writes for a plain built-in intent. */
function validIfk3Tuple(): unknown[] {
  return payloadOf(encodePhraseReplayKey(buildIntent({ seed: 5, label: 'tuple' }), 1))
}

/** Intent: a valid `ifk3.` tuple with one slot replaced. */
function ifk3TupleWith(index: number, value: unknown): unknown[] {
  const tuple = validIfk3Tuple()
  tuple[index] = value
  return tuple
}

/** A customized Jazz phrase's `ifk1.` key as v3.0 wrote it (seed 9). Frozen, never regenerated. */
const CUSTOM_JAZZ_IFK1_KEY = [
  'ifk1.WyJjYXJyeS1pbi05Iiw5LFs5MCwiQyIsIk1ham9yIiwiR2VudGxlIGRpYXRvbmljIiwiU2V0dGxlZCIsIlF',
  '1YXJ0ZXIiLCJTbGlnaHRseSB2YXJpZWQiLCJTdHJhaWdodCIsIlNwYXJzZSIsIldhbmRlcmluZyIsIk1pZGRsZSI',
  'sIkxlYXBpbmciLCJQcmVkaWN0YWJsZSIsImMta2V5Ym9hcmQiXSwiSmF6eiIsdHJ1ZSwxLG51bGxd',
].join('')

// @test-link [[module_phrase_replay_key]]
// @test-link [[rule_neutral_and_jazz_figure_levels]]
describe("an ifk1 key decodes to its profile's levels and no profile", () => {
  it("decodes a customized Jazz ifk1 key to Jazz's levels", () => {
    const decoded = decodePhraseReplayKey(CUSTOM_JAZZ_IFK1_KEY)
    expect(decoded.keyVersion).toBe('ifk1')
    expect(decoded.intent.figureLevels).toStrictEqual(JAZZ_FIGURE_LEVELS)
    expect(decoded.intent).toEqual(buildIntent({ seed: 9, musicalProfile: 'Jazz' }))
  })

  it('maps each profile name to its levels whatever its customized flag', () => {
    const intent = buildIntent({ seed: 5, label: 'tuple' })
    for (const [profile, levels] of [
      ['Neutral', NEUTRAL_FIGURE_LEVELS],
      ['Jazz', JAZZ_FIGURE_LEVELS],
    ] as const)
      for (const isCustom of [false, true]) {
        const decoded = decodePhraseReplayKey(rawKey(tupleOf(intent, 1, profile, isCustom)))
        expect(decoded.intent.figureLevels).toStrictEqual(levels)
        expect(Object.keys(decoded.intent)).not.toContain('musicalProfile')
      }
  })
})

// @test-link [[module_phrase_replay_key]]
describe('the ifk3 key', () => {
  it('holds exactly seven entries in the stated order, null at index 6 for a built-in', () => {
    const intent = carryInIntent()
    const tuple = payloadOf(encodePhraseReplayKey(intent, 2))
    expect(tuple).toHaveLength(7)
    expect(tuple[0]).toBe(intent.requestId)
    expect(tuple[1]).toBe(intent.seed)
    expect(tuple[2]).toEqual(
      PHRASE_REPLAY_KEY_CONTROL_ORDER.map((key) =>
        key === 'tonalCenter' ? intent.writtenTonalCenter : intent.controls[key],
      ),
    )
    expect(Object.keys(tuple[3] as object)).toEqual([...FIGURE_IDS])
    expect(tuple[3]).toEqual(intent.figureLevels)
    expect(tuple[4]).toBe(2)
    expect(tuple[5]).toEqual(JSON.parse(JSON.stringify(intent.carryIn)))
    expect(tuple[6]).toBeNull()
    expect(payloadOf(encodePhraseReplayKey(buildIntent({ seed: 5 }), 1))[5]).toBeNull()
  })

  it('holds no musical profile or preset name and no customized flag', () => {
    for (const intent of [buildIntent({ seed: 9, musicalProfile: 'Jazz' }), carryInIntent()]) {
      const key = encodePhraseReplayKey(intent, intent.carryIn === undefined ? 1 : 2)
      const tuple = payloadOf(key)
      expect(JSON.stringify(tuple)).not.toMatch(/Neutral|Jazz|isCustom|musicalProfile/u)
      expect(tuple.some((entry) => typeof entry === 'boolean')).toBe(false)
      expect(Object.keys(decodePhraseReplayKey(key).intent)).not.toContain('musicalProfile')
    }
    for (const key of [CUSTOM_JAZZ_IFK1_KEY, rawKey(tupleOf(carryInIntent(), 2))])
      expect(Object.keys(decodePhraseReplayKey(key).intent)).not.toContain('musicalProfile')
  })

  it('rejects an ifk3 payload that is not a 7-entry array', () => {
    for (const payload of [validIfk3Tuple().slice(0, 6), [...validIfk3Tuple(), null], {}])
      expect(() => decodePhraseReplayKey(rawIfk3Key(payload))).toThrow(
        /"ifk3" payload must be an array of exactly 7 entries/u,
      )
  })

  it('rejects an ifk3 slot of the wrong type and names it', () => {
    const cases: readonly [number, unknown, RegExp][] = [
      [0, 12, /slot 0 \(requestId\)/u],
      [1, '5', /slot 1 \(seed\)/u],
      [2, ['C'], /slot 2 \(controls\)/u],
      [3, 'Neutral', /slot 3 \(figureLevels\)/u],
      [3, [], /slot 3 \(figureLevels\)/u],
      [3, null, /slot 3 \(figureLevels\)/u],
      [4, '1', /slot 4 \(phraseNumber\)/u],
      [5, 'none', /slot 5 \(carryIn\)/u],
      [6, true, /slot 6 \(myInstrument\)/u],
      [6, ['My horn', 45, 81, 3], /slot 6 \(myInstrument\)/u],
    ]
    for (const [index, value, message] of cases) {
      const key = rawIfk3Key(ifk3TupleWith(index, value))
      expect(() => decodePhraseReplayKey(key)).toThrow(PhraseReplayKeyError)
      expect(() => decodePhraseReplayKey(key)).toThrow(message)
    }
  })

  it('refuses an unknown figure, an unknown level or a missing figure with the reason', () => {
    const { appoggiatura, ...missing } = NEUTRAL_FIGURE_LEVELS
    void appoggiatura
    const cases: readonly [unknown, RegExp][] = [
      [{ ...NEUTRAL_FIGURE_LEVELS, blueNote: 'off' }, /unknown figure "blueNote"/u],
      [{ ...NEUTRAL_FIGURE_LEVELS, passingTone: 'often' }, /unknown level "often"/u],
      [missing, /missing the figure "appoggiatura"/u],
    ]
    for (const [levels, reason] of cases) {
      const key = rawIfk3Key(ifk3TupleWith(3, levels))
      expect(() => decodePhraseReplayKey(key)).toThrow(PhraseReplayKeyError)
      expect(() => decodePhraseReplayKey(key)).toThrow(/slot 3 \(figureLevels\) is invalid: /u)
      expect(() => decodePhraseReplayKey(key)).toThrow(reason)
    }
  })

  it('decodes levels no musical profile gives, written in any key order', () => {
    const levels = { ...NEUTRAL_FIGURE_LEVELS, chromaticEnclosure: 'favored', passingTone: 'off' }
    const reversed = Object.fromEntries(Object.entries(levels).reverse())
    const decoded = decodePhraseReplayKey(rawIfk3Key(ifk3TupleWith(3, reversed)))
    expect(decoded.intent.figureLevels).toStrictEqual(levels)
    expect(Object.keys(decoded.intent.figureLevels)).toEqual([...FIGURE_IDS])
  })
})
