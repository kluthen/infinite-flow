/**
 * The kept-session codec over sessions played with the Seventh chords level, at data version 5: a
 * session generated at Always, each phrase joined from the one before (phrase 2 after a carried
 * seventh chord), encodes and decodes with each phrase's level and every seventh in its harmony,
 * its stored request and its carry-in, reviews and exports as the session in memory does, and
 * replays each phrase from its decoded inputs; a phrase at Off joined after a carried seventh
 * round-trips too. A stored event's seventh is read only in its exact shape and only when it is
 * the seventh stacked on that event's triad; data versions before 5 refuse it as an unknown field.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import type { ChordFamilyLevel } from '@/domain/chords/chord-families'
import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { buildGeneratedNotesFile, type GeneratedNotesRequest } from '@/export/generated-notes-file'
import type { ReviewedPhrase, SessionHistoryRecord } from '@/session/session-history'
import {
  isKeptPhraseRefusal,
  KeptRecordError,
  parseKeptHarmony,
} from '@/storage/records/kept-phrase-parsers'
import { parseKeptSessionBody } from '@/storage/records/kept-session-body-read'
import {
  decodeKeptSession,
  encodeKeptSession,
  type KeptSession,
  type KeptSessionFacts,
  type StoredKeptSession,
} from '@/storage/records/kept-session-record'
import { buildIntent } from '../domain/generation/carry-in/carry-in-fixture'
import {
  allKeys,
  APP_VERSION,
  edited,
  historyOf,
  REMOVE,
  storedRecords,
} from './kept-session-fixtures'
import { historyRecord } from './kept-session-v32-fixtures'

/** The facts of a kept session with phrase 2 a favorite, no comment, played notes not kept. */
const FACTS: KeptSessionFacts = {
  pinned: false,
  favorites: [2],
  comment: '',
  playedNotesKept: false,
  presets: BUILT_IN_PRESETS,
}

/** Every request the generated-notes export offers: both formats, backing off and on. */
const EVERY_REQUEST: readonly GeneratedNotesRequest[] = [
  { format: 'musicxml', backingTrack: false },
  { format: 'musicxml', backingTrack: true },
  { format: 'midi', backingTrack: false },
  { format: 'midi', backingTrack: true },
]

/**
 * Intent: phrase `phraseNumber` of a C keyboard session at `level`, generated from the first seed
 * from `seed` up that generates, joined from `before` when given.
 */
function phraseAt(
  level: ChordFamilyLevel,
  seed: number,
  phraseNumber: number,
  before?: SessionHistoryRecord,
): SessionHistoryRecord {
  for (let candidate = seed; candidate < seed + 50; candidate += 1) {
    const intent = buildIntent({
      seed: candidate,
      label: `kept-seventh-${level}`,
      chordFamilies: { 'seventh-chords': level },
      ...(before === undefined
        ? {}
        : {
            carryIn: deriveCarryIn({
              intent: before.intent,
              outcome: before.outcome,
              phraseNumber: before.phraseNumber,
            }),
          }),
    })
    const outcome = generatePhrase(intent)
    if (outcome.kind === 'generation_success') return historyRecord(intent, outcome, phraseNumber)
  }
  throw new Error(`Fixture setup: no seed from ${seed} generates phrase ${phraseNumber}.`)
}

/**
 * Intent: a three-phrase session at Always: phrase 1 (seed 5) every event a seventh chord, ending
 * on G7, which phrase 2 carries, phrase 3 joined from phrase 2.
 */
function mostlySession(): readonly SessionHistoryRecord[] {
  const first = phraseAt('stronglyFavored', 5, 1)
  const second = phraseAt('stronglyFavored', 12, 2, first)
  return [first, second, phraseAt('stronglyFavored', 13, 3, second)]
}

/** Intent: phrase 1 at Always (seed 5), then phrase 2 at Off joined after its carried G7. */
function offAfterCarriedSeventh(): readonly SessionHistoryRecord[] {
  const first = phraseAt('stronglyFavored', 5, 1)
  return [first, phraseAt('off', 12, 2, first)]
}

/** Intent: the session stored values decode to, failing the test unless they read as current. */
function decoded(stored: StoredKeptSession): KeptSession {
  const reading = decodeKeptSession(stored)
  if (reading.reading !== 'current')
    throw new Error(`Expected a current session, got ${reading.reading}.`)
  return reading.value
}

/**
 * Intent: the stored records of a session over recorded phrases on the C keyboard, phrase 2 a
 * favorite when it has one.
 */
function keptRecords(records: readonly SessionHistoryRecord[]): StoredKeptSession {
  const facts = { ...FACTS, favorites: records.length > 1 ? FACTS.favorites : [] }
  return storedRecords(encodeKeptSession(historyOf(records, 'c-keyboard'), facts, APP_VERSION))
}

/** Intent: the review's notation input of every phrase, as text. */
function notationText(phrases: readonly ReviewedPhrase[]): string {
  return JSON.stringify(
    phrases.map((phrase) => notationInputFromOutcome(phrase.outcome, phrase.intent, phrase.clef)),
  )
}

/** Intent: the bytes of every generated-notes export of phrases, from a session start. */
function exportBytes(phrases: readonly ReviewedPhrase[], startedAt: number): readonly Uint8Array[] {
  const history = {
    /** Intent: the phrases, as the exports read a history's. */
    phrases: () => phrases,
    startedAt,
  }
  return EVERY_REQUEST.map((request) => buildGeneratedNotesFile(history, request).bytes)
}

/** Intent: the number of seventh-form events in phrases' harmonies. */
function seventhCount(
  harmonies: readonly SessionHistoryRecord['outcome']['provenance']['harmony'][],
): number {
  return harmonies
    .flatMap((harmony) => harmony.events)
    .filter((event) => event.seventh !== undefined).length
}

/** Intent: expect each decoded phrase to regenerate from its decoded intent to the same outcome. */
function expectReplays(session: KeptSession): void {
  for (const phrase of session.phrases) {
    const replayed = generatePhrase(phrase.intent)
    if (replayed.kind !== 'generation_success')
      throw new Error(`Phrase ${phrase.phraseNumber} did not replay: ${replayed.code}.`)
    expect(replayed.result.timeline, `phrase ${phrase.phraseNumber}`).toEqual(
      phrase.outcome.result.timeline,
    )
    expect(replayed.provenance.harmony, `phrase ${phrase.phraseNumber}`).toEqual(
      phrase.outcome.provenance.harmony,
    )
  }
}

// @test-link [[module_kept_session_codec]]
// @test-link [[entity_kept_session_record]]
// @test-link [[rule_seventh_chord_draws_reproducible]]
describe('a kept session played at Always', () => {
  let records: readonly SessionHistoryRecord[]
  let stored: StoredKeptSession

  beforeAll(() => {
    records = mostlySession()
    stored = keptRecords(records)
  }, 120_000)

  // @test-link [[rule_kept_session_content]]
  it('is built from real phrases at Always, with sevenths, phrase 2 joined after a carried seventh', () => {
    for (const record of records)
      expect(record.intent.chordFamilies).toStrictEqual({ 'seventh-chords': 'stronglyFavored' })
    expect(
      seventhCount(records.map((record) => record.outcome.provenance.harmony)),
    ).toBeGreaterThan(0)
    expect(records[1]!.intent.carryIn?.finalHarmony?.seventh).toStrictEqual({
      pitchClass: 5,
      quality: 'dominant-seventh',
    })
    expect(records[1]!.outcome.request.carryIn?.finalHarmony?.seventh).toBeDefined()
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[entity_kept_session_record]]
  it("stores each phrase's level and every seventh, in its harmony, its request and its carry-in", () => {
    const body = stored.body as {
      dataVersion: number
      phrases: { intent: GenerationIntent; harmony: unknown; request: unknown }[]
    }

    expect(body.dataVersion).toBe(5)
    body.phrases.forEach((phrase, index) => {
      expect(phrase.intent.chordFamilies).toStrictEqual(records[index]!.intent.chordFamilies)
      expect(phrase.harmony).toStrictEqual(records[index]!.outcome.provenance.harmony)
      expect(phrase.request).toStrictEqual(records[index]!.outcome.request)
    })
    expect(body.phrases[1]!.intent.carryIn?.finalHarmony?.seventh).toBeDefined()
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[rule_kept_session_content]]
  it('decodes with every level and seventh, and reviews and exports as the session in memory', () => {
    const session = decoded(stored)

    expect(session.phrases).toHaveLength(3)
    session.phrases.forEach((phrase, index) => {
      expect(phrase.intent).toEqual(records[index]!.intent)
      expect(phrase.outcome.provenance.harmony).toEqual(records[index]!.outcome.provenance.harmony)
      expect(phrase.outcome.result.timeline).toEqual(records[index]!.outcome.result.timeline)
    })
    expect(seventhCount(session.phrases.map((phrase) => phrase.outcome.provenance.harmony))).toBe(
      seventhCount(records.map((record) => record.outcome.provenance.harmony)),
    )
    const body = parseKeptSessionBody(stored.body)
    body.phrases.forEach((phrase, index) =>
      expect(phrase.request).toEqual(records[index]!.outcome.request),
    )
    expect(notationText(session.phrases)).toBe(notationText(records))
    expect(exportBytes(session.phrases, session.summary.startedAt)).toStrictEqual(
      exportBytes(records, session.summary.startedAt),
    )
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[rule_seventh_chord_draws_reproducible]]
  it('replays each phrase from its inputs', () => {
    expectReplays(decoded(stored))
  })
})

// @test-link [[module_kept_session_codec]]
// @test-link [[entity_phrase_carry_in]]
describe('a kept phrase at Off joined after a carried seventh chord', () => {
  let records: readonly SessionHistoryRecord[]
  let stored: StoredKeptSession

  beforeAll(() => {
    records = offAfterCarriedSeventh()
    stored = keptRecords(records)
  }, 120_000)

  // @test-link [[module_kept_session_codec]]
  // @test-link [[entity_phrase_carry_in]]
  it('round-trips through the data version 5 body, its carried seventh and its level at Off kept', () => {
    const phrase = decoded(stored).phrases[1]!

    expect(phrase.intent).toEqual(records[1]!.intent)
    expect(phrase.intent.chordFamilies).toStrictEqual({ 'seventh-chords': 'off' })
    expect(phrase.intent.carryIn?.finalHarmony?.seventh).toStrictEqual({
      pitchClass: 5,
      quality: 'dominant-seventh',
    })
    expect(seventhCount([phrase.outcome.provenance.harmony])).toBe(0)
  })

  // @test-link [[rule_seventh_chord_draws_reproducible]]
  it('replays each phrase from its inputs', () => {
    expectReplays(decoded(stored))
  })
})

/** The first seventh-form event of a stored harmony, and its index among the events. */
interface SeventhEvent {
  readonly index: number
  readonly event: Record<string, unknown>
}

// @test-link [[module_kept_session_codec]]
// @test-link [[entity_kept_session_record]]
describe("a stored harmony event's seventh", () => {
  let stored: StoredKeptSession
  let harmony: unknown
  let found: SeventhEvent

  beforeAll(() => {
    stored = keptRecords([phraseAt('stronglyFavored', 5, 1)])
    harmony = (stored.body as { phrases: { harmony: unknown }[] }).phrases[0]!.harmony
    const events = (harmony as { events: Record<string, unknown>[] }).events
    const index = events.findIndex((event) => Object.hasOwn(event, 'seventh'))
    found = { index, event: events[index]! }
  }, 60_000)

  /** Intent: the stored harmony with the found event's seventh replaced, or removed. */
  function withSeventh(seventh: unknown): unknown {
    return edited(harmony, ['events', found.index, 'seventh'], seventh)
  }

  // @test-link [[module_kept_session_codec]]
  it('reads at data version 5, and is refused as an unknown field by the triad-only reading', () => {
    expect(found.index).toBeGreaterThanOrEqual(0)
    expect(parseKeptHarmony(harmony, 'triad-or-seventh').events[found.index]!.seventh).toEqual(
      found.event.seventh,
    )
    expect(() => parseKeptHarmony(harmony)).toThrow(/unknown field "seventh"/u)
    const triadsOnly = edited(
      harmony,
      ['events'],
      (harmony as { events: Record<string, unknown>[] }).events.map((event) =>
        edited(event, ['seventh'], REMOVE),
      ),
    )
    expect(allKeys(parseKeptHarmony(triadsOnly, 'triad')).has('seventh')).toBe(false)
  })

  /** A stored seventh, as the found event holds it. */
  type StoredSeventh = { readonly pitchClass: number; readonly quality: string }

  // @test-link [[module_kept_session_codec]]
  it.each([
    ['null', () => null],
    ['an extra key', (seventh: StoredSeventh) => ({ ...seventh, root: 0 })],
    ['no quality', (seventh: StoredSeventh) => ({ pitchClass: seventh.pitchClass })],
    ['a pitch class of 12', () => ({ pitchClass: 12, quality: 'dominant-seventh' })],
    ['a pitch class of 1.5', () => ({ pitchClass: 1.5, quality: 'dominant-seventh' })],
    ['an unknown quality', (seventh: StoredSeventh) => ({ ...seventh, quality: 'ninth' })],
    [
      'a quality its notes do not form',
      (seventh: StoredSeventh) => ({
        ...seventh,
        quality: seventh.quality === 'major-seventh' ? 'minor-seventh' : 'major-seventh',
      }),
    ],
    [
      'a note forming no seventh chord on its triad, a step above its root',
      (seventh: StoredSeventh, root: number) => ({ ...seventh, pitchClass: (root + 2) % 12 }),
    ],
  ] as const)('refuses a seventh with %s as unreadable', (_, reshape) => {
    const seventh = found.event.seventh as StoredSeventh
    const root = (found.event.triad as { pitchClasses: readonly number[] }).pitchClasses[0]!
    const bad = withSeventh(reshape(seventh, root))

    expect(() => parseKeptHarmony(bad, 'triad-or-seventh')).toThrow(KeptRecordError)
    const body = edited(stored.body, ['phrases', 0, 'harmony'], bad)
    let failure: unknown = null
    try {
      parseKeptSessionBody(body)
    } catch (error) {
      failure = error
    }
    expect(isKeptPhraseRefusal(failure)).toBe(true)
    expect(decodeKeptSession({ ...stored, body })).toEqual({ reading: 'unreadable' })
  })
})
