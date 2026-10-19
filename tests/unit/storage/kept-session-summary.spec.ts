import { beforeAll, describe, expect, it } from 'vitest'

import { PHRASE_MEASURE_COUNT } from '@/domain/generation/generation-request'
import type { SessionHistory } from '@/session/session-history'
import { measureSeconds } from '@/session/session-timing'
import {
  decodeKeptSession,
  decodeKeptSessionSummary,
  encodeKeptSession,
  rewriteKeptSummary,
  type KeptSessionFacts,
  type KeptSessionRecords,
  type KeptSessionSummary,
} from '@/storage/records/kept-session-record'
import {
  APP_VERSION,
  REMOVE,
  edited,
  isDeepFrozen,
  recordedKeptSession,
  storedRecords,
} from './kept-session-fixtures'
import { DEFAULT_SESSION_SEED, SESSION_START_EPOCH_MS } from '../session/session-harness'

/** The facts of a pinned kept session with a comment, two favorites and its played notes kept. */
const FACTS: KeptSessionFacts = {
  pinned: true,
  favorites: [4, 2],
  comment: 'Felt the tritone resolve. Try faster next time.',
  playedNotesKept: true,
}

/** Intent: a decoded session-wide record, failing the test unless it reads as current. */
function decodedSummary(value: unknown): KeptSessionSummary {
  const reading = decodeKeptSessionSummary(value)
  if (reading.reading !== 'current')
    throw new Error(`Expected a current summary, got ${reading.reading}.`)
  return reading.value
}

// @test-link [[entity_kept_session_record]]
// @test-link [[rule_kept_session_content]]
describe('the session-wide record of a kept session, stored and read back', () => {
  let history: SessionHistory
  let records: KeptSessionRecords

  beforeAll(() => {
    history = recordedKeptSession('eb-alto', 5)
    records = encodeKeptSession(history, FACTS, APP_VERSION)
  })

  // @test-link [[entity_kept_session_record]]
  // @test-link [[rule_kept_session_content]]
  it("keeps the session's own facts as the history and the facts handed in hold them", () => {
    const phrases = history.phrases()
    const first = phrases[0]!
    const last = phrases.at(-1)!

    expect(decodedSummary(structuredClone(records.summary))).toEqual({
      startedAt: SESSION_START_EPOCH_MS,
      lengthSeconds:
        last.startedAt + PHRASE_MEASURE_COUNT * measureSeconds(last.tempo) - first.startedAt,
      phraseCount: 5,
      presetLabel: 'Custom, based on Neutral',
      instrument: { id: 'eb-alto', displayName: 'E-flat alto saxophone' },
      startingTempo: 240,
      tempoReached: 240,
      pinned: true,
      favoritesCount: 2,
      comment: FACTS.comment,
      playedNotesKept: true,
      recordedByAppVersion: APP_VERSION,
      sessionSeed: history.sessionSeed,
    })
    expect(history.profileSelection).toEqual({ musicalProfile: 'Neutral', isCustom: true })
    expect(history.sessionSeed).toBe(DEFAULT_SESSION_SEED)
  })

  // @test-link [[entity_kept_session_record]]
  it('measures the length from phrase 1 to the end of the last phrase: 20 s for five at 240 BPM', () => {
    expect(records.summary.lengthSeconds).toBe(20)
  })

  // @test-link [[rule_kept_session_content]]
  it('reads the same facts when the whole session is decoded, the favorites marked on their phrases', () => {
    const reading = decodeKeptSession(storedRecords(records))
    if (reading.reading !== 'current') throw new Error(`Expected current, got ${reading.reading}.`)

    expect(reading.value.summary).toEqual(decodedSummary(structuredClone(records.summary)))
    expect(reading.value.phrases.map((phrase) => phrase.favorite)).toEqual([
      false,
      true,
      false,
      true,
      false,
    ])
  })

  // @test-link [[entity_kept_session_record]]
  it('keeps the recording app version when a later app rewrote the envelope', () => {
    const rewritten = edited(records.summary, ['appVersion'], '3.1.0')

    expect(decodedSummary(rewritten).recordedByAppVersion).toBe(APP_VERSION)
  })

  // @test-link [[rule_preset_label_kept_with_session]]
  it('keeps the preset label as the label itself, customized or not', () => {
    const custom = edited(records.summary, ['presetLabel'], 'Custom, based on Jazz')

    expect(decodedSummary(custom).presetLabel).toBe('Custom, based on Jazz')
    expect(decodedSummary(edited(records.summary, ['presetLabel'], 'Jazz')).presetLabel).toBe(
      'Jazz',
    )
    expect(isDeepFrozen(decodedSummary(custom))).toBe(true)
  })

  // @test-link [[rule_preset_label_kept_with_session]]
  it('keeps the stored preset label when a later change rewrites the record', () => {
    const stored = edited(structuredClone(records.summary), ['presetLabel'], 'Jazz')

    const rewritten = rewriteKeptSummary(stored, { pinned: false, comment: 'Later.' }, '3.1.1')

    expect(rewritten?.presetLabel).toBe('Jazz')
    expect(decodedSummary(structuredClone(rewritten)).presetLabel).toBe('Jazz')
  })
})

// @test-link [[rule_outdated_tab_reads_what_it_can]]
describe('decodeKeptSessionSummary of newer or invalid stored values', () => {
  // The invalid values below are tabled when the specs are collected, so the record is built then.
  const summary: unknown = structuredClone(
    encodeKeptSession(
      recordedKeptSession('c-keyboard', 2),
      { ...FACTS, favorites: [2] },
      APP_VERSION,
    ).summary,
  )

  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('reports a newer record as newer, even one this app could not read', () => {
    expect(decodeKeptSessionSummary(edited(summary, ['dataVersion'], 3))).toEqual({
      reading: 'newer',
    })
    expect(decodeKeptSessionSummary({ dataVersion: 3, appVersion: '9.0.0' })).toEqual({
      reading: 'newer',
    })
  })

  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it.each([
    ['not an object', null],
    ['an array', []],
    ['no app version', edited(summary, ['appVersion'], '')],
    ['a missing key', edited(summary, ['sessionSeed'], REMOVE)],
    ['an extra key', edited(summary, ['phraseSeeds'], [1, 2])],
    ['a comment over 500 characters', edited(summary, ['comment'], 'y'.repeat(501))],
    ['an unknown instrument', edited(summary, ['instrument', 'id'], 'flute')],
    ['an empty display name', edited(summary, ['instrument', 'displayName'], ' ')],
    ['an empty preset label', edited(summary, ['presetLabel'], ' ')],
    ['a preset label that is no string', edited(summary, ['presetLabel'], 1)],
    ['more favorites than phrases', edited(summary, ['favoritesCount'], 3)],
    ['a zero tempo', edited(summary, ['tempoReached'], 0)],
    ['a pinned flag that is no boolean', edited(summary, ['pinned'], 1)],
  ])('reports %s as unreadable', (_, value) => {
    expect(decodeKeptSessionSummary(value)).toEqual({ reading: 'unreadable' })
  })

  // @test-link [[entity_kept_session_record]]
  it('reports a record at data version 1, or holding a v3.0 profile selection, as unreadable', () => {
    const { presetLabel, ...rest } = summary as Record<string, unknown>
    void presetLabel
    const v30Shaped = { ...rest, musicalProfile: { musicalProfile: 'Jazz', isCustom: false } }

    expect(decodeKeptSessionSummary(edited(summary, ['dataVersion'], 1))).toEqual({
      reading: 'unreadable',
    })
    expect(decodeKeptSessionSummary({ ...v30Shaped, dataVersion: 1 })).toEqual({
      reading: 'unreadable',
    })
    expect(decodeKeptSessionSummary(v30Shaped)).toEqual({ reading: 'unreadable' })
  })
})
