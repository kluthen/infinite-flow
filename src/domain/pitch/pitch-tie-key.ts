import { fnv1a32 } from '../random/hash32'

// @spec-link [[module_pitch_planner]]
export interface PitchTieSubject {
  readonly seed: number
  readonly decisionIdentity: string
  readonly candidateStableIdentity: string
}

// @spec-link [[module_pitch_planner]]
export type PitchTieKeyFactory = (subject: PitchTieSubject) => number

/** The explicit unsigned comparison prevents signed-subtraction ordering drift at bit 31. */
// @spec-link [[module_pitch_planner]]
export function pitchTieKey(subject: PitchTieSubject): number {
  return fnv1a32(
    `infinite-flow/pitch-tie/v1|${subject.seed}|${subject.decisionIdentity}|${subject.candidateStableIdentity}`,
  )
}

// @spec-link [[module_pitch_planner]]
export function compareUnsignedPitchTie(
  left: PitchTieSubject,
  right: PitchTieSubject,
  leftMidi: number,
  rightMidi: number,
  leftEnumerationIndex: number,
  rightEnumerationIndex: number,
  keyFactory: PitchTieKeyFactory = pitchTieKey,
): number {
  const leftKey = keyFactory(left) >>> 0
  const rightKey = keyFactory(right) >>> 0
  if (leftKey !== rightKey) return leftKey < rightKey ? -1 : 1
  if (leftMidi !== rightMidi) return leftMidi - rightMidi
  return leftEnumerationIndex - rightEnumerationIndex
}
