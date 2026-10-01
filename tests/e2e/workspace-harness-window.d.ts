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
      readonly kind: 'backing'
      readonly bus: number
      readonly voice: 'bass' | 'chord'
      readonly pitch: number
      readonly at: number
      readonly until: number
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

/** A scheduled backing note, as recorded. */
type WorkspaceHarnessBackingNote = Extract<WorkspaceHarnessAudioEvent, { kind: 'backing' }>

/** A backing note that sounds, with the backing-volume gain it sounds at. */
type WorkspaceHarnessAudibleBackingNote = WorkspaceHarnessBackingNote & { readonly gain: number }

/**
 * One harmony event of the shown phrase, as `queueBacking` queued it: where it starts in the
 * phrase (bar 0-3, beat 0 or 2), how many beats it lasts, and its triad's three pitch classes
 * (0-11, root first).
 */
interface WorkspaceHarnessQueuedHarmonyEvent {
  readonly barIndex: number
  readonly startBeat: number
  readonly durationBeats: number
  readonly pitchClasses: readonly [number, number, number]
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
  /** The output's latency in seconds, as the playhead reads it. Throws before unlock. */
  outputLatency: () => number
  /**
   * One simultaneous reading of the audio clock and performance.now() (the transport's
   * `clockAnchor()`): `audioTime` on the scheduling timeline, in seconds, and the
   * `performanceTimeMs` it corresponds to. Throws before unlock.
   */
  clockAnchor: () => { readonly audioTime: number; readonly performanceTimeMs: number }
  /** When the running session's phrase `phraseNumber` (from 1) starts; throws with none running. */
  phraseStartsAt: (phraseNumber: number) => number
  /** Move the fake audio clock forward in 25 ms wake steps. Throws in real mode. */
  advance: (seconds: number) => void
  /** Every recorded call on the audio output, in call order. */
  events: () => readonly WorkspaceHarnessAudioEvent[]
  /** The recorded clicks that sound, with the gain they sound at. */
  audibleClicks: () => readonly WorkspaceHarnessAudibleClick[]
  /**
   * Queue the running session's phrase `phraseNumber` (1, 2, 3… in order) with the harmony of the
   * phrase the workspace currently shows (`outcome.provenance.harmony.events`), through the
   * transport's own `queueBacking`, and return that harmony. Throws with no phrase shown, and
   * whenever the transport's `queueBacking` throws (no session, out of order, too late).
   */
  queueBacking: (phraseNumber: number) => readonly WorkspaceHarnessQueuedHarmonyEvent[]
  /** Every scheduled backing note, in call order. */
  backingNotes: () => readonly WorkspaceHarnessBackingNote[]
  /** The recorded backing notes that sound, with the gain they sound at. */
  audibleBacking: () => readonly WorkspaceHarnessAudibleBackingNote[]
  /** The transport's mix now: the four controls the audio mix in the toolbar sets. */
  mix: () => WorkspaceHarnessMixDesign['defaults']
  setClickOn: (on: boolean) => void
  setClickVolume: (level: number) => void
  setBackingOn: (on: boolean) => void
  setBackingVolume: (level: number) => void
  /** Fade the running session out; throws if none is running. */
  stop: () => { readonly fadeEndsAt: number }
  mixDesign: () => WorkspaceHarnessMixDesign
}

/**
 * Where the harness's MIDI access comes from: a fake Web MIDI (the default), a fake browser
 * without Web MIDI (`?midi=unsupported`), or the browser's own (`?midi=real`).
 */
type WorkspaceHarnessMidiMode = 'fake' | 'unsupported' | 'real'

/** One MIDI input, as the controller shows it (src/midi/midi-controller-state.ts's `MidiDevice`). */
interface WorkspaceHarnessMidiDevice {
  readonly id: string
  readonly name: string
  readonly manufacturer: string
}

/** The controller's state (src/midi/midi-controller-state.ts's `MidiControllerState`). */
type WorkspaceHarnessMidiState =
  | {
      readonly kind:
        'unsupported' | 'not-requested' | 'requesting' | 'denied' | 'no-device' | 'choosing'
    }
  | {
      readonly kind: 'opening' | 'connected' | 'away'
      readonly device: WorkspaceHarnessMidiDevice
    }

/** One of the controller's state kinds. */
type WorkspaceHarnessMidiStateKind = WorkspaceHarnessMidiState['kind']

/** The browser's MIDI permission (src/midi/midi-access-port.ts's `MidiPermissionState`). */
type WorkspaceHarnessMidiPermissionState = 'granted' | 'prompt' | 'denied' | 'unknown'

/** A note-on that counted as played: its concert pitch, velocity and audio-clock onset. */
interface WorkspaceHarnessPlayedNote {
  readonly pitch: number
  readonly velocity: number
  readonly onsetAt: number
}

/** A note that ended, with its full span on the audio clock. */
interface WorkspaceHarnessEndedNote extends WorkspaceHarnessPlayedNote {
  readonly releaseAt: number
}

/**
 * The harness's MIDI controller, the one the workspace session holds. The fake-only controls throw
 * with `?midi=real`; those taking an audio time need the fake audio clock and throw with
 * `?audio=real`. Every value in and out is plain JSON.
 */
interface WorkspaceHarnessMidiApi {
  mode: () => WorkspaceHarnessMidiMode
  /**
   * The "Connect controller" click's work: unlock the audio (fake audio clock), or require it
   * already unlocked by a real click (`?audio=real`), then connect the controller.
   */
  connect: () => Promise<void>
  select: (deviceId: string) => Promise<void>
  state: () => WorkspaceHarnessMidiState
  devices: () => readonly WorkspaceHarnessMidiDevice[]
  /** Plug a fake device in (a known id comes back as the same port). Fake only. */
  plug: (device: WorkspaceHarnessMidiDevice) => void
  /** Unplug a fake device at this audio time. Fake only. */
  unplug: (deviceId: string, atAudioTime: number) => void
  /** Play a note-on on a fake device at this audio time (channel 0-15, default 0). Fake only. */
  noteOn: (
    deviceId: string,
    pitch: number,
    velocity: number,
    atAudioTime: number,
    channel?: number,
  ) => void
  /** Play a note-off on a fake device at this audio time (channel 0-15, default 0). Fake only. */
  noteOff: (deviceId: string, pitch: number, atAudioTime: number, channel?: number) => void
  /** Send raw message bytes from a fake device at this audio time. Fake only. */
  send: (deviceId: string, bytes: readonly number[], atAudioTime: number) => void
  /** Make the next MIDI access request denied. Fake only. */
  denyNextRequest: () => void
  /** Keep the next MIDI access request in flight until `releaseHeldRequest`. Fake only. */
  holdNextRequest: () => void
  /** Settle the held MIDI access request. Fake only. */
  releaseHeldRequest: () => void
  /**
   * Set the MIDI permission the browser reports, read without prompting. Otherwise it is `prompt`
   * until a request is answered (`unknown` with `?midi=unsupported`), then `granted` or `denied`
   * as answered. Fake only.
   */
  setPermission: (state: WorkspaceHarnessMidiPermissionState) => void
  /** How many times MIDI access was requested since the page loaded. Fake only. */
  requestCount: () => number
  /** Every note the controller reported played, in order. */
  playedNotes: () => readonly WorkspaceHarnessPlayedNote[]
  /** Every note the controller reported ended, in order. */
  endedNotes: () => readonly WorkspaceHarnessEndedNote[]
  /**
   * The controller's state kinds since the page loaded, in order: the first state, then each
   * change of kind its subscribers heard.
   */
  stateLog: () => readonly WorkspaceHarnessMidiStateKind[]
}

/** How the harness's fake browser answers the next requests for one screen lock. */
type WorkspaceHarnessScreenLockBehaviour = 'grant' | 'refuse' | 'unsupported'

/**
 * One logged screen-lock event (tests/unit/session/fake-session-browser.ts's
 * `FakeScreenLockEvent`): a request, the browser's answer to it (`grant`, `refuse`,
 * `unsupported`), a release call, or the browser dropping a held lock on its own.
 */
type WorkspaceHarnessScreenLockEvent =
  'request' | 'grant' | 'refuse' | 'unsupported' | 'release' | 'drop'

/** One fake screen lock (the wake lock or the landscape orientation lock). */
interface WorkspaceHarnessScreenLockApi {
  /** Choose how every later request is answered; `grant` from page load. */
  setBehaviour: (behaviour: WorkspaceHarnessScreenLockBehaviour) => void
  /** How many requests the session made since the page loaded. */
  requests: () => number
  /** How many release calls the session made since the page loaded, holding a lock or not. */
  releases: () => number
  /** Whether the lock is held now. */
  isHeld: () => boolean
  /** Every event since the page loaded, in order. */
  log: () => readonly WorkspaceHarnessScreenLockEvent[]
  /** The browser drops the held lock on its own; throws if none is held. */
  drop: () => void
}

/** The session's two screen locks, both fakes. */
interface WorkspaceHarnessScreenLocksApi {
  wake: WorkspaceHarnessScreenLockApi
  orientation: WorkspaceHarnessScreenLockApi
}

/** The session's page visibility, a fake: the real document stays visible. */
interface WorkspaceHarnessPageApi {
  /** Hide or show the page; a change to hidden tells the session, as `visibilitychange` does. */
  setHidden: (hidden: boolean) => void
  isHidden: () => boolean
}

/** The window's shape in CSS px, as the session's real window-shape port reads it. */
interface WorkspaceHarnessWindowShape {
  readonly widthPx: number
  /** The small viewport height (100svh). */
  readonly smallHeightPx: number
  /** The browser's initial font size, the rem media queries use. */
  readonly remPx: number
}

/** One count-in beat as the cue row shows it. */
type WorkspaceHarnessCountInBeat = 'muted' | 'current' | 'past'

/** Why a session ended (src/session/session-types.ts's `SessionEndCause`). */
type WorkspaceHarnessSessionEndCause = 'stop' | 'hidden-tab' | 'staff-not-shown'

/**
 * The session controller's state as plain JSON (src/components/workspace/
 * workspace-session-controller-types.ts's `SessionControllerState`), its last closed history
 * reduced to the number of phrases it recorded, and its session staff reduced to the playhead and
 * the slot keys (`${phraseNumber}:${part}`, part `whole`, `opening` or `closing`) of src/session/
 * rolling-display.ts.
 */
interface WorkspaceHarnessSessionState {
  readonly phase: 'idle' | 'count-in' | 'running'
  /** The count-in row while the count-in runs: one state per beat, and when it next changes. */
  readonly countIn: {
    readonly beats: readonly WorkspaceHarnessCountInBeat[]
    readonly nextChangeAt: number
  } | null
  readonly strugglingNotice: boolean
  readonly sessionTempo: number | null
  readonly heldLayout: 'one-system' | 'split' | null
  readonly canStart: boolean
  /** The first start condition that does not hold (`session-start-conditions.ts`), or null. */
  readonly startBlocker: string | null
  readonly lastEnd: {
    readonly cause: WorkspaceHarnessSessionEndCause
    readonly phase: 'count-in' | 'running'
    readonly soundedPhraseCount: number
  } | null
  /** How many phrases the last ended session's history recorded; null before any end. */
  readonly lastHistoryPhraseCount: number | null
  /** The measure being played (0-based, 0 to 3); null in the count-in and with no session. */
  readonly playhead: { readonly phraseNumber: number; readonly measureIndex: number } | null
  /** The slot key each system position shows; both null with no session, one null when blank. */
  readonly systems: { readonly top: string | null; readonly bottom: string | null }
  /** The slot keys of readied material no position shows yet, in order; empty with no session. */
  readonly waiting: readonly string[]
  /** The highest phrase number the session readied (1 until phrase 2 is); null with no session. */
  readonly latestReady: number | null
}

/** The workspace's session controller, read only: a spec drives it through the app's buttons. */
interface WorkspaceHarnessSessionApi {
  /** Whether the controller's lazy chunk has loaded and the app holds it. */
  loaded: () => boolean
  /** The controller's state now. Throws before it has loaded. */
  state: () => WorkspaceHarnessSessionState
}

interface WorkspaceHarnessApi {
  /** Append deterministic seeds to the queue `nextSeed()` draws from first, in call order. */
  queueSeeds: (seeds: readonly number[]) => void
  /** Hold every subsequent `generate` call before it reaches the real worker, until released. */
  holdGeneration: () => void
  /** Release the current hold; every gated `generate` call resumes immediately. */
  releaseGeneration: () => void
  /**
   * Arm forced generation failures using the given real orchestration failure code: the `count`
   * (default 1) `generate` calls in a row after `skip` more (default 0) have passed through for
   * real. Arming again replaces what is still armed.
   */
  failNextGeneration: (
    code: WorkspaceHarnessGenerationFailureCode,
    skip?: number,
    count?: number,
  ) => void
  /** How many `generate` calls have returned since the page loaded: forced failures and answers. */
  generationsSettled: () => number
  /**
   * Arm exactly one forced notation failure on the next engraving (a draw or a redraw, of a whole
   * phrase or of one system part), with this code: `notation_engraving_failed` (the default,
   * retryable) or a staff layout failure.
   */
  failNextNotation: (code?: WorkspaceHarnessNotationFailureCode) => void
  /**
   * Append forced verdicts the next fit checks return, one per check, in order: Idle's pre-draw
   * checks and a session's (each look-ahead attempt, and each phrase shown or waiting at a staff
   * layout report); once the queue is empty the real planner answers.
   */
  queueFitVerdicts: (verdicts: readonly WorkspaceHarnessFitVerdict[]) => void
  /** How many pre-draw fit checks have run since the page loaded, forced or real. */
  fitChecks: () => number
  /**
   * How many engravings (draws and redraws, of a whole phrase or of one system part) have been
   * attempted since the page loaded.
   */
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
  /** The MIDI controller's seams (see `WorkspaceHarnessMidiApi`). */
  midi: WorkspaceHarnessMidiApi
  /** The session's screen locks (see `WorkspaceHarnessScreenLocksApi`). */
  screenLocks: WorkspaceHarnessScreenLocksApi
  /** The session's page visibility (see `WorkspaceHarnessPageApi`). */
  page: WorkspaceHarnessPageApi
  /** The window's shape, read now through the session's real window-shape port. */
  windowShape: () => WorkspaceHarnessWindowShape
  /** The session controller's state (see `WorkspaceHarnessSessionApi`). */
  session: WorkspaceHarnessSessionApi
}

interface Window {
  __workspaceHarness: WorkspaceHarnessApi
}
