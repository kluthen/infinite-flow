/**
 * The kept-session codec over v3.2's shape: a session with a phrase locked on its bars, one with a
 * rhythm change and a forced bend round-trips with every reproduction input, and each phrase
 * replays from its kept intent to its kept timeline; a Jam-style session whose phrase 1 joins from
 * no phrase beside its steering block round-trips with its body's doodle, which a favorite change
 * keeps; the body's data version is 4, a body below it unreadable and one above it newer.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { SessionHistoryRecord } from '@/session/session-history'
import { upgradedKeptBodyV4, upgradedKeptSummaryV4 } from '@/storage/migrations/kept-sessions-v4'
import { parseKeptSessionBody } from '@/storage/records/kept-session-body'
import {
  decodeKeptSession,
  encodeKeptSession,
  KEPT_SESSION_BODY_DATA_VERSION,
  rewriteKeptBodyFavorite,
  type KeptSession,
  type KeptSessionFacts,
  type StoredKeptSession,
} from '@/storage/records/kept-session-record'
import { keptSessionBodyRecord } from '@/storage/records/kept-session-body'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import {
  allKeys,
  APP_VERSION,
  edited,
  historyOf,
  REMOVE,
  storedRecords,
} from './kept-session-fixtures'
import { jamSessionRecords, KEPT_DOODLE, lockedSessionRecords } from './kept-session-v32-fixtures'

/** The facts of a kept session with phrase 2 a favorite, no comment, played notes not kept. */
const FACTS: KeptSessionFacts = {
  pinned: false,
  favorites: [2],
  comment: '',
  playedNotesKept: false,
  presets: BUILT_IN_PRESETS,
}

/** Intent: the session stored values decode to, failing the test unless they read as current. */
function decoded(stored: StoredKeptSession): KeptSession {
  const reading = decodeKeptSession(stored)
  if (reading.reading !== 'current')
    throw new Error(`Expected a current session, got ${reading.reading}.`)
  return reading.value
}

/** Intent: the stored records of a session over recorded phrases on the C keyboard. */
function keptRecords(records: readonly SessionHistoryRecord[]): StoredKeptSession {
  return storedRecords(encodeKeptSession(historyOf(records, 'c-keyboard'), FACTS, APP_VERSION))
}

/**
 * Intent: the stored records of the Jam-style session, its body holding the doodle as the test
 * writes it.
 */
function jamRecords(records: readonly SessionHistoryRecord[]): StoredKeptSession {
  const stored = keptRecords(records)
  const body = keptSessionBodyRecord(
    records,
    new Set([2]),
    { doodle: KEPT_DOODLE, playedNotesClock: null },
    APP_VERSION,
  )
  const summary = edited(edited(stored.summary, ['isJam'], true), ['suggestionDeclined'], false)
  return { ...stored, summary, body: structuredClone(body) }
}

// @test-link [[module_kept_session_codec]]
// @test-link [[rule_kept_session_content]]
describe('a kept session with locked, changed and forced-bend phrases', () => {
  let records: readonly SessionHistoryRecord[]
  let stored: StoredKeptSession

  beforeAll(() => {
    records = lockedSessionRecords()
    stored = keptRecords(records)
  }, 60_000)

  // @test-link [[rule_kept_session_content]]
  it('is built from real phrases: pending, locked bars, a rhythm change and a forced bend', () => {
    const provenances = records.map((record) => record.outcome.provenance)
    expect(records.map((record) => record.intent.rhythmLock?.state.kind)).toEqual([
      'pending',
      'locked',
      'locked',
      'locked',
    ])
    expect(provenances.map((provenance) => provenance.rhythmLockOutcome)).toEqual([
      undefined,
      'locked_bars',
      'rhythm_change',
      'forced_bend',
    ])
    expect(provenances[2]!.rhythmChange).not.toBe('no_change_available')
    expect(records.slice(1).every((record) => record.intent.carryIn !== undefined)).toBe(true)
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[rule_kept_session_content]]
  it('decodes with every reproduction input, each request and intent holding the lock group', () => {
    const session = decoded(stored)

    expect(session.phrases).toHaveLength(4)
    session.phrases.forEach((phrase, index) => {
      const record = records[index]!
      expect(phrase.intent).toEqual(record.intent)
      expect(phrase.intent.rhythmLock).toEqual(record.intent.rhythmLock)
      expect(phrase.intent.carryIn).toEqual(record.intent.carryIn)
      expect(phrase.outcome.result.timeline).toEqual(record.outcome.result.timeline)
      expect(phrase.outcome.provenance).toEqual({ harmony: record.outcome.provenance.harmony })
    })
    const body = parseKeptSessionBody(stored.body)
    body.phrases.forEach((phrase, index) =>
      expect(phrase.request).toEqual(records[index]!.outcome.request),
    )
    expect(body.doodle).toBeNull()
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[rule_kept_session_content]]
  it('replays each phrase from its kept intent to its kept timeline', () => {
    for (const phrase of decoded(stored).phrases) {
      const replayed = generatePhrase(phrase.intent)
      if (replayed.kind !== 'generation_success')
        throw new Error(`Phrase ${phrase.phraseNumber} did not replay: ${replayed.code}.`)
      expect(replayed.result.timeline, `phrase ${phrase.phraseNumber}`).toEqual(
        phrase.outcome.result.timeline,
      )
      expect(replayed.provenance.harmony).toEqual(phrase.outcome.provenance.harmony)
    }
  })

  // @test-link [[rule_kept_session_holds_no_acknowledgements]]
  it("keeps the lock's outcome and the rhythm change out of every record", () => {
    const keys = allKeys(stored)
    for (const forbidden of ['rhythmLockOutcome', 'rhythmChange', 'rhythm', 'diagnostics'])
      expect(keys.has(forbidden), forbidden).toBe(false)
  })

  // @test-link [[entity_kept_session_record]]
  it('writes the body at data version 4 with no doodle', () => {
    expect(KEPT_SESSION_BODY_DATA_VERSION).toBe(4)
    expect(stored.body).toMatchObject({ dataVersion: 4, appVersion: APP_VERSION })
    expect(Object.keys(stored.body as object).sort()).toEqual([
      'appVersion',
      'dataVersion',
      'phrases',
    ])
  })
})

// @test-link [[module_kept_session_codec]]
// @test-link [[entity_kept_session_record]]
describe('a kept Jam-style session whose phrase 1 joins from no phrase', () => {
  let records: readonly SessionHistoryRecord[]
  let stored: StoredKeptSession

  beforeAll(() => {
    records = jamSessionRecords()
    stored = jamRecords(records)
  }, 60_000)

  // @test-link [[module_kept_session_codec]]
  // @test-link [[rule_kept_session_content]]
  it('decodes phrase 1 with its steering block and its join from no phrase, phrase 2 with its join', () => {
    const session = decoded(stored)

    session.phrases.forEach((phrase, index) => {
      expect(phrase.intent).toEqual(records[index]!.intent)
      expect(phrase.intent.steering).toEqual(records[index]!.intent.steering)
    })
    expect(session.phrases[0]!.intent.carryIn).toMatchObject({ origin: 'none' })
    expect(Object.hasOwn(session.phrases[1]!.intent.carryIn!, 'origin')).toBe(false)
    const body = parseKeptSessionBody(stored.body)
    expect(body.phrases[0]!.request.carryIn).toMatchObject({ origin: 'none' })
    expect(body.phrases[0]!.request.steering).toEqual(records[0]!.intent.steering)
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[entity_kept_session_record]]
  it('reads its body back with the doodle and its capture tempo', () => {
    const body = parseKeptSessionBody(stored.body)

    expect(body.doodle).toEqual(KEPT_DOODLE)
    expect(Object.keys((stored.body as { doodle: object }).doodle).sort()).toEqual([
      'captureTempo',
      'quantized',
    ])
  })

  // @test-link [[module_kept_session_codec]]
  it('replays each phrase from its kept intent to its kept timeline', () => {
    for (const phrase of decoded(stored).phrases) {
      const replayed = generatePhrase(phrase.intent)
      if (replayed.kind !== 'generation_success')
        throw new Error(`Phrase ${phrase.phraseNumber} did not replay: ${replayed.code}.`)
      expect(replayed.result.timeline).toEqual(phrase.outcome.result.timeline)
    }
  })

  // @test-link [[module_kept_session_changes]]
  it('keeps the doodle unchanged when a favorite mark changes', () => {
    const rewritten = rewriteKeptBodyFavorite(stored.body, 1, true, APP_VERSION)

    expect(rewritten?.favoritesCount).toBe(2)
    const body = parseKeptSessionBody(structuredClone(rewritten!.body))
    expect(body.doodle).toEqual(KEPT_DOODLE)
    expect(body.phrases.map((phrase) => phrase.favorite)).toEqual([true, true])
  })

  // @test-link [[module_kept_session_codec]]
  it.each([
    ['a doodle with a tempo of its own', ['doodle', 'quantized', 'tempo'], 96],
    ['a doodle of five measures', ['doodle', 'quantized', 'measureCount'], 5],
    ['a doodle with no capture tempo', ['doodle', 'captureTempo'], REMOVE],
    ['a capture tempo of 0', ['doodle', 'captureTempo'], 0],
    ['a doodle entry with an extra key', ['doodle', 'clock'], 0],
    ['a doodle that is no object', ['doodle'], 'doodle'],
  ] as const)('reads a body with %s as unreadable', (_, path, replacement) => {
    const body = edited(stored.body, path, replacement)

    expect(decodeKeptSession({ ...stored, body })).toEqual({ reading: 'unreadable' })
  })
})

// @test-link [[module_kept_session_codec]]
// @test-link [[rule_outdated_tab_reads_what_it_can]]
describe("a body of another data version than the body's shape", () => {
  let stored: StoredKeptSession

  beforeAll(() => {
    stored = keptRecords(lockedSessionRecords())
  }, 60_000)

  // @test-link [[module_kept_session_codec]]
  // @test-link [[module_kept_session_jam_upgrade_step]]
  it("reads a body at data version 2, v3.1's, as unreadable after the upgrade", () => {
    const older = edited(stored.body, ['dataVersion'], 2)

    expect(decodeKeptSession({ ...stored, body: older })).toEqual({ reading: 'unreadable' })
  })

  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('leaves a body at data version 5 unread as newer', () => {
    const newer = edited(stored.body, ['dataVersion'], 5)

    expect(decodeKeptSession({ ...stored, body: newer })).toEqual({ reading: 'newer' })
  })

  // @test-link [[module_kept_session_jam_upgrade_step]]
  it('gives no rewrite to step 4 of a session-wide record or a body already at data version 4', () => {
    expect(upgradedKeptBodyV4(stored.body, APP_VERSION)).toBeNull()
    expect(upgradedKeptSummaryV4(stored.summary, APP_VERSION)).toBeNull()
  })
})
