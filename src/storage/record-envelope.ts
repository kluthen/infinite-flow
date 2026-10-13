/**
 * The record envelope: the two version fields every stored record carries, whatever it holds, and
 * how they are read back and checked before a write.
 *
 * A record's `dataVersion` is the data version at which its store's current record shape was
 * introduced; its `appVersion` is the package version of the app that wrote it. Reading compares
 * a stored value with the shape version its codec knows, and never throws for what was stored:
 * a well-formed record of a higher version is newer and left unread, never misread; anything
 * else that is not current is unreadable. Writing is strict: a record without valid versions, or
 * with a data version above the database's, is a defect of the caller and throws.
 */

/**
 * The two fields every stored record carries, whatever it holds: the data version of its shape
 * and the version of the app that wrote it.
 */
// @spec-link [[module_on_device_database]]
export interface RecordVersions {
  readonly dataVersion: number
  readonly appVersion: string
}

/**
 * How a stored value reads against its codec's shape version: `current` (well formed, the same
 * version, read), `newer` (well formed, a higher version, left unread) or `unreadable` (not an
 * object, a version field missing, ill-typed or empty, or a version below the shape's).
 */
// @spec-link [[module_on_device_database]]
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export type EnvelopeReading = 'current' | 'newer' | 'unreadable'

/** Intent: whether a value is a plain object, as a stored record is. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype: unknown = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/**
 * Intent: the record's versions when both are valid: an integer data version of at least 1 and
 * a non-empty app version; null otherwise.
 */
function validVersions(value: unknown): RecordVersions | null {
  if (!isPlainObject(value)) return null
  const { dataVersion, appVersion } = value
  if (typeof dataVersion !== 'number' || !Number.isInteger(dataVersion) || dataVersion < 1) {
    return null
  }
  if (typeof appVersion !== 'string' || appVersion === '') return null
  return { dataVersion, appVersion }
}

/**
 * Intent: classify a stored value against the shape version its codec reads. A newer record is
 * reported so it is left unread rather than misread by this older app; never throws for anything
 * stored.
 */
// @spec-link [[module_on_device_database]]
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export function readEnvelope(value: unknown, shapeVersion: number): EnvelopeReading {
  const versions = validVersions(value)
  if (versions === null) return 'unreadable'
  if (versions.dataVersion > shapeVersion) return 'newer'
  return versions.dataVersion === shapeVersion ? 'current' : 'unreadable'
}

/**
 * Intent: refuse a record about to be written unless it carries valid versions and a data version
 * no higher than the database's. Throws a plain Error: such a record is a caller defect, and
 * writing it would store a value no app could read.
 */
// @spec-link [[module_on_device_database]]
export function assertWritableVersions(record: unknown, databaseVersion: number): void {
  const versions = validVersions(record)
  if (versions === null) {
    throw new Error(
      'record envelope: a record to write needs an integer dataVersion >= 1 and a non-empty appVersion',
    )
  }
  if (versions.dataVersion > databaseVersion) {
    throw new Error(
      `record envelope: data version ${versions.dataVersion} is above the database's data version ${databaseVersion}`,
    )
  }
}
