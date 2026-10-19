/**
 * How the kept-session codec reports what it read: a current value, a record of a newer version
 * left unread, or an unreadable one, and the data version of each kept-session shape. Classifying the stored values through the record envelope
 * comes first; a current record is then validated, and only a validator's refusal of an invalid
 * stored value turns into `unreadable`: any other error is a defect and surfaces.
 */

import { readEnvelope, type EnvelopeReading } from '../record-envelope'
import { isKeptPhraseRefusal } from './kept-phrase-parsers'

/**
 * The data version of the session-wide record's shape: 2 from v3.1, which records the preset
 * label in place of v3.0's musical profile selection.
 */
// @spec-link [[entity_kept_session_record]]
export const KEPT_SESSION_SUMMARY_DATA_VERSION = 2

/**
 * The data version of the body's shape: 2 from v3.1, whose phrases' intents hold the figure
 * levels only, never a musical profile.
 */
// @spec-link [[entity_kept_session_record]]
export const KEPT_SESSION_BODY_DATA_VERSION = 2

/** The data version of the played-notes record's shape: 1, unchanged since v3.0. */
// @spec-link [[entity_kept_session_record]]
export const KEPT_PLAYED_NOTES_DATA_VERSION = 1

/** A stored value with the version of the kept-session shape it is read against. */
export interface KeptStoredValue {
  readonly value: unknown
  readonly shapeVersion: number
}

/**
 * What decoding a kept-session record gives: its value when current and valid; `newer` when a
 * newer app wrote it, so it is left unread; `unreadable` otherwise, never repaired or partly read.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export type KeptReading<T> =
  | { readonly reading: 'current'; readonly value: T }
  | { readonly reading: 'newer' }
  | { readonly reading: 'unreadable' }

const NEWER = Object.freeze({ reading: 'newer' as const })
const UNREADABLE = Object.freeze({ reading: 'unreadable' as const })

/**
 * Intent: how a set of stored values reads together, each against its own kept-session shape's
 * version: any newer one makes the whole newer (left unread), else any unreadable one makes it
 * unreadable.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export function readKeptEnvelopes(values: readonly KeptStoredValue[]): EnvelopeReading {
  const readings = values.map(({ value, shapeVersion }) => readEnvelope(value, shapeVersion))
  if (readings.includes('newer')) return 'newer'
  return readings.includes('unreadable') ? 'unreadable' : 'current'
}

/**
 * Intent: decode stored values whose envelopes are read, each against its shape's version: a
 * newer or unreadable envelope is reported as such without reading anything; current ones are
 * read by `read`, whose refusal of an invalid stored value is reported as unreadable. Any other
 * error is rethrown.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export function readKept<T>(values: readonly KeptStoredValue[], read: () => T): KeptReading<T> {
  const envelope = readKeptEnvelopes(values)
  if (envelope === 'newer') return NEWER
  if (envelope === 'unreadable') return UNREADABLE
  try {
    return Object.freeze({ reading: 'current' as const, value: read() })
  } catch (error) {
    if (isKeptPhraseRefusal(error)) return UNREADABLE
    throw error
  }
}

/** Intent: refuse an empty app version, which no record may be written with: a caller defect. */
// @spec-link [[entity_kept_session_record]]
export function assertKeptAppVersion(appVersion: string): void {
  if (appVersion === '') throw new Error('kept session record: the app version must not be empty')
}
