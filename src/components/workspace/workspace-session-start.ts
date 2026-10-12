/**
 * The in-click part of a session controller's start: refused, touching nothing, while a start
 * condition does not hold; otherwise it discards the kept Review, unlocks the audio, asks for both
 * screen locks, starts the transport with phrase 1's backing queued, builds the session's record,
 * its history holding the Idle result's session seed, takes the pre-generated phrases ready, and
 * hands it to the rest of the start
 * (./workspace-session-begin.ts). Once the locks are asked for, a start is all or nothing: any
 * later throw undoes it (./workspace-session-ends.ts).
 */
import { createAudioTimeAgenda } from '@/session/session-agenda'
import { createSessionHistory } from '@/session/session-history'
import type { SessionStartBlocker } from '@/session/session-start-conditions'
import type { SessionSettings } from '@/session/session-types'
import { sessionLayoutAtStart } from '@/session/session-window'
import type {
  ActiveSession,
  SessionControllerCore,
  SessionControllerSides,
} from './workspace-session-active'
import { beginSession } from './workspace-session-begin'
import { SessionControllerError } from './workspace-session-controller-types'
import type { SessionEnds } from './workspace-session-ends'
import { createSessionShownSettings } from './workspace-session-settings'

/**
 * Intent: build one controller's Start over its core, sides and ends, with `startBlocker` reading
 * the first start condition that does not hold (null when a session may start).
 */
// @spec-link [[rule_session_start_conditions]]
export function createSessionStart(
  core: SessionControllerCore,
  sides: SessionControllerSides,
  ends: SessionEnds,
  startBlocker: () => SessionStartBlocker | null,
): () => void {
  const { deps, state } = core
  const { idle, audio, browser } = deps

  /**
   * Intent: start a session from the Idle phrase, synchronously, inside the player's Start click
   * (or the starting note's MIDI callback, once a Connect-controller click has unlocked the audio):
   * unlock the audio, ask for the wake lock and the landscape lock (a refusal changes nothing, so
   * their outcomes are ignored), start the transport and queue phrase 1's backing; then lock the
   * current settings, hold the staff layout the window's width selects, take the phrases the Idle
   * pre-generation queue has ready that fit it (aborting its attempt in flight, never waiting for
   * it), open the history with the session seed the Idle result carries and start the runner, the
   * count-in display, the wake-ups and the end watchers. Throws, touching nothing, while a start condition does not hold. An
   * accepted start first discards the kept Review, before anything else changes. Once the locks are
   * asked for, it is all or nothing: a throw from any later step undoes what was set up and throws
   * on (`abandonStart`).
   */
  // @spec-link [[rule_new_session_discards_review]]
  // @spec-link [[rule_audio_unlocked_by_player_click]]
  // @spec-link [[rule_screen_wake_lock_during_session]]
  // @spec-link [[rule_landscape_lock_during_session]]
  // @spec-link [[rule_count_in_shown_on_screen]]
  // @spec-link [[rule_session_start_conditions]]
  // @spec-link [[rule_session_layout_fixed_at_start]]
  // @spec-link [[module_session_seed_plan]]
  // @spec-link [[rule_start_never_waits_for_pregeneration]]
  function start(): void {
    if (core.disposed) throw new SessionControllerError('session controller: disposed')
    const blocker = startBlocker()
    const phraseOne = idle.state.result
    if (blocker !== null || phraseOne === null) {
      throw new SessionControllerError(`session controller: a session cannot start: ${blocker}`)
    }
    state.review = null
    const settings: SessionSettings = {
      controls: idle.state.controls,
      musicalProfile: idle.state.profileSelection,
    }
    const tempo = settings.controls.tempo
    const idleWritten = deps.idlePhrase()
    if (idleWritten === null) throw new Error('session controller: Idle shows no written phrase')
    const shape = browser.windowShape.read()
    const heldLayout = sessionLayoutAtStart(shape.widthPx, shape.remPx)
    const readyPhrases = sides.pregeneration.take(heldLayout)
    audio.unlock()
    ends.hearInterruptions()
    let session: ActiveSession | null = null
    try {
      void browser.wakeLock.request()
      void browser.orientationLock.lock()
      const timeline = audio.start({ tempo })
      audio.queueBacking(1, phraseOne.outcome.provenance.harmony.events, tempo)
      session = {
        timeline,
        startingTempo: tempo,
        phraseOne,
        history: createSessionHistory(settings, deps.clock.wallClock, phraseOne.sessionSeed),
        agenda: createAudioTimeAgenda(),
        runner: null,
        floor: timeline.startAt,
        phrases: null,
        ended: null,
        watch: null,
        display: null,
        midi: null,
        shown: createSessionShownSettings(settings),
      }
      beginSession(core, sides, ends, session, { settings, heldLayout, idleWritten, readyPhrases })
    } catch (error: unknown) {
      ends.abandonStart(session, error)
    }
  }

  return start
}
