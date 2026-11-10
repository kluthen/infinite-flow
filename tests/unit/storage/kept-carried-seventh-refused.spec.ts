/**
 * A data version 4 kept-session body has no form for a carried seventh chord: its intent reader
 * and its stored-request reader each read the carried chord as a triad only, so a body whose
 * phrase holds a carried seventh, in its intent or in its stored request, is refused with the
 * reason, while the same body without it reads back.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import { CarryInError, makeCarryIn, type CarryIn } from '@/domain/generation/carry-in/carry-in'
import { GenerationRequestError } from '@/domain/generation/generation-request'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import type { ChordSeventh } from '@/domain/harmony/harmony-types'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { parseKeptIntent } from '@/storage/records/kept-intent-parsers'
import { parseKeptSessionBody } from '@/storage/records/kept-session-body-read'
import { encodeKeptSession, type KeptSessionFacts } from '@/storage/records/kept-session-record'
import { APP_VERSION, edited, historyOf, recordedKeptSession } from './kept-session-fixtures'
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

// @test-link [[entity_phrase_carry_in]]
describe('a data version 4 kept body holding a carried seventh chord', () => {
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
  it('reads back without the seventh', () => {
    const carried = parseKeptSessionBody(body).phrases[phrase]!.intent.carryIn?.finalHarmony
    expect(carried).toBeTruthy()
    expect(Object.hasOwn(carried!, 'seventh')).toBe(false)
  })

  // @test-link [[entity_phrase_carry_in]]
  it('is refused by its intent reader, with the reason', () => {
    const intent = edited(
      (body as { phrases: { intent: unknown }[] }).phrases[phrase]!.intent,
      ['carryIn', 'finalHarmony', 'seventh'],
      seventh,
    )
    expect(() => parseKeptIntent(intent)).toThrow(CarryInError)
    expect(() => parseKeptIntent(intent)).toThrow(REASON)
    const stored = edited(body, ['phrases', phrase, 'intent'], intent)
    expect(() => parseKeptSessionBody(stored)).toThrow(REASON)
  })

  // @test-link [[entity_phrase_carry_in]]
  it('is refused by its stored-request reader, with the reason', () => {
    const path = ['phrases', phrase, 'request', 'carryIn', 'finalHarmony', 'seventh']
    const stored = edited(body, path, seventh)
    expect(() => parseKeptSessionBody(stored)).toThrow(GenerationRequestError)
    expect(() => parseKeptSessionBody(stored)).toThrow(
      `GenerationRequest.carryIn is invalid: ${REASON}`,
    )
  })
})
