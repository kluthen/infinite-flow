/**
 * The most recent session after a reload, and its read for `Review last session`: from the kept
 * sessions' summaries the load read, the readable one with the latest start, under its key; read
 * back by that key into the session its Review draws. The summaries are decoded here, in the
 * session controller's own chunk; the whole kept-session codec loads on demand, at the read.
 */
import { decodeKeptSessionSummary } from '@/storage/records/kept-session-summary'
import type { KeptSession, StoredKeptSession } from '@/storage/records/kept-session-record'
import { StorageError, type StoredEntry } from '@/storage/storage-port'
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
 * is pinned, the key it was read by and whether its played notes are kept.
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
  })
}

/**
 * Intent: read the kept session under `key` and give the session its Review draws; nothing when
 * the device refuses the read or this version cannot read its records (unreadable, or written by a
 * newer version). Any other failure is a defect and rejects.
 */
// @spec-link [[req_kept_session_review]]
// @spec-link [[module_kept_session_codec]]
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export async function readKeptReviewedSession(
  read: (key: string) => Promise<StoredKeptSession>,
  key: string,
): Promise<ReviewedSession | null> {
  const [codec, stored] = await Promise.all([
    import('@/storage/records/kept-session-record'),
    read(key).catch((error: unknown) => {
      if (error instanceof StorageError) return null
      throw error
    }),
  ])
  if (stored === null) return null
  const reading = codec.decodeKeptSession(stored)
  return reading.reading === 'current' ? keptReviewedSession(reading.value, key) : null
}
