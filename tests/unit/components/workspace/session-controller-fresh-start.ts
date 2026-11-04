/**
 * A session started without phrase 1 on the controller rig, as the code that runs it would start
 * it, keeping the handle, every note handed to its port and every output handed back.
 */
import type { SessionWithoutPhraseOne } from '@/components/workspace/workspace-session-controller-types'
import { BUILT_IN_INSTRUMENT_CLEF } from '@/domain/profile/instrument-clef'
import type { PlayedNoteEvent } from '@/midi/played-note-tracker'
import type { SessionOutput } from '@/session/session-types'
import type { ControllerRig } from './session-controller-rig'

/** What a start without phrase 1 handed its caller: the handle, the notes and the outputs. */
export interface FreshStart {
  readonly session: SessionWithoutPhraseOne
  readonly notes: PlayedNoteEvent[]
  readonly outputs: SessionOutput[]
}

/** Intent: start a session without phrase 1 under the rig's settings, logging what it hands back. */
export function startFresh(rig: ControllerRig): FreshStart {
  const notes: PlayedNoteEvent[] = []
  const outputs: SessionOutput[] = []
  const session = rig.controller.startWithoutPhraseOne({
    settings: rig.settings,
    clef: BUILT_IN_INSTRUMENT_CLEF,
    playedNotes: (event) => notes.push(event),
    checkFit: () => Promise.resolve(true),
    outputs: (output) => outputs.push(output),
  })
  return { session, notes, outputs }
}
