/**
 * The played-notes file lines up with the generated-notes file of the same session: both are
 * encoded from the same phrase numbers and tempos, and their header division and their whole
 * first track (the conductor track: time signature, tempo map, phrase markers and its end) are
 * compared byte for byte, straight from the files' raw chunks.
 */
import { describe, expect, it } from 'vitest'

import { encodeGeneratedNotesMidi } from '@/export/midi/midi-encoder'
import type { GeneratedNotesMidiInput } from '@/export/midi/midi-export-input'
import { encodePlayedNotesMidi } from '@/export/midi/played-notes-midi-encoder'
import {
  midiPhrase,
  plainTimeline,
  referenceSessionWithBacking,
  referenceSessionWithoutBacking,
  tiedTimeline,
} from './midi-session-fixtures'
import { playedSession, referencePlayedSession } from './played-notes-fixtures'
import { rawChunks } from './smf-reader'

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
