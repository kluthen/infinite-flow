/**
 * The most recent session after a reload, and its read for `Review last session`: from the kept
 * summaries the load read, the readable one with the latest start, under its key; read back by
 * that key into what its Review draws (its decoded phrases, its start, the instrument's name the
 * summary holds, how it is kept), or nothing when the device refuses the read or the records
 * cannot be read by this version.
 */
import { describe, expect, it, vi } from 'vitest'

import {
  mostRecentKept,
  readKeptReviewedSession,
} from '@/components/workspace/workspace-kept-session-read'
import type { SessionHistory } from '@/session/session-history'
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

    const session = await readKeptReviewedSession(read, 'session-key')

    expect(read).toHaveBeenCalledExactlyOnceWith('session-key')
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

    const session = await readKeptReviewedSession(() => Promise.resolve(stored), 'k')

    expect(session?.keeping).toBe('not-pinned')
  })

  // @test-link [[req_kept_session_review]]
  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('gives nothing when the device refuses the read, or the records cannot be read', async () => {
    const stored = kept(history, history.startedAt)
    /** Intent: a read the device refuses. */
    const refused = () => Promise.reject(new StorageError('other', 'read refused'))
    const unreadable = { ...stored, body: edited(stored.body, ['phrases'], 'none') }
    const newer = { ...stored, summary: { ...(stored.summary as object), dataVersion: 99 } }

    expect(await readKeptReviewedSession(refused, 'k')).toBeNull()
    expect(await readKeptReviewedSession(() => Promise.resolve(unreadable), 'k')).toBeNull()
    expect(await readKeptReviewedSession(() => Promise.resolve(newer), 'k')).toBeNull()
  })

  // @test-link [[req_kept_session_review]]
  it('rejects on any other failure, the defect it is', async () => {
    /** Intent: a read that fails for another reason: a defect. */
    const broken = () => Promise.reject(new TypeError('broken read'))

    await expect(readKeptReviewedSession(broken, 'k')).rejects.toThrow('broken read')
  })
})
