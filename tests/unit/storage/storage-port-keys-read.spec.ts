// @vitest-environment node
import { IDBObjectStore } from 'fake-indexeddb'
import { describe, expect, it, vi } from 'vitest'

import { openStoragePort, StorageError } from '@/storage/storage-port'

import {
  blockedOpenFactory,
  freshFactory,
  rawPut,
  sampleRecord,
  TEST_APP_VERSION,
  withRawDatabase,
} from './storage-test-doubles'

/** Intent: a ready port over a fresh in-memory database. */
async function readyPort() {
  const factory = freshFactory()
  const port = await openStoragePort({ factory, appVersion: TEST_APP_VERSION })
  return { factory, port }
}

describe("the port's keys-only read of a store", () => {
  // @test-link [[module_on_device_database]]
  it('gives the key of every record the store holds, in key order, never reading a value', async () => {
    const { port } = await readyPort()
    await port.write('playedNotes', 'session-2-7', sampleRecord([64]))
    await port.write('playedNotes', 'session-1-9', sampleRecord([60]))
    await port.write('sessionSummaries', 'session-3-3', sampleRecord('a summary'))
    const getAll = vi.spyOn(IDBObjectStore.prototype, 'getAll')
    const get = vi.spyOn(IDBObjectStore.prototype, 'get')

    expect(await port.readKeys('playedNotes')).toEqual(['session-1-9', 'session-2-7'])
    expect(await port.readKeys('controller')).toEqual([])
    expect(getAll).not.toHaveBeenCalled()
    expect(get).not.toHaveBeenCalled()
    getAll.mockRestore()
    get.mockRestore()
  })

  // @test-link [[module_on_device_database]]
  it('leaves out a key that is not a string', async () => {
    const { factory, port } = await readyPort()
    await port.write('playedNotes', 'session-1-9', sampleRecord([60]))
    await withRawDatabase(factory, (database) =>
      rawPut(database, 'playedNotes', 42, sampleRecord('number key')),
    )

    expect(await port.readKeys('playedNotes')).toEqual(['session-1-9'])
  })

  // @test-link [[module_on_device_database]]
  it('is refused as the other reads are, on an unavailable port, with other', async () => {
    const { factory } = blockedOpenFactory()
    const port = await openStoragePort({ factory, appVersion: TEST_APP_VERSION })

    const refusal: unknown = await port.readKeys('playedNotes').then(
      () => undefined,
      (error: unknown) => error,
    )

    expect(refusal).toBeInstanceOf(StorageError)
    expect((refusal as StorageError).kind).toBe('other')
  })

  // @test-link [[module_on_device_database]]
  it('throws for a store that is not a data store, as a caller defect', async () => {
    const { port } = await readyPort()

    await expect(port.readKeys('meta' as 'settings')).rejects.toThrow(/not a data store/)
  })
})
