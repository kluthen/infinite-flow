/**
 * The session controller following each phrase's own tempo. Its sessions here start at 120 BPM
 * with the adaptive-tempo flag on and a controller attached, so the phrases play at
 * 120, 120, 125, 125, 130 BPM: the count-in runs from 5.1 s to 7.1 s, phrase 1 from 7.1 s and
 * phrase 2 from 15.1 s at 2 s a measure, phrase 3 from 23.1 s at 1.92 s a measure. Each phrase from
 * 2 on is shown at `phrase-ready` and scheduled at `phrase-tempo` (its backing, its expected notes,
 * the playhead's tempo and its starting to sound), the tempo shown is the sounding phrase's, the
 * Idle tempo control is never written and the Review records the tempo reached.
 */
import { describe, expect, it } from 'vitest'

import { deriveExpectedNotes } from '@/domain/acknowledgement/expected-note'
import type { HarmonyEvent } from '@/domain/harmony/harmony-types'
import { measureSeconds } from '@/session/session-timing'
import type { SessionOutput } from '@/session/session-types'
import {
  alwaysFail,
  controllerRig,
  outputsOf,
  playTo,
  type ControllerRig,
} from './session-controller-rig'
import { connectKeys, expectedNotesOf, lift, press } from './session-controller-midi'

/** The rig's starting tempo here, and the tempos its phrases 1 to 5 play at. */
const START_TEMPO = 120
const PHRASE_TEMPOS = [120, 120, 125, 125, 130]

/** Intent: a 120 BPM controller with a controller attached and the adaptive-tempo flag on. */
async function risingRig(): Promise<ControllerRig> {
  const rig = controllerRig(undefined, undefined, { tempo: START_TEMPO })
  await connectKeys(rig)
  rig.controller.setAdaptiveTempo(true)
  return rig
}

/** One call the controller made to queue a phrase's backing, and the output it acted on. */
interface QueuedBacking {
  readonly phraseNumber: number
  readonly harmony: readonly HarmonyEvent[]
  readonly tempo: number
  readonly onOutput: SessionOutput | undefined
}

/** Intent: log every backing the controller queues, with the runner output it was acting on. */
function logQueuedBacking(rig: ControllerRig): QueuedBacking[] {
  const queued: QueuedBacking[] = []
  const queue = rig.transport.queueBacking
  Object.assign(rig.transport, {
    queueBacking: (phraseNumber: number, harmony: readonly HarmonyEvent[], tempo: number) => {
      queued.push({ phraseNumber, harmony, tempo, onOutput: rig.outputs.at(-1) })
      queue(phraseNumber, harmony, tempo)
    },
  })
  return queued
}

/** Intent: the deadline of phrase N + 1: the start of phrase N's last measure, at N's tempo. */
function deadlineAfter(rig: ControllerRig, phraseNumber: number): number {
  const tempo = PHRASE_TEMPOS[phraseNumber - 1]!
  return rig.transport.phraseStartsAt(phraseNumber) + 3 * measureSeconds(tempo)
}

// @test-link [[module_session_phrase_steps]]
describe('session controller: each phrase at its own tempo', () => {
  // @test-link [[module_session_phrase_steps]]
  // @test-link [[req_session_backing_track]]
  it('queues a phrase at its phrase-tempo output, at that tempo, never at phrase-ready', async () => {
    const rig = await risingRig()
    const queued = logQueuedBacking(rig)
    rig.controller.start()

    await playTo(rig, 20)
    expect(outputsOf(rig, 'phrase-ready').map((output) => output.phrase.phraseNumber)).toEqual([
      2, 3,
    ])
    await playTo(rig, deadlineAfter(rig, 2) - 0.05)
    expect(queued.map((call) => call.phraseNumber)).toEqual([1, 2])

    await playTo(rig, 40)
    const ready = outputsOf(rig, 'phrase-ready').map((output) => output.phrase)
    expect(queued.map((call) => [call.phraseNumber, call.tempo])).toEqual(
      PHRASE_TEMPOS.map((tempo, index) => [index + 1, tempo]),
    )
    expect(queued[0]!.harmony).toBe(rig.phraseOne.outcome.provenance.harmony.events)
    queued.slice(1).forEach((call) => {
      expect(call.onOutput).toEqual({
        kind: 'phrase-tempo',
        phraseNumber: call.phraseNumber,
        tempo: call.tempo,
      })
      expect(call.harmony).toBe(ready[call.phraseNumber - 2]!.outcome.provenance.harmony.events)
    })
  })

  // @test-link [[module_session_phrase_steps]]
  it("sends each phrase as started sounding at the transport's start for it, at the tempos before it", async () => {
    const rig = await risingRig()
    rig.controller.start()

    await playTo(rig, 40)

    const sounding = rig.events.filter((event) => event.kind === 'phrase-started-sounding')
    expect(sounding.map((event) => event.phraseNumber)).toEqual([2, 3, 4, 5])
    sounding.forEach((event) =>
      expect(event.at).toBe(rig.transport.phraseStartsAt(event.phraseNumber)),
    )
    const starts = [1, 2, 3, 4, 5].map((n) => rig.transport.phraseStartsAt(n))
    expect(starts[0]).toBeCloseTo(7.1, 9)
    starts.slice(1).forEach((start, index) => {
      const length = 4 * measureSeconds(PHRASE_TEMPOS[index]!)
      expect(start - starts[index]!).toBeCloseTo(length, 9)
    })
  })

  // @test-link [[module_session_phrase_steps]]
  // @test-link [[rule_acknowledgement_highlights_expected_note_only]]
  it("acknowledges phrase 3's notes where they fall at its own tempo, 125 BPM", async () => {
    const rig = await risingRig()
    rig.controller.start()
    await playTo(rig, deadlineAfter(rig, 2) + 0.05)

    const timeline = outputsOf(rig, 'phrase-ready')[1]!.phrase.outcome.result.timeline
    const atOwnTempo = expectedNotesOf(rig, 3, timeline, 125)
    const atStartTempo = deriveExpectedNotes(timeline, {
      phraseNumber: 3,
      startSeconds: rig.transport.phraseStartsAt(3),
      tempoBpm: START_TEMPO,
    })
    // A note whose onset at 125 BPM is more than 0.2 s before its onset at 120 BPM.
    const note = atOwnTempo.find(
      (expected, index) => atStartTempo[index]!.onsetSeconds - expected.onsetSeconds > 0.2,
    )
    if (note === undefined) throw new Error('phrase 3 has no note late enough in it')

    await playTo(rig, note.onsetSeconds)
    press(rig, note.pitch)
    await playTo(rig, note.onsetSeconds + 0.05)
    lift(rig, note.pitch)

    expect(rig.controller.state.acknowledged).toContainEqual(note.identity)
  })

  // @test-link [[module_session_phrase_steps]]
  it('throws on a phrase tempo before its phrase is ready, or out of order, queuing nothing', async () => {
    // Every generation fails, so phrase 2 is only decided, as a repeat, at the count-in's end.
    const rig = controllerRig(alwaysFail)
    const queued = logQueuedBacking(rig)
    rig.controller.start()
    await playTo(rig, 5.5)
    expect(outputsOf(rig, 'phrase-ready')).toEqual([])

    expect(() => rig.injectOutput({ kind: 'phrase-tempo', phraseNumber: 2, tempo: 240 })).toThrow(
      /phrase 2's tempo came before it was ready/,
    )
    expect(() => rig.injectOutput({ kind: 'phrase-tempo', phraseNumber: 3, tempo: 240 })).toThrow(
      /phrase 2's tempo must come next/,
    )
    expect(queued.map((call) => call.phraseNumber)).toEqual([1])
  })

  // @test-link [[module_session_rolling_display]]
  // @test-link [[rule_playhead_follows_audio_clock]]
  it("moves the playhead at each phrase's own barlines", async () => {
    const rig = await risingRig()
    rig.controller.start()
    // Once phrase 3 is queued at 125 BPM, phrase 4's start is known too.
    await playTo(rig, deadlineAfter(rig, 2) + 0.05)
    const three = rig.transport.phraseStartsAt(3)
    const four = rig.transport.phraseStartsAt(4)

    await playTo(rig, three + measureSeconds(125) - 0.01)
    expect(rig.controller.state.sessionStaff?.playhead).toEqual({
      phraseNumber: 3,
      measureIndex: 0,
    })
    await playTo(rig, three + measureSeconds(125))
    expect(rig.controller.state.sessionStaff?.playhead).toEqual({
      phraseNumber: 3,
      measureIndex: 1,
    })
    await playTo(rig, four - 0.01)
    expect(rig.controller.state.sessionStaff?.playhead).toEqual({
      phraseNumber: 3,
      measureIndex: 3,
    })
    await playTo(rig, four)
    expect(rig.controller.state.sessionStaff?.playhead).toEqual({
      phraseNumber: 4,
      measureIndex: 0,
    })
  })
})

// @test-link [[module_session_adaptive_tempo_control]]
// @test-link [[rule_adaptive_tempo_resets_after_session]]
describe('session controller: the tempo shown and the Idle tempo control', () => {
  // @test-link [[rule_adaptive_tempo_resets_after_session]]
  it("shows the starting tempo in the count-in, then each sounding phrase's, and none after the end", async () => {
    const rig = await risingRig()
    expect(rig.controller.state.sessionTempo).toBeNull()
    rig.controller.start()
    expect(rig.controller.state.sessionTempo).toBe(120)

    await playTo(rig, deadlineAfter(rig, 2) + 0.05)
    const three = rig.transport.phraseStartsAt(3)
    await playTo(rig, three - 0.05)
    expect(rig.controller.state.sessionTempo).toBe(120)
    await playTo(rig, three + 0.05)
    expect(rig.controller.state.sessionTempo).toBe(125)
    await playTo(rig, deadlineAfter(rig, 4) + 0.05)
    await playTo(rig, rig.transport.phraseStartsAt(5) + 0.05)
    expect(rig.controller.state.sessionTempo).toBe(130)

    rig.controller.stop()
    expect(rig.controller.state.sessionTempo).toBeNull()
  })

  // @test-link [[rule_adaptive_tempo_resets_after_session]]
  it('never writes the Idle tempo control, and the Review records the tempo reached', async () => {
    const rig = await risingRig()
    const idleControls = rig.idle.controls
    rig.controller.start()
    await playTo(rig, deadlineAfter(rig, 2) + 0.05)
    await playTo(rig, deadlineAfter(rig, 4) + 0.05)
    await playTo(rig, rig.transport.phraseStartsAt(5) + 0.05)
    expect(rig.controller.state.sessionTempo).toBe(130)
    expect(rig.idle.controls).toBe(idleControls)
    expect(rig.idle.controls.tempo).toBe(START_TEMPO)

    rig.controller.stop()

    expect(rig.idle.controls).toBe(idleControls)
    expect(rig.idle.controls.tempo).toBe(START_TEMPO)
    expect(rig.runnerInputs[0]!.start.settings.controls.tempo).toBe(START_TEMPO)
    expect(rig.controller.state.lastHistory?.phrases().map((record) => record.tempo)).toEqual(
      PHRASE_TEMPOS,
    )
    expect(rig.controller.state.review?.tempoReached).toBe(130)
  })
})
