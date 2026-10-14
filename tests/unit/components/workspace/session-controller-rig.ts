/**
 * The session controller specs' shared rig: a controller over a real audio transport on the fake
 * audio clock, fake session browser ports, an Idle state the test edits by hand, and real session
 * runners whose generate seam the test scripts (real seeded successes, real failures): the
 * workspace's own, adaptive tempo running as the controller's start decides. The controller's
 * wake-up timer is an extra fake timer on the same clock, so `advance` drives the
 * transport and the controller together; `playTo` also runs a frame of the display's stepped
 * frame loop after each slice. Every runner output and transport event is logged. The staff's
 * reports pass through a real Idle layout gate whose Idle side only logs what reaches it; the staff
 * reported a wide one-system layout before the controller was built. Idle shows the written phrase
 * of phrase 1, and the staff planner is a fake where every phrase fits until the test says otherwise.
 * The MIDI controller is a real one on a fake MIDI access, its notes placed on the same fake audio
 * clock; nothing is plugged in and MIDI access was never asked for until a test connects. The
 * connection sheet's open flag is the test's to set. The Idle side's fresh-phrase action only logs
 * what the controller showed when it was asked: the Idle state stays as the test left it. A test
 * can send the latest runner an automatic settings change, which no part of the app sends yet.
 * The hold of the player's saves logs each hold and release with what the controller showed then.
 */
import { shallowReactive, shallowRef, type ShallowRef } from 'vue'

import type { WorkspaceSessionRunnerInput } from '@/components/workspace/create-workspace-session'
import { startWorkspaceSessionRunner } from '@/components/workspace/workspace-session-runner'
import { createSessionController } from '@/components/workspace/workspace-session-controller'
import type {
  KeptSessionsSeam,
  SessionController,
  SessionControllerPhase,
  SessionReview,
} from '@/components/workspace/workspace-session-controller-types'
import { createIdleLayoutGate, type IdleLayoutGate } from '@/components/workspace/idle-layout-gate'
import {
  createWorkspacePregeneration,
  type WorkspacePregenerationFactory,
} from '@/components/workspace/workspace-pregeneration'
import { createPregenerationSlot } from '@/composables/generation-session-pregeneration'
import type { NotationError } from '@/notation/notation-error'
import type { StaffFixedParts, StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { MutableGenerationSessionState } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import type { SessionChanges, SessionSaveOutcome } from '@/storage/save-policy'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { makeSeed } from '@/domain/random/seed'
import {
  DEFAULT_SESSION_OPTIONS,
  type SessionOptionChoices,
} from '@/storage/records/setting-defaults'
import type {
  SessionRunner,
  SessionRunnerEvent,
  SessionTransportEvent,
} from '@/session/session-runner'
import type { AudioTime, SessionOutput, SessionSettings } from '@/session/session-types'
import type { AudioTransport } from '@/audio/audio-transport'
import { createMidiController } from '@/midi/midi-controller'
import type { MidiController } from '@/midi/midi-controller-state'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { BUILT_IN_INSTRUMENT_CLEF } from '@/domain/profile/instrument-clef'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { FakeAudioRig, FakeWakeTimer } from '../../audio/fake-audio'
import { transportRig } from '../../audio/transport-rig'
import {
  createFakeSessionBrowser,
  type FakeSessionBrowser,
} from '../../session/fake-session-browser'
import {
  failureOutcome,
  fakeViewport,
  fixedWallClock,
  phraseOneFor,
  queuedProviders,
  sessionSettings,
  successFor,
} from '../../session/session-harness'
import { createFakeMidiAccess, type FakeMidiAccess } from '../../midi/fake-midi-access'
import {
  createFakeFrames,
  createFakePlanner,
  type FakeFrames,
  type FakePlanner,
} from './fake-frames'

/**
 * Every session in these specs starts at 240 BPM unless a spec asks for another starting tempo:
 * a beat is 0.25 s, a measure 1 s, a phrase 4 s.
 */
export const RIG_TEMPO = 240

/** The session seed the rig's Idle phrase 1 was published with. */
export const RIG_SESSION_SEED = makeSeed(0x0c0ffee0)

/**
 * A rig's session options: its starting tempo, its pre-generation queue's builder and the saved
 * "During a session" choices the controller starts from.
 */
export interface ControllerRigOptions {
  readonly tempo?: number
  /** The pre-generation queue's builder; by default a disabled one, which never runs. */
  readonly pregeneration?: WorkspacePregenerationFactory
  /** The saved "During a session" choices; a first visit's (all off) by default. */
  readonly savedSessionOptions?: SessionOptionChoices
  /** What each session save resolves; `saved` at once by default. */
  readonly sessionSaveOutcome?: () => Promise<SessionSaveOutcome>
  /**
   * The kept sessions the controller reaches: by default none loaded, a read that throws (none is
   * ever asked for) and saving on.
   */
  readonly keptSessions?: Partial<KeptSessionsSeam>
}

/** Intent: a pre-generation builder under the disabled policy: no background attempt, ever. */
export const disabledPregeneration: WorkspacePregenerationFactory = (seams) =>
  createWorkspacePregeneration({
    ...seams,
    generate: () => Promise.reject(new Error('rig: disabled pre-generation generated')),
    providers: queuedProviders(9000, 0),
    viewport: fakeViewport(false),
    slot: createPregenerationSlot(),
    policy: 'disabled',
  })

/** The generate seam a spec scripts: from a request's intent to its outcome. */
export type GenerateScript = (intent: GenerationIntent) => GenerationOutcome

/** Intent: a script answering every request with the real seeded success of its intent. */
export const alwaysSucceed: GenerateScript = (intent) => successFor(intent)

/** Intent: a script answering every request with a real generation failure. */
export const alwaysFail: GenerateScript = () => failureOutcome()

/** Intent: a script failing every carry-in attempt and succeeding the standalone retry. */
export const onlyStandaloneSucceeds: GenerateScript = (intent) =>
  intent.carryIn === undefined ? successFor(intent) : failureOutcome()

/** The staff's layout inputs in a wide window: one system, plenty of width. */
export const WIDE_STAFF: StaffLayoutInputs = {
  containerWidthPx: 1100,
  viewport: { layout: 'one-system', heightBudgetPx: null },
}

/**
 * The rig's staff fixed parts: 60 units of leading width and 60 of padding, so at the 5 px floor
 * one system needs 140 px of container width, a split system 100 px, and the split layout's two
 * positions 160 px of height budget.
 */
export const RIG_FIXED_PARTS: StaffFixedParts = { leadingWidth: 60, systemPadding: 60 }

/** One staff report that reached the Idle machinery, in order. */
export type IdleReport =
  | { readonly kind: 'layout-inputs'; readonly inputs: StaffLayoutInputs }
  | { readonly kind: 'engraved' }
  | { readonly kind: 'notation-error'; readonly error: NotationError }

/** What the controller showed when it asked the Idle side for a fresh phrase. */
export interface FreshPhraseRequest {
  readonly phase: SessionControllerPhase
  readonly review: SessionReview | null
  /** How many staff reports had reached the Idle machinery by then. */
  readonly idleReports: number
  /** The settings the controls showed then: null once the session's were dropped. */
  readonly shownSettings: SessionSettings | null
}

/** One call the controller made to the hold of the player's saves, and what it showed then. */
export interface SaveHoldCall {
  readonly call: 'hold' | 'release' | 'saveSession'
  readonly phase: SessionControllerPhase
  /** Whether the audio transport was running then. */
  readonly audioRunning: boolean
}

/** A controller and every seam around it, in the test's hand. */
export interface ControllerRig {
  readonly controller: SessionController
  readonly audioRig: FakeAudioRig
  readonly transport: AudioTransport
  readonly browser: FakeSessionBrowser
  readonly idle: MutableGenerationSessionState<WorkspaceSessionResult>
  readonly settings: SessionSettings
  readonly phraseOne: WorkspaceSessionResult
  /** The written phrase the staff shows at Idle at first: phrase 1's. */
  readonly idleWritten: WrittenPhrase
  /** Make the staff show another written phrase at Idle, as a hand-set Idle phrase 1 would. */
  readonly showIdleWritten: (phrase: WrittenPhrase) => void
  /** The display's frame loop, stepped by `playTo` or by hand. */
  readonly frames: FakeFrames
  /** The staff planner the display checks fits with. */
  readonly planner: FakePlanner
  /** The controller's own wake-up timer, once it asked for one. */
  readonly timers: FakeWakeTimer[]
  /** Every output of every runner, in order. */
  readonly outputs: SessionOutput[]
  /** Every event a runner was sent (transport events, a test's settings changes), in order. */
  readonly events: SessionRunnerEvent[]
  /** What the controller passed to each runner it created. */
  readonly runnerInputs: WorkspaceSessionRunnerInput[]
  /** Replace the generate script from the next request on. */
  readonly setScript: (script: GenerateScript) => void
  /** Make the runner throw on the next transport event of this kind, as a broken engine would. */
  readonly breakDispatchOf: (kind: SessionTransportEvent['kind']) => void
  /** The gate the staff reports through, as PhraseScore's events would reach it. */
  readonly staff: IdleLayoutGate
  /** Every staff report that reached the Idle machinery since the controller was built. */
  readonly idleReports: IdleReport[]
  /** How many times the controller asked for phrase 1's fixed parts. */
  readonly fixedPartsRequests: () => number
  /** The fake MIDI access the controller's MIDI controller reads. */
  readonly midiAccess: FakeMidiAccess
  /** The real MIDI controller the session controller is built over. */
  readonly midi: MidiController
  /** Whether the connection sheet is open, as the shell would report it; false at first. */
  readonly sheetOpen: ShallowRef<boolean>
  /** Every time the controller asked the Idle side for a fresh phrase, in order. */
  readonly freshPhraseRequests: FreshPhraseRequest[]
  /** Hand the latest runner's output sink an output no real engine would give, as a broken one. */
  readonly injectOutput: (output: SessionOutput) => void
  /** Send the latest runner an automatic settings change at the audio clock's time now. */
  readonly changeSettings: (settings: SessionSettings) => void
  /** Every hold and release of the player's saves the controller made, in order. */
  readonly saveHolds: SaveHoldCall[]
  /** The changes of every session save the controller asked for, in order. */
  readonly sessionSaves: SessionChanges[]
}

/** Intent: let every pending promise (generation answers, fit checks, lock outcomes) settle. */
export function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Intent: move the fake clock to `target` in quarter-second slices, letting promises settle and
 * then running one display frame after each, so generation answers arrive between wake-ups and
 * the playhead follows as they would in a browser.
 */
export async function playTo(rig: ControllerRig, target: AudioTime): Promise<void> {
  await flush()
  while (rig.audioRig.now() < target) {
    rig.audioRig.advanceTo(Math.min(target, rig.audioRig.now() + 0.25))
    await flush()
    rig.frames.run()
  }
}

/**
 * Intent: a controller at Idle with a real, engraved phrase 1, every lock granting, the staff
 * having reported `WIDE_STAFF`, and phrase 1's fixed parts measuring as `fixedParts` answers.
 */
// @test-link [[service_session_controller]]
export function controllerRig(
  script: GenerateScript = alwaysSucceed,
  fixedParts: () => Promise<StaffFixedParts> = () => Promise.resolve(RIG_FIXED_PARTS),
  options: ControllerRigOptions = {},
): ControllerRig {
  const { rig: audioRig, transport } = transportRig()
  const browser = createFakeSessionBrowser()
  const settings = sessionSettings({ tempo: options.tempo ?? RIG_TEMPO })
  const phraseOne: WorkspaceSessionResult = {
    ...phraseOneFor(settings),
    sessionSeed: RIG_SESSION_SEED,
  }
  const idleWritten = transformToWrittenPhrase(
    notationInputFromOutcome(phraseOne.outcome, phraseOne.intent, BUILT_IN_INSTRUMENT_CLEF),
  )
  let shownIdleWritten = idleWritten
  const frames = createFakeFrames()
  const planner = createFakePlanner()
  const idle = shallowReactive<MutableGenerationSessionState<WorkspaceSessionResult>>({
    controls: settings.controls,
    profileSelection: settings.musicalProfile,
    presentation: { theme: 'System' },
    latestIntent: phraseOne.intent,
    result: phraseOne,
    operation: 'idle',
    generationError: null,
    notationError: null,
    resultEngraved: true,
    noteDensityContext: { belowTabletLandscape: false, sessionSteppedDown: false },
    roomNotice: null,
    retriesRunning: false,
    roomNoticeAnnouncements: 0,
  })
  const timers: FakeWakeTimer[] = []
  const outputs: SessionOutput[] = []
  const events: SessionRunnerEvent[] = []
  const runnerInputs: WorkspaceSessionRunnerInput[] = []
  let current = script
  let broken: SessionTransportEvent['kind'] | null = null
  const providers = queuedProviders(5000, 400)
  const idleReports: IdleReport[] = []
  const staff = createIdleLayoutGate({
    layoutInputs: (inputs) => idleReports.push({ kind: 'layout-inputs', inputs }),
    engraved: () => idleReports.push({ kind: 'engraved' }),
    notationError: (error) => idleReports.push({ kind: 'notation-error', error }),
  })
  staff.layoutInputs(WIDE_STAFF)
  idleReports.length = 0
  let fixedPartsRequests = 0
  const midiAccess = createFakeMidiAccess({
    now: () => audioRig.performanceTimeAt(audioRig.now()),
  })
  const midi = createMidiController({
    provider: midiAccess,
    clock: { anchor: () => audioRig.output.anchor() },
  })
  const sheetOpen = shallowRef(false)
  const freshPhraseRequests: FreshPhraseRequest[] = []
  let built: SessionController | null = null
  const runners: SessionRunner[] = []
  const saveHolds: SaveHoldCall[] = []
  const sessionSaves: SessionChanges[] = []

  /** Intent: log a hold or release of the player's saves with what the controller showed then. */
  function logSaveHold(call: SaveHoldCall['call']): void {
    if (built === null) throw new Error(`rig: a save ${call} came before the controller`)
    saveHolds.push({ call, phase: built.state.phase, audioRunning: transport.isRunning() })
  }

  /** Intent: log what the controller shows when it asks for a fresh phrase; Idle stays as it is. */
  function startFreshPhrase(): Promise<boolean> {
    if (built === null) throw new Error('rig: a fresh phrase was asked for before the controller')
    freshPhraseRequests.push({
      phase: built.state.phase,
      review: built.state.review,
      idleReports: idleReports.length,
      shownSettings: built.state.shownSettings,
    })
    return Promise.resolve(true)
  }

  /**
   * Intent: a real workspace runner (the mutation flag as the controller's start says, the display
   * reading the controller's) on the scripted generate seam, logging what passes through it.
   */
  function createRunner(input: WorkspaceSessionRunnerInput): SessionRunner {
    runnerInputs.push(input)
    const runner = startWorkspaceSessionRunner(
      {
        generate: (intent) => Promise.resolve(current(intent)),
        checkFit: input.checkFit,
        now: input.now,
        providers,
        viewport: fakeViewport(false),
        display: input.display,
        onOutput: (output) => {
          outputs.push(output)
          input.onOutput(output)
        },
        onError: input.onError,
      },
      input.start,
    )
    const logged: SessionRunner = {
      dispatch: (event) => {
        events.push(event)
        if (event.kind === broken) throw new Error(`${event.kind} broken`)
        runner.dispatch(event)
      },
    }
    runners.push(logged)
    return logged
  }

  const controller = createSessionController({
    idle: { state: idle, actions: { startFreshPhrase } },
    idlePhrase: () => shownIdleWritten,
    audio: transport,
    browser,
    createSessionRunner: createRunner,
    clock: {
      createWakeTimer: () => {
        const timer = audioRig.createExtraWakeTimer()
        timers.push(timer)
        return timer
      },
      wallClock: fixedWallClock,
      frames: frames.port,
    },
    idleLayout: staff,
    staffFixedParts: () => {
      fixedPartsRequests += 1
      return fixedParts()
    },
    staffFitPlanner: planner.load,
    midi,
    connectionSheetOpen: () => sheetOpen.value,
    pregeneration: options.pregeneration ?? disabledPregeneration,
    savedSessionOptions: options.savedSessionOptions ?? DEFAULT_SESSION_OPTIONS,
    saveHold: {
      hold: () => logSaveHold('hold'),
      release: () => logSaveHold('release'),
      saveSession: (changes) => {
        logSaveHold('saveSession')
        sessionSaves.push(changes)
        return options.sessionSaveOutcome?.() ?? Promise.resolve({ status: 'saved' })
      },
    },
    keptSessions: {
      summaries: [],
      read: (key) => {
        throw new Error(`rig: no kept session "${key}" can be read`)
      },
      savingOff: () => false,
      ...options.keptSessions,
    },
  })
  built = controller
  return {
    controller,
    audioRig,
    transport,
    browser,
    idle,
    settings,
    phraseOne,
    idleWritten,
    showIdleWritten: (phrase) => {
      shownIdleWritten = phrase
    },
    frames,
    planner,
    timers,
    outputs,
    events,
    runnerInputs,
    setScript: (next) => {
      current = next
    },
    breakDispatchOf: (kind) => {
      broken = kind
    },
    staff,
    idleReports,
    fixedPartsRequests: () => fixedPartsRequests,
    midiAccess,
    midi,
    sheetOpen,
    freshPhraseRequests,
    injectOutput: (output) => {
      const input = runnerInputs.at(-1)
      if (input === undefined) throw new Error('rig: no runner to inject an output through')
      input.onOutput(output)
    },
    changeSettings: (settings) => {
      const runner = runners.at(-1)
      if (runner === undefined) throw new Error('rig: no runner to send a settings change to')
      runner.dispatch({ kind: 'settings-change', at: audioRig.now(), settings })
    },
    saveHolds,
    sessionSaves,
  }
}

/** Intent: the outputs of one kind, narrowed. */
export function outputsOf<K extends SessionOutput['kind']>(
  rig: ControllerRig,
  kind: K,
): Extract<SessionOutput, { kind: K }>[] {
  return rig.outputs.filter((output): output is Extract<SessionOutput, { kind: K }> => {
    return output.kind === kind
  })
}

/** Intent: the phrase numbers the controller told the runner started sounding, in order. */
export function soundingEvents(rig: ControllerRig): number[] {
  return rig.events.flatMap((event) =>
    event.kind === 'phrase-started-sounding' ? [event.phraseNumber] : [],
  )
}
