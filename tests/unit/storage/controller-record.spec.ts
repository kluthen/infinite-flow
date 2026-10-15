/**
 * The remembered controller's record: one record in the controller store, in the record envelope,
 * holding the input port's id (the identity matched at load) and its name and manufacturer (for
 * display only); read back tolerantly, a record no codec reads giving no remembered controller.
 */
import { describe, expect, it } from 'vitest'

import {
  CONTROLLER_DATA_VERSION,
  CONTROLLER_RECORD_KEY,
  decodeRememberedController,
  encodeControllerRecord,
} from '@/storage/records/controller-record'

const APP_VERSION = '3.0.0-test'
const SAX = { id: 'port-sax', name: 'Travel Sax', manufacturer: 'Odisei' }

describe('the remembered controller record', () => {
  // @test-link [[entity_remembered_controller_record]]
  it('holds the port id, name and manufacturer in the record envelope, under one key', () => {
    expect(encodeControllerRecord(SAX, APP_VERSION)).toEqual({
      dataVersion: CONTROLLER_DATA_VERSION,
      appVersion: APP_VERSION,
      id: 'port-sax',
      name: 'Travel Sax',
      manufacturer: 'Odisei',
    })
    expect(CONTROLLER_DATA_VERSION).toBe(1)
    expect(CONTROLLER_RECORD_KEY).toBe('remembered')
  })

  // @test-link [[entity_remembered_controller_record]]
  it('refuses to encode with an empty app version or an empty port id', () => {
    expect(() => encodeControllerRecord(SAX, '')).toThrow(/app version/)
    expect(() => encodeControllerRecord({ ...SAX, id: '' }, APP_VERSION)).toThrow(/port id/)
  })

  // @test-link [[entity_remembered_controller_record]]
  it('reads back the device it encoded', () => {
    expect(decodeRememberedController([encodeControllerRecord(SAX, APP_VERSION)])).toEqual(SAX)
  })

  // @test-link [[entity_remembered_controller_record]]
  it('gives no remembered controller when the store holds none', () => {
    expect(decodeRememberedController([])).toBeNull()
  })

  // @test-link [[entity_remembered_controller_record]]
  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('gives none, never throwing, for a record it cannot read or one a newer app wrote', () => {
    const current = encodeControllerRecord(SAX, APP_VERSION)
    const unreadable: readonly unknown[] = [
      null,
      'port-sax',
      { ...current, dataVersion: 0 },
      { ...current, id: '' },
      { ...current, id: 7 },
      { ...current, name: null },
      { dataVersion: 1, appVersion: APP_VERSION, name: 'Travel Sax', manufacturer: 'Odisei' },
      { ...current, dataVersion: 2 },
    ]
    for (const record of unreadable) {
      expect(() => decodeRememberedController([record])).not.toThrow()
      expect(decodeRememberedController([record]), JSON.stringify(record)).toBeNull()
    }
  })
})
