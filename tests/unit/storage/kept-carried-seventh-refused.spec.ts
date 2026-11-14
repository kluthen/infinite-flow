/**
 * No kept-session body before data version 5 has a form for a carried seventh chord: the data
 * version 4, 2 and 1 bodies' intent readers and stored-request readers each read the carried chord
 * as a triad only, so such a body whose phrase holds a carried seventh, in its intent or in its
 * stored request, is refused with the reason, while the same body without it reads back. A data
 * version 5 body reads the same carried seventh back, in its intent and its stored request.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import { CarryInError, makeCarryIn, type CarryIn } from '@/domain/generation/carry-in/carry-in'
import { GenerationRequestError } from '@/domain/generation/generation-request'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import type { ChordSeventh } from '@/domain/harmony/harmony-types'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { parseKeptIntent, parseKeptIntentV4 } from '@/storage/records/kept-intent-parsers'
import {
  parseKeptSessionBodyV1,
  parseKeptSessionBodyV2,
  type ParsedKeptBody,
  type ParsedKeptPhrase,
} from '@/storage/records/kept-session-body'
import {
  parseKeptSessionBody,
  parseKeptSessionBodyV4,
} from '@/storage/records/kept-session-body-read'
import { encodeKeptSession, type KeptSessionFacts } from '@/storage/records/kept-session-record'
import { APP_VERSION, edited, historyOf, recordedKeptSession } from './kept-session-fixtures'
import { v1Body } from './kept-sessions-v1-fixtures'
import { v2Body } from './kept-sessions-v2-fixtures'
import { v4Body } from './kept-sessions-v4-fixtures'
import { seventhOf } from '../domain/harmony/seventh-chord-fixtures'

/** The facts of a kept session with no favorite, no comment and played notes not kept. */
const FACTS: KeptSessionFacts = {
  pinned: false,
  favorites: [],
  comment: '',
  playedNotesKept: false,
  presets: BUILT_IN_PRESETS,
}

/** The reason a triad-only reader refuses a carried seventh with. */
const REASON = 'CarryIn.finalHarmony holds a seventh, which this form cannot carry.'

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

/** Intent: the phrases a body reader gives: the body's own, or the list it gives itself. */
function phrasesOf(
  read: ParsedKeptBody | readonly ParsedKeptPhrase[],
): readonly ParsedKeptPhrase[] {
  return 'phrases' in read ? read.phrases : read
}

/** Intent: the stored intent of a body's phrase at `index`. */
function intentAt(body: unknown, index: number): unknown {
  return (body as { phrases: { intent: unknown }[] }).phrases[index]!.intent
}

/**
 * Intent: a stored copy of a body whose phrase at `phrase` holds `seventh` on its carried chord in
 * its intent or in its stored request only: that part is replaced whole, since a stored body's
 * request and intent share their carry-in until it is written to the database.
 */
function withCarriedSeventh(
  body: unknown,
  phrase: number,
  where: 'intent' | 'request',
  seventh: ChordSeventh,
): unknown {
  const part = (body as { phrases: Record<string, unknown>[] }).phrases[phrase]![where]
  const withSeventh = edited(part, ['carryIn', 'finalHarmony', 'seventh'], seventh)
  return edited(body, ['phrases', phrase, where], withSeventh)
}

/** Each body before data version 5, its reader, and how it is built from a current body. */
const EARLIER_BODIES = [
  ['4', parseKeptSessionBodyV4, v4Body],
  ['2', parseKeptSessionBodyV2, v2Body],
  ['1', parseKeptSessionBodyV1, (body: unknown) => v1Body(body, (intent) => intent)],
] as const

// @test-link [[entity_phrase_carry_in]]
// @test-link [[rule_earlier_kept_sessions_read_at_off]]
describe.each(EARLIER_BODIES)(
  'a data version %s kept body holding a carried seventh chord',
  (_, read, shaped) => {
    let body: unknown
    let seventh: ChordSeventh
    /** The index of the first stored phrase whose carry-in holds a carried chord. */
    let phrase: number

    beforeAll(() => {
      const records = recordedKeptSession('c-keyboard', 3).phrases()
      body = shaped(
        structuredClone(
          encodeKeptSession(historyOf(records, 'c-keyboard'), FACTS, APP_VERSION).body,
        ),
      )
      phrase = records.findIndex((record) => record.intent.carryIn?.finalHarmony != null)
      seventh = carriedSeventh(records[phrase]!.intent)
    }, 60_000)

    // @test-link [[entity_phrase_carry_in]]
    it('reads back without the seventh', () => {
      const carried = phrasesOf(read(body))[phrase]!.intent.carryIn?.finalHarmony
      expect(carried).toBeTruthy()
      expect(Object.hasOwn(carried!, 'seventh')).toBe(false)
    })

    // @test-link [[entity_phrase_carry_in]]
    it('is refused in its intent, with the reason', () => {
      const stored = withCarriedSeventh(body, phrase, 'intent', seventh)
      expect(() => read(stored)).toThrow(CarryInError)
      expect(() => read(stored)).toThrow(REASON)
    })

    // @test-link [[entity_phrase_carry_in]]
    it('is refused in its stored request, with the reason', () => {
      const stored = withCarriedSeventh(body, phrase, 'request', seventh)
      expect(() => read(stored)).toThrow(GenerationRequestError)
      expect(() => read(stored)).toThrow(`GenerationRequest.carryIn is invalid: ${REASON}`)
    })
  },
)

// @test-link [[entity_phrase_carry_in]]
// @test-link [[entity_kept_session_record]]
describe('a carried seventh chord in a kept body, by data version', () => {
  let body: unknown
  let seventh: ChordSeventh
  /** The index of the first stored phrase whose carry-in holds a carried chord. */
  let phrase: number

  beforeAll(() => {
    const records = recordedKeptSession('c-keyboard', 3).phrases()
    body = structuredClone(
      encodeKeptSession(historyOf(records, 'c-keyboard'), FACTS, APP_VERSION).body,
    )
    phrase = records.findIndex((record) => record.intent.carryIn?.finalHarmony != null)
    seventh = carriedSeventh(records[phrase]!.intent)
  }, 60_000)

  // @test-link [[entity_phrase_carry_in]]
  it("is refused by data version 4's intent reader and read by data version 5's", () => {
    const v4Intent = intentAt(v4Body(body), phrase)
    const intent = edited(v4Intent, ['carryIn', 'finalHarmony', 'seventh'], seventh)
    expect(() => parseKeptIntentV4(intent)).toThrow(REASON)
    expect(parseKeptIntent(intent).carryIn?.finalHarmony?.seventh).toStrictEqual(seventh)
  })

  // @test-link [[entity_phrase_carry_in]]
  // @test-link [[entity_kept_session_record]]
  it('reads back in a data version 5 body, in the intent and the stored request alike', () => {
    const stored = withCarriedSeventh(
      withCarriedSeventh(body, phrase, 'intent', seventh),
      phrase,
      'request',
      seventh,
    )

    const read = parseKeptSessionBody(stored).phrases[phrase]!
    expect(read.intent.carryIn?.finalHarmony?.seventh).toStrictEqual(seventh)
    expect(read.request.carryIn?.finalHarmony?.seventh).toStrictEqual(seventh)
  })
})
