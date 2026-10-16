/**
 * The size of a Review's system positions (ux D290, spec D296): the larger of the workspace
 * staff's shared size and the size the session's own instrument needs in the clef its phrases were
 * played in, so a session played in a clef my instrument no longer has, or with a range it no
 * longer has, gets its phrases drawn whole at the same notation size in a taller position. One size
 * for the whole Review, from the session's own data, known before its first engraving.
 */
import { planSystemPositionUnits } from '@/notation/notation-layout-policy'
import type { ReviewedPhrase } from '@/session/session-history'

/**
 * Intent: the Review's system-position size, in engraving units at scale 1: `shared`, or more when
 * a phrase's own instrument (its written range, from the profile its intent carries) needs more in
 * the clef the phrase was played in, as the shared size is planned (`planSystemPositionUnits`).
 */
// @spec-link [[module_notation_layout_preflight]]
// @spec-link [[req_kept_session_review]]
export function reviewSystemPositionUnits(
  shared: number,
  records: readonly Pick<ReviewedPhrase, 'intent' | 'clef'>[],
): number {
  let units = shared
  for (const { intent, clef } of records) {
    const { concertRange, transposition } = intent.instrumentProfile
    const writtenRange = {
      minMidi: concertRange.minMidi + transposition.chromatic,
      maxMidi: concertRange.maxMidi + transposition.chromatic,
    }
    units = Math.max(units, planSystemPositionUnits({ writtenRange, clef }))
  }
  return units
}
