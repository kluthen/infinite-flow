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
   * transport's own `queueBacking` at the tempo the last session started at, and return that
   * harmony. Throws with no phrase shown or no session ever started, and whenever the transport's
   * `queueBacking` throws (no session, out of order, too late).
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
type WorkspaceHarnessSessionEndCause =
  'stop' | 'hidden-tab' | 'staff-not-shown' | 'silence-timeout' | 'controller-lost'

/**
 * Which note of the session a note is (src/domain/acknowledgement/expected-note.ts's
 * `ExpectedNoteIdentity`): its phrase number, its measure (0-3) and the index of its attack among
 * that measure's events, rests included. The staff tags the note's glyphs with
 * `data-note-id="${phraseNumber}:${measureIndex}:${eventIndex}"`.
 */
interface WorkspaceHarnessNoteIdentity {
  readonly phraseNumber: number
  readonly measureIndex: number
  readonly eventIndex: number
}

/**
 * The note that would start a session if played now (src/session/starting-note.ts's
 * `StartingNote`): which note it is, the concert pitch a played note must equal, and the label
 * the start line names it by (the written spelling with its octave, for example `B♭4`).
 */
interface WorkspaceHarnessStartingNote {
  readonly identity: WorkspaceHarnessNoteIdentity
  readonly concertPitch: number
  readonly label: string
}

/**
 * A played note a session history recorded (src/session/session-history.ts's
 * `RecordedPlayedNote`): concert pitch, velocity, and its latency-compensated onset and release on
 * the audio clock (the USB correction is 0, so they equal the raw times).
 */
interface WorkspaceHarnessRecordedPlayedNote {
  readonly pitch: number
  readonly velocity: number
  readonly onsetAt: number
  readonly releaseAt: number
}

/**
 * One phrase of the last ended session's history: its number, when it started sounding, its
 * concert timeline (`JSON.stringify`, as `snapshot().timeline`), and the acknowledgements (in
 * arrival order) and played notes (by onset) that fall inside it.
 */
interface WorkspaceHarnessHistoryPhrase {
  readonly phraseNumber: number
  readonly startedAt: number
  readonly timeline: string
  readonly acknowledgements: readonly WorkspaceHarnessNoteIdentity[]
  readonly playedNotes: readonly WorkspaceHarnessRecordedPlayedNote[]
}

/**
 * The session controller's state as plain JSON (src/components/workspace/
 * workspace-session-controller-types.ts's `SessionControllerState`), its last closed history
 * reduced to its phrase count and, per phrase, its timeline, acknowledgements and played notes,
 * and its session staff reduced to the playhead and the slot keys (`${phraseNumber}:${part}`,
 * part `whole`, `opening` or `closing`) of src/session/rolling-display.ts.
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
  /** The last ended session's history, phrase by phrase; null before any end. */
  readonly lastHistoryPhrases: readonly WorkspaceHarnessHistoryPhrase[] | null
  /**
   * The last-session Review while one exists: whether it shows, and how many phrases its (real,
   * never inflated) history holds; null before a session end once phrase 1 has sounded, and from
   * the next session's start.
   */
  readonly review: { readonly showing: boolean; readonly phraseCount: number } | null
  /**
   * The most recent session `Review last session` opens: held in memory (with how many phrases
   * its real history holds, and how it is kept), or kept on the device under its key and not read
   * yet; null when there is none.
   */
  readonly mostRecent:
    | {
        readonly kind: 'held'
        readonly phraseCount: number
        readonly keeping: 'pinned' | 'not-pinned' | 'not-saved'
      }
    | { readonly kind: 'kept'; readonly key: string }
    | null
  /**
   * The note that would start a session if played now: non-null exactly at Idle when Start may be
   * clicked, the MIDI controller is connected and the connection sheet is closed.
   */
  readonly startingNote: WorkspaceHarnessStartingNote | null
  /** A lost controller's countdown while it runs (whole seconds left, 30 down to 1); else null. */
  readonly controllerLost: { readonly secondsLeft: number } | null
  /** The running session's acknowledged notes, in acknowledgement order; empty at Idle. */
  readonly acknowledged: readonly WorkspaceHarnessNoteIdentity[]
  /** Whether the running session reads a controller (fixed at its start); null at Idle. */
  readonly sessionHasController: boolean | null
  /** The page's adaptive-tempo flag: off at page load, kept from one session to the next. */
  readonly adaptiveTempo: boolean
  /** Whether adaptive tempo may be turned on: exactly while a controller is attached. */
  readonly adaptiveTempoAvailable: boolean
  /** The tempo the last session that ran adaptive tempo reached; null before any, or after one that did not. */
  readonly lastSessionReachedTempo: number | null
  /** The page's `Vary settings` flag: off at page load, kept from one session to the next. */
  readonly varySettings: boolean
  /** The page's `Tension across phrases` flag: off at page load, kept from one session to the next. */
  readonly tensionAcrossPhrases: boolean
  /**
   * What the read-only controls show while a session runs (its start settings in the count-in,
   * then those the phrase now sounding was generated with); null with no session.
   */
  readonly shownSettings: WorkspaceHarnessSettings | null
  /** The measure being played (0-based, 0 to 3); null in the count-in and with no session. */
  readonly playhead: { readonly phraseNumber: number; readonly measureIndex: number } | null
  /** The slot key each system position shows; both null with no session, one null when blank. */
  readonly systems: { readonly top: string | null; readonly bottom: string | null }
  /** The slot keys of readied material no position shows yet, in order; empty with no session. */
  readonly waiting: readonly string[]
  /** The highest phrase number the session readied (1 until phrase 2 is); null with no session. */
  readonly latestReady: number | null
}

/**
 * The workspace's session controller, read only: a spec drives sessions and their options through
 * the app's own controls.
 */
interface WorkspaceHarnessSessionApi {
  /** Whether the controller's lazy chunk has loaded and the app holds it. */
  loaded: () => boolean
  /** The controller's state now. Throws before it has loaded. */
  state: () => WorkspaceHarnessSessionState
  /**
   * From now on, the Review the app shows holds `phraseCount` phrases: the ended session's own,
   * repeated in order and numbered 1 to `phraseCount`, everything else (start time, instrument)
   * its own. Only the app's reading changes, at once, a Review already showing included; `state()`
   * keeps the real history. A count that is not a positive whole number throws.
   */
  inflateHistory: (phraseCount: number) => void
  /**
   * Send the running session an automatic settings change now, through its runner's own
   * `dispatch`: the settings in effect with `controls` overriding some controls by name (written
   * key, never tempo or instrument). No part of the app sends one yet. Throws with no runner, on
   * an unknown value, and as the engine does (a tempo or instrument change, an ended session).
   */
  changeSettings: (controls: Readonly<Record<string, string>>) => void
}

/** Session settings as plain JSON: the generation controls and the musical profile selection. */
interface WorkspaceHarnessSettings {
  readonly controls: Readonly<Record<string, string | number>>
  readonly musicalProfile: { readonly musicalProfile: string; readonly isCustom: boolean }
}

/** The instrument profile an intent carries, as plain JSON: its id, name and concert range. */
interface WorkspaceHarnessInstrumentProfile {
  readonly id: string
  readonly displayName: string
  readonly concertRange: { readonly minMidi: number; readonly maxMidi: number }
}

/** The settings one `generate` call was made with, as plain JSON. */
interface WorkspaceHarnessGenerationRequest {
  /** The player's written tonal center the intent was built from. */
  readonly writtenTonalCenter: string
  /** The intent's controls (its tonal center in concert pitch). */
  readonly controls: Readonly<Record<string, string | number>>
  /** The intent's figure levels: each figure id to its level id. */
  readonly figureLevels: Readonly<Record<string, string>>
  /** The instrument profile the intent carries: a built-in's from its id, or my instrument's own. */
  readonly instrumentProfile: WorkspaceHarnessInstrumentProfile
  /** Whether the request carried a carry-in (a session look-ahead joining the phrase before). */
  readonly carryIn: boolean
  /** The intent's seed. */
  readonly seed: number
  /** The intent's request id. */
  readonly requestId: string
  /** Whether the call carried an abort signal: a background attempt or a session's attempt. */
  readonly signal: boolean
  /** Whether it is a background attempt: a call carrying a signal while no session runs. */
  readonly background: boolean
  /** How the call has settled so far. */
  readonly settled: WorkspaceHarnessGenerationSettlement
  /** The concert timeline (JSON, as `snapshot().timeline`) of a successful answer; else null. */
  readonly timeline: string | null
}

/**
 * How a `generate` call has settled: still `pending`, `answered` (a success or a generation
 * failure, forced or real), `cancelled` (its signal aborted) or `rejected` with another error.
 */
type WorkspaceHarnessGenerationSettlement = 'pending' | 'answered' | 'cancelled' | 'rejected'

/** The background attempts since the page loaded, counted by how they have settled. */
interface WorkspaceHarnessBackgroundGeneration {
  /** How many were made. */
  readonly made: number
  /** How many wait at the background gate now. */
  readonly held: number
  readonly pending: number
  readonly answered: number
  readonly cancelled: number
  readonly rejected: number
}

/**
 * What an in-browser replay answered: the concert timeline (`JSON.stringify`, as
 * `snapshot().timeline`), or a plain description of the generation failure the worker answered.
 */
type WorkspaceHarnessReplayAnswer =
  | { readonly kind: 'timeline'; readonly timeline: string }
  | { readonly kind: 'failure'; readonly description: string }

/**
 * The in-browser phrase replay (replay-seams.ts): a key decoded in the page by the app's own
 * decoder and replayed through the real browser generation worker, on a worker client of its own
 * that never prewarms; the workspace session never sees it.
 */
interface WorkspaceHarnessReplayApi {
  /**
   * Replay a phrase replay key (any version the decoder reads): its decoded intent through the
   * real browser worker. A malformed key, or a worker crash, rejects with its error's message.
   */
  replayKey: (key: string) => Promise<WorkspaceHarnessReplayAnswer>
  /** The key's `ifk3.` re-encoding: its decoded intent and phrase number, encoded again. */
  reEncodeKey: (key: string) => string
}

interface WorkspaceHarnessApi {
  /** The in-browser phrase replay (see `WorkspaceHarnessReplayApi`). */
  replay: WorkspaceHarnessReplayApi
  /** Append deterministic seeds to the queue `nextSeed()` draws from first, in call order. */
  queueSeeds: (seeds: readonly number[]) => void
  /** Hold every subsequent `generate` call before it reaches the real worker, until released. */
  holdGeneration: () => void
  /** Release the current hold; every gated `generate` call resumes immediately. */
  releaseGeneration: () => void
  /**
   * Hold every later background attempt (a `generate` call carrying an abort signal while no
   * session runs) before it reaches the real worker, until released; other calls pass. A held
   * attempt whose signal aborts rejects at once with the client's cancellation error.
   */
  holdBackgroundGeneration: () => void
  /** Release the background hold; every held background attempt resumes immediately. */
  releaseBackgroundGeneration: () => void
  /** The background attempts since the page loaded, counted by how they have settled. */
  backgroundGeneration: () => WorkspaceHarnessBackgroundGeneration
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
  /**
   * How many `generate` calls have settled since the page loaded: forced failures, answers and
   * cancellations (a held background attempt cancelled at the gate included).
   */
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
  /**
   * How many seeds have been drawn from the seed provider since the page loaded: one per Idle
   * attempt; a session draws none.
   */
  seedsDrawn: () => number
  /**
   * Append deterministic session seeds to the queue `nextSessionSeed()` draws from first, in call
   * order; once it is empty a plain counter answers. One is drawn with each published phrase 1,
   * and every seed a session uses (its attempts, its Vary settings mutation) derives from it.
   */
  queueSessionSeeds: (seeds: readonly number[]) => void
  /** How many session seeds have been drawn since the page loaded (one per published phrase 1). */
  sessionSeedsDrawn: () => number
  /**
   * The session seed plan's seed of rung `rung` of phrase `phraseNumber` for this session seed
   * (src/session/session-seed-plan.ts). Its own inverse: given a wanted attempt seed it returns
   * the session seed that gives it.
   */
  phraseAttemptSeed: (seed: number, phraseNumber: number, rung: number) => number
  /**
   * The session seed plan's Vary settings mutation seed for this session seed. Its own inverse:
   * given a wanted mutation seed it returns the session seed that gives it.
   */
  settingsMutationSeed: (seed: number) => number
  /**
   * The concert timeline (`JSON.stringify`, as `snapshot().timeline`) of every successful
   * `generate` answer since the page loaded, Idle and session look-ahead alike, in return order.
   */
  generatedTimelines: () => readonly string[]
  /**
   * The record of every `generate` call since the page loaded, in call order: its settings, seed
   * and request id, whether it carried a signal or was a background attempt, and how it settled.
   */
  generationRequests: () => readonly WorkspaceHarnessGenerationRequest[]
  /**
   * Fix the wall clock the next session histories read their start time from (epoch
   * milliseconds), so the export's file names are known in advance; `null` reads the real clock
   * again. A value that is not a finite, non-negative number throws.
   */
  setWallClock: (epochMs: number | null) => void
  /**
   * Arm one export failure: the next file the Review's export builds throws instead, so the
   * Review shows its export error and nothing is downloaded. One shot.
   */
  failNextExport: () => void
  /** How many files the Review's export has built since the page loaded, failed ones excluded. */
  exportsBuilt: () => number
  /** The current workspace session snapshot. */
  snapshot: () => WorkspaceHarnessSnapshot
  /**
   * How many rhythm-domain prewarms the workspace has posted to the real worker since the page
   * loaded; always 0 with `?prewarm=off`.
   */
  prewarmCount: () => number
  /**
   * The instrument profile each rhythm-domain prewarm posted since the page loaded carried, in
   * post order; empty with `?prewarm=off`.
   */
  prewarmInstrumentProfiles: () => readonly WorkspaceHarnessInstrumentProfile[]
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
  /** The saved data's load and the database behind it (see `WorkspaceHarnessStorageApi`). */
  storage: WorkspaceHarnessStorageApi
}

/** Where the visit's settings came from, as the load reports it. */
type WorkspaceHarnessLoadOutcome = 'saved-data-read' | 'started-from-defaults'

/** Whether the visit saves, as the save policy reports it. */
type WorkspaceHarnessSavingState = 'on' | 'off-outdated' | 'off-unreadable'

/** The stores of the app's database. */
type WorkspaceHarnessStoreName =
  'settings' | 'instrument' | 'controller' | 'sessionSummaries' | 'sessionBodies' | 'playedNotes'

/**
 * What my instrument is built from (src/domain/profile/my-instrument.ts's `MyInstrumentInput`):
 * its template, display name, clef, written range and transposition.
 */
interface WorkspaceHarnessMyInstrumentInput {
  readonly template: string
  readonly name: string
  readonly clef: 'treble' | 'bass'
  readonly writtenRange: { readonly minMidi: number; readonly maxMidi: number }
  readonly transposition: {
    readonly octaves: number
    readonly semitones: number
    readonly direction: 'lower' | 'same' | 'higher'
  }
}

/**
 * The saved data's seams. The page loads the saved data before it mounts the app, as the app
 * does; a spec seeds records, then reloads the page to load them. Seeds go through the app's own
 * storage port (never the save policy) and the settings codec, at the running app's version.
 */
interface WorkspaceHarnessStorageApi {
  /**
   * Write one settings record per entry, under the setting's record key (`theme`,
   * `controls.tempo`, `mix.clickOn`, `sessionOptions.risingTempo`, `review.format`, ...), each
   * encoded by the settings codec. A value need not be valid, so a spec can seed one the load
   * must refuse; a key that names no setting throws.
   */
  seedSettings: (values: Readonly<Record<string, unknown>>) => Promise<void>
  /**
   * Write the my-instrument record built from `input`, encoded by its codec, in the `instrument`
   * store under its one key. The input is not checked, so a spec can seed one the load must
   * refuse (a range under two octaves, a blank name, ...).
   */
  seedMyInstrument: (input: WorkspaceHarnessMyInstrumentInput) => Promise<void>
  /**
   * Write `count` kept sessions, each a session-wide record (a 500-character comment, the
   * longest allowed) and a body of about `bodyBytes` bytes, for the start-up read measurement
   * (M2) only: their content is sized, not a real session's.
   */
  seedTimingSessions: (count: number, bodyBytes: number) => Promise<void>
  /** Every raw record a store holds now, read through the app's port. */
  records: (store: WorkspaceHarnessStoreName) => Promise<unknown[]>
  /** Every record a store holds now, with its key, in key order, read through the app's port. */
  keyedRecords: (
    store: WorkspaceHarnessStoreName,
  ) => Promise<{ readonly key: string; readonly value: unknown }[]>
  /**
   * Pin the kept session the app saved under `key`, as the review's pin will: its session-wide
   * record rewritten with `pinned` true. Throws when no kept session is stored under it.
   */
  pinKeptSession: (key: string) => Promise<void>
  /**
   * Write, under `key`, a kept session whose session-wide record the kept-session codec cannot
   * read (current versions, an invalid start), with a body, in one batch.
   */
  seedUnreadableKeptSession: (key: string) => Promise<void>
  /**
   * Rewrite the body of the kept session stored under `key` with phrases the kept-session codec
   * refuses (its envelope current), so the session reads as damaged when it is opened. Throws when
   * no body is stored under it.
   */
  seedDamagedKeptBody: (key: string) => Promise<void>
  /**
   * Write, under `key`, a played-notes record holding one note, as another tab keeping that
   * session's played notes would, and, when a session-wide record is stored under it with a
   * `playedNotesKept` field, that record saying they are kept; in one batch.
   */
  seedPlayedNotes: (key: string) => Promise<void>
  /**
   * Copy the kept session stored under `from` (its session-wide record and body) under `key`, its
   * start set to `startedAt`. With `newer`, the copy is as a newer version of the app would have
   * written it: one data version up, with a field this version does not know, written straight to
   * IndexedDB (the port refuses it) without upgrading the database, so this tab stays current.
   * Throws when no kept session is stored under `from`.
   */
  seedKeptSessionCopy: (
    from: string,
    key: string,
    copy: { readonly startedAt: number; readonly newer: boolean },
  ) => Promise<void>
  /**
   * Delete the kept session under `key` (its session-wide record, body and played notes), as a
   * deletion made elsewhere would, in one batch.
   */
  deleteKeptSession: (key: string) => Promise<void>
  /**
   * The key of each stored settings record the settings codec does not read back as the value it
   * holds, all records decoded together as a load decodes them (the page's mix design, my
   * instrument not loaded); empty when every record reads back.
   */
  settingsNotReadBack: () => Promise<string[]>
  /**
   * Make the app's port refuse every write, delete and batch from now on, as `quota` (no room
   * left) or `other`; null to let them through again. Seeds are never refused. The page URL's
   * `?storageRefuse=quota|other` sets it from the load on.
   */
  refuseSaves: (kind: 'quota' | 'other' | null) => void
  /**
   * Make the app's port refuse, as `other`, each read of a kept session's body from now on (the
   * read opening a kept session makes), while `on`; the load's reads never read a body. Seeds and
   * `records` / `keyedRecords` are never refused.
   */
  refuseKeptSessionReads: (on: boolean) => void
  /** How many writes, deletes and batches reached the app's port since the load, refused or not. */
  portChanges: () => number
  /**
   * Open the database as a newer version of the app would, one data version up, and keep it open:
   * this tab is outdated at once, and the next load finds data written by a newer version.
   */
  openNewerVersion: () => Promise<void>
  /** The load's outcome. */
  loadOutcome: () => WorkspaceHarnessLoadOutcome
  /** The save policy's saving state; null until the policy exists (a port opening late). */
  savingState: () => WorkspaceHarnessSavingState | null
  /** How long the load took, from its start to the settings decoded, in milliseconds. */
  loadMs: () => number
}

/**
 * A kept session as data version 1 (v3.0) stored it, as raw values: its session-wide record,
 * its body and, when kept, its played notes.
 */
interface WorkspaceHarnessVersionOneSession {
  readonly summary: unknown
  readonly body: unknown
  readonly playedNotes?: unknown
}

/**
 * Published before the load only with `?storageLoad=held`: the load does not start, so the page
 * shows only its background, until `release()`.
 */
interface WorkspaceHarnessHeldLoad {
  release: () => void
  /**
   * Before `release()` only (throws after it, or once the app's port has opened): open the
   * database as a v3.0 tab would, at data version 1 (`ready`, or this throws), and write `count`
   * copies of `template`, in batches of 50, copy `i` under `session-{startedAt}-{i}`, its
   * session-wide record's `startedAt` the template's plus `i` minutes and its `sessionSeed` `i`,
   * its body and played notes as given. The values are written as given, never through the save
   * policy or a codec. The v3.0 port stays open, as a v3.0 tab left open: the load's upgrade to
   * data version 2 closes it.
   */
  seedVersionOneSessions: (
    template: WorkspaceHarnessVersionOneSession,
    count: number,
  ) => Promise<void>
}

interface Window {
  __workspaceHarness: WorkspaceHarnessApi
  __workspaceHarnessHeldLoad?: WorkspaceHarnessHeldLoad
}
