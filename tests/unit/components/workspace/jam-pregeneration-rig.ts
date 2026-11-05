/**
 * Jam's own pre-generation queue specs' shared rig: Jam's queue (jam-pregeneration.ts) over a Jam
 * phrase 1 at Idle the test edits by hand (a real phrase 1 from Jam-like settings, engraved, with
 * the kept doodle's steering block and its session seed), the kept doodle, what phrase 1 is
 * written from, Jam's tempo and the workspace's facts the test sets (Jam mode showing, nothing
 * else in the way at first), session mode's shared instrument and window, a real Idle layout gate
 * that has had the staff's wide inputs, a desktop window, a fake staff planner, queued providers,
 * a real background slot (or the one given, to share it with session mode's queue) and a generate
 * seam the test answers by hand, as the session-mode rig's.
 */
import { shallowReactive, shallowRef, type ShallowRef } from 'vue'

import { createIdleLayoutGate } from '@/components/workspace/idle-layout-gate'
import {
  createJamPregeneration,
  type JamPregenerationFacts,
} from '@/components/workspace/jam-pregeneration'
import type { KeptDoodlePhraseResult } from '@/components/workspace/use-kept-doodle-phrase'
import type { WorkspacePregeneration } from '@/components/workspace/workspace-pregeneration'
import {
  createPregenerationSlot,
  type PregenerationSlot,
} from '@/composables/generation-session-pregeneration'
import type { IdlePhraseState } from '@/composables/generation-session-types'
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import { makeSeed, type Seed } from '@/domain/random/seed'
import { buildSteeringBlock } from '@/jam/steering-block-builder'
import type { SessionSettings } from '@/session/session-types'
import {
  fakeViewport,
  phraseOneFor,
  queuedProviders,
  sessionSettings,
  type FakeViewport,
} from '../../session/session-harness'
import { FAKE_DESKTOP_WINDOW } from '../../session/fake-session-browser'
import { KEPT_DOODLE } from '../../storage/kept-session-v32-fixtures'
import { createFakePlanner, type FakePlanner } from './fake-frames'
import { createGatedGenerate, WIDE_INPUTS, type GenerateCall } from './pregeneration-rig'

/** The session seed Jam's phrase 1 was published with. */
export const JAM_SESSION_SEED = makeSeed(0x0d00_d1e0)

/** The block every phrase of a Jam on the fixture's kept doodle carries, at the Near drift. */
export const KEPT_STEERING = buildSteeringBlock(KEPT_DOODLE.quantized, 'Near')

/** Jam-like settings at 60 BPM: the base controls, Jam's lock off, no groups' choice in force. */
export function jamLikeSettings(): SessionSettings {
  return sessionSettings({ tempo: 60 })
}

/** Intent: a Jam phrase 1 written from the kept doodle at `seed`, as Jam's Idle publishes it. */
export function keptPhraseFor(
  settings: SessionSettings = jamLikeSettings(),
  seed = 11,
  sessionSeed: Seed = JAM_SESSION_SEED,
): KeptDoodlePhraseResult {
  const phraseOne = phraseOneFor(settings, { seed })
  return { ...phraseOne, settings, step: 'carry-in', steering: KEPT_STEERING, sessionSeed }
}

/** Jam's queue and every seam around it, in the test's hand. */
export interface JamPregenerationRig {
  readonly queue: WorkspacePregeneration
  readonly phrase: IdlePhraseState<KeptDoodlePhraseResult>
  readonly doodle: ShallowRef<QuantizedDoodle | null>
  readonly writtenFrom: ShallowRef<string | null>
  readonly tempo: ShallowRef<number>
  readonly facts: ShallowRef<JamPregenerationFacts>
  readonly shared: {
    myInstrument: MyInstrument | null
    noteDensityContext: { belowTabletLandscape: boolean; sessionSteppedDown: boolean }
  }
  readonly viewport: FakeViewport
  readonly planner: FakePlanner
  readonly slot: PregenerationSlot
  readonly calls: GenerateCall[]
  readonly failures: unknown[]
}

/** The facts with Jam mode showing and nothing in the way. */
export const JAM_SHOWING: JamPregenerationFacts = {
  jamShowing: true,
  sessionActive: false,
  reviewShowing: false,
  orientationNoticeShown: false,
}

/** What a rig is built with; every field has a default. */
export interface JamPregenerationRigOptions {
  /** The background slot, to share it with session mode's queue; a fresh one by default. */
  readonly slot?: PregenerationSlot
  readonly facts?: JamPregenerationFacts
  /** Jam's phrase 1 state at the start, over the default (shown, idle, nothing failed). */
  readonly phrase?: Partial<IdlePhraseState<KeptDoodlePhraseResult>>
  /** The kept doodle at the start; the fixture's by default. */
  readonly doodle?: QuantizedDoodle | null
}

/** Intent: the rig, Jam mode showing with a doodle kept and its phrase 1 shown, unless told. */
export function jamPregenerationRig(options: JamPregenerationRigOptions = {}): JamPregenerationRig {
  const settings = jamLikeSettings()
  const phrase = shallowReactive<IdlePhraseState<KeptDoodlePhraseResult>>({
    latestIntent: null,
    result: keptPhraseFor(settings),
    operation: 'idle',
    generationError: null,
    notationError: null,
    resultEngraved: true,
    roomNotice: null,
    retriesRunning: false,
    roomNoticeAnnouncements: 0,
    ...options.phrase,
  })
  const doodle = shallowRef<QuantizedDoodle | null>(
    options.doodle === undefined ? KEPT_DOODLE.quantized : options.doodle,
  )
  const writtenFrom = shallowRef<string | null>('jam-settings-1')
  const tempo = shallowRef(settings.controls.tempo)
  const facts = shallowRef<JamPregenerationFacts>(options.facts ?? JAM_SHOWING)
  const shared = shallowReactive({
    controls: settings.controls,
    myInstrument: null as MyInstrument | null,
    noteDensityContext: { belowTabletLandscape: false, sessionSteppedDown: false },
  })
  const viewport = fakeViewport(false)
  const gate = createIdleLayoutGate({
    layoutInputs: () => undefined,
    engraved: () => undefined,
    notationError: () => undefined,
  })
  gate.layoutInputs(WIDE_INPUTS)
  const planner = createFakePlanner()
  const slot = options.slot ?? createPregenerationSlot()
  const { calls, generate } = createGatedGenerate()
  const failures: unknown[] = []

  const queue = createJamPregeneration({
    generate,
    providers: queuedProviders(9000, 0),
    viewport,
    slot,
    policy: 'enabled',
    phrase,
    doodle: () => doodle.value,
    writtenFrom: () => writtenFrom.value,
    tempo: () => tempo.value,
    facts: () => facts.value,
    shared,
    windowShape: () => FAKE_DESKTOP_WINDOW,
    idleLayout: gate,
    loadPlanner: planner.load,
    fail: (error) => failures.push(error),
  })
  return {
    queue,
    phrase,
    doodle,
    writtenFrom,
    tempo,
    facts,
    shared,
    viewport,
    planner,
    slot,
    calls,
    failures,
  }
}
