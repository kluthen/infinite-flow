/**
 * The remembered controller's record: the one record of the `controller` store, in the record
 * envelope, holding the input port's `id` (the one identity matched at load, the one a device that
 * comes back within a page is recognised by) and its `name` and `manufacturer`, for display only:
 * two identical devices share them, so they are never matched on. Pure: no browser API.
 *
 * Reading is tolerant: a record no codec reads, or one a newer app wrote, gives no remembered
 * controller, never an error, so the player simply connects as without one.
 */

import { readEnvelope, type RecordVersions } from '../record-envelope'

/** The data version at which the controller record's shape was introduced. */
// @spec-link [[entity_remembered_controller_record]]
export const CONTROLLER_DATA_VERSION = 1

/** The key of the one remembered-controller record in the `controller` store. */
// @spec-link [[entity_remembered_controller_record]]
export const CONTROLLER_RECORD_KEY = 'remembered'

/** The remembered controller: its input port's id, and its names for display only. */
// @spec-link [[entity_remembered_controller_record]]
export interface RememberedControllerDevice {
  readonly id: string
  readonly name: string
  readonly manufacturer: string
}

/** The stored record: the envelope's two versions and the remembered device. */
// @spec-link [[entity_remembered_controller_record]]
export interface ControllerRecord extends RecordVersions, RememberedControllerDevice {}

/**
 * Intent: the record remembering `device`, written by the app at `appVersion`. An empty app version
 * or port id is a caller defect and throws: no app could match or read such a record.
 */
// @spec-link [[entity_remembered_controller_record]]
// @spec-link [[rule_last_controller_remembered]]
export function encodeControllerRecord(
  device: RememberedControllerDevice,
  appVersion: string,
): ControllerRecord {
  if (appVersion === '') throw new Error('controller record: the app version must not be empty')
  if (device.id === '') throw new Error('controller record: the port id must not be empty')
  return {
    dataVersion: CONTROLLER_DATA_VERSION,
    appVersion,
    id: device.id,
    name: device.name,
    manufacturer: device.manufacturer,
  }
}

/** Intent: the device a current record holds, or null when one of its fields is invalid. */
function deviceOf(record: Record<string, unknown>): RememberedControllerDevice | null {
  const { id, name, manufacturer } = record
  if (typeof id !== 'string' || id === '') return null
  if (typeof name !== 'string' || typeof manufacturer !== 'string') return null
  return Object.freeze({ id, name, manufacturer })
}

/**
 * Intent: the remembered controller from the `controller` store's records as loaded: the first
 * current, valid record's device; null when there is none. Never throws for what was stored.
 */
// @spec-link [[entity_remembered_controller_record]]
// @spec-link [[rule_last_controller_remembered]]
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export function decodeRememberedController(
  records: readonly unknown[],
): RememberedControllerDevice | null {
  for (const record of records) {
    if (readEnvelope(record, CONTROLLER_DATA_VERSION) !== 'current') continue
    const device = deviceOf(record as Record<string, unknown>)
    if (device !== null) return device
  }
  return null
}
