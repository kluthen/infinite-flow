/**
 * The workspace generation session's public types, its usage error and the mutable mirror of its
 * state, split out of use-generation-session.ts, which re-exports them unchanged. This module holds
 * no behaviour: the root composable and its sibling modules share these shapes from here.
 */

import type { GenerationControls, MusicalProfile } from '@/domain/controls/generation-controls'
import type { ProfileSelection } from '@/domain/controls/profile-selection'
import type { NoteDensityContext } from '@/domain/controls/generated-note-density'
import type {
  GenerationIntent,
  GenerationIntentProviders,
} from '@/domain/generation/generation-intent'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import type { Seed } from '@/domain/random/seed'
import type {
  StaffFitVerdict,
  StaffKeySignature,
  StaffRoomVerdict,
} from '@/notation/staff-fit-types'
import type { RoomNoticeCause } from './generation-session-fit-round'
import type { ProfileSelectionOutcome } from './generation-session-profile-switch'
import type { PostPrewarm } from './generation-session-prewarm'
import type { StaffLayoutReports } from './generation-session-room-notice'
import type { ViewportWidthProvider } from './viewport-width'

export type ThemePreference = 'System' | 'Light' | 'Dark'
export type SessionOperation = 'idle' | 'generating' | 'notating'

export interface PresentationSettings {
  readonly theme: ThemePreference
}

export interface GenerationSessionState<TResult> {
  readonly controls: GenerationControls
  readonly profileSelection: ProfileSelection
  readonly presentation: PresentationSettings
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
  readonly selectMusicalProfile: (profile: MusicalProfile) => boolean
  readonly selectInstrumentProfile: (id: InstrumentProfileId) => Promise<ProfileSelectionOutcome>
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
 * The settings the Idle session starts from: the player's saved controls, musical profile
 * selection and theme, loaded before the workspace is first drawn.
 */
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
// @spec-link [[rule_settings_saved_on_change]]
export interface InitialGenerationSettings {
  readonly controls: GenerationControls
  readonly profileSelection: ProfileSelection
  readonly theme: ThemePreference
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
   * creation prewarm warms them. Absent means the first-load values (the default controls and
   * profile selection, theme `System`): the app always supplies the loaded ones.
   */
  // @spec-link [[rule_first_phrase_waits_for_saved_settings]]
  readonly initialSettings?: InitialGenerationSettings
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
