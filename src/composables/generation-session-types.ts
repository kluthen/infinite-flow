/**
 * The workspace generation session's public types, its usage error and the mutable mirror of its
 * state, split out of use-generation-session.ts, which re-exports them unchanged. This module holds
 * no behaviour: the root composable and its sibling modules share these shapes from here.
 */

import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { NoteDensityContext } from '@/domain/controls/generated-note-density'
import type { FigureId, FigureLevel, FigureLevels } from '@/domain/figures/figure-levels'
import type {
  GenerationIntent,
  GenerationIntentProviders,
} from '@/domain/generation/generation-intent'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import type { PresetId, PresetSelection } from '@/domain/presets/preset-selection'
import type { Seed } from '@/domain/random/seed'
import type { MyInstrumentSaves, SaveSettings } from '@/storage/settings-saver'
import type {
  StaffFitVerdict,
  StaffKeySignature,
  StaffRoomVerdict,
} from '@/notation/staff-fit-types'
import type { RoomNoticeCause } from './generation-session-fit-round'
import type {
  MyInstrumentChangeOutcome,
  MyInstrumentSessions,
} from './generation-session-my-instrument'
import type { ProfileSelectionOutcome } from './generation-session-profile-switch'
import type { PostPrewarm } from './generation-session-prewarm'
import type { StaffLayoutReports } from './generation-session-room-notice'
import type { ViewportWidthProvider } from './viewport-width'

export type ThemePreference = 'System' | 'Light' | 'Dark'
export type SessionOperation = 'idle' | 'generating' | 'notating'

export interface PresentationSettings {
  readonly theme: ThemePreference
}

/**
 * The Idle session's state. The player's generation settings are held in three parts: the
 * controls, the seven figure levels and the preset selection (a preset, or Custom naming its
 * base); no musical profile and no customized mark is held.
 */
export interface GenerationSessionState<TResult> {
  readonly controls: GenerationControls
  /** The seven figure levels every phrase built at Idle is generated with. */
  readonly figureLevels: FigureLevels
  /** The preset selected, or Custom based on the preset it came from (or on none). */
  readonly selection: PresetSelection
  readonly presentation: PresentationSettings
  /**
   * The player's own instrument, while it exists: its profile is what every intent built while the
   * controls name `my-instrument` carries as data, and its clef the one its phrases are drawn in.
   */
  readonly myInstrument: MyInstrument | null
  readonly latestIntent: GenerationIntent | null
  readonly result: TResult | null
  readonly operation: SessionOperation
  readonly generationError: Error | null
  readonly notationError: Error | null
  /**
   * Whether the retained `result` has actually been engraved since it was last assigned: cleared
   * when a fresh result is assigned or a notation attempt against it fails, set once one succeeds.
   * Independent of `notationError`, which a new generation attempt clears without redrawing.
   */
  readonly resultEngraved: boolean
  /**
   * What, besides the chosen note density, decides the density the next phrase is generated with:
   * where the window stood against `bp-tablet-landscape` at the last read or crossing, and whether
   * a session has stepped down (never, at Idle). The controls show the density it gives and the
   * unsupported-rhythm block judges it; each generation reads the width afresh.
   */
  readonly noteDensityContext: NoteDensityContext
  /** Whether the "staff needs more room" notice shows at Idle, and with which cause. */
  readonly roomNotice: RoomNoticeCause | null
  /**
   * Whether a fit run's fresh-seed retries are running: true from the first attempt found too
   * wide, or from the start of a round under the too-many-notes notice, until the run ends.
   */
  readonly retriesRunning: boolean
  /**
   * Counts every time the notice must be announced: each time it begins, and each time a round
   * under it ends with every attempt too wide. The interface re-announces the notice on a change.
   */
  readonly roomNoticeAnnouncements: number
}

export interface GenerationSessionActions {
  readonly setControl: <K extends keyof GenerationControls>(
    key: K,
    value: GenerationControls[K],
  ) => boolean
  /**
   * Choose a preset, at Idle only (false otherwise): its ten preset-held controls and seven levels
   * replace the current ones, the key and mode kept when its restriction allows them, and the
   * selection becomes it. Choosing the preset already selected changes nothing. An id no known
   * preset has is a defect: SessionUsageError.
   */
  readonly selectPreset: (id: PresetId) => boolean
  /**
   * Set one figure's level, at Idle only (false otherwise); with a preset selected the selection
   * becomes Custom based on it. A figure or level that is not one is a defect: SessionUsageError.
   */
  readonly setFigureLevel: (figure: FigureId, level: FigureLevel) => boolean
  readonly selectInstrumentProfile: (id: InstrumentProfileId) => Promise<ProfileSelectionOutcome>
  /**
   * Save my instrument, made or changed: its record is written at once, or, for a change of range
   * or transposition while it has kept sessions, in one batch erasing `sessions`, applied once
   * saved; a new one is selected, a change to the selected one replaces the phrase (range or
   * transposition) or redraws it (clef alone), as an instrument switch would, once a generation
   * under way has ended. A refused batch, or one with saving off, changes nothing.
   */
  // @spec-link [[req_my_instrument]]
  readonly saveMyInstrument: (
    instrument: MyInstrument,
    sessions: MyInstrumentSessions,
  ) => Promise<MyInstrumentChangeOutcome>
  /**
   * Save my instrument, made or changed, as `saveMyInstrument` does, and make it the selection:
   * one that exists but is not selected is selected once its record is written, a switch that
   * replaces the phrase. What the transposition check's Use for my instrument does.
   */
  // @spec-link [[rule_transposition_check_sets_my_instrument]]
  readonly saveAndSelectMyInstrument: (
    instrument: MyInstrument,
    sessions: MyInstrumentSessions,
  ) => Promise<MyInstrumentChangeOutcome>
  /**
   * Delete my instrument and its counted kept `sessions` in one batch; once saved, and while it
   * was selected, its template is selected, a switch. A refusal changes nothing.
   */
  // @spec-link [[req_my_instrument]]
  readonly deleteMyInstrument: (
    sessions: MyInstrumentSessions,
  ) => Promise<MyInstrumentChangeOutcome>
  readonly setTheme: (theme: ThemePreference) => boolean
  readonly generate: () => Promise<boolean>
  readonly regenerate: () => Promise<boolean>
  readonly retryGeneration: () => Promise<boolean>
  readonly retryNotation: () => Promise<boolean>
  readonly reportNotationFailure: (error: Error) => boolean
  readonly reportNotationRecovered: () => boolean
  /**
   * The phrase a session end asks for once phrase 1 has sounded: the phrase on screen leaves at
   * once and a new one is generated from the current controls (fresh seed, no carry-in, the fit
   * retries), unless the staff has no room (the no-room notice, until it clears) or the rhythm
   * combination is blocked (no phrase). Resolves true when it leaves a phrase as the result.
   */
  // @spec-link [[rule_session_end_generates_next_phrase_one]]
  readonly startFreshPhrase: () => Promise<boolean>
}

export interface GenerationSession<TResult> {
  readonly state: Readonly<GenerationSessionState<TResult>>
  readonly actions: GenerationSessionActions
  /** Stop listening for window-width crossings; the root calls it when the workspace unmounts. */
  readonly dispose: () => void
}

/**
 * The settings the Idle session starts from: the player's saved controls, figure levels, preset
 * selection and theme, and my instrument when it loaded, loaded before the workspace is first
 * drawn. Controls naming `my-instrument` come only with my instrument.
 */
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
// @spec-link [[rule_settings_saved_on_change]]
// @spec-link [[entity_my_instrument_record]]
export interface InitialGenerationSettings {
  readonly controls: GenerationControls
  readonly figureLevels: FigureLevels
  readonly selection: PresetSelection
  readonly theme: ThemePreference
  readonly myInstrument: MyInstrument | null
}

/**
 * What the Idle session is built from. `TGenerated` is what one generation attempt gives; `TResult`
 * is the published result the state holds: the generated phrase that became phrase 1, joined with
 * the session seed drawn for it.
 */
// @spec-link [[service_idle_generation_session]]
// @spec-link [[module_session_seed_plan]]
export interface CreateGenerationSessionOptions<TResult, TGenerated = TResult> {
  readonly providers: GenerationIntentProviders
  /**
   * Where the session seed of each published phrase 1 comes from: drawn once per phrase 1 a fit
   * run publishes, never per attempt, and separate from `providers.nextSeed`, so phrase seeds draw
   * exactly as they would without it.
   */
  readonly nextSessionSeed: () => Seed
  /** Join a generated phrase with the session seed drawn for it, as the published result. */
  readonly withSessionSeed: (generated: TGenerated, sessionSeed: Seed) => TResult
  /** Where the window stands against `bp-tablet-landscape`; read when each phrase is generated. */
  readonly viewport: ViewportWidthProvider
  readonly generate: (intent: GenerationIntent) => Promise<TGenerated>
  readonly notate: (result: TResult) => Promise<void>
  /** Check a generated phrase against the staff's current layout inputs, drawing nothing. */
  readonly checkFit: (generated: TGenerated) => Promise<StaffFitVerdict>
  /** Check whether the staff has room at all, whatever the notes, with this key signature. */
  readonly checkRoom: (signature: StaffKeySignature) => Promise<StaffRoomVerdict>
  /** The staff's layout-input reports (container width, viewport and height budget). */
  readonly staffLayout: StaffLayoutReports
  /**
   * Drop whatever the injected `notate` seam is currently presenting: for a phrase that gives way
   * to no phrase, to the room notice, or to a Loading with no score shown.
   */
  readonly clearPresentedPhrase: () => void
  /**
   * Where to post a rhythm-domain prewarm (the worker client's fire-and-forget `prewarm`): once at
   * creation for the current width-resolved controls, then once per change of the width-resolved
   * rhythm setting. Absent means prewarm is off: the workspace composition root leaves it out when
   * its prewarm policy is disabled, and a caller with no generation worker has nothing to warm.
   */
  readonly prewarm?: PostPrewarm
  /**
   * Told the intent of every Idle phrase the fit run accepts (drawn, or kept as a retryable
   * notation error), once, for its replay-key announcement. Absent means no announcement: the
   * workspace composition root always supplies it, and a caller with no console sink has nothing
   * to announce to.
   */
  // @spec-link [[module_phrase_replay_key]]
  readonly onPhraseAccepted?: (intent: GenerationIntent) => void
  /**
   * The settings the session starts from, so the workspace is first drawn with them and its
   * creation prewarm warms them. Absent means the first-load values (the default controls, the
   * Neutral levels and the Neutral selection, theme `System`): the app always supplies the loaded
   * ones.
   */
  // @spec-link [[rule_first_phrase_waits_for_saved_settings]]
  readonly initialSettings?: InitialGenerationSettings
  /**
   * Where the player's changes to the controls, the preset selection and the theme are saved:
   * each control action that applies saves exactly the settings it changed. The actions are called
   * from the player's change handlers only, so what the app changes by itself is never saved.
   */
  // @spec-link [[rule_settings_saved_on_change]]
  // @spec-link [[rule_saved_setting_is_players_choice]]
  readonly saveSettings: SaveSettings
  /**
   * Where my instrument's record is written and deleted, by the player's save or deletion. Absent
   * for a caller that saves nothing of my instrument: saving or deleting it is then a defect and
   * throws. The workspace composition root always supplies it.
   */
  // @spec-link [[entity_my_instrument_record]]
  readonly myInstrumentSaves?: MyInstrumentSaves
}

/** A programming-usage error: a caller used a session action against its documented contract. */
export class SessionUsageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionUsageError'
  }
}

/**
 * Internal mutable mirror of `GenerationSessionState`: the public interface is readonly for
 * consumers, but the session composable owns the fields and must be able to replace them. Exported
 * so the root composable and its sibling modules can share the same reactive state object.
 */
// @spec-link [[service_idle_generation_session]]
export type MutableGenerationSessionState<TResult> = {
  -readonly [K in keyof GenerationSessionState<TResult>]: GenerationSessionState<TResult>[K]
}
