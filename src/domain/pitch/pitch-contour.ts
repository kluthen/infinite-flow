import type { Contour } from '../controls/generation-controls'
import { deepFreeze } from '../events/deep-freeze'

const CHECKPOINT_COUNT = 4
const MIDI_SLOTS = 128

/**
 * The allowed direction patterns for Arch: peak on checkpoint 2 (`+ - ≤`) or checkpoint 3
 * (`≥ + -`), indexed by the step arriving at checkpoints 2, 3, and 4.
 */
const ARCH_PATTERNS: readonly (readonly (readonly number[])[])[] = [
  [[1], [-1], [0, -1]],
  [[0, 1], [1], [-1]],
]

/** The tag carried before any checkpoint direction has been observed. */
// @spec-link [[module_pitch_planner]]
export function initialContourTag(contour: Contour): number {
  return contour === 'Arch' ? 0b11 : 0
}

/**
 * Advance a contour tag by the direction arriving at checkpoint `step` (1-3). Rising/Falling tags
 * record a strict move, Wandering records the directions seen, and Arch keeps the still-possible
 * peak patterns. Returns undefined when the direction is illegal.
 */
// @spec-link [[module_pitch_planner]]
export function contourStep(
  contour: Contour,
  step: number,
  sign: number,
  tag: number,
): number | undefined {
  if (contour === 'Rising') return sign < 0 ? undefined : tag | (sign > 0 ? 1 : 0)
  if (contour === 'Falling') return sign > 0 ? undefined : tag | (sign < 0 ? 1 : 0)
  if (contour === 'Wandering') return tag | (sign > 0 ? 1 : sign < 0 ? 2 : 0)
  const next = ARCH_PATTERNS.reduce(
    (mask, pattern, index) =>
      (tag >> index) & 1 && pattern[step - 1]!.includes(sign) ? mask | (1 << index) : mask,
    0,
  )
  return next === 0 ? undefined : next
}

/** True when the tag after all four checkpoints satisfies the contour. */
// @spec-link [[module_pitch_planner]]
export function contourAccepts(contour: Contour, tag: number): boolean {
  if (contour === 'Wandering') return tag === 0b11
  return tag !== 0
}

/** Every tag value a contour can reach; bit masks index the suffix table below. */
function contourTags(contour: Contour): readonly number[] {
  return contour === 'Rising' || contour === 'Falling' ? [0, 1] : [0, 1, 2, 3]
}

/**
 * Static checkpoint facts compiled once per bound input. `suffix[k][midi]` is a bit mask of tags
 * from which checkpoints k+1..4 and the open endpoint can still be completed when checkpoint k
 * takes `midi`. `impossible` marks a phrase missing a checkpoint.
 */
// @spec-link [[module_pitch_planner]]
export interface ContourPlan {
  readonly contour: Contour
  readonly impossible: boolean
  readonly checkpointAttackIndices: readonly number[]
  readonly domains: readonly (readonly number[])[]
  readonly suffix: readonly (readonly number[])[]
  readonly finalAttackIndex: number
  readonly finalMidis: readonly number[]
}

/** Contour progress: the latest assigned checkpoint (-1 before the first) and its tag. */
// @spec-link [[module_pitch_planner]]
export interface ContourState {
  readonly lastCheckpoint: number
  readonly lastMidi: number
  readonly tag: number
}

/** Upper bound on the MIDI distance coverable by `intervals` more notes. */
// @spec-link [[module_pitch_planner]]
export type ReachFunction = (intervals: number) => number

/** True when some value in `values` lies within `distance` of `midi`. */
function within(values: readonly number[], midi: number, distance: number): boolean {
  return values.some((value) => Math.abs(value - midi) <= distance)
}

/** Tag mask feasible for the last checkpoint: accepted contour plus a reachable open endpoint. */
function lastSuffix(
  contour: Contour,
  midi: number,
  distance: number,
  finalMidis: readonly number[],
): number {
  if (!within(finalMidis, midi, distance)) return 0
  return contourTags(contour).reduce(
    (mask, tag) => (contourAccepts(contour, tag) ? mask | (1 << tag) : mask),
    0,
  )
}

/** Tag mask from which a later checkpoint value exists that keeps the contour completable. */
function innerSuffix(
  contour: Contour,
  step: number,
  midi: number,
  distance: number,
  nextDomain: readonly number[],
  nextSuffix: readonly number[],
): number {
  let mask = 0
  for (const tag of contourTags(contour))
    for (const next of nextDomain) {
      if (Math.abs(next - midi) > distance) continue
      const after = contourStep(contour, step, Math.sign(next - midi), tag)
      if (after !== undefined && (nextSuffix[next]! >> after) & 1) {
        mask |= 1 << tag
        break
      }
    }
  return mask
}

/**
 * Compile the checkpoint suffix table backward in O(checkpoints × values² × tags). `reach` must
 * over-estimate movement so the table never rejects a completable prefix.
 */
// @spec-link [[module_pitch_planner]]
export function compileContourPlan(input: {
  readonly contour: Contour
  readonly checkpointAttackIndices: readonly number[]
  readonly domains: readonly (readonly number[])[]
  readonly finalAttackIndex: number
  readonly finalMidis: readonly number[]
  readonly reach: ReachFunction
}): ContourPlan {
  const count = input.checkpointAttackIndices.length
  const suffix: number[][] = input.domains.map(() => new Array<number>(MIDI_SLOTS).fill(0))
  if (count === CHECKPOINT_COUNT)
    for (let k = CHECKPOINT_COUNT - 1; k >= 0; k -= 1) {
      const at = input.checkpointAttackIndices[k]!
      const nextAt = input.checkpointAttackIndices[k + 1] ?? input.finalAttackIndex
      const distance = input.reach(nextAt - at)
      for (const midi of input.domains[k]!)
        suffix[k]![midi] =
          k === CHECKPOINT_COUNT - 1
            ? lastSuffix(input.contour, midi, distance, input.finalMidis)
            : innerSuffix(
                input.contour,
                k + 1,
                midi,
                distance,
                input.domains[k + 1]!,
                suffix[k + 1]!,
              )
    }
  return deepFreeze({
    contour: input.contour,
    impossible: count !== CHECKPOINT_COUNT,
    checkpointAttackIndices: input.checkpointAttackIndices,
    domains: input.domains,
    suffix,
    finalAttackIndex: input.finalAttackIndex,
    finalMidis: input.finalMidis,
  })
}

// @spec-link [[module_pitch_planner]]
export const INITIAL_CONTOUR_STATE: ContourState = deepFreeze({
  lastCheckpoint: -1,
  lastMidi: 0,
  tag: 0,
})

/** Tag after assigning checkpoint `index` the value `midi`, or undefined when illegal. */
function tagAt(plan: ContourPlan, state: ContourState, index: number, midi: number) {
  if (index === 0) return initialContourTag(plan.contour)
  return contourStep(plan.contour, index, Math.sign(midi - state.lastMidi), state.tag)
}

/** True when checkpoint `index` may take `midi` from `state` and still complete. */
function checkpointViable(plan: ContourPlan, state: ContourState, index: number, midi: number) {
  const tag = tagAt(plan, state, index, midi)
  return tag !== undefined && ((plan.suffix[index]![midi]! >> tag) & 1) === 1
}

/**
 * Contour forward check for one note. A checkpoint note updates the tag and must keep the suffix
 * completable; any other note must still reach a viable next checkpoint, or the open endpoint once
 * every checkpoint is assigned, within `reach`.
 */
// @spec-link [[module_pitch_planner]]
export function advanceContour(
  plan: ContourPlan,
  state: ContourState,
  attackIndex: number,
  midi: number,
  reach: ReachFunction,
): ContourState | undefined {
  if (plan.impossible) return undefined
  const index = state.lastCheckpoint + 1
  const checkpointAt = plan.checkpointAttackIndices[index]
  if (checkpointAt === attackIndex) {
    if (!checkpointViable(plan, state, index, midi)) return undefined
    return deepFreeze({
      lastCheckpoint: index,
      lastMidi: midi,
      tag: tagAt(plan, state, index, midi)!,
    })
  }
  if (checkpointAt === undefined) {
    const distance = reach(plan.finalAttackIndex - attackIndex)
    return within(plan.finalMidis, midi, distance) ? state : undefined
  }
  const distance = reach(checkpointAt - attackIndex)
  const viable = plan.domains[index]!.some(
    (value) => Math.abs(value - midi) <= distance && checkpointViable(plan, state, index, value),
  )
  return viable ? state : undefined
}

/** True when every checkpoint is assigned and the selected contour holds. */
// @spec-link [[module_pitch_planner]]
export function contourComplete(plan: ContourPlan, state: ContourState): boolean {
  return (
    !plan.impossible &&
    state.lastCheckpoint === CHECKPOINT_COUNT - 1 &&
    contourAccepts(plan.contour, state.tag)
  )
}

/**
 * Pure contour feasibility over fixed or open checkpoint values, ignoring motion reach: a forward
 * set of reachable (value, tag) pairs, linear in checkpoints rather than a Cartesian product.
 */
// @spec-link [[module_pitch_planner]]
export function contourAssignable(
  contour: Contour,
  choices: readonly (readonly number[])[],
): boolean {
  if (choices.length !== CHECKPOINT_COUNT) return false
  let frontier = new Map<number, Set<number>>()
  for (const value of choices[0]!) frontier.set(value, new Set([initialContourTag(contour)]))
  for (let step = 1; step < CHECKPOINT_COUNT; step += 1) {
    const next = new Map<number, Set<number>>()
    for (const value of choices[step]!)
      for (const [prior, tags] of frontier)
        for (const tag of tags) {
          const after = contourStep(contour, step, Math.sign(value - prior), tag)
          if (after !== undefined) next.set(value, (next.get(value) ?? new Set()).add(after))
        }
    frontier = next
  }
  return [...frontier.values()].some((tags) =>
    [...tags].some((tag) => contourAccepts(contour, tag)),
  )
}
