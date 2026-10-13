/**
 * The held-layout fit check a session phrase takes, shared by the session's rolling display and
 * the Idle pre-generation queue: the phrase's written form, as the staff engraves it, planned in
 * the viewport a held staff layout gives within the window's budget. Loaded with the session
 * controller, outside the entry chunk.
 */
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import { BUILT_IN_INSTRUMENT_CLEF } from '@/domain/profile/instrument-clef'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import { heldViewport, type StaffLayout } from '@/notation/notation-layout-policy'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { FitCandidate } from '@/session/session-runner'
import type { StaffFitPlanner } from './workspace-session-controller-seams'

/** Intent: the written phrase of a session phrase, as the staff engraves it. */
// @spec-link [[module_session_display_fit]]
export function writtenPhraseOf(phrase: Pick<FitCandidate, 'intent' | 'outcome'>): WrittenPhrase {
  // The session instrument's clef: my instrument's reaches here with chunks 17 and 20.
  const clef = BUILT_IN_INSTRUMENT_CLEF
  return transformToWrittenPhrase(notationInputFromOutcome(phrase.outcome, phrase.intent, clef))
}

/**
 * Intent: whether `phrase` fits the `heldLayout` in the window's budget at `inputs`, with the
 * shared system-position size they carry, drawing nothing.
 */
// @spec-link [[module_session_display_fit]]
// @spec-link [[rule_session_layout_fixed_at_start]]
// @spec-link [[module_idle_pregeneration_queue]]
export function fitsHeldLayout(
  plan: StaffFitPlanner,
  phrase: WrittenPhrase,
  heldLayout: StaffLayout,
  inputs: StaffLayoutInputs,
): boolean {
  const viewport = heldViewport(inputs.viewport, heldLayout)
  return plan(phrase, inputs.containerWidthPx, viewport, inputs.systemPositionUnits).kind === 'fits'
}
