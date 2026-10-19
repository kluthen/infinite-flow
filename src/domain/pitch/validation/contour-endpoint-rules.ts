import type { Contour } from '../../controls/generation-controls'
import { isOwedTenseEnding } from './join-rules'
import type { PhraseFacts, PitchValidationFailure, SoundingFact } from './pitch-validation-types'

/**
 * Each bar's checkpoint is its first fresh attack on beat 1 or beat 3; beat 1 wins when both exist.
 * When a bar has no such attack, i.e. its only metrical anchor is a tie continuation, the checkpoint
 * falls back to the bar's first fresh attack at any tick. A bar with no fresh attack at all yields
 * `undefined`, which `contourFailures` reports as `missing_contour_checkpoint`.
 */
// @spec-link [[module_pitch_domain_validation]]
export function contourCheckpoints(
  attacks: readonly SoundingFact[],
): readonly (SoundingFact | undefined)[] {
  return [0, 1, 2, 3].map((bar) => {
    const inBar = attacks.filter((attack) => attack.barIndex === bar)
    return inBar.find((attack) => attack.strongOnset) ?? inBar[0]
  })
}

/** True when consecutive values never move against `direction` (equal values are allowed). */
function monotonic(values: readonly number[], direction: -1 | 1): boolean {
  return values.every(
    (value, index) => index === 0 || Math.sign(value - values[index - 1]!) !== -direction,
  )
}

/** Decide one contour shape over the four checkpoint MIDI values. */
// @spec-link [[module_pitch_domain_validation]]
export function contourHolds(contour: Contour, values: readonly number[]): boolean {
  const [first, , , last] = values as readonly [number, number, number, number]
  if (contour === 'Rising') return monotonic(values, 1) && last > first
  if (contour === 'Falling') return monotonic(values, -1) && last < first
  if (contour === 'Arch') {
    const peak = Math.max(...values)
    const at = values.indexOf(peak)
    return (
      (at === 1 || at === 2) &&
      values.filter((value) => value === peak).length === 1 &&
      monotonic(values.slice(0, at + 1), 1) &&
      monotonic(values.slice(at), -1) &&
      last < peak
    )
  }
  const directions = values
    .slice(1)
    .map((value, index) => Math.sign(value - values[index]!))
    .filter((direction) => direction !== 0)
  return new Set(directions).size > 1
}

/** Validate the selected contour over reconstructed checkpoints, never over planner annotations. */
// @spec-link [[module_pitch_domain_validation]]
export function contourFailures(facts: PhraseFacts): readonly PitchValidationFailure[] {
  const checkpoints = contourCheckpoints(facts.attacks)
  if (checkpoints.some((checkpoint) => checkpoint === undefined))
    return [{ code: 'missing_contour_checkpoint' }]
  const values = checkpoints.map((checkpoint) => checkpoint!.midi)
  return contourHolds(facts.context.policy.contour, values) ? [] : [{ code: 'contour_violation' }]
}

/**
 * The final sounding attack must be an open continuation: a chord tone of the final degree-5
 * harmony (tonal gentle/active), collection degree 5 (tonal static), or a non-tonic chord tone
 * (modal). A trailing rest is irrelevant because only sounding attacks are examined. A phrase
 * generated with carry-in may instead end on a tense note its next phrase resolves, when the
 * levels allow a free scale note there.
 */
// @spec-link [[module_pitch_domain_validation]]
// @spec-link [[rule_open_phrase_ending]]
export function endpointFailures(facts: PhraseFacts): readonly PitchValidationFailure[] {
  const final = facts.attacks.at(-1)
  if (!final) return [{ code: 'open_endpoint_violation' }]
  const endpoint = facts.context.harmony.endpoint
  const [tonic, , , , dominant] = facts.collectionPitchClasses
  const open =
    isOwedTenseEnding(facts, final) ||
    (endpoint.kind === 'tonal_degree_five_chord_tone'
      ? final.chordTone && final.harmony.triad.degree === 5
      : endpoint.kind === 'tonal_static_degree_five'
        ? final.chordTone && final.pitchClass === dominant
        : final.chordTone && final.pitchClass !== tonic)
  return open ? [] : [{ code: 'open_endpoint_violation', attackIndex: final.index }]
}
