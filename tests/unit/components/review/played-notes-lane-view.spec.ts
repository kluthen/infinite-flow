/**
 * What a played-notes lane draws, on hand-built anchors: never a very short note. On each M1
 * recording the lane draws exactly the bars of the notes of 38 ms or more; a phrase whose every
 * played note is very short, in a session whose every played note is (so there is no pitch
 * scale), still draws its lane, with its dividers and no bar.
 */
import { describe, expect, it } from 'vitest'

import {
  playedNotesLanes,
  playedNotesPitchScale,
  type LaneMeasureAnchors,
  type PlayedNotesLanePhrase,
  type PlayedNotesLaneRecord,
} from '@/components/review/played-notes-lane-geometry'
import {
  playedNotesLaneViews,
  type PlayedNotesLaneSource,
} from '@/components/review/played-notes-lane-view'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { RecordedPlayedNote } from '@/session/session-history'
import { strayNoteFixtures, type FixtureNote } from '../../domain/played-notes/stray-note-fixtures'

/** Four measures of four quarter notes each (sixteenth ticks, measure-relative). */
const PHRASE: PlayedNotesLanePhrase = {
  measures: Array.from({ length: 4 }, () => ({
    events: [{ startTick: 0 }, { startTick: 4 }, { startTick: 8 }, { startTick: 12 }],
  })),
}

/** One system, 400 px a measure, a 20 px gap after each barline. */
const ANCHORS: readonly LaneMeasureAnchors[] = [0, 1, 2, 3].map((measureIndex) => {
  const start = measureIndex * 420 + 20
  return {
    measureIndex,
    systemIndex: 0,
    eventStartsPx: [start, start + 100, start + 200, start + 300],
    barlinePx: start + 400,
  }
})

const SOURCE: PlayedNotesLaneSource = { phrase: PHRASE, anchors: ANCHORS, systemOffsetsPx: [0] }

/** Intent: the recording's notes as recorded played notes. */
function playedNotes(notes: readonly FixtureNote[]): RecordedPlayedNote[] {
  return notes.map((note) => ({ ...note, pitch: makeConcertPitch(note.pitch) }))
}

/** Intent: a record holding `notes` from time 0, at a tempo that fits them all in its 16 beats. */
function recordOf(notes: readonly RecordedPlayedNote[]): PlayedNotesLaneRecord {
  const end = Math.max(...notes.map((note) => note.releaseAt)) + 1
  return { startedAt: 0, tempo: (16 * 60) / end, playedNotes: notes }
}

// @test-link [[rule_stray_notes_filtered_on_reading]]
// @test-link [[module_review_played_notes_lane]]
describe('the played-notes lane and very short notes', () => {
  // @test-link [[rule_stray_notes_filtered_on_reading]]
  // @test-link [[module_review_played_notes_lane]]
  it('draws, on each M1 recording, exactly the bars of the notes of 38 ms or more', () => {
    for (const fixture of strayNoteFixtures()) {
      const notes = playedNotes(fixture.notes)
      const longEnough = notes.filter((note) => note.releaseAt - note.onsetAt >= 0.038)
      const scale = playedNotesPitchScale([{ playedNotes: longEnough }])
      if (scale === null) throw new Error(`${fixture.name}: no note of 38 ms or more.`)
      const record = recordOf(notes)

      const [lane] = playedNotesLaneViews({
        phraseNumber: 1,
        record,
        positionCount: 1,
        source: SOURCE,
        scale,
      })

      const [expected] = playedNotesLanes({
        record: { ...record, playedNotes: longEnough },
        phrase: PHRASE,
        anchors: ANCHORS,
        scale,
      })
      expect(lane!.bars, fixture.name).toEqual(
        expected!.bars.map((bar) => ({
          insetInlineStart: `${bar.startPx}px`,
          inlineSize: `${bar.sizePx}px`,
          '--played-note-pitch': String(bar.pitch),
        })),
      )
      expect(lane!.bars.length, fixture.name).toBeLessThan(notes.length)
    }
  })

  // @test-link [[rule_stray_notes_filtered_on_reading]]
  // @test-link [[module_review_played_notes_lane]]
  it('draws a lane with its dividers and no bar when every played note is very short', () => {
    const notes = playedNotes([
      { pitch: 55, velocity: 127, onsetAt: 1, releaseAt: 1.005 },
      { pitch: 57, velocity: 127, onsetAt: 1.005, releaseAt: 1.02 },
    ])

    const lanes = playedNotesLaneViews({
      phraseNumber: 3,
      record: { startedAt: 0, tempo: 240, playedNotes: notes },
      positionCount: 1,
      source: SOURCE,
      scale: null,
    })

    expect(lanes).toEqual([
      {
        label: 'Played notes, phrase 3',
        dividers: ANCHORS.slice(0, -1).map((m) => ({ insetInlineStart: `${m.barlinePx}px` })),
        bars: [],
      },
    ])
  })

  // @test-link [[module_review_played_notes_lane]]
  it('refuses to draw a note that is not very short without a pitch scale', () => {
    const notes = playedNotes([{ pitch: 55, velocity: 90, onsetAt: 1, releaseAt: 1.2 }])

    expect(() =>
      playedNotesLaneViews({
        phraseNumber: 1,
        record: { startedAt: 0, tempo: 240, playedNotes: notes },
        positionCount: 1,
        source: SOURCE,
        scale: null,
      }),
    ).toThrow()
  })
})
