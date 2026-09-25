import { collectionStep, contiguous } from './phrase-facts'
import type { AbstractTensionRequirement as TensionRequirement } from '../../harmony/harmony-types'
import type { PhraseFacts, PitchValidationFailure, SoundingFact } from './pitch-validation-types'

/** True when two consecutive moves go the same non-zero direction. */
function sameDirection(first: SoundingFact, middle: SoundingFact, last: SoundingFact): boolean {
  const before = Math.sign(middle.midi - first.midi)
  return before !== 0 && before === Math.sign(last.midi - middle.midi)
}

/** Ticks per beat and per strong onset (beat 1 and beat 3 of a bar), for the resolution delay. */
const TICKS_PER_BEAT = 4
const TICKS_PER_STRONG_ONSET = 8

/**
 * True when `next` starts no later than the maximum resolution delay allows after `previous`
 * releases: by the first beat boundary after it for `next_beat_or_bar` (the next bar's downbeat
 * from the bar's last beat), or by the first strong onset after it for
 * `next_strong_sounding_onset`. Rests may fill the gap.
 */
function inTime(
  delay: TensionRequirement['maximumResolutionDelay'],
  previous: SoundingFact,
  next: SoundingFact,
): boolean {
  const grid = delay === 'next_beat_or_bar' ? TICKS_PER_BEAT : TICKS_PER_STRONG_ONSET
  return next.start <= Math.floor(previous.end / grid) * grid + grid
}

/** True when attacks sound back to back under one unchanged harmony. */
function tightGroup(group: readonly SoundingFact[]): boolean {
  return group.every(
    (attack, index) =>
      index === 0 ||
      (contiguous(group[index - 1]!, attack) && attack.harmony === group[0]!.harmony),
  )
}

/** Free diatonic passing tone or neighbor around attack `index`, judged only from MIDI values. */
// @spec-link [[module_pitch_domain_validation]]
function freelyExplained(attacks: readonly SoundingFact[], index: number): boolean {
  const [before, note, after] = [attacks[index - 1], attacks[index]!, attacks[index + 1]]
  if (!before || !after || !collectionStep(before, note) || !collectionStep(note, after))
    return false
  const passing = sameDirection(before, note, after) && after.chordTone
  const neighbor = before.chordTone && after.midi === before.midi
  return passing || neighbor
}

/**
 * Re-derive the concrete binding's structural claims from rhythm and harmony: permitted kind and
 * region, member count, consecutive attacks under one harmony (rests allowed) with each member and
 * the target starting within the maximum resolution delay of the attack before it, a strong
 * appoggiatura onset, a preparation for passing/neighbor figures, and a target that precedes the
 * final sounding attack.
 */
// @spec-link [[module_pitch_domain_validation]]
function bindingStructureHolds(facts: PhraseFacts): boolean {
  const { harmony, tensionBinding: binding } = facts.context
  const requirement = harmony.tensionRequirement
  if (binding.figureKind === undefined)
    return requirement.requiredFigureCount === 0 && binding.attackIndices.length === 0
  const members = binding.attackIndices.map((index) => facts.attacks[index])
  const target = facts.attacks[binding.targetAttackIndex ?? -1]
  const expectedCount = binding.figureKind === 'two_note_diatonic_approach' ? 2 : 1
  if (!target || members.length !== expectedCount || members.some((member) => !member)) return false
  const first = members[0]!
  const preparation = facts.attacks[first.index - 1]
  const resolution = [...(members as SoundingFact[]), target]
  const group = [
    ...(binding.figureKind === 'diatonic_passing_or_neighbor' && preparation ? [preparation] : []),
    ...resolution,
  ]
  const delay = requirement.maximumResolutionDelay
  return (
    requirement.permittedFigureKinds.includes(binding.figureKind) &&
    (requirement.allowedBars as readonly number[]).includes(first.barIndex) &&
    group.every((attack, index) => index === 0 || attack.index === group[index - 1]!.index + 1) &&
    group.every((attack) => attack.harmony === first.harmony) &&
    resolution.every(
      (attack, index) => index === 0 || inTime(delay, resolution[index - 1]!, attack),
    ) &&
    (binding.figureKind !== 'appoggiatura' || first.strongOnset) &&
    (binding.figureKind !== 'diatonic_passing_or_neighbor' || preparation !== undefined) &&
    target.index < facts.attacks.length - 1
  )
}

/**
 * Check the bound figure's actual MIDI path. Members are diatonic, the member before the target is
 * a non-chord tone, and the target is a chord tone reached by collection step; the kind decides how the figure is entered.
 */
// @spec-link [[module_pitch_domain_validation]]
function boundFigureShapeHolds(facts: PhraseFacts): boolean {
  const binding = facts.context.tensionBinding
  const members = binding.attackIndices.map((index) => facts.attacks[index]!)
  const target = facts.attacks[binding.targetAttackIndex!]!
  const first = members[0]!
  const last = members.at(-1)!
  const before = facts.attacks[first.index - 1]
  // A member adjacent by step to a triad tone can never itself be a triad tone, so requiring the
  // last member to be a non-chord tone only matters for single-member figures.
  const settles =
    members.every((member) => member.inCollection) &&
    !last.chordTone &&
    target.chordTone &&
    collectionStep(last, target)
  if (!settles) return false
  if (binding.figureKind === 'appoggiatura')
    return before !== undefined && Math.abs(first.midi - before.midi) >= 3
  if (binding.figureKind === 'two_note_diatonic_approach')
    return collectionStep(first, last) && sameDirection(first, last, target)
  return before !== undefined && freelyExplained(facts.attacks, first.index)
}

/**
 * Find the Jazz chromatic ornament explaining the out-of-collection attack `index`, returning its
 * member indices. An approach is one pitch a semitone from the next attack; an enclosure is two
 * attacks a semitone above and below the attack after them, preferred over an approach so that
 * its diatonic member is covered too. Members are contiguous with the
 * chord-tone target under one harmony and last no longer than it.
 */
// @spec-link [[module_pitch_domain_validation]]
function chromaticOrnament(
  attacks: readonly SoundingFact[],
  index: number,
): readonly number[] | undefined {
  const shapes = [[index, index + 1], [index - 1, index], [index]]
  for (const memberIndices of shapes) {
    const members = memberIndices.map((member) => attacks[member])
    const target = attacks[memberIndices.at(-1)! + 1]
    if (!target?.chordTone || members.some((member) => !member)) continue
    const offsets = (members as SoundingFact[])
      .map((member) => member.midi - target.midi)
      .sort((a, b) => a - b)
    const shaped = members.length === 1 ? Math.abs(offsets[0]!) === 1 : offsets.join() === '-1,1'
    const shortEnough = members.every((member) => member!.durationTicks <= target.durationTicks)
    if (shaped && shortEnough && tightGroup([...(members as SoundingFact[]), target]))
      return memberIndices
  }
  return undefined
}

/**
 * Explain every non-chord tone. Neutral pitches stay in the collection; Jazz pitches outside it
 * must belong to a complete chromatic approach or enclosure. The bound figure must be structurally
 * sound and realized by its MIDI path. Remaining diatonic non-chord tones must be free passing
 * tones or neighbors.
 */
// @spec-link [[module_pitch_domain_validation]]
export function figureFailures(facts: PhraseFacts): readonly PitchValidationFailure[] {
  const failures: PitchValidationFailure[] = []
  const binding = facts.context.tensionBinding
  const bound = new Set(binding.attackIndices)
  const anchor = binding.attackIndices[0]
  if (!bindingStructureHolds(facts))
    failures.push({
      code: 'tension_binding_invalid',
      ...(anchor === undefined ? {} : { attackIndex: anchor }),
    })
  else if (binding.figureKind !== undefined && !boundFigureShapeHolds(facts))
    failures.push({ code: 'tension_figure_invalid', attackIndex: anchor! })

  const chromatic = new Set<number>()
  for (const attack of facts.attacks) {
    if (attack.inCollection) continue
    if (facts.context.policy.profile !== 'Jazz') {
      failures.push({ code: 'out_of_collection', attackIndex: attack.index })
      continue
    }
    const members = chromaticOrnament(facts.attacks, attack.index)
    if (!members || members.some((member) => bound.has(member)))
      failures.push({ code: 'invalid_chromatic_ornament', attackIndex: attack.index })
    else members.forEach((member) => chromatic.add(member))
  }

  for (const attack of facts.attacks) {
    const explained =
      attack.chordTone ||
      !attack.inCollection ||
      chromatic.has(attack.index) ||
      bound.has(attack.index) ||
      freelyExplained(facts.attacks, attack.index)
    if (!explained) failures.push({ code: 'unexplained_non_chord_tone', attackIndex: attack.index })
  }
  return failures
}
