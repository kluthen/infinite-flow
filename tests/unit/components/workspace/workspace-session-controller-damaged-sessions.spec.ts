/**
 * The session controller's deletions of damaged kept sessions (module_kept_session_save), while the
 * visit saves: the load's clean-up, run once the controller is built and only when a summary the
 * load read is damaged, one batch through the kept-change line (refusal `caller`) that reads the
 * summaries again at the change; an opening's deletion of a session it found damaged; and the
 * count the session's own save tells. Each is told through the seam's reports, a committed one
 * with how many went, a refused one with its kind; the sessions named leave the rows either way,
 * and the most recent session, when it was a kept one not yet read, becomes the readable kept
 * session that started last. Nothing is deleted while saving is off, for a read the device
 * refuses, records all absent or a newer version's session. On the fake audio clock at 240 BPM
 * from 5 s: phrase 1 sounds from 6.1 s.
 */
import { describe, expect, it } from 'vitest'

import type { KeptSessionsSeam } from '@/components/workspace/workspace-session-controller-types'
import type { DamagedSessionsReport } from '@/components/workspace/workspace-kept-sessions-seam'
import { encodeKeptSession, type KeptSessionFacts } from '@/storage/records/kept-session-record'
import type { StoredKeptSession } from '@/storage/records/kept-session-record'
import type {
  KeptChangeOutcome,
  KeptChanges,
  KeptRecordsReader,
  KeptRefusal,
  KeptRefusalKind,
  SessionChanges,
} from '@/storage/save-policy'
import { StorageError, type StorageChange, type StoreName } from '@/storage/storage-port'

import {
  APP_VERSION,
  edited,
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

/** Intent: `records` with a summary the codec reads as unreadable (an invalid start). */
function damagedSummary(records: StoredKeptSession): StoredKeptSession {
  return { ...records, summary: edited(records.summary, ['startedAt'], 'not a time') }
}

/** Intent: `records` with a body the codec reads as unreadable. */
function damagedBody(records: StoredKeptSession): StoredKeptSession {
  return { ...records, body: edited(records.body, ['phrases'], 'none') }
}

/** Intent: `records` as a newer version wrote them, its body damaged besides. */
function newerDamaged(records: StoredKeptSession): StoredKeptSession {
  return { ...damagedBody(records), summary: { ...(records.summary as object), dataVersion: 99 } }
}

const STORES: readonly StoreName[] = ['sessionSummaries', 'sessionBodies', 'playedNotes']

/** A fake kept-sessions seam over a device's three kept-session stores. */
interface FakeKept {
  readonly seam: Partial<KeptSessionsSeam>
  /** The device's records, by store then key. */
  readonly device: Map<StoreName, Map<string, unknown>>
  /** Every kept change asked for, with its refusal. */
  readonly changes: KeptRefusal[]
  /** Every batch applied to the device. */
  readonly applied: (readonly StorageChange[])[]
  /** Every report told, in order. */
  readonly reports: DamagedSessionsReport[]
  savingOff: boolean
  /** The device refuses the change's read as this kind; null lets it through. */
  refuseRead: KeptRefusalKind | null
  /** The device refuses the change's batch as this kind; null lets it through. */
  refuseBatch: KeptRefusalKind | null
  /** The device refuses the reads of an opening while true. */
  refuseOpeningRead: boolean
  /** When set, a change waits on it before reading. */
  gate: Promise<void> | null
}

/** Intent: the device's records of the session under `key`, as the seam's read gives them. */
function storedOf(device: FakeKept['device'], key: string): StoredKeptSession {
  const [summary, body, playedNotes] = STORES.map((store) => device.get(store)?.get(key))
  return { summary, body, playedNotes }
}

/**
 * Intent: a fake seam whose load read `loaded`'s summaries, the device then holding `device`'s
 * records (the load's by default), saving on, every kept change run against the device.
 */
function fakeKept(
  loaded: readonly [string, StoredKeptSession][],
  device: readonly [string, StoredKeptSession][] = loaded,
): FakeKept {
  const stores = new Map<StoreName, Map<string, unknown>>(STORES.map((s) => [s, new Map()]))
  for (const [key, records] of device) {
    const values = [records.summary, records.body, records.playedNotes]
    STORES.forEach((store, index) => {
      if (values[index] !== undefined) stores.get(store)?.set(key, values[index])
    })
  }
  const fake: FakeKept = {
    seam: {},
    device: stores,
    changes: [],
    applied: [],
    reports: [],
    savingOff: false,
    refuseRead: null,
    refuseBatch: null,
    refuseOpeningRead: false,
    gate: null,
  }
  const reader: KeptRecordsReader = {
    read: (store, key) => Promise.resolve(stores.get(store)?.get(key)),
    readKeyed: (store) =>
      Promise.resolve([...(stores.get(store) ?? [])].map(([key, value]) => ({ key, value }))),
    readKeys: (store) => Promise.resolve([...(stores.get(store)?.keys() ?? [])]),
  }
  /** Intent: run `changes` against the device as the kept-change line would. */
  const changeKept = async (
    changes: KeptChanges,
    refusal: KeptRefusal,
  ): Promise<KeptChangeOutcome> => {
    fake.changes.push(refusal)
    if (fake.gate !== null) await fake.gate
    if (fake.savingOff) return { status: 'saving-off' }
    if (fake.refuseRead !== null) return { status: 'refused', kind: fake.refuseRead }
    const batch = await changes(reader)
    if (batch.length === 0) return { status: 'unchanged' }
    if (fake.refuseBatch !== null) return { status: 'refused', kind: fake.refuseBatch }
    for (const change of batch) {
      if (change.kind === 'delete') stores.get(change.store)?.delete(change.key)
      else stores.get(change.store)?.set(change.key, change.record)
    }
    fake.applied.push(batch)
    return { status: 'saved' }
  }
  Object.assign(fake.seam, {
    summaries: loaded.map(([key, records]) => ({ key, value: records.summary as never })),
    read: (key: string) =>
      fake.refuseOpeningRead
        ? Promise.reject(new StorageError('other', 'refused'))
        : Promise.resolve(storedOf(stores, key)),
    savingOff: () => fake.savingOff,
    changes: {
      changeKept,
      readKept: () => {
        throw new Error('no read at a change is asked for')
      },
    },
    reports: { tell: (report: DamagedSessionsReport) => fake.reports.push(report) },
  })
  return fake
}

/** Intent: a rig over `fake`, reloaded: no session ran in this visit yet. */
function reloaded(fake: FakeKept): ControllerRig {
  return controllerRig(undefined, undefined, { keptSessions: fake.seam })
}

/** Intent: the keys of the controller's rows, in order. */
function rowKeys(rig: ControllerRig): string[] {
  return rig.controller.state.keptRows.map((row) => row.key)
}

/** Intent: the keys the device holds a record under, in `store`. */
function deviceKeys(fake: FakeKept, store: StoreName = 'sessionSummaries'): string[] {
  return [...(fake.device.get(store)?.keys() ?? [])]
}

const READABLE = recordsAt(3_000)
const PINNED = recordsAt(1_000, { pinned: true, favorites: [1] })
const DAMAGED = damagedSummary(recordsAt(2_000))

// @test-link [[module_kept_session_save]]
// @test-link [[rule_most_recent_session_kept]]
describe("session controller: the load's clean-up of damaged kept sessions", () => {
  // @test-link [[req_kept_sessions]]
  it('deletes every damaged session in one batch through the kept-change line, told with its count', async () => {
    const fake = fakeKept([
      ['readable', READABLE],
      ['pinned', PINNED],
      ['damaged', DAMAGED],
    ])
    const rig = reloaded(fake)
    await flush()

    expect(fake.changes).toEqual(['caller'])
    expect(fake.applied).toHaveLength(1)
    for (const store of STORES) expect(deviceKeys(fake, store)).not.toContain('damaged')
    expect(deviceKeys(fake)).toEqual(['readable', 'pinned'])
    expect(fake.reports).toEqual([{ status: 'deleted', count: 1 }])
    expect(rowKeys(rig)).toEqual(['readable', 'pinned'])
    expect(rig.controller.state.mostRecent).toEqual({ kind: 'kept', key: 'readable' })
  })

  it('opens no transaction and tells nothing when no summary the load read is damaged', async () => {
    const fake = fakeKept([
      ['readable', READABLE],
      ['newer', newerDamaged(recordsAt(4_000))],
    ])
    reloaded(fake)
    await flush()

    expect(fake.changes).toEqual([])
    expect(fake.reports).toEqual([])
  })

  it('reads the summaries again at the change: none damaged then, it writes and tells nothing', async () => {
    const fake = fakeKept(
      [
        ['readable', READABLE],
        ['damaged', DAMAGED],
      ],
      [['readable', READABLE]],
    )
    const rig = reloaded(fake)
    await flush()

    expect(fake.changes).toEqual(['caller'])
    expect(fake.applied).toEqual([])
    expect(fake.reports).toEqual([])
    expect(rowKeys(rig)).toEqual(['readable'])
  })

  // @test-link [[rule_most_recent_session_kept]]
  it('deletes the most recent session damaged since the load too, its row with it; the readable one that started last becomes the most recent', async () => {
    const fake = fakeKept(
      [
        ['readable', READABLE],
        ['pinned', PINNED],
        ['damaged', DAMAGED],
      ],
      [
        ['readable', damagedSummary(READABLE)],
        ['pinned', PINNED],
        ['damaged', DAMAGED],
      ],
    )
    const rig = reloaded(fake)
    expect(rig.controller.state.mostRecent).toEqual({ kind: 'kept', key: 'readable' })
    await flush()

    expect(deviceKeys(fake)).toEqual(['pinned'])
    expect(fake.reports).toEqual([{ status: 'deleted', count: 2 }])
    expect(rowKeys(rig)).toEqual(['pinned'])
    expect(rig.controller.state.mostRecent).toEqual({ kind: 'kept', key: 'pinned' })
  })

  // @test-link [[rule_most_recent_session_kept]]
  it('leaves no most recent session when the re-read finds no readable one', async () => {
    const fake = fakeKept(
      [
        ['readable', READABLE],
        ['damaged', DAMAGED],
      ],
      [
        ['readable', damagedSummary(READABLE)],
        ['damaged', DAMAGED],
      ],
    )
    const rig = reloaded(fake)
    await flush()

    expect(fake.reports).toEqual([{ status: 'deleted', count: 2 }])
    expect(rowKeys(rig)).toEqual([])
    expect(rig.controller.state.mostRecent).toBeNull()
  })

  // @test-link [[rule_most_recent_session_kept]]
  it('waits for a running session; the most recent session it held in memory stays the most recent', async () => {
    let open: () => void = () => {}
    const fake = fakeKept(
      [
        ['readable', READABLE],
        ['damaged', DAMAGED],
      ],
      [
        ['readable', damagedSummary(READABLE)],
        ['damaged', DAMAGED],
      ],
    )
    fake.gate = new Promise((resolve) => {
      open = resolve
    })
    const rig = controllerRig(undefined, undefined, {
      keptSessions: fake.seam,
      sessionSaveOutcome: (changes: SessionChanges) => {
        changes([])
        return Promise.resolve({ status: 'saved' })
      },
    })
    rig.controller.start()
    await playTo(rig, 6.6)
    rig.controller.stop()
    await flush()
    const recent = rig.controller.state.mostRecent
    expect(recent?.kind).toBe('held')

    open()
    await flush()

    expect(fake.reports).toEqual([{ status: 'deleted', count: 2 }])
    expect(rig.controller.state.mostRecent).toBe(recent)
  })

  for (const kind of ['other', 'quota'] as const) {
    // @test-link [[req_kept_session_list]]
    it(`a refused batch (${kind}) changes nothing stored, is told with its kind, and the sessions it named stay unlisted`, async () => {
      const fake = fakeKept(
        [
          ['readable', READABLE],
          ['pinned', PINNED],
          ['damaged', DAMAGED],
        ],
        [
          ['readable', READABLE],
          ['pinned', damagedSummary(PINNED)],
          ['damaged', DAMAGED],
        ],
      )
      fake.refuseBatch = kind
      const rig = reloaded(fake)
      await flush()

      expect(deviceKeys(fake)).toEqual(['readable', 'pinned', 'damaged'])
      expect(fake.reports).toEqual([{ status: 'refused', kind, count: 2 }])
      expect(rowKeys(rig)).toEqual(['readable'])
    })
  }

  it("a refused read is told with the count of the load's damaged sessions", async () => {
    const fake = fakeKept([
      ['readable', READABLE],
      ['damaged', DAMAGED],
    ])
    fake.refuseRead = 'other'
    const rig = reloaded(fake)
    await flush()

    expect(fake.reports).toEqual([{ status: 'refused', kind: 'other', count: 1 }])
    expect(rowKeys(rig)).toEqual(['readable'])
    expect(rig.controller.state.mostRecent).toEqual({ kind: 'kept', key: 'readable' })
  })

  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('runs nothing while saving is off, and tells nothing when saving turns off at the change', async () => {
    const off = fakeKept([['damaged', DAMAGED]])
    off.savingOff = true
    reloaded(off)
    await flush()
    expect(off.changes).toEqual([])

    const turning = fakeKept([['damaged', DAMAGED]])
    let open: () => void = () => {}
    turning.gate = new Promise((resolve) => {
      open = resolve
    })
    reloaded(turning)
    turning.savingOff = true
    open()
    await flush()
    expect(turning.changes).toEqual(['caller'])
    expect(turning.reports).toEqual([])
    expect(deviceKeys(turning)).toEqual(['damaged'])
  })
})

// @test-link [[module_kept_session_save]]
// @test-link [[module_kept_session_reach]]
describe('session controller: a kept session found damaged at its opening', () => {
  /** The loaded sessions: `newest` the most recent, its body damaged; `older` readable. */
  const LOADED: readonly [string, StoredKeptSession][] = [
    ['newest', damagedBody(recordsAt(3_000))],
    ['older', recordsAt(2_000)],
    ['pinned', PINNED],
  ]

  // @test-link [[req_kept_session_review]]
  // @test-link [[rule_most_recent_session_kept]]
  it('Review last session deletes it, shows the list without its row, and the readable one that started last becomes the most recent', async () => {
    const fake = fakeKept(LOADED)
    const rig = reloaded(fake)

    const showing = rig.controller.showReview()
    expect(rig.controller.state.readingMostRecent).toBe(true)
    await expect(showing).resolves.toBe('damaged')

    expect(fake.changes).toEqual(['caller'])
    for (const store of STORES) expect(deviceKeys(fake, store)).not.toContain('newest')
    expect(fake.reports).toEqual([{ status: 'deleted', count: 1 }])
    expect(rig.controller.state.readingMostRecent).toBe(false)
    expect(rig.controller.state.listShowing).toBe(true)
    expect(rig.controller.state.review).toBeNull()
    expect(rowKeys(rig)).toEqual(['older', 'pinned'])
    expect(rig.controller.state.mostRecent).toEqual({ kind: 'kept', key: 'older' })

    rig.controller.closeReview()
    await expect(rig.controller.showReview()).resolves.toBe('shown')
    expect(rig.controller.state.review?.key).toBe('older')
  })

  it('leaves no most recent session when no readable one is left', async () => {
    const fake = fakeKept([['newest', damagedBody(recordsAt(3_000))]])
    const rig = reloaded(fake)

    await expect(rig.controller.showReview()).resolves.toBe('damaged')

    expect(rowKeys(rig)).toEqual([])
    expect(rig.controller.state.mostRecent).toBeNull()
    expect(rig.controller.state.listShowing).toBe(true)
  })

  // @test-link [[req_kept_session_list]]
  it('a row deletes it at once, its row leaving; the most recent session stays when it was another', async () => {
    const fake = fakeKept([
      ['newest', recordsAt(3_000)],
      ['middle', damagedBody(recordsAt(2_000))],
      ['pinned', PINNED],
    ])
    const rig = reloaded(fake)
    rig.controller.showList()

    const opening = rig.controller.openSession('middle')
    expect(rig.controller.state.openingKey).toBe('middle')
    await expect(opening).resolves.toBe('damaged')

    expect(rig.controller.state.openingKey).toBeNull()
    expect(fake.reports).toEqual([{ status: 'deleted', count: 1 }])
    expect(rowKeys(rig)).toEqual(['newest', 'pinned'])
    expect(rig.controller.state.mostRecent).toEqual({ kind: 'kept', key: 'newest' })
    expect(rig.controller.state.review).toBeNull()
    expect(rig.controller.state.listShowing).toBe(true)
  })

  it('a refused deletion changes nothing stored, is told with its kind, and lands the same way', async () => {
    const fake = fakeKept(LOADED)
    fake.refuseBatch = 'other'
    const rig = reloaded(fake)

    await expect(rig.controller.showReview()).resolves.toBe('damaged')

    expect(deviceKeys(fake)).toContain('newest')
    expect(fake.reports).toEqual([{ status: 'refused', kind: 'other', count: 1 }])
    expect(rowKeys(rig)).toEqual(['older', 'pinned'])
    expect(rig.controller.state.mostRecent).toEqual({ kind: 'kept', key: 'older' })
    expect(rig.controller.state.listShowing).toBe(true)
  })

  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('while saving is off, nothing is deleted: the failed-to-open path', async () => {
    const fake = fakeKept(LOADED)
    fake.savingOff = true
    const rig = reloaded(fake)

    await expect(rig.controller.showReview()).resolves.toBe('failed')

    expect(fake.changes).toEqual([])
    expect(fake.reports).toEqual([])
    expect(rig.controller.state.keptRows[0]).toEqual(
      expect.objectContaining({ key: 'newest', failedToOpen: true }),
    )
  })

  it('a deletion that resolves saving off takes the failed-to-open path', async () => {
    const fake = fakeKept(LOADED)
    const rig = reloaded(fake)
    rig.controller.showList()
    let open: () => void = () => {}
    fake.gate = new Promise((resolve) => {
      open = resolve
    })

    const opening = rig.controller.openSession('newest')
    await flush()
    fake.savingOff = true
    open()

    await expect(opening).resolves.toBe('failed')
    expect(fake.reports).toEqual([])
    expect(rowKeys(rig)).toEqual(['newest', 'older', 'pinned'])
  })

  // @test-link [[rule_failed_read_offers_only_delete_everything]]
  it('never deletes a session the device refused to read, one whose records are all absent, or a newer version wrote', async () => {
    const refused = fakeKept(LOADED)
    refused.refuseOpeningRead = true
    const rigRefused = reloaded(refused)
    await expect(rigRefused.controller.showReview()).resolves.toBe('failed')
    expect(refused.changes).toEqual([])

    const absent = fakeKept(LOADED, LOADED.slice(1))
    const rigAbsent = reloaded(absent)
    await expect(rigAbsent.controller.showReview()).resolves.toBe('failed')
    expect(absent.changes).toEqual([])

    const newer = fakeKept([
      ['newest', recordsAt(3_000)],
      ['older', recordsAt(2_000)],
    ])
    newer.device.get('sessionSummaries')?.set('newest', newerDamaged(recordsAt(3_000)).summary)
    const rigNewer = reloaded(newer)
    await expect(rigNewer.controller.showReview()).resolves.toBe('failed')
    expect(newer.changes).toEqual([])
    expect(newer.reports).toEqual([])
  })
})

// @test-link [[module_kept_session_save]]
describe("session controller: the damaged sessions a session's own save deletes", () => {
  /** Intent: a rig whose session's save is built from `kept` and resolves `outcome`. */
  async function afterSave(fake: FakeKept, outcome: 'saved' | 'refused'): Promise<ControllerRig> {
    const rig = controllerRig(undefined, undefined, {
      keptSessions: fake.seam,
      sessionSaveOutcome: (changes: SessionChanges) => {
        changes([
          { key: 'readable', value: READABLE.summary as never },
          { key: 'late-damaged', value: DAMAGED.summary as never },
          { key: 'also-damaged', value: 'not a record' as never },
        ])
        return Promise.resolve(
          outcome === 'saved' ? { status: 'saved' } : { status: 'refused', kind: 'other' },
        )
      },
    })
    rig.controller.start()
    await playTo(rig, 6.6)
    rig.controller.stop()
    await flush()
    return rig
  }

  // @test-link [[req_kept_sessions]]
  it('are told with their count once the save commits', async () => {
    const fake = fakeKept([['readable', READABLE]])
    await afterSave(fake, 'saved')

    expect(fake.reports).toEqual([{ status: 'deleted', count: 2 }])
  })

  it('tell nothing when the save is refused, its keep line telling it', async () => {
    const fake = fakeKept([['readable', READABLE]])
    const rig = await afterSave(fake, 'refused')

    expect(fake.reports).toEqual([])
    expect(rig.controller.state.review?.keeping).toBe('not-saved')
  })
})

// @test-link [[module_kept_session_reach]]
// @test-link [[req_your_data]]
describe('session controller: Delete every session and an opening still pending', () => {
  it('cancels the opening, so the deleted session never shows', async () => {
    const fake = fakeKept([
      ['newest', recordsAt(3_000)],
      ['older', recordsAt(2_000)],
    ])
    const rig = reloaded(fake)
    rig.controller.showList()

    const opening = rig.controller.openSession('older')
    await expect(rig.controller.deleteEverySession()).resolves.toBe('deleted')

    await expect(opening).resolves.toBe('superseded')
    expect(rig.controller.state.review).toBeNull()
    expect(rig.controller.state.openingKey).toBeNull()
    expect(rig.controller.state.mostRecent).toBeNull()
  })
})
