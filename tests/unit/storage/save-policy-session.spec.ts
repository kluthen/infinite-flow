// @vitest-environment node
import { IDBDatabase } from 'fake-indexeddb'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSavePolicy, type SessionChanges } from '@/storage/save-policy'
import {
  StorageError,
  type StorageChange,
  type StoragePort,
  type StoredEntry,
} from '@/storage/storage-port'

import {
  countCalls,
  outdatedPort,
  readyPort,
  recordFailures,
  recordStates,
  refusingPort,
  settled,
  unavailablePort,
} from './save-policy-doubles'
import { PAGE_STAYS } from './recording-save-policy'
import { freshFactory, sampleRecord } from './storage-test-doubles'

/** The new session's two records, under its key. */
const NEW_SESSION: readonly StorageChange[] = [
  { kind: 'write', store: 'sessionSummaries', key: 'session-9-1', record: sampleRecord('summary') },
  { kind: 'write', store: 'sessionBodies', key: 'session-9-1', record: sampleRecord('body') },
]

/** Intent: changes that write the new session and record the kept summaries the save read. */
function recordingChanges(): { changes: SessionChanges; seen: (readonly StoredEntry[])[] } {
  const seen: (readonly StoredEntry[])[] = []
  return {
    seen,
    changes: (kept) => {
      seen.push(kept)
      return NEW_SESSION
    },
  }
}

/** Intent: a ready port over a fresh database already holding one kept summary, `session-1-5`. */
async function portWithKeptSession(): Promise<StoragePort> {
  const port = await readyPort(freshFactory())
  await port.write('sessionSummaries', 'session-1-5', sampleRecord('kept'))
  return port
}

/** Intent: the stores and mode of every transaction opened on the database from now on. */
function recordTransactions(): () => string[] {
  const spy = vi.spyOn(IDBDatabase.prototype, 'transaction')
  return () =>
    spy.mock.calls.map(([stores, mode]) => `${mode ?? 'readonly'} ${[stores].flat().join(',')}`)
}

afterEach(() => {
  vi.restoreAllMocks()
})

// @test-link [[module_kept_session_save]]
// @test-link [[module_save_policy]]
describe("the session's own save", () => {
  // @test-link [[rule_most_recent_session_kept]]
  it('reads the kept summaries with their keys at the save, then applies its changes in one transaction', async () => {
    const port = await portWithKeptSession()
    const policy = createSavePolicy(port)
    const failures = recordFailures(policy)
    const { changes, seen } = recordingChanges()
    const transactions = recordTransactions()

    const outcome = await policy.saveSession(changes, PAGE_STAYS)

    expect(outcome).toEqual({ status: 'saved' })
    expect(seen).toEqual([[{ key: 'session-1-5', value: sampleRecord('kept') }]])
    expect(transactions()).toEqual([
      'readonly sessionSummaries',
      'readwrite meta,sessionSummaries,sessionBodies',
    ])
    expect(await port.readKeyed('sessionBodies')).toEqual([
      { key: 'session-9-1', value: sampleRecord('body') },
    ])
    expect(failures).toEqual([])
  })

  // @test-link [[rule_no_save_during_session]]
  it('runs after the flush of the settings held during the session, in a transaction of its own', async () => {
    const port = await readyPort(freshFactory())
    const policy = createSavePolicy(port)
    policy.hold()
    void policy.write('settings', 'theme', sampleRecord('Dark'))
    const transactions = recordTransactions()

    const released = policy.release()
    const saved = policy.saveSession(recordingChanges().changes, PAGE_STAYS)

    expect(await released).toBe('saved')
    expect(await saved).toEqual({ status: 'saved' })
    expect(transactions()).toEqual([
      'readwrite meta,settings',
      'readonly sessionSummaries',
      'readwrite meta,sessionSummaries,sessionBodies',
    ])
  })

  // @test-link [[rule_no_save_during_session]]
  it('asked for while the saves are held, waits for the release before touching the database', async () => {
    const port = await readyPort(freshFactory())
    const policy = createSavePolicy(port)
    policy.hold()
    const calls = countCalls(port)

    const saved = policy.saveSession(recordingChanges().changes, PAGE_STAYS)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(calls.portCalls()).toBe(0)

    await policy.release()
    expect(await saved).toEqual({ status: 'saved' })
    expect(calls.portCalls()).toBe(2)
  })

  // @test-link [[rule_most_recent_session_kept]]
  it('runs one session save after the other, so the second reads what the first wrote', async () => {
    const policy = createSavePolicy(await readyPort(freshFactory()))
    const first = recordingChanges()
    const second = recordingChanges()

    const outcomes = await Promise.all([
      policy.saveSession(first.changes, PAGE_STAYS),
      policy.saveSession(second.changes, PAGE_STAYS),
    ])

    expect(outcomes).toEqual([{ status: 'saved' }, { status: 'saved' }])
    expect(first.seen).toEqual([[]])
    expect(second.seen).toEqual([[{ key: 'session-9-1', value: sampleRecord('summary') }]])
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('with its keyed read refused, still saves the new session, given no kept summary to delete', async () => {
    const real = await portWithKeptSession()
    /** Intent: a keyed read the port refuses. */
    const refused = () => Promise.reject(new StorageError('other', 'the read failed'))
    const policy = createSavePolicy({ ...real, readKeyed: refused })
    const { changes, seen } = recordingChanges()

    expect(await policy.saveSession(changes, PAGE_STAYS)).toEqual({ status: 'saved' })
    expect(seen).toEqual([[]])
    expect((await real.readKeyed('sessionSummaries')).map((entry) => entry.key)).toEqual([
      'session-1-5',
      'session-9-1',
    ])
  })
})

// @test-link [[module_kept_session_save]]
// @test-link [[rule_failed_save_never_disturbs_session]]
// @test-link [[module_save_policy]]
describe("a refusal of the session's own save", () => {
  it('for another reason resolves as refused with its kind, and is not told to the failure listener', async () => {
    const refusing = refusingPort(await readyPort(freshFactory()))
    const policy = createSavePolicy(refusing.port)
    const failures = recordFailures(policy)
    refusing.refuse('other')

    expect(await policy.saveSession(recordingChanges().changes, PAGE_STAYS)).toEqual({
      status: 'refused',
      kind: 'other',
    })
    expect(failures).toEqual([])

    // The run of refusals is untouched: a setting refused next is the run's first, and is told.
    expect(await policy.write('settings', 'theme', sampleRecord('Dark'))).toBe('failed')
    expect(failures).toEqual(['other'])
  })

  it('for lack of space resolves as refused with quota, and is told to the failure listener', async () => {
    const refusing = refusingPort(await readyPort(freshFactory()))
    const policy = createSavePolicy(refusing.port)
    const told: [string, boolean][] = []
    policy.onFailure((kind, startsRun) => told.push([kind, startsRun]))
    refusing.refuse('quota')

    expect(await policy.saveSession(recordingChanges().changes, PAGE_STAYS)).toEqual({
      status: 'refused',
      kind: 'quota',
    })
    expect(told).toEqual([['quota', true]])
  })

  it('as outdated resolves as not saved because saving is off, saving now off-outdated', async () => {
    const refusing = refusingPort(await readyPort(freshFactory()))
    const policy = createSavePolicy(refusing.port)
    const states = recordStates(policy)
    const failures = recordFailures(policy)
    refusing.refuse('outdated')

    expect(await policy.saveSession(recordingChanges().changes, PAGE_STAYS)).toEqual({
      status: 'saving-off',
    })
    expect(states).toEqual(['off-outdated'])
    expect(failures).toEqual([])
  })

  it('ends a run of refusals when it succeeds, as any successful save does', async () => {
    const refusing = refusingPort(await readyPort(freshFactory()))
    const policy = createSavePolicy(refusing.port)
    const failures = recordFailures(policy)
    refusing.refuse('quota')
    await policy.write('settings', 'theme', sampleRecord('Dark'))
    refusing.refuse(null)

    expect(await policy.saveSession(recordingChanges().changes, PAGE_STAYS)).toEqual({
      status: 'saved',
    })
    refusing.refuse('quota')
    await policy.write('settings', 'theme', sampleRecord('Light'))

    expect(failures).toEqual(['quota', 'quota'])
  })
})

// @test-link [[module_kept_session_save]]
// @test-link [[rule_outdated_tab_stops_saving]]
// @test-link [[rule_first_phrase_waits_for_saved_settings]]
// @test-link [[module_save_policy]]
describe("the session's own save while saving is off", () => {
  it.each([
    ['off-outdated', () => outdatedPort(freshFactory())],
    ['off-unreadable', async () => (await unavailablePort()).port],
  ])('%s: reads, saves and deletes nothing', async (_state, open) => {
    const port = await open()
    const policy = createSavePolicy(port)
    const calls = countCalls(port)
    const { changes, seen } = recordingChanges()

    expect(await policy.saveSession(changes, PAGE_STAYS)).toEqual({ status: 'saving-off' })
    expect(seen).toEqual([])
    expect(calls.portCalls()).toBe(0)
  })

  it('turned off-unreadable after the load: reads, saves and deletes nothing', async () => {
    const port = await portWithKeptSession()
    const policy = createSavePolicy(port)
    policy.stopSavingUnreadable()
    const calls = countCalls(port)

    expect(await policy.saveSession(recordingChanges().changes, PAGE_STAYS)).toEqual({
      status: 'saving-off',
    })
    expect(calls.portCalls()).toBe(0)
  })
})

// @test-link [[module_save_policy]]
describe("the session's own save, misused", () => {
  it('throws for changes that hold no change, as a caller defect', async () => {
    const policy = createSavePolicy(await readyPort(freshFactory()))

    const outcome = await settled(policy.saveSession(() => [], PAGE_STAYS))

    expect(outcome.error).toEqual(new Error('save policy: a session save must hold a change'))
  })
})
