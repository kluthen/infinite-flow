/**
 * The played-notes lane geometry on hand-built, unevenly spaced anchors (so a uniform grid would
 * fail): onsets and releases placed through the written events and barlines, linear between
 * anchors, the barline gap taking no time, cuts at the phrase end and at the split layout's break,
 * dividers per lane, the session-wide pitch scale, no snapping, and bars that carry nothing but
 * their place.
 */
import { describe, expect, it } from 'vitest'

import {
  type LaneMeasureAnchors,
  type PlayedNotesLanePhrase,
  type PlayedNotesLaneRecord,
  PlayedNotesLaneError,
  playedNotesLanes,
  playedNotesPitchScale,
  type PlayedNotesPitchScale,
} from '@/components/review/played-notes-lane-geometry'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { RecordedPlayedNote } from '@/session/session-history'

/** Beats 0, 1, 1.5, 3 | 4, 6 | 8 | 12, 12.5, 13, 14 (sixteenth ticks, measure-relative). */
const PHRASE: PlayedNotesLanePhrase = {
  measures: [
    { events: [{ startTick: 0 }, { startTick: 4 }, { startTick: 6 }, { startTick: 12 }] },
    { events: [{ startTick: 0 }, { startTick: 8 }] },
    { events: [{ startTick: 0 }] },
    { events: [{ startTick: 0 }, { startTick: 2 }, { startTick: 4 }, { startTick: 8 }] },
  ],
}

/** One system: uneven spacing, with a gap after every barline. */
const ONE_SYSTEM: readonly LaneMeasureAnchors[] = [
  { measureIndex: 0, systemIndex: 0, eventStartsPx: [40, 70, 80, 130], barlinePx: 160 },
  { measureIndex: 1, systemIndex: 0, eventStartsPx: [175, 230], barlinePx: 300 },
  { measureIndex: 2, systemIndex: 0, eventStartsPx: [312], barlinePx: 380 },
  { measureIndex: 3, systemIndex: 0, eventStartsPx: [395, 405, 420, 460], barlinePx: 520 },
]

/** The split layout: bars 1-2 on the top system, bars 3-4 on the bottom one (its own SVG). */
const SPLIT: readonly LaneMeasureAnchors[] = [
  { measureIndex: 0, systemIndex: 0, eventStartsPx: [40, 70, 80, 130], barlinePx: 160 },
  { measureIndex: 1, systemIndex: 0, eventStartsPx: [175, 230], barlinePx: 300 },
  { measureIndex: 2, systemIndex: 1, eventStartsPx: [60], barlinePx: 140 },
  { measureIndex: 3, systemIndex: 1, eventStartsPx: [150, 160, 180, 230], barlinePx: 300 },
]

const SCALE: PlayedNotesPitchScale = { low: 54, high: 66 }
/** The record starts at t = 10 s at 60 bpm, so a time t is at beat t - 10. */
const STARTED_AT = 10
const TEMPO = 60

function note(onsetBeat: number, releaseBeat: number, pitch = 60): RecordedPlayedNote {
  return {
    pitch: makeConcertPitch(pitch),
    velocity: 80,
    onsetAt: STARTED_AT + onsetBeat,
    releaseAt: STARTED_AT + releaseBeat,
  }
}

function record(playedNotes: readonly RecordedPlayedNote[]): PlayedNotesLaneRecord {
  return { startedAt: STARTED_AT, tempo: TEMPO, playedNotes }
}

function lanes(
  playedNotes: readonly RecordedPlayedNote[],
  anchors: readonly LaneMeasureAnchors[] = ONE_SYSTEM,
) {
  return playedNotesLanes({ record: record(playedNotes), phrase: PHRASE, anchors, scale: SCALE })
}

/** The single bar of the only lane. */
function onlyBar(onsetBeat: number, releaseBeat: number) {
  const [lane] = lanes([note(onsetBeat, releaseBeat)])
  expect(lane?.bars).toHaveLength(1)
  const bar = lane?.bars[0]
  if (bar === undefined) throw new Error('no bar')
  return bar
}

// @test-link [[module_review_played_notes_lane]]
describe('played-notes lane: time axis', () => {
  it('starts an onset exactly on a written note beat at that note', () => {
    expect(onlyBar(1, 1.25).startPx).toBe(70)
    expect(onlyBar(13, 13.5).startPx).toBe(420)
  })

  it('maps linearly between consecutive anchors, events and barline alike', () => {
    expect(onlyBar(2, 2.5).startPx).toBeCloseTo(80 + (0.5 / 1.5) * 50, 9)
    expect(onlyBar(3.5, 3.75).startPx).toBeCloseTo(145, 9)
    const bar = onlyBar(4.5, 5)
    expect(bar.startPx).toBeCloseTo(175 + 0.25 * 55, 9)
    expect(bar.startPx + bar.sizePx).toBeCloseTo(202.5, 9)
  })

  it('ends a downbeat release at the barline and starts a downbeat onset under the next first note', () => {
    const released = onlyBar(3, 4)
    expect(released.startPx).toBe(130)
    expect(released.startPx + released.sizePx).toBe(160)
    expect(onlyBar(4, 4.5).startPx).toBe(175)
    expect(onlyBar(8, 10).startPx).toBe(312)
  })

  it('draws a note held across a barline as one bar spanning the gap', () => {
    const [lane] = lanes([note(3.5, 5)])
    expect(lane?.bars).toEqual([{ startPx: 145, sizePx: 57.5, pitch: 0.5 }])
  })

  it('places a moment late in a measure before its barline', () => {
    const bar = onlyBar(3.999, 3.9995)
    expect(bar.startPx).toBeGreaterThan(130)
    expect(bar.startPx + bar.sizePx).toBeLessThan(160)
    const held = onlyBar(3.5, 3.999)
    expect(held.startPx + held.sizePx).toBeLessThan(160)
  })

  it('cuts a release past beat 16 at the last barline', () => {
    const bar = onlyBar(15, 17.5)
    expect(bar.startPx).toBeCloseTo(490, 9)
    expect(bar.startPx + bar.sizePx).toBe(520)
  })

  it('never snaps: two onsets 10 ms apart start at different positions', () => {
    const [lane] = lanes([note(1.2, 1.5), note(1.21, 1.5)])
    const [first, second] = lane?.bars ?? []
    expect(first?.startPx).not.toBe(second?.startPx)
    expect(second?.startPx).toBeGreaterThan(first?.startPx ?? Number.POSITIVE_INFINITY)
  })

  it('is strictly increasing in time across the whole phrase', () => {
    const beats = Array.from({ length: 1600 }, (_, i) => i / 100)
    const [lane] = lanes(beats.map((beat) => note(beat, beat)))
    const starts = lane?.bars.map((bar) => bar.startPx) ?? []
    expect(starts).toHaveLength(beats.length)
    starts.slice(1).forEach((start, i) => expect(start).toBeGreaterThan(starts[i] ?? start))
  })

  it('gives a zero-length note a zero size, even exactly on a downbeat', () => {
    expect(onlyBar(4, 4)).toEqual({ startPx: 175, sizePx: 0, pitch: 0.5 })
  })
})

// @test-link [[module_review_played_notes_lane]]
describe('played-notes lane: lanes and dividers', () => {
  it('draws one lane over the one-system layout with a divider between its measures', () => {
    const drawn = lanes([note(1, 2)])
    expect(drawn).toHaveLength(1)
    expect(drawn[0]?.systemIndex).toBe(0)
    expect(drawn[0]?.dividersPx).toEqual([160, 300, 380])
  })

  it('draws a note crossing the split break in both lanes, cut at the break', () => {
    const [top, bottom] = lanes([note(7, 9)], SPLIT)
    expect(top?.systemIndex).toBe(0)
    expect(bottom?.systemIndex).toBe(1)
    expect(top?.bars).toEqual([{ startPx: 265, sizePx: 35, pitch: 0.5 }])
    expect(bottom?.bars).toEqual([{ startPx: 60, sizePx: 20, pitch: 0.5 }])
    expect(top?.dividersPx).toEqual([160])
    expect(bottom?.dividersPx).toEqual([140])
  })

  it('draws a note only in the lane it overlaps in the split layout', () => {
    const [top, bottom] = lanes([note(1, 2), note(7, 8), note(8, 8.5), note(13, 14)], SPLIT)
    expect(top?.bars.map((bar) => bar.startPx)).toEqual([70, 265])
    expect(top?.bars[1]?.sizePx).toBe(35)
    expect(bottom?.bars.map((bar) => bar.startPx)).toEqual([60, 180])
  })

  it('gives an empty lane its dividers only', () => {
    expect(lanes([])).toEqual([{ systemIndex: 0, dividersPx: [160, 300, 380], bars: [] }])
    const [top, bottom] = lanes([note(1, 2)], SPLIT)
    expect(top?.bars).toHaveLength(1)
    expect(bottom).toEqual({ systemIndex: 1, dividersPx: [140], bars: [] })
  })

  it('rejects anchors that do not match the written events', () => {
    const anchors: readonly LaneMeasureAnchors[] = [
      { measureIndex: 0, systemIndex: 0, eventStartsPx: [40, 70], barlinePx: 160 },
    ]
    expect(() => lanes([], anchors)).toThrow(PlayedNotesLaneError)
  })

  it('rejects an unusable tempo', () => {
    expect(() =>
      playedNotesLanes({
        record: { startedAt: STARTED_AT, tempo: 0, playedNotes: [] },
        phrase: PHRASE,
        anchors: ONE_SYSTEM,
        scale: SCALE,
      }),
    ).toThrow(PlayedNotesLaneError)
  })
})

// @test-link [[module_review_played_notes_lane]]
describe('played-notes lane: pitch scale', () => {
  it('widens a span under 12 equally to exactly 12, a single pitch sitting at 0.5', () => {
    expect(playedNotesPitchScale([record([note(1, 2, 60)])])).toEqual({ low: 54, high: 66 })
    expect(playedNotesPitchScale([record([note(1, 2, 60), note(2, 3, 64)])])).toEqual({
      low: 56,
      high: 68,
    })
    expect(onlyBar(1, 2).pitch).toBe(0.5)
  })

  it('uses a span of 12 or more as is', () => {
    expect(playedNotesPitchScale([record([note(1, 2, 48), note(2, 3, 72)])])).toEqual({
      low: 48,
      high: 72,
    })
  })

  it('is one scale over every record of the session', () => {
    const records = [record([note(1, 2, 50)]), record([]), record([note(1, 2, 70)])]
    const scale = playedNotesPitchScale(records)
    expect(scale).toEqual({ low: 50, high: 70 })
    if (scale === null) throw new Error('no scale')
    const pitches = records.map((r) =>
      playedNotesLanes({ record: r, phrase: PHRASE, anchors: ONE_SYSTEM, scale })[0]?.bars.map(
        (bar) => bar.pitch,
      ),
    )
    expect(pitches).toEqual([[0], [], [1]])
  })

  it('is null when no record holds a played note', () => {
    expect(playedNotesPitchScale([])).toBeNull()
    expect(playedNotesPitchScale([record([]), record([])])).toBeNull()
  })
})

// @test-link [[module_review_played_notes_lane]]
describe('played-notes lane: look', () => {
  // @test-link [[rule_no_grading_or_mismatch_signal]]
  it('gives every bar exactly startPx, sizePx and pitch, nothing that tells notes apart', () => {
    const drawn = lanes([note(1, 2, 60), { ...note(3, 5, 61), velocity: 127 }], SPLIT)
    const bars = drawn.flatMap((lane) => lane.bars)
    expect(bars).toHaveLength(2)
    for (const bar of bars) expect(Object.keys(bar).sort()).toEqual(['pitch', 'sizePx', 'startPx'])
  })
})
