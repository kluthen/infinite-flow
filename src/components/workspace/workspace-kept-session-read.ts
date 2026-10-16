/**
 * The most recent session after a reload, and its read for `Review last session`: from the kept
 * sessions' summaries the load read, the readable one with the latest start, under its key; read
 * back by that key into the session its Review draws, or told damaged, or not read. Beside them,
 * the batches that delete damaged kept sessions while the visit saves: the load's clean-up, which
 * reads the summaries again at the change, and an opening's, which reads the session again. The
 * summaries are decoded here, in the session controller's own chunk, never the entry chunk; the
 * whole kept-session codec loads on demand, at the read.
 */
import type { KeptChanges } from '@/storage/save-policy'
import { decodeKeptSessionSummary } from '@/storage/records/kept-session-summary'
import type { KeptSession, StoredKeptSession } from '@/storage/records/kept-session-record'
import {
  StorageError,
  type StorageChange,
  type StoredEntry,
  type StoreName,
} from '@/storage/storage-port'
import type { MostRecentSession, ReviewedSession } from './workspace-session-controller-types'

/**
 * Intent: the most recent session after a reload: the kept session whose summary this version
 * reads, with the latest start, under its key; none when no summary is readable (one a newer
 * version wrote, or one that does not decode, is passed over).
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[rule_most_recent_session_kept]]
// @spec-link [[module_saved_data_loader]]
export function mostRecentKept(summaries: readonly StoredEntry[]): MostRecentSession | null {
  let latest: { readonly key: string; readonly startedAt: number } | null = null
  for (const { key, value } of summaries) {
    const reading = decodeKeptSessionSummary(value)
    if (reading.reading !== 'current') continue
    if (latest === null || reading.value.startedAt > latest.startedAt) {
      latest = { key, startedAt: reading.value.startedAt }
    }
  }
  return latest === null ? null : Object.freeze({ kind: 'kept', key: latest.key })
}

/**
 * Intent: the session a decoded kept session's Review draws: its phrases and start, the
 * instrument's name its summary holds (never looked up by id), the tempo it reached, whether it
 * is pinned, the key it was read by, whether its played notes are kept, its favorite phrases and
 * its comment.
 */
// @spec-link [[req_kept_session_review]]
// @spec-link [[module_kept_session_codec]]
function keptReviewedSession({ summary, phrases }: KeptSession, key: string): ReviewedSession {
  const history = Object.freeze({
    phrases: () => phrases,
    phraseCount: phrases.length,
    startedAt: summary.startedAt,
  })
  return Object.freeze({
    history,
    instrumentName: summary.instrument.displayName,
    tempoReached: summary.tempoReached,
    keeping: summary.pinned ? 'pinned' : 'not-pinned',
    key,
    playedNotesKept: summary.playedNotesKept,
    pinned: summary.pinned,
    favorites: Object.freeze(
      phrases.filter((phrase) => phrase.favorite).map((phrase) => phrase.phraseNumber),
    ),
    comment: summary.comment,
  })
}

/**
 * What the read of a kept session for its Review gives: the session; damaged, the kept-session
 * codec reading its records as unreadable (any of them unreadable, refused in content, missing or
 * disagreeing with another); or not read, the device refusing the read, its records all absent
 * (deleted meanwhile), or a newer version having written them. Only a damaged one is deleted.
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[req_kept_session_review]]
export type KeptSessionRead =
  | { readonly kind: 'read'; readonly session: ReviewedSession }
  | { readonly kind: 'damaged' }
  | { readonly kind: 'not-read' }

const DAMAGED: KeptSessionRead = Object.freeze({ kind: 'damaged' })
const NOT_READ: KeptSessionRead = Object.freeze({ kind: 'not-read' })

/** Intent: whether none of a kept session's records is stored: it was deleted meanwhile. */
function allAbsent(stored: StoredKeptSession): boolean {
  return (
    stored.summary === undefined && stored.body === undefined && stored.playedNotes === undefined
  )
}

/**
 * Intent: read the kept session under `key` and give the session its Review draws; damaged when
 * this version reads its records as unreadable; not read when the device refuses the read, none
 * of its records is stored, or a newer version wrote them. Any other failure is a defect and
 * rejects.
 */
// @spec-link [[req_kept_session_review]]
// @spec-link [[module_kept_session_codec]]
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export async function readKeptReviewedSession(
  read: (key: string) => Promise<StoredKeptSession>,
  key: string,
): Promise<KeptSessionRead> {
  const [codec, stored] = await Promise.all([
    import('@/storage/records/kept-session-record'),
    read(key).catch((error: unknown) => {
      if (error instanceof StorageError) return null
      throw error
    }),
  ])
  if (stored === null || allAbsent(stored)) return NOT_READ
  const reading = codec.decodeKeptSession(stored)
  if (reading.reading === 'unreadable') return DAMAGED
  if (reading.reading === 'newer') return NOT_READ
  return Object.freeze({ kind: 'read', session: keptReviewedSession(reading.value, key) })
}

/** The stores a kept session's records live in, each under the session's key. */
const KEPT_SESSION_STORES: readonly StoreName[] = [
  'sessionSummaries',
  'sessionBodies',
  'playedNotes',
]

/** Intent: the deletion of the session under `key`: its summary, body and played notes. */
function deletionsOf(key: string): StorageChange[] {
  return KEPT_SESSION_STORES.map((store): StorageChange => ({ kind: 'delete', store, key }))
}

/**
 * Intent: the keys of the kept sessions whose summary is damaged, the codec reading it as
 * unreadable; a summary a newer version wrote is never damaged.
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[module_kept_session_codec]]
export function damagedSummaryKeys(summaries: readonly StoredEntry[]): string[] {
  return summaries.flatMap(({ key, value }) =>
    decodeKeptSessionSummary(value).reading === 'unreadable' ? [key] : [],
  )
}

/** What the load's clean-up found at its read: every summary stored, and the damaged ones' keys. */
export interface CleanUpReading {
  readonly summaries: readonly StoredEntry[]
  readonly damaged: readonly string[]
}

/** The load's clean-up: its batch, and what its latest read found (null before it read). */
export interface DamagedSessionsCleanUp {
  readonly changes: KeptChanges
  readonly found: () => CleanUpReading | null
}

/**
 * Intent: the load's clean-up of damaged kept sessions: at the change, the summaries read again,
 * and one batch deleting the summary, body and played notes of every kept session whose summary
 * is damaged then (one damaged since the load included); an empty batch when none is. What the
 * read found is kept, its latest read when the change reads again after a session.
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[module_kept_session_changes]]
export function damagedSessionsCleanUp(): DamagedSessionsCleanUp {
  let found: CleanUpReading | null = null
  return {
    changes: async (reader) => {
      const summaries = await reader.readKeyed('sessionSummaries')
      const damaged = damagedSummaryKeys(summaries)
      found = Object.freeze({ summaries, damaged })
      return damaged.flatMap(deletionsOf)
    },
    found: () => found,
  }
}

/** The kept-session codec's part an opening's deletion decodes with. */
export type DamagedSessionCodec = Pick<
  typeof import('@/storage/records/kept-session-record'),
  'decodeKeptSession'
>

/**
 * Intent: the batch that deletes the kept session under `key` once its opening found it damaged:
 * its records read again at the change, and its summary, body and played notes deleted when they
 * still read as damaged; nothing when none is stored any more, or they now read otherwise.
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[module_kept_session_changes]]
export function damagedSessionChanges(codec: DamagedSessionCodec, key: string): KeptChanges {
  return async (reader) => {
    const [summary, body, playedNotes] = await Promise.all(
      KEPT_SESSION_STORES.map((store) => reader.read(store, key)),
    )
    const stored = { summary, body, playedNotes }
    if (allAbsent(stored) || codec.decodeKeptSession(stored).reading !== 'unreadable') return []
    return deletionsOf(key)
  }
}
