/**
 * The Idle pre-generation orchestrator specs' shared rig: an orchestrator over an Idle state the
 * test edits by hand (a real phrase 1, engraved, its session seed published with it), a start
 * blocker and two session flags the test sets, a real Idle layout gate that has had the staff's
 * wide inputs, a desktop window, a fake staff planner, queued providers, a real background slot,
 * and a generate seam the test answers by hand: each call waits until the test settles it, and an
 * aborted signal rejects it with the client's cancellation error, as the worker client does.
 */
import { shallowReactive, shallowRef, type ShallowRef } from 'vue'
import { expect } from 'vitest'

import { createIdleLayoutGate, type IdleLayoutGate } from '@/components/workspace/idle-layout-gate'
import type { WorkspacePregenerationPolicy } from '@/components/workspace/prewarm-policy'
import {
  createWorkspacePregeneration,
  type WorkspacePregeneration,
} from '@/components/workspace/workspace-pregeneration'
import {
  createPregenerationSlot,
  type PregenerationSlot,
} from '@/composables/generation-session-pregeneration'
import type { MutableGenerationSessionState } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { makeSeed } from '@/domain/random/seed'
import { GenerationCancelledError } from '@/generation-worker/generation-worker-client'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { WindowShapeReading } from '@/session/session-browser-ports'
import type { SessionStartBlocker } from '@/session/session-start-conditions'
import {
  fakeViewport,
  phraseOneFor,
  queuedProviders,
  realOutcomeFor,
  sessionSettings,
  type FakeViewport,
  type QueuedProviders,
} from '../../session/session-harness'
import { FAKE_DESKTOP_WINDOW } from '../../session/fake-session-browser'
import { createFakePlanner, type FakePlanner } from './fake-frames'

/** The session seed the rig's phrase 1 was published with. */
export const PREGENERATION_SESSION_SEED = makeSeed(0x0a11_ce00)

/** The staff's layout inputs in a wide window: one system, plenty of width. */
export const WIDE_INPUTS: StaffLayoutInputs = {
  containerWidthPx: 1100,
  viewport: { layout: 'one-system', heightBudgetPx: null },
}

/** One call of the rig's generate seam, settled by the test. */
export interface GenerateCall {
  readonly intent: GenerationIntent
  readonly signal: AbortSignal
  settled: boolean
  readonly resolve: (outcome: GenerationOutcome) => void
  readonly reject: (error: unknown) => void
}

/** An orchestrator and every seam around it, in the test's hand. */
export interface PregenerationRig {
  readonly queue: WorkspacePregeneration
  readonly idle: MutableGenerationSessionState<WorkspaceSessionResult>
  readonly blocker: ShallowRef<SessionStartBlocker | null>
  readonly varySettings: ShallowRef<boolean>
  readonly tensionAcrossPhrases: ShallowRef<boolean>
  readonly viewport: FakeViewport
  readonly window: { shape: WindowShapeReading }
  readonly gate: IdleLayoutGate
  readonly planner: FakePlanner
  readonly providers: QueuedProviders
  readonly slot: PregenerationSlot
  /** Every generate call, in order. */
  readonly calls: GenerateCall[]
  /** Every programming error reported, in order. */
  readonly failures: unknown[]
}

/** What a rig is built with; every field has a default. */
export interface PregenerationRigOptions {
  readonly policy?: WorkspacePregenerationPolicy
  readonly controls?: Partial<GenerationControls>
  readonly blocker?: SessionStartBlocker | null
  /**
   * Whether an aborted call rejects at once, as the worker client does (the default); false keeps
   * it pending, so the test can deliver a result after its abort.
   */
  readonly rejectOnAbort?: boolean
}

/** Intent: let every pending promise and queued watcher settle. */
export function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/** Intent: a phrase 1 for `controls` at `seed`, as Idle publishes it. */
export function idlePhraseFor(
  controls: GenerationControls,
  seed = 11,
  sessionSeed = PREGENERATION_SESSION_SEED,
): WorkspaceSessionResult {
  const settings = { ...sessionSettings(), controls }
  return {
    ...phraseOneFor(settings, { seed }),
    settings: { controls, figureLevels: settings.figureLevels, selection: settings.selection },
    sessionSeed,
  }
}

/** A generate seam the test settles by hand, and every call made to it. */
export interface GatedGenerate {
  readonly calls: GenerateCall[]
  readonly generate: (intent: GenerationIntent, signal: AbortSignal) => Promise<GenerationOutcome>
}

/**
 * Intent: a generate seam whose calls wait until the test settles them; with `rejectOnAbort`, an
 * aborted call rejects at once with the client's cancellation error, as the worker client does.
 */
export function createGatedGenerate(rejectOnAbort = true): GatedGenerate {
  const calls: GenerateCall[] = []
  return {
    calls,
    generate: (intent, signal) =>
      new Promise((resolve, reject) => {
        const call: GenerateCall = {
          intent,
          signal,
          settled: false,
          resolve: (outcome) => {
            call.settled = true
            resolve(outcome)
          },
          reject: (error) => {
            call.settled = true
            reject(error)
          },
        }
        calls.push(call)
        signal.addEventListener('abort', () => {
          if (!call.settled && rejectOnAbort) call.reject(new GenerationCancelledError())
        })
      }),
  }
}

/** Intent: the rig, at Idle with every start condition holding unless told otherwise. */
export function pregenerationRig(options: PregenerationRigOptions = {}): PregenerationRig {
  const settings = sessionSettings({ tempo: 60, ...options.controls })
  const idle = shallowReactive<MutableGenerationSessionState<WorkspaceSessionResult>>({
    controls: settings.controls,
    figureLevels: settings.figureLevels,
    selection: settings.selection,
    presentation: { theme: 'System' },
    myInstrument: null,
    latestIntent: null,
    result: idlePhraseFor(settings.controls),
    operation: 'idle',
    generationError: null,
    notationError: null,
    resultEngraved: true,
    noteDensityContext: { belowTabletLandscape: false, sessionSteppedDown: false },
    roomNotice: null,
    retriesRunning: false,
    roomNoticeAnnouncements: 0,
  })
  const blocker = shallowRef<SessionStartBlocker | null>(options.blocker ?? null)
  const varySettings = shallowRef(false)
  const tensionAcrossPhrases = shallowRef(false)
  const viewport = fakeViewport(false)
  const window = { shape: FAKE_DESKTOP_WINDOW }
  const gate = createIdleLayoutGate({
    layoutInputs: () => undefined,
    engraved: () => undefined,
    notationError: () => undefined,
  })
  gate.layoutInputs(WIDE_INPUTS)
  const planner = createFakePlanner()
  const providers = queuedProviders(7000, 0)
  const slot = createPregenerationSlot()
  const { calls, generate } = createGatedGenerate(options.rejectOnAbort !== false)
  const failures: unknown[] = []

  const queue = createWorkspacePregeneration({
    generate,
    providers,
    viewport,
    slot,
    policy: options.policy ?? 'enabled',
    idle,
    startBlocker: () => blocker.value,
    varySettings: () => varySettings.value,
    tensionAcrossPhrases: () => tensionAcrossPhrases.value,
    windowShape: () => window.shape,
    idleLayout: gate,
    loadPlanner: planner.load,
    fail: (error) => failures.push(error),
  })
  return {
    queue,
    idle,
    blocker,
    varySettings,
    tensionAcrossPhrases,
    viewport,
    window,
    gate,
    planner,
    providers,
    slot,
    calls,
    failures,
  }
}

/** Intent: the call in flight: the latest one, which must still be unsettled. */
export function inFlight(rig: PregenerationRig): GenerateCall {
  const call = rig.calls.at(-1)
  expect(call, 'a background attempt is in flight').toBeDefined()
  expect(call!.settled, 'the latest background attempt is still in flight').toBe(false)
  return call!
}

/** Intent: answer the call in flight with its intent's real outcome, then let everything settle. */
export async function answer(rig: PregenerationRig): Promise<void> {
  const call = inFlight(rig)
  call.resolve(realOutcomeFor(call.intent))
  await flush()
}

/**
 * Intent: answer every call with its real outcome until nothing is in flight; a queue that keeps
 * asking past a generous bound fails the test.
 */
export async function answerAll(rig: PregenerationRig): Promise<void> {
  await flush()
  for (let answered = 0; rig.calls.some((call) => !call.settled); answered += 1) {
    expect(answered, 'the queue stops within 20 attempts').toBeLessThan(20)
    await answer(rig)
  }
}

/**
 * Intent: the phrase numbers Start would take now in the wide one-system layout; a take aborts
 * the attempt in flight, so a test inspects the queue this way once nothing is in flight.
 */
export function takenNumbers(rig: PregenerationRig): number[] {
  return rig.queue.take('one-system').map((ready) => ready.phraseNumber)
}
