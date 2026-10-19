/**
 * The session's own save, beside the session's ends: the key it mints, the one batch it builds
 * from the kept summaries read at the save (every readable unpinned kept session deleted, the new
 * session written), and the call through the visit's saves, the codec loaded on demand, carrying
 * the watch on the page leaving it took as it started; a page that went away by the time the codec
 * has loaded asks for nothing, even if it came back meanwhile.
 */
import { describe, expect, it } from 'vitest'

import {
  endedSessionSave,
  keptSessionChanges,
  keptSessionKey,
  saveEndedSession,
} from '@/components/workspace/workspace-session-save'
import type { Seed } from '@/domain/random/seed'
import type { PageLeaving } from '@/session/session-browser-ports'
import type { SessionHistory } from '@/session/session-history'
import { APP_VERSION } from '@/storage/app-version'
import * as codec from '@/storage/records/kept-session-record'
import type { PageGoingAway, SessionChanges, SessionSaveOutcome } from '@/storage/save-policy'
import type { StoredEntry } from '@/storage/storage-port'

import { createFakePageLeaving } from '../../session/fake-session-browser'
import { recordedKeptSession } from '../../storage/kept-session-fixtures'

/** A page that stays. */
const PAGE_STAYS: PageLeaving = { watch: () => () => false }

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

  it('also deletes every kept session whose summary is damaged, pinned or not, never one a newer app wrote', () => {
    const damaged = { key: 'session-4-4', value: { dataVersion: 1, appVersion: 'x' } }
    const newer = {
      key: 'session-5-5',
      value: { dataVersion: codec.KEPT_SESSION_SUMMARY_DATA_VERSION + 1, appVersion: '3.2.0' },
    }

    expect(
      described(keptSessionChanges(codec, history, NOT_KEPT, [damaged, newer], APP_VERSION)),
    ).toEqual([
      'delete sessionSummaries session-4-4',
      'delete sessionBodies session-4-4',
      'delete playedNotes session-4-4',
      `write sessionSummaries ${key}`,
      `write sessionBodies ${key}`,
    ])
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
    const page = createFakePageLeaving()
    const asked: SessionChanges[] = []
    const checks: PageGoingAway[] = []
    const saves = {
      /** Intent: record the changes and the page check asked with, and resolve the refusal. */
      saveSession: (changes: SessionChanges, pageGoingAway: PageGoingAway) => {
        asked.push(changes)
        checks.push(pageGoingAway)
        return Promise.resolve(refused)
      },
    }

    expect(await saveEndedSession(saves, page, history, NOT_KEPT)).toBe(refused)
    expect(asked).toHaveLength(1)
    expect(checks[0]?.()).toBe(false)
    page.leave()
    expect(checks[0]?.()).toBe(true)
    const kept = [keptSummary(recordedKeptSession('eb-alto', 2), 'session-1-1', false)]
    expect(asked[0]?.(kept)).toEqual(
      keptSessionChanges(codec, history, NOT_KEPT, kept, APP_VERSION),
    )
  })

  it('tells, once saved, how many damaged kept sessions its batch deleted', async () => {
    const history = recordedKeptSession('bb-tenor', 2)
    const kept = [
      keptSummary(recordedKeptSession('eb-alto', 2), 'session-1-1', false),
      { key: 'session-2-2', value: { dataVersion: 1, appVersion: 'x' } },
      { key: 'session-3-3', value: 'not a record' },
      {
        key: 'session-4-4',
        value: { dataVersion: codec.KEPT_SESSION_SUMMARY_DATA_VERSION + 1, appVersion: '3.2.0' },
      },
    ]
    /** Intent: saves that build the batch from `kept`, then resolve `outcome`. */
    const savesResolving = (outcome: SessionSaveOutcome) => ({
      saveSession: (changes: SessionChanges) => {
        changes(kept)
        return Promise.resolve(outcome)
      },
    })
    const saving = endedSessionSave(history, false)

    expect(
      await saveEndedSession(savesResolving({ status: 'saved' }), PAGE_STAYS, history, saving),
    ).toEqual({ status: 'saved', damagedDeleted: 2 })
    const refused = { status: 'refused', kind: 'other' } as const
    expect(await saveEndedSession(savesResolving(refused), PAGE_STAYS, history, saving)).toEqual(
      refused,
    )
  })

  // @test-link [[rule_most_recent_session_kept]]
  it('asks for nothing and resolves abandoned when the page went away while the codec loaded', async () => {
    const history = recordedKeptSession('bb-tenor', 2)
    const page = createFakePageLeaving()
    const asked: SessionChanges[] = []
    const saves = {
      /** Intent: record the changes asked for, and resolve as saved. */
      saveSession: (changes: SessionChanges) => {
        asked.push(changes)
        return Promise.resolve({ status: 'saved' } as const)
      },
    }

    const saving = saveEndedSession(saves, page, history, endedSessionSave(history, false))
    page.leave()

    expect(await saving).toEqual({ status: 'abandoned' })
    expect(asked).toEqual([])
  })

  // @test-link [[rule_most_recent_session_kept]]
  it('stays abandoned when the page went away and came back while the codec loaded', async () => {
    const history = recordedKeptSession('bb-tenor', 2)
    const page = createFakePageLeaving()
    const asked: SessionChanges[] = []
    const saves = {
      /** Intent: record the changes asked for, and resolve as saved. */
      saveSession: (changes: SessionChanges) => {
        asked.push(changes)
        return Promise.resolve({ status: 'saved' } as const)
      },
    }

    const saving = saveEndedSession(saves, page, history, endedSessionSave(history, false))
    page.leave()
    page.comeBack()

    expect(await saving).toEqual({ status: 'abandoned' })
    expect(asked).toEqual([])
  })
})

// @test-link [[module_kept_session_save]]
// @test-link [[rule_failed_save_never_disturbs_session]]
describe("the retry of a refused session's save", () => {
  it('is the same batch under the same key, with the facts held in memory then', () => {
    const history = recordedKeptSession('bb-tenor', 3)
    const saving = endedSessionSave(history, false)
    const held = { pinned: true, favorites: [1, 3], comment: 'Steady.' }

    const changes = keptSessionChanges(codec, history, saving, [], APP_VERSION, held)

    const expected = codec.encodeKeptSession(history, { ...FRESH, ...held }, APP_VERSION)
    expect(changes).toEqual([
      { kind: 'write', store: 'sessionSummaries', key: saving.key, record: expected.summary },
      { kind: 'write', store: 'sessionBodies', key: saving.key, record: expected.body },
    ])
  })

  it("reads the sessions to delete at the retry, through the visit's saves", async () => {
    const history = recordedKeptSession('bb-tenor', 2)
    const saving = endedSessionSave(history, false)
    const held = { pinned: false, favorites: [], comment: 'Again.' }
    const asked: SessionChanges[] = []
    const saves = {
      /** Intent: record the changes asked for, and resolve as saved. */
      saveSession: (changes: SessionChanges) => {
        asked.push(changes)
        return Promise.resolve({ status: 'saved' } as const)
      },
    }

    expect(await saveEndedSession(saves, PAGE_STAYS, history, saving, held)).toEqual({
      status: 'saved',
      damagedDeleted: 0,
    })
    const kept = [keptSummary(recordedKeptSession('eb-alto', 2), 'session-1-1', false)]
    expect(asked[0]?.(kept)).toEqual(
      keptSessionChanges(codec, history, saving, kept, APP_VERSION, held),
    )
    expect(described(asked[0]!(kept))[0]).toBe('delete sessionSummaries session-1-1')
  })
})
