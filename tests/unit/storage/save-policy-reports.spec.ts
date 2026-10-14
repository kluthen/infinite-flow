// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSavePolicy, type SaveFailureKind } from '@/storage/save-policy'
import { openStoragePort, type StorageManagerLike } from '@/storage/storage-port'

import {
  diskFailure,
  filledPort,
  lackOfSpace,
  openNewerTab,
  outdatedPort,
  protectedManager,
  readyPort,
  recordFailures,
  refusingPort,
  unavailablePort,
} from './save-policy-doubles'
import {
  failingPutFactory,
  freshFactory,
  recordingManager,
  sampleRecord,
  TEST_APP_VERSION,
} from './storage-test-doubles'

/** Intent: a policy over a ready port whose changes can be refused on demand, and its reports. */
async function refusablePolicy() {
  const { port, refuse } = refusingPort(await filledPort(freshFactory()))
  const policy = createSavePolicy(port)
  return { port, refuse, policy, failures: recordFailures(policy) }
}

/** Intent: a policy over a ready port with a recording storage manager, and the manager's calls. */
async function protectablePolicy(manager: StorageManagerLike = recordingManager().manager) {
  const factory = freshFactory()
  const port = await readyPort(factory, manager)
  return { factory, port, policy: createSavePolicy(port) }
}

/** Intent: the browser's answer when it refuses to make the storage persistent. */
function refusePersistence(): Promise<boolean> {
  return Promise.resolve(false)
}

afterEach(() => {
  vi.restoreAllMocks()
})

// @test-link [[module_save_policy]]
describe('reporting a failed save', () => {
  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('reports a write refused for lack of space as quota, never rejecting', async () => {
    const factory = failingPutFactory(lackOfSpace, 'request')
    const policy = createSavePolicy(await readyPort(factory))
    const failures = recordFailures(policy)

    expect(await policy.write('settings', 'theme', sampleRecord('Light'))).toBe('failed')
    expect(failures).toEqual<SaveFailureKind[]>(['quota'])
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('reports a batch refused for another storage failure as other', async () => {
    const factory = failingPutFactory(diskFailure, 'transaction')
    const policy = createSavePolicy(await readyPort(factory))
    const failures = recordFailures(policy)

    const outcome = await policy.save([
      { kind: 'write', store: 'settings', key: 'theme', record: sampleRecord('Light') },
    ])

    expect(outcome).toBe('failed')
    expect(failures).toEqual<SaveFailureKind[]>(['other'])
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('reports a refusal of the same kind as the last one reported in its run once', async () => {
    const { refuse, policy, failures } = await refusablePolicy()

    refuse('quota')
    await policy.write('settings', 'theme', sampleRecord('Light'))
    await policy.delete('playedNotes', 's1')
    await policy.save([{ kind: 'delete', store: 'playedNotes', key: 's1' }])

    expect(failures).toEqual<SaveFailureKind[]>(['quota'])
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('reports a refusal again each time its kind differs from the last one reported', async () => {
    const { refuse, policy, failures } = await refusablePolicy()

    refuse('quota')
    await policy.write('settings', 'theme', sampleRecord('Light'))
    refuse('other')
    await policy.delete('playedNotes', 's1')
    await policy.delete('playedNotes', 's2')
    refuse('quota')
    await policy.write('settings', 'theme', sampleRecord('Sepia'))

    expect(failures).toEqual<SaveFailureKind[]>(['quota', 'other', 'quota'])
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('starts a new run at the first refusal after a success, of either kind', async () => {
    const { refuse, policy, failures } = await refusablePolicy()

    refuse('other')
    await policy.write('settings', 'theme', sampleRecord('Light'))
    refuse(null)
    expect(await policy.write('settings', 'theme', sampleRecord('Sepia'))).toBe('saved')
    refuse('other')
    expect(await policy.delete('playedNotes', 's1')).toBe('failed')

    expect(failures).toEqual<SaveFailureKind[]>(['other', 'other'])
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('tells the listener whether a report starts a run or changes its kind', async () => {
    const { port, refuse } = refusingPort(await filledPort(freshFactory()))
    const policy = createSavePolicy(port)
    const reports: [SaveFailureKind, boolean][] = []
    policy.onFailure((kind, startsRun) => reports.push([kind, startsRun]))

    refuse('quota')
    await policy.write('settings', 'theme', sampleRecord('Light'))
    refuse('other')
    await policy.write('settings', 'theme', sampleRecord('Sepia'))
    refuse(null)
    await policy.write('settings', 'theme', sampleRecord('Dark'))
    refuse('other')
    await policy.write('settings', 'theme', sampleRecord('Light'))

    expect(reports).toEqual([
      ['quota', true],
      ['other', false],
      ['other', true],
    ])
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('counts a refusal made with no listener toward the run', async () => {
    const { port, refuse } = refusingPort(await filledPort(freshFactory()))
    const policy = createSavePolicy(port)
    refuse('quota')
    await policy.write('settings', 'theme', sampleRecord('Light'))

    const failures = recordFailures(policy)
    await policy.write('settings', 'theme', sampleRecord('Sepia'))

    expect(failures).toEqual([])
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  // @test-link [[rule_no_save_during_session]]
  it('reports a flush refused at the end of a session, resolving the release as failed', async () => {
    const { refuse, policy, failures } = await refusablePolicy()
    policy.hold()
    await policy.write('settings', 'theme', sampleRecord('Light'))
    refuse('quota')

    expect(await policy.release()).toBe('failed')
    expect(failures).toEqual<SaveFailureKind[]>(['quota'])
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('takes one listener at a time', async () => {
    const { policy } = await refusablePolicy()

    expect(() => policy.onFailure(() => undefined)).toThrow(Error)
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('takes a new listener once the previous one unsubscribed', async () => {
    const { port, refuse } = refusingPort(await filledPort(freshFactory()))
    const policy = createSavePolicy(port)
    const first: SaveFailureKind[] = []
    policy.onFailure((kind) => first.push(kind))()
    const second = recordFailures(policy)
    refuse('other')

    await policy.write('settings', 'theme', sampleRecord('Light'))

    expect(first).toEqual([])
    expect(second).toEqual<SaveFailureKind[]>(['other'])
  })
})

// @test-link [[module_save_policy]]
describe('asking for persistent storage', () => {
  // @test-link [[rule_persistent_storage_requested]]
  it('asks once per visit, on the first request, after checking it is not yet persistent', async () => {
    const { manager, calls } = recordingManager()
    const { policy } = await protectablePolicy(manager)

    expect(calls).toEqual([])
    expect(await policy.requestProtection()).toBe('granted')
    expect(await policy.requestProtection()).toBe('not-asked')
    expect(calls).toEqual(['persisted', 'persist'])
  })

  // @test-link [[rule_persistent_storage_requested]]
  it('never asks when the saved data is already persistent', async () => {
    const { manager, calls } = protectedManager()
    const { policy } = await protectablePolicy(manager)

    expect(await policy.requestProtection()).toBe('already-protected')
    expect(await policy.requestProtection()).toBe('not-asked')
    expect(calls).toEqual(['persisted'])
  })

  // @test-link [[rule_persistent_storage_requested]]
  it('tells a refusal by the browser apart from a grant', async () => {
    const manager = { ...recordingManager().manager, persist: refusePersistence }
    const { policy } = await protectablePolicy(manager)

    expect(await policy.requestProtection()).toBe('refused')
  })

  // @test-link [[rule_persistent_storage_requested]]
  // @test-link [[rule_outdated_tab_stops_saving]]
  it('never asks while saving is off, in either off state', async () => {
    const { manager, calls } = recordingManager()
    const outdated = createSavePolicy(await outdatedPort(freshFactory(), manager))
    const unreadable = createSavePolicy((await unavailablePort(manager)).port)
    const { policy: stopped } = await protectablePolicy(manager)
    stopped.stopSavingUnreadable()

    for (const policy of [outdated, unreadable, stopped]) {
      expect(await policy.requestProtection()).toBe('not-asked')
    }
    expect(calls).toEqual([])
  })

  // @test-link [[rule_persistent_storage_requested]]
  // @test-link [[rule_no_save_during_session]]
  it('waits for the end of a session, asking right after its saves are flushed', async () => {
    const { manager, calls } = recordingManager()
    const { port, policy } = await protectablePolicy(manager)
    const apply = port.apply.bind(port)
    vi.spyOn(port, 'apply').mockImplementation(async (changes) => {
      calls.push('apply')
      await apply(changes)
    })

    policy.hold()
    await policy.write('settings', 'theme', sampleRecord('Light'))
    const request = policy.requestProtection()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(calls).toEqual([])

    await policy.release()
    expect(await request).toBe('granted')
    expect(calls).toEqual(['apply', 'persisted', 'persist'])
  })

  // @test-link [[rule_persistent_storage_requested]]
  it('never asks when saving turns off before the session it waited for ends', async () => {
    const { manager, calls } = recordingManager()
    const { factory, policy } = await protectablePolicy(manager)
    policy.hold()
    const request = policy.requestProtection()

    await openNewerTab(factory)
    await policy.release()

    expect(await request).toBe('not-asked')
    expect(calls).toEqual([])
  })

  // @test-link [[rule_persistent_storage_requested]]
  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('resolves as failed, unreported, when the browser offers no storage manager', async () => {
    const port = await openStoragePort({ factory: freshFactory(), appVersion: TEST_APP_VERSION })
    const policy = createSavePolicy(port)
    const failures = recordFailures(policy)

    expect(await policy.requestProtection()).toBe('failed')
    expect(await policy.requestProtection()).toBe('not-asked')
    expect(failures).toEqual([])
  })
})
