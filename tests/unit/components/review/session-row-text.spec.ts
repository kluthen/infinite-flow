/**
 * What a session list row writes: its title, detail line, status line, comment and note, for a
 * kept session this version reads and for one a newer version wrote, with no wording or number
 * about how the player played.
 */
import { describe, expect, it } from 'vitest'

import { sessionDate } from '@/components/review/session-date'
import { sessionLengthText, sessionRowText } from '@/components/review/session-row-text'
import type { KeptSessionRow } from '@/components/workspace/use-kept-sessions'
import type { KeptSessionSummary } from '@/storage/records/kept-session-summary'
import { makeSeed } from '@/domain/random/seed'

const STARTED_AT = Date.UTC(2026, 9, 6, 16, 42)

/** A kept session's facts: 4 min 10 s, 3 phrases, Jazz, tenor, unpinned, nothing chosen. */
const SUMMARY: KeptSessionSummary = {
  startedAt: STARTED_AT,
  lengthSeconds: 250,
  phraseCount: 3,
  presetLabel: 'Jazz',
  instrument: { id: 'bb-tenor', displayName: 'B-flat tenor saxophone' },
  startingTempo: 90,
  tempoReached: 104,
  pinned: false,
  favoritesCount: 0,
  comment: '',
  playedNotesKept: false,
  recordedByAppVersion: '3.0.0',
  sessionSeed: makeSeed(7),
  isJam: false,
}

/** Intent: a current row over `SUMMARY` changed by `edit`. */
function row(edit: Partial<KeptSessionSummary> = {}, failedToOpen = false): KeptSessionRow {
  return { kind: 'current', key: 'k', summary: { ...SUMMARY, ...edit }, failedToOpen }
}

// @test-link [[req_kept_session_list]]
describe('a session list row', () => {
  // @test-link [[req_kept_session_list]]
  it('writes the session date, the detail line and the status line', () => {
    expect(sessionRowText(row(), false, false)).toEqual({
      title: sessionDate(STARTED_AT),
      detail: '4 min · 3 phrases · B-flat tenor saxophone · Jazz',
      status: 'No favorites · Not pinned: deleted when your next session is saved.',
      comment: null,
      note: null,
    })
  })

  // @test-link [[rule_most_recent_session_kept]]
  it('adds " · Last session" to the most recent session\'s title', () => {
    expect(sessionRowText(row(), true, false).title).toBe(
      `${sessionDate(STARTED_AT)} · Last session`,
    )
  })

  // @test-link [[req_favorite_phrases]]
  // @test-link [[rule_pinned_session_kept]]
  it('counts favorites, says played notes are kept, and says pinned', () => {
    expect(sessionRowText(row({ favoritesCount: 1, pinned: true }), false, false).status).toBe(
      '1 favorite · Pinned',
    )
    expect(
      sessionRowText(row({ favoritesCount: 2, playedNotesKept: true, pinned: true }), false, false)
        .status,
    ).toBe('2 favorites · Played notes kept · Pinned')
  })

  // @test-link [[req_kept_session_list]]
  it('writes the length in whole minutes, under 1 min below 30 seconds, and one phrase', () => {
    expect(sessionLengthText(29.9)).toBe('Under 1 min')
    expect(sessionLengthText(30)).toBe('1 min')
    expect(sessionLengthText(89)).toBe('1 min')
    expect(sessionLengthText(90)).toBe('2 min')
    expect(sessionRowText(row({ phraseCount: 1, lengthSeconds: 12 }), false, false).detail).toBe(
      'Under 1 min · 1 phrase · B-flat tenor saxophone · Jazz',
    )
  })

  // @test-link [[req_kept_session_list]]
  it('writes a custom preset by the label recorded with the session', () => {
    const custom = row({ presetLabel: 'Custom, based on Neutral' })
    expect(sessionRowText(custom, false, false).detail).toBe(
      '4 min · 3 phrases · B-flat tenor saxophone · Custom, based on Neutral',
    )
  })

  // @test-link [[rule_session_comment]]
  it("shows the comment's line breaks as spaces", () => {
    expect(sessionRowText(row({ comment: 'Slow\nthen fast' }), false, false).comment).toBe(
      'Slow then fast',
    )
  })

  // @test-link [[req_kept_session_list]]
  it('shows the failed opening note in place of the comment, without the deletion while saving is off', () => {
    const failed = row({ comment: 'Mine.' }, true)
    expect(sessionRowText(failed, false, false)).toEqual(
      expect.objectContaining({
        comment: null,
        note: "This session couldn't be opened. Try again, or delete it.",
      }),
    )
    expect(sessionRowText(failed, false, true).note).toBe(
      "This session couldn't be opened. Try again.",
    )
  })

  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('writes what can be read of a row saved by a newer version, and its note', () => {
    const newer: KeptSessionRow = {
      kind: 'newer',
      key: 'n',
      readable: { startedAt: STARTED_AT, lengthSeconds: 250, pinned: true },
      failedToOpen: false,
    }
    expect(sessionRowText(newer, false, true)).toEqual({
      title: sessionDate(STARTED_AT),
      detail: null,
      status: null,
      comment: null,
      note: 'This session was saved by a newer version of the app. Reload the page to open it.',
    })
    const undated: KeptSessionRow = { ...newer, readable: {} }
    expect(sessionRowText(undated, false, true).title).toBe('Saved by a newer version')
  })

  // @test-link [[req_kept_session_list]]
  it('says nothing of how the player played: no score, hits, misses or accuracy, no other number', () => {
    const text = sessionRowText(
      row({ favoritesCount: 2, playedNotesKept: true, comment: 'x', pinned: true }),
      true,
      false,
    )
    const lines = [text.detail, text.status].join(' ')
    expect(lines).not.toMatch(/score|hit|miss|accura|correct|wrong|%/i)
    expect(lines.match(/\d+/g)).toEqual(['4', '3', '2'])
  })
})
