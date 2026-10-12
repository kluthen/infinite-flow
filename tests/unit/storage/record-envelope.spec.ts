import { describe, expect, it } from 'vitest'

import { assertWritableVersions, readEnvelope } from '@/storage/record-envelope'

/** Stored values that carry no valid versions, each with what is wrong with it. */
const WITHOUT_VALID_VERSIONS: readonly (readonly [string, unknown])[] = [
  ['null', null],
  ['undefined', undefined],
  ['a string', 'settings'],
  ['a number', 1],
  ['an array', [1, '3.0.0']],
  ['an object without versions', { value: 'Dark' }],
  ['no dataVersion', { appVersion: '3.0.0', value: 'Dark' }],
  ['no appVersion', { dataVersion: 1, value: 'Dark' }],
  ['a string dataVersion', { dataVersion: '1', appVersion: '3.0.0' }],
  ['a fractional dataVersion', { dataVersion: 1.5, appVersion: '3.0.0' }],
  ['a NaN dataVersion', { dataVersion: Number.NaN, appVersion: '3.0.0' }],
  ['an infinite dataVersion', { dataVersion: Number.POSITIVE_INFINITY, appVersion: '3.0.0' }],
  ['a zero dataVersion', { dataVersion: 0, appVersion: '3.0.0' }],
  ['a negative dataVersion', { dataVersion: -1, appVersion: '3.0.0' }],
  ['an empty appVersion', { dataVersion: 1, appVersion: '' }],
  ['a numeric appVersion', { dataVersion: 1, appVersion: 3 }],
]

describe('reading a stored value through the record envelope', () => {
  // @test-link [[module_on_device_database]]
  it('reads a well-formed record of its shape version as current', () => {
    expect(readEnvelope({ dataVersion: 1, appVersion: '3.0.0', value: 'Dark' }, 1)).toBe('current')
    expect(readEnvelope({ dataVersion: 3, appVersion: '3.2.0' }, 3)).toBe('current')
  })

  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('reads a well-formed record of a higher data version as newer, so it is left unread', () => {
    expect(readEnvelope({ dataVersion: 2, appVersion: '3.1.0', value: 'Dark' }, 1)).toBe('newer')
    expect(readEnvelope({ dataVersion: 9, appVersion: '9.0.0' }, 3)).toBe('newer')
  })

  // @test-link [[module_on_device_database]]
  it('reads a record of a lower data version than its shape as unreadable', () => {
    expect(readEnvelope({ dataVersion: 1, appVersion: '3.0.0' }, 2)).toBe('unreadable')
  })

  // @test-link [[module_on_device_database]]
  it('reads a value without valid versions as unreadable, never throwing', () => {
    for (const [what, value] of WITHOUT_VALID_VERSIONS) {
      expect(() => readEnvelope(value, 1), what).not.toThrow()
      expect(readEnvelope(value, 1), what).toBe('unreadable')
    }
  })

  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('reads a newer record that lacks a valid app version as unreadable, not newer', () => {
    expect(readEnvelope({ dataVersion: 2, appVersion: '' }, 1)).toBe('unreadable')
  })
})

describe('checking a record about to be written', () => {
  // @test-link [[module_on_device_database]]
  it('accepts valid versions at or below the database data version', () => {
    expect(() => assertWritableVersions({ dataVersion: 1, appVersion: '3.0.0' }, 1)).not.toThrow()
    expect(() => assertWritableVersions({ dataVersion: 1, appVersion: '3.2.0' }, 2)).not.toThrow()
    expect(() => assertWritableVersions({ dataVersion: 2, appVersion: '3.2.0' }, 2)).not.toThrow()
  })

  // @test-link [[module_on_device_database]]
  it('refuses, as a caller defect, a record without valid versions', () => {
    for (const [what, value] of WITHOUT_VALID_VERSIONS) {
      expect(() => assertWritableVersions(value, 1), what).toThrow(Error)
    }
  })

  // @test-link [[module_on_device_database]]
  it('refuses, as a caller defect, a data version above the database data version', () => {
    expect(() => assertWritableVersions({ dataVersion: 2, appVersion: '3.0.0' }, 1)).toThrow(
      /data version 2.*above.*1/,
    )
  })
})
