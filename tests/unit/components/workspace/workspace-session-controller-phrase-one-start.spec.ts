/**
 * Phrase 1's start in a session started without phrase 1, through the controller's handle: the
 * transport starts with phrase 1's start handed over, so it tells no phrase start before the
 * hand-over, and the handle's `phrase-one` sets phrase 1's start on the transport at its
 * `soundsAt` before the runner hears the event. Only the handle's call to the transport is checked
 * here: what the controller does once the engine has phrase 1 is not built yet. On the fake audio
 * clock at 240 BPM from 5 s.
 */
import { describe, expect, it, vi } from 'vitest'

import type { AudioTime } from '@/audio/audio-ports'
import { beatAt, createClickPlan } from '@/audio/click-track'
import type { SessionRunnerEvent } from '@/session/session-runner'
import { startFresh, type FreshStart } from './session-controller-fresh-start'
import { connectKeys } from './session-controller-midi'
import { controllerRig, playTo, type ControllerRig } from './session-controller-rig'

/** What the transport told as phrase 1's start when the runner heard a `phrase-one` event. */
type HeardStart = AudioTime | string

/** Thrown where the rig's runner is sent a `phrase-one` event, so the engine never gets it. */
class PhraseOneHeard extends Error {}

/** Intent: a rig with the controller connected and a session started without phrase 1. */
async function connectedFreshStart(): Promise<{ rig: ControllerRig; fresh: FreshStart }> {
  const rig = controllerRig()
  await connectKeys(rig)
  return { rig, fresh: startFresh(rig) }
}

/** Intent: the barline `measure` measures after the count-in's end, as Jam's capture has it. */
function barline(rig: ControllerRig, fresh: FreshStart, measure: number): AudioTime {
  const plan = createClickPlan(fresh.session.timeline.startAt, rig.settings.controls.tempo)
  return beatAt(plan, plan.countInBeats + measure * plan.beatsPerMeasure)
}

/**
 * Intent: record, when the rig's runner is sent a `phrase-one` event (the rig logs every event
 * just before its runner gets it), what the transport then tells as phrase 1's start, or why it
 * can't; then stop the event there with `PhraseOneHeard`, as the engine's handling of phrase 1
 * is not what these specs check (no attempt of it was issued, and the controller's steps after
 * phrase 1 are not built yet).
 */
function heardPhraseOneStarts(rig: ControllerRig): HeardStart[] {
  const heard: HeardStart[] = []
  const events = rig.events
  vi.spyOn(events, 'push').mockImplementation((...items: SessionRunnerEvent[]) => {
    for (const item of items) {
      if (item.kind !== 'phrase-one') continue
      try {
        heard.push(rig.transport.phraseStartsAt(1))
      } catch (error: unknown) {
        heard.push(String(error))
      }
      throw new PhraseOneHeard('phrase-one reached the runner')
    }
    return Array.prototype.push.apply(events, items)
  })
  return heard
}

// @test-link [[module_session_start_without_phrase_one]]
// @test-link [[module_session_transport_tempo_map]]
describe("session controller: phrase 1's start in a start without phrase 1", () => {
  // @test-link [[module_session_transport_tempo_map]]
  it('starts the transport with no phrase start known until the hand-over', async () => {
    const { rig } = await connectedFreshStart()
    await playTo(rig, 9)
    expect(() => rig.transport.phraseStartsAt(1)).toThrow(/handed over/)
  })

  // @test-link [[module_session_start_without_phrase_one]]
  // @test-link [[module_session_transport_tempo_map]]
  it("sets phrase 1's start on the transport at soundsAt before the runner hears it", async () => {
    const { rig, fresh } = await connectedFreshStart()
    await playTo(rig, 7)
    const soundsAt = barline(rig, fresh, 4)
    const heard = heardPhraseOneStarts(rig)
    expect(() => fresh.session.dispatch({ kind: 'phrase-one', attemptId: 1, soundsAt })).toThrow(
      PhraseOneHeard,
    )
    expect(heard).toEqual([soundsAt])
    expect(rig.transport.phraseStartsAt(1)).toBe(soundsAt)
  })

  // @test-link [[module_session_transport_tempo_map]]
  it('never hands the runner a phrase 1 the transport refused', async () => {
    const { rig, fresh } = await connectedFreshStart()
    await playTo(rig, 7)
    const heard = heardPhraseOneStarts(rig)
    const offBarline = barline(rig, fresh, 4) + 0.25
    expect(() =>
      fresh.session.dispatch({ kind: 'phrase-one', attemptId: 1, soundsAt: offBarline }),
    ).toThrow(/barline/)
    expect(heard).toEqual([])
    expect(() => rig.transport.phraseStartsAt(1)).toThrow(/handed over/)
  })
})
