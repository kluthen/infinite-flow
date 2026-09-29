import { describe, expect, expectTypeOf, it } from 'vitest'

import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import {
  BB_TENOR_PROFILE,
  C_KEYBOARD_PROFILE,
  EB_ALTO_PROFILE,
} from '@/domain/profile/instrument-profiles'
import { encodeGeneratedNotesMusicXml } from '@/export/musicxml/musicxml-encoder'
import {
  MusicXmlExportError,
  type GeneratedNotesMusicXmlInput,
  type MusicXmlSessionPhrase,
} from '@/export/musicxml/musicxml-export-input'
import {
  bbTenorTempoChangeSession,
  cKeyboardPlainSession,
  cKeyboardSession,
  ebAltoKeyChangeSession,
  plainPhraseFor,
} from './musicxml-session-fixtures'

/** Parse the encoder's output, failing the test when it is not well-formed XML. */
function parse(xml: string): Document {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  expect(document.getElementsByTagName('parsererror')).toHaveLength(0)
  return document
}

function encodeAndParse(input: GeneratedNotesMusicXmlInput): Document {
  return parse(encodeGeneratedNotesMusicXml(input))
}

function measures(document: Document): Element[] {
  return Array.from(document.querySelectorAll('part > measure'))
}

function measureNumber(element: Element): string {
  return element.closest('measure')!.getAttribute('number')!
}

function text(element: Element, selector: string): string | null {
  return element.querySelector(selector)?.textContent ?? null
}

/** The notes (not rests) of a measure, as "<step><alter> <octave>" strings. */
function writtenPitches(measure: Element): string[] {
  return Array.from(measure.querySelectorAll('note > pitch')).map(
    (pitch) => `${text(pitch, 'step')}${text(pitch, 'alter') ?? ''} ${text(pitch, 'octave') ?? ''}`,
  )
}

// @test-link [[rule_generated_notes_musicxml_export]]
describe('encodeGeneratedNotesMusicXml: document shape', () => {
  it('writes a well-formed score-partwise 4.0 document with one part named for the instrument', () => {
    const xml = encodeGeneratedNotesMusicXml(bbTenorTempoChangeSession())
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n')).toBe(true)
    expect(xml).toContain(
      '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" ' +
        '"http://www.musicxml.org/dtds/partwise.dtd">',
    )
    const document = parse(xml)
    expect(document.documentElement.tagName).toBe('score-partwise')
    expect(document.documentElement.getAttribute('version')).toBe('4.0')
    expect(document.querySelectorAll('part-list > score-part')).toHaveLength(1)
    expect(document.querySelectorAll('part')).toHaveLength(1)
    expect(text(document.documentElement, 'part-list > score-part > part-name')).toBe(
      'B-flat tenor saxophone',
    )
    expect(document.querySelector('score-part')!.getAttribute('id')).toBe(
      document.querySelector('part')!.getAttribute('id'),
    )
  })

  it('sets divisions, 4/4 and the treble G2 clef once, in the first measure', () => {
    const document = encodeAndParse(cKeyboardSession())
    const attributes = Array.from(document.querySelectorAll('measure > attributes'))
    expect(attributes.map(measureNumber)).toEqual(['1'])
    expect(text(attributes[0]!, 'divisions')).toBe('4')
    expect(text(attributes[0]!, 'time > beats')).toBe('4')
    expect(text(attributes[0]!, 'time > beat-type')).toBe('4')
    expect(text(attributes[0]!, 'clef > sign')).toBe('G')
    expect(text(attributes[0]!, 'clef > line')).toBe('2')
  })

  it('gives identical bytes for the same session twice', () => {
    expect(encodeGeneratedNotesMusicXml(bbTenorTempoChangeSession())).toBe(
      encodeGeneratedNotesMusicXml(bbTenorTempoChangeSession()),
    )
  })
})

// @test-link [[req_session_export]]
describe('encodeGeneratedNotesMusicXml: whole session, back to back', () => {
  it('lays phrases back to back from phrase 1, four full measures each, numbered 1 upward', () => {
    const document = encodeAndParse(cKeyboardPlainSession([90, 90, 90]))
    const all = measures(document)
    expect(all.map((measure) => measure.getAttribute('number'))).toEqual(
      Array.from({ length: 12 }, (_, index) => String(index + 1)),
    )
    for (const measure of all) {
      const ticks = Array.from(measure.querySelectorAll('note > duration')).reduce(
        (sum, duration) => sum + Number(duration.textContent),
        0,
      )
      expect(ticks).toBe(16)
    }
    expect(document.querySelectorAll('backup, forward')).toHaveLength(0)
  })
})

// @test-link [[rule_generated_notes_musicxml_export]]
// @test-link [[entity_instrument_profile]]
describe('encodeGeneratedNotesMusicXml: written pitch and transposition', () => {
  it('writes every note in the instrument’s written pitch, as the staff shows it', () => {
    const keyboard = measures(encodeAndParse(cKeyboardSession()))
    const tenor = measures(encodeAndParse(bbTenorTempoChangeSession()))
    const alto = measures(encodeAndParse(ebAltoKeyChangeSession()))
    // Concert C4 E4 G4 A4 G4 on the keyboard; the tenor plays it an octave lower, written a major
    // ninth above; the alto plays it at the keyboard's octave, written a major sixth above.
    expect(writtenPitches(keyboard[0]!)).toEqual(['C 4', 'E 4', 'G 4', 'A 4', 'G 4'])
    expect(writtenPitches(tenor[0]!)).toEqual(['D 4', 'F1 4', 'A 4', 'B 4', 'A 4'])
    expect(writtenPitches(alto[0]!)).toEqual(['A 4', 'C1 5', 'E 5', 'F1 5', 'E 5'])
  })

  it('shows the accidentals the staff shows', () => {
    const measure2 = measures(encodeAndParse(cKeyboardSession()))[1]!
    const sharp = Array.from(measure2.querySelectorAll('note')).find(
      (note) => text(note, 'pitch > step') === 'F',
    )!
    expect(text(sharp, 'pitch > alter')).toBe('1')
    expect(text(sharp, 'accidental')).toBe('sharp')
  })

  it('carries the B-flat tenor transposition as written-to-sounding: down a major ninth', () => {
    const transpose = encodeAndParse(bbTenorTempoChangeSession()).querySelectorAll('transpose')
    expect(transpose).toHaveLength(1)
    expect(measureNumber(transpose[0]!)).toBe('1')
    expect(text(transpose[0]!, 'diatonic')).toBe('-1')
    expect(text(transpose[0]!, 'chromatic')).toBe('-2')
    expect(text(transpose[0]!, 'octave-change')).toBe('-1')
  })

  it('carries the E-flat alto transposition as written-to-sounding: down a major sixth', () => {
    const transpose = encodeAndParse(ebAltoKeyChangeSession()).querySelectorAll('transpose')
    expect(transpose).toHaveLength(1)
    expect(text(transpose[0]!, 'diatonic')).toBe('-5')
    expect(text(transpose[0]!, 'chromatic')).toBe('-9')
    expect(transpose[0]!.querySelector('octave-change')).toBeNull()
  })

  it('leaves the transpose element out for the C keyboard', () => {
    expect(encodeAndParse(cKeyboardSession()).querySelectorAll('transpose')).toHaveLength(0)
  })

  it('writes the written key signature, and a new one where a phrase changes key', () => {
    const keysOf = (input: GeneratedNotesMusicXmlInput): string[] =>
      Array.from(encodeAndParse(input).querySelectorAll('attributes > key')).map(
        (key) => `${measureNumber(key)}:${text(key, 'fifths')}:${text(key, 'mode')}`,
      )
    expect(keysOf(cKeyboardSession())).toEqual(['1:0:ionian'])
    expect(keysOf(bbTenorTempoChangeSession())).toEqual(['1:2:ionian'])
    expect(keysOf(ebAltoKeyChangeSession())).toEqual(['1:3:ionian', '5:2:ionian'])
  })
})

// @test-link [[rule_generated_notes_musicxml_export]]
describe('encodeGeneratedNotesMusicXml: chord symbols', () => {
  it('writes every chord symbol, respelled in written pitch', () => {
    const chords = Array.from(
      encodeAndParse(bbTenorTempoChangeSession()).querySelectorAll('harmony'),
    )
    const labels = chords.map(
      (harmony) =>
        `${measureNumber(harmony)}:${text(harmony, 'root-step')}${text(harmony, 'root-alter') ?? ''}` +
        `:${text(harmony, 'kind')}:${harmony.querySelector('kind')!.getAttribute('text')}`,
    )
    // Concert C, F G, Am, Bdim C then C, G, F, C, written a major ninth up for the tenor.
    expect(labels).toEqual([
      '1:D:major:',
      '2:G:major:',
      '2:A:major:',
      '3:B:minor:m',
      '4:C1:diminished:dim',
      '4:D:major:',
      '5:D:major:',
      '6:A:major:',
      '7:G:major:',
      '8:D:major:',
    ])
  })

  it('places the second chord of a two-chord measure right before the note on beat 3', () => {
    const measure2 = measures(encodeAndParse(cKeyboardSession()))[1]!
    const children = Array.from(measure2.children)
    const harmonies = children.filter((child) => child.tagName === 'harmony')
    expect(harmonies.map((harmony) => text(harmony, 'root-step'))).toEqual(['F', 'G'])
    for (const [harmony, tick] of [
      [harmonies[0]!, 0],
      [harmonies[1]!, 8],
    ] as const) {
      const at = children.indexOf(harmony)
      const before = children
        .slice(0, at)
        .filter((child) => child.tagName === 'note')
        .reduce((sum, note) => sum + Number(text(note, 'duration')), 0)
      expect(before).toBe(tick)
      expect(children[at + 1]!.tagName).toBe('note')
    }
  })
})

// @test-link [[rule_generated_notes_musicxml_export]]
describe('encodeGeneratedNotesMusicXml: phrase marks', () => {
  it('opens every phrase with a rehearsal mark holding its phrase number', () => {
    const rehearsals = Array.from(
      encodeAndParse(cKeyboardPlainSession([90, 90, 90])).querySelectorAll('rehearsal'),
    )
    expect(rehearsals.map((mark) => `${measureNumber(mark)}:${mark.textContent}`)).toEqual([
      '1:1',
      '5:2',
      '9:3',
    ])
  })

  it('closes every phrase but the last with a double barline, the last with a final barline, and no other measure', () => {
    const barlines = (tempos: readonly number[]): string[] =>
      Array.from(encodeAndParse(cKeyboardPlainSession(tempos)).querySelectorAll('barline')).map(
        (barline) =>
          `${measureNumber(barline)}:${barline.getAttribute('location')}:${text(barline, 'bar-style')}`,
      )
    expect(barlines([90, 90, 90])).toEqual([
      '4:right:light-light',
      '8:right:light-light',
      '12:right:light-heavy',
    ])
    expect(barlines([90, 90])).toEqual(['4:right:light-light', '8:right:light-heavy'])
  })

  it('closes a one-phrase session with a final barline', () => {
    const barlines = Array.from(
      encodeAndParse(cKeyboardPlainSession([90])).querySelectorAll('barline'),
    )
    expect(
      barlines.map(
        (barline) =>
          `${measureNumber(barline)}:${barline.getAttribute('location')}:${text(barline, 'bar-style')}`,
      ),
    ).toEqual(['4:right:light-heavy'])
  })

  it('writes a metronome mark at the start and at every tempo change, and nowhere else', () => {
    const marks = (tempos: readonly number[]): string[] =>
      Array.from(encodeAndParse(cKeyboardPlainSession(tempos)).querySelectorAll('direction'))
        .filter((direction) => direction.querySelector('metronome') !== null)
        .map(
          (direction) =>
            `${measureNumber(direction)}:${text(direction, 'beat-unit')}:` +
            `${text(direction, 'per-minute')}:${direction.querySelector('sound')!.getAttribute('tempo')}`,
        )
    expect(marks([90, 90])).toEqual(['1:quarter:90:90'])
    expect(marks([90, 120])).toEqual(['1:quarter:90:90', '5:quarter:120:120'])
    expect(marks([90, 90, 125, 125, 90])).toEqual([
      '1:quarter:90:90',
      '9:quarter:125:125',
      '17:quarter:90:90',
    ])
  })
})

// @test-link [[rule_generated_notes_musicxml_export]]
describe('encodeGeneratedNotesMusicXml: rhythm as engraved', () => {
  it('writes ties, inside a measure and across the barline, as tie and tied elements', () => {
    const all = measures(encodeAndParse(cKeyboardSession()))
    const tieTypes = (note: Element, selector: string): string[] =>
      Array.from(note.querySelectorAll(selector)).map((tie) => tie.getAttribute('type')!)
    // Measure 3's E (beats 2 to 4) is engraved as a quarter tied to a half, then tied on into
    // measure 4's first quarter.
    const measure3Notes = Array.from(all[2]!.querySelectorAll('note')).filter(
      (note) => note.querySelector('pitch') !== null,
    )
    const firstOf4 = all[3]!.querySelector('note')!
    expect(measure3Notes.map((note) => tieTypes(note, 'tie'))).toEqual([
      ['start'],
      ['stop', 'start'],
    ])
    expect(measure3Notes.map((note) => tieTypes(note, 'notations > tied'))).toEqual([
      ['start'],
      ['stop', 'start'],
    ])
    expect(tieTypes(firstOf4, 'tie')).toEqual(['stop'])
    expect(tieTypes(firstOf4, 'notations > tied')).toEqual(['stop'])
  })

  it('writes the staff’s beam groups, with a second beam level over sixteenths', () => {
    const all = measures(encodeAndParse(cKeyboardSession()))
    const beams = (measure: Element): string[] =>
      Array.from(measure.querySelectorAll('note'))
        .map((note) =>
          Array.from(note.querySelectorAll('beam'))
            .map((beam) => `${beam.getAttribute('number')}${beam.textContent}`)
            .join(' '),
        )
        .filter((entry) => entry !== '')
    expect(beams(all[0]!)).toEqual(['1begin', '1end'])
    expect(beams(all[1]!)).toEqual([
      '1begin 2begin',
      '1continue 2continue',
      '1continue 2continue',
      '1end 2end',
    ])
  })

  it('writes note types and dots matching the durations', () => {
    const measure1 = measures(encodeAndParse(cKeyboardSession()))[0]!
    const shapes = Array.from(measure1.querySelectorAll('note')).map(
      (note) =>
        `${text(note, 'duration')}:${text(note, 'type')}:${note.querySelectorAll('dot').length}`,
    )
    expect(shapes).toEqual([
      '4:quarter:0',
      '4:quarter:0',
      '2:eighth:0',
      '2:eighth:0',
      '4:quarter:0',
    ])
  })
})

// @test-link [[rule_generated_notes_musicxml_export]]
// @test-link [[rule_export_contents_never_merged]]
describe('encodeGeneratedNotesMusicXml: input contract', () => {
  const phraseFor = (number: number, tempo = 90): MusicXmlSessionPhrase => ({
    number,
    writtenPhrase: plainPhraseFor(C_KEYBOARD_PROFILE),
    tempo,
  })

  it('has no field that could carry a played note', () => {
    expectTypeOf<keyof GeneratedNotesMusicXmlInput>().toEqualTypeOf<'instrument' | 'phrases'>()
    expectTypeOf<keyof MusicXmlSessionPhrase>().toEqualTypeOf<
      'number' | 'writtenPhrase' | 'tempo'
    >()
  })

  it('rejects an input or a phrase that carries played notes', () => {
    const withPlayed = { ...cKeyboardPlainSession([90]), playedNotes: [] }
    expect(() => encodeGeneratedNotesMusicXml(withPlayed)).toThrow(MusicXmlExportError)
    const phraseWithPlayed = { ...phraseFor(1), playedNotes: [] }
    expect(() =>
      encodeGeneratedNotesMusicXml({ instrument: C_KEYBOARD_PROFILE, phrases: [phraseWithPlayed] }),
    ).toThrow(MusicXmlExportError)
  })

  it('rejects an empty session', () => {
    expect(() =>
      encodeGeneratedNotesMusicXml({ instrument: C_KEYBOARD_PROFILE, phrases: [] }),
    ).toThrow(MusicXmlExportError)
  })

  it('rejects phrase numbers that do not run 1, 2, 3 … in order', () => {
    for (const numbers of [[2], [1, 3], [2, 1]]) {
      expect(() =>
        encodeGeneratedNotesMusicXml({
          instrument: C_KEYBOARD_PROFILE,
          phrases: numbers.map((number) => phraseFor(number)),
        }),
      ).toThrow(MusicXmlExportError)
    }
  })

  it('rejects a tempo that is not a positive whole number', () => {
    for (const tempo of [0, -90, 90.5, Number.NaN]) {
      expect(() =>
        encodeGeneratedNotesMusicXml({
          instrument: C_KEYBOARD_PROFILE,
          phrases: [phraseFor(1, tempo)],
        }),
      ).toThrow(MusicXmlExportError)
    }
  })

  it('rejects a phrase written for another instrument', () => {
    expect(() =>
      encodeGeneratedNotesMusicXml({
        instrument: EB_ALTO_PROFILE,
        phrases: [{ number: 1, writtenPhrase: plainPhraseFor(BB_TENOR_PROFILE), tempo: 90 }],
      }),
    ).toThrow(MusicXmlExportError)
  })

  it('rejects a chord suffix it has no MusicXML chord kind for', () => {
    const plain = plainPhraseFor(C_KEYBOARD_PROFILE)
    const [first, second, third, fourth] = plain.measures
    const unknown: WrittenPhrase = {
      ...plain,
      measures: [
        { ...first, chords: [{ ...first.chords[0]!, suffix: 'maj13#11', text: 'Cmaj13#11' }] },
        second,
        third,
        fourth,
      ],
    }
    expect(() =>
      encodeGeneratedNotesMusicXml({
        instrument: C_KEYBOARD_PROFILE,
        phrases: [{ number: 1, writtenPhrase: unknown, tempo: 90 }],
      }),
    ).toThrow(MusicXmlExportError)
  })
})
