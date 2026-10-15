// @vitest-environment node
/**
 * The session's own save, when the page goes away (spec D309): the policy checks the signal the
 * session's save hands it before each of its transactions, the keyed read and the batch, and once
 * it is set it stops there, resolving `abandoned`: nothing more is read or written, the kept
 * sessions stay as they were, and the failure listener hears nothing.
 */
import { IDBDatabase } from 'fake-indexeddb'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSavePolicy, type SessionChanges } from '@/storage/save-policy'
import type { StorageChange, StoragePort } from '@/storage/storage-port'

import { readyPort, recordFailures } from './save-policy-doubles'
import { freshFactory, sampleRecord } from './storage-test-doubles'

/** The new session's two records, under its key. */
const NEW_SESSION: readonly StorageChange[] = [
  { kind: 'write', store: 'sessionSummaries', key: 'session-9-1', record: sampleRecord('summary') },
  { kind: 'write', store: 'sessionBodies', key: 'session-9-1', record: sampleRecord('body') },
]

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
// @test-link [[rule_most_recent_session_kept]]
describe("the session's own save when the page goes away", () => {
  it('runs no transaction and resolves abandoned when the page is already going away', async () => {
    const port = await portWithKeptSession()
    const policy = createSavePolicy(port)
    const failures = recordFailures(policy)
    const changes = vi.fn<SessionChanges>(() => NEW_SESSION)
    const transactions = recordTransactions()

    const outcome = await policy.saveSession(changes, () => true)

    expect(outcome).toEqual({ status: 'abandoned' })
    expect(transactions()).toEqual([])
    expect(changes).not.toHaveBeenCalled()
    expect(failures).toEqual([])
    expect((await port.readKeyed('sessionSummaries')).map(({ key }) => key)).toEqual([
      'session-1-5',
    ])
  })

  it('stops between the keyed read and the batch when the page goes away during the read', async () => {
    const port = await portWithKeptSession()
    const policy = createSavePolicy(port)
    const failures = recordFailures(policy)
    const changes = vi.fn<SessionChanges>(() => NEW_SESSION)
    let goingAway = false
    const read = port.readKeyed.bind(port)
    vi.spyOn(port, 'readKeyed').mockImplementation(async (store) => {
      const entries = await read(store)
      goingAway = true
      return entries
    })
    const transactions = recordTransactions()

    const outcome = await policy.saveSession(changes, () => goingAway)

    expect(outcome).toEqual({ status: 'abandoned' })
    expect(transactions()).toEqual(['readonly sessionSummaries'])
    expect(changes).not.toHaveBeenCalled()
    expect(failures).toEqual([])
    vi.restoreAllMocks()
    expect((await port.readKeyed('sessionSummaries')).map(({ key }) => key)).toEqual([
      'session-1-5',
    ])
    expect(await port.readKeyed('sessionBodies')).toEqual([])
  })

  it('stops before its read when the page goes away while the held settings flush', async () => {
    const port = await portWithKeptSession()
    const policy = createSavePolicy(port)
    let goingAway = false
    const transactions = recordTransactions()
    policy.hold()
    await policy.write('settings', 'theme', sampleRecord('theme'))
    const released = policy.release()
    const saved = policy.saveSession(
      () => NEW_SESSION,
      () => goingAway,
    )
    goingAway = true

    expect(await released).toBe('saved')
    expect(await saved).toEqual({ status: 'abandoned' })
    // The settings flush is unchanged; the session's save touches no kept-session store.
    expect(transactions().filter((transaction) => transaction.includes('session'))).toEqual([])
    expect(transactions()).toHaveLength(1)
  })

  it('saves as before while the page stays', async () => {
    const port = await portWithKeptSession()
    const policy = createSavePolicy(port)

    const outcome = await policy.saveSession(
      () => NEW_SESSION,
      () => false,
    )

    expect(outcome).toEqual({ status: 'saved' })
    expect((await port.readKeyed('sessionBodies')).map(({ key }) => key)).toEqual(['session-9-1'])
  })
})
