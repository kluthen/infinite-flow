/**
 * The scripted sessions whose fake-output calls are recorded before chunk 40 and replayed after
 * it with both guides off. `queue` is the only call that differs between the two versions.
 */
import type { FakeAudioEvent } from './fake-audio'
import { twoPhraseHarmonies } from './backing-harmony'
import { transportRig, RIG_START } from './transport-rig'
import type { AudioTransport } from '@/audio/audio-transport'
import { beatAt, createClickPlan } from '@/audio/click-track'
import type { HarmonyEvent } from '@/domain/harmony/harmony-types'

/** How a scenario queues one phrase on the transport: before chunk 40's guides, or after it. */
export type Queue = (
  transport: AudioTransport,
  phraseNumber: number,
  harmony: readonly HarmonyEvent[],
  tempo: number,
) => void

/** One scripted session's name and the fake-output events it recorded. */
export interface RecordedScenario {
  readonly name: string
  readonly events: readonly FakeAudioEvent[]
}

/**
 * Intent: run both scripted sessions, phrase 1 at the start and phrase 1 handed over at a
 * barline, each on a fresh transport rig with its phrases queued through `queue`, and return each
 * one's recorded fake-output events by name.
 */
export function recordGuideOffScenarios(queue: Queue): RecordedScenario[] {
  const [first, second] = twoPhraseHarmonies()
  const withPhraseOne = (() => {
    const { rig, transport } = transportRig()
    transport.unlock()
    const timeline = transport.start({ tempo: 120 })
    queue(transport, 1, first, 120)
    rig.advanceTo(timeline.countInEndsAt + 3)
    transport.setBackingVolume(0.5)
    transport.setClickOn(false)
    queue(transport, 2, second, 90)
    rig.advanceTo(transport.phraseStartsAt(2) + 4)
    transport.setClickOn(true)
    queue(transport, 3, first, 240)
    rig.advanceTo(transport.phraseStartsAt(3) + 1.5)
    transport.stop()
    rig.advance(1)
    return {
      name: 'phrase 1 at the start, three phrases at 120, 90 and 240 BPM, stopped',
      events: rig.events(),
    }
  })()
  const handedOver = (() => {
    const { rig, transport } = transportRig()
    transport.unlock()
    const timeline = transport.start({
      tempo: 100,
      clickForced: true,
      phraseOneStart: 'handed-over',
    })
    rig.advanceTo(RIG_START + 3)
    const barline = beatAt(createClickPlan(timeline.startAt, 100), 12)
    transport.startPhraseOneAt(barline)
    transport.forceClickUntil(barline)
    queue(transport, 1, second, 100)
    rig.advanceTo(barline + 2)
    transport.setBackingOn(false)
    queue(transport, 2, first, 100)
    rig.advanceTo(transport.phraseStartsAt(2) + 1)
    transport.setBackingOn(true)
    rig.advanceTo(transport.phraseStartsAt(2) + 9)
    transport.stop()
    rig.advance(1)
    return {
      name: 'phrase 1 handed over at a barline, two phrases at 100 BPM, stopped',
      events: rig.events(),
    }
  })()
  return [withPhraseOne, handedOver]
}
