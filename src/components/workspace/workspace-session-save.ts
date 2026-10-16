/**
 * The session's own save, at a session's end with a review, beside the session's ends: the
 * session that ended is kept under a key minted here, with its played notes when `Keep my played
 * notes` is on at its end and it holds one, and every older kept session that is not pinned goes
 * in the same batch, with every kept session whose summary is damaged, whose count the save tells. The changes made to a kept session after this save are beside it, in
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
import type { DamagedSessionReports } from './workspace-kept-sessions-seam'
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
 * Intent: the keys of the kept sessions the session's save deletes, from the kept summaries read
 * at the save: every readable one that is not pinned, and every damaged one (the codec reads its
 * summary as unreadable), pinned or not; one a newer app wrote stays with its records.
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[rule_most_recent_session_kept]]
function deletedBySave(
  codec: KeptSessionCodec,
  keptSummaries: readonly StoredEntry[],
): { readonly keys: string[]; readonly damaged: number } {
  let damaged = 0
  const keys = keptSummaries.flatMap(({ key, value }) => {
    const reading = codec.decodeKeptSessionSummary(value)
    if (reading.reading === 'unreadable') {
      damaged += 1
      return [key]
    }
    return reading.reading === 'current' && !reading.value.pinned ? [key] : []
  })
  return { keys, damaged }
}

/**
 * Intent: the one batch of the session's save, from the kept summaries read at the save: first
 * the deletion of the summary, body and played notes of every readable kept session that is not
 * pinned and of every damaged one (a summary a newer app wrote stays with its records), then
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
  const deletions = deletedBySave(codec, keptSummaries).keys.flatMap((key) =>
    KEPT_SESSION_STORES.map((store): StorageChange => ({ kind: 'delete', store, key })),
  )
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

/**
 * What became of the session's own save, as the session's end and its retry read it: the save
 * policy's outcome, a saved one also saying how many damaged kept sessions its batch deleted.
 */
// @spec-link [[module_kept_session_save]]
export type EndedSessionOutcome =
  | { readonly status: 'saved'; readonly damagedDeleted: number }
  | Exclude<SessionSaveOutcome, { readonly status: 'saved' }>

const SESSION_ABANDONED: EndedSessionOutcome = Object.freeze({ status: 'abandoned' })

/**
 * Intent: save the session that ended with a review through the visit's saves, which run it after
 * the release, as `saving` says, with the facts `held` gives: the codec loaded, the batch built
 * from the summaries read at the save. Its retry, after a refused save, is this same save under
 * the same key with the facts held in memory then, the sessions to delete read at the retry.
 * Resolves what became of that save, a saved one with how many damaged kept sessions its batch
 * deleted; while saving is off, nothing is read, saved or deleted. The
 * save takes its watch on `page` as it starts, before the codec loads: once the page is going away
 * then, or a `pagehide` fires after (checked after the codec loads, and handed on so the policy
 * checks it before each of its transactions), the save stops there, abandoned for good, with
 * nothing more read or written, even if the page comes back from the back-forward cache.
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
): Promise<EndedSessionOutcome> {
  const goingAway = page.watch()
  const codec: KeptSessionCodec = await import('@/storage/records/kept-session-record')
  if (goingAway()) return SESSION_ABANDONED
  let damagedDeleted = 0
  /** Intent: the save's batch, from the kept summaries read at the save. */
  const changes: SessionChanges = (keptSummaries) => {
    damagedDeleted = deletedBySave(codec, keptSummaries).damaged
    return keptSessionChanges(codec, history, saving, keptSummaries, APP_VERSION, held)
  }
  const outcome = await saves.saveSession(changes, goingAway)
  return outcome.status === 'saved' ? Object.freeze({ status: 'saved', damagedDeleted }) : outcome
}

/**
 * Intent: tell through `reports` how many damaged kept sessions the batch of a saved session's own
 * save deleted; nothing when it deleted none or was not saved (a refused one is told by its keep
 * line, as any failed session save).
 */
// @spec-link [[module_kept_session_save]]
export function tellDamagedDeleted(
  reports: Pick<DamagedSessionReports, 'tell'>,
  outcome: EndedSessionOutcome,
): void {
  if (outcome.status === 'saved' && outcome.damagedDeleted > 0)
    reports.tell({ status: 'deleted', count: outcome.damagedDeleted })
}
