/**
 * The session controller and its Idle pre-generation queue: the queue runs while every start
 * condition holds, a background attempt never blocks Start, Start aborts it at once and passes
 * the ready phrases that fit to the runner, whose engine spends them in place of requesting them,
 * planned with the mutation flag Start gives and the settings Start builds, the player's rhythm
 * lock, its allowed changes and the allowed groups with them, so a session with the lock on plays
 * the same phrases with pre-generation on or off;
 * tempo and Rising tempo keep the queue; dispose aborts the attempt in flight.
 */
import { describe, expect, it } from 'vitest'

import { createWorkspacePregeneration } from '@/components/workspace/workspace-pregeneration'
import { createPregenerationSlot } from '@/composables/generation-session-pregeneration'
import { makeRequestId } from '@/domain/generation/generation-request'
import { RHYTHM_CHANGE_KINDS } from '@/domain/generation/request-rhythm-lock'
import { settingsMutationSeed } from '@/session/session-seed-plan'
import { mutationPhrase } from '@/session/settings-mutation'
import {
  DEFAULT_SESSION_OPTIONS,
  type SessionOptionChoices,
} from '@/storage/records/setting-defaults'
import { fakeViewport, realOutcomeFor, withoutRequestIds } from '../../session/session-harness'
import { connectKeys } from './session-controller-midi'
import {
  RIG_FIXED_PARTS,
  alwaysSucceed,
  controllerRig,
  flush,
  outputsOf,
  playTo,
  type ControllerRig,
} from './session-controller-rig'
import { createGatedGenerate, type GatedGenerate } from './pregeneration-rig'

/** Intent: when phrase `n` of a 240 BPM rig session starts sounding. */
function phraseStart(n: number): number {
  return 6.1 + 4 * (n - 1)
}

/** A controller whose pre-generation queue runs on a generate seam the test settles. */
interface PregeneratingRig {
  readonly rig: ControllerRig
  readonly background: GatedGenerate
}

/** Saved choices with the rhythm lock on, every rhythm change allowed and the Figures group off. */
const SAVED_LOCK: SessionOptionChoices = {
  ...DEFAULT_SESSION_OPTIONS,
  rhythmLockOn: true,
  allowedRhythmChanges: RHYTHM_CHANGE_KINDS,
  allowedGroups: { ...DEFAULT_SESSION_OPTIONS.allowedGroups, figures: false },
}

/**
 * Intent: a controller rig at `tempo` with an enabled pre-generation queue, the controller
 * starting from `saved` choices (a first visit's by default).
 */
function pregeneratingRig(
  tempo = 240,
  saved: SessionOptionChoices = DEFAULT_SESSION_OPTIONS,
): PregeneratingRig {
  const background = createGatedGenerate()
  let requests = 0
  const rig = controllerRig(alwaysSucceed, () => Promise.resolve(RIG_FIXED_PARTS), {
    tempo,
    savedSessionOptions: saved,
    pregeneration: (seams) =>
      createWorkspacePregeneration({
        ...seams,
        generate: background.generate,
        providers: { nextRequestId: () => makeRequestId(`background-${++requests}`) },
        viewport: fakeViewport(false),
        slot: createPregenerationSlot(),
        policy: 'enabled',
      }),
  })
  return { rig, background }
}

/** Intent: answer every background attempt with its real outcome until none is in flight. */
async function answerBackground(background: GatedGenerate): Promise<void> {
  await flush()
  for (let answered = 0; background.calls.some((call) => !call.settled); answered += 1) {
    expect(answered, 'the queue stops within 20 attempts').toBeLessThan(20)
    const call = background.calls.find((entry) => !entry.settled)!
    call.resolve(realOutcomeFor(call.intent))
    await flush()
  }
}

/**
 * The tempo of the sessions compared with and without the queue: slow enough that phrase 2's
 * deadline leaves time for its carry-in attempt, as the queue's plan makes it.
 */
const IDENTITY_TEMPO = 60

/** Intent: when phrase `n` of a 60 BPM rig session starts sounding. */
function slowPhraseStart(n: number): number {
  return 9.1 + 16 * (n - 1)
}

/** What a session gave, request ids aside: its decided phrases and its settings changes. */
interface PlayedSession {
  readonly phrases: unknown
  readonly changes: readonly unknown[]
  /** How many decided phrases the lock changed the rhythm of. */
  readonly rhythmChanges: number
}

/**
 * Intent: play a 60 BPM session started from `saved` to phrase 6 sounding on the fake clock, with
 * the background queue answered first when `pregenerated` (its four phrases then spent, never
 * requested), else with no queue at all (the rig's disabled one); what it decided, request ids
 * aside.
 */
async function playedSession(
  saved: SessionOptionChoices,
  pregenerated: boolean,
): Promise<PlayedSession> {
  let rig: ControllerRig
  if (pregenerated) {
    const built = pregeneratingRig(IDENTITY_TEMPO, saved)
    await answerBackground(built.background)
    rig = built.rig
  } else {
    rig = controllerRig(alwaysSucceed, undefined, {
      tempo: IDENTITY_TEMPO,
      savedSessionOptions: saved,
    })
  }
  expect(rig.controller.start()).toBe('started')
  await playTo(rig, slowPhraseStart(6))
  const decided = outputsOf(rig, 'phrase-ready').map((ready) => ready.phrase)
  const played: PlayedSession = {
    phrases: withoutRequestIds(decided),
    changes: withoutRequestIds(outputsOf(rig, 'settings-changed')) as unknown[],
    rhythmChanges: decided.filter(
      (phrase) => phrase.outcome.provenance.rhythmLockOutcome === 'rhythm_change',
    ).length,
  }
  expect(rig.runnerInputs[0]!.start.readyPhrases ?? []).toHaveLength(pregenerated ? 4 : 0)
  const requested = new Set(outputsOf(rig, 'request-generation').map((r) => r.phraseNumber))
  expect([2, 3, 4, 5].filter((n) => requested.has(n))).toEqual(pregenerated ? [] : [2, 3, 4, 5])
  expect(decided.map((phrase) => phrase.phraseNumber)).toEqual([2, 3, 4, 5, 6, 7])
  rig.controller.dispose()
  return played
}

// @test-link [[module_session_lock_and_groups_choices]]
describe('session controller with Idle pre-generation: the rhythm lock and the allowed groups', () => {
  // @test-link [[module_session_lock_and_groups_choices]]
  // @test-link [[rule_pregenerated_phrase_matches_session]]
  // @test-link [[req_rhythm_lock]]
  it("builds the queue's start as Start does, the saved lock, changes and groups with it, so Start spends every ready phrase", async () => {
    const { rig, background } = pregeneratingRig(240, SAVED_LOCK)
    await answerBackground(background)
    expect(background.calls).toHaveLength(4)

    rig.controller.start()
    await playTo(rig, phraseStart(4) + 0.05)

    const { start } = rig.runnerInputs[0]!
    expect(start.settings).toMatchObject({
      rhythmLockOn: true,
      allowedRhythmChanges: RHYTHM_CHANGE_KINDS,
      allowedGroups: { ...DEFAULT_SESSION_OPTIONS.allowedGroups, figures: false },
    })
    expect(start.readyPhrases?.map((ready) => ready.phraseNumber)).toEqual([2, 3, 4, 5])
    expect(outputsOf(rig, 'request-generation')).toEqual([])
    expect(outputsOf(rig, 'phrase-ready').map((ready) => ready.phrase.phraseNumber)).toEqual([
      2, 3, 4, 5,
    ])
    expect(background.calls).toHaveLength(4)
    rig.controller.dispose()
  })

  // @test-link [[rule_pregenerated_phrase_matches_session]]
  // @test-link [[rule_allowed_rhythm_changes]]
  // @test-link [[rule_vary_settings_allowed_groups]]
  it.each([
    { varySettings: false, saved: SAVED_LOCK },
    { varySettings: true, saved: { ...SAVED_LOCK, varySettings: true } },
  ])(
    'plays the same phrases with pre-generation on or off, the lock on, a rhythm change among them (Vary settings $varySettings)',
    async ({ varySettings, saved }) => {
      const withQueue = await playedSession(saved, true)
      const withoutQueue = await playedSession(saved, false)

      expect(withQueue.phrases).toEqual(withoutQueue.phrases)
      expect(withQueue.changes).toEqual(withoutQueue.changes)
      expect(withQueue.rhythmChanges).toBeGreaterThan(0)
      expect(withQueue.changes.length > 0).toBe(varySettings)
    },
  )

  // @test-link [[module_session_lock_and_groups_choices]]
  it("starts with v3.1's settings from a first visit's choices: the lock off, no change, every group", async () => {
    const { rig, background } = pregeneratingRig()
    await answerBackground(background)

    rig.controller.start()

    expect(rig.runnerInputs[0]!.start.settings).toMatchObject({
      rhythmLockOn: false,
      allowedRhythmChanges: [],
      allowedGroups: {
        keyAndMode: true,
        harmony: true,
        tension: true,
        rhythm: true,
        melodyShape: true,
        figures: true,
      },
    })
    expect(outputsOf(rig, 'request-generation')).toEqual([])
    rig.controller.dispose()
  })
})

// @test-link [[rule_start_never_waits_for_pregeneration]]
describe('session controller with Idle pre-generation', () => {
  // @test-link [[rule_start_never_waits_for_pregeneration]]
  // @test-link [[module_session_ready_phrases]]
  it('passes the ready phrases to the runner, whose engine spends phrase 2 without requesting it', async () => {
    const { rig, background } = pregeneratingRig()
    await answerBackground(background)
    expect(background.calls).toHaveLength(4)

    rig.controller.start()

    const { readyPhrases } = rig.runnerInputs[0]!.start
    expect(readyPhrases?.map((ready) => ready.phraseNumber)).toEqual([2, 3, 4, 5])
    expect(readyPhrases?.map((ready) => ready.intent)).toEqual(
      background.calls.map((call) => call.intent),
    )
    expect(outputsOf(rig, 'request-generation')).toEqual([])
    const [phraseTwo] = outputsOf(rig, 'phrase-ready')
    expect(phraseTwo?.phrase).toMatchObject({ phraseNumber: 2, origin: 'carry-in' })
    expect(phraseTwo?.phrase.intent).toEqual(readyPhrases![0]!.intent)
    expect(background.calls).toHaveLength(4)
    rig.controller.dispose()
  })

  // @test-link [[rule_pregenerated_phrase_matches_session]]
  // @test-link [[rule_vary_settings_needs_legal_move]]
  it('plans with the mutation flag Start gives, so a session with Vary settings on spends every ready phrase, its first mutation among them', async () => {
    const { rig, background } = pregeneratingRig()
    rig.controller.setVarySettings(true)
    await answerBackground(background)
    const landsOn = mutationPhrase(settingsMutationSeed(rig.phraseOne.sessionSeed), 1)
    expect(landsOn).toBeLessThanOrEqual(5)

    rig.controller.start()
    await playTo(rig, phraseStart(4) + 0.05)

    expect(rig.runnerInputs[0]!.start).toMatchObject({ varySettings: true })
    expect(rig.runnerInputs[0]!.start.readyPhrases?.map((ready) => ready.phraseNumber)).toEqual([
      2, 3, 4, 5,
    ])
    expect(outputsOf(rig, 'request-generation')).toEqual([])
    expect(outputsOf(rig, 'settings-changed')).toMatchObject([
      { phraseNumber: landsOn, cause: 'mutation' },
    ])
    expect(outputsOf(rig, 'phrase-ready').map((ready) => ready.phrase.phraseNumber)).toEqual([
      2, 3, 4, 5,
    ])
    rig.controller.dispose()
  })

  // @test-link [[rule_start_never_waits_for_pregeneration]]
  // @test-link [[module_idle_pregeneration_queue]]
  it('starts at once while a background attempt runs, which never blocks it, and aborts it', async () => {
    const { rig, background } = pregeneratingRig()
    await flush()
    const phraseTwo = background.calls[0]!
    expect(phraseTwo.settled).toBe(false)
    expect(rig.controller.state.startBlocker).toBeNull()
    expect(rig.controller.state.canStart).toBe(true)

    rig.controller.start()

    expect(rig.controller.state.phase).toBe('count-in')
    expect(phraseTwo.signal.aborted).toBe(true)
    expect(rig.runnerInputs[0]!.start.readyPhrases).toEqual([])
    expect(outputsOf(rig, 'request-generation')[0]?.phraseNumber).toBe(2)
    await flush()
    expect(background.calls).toHaveLength(1)
    rig.controller.dispose()
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('keeps the queue through a tempo change and Rising tempo, the engine spending it at the new tempo', async () => {
    const { rig, background } = pregeneratingRig(120)
    await answerBackground(background)
    await connectKeys(rig)

    rig.idle.controls = { ...rig.idle.controls, tempo: 130 }
    rig.controller.setAdaptiveTempo(true)
    await flush()
    rig.controller.start()

    expect(background.calls).toHaveLength(4)
    expect(rig.runnerInputs[0]!.start.readyPhrases).toHaveLength(4)
    expect(outputsOf(rig, 'request-generation')).toEqual([])
    const [phraseTwo] = outputsOf(rig, 'phrase-ready')
    expect(phraseTwo?.phrase.intent.controls.tempo).toBe(130)
    expect(phraseTwo?.phrase.outcome).toBe(realOutcomeFor(background.calls[0]!.intent))
    rig.controller.dispose()
  })

  // @test-link [[module_idle_pregeneration_queue]]
  it('runs nothing during a session and aborts the attempt in flight at dispose', async () => {
    const { rig, background } = pregeneratingRig()
    await flush()
    rig.controller.start()
    rig.controller.stop()
    await flush()
    const resumed = background.calls.at(-1)!
    expect(background.calls).toHaveLength(2)
    expect(resumed.settled).toBe(false)

    rig.controller.dispose()

    expect(resumed.signal.aborted).toBe(true)
  })
})
