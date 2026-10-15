/**
 * The my-instrument record's read side: my instrument from the `instrument` store's records, as
 * loaded. Pure: no browser API.
 *
 * Reading is whole or nothing: a record loads only when it is a current record of this version and
 * building my instrument from it succeeds, so every rule of my instrument applies at load. Anything
 * else, a newer version's record included, loads as no my instrument, with no error and no repair.
 *
 * Loaded on demand: the load of the saved data `import()`s this module only when the store holds a
 * record, so it, building my instrument and its interval table stay out of the first load. Nothing
 * may import it statically outside storage-bootstrap.ts's on-demand read (tests aside).
 */

import { MY_INSTRUMENT_ID } from '@/domain/profile/instrument-profiles'
import { isInstrumentClef } from '@/domain/profile/instrument-clef'
import {
  makeMyInstrument,
  MyInstrumentError,
  type MyInstrument,
  type MyInstrumentInput,
  type MyInstrumentInputKind,
} from '@/domain/profile/my-instrument'
import type { MyInstrumentTransposition } from '@/domain/profile/transposition-interval'

import { readEnvelope } from '../record-envelope'
import { MY_INSTRUMENT_DATA_VERSION } from './my-instrument-record'

/** The one input kind a record may hold today. */
const MIDI_CONTROLLER: MyInstrumentInputKind = 'midi-controller'

/** Intent: whether a value is a non-null, non-array object, whose fields can be read. */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Intent: a written range's two ends, when the value holds two numbers; null otherwise. */
function writtenRangeOf(value: unknown): MyInstrumentInput['writtenRange'] | null {
  if (!isObject(value)) return null
  const { minMidi, maxMidi } = value
  if (typeof minMidi !== 'number' || typeof maxMidi !== 'number') return null
  return { minMidi, maxMidi }
}

/**
 * Intent: a transposition's three fields, when the value holds two numbers and a string; null
 * otherwise. Whether they make a valid transposition is building my instrument's to check.
 */
function transpositionOf(value: unknown): MyInstrumentTransposition | null {
  if (!isObject(value)) return null
  const { octaves, semitones, direction } = value
  if (typeof octaves !== 'number' || typeof semitones !== 'number') return null
  if (typeof direction !== 'string') return null
  return { octaves, semitones, direction: direction as MyInstrumentTransposition['direction'] }
}

/**
 * Intent: what a current record says my instrument is built from, when every field has its type
 * and the id and input kind are the only ones there are; null otherwise.
 */
function inputOf(record: Record<string, unknown>): MyInstrumentInput | null {
  const { id, template, name, clef, inputKind } = record
  if (id !== MY_INSTRUMENT_ID || inputKind !== MIDI_CONTROLLER) return null
  if (typeof template !== 'string' || typeof name !== 'string' || !isInstrumentClef(clef)) {
    return null
  }
  const writtenRange = writtenRangeOf(record.writtenRange)
  const transposition = transpositionOf(record.transposition)
  if (writtenRange === null || transposition === null) return null
  return { template, name, clef, writtenRange, transposition }
}

/**
 * Intent: my instrument from the `instrument` store's records as loaded: built from the first
 * current record whose fields read and which my instrument's rules accept, unchanged; null when
 * there is none. A newer version's record, one that does not decode and one the rules refuse load
 * as absent, with no error, no notice and nothing repaired. A builder error other than my
 * instrument's own refusal is a defect and throws.
 */
// @spec-link [[entity_my_instrument_record]]
// @spec-link [[rule_saved_settings_load_tolerantly]]
export function decodeMyInstrument(records: readonly unknown[]): MyInstrument | null {
  for (const record of records) {
    if (readEnvelope(record, MY_INSTRUMENT_DATA_VERSION) !== 'current') continue
    const input = inputOf(record as Record<string, unknown>)
    if (input === null) continue
    try {
      return makeMyInstrument(input)
    } catch (error) {
      if (!(error instanceof MyInstrumentError)) throw error
    }
  }
  return null
}
