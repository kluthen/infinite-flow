/**
 * Fake dependencies for the `composeWorkspaceSession` specs: a fully fake dependency bundle (never a
 * real Worker or `crypto`) whose generate seam answers with a real, cheap `generatePhrase()` result
 * and whose saved data is a first visit's (every default, read from the stylesheet's mix design),
 * plus the steps a spec without a mounted component tree takes to get a phrase drawn: report the
 * staff's layout inputs, generate, settle the engraving, and choose the cheap controls. A spec using
 * `generateAndEngrave` must mock `@/notation/vexflow-engraver-loader` with the fake engraver loader,
 * since the fit check plans through it.
 */
import { countingSessionSeeds } from '../../composables/fake-session-seed'
import { expect, vi } from 'vitest'

import type {
  composeWorkspaceSession,
  WorkspaceSessionDependencies,
} from '@/components/workspace/create-workspace-session'
import type {
  WorkspacePregenerationPolicy,
  WorkspacePrewarmPolicy,
} from '@/components/workspace/prewarm-policy'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '@/domain/controls/profile-selection'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { makeSeed } from '@/domain/random/seed'
import { createMidiController } from '@/midi/midi-controller'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { SavedDataLoad } from '@/storage-bootstrap'
import { defaultSettings, type SavedSettings } from '@/storage/records/setting-defaults'
import type { FakeWakeTimer } from '../../audio/fake-audio'
import { themeDesign, transportRig } from '../../audio/transport-rig'
import {
  createFakeViewportWidth,
  type FakeViewportWidth,
} from '../../composables/fake-viewport-width'
import { createFakeMidiAccess, type FakeMidiAccess } from '../../midi/fake-midi-access'
import {
  createFakeSessionBrowser,
  type FakeSessionBrowser,
} from '../../session/fake-session-browser'
import { fixedWallClock } from '../../session/session-harness'
import { createFakeFrames, type FakeFrames } from './fake-frames'

/** The layout inputs a mounted PhraseScore would report for a wide window. */
export const STAFF_INPUTS: StaffLayoutInputs = {
  containerWidthPx: 1100,
  viewport: { layout: 'one-system', heightBudgetPx: null },
}

/** The controls whose phrases are cheap to generate. */
export const CHEAP_CONTROLS = {
  ...DEFAULT_GENERATION_CONTROLS,
  noteDensity: 'Quarter',
  syncopation: 'Straight',
  silenceDensity: 'Sparse',
  harmonicMotion: 'Gentle diatonic',
  tension: 'Settled',
} as const

/**
 * Intent: a load that read the saved data: the defaults (the mix's from the stylesheet's design)
 * with `settings` over them, nothing kept, and a save policy that never settles, as no spec here
 * saves.
 */
export function fakeSavedData(settings: Partial<SavedSettings> = {}): SavedDataLoad {
  return {
    outcome: 'saved-data-read',
    settings: { ...defaultSettings(themeDesign().defaults), ...settings },
    keptSessionSummaries: [],
    rememberedController: [],
    savePolicy: new Promise(() => {}),
  }
}

/** Intent: run one real, cheap generation for the given intent's own identity and seed. */
function cheapOutcome(requestId: string, seed: number): GenerationOutcome {
  const intent = createGenerationIntent({
    requestId: makeRequestId(requestId),
    seed: makeSeed(seed),
    controls: CHEAP_CONTROLS,
    musicalProfile: DEFAULT_PROFILE_SELECTION,
  })
  return generatePhrase(intent)
}

/**
 * Intent: build a fully fake dependency bundle whose seams a test can assert against directly,
 * under the given prewarm and pre-generation policies (disabled unless a test is about them).
 */
export function fakeDependencies(
  prewarmPolicy: WorkspacePrewarmPolicy = 'disabled',
  pregenerationPolicy: WorkspacePregenerationPolicy = 'disabled',
): WorkspaceSessionDependencies & {
  readonly generateMock: ReturnType<typeof vi.fn>
  readonly disposeMock: ReturnType<typeof vi.fn>
  readonly prewarmMock: ReturnType<typeof vi.fn<(intent: GenerationIntent) => void>>
  readonly viewport: FakeViewportWidth
  readonly midiAccess: FakeMidiAccess
  readonly browser: FakeSessionBrowser
  readonly sessionTimers: FakeWakeTimer[]
  readonly sessionFrames: FakeFrames
  /** Every replay-key line handed to the injected console sink, in order. */
  readonly replayKeyLines: string[]
} {
  let seedCounter = 0
  let requestCounter = 0
  // A real generate seam always answers under the caller's own request identity/seed; this fake
  // preserves that contract (notationInputFromOutcome rejects a mismatched requestId) while still
  // producing a real, cheap generatePhrase() result rather than a hand-rolled stand-in.
  const generateMock = vi.fn(async (intent: GenerationIntent): Promise<GenerationOutcome> => {
    return cheapOutcome(intent.requestId, intent.seed)
  })
  const disposeMock = vi.fn()
  const prewarmMock = vi.fn<(intent: GenerationIntent) => void>()
  const { rig, transport } = transportRig()
  const midiAccess = createFakeMidiAccess()
  const sessionTimers: FakeWakeTimer[] = []
  const sessionFrames = createFakeFrames()
  const replayKeyLines: string[] = []
  return {
    providers: {
      nextRequestId: () => makeRequestId(`di-seam-request-${++requestCounter}`),
      nextSeed: () => makeSeed(++seedCounter),
    },
    nextSessionSeed: countingSessionSeeds(),
    viewport: createFakeViewportWidth(),
    generate: generateMock,
    prewarmPolicy,
    pregenerationPolicy,
    prewarm: prewarmMock,
    audio: transport,
    midi: createMidiController({
      provider: midiAccess,
      clock: { anchor: () => transport.clockAnchor() },
    }),
    browser: createFakeSessionBrowser(),
    sessionClock: {
      createWakeTimer: () => {
        const timer = rig.createExtraWakeTimer()
        sessionTimers.push(timer)
        return timer
      },
      wallClock: fixedWallClock,
      frames: sessionFrames.port,
    },
    sessionTimers,
    sessionFrames,
    logPhraseReplayKey: (line) => {
      replayKeyLines.push(line)
    },
    savedData: fakeSavedData(),
    replayKeyLines,
    dispose: disposeMock,
    generateMock,
    disposeMock,
    prewarmMock,
    midiAccess,
  }
}

/**
 * Intent: report the staff's layout inputs, start `generate()`, then settle its inner `notate()`
 * the way a mounted `PhraseScore` would (`layout-inputs` at mount, `handleEngraved` once the
 * coordinator publishes a phrase to engrave), so a fake dependency bundle with no real component
 * tree can still exercise the whole operation.
 */
export function generateAndEngrave(
  workspace: ReturnType<typeof composeWorkspaceSession>,
): Promise<boolean> {
  workspace.handleLayoutInputs(STAFF_INPUTS)
  const running = workspace.session.actions.generate()
  void vi
    .waitFor(() => {
      if (workspace.pendingPhrase.value === null) throw new Error('not yet pending')
    })
    .then(() => workspace.handleEngraved())
  return running
}

/** Intent: set the workspace's controls to the cheap-to-generate values, one control at a time. */
export function chooseCheapControls(workspace: ReturnType<typeof composeWorkspaceSession>): void {
  const keys = [
    'noteDensity',
    'syncopation',
    'silenceDensity',
    'harmonicMotion',
    'tension',
  ] as const
  for (const key of keys) {
    expect(workspace.session.actions.setControl(key, CHEAP_CONTROLS[key])).toBe(true)
  }
}
