/**
 * The workspace's rhythm-domain prewarm, through `composeWorkspaceSession`: the policy (disabled
 * posts nothing), the triggers (session start, then one post per change of the width-resolved
 * rhythm setting through a control edit, a musical-profile switch or a width crossing), the dedupe
 * of every other change, the fixed prewarm identity that never draws a seed or request id, and a
 * generated outcome identical with and without prewarm when real prewarm slices run in between.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  composeWorkspaceSession,
  type WorkspaceSession,
  type WorkspaceSessionDependencies,
} from '@/components/workspace/create-workspace-session'
import type { WorkspacePrewarmPolicy } from '@/components/workspace/prewarm-policy'
import { PREWARM_REQUEST_ID, PREWARM_SEED } from '@/composables/generation-session-prewarm'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { createCanonicalRhythmDomainMemo } from '@/domain/generation/orchestration/canonical-rhythm-domain'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { DEFAULT_PROFILE_SELECTION } from '@/domain/controls/profile-selection'
import { makeSeed } from '@/domain/random/seed'
import { createGenerationWorkerClient } from '@/generation-worker/generation-worker-client'
import {
  createFakeViewportWidth,
  type FakeViewportWidth,
} from '../../composables/fake-viewport-width'
import { transportRig } from '../../audio/transport-rig'
import {
  createFakeGenerationWorkerPort,
  type FakeGenerationWorkerPort,
} from '../../generation-worker/fake-generation-worker-port'
import { resetFakeEngraver } from '../../notation/fake-vexflow-engraver-loader'
import { createFakeMidiAccess } from '../../midi/fake-midi-access'
import { createMidiController } from '@/midi/midi-controller'
import { createFakeSessionBrowser } from '../../session/fake-session-browser'
import { fixedWallClock } from '../../session/session-harness'
import { createFakeFrames } from './fake-frames'

// The fit and room checks plan through the lazy engraver loader; a fake planner answers here.
vi.mock(
  '@/notation/vexflow-engraver-loader',
  () => import('../../notation/fake-vexflow-engraver-loader'),
)

beforeEach(() => {
  resetFakeEngraver()
})

/**
 * Intent: a locked transport on a fake audio rig, a MIDI controller on a fake MIDI access that
 * reads that transport's clock, and fake session browser ports; prewarm never touches any of them.
 */
function fakeAudioAndMidi(): Pick<
  WorkspaceSessionDependencies,
  'audio' | 'midi' | 'browser' | 'sessionClock'
> {
  const { rig, transport } = transportRig()
  const midi = createMidiController({
    provider: createFakeMidiAccess(),
    clock: { anchor: () => transport.clockAnchor() },
  })
  return {
    audio: transport,
    midi,
    browser: createFakeSessionBrowser(),
    sessionClock: {
      createWakeTimer: rig.createExtraWakeTimer,
      wallClock: fixedWallClock,
      frames: createFakeFrames().port,
    },
  }
}

/** A workspace over fake seams, with the prewarm and generate calls recorded. */
interface PrewarmRig {
  readonly workspace: WorkspaceSession
  readonly viewport: FakeViewportWidth
  readonly prewarms: GenerationIntent[]
  readonly generated: GenerationIntent[]
}

/**
 * Intent: a workspace under `policy` whose generate seam answers with a real phrase for the
 * intent's own identity (never a hand-rolled outcome) and whose seeds come from `seeds` first,
 * then from a counter, as the e2e harness's queue does.
 */
function prewarmRig(
  policy: WorkspacePrewarmPolicy,
  options: { readonly belowTabletLandscape?: boolean; readonly seeds?: readonly number[] } = {},
): PrewarmRig {
  const viewport = createFakeViewportWidth(options.belowTabletLandscape ?? false)
  const prewarms: GenerationIntent[] = []
  const generated: GenerationIntent[] = []
  const seedQueue = [...(options.seeds ?? [])]
  let seedCounter = 0
  let requestCounter = 0
  const workspace = composeWorkspaceSession({
    providers: {
      nextRequestId: () => makeRequestId(`prewarm-spec-request-${++requestCounter}`),
      nextSeed: () => makeSeed(seedQueue.shift() ?? ++seedCounter),
    },
    viewport,
    generate: async (intent) => {
      generated.push(intent)
      return generatePhrase(intent)
    },
    prewarmPolicy: policy,
    prewarm: (intent) => prewarms.push(intent),
    ...fakeAudioAndMidi(),
    logPhraseReplayKey: vi.fn(),
    dispose: () => undefined,
  })
  return { workspace, viewport, prewarms, generated }
}

/** Intent: the rhythm setting a prewarm intent carries, as one readable string. */
function rhythmOf(intent: GenerationIntent): string {
  const c = intent.controls
  return [c.noteDensity, c.rhythmicVariety, c.silenceDensity, c.syncopation, c.tension].join('|')
}

/**
 * Intent: report the staff's layout inputs, start `generate()`, then settle its inner `notate()`
 * the way a mounted `PhraseScore` would, so the whole Idle operation runs without a component tree.
 */
function generateAndEngrave(workspace: WorkspaceSession): Promise<boolean> {
  workspace.handleLayoutInputs({
    containerWidthPx: 1100,
    viewport: { layout: 'one-system', heightBudgetPx: null },
  })
  const running = workspace.session.actions.generate()
  void vi
    .waitFor(() => {
      if (workspace.pendingPhrase.value === null) throw new Error('not yet pending')
    })
    .then(() => workspace.handleEngraved())
  return running
}

// @test-link [[service_workspace_session_flow]]
describe('workspace prewarm: policy and triggers', () => {
  // @test-link [[service_workspace_session_flow]]
  it('posts nothing at all with the policy disabled, whatever changes', () => {
    const { workspace, viewport, prewarms } = prewarmRig('disabled')
    const { actions } = workspace.session

    actions.setControl('noteDensity', 'Sixteenth')
    actions.setControl('syncopation', 'Active displacement')
    actions.selectMusicalProfile('Jazz')
    viewport.cross(true)

    expect(prewarms).toEqual([])
  })

  // @test-link [[service_workspace_session_flow]]
  it('posts one prewarm at start for the current controls, under the fixed prewarm identity', () => {
    const { workspace, prewarms } = prewarmRig('enabled')

    expect(prewarms).toHaveLength(1)
    expect(prewarms[0]!.requestId).toBe(PREWARM_REQUEST_ID)
    expect(prewarms[0]!.seed).toBe(PREWARM_SEED)
    expect(prewarms[0]!.controls).toEqual(
      createGenerationIntent({
        requestId: PREWARM_REQUEST_ID,
        seed: PREWARM_SEED,
        controls: workspace.session.state.controls,
        musicalProfile: DEFAULT_PROFILE_SELECTION,
      }).controls,
    )
  })

  // @test-link [[service_workspace_session_flow]]
  // @test-link [[rule_generated_density_follows_window_width]]
  it('prewarms the width-resolved density: a chosen Sixteenth below the width is warmed as Eighth', () => {
    const { workspace, prewarms } = prewarmRig('enabled', { belowTabletLandscape: true })

    workspace.session.actions.setControl('noteDensity', 'Sixteenth')
    workspace.session.actions.setControl('noteDensity', 'Eighth')

    // Quarter at start, then Eighth (the resolved Sixteenth); choosing Eighth itself changes nothing.
    expect(prewarms.map((intent) => intent.controls.noteDensity)).toEqual(['Quarter', 'Eighth'])
  })

  // @test-link [[service_workspace_session_flow]]
  it('posts one prewarm per rhythm-control change made through setControl', () => {
    const { workspace, prewarms } = prewarmRig('enabled')
    const { actions } = workspace.session

    actions.setControl('noteDensity', 'Eighth')
    actions.setControl('rhythmicVariety', 'Heavily varied')
    actions.setControl('silenceDensity', 'Breath-heavy')
    actions.setControl('syncopation', 'Occasional offbeats')
    actions.setControl('tension', 'Build')

    expect(prewarms.map(rhythmOf)).toEqual([
      'Quarter|Slightly varied|Sparse|Straight|Lift',
      'Eighth|Slightly varied|Sparse|Straight|Lift',
      'Eighth|Heavily varied|Sparse|Straight|Lift',
      'Eighth|Heavily varied|Breath-heavy|Straight|Lift',
      'Eighth|Heavily varied|Breath-heavy|Occasional offbeats|Lift',
      'Eighth|Heavily varied|Breath-heavy|Occasional offbeats|Build',
    ])
  })

  // @test-link [[service_workspace_session_flow]]
  it('posts nothing for a non-rhythm edit or a same-value rhythm edit', () => {
    const { workspace, prewarms } = prewarmRig('enabled')
    const { actions } = workspace.session

    actions.setControl('tonalCenter', 'F')
    actions.setControl('tempo', 140)
    actions.setControl('contour', 'Wandering')
    actions.setControl('harmonicMotion', 'Gentle diatonic')
    actions.setControl('noteDensity', 'Quarter')

    expect(prewarms).toHaveLength(1)
  })

  // @test-link [[service_workspace_session_flow]]
  it('posts one prewarm for a profile switch that changes the rhythm setting, none otherwise', () => {
    const { workspace, prewarms } = prewarmRig('enabled')
    const { actions } = workspace.session

    actions.setControl('contour', 'Wandering')
    actions.selectMusicalProfile('Neutral')
    expect(prewarms).toHaveLength(1)

    actions.selectMusicalProfile('Jazz')
    expect(prewarms.map(rhythmOf)).toEqual([
      'Quarter|Slightly varied|Sparse|Straight|Lift',
      'Eighth|Slightly varied|Conversational|Occasional offbeats|Lift',
    ])
    expect(prewarms[1]!.musicalProfile).toEqual({ musicalProfile: 'Jazz', isCustom: false })
  })

  // @test-link [[service_workspace_session_flow]]
  // @test-link [[rule_generated_density_follows_window_width]]
  it('posts one prewarm for a width crossing that changes the generated density, none otherwise', () => {
    const { workspace, viewport, prewarms } = prewarmRig('enabled')

    viewport.cross(true)
    viewport.cross(false)
    expect(prewarms).toHaveLength(1)

    workspace.session.actions.setControl('noteDensity', 'Sixteenth')
    viewport.cross(true)
    viewport.cross(true)
    viewport.cross(false)

    expect(prewarms.map((intent) => intent.controls.noteDensity)).toEqual([
      'Quarter',
      'Sixteenth',
      'Eighth',
      'Sixteenth',
    ])
  })

  // @test-link [[service_workspace_session_flow]]
  it('never posts while a generation is running, since no control can change then', async () => {
    const { workspace, prewarms } = prewarmRig('enabled')

    const running = generateAndEngrave(workspace)
    expect(workspace.session.actions.setControl('tension', 'Build')).toBe(false)
    await running

    expect(prewarms).toHaveLength(1)
  })
})

/**
 * Intent: one scripted walk through the workspace: rhythm and non-rhythm edits, a crossing, a
 * profile switch, Generate, another edit and Regenerate, returning the identities generate drew.
 */
async function walkThroughWorkspace(rig: PrewarmRig): Promise<string[]> {
  const { actions } = rig.workspace.session
  actions.setControl('tension', 'Settled')
  actions.setControl('tonalCenter', 'G')
  actions.setControl('noteDensity', 'Sixteenth')
  rig.viewport.cross(true)
  actions.selectMusicalProfile('Neutral')
  expect(await generateAndEngrave(rig.workspace)).toBe(true)
  actions.setControl('syncopation', 'Occasional offbeats')
  const regenerating = actions.regenerate()
  void vi
    .waitFor(() => {
      if (rig.workspace.session.state.operation !== 'notating') throw new Error('not notating')
    })
    .then(() => rig.workspace.handleEngraved())
  expect(await regenerating).toBe(true)
  return rig.generated.map((intent) => `${intent.requestId}#${intent.seed}`)
}

// @test-link [[service_workspace_session_flow]]
describe('workspace prewarm: generation identity is untouched', () => {
  // @test-link [[service_workspace_session_flow]]
  it('draws the same queued seeds and request ids for generation with and without prewarm', async () => {
    const enabled = prewarmRig('enabled', { seeds: [101, 202] })
    const disabled = prewarmRig('disabled', { seeds: [101, 202] })

    const withPrewarm = await walkThroughWorkspace(enabled)
    const withoutPrewarm = await walkThroughWorkspace(disabled)

    expect(withPrewarm).toEqual(['prewarm-spec-request-1#101', 'prewarm-spec-request-2#202'])
    expect(withPrewarm).toEqual(withoutPrewarm)
    expect(enabled.prewarms.length).toBeGreaterThan(1)
    for (const intent of enabled.prewarms) {
      expect(intent.requestId).toBe(PREWARM_REQUEST_ID)
      expect(intent.seed).toBe(PREWARM_SEED)
    }
  })
})

/** A workspace wired to the real Worker runtime through the fake port, as production wires it. */
interface WorkerRig {
  readonly workspace: WorkspaceSession
  readonly port: FakeGenerationWorkerPort
}

/**
 * Intent: a workspace over a real client and runtime (fresh memo, a clock that ticks 1 ms per
 * read so an 8 ms slice runs only a few build steps), with fixed identities for its generations.
 */
function workerRig(policy: WorkspacePrewarmPolicy): WorkerRig {
  let tick = 0
  const port = createFakeGenerationWorkerPort(undefined, {
    now: () => tick++,
    memo: createCanonicalRhythmDomainMemo(),
  })
  const client = createGenerationWorkerClient(port)
  let counter = 0
  const workspace = composeWorkspaceSession({
    providers: {
      nextRequestId: () => makeRequestId(`worker-rig-request-${++counter}`),
      nextSeed: () => makeSeed(4000 + counter),
    },
    viewport: createFakeViewportWidth(false),
    generate: client.generate,
    prewarmPolicy: policy,
    prewarm: client.prewarm,
    ...fakeAudioAndMidi(),
    logPhraseReplayKey: vi.fn(),
    dispose: client.dispose,
  })
  return { workspace, port }
}

/** Intent: let the fake port deliver every posted message, then run up to `count` queued slices. */
async function runSlices(port: FakeGenerationWorkerPort, count: number): Promise<void> {
  await Promise.resolve()
  for (let run = 0; run < count && port.pendingSliceCount() > 0; run++) port.runNextSlice()
}

/**
 * The rhythm edits the outcome comparison makes, in order, from the defaults. The final setting's
 * build takes about 17 slices under the 1 ms-per-read clock, so a few slices leave it unfinished.
 */
const COMPARISON_EDITS = [
  ['noteDensity', 'Eighth'],
  ['syncopation', 'Occasional offbeats'],
  ['tension', 'Settled'],
] as const

/** Intent: make every comparison edit, running `slicesBetween` prewarm slices after each one. */
async function chooseComparisonSetting(rig: WorkerRig, slicesBetween: number): Promise<void> {
  for (const [key, value] of COMPARISON_EDITS) {
    rig.workspace.session.actions.setControl(key, value)
    await runSlices(rig.port, slicesBetween)
  }
}

/** Intent: generate once on `rig` and return the outcome it produced. */
async function generatedOutcome(rig: WorkerRig): Promise<GenerationOutcome> {
  expect(await generateAndEngrave(rig.workspace)).toBe(true)
  return rig.workspace.session.state.result!.outcome
}

// @test-link [[service_workspace_session_flow]]
// @test-link [[module_generation_worker_protocol]]
describe('workspace prewarm: the generated phrase is the same with prewarm on or off', () => {
  // @test-link [[service_workspace_session_flow]]
  it('matches when prewarms were replaced mid-build and the last one only partly ran', async () => {
    const off = workerRig('disabled')
    await chooseComparisonSetting(off, 0)
    const expected = await generatedOutcome(off)
    expect(off.port.postedMessages()).toHaveLength(1)

    const on = workerRig('enabled')
    await runSlices(on.port, 1)
    await chooseComparisonSetting(on, 2)
    expect(on.port.pendingSliceCount()).toBe(1)

    expect(await generatedOutcome(on)).toEqual(expected)
    expect(on.port.postedMessages().map((message) => (message as { type: string }).type)).toEqual([
      'prewarm',
      'prewarm',
      'prewarm',
      'prewarm',
      'generate',
    ])
  })

  // @test-link [[service_workspace_session_flow]]
  it('matches after the prewarm of the setting ran to completion', async () => {
    const off = workerRig('disabled')
    await chooseComparisonSetting(off, 0)
    const expected = await generatedOutcome(off)

    const on = workerRig('enabled')
    await chooseComparisonSetting(on, 0)
    await runSlices(on.port, Number.POSITIVE_INFINITY)
    expect(on.port.pendingSliceCount()).toBe(0)

    expect(await generatedOutcome(on)).toEqual(expected)
  })
})
