import { deepFreeze } from '../events/deep-freeze'
import type { PitchCandidate, PitchNoteFacts, PitchReservation } from './pitch-types'

/** A figure path in progress: the next expected position and the fixed MIDI values. */
// @spec-link [[entity_pitch_candidate_domain]]
export interface ActiveFigurePath {
  readonly identity: string
  readonly bindingIdentity?: string
  /** Member attack indices followed by the target attack index. */
  readonly attackIndices: readonly number[]
  /** Member MIDI values followed by the target MIDI value. */
  readonly midis: readonly number[]
  /** Index into `attackIndices`/`midis` of the next note to confirm. */
  readonly position: number
}

/**
 * A free passing tone or neighbor waiting for the note that explains it. `before` is the note
 * that approached it and `midi` is the free tone itself.
 */
// @spec-link [[entity_pitch_candidate_domain]]
export interface FreeObligation {
  readonly before: PitchNoteFacts
  readonly midi: number
}

/** Figure progress between attacks. */
// @spec-link [[entity_pitch_candidate_domain]]
export interface FigureState {
  readonly path?: ActiveFigurePath
  readonly free?: FreeObligation
  readonly boundFulfilled: boolean
}

// @spec-link [[entity_pitch_candidate_domain]]
export type FigureResult =
  | { readonly kind: 'rejected'; readonly reason: string }
  | { readonly kind: 'accepted'; readonly state: FigureState }

/** The facts the figure reducer reads about the attack being assigned. */
// @spec-link [[entity_pitch_candidate_domain]]
export interface FigureStep {
  readonly attackIndex: number
  readonly isFinal: boolean
  readonly prior?: PitchNoteFacts
  readonly note: PitchNoteFacts
  readonly candidate: PitchCandidate
}

/** Initial figure state; a phrase without a bound figure starts already fulfilled. */
// @spec-link [[entity_pitch_candidate_domain]]
export function initialFigureState(bindingRequired: boolean): FigureState {
  return deepFreeze({ boundFulfilled: !bindingRequired })
}

/** Build a frozen rejection carrying a figure reason. */
function reject(reason: string): FigureResult {
  return deepFreeze({ kind: 'rejected', reason })
}

/** True for a 1-2 semitone move between two collection members. */
// @spec-link [[rule_neutral_profile_diatonic_pitches]]
export function collectionStep(
  first: Pick<PitchNoteFacts, 'midi' | 'inCollection'>,
  second: Pick<PitchNoteFacts, 'midi' | 'inCollection'>,
): boolean {
  const distance = Math.abs(second.midi - first.midi)
  return first.inCollection && second.inCollection && distance >= 1 && distance <= 2
}

/**
 * True when `after` explains a free tone approached from `before`: it continues by collection step
 * in the same direction onto a chord tone (passing) or returns to a chord-tone `before` (neighbor).
 */
// @spec-link [[entity_pitch_candidate_domain]]
export function freeToneResolves(
  before: PitchNoteFacts,
  tone: Pick<PitchNoteFacts, 'midi' | 'inCollection'>,
  after: PitchNoteFacts,
): boolean {
  if (!collectionStep(before, tone) || !collectionStep(tone, after)) return false
  const passing = Math.sign(tone.midi - before.midi) === Math.sign(after.midi - tone.midi)
  return (passing && after.chordTone) || (before.chordTone && after.midi === before.midi)
}

/** Confirm the note against the active path; returns the rest of the path or a rejection. */
function confirmPath(
  path: ActiveFigurePath,
  step: FigureStep,
): { path?: ActiveFigurePath; completedBinding: boolean } | string {
  if (path.attackIndices[path.position] !== step.attackIndex) return 'figure_path_out_of_order'
  if (step.note.midi !== path.midis[path.position]) return 'figure_path_mismatch'
  const target = path.position === path.midis.length - 1
  const reservation = step.candidate.reservation
  if (
    !target &&
    (reservation?.identity !== path.identity || reservation.memberPosition !== path.position)
  )
    return 'figure_path_mismatch'
  if (target) return { completedBinding: path.bindingIdentity !== undefined }
  return { path: { ...path, position: path.position + 1 }, completedBinding: false }
}

/**
 * Check how a figure path is entered. An appoggiatura needs a 3+ semitone approach; a bound passing
 * tone or neighbor needs a collection-step preparation that its fixed target continues or returns
 * to; approaches and Jazz ornaments carry no entry constraint.
 */
function entryError(reservation: PitchReservation, step: FigureStep): string | undefined {
  if (step.isFinal) return 'figure_starts_on_final'
  const prior = step.prior
  if (reservation.figureKind === 'appoggiatura')
    return prior && Math.abs(step.note.midi - prior.midi) >= 3 ? undefined : 'appoggiatura_entry'
  if (reservation.figureKind !== 'diatonic_passing_or_neighbor') return undefined
  const target = reservation.path.at(-1)!
  const explained =
    prior !== undefined &&
    freeToneResolves(prior, step.note, { midi: target, chordTone: true, inCollection: true })
  return explained ? undefined : 'passing_or_neighbor_entry'
}

/** Open a path at its first member. */
function startPath(reservation: PitchReservation): ActiveFigurePath {
  return {
    identity: reservation.identity,
    ...(reservation.bindingIdentity === undefined
      ? {}
      : { bindingIdentity: reservation.bindingIdentity }),
    attackIndices: [...reservation.attackIndices, reservation.targetAttackIndex],
    midis: reservation.path,
    position: 1,
  }
}

/**
 * The figure reducer: confirm or complete the active path, discharge a pending free-tone
 * obligation, then open a new path or free obligation for this note. Every non-chord tone leaves
 * this reducer with an explanation that is already fixed, so no later rescan is needed.
 */
// @spec-link [[entity_pitch_candidate_domain]]
// @spec-link [[rule_neutral_profile_diatonic_pitches]]
export function advanceFigure(state: FigureState, step: FigureStep): FigureResult {
  let path: ActiveFigurePath | undefined
  let boundFulfilled = state.boundFulfilled
  if (state.path) {
    const confirmed = confirmPath(state.path, step)
    if (typeof confirmed === 'string') return reject(confirmed)
    path = confirmed.path
    boundFulfilled ||= confirmed.completedBinding
  }
  const reservation = step.candidate.reservation
  const opensPath = reservation?.memberPosition === 0
  if (reservation && !opensPath && !state.path) return reject('figure_member_without_path')
  const pending = state.free
  if (pending && !freeToneResolves(pending.before, { ...pending, inCollection: true }, step.note))
    return reject('free_tone_unresolved')
  let free: FreeObligation | undefined
  if (opensPath && !path) {
    const error = entryError(reservation, step)
    if (error) return reject(error)
    path = startPath(reservation)
  } else if (opensPath) return reject('figure_overlap')
  else if (!reservation && !step.note.chordTone) {
    const prior = step.prior
    if (step.isFinal || !prior || !collectionStep(prior, step.note))
      return reject('free_tone_unprepared')
    free = { before: prior, midi: step.note.midi }
  }
  return deepFreeze({
    kind: 'accepted',
    state: {
      ...(path ? { path } : {}),
      ...(free ? { free } : {}),
      boundFulfilled,
    },
  })
}

/** True when no path or free obligation is open and the bound figure has been realized. */
// @spec-link [[entity_pitch_candidate_domain]]
export function figureSettled(state: FigureState): boolean {
  return !state.path && !state.free && state.boundFulfilled
}

/** The MIDI value the active path requires next, if any; lets search skip certain rejections. */
// @spec-link [[entity_pitch_candidate_domain]]
export function requiredMidi(state: FigureState): number | undefined {
  return state.path?.midis[state.path.position]
}
