/**
 * The Idle layout hand-off through the real workspace composition: while a session runs, the
 * staff's reports never reach the real Idle machinery; at its end the latest are re-applied, so the
 * Idle rules decide in the layout the window gives afresh (room: Ready with phrase 1; no room: the
 * room notice; phrase 1 too wide: fresh-seed retries), and never with a notation error. After an
 * end once phrase 1 sounded, the Review shows, the played phrase leaves the staff at once and a fresh
 * phrase is generated behind it (none while the staff has no room, until the notice clears); it is
 * asked for with Idle at rest, or generating a replacement it supersedes, never drawing. The
 * real Idle machinery and coordinator run over a fake engraver planner (every phrase fits, the staff
 * has room, 60-unit fixed parts, unless a test says otherwise) and a transport on the fake clock.
 */
import { countingSessionSeeds } from '../../composables/fake-session-seed'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  composeWorkspaceSession,
  type WorkspaceSession,
} from '@/components/workspace/create-workspace-session'
import type { SessionController } from '@/components/workspace/workspace-session-controller-types'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { makeSeed } from '@/domain/random/seed'
import { createMidiController } from '@/midi/midi-controller'
import { NotationError } from '@/notation/notation-error'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { FakeAudioRig } from '../../audio/fake-audio'
import { transportRig } from '../../audio/transport-rig'
import { createFakeViewportWidth } from '../../composables/fake-viewport-width'
import { createFakeMidiAccess } from '../../midi/fake-midi-access'
import { fakeEngraver, resetFakeEngraver } from '../../notation/fake-vexflow-engraver-loader'
import {
  createFakeSessionBrowser,
  type FakeSessionBrowser,
} from '../../session/fake-session-browser'
import { fixedWallClock } from '../../session/session-harness'
import { createFakeFrames } from './fake-frames'
import { useCheapControls } from './test-workspace'

vi.mock('@/generation-worker/browser-generation-worker', () => ({
  createBrowserGenerationWorker: vi.fn(() => ({
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    terminate: vi.fn(),
  })),
}))

vi.mock(
  '@/notation/vexflow-engraver-loader',
  () => import('../../notation/fake-vexflow-engraver-loader'),
)

beforeEach(() => {
  resetFakeEngraver()
})

/** The staff's inputs in the fake desktop window (1280 x 800). */
const WIDE_STAFF: StaffLayoutInputs = {
  containerWidthPx: 1100,
  viewport: { layout: 'one-system', heightBudgetPx: null },
}

/** A workspace at Ready with a running session's controller, and every seam in the test's hand. */
interface Rig {
  readonly workspace: WorkspaceSession
  readonly controller: SessionController
  readonly browser: FakeSessionBrowser
  readonly audioRig: FakeAudioRig
  readonly generate: ReturnType<
    typeof vi.fn<(intent: GenerationIntent) => Promise<GenerationOutcome>>
  >
}

/** Intent: let every pending promise settle. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/** Intent: generate an Idle phrase and engrave it, as a mounted PhraseScore would. */
async function generateAndEngrave(workspace: WorkspaceSession): Promise<void> {
  const running = workspace.session.actions.generate()
  await vi.waitFor(() => {
    if (workspace.session.state.operation !== 'notating') throw new Error('not drawing yet')
  })
  workspace.handleEngraved()
  expect(await running).toBe(true)
}

/** Intent: a workspace at Ready on the desktop window, its session controller built, not started. */
async function readyRig(): Promise<Rig> {
  const { rig: audioRig, transport } = transportRig()
  const browser = createFakeSessionBrowser()
  let counter = 0
  const generate = vi.fn((intent: GenerationIntent) => Promise.resolve(generatePhrase(intent)))
  const workspace = composeWorkspaceSession({
    providers: {
      nextRequestId: () => makeRequestId(`idle-layout-${++counter}`),
      nextSeed: () => makeSeed(++counter),
    },
    nextSessionSeed: countingSessionSeeds(),
    viewport: createFakeViewportWidth(),
    generate,
    prewarmPolicy: 'disabled',
    pregenerationPolicy: 'disabled',
    prewarm: vi.fn(),
    audio: transport,
    midi: createMidiController({
      provider: createFakeMidiAccess(),
      clock: { anchor: () => transport.clockAnchor() },
    }),
    browser,
    sessionClock: {
      createWakeTimer: audioRig.createExtraWakeTimer,
      wallClock: fixedWallClock,
      frames: createFakeFrames().port,
    },
    logPhraseReplayKey: vi.fn(),
    dispose: () => undefined,
  })
  useCheapControls(workspace.session)
  workspace.handleLayoutInputs(WIDE_STAFF)
  await generateAndEngrave(workspace)
  const controller = await workspace.createSessionController()
  return { workspace, controller, browser, audioRig, generate }
}

/** Intent: start a session and move into its count-in. */
async function inCountIn(): Promise<Rig & { readonly phraseOne: unknown }> {
  const rig = await readyRig()
  const phraseOne = rig.workspace.session.state.result
  rig.controller.start()
  rig.audioRig.advanceTo(rig.audioRig.now() + 0.2)
  await flush()
  expect(rig.controller.state.phase).toBe('count-in')
  return { ...rig, phraseOne }
}

/** Intent: the Idle state's layout-related fields, to compare before and after. */
function idleView(workspace: WorkspaceSession) {
  const { result, resultEngraved, roomNotice, notationError, operation, retriesRunning } =
    workspace.session.state
  return { result, resultEngraved, roomNotice, notationError, operation, retriesRunning }
}

// @test-link [[rule_count_in_ending_returns_to_idle]]
describe('the workspace session: the Idle layout hand-off', () => {
  // @test-link [[rule_count_in_ending_returns_to_idle]]
  // @test-link [[rule_session_layout_fixed_at_start]]
  it('leaves Idle untouched by a resize with room during the session, and Ready with phrase 1 after it', async () => {
    const rig = await inCountIn()
    const before = idleView(rig.workspace)

    rig.browser.windowShape.resize({ widthPx: 1100, smallHeightPx: 700, remPx: 16 })
    rig.workspace.handleLayoutInputs({
      containerWidthPx: 1000,
      viewport: { layout: 'one-system', heightBudgetPx: null },
    })
    rig.workspace.handleEngraved()
    expect(idleView(rig.workspace)).toEqual(before)
    expect(rig.controller.state.phase).toBe('count-in')

    rig.controller.stop()
    await flush()

    expect(idleView(rig.workspace)).toEqual(before)
    expect(rig.workspace.session.state.result).toBe(rig.phraseOne)
    expect(rig.controller.state.canStart).toBe(true)
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  // @test-link [[rule_count_in_ending_returns_to_idle]]
  it('ends on phrase 1 finding no room at the new size, then shows the room notice, not a notation error', async () => {
    const rig = await inCountIn()

    rig.workspace.handleNotationError(new NotationError('notation_no_room', 'no room', {}))

    expect(rig.controller.state.lastEnd).toEqual({
      cause: 'staff-not-shown',
      phase: 'count-in',
      soundedPhraseCount: 0,
    })
    expect(idleView(rig.workspace)).toMatchObject({
      roomNotice: 'no_room',
      notationError: null,
      operation: 'idle',
    })
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  // @test-link [[rule_count_in_ending_returns_to_idle]]
  it('ends on phrase 1 too wide at the new size, then runs fresh-seed retries, not a notation error', async () => {
    const rig = await inCountIn()
    const requestsBefore = rig.generate.mock.calls.length

    rig.workspace.handleNotationError(new NotationError('notation_notes_too_wide', 'too wide', {}))

    expect(rig.controller.state.lastEnd?.cause).toBe('staff-not-shown')
    expect(idleView(rig.workspace)).toMatchObject({
      operation: 'generating',
      notationError: null,
      result: null,
    })
    await vi.waitFor(() => {
      if (rig.workspace.session.state.operation !== 'notating') throw new Error('not drawing yet')
    })
    rig.workspace.handleEngraved()
    await flush()
    expect(rig.generate.mock.calls.length).toBeGreaterThan(requestsBefore)
    expect(rig.workspace.session.state.result).not.toBe(rig.phraseOne)
    expect(rig.controller.state.canStart).toBe(true)
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('ends on a held layout too narrow at the reported size; the redraw that follows reaches Idle', async () => {
    const rig = await inCountIn()

    rig.browser.windowShape.resize({ widthPx: 700, smallHeightPx: 400, remPx: 16 })
    expect(rig.controller.state.phase).toBe('count-in')
    rig.workspace.handleLayoutInputs({
      containerWidthPx: 120,
      viewport: { layout: 'split', heightBudgetPx: 250 },
    })
    expect(rig.controller.state.lastEnd?.cause).toBe('staff-not-shown')
    expect(idleView(rig.workspace).roomNotice).toBeNull()

    rig.workspace.handleNotationError(new NotationError('notation_no_room', 'no room', {}))

    expect(idleView(rig.workspace)).toMatchObject({ roomNotice: 'no_room', notationError: null })
  })
})

/** Intent: play the count-in through and half a beat of phrase 1, then Stop. */
async function stopOnceSounded(rig: Rig): Promise<void> {
  while (rig.controller.state.phase !== 'running') {
    rig.audioRig.advanceTo(rig.audioRig.now() + 0.25)
    await flush()
  }
  rig.audioRig.advanceTo(rig.audioRig.now() + 0.5)
  await flush()
  rig.controller.stop()
}

/** Intent: let the fresh phrase's run reach its drawing, then engrave it as PhraseScore would. */
async function engraveFreshPhrase(workspace: WorkspaceSession): Promise<void> {
  await vi.waitFor(() => {
    if (workspace.session.state.operation !== 'notating') throw new Error('not drawing yet')
  })
  workspace.handleEngraved()
  await flush()
}

// @test-link [[rule_session_end_generates_next_phrase_one]]
describe('the workspace session: the next phrase at a session end', () => {
  // @test-link [[rule_session_end_generates_next_phrase_one]]
  // @test-link [[req_last_session_review]]
  it('drops the played phrase at once and generates a fresh one behind the Review', async () => {
    const rig = await inCountIn()
    const playedIntent = rig.workspace.session.state.latestIntent
    const requestsBefore = rig.generate.mock.calls.length

    await stopOnceSounded(rig)

    expect(rig.controller.state.lastEnd).toMatchObject({ cause: 'stop', soundedPhraseCount: 1 })
    expect(rig.controller.state.review?.showing).toBe(true)
    expect(rig.workspace.session.state.result).toBeNull()
    expect(rig.workspace.pendingPhrase.value).toBeNull()
    expect(rig.controller.state.startBlocker).toBe('review_showing')

    await engraveFreshPhrase(rig.workspace)

    const fresh = rig.workspace.session.state.result
    expect(fresh).not.toBeNull()
    expect(fresh).not.toBe(rig.phraseOne)
    expect(fresh?.intent.seed).not.toBe(playedIntent?.seed)
    expect(fresh?.intent.carryIn).toBeUndefined()
    expect(rig.generate.mock.calls.length).toBe(requestsBefore + 1)
    expect(rig.controller.state.startBlocker).toBe('review_showing')

    rig.controller.closeReview()

    expect(rig.controller.state.canStart).toBe(true)
    expect(rig.controller.state.lastHistory?.phraseCount).toBe(1)
  })

  // @test-link [[rule_session_end_generates_next_phrase_one]]
  // @test-link [[rule_staff_notice_gives_way_to_new_phrase]]
  it('generates nothing while the staff has no room, then a fresh phrase, not the played one, once the notice clears', async () => {
    const rig = await inCountIn()
    const requestsBefore = rig.generate.mock.calls.length
    fakeEngraver.planStaffRoomForKey.mockReturnValue({ kind: 'no_room', cause: 'too_narrow' })

    await stopOnceSounded(rig)
    await flush()

    expect(idleView(rig.workspace)).toMatchObject({
      result: null,
      roomNotice: 'no_room',
      operation: 'idle',
    })
    expect(rig.generate.mock.calls.length).toBe(requestsBefore)

    fakeEngraver.planStaffRoomForKey.mockReturnValue({ kind: 'room' })
    rig.workspace.handleLayoutInputs({
      containerWidthPx: 1000,
      viewport: { layout: 'one-system', heightBudgetPx: null },
    })
    await engraveFreshPhrase(rig.workspace)

    expect(rig.generate.mock.calls.length).toBe(requestsBefore + 1)
    expect(rig.workspace.session.state.roomNotice).toBeNull()
    expect(rig.workspace.session.state.result).not.toBeNull()
    expect(rig.workspace.session.state.result).not.toBe(rig.phraseOne)
  })

  // @test-link [[rule_session_end_generates_next_phrase_one]]
  // @test-link [[rule_session_start_conditions]]
  it('asks for the fresh phrase with Idle at rest: nothing reaches the Idle machinery during the session', async () => {
    const rig = await inCountIn()
    const operations = recordFreshPhraseCalls(rig.workspace)

    rig.workspace.handleLayoutInputs({
      containerWidthPx: 1000,
      viewport: { layout: 'one-system', heightBudgetPx: null },
    })
    rig.workspace.handleEngraved()
    await stopOnceSounded(rig)

    expect(operations).toEqual(['idle'])
    expect(rig.controller.state.review?.showing).toBe(true)
    await engraveFreshPhrase(rig.workspace)
    expect(rig.workspace.session.state.result).not.toBe(rig.phraseOne)
  })

  // @test-link [[rule_session_end_generates_next_phrase_one]]
  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('supersedes the replacement a held drawing failure starts as it is handed back, never meeting a drawing', async () => {
    const rig = await inCountIn()
    while (rig.controller.state.phase !== 'running') {
      rig.audioRig.advanceTo(rig.audioRig.now() + 0.25)
      await flush()
    }
    rig.audioRig.advanceTo(rig.audioRig.now() + 0.5)
    await flush()
    const operations = recordFreshPhraseCalls(rig.workspace)
    const requestsBefore = rig.generate.mock.calls.length

    rig.workspace.handleNotationError(new NotationError('notation_notes_too_wide', 'too wide', {}))

    expect(rig.controller.state.lastEnd).toMatchObject({
      cause: 'staff-not-shown',
      soundedPhraseCount: 1,
    })
    expect(operations).toEqual(['generating'])
    expect(rig.controller.state.review?.showing).toBe(true)
    await engraveFreshPhrase(rig.workspace)

    // The superseded replacement's request is answered but changes nothing.
    expect(rig.generate.mock.calls.length).toBe(requestsBefore + 2)
    const fresh = rig.workspace.session.state.result
    expect(fresh?.intent.seed).toBe(rig.generate.mock.calls.at(-1)?.[0].seed)
    expect(rig.workspace.session.state.operation).toBe('idle')
    expect(rig.workspace.session.state.notationError).toBeNull()
  })
})

/**
 * Intent: record the Idle operation each time the controller asks for a fresh phrase, the call
 * going on to the real action.
 */
function recordFreshPhraseCalls(workspace: WorkspaceSession): string[] {
  const operations: string[] = []
  const actions = workspace.session.actions
  const original = actions.startFreshPhrase
  vi.spyOn(actions, 'startFreshPhrase').mockImplementation(() => {
    operations.push(workspace.session.state.operation)
    return original()
  })
  return operations
}
