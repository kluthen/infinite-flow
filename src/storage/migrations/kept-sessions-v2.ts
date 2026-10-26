/**
 * The migration step to data version 2 (v3.1): it carries the kept sessions an earlier version
 * kept over to the version 2 shapes. Each data version 1 session-wide record it can read is
 * written back with the preset label its musical profile selection names in place of that
 * selection; each data version 1 body it can read is written back with its phrases' intents
 * holding their figure levels only. Every other record is left as it is: a record it cannot read
 * stays at data version 1, which the codec then reports as unreadable, and the played notes, whose
 * shape does not change, and every other store are not touched.
 *
 * The session-wide records and bodies it writes are v3.1's, at data version 2, which the step to
 * data version 4 then carries on: a session kept by v3.0 reaches the current shapes through data
 * version 2.
 *
 * The step never throws for anything stored. A throw from a cursor callback would escape the
 * migration runner's guard and abort the upgrade, and every later open of the database would then
 * fail on the same record; so reading a stored value and writing its rewrite back are each
 * guarded (`rewrite-each.ts`), and a record either is rewritten or stays as it was. A failing
 * request (a quota error, say) is not prevented: it aborts the upgrade, which a later open then
 * runs again.
 */

import type { MigrationStep } from '../database'
import { readEnvelope } from '../record-envelope'
import {
  parseKeptSessionBodyV1,
  rewrittenKeptBodyRecordV2,
  type KeptSessionBodyRecord,
} from '../records/kept-session-body'
import {
  parseKeptSessionSummaryV1,
  rewrittenKeptSummaryRecordV2,
  type KeptSessionSummaryV2,
} from '../records/kept-session-summary'
import type { RecordVersions } from '../record-envelope'
import { rewriteInOrder } from './rewrite-each'

/** The data version the kept-session records the step reads were written at. */
const FROM_VERSION = 1

/**
 * Intent: the data version 2 session-wide record, v3.1's, of a stored data version 1 one, written
 * by `appVersion`, its preset label the one its musical profile selection names; null for any
 * record not at data version 1 or not readable, which is then left as it is. Never throws: any
 * error reading the stored value gives null.
 */
// @spec-link [[module_kept_session_upgrade_step]]
// @spec-link [[rule_preset_label_kept_with_session]]
export function upgradedKeptSummary(
  stored: unknown,
  appVersion: string,
): (RecordVersions & KeptSessionSummaryV2) | null {
  try {
    if (readEnvelope(stored, FROM_VERSION) !== 'current') return null
    return rewrittenKeptSummaryRecordV2(parseKeptSessionSummaryV1(stored), appVersion)
  } catch {
    // Deliberately any error, a refusal or not: the record stays at data version 1, read as
    // unreadable, rather than abort the upgrade every later open would then fail on.
    return null
  }
}

/**
 * Intent: the data version 2 body, v3.1's, of a stored data version 1 one, written by
 * `appVersion`: its phrases as read, each intent holding its figure levels only, each favorite
 * mark and every other field (the timelines included) as stored; null for any body not at data
 * version 1 or not readable, which is then left as it is. Never throws: any error reading the
 * stored value gives null.
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
    return rewrittenKeptBodyRecordV2(phrases, (number) => favorites.has(number), appVersion)
  } catch {
    // Deliberately any error, a refusal or not: the body stays at data version 1, read as
    // unreadable, rather than abort the upgrade every later open would then fail on.
    return null
  }
}

/**
 * The migration step to data version 2: it rewrites the data version 1 session-wide records, then
 * the data version 1 bodies, that it can read, written by the app version the database is opened
 * with, holding the upgrade until both walks end; every other record and store is left as it is.
 */
// @spec-link [[module_kept_session_upgrade_step]]
// @spec-link [[rule_earlier_kept_sessions_carried_over]]
export const KEPT_SESSIONS_V2: MigrationStep = {
  toVersion: 2,
  migrate: ({ transaction, appVersion, hold }) => {
    rewriteInOrder(
      transaction,
      [
        {
          store: 'sessionSummaries',
          /** Intent: the session-wide record's data version 2 rewrite, null to leave it. */
          upgraded: (stored) => upgradedKeptSummary(stored, appVersion),
        },
        {
          store: 'sessionBodies',
          /** Intent: the body's data version 2 rewrite, null to leave it as it is. */
          upgraded: (stored) => upgradedKeptBody(stored, appVersion),
        },
      ],
      hold(),
    )
  },
}
