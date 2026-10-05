/**
 * The production engraver seams of a session: the measurement of a session phrase's staff fixed
 * parts (the written key signature phrase 1 is drawn with, measured by the lazily loaded engraver
 * exactly as the drawn staff carries it), and the staff planner the session's fit checks use.
 * Loaded with the session controller, outside the entry chunk; the engraver is already loaded by
 * then, since phrase 1 is on the staff.
 */
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import type { StaffFixedParts } from '@/notation/staff-fit-types'
import { loadVexflowEngraver } from '@/notation/vexflow-engraver-loader'
import type { StaffFitPlanner } from './workspace-session-controller-types'

/**
 * Intent: measure the staff's fixed parts for the key signature `phrase` is written in, once the
 * engraver and its fonts are ready. A load or font failure is the loader's own NotationError.
 */
// @spec-link [[rule_session_ends_when_staff_too_small]]
export async function measureSessionStaffFixedParts(
  phrase: WorkspaceSessionResult,
): Promise<StaffFixedParts> {
  const written = transformToWrittenPhrase(notationInputFromOutcome(phrase.outcome, phrase.intent))
  const engraver = await loadVexflowEngraver()
  await engraver.ensureNotationFonts()
  return engraver.measureStaffFixedParts(written.key.signature)
}

/**
 * Intent: the engraver's staff planner, once the engraver and its notation fonts are ready, since
 * the planning measures the chord symbols' text as the drawing does. A load or font failure is the
 * loader's or the font wait's own NotationError.
 */
// @spec-link [[rule_look_ahead_phrase_must_fit_staff]]
// @spec-link [[module_session_display_fit]]
export async function loadSessionStaffFitPlanner(): Promise<StaffFitPlanner> {
  const engraver = await loadVexflowEngraver()
  await engraver.ensureNotationFonts()
  return engraver.planWrittenPhraseFit
}
