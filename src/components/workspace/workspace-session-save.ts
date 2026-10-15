/**
 * The session's own save, at a session's end with a review, beside the session's ends: the
 * session that ended is kept under a key minted here, with its played notes when `Keep my played
 * notes` is on at its end and it holds one, and every older kept session that is not pinned goes
 * in the same batch. The changes made to a kept session after this save are beside it, in
 * ./kept-session-changes.ts. The visit's saves run it after the release of the settings held
 * during the session; the save policy reads the kept summaries at the save and applies the batch
 * in one transaction, then resolves what became of it. A save the device refused is retried by the
 * session's next favorite, pin, unpin or comment: the same save, under the same key, with the
 * facts held in memory then. The kept-session codec is loaded on demand, as the first draw never
 * needs it. A session cut short by reloading or closing the page is never saved: once the page is
 * going away, the save stops before its next step (after the codec loads, then before each of the
 * policy's transactions), abandoned, with nothing read or written.
 */
import type { PageLeaving } from '@/session/session-browser-ports'
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
 * How the session that ended is saved: under the key minted for it once, and whether its played
 * notes go with it.
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[rule_played_notes_kept_only_after_opt_in]]
export interface EndedSessionSave {
  readonly key: string
  readonly playedNotesKept: boolean
}

/**
 * Intent: how the session that ended is saved: its key minted once, and its played notes kept
 * exactly when `Keep my played notes` is on at its end and it holds a played note in a phrase (a
 * session without one has none to keep).
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[rule_played_notes_kept_only_after_opt_in]]
export function endedSessionSave(
  history: Pick<SessionHistory, 'startedAt' | 'sessionSeed' | 'phrases'>,
  keepPlayedNotes: boolean,
): EndedSessionSave {
  const holdsPlayedNote = history.phrases().some((phrase) => phrase.playedNotes.length > 0)
  return { key: keptSessionKey(history), playedNotesKept: keepPlayedNotes && holdsPlayedNote }
}

/**
 * The facts of a session held in memory that its save records beside its history: whether it is
 * pinned, the numbers of its favorite phrases and its comment. At a session's end none is set yet;
 * the retry of a failed save records them as they are at the retry.
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[rule_failed_save_never_disturbs_session]]
export interface HeldSessionFacts {
  readonly pinned: boolean
  readonly favorites: readonly number[]
  readonly comment: string
}

/** The facts of a session at its end: nothing pinned, chosen or commented yet. */
export const ENDED_SESSION_FACTS: HeldSessionFacts = Object.freeze({
  pinned: false,
  favorites: Object.freeze([]),
  comment: '',
})

/**
 * Intent: the one batch of the session's save, from the kept summaries read at the save: first
 * the deletion of the summary, body and played notes of every readable kept session that is not
 * pinned (a summary that does not decode, or that a newer app wrote, stays with its records), then
 * the new session's records under its key with the facts `held` gives (at its end nothing pinned,
 * chosen or commented yet; at a retry, the facts held in memory then), and its played notes only
 * when they are kept.
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[rule_most_recent_session_kept]]
// @spec-link [[rule_played_notes_kept_only_after_opt_in]]
export function keptSessionChanges(
  codec: KeptSessionCodec,
  history: SessionHistory,
  saving: EndedSessionSave,
  keptSummaries: readonly StoredEntry[],
  appVersion: string,
  held: HeldSessionFacts = ENDED_SESSION_FACTS,
): StorageChange[] {
  const deletions = keptSummaries.flatMap(({ key, value }) => {
    const reading = codec.decodeKeptSessionSummary(value)
    if (reading.reading !== 'current' || reading.value.pinned) return []
    return KEPT_SESSION_STORES.map((store): StorageChange => ({ kind: 'delete', store, key }))
  })
  const facts = {
    pinned: held.pinned,
    favorites: held.favorites,
    comment: held.comment,
    playedNotesKept: saving.playedNotesKept,
  }
  const records = codec.encodeKeptSession(history, facts, appVersion)
  const { key } = saving
  const writes: StorageChange[] = [
    { kind: 'write', store: 'sessionSummaries', key, record: records.summary },
    { kind: 'write', store: 'sessionBodies', key, record: records.body },
  ]
  if (records.playedNotes !== null) {
    writes.push({ kind: 'write', store: 'playedNotes', key, record: records.playedNotes })
  }
  return [...deletions, ...writes]
}

const SESSION_ABANDONED: SessionSaveOutcome = Object.freeze({ status: 'abandoned' })

/**
 * Intent: save the session that ended with a review through the visit's saves, which run it after
 * the release, as `saving` says, with the facts `held` gives: the codec loaded, the batch built
 * from the summaries read at the save. Its retry, after a refused save, is this same save under
 * the same key with the facts held in memory then, the sessions to delete read at the retry.
 * Resolves what became of that save; while saving is off, nothing is read, saved or deleted. Once
 * `page` is going away (checked after the codec loads, and handed on so the policy checks it
 * before each of its transactions), the save stops there, abandoned, with nothing more read or
 * written.
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[rule_failed_save_never_disturbs_session]]
// @spec-link [[rule_most_recent_session_kept]]
export async function saveEndedSession(
  saves: Pick<SessionSaveHold, 'saveSession'>,
  page: PageLeaving,
  history: SessionHistory,
  saving: EndedSessionSave,
  held: HeldSessionFacts = ENDED_SESSION_FACTS,
): Promise<SessionSaveOutcome> {
  const codec: KeptSessionCodec = await import('@/storage/records/kept-session-record')
  if (page.isGoingAway()) return SESSION_ABANDONED
  /** Intent: the save's batch, from the kept summaries read at the save. */
  const changes: SessionChanges = (keptSummaries) =>
    keptSessionChanges(codec, history, saving, keptSummaries, APP_VERSION, held)
  return saves.saveSession(changes, page.isGoingAway)
}
