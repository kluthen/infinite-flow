/**
 * The single ambient declaration of the workspace harness's published `window.__workspaceHarness`
 * API, shared by the harness page (tests/e2e/workspace-harness/main.ts) and every release journey
 * spec. It is a script file with no imports so both the application and the e2e TypeScript
 * projects can include it directly without pulling each other's files into their programs.
 */

/** The closed set of typed generation-failure codes a real orchestration run can produce. */
type WorkspaceHarnessGenerationFailureCode =
  | 'no_legal_harmony_plan'
  | 'no_legal_rhythm_plan'
  | 'no_legal_pitch_plan'
  | 'no_eligible_register_window'
  | 'search_limit_exceeded'
  | 'result_validation_failed'

/** The notation failure codes `failNextNotation` can force: a retryable one, or a staff layout failure. */
type WorkspaceHarnessNotationFailureCode =
  'notation_engraving_failed' | 'notation_notes_too_wide' | 'notation_no_room'

/** A fit verdict `queueFitVerdicts` can force on the pre-draw fit check (no room comes from real sizes). */
type WorkspaceHarnessFitVerdict = 'notes_too_wide' | 'fits'

/** One deterministic-replay / presentation-isolation snapshot of the current workspace session. */
interface WorkspaceHarnessSnapshot {
  readonly operation: 'idle' | 'generating' | 'notating'
  /** The active instrument profile: notation always reads its own written pitch from this. */
  readonly instrumentProfileId: string
  /** The player's written-pitch tonal-center selection (ISS-003): null with no result yet. */
  readonly writtenTonalCenter: string | null
  /** The concert-pitch tonal center the generator actually consumed, converted from `writtenTonalCenter`. */
  readonly concertTonalCenter: string | null
  readonly requestId: string | null
  readonly seed: number | null
  /** `JSON.stringify` of the latest result's concert-event timeline, or null with no result yet. */
  readonly timeline: string | null
  /** The note density the player has chosen, kept as chosen whatever the window's width. */
  readonly chosenNoteDensity: string
  /** The note density the latest result was generated with (`Eighth` for a chosen `Sixteenth` below the tablet-landscape width), or null with no result yet. */
  readonly generatedNoteDensity: string | null
  /** The seed of the latest attempt the session generated, drawn or not, or null before any. */
  readonly latestSeed: number | null
  /** Whether the "staff needs more room" notice shows, and with which cause. */
  readonly roomNotice: 'no_room' | 'notes_too_wide' | null
  /** Whether a fit run's fresh-seed retries are running. */
  readonly retriesRunning: boolean
  /** How many times the notice has had to be announced since the page loaded. */
  readonly roomNoticeAnnouncements: number
}

/** Where the harness's audio runs: the fake audio rig (the default) or `?audio=real`. */
type WorkspaceHarnessAudioMode = 'fake' | 'real'

/** A started session's timeline on the audio clock, in seconds. */
interface WorkspaceHarnessAudioTimeline {
  readonly startAt: number
  readonly countInEndsAt: number
}

/** One mix gain stage (src/audio/audio-ports.ts's `MixGain`). */
type WorkspaceHarnessMixGain = 'click-enable' | 'click-volume' | 'backing-enable' | 'backing-volume'

/**
 * One call the transport made on its audio output, as the recorder logged it (the shape of
 * tests/unit/audio/fake-audio.ts's `FakeAudioEvent`). `scheduledAt` is the audio clock's time at
 * the call; buses are numbered from 1 in opening order.
 */
type WorkspaceHarnessAudioEvent =
  | {
      readonly kind: 'click'
      readonly bus: number
      readonly at: number
      readonly accent: boolean
      readonly route: 'count-in' | 'click'
      readonly scheduledAt: number
    }
  | {
      readonly kind: 'gain'
      readonly gain: WorkspaceHarnessMixGain
      readonly value: number
      readonly at: number
      readonly scheduledAt: number
    }
  | {
      readonly kind: 'fade'
      readonly bus: number
      readonly at: number
      readonly duration: number
      readonly scheduledAt: number
    }
  | { readonly kind: 'open-bus'; readonly bus: number; readonly scheduledAt: number }

/** A click that sounds, with the click-volume gain it sounds at. */
type WorkspaceHarnessAudibleClick = Extract<WorkspaceHarnessAudioEvent, { kind: 'click' }> & {
  readonly gain: number
}

/** The mix's first-load levels and volume range, read from the `--mix-*` design tokens. */
interface WorkspaceHarnessMixDesign {
  readonly defaults: {
    readonly clickOn: boolean
    readonly clickVolume: number
    readonly backingOn: boolean
    readonly backingVolume: number
  }
  readonly range: {
    readonly clickVolumeMin: number
    readonly backingVolumeMin: number
    readonly volumeMax: number
  }
}

/**
 * The harness's audio transport. A session starts only from a click on the harness's
 * "Start audio (harness)" button, at the tempo `armStart` set; every value returned is plain JSON.
 */
interface WorkspaceHarnessAudioApi {
  mode: () => WorkspaceHarnessAudioMode
  /** Set the tempo the next Start audio click starts at. One shot; an unarmed click throws. */
  armStart: (options: { readonly tempo: number }) => void
  /** The latest started session's timeline, or null before the first Start audio click. */
  timeline: () => WorkspaceHarnessAudioTimeline | null
  isUnlocked: () => boolean
  isRunning: () => boolean
  /** The audio clock's time. Throws before the first Start audio click. */
  now: () => number
  /** Move the fake audio clock forward in 25 ms wake steps. Throws in real mode. */
  advance: (seconds: number) => void
  /** Every recorded call on the audio output, in call order. */
  events: () => readonly WorkspaceHarnessAudioEvent[]
  /** The recorded clicks that sound, with the gain they sound at. */
  audibleClicks: () => readonly WorkspaceHarnessAudibleClick[]
  setClickOn: (on: boolean) => void
  setClickVolume: (level: number) => void
  setBackingOn: (on: boolean) => void
  setBackingVolume: (level: number) => void
  /** Fade the running session out; throws if none is running. */
  stop: () => { readonly fadeEndsAt: number }
  mixDesign: () => WorkspaceHarnessMixDesign
}

interface WorkspaceHarnessApi {
  /** Append deterministic seeds to the queue `nextSeed()` draws from first, in call order. */
  queueSeeds: (seeds: readonly number[]) => void
  /** Hold every subsequent `generate` call before it reaches the real worker, until released. */
  holdGeneration: () => void
  /** Release the current hold; every gated `generate` call resumes immediately. */
  releaseGeneration: () => void
  /**
   * Arm exactly one forced generation failure using the given real orchestration failure code,
   * applied to the `generate` call after `skip` more (default 0) have passed through for real.
   */
  failNextGeneration: (code: WorkspaceHarnessGenerationFailureCode, skip?: number) => void
  /**
   * Arm exactly one forced notation failure on the next engraving (a draw or a redraw), with this
   * code: `notation_engraving_failed` (the default, retryable) or a staff layout failure.
   */
  failNextNotation: (code?: WorkspaceHarnessNotationFailureCode) => void
  /**
   * Append forced verdicts the next pre-draw fit checks return, one per check, in order; once the
   * queue is empty the real planner answers.
   */
  queueFitVerdicts: (verdicts: readonly WorkspaceHarnessFitVerdict[]) => void
  /** How many pre-draw fit checks have run since the page loaded, forced or real. */
  fitChecks: () => number
  /** How many engravings (draws and redraws) have been attempted since the page loaded. */
  engravings: () => number
  /** How many phrase-independent room checks have run since the page loaded. */
  roomChecks: () => number
  /** How many seeds the session has drawn from the seed provider since the page loaded. */
  seedsDrawn: () => number
  /** The current workspace session snapshot. */
  snapshot: () => WorkspaceHarnessSnapshot
  /**
   * How many rhythm-domain prewarms the workspace has posted to the real worker since the page
   * loaded; always 0 with `?prewarm=off`.
   */
  prewarmCount: () => number
  /** The audio transport's seams (see `WorkspaceHarnessAudioApi`). */
  audio: WorkspaceHarnessAudioApi
}

interface Window {
  __workspaceHarness: WorkspaceHarnessApi
}
