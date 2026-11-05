/**
 * Whether the Review's played-notes file would hold a note, and why not, read from the session
 * history without loading the export code (./review-export.ts builds the file): the Review shows
 * `Export played notes` only for a history that holds a played note, disables it while the file
 * it asks for would hold none, and says why.
 */
import type { PlayedNotesUnavailable } from '@/components/review/review-types'
import {
  recordsWithoutVeryShortNotes,
  withoutVeryShortNotes,
} from '@/domain/played-notes/stray-notes'
import { phrasesInScope } from '@/export/favorites-selection'
import type { RecordedPlayedNote, ReviewedPhrase } from '@/session/session-history'
import type { PlayedNotesExportRequest } from './review-export'

/** What the played-notes readers read of a phrase: its number, start, tempo and played notes. */
type PlayedPhrase = Pick<ReviewedPhrase, 'phraseNumber' | 'startedAt' | 'tempo' | 'playedNotes'>

/**
 * Intent: whether the session holds a played note to export, very short ones included, read
 * without loading the export code, so the Review shows the played-notes action only when it can
 * make a file. History records
 * hold only the notes played within a phrase (session-history-played-notes.ts places a note in the
 * record whose phrase its onset falls in and drops one played before phrase 1 starts, the count-in
 * included), so a note played only before the first phrase never shows the action.
 */
// @spec-link [[req_played_notes_export]]
// @spec-link [[module_review_export_pipeline]]
export function historyHoldsPlayedNote(
  records: readonly Pick<ReviewedPhrase, 'playedNotes'>[],
): boolean {
  return records.some((record) => record.playedNotes.length > 0)
}

/**
 * Intent: whether the played-notes file `request` asks for would hold a note, read without loading
 * the export code: some played note in a phrase of its scope that is not very short, or any one
 * when very short notes are included, as the file's selection keeps them; in a Jam, a raw doodle
 * note counts the same way in either scope, the doodle never a favorite (`doodleNotes`: the Jam
 * part's raw doodle notes; none for a session that is no Jam). `Export played notes` is disabled
 * while it would not.
 */
// @spec-link [[rule_played_notes_export_omits_stray_notes]]
// @spec-link [[module_review_export_pipeline]]
// @spec-link [[rule_favorites_only_export]]
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
export function playedNotesFileHoldsNote(
  records: readonly PlayedPhrase[],
  request: PlayedNotesExportRequest,
  doodleNotes: readonly RecordedPlayedNote[] = [],
): boolean {
  const read = request.includeVeryShortNotes ? records : recordsWithoutVeryShortNotes(records)
  const doodle = request.includeVeryShortNotes ? doodleNotes : withoutVeryShortNotes(doodleNotes)
  return doodle.length > 0 || historyHoldsPlayedNote(phrasesInScope(read, request.scope))
}

/**
 * What the reasons read of a Jam session beside its phrases: its raw doodle notes, and whether
 * Jam's code, which builds the doodle's part of each file, failed to load for this Review.
 */
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
// @spec-link [[rule_jam_code_loaded_on_demand]]
export interface PlayedNotesJam {
  readonly doodleNotes: readonly RecordedPlayedNote[]
  readonly codeFailed: boolean
}

/**
 * Intent: why the played-notes file `request` asks for would hold no note, the first reason that
 * applies, or null when it holds one. In a Jam whose code could not load, that comes first. Under
 * favorites only, no favorite phrase holding a played note (very short ones counted) and, in a Jam,
 * no raw doodle note either, then every one of theirs very short (in a Jam, its favorites' and its
 * doodle's); under the whole session, every played note very short.
 */
// @spec-link [[rule_favorites_only_export]]
// @spec-link [[rule_played_notes_export_omits_stray_notes]]
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
// @spec-link [[rule_jam_code_loaded_on_demand]]
export function playedNotesUnavailable(
  records: readonly PlayedPhrase[],
  request: PlayedNotesExportRequest,
  jam: PlayedNotesJam | null = null,
): PlayedNotesUnavailable | null {
  if (jam?.codeFailed === true) return 'doodleNotLoaded'
  const doodleNotes = jam?.doodleNotes ?? []
  if (playedNotesFileHoldsNote(records, request, doodleNotes)) return null
  if (request.scope.kind === 'wholeSession') return 'everyNoteVeryShort'
  if (doodleNotes.length === 0 && !historyHoldsPlayedNote(phrasesInScope(records, request.scope)))
    return 'noPlayedNoteInFavorites'
  return jam === null ? 'everyFavoriteNoteVeryShort' : 'everyFavoriteAndDoodleNoteVeryShort'
}
