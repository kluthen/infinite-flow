/**
 * The adaptive-tempo schedule of one session, as pure values with no time and no I/O: whether it
 * runs, the tempo of the latest phrase whose tempo is fixed, how many counted phrases have started
 * sounding since the last rise, and whether the controller is attached. A phrase counts when it
 * starts sounding while the controller is attached; once two have, the next phrase whose tempo is
 * fixed while it is attached plays 5 BPM faster, never above 240 BPM. Without adaptive tempo the
 * tempo never moves.
 */

import { SessionEngineError } from './session-types'

/** How much one rise adds, in BPM. */
// @spec-link [[rule_adaptive_tempo_flat_schedule]]
export const ADAPTIVE_TEMPO_STEP = 5

/** The tempo control's ceiling, which the schedule never rises past, in BPM. */
// @spec-link [[rule_adaptive_tempo_flat_schedule]]
export const ADAPTIVE_TEMPO_CEILING = 240

/** How many counted phrases make a rise due. */
// @spec-link [[rule_adaptive_tempo_flat_schedule]]
export const PHRASES_PER_RISE = 2

/**
 * The schedule between two steps. `runs` is fixed for the session; `tempo` is the tempo of the
 * latest phrase whose tempo is fixed (the starting tempo at first); `counted` is the number of
 * counted phrases since the last rise; `attached` is whether the controller is attached, tracked
 * whether or not the schedule runs.
 */
// @spec-link [[rule_adaptive_tempo_flat_schedule]]
// @spec-link [[module_session_adaptive_tempo_schedule]]
export interface AdaptiveTempoSchedule {
  readonly runs: boolean
  readonly tempo: number
  readonly counted: number
  readonly attached: boolean
}

/**
 * Intent: the schedule at a session's start, at the starting tempo with the controller attached
 * and nothing counted. It runs only when the start says adaptive tempo runs, which the caller
 * decides from the page's flag and the session having a controller at its start.
 */
// @spec-link [[req_adaptive_tempo]]
// @spec-link [[rule_controller_attached_definition]]
// @spec-link [[rule_adaptive_tempo_flat_schedule]]
export function startAdaptiveTempo(startingTempo: number, runs: boolean): AdaptiveTempoSchedule {
  if (!(Number.isFinite(startingTempo) && startingTempo > 0))
    throw new SessionEngineError(
      `The starting tempo must be a positive number, got ${startingTempo}.`,
    )
  return { runs, tempo: startingTempo, counted: 0, attached: true }
}

/**
 * Intent: the controller going away or reconnecting. An event that does not change its presence
 * (away twice, back while attached) is a caller bug and throws.
 */
// @spec-link [[rule_adaptive_tempo_flat_schedule]]
// @spec-link [[module_session_adaptive_tempo_schedule]]
export function controllerPresence(
  schedule: AdaptiveTempoSchedule,
  attached: boolean,
): AdaptiveTempoSchedule {
  if (schedule.attached === attached)
    throw new SessionEngineError(
      attached
        ? 'The controller cannot come back: it is attached.'
        : 'The controller cannot go away: it is already away.',
    )
  return { ...schedule, attached }
}

/**
 * Intent: a phrase starts sounding: it counts toward the next rise only when the schedule runs
 * and the controller is attached.
 */
// @spec-link [[rule_adaptive_tempo_flat_schedule]]
export function phraseStartedSounding(schedule: AdaptiveTempoSchedule): AdaptiveTempoSchedule {
  if (!(schedule.runs && schedule.attached)) return schedule
  return { ...schedule, counted: schedule.counted + 1 }
}

/**
 * Intent: fix the next phrase's tempo, the returned schedule's `tempo`. It rises by 5 BPM, never
 * past 240 BPM, and the count restarts at 0, only when the schedule runs, two counted phrases
 * have started since the last rise, the controller is attached and the ceiling is not reached;
 * otherwise it stays as the phrase before's, and a due rise waits for the next fixing.
 */
// @spec-link [[rule_adaptive_tempo_flat_schedule]]
// @spec-link [[module_session_adaptive_tempo_schedule]]
export function nextPhraseTempo(schedule: AdaptiveTempoSchedule): AdaptiveTempoSchedule {
  const { runs, attached, counted, tempo } = schedule
  if (!runs || !attached || counted < PHRASES_PER_RISE || tempo >= ADAPTIVE_TEMPO_CEILING)
    return schedule
  return {
    ...schedule,
    tempo: Math.min(tempo + ADAPTIVE_TEMPO_STEP, ADAPTIVE_TEMPO_CEILING),
    counted: 0,
  }
}
