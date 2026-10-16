/**
 * My instrument's saves among the visit's saves (`settings-saver.ts`). A save that erases nothing
 * writes its one record whole, one batch through the save policy, so held during a session,
 * refused in an outdated tab and skipped in a visit that saves nothing, its refusal told by the
 * notice row. Deleting my instrument, and a save that erases its kept sessions, are instead one
 * batch in the policy's kept-change line (spec D326): the record's delete or write with the
 * deletes of its counted sessions, all or none, its outcome resolved to the caller alone. Each
 * write also asks the policy for persistent storage, which asks the browser at most once per
 * visit. Pure: no browser API.
 */

import type { MyInstrument } from '@/domain/profile/my-instrument'

import { encodeMyInstrumentRecord, MY_INSTRUMENT_RECORD_KEY } from './records/my-instrument-record'
import type { KeptChangeOutcome, KeptChanges, KeptRefusal, SavePolicy } from './save-policy'
import type { StorageChange } from './storage-port'

/** The saves of my instrument's record. */
// @spec-link [[entity_my_instrument_record]]
export interface MyInstrumentSaves {
  /**
   * Write my instrument's record, whole, replacing the one stored; ask for persistent storage.
   * The plain write, for a save that erases nothing.
   */
  readonly saveMyInstrument: (instrument: MyInstrument) => void
  /**
   * Write my instrument's record and apply `sessions`, the deletes of the kept sessions it erases,
   * in one batch; once saved, ask for persistent storage. Resolves what became of the batch.
   */
  readonly saveMyInstrumentErasing: (
    instrument: MyInstrument,
    sessions: KeptChanges,
  ) => Promise<KeptChangeOutcome>
  /**
   * Delete my instrument's record and apply `sessions`, the deletes of its kept sessions (none or
   * more), in one batch. Resolves what became of the batch.
   */
  readonly deleteMyInstrument: (sessions: KeptChanges) => Promise<KeptChangeOutcome>
}

/** A call made to the loaded policy, in the line of the visit's saves. */
export type SubmitToPolicy = (call: (policy: SavePolicy) => void) => void

/** A change to kept sessions made in the line of the visit's saves, resolving its outcome. */
export type ChangeKept = (changes: KeptChanges, refusal: KeptRefusal) => Promise<KeptChangeOutcome>

/** Intent: the batch of `record`, my instrument's record change, with the deletes `sessions` build. */
function withRecord(record: StorageChange, sessions: KeptChanges): KeptChanges {
  return async (reader) => [record, ...(await sessions(reader))]
}

/**
 * Intent: my instrument's saves over the visit's line of calls to the policy, so each reaches it
 * in the order made: the record saved before the selection that names it, and a batch after every
 * session save asked for before it. The plain write's refusal is told by the policy, my instrument
 * still applying for the visit; a batch's refusal is resolved to its caller alone.
 */
// @spec-link [[entity_my_instrument_record]]
// @spec-link [[rule_persistent_storage_requested]]
export function createMyInstrumentSaves(
  submit: SubmitToPolicy,
  changeKept: ChangeKept,
  appVersion: string,
): MyInstrumentSaves {
  const written = (instrument: MyInstrument): StorageChange => ({
    kind: 'write',
    store: 'instrument',
    key: MY_INSTRUMENT_RECORD_KEY,
    record: encodeMyInstrumentRecord(instrument, appVersion),
  })
  const deleted: StorageChange = {
    kind: 'delete',
    store: 'instrument',
    key: MY_INSTRUMENT_RECORD_KEY,
  }

  return {
    saveMyInstrument: (instrument) => {
      const change = written(instrument)
      submit((policy) => {
        void policy.save([change])
        void policy.requestProtection()
      })
    },
    saveMyInstrumentErasing: async (instrument, sessions) => {
      const outcome = await changeKept(withRecord(written(instrument), sessions), 'caller')
      if (outcome.status === 'saved') submit((policy) => void policy.requestProtection())
      return outcome
    },
    deleteMyInstrument: (sessions) => changeKept(withRecord(deleted, sessions), 'caller'),
  }
}
