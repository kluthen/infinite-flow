/**
 * The workspace-session e2e harness entry point: mounts the real production `App` tree (App.vue ->
 * WorkspaceShell.vue -> the real ControlPanel/ScorePanel/PhraseScore components), exactly as
 * src/main.ts does, except `App.vue`'s workspace session is built by `composeWorkspaceSession`
 * (the DI seam in src/components/workspace/create-workspace-session.ts) with deterministic seams
 * wrapped around the real worker-backed generation client, injected through App.vue's documented
 * `WORKSPACE_SESSION_FACTORY` provide/inject point -- never a test branch inside src/ itself:
 *
 * - a deterministic seed queue and monotonic request-id provider, so a spec can queue exact seeds
 *   and read back exact request ids instead of racing `crypto` randomness, and a second seed queue
 *   (`queueSessionSeeds`/`sessionSeedsDrawn`) for the session seed drawn with each published
 *   phrase 1 -- a session draws no seed of its own, every seed it uses derives from that one, by
 *   the session seed plan's derivations, published as `phraseAttemptSeed`/`settingsMutationSeed`;
 * - a generation gate (`holdGeneration`/`releaseGeneration`) the `generate` wrapper awaits before
 *   ever delegating to the real worker client, so a spec can assert concurrent-operation
 *   prevention deterministically;
 * - a second gate for background attempts only (`holdBackgroundGeneration`/
 *   `releaseBackgroundGeneration`): a background attempt is a `generate` call that carries an abort
 *   signal while no session runs (a session's attempts carry one too, the player's requests at
 *   Idle never do). A held one honours its signal: aborted while held, it rejects at once with the
 *   client's cancellation error, never waiting for the release. `backgroundGeneration()` counts
 *   them (made, held, answered, cancelled);
 * - armed failure injection for generation (`failNextGeneration`, resolving one or more calls in a
 *   row with the real `GenerationOutcome` failure shape orchestration itself produces, with a count
 *   of the calls that have returned, `generationsSettled`, and the timeline of every successful
 *   answer, `generatedTimelines`, session look-ahead phrases included) and one-shot injection for notation
 *   (`failNextNotation`, a retryable failure or one of the staff layout's two, armed through the
 *   `@/notation/vexflow-engraver-loader` alias configured in vite.workspace-harness.config.ts, which
 *   substitutes this directory's `vexflow-engraver-loader-seam.ts` for the real loader so
 *   PhraseScore's genuine `redraw()` catch/emit('notation-error') and Retry-notation path run end
 *   to end, never a fabricated result);
 * - forced verdicts for the workspace's pre-draw fit check (`queueFitVerdicts`, through the same
 *   alias), so a spec can make any phrase too wide for the room; once they run out the real
 *   planner answers, and real no-room comes from real window sizes;
 * - the audio transport (audio-seams.ts): the fake audio clock and output by default, or the real
 *   Web Audio output with `?audio=real`, both recorded, started only by a click on the page's own
 *   "Start audio (harness)" button, which stands in for chunk 15's Start click, with backing
 *   queued from the shown phrase's harmony, read here from the session's own result;
 * - the MIDI controller (midi-seams.ts): the production controller on a fake Web MIDI access by
 *   default, a fake browser without Web MIDI with `?midi=unsupported`, or the browser's own with
 *   `?midi=real`, reading the harness audio transport's clock, with its states and notes recorded;
 * - the session browser ports (session-browser-seams.ts): fake wake and orientation locks whose
 *   answers a spec chooses and whose requests and releases are recorded, and a fake page
 *   visibility a spec hides; the window shape is the real adapter;
 * - the session controller (session-controller-seams.ts): the workspace's own controller, kept as
 *   the app builds it, its state read as plain JSON by `session.state()`;
 * - the session runner (session-runner-seam.ts, through the
 *   `@/components/workspace/workspace-session-runner` alias): the real runner, the latest kept so
 *   `session.changeSettings()` can send it an automatic settings change;
 * - every `generate` call's settings (`generationRequests`), in call order, so a spec can tell
 *   which settings a phrase was generated with, each with its seed and request id, whether it
 *   carried an abort signal, whether it was a background attempt, how it has settled so far
 *   (pending, answered, cancelled or rejected) and the concert timeline of a successful answer;
 * - the session clock: the session controller's wake-up timer on the audio seams' clock (stepped
 *   by `audio.advance` right after the transport's on the fake rig, a real wake-up Worker with
 *   `?audio=real`), and the real wall clock for session histories unless a spec fixes it with
 *   `setWallClock`, so the export's file names (from the history's start) are known in advance;
 * - the Review's export (export-loader-seam.ts, through the `@/export/load-generated-notes-export`
 *   alias): the real lazy export code, its built files counted (`exportsBuilt`) and the next one
 *   failing when armed (`failNextExport`), so the Review's real export error shows; the real chunk
 *   load can still be failed by aborting its request with Playwright routing;
 * - the Review's history (session-controller-seams.ts): `session.inflateHistory` makes the Review
 *   the app shows hold any number of phrases, for the long-Review specs;
 * - the prewarm policy, read from the page URL exactly as production reads it (`?prewarm=off`
 *   disables it, on by default), with every prewarm forwarded to the real worker client and
 *   counted for `prewarmCount()`;
 * - the Idle pre-generation policy, read from the page URL with the harness's own default: off,
 *   unlike production, so no spec meets background attempts unless it asks for them with
 *   `?pregeneration=on`; any value given is read by production's parser (`off`, `on`, a mistyped
 *   value throws).
 *
 * - the saved data (storage-seams.ts): the app's own loader over the browser's real IndexedDB,
 *   run before the app mounts, as src/main.ts runs it; `window.__workspaceHarness` is published
 *   once the app has mounted, so waiting for it also waits for the load. `storage.seedSettings`
 *   seeds settings for the next load, and `?storageLoad=held` holds the load until
 *   `window.__workspaceHarnessHeldLoad.release()`; `?storageRead=fail|slow` fails or delays the
 *   app's reads, `storage.refuseSaves` refuses its saves, `storage.portChanges` counts them and
 *   `storage.openNewerVersion` outdates the tab as a newer version would; `storage.keyedRecords`
 *   reads a store with its keys, `storage.pinKeptSession` pins a saved session and
 *   `storage.seedUnreadableKeptSession` seeds one no codec reads.
 *
 * The lazy VexFlow engraver, the real generation Worker, real notation, the real `matchMedia`
 * window-width provider and the real window-shape probe all run for real (a spec moves the window
 * across `bp-tablet-landscape`, or changes its shape, with `page.setViewportSize`); only
 * randomness, timing, and fault injection are made deterministic.
 */
import { createApp } from 'vue'

import App from '../../../src/App.vue'
import type { SavedDataLoad } from '../../../src/storage-bootstrap'
import '../../../src/styles/index.css'
import {
  WORKSPACE_SESSION_FACTORY,
  composeWorkspaceSession,
  type WorkspaceSession,
} from '../../../src/components/workspace/create-workspace-session'
import type { WorkspaceSessionResult } from '../../../src/composables/workspace-session-result'
import type { GenerationIntent } from '../../../src/domain/generation/generation-intent'
import type { HarmonyEvent } from '../../../src/domain/harmony/harmony-types'
import { makeRequestId, type RequestId } from '../../../src/domain/generation/generation-request'
import type {
  GenerationDiagnostics,
  GenerationOutcome,
} from '../../../src/domain/generation/orchestration/orchestration-types'
import { makeSeed, type Seed } from '../../../src/domain/random/seed'
import * as seedPlan from '../../../src/session/session-seed-plan'
import { createBrowserGenerationWorker } from '../../../src/generation-worker/browser-generation-worker'
import {
  GenerationCancelledError,
  createGenerationWorkerClient,
} from '../../../src/generation-worker/generation-worker-client'
import { createBrowserViewportWidth } from '../../../src/components/workspace/browser-viewport-width'
import {
  pregenerationPolicyFromSearch,
  prewarmPolicyFromSearch,
  type WorkspacePregenerationPolicy,
} from '../../../src/components/workspace/prewarm-policy'
import { bindHarnessAudioStart, createHarnessAudio, harnessAudioMode } from './audio-seams'
import { createHarnessMidi, harnessMidiMode } from './midi-seams'
import { createHarnessSessionBrowser } from './session-browser-seams'
import { createHarnessSessionController } from './session-controller-seams'
import {
  createHarnessStorage,
  harnessStorageLoadMode,
  harnessStorageReadMode,
} from './storage-seams'
import { armNextExportFailure, exportsBuilt } from './export-loader-seam'
import {
  armNextNotationFailure,
  engravingCount,
  fitCheckCount,
  queueForcedFitVerdicts,
  roomCheckCount,
} from './vexflow-engraver-loader-seam'

/**
 * Intent: a deterministic seed provider -- a spec-filled queue, falling back to a plain counter --
 * that counts every seed it hands out.
 */
function createSeedProvider(): {
  readonly nextSeed: () => Seed
  readonly queueSeeds: (seeds: readonly number[]) => void
  readonly seedsDrawn: () => number
} {
  let counter = 0
  let drawn = 0
  const queue: number[] = []
  return {
    nextSeed: () => {
      drawn += 1
      return makeSeed(queue.length > 0 ? queue.shift()! : ++counter)
    },
    queueSeeds: (seeds) => queue.push(...seeds),
    seedsDrawn: () => drawn,
  }
}

/** Intent: a deterministic, monotonic request-id provider unique to this harness page load. */
function createRequestIdProvider(): () => RequestId {
  let counter = 0
  return () => makeRequestId(`workspace-harness-request-${++counter}`)
}

/** Intent: a held/released gate a `generate` wrapper awaits before ever reaching the real worker client. */
function createGenerationGate(): {
  readonly hold: () => void
  readonly release: () => void
  readonly wait: () => Promise<void>
} {
  let gatePromise: Promise<void> = Promise.resolve()
  let releaseFn: (() => void) | null = null
  return {
    hold: () => {
      if (releaseFn !== null) return
      gatePromise = new Promise((resolve) => {
        releaseFn = resolve
      })
    },
    release: () => {
      releaseFn?.()
      releaseFn = null
      gatePromise = Promise.resolve()
    },
    wait: () => gatePromise,
  }
}

/** A gate for background attempts: each held call waits for the release or its own abort. */
interface BackgroundGate {
  readonly hold: () => void
  readonly release: () => void
  /** How many calls wait at the gate now. */
  readonly held: () => number
  readonly wait: (signal: AbortSignal) => Promise<void>
}

/**
 * Intent: a held/released gate for background attempts. A call that meets it held waits until the
 * release, unless its signal aborts first (or already has): it then rejects at once with the
 * client's cancellation error, as the worker client rejects an aborted call.
 */
function createBackgroundGate(): BackgroundGate {
  let holding = false
  const waiting = new Set<() => void>()
  return {
    hold: () => {
      holding = true
    },
    release: () => {
      holding = false
      const resumed = [...waiting]
      waiting.clear()
      for (const resume of resumed) resume()
    },
    held: () => waiting.size,
    wait: (signal) => {
      if (!holding) return Promise.resolve()
      if (signal.aborted) return Promise.reject(new GenerationCancelledError())
      return new Promise((resolve, reject) => {
        /** Intent: leave the gate and reject as the worker client rejects an aborted call. */
        const onAbort = (): void => {
          waiting.delete(resume)
          reject(new GenerationCancelledError())
        }
        /** Intent: pass the gate at its release. */
        const resume = (): void => {
          signal.removeEventListener('abort', onAbort)
          resolve()
        }
        signal.addEventListener('abort', onAbort, { once: true })
        waiting.add(resume)
      })
    },
  }
}

/**
 * Intent: the harness's pre-generation policy: disabled when the page URL names none, so existing
 * specs meet no background attempt; otherwise production's own parser reads the value.
 */
function harnessPregenerationPolicy(search: string): WorkspacePregenerationPolicy {
  if (new URLSearchParams(search).get('pregeneration') === null) return 'disabled'
  return pregenerationPolicyFromSearch(search)
}

/** One `generate` call's record, settled in place as the call settles. */
type GenerationRecord = {
  -readonly [K in keyof WorkspaceHarnessGenerationRequest]: WorkspaceHarnessGenerationRequest[K]
}

/** A real, minimal GenerationDiagnostics value for one fabricated failure outcome -- never an invented shape. */
const EMPTY_DIAGNOSTICS: GenerationDiagnostics = {
  version: 'generation-diagnostics-v1',
  harmonyDomainSize: 0,
  rhythmDomainSize: 0,
  windows: [],
  successfulRegisters: [],
}

const seedProvider = createSeedProvider()
/** The session seeds, drawn with each published phrase 1, apart from the phrase seeds. */
const sessionSeedProvider = createSeedProvider()
const requestIdProvider = createRequestIdProvider()
const gate = createGenerationGate()
const backgroundGate = createBackgroundGate()
let armedFailureCode: WorkspaceHarnessGenerationFailureCode | null = null
/** How many gated `generate` calls still pass through before the armed failure applies. */
let callsBeforeArmedFailure = 0
/** How many calls in a row the armed failure still fails, once it applies. */
let armedFailuresLeft = 0
/**
 * How many `generate` calls have returned, failed, answered or been cancelled, since the page
 * loaded.
 */
let generationsSettled = 0
/** The concert timeline (JSON) of every successful `generate` answer, in return order. */
const generatedTimelines: string[] = []
/** The record of every `generate` call, in call order. */
const generationRequests: GenerationRecord[] = []

const harnessStorage = createHarnessStorage(
  harnessStorageLoadMode(window.location.search),
  harnessStorageReadMode(window.location.search),
)
/** What the saved-data load gave; null until it has ended. */
let savedData: SavedDataLoad | null = null

/** Intent: the audio mix the load gave, for the transport's first use; throws before it ended. */
function loadedMix(): SavedDataLoad['settings']['mix'] {
  if (savedData === null)
    throw new Error('Workspace harness: the audio mix was read before the load')
  return savedData.settings.mix
}

const harnessAudio = createHarnessAudio(
  harnessAudioMode(window.location.search),
  shownHarmony,
  loadedMix,
)
bindHarnessAudioStart(document, harnessAudio.startFromClick)
const harnessMidi = createHarnessMidi(harnessMidiMode(window.location.search), harnessAudio)
const harnessBrowser = createHarnessSessionBrowser()
const harnessSessionController = createHarnessSessionController()

const harnessPrewarmPolicy = prewarmPolicyFromSearch(window.location.search)
const pregenerationPolicy = harnessPregenerationPolicy(window.location.search)
const client = createGenerationWorkerClient(createBrowserGenerationWorker, {
  prewarmEnabled: harnessPrewarmPolicy === 'enabled',
})

/**
 * Intent: record the call, then pass it through the gates and the armed failures to the real
 * worker client; settle its record as the call settles. A background attempt is a call carrying
 * a signal while no session runs (the controller at Idle).
 */
async function harnessGenerate(
  intent: GenerationIntent,
  signal?: AbortSignal,
): Promise<GenerationOutcome> {
  const record: GenerationRecord = {
    writtenTonalCenter: intent.writtenTonalCenter,
    controls: { ...intent.controls },
    musicalProfile: { ...intent.musicalProfile },
    carryIn: intent.carryIn !== undefined,
    seed: intent.seed,
    requestId: intent.requestId,
    signal: signal !== undefined,
    background: signal !== undefined && harnessSessionController.phase() === 'idle',
    settled: 'pending',
    timeline: null,
  }
  generationRequests.push(record)
  try {
    const outcome = await gatedGenerate(intent, signal, record.background)
    record.settled = 'answered'
    if (outcome.kind === 'generation_success') {
      record.timeline = JSON.stringify(outcome.result.timeline)
    }
    return outcome
  } catch (error: unknown) {
    record.settled = error instanceof GenerationCancelledError ? 'cancelled' : 'rejected'
    throw error
  }
}

/**
 * Intent: gate (a background attempt at the background gate too, where an abort cancels it at
 * once), then optionally fail with a real orchestration failure shape (once the armed number of
 * calls has passed through, for the armed number of calls in a row), then delegate for real with
 * the caller's abort signal; count every call that returns or is cancelled.
 */
async function gatedGenerate(
  intent: GenerationIntent,
  signal: AbortSignal | undefined,
  background: boolean,
): Promise<GenerationOutcome> {
  await gate.wait()
  if (background && signal !== undefined) {
    await backgroundGate.wait(signal).catch((error: unknown) => {
      generationsSettled += 1
      throw error
    })
  }
  if (armedFailureCode !== null && callsBeforeArmedFailure > 0) {
    callsBeforeArmedFailure -= 1
  } else if (armedFailureCode !== null) {
    const code = armedFailureCode
    armedFailuresLeft -= 1
    if (armedFailuresLeft === 0) armedFailureCode = null
    generationsSettled += 1
    return { kind: 'generation_failure', code, diagnostics: EMPTY_DIAGNOSTICS }
  }
  const outcome = await client.generate(intent, signal).catch((error: unknown) => {
    if (error instanceof GenerationCancelledError) generationsSettled += 1
    throw error
  })
  generationsSettled += 1
  if (outcome.kind === 'generation_success') {
    generatedTimelines.push(JSON.stringify(outcome.result.timeline))
  }
  return outcome
}

/** Intent: the background attempts' counts, from their records and the background gate. */
function backgroundGeneration(): WorkspaceHarnessBackgroundGeneration {
  const records = generationRequests.filter((record) => record.background)
  /** Intent: how many background records have settled as `settled`. */
  const count = (settled: WorkspaceHarnessGenerationSettlement) =>
    records.filter((record) => record.settled === settled).length
  return {
    made: records.length,
    held: backgroundGate.held(),
    pending: count('pending'),
    answered: count('answered'),
    cancelled: count('cancelled'),
    rejected: count('rejected'),
  }
}

/** Intent: arm `count` forced failures in a row with `code`, after `skip` real calls. */
function armGenerationFailures(
  code: WorkspaceHarnessGenerationFailureCode,
  skip: number,
  count: number,
): void {
  if (!Number.isInteger(skip) || skip < 0) {
    throw new Error(`Workspace harness: failNextGeneration skip ${skip} is not a whole number`)
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(
      `Workspace harness: failNextGeneration count ${count} is not a positive whole number`,
    )
  }
  armedFailureCode = code
  callsBeforeArmedFailure = skip
  armedFailuresLeft = count
}

let prewarmsPosted = 0
/** The wall clock a spec fixed, as epoch milliseconds; null reads the real one. */
let fixedWallClock: number | null = null

/** Intent: fix the session histories' wall clock at `epochMs`, or let it run again with null. */
function setWallClock(epochMs: number | null): void {
  if (epochMs !== null && !(Number.isFinite(epochMs) && epochMs >= 0)) {
    throw new Error(`Workspace harness: setWallClock(${epochMs}) is no epoch time`)
  }
  fixedWallClock = epochMs
}

/** Intent: count one prewarm, then forward it to the real worker client unchanged. */
// @test-link [[module_generation_prewarm]]
function harnessPrewarm(intent: GenerationIntent): void {
  prewarmsPosted += 1
  client.prewarm(intent)
}

let workspace: WorkspaceSession | null = null

/**
 * Intent: the latest session state's requestId/seed/timeline/operation/mode, for replay/isolation
 * assertions, plus the room notice's state. `requestId`/`seed` are the result's, which a fit run
 * sets only for the attempt it draws; `latestSeed` is the latest attempt's, drawn or not.
 */
function snapshot(): WorkspaceHarnessSnapshot {
  if (workspace === null) {
    throw new Error('Workspace harness snapshot() was requested before the session mounted.')
  }
  const state = workspace.session.state
  const result: WorkspaceSessionResult | null = state.result
  return {
    operation: state.operation,
    instrumentProfileId: state.controls.instrumentProfileId,
    writtenTonalCenter: result === null ? null : result.intent.writtenTonalCenter,
    concertTonalCenter: result === null ? null : result.intent.controls.tonalCenter,
    requestId: result === null ? null : result.intent.requestId,
    seed: result === null ? null : result.intent.seed,
    timeline: result === null ? null : JSON.stringify(result.outcome.result.timeline),
    chosenNoteDensity: state.controls.noteDensity,
    generatedNoteDensity: result === null ? null : result.intent.controls.noteDensity,
    latestSeed: state.latestIntent === null ? null : state.latestIntent.seed,
    roomNotice: state.roomNotice,
    retriesRunning: state.retriesRunning,
    roomNoticeAnnouncements: state.roomNoticeAnnouncements,
  }
}

/**
 * Intent: the harmony of the phrase the workspace shows (its outcome's provenance), for the audio
 * seams' `queueBacking`. Throws before the session mounts or while no phrase is shown.
 */
// @test-link [[req_session_backing_track]]
function shownHarmony(): readonly HarmonyEvent[] {
  if (workspace === null) {
    throw new Error('Workspace harness: queueBacking() was called before the session mounted.')
  }
  const result: WorkspaceSessionResult | null = workspace.session.state.result
  if (result === null) {
    throw new Error('Workspace harness: queueBacking() needs a shown phrase; generate one first.')
  }
  return result.outcome.provenance.harmony.events
}

const harnessApi: WorkspaceHarnessApi = {
  queueSeeds: (seeds) => seedProvider.queueSeeds(seeds),
  holdGeneration: () => gate.hold(),
  releaseGeneration: () => gate.release(),
  holdBackgroundGeneration: () => backgroundGate.hold(),
  releaseBackgroundGeneration: () => backgroundGate.release(),
  backgroundGeneration,
  failNextGeneration: (code, skip = 0, count = 1) => armGenerationFailures(code, skip, count),
  generationsSettled: () => generationsSettled,
  failNextNotation: (code) => armNextNotationFailure(code),
  queueFitVerdicts: (verdicts) => queueForcedFitVerdicts(verdicts),
  fitChecks: fitCheckCount,
  engravings: engravingCount,
  roomChecks: roomCheckCount,
  seedsDrawn: seedProvider.seedsDrawn,
  queueSessionSeeds: (seeds) => sessionSeedProvider.queueSeeds(seeds),
  sessionSeedsDrawn: sessionSeedProvider.seedsDrawn,
  phraseAttemptSeed: (seed, phraseNumber, rung) =>
    seedPlan.phraseAttemptSeed(makeSeed(seed), phraseNumber, rung),
  settingsMutationSeed: (seed) => seedPlan.settingsMutationSeed(makeSeed(seed)),
  generatedTimelines: () => [...generatedTimelines],
  generationRequests: () => generationRequests.map((record) => ({ ...record })),
  setWallClock,
  failNextExport: armNextExportFailure,
  exportsBuilt,
  snapshot,
  prewarmCount: () => prewarmsPosted,
  audio: harnessAudio.api,
  midi: harnessMidi.api,
  screenLocks: harnessBrowser.screenLocks,
  page: harnessBrowser.page,
  windowShape: harnessBrowser.windowShape,
  session: harnessSessionController.api,
  storage: harnessStorage.api,
}

/**
 * Intent: mount the app with what the load gave, its workspace session composed on the harness's
 * seams, then publish the harness API.
 */
function mountHarness(loaded: SavedDataLoad): void {
  savedData = loaded
  const app = createApp(App, { savedData: loaded })
  app.provide(WORKSPACE_SESSION_FACTORY, (saved) => composeHarnessWorkspace(saved))
  app.mount('#app')
  window.__workspaceHarness = harnessApi
}

/** Intent: the workspace session on the harness's seams, from the loaded saved data. */
function composeHarnessWorkspace(saved: SavedDataLoad): WorkspaceSession {
  const composed = composeWorkspaceSession({
    providers: { nextRequestId: requestIdProvider, nextSeed: seedProvider.nextSeed },
    nextSessionSeed: sessionSeedProvider.nextSeed,
    viewport: createBrowserViewportWidth(),
    generate: harnessGenerate,
    prewarmPolicy: harnessPrewarmPolicy,
    pregenerationPolicy,
    prewarm: harnessPrewarm,
    audio: harnessAudio.transport,
    midi: harnessMidi.controller,
    browser: harnessBrowser.ports,
    sessionClock: {
      createWakeTimer: harnessAudio.createSessionWakeTimer,
      wallClock: () => fixedWallClock ?? Date.now(),
      // The browser's own frames, as in the app: the playhead is read on the harness's audio clock.
      frames: {
        request: (callback) => requestAnimationFrame(() => callback()),
        cancel: (handle) => cancelAnimationFrame(handle),
      },
    },
    // The same sink as production: each accepted phrase's replay-key line goes to console.info.
    logPhraseReplayKey: (line) => console.info(line),
    dispose: client.dispose,
    savedData: saved,
  })
  workspace = {
    ...composed,
    createSessionController: harnessSessionController.wrap(composed.createSessionController),
  }
  return workspace
}

// A rejected load is a defect and stays unhandled, as in the app.
void harnessStorage.load().then(mountHarness)
