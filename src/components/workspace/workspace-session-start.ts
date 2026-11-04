/**
 * The in-click part of a session controller's start: refused, touching nothing, while a start
 * condition does not hold; otherwise it discards the kept Review, unlocks the audio, holds the
 * player's saves until the session ends, asks for both screen locks, starts the transport with
 * phrase 1's backing queued, builds the session's record, its history holding the Idle result's
 * session seed and the clef Idle drew phrase 1 in, takes the pre-generated phrases ready, and
 * hands it to the rest of the start (./workspace-session-begin.ts) with the settings phrase 1 was
 * generated under, which a stale phrase 1 used as it is differs in (./workspace-stale-phrase.ts). Once the locks are asked for,
 * a start is all or nothing: any later throw undoes it (./workspace-session-ends.ts). Where
 * phrase 1 and the rest come from is the start's source: session mode's Idle, here, or Jam's
 * phrase 1 written from the kept doodle (./workspace-session-on-kept-doodle.ts).
 */
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { StaffLayout } from '@/notation/notation-layout-policy'
import { createAudioTimeAgenda } from '@/session/session-agenda'
import { createSessionHistory } from '@/session/session-history'
import type { ReadyPhrase } from '@/session/session-ready-phrases'
import { phraseOneSettings } from '@/session/stale-phrase-one'
import type { SessionStartBlocker } from '@/session/session-start-conditions'
import type { SessionSettings } from '@/session/session-types'
import { sessionLayoutAtStart } from '@/session/session-window'
import type { StartedOnKeptDoodle } from './session-jam-part'
import type {
  ActiveSession,
  SessionControllerCore,
  SessionControllerSides,
} from './workspace-session-active'
import { beginSession, type JamOnKeptDoodleBeginning } from './workspace-session-begin'
import { SessionControllerError } from './workspace-session-controller-types'
import type { SessionEnds } from './workspace-session-ends'
import { chosenSessionSettings } from './workspace-session-lock-choices'
import { createSessionShownSettings } from './workspace-session-settings'

/** The settings a session starts under, and those its phrase 1 was generated under. */
// @spec-link [[rule_session_start_conditions]]
export interface PhraseOneStartSettings {
  readonly settings: SessionSettings
  readonly phraseOneSettings: SessionSettings
}

/**
 * Where a start with phrase 1 takes what it starts from, each read inside the start: the first
 * start condition that does not hold (null when it may start), phrase 1 with its session seed
 * (null with none to start from), the settings the session runs under and those phrase 1 was
 * generated under, the written phrase on screen for phrase 1, the prepared phrases that fit the
 * staff layout the session holds (the queue's attempt in flight aborted, never waited for), and,
 * for a Jam on the kept doodle, the kept doodle it starts on and the steering block its phrases
 * carry (null for session mode's start).
 */
// @spec-link [[rule_start_never_waits_for_pregeneration]]
export interface PhraseOneStartSource {
  readonly refusal: () => string | null
  readonly phraseOne: () => WorkspaceSessionResult | null
  readonly settings: (phraseOne: WorkspaceSessionResult) => PhraseOneStartSettings
  readonly written: () => WrittenPhrase | null
  readonly take: (heldLayout: StaffLayout) => readonly ReadyPhrase[]
  readonly jam: (JamOnKeptDoodleBeginning & { readonly keptDoodle: StartedOnKeptDoodle }) | null
}

/**
 * Intent: build one controller's Start over its core, sides and ends, with `startBlocker` reading
 * the first start condition that does not hold (null when a session may start): session mode's
 * source, its Idle phrase 1 under the player's settings now.
 */
// @spec-link [[rule_session_start_conditions]]
export function createSessionStart(
  core: SessionControllerCore,
  sides: SessionControllerSides,
  ends: SessionEnds,
  startBlocker: () => SessionStartBlocker | null,
): () => void {
  const { deps } = core
  const { idle } = deps
  const startFrom = createStartFromPhraseOne(core, sides, ends)
  const source: PhraseOneStartSource = {
    refusal: startBlocker,
    phraseOne: () => idle.state.result,
    settings: (phraseOne) => {
      const settings: SessionSettings = chosenSessionSettings(
        idle.state,
        sides.lockAndGroups.current(),
        phraseOne.intent,
      )
      const tempo = settings.controls.tempo
      return {
        settings,
        phraseOneSettings: phraseOneSettings(phraseOne.settings, phraseOne.intent, tempo),
      }
    },
    written: deps.idlePhrase,
    take: (heldLayout) => sides.pregeneration.take(heldLayout),
    jam: null,
  }
  return () => startFrom(source)
}

/**
 * Intent: build one controller's start with phrase 1 from a source, over its core, sides and
 * ends: the in-click part every start with phrase 1 takes, session mode's and a Jam on the kept
 * doodle's.
 */
// @spec-link [[rule_session_start_conditions]]
export function createStartFromPhraseOne(
  core: SessionControllerCore,
  sides: SessionControllerSides,
  ends: SessionEnds,
): (source: PhraseOneStartSource) => void {
  const { deps, state } = core
  const { audio, browser } = deps

  /**
   * Intent: start a session from the source's phrase 1 (session mode's Idle phrase, or Jam's
   * phrase 1 written from the kept doodle, whose session keeps that doodle for its review and runs
   * none of session mode's options), synchronously, inside the player's Start click
   * (or the starting note's MIDI callback, once a Connect-controller click has unlocked the audio):
   * unlock the audio, hold the player's saves until the session ends, ask for the wake lock and the
   * landscape lock (a refusal changes nothing, so their outcomes are ignored), start the transport
   * and queue phrase 1's backing; then lock the current settings (the player's rhythm lock, its
   * allowed changes and Vary settings' allowed groups with them, my instrument's profile taken
   * from phrase 1's intent, which embeds it, and the restriction in force frozen in them for the
   * session, so Vary settings' key and mode moves stay inside it, built as the Idle
   * pre-generation's start builds them), beside the settings phrase 1 was generated under at
   * the session's tempo (phrase 2 joins phrase 1 as after a change from them, and the controls show
   * them, the preset selection as the player's at Start, through the count-in and phrase 1; equal ones
   * change nothing), hold the staff layout the
   * window's width selects, take the phrases the Idle pre-generation queue has ready that fit it
   * (aborting its attempt in flight, never waiting for it), open the history with the session seed
   * the Idle result carries and the clef of the written phrase Idle shows (display data, never in
   * the settings or an intent) and start the runner, the count-in display, the wake-ups and the end
   * watchers. Throws, touching nothing, while a start condition does not hold. An accepted start
   * first discards the kept Review, before anything else changes. Once the saves are held, it is
   * all or nothing: a throw from any later step undoes what was set up, releasing the saves, and
   * throws on (`abandonStart`).
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
  // @spec-link [[rule_no_save_during_session]]
  function start(source: PhraseOneStartSource): void {
    if (core.disposed) throw new SessionControllerError('session controller: disposed')
    const blocker = source.refusal()
    const phraseOne = source.phraseOne()
    if (blocker !== null || phraseOne === null) {
      throw new SessionControllerError(`session controller: a session cannot start: ${blocker}`)
    }
    state.review = null
    const { settings, phraseOneSettings: phraseOneOwn } = source.settings(phraseOne)
    const tempo = settings.controls.tempo
    const idleWritten = source.written()
    if (idleWritten === null) throw new Error('session controller: Idle shows no written phrase')
    const shape = browser.windowShape.read()
    const heldLayout = sessionLayoutAtStart(shape.widthPx, shape.remPx)
    const readyPhrases = source.take(heldLayout)
    audio.unlock()
    ends.hearInterruptions()
    let session: ActiveSession | null = null
    deps.saveHold.hold()
    try {
      void browser.wakeLock.request()
      void browser.orientationLock.lock()
      const timeline = audio.start({ tempo })
      audio.queueBacking(1, phraseOne.outcome.provenance.harmony.events, tempo)
      session = {
        timeline,
        startingTempo: tempo,
        phraseOne,
        history: createSessionHistory(
          settings,
          deps.clock.wallClock,
          phraseOne.sessionSeed,
          idleWritten.clef,
        ),
        agenda: createAudioTimeAgenda(),
        runner: null,
        floor: timeline.startAt,
        phrases: null,
        ended: null,
        watch: null,
        display: null,
        midi: null,
        enterPhraseOne: null,
        doodleControls: null,
        keptDoodle: source.jam?.keptDoodle ?? null,
        shown: createSessionShownSettings(
          { ...phraseOneOwn, selection: settings.selection },
          settings,
        ),
      }
      beginSession(core, sides, ends, session, {
        settings,
        phraseOneSettings: phraseOneOwn,
        heldLayout,
        idleWritten,
        readyPhrases,
        jam: source.jam === null ? null : { steering: source.jam.steering },
      })
    } catch (error: unknown) {
      ends.abandonStart(session, error)
    }
  }

  return start
}
