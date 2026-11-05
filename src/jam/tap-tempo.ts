/**
 * Tap tempo's pure part (master spec C5.17; the Jam flow's handoff, Tap tempo): the tempo a run of
 * taps sets, from its fourth tap on, and the words of `tap-tempo`'s field-note. No clock and no
 * view: the taps are audio-clock seconds the caller kept, the tempo values the control's steps.
 * Unevenness is never judged here: no tap is ever refused. Part of Jam's code (src/jam/), loaded
 * on demand.
 */

/** How long listening lasts after the last tap, in seconds. */
// @spec-link [[rule_jam_tap_in_listening]]
export const TAP_LISTENING_SECONDS = 2

/** The taps of a listening run it takes to set the tempo; the tempo reads the last this many. */
// @spec-link [[rule_jam_tempo_from_taps]]
export const TAPS_TO_SET_TEMPO = 4

const SECONDS_PER_MINUTE = 60

/** How close two distances in BPM must be to count as a tie, so float noise never breaks one. */
const TIE_EPSILON = 1e-9

/** What `tap-tempo`'s field-note says: at rest, counting the first taps, or the tempo set. */
// @spec-link [[rule_jam_tap_in_listening]]
export type TapTempoNote =
  | { readonly kind: 'rest' }
  | { readonly kind: 'counting' }
  | { readonly kind: 'set'; readonly tempo: number }

/** Typed failure for a caller defect: tempo values that are empty. */
export class TapTempoError extends Error {
  readonly kind = 'TapTempoError' as const

  constructor(message: string) {
    super(message)
    this.name = 'TapTempoError'
  }
}

/** Intent: the slowest and fastest of the tempo values; none at all is a caller defect. */
function valueRange(values: readonly number[]): { readonly min: number; readonly max: number } {
  if (values.length === 0) throw new TapTempoError('Tap tempo needs at least one tempo value.')
  return { min: Math.min(...values), max: Math.max(...values) }
}

/**
 * Intent: the value nearest `bpm`, the slower of two equally near (within TIE_EPSILON), so a
 * tempo beyond the values is kept at the nearest end of them.
 */
// @spec-link [[rule_jam_tempo_from_taps]]
// @spec-link [[rule_jam_tempo_range]]
function nearestValue(bpm: number, values: readonly number[]): number {
  let best = values[0]!
  let bestDistance = Math.abs(bpm - best)
  for (const value of values) {
    const distance = Math.abs(bpm - value)
    const tie = Math.abs(distance - bestDistance) <= TIE_EPSILON
    if ((tie && value < best) || (!tie && distance < bestDistance)) {
      best = value
      bestDistance = distance
    }
  }
  return best
}

/**
 * Intent: the tempo a run of taps sets, from its fourth tap on: the mean beat of its last four
 * taps (the time from the first of them to the last, divided by three) as BPM, rounded to the
 * nearest of `values` (a tie to the slower), so kept within their slowest and fastest. `taps` are
 * seconds in ascending order. Below four taps, null. Four taps at one instant (no span) give the
 * fastest value.
 */
// @spec-link [[rule_jam_tempo_from_taps]]
// @spec-link [[rule_jam_tempo_range]]
export function tempoFromTaps(taps: readonly number[], values: readonly number[]): number | null {
  const { max } = valueRange(values)
  if (taps.length < TAPS_TO_SET_TEMPO) return null
  const lastFour = taps.slice(-TAPS_TO_SET_TEMPO)
  const span = lastFour[TAPS_TO_SET_TEMPO - 1]! - lastFour[0]!
  if (span <= 0) return max
  const beat = span / (TAPS_TO_SET_TEMPO - 1)
  return nearestValue(SECONDS_PER_MINUTE / beat, values)
}

/**
 * Intent: the field-note's words, as the design gives them: at rest, an invitation (naming the
 * controller only while one is connected); while counting, how many taps it takes; once set, the
 * tempo, or at the slowest or fastest of `values` that it is the limit.
 */
// @spec-link [[rule_jam_tap_in_listening]]
// @spec-link [[rule_jam_tempo_range]]
export function tapTempoSentence(
  note: TapTempoNote,
  values: readonly number[],
  controllerConnected: boolean,
): string {
  switch (note.kind) {
    case 'rest':
      return controllerConnected
        ? 'Tap the beat here, or press once and tap on your controller.'
        : 'Tap the beat here.'
    case 'counting':
      return 'Keep tapping: four beats set the tempo.'
    case 'set': {
      const { min, max } = valueRange(values)
      if (note.tempo === max) return `Set to ${max} BPM, the fastest a Jam goes.`
      if (note.tempo === min) return `Set to ${min} BPM, the slowest a Jam goes.`
      return `Set to ${note.tempo} BPM. Keep tapping to correct it.`
    }
  }
}
