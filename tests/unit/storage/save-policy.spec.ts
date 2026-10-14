// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSavePolicy, type SavePolicy } from '@/storage/save-policy'
import { StorageError, type StorageChange, type StoreName } from '@/storage/storage-port'

import {
  countCalls,
  filledPort,
  openNewerTab,
  outdatedPort,
  raiseMeta,
  recordFailures,
  recordStates,
  settled,
  unavailablePort,
} from './save-policy-doubles'
import { freshFactory, rawGet, sampleRecord, withRawDatabase } from './storage-test-doubles'

/** Intent: a policy over a ready port holding a theme and played notes, and its factory. */
async function readyPolicy() {
  const factory = freshFactory()
  const port = await filledPort(factory)
  return { factory, port, policy: createSavePolicy(port) }
}

/** Intent: the values `keys` hold in the database, read raw, as `store/key` → value. */
async function rawValues(
  factory: IDBFactory,
  keys: readonly (readonly [StoreName, string])[],
): Promise<Record<string, unknown>> {
  return withRawDatabase(factory, async (database) => {
    const values: Record<string, unknown> = {}
    for (const [store, key] of keys) values[`${store}/${key}`] = await rawGet(database, store, key)
    return values
  })
}

/** Intent: one write, one delete and one batch through the policy, and their outcomes. */
function writeDeleteAndSave(policy: SavePolicy) {
  return Promise.all([
    policy.write('settings', 'theme', sampleRecord('Light')),
    policy.delete('playedNotes', 's1'),
    policy.save([
      { kind: 'write', store: 'sessionSummaries', key: 's2', record: sampleRecord({ notes: 3 }) },
    ]),
  ])
}

/** What `filledPort` stored, plus the session summary no test may find stored. */
const STORED = { 'settings/theme': sampleRecord('Dark'), 'playedNotes/s1': sampleRecord([60, 62]) }
const KEYS = [
  ['settings', 'theme'],
  ['playedNotes', 's1'],
  ['sessionSummaries', 's2'],
] as const

afterEach(() => {
  vi.restoreAllMocks()
})

// @test-link [[module_save_policy]]
describe('the saving state at the start of the visit', () => {
  // @test-link [[rule_outdated_tab_stops_saving]]
  it('is on over a ready port and off-outdated over an outdated one', async () => {
    const { policy } = await readyPolicy()
    const outdated = createSavePolicy(await outdatedPort(freshFactory()))

    expect(policy.state()).toBe('on')
    expect(outdated.state()).toBe('off-outdated')
  })

  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  it('is off-unreadable over a port whose database could not be opened', async () => {
    const { port } = await unavailablePort()

    expect(createSavePolicy(port).state()).toBe('off-unreadable')
  })
})

// @test-link [[module_save_policy]]
describe('changes of the saving state', () => {
  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  it('turns off-unreadable when the start-up read fails, telling the listeners once', async () => {
    const { policy } = await readyPolicy()
    const states = recordStates(policy)

    policy.stopSavingUnreadable()
    policy.stopSavingUnreadable()

    expect(policy.state()).toBe('off-unreadable')
    expect(states).toEqual(['off-unreadable'])
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('turns off-outdated when a newer tab upgrades the database during the visit', async () => {
    const { factory, policy } = await readyPolicy()
    const states = recordStates(policy)

    await openNewerTab(factory)

    expect(policy.state()).toBe('off-outdated')
    expect(states).toEqual(['off-outdated'])
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('turns from off-unreadable to off-outdated, which is final', async () => {
    const { factory, policy } = await readyPolicy()
    policy.stopSavingUnreadable()
    const states = recordStates(policy)

    await openNewerTab(factory)
    policy.stopSavingUnreadable()

    expect(policy.state()).toBe('off-outdated')
    expect(states).toEqual(['off-outdated'])
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('turns off-outdated on a write refused as outdated, skipped and not reported', async () => {
    const { factory, policy } = await readyPolicy()
    const failures = recordFailures(policy)
    const states = recordStates(policy)
    await raiseMeta(factory)

    const outcome = await policy.write('settings', 'theme', sampleRecord('Light'))

    expect(outcome).toBe('skipped')
    expect(policy.state()).toBe('off-outdated')
    expect(states).toEqual(['off-outdated'])
    expect(failures).toEqual([])
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('stops telling a listener once it unsubscribes', async () => {
    const { policy } = await readyPolicy()
    const states: string[] = []
    const unsubscribe = policy.onStateChange((state) => states.push(state))

    unsubscribe()
    policy.stopSavingUnreadable()

    expect(states).toEqual([])
  })
})

// @test-link [[module_save_policy]]
describe('saving while saving is on and no session runs', () => {
  // @test-link [[rule_settings_saved_on_change]]
  it('saves each write, delete and batch at once', async () => {
    const { factory, policy } = await readyPolicy()

    const outcomes = await writeDeleteAndSave(policy)

    expect(outcomes).toEqual(['saved', 'saved', 'saved'])
    expect(await rawValues(factory, KEYS)).toEqual({
      'settings/theme': sampleRecord('Light'),
      'playedNotes/s1': undefined,
      'sessionSummaries/s2': sampleRecord({ notes: 3 }),
    })
  })

  // @test-link [[rule_settings_saved_on_change]]
  it('applies a batch through one port call in one transaction', async () => {
    const { port, policy } = await readyPolicy()
    const calls = countCalls(port)
    const batch: StorageChange[] = [
      { kind: 'delete', store: 'playedNotes', key: 's1' },
      { kind: 'write', store: 'settings', key: 'theme', record: sampleRecord('Light') },
    ]

    expect(await policy.save(batch)).toBe('saved')

    expect(port.apply).toHaveBeenCalledExactlyOnceWith(batch)
    expect(calls.portCalls()).toBe(1)
    expect(calls.readwriteTransactions()).toBe(1)
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('lets a defect of the caller through as a plain Error', async () => {
    const { policy } = await readyPolicy()

    const { error } = await settled(
      policy.write('meta' as StoreName, 'database', sampleRecord('x')),
    )

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(StorageError)
  })
})

// @test-link [[module_save_policy]]
describe('saving while saving is off', () => {
  // @test-link [[rule_outdated_tab_stops_saving]]
  it('skips every write and delete of an outdated tab, which reach no database', async () => {
    const factory = freshFactory()
    const port = await filledPort(factory)
    const policy = createSavePolicy(port)
    await openNewerTab(factory)
    const calls = countCalls(port)

    expect(await writeDeleteAndSave(policy)).toEqual(['skipped', 'skipped', 'skipped'])

    expect(calls.portCalls()).toBe(0)
    expect(calls.transactions()).toBe(0)
  })

  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  it('skips every write and delete after a failed start-up read, keeping what is stored', async () => {
    const { factory, port, policy } = await readyPolicy()
    policy.stopSavingUnreadable()
    const calls = countCalls(port)

    expect(await writeDeleteAndSave(policy)).toEqual(['skipped', 'skipped', 'skipped'])

    expect(calls.portCalls()).toBe(0)
    expect(calls.transactions()).toBe(0)
    vi.restoreAllMocks()
    expect(await rawValues(factory, KEYS)).toEqual({ ...STORED, 'sessionSummaries/s2': undefined })
  })
})

// @test-link [[module_save_policy]]
describe('holding the saves of a session', () => {
  // @test-link [[rule_no_save_during_session]]
  it('lets no call reach the database between hold and release', async () => {
    const { port, policy } = await readyPolicy()
    const calls = countCalls(port)

    policy.hold()
    const outcomes = await writeDeleteAndSave(policy)

    expect(outcomes).toEqual(['held', 'held', 'held'])
    expect(calls.portCalls()).toBe(0)
    expect(calls.transactions()).toBe(0)
  })

  // @test-link [[rule_no_save_during_session]]
  // @test-link [[rule_settings_saved_on_change]]
  it('saves each held record once, with its latest value, in one transaction at release', async () => {
    const { factory, port, policy } = await readyPolicy()
    const calls = countCalls(port)

    policy.hold()
    await policy.write('settings', 'theme', sampleRecord('Light'))
    await policy.delete('playedNotes', 's1')
    await policy.save([
      { kind: 'write', store: 'settings', key: 'theme', record: sampleRecord('Sepia') },
      { kind: 'write', store: 'playedNotes', key: 's1', record: sampleRecord([64]) },
      { kind: 'write', store: 'sessionSummaries', key: 's2', record: sampleRecord({ notes: 3 }) },
    ])
    await policy.delete('sessionSummaries', 's2')
    await policy.write('playedNotes', 's1', sampleRecord([65]))
    const outcome = await policy.release()

    expect(outcome).toBe('saved')
    expect(port.apply).toHaveBeenCalledOnce()
    expect(vi.mocked(port.apply).mock.calls[0]?.[0]).toEqual(
      expect.arrayContaining<StorageChange>([
        { kind: 'write', store: 'settings', key: 'theme', record: sampleRecord('Sepia') },
        { kind: 'write', store: 'playedNotes', key: 's1', record: sampleRecord([65]) },
        { kind: 'delete', store: 'sessionSummaries', key: 's2' },
      ]),
    )
    expect(vi.mocked(port.apply).mock.calls[0]?.[0]).toHaveLength(3)
    expect(calls.portCalls()).toBe(1)
    expect(calls.readwriteTransactions()).toBe(1)
    vi.restoreAllMocks()
    expect(await rawValues(factory, KEYS)).toEqual({
      'settings/theme': sampleRecord('Sepia'),
      'playedNotes/s1': sampleRecord([65]),
      'sessionSummaries/s2': undefined,
    })
  })

  // @test-link [[rule_no_save_during_session]]
  it('releases with nothing held as saved, without a call to the port', async () => {
    const { port, policy } = await readyPolicy()
    const calls = countCalls(port)

    policy.hold()

    expect(await policy.release()).toBe('saved')
    expect(calls.portCalls()).toBe(0)
  })

  // @test-link [[rule_no_save_during_session]]
  it('saves at once again after the release', async () => {
    const { factory, policy } = await readyPolicy()
    policy.hold()
    await policy.release()

    expect(await policy.write('settings', 'theme', sampleRecord('Light'))).toBe('saved')

    expect(await rawValues(factory, [['settings', 'theme']])).toEqual({
      'settings/theme': sampleRecord('Light'),
    })
  })

  // @test-link [[rule_no_save_during_session]]
  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  it('drops what is held when saving turns off during the session, and never flushes it', async () => {
    const { factory, port, policy } = await readyPolicy()
    const calls = countCalls(port)

    policy.hold()
    await writeDeleteAndSave(policy)
    policy.stopSavingUnreadable()

    expect(await policy.release()).toBe('skipped')
    expect(calls.portCalls()).toBe(0)
    expect(calls.transactions()).toBe(0)
    vi.restoreAllMocks()
    expect(await rawValues(factory, KEYS)).toEqual({ ...STORED, 'sessionSummaries/s2': undefined })
  })

  // @test-link [[rule_no_save_during_session]]
  // @test-link [[rule_outdated_tab_stops_saving]]
  it('drops what is held when a newer tab upgrades the database during the session', async () => {
    const { factory, port, policy } = await readyPolicy()
    policy.hold()
    await writeDeleteAndSave(policy)
    await openNewerTab(factory)
    const calls = countCalls(port)

    expect(await policy.release()).toBe('skipped')
    expect(calls.portCalls()).toBe(0)
    expect(policy.state()).toBe('off-outdated')
  })

  // @test-link [[rule_no_save_during_session]]
  it('treats a second hold, or a release without a hold, as a defect', async () => {
    const { policy } = await readyPolicy()

    const early = await settled(policy.release())
    policy.hold()

    expect(() => policy.hold()).toThrow(Error)
    expect(early.error).toBeInstanceOf(Error)
    expect(early.error).not.toBeInstanceOf(StorageError)
    await policy.release()
    const late = await settled(policy.release())
    expect(late.error).toBeInstanceOf(Error)
    expect(late.error).not.toBeInstanceOf(StorageError)
  })
})
