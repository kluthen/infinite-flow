/**
 * The migration step to data version 5 (v3.3): it carries the player presets and the kept
 * sessions' bodies v3.2 kept over to the shapes that hold the Seventh chords level. Each data
 * version 3 player preset record the preset codec can read is written back at data version 5
 * with the level at Off, every other field kept as it is, so each preset loads with the same
 * values; each data version 4 body the codec's data version 4 reader can read is written back at
 * data version 5, each phrase's intent with the level at Off, every phrase, favorite mark and
 * field (the harmonies, all triads, the generated timelines, the carry-ins and the requests), the
 * doodle and the played-notes clock as read, so the session reviews and exports exactly as before.
 * Every other record is left as it is: a record it cannot read stays at its data version, which
 * the codecs then report as unreadable; the session-wide records (at data version 4), the played
 * notes (at 1), the settings and every other store are not touched. Records are carried over
 * here, when the database opens, never when a record is read.
 *
 * The step never throws for anything stored: reading a stored value and writing its rewrite back
 * are each guarded (`rewrite-each.ts`). A failing request (a quota error, say) is not prevented:
 * it aborts the upgrade, the database stays at data version 4 for that visit, and a later open
 * runs the step again.
 */

import type { MigrationStep } from '../database'
import { readEnvelope } from '../record-envelope'
import { rewrittenKeptBodyRecord, type KeptSessionBodyRecord } from '../records/kept-session-body'
import { parseKeptSessionBodyV4 } from '../records/kept-session-body-read'
import { carriedOverPresetRecord, type CarriedOverPresetRecord } from '../records/preset-record'
import { rewriteInOrder, type StoreRewrite } from './rewrite-each'

/** The data version the kept bodies the step reads were written at. */
const BODY_FROM_VERSION = 4

/**
 * Intent: the data version 5 record of a stored data version 3 player preset record, v3.2's,
 * stored under `key`, written by `appVersion`: every field as stored, the Seventh chords level at
 * Off; null for any record the preset codec cannot read at data version 3, which is then left as
 * it is. Never throws: any error gives null.
 */
// @spec-link [[module_presets_and_kept_sessions_upgrade_step]]
// @spec-link [[rule_player_presets_saved_on_device]]
export function upgradedPresetV5(
  stored: unknown,
  key: IDBValidKey,
  appVersion: string,
): CarriedOverPresetRecord | null {
  try {
    return carriedOverPresetRecord(stored, key, appVersion)
  } catch {
    // Deliberately any error: the record stays at data version 3, not listed, rather than abort
    // the upgrade every later open would then fail on.
    return null
  }
}

/**
 * Intent: the data version 5 body of a stored data version 4 one, v3.2's, written by
 * `appVersion`: each phrase's intent with the Seventh chords level at Off, every phrase, favorite
 * mark and field as read, the doodle and the played-notes clock as read; null for any body not at
 * data version 4 or not readable by the data version 4 reader, which is then left as it is. Never
 * throws: any error reading the stored value gives null.
 */
// @spec-link [[module_presets_and_kept_sessions_upgrade_step]]
// @spec-link [[rule_earlier_kept_sessions_carried_over]]
// @spec-link [[rule_earlier_kept_sessions_read_at_off]]
export function upgradedKeptBodyV5(
  stored: unknown,
  appVersion: string,
): KeptSessionBodyRecord | null {
  try {
    if (readEnvelope(stored, BODY_FROM_VERSION) !== 'current') return null
    const body = parseKeptSessionBodyV4(stored)
    const favorites = new Set(
      body.phrases.filter((phrase) => phrase.favorite).map((phrase) => phrase.phraseNumber),
    )
    return rewrittenKeptBodyRecord(body, (number) => favorites.has(number), appVersion)
  } catch {
    // Deliberately any error, a refusal or not: the body stays at data version 4, read as
    // unreadable, rather than abort the upgrade every later open would then fail on.
    return null
  }
}

/**
 * Intent: the stores the step rewrites, in the order it walks them (the player presets first,
 * then the kept bodies), each record's rewrite written by `appVersion`.
 */
function presetAndBodyRewrites(appVersion: string): readonly StoreRewrite[] {
  return [
    {
      store: 'presets',
      /** Intent: the player preset record's data version 5 rewrite, null to leave it as it is. */
      upgraded: (stored, key) => upgradedPresetV5(stored, key, appVersion),
    },
    {
      store: 'sessionBodies',
      /** Intent: the body's data version 5 rewrite, null to leave it as it is. */
      upgraded: (stored) => upgradedKeptBodyV5(stored, appVersion),
    },
  ]
}

/**
 * The migration step to data version 5: it rewrites the data version 3 player preset records,
 * then the data version 4 kept bodies, that it can read, written by the app version the database
 * is opened with, holding the upgrade until both walks end; every other record and store is left
 * as it is.
 */
// @spec-link [[module_presets_and_kept_sessions_upgrade_step]]
// @spec-link [[module_on_device_database]]
export const PRESETS_AND_KEPT_SESSIONS_V5: MigrationStep = {
  toVersion: 5,
  migrate: ({ transaction, appVersion, hold }) => {
    rewriteInOrder(transaction, presetAndBodyRewrites(appVersion), hold())
  },
}
