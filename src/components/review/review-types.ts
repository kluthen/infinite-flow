import type { ExportScope } from '@/export/export-file'
import type { JamModeModule } from '@/components/workspace/load-jam-mode'
import type { VexflowEngraverModule } from '@/notation/vexflow-engraver-loader'

/** The file format of the generated-notes export: a MusicXML score or a MIDI file. */
// @spec-link [[req_session_export]]
export type GeneratedNotesFormat = 'musicxml' | 'midi'

/**
 * Which phrases the Review's exports hold: the whole session, or only its favorite phrases
 * (`review-scope`). It starts at the whole session at every Review and is never saved.
 */
// @spec-link [[rule_favorites_only_export]]
export type ReviewExportScope = ExportScope['kind']

/**
 * One generated-notes export the player asked for: the format, whether the MIDI file holds the
 * backing track (always false for MusicXML, which has none), and the scope it holds.
 */
// @spec-link [[req_session_export]]
// @spec-link [[rule_favorites_only_export]]
export interface ExportRequest {
  readonly format: GeneratedNotesFormat
  readonly backingTrack: boolean
  readonly scope: ReviewExportScope
}

/**
 * Why the played-notes file can't be made, the first that applies: in a Jam session, Jam's code
 * (the doodle's part of the file) could not load; under `Favorites only`, no favorite phrase (nor,
 * in a Jam, the doodle) holds a played note, or every played note in them is very short (in a
 * Jam, in the favorites and the doodle); under `Whole session`, every played note is very short.
 * Each leaves `Include very short notes` to say: only the very-short reasons go away when it is
 * turned on.
 */
// @spec-link [[rule_favorites_only_export]]
// @spec-link [[rule_played_notes_export_omits_stray_notes]]
// @spec-link [[rule_jam_code_loaded_on_demand]]
export type PlayedNotesUnavailable =
  | 'doodleNotLoaded'
  | 'noPlayedNoteInFavorites'
  | 'everyFavoriteNoteVeryShort'
  | 'everyFavoriteAndDoodleNoteVeryShort'
  | 'everyNoteVeryShort'

/**
 * Why the generated-notes file can't be made: a Jam session whose Jam code (the doodle's part of
 * the file) could not load.
 */
// @spec-link [[rule_jam_code_loaded_on_demand]]
export type GeneratedNotesUnavailable = 'doodleNotLoaded'

/**
 * The sentence a Jam session's Review gives when Jam's code could not load: in place of the doodle,
 * and after both exports, which need the doodle's part of their files (ux D339, D345).
 */
// @spec-link [[rule_jam_code_loaded_on_demand]]
export const DOODLE_NOT_LOADED_SENTENCE =
  "Your doodle can't be shown: part of the app didn't load. Check that you're online, then " +
  'open this session again.'

/** The part of the lazy engraver module the Review draws its phrases with. */
// @spec-link [[req_last_session_review]]
export type ReviewEngraver = Pick<VexflowEngraverModule, 'engraveWrittenPhrase'>

/** The system positions every `review-staff` reserves: how many, and each one's block size. */
// @spec-link [[req_last_session_review]]
export interface ReviewStaffReservation {
  readonly positionCount: 1 | 2
  readonly positionBlockPx: number
}

/**
 * Jam's code as a Jam session's Review has it: loading, unable to load (offline before the app's
 * files were kept), or loaded, with the doodle's staff it draws the doodle with, the suggestion's
 * row, what reads and makes Jam's settings, which the suggestion is judged against and sets, and
 * the doodle sections a Jam's export files open with.
 */
// @spec-link [[rule_jam_code_loaded_on_demand]]
export type ReviewJamCode =
  | { readonly state: 'loading' }
  | { readonly state: 'failed' }
  | {
      readonly state: 'loaded'
      readonly module: Pick<
        JamModeModule,
        | 'ReviewDoodle'
        | 'SuggestionRow'
        | 'createJamSettings'
        | 'decodeJamSettings'
        | 'exportDoodleSection'
        | 'exportPlayedDoodleSection'
      >
    }
