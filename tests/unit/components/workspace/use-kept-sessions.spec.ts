/**
 * The kept sessions' rows held in memory for the visit: built from the summaries the load read,
 * newest first, a summary that cannot be read giving no row and one a newer version wrote giving a
 * row of what can be read; then kept current by each change, deletion and successful session save,
 * never read again.
 */
import { describe, expect, it, vi } from 'vitest'

import { keptSessionRow, useKeptSessions } from '@/components/workspace/use-kept-sessions'
import type { ReviewedSession } from '@/components/workspace/workspace-session-controller-types'
import { encodeKeptSession, type KeptSessionFacts } from '@/storage/records/kept-session-record'
import type { SessionChanges, SessionSaveOutcome } from '@/storage/save-policy'
import type { StorageChange, StoredEntry } from '@/storage/storage-port'

import { APP_VERSION, recordedKeptSession } from '../../storage/kept-session-fixtures'

const history = recordedKeptSession('bb-tenor', 2)

/** The facts a session is first saved with: nothing pinned, chosen or commented. */
const FRESH: KeptSessionFacts = {
  pinned: false,
  favorites: [],
  comment: '',
  playedNotesKept: false,
}

/** Intent: the stored summary of the recorded session, started at `startedAt`, with `facts`. */
function summaryAt(startedAt: number, facts: Partial<KeptSessionFacts> = {}): unknown {
  const shifted = { ...history, phrases: () => history.phrases(), startedAt }
  return encodeKeptSession(shifted, { ...FRESH, ...facts }, APP_VERSION).summary
}

/** Intent: `summary` as a newer version would write it: a newer data version and a new field. */
function newer(summary: unknown, edit: Record<string, unknown> = {}): unknown {
  return { ...(summary as object), dataVersion: 2, mood: 'bright', ...edit }
}

/** A summary this version refuses: a start that is not a time. */
const UNREADABLE = { dataVersion: 1, appVersion: APP_VERSION, startedAt: 'not a time' }

/** Intent: the keys of the rows, in order. */
function keysOf(rows: readonly { readonly key: string }[]): string[] {
  return rows.map((row) => row.key)
}

// @test-link [[module_kept_session_reach]]
// @test-link [[req_kept_session_list]]
describe('the rows from the summaries the load read', () => {
  // @test-link [[module_kept_session_reach]]
  it('give one row per readable summary, newest first, with its facts', () => {
    const summaries: StoredEntry[] = [
      { key: 'a', value: summaryAt(1_000, { pinned: true }) as never },
      { key: 'c', value: summaryAt(3_000, { comment: 'Nice.' }) as never },
      { key: 'b', value: summaryAt(2_000) as never },
    ]
    const rows = useKeptSessions(summaries).rows()

    expect(keysOf(rows)).toEqual(['c', 'b', 'a'])
    const first = rows[0]
    expect(first?.kind === 'current' && first.summary).toEqual(
      expect.objectContaining({ startedAt: 3_000, comment: 'Nice.', phraseCount: 2 }),
    )
    expect(rows.every((row) => !row.failedToOpen)).toBe(true)
  })

  // @test-link [[module_kept_session_reach]]
  it('give no row for a summary that cannot be read, and none from the defaults', () => {
    const rows = useKeptSessions([
      { key: 'bad', value: UNREADABLE as never },
      { key: 'good', value: summaryAt(1_000) as never },
    ]).rows()

    expect(keysOf(rows)).toEqual(['good'])
    expect(useKeptSessions([]).rows()).toEqual([])
  })

  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('give a row saved by a newer version, holding what this version can read of it', () => {
    const row = keptSessionRow(
      'n',
      newer(summaryAt(5_000, { pinned: true }), { favoritesCount: 'many', comment: 42 }),
    )

    expect(row?.kind).toBe('newer')
    const readable = row?.kind === 'newer' ? row.readable : null
    expect(readable).toEqual(
      expect.objectContaining({ startedAt: 5_000, phraseCount: 2, pinned: true }),
    )
    expect(readable).not.toHaveProperty('favoritesCount')
    expect(readable).not.toHaveProperty('comment')
    expect(keptSessionRow('m', { dataVersion: 3, appVersion: '9.0.0' })).toEqual({
      kind: 'newer',
      key: 'm',
      readable: {},
      failedToOpen: false,
    })
  })

  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('sort a newer row without a readable start last', () => {
    const rows = useKeptSessions([
      { key: 'n', value: newer(summaryAt(9_000), { startedAt: 'later' }) as never },
      { key: 'a', value: summaryAt(1_000) as never },
    ]).rows()

    expect(keysOf(rows)).toEqual(['a', 'n'])
  })
})

// @test-link [[module_kept_session_reach]]
describe('the rows kept current for the visit', () => {
  /** Intent: rows over two kept sessions, `old` pinned and `new` not, played notes kept. */
  const twoRows = () =>
    useKeptSessions([
      { key: 'old', value: summaryAt(1_000, { pinned: true, playedNotesKept: true }) as never },
      { key: 'new', value: summaryAt(2_000, { playedNotesKept: true }) as never },
    ])

  // @test-link [[module_kept_session_reach]]
  it('take a change at once, and lose a deleted row', () => {
    const rows = twoRows()

    rows.edited('new', { pinned: true, favoritesCount: 1, comment: 'Mine.' })
    rows.edited('absent', { pinned: true })
    rows.removed(['old'])

    expect(rows.rows()).toEqual([
      expect.objectContaining({
        key: 'new',
        summary: expect.objectContaining({ pinned: true, favoritesCount: 1, comment: 'Mine.' }),
      }),
    ])
  })

  // @test-link [[rule_kept_played_notes_deletable]]
  it('say no played notes are kept once every kept played note is deleted', () => {
    const rows = twoRows()

    rows.playedNotesDeleted()

    expect(rows.rows().map((row) => row.kind === 'current' && row.summary.playedNotesKept)).toEqual(
      [false, false],
    )
  })

  // @test-link [[module_kept_session_reach]]
  it('mark a row whose opening failed, until it opens', () => {
    const rows = twoRows()

    rows.openFailed('new')
    expect(rows.row('new')?.failedToOpen).toBe(true)
    expect(rows.row('old')?.failedToOpen).toBe(false)

    rows.opened('new')
    expect(rows.row('new')?.failedToOpen).toBe(false)
  })
})

// @test-link [[module_kept_session_reach]]
// @test-link [[module_kept_session_save]]
describe("the rows after a session's own save", () => {
  /** Intent: saves that build the batch from `summaries` and resolve `outcome`. */
  function savesResolving(summaries: readonly StoredEntry[], outcome: SessionSaveOutcome) {
    return {
      saveSession: vi.fn((changes: SessionChanges) => {
        changes(summaries)
        return Promise.resolve(outcome)
      }),
    }
  }

  /** A save's batch: `old` deleted, the new session `fresh` written, started last. */
  const batch: SessionChanges = () =>
    [
      { kind: 'delete', store: 'sessionSummaries', key: 'old' },
      { kind: 'delete', store: 'sessionBodies', key: 'old' },
      { kind: 'write', store: 'sessionSummaries', key: 'fresh', record: summaryAt(9_000) },
    ] as StorageChange[]

  /** A session held in memory under `fresh`, pinned and commented since its end. */
  const held = { key: 'fresh', pinned: true, favorites: [2], comment: 'Again.' }

  // @test-link [[module_kept_session_reach]]
  it('add the saved session first, with its facts held now, and lose those it deleted', async () => {
    const loaded: StoredEntry[] = [
      { key: 'old', value: summaryAt(1_000) as never },
      { key: 'kept', value: summaryAt(2_000, { pinned: true }) as never },
    ]
    const rows = useKeptSessions(loaded)
    const saves = rows.savingThrough(savesResolving(loaded, { status: 'saved' }), () => ({
      ...(held as unknown as ReviewedSession),
      playedNotesKept: false,
    }))

    expect(await saves.saveSession(batch)).toEqual({ status: 'saved' })

    expect(keysOf(rows.rows())).toEqual(['fresh', 'kept'])
    expect(rows.row('fresh')).toEqual(
      expect.objectContaining({
        summary: expect.objectContaining({ pinned: true, favoritesCount: 1, comment: 'Again.' }),
      }),
    )
  })

  for (const outcome of [
    { status: 'refused', kind: 'other' },
    { status: 'refused', kind: 'quota' },
    { status: 'saving-off' },
  ] as const) {
    // @test-link [[module_kept_session_reach]]
    // @test-link [[rule_failed_save_never_disturbs_session]]
    it(`add and remove no row when the save ends ${outcome.status === 'refused' ? `refused as ${outcome.kind}` : 'with saving off'}`, async () => {
      const loaded: StoredEntry[] = [{ key: 'old', value: summaryAt(1_000) as never }]
      const rows = useKeptSessions(loaded)
      const saves = rows.savingThrough(savesResolving(loaded, outcome), () => null)

      expect(await saves.saveSession(batch)).toEqual(outcome)

      expect(keysOf(rows.rows())).toEqual(['old'])
    })
  }
})
