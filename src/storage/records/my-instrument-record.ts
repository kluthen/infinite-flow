/**
 * The my-instrument record: the one record of the `instrument` store, under one fixed key, in the
 * record envelope, holding what my instrument is built from (its id, template, display name, clef,
 * written range, transposition and input kind) and nothing derived from it: the concert range, the
 * interval and the generator-facing profile are derived again at each load. Pure: no browser API.
 *
 * Reading is whole or nothing: a record loads only when it is a current record of this version and
 * building my instrument from it succeeds, so every rule of my instrument applies at load. Anything
 * else, a newer version's record included, loads as no my instrument, with no error and no repair.
 * Building my instrument, and its interval table with it, is loaded on demand, only when the store
 * holds a record, so it stays out of the first load; the shape and the encoder are small and
 * eager, for the visit's saves.
 */

import { MY_INSTRUMENT_ID } from '@/domain/profile/instrument-profiles'
import { isInstrumentClef } from '@/domain/profile/instrument-clef'
import type {
  MyInstrument,
  MyInstrumentInput,
  MyInstrumentInputKind,
} from '@/domain/profile/my-instrument'
import type { MyInstrumentTransposition } from '@/domain/profile/transposition-interval'

import { readEnvelope, type RecordVersions } from '../record-envelope'

/** The data version at which the my-instrument record's shape was introduced. */
// @spec-link [[entity_my_instrument_record]]
export const MY_INSTRUMENT_DATA_VERSION = 1

/** The key of the one my-instrument record in the `instrument` store. */
// @spec-link [[entity_my_instrument_record]]
export const MY_INSTRUMENT_RECORD_KEY = 'my-instrument'

/** The input kind every my instrument has today, stored so that another can be added later. */
const MIDI_CONTROLLER: MyInstrumentInputKind = 'midi-controller'

/** The stored record: the envelope's two versions and what my instrument is built from. */
// @spec-link [[entity_my_instrument_record]]
export interface MyInstrumentRecord extends RecordVersions {
  readonly id: typeof MY_INSTRUMENT_ID
  readonly template: string
  readonly name: string
  readonly clef: MyInstrumentInput['clef']
  readonly writtenRange: { readonly minMidi: number; readonly maxMidi: number }
  readonly transposition: MyInstrumentTransposition
  readonly inputKind: MyInstrumentInputKind
}

/**
 * Intent: the record holding what `instrument` is built from, written by the app at `appVersion`.
 * Takes the fields as given, unchecked: a saved my instrument was built, so checked, already. An
 * empty app version is a caller defect and throws: no app could read such a record.
 */
// @spec-link [[entity_my_instrument_record]]
export function encodeMyInstrumentRecord(
  instrument: MyInstrumentInput,
  appVersion: string,
): MyInstrumentRecord {
  if (appVersion === '') throw new Error('my-instrument record: the app version must not be empty')
  return {
    dataVersion: MY_INSTRUMENT_DATA_VERSION,
    appVersion,
    id: MY_INSTRUMENT_ID,
    template: instrument.template,
    name: instrument.name,
    clef: instrument.clef,
    writtenRange: {
      minMidi: instrument.writtenRange.minMidi,
      maxMidi: instrument.writtenRange.maxMidi,
    },
    transposition: {
      octaves: instrument.transposition.octaves,
      semitones: instrument.transposition.semitones,
      direction: instrument.transposition.direction,
    },
    inputKind: MIDI_CONTROLLER,
  }
}

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
 * as absent, with no error, no notice and nothing repaired. The builder is loaded only when a
 * record reads; its load failure is not caught: it rejects as the defect it is.
 */
// @spec-link [[entity_my_instrument_record]]
// @spec-link [[rule_saved_settings_load_tolerantly]]
export async function decodeMyInstrument(
  records: readonly unknown[],
): Promise<MyInstrument | null> {
  const inputs = records.flatMap((record) => {
    if (readEnvelope(record, MY_INSTRUMENT_DATA_VERSION) !== 'current') return []
    const input = inputOf(record as Record<string, unknown>)
    return input === null ? [] : [input]
  })
  if (inputs.length === 0) return null
  const { makeMyInstrument, MyInstrumentError } = await import('@/domain/profile/my-instrument')
  for (const input of inputs) {
    try {
      return makeMyInstrument(input)
    } catch (error) {
      if (!(error instanceof MyInstrumentError)) throw error
    }
  }
  return null
}
