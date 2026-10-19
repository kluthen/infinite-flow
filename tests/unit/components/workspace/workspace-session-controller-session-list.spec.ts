/**
 * The session controller's reach into every kept session (module_kept_session_reach): the rows it
 * holds for the visit and keeps current, the session list in the review mode, opening any kept
 * session by its key (the latest opening wins, leaving the mode cancels, a refused read marks its
 * row), and a pin, an unpin and `Delete session` of a kept session not held in memory, by its row,
 * through the change path. On the fake audio clock at 240 BPM from 5 s: phrase 1 sounds from 6.1 s.
 */
import { describe, expect, it, vi } from 'vitest'

import type { KeptSessionsSeam } from '@/components/workspace/workspace-session-controller-types'
import {
  encodeKeptSession,
  KEPT_SESSION_SUMMARY_DATA_VERSION,
  type KeptSessionFacts,
} from '@/storage/records/kept-session-record'
import type { KeptChangeOutcome, KeptRefusal, SessionChanges } from '@/storage/save-policy'
import { StorageError, type StoredEntry } from '@/storage/storage-port'
import type { StoredKeptSession } from '@/storage/records/kept-session-record'

import {
  APP_VERSION,
  recordedKeptSession,
  storedRecords,
} from '../../storage/kept-session-fixtures'
import { controllerRig, flush, playTo, type ControllerRig } from './session-controller-rig'

const history = recordedKeptSession('eb-alto', 2)

/** The facts a session is first saved with: nothing pinned, chosen or commented. */
const FRESH: KeptSessionFacts = {
  pinned: false,
  favorites: [],
  comment: '',
  playedNotesKept: false,
}

/** Intent: the stored records of the recorded session started at `startedAt`, with `facts`. */
function recordsAt(startedAt: number, facts: Partial<KeptSessionFacts> = {}): StoredKeptSession {
  const shifted = { ...history, phrases: () => history.phrases(), startedAt }
  return storedRecords(encodeKeptSession(shifted, { ...FRESH, ...facts }, APP_VERSION))
}

/** A promise and the function that settles it, for a read the test resolves by hand. */
interface Deferred<T> {
  readonly promise: Promise<T>
  readonly settle: (value: T) => void
  readonly fail: (error: unknown) => void
}

/** Intent: a promise the test settles by hand. */
function deferred<T>(): Deferred<T> {
  let settle: (value: T) => void = () => {}
  let fail: (error: unknown) => void = () => {}
  const promise = new Promise<T>((resolve, reject) => {
    settle = resolve
    fail = reject
  })
  return { promise, settle, fail }
}

/** A fake kept-sessions seam over stored records, its changes logged with their refusal. */
interface FakeKept {
  readonly seam: Partial<KeptSessionsSeam>
  readonly stored: Map<string, StoredKeptSession>
  readonly reads: string[]
  readonly changes: KeptRefusal[]
  protectionRequests: number
  savingOff: boolean
  changeOutcome: KeptChangeOutcome
  /** When set, the next read waits on it instead of reading `stored`. */
  nextRead: Deferred<StoredKeptSession> | null
}

/** The three kept sessions a reload loads: `pinned` the oldest, `newest` the most recent. */
const LOADED: readonly [string, StoredKeptSession][] = [
  ['pinned', recordsAt(1_000, { pinned: true, favorites: [1] })],
  ['middle', recordsAt(2_000, { comment: 'Steady.' })],
  ['newest', recordsAt(3_000)],
]

/** Intent: a fake seam over `entries` (the three loaded by default), saving on. */
function fakeKept(entries: readonly [string, StoredKeptSession][] = LOADED): FakeKept {
  const stored = new Map(entries)
  const fake: FakeKept = {
    seam: {},
    stored,
    reads: [],
    changes: [],
    protectionRequests: 0,
    savingOff: false,
    changeOutcome: { status: 'saved' },
    nextRead: null,
  }
  const summaries: StoredEntry[] = entries.map(([key, records]) => ({
    key,
    value: records.summary as never,
  }))
  Object.assign(fake.seam, {
    summaries,
    read: (key: string) => {
      fake.reads.push(key)
      const pending = fake.nextRead
      if (pending !== null) {
        fake.nextRead = null
        return pending.promise
      }
      const records = stored.get(key)
      if (records === undefined) return Promise.reject(new StorageError('other', 'absent'))
      return Promise.resolve(records)
    },
    savingOff: () => fake.savingOff,
    changes: {
      changeKept: (_changes: unknown, refusal: KeptRefusal) => {
        fake.changes.push(refusal)
        return Promise.resolve(fake.changeOutcome)
      },
      readKept: () => {
        throw new Error('no read at a change is asked for')
      },
    },
    requestProtection: () => {
      fake.protectionRequests += 1
    },
  })
  return fake
}

/** Intent: a rig after a reload that loaded `fake`'s kept sessions. */
function reloaded(fake: FakeKept): ControllerRig {
  return controllerRig(undefined, undefined, { keptSessions: fake.seam })
}

/** Intent: the keys of the controller's rows, in order. */
function rowKeys(rig: ControllerRig): string[] {
  return rig.controller.state.keptRows.map((row) => row.key)
}

// @test-link [[module_kept_session_reach]]
// @test-link [[req_kept_session_list]]
describe('session controller: the rows of the session list', () => {
  // @test-link [[module_kept_session_reach]]
  it('are the summaries the load read, newest first, at once and with no read', () => {
    const fake = fakeKept()
    const rig = reloaded(fake)

    expect(rowKeys(rig)).toEqual(['newest', 'middle', 'pinned'])
    expect(fake.reads).toEqual([])
  })

  // @test-link [[module_kept_session_reach]]
  // @test-link [[rule_most_recent_session_kept]]
  it("after a session's save, show it first and lose those its save deleted", async () => {
    const fake = fakeKept()
    const summaries = fake.seam.summaries ?? []
    const rig = controllerRig(undefined, undefined, {
      keptSessions: fake.seam,
      sessionSaveOutcome: (changes: SessionChanges) => {
        changes(summaries)
        return Promise.resolve({ status: 'saved' })
      },
    })

    rig.controller.start()
    await playTo(rig, 6.6)
    rig.controller.stop()
    await vi.waitFor(() => expect(rig.controller.state.keptRows).toHaveLength(2))

    const review = rig.controller.state.review
    expect(rowKeys(rig)).toEqual([review?.key, 'pinned'])
  })

  for (const outcome of [
    { status: 'refused', kind: 'other' },
    { status: 'refused', kind: 'quota' },
  ] as const) {
    // @test-link [[module_kept_session_reach]]
    it(`gain and lose no row when the session's save is refused as ${outcome.kind}`, async () => {
      const fake = fakeKept()
      const summaries = fake.seam.summaries ?? []
      const rig = controllerRig(undefined, undefined, {
        keptSessions: fake.seam,
        sessionSaveOutcome: (changes: SessionChanges) => {
          changes(summaries)
          return Promise.resolve(outcome)
        },
      })

      rig.controller.start()
      await playTo(rig, 6.6)
      rig.controller.stop()
      await flush()

      expect(rowKeys(rig)).toEqual(['newest', 'middle', 'pinned'])
    })
  }

  // @test-link [[module_kept_session_reach]]
  // @test-link [[rule_outdated_tab_stops_saving]]
  it('gain no row for a session that ends while saving is off', async () => {
    const fake = fakeKept()
    fake.savingOff = true
    const rig = reloaded(fake)

    rig.controller.start()
    await playTo(rig, 6.6)
    rig.controller.stop()
    await flush()

    expect(rowKeys(rig)).toEqual(['newest', 'middle', 'pinned'])
  })
})

// @test-link [[module_kept_session_reach]]
// @test-link [[req_kept_session_list]]
describe('session controller: the session list in the review mode', () => {
  // @test-link [[module_kept_session_reach]]
  it('shows at Idle, blocks a start while it shows, and Close review leaves it', () => {
    const rig = reloaded(fakeKept())

    rig.controller.showList()

    expect(rig.controller.state.listShowing).toBe(true)
    expect(rig.controller.state.startBlocker).toBe('review_showing')
    expect(() => rig.controller.showList()).toThrow(/already shows/)
    expect(() => rig.controller.showReview()).toThrow(/list shows/)

    rig.controller.closeReview()
    expect(rig.controller.state.listShowing).toBe(false)
    expect(rig.controller.state.startBlocker).not.toBe('review_showing')
    expect(() => rig.controller.closeReview()).toThrow(/no Review shows/)
  })

  // @test-link [[module_kept_session_reach]]
  it('replaces a showing Review, which is kept (All sessions)', async () => {
    const rig = reloaded(fakeKept())
    await rig.controller.showReview()

    rig.controller.showList()

    expect(rig.controller.state.review?.showing).toBe(false)
    expect(rig.controller.state.listShowing).toBe(true)
  })

  // @test-link [[module_kept_session_reach]]
  it('never shows during a session', () => {
    const rig = reloaded(fakeKept())
    rig.controller.start()

    expect(() => rig.controller.showList()).toThrow(/during a session/)
  })
})

// @test-link [[module_kept_session_reach]]
// @test-link [[req_kept_session_review]]
describe('session controller: opening a kept session by its key', () => {
  // @test-link [[req_kept_session_review]]
  it('reads it, the opening under way meanwhile, then shows its Review in the list’s place', async () => {
    const fake = fakeKept()
    const rig = reloaded(fake)
    rig.controller.showList()

    const opening = rig.controller.openSession('middle')
    expect(rig.controller.state.openingKey).toBe('middle')
    await expect(opening).resolves.toBe('shown')

    expect(fake.reads).toEqual(['middle'])
    expect(rig.controller.state.openingKey).toBeNull()
    expect(rig.controller.state.listShowing).toBe(false)
    const { review } = rig.controller.state
    expect(review).toEqual(
      expect.objectContaining({ key: 'middle', showing: true, comment: 'Steady.' }),
    )
    expect(review?.history.startedAt).toBe(2_000)
    expect(rig.controller.state.mostRecent).toEqual({ kind: 'kept', key: 'newest' })
  })

  // @test-link [[rule_most_recent_session_kept]]
  it('holds the most recent session once read under its key, so Review last session reads nothing', async () => {
    const fake = fakeKept()
    const rig = reloaded(fake)
    rig.controller.showList()

    await rig.controller.openSession('newest')
    rig.controller.closeReview()
    await expect(rig.controller.showReview()).resolves.toBe('shown')

    expect(fake.reads).toEqual(['newest'])
    expect(rig.controller.state.mostRecent?.kind).toBe('held')
  })

  // @test-link [[module_kept_session_reach]]
  it('shows a session held in memory at once, with no read', async () => {
    const fake = fakeKept()
    const rig = reloaded(fake)
    await rig.controller.showReview()
    rig.controller.showList()

    await expect(rig.controller.openSession('newest')).resolves.toBe('shown')

    expect(fake.reads).toEqual(['newest'])
    expect(rig.controller.state.review?.showing).toBe(true)
  })

  // @test-link [[module_kept_session_reach]]
  it('lets the latest press win: an earlier opening shows nothing when its read settles', async () => {
    const fake = fakeKept()
    const rig = reloaded(fake)
    rig.controller.showList()
    const slow = deferred<StoredKeptSession>()
    fake.nextRead = slow

    const first = rig.controller.openSession('middle')
    const second = rig.controller.openSession('pinned')
    expect(rig.controller.state.openingKey).toBe('pinned')
    await expect(second).resolves.toBe('shown')
    slow.settle(recordsAt(2_000, { comment: 'Steady.' }))

    await expect(first).resolves.toBe('superseded')
    expect(rig.controller.state.review?.key).toBe('pinned')
  })

  // @test-link [[module_kept_session_reach]]
  it('is cancelled by Close review: its read then shows nothing', async () => {
    const fake = fakeKept()
    const rig = reloaded(fake)
    rig.controller.showList()
    const slow = deferred<StoredKeptSession>()
    fake.nextRead = slow

    const opening = rig.controller.openSession('middle')
    rig.controller.closeReview()
    expect(rig.controller.state.openingKey).toBeNull()
    slow.settle(recordsAt(2_000, { comment: 'Steady.' }))

    await expect(opening).resolves.toBe('superseded')
    expect(rig.controller.state.review).toBeNull()
    expect(rig.controller.state.listShowing).toBe(false)
  })

  // @test-link [[module_kept_session_reach]]
  it('a read the device refuses shows no review and marks the row, until it next opens', async () => {
    const fake = fakeKept()
    const rig = reloaded(fake)
    rig.controller.showList()
    const refused = deferred<StoredKeptSession>()
    fake.nextRead = refused

    const opening = rig.controller.openSession('middle')
    refused.fail(new StorageError('other', 'refused'))

    await expect(opening).resolves.toBe('failed')
    expect(rig.controller.state.listShowing).toBe(true)
    expect(rig.controller.state.review).toBeNull()
    const row = () => rig.controller.state.keptRows.find(({ key }) => key === 'middle')
    expect(row()?.failedToOpen).toBe(true)
    expect(rowKeys(rig)).toEqual(['newest', 'middle', 'pinned'])

    await expect(rig.controller.openSession('middle')).resolves.toBe('shown')
    expect(row()?.failedToOpen).toBe(false)
  })

  // @test-link [[module_kept_session_reach]]
  // @test-link [[req_last_session_review]]
  it("Review last session's refused read shows the list, the most recent session's row failed to open", async () => {
    const fake = fakeKept()
    const rig = reloaded(fake)
    const refused = deferred<StoredKeptSession>()
    fake.nextRead = refused

    const showing = rig.controller.showReview()
    refused.fail(new StorageError('other', 'refused'))

    await expect(showing).resolves.toBe('failed')
    expect(rig.controller.state.listShowing).toBe(true)
    expect(rig.controller.state.review).toBeNull()
    expect(rig.controller.state.keptRows[0]).toEqual(
      expect.objectContaining({ key: 'newest', failedToOpen: true }),
    )
  })

  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('never opens a row saved by a newer version, nor a key with no row, nor during a session', () => {
    const fake = fakeKept([
      [
        'newer',
        {
          ...recordsAt(4_000),
          summary: {
            ...(recordsAt(4_000).summary as object),
            dataVersion: KEPT_SESSION_SUMMARY_DATA_VERSION + 1,
          },
        } as StoredKeptSession,
      ],
    ])
    const rig = reloaded(fake)

    expect(() => rig.controller.openSession('newer')).toThrow(/can open/)
    expect(() => rig.controller.openSession('absent')).toThrow(/can open/)
    rig.controller.start()
    expect(() => rig.controller.openSession('newer')).toThrow(/during a session/)
  })
})

// @test-link [[module_kept_session_reach]]
// @test-link [[module_kept_session_changes]]
describe('session controller: a pin, an unpin and Delete session from a row, not held in memory', () => {
  /** Intent: the row under `key`'s summary fact `fact`. */
  function rowFact(rig: ControllerRig, key: string, fact: 'pinned'): unknown {
    const row = rig.controller.state.keptRows.find((candidate) => candidate.key === key)
    return row?.kind === 'current' ? row.summary[fact] : undefined
  }

  // @test-link [[rule_pinned_session_kept]]
  it('a pin changes the row at once, asks for persistent storage, and is one change', async () => {
    const fake = fakeKept()
    const rig = reloaded(fake)

    const pinning = rig.controller.setPinned('middle', true)
    expect(rowFact(rig, 'middle', 'pinned')).toBe(true)
    await pinning

    expect(fake.changes).toEqual(['notice'])
    expect(fake.protectionRequests).toBe(1)
    expect(fake.reads).toEqual([])
  })

  // @test-link [[rule_pinned_session_kept]]
  it('an unpin changes the row, and stays so for the visit when the device refuses it', async () => {
    const fake = fakeKept()
    fake.changeOutcome = { status: 'refused', kind: 'other' }
    const rig = reloaded(fake)

    await rig.controller.setPinned('pinned', false)

    expect(rowFact(rig, 'pinned', 'pinned')).toBe(false)
    expect(fake.changes).toEqual(['notice'])
    expect(fake.protectionRequests).toBe(0)
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('while saving is off, a pin holds on the row for the visit, saving nothing', async () => {
    const fake = fakeKept()
    fake.savingOff = true
    const rig = reloaded(fake)

    await rig.controller.setPinned('middle', true)

    expect(rowFact(rig, 'middle', 'pinned')).toBe(true)
    expect(fake.changes).toEqual([])
  })

  // @test-link [[module_kept_session_reach]]
  it('a pinned row opened later shows its Review pinned, as the row holds it for the visit', async () => {
    const fake = fakeKept()
    fake.changeOutcome = { status: 'refused', kind: 'other' }
    const rig = reloaded(fake)
    await rig.controller.setPinned('middle', true)
    rig.controller.showList()

    await rig.controller.openSession('middle')

    expect(rig.controller.state.review).toEqual(
      expect.objectContaining({ pinned: true, keeping: 'pinned' }),
    )
  })

  // @test-link [[req_kept_session_list]]
  it('Delete session deletes through its row, its sheet told a refusal, then the row leaves', async () => {
    const fake = fakeKept()
    const rig = reloaded(fake)

    await expect(rig.controller.deleteSession('middle')).resolves.toBe('deleted')

    expect(fake.changes).toEqual(['caller'])
    expect(rowKeys(rig)).toEqual(['newest', 'pinned'])
    expect(fake.reads).toEqual([])
  })

  // @test-link [[req_kept_session_list]]
  it('a refused deletion leaves the row', async () => {
    const fake = fakeKept()
    fake.changeOutcome = { status: 'refused', kind: 'other' }
    const rig = reloaded(fake)

    await expect(rig.controller.deleteSession('middle')).resolves.toBe('refused')

    expect(rowKeys(rig)).toEqual(['newest', 'middle', 'pinned'])
  })

  // @test-link [[req_kept_session_list]]
  it('Delete session of the showing Review shows the list in its place', async () => {
    const fake = fakeKept()
    const rig = reloaded(fake)
    rig.controller.showList()
    await rig.controller.openSession('middle')

    await expect(rig.controller.deleteSession('middle')).resolves.toBe('deleted')

    expect(rig.controller.state.review).toBeNull()
    expect(rig.controller.state.listShowing).toBe(true)
    expect(rowKeys(rig)).toEqual(['newest', 'pinned'])
  })

  // @test-link [[rule_most_recent_session_kept]]
  it('deleting the most recent session leaves none for the visit', async () => {
    const fake = fakeKept()
    const rig = reloaded(fake)

    await rig.controller.deleteSession('newest')

    expect(rig.controller.state.mostRecent).toBeNull()
    expect(rowKeys(rig)).toEqual(['middle', 'pinned'])
  })

  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('throws for a row saved by a newer version, a key with no row, and a deletion while saving is off', async () => {
    const newer = recordsAt(4_000)
    const fake = fakeKept([
      ...LOADED,
      [
        'newer',
        {
          ...newer,
          summary: {
            ...(newer.summary as object),
            dataVersion: KEPT_SESSION_SUMMARY_DATA_VERSION + 1,
          },
        } as StoredKeptSession,
      ],
    ])
    const rig = reloaded(fake)

    expect(() => rig.controller.setPinned('newer', true)).toThrow(/no listed kept session/)
    expect(() => rig.controller.setPinned('absent', true)).toThrow(/no listed kept session/)
    await expect(rig.controller.deleteSession('newer')).rejects.toThrow(/no listed kept session/)
    fake.savingOff = true
    await expect(rig.controller.deleteSession('middle')).rejects.toThrow(/saving is off/)
  })
})
