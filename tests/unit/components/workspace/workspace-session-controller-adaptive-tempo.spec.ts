/**
 * The page's adaptive-tempo flag and the controller's presence, through the session controller.
 * The flag is off at page load, kept from one session to the next, changed only at Idle, and turned
 * on only with a controller attached. A session started with the flag on and a controller attached
 * runs adaptive tempo: from 120 BPM its phrases play at 120, 120, 125, 125, 130 BPM (the count-in
 * runs from 5.1 s to 7.1 s, phrase 1 from 7.1 s, phrase 2 from 15.1 s, phrase 3's tempo is fixed at
 * 21.1 s, the start of phrase 2's last measure). A session started without the flag, or without a
 * controller (the selected one away, or none selected), keeps the starting tempo, and its
 * controller's comings and goings never reach the engine. The tempo the last session that ran
 * adaptive tempo reached is kept for the screen's note: set or cleared by an end once phrase 1 has
 * sounded, left by a start and by an end during the count-in, and the same whatever the player
 * plays.
 */
import { describe, expect, it } from 'vitest'

import { SessionControllerError } from '@/components/workspace/workspace-session-controller-types'
import { controllerRig, playTo, type ControllerRig } from './session-controller-rig'
import { connectKeys, KEYS, lift, press, replugKeys, unplugKeys } from './session-controller-midi'

/** The starting tempo of every session here. */
const START_TEMPO = 120

/** Where phrase 3's tempo is fixed in a session at 120 BPM: phrase 2's last measure, 21.1 s. */
const PHRASE_THREE_FIXED_AT = 21.1

/** Intent: a controller at Idle whose sessions start at 120 BPM. */
function rig120(): ControllerRig {
  return controllerRig(undefined, undefined, { tempo: START_TEMPO })
}

/** Intent: a 120 BPM controller at Idle with KEYS attached and the flag on. */
async function flagOnWithKeys(): Promise<ControllerRig> {
  const rig = rig120()
  await connectKeys(rig)
  rig.controller.setAdaptiveTempo(true)
  return rig
}

/** Intent: run a started session until phrase 5 sounds, stop it and give its phrases' tempos. */
async function tempos(rig: ControllerRig): Promise<number[]> {
  await playTo(rig, 40)
  rig.controller.stop()
  return rig.controller.state.lastHistory?.phrases().map((record) => record.tempo) ?? []
}

/** Intent: the controller events the controller sent the engine, in order. */
function controllerEvents(rig: ControllerRig): boolean[] {
  return rig.events.flatMap((event) => (event.kind === 'controller' ? [event.attached] : []))
}

// @test-link [[req_adaptive_tempo]]
// @test-link [[rule_ephemeral_session_state]]
describe('session controller: the adaptive-tempo flag', () => {
  // @test-link [[req_adaptive_tempo]]
  it('is off at page load', () => {
    expect(rig120().controller.state.adaptiveTempo).toBe(false)
  })

  // @test-link [[req_adaptive_tempo]]
  // @test-link [[rule_ephemeral_session_state]]
  it('turned on with a controller attached, stays on through Stop and the next Start', async () => {
    const rig = await flagOnWithKeys()
    expect(rig.controller.state.adaptiveTempo).toBe(true)

    rig.controller.start()
    await playTo(rig, 6)
    rig.controller.stop()
    expect(rig.controller.state.adaptiveTempo).toBe(true)
    rig.controller.start()

    expect(rig.controller.state.adaptiveTempo).toBe(true)
    expect(rig.runnerInputs.map((input) => input.start.adaptiveTempo)).toEqual([true, true])
  })

  // @test-link [[req_adaptive_tempo]]
  it('throws when turned on with no controller attached, and stays off', async () => {
    const rig = rig120()
    expect(() => rig.controller.setAdaptiveTempo(true)).toThrow(SessionControllerError)
    await connectKeys(rig)
    unplugKeys(rig)
    expect(() => rig.controller.setAdaptiveTempo(true)).toThrow(SessionControllerError)
    expect(rig.controller.state.adaptiveTempo).toBe(false)
  })

  // @test-link [[req_adaptive_tempo]]
  it('throws when changed during the count-in or while running, and keeps its value', async () => {
    const rig = await flagOnWithKeys()
    rig.controller.start()
    expect(rig.controller.state.phase).toBe('count-in')
    expect(() => rig.controller.setAdaptiveTempo(false)).toThrow(SessionControllerError)
    expect(() => rig.controller.setAdaptiveTempo(true)).toThrow(SessionControllerError)

    await playTo(rig, 8)
    expect(rig.controller.state.phase).toBe('running')
    expect(() => rig.controller.setAdaptiveTempo(false)).toThrow(SessionControllerError)
    expect(rig.controller.state.adaptiveTempo).toBe(true)
  })

  // @test-link [[req_adaptive_tempo]]
  it('stays on when the controller goes away at Idle, and may be turned off then', async () => {
    const rig = await flagOnWithKeys()
    unplugKeys(rig)
    expect(rig.controller.state.adaptiveTempo).toBe(true)
    expect(rig.controller.state.adaptiveTempoAvailable).toBe(false)

    rig.controller.setAdaptiveTempo(false)

    expect(rig.controller.state.adaptiveTempo).toBe(false)
  })
})

// @test-link [[req_adaptive_tempo]]
// @test-link [[rule_controller_attached_definition]]
describe('session controller: adaptive tempo available', () => {
  // @test-link [[rule_controller_attached_definition]]
  it('follows the controller: attached, away, back, and none selected', async () => {
    const rig = rig120()
    expect(rig.controller.state.adaptiveTempoAvailable).toBe(false)
    await connectKeys(rig)
    expect(rig.controller.state.adaptiveTempoAvailable).toBe(true)
    unplugKeys(rig)
    expect(rig.midi.state()).toEqual({ kind: 'away', device: KEYS })
    expect(rig.controller.state.adaptiveTempoAvailable).toBe(false)
    replugKeys(rig)
    await playTo(rig, rig.audioRig.now() + 0.25)
    expect(rig.midi.state()).toEqual({ kind: 'connected', device: KEYS })
    expect(rig.controller.state.adaptiveTempoAvailable).toBe(true)
    rig.midi.disconnect()
    expect(rig.controller.state.adaptiveTempoAvailable).toBe(false)
  })
})

// @test-link [[req_adaptive_tempo]]
// @test-link [[rule_adaptive_tempo_flat_schedule]]
// @test-link [[rule_controller_attached_definition]]
describe('session controller: a session runs adaptive tempo with the flag on and a controller', () => {
  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  // @test-link [[req_adaptive_tempo]]
  it('rises with the flag on and the controller attached at the start', async () => {
    const rig = await flagOnWithKeys()
    rig.controller.start()

    expect(await tempos(rig)).toEqual([120, 120, 125, 125, 130])
  })

  // @test-link [[req_adaptive_tempo]]
  it('keeps the starting tempo with the flag off, the controller attached', async () => {
    const rig = rig120()
    await connectKeys(rig)
    rig.controller.start()

    expect(rig.runnerInputs[0]!.start.adaptiveTempo).toBe(false)
    expect(await tempos(rig)).toEqual([120, 120, 120, 120, 120])
  })

  // @test-link [[rule_controller_attached_definition]]
  // @test-link [[req_adaptive_tempo]]
  it('keeps the starting tempo with the selected controller away at the start, its return unheard', async () => {
    const rig = await flagOnWithKeys()
    unplugKeys(rig)
    rig.controller.start()
    expect(rig.controller.state.sessionHasController).toBe(false)
    await playTo(rig, 10)
    replugKeys(rig)

    expect(rig.runnerInputs[0]!.start.adaptiveTempo).toBe(false)
    expect(await tempos(rig)).toEqual([120, 120, 120, 120, 120])
    expect(controllerEvents(rig)).toEqual([])
  })

  // @test-link [[rule_controller_attached_definition]]
  // @test-link [[req_adaptive_tempo]]
  it('keeps the starting tempo with no controller selected at the start', async () => {
    const rig = await flagOnWithKeys()
    rig.midi.disconnect()
    rig.controller.start()

    expect(rig.controller.state.sessionHasController).toBe(false)
    expect(rig.runnerInputs[0]!.start.adaptiveTempo).toBe(false)
    expect(await tempos(rig)).toEqual([120, 120, 120, 120, 120])
  })
})

// @test-link [[rule_adaptive_tempo_flat_schedule]]
// @test-link [[rule_controller_loss_mid_session]]
describe('session controller: the controller lost across a due rise', () => {
  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  // @test-link [[rule_controller_loss_mid_session]]
  it('holds phrase 3 at the starting tempo, and phrase 4 rises once it is back', async () => {
    const rig = await flagOnWithKeys()
    rig.controller.start()
    await playTo(rig, PHRASE_THREE_FIXED_AT - 1)
    unplugKeys(rig)
    const lostAt = rig.audioRig.now()
    const phraseThree = rig.transport.phraseStartsAt(2) + 8
    await playTo(rig, phraseThree + 1)
    replugKeys(rig)
    await playTo(rig, rig.audioRig.now() + 0.25)
    expect(rig.controller.state.controllerLost).toBeNull()

    // Phrase 3, fixed and started while away, neither rises nor counts: phrase 4 is the rise.
    expect(await tempos(rig)).toEqual([120, 120, 120, 125, 125])
    expect(controllerEvents(rig)).toEqual([false, true])
    const lost = rig.events.find((event) => event.kind === 'controller')
    expect(lost?.at).toBe(lostAt)
  })
})

/** Intent: run the started session `seconds` more of audio, then stop it. */
async function runAndStop(rig: ControllerRig, seconds: number): Promise<void> {
  await playTo(rig, rig.audioRig.now() + seconds)
  rig.controller.stop()
}

// @test-link [[rule_adaptive_tempo_resets_after_session]]
// @test-link [[rule_no_grading_or_mismatch_signal]]
describe("session controller: the last session's reached tempo", () => {
  // @test-link [[rule_adaptive_tempo_resets_after_session]]
  it('is none at page load, then the tempo a session that ran adaptive tempo reached', async () => {
    const rig = await flagOnWithKeys()
    expect(rig.controller.state.lastSessionReachedTempo).toBeNull()
    rig.controller.start()

    await runAndStop(rig, 40)

    expect(rig.controller.state.lastSessionReachedTempo).toBe(130)
    expect(rig.controller.state.review?.tempoReached).toBe(130)
  })

  // @test-link [[rule_adaptive_tempo_resets_after_session]]
  it('is left as it is by a session start and by an end during the count-in', async () => {
    const rig = await flagOnWithKeys()
    rig.controller.start()
    await runAndStop(rig, 40)
    rig.controller.closeReview()

    rig.controller.start()
    expect(rig.controller.state.phase).toBe('count-in')
    expect(rig.controller.state.lastSessionReachedTempo).toBe(130)
    rig.controller.stop()

    expect(rig.controller.state.lastEnd?.phase).toBe('count-in')
    expect(rig.controller.state.lastSessionReachedTempo).toBe(130)
  })

  // @test-link [[rule_adaptive_tempo_resets_after_session]]
  it('is replaced by the next such end, and cleared by an end of a session that did not run it', async () => {
    const rig = await flagOnWithKeys()
    rig.controller.start()
    await runAndStop(rig, 40)
    rig.controller.closeReview()
    rig.controller.start()
    await runAndStop(rig, 12)
    expect(rig.controller.state.lastSessionReachedTempo).toBe(120)
    rig.controller.closeReview()

    // On, but the controller away at the start: that session does not run adaptive tempo.
    rig.controller.start()
    await runAndStop(rig, 40)
    rig.controller.closeReview()
    expect(rig.controller.state.lastSessionReachedTempo).toBe(130)
    unplugKeys(rig)
    rig.controller.start()
    await runAndStop(rig, 12)

    expect(rig.controller.state.lastSessionReachedTempo).toBeNull()
    expect(rig.controller.state.adaptiveTempo).toBe(true)
  })

  // @test-link [[rule_no_grading_or_mismatch_signal]]
  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('is the same whether or not the player plays', async () => {
    const silent = await flagOnWithKeys()
    silent.controller.start()
    await runAndStop(silent, 40)

    const playing = await flagOnWithKeys()
    playing.controller.start()
    for (let at = 8; at < 40; at += 2) {
      await playTo(playing, at)
      press(playing, 61)
      await playTo(playing, at + 0.5)
      lift(playing, 61)
    }
    await runAndStop(playing, 0)

    expect(
      playing.controller.state.lastHistory?.phrases().some((p) => p.playedNotes.length > 0),
    ).toBe(true)
    expect(playing.controller.state.lastSessionReachedTempo).toBe(
      silent.controller.state.lastSessionReachedTempo,
    )
    expect(playing.controller.state.lastHistory?.phrases().map((p) => p.tempo)).toEqual(
      silent.controller.state.lastHistory?.phrases().map((p) => p.tempo),
    )
  })
})
