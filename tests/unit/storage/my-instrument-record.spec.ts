/**
 * The my-instrument record: one record in the instrument store, under one fixed key, in the record
 * envelope, holding what my instrument is built from and nothing derived; it loads whole or not at
 * all, a record that does not decode, one my instrument's own rules refuse, or one a newer version
 * wrote loading as absent.
 */
import { describe, expect, it } from 'vitest'

import { makeMyInstrument, type MyInstrumentInput } from '@/domain/profile/my-instrument'
import {
  encodeMyInstrumentRecord,
  MY_INSTRUMENT_DATA_VERSION,
  MY_INSTRUMENT_RECORD_KEY,
} from '@/storage/records/my-instrument-record'
import { decodeMyInstrument } from '@/storage/records/my-instrument-record-read'

const APP_VERSION = '3.0.0-test'

/** A tenor-saxophone my instrument in bass clef, renamed and with its own range. */
const TENOR_IN_BASS: MyInstrumentInput = {
  template: 'bb-tenor',
  name: 'Low tenor',
  clef: 'bass',
  writtenRange: { minMidi: 48, maxMidi: 76 },
  transposition: { octaves: 1, semitones: 2, direction: 'lower' },
}

/** Intent: the stored record of `input`, as a plain object, for editing one field. */
function stored(input: MyInstrumentInput = TENOR_IN_BASS): Record<string, unknown> {
  return { ...encodeMyInstrumentRecord(input, APP_VERSION) }
}

describe('the my-instrument record', () => {
  // @test-link [[entity_my_instrument_record]]
  it('holds the id, template, name, clef, written range, transposition and input kind, nothing derived', () => {
    expect(encodeMyInstrumentRecord(makeMyInstrument(TENOR_IN_BASS), APP_VERSION)).toEqual({
      dataVersion: MY_INSTRUMENT_DATA_VERSION,
      appVersion: APP_VERSION,
      id: 'my-instrument',
      template: 'bb-tenor',
      name: 'Low tenor',
      clef: 'bass',
      writtenRange: { minMidi: 48, maxMidi: 76 },
      transposition: { octaves: 1, semitones: 2, direction: 'lower' },
      inputKind: 'midi-controller',
    })
    expect(MY_INSTRUMENT_DATA_VERSION).toBe(1)
    expect(typeof MY_INSTRUMENT_RECORD_KEY).toBe('string')
  })

  // @test-link [[entity_my_instrument_record]]
  it('refuses to encode with an empty app version', () => {
    expect(() => encodeMyInstrumentRecord(TENOR_IN_BASS, '')).toThrow(/app version/)
  })

  // @test-link [[entity_my_instrument_record]]
  // @test-link [[rule_saved_settings_load_tolerantly]]
  it('loads back the very my instrument it was encoded from', () => {
    const loaded = decodeMyInstrument([stored()])
    expect(loaded).toEqual(makeMyInstrument(TENOR_IN_BASS))
    expect(Object.isFrozen(loaded)).toBe(true)
  })

  // @test-link [[entity_my_instrument_record]]
  it('gives no my instrument when the store holds none', () => {
    expect(decodeMyInstrument([])).toBeNull()
  })

  // @test-link [[entity_my_instrument_record]]
  // @test-link [[rule_saved_settings_load_tolerantly]]
  it.each([
    ['not an object', 'my instrument'],
    ['no versions', { ...stored(), dataVersion: undefined }],
    ['a newer version', { ...stored(), dataVersion: MY_INSTRUMENT_DATA_VERSION + 1 }],
    ['another id', { ...stored(), id: 'bb-tenor' }],
    ['another input kind', { ...stored(), inputKind: 'microphone' }],
    ['an unknown clef', { ...stored(), clef: 'alto' }],
    ['a template that names no built-in', { ...stored(), template: 'cello' }],
    ['a name that is not text', { ...stored(), name: 7 }],
    ['a written range that is not a pair of notes', { ...stored(), writtenRange: [48, 76] }],
    ['an end that is not a number', { ...stored(), writtenRange: { minMidi: '48', maxMidi: 76 } }],
    [
      'a transposition missing its direction',
      { ...stored(), transposition: { octaves: 1, semitones: 2 } },
    ],
    [
      'a range under two octaves',
      stored({ ...TENOR_IN_BASS, writtenRange: { minMidi: 48, maxMidi: 71 } }),
    ],
    ['a blank name', stored({ ...TENOR_IN_BASS, name: '  ' })],
    [
      'a direction inconsistent with the size',
      stored({ ...TENOR_IN_BASS, transposition: { octaves: 0, semitones: 0, direction: 'lower' } }),
    ],
  ])('loads as absent, with no error, a record with %s', (_case, record) => {
    expect(decodeMyInstrument([record])).toBeNull()
  })
})
