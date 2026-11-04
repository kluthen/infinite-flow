/**
 * The shell's side of a fresh Jam's cue row before phrase 1: what `session-cue-row` is given while
 * a fresh Jam runs (Jam's two cue row parts, reached through Jam's loaded code, and the Jam's
 * phase), and which part the phase gives the row. Types and plain logic only: Jam's code is
 * imported as types, erased from the bundle, so nothing of it reaches the first load.
 */
import type { JamPhase } from '@/jam/jam-phase'
import type { JamModeModule } from './load-jam-mode'

/**
 * What the cue row is given while a fresh Jam runs: Jam's cue row parts (`jam-capture`,
 * `jam-writing`), from Jam's loaded code, and the Jam's phase, which says which one shows.
 */
// @spec-link [[module_jam_code_boundary]]
export interface JamSessionCue {
  readonly parts: Pick<JamModeModule, 'JamCapture' | 'JamWriting'>
  readonly phase: JamPhase
}

/** Which of Jam's cue row parts a phase gives the row: `jam-capture` or `jam-writing`. */
export type JamCuePart = 'capture' | 'writing'

/**
 * Intent: the part of the cue row a fresh Jam's phase gives: `jam-capture` during the capture,
 * `jam-writing` during a tentative generation measure (a barline with no note sounding), the
 * generation measure and any extended wait; none otherwise, the controller's count-in covering the
 * count-in and the read-in measure, and the session's cues phrase 1 on.
 */
// @spec-link [[module_jam_capture]]
// @spec-link [[rule_jam_live_view_never_shows_doodle]]
export function jamCuePartOf(phase: JamPhase): JamCuePart | null {
  switch (phase.state) {
    case 'capture':
      return 'capture'
    case 'tentative-generation-measure':
    case 'generation-measure':
    case 'extended-wait':
      return 'writing'
    case 'count-in':
    case 'read-in':
    case 'phrase-one':
    case 'ended':
      return null
  }
}
