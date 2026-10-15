/**
 * The favorites-only export files of a seven-phrase session whose favorites are phrases 2, 5 and
 * 6: each of the three file kinds holds exactly those phrases, in order, numbered 2, 5 and 6,
 * laid back to back from time zero at their own tempos; the two MIDI files share their tempo map
 * and markers; a note held past a favorite phrase stops at its end when the next phrase is not
 * exported; the names say "favorites"; the comment never enters a file; and the whole session's
 * files are the ones it always gave.
 */
import { describe, expect, it } from 'vitest'

import { WHOLE_SESSION, type ExportScope } from '@/export/export-file'
import {
  buildGeneratedNotesFile,
  generatedNotesFileName,
  type GeneratedNotesRequest,
} from '@/export/generated-notes-file'
import { encodeGeneratedNotesMidi } from '@/export/midi/midi-encoder'
import { encodePlayedNotesMidi } from '@/export/midi/played-notes-midi-encoder'
import { encodeGeneratedNotesMusicXml } from '@/export/musicxml/musicxml-encoder'
import { buildPlayedNotesFile, playedNotesFileName } from '@/export/played-notes-file'
import {
  midiInputFromHistory,
  musicXmlInputFromHistory,
  playedNotesMidiInputFromHistory,
} from '@/session/session-history-export'
import {
  DISTINCTIVE_COMMENT,
  SEVEN_STARTED_AT,
  SEVEN_VELOCITY,
  sevenPhraseHistory,
  sevenPhraseRecords,
} from './favorites-fixtures'
import { metaTexts, notesOf, rawChunks, readSmf, tempoMap, type SmfNote } from './midi/smf-reader'

/** MIDI ticks in one four-measure phrase. */
const TICKS_PER_PHRASE = 15360

const FAVORITES_2_5_6: ExportScope = { kind: 'favoritesOnly', favorites: [2, 5, 6] }

const MUSICXML: GeneratedNotesRequest = { format: 'musicxml', backingTrack: false }
const MIDI: GeneratedNotesRequest = { format: 'midi', backingTrack: false }
const MIDI_WITH_BACKING: GeneratedNotesRequest = { format: 'midi', backingTrack: true }

/** Intent: the MusicXML file of the scope, parsed. */
function musicXmlOf(scope: ExportScope): Document {
  const file = buildGeneratedNotesFile(sevenPhraseHistory(), MUSICXML, scope)
  return new DOMParser().parseFromString(new TextDecoder().decode(file.bytes), 'application/xml')
}

/** Intent: the measures of a parsed MusicXML file, in order. */
function measuresOf(document: Document): Element[] {
  return Array.from(document.querySelectorAll('part > measure'))
}

/**
 * Intent: the notes the whole session's file holds in phrase `number`, moved to start where the
 * phrase at `position` of a favorites-only file starts.
 */
function phraseNotesAt(notes: readonly SmfNote[], number: number, position: number): SmfNote[] {
  const from = (number - 1) * TICKS_PER_PHRASE
  const shift = (position - (number - 1)) * TICKS_PER_PHRASE
  return notes
    .filter((note) => note.startTick >= from && note.startTick < from + TICKS_PER_PHRASE)
    .map((note) => ({ ...note, startTick: note.startTick + shift, endTick: note.endTick + shift }))
}

/** Intent: the played notes of a played-notes file as pitch, start and end ticks. */
function playedSpans(bytes: Uint8Array): [number, number, number][] {
  return notesOf(readSmf(bytes).tracks[1]!).map((note) => [
    note.pitch,
    note.startTick,
    note.endTick,
  ])
}

// @test-link [[rule_favorites_only_export]]
describe('favorites-only file names', () => {
  // @test-link [[rule_favorites_only_export]]
  it('add "-favorites" after the last word of each name, and only under that scope', () => {
    const stem = 'infinite-flow-2026-10-04-070509'

    expect(generatedNotesFileName(SEVEN_STARTED_AT, 'musicxml', FAVORITES_2_5_6)).toBe(
      `${stem}-generated-favorites.musicxml`,
    )
    expect(generatedNotesFileName(SEVEN_STARTED_AT, 'midi', FAVORITES_2_5_6)).toBe(
      `${stem}-generated-favorites.mid`,
    )
    expect(playedNotesFileName(SEVEN_STARTED_AT, FAVORITES_2_5_6)).toBe(
      `${stem}-played-favorites.mid`,
    )
    expect(generatedNotesFileName(SEVEN_STARTED_AT, 'midi', WHOLE_SESSION)).toBe(
      `${stem}-generated.mid`,
    )
    expect(playedNotesFileName(SEVEN_STARTED_AT, WHOLE_SESSION)).toBe(`${stem}-played.mid`)
  })

  // @test-link [[rule_favorites_only_export]]
  it('name every file a favorites-only build makes', () => {
    const history = sevenPhraseHistory()

    expect(buildGeneratedNotesFile(history, MIDI, FAVORITES_2_5_6).fileName).toMatch(
      /-generated-favorites\.mid$/u,
    )
    expect(buildPlayedNotesFile(history, undefined, FAVORITES_2_5_6).fileName).toMatch(
      /-played-favorites\.mid$/u,
    )
  })
})

// @test-link [[rule_favorites_only_export]]
// @test-link [[rule_generated_notes_musicxml_export]]
describe('the favorites-only MusicXML file', () => {
  // @test-link [[rule_favorites_only_export]]
  it('holds phrases 2, 5 and 6 back to back, measures numbered 5–8, 17–20 and 21–24', () => {
    const measures = measuresOf(musicXmlOf(FAVORITES_2_5_6))

    expect(measures.map((measure) => measure.getAttribute('number'))).toEqual([
      '5',
      '6',
      '7',
      '8',
      '17',
      '18',
      '19',
      '20',
      '21',
      '22',
      '23',
      '24',
    ])
    expect(
      measures.flatMap((measure) =>
        Array.from(measure.querySelectorAll('rehearsal')).map((mark) => mark.textContent),
      ),
    ).toEqual(['2', '5', '6'])
  })

  // @test-link [[rule_generated_notes_musicxml_export]]
  it('opens each phrase at its own tempo and ends only the last with the final barline', () => {
    const measures = measuresOf(musicXmlOf(FAVORITES_2_5_6))

    const tempos = measures.map(
      (measure) => measure.querySelector('per-minute')?.textContent ?? null,
    )
    expect(tempos).toEqual([
      '90',
      null,
      null,
      null,
      '80',
      null,
      null,
      null,
      '150',
      null,
      null,
      null,
    ])
    const barlines = measures.map((measure) => measure.querySelector('bar-style')?.textContent)
    expect(barlines.filter((style) => style !== undefined)).toEqual([
      'light-light',
      'light-light',
      'light-heavy',
    ])
  })

  // @test-link [[rule_favorites_only_export]]
  it("writes each favorite phrase's measures as the whole session's file writes them", () => {
    const whole = measuresOf(musicXmlOf(WHOLE_SESSION))
    const favorites = measuresOf(musicXmlOf(FAVORITES_2_5_6))
    /** Intent: a measure's notes, as their serialized elements. */
    const notes = (measure: Element) =>
      Array.from(measure.querySelectorAll('note')).map((note) => note.outerHTML)

    const kept = [5, 6, 7, 8, 17, 18, 19, 20, 21, 22, 23, 24]
    expect(favorites.map(notes)).toEqual(kept.map((number) => notes(whole[number - 1]!)))
  })
})

// @test-link [[rule_favorites_only_export]]
// @test-link [[rule_generated_notes_midi_export]]
describe('the favorites-only generated-notes MIDI file', () => {
  // @test-link [[rule_favorites_only_export]]
  it('marks phrases 2, 5 and 6 from time zero, each at its own tempo', () => {
    const conductor = readSmf(
      buildGeneratedNotesFile(sevenPhraseHistory(), MIDI, FAVORITES_2_5_6).bytes,
    ).tracks[0]!

    expect(metaTexts(conductor, 0x06)).toEqual([
      { tick: 0, text: 'Phrase 2' },
      { tick: TICKS_PER_PHRASE, text: 'Phrase 5' },
      { tick: 2 * TICKS_PER_PHRASE, text: 'Phrase 6' },
    ])
    expect(tempoMap(conductor)).toEqual([
      { tick: 0, microsecondsPerQuarter: 666667 },
      { tick: TICKS_PER_PHRASE, microsecondsPerQuarter: 750000 },
      { tick: 2 * TICKS_PER_PHRASE, microsecondsPerQuarter: 400000 },
    ])
  })

  // @test-link [[rule_favorites_only_export]]
  it("holds each favorite phrase's line and backing, moved to its place in the file", () => {
    const history = sevenPhraseHistory()
    const whole = readSmf(buildGeneratedNotesFile(history, MIDI_WITH_BACKING).bytes)
    const favorites = readSmf(
      buildGeneratedNotesFile(history, MIDI_WITH_BACKING, FAVORITES_2_5_6).bytes,
    )

    for (const track of [1, 2]) {
      const wholeNotes = notesOf(whole.tracks[track]!)
      expect(notesOf(favorites.tracks[track]!)).toEqual([
        ...phraseNotesAt(wholeNotes, 2, 0),
        ...phraseNotesAt(wholeNotes, 5, 1),
        ...phraseNotesAt(wholeNotes, 6, 2),
      ])
    }
  })
})

// @test-link [[rule_favorites_only_export]]
// @test-link [[rule_played_notes_export_aligns_with_generated_midi]]
describe('the favorites-only played-notes file', () => {
  // @test-link [[rule_played_notes_export_aligns_with_generated_midi]]
  it('shares the generated-notes MIDI file’s tempo map and markers, byte for byte', () => {
    const history = sevenPhraseHistory()
    const played = rawChunks(buildPlayedNotesFile(history, undefined, FAVORITES_2_5_6).bytes)
    const generated = rawChunks(buildGeneratedNotesFile(history, MIDI, FAVORITES_2_5_6).bytes)

    expect(played.division).toBe(generated.division)
    expect(played.tracks[0]).toEqual(generated.tracks[0])
  })

  // @test-link [[rule_favorites_only_export]]
  it('places each note in its own phrase, the note held into phrase 3 stopped at 2’s end', () => {
    const file = buildPlayedNotesFile(sevenPhraseHistory(), undefined, FAVORITES_2_5_6)

    // Phrase 2 at 90 BPM (1440 ticks a second) from 0; 5 at 80 BPM (1280) from 15360; 6 at 150
    // BPM (2400) from 30720.
    expect(playedSpans(file.bytes)).toEqual([
      [60, 720, 1440],
      [62, 14640, 15360],
      [67, 16640, 17280],
      [69, 35520, 36120],
    ])
    expect(notesOf(readSmf(file.bytes).tracks[1]!).map((note) => note.velocity)).toEqual(
      Array(4).fill(SEVEN_VELOCITY),
    )
  })

  // @test-link [[rule_favorites_only_export]]
  it('keeps the note held into phrase 3 whole when phrase 3 is exported too', () => {
    const scope: ExportScope = { kind: 'favoritesOnly', favorites: [2, 3] }

    const file = buildPlayedNotesFile(sevenPhraseHistory(), undefined, scope)

    // Phrase 3 at 120 BPM (1920 ticks a second) from 15360: the note ends 0.5 s into it.
    expect(playedSpans(file.bytes)).toEqual([
      [60, 720, 1440],
      [62, 14640, 16320],
      [64, 15840, 16800],
    ])
  })
})

// @test-link [[rule_session_comment]]
describe('the comment in the exports', () => {
  // @test-link [[rule_session_comment]]
  it('is absent from every exported file, of every kind and scope', () => {
    const history = sevenPhraseHistory()
    const latin1 = new TextDecoder('latin1')
    for (const scope of [WHOLE_SESSION, FAVORITES_2_5_6]) {
      const files = [
        buildGeneratedNotesFile(history, MUSICXML, scope),
        buildGeneratedNotesFile(history, MIDI, scope),
        buildGeneratedNotesFile(history, MIDI_WITH_BACKING, scope),
        buildPlayedNotesFile(history, { includeVeryShortNotes: true }, scope),
      ]
      for (const file of files) {
        expect(latin1.decode(file.bytes)).not.toContain('Zyxquorp')
        expect(new TextDecoder().decode(file.bytes)).not.toContain(DISTINCTIVE_COMMENT)
      }
    }
  })
})

// @test-link [[req_session_export]]
describe('the whole session’s files', () => {
  // @test-link [[req_session_export]]
  it('are the encoders’ bytes for every phrase, as before the favorites scope', () => {
    const records = sevenPhraseRecords()
    const history = sevenPhraseHistory(records)

    expect(buildGeneratedNotesFile(history, MUSICXML, WHOLE_SESSION).bytes).toEqual(
      new TextEncoder().encode(encodeGeneratedNotesMusicXml(musicXmlInputFromHistory(records))),
    )
    expect([...buildGeneratedNotesFile(history, MIDI, WHOLE_SESSION).bytes]).toEqual([
      ...encodeGeneratedNotesMidi(midiInputFromHistory(records, null)),
    ])
    expect([...buildPlayedNotesFile(history, undefined, WHOLE_SESSION).bytes]).toEqual([
      ...encodePlayedNotesMidi(playedNotesMidiInputFromHistory(records)),
    ])
  })

  // @test-link [[rule_favorites_only_export]]
  it('equal the files of a favorites-only scope holding every phrase, but for the name', () => {
    const history = sevenPhraseHistory()
    const every: ExportScope = { kind: 'favoritesOnly', favorites: [1, 2, 3, 4, 5, 6, 7] }

    for (const request of [MUSICXML, MIDI, MIDI_WITH_BACKING]) {
      expect(buildGeneratedNotesFile(history, request, every).bytes).toEqual(
        buildGeneratedNotesFile(history, request).bytes,
      )
    }
    expect(buildPlayedNotesFile(history, undefined, every).bytes).toEqual(
      buildPlayedNotesFile(history).bytes,
    )
  })
})
