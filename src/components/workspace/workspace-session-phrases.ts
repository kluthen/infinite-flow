/**
 * A running session's phrases from 2 on, for the session controller. A phrase goes through two
 * steps: at `phrase-ready` the display shows it as read-ahead and it is kept; at `phrase-tempo`,
 * once the engine has fixed its tempo, the kept phrase is scheduled at that tempo: its backing is
 * queued on the audio transport (whose click plan then runs at that tempo from the phrase's first
 * beat), its expected notes go to note acknowledgement, the display's playhead takes its tempo, and
 * its starting to sound is scheduled at the transport's start of the phrase. Phrase 1 is queued
 * by the controller itself at the start, at the starting tempo. Holds no clock of its own.
 */
import type { AudioTransport } from '@/audio/audio-transport'
import type { AudioTimeAgenda } from '@/session/session-agenda'
import type { AudioTime, SessionPhrase } from '@/session/session-types'
import type { SessionDisplay } from './workspace-session-display'
import type { SessionMidiRun } from './workspace-session-midi'

/**
 * What one session's phrases are scheduled through: the audio transport, the rolling display, the
 * session's MIDI handling, its audio-time agenda, and how a phrase's starting to sound reaches the
 * runner.
 */
// @spec-link [[service_workspace_session_flow]]
export interface SessionPhrasesDependencies {
  readonly audio: Pick<AudioTransport, 'queueBacking' | 'phraseStartsAt'>
  readonly display: Pick<SessionDisplay, 'phraseReady' | 'phraseTempo'>
  readonly midi: Pick<SessionMidiRun, 'phraseReady'>
  readonly agenda: Pick<AudioTimeAgenda, 'schedule'>
  readonly startedSounding: (phraseNumber: number, at: AudioTime) => void
}

/** One session's phrase steps, fed the engine's `phrase-ready` and `phrase-tempo` outputs. */
// @spec-link [[service_workspace_session_flow]]
export interface SessionPhrases {
  /** Show the next readied phrase (2, 3… in order) as read-ahead and keep it; throws out of order. */
  readonly phraseReady: (phrase: SessionPhrase) => void
  /**
   * Schedule the kept phrase `phraseNumber` (2, 3… in order) at `tempo`; throws out of order or
   * when that phrase was never readied.
   */
  readonly phraseTempo: (phraseNumber: number, tempo: number) => void
}

/**
 * Intent: one running session's phrase steps from phrase 2 on. Each readied phrase is kept by its
 * number, the latest one readied under it, until its tempo schedules it. Every caller bug throws
 * before anything changes.
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[req_session_backing_track]]
export function createSessionPhrases(deps: SessionPhrasesDependencies): SessionPhrases {
  const { audio, display, midi, agenda } = deps
  /** The readied phrases whose tempo is not fixed yet, by number. */
  const kept = new Map<number, SessionPhrase>()
  let nextReady = 2
  let nextTempo = 2

  /** Intent: show the next readied phrase as read-ahead and keep it for its tempo. */
  // @spec-link [[service_workspace_session_flow]]
  function phraseReady(phrase: SessionPhrase): void {
    const { phraseNumber } = phrase
    if (phraseNumber !== nextReady) {
      throw new Error(
        `session controller: phrase ${nextReady} must be readied next, got phrase ${phraseNumber}`,
      )
    }
    display.phraseReady(phrase)
    kept.set(phraseNumber, phrase)
    nextReady += 1
  }

  /**
   * Intent: the engine fixed the kept phrase's tempo: queue its backing at that tempo first (from
   * then on the transport knows when it starts), then add its expected notes at that tempo, give
   * the display's playhead its tempo, and schedule its starting to sound at its transport start.
   */
  // @spec-link [[service_workspace_session_flow]]
  // @spec-link [[req_session_backing_track]]
  function phraseTempo(phraseNumber: number, tempo: number): void {
    if (phraseNumber !== nextTempo) {
      throw new Error(
        `session controller: phrase ${nextTempo}'s tempo must come next, got phrase ${phraseNumber}'s`,
      )
    }
    const phrase = kept.get(phraseNumber)
    if (phrase === undefined) {
      throw new Error(`session controller: phrase ${phraseNumber}'s tempo came before it was ready`)
    }
    audio.queueBacking(phraseNumber, phrase.outcome.provenance.harmony.events, tempo)
    kept.delete(phraseNumber)
    nextTempo += 1
    midi.phraseReady(phraseNumber, phrase.outcome.result.timeline, tempo)
    display.phraseTempo(phraseNumber, tempo)
    const startsAt = audio.phraseStartsAt(phraseNumber)
    agenda.schedule(startsAt, () => deps.startedSounding(phraseNumber, startsAt))
  }

  return { phraseReady, phraseTempo }
}
