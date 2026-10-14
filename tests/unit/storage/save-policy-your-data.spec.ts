// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSavePolicy } from '@/storage/save-policy'
import { StorageError } from '@/storage/storage-port'

import {
  filledPort,
  openNewerTab,
  protectedManager,
  readyPort,
  recordFailures,
  refusingPort,
  settled,
  unavailablePort,
} from './save-policy-doubles'
import { DATABASE, databaseNames, freshFactory } from './storage-test-doubles'

afterEach(() => {
  vi.restoreAllMocks()
})

// @test-link [[module_save_policy]]
describe('space and protection for Your data', () => {
  // @test-link [[req_your_data]]
  it('reports the browser estimate and whether the data is persistent', async () => {
    const { manager, calls } = protectedManager()
    const policy = createSavePolicy(await readyPort(freshFactory(), manager))

    expect(await policy.estimate()).toEqual({ usage: 1200, quota: 50_000_000 })
    expect(await policy.persisted()).toBe(true)
    expect(calls).toEqual(['estimate', 'persisted'])
  })
})

// @test-link [[module_save_policy]]
describe('deleting everything', () => {
  // @test-link [[rule_delete_everything]]
  it('removes the whole database while saving is on', async () => {
    const factory = freshFactory()
    const policy = createSavePolicy(await filledPort(factory))

    await policy.deleteEverything()

    expect(await databaseNames(factory)).not.toContain(DATABASE)
  })

  // @test-link [[rule_delete_everything]]
  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  it('is still offered when the saved data could not be read', async () => {
    const { port, real } = await unavailablePort()
    const policy = createSavePolicy(port)

    await policy.deleteEverything()

    expect(policy.state()).toBe('off-unreadable')
    expect(await databaseNames(real)).not.toContain(DATABASE)
  })

  // @test-link [[rule_delete_everything]]
  // @test-link [[rule_outdated_tab_stops_saving]]
  it('is refused as outdated in an outdated tab, without reaching the port', async () => {
    const factory = freshFactory()
    const port = await filledPort(factory)
    const policy = createSavePolicy(port)
    await openNewerTab(factory)
    const deleteEverything = vi.spyOn(port, 'deleteEverything')

    const { error } = await settled(policy.deleteEverything())

    expect(error).toBeInstanceOf(StorageError)
    expect((error as StorageError).kind).toBe('outdated')
    expect(deleteEverything).not.toHaveBeenCalled()
    expect(await databaseNames(factory)).toContain(DATABASE)
  })

  // @test-link [[rule_delete_everything]]
  // @test-link [[rule_no_save_during_session]]
  it('is a defect during a session, reaching nothing', async () => {
    const factory = freshFactory()
    const port = await filledPort(factory)
    const policy = createSavePolicy(port)
    const deleteEverything = vi.spyOn(port, 'deleteEverything')
    policy.hold()

    const { error } = await settled(policy.deleteEverything())

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(StorageError)
    expect(deleteEverything).not.toHaveBeenCalled()
  })

  // @test-link [[rule_delete_everything]]
  it('hands its refusal to the caller, not to the failure listener', async () => {
    const { port, refuse } = refusingPort(await filledPort(freshFactory()))
    const policy = createSavePolicy(port)
    const failures = recordFailures(policy)
    refuse('other')

    const { error } = await settled(policy.deleteEverything())

    expect(error).toBeInstanceOf(StorageError)
    expect((error as StorageError).kind).toBe('other')
    expect(failures).toEqual([])
  })
})
