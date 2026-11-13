/**
 * The kept-session codec over v3.2's shape: a session with a phrase locked on its bars, one with a
 * rhythm change and a forced bend round-trips with every reproduction input, and each phrase
 * replays from its kept intent to its kept timeline; a Jam-style session whose phrase 1 joins from
 * no phrase beside its steering block round-trips with its body's doodle, which a favorite change
 * keeps; the body's data version is 5, a body below it unreadable and one above it newer. Each
 * phrase's intent is stored with its Seventh chords level at any level, while the writers of data
 * versions 2 and 4, which only the upgrade steps run, store none and refuse one above Off.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import {
  CHORD_FAMILY_LEVEL_IDS,
  ChordFamiliesError,
  OFF_CHORD_FAMILIES,
  type ChordFamilies,
} from '@/domain/chords/chord-families'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { SessionHistoryRecord } from '@/session/session-history'
import { upgradedKeptBodyV4, upgradedKeptSummaryV4 } from '@/storage/migrations/kept-sessions-v4'
import { upgradedKeptBodyV5 } from '@/storage/migrations/presets-and-kept-sessions-v5'
import { isKeptPhraseRefusal } from '@/storage/records/kept-phrase-parsers'
import {
  parseKeptSessionBody,
  parseKeptSessionBodyV4,
} from '@/storage/records/kept-session-body-read'
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
  rewrittenKeptBodyRecordV4,
  type KeptSessionBodyRecord,
  type KeptSessionBodyRecordV4,
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
import { v4Body } from './kept-sessions-v4-fixtures'

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
  it('writes the body at data version 5 with no doodle', () => {
    expect(KEPT_SESSION_BODY_DATA_VERSION).toBe(5)
    expect(stored.body).toMatchObject({ dataVersion: 5, appVersion: APP_VERSION })
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
  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  it("reads a body at data version 2, v3.1's, or 4, v3.2's, as unreadable after the upgrade", () => {
    for (const version of [2, 4]) {
      const older = edited(stored.body, ['dataVersion'], version)

      expect(decodeKeptSession({ ...stored, body: older }), `${version}`).toEqual({
        reading: 'unreadable',
      })
    }
  })

  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('leaves a body at data version 6 unread as newer', () => {
    const newer = edited(stored.body, ['dataVersion'], 6)

    expect(decodeKeptSession({ ...stored, body: newer })).toEqual({ reading: 'newer' })
  })

  // @test-link [[module_kept_session_jam_upgrade_step]]
  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  it('gives no rewrite to step 4 or 5 of a session-wide record or a body already at its data version', () => {
    expect(upgradedKeptBodyV4(stored.body, APP_VERSION)).toBeNull()
    expect(upgradedKeptSummaryV4(stored.summary, APP_VERSION)).toBeNull()
    expect(upgradedKeptBodyV5(stored.body, APP_VERSION)).toBeNull()
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
 * Intent: a body as a writer wrote it when it stored each phrase's intent whole: the very intent it
 * was written from, its Seventh chords level kept (data version 5) or dropped (data versions 2
 * and 4).
 */
function writtenWhole(
  body: KeptSessionBodyRecordV4,
  intents: readonly GenerationIntent[],
  level: 'kept' | 'dropped',
): KeptSessionBodyRecordV4 {
  return {
    ...body,
    phrases: body.phrases.map((phrase, index) => ({
      ...phrase,
      intent: level === 'kept' ? intents[index]! : withoutChordFamilies(intents[index]!),
    })),
  }
}

/** Intent: a recorded phrase whose intent carries the given Seventh chords level. */
function withChordFamilies(
  record: SessionHistoryRecord,
  chordFamilies: ChordFamilies,
): SessionHistoryRecord {
  const intent = { ...record.intent, chordFamilies }
  return { ...record, intent }
}

/** Intent: a read-back phrase whose intent carries the given Seventh chords level. */
function parsedWithChordFamilies(
  phrase: ParsedKeptPhrase,
  chordFamilies: ChordFamilies,
): ParsedKeptPhrase {
  const intent = { ...phrase.intent, chordFamilies }
  return { ...phrase, intent }
}

/** Intent: whether a stored body's phrases hold a `chordFamilies` key in their intent. */
function storesChordFamilies(body: unknown): boolean {
  return (body as KeptSessionBodyRecordV4).phrases.some((phrase) =>
    Object.hasOwn(phrase.intent, 'chordFamilies'),
  )
}

/** The Seventh chords level above Off, which data versions 2 and 4 cannot store. */
const FAVORED_SEVENTHS: ChordFamilies = { 'seventh-chords': 'favored' }

// @test-link [[module_kept_session_codec]]
// @test-link [[entity_kept_session_record]]
describe("a body's intents and the Seventh chords level, by the data version written", () => {
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
  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  it('writes each intent whole, its level after its figure levels, and data versions 2 and 4 byte for byte as before, without it', () => {
    for (const records of sessions) {
      const body = bodyOf(records)
      const intents = records.map((record) => record.intent)
      expect(storedBytes(body)).toBe(storedBytes(writtenWhole(body, intents, 'kept')))
      for (const { intent } of body.phrases) {
        const keys = Object.keys(intent)
        expect(keys.indexOf('chordFamilies')).toBe(keys.indexOf('figureLevels') + 1)
      }

      const read = parseKeptSessionBody(structuredClone(body))
      const rewritten = rewrittenKeptBodyRecord(read, () => true, APP_VERSION)
      expect(storedBytes(rewritten)).toBe(storedBytes(writtenWhole(rewritten, intents, 'kept')))
      const rewrittenV4 = rewrittenKeptBodyRecordV4(read, () => false, APP_VERSION)
      expect(rewrittenV4.dataVersion).toBe(4)
      expect(storedBytes(rewrittenV4)).toBe(
        storedBytes(writtenWhole(rewrittenV4, intents, 'dropped')),
      )
      const rewrittenV2 = rewrittenKeptBodyRecordV2(read.phrases, () => false, APP_VERSION)
      expect(storedBytes(rewrittenV2)).toBe(
        storedBytes(writtenWhole(rewrittenV2, intents, 'dropped')),
      )
    }
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[entity_kept_session_record]]
  it('stores each level, Off included, and reopens it, where data versions 2 and 4 store none at Off', () => {
    for (const records of sessions) {
      for (const level of CHORD_FAMILY_LEVEL_IDS) {
        const families: ChordFamilies = { 'seventh-chords': level }
        const leveled = records.map((record) => withChordFamilies(record, families))
        const body = bodyOf(leveled)

        for (const phrase of body.phrases) expect(phrase.intent.chordFamilies).toEqual(families)
        const read = parseKeptSessionBody(structuredClone(body))
        read.phrases.forEach((phrase, index) =>
          expect(phrase.intent, level).toEqual(leveled[index]!.intent),
        )
      }
      const read = parseKeptSessionBody(structuredClone(bodyOf(records)))
      const readAtOff = read.phrases.map((phrase) =>
        parsedWithChordFamilies(phrase, OFF_CHORD_FAMILIES),
      )
      const atOff = { ...read, phrases: readAtOff }
      expect(storesChordFamilies(rewrittenKeptBodyRecordV4(atOff, () => true, APP_VERSION))).toBe(
        false,
      )
      expect(
        storesChordFamilies(rewrittenKeptBodyRecordV2(readAtOff, () => true, APP_VERSION)),
      ).toBe(false)
    }
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  it('refuses an intent above Off in the data version 2 and 4 writers only, rather than storing it as Off', () => {
    const records = sessions[1]!
    const favored = records.map((record, index) =>
      index === 1 ? withChordFamilies(record, FAVORED_SEVENTHS) : record,
    )
    expect(bodyOf(favored).phrases[1]!.intent.chordFamilies).toEqual(FAVORED_SEVENTHS)
    expect(decoded(keptRecords(favored)).phrases[1]!.intent.chordFamilies).toEqual(FAVORED_SEVENTHS)

    const read = parseKeptSessionBody(structuredClone(bodyOf(records)))
    const readFavored = read.phrases.map((phrase, index) =>
      index === 1 ? parsedWithChordFamilies(phrase, FAVORED_SEVENTHS) : phrase,
    )
    const body = { ...read, phrases: readFavored }
    expect(
      rewrittenKeptBodyRecord(body, () => true, APP_VERSION).phrases[1]!.intent.chordFamilies,
    ).toEqual(FAVORED_SEVENTHS)
    expect(() => rewrittenKeptBodyRecordV4(body, () => true, APP_VERSION)).toThrow(
      /Seventh chords level .* above Off/u,
    )
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

  /** Intent: the stored records of a session as v3.2 saved it: its body at data version 4. */
  function savedOnV32(records: readonly SessionHistoryRecord[]): StoredKeptSession {
    const stored = keptRecords(records)
    return { ...stored, body: v4Body(stored.body) }
  }

  // @test-link [[module_kept_session_codec]]
  // @test-link [[rule_earlier_kept_sessions_read_at_off]]
  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  it('reopens a session saved on v3.2, once carried over to data version 5, with every phrase at Off', () => {
    for (const records of sessions) {
      const stored = savedOnV32(records)
      expect(storesChordFamilies(stored.body)).toBe(false)
      expect(decodeKeptSession(stored)).toEqual({ reading: 'unreadable' })

      const carried = { ...stored, body: upgradedKeptBodyV5(stored.body, APP_VERSION) }
      const phrases = decoded(carried).phrases
      expect(phrases).toHaveLength(records.length)
      phrases.forEach((phrase, index) => {
        expect(phrase.intent.chordFamilies).toStrictEqual(OFF_CHORD_FAMILIES)
        expect(phrase.intent).toStrictEqual(records[index]!.intent)
      })
    }
  })

  // @test-link [[module_kept_session_codec]]
  it('reads a data version 5 body whose intents hold no level with every phrase at Off', () => {
    const stored = keptRecords(sessions[1]!)
    let body = stored.body
    for (const index of [0, 1, 2, 3])
      body = edited(body, ['phrases', index, 'intent', 'chordFamilies'], REMOVE)

    expect(storesChordFamilies(body)).toBe(false)
    for (const phrase of decoded({ ...stored, body }).phrases)
      expect(phrase.intent.chordFamilies).toStrictEqual(OFF_CHORD_FAMILIES)
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[entity_kept_session_record]]
  it('saves a session played now, its intents at Off, with the level, and reopens it at Off', () => {
    for (const records of sessions) {
      for (const record of records)
        expect(record.intent.chordFamilies).toStrictEqual(OFF_CHORD_FAMILIES)
      const stored = keptRecords(records)

      expect(storesChordFamilies(stored.body)).toBe(true)
      decoded(stored).phrases.forEach((phrase, index) => {
        expect(phrase.intent.chordFamilies).toStrictEqual(OFF_CHORD_FAMILIES)
        expect(Object.keys(phrase.intent)).toEqual(Object.keys(records[index]!.intent))
      })
    }
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[entity_kept_session_record]]
  it.each([
    ['an unknown level', { 'seventh-chords': 'often' }],
    ['an unknown family', { 'seventh-chords': 'off', 'ninth-chords': 'off' }],
    ['no family', {}],
    ['a level that is no object', 'off'],
    ['null', null],
  ] as const)('reads a stored level with %s as unreadable, never as Off', (_, level) => {
    const stored = keptRecords(sessions[1]!)
    const body = edited(stored.body, ['phrases', 1, 'intent', 'chordFamilies'], level)

    expect(() => parseKeptSessionBody(body)).toThrow(ChordFamiliesError)
    expect(isKeptPhraseRefusal(catchError(() => parseKeptSessionBody(body)))).toBe(true)
    expect(decodeKeptSession({ ...stored, body })).toEqual({ reading: 'unreadable' })
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  it('refuses the level in a data version 4 body as an unknown field, at Off or above', () => {
    const body = savedOnV32(sessions[1]!).body
    for (const chordFamilies of [OFF_CHORD_FAMILIES, FAVORED_SEVENTHS]) {
      const holding = edited(body, ['phrases', 1, 'intent', 'chordFamilies'], chordFamilies)

      expect(() => parseKeptSessionBodyV4(holding)).toThrow(/chordFamilies/u)
      expect(upgradedKeptBodyV5(holding, APP_VERSION)).toBeNull()
    }
  })
})

/** Intent: the error a call throws, or null when it throws none. */
function catchError(call: () => unknown): unknown {
  try {
    call()
  } catch (error) {
    return error
  }
  return null
}
