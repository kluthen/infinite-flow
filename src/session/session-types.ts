/**
 * The contract of the session engine: the timed events a running session feeds it, the outputs it
 * answers with, the phrase record it keeps for every phrase of the session, and the typed error it
 * throws when its caller breaks that contract. Time is audio time, plain seconds on the audio
 * clock, carried on every event; nothing here reads a clock.
 */

import type { ViewportWidthProvider } from '../composables/viewport-width'
import type { GenerationControls } from '../domain/controls/generation-controls'
import type { FigureId, FigureLevels } from '../domain/figures/figure-levels'
import type {
  GenerationIntent,
  GenerationIntentProviders,
} from '../domain/generation/generation-intent'
import type { GenerationOutcome } from '../domain/generation/orchestration/orchestration-types'
import type { KeyAndModeRestriction } from '../domain/presets/key-and-mode-restriction'
import type { PresetSelection } from '../domain/presets/preset-selection'
import type { InstrumentProfile } from '../domain/profile/instrument-profile'
import type { Seed } from '../domain/random/seed'
import type { ReadyPhrase } from './session-ready-phrases'
import type { AllowedGroups, MutableSetting, SettingsMutationFlag } from './settings-mutation'

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
 * Session settings: those the player chose when the session started, which the player cannot edit
 * during it, or those an automatic source put in effect at a phrase boundary since. The controls
 * hold the written tonal center and the chosen note density; the figure levels are the seven
 * figures' levels every phrase is generated with; the selection is the preset selected, or Custom
 * naming its base, which a Vary settings step of a preset-held setting marks Custom for the
 * session. No musical profile is held. `instrumentProfile` is my instrument's profile, carried as
 * data exactly when the controls name `my-instrument` (taken at Start from phrase 1's intent); a
 * built-in's is resolved from its id, so built-in settings hold none. `restriction` is the
 * restriction in force at the session's start, frozen there for the whole session: Vary
 * settings' key and mode moves stay inside it. It is absent when none was in force, or when the
 * one in force allows every key and mode, so nothing is drawn again for a restriction's sake. No
 * phrase is generated from it, nor from the allowed groups or the rhythm lock's state.
 */
// @spec-link [[service_session_engine]]
// @spec-link [[rule_session_settings_locked]]
export interface SessionSettings {
  readonly controls: GenerationControls
  readonly figureLevels: FigureLevels
  readonly selection: PresetSelection
  readonly instrumentProfile?: InstrumentProfile
  readonly restriction?: KeyAndModeRestriction
  /** Vary settings' allowed groups, saved with the option: only their settings may move. */
  readonly allowedGroups: AllowedGroups
  /**
   * Whether the session's rhythm lock is on: while it is, Vary settings never moves the Rhythm
   * group. Nothing turns it on in a session yet.
   */
  readonly rhythmLockOn: boolean
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

/**
 * What a session starts from: the moment the count-in starts, the chosen settings, phrase 1, the
 * session seed drawn at Idle with phrase 1, from which every attempt seed is derived, the
 * settings-mutation flag, its mutation seed derived from the session seed, so the session replays
 * from its start and its event list alone, and whether adaptive tempo runs in it: only when the
 * page's adaptive-tempo flag is on and the session has a controller at its start, whether the
 * multi-phrase tension arc runs in it, and the phrases pre-generated at Idle, if any. The chosen
 * settings' tempo is the starting tempo. Phrase 1's own settings, beside the chosen ones, are
 * those it was generated under at Idle.
 */
// @spec-link [[service_session_engine]]
// @spec-link [[req_settings_mutation_flag]]
export interface SessionStart {
  readonly at: AudioTime
  readonly settings: SessionSettings
  readonly phraseOne: { readonly intent: GenerationIntent; readonly outcome: SuccessfulOutcome }
  /**
   * The settings phrase 1 was generated under, at the session's tempo and with its instrument:
   * phrase 2 joins phrase 1 as after a change from them to the chosen settings at the boundary
   * between the two, the carry-in adapted. Absent means the chosen settings, as do equal values.
   */
  readonly phraseOneSettings?: SessionSettings
  /** The session seed every seed the session uses after phrase 1 is derived from. */
  readonly sessionSeed: Seed
  readonly mutation: SettingsMutationFlag
  readonly adaptiveTempo: boolean
  /** Whether each phrase is generated with its four-phrase cycle step around the tension arc. */
  readonly multiPhraseTensionArc: boolean
  /**
   * The phrases pre-generated at Idle that Start took, in order from phrase 2, at most four; the
   * engine spends each one whose intent it re-derives identically in place of requesting it.
   * Absent means none, as an empty list does: pre-generation off or nothing ready.
   */
  readonly readyPhrases?: readonly ReadyPhrase[]
}

/**
 * A timed event of a running session. `count-in-over` is the moment phrase 1 starts sounding;
 * `phrase-started-sounding` is sent for phrase 2 onward; `generation-crashed` is a rejected
 * generate request (a worker crash on that request, or a dead worker), which counts as a failed
 * attempt; `settings-change` gives the complete settings in effect from then on, from an automatic
 * source other than the engine's own mutations; `controller` tells that a controller lost
 * mid-session goes away (`attached` false) or reconnects, sent only in a session that started with
 * a controller; `tick` lets the engine see a deadline pass.
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
  | { readonly kind: 'settings-change'; readonly at: AudioTime; readonly settings: SessionSettings }
  | { readonly kind: 'controller'; readonly at: AudioTime; readonly attached: boolean }
  | { readonly kind: 'tick'; readonly at: AudioTime }
  | { readonly kind: 'end'; readonly at: AudioTime; readonly cause: SessionEndCause }

/**
 * What the engine asks its caller to do or tells it happened. `retry` counts the attempts made for
 * the phrase before this one: 0 for the first carry-in attempt, 1 to 3 for the carry-in retries
 * and 4 for the standalone retry. `check-fit` carries the checked attempt's own intent, which can
 * differ between attempts for the same phrase. `phrase-ready` is the phrase to show next as
 * read-ahead, repeats included; `phrase-sounding` carries the tempo that phrase plays at.
 * `settings-changed` names the first phrase new settings apply to, and `phrase-discarded` a
 * look-ahead phrase dropped to be requested again with new settings. `phrase-tempo` gives the
 * tempo of a phrase from 2 on, output once, when it is fixed at that phrase's look-ahead deadline.
 * `cancel-generation` names an attempt dropped while still generating, to be stopped where it
 * runs; it comes before any `request-generation` of the same event.
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
  | {
      readonly kind: 'phrase-sounding'
      readonly at: AudioTime
      readonly phrase: SessionPhrase
      readonly tempo: number
    }
  | { readonly kind: 'struggling-notice'; readonly visible: boolean }
  | { readonly kind: 'wake-at'; readonly at: AudioTime }
  | {
      readonly kind: 'ended'
      readonly at: AudioTime
      readonly cause: SessionEndCause
      readonly phase: 'count-in' | 'running'
      readonly soundedPhraseCount: number
    }
  | SettingsChangedOutput
  | { readonly kind: 'phrase-discarded'; readonly phraseNumber: number }
  | { readonly kind: 'phrase-tempo'; readonly phraseNumber: number; readonly tempo: number }
  | { readonly kind: 'cancel-generation'; readonly attemptId: number }

/**
 * New settings in effect from a phrase on: from the engine's own mutation, which names the one
 * setting it stepped (and, for a figure step, the figure) and the values it stepped from and to,
 * or from an automatic settings change.
 */
// @spec-link [[service_session_engine]]
// @spec-link [[rule_session_change_applies_at_phrase_boundary]]
// @spec-link [[rule_mutation_lands_on_scheduled_phrase]]
export type SettingsChangedOutput =
  | {
      readonly kind: 'settings-changed'
      readonly phraseNumber: number
      readonly settings: SessionSettings
      readonly cause: 'mutation'
      readonly setting: MutableSetting
      readonly figure?: FigureId
      readonly from: string
      readonly to: string
    }
  | {
      readonly kind: 'settings-changed'
      readonly phraseNumber: number
      readonly settings: SessionSettings
      readonly cause: 'automatic'
    }

/** Whether any of a session phrase is drawn on screen, as read-ahead or sounding. */
// @spec-link [[service_session_engine]]
// @spec-link [[rule_session_change_applies_at_phrase_boundary]]
export interface SessionDisplayReading {
  isPhraseOnScreen(phraseNumber: number): boolean
}

/**
 * The engine's injected seams: request identities (attempt seeds come from the session seed
 * plan, never from a provider), the window-width reading and the display reading.
 */
// @spec-link [[service_session_engine]]
export interface SessionEngineDependencies {
  readonly providers: Pick<GenerationIntentProviders, 'nextRequestId'>
  readonly viewport: Pick<ViewportWidthProvider, 'isBelowTabletLandscape'>
  readonly display: SessionDisplayReading
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
