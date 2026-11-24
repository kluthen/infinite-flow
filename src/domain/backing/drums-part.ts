/**
 * The Drums (foundation) part of a phrase's accompaniment, rendered from the phrase and its lead facts. Its rules
 * are not built yet: it places no note, which is always a valid part.
 */

import type { PartNote } from './accompaniment-part'

/** The Drums (foundation) part's notes for a phrase, in start order: none yet. */
// @spec-link [[req_accompaniment_parts]]
// @spec-link [[rule_part_rests_when_no_note_fits]]
export function drumsPart(): readonly PartNote[] {
  return []
}
