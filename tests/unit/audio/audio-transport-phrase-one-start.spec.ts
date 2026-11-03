/**
 * Phrase 1's start handed over to the audio transport, in a session started without phrase 1, on
 * the fake audio clock and output: once handed over at a barline, phrase 1 and its backing start
 * there and every later phrase whole phrases after it, at its own tempo; before it no phrase start
 * is told and no backing is queued; a time off the click's barlines, a second hand-over and a
 * hand-over in a session started with phrase 1 are refused.
 */

import { describe, expect, it } from 'vitest'

import type { AudioTime } from '@/audio/audio-ports'
import { beatAt, createClickPlan } from '@/audio/click-track'
import { twoPhraseHarmonies } from './backing-harmony'
import { audibleBackingOf } from './fake-audio'
import { transportRig, type TransportRig } from './transport-rig'

/** Beats per four-measure phrase in 4/4. */
const PHRASE_BEATS = 16

/** A running session started without phrase 1, its click plan's start and its tempo. */
interface HandedOverSession extends TransportRig {
  readonly startAt: AudioTime
  readonly countInEndsAt: AudioTime
  readonly tempo: number
}

/** Intent: a session started at `tempo` BPM with the click forced on and phrase 1 handed over. */
function handedOverSession(tempo: number): HandedOverSession {
  const setup = transportRig()
  setup.transport.unlock()
  const timeline = setup.transport.start({
    tempo,
    clickForced: true,
    phraseOneStart: 'handed-over',
  })
  return { ...setup, ...timeline, tempo }
}

/**
 * Intent: the session beat `k` of a session started at `startAt`, at `tempo` BPM, computed the
 * way Jam's capture computes its barlines: the click plan's own `beatAt`.
 */
function beatOf(session: HandedOverSession, k: number): AudioTime {
  return beatAt(createClickPlan(session.startAt, session.tempo), k)
}

/** Intent: the barline `measure` measures after the count-in's end (0 is the count-in's end). */
function barline(session: HandedOverSession, measure: number): AudioTime {
  return beatOf(session, 4 + measure * 4)
}

/** The tempos and the extra waits (in measures, past the doodle, generation and read-in). */
const CASES = [60, 120, 180].flatMap((tempo) => [0, 1, 2, 3].map((wait) => [tempo, wait]))

// @test-link [[module_session_transport_tempo_map]]
// @test-link [[module_session_start_without_phrase_one]]
describe('phrase 1 handed over to the transport', () => {
  // @test-link [[module_session_transport_tempo_map]]
  // @test-link [[module_session_start_without_phrase_one]]
  it.each(CASES)(
    'starts phrase 1 at %s BPM after a wait of %s measures at the handed-over barline',
    (tempo, wait) => {
      const session = handedOverSession(tempo)
      const { transport } = session
      const soundsAt = barline(session, 2 + wait)
      const [first, second] = twoPhraseHarmonies()
      transport.startPhraseOneAt(soundsAt)
      expect(transport.phraseStartsAt(1)).toBe(soundsAt)
      transport.queueBacking(1, first, tempo)
      const phraseTwoAt = barline(session, 2 + wait + 4)
      expect(transport.phraseStartsAt(2)).toBe(phraseTwoAt)
      const risen = tempo + 5
      transport.queueBacking(2, second, risen)
      expect(transport.phraseStartsAt(2)).toBe(phraseTwoAt)
      expect(transport.phraseStartsAt(3)).toBeCloseTo(phraseTwoAt + (PHRASE_BEATS * 60) / risen, 12)
    },
  )

  // @test-link [[module_session_transport_tempo_map]]
  // @test-link [[rule_jam_no_backing_before_phrase_one]]
  it.each(CASES)(
    "queues phrase 1's backing at %s BPM after a wait of %s measures from the handed-over barline",
    (tempo, wait) => {
      const session = handedOverSession(tempo)
      const { rig, transport } = session
      const soundsAt = barline(session, 2 + wait)
      const [first, second] = twoPhraseHarmonies()
      transport.startPhraseOneAt(soundsAt)
      transport.queueBacking(1, first, tempo)
      transport.queueBacking(2, second, tempo + 5)
      rig.advanceTo(transport.phraseStartsAt(3) + 1)
      const notes = rig.backingNotes()
      expect(Math.min(...notes.map((note) => note.at))).toBe(soundsAt)
      expect(notes.filter((note) => note.at === soundsAt)).toHaveLength(4)
      expect(notes.every((note) => note.at >= soundsAt)).toBe(true)
      const phraseTwoAt = transport.phraseStartsAt(2)
      expect(notes.filter((note) => note.at === phraseTwoAt)).toHaveLength(4)
      const audible = audibleBackingOf(rig.events())
      expect(Math.min(...audible.map((note) => note.at))).toBe(soundsAt)
    },
  )

  // @test-link [[module_session_transport_tempo_map]]
  it("accepts the count-in's end itself, the first barline after it", () => {
    const session = handedOverSession(120)
    session.transport.startPhraseOneAt(session.countInEndsAt)
    expect(session.transport.phraseStartsAt(1)).toBe(session.countInEndsAt)
  })

  // @test-link [[module_session_transport_tempo_map]]
  // @test-link [[rule_jam_no_backing_before_phrase_one]]
  it('tells no phrase start and queues no backing before the hand-over', () => {
    const session = handedOverSession(120)
    const { rig, transport } = session
    const [first] = twoPhraseHarmonies()
    expect(() => transport.phraseStartsAt(1)).toThrow(/handed over/)
    expect(() => transport.phraseStartsAt(2)).toThrow(/handed over/)
    expect(() => transport.queueBacking(1, first, 120)).toThrow(/handed over/)
    rig.advanceTo(barline(session, 2))
    expect(rig.backingNotes()).toEqual([])
    const soundsAt = barline(session, 3)
    transport.startPhraseOneAt(soundsAt)
    transport.queueBacking(1, first, 120)
    rig.advanceTo(soundsAt + 1)
    expect(Math.min(...rig.backingNotes().map((note) => note.at))).toBe(soundsAt)
  })

  // @test-link [[module_session_transport_tempo_map]]
  it("refuses a time off the click's barlines and stays usable", () => {
    const session = handedOverSession(120)
    const { transport } = session
    const refused = [
      beatOf(session, 4 + 2 * 4 + 1),
      (beatOf(session, 12) + beatOf(session, 13)) / 2,
      barline(session, 2) + 1e-9,
      session.startAt,
      barline(session, -0.5),
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]
    for (const soundsAt of refused) {
      expect(() => transport.startPhraseOneAt(soundsAt)).toThrow(/barline/)
    }
    expect(() => transport.phraseStartsAt(1)).toThrow(/handed over/)
    const soundsAt = barline(session, 2)
    transport.startPhraseOneAt(soundsAt)
    expect(transport.phraseStartsAt(1)).toBe(soundsAt)
  })

  // @test-link [[module_session_transport_tempo_map]]
  it('refuses a second hand-over and keeps the first', () => {
    const session = handedOverSession(120)
    const { transport } = session
    transport.startPhraseOneAt(barline(session, 2))
    expect(() => transport.startPhraseOneAt(barline(session, 3))).toThrow(/already handed over/)
    expect(transport.phraseStartsAt(1)).toBe(barline(session, 2))
  })

  // @test-link [[module_session_transport_tempo_map]]
  it.each([{}, { phraseOneStart: 'count-in-end' as const }])(
    'refuses a hand-over in a session started with phrase 1 (%o)',
    (option) => {
      const { transport } = transportRig()
      transport.unlock()
      const { countInEndsAt } = transport.start({ tempo: 120, ...option })
      expect(() => transport.startPhraseOneAt(countInEndsAt + 4)).toThrow(/count-in's end/)
      expect(transport.phraseStartsAt(1)).toBe(countInEndsAt)
    },
  )

  // @test-link [[module_session_transport_tempo_map]]
  it('refuses a hand-over with no session running, and forgets it once the session stops', () => {
    const { transport } = transportRig()
    transport.unlock()
    expect(() => transport.startPhraseOneAt(10)).toThrow(/no session is running/)
    const first = transport.start({ tempo: 120, phraseOneStart: 'handed-over' })
    const firstPlan = createClickPlan(first.startAt, 120)
    transport.startPhraseOneAt(beatAt(firstPlan, 8))
    transport.stop()
    expect(() => transport.startPhraseOneAt(beatAt(firstPlan, 12))).toThrow(/no session/)
    const second = transport.start({ tempo: 120 })
    expect(transport.phraseStartsAt(1)).toBe(second.countInEndsAt)
  })
})
