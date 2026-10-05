/**
 * The session controller rig's clock moments, shared by the start and Stop specs: on the fake audio
 * clock at 240 BPM from 5 s, the count-in starts at 5.1 s, its beats click every 0.25 s, and phrase 1
 * starts sounding at 6.1 s; phrase N starts at 6.1 + 4 (N - 1) s. Also what a session left behind
 * once it ended, for comparing two runs.
 */
import type { ControllerRig } from './session-controller-rig'

/** The moment the count-in starts. */
export const START_AT = 5.1
/** The time between two count-in beats. */
export const BEAT = 0.25
/** The moment the count-in ends and phrase 1 starts sounding. */
export const COUNT_IN_ENDS_AT = 6.1

/** Intent: the time phrase `n` starts sounding. */
export function phraseStart(n: number): number {
  return COUNT_IN_ENDS_AT + (n - 1) * 4
}

/** Intent: what a session left behind once it ended, for comparing two runs. */
export function endState(rig: ControllerRig): unknown {
  return {
    phase: rig.controller.state.phase,
    countIn: rig.controller.state.countIn,
    struggling: rig.controller.state.strugglingNotice,
    tempo: rig.controller.state.sessionTempo,
    lastEnd: rig.controller.state.lastEnd,
    records: rig.controller.state.lastHistory?.phraseCount,
    running: rig.transport.isRunning(),
    wakeHeld: rig.browser.wakeLock.isHeld(),
    orientationHeld: rig.browser.orientationLock.isHeld(),
    timerRunning: rig.timers.map((timer) => timer.running()),
  }
}
