/**
 * A session controller's start of a Jam on the kept doodle (master spec C5.11; module_kept_doodle):
 * a start from phrase 1 as session mode's from Ready (./workspace-session-start.ts), its source
 * Jam's own. Phrase 1 is Jam's phrase 1 written at Idle from the kept doodle, with the request,
 * seed and session seed it was published with; the session runs under the settings phrase 1 was
 * written under at Jam's tempo now (a tempo change writes nothing again, so the tempo is read at
 * Start), phrase 2 joining phrase 1 with no change between them; its prepared phrases are Jam's
 * own queue's; every phrase from 2 on carries the kept doodle's steering block; and, as in any
 * Jam, none of session mode's options runs. There is no capture: the count-in, then phrase 1.
 * Session mode's Idle, its phrase and its prepared phrases are never read or touched. Part of the
 * session controller's chunk.
 */
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { StaffLayout } from '@/notation/notation-layout-policy'
import type { ReadyPhrase } from '@/session/session-ready-phrases'
import { keptDoodleSessionStart } from './jam-pregeneration'
import type { StartedOnKeptDoodle } from './session-jam-part'
import type { KeptDoodlePhraseResult } from './use-kept-doodle-phrase'
import type { SessionControllerCore, SessionControllerSides } from './workspace-session-active'
import type { SessionEnds } from './workspace-session-ends'
import { createStartFromPhraseOne } from './workspace-session-start'

/**
 * What a Jam on the kept doodle starts from, as Jam mode's Idle shows it at Start: phrase 1
 * written from the kept doodle (its settings, steering block and session seed with it), Jam's
 * tempo now, the written phrase Jam's staff shows for phrase 1, the take of Jam's own queue's
 * prepared phrases, and the kept doodle it is played on.
 */
// @spec-link [[rule_jam_on_held_doodle_skips_capture]]
// @spec-link [[module_kept_doodle]]
export interface StartOnKeptDoodle {
  readonly phraseOne: KeptDoodlePhraseResult
  readonly tempo: number
  readonly written: WrittenPhrase
  readonly take: (heldLayout: StaffLayout) => readonly ReadyPhrase[]
  readonly keptDoodle: StartedOnKeptDoodle
}

/**
 * Intent: build one controller's start of a Jam on the kept doodle over its core, sides and ends:
 * refused, touching nothing, while a session runs or no controller is connected (Jam's side
 * judges its other start conditions first: Jam's phrase 1 shown with nothing running, failed or
 * noticed on it); otherwise a start from phrase 1, inside the Start click or the starting note's
 * MIDI callback, from the request's phrase 1, its settings at the request's tempo, its written
 * phrase, the ready phrases Jam's queue gives for the held layout, the kept doodle's steering
 * block, and the kept doodle, held by the session for its review's Jam part.
 */
// @spec-link [[rule_jam_on_held_doodle_skips_capture]]
// @spec-link [[rule_every_jam_phrase_carries_doodle]]
// @spec-link [[rule_pregenerated_phrase_matches_session]]
// @spec-link [[module_session_seed_plan]]
export function createSessionStartOnKeptDoodle(
  core: SessionControllerCore,
  sides: SessionControllerSides,
  ends: SessionEnds,
): (request: StartOnKeptDoodle) => void {
  const startFrom = createStartFromPhraseOne(core, sides, ends)
  return (request) => {
    const start = keptDoodleSessionStart(request.phraseOne, request.tempo)
    startFrom({
      refusal: () => {
        if (core.active !== null) return 'a session is already running'
        if (sides.sessionMidi.controllerState().kind !== 'connected')
          return 'no controller is connected'
        return null
      },
      phraseOne: () => request.phraseOne,
      settings: () => ({ settings: start.settings, phraseOneSettings: start.settings }),
      written: () => request.written,
      take: request.take,
      jam: { steering: request.phraseOne.steering, keptDoodle: request.keptDoodle },
    })
  }
}
