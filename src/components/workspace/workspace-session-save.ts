/**
 * The session's own save, at a session's end with a review, beside the session's ends: the
 * session that ended is kept under a key minted here, and every older kept session that is not
 * pinned goes in the same batch. The visit's saves run it after the release of the settings held
 * during the session; the save policy reads the kept summaries at the save and applies the batch
 * in one transaction, then resolves what became of it. The kept-session codec is loaded on
 * demand, as the first draw never needs it.
 */
import type { SessionHistory } from '@/session/session-history'
import { APP_VERSION } from '@/storage/app-version'
import type { SessionChanges, SessionSaveOutcome } from '@/storage/save-policy'
import type { SessionSaveHold } from '@/storage/settings-saver'
import type { StorageChange, StoredEntry, StoreName } from '@/storage/storage-port'

/** The kept-session codec, as its module gives it. */
export type KeptSessionCodec = Pick<
  typeof import('@/storage/records/kept-session-record'),
  'encodeKeptSession' | 'decodeKeptSessionSummary'
>

/** The stores a kept session's records live in, each under the session's key. */
const KEPT_SESSION_STORES: readonly StoreName[] = [
  'sessionSummaries',
  'sessionBodies',
  'playedNotes',
]

/**
 * Intent: the key a session is kept under, `session-{startedAt}-{sessionSeed}` in decimal, minted
 * once by its save; no code reads a fact back from it.
 */
// @spec-link [[entity_kept_session_record]]
export function keptSessionKey(history: Pick<SessionHistory, 'startedAt' | 'sessionSeed'>): string {
  return `session-${String(history.startedAt)}-${String(history.sessionSeed)}`
}

/**
 * Intent: the one batch of the session's save, from the kept summaries read at the save: first
 * the deletion of the summary, body and played notes of every readable kept session that is not
 * pinned (a summary that does not decode, or that a newer app wrote, stays with its records), then
 * the new session's records under its key, nothing pinned, chosen or commented yet, and its played
 * notes not kept.
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[rule_most_recent_session_kept]]
export function keptSessionChanges(
  codec: KeptSessionCodec,
  history: SessionHistory,
  keptSummaries: readonly StoredEntry[],
  appVersion: string,
): StorageChange[] {
  const deletions = keptSummaries.flatMap(({ key, value }) => {
    const reading = codec.decodeKeptSessionSummary(value)
    if (reading.reading !== 'current' || reading.value.pinned) return []
    return KEPT_SESSION_STORES.map((store): StorageChange => ({ kind: 'delete', store, key }))
  })
  const facts = { pinned: false, favorites: [], comment: '', playedNotesKept: false }
  const records = codec.encodeKeptSession(history, facts, appVersion)
  const key = keptSessionKey(history)
  const writes: StorageChange[] = [
    { kind: 'write', store: 'sessionSummaries', key, record: records.summary },
    { kind: 'write', store: 'sessionBodies', key, record: records.body },
  ]
  if (records.playedNotes !== null) {
    writes.push({ kind: 'write', store: 'playedNotes', key, record: records.playedNotes })
  }
  return [...deletions, ...writes]
}

/**
 * Intent: save the session that ended with a review through the visit's saves, which run it after
 * the release: the codec loaded, the batch built from the summaries read at the save. Resolves
 * what became of that save; while saving is off, nothing is read, saved or deleted.
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[rule_failed_save_never_disturbs_session]]
export async function saveEndedSession(
  saves: Pick<SessionSaveHold, 'saveSession'>,
  history: SessionHistory,
): Promise<SessionSaveOutcome> {
  const codec: KeptSessionCodec = await import('@/storage/records/kept-session-record')
  /** Intent: the save's batch, from the kept summaries read at the save. */
  const changes: SessionChanges = (keptSummaries) =>
    keptSessionChanges(codec, history, keptSummaries, APP_VERSION)
  return saves.saveSession(changes)
}
