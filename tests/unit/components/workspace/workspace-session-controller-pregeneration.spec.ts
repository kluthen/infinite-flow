/**
 * The session controller and its Idle pre-generation queue: the queue runs while every start
 * condition holds, a background attempt never blocks Start, Start aborts it at once and passes
 * the ready phrases that fit to the runner, whose engine spends them in place of requesting them;
 * tempo and Rising tempo keep the queue; dispose aborts the attempt in flight.
 */
import { describe, expect, it } from 'vitest'

import { createWorkspacePregeneration } from '@/components/workspace/workspace-pregeneration'
import { createPregenerationSlot } from '@/composables/generation-session-pregeneration'
import { makeRequestId } from '@/domain/generation/generation-request'
import { fakeViewport, realOutcomeFor } from '../../session/session-harness'
import { connectKeys } from './session-controller-midi'
import {
  RIG_FIXED_PARTS,
  alwaysSucceed,
  controllerRig,
  flush,
  outputsOf,
  type ControllerRig,
} from './session-controller-rig'
import { createGatedGenerate, type GatedGenerate } from './pregeneration-rig'

/** A controller whose pre-generation queue runs on a generate seam the test settles. */
interface PregeneratingRig {
  readonly rig: ControllerRig
  readonly background: GatedGenerate
}

/** Intent: a controller rig at `tempo` with an enabled pre-generation queue. */
function pregeneratingRig(tempo = 240): PregeneratingRig {
  const background = createGatedGenerate()
  let requests = 0
  const rig = controllerRig(alwaysSucceed, () => Promise.resolve(RIG_FIXED_PARTS), {
    tempo,
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
