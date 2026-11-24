/**
 * The arranger: one pure function from a phrase (its timeline, harmony, window, scale and seed)
 * and the accompaniment settings to the phrase's parts. The backing's two voices and the two
 * guides come from their own renderers, called unchanged and converted into parts; each of the
 * four accompaniment parts comes from its own function, given the lead facts read once. Reads no
 * clock, no browser API and nothing but its arguments.
 */

import { deepFreeze } from '../events/deep-freeze'
import { FOUR_FOUR_METER } from '../generation/generation-request-envelope'
import {
  backingParts,
  guideParts,
  makeAccompanimentPart,
  PART_VOICES,
  type ArrangerPhrase,
  type PartRenderer,
  type PartVoice,
  type RenderedAccompaniment,
} from './accompaniment-part'
import { renderBacking } from './backing-renderer'
import { counterMelodyPart } from './counter-melody-part'
import { drumsPart } from './drums-part'
import { fillsPart } from './fills-part'
import { renderGuide } from './guide-renderer'
import { leadFacts } from './lead-facts'
import { thirdsPart } from './thirds-part'

/** The version of the arranger's rules, kept with a session so a review renders the same parts. */
// @spec-link [[module_accompaniment_arranger]]
export const ARRANGER_VERSION = 1

/**
 * The accompaniment settings a phrase's parts are rendered under: the arranger version whose
 * rules render them. Which parts are on is not among them: every part is rendered on or off.
 */
// @spec-link [[module_accompaniment_arranger]]
export interface AccompanimentSettings {
  readonly arrangerVersion: typeof ARRANGER_VERSION
}

/** Typed failure for accompaniment settings the arranger cannot render under; never repaired. */
// @spec-link [[module_accompaniment_arranger]]
export class AccompanimentArrangerError extends Error {
  readonly kind = 'AccompanimentArrangerError' as const

  constructor(message: string) {
    super(message)
    this.name = 'AccompanimentArrangerError'
  }
}

/** Each accompaniment part's function, by its voice. */
const PART_RENDERERS: Readonly<Record<PartVoice, PartRenderer>> = {
  thirds: thirdsPart,
  'counter-melody': counterMelodyPart,
  fills: fillsPart,
  drums: drumsPart,
}

/**
 * Render a phrase's accompaniment: the bass, chords, melody guide and rhythm guide parts from the
 * backing and guide renderers, then the Thirds, Counter-melody, Fills and Drums parts, in
 * `ACCOMPANIMENT_VOICES` order. Deterministic and pure; the result is frozen. A part whose rules
 * place no note is empty. Throws an AccompanimentArrangerError on an arranger version other than
 * `ARRANGER_VERSION`, and lets the renderers' and the lead facts' typed failures through on a
 * malformed timeline or harmony.
 */
// @spec-link [[module_accompaniment_arranger]]
// @spec-link [[rule_parts_rendered_from_phrase_alone]]
// @spec-link [[rule_parts_deterministic]]
// @spec-link [[rule_part_rests_when_no_note_fits]]
export function arrangeAccompaniment(
  phrase: ArrangerPhrase,
  settings: AccompanimentSettings,
): RenderedAccompaniment {
  if (settings.arrangerVersion !== ARRANGER_VERSION) {
    throw new AccompanimentArrangerError(
      `arranger: version ${String(settings.arrangerVersion)} is not this arranger's version ${ARRANGER_VERSION}`,
    )
  }
  const lead = leadFacts(phrase.timeline, phrase.harmony)
  return deepFreeze([
    ...backingParts(renderBacking(phrase.harmony, FOUR_FOUR_METER)),
    ...guideParts(renderGuide(phrase.timeline, phrase.harmony)),
    ...PART_VOICES.map((voice) =>
      makeAccompanimentPart(voice, PART_RENDERERS[voice](phrase, lead)),
    ),
  ])
}
