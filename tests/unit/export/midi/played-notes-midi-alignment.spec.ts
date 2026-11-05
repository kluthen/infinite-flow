/**
 * The played-notes file lines up with the generated-notes file of the same session: both are
 * encoded from the same phrase numbers and tempos, and their header division and their whole
 * first track (the conductor track: time signature, tempo map, phrase markers and its end) are
 * compared byte for byte, straight from the files' raw chunks. A Jam's two files, their doodle
 * sections built by Jam's code from the same doodle, share that track too, in both scopes.
 */
import { describe, expect, it } from 'vitest'

import type { DoodleMeasureCount } from '@/domain/doodle/quantized-doodle'
import { WHOLE_SESSION, type ExportScope } from '@/export/export-file'
import { buildGeneratedNotesFile } from '@/export/generated-notes-file'
import { encodeGeneratedNotesMidi } from '@/export/midi/midi-encoder'
import type { GeneratedNotesMidiInput } from '@/export/midi/midi-export-input'
import { encodePlayedNotesMidi } from '@/export/midi/played-notes-midi-encoder'
import { buildPlayedNotesFile } from '@/export/played-notes-file'
import { exportDoodleSection, exportPlayedDoodleSection } from '@/jam/export/doodle-section'
import type { SessionDoodle } from '@/session/session-history-played-notes'
import {
  JAM_DOODLE_FIRST_BARLINE_AT,
  RAW_DOODLE_NOTES,
  jamHistory,
} from '../../components/workspace/reviewed-jam-part-fixture'
import { doodleOf } from '../../jam/doodle-builders'
import {
  midiPhrase,
  plainTimeline,
  referenceSessionWithBacking,
  referenceSessionWithoutBacking,
  tiedTimeline,
} from './midi-session-fixtures'
import { playedSession, referencePlayedSession } from './played-notes-fixtures'
import { metaTexts, rawChunks, readSmf } from './smf-reader'

/** Intent: a played session on the given tempos, one note at the start of every phrase. */
function playedOn(tempos: readonly number[]): ReturnType<typeof playedSession> {
  return playedSession(
    7.25,
    tempos,
    tempos.map(() => [{ pitch: 60, velocity: 64, onset: 0.01, release: 0.2 }]),
  )
}

/** Intent: a generated session on the given tempos, phrases alternating the two shapes. */
function generatedOn(tempos: readonly number[]): GeneratedNotesMidiInput {
  return {
    phrases: tempos.map((tempo, index) =>
      midiPhrase(index + 1, index % 2 === 0 ? tiedTimeline() : plainTimeline(), tempo),
    ),
    backing: null,
  }
}

// @test-link [[rule_played_notes_export_aligns_with_generated_midi]]
describe('the played-notes file lines up with the generated-notes file', () => {
  // @test-link [[rule_played_notes_export_aligns_with_generated_midi]]
  it("shares the reference session's division and conductor track byte for byte", () => {
    const played = rawChunks(encodePlayedNotesMidi(referencePlayedSession()))

    for (const input of [referenceSessionWithoutBacking(), referenceSessionWithBacking()]) {
      const generated = rawChunks(encodeGeneratedNotesMidi(input))
      expect(played.division).toBe(960)
      expect(played.division).toBe(generated.division)
      expect(played.tracks[0]).toEqual(generated.tracks[0])
    }
    expect(played.tracks).toHaveLength(2)
  })

  // @test-link [[rule_played_notes_export_aligns_with_generated_midi]]
  it('shares the conductor track over tempo changes, repeated tempos and the slowest and fastest', () => {
    for (const tempos of [[72, 72, 150, 60], [240], [60, 240, 239, 61, 61, 100]]) {
      const played = rawChunks(encodePlayedNotesMidi(playedOn(tempos)))
      const generated = rawChunks(encodeGeneratedNotesMidi(generatedOn(tempos)))

      expect(played.division).toBe(generated.division)
      expect(played.tracks[0]).toEqual(generated.tracks[0])
    }
  })
})

/** The marker meta event type of a Standard MIDI File. */
const MARKER = 0x06

/** Both scopes of the Jam-style session: the whole session, then its phrase 2 alone. */
const JAM_SCOPES: readonly (readonly [ExportScope, string])[] = [
  [WHOLE_SESSION, 'Phrase 1'],
  [{ kind: 'favoritesOnly', favorites: [2] }, 'Phrase 2'],
]

/**
 * Intent: a Jam part's doodle of `measureCount` measures (one note filling it) captured at
 * `captureTempo` from the fixture's first barline, with the fixture's raw doodle notes.
 */
function jamDoodle(measureCount: DoodleMeasureCount, captureTempo: number): SessionDoodle {
  return {
    doodle: doodleOf(measureCount, [[0, 16 * measureCount, 60]]),
    captureTempo,
    firstBarlineAt: JAM_DOODLE_FIRST_BARLINE_AT,
    endBarlineAt: JAM_DOODLE_FIRST_BARLINE_AT + (measureCount * 4 * 60) / captureTempo,
    playedNotes: RAW_DOODLE_NOTES,
  }
}

// @test-link [[rule_jam_exports_line_up]]
// @test-link [[rule_jam_exports_open_with_doodle]]
describe("a Jam's played-notes file lines up with its generated-notes file", () => {
  // @test-link [[rule_jam_exports_line_up]]
  // @test-link [[rule_jam_exports_open_with_doodle]]
  it.each([
    [1, 132],
    [2, 96],
    [4, 60],
  ] as const)(
    'shares the conductor track byte for byte with a %i-measure doodle at %i BPM, in both scopes',
    (measureCount, captureTempo) => {
      const history = jamHistory(true)
      const doodle = jamDoodle(measureCount, captureTempo)
      const generatedDoodle = exportDoodleSection(doodle, history.phrases()[0]!)
      const playedDoodle = exportPlayedDoodleSection(doodle)

      for (const [scope, firstMarker] of JAM_SCOPES) {
        const played = buildPlayedNotesFile(
          history,
          { includeVeryShortNotes: false },
          scope,
          playedDoodle,
        ).bytes
        for (const backingTrack of [false, true]) {
          const generated = buildGeneratedNotesFile(
            history,
            { format: 'midi', backingTrack },
            scope,
            generatedDoodle,
          ).bytes

          expect(rawChunks(played).division).toBe(rawChunks(generated).division)
          expect(rawChunks(played).tracks[0]).toEqual(rawChunks(generated).tracks[0])
        }
        expect(metaTexts(readSmf(played).tracks[0]!, MARKER).slice(0, 2)).toEqual([
          { tick: 0, text: 'Doodle' },
          { tick: measureCount * 3840, text: firstMarker },
        ])
      }
    },
  )
})
