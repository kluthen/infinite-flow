/**
 * My instrument's saves among the visit's saves (`settings-saver.ts`): its one record written
 * whole when the player saves it, deleted when they delete it, each one batch through the save
 * policy, so held during a session, refused in an outdated tab and skipped in a visit that saves
 * nothing. Each save also asks the policy for persistent storage, which asks the browser at most
 * once per visit. Pure: no browser API.
 */

import type { MyInstrument } from '@/domain/profile/my-instrument'

import { encodeMyInstrumentRecord, MY_INSTRUMENT_RECORD_KEY } from './records/my-instrument-record'
import type { SavePolicy } from './save-policy'
import type { StorageChange } from './storage-port'

/** The saves of my instrument's record. */
// @spec-link [[entity_my_instrument_record]]
export interface MyInstrumentSaves {
  /** Write my instrument's record, whole, replacing the one stored; ask for persistent storage. */
  readonly saveMyInstrument: (instrument: MyInstrument) => void
  /** Delete my instrument's record. */
  readonly deleteMyInstrument: () => void
}

/** A call made to the loaded policy, in the line of the visit's saves. */
export type SubmitToPolicy = (call: (policy: SavePolicy) => void) => void

/**
 * Intent: my instrument's saves over the visit's line of calls to the policy, so each reaches it
 * in the order made: the record saved before the selection that names it. The policy reports a
 * refusal itself; my instrument still applies for the visit.
 */
// @spec-link [[entity_my_instrument_record]]
// @spec-link [[rule_persistent_storage_requested]]
export function createMyInstrumentSaves(
  submit: SubmitToPolicy,
  appVersion: string,
): MyInstrumentSaves {
  return {
    saveMyInstrument: (instrument) => {
      const record = encodeMyInstrumentRecord(instrument, appVersion)
      const change: StorageChange = {
        kind: 'write',
        store: 'instrument',
        key: MY_INSTRUMENT_RECORD_KEY,
        record,
      }
      submit((policy) => {
        void policy.save([change])
        void policy.requestProtection()
      })
    },
    deleteMyInstrument: () => {
      const change: StorageChange = {
        kind: 'delete',
        store: 'instrument',
        key: MY_INSTRUMENT_RECORD_KEY,
      }
      submit((policy) => void policy.save([change]))
    },
  }
}
