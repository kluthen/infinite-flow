/**
 * The my-instrument record: the one record of the `instrument` store, under one fixed key, in the
 * record envelope, holding what my instrument is built from (its id, template, display name, clef,
 * written range, transposition and input kind) and nothing derived from it: the concert range, the
 * interval and the generator-facing profile are derived again at each load. Pure: no browser API.
 *
 * This module holds the record's shape and its encoder, small and eager: the visit's saves put the
 * record in the save policy's line synchronously, in call order, so the encoder cannot wait on a
 * load. The read side, whole or nothing, lives in ./my-instrument-record-read.ts, loaded on demand
 * with building my instrument, only when the store holds a record, so it stays out of the first
 * load.
 */

import { MY_INSTRUMENT_ID } from '@/domain/profile/instrument-profiles'
import type { MyInstrumentInput, MyInstrumentInputKind } from '@/domain/profile/my-instrument'
import type { MyInstrumentTransposition } from '@/domain/profile/transposition-interval'

import type { RecordVersions } from '../record-envelope'

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
