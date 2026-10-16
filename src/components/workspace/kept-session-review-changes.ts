/**
 * The changes a Review makes to a kept session after its own save, in the shape of the played-notes
 * changes beside them (./kept-session-changes.ts): a favorite mark, a pin or unpin, the comment and
 * Delete session. Each is one batch through the visit's saves, in the line of the session saves,
 * built from what it reads at the change, so only the player's change is applied to what is stored
 * and a fact another tab changed since the load stays. A favorite mark rewrites the body, where the
 * marks live, and the session-wide record with the favorites count the body then holds (marking
 * also pins); a pin and the comment rewrite the session-wide record only; Delete session deletes
 * the session-wide record, the body and the played notes together. A change to a session no longer
 * stored, or whose records cannot be read, writes nothing and recreates nothing. A pin, an unpin
 * and Delete session also come from a session list row, for a kept session not held in memory,
 * keyed by the row: neither reads the session's body. Delete every session, from Your data, names
 * no session: it deletes every key the three kept-session stores hold, read by its key only, so a
 * session with no row goes too. Deleting my instrument, or erasing its sessions, deletes the
 * sessions it counted by their keys, in its own batch. The codec is loaded on demand, as the
 * session's save loads it.
 */
import { APP_VERSION } from '@/storage/app-version'
import type { KeptChangeOutcome, KeptChanges, KeptRefusal } from '@/storage/save-policy'
import type { KeptSessionChanges } from '@/storage/settings-saver'
import type { StorageChange } from '@/storage/storage-port'
import { keptSummaryChanges } from './kept-session-changes'

/** The kept-session codec's part a Review's change encodes with. */
export type KeptReviewCodec = Pick<
  typeof import('@/storage/records/kept-session-record'),
  | 'rewriteKeptSummary'
  | 'encodeKeptPlayedNotes'
  | 'rewriteKeptBodyFavorite'
  | 'decodeKeptSessionSummary'
>

/** Intent: load the kept-session codec, which the first draw never needs. */
function loadCodec(): Promise<KeptReviewCodec> {
  return import('@/storage/records/kept-session-record')
}

/**
 * Intent: the change that marks phrase `phraseNumber` of the session under `key` a favorite, or
 * removes its mark: its body rewritten with the mark, and its session-wide record with the
 * favorites count the body then holds, pinned too when marking; nothing unless both are stored
 * and readable.
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[req_favorite_phrases]]
// @spec-link [[rule_favorite_pins_session]]
export function favoriteChanges(
  codec: KeptReviewCodec,
  key: string,
  phraseNumber: number,
  favorite: boolean,
  appVersion: string,
): KeptChanges {
  return async (reader) => {
    const [summary, body] = await Promise.all([
      reader.read('sessionSummaries', key),
      reader.read('sessionBodies', key),
    ])
    const marked = codec.rewriteKeptBodyFavorite(body, phraseNumber, favorite, appVersion)
    if (marked === null) return []
    const { favoritesCount } = marked
    const edit = favorite ? { favoritesCount, pinned: true } : { favoritesCount }
    const record = codec.rewriteKeptSummary(summary, edit, appVersion)
    if (record === null) return []
    return [
      { kind: 'write', store: 'sessionSummaries', key, record },
      { kind: 'write', store: 'sessionBodies', key, record: marked.body },
    ]
  }
}

/**
 * Intent: the change that pins or unpins the session under `key`, from its Review or its list row:
 * its session-wide record read and rewritten saying so, and nothing else read or written.
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[rule_pinned_session_kept]]
// @spec-link [[module_kept_session_reach]]
export function pinnedChanges(
  codec: KeptReviewCodec,
  key: string,
  pinned: boolean,
  appVersion: string,
): KeptChanges {
  return keptSummaryChanges(codec, key, { pinned }, [], appVersion)
}

/**
 * Intent: the change that sets the comment of the session under `key` (empty: none): its
 * session-wide record rewritten with it, and nothing else.
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[rule_session_comment]]
export function commentChanges(
  codec: KeptReviewCodec,
  key: string,
  comment: string,
  appVersion: string,
): KeptChanges {
  return keptSummaryChanges(codec, key, { comment }, [], appVersion)
}

/** The stores a kept session's records live in, each under the session's key. */
const KEPT_SESSION_STORES = ['sessionSummaries', 'sessionBodies', 'playedNotes'] as const

/**
 * Intent: the change that deletes the session under `key`, from its Review or its list row: its
 * session-wide record, its body and its played notes in one batch, when its session-wide record
 * is stored and readable (the only record read); nothing otherwise (gone already, or left as it
 * is for the deletion of damaged sessions).
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[module_kept_session_reach]]
// @spec-link [[req_kept_session_list]]
export function deleteSessionChanges(codec: KeptReviewCodec, key: string): KeptChanges {
  return async (reader) => {
    const stored = await reader.read('sessionSummaries', key)
    if (stored === undefined || codec.decodeKeptSessionSummary(stored).reading !== 'current')
      return []
    return KEPT_SESSION_STORES.map((store): StorageChange => ({ kind: 'delete', store, key }))
  }
}

/**
 * Intent: the change that deletes every kept session: every key the session-wide records, the
 * bodies and the played notes hold, read by its key only (never a record), deleted in one batch,
 * a session whose session-wide record is missing or cannot be read included; an empty batch when
 * nothing is stored. No key is filtered by the version that wrote it (spec D333).
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[req_your_data]]
export const deleteEverySessionChanges: KeptChanges = async (reader) => {
  const perStore = await Promise.all(
    KEPT_SESSION_STORES.map(async (store) =>
      (await reader.readKeys(store)).map((key): StorageChange => ({ kind: 'delete', store, key })),
    ),
  )
  return perStore.flat()
}

/**
 * Intent: the deletes of the sessions under `keys`, for the batch that deletes or changes my
 * instrument (spec D326): each session's session-wide record, body and played notes, built as
 * `Delete session` builds them, so a counted session gone from the device adds nothing. Named by
 * the counted keys, never by keys rebuilt from their facts; the codec loads only when a key is
 * given.
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[entity_my_instrument_record]]
export function keptSessionsDeletes(keys: readonly string[]): KeptChanges {
  return async (reader) => {
    if (keys.length === 0) return []
    const codec = await loadCodec()
    const perKey = await Promise.all(keys.map((key) => deleteSessionChanges(codec, key)(reader)))
    return perKey.flat()
  }
}

/** Intent: run a change built with the codec through the visit's saves; resolve its outcome. */
async function changed(
  saves: Pick<KeptSessionChanges, 'changeKept'>,
  build: (codec: KeptReviewCodec) => KeptChanges,
  refusal: KeptRefusal,
): Promise<KeptChangeOutcome> {
  return saves.changeKept(build(await loadCodec()), refusal)
}

/**
 * Intent: mark phrase `phraseNumber` of the session under `key` a favorite, or remove the mark,
 * after its save; a refusal is told by the notice row, the change holding in memory.
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[req_favorite_phrases]]
export function changeKeptFavorite(
  saves: Pick<KeptSessionChanges, 'changeKept'>,
  key: string,
  phraseNumber: number,
  favorite: boolean,
): Promise<KeptChangeOutcome> {
  return changed(
    saves,
    (codec) => favoriteChanges(codec, key, phraseNumber, favorite, APP_VERSION),
    'notice',
  )
}

/** Intent: pin or unpin the session under `key` after its save; the notice row tells a refusal. */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[rule_pinned_session_kept]]
export function changeKeptPinned(
  saves: Pick<KeptSessionChanges, 'changeKept'>,
  key: string,
  pinned: boolean,
): Promise<KeptChangeOutcome> {
  return changed(saves, (codec) => pinnedChanges(codec, key, pinned, APP_VERSION), 'notice')
}

/** Intent: set the comment of the session under `key`; the notice row tells a refusal. */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[rule_session_comment]]
export function changeKeptComment(
  saves: Pick<KeptSessionChanges, 'changeKept'>,
  key: string,
  comment: string,
): Promise<KeptChangeOutcome> {
  return changed(saves, (codec) => commentChanges(codec, key, comment, APP_VERSION), 'notice')
}

/** Intent: delete the session under `key` and its records; its sheet tells a refusal. */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[req_kept_session_list]]
export function deleteKeptSession(
  saves: Pick<KeptSessionChanges, 'changeKept'>,
  key: string,
): Promise<KeptChangeOutcome> {
  return changed(saves, (codec) => deleteSessionChanges(codec, key), 'caller')
}

/**
 * Intent: delete every kept session and its records, a session with no row included; its
 * confirmation tells a refusal. Resolves `unchanged` when nothing is stored.
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[req_your_data]]
export function deleteEveryKeptSession(
  saves: Pick<KeptSessionChanges, 'changeKept'>,
): Promise<KeptChangeOutcome> {
  return saves.changeKept(deleteEverySessionChanges, 'caller')
}
