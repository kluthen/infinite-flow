/**
 * The kept-session codec over v3.2's shape: a session with a phrase locked on its bars, one with a
 * rhythm change and a forced bend round-trips with every reproduction input, and each phrase
 * replays from its kept intent to its kept timeline; a Jam-style session whose phrase 1 joins from
 * no phrase beside its steering block round-trips with its body's doodle, which a favorite change
 * keeps; the body's data version is 4, a body below it unreadable and one above it newer.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import { OFF_CHORD_FAMILIES, type ChordFamilies } from '@/domain/chords/chord-families'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { SessionHistoryRecord } from '@/session/session-history'
import { upgradedKeptBodyV4, upgradedKeptSummaryV4 } from '@/storage/migrations/kept-sessions-v4'
import { parseKeptSessionBody } from '@/storage/records/kept-session-body-read'
import {
  decodeKeptSession,
  encodeKeptSession,
  KEPT_SESSION_BODY_DATA_VERSION,
  rewriteKeptBodyFavorite,
  type KeptSession,
  type KeptSessionFacts,
  type StoredKeptSession,
} from '@/storage/records/kept-session-record'
import {
  keptSessionBodyRecord,
  rewrittenKeptBodyRecord,
  rewrittenKeptBodyRecordV2,
  type KeptSessionBodyRecord,
  type ParsedKeptPhrase,
} from '@/storage/records/kept-session-body'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import {
  allKeys,
  APP_VERSION,
  edited,
  historyOf,
  recordedKeptSession,
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

/**
 * Intent: a stored value's bytes, key order and keys holding `undefined` included, so two bodies
 * compare as exactly the same stored record.
 */
function storedBytes(value: unknown): string {
  return JSON.stringify(value, (_key, entry: unknown) =>
    entry === undefined ? '<undefined>' : entry,
  )
}

/** Intent: an intent as v3.2 built it, before the Seventh chords level existed. */
function withoutChordFamilies(intent: GenerationIntent): Omit<GenerationIntent, 'chordFamilies'> {
  const { chordFamilies, ...earlier } = intent
  void chordFamilies
  return earlier
}

/**
 * Intent: a body as the writer wrote it before the Seventh chords level existed: each phrase's
 * intent the very intent it was written from, without the level it did not have yet, stored whole.
 */
function writtenWhole(
  body: KeptSessionBodyRecord,
  intents: readonly GenerationIntent[],
): KeptSessionBodyRecord {
  return {
    ...body,
    phrases: body.phrases.map((phrase, index) => ({
      ...phrase,
      intent: withoutChordFamilies(intents[index]!),
    })),
  }
}

/** Intent: a recorded phrase whose intent also carries a Seventh chords level. */
function withChordFamilies(
  record: SessionHistoryRecord,
  chordFamilies: ChordFamilies,
): SessionHistoryRecord {
  const intent = { ...record.intent, chordFamilies }
  return { ...record, intent }
}

/** Intent: a read-back phrase whose intent also carries a Seventh chords level. */
function parsedWithChordFamilies(
  phrase: ParsedKeptPhrase,
  chordFamilies: ChordFamilies,
): ParsedKeptPhrase {
  const intent = { ...phrase.intent, chordFamilies }
  return { ...phrase, intent }
}

/** Intent: whether a stored body's phrases hold a `chordFamilies` key in their intent. */
function storesChordFamilies(body: KeptSessionBodyRecord): boolean {
  return body.phrases.some((phrase) => Object.hasOwn(phrase.intent, 'chordFamilies'))
}

/** The Seventh chords level above Off, which data version 4 cannot store. */
const FAVORED_SEVENTHS: ChordFamilies = { 'seventh-chords': 'favored' }

// @test-link [[module_kept_session_codec]]
// @test-link [[entity_kept_session_record]]
describe("a body written with data version 4's intent keys", () => {
  let sessions: readonly (readonly SessionHistoryRecord[])[]

  beforeAll(() => {
    sessions = [
      recordedKeptSession('c-keyboard', 2).phrases(),
      lockedSessionRecords(),
      jamSessionRecords(),
    ]
  }, 60_000)

  /** Intent: the body of recorded phrases, phrase 2 a favorite, no doodle. */
  function bodyOf(records: readonly SessionHistoryRecord[]): KeptSessionBodyRecord {
    return keptSessionBodyRecord(
      records,
      new Set([2]),
      { doodle: null, playedNotesClock: null },
      APP_VERSION,
    )
  }

  // @test-link [[module_kept_session_codec]]
  it("writes today's intents byte for byte as before, carry-in, lock group and steering included", () => {
    for (const records of sessions) {
      const body = bodyOf(records)
      const intents = records.map((record) => record.intent)
      expect(storedBytes(body)).toBe(storedBytes(writtenWhole(body, intents)))

      const read = parseKeptSessionBody(structuredClone(body))
      const rewritten = rewrittenKeptBodyRecord(read, () => true, APP_VERSION)
      expect(storedBytes(rewritten)).toBe(storedBytes(writtenWhole(rewritten, intents)))
      const rewrittenV2 = rewrittenKeptBodyRecordV2(read.phrases, () => false, APP_VERSION)
      expect(storedBytes(rewrittenV2)).toBe(storedBytes(writtenWhole(rewrittenV2, intents)))
    }
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[entity_kept_session_record]]
  it('stores an intent whose Seventh chords level is Off without the level, and reopens it', () => {
    for (const records of sessions) {
      const atOff = records.map((record) => withChordFamilies(record, OFF_CHORD_FAMILIES))
      const body = bodyOf(atOff)

      expect(storesChordFamilies(body)).toBe(false)
      expect(storedBytes(body)).toBe(storedBytes(bodyOf(records)))
      const read = parseKeptSessionBody(structuredClone(body))
      read.phrases.forEach((phrase, index) => {
        expect(phrase.intent).toEqual(records[index]!.intent)
        expect(phrase.intent.chordFamilies).toStrictEqual(OFF_CHORD_FAMILIES)
      })

      const readAtOff = read.phrases.map((phrase) =>
        parsedWithChordFamilies(phrase, OFF_CHORD_FAMILIES),
      )
      const rewritten = rewrittenKeptBodyRecord(
        { ...read, phrases: readAtOff },
        () => true,
        APP_VERSION,
      )
      expect(storesChordFamilies(rewritten)).toBe(false)
      expect(
        storesChordFamilies(rewrittenKeptBodyRecordV2(readAtOff, () => true, APP_VERSION)),
      ).toBe(false)
    }
    const kept = keptRecords(
      lockedSessionRecords().map((record) => withChordFamilies(record, OFF_CHORD_FAMILIES)),
    )
    expect(decoded(kept).phrases).toHaveLength(4)
  })

  // @test-link [[module_kept_session_codec]]
  it('refuses an intent whose Seventh chords level is above Off rather than storing it as Off', () => {
    const records = sessions[1]!
    const favored = records.map((record, index) =>
      index === 1 ? withChordFamilies(record, FAVORED_SEVENTHS) : record,
    )
    expect(() => bodyOf(favored)).toThrow(/Seventh chords level .* above Off/u)
    expect(() => keptRecords(favored)).toThrow(/Seventh chords level .* above Off/u)

    const read = parseKeptSessionBody(structuredClone(bodyOf(records)))
    const readFavored = read.phrases.map((phrase, index) =>
      index === 1 ? parsedWithChordFamilies(phrase, FAVORED_SEVENTHS) : phrase,
    )
    expect(() =>
      rewrittenKeptBodyRecord({ ...read, phrases: readFavored }, () => true, APP_VERSION),
    ).toThrow(/Seventh chords level .* above Off/u)
    expect(() => rewrittenKeptBodyRecordV2(readFavored, () => true, APP_VERSION)).toThrow(
      /Seventh chords level .* above Off/u,
    )
  })
})

// @test-link [[module_kept_session_codec]]
// @test-link [[entity_kept_session_record]]
// @test-link [[rule_seventh_chord_draws_reproducible]]
describe('a kept session and the Seventh chords level', () => {
  let sessions: readonly (readonly SessionHistoryRecord[])[]

  beforeAll(() => {
    sessions = [
      recordedKeptSession('c-keyboard', 2).phrases(),
      lockedSessionRecords(),
      jamSessionRecords(),
    ]
  }, 60_000)

  /** Intent: the stored records of a session as v3.2 saved it, each intent without the level. */
  function savedOnV32(records: readonly SessionHistoryRecord[]): StoredKeptSession {
    const stored = keptRecords(records)
    const body = stored.body as KeptSessionBodyRecord
    return {
      ...stored,
      body: structuredClone(
        writtenWhole(
          body,
          records.map((record) => record.intent),
        ),
      ),
    }
  }

  // @test-link [[module_kept_session_codec]]
  it('reopens a session saved on v3.2 with every phrase at Off', () => {
    for (const records of sessions) {
      const stored = savedOnV32(records)
      expect(storesChordFamilies(stored.body as KeptSessionBodyRecord)).toBe(false)

      const phrases = decoded(stored).phrases
      expect(phrases).toHaveLength(records.length)
      phrases.forEach((phrase, index) => {
        expect(phrase.intent.chordFamilies).toStrictEqual(OFF_CHORD_FAMILIES)
        expect(phrase.intent).toStrictEqual(records[index]!.intent)
      })
    }
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[entity_kept_session_record]]
  it('saves a session played now, its intents at Off, without the level, and reopens it at Off', () => {
    for (const records of sessions) {
      for (const record of records)
        expect(record.intent.chordFamilies).toStrictEqual(OFF_CHORD_FAMILIES)
      const stored = keptRecords(records)

      expect(storesChordFamilies(stored.body as KeptSessionBodyRecord)).toBe(false)
      expect(storedBytes(stored.body)).toBe(storedBytes(savedOnV32(records).body))
      decoded(stored).phrases.forEach((phrase, index) => {
        expect(phrase.intent.chordFamilies).toStrictEqual(OFF_CHORD_FAMILIES)
        expect(Object.keys(phrase.intent)).toEqual(Object.keys(records[index]!.intent))
      })
    }
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[entity_kept_session_record]]
  it('reads a stored intent holding the level as unreadable, at Off or above', () => {
    const stored = keptRecords(sessions[1]!)
    for (const chordFamilies of [OFF_CHORD_FAMILIES, FAVORED_SEVENTHS]) {
      const body = edited(stored.body, ['phrases', 1, 'intent', 'chordFamilies'], chordFamilies)

      expect(() => parseKeptSessionBody(body)).toThrow(/chordFamilies/u)
      expect(decodeKeptSession({ ...stored, body })).toEqual({ reading: 'unreadable' })
    }
  })
})
