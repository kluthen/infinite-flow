// @vitest-environment node
/**
 * No phrase replay key version has a form for a carried seventh chord: every version, `ifk1.` to
 * `ifk4.`, reads its carry-in's carried chord as a triad only, so a key whose carry-in holds the
 * seventh of its own degree is refused on decode with the reason, while the same key without it
 * decodes. The keys are hand-built from the payload a real phrase 2 encodes to, for a built-in
 * instrument (`ifk1.`, `ifk3.`, `ifk4.`) and for my instrument (`ifk2.`).
 */

import { describe, expect, it } from 'vitest'

import { OFF_CHORD_FAMILIES } from '@/domain/chords/chord-families'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { CarryInError, makeCarryIn, type CarryIn } from '@/domain/generation/carry-in/carry-in'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import type { ChordSeventh } from '@/domain/harmony/harmony-types'
import { makeMyInstrument } from '@/domain/profile/my-instrument'
import { makeSeed } from '@/domain/random/seed'
import { encodePhraseReplayKey } from '@/generation-worker/phrase-replay-key'
import { decodePhraseReplayKey } from '@/generation-worker/phrase-replay-key-decode'
import {
  BASE_CONTROLS,
  carryInAfter,
  generateSuccess,
} from '../domain/generation/carry-in/carry-in-fixture'
import { seventhOf } from '../domain/harmony/seventh-chord-fixtures'

/** The reason a triad-only reader refuses a carried seventh with. */
const REASON = 'CarryIn.finalHarmony holds a seventh, which this form cannot carry.'

/** My instrument written C3 to E5, sounding a minor third lower. */
const HORN_IN_A = makeMyInstrument({
  template: 'c-keyboard',
  name: 'My horn in A',
  clef: 'treble',
  writtenRange: { minMidi: 48, maxMidi: 76 },
  transposition: { octaves: 0, semitones: 3, direction: 'lower' },
})

/** Intent: a real intent for a built-in or my instrument, with an optional carry-in. */
function intentWith(seed: number, mine: boolean, carryIn?: CarryIn): GenerationIntent {
  const input = {
    requestId: makeRequestId(`seventh-key-${seed}`),
    seed: makeSeed(seed),
    controls: makeGenerationControls({
      ...BASE_CONTROLS,
      ...(mine ? { tonalCenter: 'D', instrumentProfileId: 'my-instrument' } : {}),
    }),
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    chordFamilies: OFF_CHORD_FAMILIES,
    ...(mine ? { instrumentProfile: HORN_IN_A.profile } : {}),
  }
  return carryIn === undefined
    ? createGenerationIntent(input)
    : makeCarryInGenerationIntent({ ...input, carryIn })
}

/** Intent: phrase 2's intent of the instrument, carrying phrase 1's (seed 11) carry-in. */
function phraseTwoIntent(mine: boolean): GenerationIntent {
  const first = intentWith(11, mine)
  return intentWith(12, mine, carryInAfter(first, generateSuccess(first), 1))
}

/**
 * Intent: the seventh of the carried chord's own degree in the intent's concert collection, after
 * checking the carry-in holding it is one the domain accepts.
 */
function carriedSeventh(intent: GenerationIntent): ChordSeventh {
  const carryIn = intent.carryIn
  if (carryIn?.finalHarmony == null) throw new Error('Expected a carried chord.')
  const collection = makeHarmonyCollection(intent.controls.tonalCenter, intent.controls.collection)
  const seventh = seventhOf(carryIn.finalHarmony.triad.degree, collection)
  makeCarryIn({ ...carryIn, finalHarmony: { ...carryIn.finalHarmony, seventh } } as CarryIn)
  return seventh
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

/** One key version: its name, whether its phrase is my instrument's, its tuple, its carry-in slot. */
type VersionCase = readonly [string, boolean, (ifk4: unknown[]) => unknown[], number]

/**
 * Each version's tuple, rebuilt from the `ifk4.` 9-tuple of the same phrase: `ifk1.` and `ifk2.`
 * hold a (Neutral, customized) profile name and flag where `ifk3.` holds the levels, and the
 * carry-in one slot later; `ifk2.` then my instrument's entry; `ifk3.` the first seven entries.
 */
const VERSIONS: readonly VersionCase[] = [
  ['ifk1', false, (t) => [t[0], t[1], t[2], 'Neutral', true, t[4], t[5]], 6],
  ['ifk2', true, (t) => [t[0], t[1], t[2], 'Neutral', true, t[4], t[5], t[6]], 6],
  ['ifk3', false, (t) => t.slice(0, 7), 5],
  ['ifk4', false, (t) => t, 5],
]

// @test-link [[entity_phrase_carry_in]]
// @test-link [[module_phrase_replay_key]]
describe('a phrase replay key whose carry-in holds a carried seventh chord', () => {
  // @test-link [[entity_phrase_carry_in]]
  // @test-link [[module_phrase_replay_key]]
  it.each(VERSIONS)(
    'is refused on decode as an %s key, with the reason',
    (version, mine, tupleOf, slot) => {
      const intent = phraseTwoIntent(mine)
      const tuple = tupleOf(payloadOf(encodePhraseReplayKey(intent, 2)))
      const decoded = decodePhraseReplayKey(rawKey(version, tuple))
      expect(decoded.keyVersion).toBe(version)
      expect(decoded.intent.carryIn).toStrictEqual(intent.carryIn)

      const carried = tuple[slot] as { finalHarmony: Record<string, unknown> }
      carried.finalHarmony.seventh = carriedSeventh(intent)
      expect(() => decodePhraseReplayKey(rawKey(version, tuple))).toThrow(CarryInError)
      expect(() => decodePhraseReplayKey(rawKey(version, tuple))).toThrow(REASON)
    },
  )
})
