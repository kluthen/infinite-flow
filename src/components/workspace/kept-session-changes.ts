/**
 * How a kept session changes after its own save, beside that save (./workspace-session-save.ts):
 * each change is one batch through the visit's saves, in the line of the session saves, built
 * from what it reads at the change, so only the player's change is applied to what is stored and a
 * fact another tab changed since the load stays. A session is named by the key its save minted. A
 * change to a session no longer stored, or whose session-wide record cannot be read, writes
 * nothing and recreates nothing. Deleting every kept played note deletes every stored played-notes
 * record, an unreadable session's included, never reading a played note, and rewrites every
 * readable session-wide record that said they were kept. The kept-session codec is loaded on
 * demand, as the session's save loads it. Every other change to one session after its save (a
 * favorite, a pin, the comment, Delete session) is built the same way, through
 * `keptSummaryChanges`.
 */
import { APP_VERSION } from '@/storage/app-version'
import type { ExportableHistory } from '@/export/export-file'
import type {
  KeptChangeOutcome,
  KeptChanges,
  KeptRead,
  KeptReadOutcome,
  KeptRefusal,
} from '@/storage/save-policy'
import type { KeptSessionChanges } from '@/storage/settings-saver'
import type { StorageChange } from '@/storage/storage-port'

/** The kept-session codec's part a change after the save encodes with. */
export type KeptChangeCodec = Pick<
  typeof import('@/storage/records/kept-session-record'),
  'rewriteKeptSummary' | 'encodeKeptPlayedNotes'
>

/** The facts of a session-wide record a change may change, as the codec takes them. */
export type KeptSummaryEdit = Parameters<KeptChangeCodec['rewriteKeptSummary']>[1]

/** Intent: load the kept-session codec, which the first draw never needs. */
function loadCodec(): Promise<KeptChangeCodec> {
  return import('@/storage/records/kept-session-record')
}

/**
 * Intent: a change that reads the session-wide record under `key` at the change and, when it is
 * stored and readable, rewrites it with `edit` applied, the `alongside` changes in the same batch;
 * nothing otherwise. The reusable shape of every change to one session after its save.
 */
// @spec-link [[module_kept_session_changes]]
export function keptSummaryChanges(
  codec: KeptChangeCodec,
  key: string,
  edit: KeptSummaryEdit,
  alongside: readonly StorageChange[],
  appVersion: string,
): KeptChanges {
  return async (reader) => {
    const rewritten = codec.rewriteKeptSummary(
      await reader.read('sessionSummaries', key),
      edit,
      appVersion,
    )
    if (rewritten === null) return []
    return [{ kind: 'write', store: 'sessionSummaries', key, record: rewritten }, ...alongside]
  }
}

/**
 * Intent: the change that keeps the played notes of the session under `key`, read from its
 * history in memory: its played-notes record written, and its session-wide record saying so.
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[rule_played_notes_kept_only_after_opt_in]]
export function keepPlayedNotesChanges(
  codec: KeptChangeCodec,
  key: string,
  history: Pick<ExportableHistory, 'phrases'>,
  appVersion: string,
): KeptChanges {
  const record = codec.encodeKeptPlayedNotes(history, appVersion)
  const write: StorageChange = { kind: 'write', store: 'playedNotes', key, record }
  return keptSummaryChanges(codec, key, { playedNotesKept: true }, [write], appVersion)
}

/**
 * Intent: the change that deletes the played notes of the session under `key`, and nothing else:
 * its played-notes record deleted, and its session-wide record saying they are not kept.
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[rule_kept_played_notes_deletable]]
export function deletePlayedNotesChanges(
  codec: KeptChangeCodec,
  key: string,
  appVersion: string,
): KeptChanges {
  const deletion: StorageChange = { kind: 'delete', store: 'playedNotes', key }
  return keptSummaryChanges(codec, key, { playedNotesKept: false }, [deletion], appVersion)
}

/**
 * Intent: the change that deletes every kept played note: every stored played-notes record,
 * read by its key only (an unreadable session's included), and every readable session-wide record
 * that said they were kept rewritten to say they are not; an unreadable one is left as it is.
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[rule_kept_played_notes_deletable]]
export function deleteEveryPlayedNoteChanges(
  codec: KeptChangeCodec,
  appVersion: string,
): KeptChanges {
  return async (reader) => {
    const [keys, summaries] = await Promise.all([
      reader.readKeys('playedNotes'),
      reader.readKeyed('sessionSummaries'),
    ])
    const deletions = keys.map((key): StorageChange => ({
      kind: 'delete',
      store: 'playedNotes',
      key,
    }))
    const rewrites = summaries.flatMap(({ key, value }): StorageChange[] => {
      const kept = (value as { readonly playedNotesKept?: unknown } | null)?.playedNotesKept
      if (kept !== true) return []
      const record = codec.rewriteKeptSummary(value, { playedNotesKept: false }, appVersion)
      return record === null ? [] : [{ kind: 'write', store: 'sessionSummaries', key, record }]
    })
    return [...rewrites, ...deletions]
  }
}

/** Intent: the number of sessions whose played notes are kept: the played-notes records stored. */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[rule_kept_played_notes_deletable]]
export const keptPlayedNotesCount: KeptRead<number> = async (reader) =>
  (await reader.readKeys('playedNotes')).length

/** Intent: run a change built with the codec through the visit's saves; resolve its outcome. */
async function changed(
  saves: Pick<KeptSessionChanges, 'changeKept'>,
  build: (codec: KeptChangeCodec) => KeptChanges,
  refusal: KeptRefusal,
): Promise<KeptChangeOutcome> {
  return saves.changeKept(build(await loadCodec()), refusal)
}

/**
 * Intent: keep the played notes of the session under `key` after its save; a refusal is told
 * by the notice row, the change holding in memory.
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[rule_played_notes_kept_only_after_opt_in]]
export function keepSessionPlayedNotes(
  saves: Pick<KeptSessionChanges, 'changeKept'>,
  key: string,
  history: Pick<ExportableHistory, 'phrases'>,
): Promise<KeptChangeOutcome> {
  return changed(
    saves,
    (codec) => keepPlayedNotesChanges(codec, key, history, APP_VERSION),
    'notice',
  )
}

/** Intent: delete the played notes of the session under `key`; its sheet tells a refusal. */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[rule_kept_played_notes_deletable]]
export function deleteSessionPlayedNotes(
  saves: Pick<KeptSessionChanges, 'changeKept'>,
  key: string,
): Promise<KeptChangeOutcome> {
  return changed(saves, (codec) => deletePlayedNotesChanges(codec, key, APP_VERSION), 'caller')
}

/** Intent: delete every kept played note, across sessions; its sheet tells a refusal. */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[rule_kept_played_notes_deletable]]
export function deleteEveryKeptPlayedNote(
  saves: Pick<KeptSessionChanges, 'changeKept'>,
): Promise<KeptChangeOutcome> {
  return changed(saves, (codec) => deleteEveryPlayedNoteChanges(codec, APP_VERSION), 'caller')
}

/**
 * Intent: the number of sessions whose played notes are kept, read at the switch whichever tab
 * kept them; a refused read is told by the notice row.
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[rule_kept_played_notes_deletable]]
export function countSessionsWithKeptPlayedNotes(
  saves: Pick<KeptSessionChanges, 'readKept'>,
): Promise<KeptReadOutcome<number>> {
  return saves.readKept(keptPlayedNotesCount, 'notice')
}
