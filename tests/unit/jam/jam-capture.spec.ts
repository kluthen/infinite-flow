/**
 * The Jam capture's states on the fake audio clock: where the doodle starts (by each note's snapped
 * start, very short notes left out), where it ends (by silence at a barline after its first
 * measure, by length after four), what a note inside a tentative generation measure does, the
 * notes that belong to nothing, the 30-second wait for a first doodle note, and when phrase 1 is
 * shown and sounds. At 120 BPM from 10 s: the count-in runs 10 to 12, each measure lasts 2 s (a
 * tick 0.125 s), and barline k falls at 12 + 2k.
 */
import { describe, expect, it } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { VERY_SHORT_NOTE_SECONDS } from '@/domain/played-notes/stray-notes'
import {
  createJamCapture,
  JamCaptureError,
  type JamCapture,
  type JamCaptureOutput,
} from '@/jam/jam-capture'
import { quantizeDoodle } from '@/jam/doodle-quantizer'
import type { PlayedNoteEvent } from '@/midi/played-note-tracker'

/** The capture's start and tempo, the count-in's end and the decision delay after a barline. */
const START_AT = 10
const TEMPO = 120
const ORIGIN = 12
const SETTLE = VERY_SHORT_NOTE_SECONDS

/** Intent: barline `k` of the grid, 0 at the count-in's end. */
function barline(k: number): number {
  return ORIGIN + 2 * k
}

/** One scripted note: its pitch, onset and release (null: still held). */
type ScriptNote = readonly [pitch: number, onsetAt: number, releaseAt: number | null]

/** Intent: a script's note-on and note-off events, in time order (note-offs first on a tie). */
function eventsOf(script: readonly ScriptNote[]): PlayedNoteEvent[] {
  const timed: { at: number; order: number; event: PlayedNoteEvent }[] = []
  for (const [pitch, onsetAt, releaseAt] of script) {
    const note = { pitch: makeConcertPitch(pitch), velocity: 80, onsetAt }
    timed.push({ at: onsetAt, order: 1, event: { kind: 'played', note } })
    if (releaseAt !== null)
      timed.push({
        at: releaseAt,
        order: 0,
        event: { kind: 'ended', note: { ...note, releaseAt } },
      })
  }
  return timed.sort((a, b) => a.at - b.at || a.order - b.order).map((entry) => entry.event)
}

/**
 * Intent: a capture with every output it gave, played through `script` up to `until` and advanced
 * there.
 */
function played(
  script: readonly ScriptNote[],
  until: number,
): { readonly jam: JamCapture; readonly outputs: JamCaptureOutput[] } {
  const jam = createJamCapture({ startAt: START_AT, tempo: TEMPO })
  const outputs: JamCaptureOutput[] = []
  // A note released after `until` is still held there.
  const events = eventsOf(script).filter(
    (event) => (event.kind === 'played' ? event.note.onsetAt : event.note.releaseAt) <= until,
  )
  for (const event of events) outputs.push(...jam.note(event))
  outputs.push(...jam.advance(until))
  return { jam, outputs }
}

/** Intent: the outputs as kind and decision time, rounded to the microsecond. */
function timesOf(outputs: readonly JamCaptureOutput[]): [string, number][] {
  return outputs.map((output) => [output.kind, Math.round(output.at * 1e6) / 1e6])
}

/** Intent: the doodle the last doodle-ended output hands, failing when none ended. */
function endedDoodle(outputs: readonly JamCaptureOutput[]) {
  const ended = outputs.filter((output) => output.kind === 'doodle-ended')
  expect(ended).toHaveLength(1)
  return ended[0]!
}

/** Intent: the doodle's notes as [start tick, length in ticks, pitch]. */
function ticksOf(output: {
  readonly end: {
    readonly doodle: {
      readonly notes: readonly { startTick: number; lengthTicks: number; pitch: number }[]
    }
  }
}): number[][] {
  return output.end.doodle.notes.map((note) => [note.startTick, note.lengthTicks, note.pitch])
}

/**
 * Intent: a doodle of `measures` measures, one note a measure, each held across the next barline
 * but the last, released halfway through its measure.
 */
function heldAcross(measures: number): ScriptNote[] {
  return Array.from({ length: measures }, (_, k): ScriptNote => {
    const last = k === measures - 1
    return [60 + k, barline(k), last ? barline(k) + 1 : barline(k) + 2.5]
  })
}

// @test-link [[module_jam_capture]]
// @test-link [[rule_doodle_capture_start]]
describe('the Jam capture: where the doodle starts', () => {
  // @test-link [[rule_doodle_capture_start]]
  it('counts an early note onto beat 1 as the doodle’s, and one snapping earlier as the count-in’s', () => {
    const { outputs } = played(
      [
        [55, 11.5, 11.9],
        [60, 11.95, 12.5],
      ],
      barline(2) + 0.1,
    )
    const ended = endedDoodle(outputs)
    expect(ended.by).toBe('silence')
    expect(ticksOf(ended)).toEqual([[0, 4, 60]])
    expect(ended.end.firstBarlineAt).toBe(ORIGIN)
    expect(ended.end.notes).toEqual([{ pitch: 60, onsetAt: 11.95 }])
  })

  // @test-link [[rule_doodle_capture_start]]
  it('starts the doodle at the measure holding its first note, rests included', () => {
    const { outputs } = played([[60, barline(1) + 0.5, barline(1) + 1]], barline(3) + 0.1)
    const ended = endedDoodle(outputs)
    expect(ticksOf(ended)).toEqual([[4, 4, 60]])
    expect(ended.end.firstBarlineAt).toBe(barline(1))
    expect(ended.end.endBarlineAt).toBe(barline(2))
  })

  // @test-link [[rule_doodle_capture_start]]
  it('never starts a doodle on a very short note', () => {
    const { outputs, jam } = played([[60, 13, 13.02]], barline(4))
    expect(outputs).toEqual([])
    expect(jam.phase()).toMatchObject({ state: 'capture', doodleMeasure: null })
  })
})

// @test-link [[module_jam_capture]]
// @test-link [[rule_doodle_ends_by_silence]]
describe('the Jam capture: the end by silence', () => {
  // @test-link [[rule_doodle_ends_by_silence]]
  it.each([1, 2, 3])(
    'ends a doodle of %i measure(s) at the silent barline after it',
    (measures) => {
      const { outputs, jam } = played(heldAcross(measures), barline(measures + 1) + 0.5)
      expect(timesOf(outputs)).toEqual([
        ['candidate-end', barline(measures) + SETTLE],
        ['doodle-ended', barline(measures + 1) + SETTLE],
      ])
      const ended = endedDoodle(outputs)
      expect(ended.by).toBe('silence')
      expect(ended.end.doodle.measureCount).toBe(measures)
      expect(ended.end.endBarlineAt).toBe(barline(measures))
      expect(ended.end.captureTempo).toBe(TEMPO)
      expect(jam.phase()).toEqual({ state: 'extended-wait', beat: 2 })
    },
  )

  // @test-link [[rule_doodle_ends_by_silence]]
  it('hands the doodle quantized at each candidate end, the last being the doodle', () => {
    const script: ScriptNote[] = [
      [60, 12, 13],
      [62, 14.5, 15],
      [64, 16.25, 16.5],
    ]
    const { outputs } = played(script, barline(4) + 0.1)
    const candidates = outputs.filter((output) => output.kind === 'candidate-end')
    expect(candidates.map((candidate) => candidate.end.doodle.measureCount)).toEqual([1, 2, 3])
    const raw = script.map(([pitch, onsetAt, releaseAt]) => ({
      pitch: makeConcertPitch(pitch),
      onsetAt,
      releaseAt: releaseAt!,
    }))
    candidates.forEach((candidate, k) =>
      expect(candidate.end.doodle).toEqual(
        quantizeDoodle({ gridOriginAt: ORIGIN, tempoBpm: TEMPO, notes: raw, endMeasure: k + 1 }),
      ),
    )
    expect(endedDoodle(outputs).end).toEqual(candidates.at(-1)!.end)
  })

  // @test-link [[rule_doodle_ends_by_silence]]
  it('voids the candidate end on a doodle note inside the tentative measure, which joins the doodle', () => {
    const { outputs } = played(
      [
        [60, 12, 13],
        [62, 14.5, 15],
      ],
      barline(3) + 0.1,
    )
    expect(timesOf(outputs)).toEqual([
      ['candidate-end', barline(1) + SETTLE],
      ['candidate-voided', 14.5 + SETTLE],
      ['candidate-end', barline(2) + SETTLE],
      ['doodle-ended', barline(3) + SETTLE],
    ])
    expect(ticksOf(endedDoodle(outputs))).toEqual([
      [0, 8, 60],
      [20, 4, 62],
    ])
  })

  // @test-link [[rule_doodle_ends_by_silence]]
  it('never counts a measure beginning with a held note as silent, even if the note ends at once', () => {
    const { outputs } = played([[60, 12, barline(1) + 0.01]], barline(3) + 0.1)
    expect(timesOf(outputs)).toEqual([
      ['candidate-end', barline(2) + SETTLE],
      ['doodle-ended', barline(3) + SETTLE],
    ])
    expect(ticksOf(endedDoodle(outputs))).toEqual([[0, 16, 60]])
  })

  // @test-link [[rule_doodle_ends_by_silence]]
  it('lets no very short note extend a doodle, nor keep a barline from being silent', () => {
    const { outputs } = played(
      [
        [60, 12, 13],
        [61, barline(1) - 0.01, barline(1) + 0.01],
        [62, 14.5, 14.52],
      ],
      barline(3),
    )
    expect(timesOf(outputs)).toEqual([
      ['candidate-end', barline(1) + SETTLE],
      ['doodle-ended', barline(2) + SETTLE],
    ])
    expect(endedDoodle(outputs).end.doodle.measureCount).toBe(1)
  })

  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it('names every raw note with a snapped start in the doodle, very short ones included', () => {
    const { outputs } = played(
      [
        [60, 12, 13],
        [61, 12.5, 12.52],
      ],
      barline(3),
    )
    expect(endedDoodle(outputs).end.notes).toEqual([
      { pitch: 60, onsetAt: 12 },
      { pitch: 61, onsetAt: 12.5 },
    ])
  })
})

// @test-link [[module_jam_capture]]
// @test-link [[rule_doodle_ends_by_length]]
describe('the Jam capture: the end by length', () => {
  // @test-link [[rule_doodle_ends_by_length]]
  it('ends the doodle after four measures, a held note cut at that barline', () => {
    const { outputs, jam } = played(heldAcross(3).concat([[63, barline(3), barline(4) + 1]]), 20.5)
    expect(timesOf(outputs)).toEqual([['doodle-ended', barline(4) + SETTLE]])
    const ended = endedDoodle(outputs)
    expect(ended.by).toBe('length')
    expect(ended.end.endBarlineAt).toBe(barline(4))
    expect(ticksOf(ended)).toEqual([
      [0, 16, 60],
      [16, 16, 61],
      [32, 8, 62],
      [48, 16, 63],
    ])
    expect(jam.phase()).toEqual({ state: 'generation-measure', beat: 2 })
    jam.advance(barline(5) + 0.1)
    expect(jam.phase()).toEqual({ state: 'extended-wait', beat: 1 })
  })
})

// @test-link [[module_jam_capture]]
// @test-link [[rule_notes_after_doodle_belong_nowhere]]
describe('the Jam capture: notes after the doodle', () => {
  // @test-link [[rule_notes_after_doodle_belong_nowhere]]
  it('gives a note snapping past the tentative measure, or played after the end, to nothing', () => {
    const { outputs, jam } = played(
      [
        [60, 12, 13],
        [62, barline(2) - 0.05, barline(2) + 0.5],
        [64, 17, 17.5],
      ],
      barline(4),
    )
    expect(timesOf(outputs)).toEqual([
      ['candidate-end', barline(1) + SETTLE],
      ['doodle-ended', barline(2) + SETTLE],
    ])
    const ended = endedDoodle(outputs)
    expect(ticksOf(ended)).toEqual([[0, 8, 60]])
    expect(ended.end.notes).toEqual([{ pitch: 60, onsetAt: 12 }])
    expect(jam.phase()).toMatchObject({ state: 'extended-wait' })
  })
})

// @test-link [[module_jam_capture]]
// @test-link [[rule_jam_without_doodle_note_ends]]
describe('the Jam capture: no doodle note after the count-in', () => {
  // @test-link [[rule_jam_without_doodle_note_ends]]
  it('still runs at 29.9 s after the count-in and ends with no note played by 30.1 s', () => {
    const jam = createJamCapture({ startAt: START_AT, tempo: TEMPO })
    expect(jam.advance(ORIGIN + 29.9)).toEqual([])
    expect(jam.phase()).toMatchObject({ state: 'capture', doodleMeasure: null })
    expect(timesOf(jam.advance(ORIGIN + 30.1))).toEqual([['no-note-played', ORIGIN + 30 + SETTLE]])
    expect(jam.phase()).toEqual({ state: 'ended' })
    expect(jam.advance(ORIGIN + 40)).toEqual([])
  })

  // @test-link [[rule_jam_without_doodle_note_ends]]
  it('ends on time when only very short notes were played', () => {
    const { outputs } = played(
      [
        [60, 13, 13.02],
        [62, 30, 30.03],
      ],
      ORIGIN + 30.1,
    )
    expect(timesOf(outputs)).toEqual([['no-note-played', ORIGIN + 30 + SETTLE]])
  })

  // @test-link [[rule_jam_without_doodle_note_ends]]
  it('keeps running on a doodle note started just before the 30 s are up', () => {
    const { outputs, jam } = played([[60, ORIGIN + 29.95, ORIGIN + 30.5]], ORIGIN + 30.1)
    expect(outputs).toEqual([])
    expect(jam.phase()).toMatchObject({ state: 'capture' })
  })
})

// @test-link [[module_jam_capture]]
// @test-link [[rule_two_measures_before_jam_phrase_one]]
describe('the Jam capture: phrase 1 shown and sounding', () => {
  // @test-link [[rule_two_measures_before_jam_phrase_one]]
  it('shows phrase 1 ready in the tentative measure at its end, and sounds it one measure later', () => {
    const { jam, outputs } = played([[60, 12, 13]], 15)
    outputs.push(...jam.phraseOneReady(15))
    outputs.push(...jam.advance(barline(2) + 0.5))
    expect(timesOf(outputs)).toEqual([
      ['candidate-end', barline(1) + SETTLE],
      ['doodle-ended', barline(2) + SETTLE],
      ['phrase-one-shown', barline(2) + SETTLE],
    ])
    expect(outputs.at(-1)).toMatchObject({ shownAt: barline(2), soundsAt: barline(3) })
    expect(jam.phase()).toEqual({ state: 'read-in', beat: 2 })
    jam.advance(barline(3))
    expect(jam.phase()).toEqual({ state: 'phrase-one' })
  })

  // @test-link [[rule_two_measures_before_jam_phrase_one]]
  it('shows phrase 1 ready in the generation measure at its end', () => {
    const script = heldAcross(3).concat([[63, barline(3), barline(4) + 1]])
    const { jam } = played(script, barline(4) + 1)
    expect(jam.phraseOneReady(barline(4) + 1)).toEqual([])
    expect(jam.advance(barline(5))).toEqual([
      { kind: 'phrase-one-shown', at: barline(5), shownAt: barline(5), soundsAt: barline(6) },
    ])
  })

  // @test-link [[module_jam_capture]]
  it('extends the wait by whole measures: shown at the first barline at or after it is ready', () => {
    const late = played([[60, 12, 13]], barline(3) + 1)
    expect(late.jam.phraseOneReady(barline(3) + 1)).toEqual([])
    expect(late.jam.advance(barline(4))).toMatchObject([
      { shownAt: barline(4), soundsAt: barline(5) },
    ])
    const onTheBarline = played([[60, 12, 13]], barline(4))
    expect(onTheBarline.jam.phraseOneReady(barline(4))).toMatchObject([
      { kind: 'phrase-one-shown', shownAt: barline(4), soundsAt: barline(5) },
    ])
  })

  // @test-link [[rule_doodle_ends_by_silence]]
  it('drops a phrase 1 ready from a candidate end a doodle note voided', () => {
    const { jam, outputs } = played([[60, 12, 13]], 14.2)
    outputs.push(...jam.phraseOneReady(14.2))
    for (const event of eventsOf([[62, 14.5, 15]])) outputs.push(...jam.note(event))
    outputs.push(...jam.advance(barline(4)))
    expect(outputs.map((output) => output.kind)).toEqual([
      'candidate-end',
      'candidate-voided',
      'candidate-end',
      'doodle-ended',
    ])
    expect(jam.phase()).toMatchObject({ state: 'extended-wait' })
  })

  it('refuses a ready phrase 1 while no doodle end was handed, or once it is shown', () => {
    const capturing = played([[60, 12, 13]], 13)
    expect(() => capturing.jam.phraseOneReady(13)).toThrow(JamCaptureError)
    const shown = played([[60, 12, 13]], barline(3))
    shown.jam.phraseOneReady(barline(3))
    expect(() => shown.jam.phraseOneReady(barline(3) + 0.5)).toThrow(JamCaptureError)
  })
})

// @test-link [[module_jam_capture]]
describe('the Jam capture: its phase and its decisions', () => {
  // @test-link [[module_jam_capture]]
  // @test-link [[rule_jam_live_view_never_shows_doodle]]
  it('publishes its state with the beat it is on and the doodle measure it counts', () => {
    const jam = createJamCapture({ startAt: START_AT, tempo: TEMPO })
    jam.advance(10.6)
    expect(jam.phase()).toEqual({ state: 'count-in', beat: 2 })
    jam.advance(12.2)
    expect(jam.phase()).toEqual({ state: 'capture', beat: 1, doodleMeasure: null })
    for (const event of eventsOf([[60, 12.5, barline(1) + 0.5]])) jam.note(event)
    jam.advance(barline(1) + 1.6)
    expect(jam.phase()).toEqual({ state: 'capture', beat: 4, doodleMeasure: 2 })
    jam.advance(barline(2) + 0.1)
    expect(jam.phase()).toEqual({
      state: 'tentative-generation-measure',
      beat: 1,
      doodleMeasures: 2,
    })
  })

  // @test-link [[module_jam_capture]]
  it('tells when its next decision falls', () => {
    const jam = createJamCapture({ startAt: START_AT, tempo: TEMPO })
    expect(jam.nextDecisionAt()).toBe(ORIGIN)
    jam.advance(ORIGIN + 0.1)
    expect(jam.nextDecisionAt()).toBeCloseTo(ORIGIN + 30 + SETTLE, 9)
    for (const event of eventsOf([[60, 12.5, null]])) jam.note(event)
    expect(jam.nextDecisionAt()).toBeCloseTo(12.5 + SETTLE, 9)
    jam.advance(13)
    expect(jam.nextDecisionAt()).toBeCloseTo(barline(1) + SETTLE, 9)
  })

  // @test-link [[module_jam_capture]]
  it('gives the same outputs and phases for the same notes at the same times', () => {
    const script: ScriptNote[] = [
      [60, 11.97, 12.4],
      [62, 12.5, 14.2],
      [64, 15.1, 15.12],
      [65, 16.3, 17],
    ]
    const first = played(script, barline(5))
    const second = played(script, barline(5))
    expect(second.outputs).toEqual(first.outputs)
    expect(second.jam.phase()).toEqual(first.jam.phase())
  })

  // @test-link [[module_jam_capture]]
  it('does nothing more once the Jam ended', () => {
    const { jam } = played([[60, 12, 13]], 13)
    jam.end()
    expect(jam.phase()).toEqual({ state: 'ended' })
    expect(jam.advance(barline(3))).toEqual([])
    expect(jam.note(eventsOf([[62, 20, 21]])[0]!)).toEqual([])
    expect(jam.nextDecisionAt()).toBeNull()
  })
})
