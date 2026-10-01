/**
 * What a session marks on the systems on screen, never on a unit fading out: each phrase named
 * once to assistive technology, on its first system shown (its other system hidden from it), the
 * described phrase's name pointing at the hidden description; and each phrase's overlays, drawn on
 * that phrase's systems only, the playhead band on the playhead's phrase alone.
 */
import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import { describeWrittenPhrase } from '@/domain/notation/score-description'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import { noteIdentityKey } from '@/notation/note-identity'
import { applyScoreOverlays, NO_SCORE_OVERLAYS } from '@/notation/score-overlays'
import {
  describedSessionSystem,
  sessionPhraseOverlays,
  type SessionStaff,
  type SessionSystem,
} from './session-staff'

/** A system on screen: its SVG and the slot it engraves. */
export interface MarkedSystem {
  readonly svg: SVGSVGElement
  readonly system: SessionSystem
}

/** One-line phrase summaries, computed once per phrase. */
const summaries = new WeakMap<WrittenPhrase, string>()

/** Intent: a phrase's one-line summary, computed once per phrase. */
function summaryOf(phrase: WrittenPhrase): string {
  const known = summaries.get(phrase)
  if (known !== undefined) return known
  const summary = describeWrittenPhrase(phrase).summary
  summaries.set(phrase, summary)
  return summary
}

/** Intent: the systems' SVGs grouped by phrase number, in screen order. */
function svgsByPhrase(shown: readonly MarkedSystem[]): Map<number, SVGSVGElement[]> {
  const groups = new Map<number, SVGSVGElement[]>()
  for (const { system, svg } of shown) {
    const group = groups.get(system.phraseNumber) ?? []
    group.push(svg)
    groups.set(system.phraseNumber, group)
  }
  return groups
}

/** Intent: the acknowledged notes of phrase `phraseNumber` that its systems on screen draw. */
// @spec-link [[module_session_rolling_display]]
// @spec-link [[module_notation_note_identity_overlays]]
function acknowledgedOnScreen(
  svgs: readonly SVGSVGElement[],
  phraseNumber: number,
  acknowledged: readonly ExpectedNoteIdentity[],
): ExpectedNoteIdentity[] {
  return acknowledged.filter((identity) => {
    if (identity.phraseNumber !== phraseNumber) return false
    const selector = `[data-note-id="${noteIdentityKey(identity)}"]`
    return svgs.some((svg) => svg.querySelector(selector) !== null)
  })
}

/**
 * Intent: name each phrase on screen once, on its first system shown, its other system hidden from
 * assistive technology; the described phrase's name points at the description.
 */
// @spec-link [[module_session_rolling_display]]
function labelPhrases(
  shown: readonly MarkedSystem[],
  described: number | null,
  descriptionId: string,
): void {
  const labelled = new Set<number>()
  for (const { svg, system } of shown) {
    svg.removeAttribute('aria-label')
    svg.removeAttribute('aria-describedby')
    svg.removeAttribute('aria-hidden')
    if (labelled.has(system.phraseNumber)) {
      svg.setAttribute('aria-hidden', 'true')
      continue
    }
    labelled.add(system.phraseNumber)
    svg.setAttribute('aria-label', summaryOf(system.phrase))
    if (system.phraseNumber === described) svg.setAttribute('aria-describedby', descriptionId)
  }
}

/**
 * Intent: redraw a session's marks on the systems on screen (top first) and return the phrase the
 * hidden description is to follow. Overlays are applied per phrase with that phrase's systems
 * only; a band naming a measure its phrase's systems on screen lack is a defect, and throws.
 */
// @spec-link [[module_session_rolling_display]]
// @spec-link [[module_notation_note_identity_overlays]]
export function drawSessionMarks(
  shown: readonly MarkedSystem[],
  staff: SessionStaff,
  acknowledged: readonly ExpectedNoteIdentity[],
  descriptionId: string,
): WrittenPhrase | null {
  const described = describedSessionSystem(staff)
  labelPhrases(shown, described?.phraseNumber ?? null, descriptionId)
  svgsByPhrase(shown).forEach((svgs, phraseNumber) => {
    const onScreen = acknowledgedOnScreen(svgs, phraseNumber, acknowledged)
    applyScoreOverlays(
      svgs,
      phraseNumber,
      sessionPhraseOverlays(phraseNumber, staff.playhead, onScreen),
    )
  })
  return described?.phrase ?? null
}

/**
 * Intent: take every overlay mark off a system leaving the screen, so a unit fading out never
 * carries the band.
 */
// @spec-link [[module_session_rolling_display]]
// @spec-link [[module_notation_note_identity_overlays]]
export function unmarkSystem(marked: MarkedSystem): void {
  applyScoreOverlays([marked.svg], marked.system.phraseNumber, NO_SCORE_OVERLAYS)
}
