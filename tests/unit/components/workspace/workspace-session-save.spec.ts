/**
 * The session's own save, beside the session's ends: the key it mints, the one batch it builds
 * from the kept summaries read at the save (every readable unpinned kept session deleted, the new
 * session written), and the call through the visit's saves, the codec loaded on demand.
 */
import { describe, expect, it } from 'vitest'

import {
  endedSessionSave,
  keptSessionChanges,
  keptSessionKey,
  saveEndedSession,
} from '@/components/workspace/workspace-session-save'
import type { Seed } from '@/domain/random/seed'
import type { SessionHistory } from '@/session/session-history'
import { APP_VERSION } from '@/storage/app-version'
import * as codec from '@/storage/records/kept-session-record'
import type { SessionChanges, SessionSaveOutcome } from '@/storage/save-policy'
import type { StoredEntry } from '@/storage/storage-port'

import { recordedKeptSession } from '../../storage/kept-session-fixtures'

/** The facts a session ended now is saved with: nothing pinned, chosen or kept yet. */
const FRESH = { pinned: false, favorites: [], comment: '', playedNotesKept: false } as const

/** Intent: a kept session's summary as stored, pinned or not, under `key`. */
function keptSummary(history: SessionHistory, key: string, pinned: boolean): StoredEntry {
  const { summary } = codec.encodeKeptSession(history, { ...FRESH, pinned }, APP_VERSION)
  return { key, value: structuredClone(summary) }
}

/** Intent: each change of a batch as `kind store key`, in order. */
function described(changes: ReturnType<SessionChanges>): string[] {
  return changes.map((change) => `${change.kind} ${change.store} ${change.key}`)
}

// @test-link [[entity_kept_session_record]]
describe("the kept session's key", () => {
  it('is session-{startedAt}-{sessionSeed}, both in decimal', () => {
    const key = keptSessionKey({ startedAt: 1_760_000_000_123, sessionSeed: 4_294_967_295 as Seed })

    expect(key).toBe('session-1760000000123-4294967295')
  })
})

// @test-link [[module_kept_session_save]]
// @test-link [[rule_most_recent_session_kept]]
describe("the session's save batch", () => {
  const history = recordedKeptSession('bb-tenor', 3)
  const key = keptSessionKey(history)
  const other = recordedKeptSession('eb-alto', 2)
  const NOT_KEPT = endedSessionSave(history, false)

  it('writes the session-wide record and the body under the new key, and no played notes', () => {
    const changes = keptSessionChanges(codec, history, NOT_KEPT, [], APP_VERSION)
    const expected = codec.encodeKeptSession(history, FRESH, APP_VERSION)

    expect(changes).toEqual([
      { kind: 'write', store: 'sessionSummaries', key, record: expected.summary },
      { kind: 'write', store: 'sessionBodies', key, record: expected.body },
    ])
  })

  it('deletes the summary, body and played notes of every readable unpinned kept session, first', () => {
    const kept = [
      keptSummary(other, 'session-1-1', false),
      keptSummary(other, 'session-2-2', true),
      keptSummary(other, 'session-3-3', false),
    ]

    expect(described(keptSessionChanges(codec, history, NOT_KEPT, kept, APP_VERSION))).toEqual([
      'delete sessionSummaries session-1-1',
      'delete sessionBodies session-1-1',
      'delete playedNotes session-1-1',
      'delete sessionSummaries session-3-3',
      'delete sessionBodies session-3-3',
      'delete playedNotes session-3-3',
      `write sessionSummaries ${key}`,
      `write sessionBodies ${key}`,
    ])
  })

  // @test-link [[rule_played_notes_kept_only_after_opt_in]]
  it('writes the played notes too, in the same batch, when they are kept', () => {
    const changes = keptSessionChanges(
      codec,
      history,
      endedSessionSave(history, true),
      [],
      APP_VERSION,
    )
    const expected = codec.encodeKeptSession(
      history,
      { ...FRESH, playedNotesKept: true },
      APP_VERSION,
    )

    expect(changes).toEqual([
      { kind: 'write', store: 'sessionSummaries', key, record: expected.summary },
      { kind: 'write', store: 'sessionBodies', key, record: expected.body },
      { kind: 'write', store: 'playedNotes', key, record: expected.playedNotes },
    ])
  })

  it('leaves in place a kept session whose summary cannot be read, or was written by a newer app', () => {
    const unreadable = { key: 'session-4-4', value: { dataVersion: 1, appVersion: 'x' } }
    const newer = { key: 'session-5-5', value: { dataVersion: 2, appVersion: '3.1.0' } }

    expect(
      described(keptSessionChanges(codec, history, NOT_KEPT, [unreadable, newer], APP_VERSION)),
    ).toEqual([`write sessionSummaries ${key}`, `write sessionBodies ${key}`])
  })
})

// @test-link [[module_kept_session_save]]
// @test-link [[rule_played_notes_kept_only_after_opt_in]]
describe('how the session that ended is saved', () => {
  it('under the key minted once, its played notes kept only when the setting is on and it holds one', () => {
    const played = recordedKeptSession('bb-tenor', 2)
    const silent = {
      ...played,
      phrases: () => played.phrases().map((p) => ({ ...p, playedNotes: [] })),
    }

    expect(endedSessionSave(played, true)).toEqual({
      key: keptSessionKey(played),
      playedNotesKept: true,
    })
    expect(endedSessionSave(played, false).playedNotesKept).toBe(false)
    expect(endedSessionSave(silent, true).playedNotesKept).toBe(false)
  })
})

// @test-link [[module_kept_session_save]]
describe('saving the session that ended', () => {
  it("hands the visit's saves the batch for the summaries read at the save, and resolves its outcome", async () => {
    const history = recordedKeptSession('bb-tenor', 2)
    const NOT_KEPT = endedSessionSave(history, false)
    const refused: SessionSaveOutcome = { status: 'refused', kind: 'other' }
    const asked: SessionChanges[] = []
    const saves = {
      /** Intent: record the changes asked for, and resolve the refusal. */
      saveSession: (changes: SessionChanges) => {
        asked.push(changes)
        return Promise.resolve(refused)
      },
    }

    expect(await saveEndedSession(saves, history, NOT_KEPT)).toBe(refused)
    expect(asked).toHaveLength(1)
    const kept = [keptSummary(recordedKeptSession('eb-alto', 2), 'session-1-1', false)]
    expect(asked[0]?.(kept)).toEqual(
      keptSessionChanges(codec, history, NOT_KEPT, kept, APP_VERSION),
    )
  })
})
