/**
 * The doodle section a Jam's played-notes file opens with, built from the Jam part's doodle: its
 * measure count, its capture tempo and its first barline, and the raw doodle notes as played
 * (pitch, velocity, onset and release, nothing else), those whose onset could snap inside the
 * doodle, from a sixteenth note before its first barline to its end barline; very short ones are
 * kept, the file's option filters them. A Jam on the kept doodle gives an empty section.
 */
import { describe, expect, it } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { DoodleMeasureCount } from '@/domain/doodle/quantized-doodle'
import { exportPlayedDoodleSection } from '@/jam/export/doodle-section'
import type { RecordedPlayedNote } from '@/session/session-history'
import type { SessionDoodle } from '@/session/session-history-played-notes'
import {
  JAM_DOODLE_FIRST_BARLINE_AT,
  KEPT_DOODLE,
  RAW_DOODLE_NOTES,
  keptDoodleJamPart,
  reviewedJamPart,
} from '../../components/workspace/reviewed-jam-part-fixture'
import { doodleOf } from '../doodle-builders'

/** The test doodle's first barline on the audio clock. */
const FIRST_BARLINE_AT = 1.25

/** Intent: a raw note of `pitch` from `onsetAt` to `releaseAt`, velocity 64. */
function raw(pitch: number, onsetAt: number, releaseAt: number): RecordedPlayedNote {
  return { pitch: makeConcertPitch(pitch), velocity: 64, onsetAt, releaseAt }
}

/**
 * Intent: a Jam part's doodle of `measureCount` measures at `captureTempo` from 1.25 s, its end
 * barline that many 4/4 measures later, holding `playedNotes`.
 */
function sessionDoodle(
  measureCount: DoodleMeasureCount,
  captureTempo: number,
  playedNotes: readonly RecordedPlayedNote[],
): SessionDoodle {
  return {
    doodle: doodleOf(measureCount, [[0, 16 * measureCount, 60]]),
    captureTempo,
    firstBarlineAt: FIRST_BARLINE_AT,
    endBarlineAt: FIRST_BARLINE_AT + (measureCount * 4 * 60) / captureTempo,
    playedNotes,
  }
}

// @test-link [[rule_raw_doodle_notes_are_played_notes]]
// @test-link [[rule_jam_exports_line_up]]
describe('exportPlayedDoodleSection', () => {
  // @test-link [[rule_jam_exports_line_up]]
  it.each([
    [1, 132],
    [2, 96],
    [4, 60],
  ] as const)(
    "carries a %i-measure doodle's measure count, its capture tempo %i and its first barline",
    (measureCount, captureTempo) => {
      const section = exportPlayedDoodleSection(sessionDoodle(measureCount, captureTempo, []))

      expect(section).toEqual({
        measureCount,
        tempo: captureTempo,
        startedAt: FIRST_BARLINE_AT,
        playedNotes: [],
      })
    },
  )

  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it('keeps the notes whose onset lies from a sixteenth before the first barline to the end barline', () => {
    // Two measures at 120 BPM from 1.25 s: a sixteenth note lasts 0.125 s, the doodle ends at 5.25 s.
    const kept = [
      raw(60, 1.125, 1.5),
      raw(62, 1.25, 1.5),
      raw(64, 3, 9),
      raw(65, 5.2499, 5.5),
      raw(67, 4, 4.01),
    ]
    const dropped = [raw(59, 1.1249, 1.5), raw(57, 0.5, 0.75), raw(69, 5.25, 5.5), raw(71, 7, 7.5)]

    const section = exportPlayedDoodleSection(sessionDoodle(2, 120, [...dropped, ...kept]))

    expect(section.playedNotes).toEqual(kept)
  })

  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it('gives each note as its pitch, velocity, onset and release only, in their order', () => {
    const note = { ...raw(62, 2, 2.5), channel: 3, source: 'keyboard' } as RecordedPlayedNote

    const [given] = exportPlayedDoodleSection(sessionDoodle(1, 100, [note])).playedNotes

    expect(Object.keys(given!).sort()).toEqual(['onsetAt', 'pitch', 'releaseAt', 'velocity'])
    expect(given).toEqual(raw(62, 2, 2.5))
  })

  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it("leaves out the fixture's count-in note and keeps its two doodle notes, frozen", () => {
    const part = reviewedJamPart()

    const section = exportPlayedDoodleSection(part.doodle)

    expect(section).toEqual({
      measureCount: KEPT_DOODLE.quantized.measureCount,
      tempo: KEPT_DOODLE.captureTempo,
      startedAt: JAM_DOODLE_FIRST_BARLINE_AT,
      playedNotes: RAW_DOODLE_NOTES.slice(1),
    })
    expect(Object.isFrozen(section)).toBe(true)
    expect(Object.isFrozen(section.playedNotes)).toBe(true)
  })

  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it('gives an empty section for a Jam on the kept doodle, its measures ending at phrase 1', () => {
    const section = exportPlayedDoodleSection(keptDoodleJamPart(7.25).doodle)

    expect(section.playedNotes).toEqual([])
    expect(section.measureCount).toBe(2)
    expect(section.tempo).toBe(96)
    expect(section.startedAt).toBeCloseTo(7.25 - 5, 9)
  })
})
