/**
 * The migration step to data version 4 (v3.2): it carries the kept sessions v3.1 kept over to the
 * shapes that hold Jam's and the rhythm lock's parts, with no Jam part. Each data version 2 body
 * the codec's data version 2 reader can read is written back at data version 4 with no doodle,
 * every phrase, favorite mark and field (the generated timelines included) as stored, so the
 * session reviews and exports exactly as before. The session-wide record keeps its data version 2
 * shape, so the step leaves it as it is. Every other record is left as it is: a body it cannot
 * read, a v3.1 body whose stored request holds a rhythm lock group or a steering block among
 * them, stays at data version 2, which the codec then reports as unreadable; the played notes,
 * whose shape does not change, and every other store are not touched. Sessions are carried over
 * here, when the database opens, never when a session is read.
 *
 * The step never throws for anything stored: reading a stored value and writing its rewrite back
 * are each guarded (`rewrite-each.ts`). A failing request (a quota error, say) is not prevented:
 * it aborts the upgrade, the database stays at data version 3 for that visit, and a later open
 * runs the step again.
 */

import type { MigrationStep } from '../database'
import { readEnvelope } from '../record-envelope'
import {
  parseKeptSessionBodyV2,
  rewrittenKeptBodyRecord,
  type KeptSessionBodyRecord,
} from '../records/kept-session-body'
import { rewriteInOrder, type StoreRewrite } from './rewrite-each'

/** The data version the kept-session records the step reads were written at. */
const FROM_VERSION = 2

/**
 * Intent: the data version 4 body of a stored data version 2 one, v3.1's, written by
 * `appVersion`: no doodle, its phrases as read, each favorite mark and every other field (the
 * timelines included) as stored; null for any body not at data version 2 or not readable by the
 * data version 2 reader (one whose stored request holds a rhythm lock group or a steering block
 * included), which is then left as it is. Never throws: any error reading the stored value gives
 * null.
 */
// @spec-link [[module_kept_session_jam_upgrade_step]]
// @spec-link [[rule_earlier_sessions_open_without_doodle]]
export function upgradedKeptBodyV4(
  stored: unknown,
  appVersion: string,
): KeptSessionBodyRecord | null {
  try {
    if (readEnvelope(stored, FROM_VERSION) !== 'current') return null
    const phrases = parseKeptSessionBodyV2(stored)
    const favorites = new Set(
      phrases.filter((phrase) => phrase.favorite).map((phrase) => phrase.phraseNumber),
    )
    return rewrittenKeptBodyRecord(
      { phrases, doodle: null },
      (number) => favorites.has(number),
      appVersion,
    )
  } catch {
    // Deliberately any error, a refusal or not: the body stays at data version 2, read as
    // unreadable, rather than abort the upgrade every later open would then fail on.
    return null
  }
}

/**
 * Intent: the stores the step rewrites, in the order it walks them (the session-wide records
 * first, then the bodies, when both change), each record's rewrite written by `appVersion`.
 */
function keptSessionRewrites(appVersion: string): readonly StoreRewrite[] {
  return [
    {
      store: 'sessionBodies',
      /** Intent: the body's data version 4 rewrite, null to leave it as it is. */
      upgraded: (stored) => upgradedKeptBodyV4(stored, appVersion),
    },
  ]
}

/**
 * The migration step to data version 4: it rewrites the data version 2 bodies it can read, written
 * by the app version the database is opened with, holding the upgrade until its walk ends; every
 * other record and store is left as it is.
 */
// @spec-link [[module_kept_session_jam_upgrade_step]]
// @spec-link [[rule_earlier_sessions_open_without_doodle]]
export const KEPT_SESSIONS_V4: MigrationStep = {
  toVersion: 4,
  migrate: ({ transaction, appVersion, hold }) => {
    rewriteInOrder(transaction, keptSessionRewrites(appVersion), hold())
  },
}
