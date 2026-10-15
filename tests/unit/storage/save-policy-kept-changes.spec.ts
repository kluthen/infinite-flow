// @vitest-environment node
import { IDBDatabase } from 'fake-indexeddb'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSavePolicy, type KeptChanges, type KeptRecordsReader } from '@/storage/save-policy'
import { StorageError, type StorageChange, type StoragePort } from '@/storage/storage-port'

import {
  countCalls,
  outdatedPort,
  readyPort,
  recordFailures,
  recordStates,
  refusingPort,
  settled,
} from './save-policy-doubles'
import { freshFactory, sampleRecord } from './storage-test-doubles'

/** The key of the kept session the changes name. */
const KEY = 'session-1-5'

/** Intent: a ready port over a fresh database holding one kept session's summary and played notes. */
async function portWithKeptSession(): Promise<StoragePort> {
  const port = await readyPort(freshFactory())
  await port.write('sessionSummaries', KEY, sampleRecord('kept'))
  await port.write('playedNotes', KEY, sampleRecord([60, 62]))
  return port
}

/**
 * Intent: a change that reads the session's summary by its key and every played-notes key, then,
 * when the summary is stored, rewrites it and deletes its played notes; what it read is recorded.
 */
function recordingChange(): { change: KeptChanges; seen: unknown[] } {
  const seen: unknown[] = []
  return {
    seen,
    change: async (reader: KeptRecordsReader) => {
      const summary = await reader.read('sessionSummaries', KEY)
      const keys = await reader.readKeys('playedNotes')
      seen.push({ summary, keys })
      if (summary === undefined) return []
      return [
        { kind: 'write', store: 'sessionSummaries', key: KEY, record: sampleRecord('rewritten') },
        { kind: 'delete', store: 'playedNotes', key: KEY },
      ] satisfies StorageChange[]
    },
  }
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

// @test-link [[module_kept_session_changes]]
// @test-link [[module_save_policy]]
describe('a change to a kept session after its save', () => {
  // @test-link [[rule_kept_played_notes_deletable]]
  it('reads what it rewrites at the change, then applies its batch in one transaction', async () => {
    const port = await portWithKeptSession()
    const policy = createSavePolicy(port)
    const failures = recordFailures(policy)
    const { change, seen } = recordingChange()
    const transactions = recordTransactions()

    const outcome = await policy.changeKept(change, 'notice')

    expect(outcome).toEqual({ status: 'saved' })
    expect(seen).toEqual([{ summary: sampleRecord('kept'), keys: [KEY] }])
    expect(transactions()).toEqual([
      'readonly sessionSummaries',
      'readonly playedNotes',
      'readwrite meta,sessionSummaries,playedNotes',
    ])
    expect(await port.read('sessionSummaries', KEY)).toEqual(sampleRecord('rewritten'))
    expect(await port.readKeys('playedNotes')).toEqual([])
    expect(failures).toEqual([])
  })

  it('reads every entry of a store with its key through the same reader', async () => {
    const port = await portWithKeptSession()
    const policy = createSavePolicy(port)
    let entries: unknown = null

    const outcome = await policy.changeKept(async (reader) => {
      entries = await reader.readKeyed('sessionSummaries')
      return []
    }, 'notice')

    expect(outcome).toEqual({ status: 'unchanged' })
    expect(entries).toEqual([{ key: KEY, value: sampleRecord('kept') }])
  })

  // @test-link [[module_kept_session_changes]]
  it('writes nothing and recreates nothing when what it would change is no longer stored', async () => {
    const port = await readyPort(freshFactory())
    const policy = createSavePolicy(port)
    const calls = countCalls(port)

    const outcome = await policy.changeKept(recordingChange().change, 'notice')

    expect(outcome).toEqual({ status: 'unchanged' })
    expect(calls.readwriteTransactions()).toBe(0)
    expect(await port.readKeyed('sessionSummaries')).toEqual([])
  })

  // @test-link [[rule_no_save_during_session]]
  it('asked for while a session holds the saves, reads and writes nothing until the flush is done', async () => {
    const port = await portWithKeptSession()
    const policy = createSavePolicy(port)
    policy.hold()
    void policy.write('settings', 'theme', sampleRecord('Dark'))
    const calls = countCalls(port)

    const changed = policy.changeKept(recordingChange().change, 'notice')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(calls.portCalls()).toBe(0)
    const transactions = recordTransactions()

    expect(await policy.release()).toBe('saved')
    expect(await changed).toEqual({ status: 'saved' })
    expect(transactions()).toEqual([
      'readwrite meta,settings',
      'readonly sessionSummaries',
      'readonly playedNotes',
      'readwrite meta,sessionSummaries,playedNotes',
    ])
  })

  // @test-link [[module_kept_session_save]]
  it("asked for while the session's own save runs, waits for it and reads what it saved", async () => {
    const port = await readyPort(freshFactory())
    const policy = createSavePolicy(port)
    const { change, seen } = recordingChange()

    const saved = policy.saveSession(() => [
      { kind: 'write', store: 'sessionSummaries', key: KEY, record: sampleRecord('kept') },
      { kind: 'write', store: 'playedNotes', key: KEY, record: sampleRecord([60]) },
    ])
    const changed = policy.changeKept(change, 'notice')

    expect(await saved).toEqual({ status: 'saved' })
    expect(await changed).toEqual({ status: 'saved' })
    expect(seen).toEqual([{ summary: sampleRecord('kept'), keys: [KEY] }])
    expect(await port.readKeys('playedNotes')).toEqual([])
  })

  // @test-link [[rule_no_save_during_session]]
  it('reads again when a session starts while it reads, and applies only after that session', async () => {
    const port = await portWithKeptSession()
    const policy = createSavePolicy(port)
    const reads: number[] = []
    let holdOnce = true

    const changed = policy.changeKept(async (reader) => {
      const summary = await reader.read('sessionSummaries', KEY)
      reads.push(reads.length + 1)
      if (holdOnce) {
        holdOnce = false
        policy.hold()
      }
      return summary === undefined
        ? []
        : [{ kind: 'delete', store: 'playedNotes', key: KEY } satisfies StorageChange]
    }, 'notice')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(await port.readKeys('playedNotes')).toEqual([KEY])

    await policy.release()
    expect(await changed).toEqual({ status: 'saved' })
    expect(reads).toEqual([1, 2])
    expect(await port.readKeys('playedNotes')).toEqual([])
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('refused, leaves every record as it was and tells the failure listener when asked to', async () => {
    const real = await portWithKeptSession()
    const { port, refuse } = refusingPort(real)
    const policy = createSavePolicy(port)
    const failures = recordFailures(policy)
    refuse('other')

    expect(await policy.changeKept(recordingChange().change, 'notice')).toEqual({
      status: 'refused',
      kind: 'other',
    })
    expect(failures).toEqual(['other'])
    expect(await real.read('sessionSummaries', KEY)).toEqual(sampleRecord('kept'))
    expect(await real.readKeys('playedNotes')).toEqual([KEY])
  })

  it("refused with the refusal the caller's, leaves the failure listener untold", async () => {
    const { port, refuse } = refusingPort(await portWithKeptSession())
    const policy = createSavePolicy(port)
    const failures = recordFailures(policy)
    refuse('quota')

    expect(await policy.changeKept(recordingChange().change, 'caller')).toEqual({
      status: 'refused',
      kind: 'quota',
    })
    expect(failures).toEqual([])
  })

  // @test-link [[module_kept_session_changes]]
  it('with its read refused, applies nothing and is told as a refused change', async () => {
    const real = await portWithKeptSession()
    const port: StoragePort = {
      ...real,
      read: () => Promise.reject(new StorageError('other', 'read refused')),
    }
    const policy = createSavePolicy(port)
    const failures = recordFailures(policy)
    const calls = countCalls(port)

    expect(await policy.changeKept(recordingChange().change, 'notice')).toEqual({
      status: 'refused',
      kind: 'other',
    })
    expect(failures).toEqual(['other'])
    expect(calls.readwriteTransactions()).toBe(0)
  })

  it('with a read failing for anything but a refusal, rejects: a defect surfaces', async () => {
    const real = await portWithKeptSession()
    const port: StoragePort = { ...real, read: () => Promise.reject(new Error('a defect')) }

    const outcome = await settled(
      createSavePolicy(port).changeKept(recordingChange().change, 'notice'),
    )

    expect(outcome.error).toEqual(new Error('a defect'))
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('while saving is off, reads, writes and deletes nothing', async () => {
    const port = await outdatedPort(freshFactory())
    const policy = createSavePolicy(port)
    const calls = countCalls(port)
    let built = false

    const outcome = await policy.changeKept(async () => {
      built = true
      return []
    }, 'notice')

    expect(outcome).toEqual({ status: 'saving-off' })
    expect(built).toBe(false)
    expect(calls.portCalls()).toBe(0)
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('refused as outdated, turns saving off for the visit and tells no failure', async () => {
    const { port, refuse } = refusingPort(await portWithKeptSession())
    const policy = createSavePolicy(port)
    const failures = recordFailures(policy)
    const states = recordStates(policy)
    refuse('outdated')

    expect(await policy.changeKept(recordingChange().change, 'notice')).toEqual({
      status: 'saving-off',
    })
    expect(states).toEqual(['off-outdated'])
    expect(failures).toEqual([])
  })
})

// @test-link [[module_kept_session_changes]]
// @test-link [[module_save_policy]]
describe('a read of the kept sessions at a change', () => {
  // @test-link [[rule_kept_played_notes_deletable]]
  it('reads what is stored now, queued with the session saves, and resolves it', async () => {
    const port = await readyPort(freshFactory())
    const policy = createSavePolicy(port)

    const saved = policy.saveSession(() => [
      { kind: 'write', store: 'playedNotes', key: KEY, record: sampleRecord([60]) },
    ])
    const read = policy.readKept((reader) => reader.readKeys('playedNotes'), 'notice')

    expect(await saved).toEqual({ status: 'saved' })
    expect(await read).toEqual({ status: 'read', value: [KEY] })
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('while saving is off, reads nothing', async () => {
    const port = await outdatedPort(freshFactory())
    const policy = createSavePolicy(port)
    const calls = countCalls(port)

    expect(await policy.readKept((reader) => reader.readKeys('playedNotes'), 'notice')).toEqual({
      status: 'saving-off',
    })
    expect(calls.portCalls()).toBe(0)
  })

  // @test-link [[module_kept_session_changes]]
  it('refused, resolves the refusal and tells it as a refused change', async () => {
    const real = await portWithKeptSession()
    const port: StoragePort = {
      ...real,
      readKeys: () => Promise.reject(new StorageError('other', 'read refused')),
    }
    const policy = createSavePolicy(port)
    const failures = recordFailures(policy)

    expect(await policy.readKept((reader) => reader.readKeys('playedNotes'), 'notice')).toEqual({
      status: 'refused',
      kind: 'other',
    })
    expect(failures).toEqual(['other'])
  })
})
