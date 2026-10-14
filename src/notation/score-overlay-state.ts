/**
 * The overlay state the session shows on the engraved score, and the idle score's, apart from the
 * code that draws it (./score-overlays.ts): the workspace holds the state from its first draw,
 * while the drawing is only needed once a phrase is engraved, and loads with the staff then.
 */
import type { ExpectedNoteIdentity } from '../domain/acknowledgement/expected-note'
import type { MeasureIndex } from '../domain/events/measure'

/**
 * What the session shows on the engraved score. Every field names a note by its identity or a
 * measure by its index; none carries a pitch, so no overlay can draw a note the phrase lacks.
 */
// @spec-link [[module_notation_note_identity_overlays]]
// @spec-link [[rule_no_grading_or_mismatch_signal]]
export interface ScoreOverlays {
  /** The note the start marker points at, or null for no marker. */
  readonly startMarker: ExpectedNoteIdentity | null
  /** The measure the playhead band lies behind, or null for no band. */
  readonly playheadMeasure: MeasureIndex | null
  /** The notes acknowledged so far, each lit on its own parts. */
  readonly acknowledged: readonly ExpectedNoteIdentity[]
}

/** The idle score: no start marker, no playhead band, nothing acknowledged. */
// @spec-link [[module_notation_note_identity_overlays]]
export const NO_SCORE_OVERLAYS: ScoreOverlays = Object.freeze({
  startMarker: null,
  playheadMeasure: null,
  acknowledged: Object.freeze([]),
})
