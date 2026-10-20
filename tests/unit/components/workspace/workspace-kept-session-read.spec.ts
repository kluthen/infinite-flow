/**
 * The most recent session after a reload, and its read for `Review last session`: from the kept
 * summaries the load read, the readable one with the latest start, under its key; read back by
 * that key into what its Review draws (its decoded phrases, its start, the instrument's name and
 * the preset label the summary holds, how it is kept), or told apart: damaged (the codec reads its records as
 * unreadable, a missing body included) or not read (the device refused the read, its records are
 * all absent, or a newer version wrote them). Beside them, the batches that delete damaged
 * sessions: the load's clean-up, which re-reads the summaries at the change, and an opening's.
 */
import { describe, expect, it, vi } from 'vitest'

import {
  damagedSessionChanges,
  damagedSessionsCleanUp,
  damagedSummaryKeys,
  mostRecentKept,
  readKeptReviewedSession,
} from '@/components/workspace/workspace-kept-session-read'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import type { KeptRecordsReader } from '@/storage/save-policy'
import type { SessionHistory } from '@/session/session-history'
import * as codecOf from '@/storage/records/kept-session-record'
import {
  decodeKeptSession,
  encodeKeptSession,
  type KeptSessionFacts,
} from '@/storage/records/kept-session-record'
import { StorageError, type StoredEntry } from '@/storage/storage-port'
import {
  APP_VERSION,
  edited,
  recordedKeptSession,
  storedRecords,
} from '../../storage/kept-session-fixtures'

const FRESH: KeptSessionFacts = {
  pinned: false,
  favorites: [],
  comment: '',
  playedNotesKept: false,
  presets: BUILT_IN_PRESETS,
}

/** Intent: `history` as kept with `facts`, its start moved to `startedAt`. */
function kept(history: SessionHistory, startedAt: number, facts: KeptSessionFacts = FRESH) {
  return storedRecords(encodeKeptSession({ ...history, startedAt }, facts, APP_VERSION))
}

/** Intent: a stored summary entry under `key`. */
function entry(key: string, summary: unknown): StoredEntry {
  return { key, value: summary }
}

// @test-link [[module_kept_session_save]]
// @test-link [[rule_most_recent_session_kept]]
describe('the most recent session after a reload', () => {
  const history = recordedKeptSession('bb-tenor', 2)

  // @test-link [[module_kept_session_save]]
  it('is the readable kept session with the latest start, under its key', () => {
    const summaries = [
      entry('a', kept(history, 3_000, { ...FRESH, pinned: true }).summary),
      entry('b', kept(history, 9_000).summary),
      entry('c', kept(history, 5_000, { ...FRESH, pinned: true }).summary),
    ]

    expect(mostRecentKept(summaries)).toEqual({ kind: 'kept', key: 'b' })
    expect(mostRecentKept(summaries.filter(({ key }) => key !== 'b'))).toEqual({
      kind: 'kept',
      key: 'c',
    })
  })

  // @test-link [[module_kept_session_save]]
  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('passes over a summary this version cannot read, and is none without a readable one', () => {
    const later = kept(history, 9_000).summary
    const summaries = [
      entry('readable', kept(history, 3_000).summary),
      entry('unreadable', edited(later, ['startedAt'], 'not a time')),
      entry('newer', { ...(later as object), dataVersion: 99 }),
    ]

    expect(mostRecentKept(summaries)).toEqual({ kind: 'kept', key: 'readable' })
    expect(mostRecentKept(summaries.slice(1))).toBeNull()
    expect(mostRecentKept([])).toBeNull()
  })
})

// @test-link [[req_kept_session_review]]
// @test-link [[module_kept_session_codec]]
describe('reading the most recent session for its Review', () => {
  const history = recordedKeptSession('eb-alto', 3)

  // @test-link [[req_kept_session_review]]
  // @test-link [[req_last_session_review]]
  it("reads its records by its key into what its Review draws, named from the summary's instrument", async () => {
    const stored = kept(history, history.startedAt, { ...FRESH, pinned: true })
    const read = vi.fn(() => Promise.resolve(stored))

    const reading = await readKeptReviewedSession(read, 'session-key')

    expect(read).toHaveBeenCalledExactlyOnceWith('session-key')
    if (reading.kind !== 'read') throw new Error('the stored session was not read')
    const session = reading.session
    const decoded = decodeKeptSession(stored)
    if (decoded.reading !== 'current') throw new Error('the stored session does not decode')
    expect(session).not.toBeNull()
    expect(session?.history.phrases()).toEqual(decoded.value.phrases)
    expect(session?.history.phraseCount).toBe(3)
    expect(session?.history.startedAt).toBe(history.startedAt)
    expect(session?.instrumentName).toBe('E-flat alto saxophone')
    expect(session?.tempoReached).toBe(decoded.value.summary.tempoReached)
    expect(session?.keeping).toBe('pinned')
    expect(Object.isFrozen(session)).toBe(true)
  })

  // @test-link [[req_kept_session_review]]
  it('keeps an unpinned session not pinned', async () => {
    const stored = kept(history, history.startedAt)

    const reading = await readKeptReviewedSession(() => Promise.resolve(stored), 'k')

    expect(reading.kind === 'read' && reading.session.keeping).toBe('not-pinned')
  })

  // @test-link [[rule_preset_label_kept_with_session]]
  it('carries the preset label its summary stores', async () => {
    const customJazz = {
      ...history,
      selection: { kind: 'custom', baseId: 'jazz' },
    } as const
    const stored = kept(customJazz, history.startedAt)

    const reading = await readKeptReviewedSession(() => Promise.resolve(stored), 'k')

    expect(reading.kind === 'read' && reading.session.presetLabel).toBe('Custom, based on Jazz')
  })

  // @test-link [[req_kept_session_review]]
  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('tells a session not read: the device refused the read, its records are all absent, or a newer version wrote them', async () => {
    const stored = kept(history, history.startedAt)
    /** Intent: a read the device refuses. */
    const refused = () => Promise.reject(new StorageError('other', 'read refused'))
    const absent = { summary: undefined, body: undefined, playedNotes: undefined }
    const newer = { ...stored, summary: { ...(stored.summary as object), dataVersion: 99 } }
    const newerOverDamaged = { ...newer, body: edited(stored.body, ['phrases'], 'none') }

    for (const read of [
      refused,
      () => Promise.resolve(absent),
      () => Promise.resolve(newer),
      () => Promise.resolve(newerOverDamaged),
    ]) {
      expect(await readKeptReviewedSession(read, 'k')).toEqual({ kind: 'not-read' })
    }
  })

  // @test-link [[module_kept_session_save]]
  // @test-link [[module_kept_session_codec]]
  it('tells a damaged session: any record unreadable, missing or disagreeing with another', async () => {
    const stored = kept(history, history.startedAt)
    const damaged = [
      { ...stored, body: edited(stored.body, ['phrases'], 'none') },
      { ...stored, summary: edited(stored.summary, ['startedAt'], 'not a time') },
      { ...stored, body: undefined },
      { ...stored, summary: undefined },
      // The summary says no played notes are kept, yet a played-notes record is stored.
      { ...stored, playedNotes: codecOf.encodeKeptPlayedNotes(history, APP_VERSION) },
    ]

    for (const records of damaged) {
      expect(await readKeptReviewedSession(() => Promise.resolve(records), 'k')).toEqual({
        kind: 'damaged',
      })
    }
  })

  // @test-link [[req_kept_session_review]]
  it('rejects on any other failure, the defect it is', async () => {
    /** Intent: a read that fails for another reason: a defect. */
    const broken = () => Promise.reject(new TypeError('broken read'))

    await expect(readKeptReviewedSession(broken, 'k')).rejects.toThrow('broken read')
  })
})

/** Intent: a reader over `stores`, each a map of key to record, logging every read it serves. */
function readerOver(stores: Record<string, Map<string, unknown>>, reads: string[] = []) {
  const store = (name: string) => stores[name] ?? new Map<string, unknown>()
  const reader: KeptRecordsReader = {
    read: (name, key) => {
      reads.push(`read ${name} ${key}`)
      return Promise.resolve(store(name).get(key))
    },
    readKeyed: (name) => {
      reads.push(`readKeyed ${name}`)
      return Promise.resolve([...store(name)].map(([key, value]) => ({ key, value })))
    },
    readKeys: (name) => {
      reads.push(`readKeys ${name}`)
      return Promise.resolve([...store(name).keys()])
    },
  }
  return reader
}

/** Intent: each change of a batch as `kind store key`, in order. */
function described(changes: readonly { kind: string; store: string; key: string }[]): string[] {
  return changes.map((change) => `${change.kind} ${change.store} ${change.key}`)
}

// @test-link [[module_kept_session_save]]
// @test-link [[module_kept_session_codec]]
describe('the deletions of damaged kept sessions', () => {
  const history = recordedKeptSession('bb-tenor', 2)
  const readable = kept(history, 3_000)
  const damagedSummary = edited(readable.summary, ['startedAt'], 'not a time')
  const newerSummary = { ...(readable.summary as object), dataVersion: 99 }

  // @test-link [[module_kept_session_save]]
  it('finds damaged the summaries the codec reads as unreadable, never a newer one', () => {
    const summaries = [
      entry('readable', readable.summary),
      entry('damaged', damagedSummary),
      entry('newer', newerSummary),
      entry('also-damaged', { dataVersion: 1, appVersion: 'x' }),
    ]

    expect(damagedSummaryKeys(summaries)).toEqual(['damaged', 'also-damaged'])
    expect(damagedSummaryKeys([entry('readable', readable.summary)])).toEqual([])
  })

  // @test-link [[module_kept_session_save]]
  it("the load's clean-up re-reads the summaries at the change and deletes every damaged session's three records", async () => {
    const reads: string[] = []
    const reader = readerOver(
      {
        sessionSummaries: new Map<string, unknown>([
          ['readable', readable.summary],
          ['damaged', damagedSummary],
          ['newer', newerSummary],
        ]),
      },
      reads,
    )
    const cleanUp = damagedSessionsCleanUp()

    expect(cleanUp.found()).toBeNull()
    expect(described(await cleanUp.changes(reader))).toEqual([
      'delete sessionSummaries damaged',
      'delete sessionBodies damaged',
      'delete playedNotes damaged',
    ])
    expect(reads).toEqual(['readKeyed sessionSummaries'])
    expect(cleanUp.found()?.damaged).toEqual(['damaged'])
    expect(cleanUp.found()?.summaries.map(({ key }) => key)).toEqual([
      'readable',
      'damaged',
      'newer',
    ])
  })

  // @test-link [[module_kept_session_save]]
  it("the load's clean-up writes nothing when no summary is damaged at its re-read", async () => {
    const reader = readerOver({ sessionSummaries: new Map([['readable', readable.summary]]) })
    const cleanUp = damagedSessionsCleanUp()

    expect(await cleanUp.changes(reader)).toEqual([])
    expect(cleanUp.found()?.damaged).toEqual([])
  })

  // @test-link [[module_kept_session_save]]
  it("an opening's deletion re-reads the session at the change: damaged, its three records go; absent, readable or newer, nothing", async () => {
    const damagedBody = edited(readable.body, ['phrases'], 'none')
    /** Intent: the opening's batch for a session stored as `summary` and `body` under `k`. */
    const batchFor = async (summary: unknown, body: unknown) => {
      const stores = {
        sessionSummaries: new Map<string, unknown>(summary === undefined ? [] : [['k', summary]]),
        sessionBodies: new Map<string, unknown>(body === undefined ? [] : [['k', body]]),
      }
      return described(await damagedSessionChanges(codecOf, 'k')(readerOver(stores)))
    }

    expect(await batchFor(readable.summary, damagedBody)).toEqual([
      'delete sessionSummaries k',
      'delete sessionBodies k',
      'delete playedNotes k',
    ])
    expect(await batchFor(readable.summary, undefined)).toHaveLength(3)
    expect(await batchFor(undefined, undefined)).toEqual([])
    expect(await batchFor(readable.summary, readable.body)).toEqual([])
    expect(await batchFor(newerSummary, damagedBody)).toEqual([])
  })
})
