/**
 * The contract of the session engine: the timed events a running session feeds it, the outputs it
 * answers with, the phrase record it keeps for every phrase of the session, and the typed error it
 * throws when its caller breaks that contract. Time is audio time, plain seconds on the audio
 * clock, carried on every event; nothing here reads a clock.
 */

import type { ViewportWidthProvider } from '../composables/viewport-width'
import type { GenerationControls } from '../domain/controls/generation-controls'
import type { ProfileSelection } from '../domain/controls/profile-selection'
import type {
  GenerationIntent,
  GenerationIntentProviders,
} from '../domain/generation/generation-intent'
import type { GenerationOutcome } from '../domain/generation/orchestration/orchestration-types'

/** Seconds on the audio clock. */
// @spec-link [[service_session_engine]]
export type AudioTime = number

/**
 * Why a session ended: the player's Stop, the tab becoming hidden, the staff no longer shown, more
 * than 30 s without a played note while a controller is attached, or the selected controller lost
 * and not back within 30 s.
 */
// @spec-link [[service_session_engine]]
// @spec-link [[rule_stop_ends_session]]
// @spec-link [[rule_hidden_tab_ends_session]]
// @spec-link [[rule_silence_timeout_ends_session]]
// @spec-link [[rule_controller_reconnection_window]]
export type SessionEndCause =
  'stop' | 'hidden-tab' | 'staff-not-shown' | 'silence-timeout' | 'controller-lost'

/**
 * Where a session phrase came from: the Idle phrase that became phrase 1, a generation with the
 * carry-in of the phrase before, a standalone generation without it, or a repeat of the phrase
 * before. `repeat` is the internal repeat mark; no view shows it.
 */
// @spec-link [[service_session_engine]]
// @spec-link [[rule_repeat_phrase_marked_internally_only]]
export type SessionPhraseOrigin = 'idle' | 'carry-in' | 'standalone' | 'repeat'

/** A generation outcome that produced a phrase. */
// @spec-link [[service_session_engine]]
export type SuccessfulOutcome = Extract<GenerationOutcome, { kind: 'generation_success' }>

/**
 * The settings the player chose when the session started, locked for its whole length. The
 * controls are the chosen ones, with the written tonal center and the chosen note density.
 */
// @spec-link [[service_session_engine]]
// @spec-link [[rule_session_settings_locked]]
export interface SessionSettings {
  readonly controls: GenerationControls
  readonly musicalProfile: ProfileSelection
}

/**
 * One decided phrase of the session: its ordinal counted from 1, where it came from, the intent it
 * was generated from and its outcome. A repeat keeps the repeated phrase's intent and outcome and
 * names the phrase it repeats.
 */
// @spec-link [[service_session_engine]]
// @spec-link [[rule_repeat_phrase_marked_internally_only]]
export interface SessionPhrase {
  readonly phraseNumber: number
  readonly origin: SessionPhraseOrigin
  readonly intent: GenerationIntent
  readonly outcome: SuccessfulOutcome
  readonly repeatOf?: number
}

/** What a session starts from: the moment the count-in starts, the chosen settings and phrase 1. */
// @spec-link [[service_session_engine]]
export interface SessionStart {
  readonly at: AudioTime
  readonly settings: SessionSettings
  readonly phraseOne: { readonly intent: GenerationIntent; readonly outcome: SuccessfulOutcome }
}

/**
 * A timed event of a running session. `count-in-over` is the moment phrase 1 starts sounding;
 * `phrase-started-sounding` is sent for phrase 2 onward; `generation-crashed` is a rejected
 * generate request (a worker crash on that request, or a dead worker), which counts as a failed
 * attempt; `tick` lets the engine see a deadline pass.
 */
// @spec-link [[service_session_engine]]
export type SessionEvent =
  | { readonly kind: 'count-in-over'; readonly at: AudioTime }
  | {
      readonly kind: 'phrase-started-sounding'
      readonly at: AudioTime
      readonly phraseNumber: number
    }
  | {
      readonly kind: 'generation-result'
      readonly at: AudioTime
      readonly attemptId: number
      readonly outcome: GenerationOutcome
    }
  | { readonly kind: 'generation-crashed'; readonly at: AudioTime; readonly attemptId: number }
  | {
      readonly kind: 'fit-result'
      readonly at: AudioTime
      readonly attemptId: number
      readonly fits: boolean
    }
  | { readonly kind: 'tick'; readonly at: AudioTime }
  | { readonly kind: 'end'; readonly at: AudioTime; readonly cause: SessionEndCause }

/**
 * What the engine asks its caller to do or tells it happened. `retry` counts the attempts made for
 * the phrase before this one: 0 for the first carry-in attempt, 1 to 3 for the carry-in retries
 * and 4 for the standalone retry. `check-fit` carries the checked attempt's own intent, which can
 * differ between attempts for the same phrase. `phrase-ready` is the phrase to show next as
 * read-ahead, repeats included.
 */
// @spec-link [[service_session_engine]]
export type SessionOutput =
  | {
      readonly kind: 'request-generation'
      readonly attemptId: number
      readonly phraseNumber: number
      readonly step: 'carry-in' | 'standalone'
      readonly retry: number
      readonly intent: GenerationIntent
      readonly deadline: AudioTime
    }
  | {
      readonly kind: 'check-fit'
      readonly attemptId: number
      readonly phraseNumber: number
      readonly outcome: SuccessfulOutcome
      readonly intent: GenerationIntent
    }
  | { readonly kind: 'phrase-ready'; readonly phrase: SessionPhrase }
  | { readonly kind: 'phrase-sounding'; readonly at: AudioTime; readonly phrase: SessionPhrase }
  | { readonly kind: 'struggling-notice'; readonly visible: boolean }
  | { readonly kind: 'wake-at'; readonly at: AudioTime }
  | {
      readonly kind: 'ended'
      readonly at: AudioTime
      readonly cause: SessionEndCause
      readonly phase: 'count-in' | 'running'
      readonly soundedPhraseCount: number
    }

/** The engine's injected seams: request identities and seeds, and the window-width reading. */
// @spec-link [[service_session_engine]]
export interface SessionEngineDependencies {
  readonly providers: GenerationIntentProviders
  readonly viewport: Pick<ViewportWidthProvider, 'isBelowTabletLandscape'>
}

/** A started session: the outputs of its start, and the handler of every later event. */
// @spec-link [[service_session_engine]]
export interface SessionEngine {
  readonly outputsAtStart: readonly SessionOutput[]
  handle(event: SessionEvent): readonly SessionOutput[]
}

/** Typed failure for a caller that breaks the engine's contract: an event it cannot accept. */
// @spec-link [[service_session_engine]]
export class SessionEngineError extends Error {
  readonly kind = 'SessionEngineError' as const

  constructor(message: string) {
    super(message)
    this.name = 'SessionEngineError'
  }
}
