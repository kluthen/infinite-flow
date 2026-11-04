// @vitest-environment node
/**
 * A Jam on the kept doodle through the workspace's session controller, on the controller rig (fake
 * audio clock, fake MIDI, real generation for phrase 1 at Idle; 240 BPM, a 1 s measure, a 4 s
 * phrase): it starts as a session from Ready, by `Start Jam` or by phrase 1's first note (the
 * count-in, then phrase 1, no capture, no 30-second wait, the silence timer as in session mode);
 * phrase 1 and its session seed are Jam's Idle phrase 1's, Jam's prepared phrases are the ones it
 * plays and every phrase carries the kept doodle's steering block, with none of session mode's
 * options; a Sixteenth doodle whose variety the step raised, its phrase 1 written narrow, plays
 * every phrase wide. Ended before phrase 1, it is a count-in end; ended after, its review shows the
 * kept doodle with an empty lane, the very Jam part its end hands on, and session mode's Idle is
 * asked for nothing.
 */
import { describe, expect, it } from 'vitest'

import { SessionControllerError } from '@/components/workspace/workspace-session-controller-types'
import { createJamIdleNotes } from '@/jam/jam-idle-notes'
import { measureSeconds } from '@/session/session-timing'
import { DEFAULT_SESSION_OPTIONS } from '@/storage/records/setting-defaults'
import { realOutcomeFor } from '../session/session-harness'
import { flush, outputsOf, playTo } from '../components/workspace/session-controller-rig'
import { lift, press, unplugKeys } from '../components/workspace/session-controller-midi'
import { loadDoodleSet } from './doodle-set'
import { keptDoodleJamRig, type KeptDoodleJamRig } from './kept-doodle-jam-rig'

/** Intent: the time phrase `n` starts sounding, from the count-in's end of the Jam started. */
function phraseStart(run: KeptDoodleJamRig, n: number): number {
  return countInEnd(run) + (n - 1) * 4
}

/** Intent: the count-in's end of the Jam started on the rig: its runner's start plus a measure. */
function countInEnd(run: KeptDoodleJamRig): number {
  const input = run.rig.runnerInputs[0]
  if (input === undefined) throw new Error('no Jam on the kept doodle was started')
  return input.start.at + 1
}

/** Intent: every phrase intent the Jam asked for or was handed, phrase 2 on. */
function laterIntents(run: KeptDoodleJamRig) {
  return [
    ...outputsOf(run.rig, 'request-generation').map((request) => request.intent),
    ...(run.rig.runnerInputs[0]?.start.readyPhrases ?? []).map((ready) => ready.intent),
  ]
}

// @test-link [[rule_jam_on_held_doodle_skips_capture]]
// @test-link [[module_kept_doodle]]
describe('a Jam on the kept doodle: its start', () => {
  // @test-link [[rule_jam_on_held_doodle_skips_capture]]
  // @test-link [[module_session_seed_plan]]
  it("starts as from Ready: the count-in, then Jam's Idle phrase 1 and its session seed, no capture", async () => {
    const run = await keptDoodleJamRig()
    run.rig.controller.startOnKeptDoodle(run.request)

    expect(run.rig.controller.state.phase).toBe('count-in')
    expect(run.rig.runnerInputsWithoutPhraseOne).toEqual([])
    const { start } = run.rig.runnerInputs[0]!
    expect(start.phraseOne).toEqual({
      intent: run.phraseOne.intent,
      outcome: run.phraseOne.outcome,
    })
    expect(start.sessionSeed).toBe(run.phraseOne.sessionSeed)
    expect(start.settings).toEqual(run.phraseOne.settings)
    expect(start.phraseOneSettings).toEqual(run.phraseOne.settings)
    expect(run.rig.controller.state.lastHistory).toBeNull()
    expect(run.rig.sessionSeedsDrawn).toEqual([])

    await playTo(run.rig, countInEnd(run) + 0.1)
    expect(run.rig.controller.state.phase).toBe('running')
    expect(run.rig.controller.state.sessionStaff).not.toBeNull()
    run.rig.controller.dispose()
  })

  // @test-link [[rule_jam_on_held_doodle_skips_capture]]
  // @test-link [[rule_jam_silence_timer_from_phrase_one]]
  it('has no 30-second wait: with no note played, it runs on as a session started by a click', async () => {
    const run = await keptDoodleJamRig()
    run.rig.controller.startOnKeptDoodle(run.request)

    await playTo(run.rig, countInEnd(run) + 31)

    expect(run.rig.controller.state.phase).toBe('running')
    expect(run.rig.controller.state.lastEnd).toBeNull()
    run.rig.controller.dispose()
  })

  // @test-link [[module_jam_idle_notes]]
  // @test-link [[rule_jam_silence_timer_from_phrase_one]]
  it("starts on phrase 1's first note, which arms the silence timer as session mode's starting note does", async () => {
    const run = await keptDoodleJamRig()
    run.rig.browser.pageActivation.activate()
    const notes = createJamIdleNotes({
      writtenKey: () => 'C',
      collection: () => 'Major',
      instrument: () => ({ instrumentProfileId: 'c-keyboard', myInstrument: null }),
      canStart: () => run.rig.controller.state.phase === 'idle',
      pageAwaitsClick: () => false,
      doodleKept: () => true,
      keptPhraseOne: () => ({
        timeline: run.phraseOne.outcome.result.timeline,
        written: run.request.written,
      }),
    })
    run.rig.heldModeNotes.value = {
      meaningOf: notes.meaningOf,
      start: () => run.rig.controller.startOnKeptDoodle(run.request),
    }
    const first = notes.startingNote()!.concertPitch

    press(run.rig, first + 1)
    expect(run.rig.controller.state.phase).toBe('idle')
    const pressedAt = press(run.rig, first)
    lift(run.rig, first)
    expect(run.rig.controller.state.phase).toBe('count-in')

    await playTo(run.rig, pressedAt + 30.5)
    expect(run.rig.controller.state.lastEnd?.cause).toBe('silence-timeout')
  })

  // @test-link [[rule_pregenerated_phrase_matches_session]]
  // @test-link [[rule_every_jam_phrase_carries_doodle]]
  it("plays Jam's prepared phrases, every phrase carrying the steering block, none of session mode's options", async () => {
    const run = await keptDoodleJamRig({
      prepared: true,
      controller: {
        savedSessionOptions: {
          ...DEFAULT_SESSION_OPTIONS,
          risingTempo: true,
          varySettings: true,
          tensionAcrossPhrases: true,
        },
      },
    })
    run.rig.controller.startOnKeptDoodle(run.request)
    await playTo(run.rig, phraseStart(run, 7) + 0.05)

    const { start } = run.rig.runnerInputs[0]!
    expect(run.takes()).toBe(1)
    expect(start).toMatchObject({
      adaptiveTempo: false,
      varySettings: false,
      multiPhraseTensionArc: false,
      steering: run.phraseOne.steering,
    })
    const ready = outputsOf(run.rig, 'phrase-ready').map((output) => output.phrase)
    expect(ready.slice(0, 4).map((phrase) => phrase.intent)).toEqual(
      run.prepared.map((phrase) => phrase.intent),
    )
    const requested = outputsOf(run.rig, 'request-generation')
    expect(requested.length).toBeGreaterThan(0)
    expect(requested.every((request) => request.phraseNumber >= 6)).toBe(true)
    for (const intent of laterIntents(run)) expect(intent.steering).toEqual(run.phraseOne.steering)
    expect(outputsOf(run.rig, 'settings-changed')).toEqual([])
    run.rig.controller.dispose()
  })

  // @test-link [[rule_every_jam_phrase_carries_doodle]]
  it('generates every phrase from a Sixteenth doodle whose variety the step raised, written narrow and started wide', async () => {
    const doodle = loadDoodleSet().find((each) => each.name === 'sixteenth-bursts')!.quantized
    const run = await keptDoodleJamRig({
      script: realOutcomeFor,
      doodle,
      phrase: { belowTabletLandscape: true },
    })
    expect(run.phraseOne.intent.controls.noteDensity).toBe('Eighth')
    expect(run.phraseOne.settings.controls).toMatchObject({
      noteDensity: 'Sixteenth',
      rhythmicVariety: 'Heavily varied',
    })
    run.rig.controller.startOnKeptDoodle(run.request)
    await playTo(run.rig, phraseStart(run, 5) + 0.05)

    const phrases = outputsOf(run.rig, 'phrase-ready').map((output) => output.phrase)
    expect(phrases.map((phrase) => phrase.phraseNumber)).toEqual([2, 3, 4, 5, 6])
    expect(phrases.map((phrase) => phrase.origin)).not.toContain('repeat')
    for (const phrase of phrases) {
      expect(phrase.intent.controls).toMatchObject({
        noteDensity: 'Sixteenth',
        rhythmicVariety: 'Heavily varied',
      })
      expect(phrase.intent.steering).toEqual(run.phraseOne.steering)
    }
    run.rig.controller.dispose()
  })

  // @test-link [[rule_jam_on_held_doodle_skips_capture]]
  it('is refused, touching nothing, while a session runs or with no controller connected', async () => {
    const run = await keptDoodleJamRig()
    run.rig.controller.startOnKeptDoodle(run.request)
    expect(() => run.rig.controller.startOnKeptDoodle(run.request)).toThrow(SessionControllerError)
    run.rig.controller.stop()
    const holds = run.rig.saveHolds.length

    unplugKeys(run.rig)
    await flush()
    expect(() => run.rig.controller.startOnKeptDoodle(run.request)).toThrow(SessionControllerError)
    expect(run.rig.saveHolds).toHaveLength(holds)
    expect(run.rig.controller.state.phase).toBe('idle')
  })
})

// @test-link [[rule_jam_on_held_doodle_skips_capture]]
// @test-link [[module_kept_doodle]]
describe('a Jam on the kept doodle: its end', () => {
  // @test-link [[rule_jam_on_held_doodle_skips_capture]]
  // @test-link [[rule_session_end_generates_next_phrase_one]]
  it('ends before phrase 1 as a count-in end: no review, no Jam part, nothing saved or asked for', async () => {
    const run = await keptDoodleJamRig()
    run.rig.controller.startOnKeptDoodle(run.request)
    await playTo(run.rig, countInEnd(run) - 0.3)
    run.rig.controller.stop()

    const { state } = run.rig.controller
    expect(state.lastEnd).toEqual({ cause: 'stop', phase: 'count-in', soundedPhraseCount: 0 })
    expect(state.review).toBeNull()
    expect(state.mostRecent).toBeNull()
    expect(run.rig.sessionSaves).toEqual([])
    expect(run.rig.freshPhraseRequests).toEqual([])
  })

  // @test-link [[rule_jam_on_held_doodle_skips_capture]]
  // @test-link [[rule_session_end_generates_next_phrase_one]]
  // @test-link [[module_jam_session_end]]
  it('opens the review with the kept doodle and an empty lane, the part its end hands on, asking session mode for nothing', async () => {
    const run = await keptDoodleJamRig({
      controller: { savedSessionOptions: { ...DEFAULT_SESSION_OPTIONS, risingTempo: true } },
    })
    run.rig.controller.startOnKeptDoodle(run.request)
    const phraseOneAt = countInEnd(run)
    await playTo(run.rig, phraseOneAt + 0.5)
    press(run.rig, 60)
    await playTo(run.rig, phraseOneAt + 0.7)
    lift(run.rig, 60)
    await playTo(run.rig, phraseOneAt + 5)
    run.rig.controller.stop()

    const { state } = run.rig.controller
    const jam = state.review?.jam
    expect(state.review?.showing).toBe(true)
    expect(jam).toEqual({
      doodle: {
        doodle: run.kept.doodle,
        captureTempo: run.kept.captureTempo,
        firstBarlineAt:
          phraseOneAt - run.kept.doodle.measureCount * measureSeconds(run.kept.captureTempo),
        endBarlineAt: phraseOneAt,
        playedNotes: [],
      },
      countInStartAt: null,
      suggestion: run.kept.suggestion,
      suggestionDeclined: false,
      doodleControls: run.kept.readings,
    })
    expect(state.lastEnd?.jam?.part).toBe(jam)
    expect(state.lastHistory?.doodle()).toBeNull()
    expect(state.lastHistory?.phrases()[0]?.playedNotes.map((note) => note.pitch)).toEqual([60])
    expect(run.rig.freshPhraseRequests).toEqual([])
    expect(state.lastSessionReachedTempo).toBeNull()
  })

  // @test-link [[rule_suggestion_keep_mine]]
  it('keeps a declined suggestion declined in its review', async () => {
    const run = await keptDoodleJamRig({ suggestionDeclined: true })
    run.rig.controller.startOnKeptDoodle(run.request)
    await playTo(run.rig, countInEnd(run) + 1)
    run.rig.controller.stop()

    expect(run.rig.controller.state.review?.jam?.suggestionDeclined).toBe(true)
  })
})
