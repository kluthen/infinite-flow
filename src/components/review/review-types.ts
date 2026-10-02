import type { VexflowEngraverModule } from '@/notation/vexflow-engraver-loader'

/** The file format of the generated-notes export: a MusicXML score or a MIDI file. */
// @spec-link [[req_session_export]]
export type GeneratedNotesFormat = 'musicxml' | 'midi'

/**
 * One generated-notes export the player asked for: the format, and whether the MIDI file holds
 * the backing track (always false for MusicXML, which has none).
 */
// @spec-link [[req_session_export]]
export interface ExportRequest {
  readonly format: GeneratedNotesFormat
  readonly backingTrack: boolean
}

/** The part of the lazy engraver module the Review draws its phrases with. */
// @spec-link [[req_last_session_review]]
export type ReviewEngraver = Pick<VexflowEngraverModule, 'engraveWrittenPhrase'>

/** The system positions every `review-staff` reserves: how many, and each one's block size. */
// @spec-link [[req_last_session_review]]
export interface ReviewStaffReservation {
  readonly positionCount: 1 | 2
  readonly positionBlockPx: number
}
