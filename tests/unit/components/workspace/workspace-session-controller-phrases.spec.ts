/**
 * The session controller's running session, on the fake audio clock at 240 BPM from 5 s (phrase N
 * starts sounding at 6.1 + 4 (N - 1) s, and phrase N + 1's deadline is one measure earlier): each
 * phrase the engine readies gets its backing queued and starts sounding on time, the history keeps
 * each phrase at its scheduled start, a session with no controller and no MIDI keeps running, the
 * struggling notice follows the engine, and the same seeds and script give the same session twice.
 */
import { describe, expect, it, vi } from 'vitest'

import {
  alwaysFail,
  alwaysSucceed,
  controllerRig,
  onlyStandaloneSucceeds,
  outputsOf,
  playTo,
  RIG_TEMPO,
  soundingEvents,
  type ControllerRig,
  type GenerateScript,
} from './session-controller-rig'

/** Intent: the time phrase `n` starts sounding. */
function phraseStart(n: number): number {
  return 6.1 + (n - 1) * 4
}

/** Intent: the notice's state just before and just after phrase `n` starts sounding. */
async function noticeAround(rig: ControllerRig, n: number): Promise<[boolean, boolean]> {
  await playTo(rig, phraseStart(n) - 0.05)
  const before = rig.controller.state.strugglingNotice
  await playTo(rig, phraseStart(n) + 0.05)
  return [before, rig.controller.state.strugglingNotice]
}

// @test-link [[service_workspace_session_flow]]
describe('session controller: phrases', () => {
  // @test-link [[service_workspace_session_flow]]
  // @test-link [[req_session_backing_track]]
  it('queues each readied phrase and sends it as started sounding at its start, in order', async () => {
    const rig = controllerRig()
    const queueBacking = vi.spyOn(rig.transport, 'queueBacking')
    rig.controller.start()

    await playTo(rig, phraseStart(2) - 0.05)
    const ready = outputsOf(rig, 'phrase-ready').map((o) => o.phrase)
    expect(ready.map((phrase) => phrase.phraseNumber)).toEqual([2])
    expect(queueBacking.mock.calls[1]).toEqual([
      2,
      ready[0]!.outcome.provenance.harmony.events,
      RIG_TEMPO,
    ])
    expect(soundingEvents(rig)).toEqual([])

    await playTo(rig, phraseStart(2))
    expect(rig.events.at(-1)).toEqual({
      kind: 'phrase-started-sounding',
      at: phraseStart(2),
      phraseNumber: 2,
    })

    await playTo(rig, phraseStart(3))
    const third = outputsOf(rig, 'phrase-ready')[1]!.phrase
    expect(third.phraseNumber).toBe(3)
    expect(queueBacking.mock.calls[2]).toEqual([
      3,
      third.outcome.provenance.harmony.events,
      RIG_TEMPO,
    ])
    expect(soundingEvents(rig)).toEqual([2, 3])
    expect(rig.events.at(-1)).toMatchObject({ at: phraseStart(3), phraseNumber: 3 })
  })

  // @test-link [[rule_midi_never_blocks_session]]
  it('keeps a session with no controller and no MIDI running across ten phrases until Stop', async () => {
    const rig = controllerRig()
    rig.controller.start()

    await playTo(rig, phraseStart(11) + 1)

    expect(rig.controller.state.phase).toBe('running')
    expect(rig.transport.isRunning()).toBe(true)
    expect(soundingEvents(rig)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(rig.events.some((event) => event.kind === 'end')).toBe(false)
    rig.controller.stop()
    expect(rig.controller.state.lastEnd?.soundedPhraseCount).toBe(11)
  })

  // @test-link [[req_session_backing_track]]
  it('queues a repeat like any readied phrase', async () => {
    const rig = controllerRig(alwaysFail)
    const queueBacking = vi.spyOn(rig.transport, 'queueBacking')
    rig.controller.start()

    await playTo(rig, phraseStart(2))

    const repeat = outputsOf(rig, 'phrase-ready')[0]!.phrase
    expect(repeat).toMatchObject({ phraseNumber: 2, origin: 'repeat', repeatOf: 1 })
    expect(queueBacking.mock.calls[1]).toEqual([
      2,
      rig.phraseOne.outcome.provenance.harmony.events,
      RIG_TEMPO,
    ])
    expect(soundingEvents(rig)).toEqual([2])
  })
})

// @test-link [[rule_session_history_records_played_notes]]
describe("session controller: the history's phrase starts", () => {
  // @test-link [[rule_session_history_records_played_notes]]
  it('records each phrase at its scheduled start when the engine time passed it before the wake-up', async () => {
    const rig = controllerRig()
    const transportStart = vi.spyOn(rig.transport, 'start')
    // Off the wake-up grid by 10 ms, so every phrase starts between two wake-ups.
    rig.audioRig.advanceTo(rig.audioRig.now() + 0.01)
    // Created before the controller's own timer, it wakes first on every step: the runner reads
    // its clock there, as when a generation or fit result resolves just before the wake-up.
    const early = rig.audioRig.createExtraWakeTimer()
    early.start(() => rig.runnerInputs[0]?.now())
    rig.controller.start()
    await playTo(rig, phraseStart(3) + 0.1)
    const starts = [1, 2, 3].map((n) => rig.transport.phraseStartsAt(n))
    const timeline = transportStart.mock.results[0]!.value
    rig.controller.stop()
    early.stop()

    expect(starts[0]).toBe(timeline.countInEndsAt)
    const engineAt = rig.events.flatMap((event) =>
      event.kind === 'count-in-over' || event.kind === 'phrase-started-sounding' ? [event.at] : [],
    )
    expect(engineAt).toHaveLength(3)
    engineAt.forEach((at, index) => expect(at).toBeGreaterThan(starts[index]!))
    const recorded = rig.controller.state.lastHistory?.phrases().map((record) => record.startedAt)
    expect(recorded).toEqual(starts)
  })
})

// @test-link [[rule_struggling_generator_notice]]
describe('session controller: the struggling notice', () => {
  for (const [name, recovery] of [
    ['carry-in', alwaysSucceed],
    ['standalone', onlyStandaloneSucceeds],
  ] as const satisfies readonly (readonly [string, GenerateScript])[]) {
    // @test-link [[rule_struggling_generator_notice]]
    it(`shows at the second repeat in a row, stays, and clears when a ${name} phrase sounds`, async () => {
      const rig = controllerRig(alwaysFail)
      rig.controller.start()

      await playTo(rig, phraseStart(3) - 1.05)
      expect(rig.controller.state.strugglingNotice).toBe(false)
      await playTo(rig, phraseStart(3) - 0.95)
      expect(rig.controller.state.strugglingNotice).toBe(true)

      expect(await noticeAround(rig, 4)).toEqual([true, true])
      rig.setScript(recovery)
      expect(await noticeAround(rig, 5)).toEqual([true, true])
      expect(await noticeAround(rig, 6)).toEqual([true, false])
      expect(outputsOf(rig, 'phrase-ready').map((o) => o.phrase.origin)).toEqual([
        'repeat',
        'repeat',
        'repeat',
        'repeat',
        name,
        expect.any(String),
      ])
    })
  }

  // @test-link [[rule_struggling_generator_notice]]
  it('clears at the end of the session', async () => {
    const rig = controllerRig(alwaysFail)
    rig.controller.start()
    await playTo(rig, phraseStart(3))
    expect(rig.controller.state.strugglingNotice).toBe(true)

    rig.controller.stop()

    expect(rig.controller.state.strugglingNotice).toBe(false)
    expect(outputsOf(rig, 'struggling-notice').at(-1)).toEqual({
      kind: 'struggling-notice',
      visible: false,
    })
  })
})

// @test-link [[service_workspace_session_flow]]
describe('session controller: determinism', () => {
  // @test-link [[service_workspace_session_flow]]
  it('gives the same outputs and events twice for the same seeds and script', async () => {
    const runs: ControllerRig[] = []
    for (let run = 0; run < 2; run += 1) {
      const rig = controllerRig(alwaysSucceed)
      rig.controller.start()
      await playTo(rig, phraseStart(3) - 2)
      rig.setScript(alwaysFail)
      await playTo(rig, phraseStart(6) + 0.3)
      rig.controller.stop()
      runs.push(rig)
    }

    expect(runs[1]!.outputs).toEqual(runs[0]!.outputs)
    expect(runs[1]!.events).toEqual(runs[0]!.events)
    expect(runs[1]!.controller.state.lastHistory?.phrases()).toEqual(
      runs[0]!.controller.state.lastHistory?.phrases(),
    )
  })
})
