// @vitest-environment node
import { IDBDatabase } from 'fake-indexeddb'
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

describe("the port's keyed read of a whole store", () => {
  // @test-link [[module_on_device_database]]
  it('gives every entry of the store with its key and raw value, in key order', async () => {
    const { port } = await readyPort()
    await port.write('sessionSummaries', 'session-2-7', sampleRecord('second'))
    await port.write('sessionSummaries', 'session-1-9', sampleRecord('first'))
    await port.write('sessionBodies', 'session-1-9', sampleRecord('a body'))

    expect(await port.readKeyed('sessionSummaries')).toEqual([
      { key: 'session-1-9', value: sampleRecord('first') },
      { key: 'session-2-7', value: sampleRecord('second') },
    ])
    expect(await port.readKeyed('controller')).toEqual([])
  })

  // @test-link [[module_on_device_database]]
  it('leaves out an entry whose key is not a string, never throwing on it', async () => {
    const { factory, port } = await readyPort()
    await port.write('sessionSummaries', 'session-1-9', sampleRecord('kept'))
    await withRawDatabase(factory, async (database) => {
      await rawPut(database, 'sessionSummaries', 42, sampleRecord('number key'))
      await rawPut(database, 'sessionSummaries', ['a', 'b'], sampleRecord('array key'))
    })

    expect(await port.readKeyed('sessionSummaries')).toEqual([
      { key: 'session-1-9', value: sampleRecord('kept') },
    ])
  })

  // @test-link [[module_on_device_database]]
  it('reads in one read-only transaction and leaves readAll unchanged', async () => {
    const { port } = await readyPort()
    await port.write('sessionSummaries', 'session-1-9', sampleRecord('kept'))
    const transaction = vi.spyOn(IDBDatabase.prototype, 'transaction')

    await port.readKeyed('sessionSummaries')

    expect(transaction.mock.calls.map(([stores, mode]) => [stores, mode])).toEqual([
      ['sessionSummaries', 'readonly'],
    ])
    transaction.mockRestore()
    expect(await port.readAll('sessionSummaries')).toEqual([sampleRecord('kept')])
  })

  // @test-link [[module_on_device_database]]
  it('is refused as readAll is, on an unavailable port, with other', async () => {
    const { factory } = blockedOpenFactory()
    const port = await openStoragePort({ factory, appVersion: TEST_APP_VERSION })

    const refusal: unknown = await port.readKeyed('sessionSummaries').then(
      () => undefined,
      (error: unknown) => error,
    )

    expect(refusal).toBeInstanceOf(StorageError)
    expect((refusal as StorageError).kind).toBe('other')
  })

  // @test-link [[module_on_device_database]]
  it('throws for a store that is not a data store, as a caller defect', async () => {
    const { port } = await readyPort()

    await expect(port.readKeyed('meta' as 'settings')).rejects.toThrow(/not a data store/)
  })
})
