/**
 * A kept session's facts encoded again after its save: the session-wide record rewritten from its
 * stored form with only the player's change applied, and the played-notes record of a session
 * whose notes are kept after its save.
 */
import { beforeAll, describe, expect, it } from 'vitest'

import type { SessionHistory } from '@/session/session-history'
import {
  decodeKeptSession,
  decodeKeptSessionSummary,
  encodeKeptPlayedNotes,
  encodeKeptSession,
  rewriteKeptSummary,
  type KeptSessionFacts,
  type KeptSessionRecords,
} from '@/storage/records/kept-session-record'
import { APP_VERSION, edited, recordedKeptSession } from './kept-session-fixtures'

/** The facts a session is first saved with: nothing pinned, chosen or kept. */
const FRESH: KeptSessionFacts = {
  pinned: false,
  favorites: [],
  comment: '',
  playedNotesKept: false,
}

/** The app version that rewrites the record, after the one that recorded the session. */
const LATER_VERSION = '3.0.1-test'

// @test-link [[entity_kept_session_record]]
// @test-link [[module_kept_session_changes]]
describe("a kept session's session-wide record rewritten after its save", () => {
  let history: SessionHistory
  let saved: KeptSessionRecords

  beforeAll(() => {
    history = recordedKeptSession('bb-tenor', 3)
    saved = encodeKeptSession(history, { ...FRESH, pinned: true }, APP_VERSION)
  })

  // @test-link [[rule_played_notes_kept_only_after_opt_in]]
  it('applies only the change to the stored facts, keeping the app version that recorded it', () => {
    const stored = structuredClone(saved.summary)

    const rewritten = rewriteKeptSummary(stored, { playedNotesKept: true }, LATER_VERSION)

    expect(rewritten).toEqual({
      ...saved.summary,
      appVersion: LATER_VERSION,
      playedNotesKept: true,
      recordedByAppVersion: APP_VERSION,
    })
    const reading = decodeKeptSessionSummary(structuredClone(rewritten))
    expect(reading.reading).toBe('current')
  })

  it('keeps a fact another tab stored since the load: a pin stays', () => {
    const pinnedElsewhere = edited(structuredClone(saved.summary), ['pinned'], true)

    expect(rewriteKeptSummary(pinnedElsewhere, { playedNotesKept: false }, APP_VERSION)).toEqual(
      expect.objectContaining({ pinned: true, playedNotesKept: false }),
    )
  })

  it('applies a pin, a favorites count and a comment the same way', () => {
    const rewritten = rewriteKeptSummary(
      structuredClone(saved.summary),
      { pinned: false, favoritesCount: 2, comment: 'Slower next time.' },
      APP_VERSION,
    )

    expect(rewritten).toEqual(
      expect.objectContaining({ pinned: false, favoritesCount: 2, comment: 'Slower next time.' }),
    )
  })

  // @test-link [[module_kept_session_changes]]
  it('gives nothing for a record that is not stored, cannot be read, or a newer app wrote', () => {
    expect(rewriteKeptSummary(undefined, { playedNotesKept: false }, APP_VERSION)).toBeNull()
    const unreadable = edited(structuredClone(saved.summary), ['startedAt'], 'not a time')
    expect(rewriteKeptSummary(unreadable, { playedNotesKept: false }, APP_VERSION)).toBeNull()
    const newer = edited(structuredClone(saved.summary), ['dataVersion'], 99)
    expect(rewriteKeptSummary(newer, { playedNotesKept: false }, APP_VERSION)).toBeNull()
  })

  it('throws on a comment over 500 characters, as a caller defect', () => {
    expect(() =>
      rewriteKeptSummary(structuredClone(saved.summary), { comment: 'x'.repeat(501) }, APP_VERSION),
    ).toThrow(/at most 500/)
  })
})

// @test-link [[entity_kept_session_record]]
// @test-link [[rule_played_notes_kept_only_after_opt_in]]
describe("a session's played notes kept after its save", () => {
  it('are the record its save would have written had they been kept, times from the start', () => {
    const history = recordedKeptSession('eb-alto', 2)
    const atTheSave = encodeKeptSession(history, { ...FRESH, playedNotesKept: true }, APP_VERSION)

    const record = encodeKeptPlayedNotes(history, APP_VERSION)

    expect(record).toEqual(atTheSave.playedNotes)
    expect(record.notes[0]!.onset).toBeGreaterThanOrEqual(0)
  })

  it('read back with the summary rewritten as kept, place the notes as the history did', () => {
    const history = recordedKeptSession('eb-alto', 2)
    const saved = encodeKeptSession(history, FRESH, APP_VERSION)

    const reading = decodeKeptSession({
      summary: structuredClone(
        rewriteKeptSummary(structuredClone(saved.summary), { playedNotesKept: true }, APP_VERSION),
      ),
      body: structuredClone(saved.body),
      playedNotes: structuredClone(encodeKeptPlayedNotes(history, APP_VERSION)),
    })

    if (reading.reading !== 'current') throw new Error(`read ${reading.reading}`)
    expect(reading.value.phrases.map((phrase) => phrase.playedNotes.length)).toEqual(
      history.phrases().map((phrase) => phrase.playedNotes.length),
    )
  })

  it('throws for a session with no phrase, as a caller defect', () => {
    expect(() => encodeKeptPlayedNotes({ phrases: () => [] }, APP_VERSION)).toThrow(/no phrase/)
  })
})
