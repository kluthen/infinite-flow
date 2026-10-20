/**
 * The migration step to data version 2 (v3.1): it carries the kept sessions an earlier version
 * kept over to the version 2 shapes. Each data version 1 session-wide record it can read is
 * written back with the preset label its musical profile selection names in place of that
 * selection; each data version 1 body it can read is written back with its phrases' intents
 * holding their figure levels only. Every other record is left as it is: a record it cannot read
 * stays at data version 1, which the codec then reports as unreadable, and the played notes, whose
 * shape does not change, and every other store are not touched.
 *
 * The step never throws for anything stored. A throw from a cursor callback would escape the
 * migration runner's guard and abort the upgrade, and every later open of the database would then
 * fail on the same record; so reading a stored value and writing its rewrite back are each
 * guarded, and a record either is rewritten or stays as it was. A failing request (a quota error,
 * say) is not prevented: it aborts the upgrade, which a later open then runs again.
 */

import type { MigrationStep } from '../database'
import { readEnvelope } from '../record-envelope'
import {
  parseKeptSessionBodyV1,
  rewrittenKeptBodyRecord,
  type KeptSessionBodyRecord,
} from '../records/kept-session-body'
import {
  parseKeptSessionSummaryV1,
  rewrittenKeptSummaryRecord,
  type KeptSessionSummaryRecord,
} from '../records/kept-session-summary'

/** The data version the kept-session records the step reads were written at. */
const FROM_VERSION = 1

/**
 * Intent: the data version 2 session-wide record of a stored data version 1 one, written by
 * `appVersion`, its preset label the one its musical profile selection names; null for any record
 * not at data version 1 or not readable, which is then left as it is. Never throws: any error
 * reading the stored value gives null.
 */
// @spec-link [[module_kept_session_upgrade_step]]
// @spec-link [[rule_preset_label_kept_with_session]]
export function upgradedKeptSummary(
  stored: unknown,
  appVersion: string,
): KeptSessionSummaryRecord | null {
  try {
    if (readEnvelope(stored, FROM_VERSION) !== 'current') return null
    return rewrittenKeptSummaryRecord(parseKeptSessionSummaryV1(stored), appVersion)
  } catch {
    // Deliberately any error, a refusal or not: the record stays at data version 1, read as
    // unreadable, rather than abort the upgrade every later open would then fail on.
    return null
  }
}

/**
 * Intent: the data version 2 body of a stored data version 1 one, written by `appVersion`: its
 * phrases as read, each intent holding its figure levels only, each favorite mark and every other
 * field (the timelines included) as stored; null for any body not at data version 1 or not
 * readable, which is then left as it is. Never throws: any error reading the stored value gives
 * null.
 */
// @spec-link [[module_kept_session_upgrade_step]]
export function upgradedKeptBody(
  stored: unknown,
  appVersion: string,
): KeptSessionBodyRecord | null {
  try {
    if (readEnvelope(stored, FROM_VERSION) !== 'current') return null
    const phrases = parseKeptSessionBodyV1(stored)
    const favorites = new Set(
      phrases.filter((phrase) => phrase.favorite).map((phrase) => phrase.phraseNumber),
    )
    return rewrittenKeptBodyRecord(phrases, (number) => favorites.has(number), appVersion)
  } catch {
    // Deliberately any error, a refusal or not: the body stays at data version 1, read as
    // unreadable, rather than abort the upgrade every later open would then fail on.
    return null
  }
}

/**
 * Intent: write `next` over the record the cursor is on, and whether the write was requested; when
 * it cannot even be requested (the value cannot be stored, say), the record is left as it is.
 * Never throws.
 */
function updateOrLeave(cursor: IDBCursorWithValue, next: unknown): boolean {
  try {
    cursor.update(next)
    return true
  } catch {
    // A throw here would escape the migration runner's guard and abort the upgrade; the record
    // stays at data version 1 instead, which the codec reads as unreadable.
    return false
  }
}

/**
 * Intent: walk every record of `store`, writing back the rewrite `upgraded` gives of each one that
 * has one and leaving the others as they are, then call `done` when given. `upgraded` never
 * throws, and neither does the write; a failing request is left to abort the upgrade.
 */
function rewriteEach(
  store: IDBObjectStore,
  upgraded: (stored: unknown) => unknown,
  done?: () => void,
): void {
  const walk = store.openCursor()
  walk.onsuccess = () => {
    const cursor = walk.result
    if (cursor === null) {
      done?.()
      return
    }
    const next = upgraded(cursor.value)
    if (next !== null) updateOrLeave(cursor, next)
    cursor.continue()
  }
}

/**
 * The migration step to data version 2: it rewrites the data version 1 session-wide records, then
 * the data version 1 bodies, that it can read, written by the app version the database is opened
 * with; every other record and store is left as it is.
 */
// @spec-link [[module_kept_session_upgrade_step]]
// @spec-link [[rule_earlier_kept_sessions_carried_over]]
export const KEPT_SESSIONS_V2: MigrationStep = {
  toVersion: 2,
  migrate: ({ transaction, appVersion }) => {
    const summaries = transaction.objectStore('sessionSummaries')
    const bodies = transaction.objectStore('sessionBodies')
    rewriteEach(
      summaries,
      (stored) => upgradedKeptSummary(stored, appVersion),
      () => rewriteEach(bodies, (stored) => upgradedKeptBody(stored, appVersion)),
    )
  },
}
